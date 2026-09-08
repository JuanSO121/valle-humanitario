import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, X } from "lucide-react";
import { useOrigenes, useDestinos, useFlujos } from "@/application/hooks/useCatalogQueries";
import { useFlujosPorLente } from "@/application/hooks/useFlujosPorLente";
import {
  INITIAL_VIEW_STATE,
  viewTransitions,
  type ViewState,
} from "@/presentation/state/viewState";
import {
  MapCanvas,
  TERRITORY_EXCLUDED,
  TERRITORY_NO_DATA,
  type MunicipioMapa,
} from "@/presentation/components/MapCanvas";
import { Timeline } from "@/presentation/components/Timeline";
import { MarcadorHUD } from "@/presentation/components/MarcadorHUD";
import { AvisoEntrega } from "@/presentation/components/AvisoEntrega";
import { DestinoPanel } from "@/presentation/components/DestinoPanel";
import { OrigenPanel } from "@/presentation/components/OrigenPanel";
import { TopBar } from "@/presentation/components/TopBar";
import { BarraMovil, HojaFiltros } from "@/presentation/components/ControlesMovil";
import { useOperacion } from "@/presentation/state/OperacionContext";
import { useFoco } from "@/presentation/state/FocoContext";
import { useAyuda } from "@/application/hooks/useAyuda";
import { normMunicipalityName, sameMunicipality } from "@/lib/municipalityName";
import {
  getTerritoryStat,
  TERRITORY_BLUE_RAMP,
  type TerritoryMapMode,
  type TerritoryRoutesMode,
  type TerritoryZone,
} from "@/presentation/data/territoryData";
import { dayFromIsoDate, describeLens, valorTemporal } from "@/presentation/data/territoryTime";
import type { ActivityFrame } from "@/presentation/components/dispatchActivityEngine";

/**
 * Dónde arranca la columna de la esquina superior izquierda.
 *
 * Va en una constante porque tres cosas dependen del mismo número: el
 * botón de volver, la leyenda de orígenes que va debajo de él, y la
 * píldora amarilla de categoría, que en móvil tiene que bajar cuando el
 * botón está presente. Repartido a mano en tres sitios, cambiar la
 * altura significaba acordarse de los tres.
 */
const COLUMNA_TOP = "top-[calc(4.25rem+env(safe-area-inset-top))]";
const COLUMNA_TOP_MD = "md:top-[calc(4rem+env(safe-area-inset-top))]";

/**
 * Dónde cae la píldora de categoría en móvil cuando hay botón de volver.
 *
 * Es la altura de la columna más el alto del botón —unos 40 px— más aire.
 * Si cambia COLUMNA_TOP, este número se recalcula igual.
 */
const PILDORA_TOP_CON_BOTON = "top-[calc(7.25rem+env(safe-area-inset-top))]";
const PILDORA_TOP_SOLA = "top-[calc(0.75rem+env(safe-area-inset-top))]";

/**
 * A partir de qué proporción de la pantalla la hoja inferior estorba.
 *
 * Por debajo de la mitad queda espacio de sobra para el mapa y para los
 * controles, y esconderlos ahí sería quitarle a la persona el filtro de
 * zonas justo cuando está comparando municipios, que es cuando lo usa.
 */
const HOJA_TAPA_DESDE = 0.5;

/**
 * Los dos orígenes, con el color exacto con el que MapCanvas pinta sus
 * arcos mientras crecen. Si allá cambian, acá también.
 */
const ORIGENES_LEYENDA = [
  { nombre: "Cali", color: "#2f6fed" },
  { nombre: "Cartago", color: "#e6883c" },
] as const;

/**
 * La leyenda de orígenes, reducida a lo único que hay que saber: qué
 * color salió de dónde.
 *
 * Reemplaza a FlujosLegend, que explicaba además el grosor, el pulso y
 * los estados de los puntos. Todo eso era cierto y ninguno hacía falta:
 * el mapa se entiende sin leerlo, y una leyenda larga en la esquina de
 * un mapa se convierte en un cartel que nadie lee y que tapa territorio.
 *
 * Va con `pointer-events-none`: no es interactiva y no debe robarle
 * clics al mapa que tiene debajo.
 */
function LeyendaOrigenes() {
  return (
    <ul className="pointer-events-none flex items-center gap-3 rounded-full bg-[#123E5C]/80 px-3 py-1.5 text-[13px] font-semibold text-white shadow-lg backdrop-blur">
      {ORIGENES_LEYENDA.map((o) => (
        <li key={o.nombre} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="block size-2.5 rounded-full"
            style={{ background: o.color }}
          />
          {o.nombre}
        </li>
      ))}
    </ul>
  );
}

/**
 * La guía que aparece la primera vez, encima del mapa.
 *
 * QUÉ EXPLICA Y QUÉ NO
 *
 * Solo lo que no está dicho en ninguna otra parte de la pantalla. Los
 * colores de origen ya los dice la leyenda; qué hace cada control lo dice
 * su propia etiqueta; la línea de tiempo tiene su aviso cuando está
 * quieta. Repetir todo eso convertiría la guía en un texto que se cierra
 * sin leer, y entonces tampoco se leería lo único que sí hace falta.
 *
 * Lo que falta explicar es la rampa de color del territorio, que es
 * justamente lo primero que se ve al llegar y lo único que nadie puede
 * deducir: que el color de cada municipio significa cuánta ayuda recibió,
 * y que hay dos grises que no pertenecen a esa escala.
 *
 * Y una sola acción: que los municipios se pueden tocar. Los puntos ya lo
 * dicen en su globo al pasar el mouse, pero el área no, y en celular no
 * hay globo que valga porque no existe el paso del cursor.
 */
function GuiaDelMapa({
  raizRef,
  onCerrar,
}: {
  /** El contenedor del mapa. Es lo que delimita el "fuera". */
  raizRef: React.RefObject<HTMLDivElement | null>;
  onCerrar: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * Cerrar al tocar fuera del panel PERO DENTRO DEL MAPA.
   *
   * La escucha va sobre el contenedor del mapa y no sobre `document`, y
   * esa diferencia es todo: la guía se monta cuando carga la página, no
   * cuando el mapa aparece en pantalla, así que con `document` cualquier
   * clic del relato la cerraba sin que nadie la hubiera visto.
   *
   * `pointerdown` y no `click`: el mapa reacciona al arrastre, y
   * esperando al `click` un gesto de desplazamiento la dejaría abierta
   * mientras el mapa ya se movió debajo.
   *
   * Escape sí va en `document`: una tecla no tiene "dónde", y quien la
   * presiona ya está mirando el mapa.
   */
  useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz) return;

    const alTocarFuera = (evento: PointerEvent) => {
      if (panelRef.current?.contains(evento.target as Node)) return;
      onCerrar();
    };
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };
    raiz.addEventListener("pointerdown", alTocarFuera);
    document.addEventListener("keydown", alPresionar);
    return () => {
      raiz.removeEventListener("pointerdown", alTocarFuera);
      document.removeEventListener("keydown", alPresionar);
    };
  }, [onCerrar, raizRef]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Cómo leer este mapa"
        className="pointer-events-auto relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-full text-[#6B93AA] transition hover:bg-[#DDF0FA] hover:text-[#0079C1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1]"
        >
          <X className="size-5" aria-hidden />
        </button>

        <h2 className="vc-rotulo pr-10 text-[clamp(1.25rem,3vw,1.75rem)] text-[#0079C1]">
          ¿Cómo leer este mapa?
        </h2>

        <p className="mt-3 text-base leading-7 text-[#123E5C]">
          El color de cada municipio refleja la cantidad de ayudas recibidas. Los tonos más claros
          indican una menor cantidad y los más intensos, una mayor.
        </p>

        {/* OJO: la frase de arriba y esta rampa dicen cosas contrarias.
            TERRITORY_BLUE_RAMP va de oscuro a claro para menos → más
            volumen, así que acá el extremo claro es el de MAYOR cantidad.
            El texto es el aprobado y se deja tal cual; la contradicción
            está reportada y la resuelve quien lo redactó. */}
        <div className="mt-3 flex overflow-hidden rounded-md">
          {TERRITORY_BLUE_RAMP.map((color) => (
            <i key={color} className="block h-5 flex-1" style={{ background: color }} />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-sm text-[#6B93AA]">
          <span>Menor cantidad</span>
          <span>Mayor cantidad</span>
        </div>

        <ul className="mt-5 flex flex-col gap-3">
          <li className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-1 block size-4 shrink-0 rounded-sm"
              style={{ background: TERRITORY_NO_DATA }}
            />
            <span className="text-base leading-6 text-[#35708F]">Sin registro</span>
          </li>
          <li className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-1 block size-4 shrink-0 rounded-sm"
              style={{ background: TERRITORY_EXCLUDED }}
            />
            <span className="text-base leading-6 text-[#35708F]">
              Cali sigue una ruta independiente y no se incluye en el conteo municipal.
            </span>
          </li>
        </ul>

        <p className="mt-5 border-t border-[#0079C1]/12 pt-4 text-base leading-7 text-[#123E5C]">
          Haz clic en cualquier municipio para conocer qué recibió.
        </p>
      </div>
    </div>
  );
}

function useIsMobile(breakpointPx = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpointPx]);
  return isMobile;
}

/**
 * Alto de la ventana, en píxeles, o 0 mientras no se conozca.
 *
 * Va como estado y no se lee `window.innerHeight` en el render porque
 * esta página se dibuja también en el servidor, donde `window` no
 * existe. Leerlo directo tumba el render con "window is not defined".
 */
function useAltoPantalla(): number {
  const [alto, setAlto] = useState(0);
  useEffect(() => {
    const medir = () => setAlto(window.innerHeight);
    medir();
    window.addEventListener("resize", medir);
    // En iOS la barra del navegador aparece y desaparece al desplazarse,
    // y eso cambia el alto sin disparar `resize` en todos los casos.
    window.visualViewport?.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("resize", medir);
      window.visualViewport?.removeEventListener("resize", medir);
    };
  }, []);
  return alto;
}

interface DashboardPageProps {
  embedded?: boolean;
}

export function DashboardPage({ embedded = false }: DashboardPageProps) {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [linesDismissed, setLinesDismissed] = useState(false);

  /**
   * `lens` es CÓMO se lee el día que marca el timeline, no un segundo
   * reloj. Antes esto era `territoryMode` y venía con su propio slider de
   * jornada, independiente del timeline: se podía tener los arcos en el
   * día 14 y los polígonos pintados con el total final de la operación.
   * Ahora hay un solo control temporal, el Timeline, y este toggle solo
   * decide si ese día se lee como acumulado o como jornada suelta.
   *
   * Por defecto acumulado: mover una línea de tiempo normalmente
   * significa "mostrame cómo iba", no "mostrame solo ese día".
   */
  const [lens, setLens] = useState<TerritoryMapMode>("acumulado");
  const [territoryZone, setTerritoryZone] = useState<TerritoryZone | "todas">("todas");
  const [routesMode, setRoutesMode] = useState<TerritoryRoutesMode>("visibles");

  /**
   * Cuánto ocupa la hoja inferior en celular, en píxeles. 0 si no hay
   * ninguna abierta.
   *
   * Lo reporta HojaInferior en cada cuadro del arrastre, y lo consumen
   * tres cosas: el mapa, para correr su centro hacia arriba y que el
   * municipio tocado no quede detrás de la hoja; el timeline, para
   * subirse encima; y los controles, para apartarse cuando ya no caben.
   */
  const [altoHoja, setAltoHoja] = useState(0);

  /**
   * Si la hoja de filtros está abierta.
   *
   * El estado vive acá y no dentro de la barra porque la hoja se monta
   * al nivel de los paneles, no dentro del bloque inferior. Ahí abajo
   * heredaría el `pointer-events-none` del contenedor y se abriría sin
   * responder a nada, además de quedar atrapada en su contexto de
   * apilamiento.
   */
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  /**
   * Cada incremento le pide a MapCanvas que vuelva a encuadrar.
   *
   * Se hace con un contador y no con una función imperativa para no tener
   * que exponer una ref del mapa hacia afuera: DashboardPage no necesita
   * saber que adentro hay un MapLibre, solo declarar qué quiere.
   */
  const [vistaGeneralToken, setVistaGeneralToken] = useState(0);

  /**
   * La guía se muestra hasta que la persona toca el mapa por primera vez.
   *
   * No se guarda si ya se vio: el mapa vive dentro de una página que se
   * lee de una sentada, y quien vuelve a abrirla probablemente pasó
   * bastante tiempo desde la anterior. Recordarlo entre sesiones haría
   * falta si esto fuera una herramienta de uso diario, y no lo es.
   */
  const [mostrarGuia, setMostrarGuia] = useState(true);
  const cerrarGuia = useCallback(() => setMostrarGuia(false), []);
  const raizRef = useRef<HTMLDivElement>(null);

  // Actividad visible tipo "Instagram": no permitimos que una nueva llegada
  // reemplace inmediatamente la tarjeta que acaba de aparecer.
  const [visibleActivity, setVisibleActivity] = useState<ActivityFrame | null>(null);
  const lastShownAtRef = useRef(0);
  const MIN_GAP_BETWEEN_POPS_MS = 1200;

  const isMobile = useIsMobile();
  const altoPantalla = useAltoPantalla();

  const { data: origenes } = useOrigenes();
  const { data: destinos } = useDestinos();
  const { data: flujosResponse } = useFlujos();

  const timelineDates = useMemo(() => {
    if (!flujosResponse?.flujos) return [];
    const set = new Set<string>();
    flujosResponse.flujos.forEach((f) => (f.porFecha ?? []).forEach((p) => set.add(p.fecha)));
    return [...set].sort();
  }, [flujosResponse]);

  /** El único reloj. Todo lo temporal del mapa se deriva de acá. */
  const isoDate = viewState.timelineDate;
  const territoryDay = useMemo(() => dayFromIsoDate(isoDate), [isoDate]);

  const operacion = useOperacion();
  const foco = useFoco();
  const { data: ayuda } = useAyuda();

  const flujosParaMapa = useFlujosPorLente(flujosResponse?.flujos, lens, isoDate);

  /**
   * Entregas por municipio, indexadas por código DANE, para que el mapa
   * pinte con los datos de la API. El catálogo estático solo aporta la
   * zona y el código de los municipios que todavía no registran
   * entregas, para que aparezcan en gris y no desaparezcan del mapa.
   */
  const municipiosMapa = useMemo(() => {
    const mapa = new Map<string, MunicipioMapa>();

    // Arranca con todos los municipios del catálogo en cero, para que
    // los que aún no reciben aparezcan en gris en vez de desaparecer.
    for (const cat of operacion.catalogo) {
      mapa.set(cat.codigoDane, {
        nombre: cat.nombre,
        entregas: 0,
        dias: {},
        toneladas: 0,
        zona: cat.zona,
      });
    }

    for (const m of operacion.municipios) {
      const codigo = m.codigoDane ?? getTerritoryStat(m.nombre)?.codigoDane;
      if (!codigo) continue;
      mapa.set(codigo, {
        nombre: m.nombre,
        entregas: m.entregas,
        dias: m.dias,
        toneladas: m.toneladas,
        zona: m.zona ?? getTerritoryStat(m.nombre)?.zone ?? null,
      });
    }

    return mapa;
  }, [operacion.catalogo, operacion.municipios]);

  /**
   * Municipios a resaltar cuando se llega desde una categoría.
   *
   * La ruta devuelve los NOMBRES, no los códigos, porque
   * ENVIOS_CATEGORIA apunta a destinos y no todo destino tiene DANE. Se
   * cruzan contra el catálogo con el comparador que ignora tildes y
   * alias, el mismo que usa el mapa para la selección.
   */
  const resaltados = useMemo(() => {
    if (!foco.categoria) return null;

    const categoria = ayuda?.categorias.find((c) => c.nombre === foco.categoria);
    const nombres = categoria?.municipiosNombres;
    // Sin la lista, resaltar todo equivale a no resaltar nada, y es
    // preferible a dejar el mapa entero atenuado sin explicación.
    if (!nombres || nombres.length === 0) return null;

    const codigos = new Set<string>();
    for (const cat of operacion.catalogo) {
      if (nombres.some((n) => sameMunicipality(n, cat.nombre))) codigos.add(cat.codigoDane);
    }
    return codigos;
  }, [foco.categoria, ayuda, operacion.catalogo]);

  /**
   * Al llegar desde una ficha de municipio, se selecciona solo. Antes
   * había que buscarlo a mano en el mapa después del scroll.
   */
  useEffect(() => {
    if (!foco.municipio || !destinos) return;

    const destino = destinos.find((d) => sameMunicipality(d.nombre, foco.municipio));
    if (destino) setViewState((prev) => viewTransitions.toDestino(destino.id, prev));
  }, [foco.municipio, destinos]);

  const totalDespachosAsOf = useMemo(
    () => flujosParaMapa.reduce((sum, f) => sum + f.despachosCount, 0),
    [flujosParaMapa],
  );

  const flujosFiltrados = useMemo(() => {
    if (linesDismissed && !viewState.origenId && !viewState.destinoId) {
      return [];
    }
    if (viewState.origenId) {
      return flujosParaMapa.filter((f) => f.origenId === viewState.origenId);
    }
    if (viewState.destinoId) {
      return flujosParaMapa.filter((f) => f.destino.id === viewState.destinoId);
    }
    return flujosParaMapa;
  }, [flujosParaMapa, linesDismissed, viewState.origenId, viewState.destinoId]);

  /**
   * Zona de cada municipio, indexada por su nombre normalizado.
   *
   * Existe para que el filtro de zona de los ARCOS use exactamente la
   * misma fuente que el coloreo de los POLÍGONOS. Antes no era así: los
   * polígonos leían la zona viva por código DANE y los arcos la leían del
   * catálogo estático por nombre, con `getTerritoryStat(f.destino.nombre)`.
   *
   * Cuando ese nombre no calzaba, la función devolvía undefined, la
   * comparación fallaba contra CUALQUIER zona, y ese municipio se
   * quedaba sin línea en Norte, en Centro y en Sur, pero seguía pintado
   * porque el polígono había usado el código.
   *
   * Y no era un caso raro: 18 de los 42 municipios del Valle llevan
   * tilde o nombre compuesto —Riofrío, Tuluá, Calima - El Darién,
   * Guadalajara de Buga— y todos dependían de que esa búsqueda por texto
   * acertara.
   */
  const zonaPorMunicipio = useMemo(() => {
    const porNombre = new Map<string, string | null>();
    for (const m of municipiosMapa.values()) {
      porNombre.set(normMunicipalityName(m.nombre), m.zona);
    }
    return porNombre;
  }, [municipiosMapa]);

  const flujosParaRutas = useMemo(() => {
    const byZone =
      territoryZone === "todas"
        ? flujosFiltrados
        : flujosFiltrados.filter((f) => {
            const zona =
              zonaPorMunicipio.get(normMunicipalityName(f.destino.nombre)) ??
              // Último recurso, para destinos que no son municipios del
              // catálogo: el acopio de Cartago, las entidades, lo que
              // salió del departamento.
              getTerritoryStat(f.destino.nombre)?.zone ??
              null;
            return zona === territoryZone;
          });

    if (routesMode === "color") return [];
    if (routesMode === "solo" && !viewState.origenId && !viewState.destinoId) return [];
    return byZone;
  }, [
    flujosFiltrados,
    routesMode,
    territoryZone,
    viewState.destinoId,
    viewState.origenId,
    zonaPorMunicipio,
  ]);

  /**
   * Las zonas que existen en los datos, no una lista escrita a mano: si
   * el Excel reclasifica un municipio, el filtro se actualiza solo.
   *
   * Se calcula acá y no dentro de los controles porque ahora hay dos
   * juegos de controles, el de escritorio y el de celular, y duplicar el
   * cálculo es duplicar la regla.
   */
  const zonasDisponibles = useMemo(
    () =>
      [
        ...new Set(
          [...municipiosMapa.values()]
            .map((m) => m.zona)
            .filter((z): z is string => typeof z === "string" && z.length > 0),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [municipiosMapa],
  );

  /** Lo que se está mirando ahora mismo, con el lente y el día puestos. */
  const resumenVisible = useMemo(() => {
    const visibles = [...municipiosMapa.values()].filter(
      (m) => territoryZone === "todas" || m.zona === territoryZone,
    );
    return {
      entregas: visibles.reduce((sum, m) => sum + valorTemporal(m, lens, territoryDay), 0),
      municipios: visibles.filter((m) => valorTemporal(m, lens, territoryDay) > 0).length,
    };
  }, [municipiosMapa, territoryZone, lens, territoryDay]);

  const origenSeleccionado = useMemo(
    () => origenes?.find((o) => o.id === viewState.origenId) ?? null,
    [origenes, viewState.origenId],
  );

  const destinoSeleccionado = useMemo(
    () => destinos?.find((d) => d.id === viewState.destinoId) ?? null,
    [destinos, viewState.destinoId],
  );

  const seleccionNombre = origenSeleccionado?.nombre ?? destinoSeleccionado?.nombre ?? null;

  /**
   * Control de aparición de las notificaciones. El engine puede producir
   * varios frames mientras siguen llegando despachos; si una tarjeta
   * acaba de aparecer, no la reemplazamos durante 1200 ms.
   */
  const handleActivity = (frame: ActivityFrame | null) => {
    const now = performance.now();

    if (frame && now - lastShownAtRef.current < MIN_GAP_BETWEEN_POPS_MS && visibleActivity) {
      return;
    }

    if (frame) {
      lastShownAtRef.current = now;
    }

    setVisibleActivity(frame);
  };

  useEffect(() => {
    if (!viewState.timelineInstant) return;
    setViewState((prev) => viewTransitions.clearInstantFlag(prev));
  }, [viewState.timelineInstant, viewState.timelineDate]);

  const hayPanelAbierto = Boolean(viewState.destinoId || viewState.origenId);
  const hayPanelAbiertoEnMobile = isMobile && hayPanelAbierto;

  /**
   * Cuando no hay panel, la hoja no ocupa nada.
   *
   * HojaInferior ya avisa al desmontarse, pero este efecto es la red de
   * seguridad: si un panel se cierra por un camino que no desmonta la
   * hoja, el mapa se quedaría descentrado y el timeline flotando a media
   * pantalla, sin nada visible que explique por qué.
   */
  useEffect(() => {
    if (!hayPanelAbiertoEnMobile) setAltoHoja(0);
  }, [hayPanelAbiertoEnMobile]);

  /**
   * Abrir una ficha cierra los filtros.
   *
   * Las dos son hojas inferiores y se montarían una encima de la otra,
   * con la de filtros tapando justo la ficha que se acaba de pedir. Se
   * cierra la que la persona ya no está mirando.
   */
  useEffect(() => {
    if (hayPanelAbierto) setFiltrosAbiertos(false);
  }, [hayPanelAbierto]);

  /**
   * Los controles solo se esconden cuando la hoja pasa de la mitad de la
   * pantalla.
   *
   * Antes desaparecían apenas se abría una ficha. Eso le quitaba a la
   * persona el filtro de zonas y la línea de tiempo justo en el momento
   * en que estaba comparando municipios, que es cuando los usa. Con la
   * hoja asomada hay sitio de sobra para los tres.
   */
  const hojaTapaLosControles =
    hayPanelAbiertoEnMobile && altoPantalla > 0 && altoHoja > altoPantalla * HOJA_TAPA_DESDE;

  /**
   * Volver a donde estaba la persona antes de bajar al mapa.
   *
   * El FocoContext guarda el `scrollTop` del relato justo antes de
   * desplazarse hasta acá, así que `foco.volver()` devuelve al punto
   * exacto, no al comienzo de la sección.
   *
   * También se resetea el viewState. Sin eso, la persona se iba con la
   * ficha del municipio abierta y al bajar de nuevo al mapa se la
   * encontraba abierta sin haberla pedido en ese momento.
   */
  const volverAlRelato = () => {
    setViewState((prev) => viewTransitions.toAll(prev));
    foco.volver();
  };

  /**
   * Solo hay a dónde volver si se llegó por un enlace del relato. Quien
   * bajó con el scroll no ve el botón, porque no habría nada distinto a
   * donde ya está.
   *
   * En móvil se oculta apenas hay una ficha abierta, y no solo cuando la
   * hoja crece: queda en la esquina donde cae el pulgar al arrastrar.
   */
  const puedeVolver = foco.puedeVolver && !hayPanelAbiertoEnMobile;

  /**
   * Devolver el mapa a como estaba al abrirlo.
   *
   * Incluye la CÁMARA, que es lo que faltaba: `onReset` —el clic en una
   * zona vacía— limpia la selección, pero si alguien hizo zoom o arrastró
   * el mapa se quedaba donde lo dejó, y no había ninguna forma de
   * recuperar el encuadre del Valle completo salvo recargar la página.
   *
   * También vuelven a su valor inicial los tres controles de territorio.
   * Con solo limpiar la selección, quien había filtrado por Norte y
   * apagado las rutas seguía viendo un mapa que no se parecía al que
   * encontró al llegar, y el botón habría prometido más de lo que hace.
   *
   * El foco por categoría se limpia pero NO el regreso al relato: si la
   * persona llegó desde "Aseo personal", reiniciar la vista no debería
   * borrarle el camino de vuelta.
   */
  const reiniciarVista = () => {
    setLinesDismissed(false);
    setViewState((prev) => viewTransitions.exitTimeline(viewTransitions.toAll(prev)));
    setLens("acumulado");
    setTerritoryZone("todas");
    setRoutesMode("visibles");
    foco.limpiar();
    setVistaGeneralToken((n) => n + 1);
  };

  return (
    <div
      ref={raizRef}
      className={
        embedded
          ? "theme-ayudas relative h-full min-h-[26rem] w-full overflow-hidden bg-background"
          : "theme-ayudas relative h-dvh w-dvw overflow-hidden bg-background"
      }
    >
      <ClientOnly
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e14] text-xs text-muted-foreground">
            Cargando mapa…
          </div>
        }
      >
        <MapCanvas
          origenes={origenes ?? []}
          destinos={destinos ?? []}
          flujos={flujosParaRutas}
          instantTransition={viewState.timelineInstant}
          timelineActive={isoDate !== null}
          selectedDestinoId={viewState.destinoId}
          selectedOrigenId={viewState.origenId}
          territoryMode={lens}
          territoryDay={territoryDay}
          fechaActual={isoDate}
          territoryZone={territoryZone}
          municipios={municipiosMapa}
          pesoPorEntrega={operacion.pesoPorEntrega}
          /* Lo que ocupa la hoja abajo. El mapa corre su centro hacia
             arriba, así que el municipio recién tocado queda en la franja
             que sí se ve en vez de justo detrás de la hoja. */
          desplazamientoInferior={isMobile ? altoHoja : 0}
          resaltados={resaltados}
          routesMode={routesMode}
          vistaGeneralToken={vistaGeneralToken}
          /* Con la guía abierta el mapa no dibuja arcos: la cascada de
             entrada es lo primero que hay que ver, y reproducirla detrás
             de un panel es gastarla. Al cerrar la guía, arranca. */
          entradaHabilitada={!mostrarGuia}
          onActivity={handleActivity}
          onSelectDestino={(id) => {
            cerrarGuia();
            setLinesDismissed(false);
            setViewState((prev) => viewTransitions.toDestino(id, prev));
          }}
          onSelectOrigen={(id) => {
            cerrarGuia();
            setLinesDismissed(false);
            setViewState((prev) => viewTransitions.toOrigen(id, prev));
          }}
          onReset={() => {
            cerrarGuia();
            setLinesDismissed(true);
            setViewState((prev) => viewTransitions.exitTimeline(viewTransitions.toAll(prev)));
          }}
        />
      </ClientOnly>

      {mostrarGuia && <GuiaDelMapa raizRef={raizRef} onCerrar={cerrarGuia} />}

      {/* El marcador flotante NO se dibuja en celular.
          Decía "142 entregas" mientras el panel de abajo decía "215
          entregas": son cosas distintas —arcos dibujados contra enlaces a
          municipio— pero nadie que lea un mapa tiene por qué saberlo, y
          dos números con la misma etiqueta a un dedo de distancia son
          peor que ninguno. En celular manda la cifra de la barra
          inferior, que es la que responde a los filtros. */}
      {!isMobile && (
        <MarcadorHUD
          despachos={totalDespachosAsOf}
          day={territoryDay}
          lens={lens}
          instant={viewState.timelineInstant}
        />
      )}

      {/* Esquina superior izquierda, en una columna: primero cómo salir,
          después cómo leer. La leyenda de orígenes ya vivía acá; el botón
          de regreso se le pone encima en vez de buscarle otro rincón,
          porque un "volver" en cualquier otro lado no se encuentra.

          El contenedor va sin `pointer-events`, y cada hijo activa los
          suyos: si no, esta caja invisible se comería los clics del mapa
          en toda la esquina, incluso cuando no hay botón. */}
      <div
        className={`pointer-events-none absolute left-3 z-20 flex flex-col items-start gap-2 md:left-4 ${COLUMNA_TOP} ${COLUMNA_TOP_MD}`}
      >
        {puedeVolver && (
          <button
            type="button"
            onClick={volverAlRelato}
            className="pointer-events-auto inline-flex max-w-[min(18rem,calc(100vw-1.5rem))] items-center gap-2 rounded-full bg-[#FBF8C6] py-2 pl-3 pr-4 text-[15px] font-bold text-[#123E5C] shadow-lg transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400]"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            {/* La etiqueta es opcional: quien no la declara al enfocar
                obtiene un "Volver" a secas, que funciona igual. */}
            <span className="min-w-0 truncate">
              {foco.etiquetaRegreso ? `Volver a ${foco.etiquetaRegreso}` : "Volver"}
            </span>
          </button>
        )}

        {/* Reiniciar y la leyenda solo en escritorio. En celular los dos
            se mudaron a la barra inferior y a la hoja de filtros: acá
            arriba se pisaban con la barra superior y con el marcador, y
            entre los tres tapaban el cuarto superior del mapa. */}
        {!isMobile && (
          <>
            {/* Siempre visible, no solo cuando hay algo seleccionado: la
                razón más común para querer reiniciar es haber movido la
                cámara, y eso este componente no puede detectarlo. Un
                botón que aparece a veces obliga a recordar cuándo
                aparece. */}
            <button
              type="button"
              onClick={reiniciarVista}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[#123E5C]/80 py-1.5 pl-2.5 pr-3.5 text-[13px] font-semibold text-white shadow-lg backdrop-blur transition hover:bg-[#0079C1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400]"
            >
              <RotateCcw className="size-4 shrink-0" aria-hidden />
              Reiniciar vista
            </button>

            {!viewState.destinoId && !viewState.origenId && <LeyendaOrigenes />}
          </>
        )}
      </div>

      {/* El contenedor va SIN pointer-events. Antes era
          `pointer-events-auto` y, como abarca todo el ancho, funcionaba
          como una barra invisible que se comía los clics del borde
          superior del mapa. Quien tiene que recibirlos es la píldora. */}
      {foco.categoria && resaltados && (
        <div
          className={`pointer-events-none absolute inset-x-3 z-20 flex justify-center md:inset-x-0 md:top-[calc(0.75rem+env(safe-area-inset-top))] ${
            puedeVolver ? PILDORA_TOP_CON_BOTON : PILDORA_TOP_SOLA
          }`}
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-[#FFD400] py-2 pl-5 pr-2 shadow-lg">
            <span className="text-base font-bold text-[#123E5C]">
              {resaltados.size} municipios recibieron {foco.categoria.toLowerCase()}
            </span>
            <button
              type="button"
              onClick={foco.limpiar}
              className="rounded-full bg-[#123E5C] px-3 py-1 text-sm font-bold text-white transition hover:bg-[#0079C1]"
            >
              Ver todos
            </button>
          </div>
        </div>
      )}

      {/* En celular solo mientras corre la línea de tiempo, que es
          cuando "nueva entrega" significa algo. Fuera de ese momento era
          una tarjeta flotando sobre los controles sin nada que la
          hubiera pedido. */}
      {(!isMobile || isoDate !== null) && <AvisoEntrega frame={visibleActivity} />}

      <TopBar
        viewState={viewState}
        seleccionNombre={seleccionNombre}
        onGoToAll={() => {
          setLinesDismissed(false);
          setViewState((prev) => viewTransitions.toAll(prev));
        }}
      />

      {!isMobile && (
        <TerritoryControls
          municipios={municipiosMapa}
          lens={lens}
          day={territoryDay}
          iso={isoDate}
          zone={territoryZone}
          routesMode={routesMode}
          onLensChange={setLens}
          onZoneChange={setTerritoryZone}
          onRoutesModeChange={setRoutesMode}
        />
      )}

      {/* La hoja de filtros va acá, a la altura de los paneles, y no
          dentro del bloque inferior: ahí heredaría su `pointer-events-none`
          y se abriría sin poder tocarse. */}
      {isMobile && (
        <HojaFiltros
          abierta={filtrosAbiertos}
          onCerrar={() => setFiltrosAbiertos(false)}
          zonasDisponibles={zonasDisponibles}
          lens={lens}
          day={territoryDay}
          iso={isoDate}
          zone={territoryZone}
          routesMode={routesMode}
          onLensChange={setLens}
          onZoneChange={setTerritoryZone}
          onRoutesModeChange={setRoutesMode}
          onReiniciar={reiniciarVista}
        />
      )}

      {viewState.level === "DESTINO" && viewState.destinoId && (
        <DestinoPanel
          destinoId={viewState.destinoId}
          isMobile={isMobile}
          /* En celular el panel se dibuja dentro de una HojaInferior y
             reporta acá cuánto ocupa. Ver DestinoPanel. */
          onAlturaChange={setAltoHoja}
          onClose={() => setViewState((prev) => viewTransitions.toAll(prev))}
        />
      )}

      {viewState.level === "ORIGEN" && viewState.origenId && origenSeleccionado && (
        <OrigenPanel
          origenId={viewState.origenId}
          origenNombre={origenSeleccionado.nombre}
          flujos={flujosFiltrados}
          isMobile={isMobile}
          enFechaSeleccionada={isoDate !== null}
          onAlturaChange={setAltoHoja}
          /* Mismo camino que el clic en el mapa: al elegir un destino
             desde la lista del origen, el panel del origen se reemplaza
             por el del destino. No hace falta cerrarlo antes, la
             transición de nivel del viewState ya se encarga. */
          onSelectDestino={(id) => {
            setLinesDismissed(false);
            setViewState((prev) => viewTransitions.toDestino(id, prev));
          }}
          onClose={() => setViewState((prev) => viewTransitions.toAll(prev))}
        />
      )}

      {/* UNA sola región abajo, no dos flotando por separado. Antes los
          controles vivían pegados al borde izquierdo y la línea de tiempo
          centrada más abajo, y entre las dos partían el tercio inferior
          en dos franjas que no se leían como un conjunto.

          Sube con la hoja para no quedar debajo de ella. */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 flex flex-col items-stretch gap-2 px-3 md:items-center"
        style={{
          bottom: `calc(0.75rem + env(safe-area-inset-bottom) + ${isMobile ? altoHoja : 0}px)`,
          transition: "bottom 220ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {isMobile && !hojaTapaLosControles && (
          <BarraMovil
            entregas={resumenVisible.entregas}
            municipios={resumenVisible.municipios}
            lens={lens}
            day={territoryDay}
            iso={isoDate}
            zone={territoryZone}
            routesMode={routesMode}
            filtrosAbiertos={filtrosAbiertos}
            onAbrirFiltros={() => setFiltrosAbiertos(true)}
            onReiniciar={reiniciarVista}
          />
        )}

        {!hojaTapaLosControles && (
          /* `justify-center` para que en escritorio la píldora quede
             centrada, y `w-full` en el hijo para que en celular ocupe
             todo el ancho disponible: ahí el deslizador necesita cada
             píxel que haya. */
          <div className="flex w-full justify-center [&>*]:w-full md:[&>*]:w-auto">
            <Timeline
              dates={timelineDates}
              currentDate={viewState.timelineDate}
              onActivate={(first) => {
                setLinesDismissed(false);
                setViewState((prev) => viewTransitions.startTimeline(first, prev));
              }}
              onSeek={(date) => {
                setLinesDismissed(false);
                setViewState((prev) => viewTransitions.seekTimeline(date, prev));
              }}
              onAdvance={(date) => {
                setLinesDismissed(false);
                setViewState((prev) => viewTransitions.advanceTimeline(date, prev));
              }}
              onExit={() => {
                setLinesDismissed(false);
                setViewState((prev) => viewTransitions.exitTimeline(prev));
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface TerritoryControlsProps {
  municipios: ReadonlyMap<string, MunicipioMapa>;
  lens: TerritoryMapMode;
  /** Derivado del timeline. null = toda la operación. */
  day: string | null;
  /** La fecha ISO del día elegido, para poder nombrar el mes. */
  iso: string | null;
  zone: TerritoryZone | "todas";
  routesMode: TerritoryRoutesMode;
  onLensChange: (lens: TerritoryMapMode) => void;
  onZoneChange: (zone: TerritoryZone | "todas") => void;
  onRoutesModeChange: (mode: TerritoryRoutesMode) => void;
}

const TODAS = "todas";

function TerritoryControls({
  municipios,
  lens,
  day,
  iso,
  zone,
  routesMode,
  onLensChange,
  onZoneChange,
  onRoutesModeChange,
}: TerritoryControlsProps) {
  // Los mismos datos que pinta el mapa. Antes esto sumaba el catálogo
  // estático y el panel mostraba un total distinto al del resto de la
  // página.
  // Las zonas salen de los datos, no de una lista escrita a mano: si el
  // Excel reclasifica un municipio, el filtro se actualiza solo.
  const zonasDisponibles = [
    ...new Set(
      [...municipios.values()]
        .map((m) => m.zona)
        .filter((z): z is string => typeof z === "string" && z.length > 0),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

  const visibleMunicipalities = [...municipios.values()].filter(
    (m) => zone === "todas" || m.zona === zone,
  );

  const totalDespachos = visibleMunicipalities.reduce(
    (sum, m) => sum + valorTemporal(m, lens, day),
    0,
  );
  const conEntregas = visibleMunicipalities.filter((m) => valorTemporal(m, lens, day) > 0).length;

  return (
    /* Solo escritorio. Esquina inferior izquierda, donde primero se
       entiende de dónde sale cada línea con la leyenda y después se
       filtra el territorio. En celular esto lo reemplaza ControlesMovil:
       nueve botones en el borde de un teléfono dejaban al mapa sin
       espacio y ninguno llegaba al tamaño mínimo de un pulgar. */
    <aside className="pointer-events-auto absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 z-10 hidden max-h-[52dvh] w-[20rem] overflow-y-auto rounded-lg border border-border bg-surface/95 p-3 shadow-lg backdrop-blur md:block">
      {/* Dos datos en una línea. La cifra grande ya vive en el marcador,
          así que acá alcanza con decir qué se está viendo. */}
      <p className="text-[15px] leading-tight text-foreground">
        <b className="font-semibold">{plural(totalDespachos, "entrega", "entregas")}</b> en{" "}
        {plural(conEntregas, "municipio", "municipios")}
        <span className="text-muted-foreground"> · {describeLens(lens, day, iso)}</span>
      </p>

      <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-background/70 p-1">
        <ToggleButton active={lens === "acumulado"} onClick={() => onLensChange("acumulado")}>
          Todo lo entregado
        </ToggleButton>
        <ToggleButton
          active={lens === "jornada"}
          onClick={() => onLensChange("jornada")}
          disabled={day === null}
          title={day === null ? "Elige una jornada en la línea de tiempo" : undefined}
        >
          Solo ese día
        </ToggleButton>
      </div>

      {day === null && lens === "acumulado" && (
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          Mueva la línea de tiempo para ver cómo se entregaron las ayudas día por día.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {[TODAS, ...zonasDisponibles].map((item) => (
          <ToggleButton
            key={item}
            active={zone === item}
            onClick={() => onZoneChange(item as TerritoryZone | "todas")}
          >
            {item === TODAS ? "Todas" : item}
          </ToggleButton>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1 rounded-md bg-background/70 p-1">
        <ToggleButton
          active={routesMode === "visibles"}
          onClick={() => onRoutesModeChange("visibles")}
        >
          Ver rutas
        </ToggleButton>
        <ToggleButton active={routesMode === "solo"} onClick={() => onRoutesModeChange("solo")}>
          Solo lo elegido
        </ToggleButton>
        <ToggleButton active={routesMode === "color"} onClick={() => onRoutesModeChange("color")}>
          Sin rutas
        </ToggleButton>
      </div>
    </aside>
  );
}

/** "1 municipio" y no "1 municipios". */
function plural(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString("es-CO")} ${n === 1 ? uno : varios}`;
}

function ToggleButton({
  active,
  onClick,
  children,
  disabled = false,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      /* `min-h-11` es el mínimo cómodo para un pulgar. Con el alto que
         daba el padding solo, estos botones medían 32 px y en celular
         obligaban a apuntar, justo en el borde inferior de la pantalla,
         que es donde peor se acierta. */
      className={`min-h-11 rounded px-2 py-1.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0 ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}