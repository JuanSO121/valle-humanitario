import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useOrigenes, useDestinos, useFlujos } from "@/application/hooks/useCatalogQueries";
import { useFlujosPorLente } from "@/application/hooks/useFlujosPorLente";
import {
  INITIAL_VIEW_STATE,
  viewTransitions,
  type ViewState,
} from "@/presentation/state/viewState";
import { MapCanvas, type MunicipioMapa } from "@/presentation/components/MapCanvas";
import { Timeline } from "@/presentation/components/Timeline";
import { MarcadorHUD } from "@/presentation/components/MarcadorHUD";
import { AvisoEntrega } from "@/presentation/components/AvisoEntrega";
import { DestinoPanel } from "@/presentation/components/DestinoPanel";
import { OrigenPanel } from "@/presentation/components/OrigenPanel";
import { TopBar } from "@/presentation/components/TopBar";
import { useOperacion } from "@/presentation/state/OperacionContext";
import { useFoco } from "@/presentation/state/FocoContext";
import { useAyuda } from "@/application/hooks/useAyuda";
import { normMunicipalityName, sameMunicipality } from "@/lib/municipalityName";
import {
  getTerritoryStat,
  type TerritoryMapMode,
  type TerritoryRoutesMode,
  type TerritoryZone,
} from "@/presentation/data/territoryData";
import {
  dayFromIsoDate,
  describeLens,
  valorTemporal,
} from "@/presentation/data/territoryTime";
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
const COLUMNA_TOP = "top-[calc(3.5rem+env(safe-area-inset-top))]";
const COLUMNA_TOP_MD = "md:top-[calc(4rem+env(safe-area-inset-top))]";

/**
 * Dónde cae la píldora de categoría en móvil cuando hay botón de volver.
 *
 * Es la altura de la columna más el alto del botón —unos 40 px— más aire.
 * Si cambia COLUMNA_TOP, este número se recalcula igual.
 */
const PILDORA_TOP_CON_BOTON = "top-[calc(6.5rem+env(safe-area-inset-top))]";
const PILDORA_TOP_SOLA = "top-[calc(0.75rem+env(safe-area-inset-top))]";

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
   * Cada incremento le pide a MapCanvas que vuelva a encuadrar.
   *
   * Se hace con un contador y no con una función imperativa para no tener
   * que exponer una ref del mapa hacia afuera: DashboardPage no necesita
   * saber que adentro hay un MapLibre, solo declarar qué quiere.
   */
  const [vistaGeneralToken, setVistaGeneralToken] = useState(0);

  // Actividad visible tipo "Instagram": no permitimos que una nueva llegada
  // reemplace inmediatamente la tarjeta que acaba de aparecer.
  const [visibleActivity, setVisibleActivity] = useState<ActivityFrame | null>(null);
  const lastShownAtRef = useRef(0);
  const MIN_GAP_BETWEEN_POPS_MS = 1200;

  const isMobile = useIsMobile();

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
   * porque el polígono había usado el código. Eso era el "algunos quedan
   * como si no hicieran parte".
   *
   * Y no era un caso raro: 18 de los 42 municipios del Valle llevan
   * tilde o nombre compuesto —Riofrío, Tuluá, Calima - El Darién,
   * Guadalajara de Buga— y todos dependían de que esa búsqueda por texto
   * acertara.
   *
   * `normMunicipalityName` es el mismo normalizador que usa el mapa para
   * resolver el clic sobre un área: hace case-fold, saca tildes y
   * resuelve los alias conocidos.
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

  const hayPanelAbiertoEnMobile = isMobile && (viewState.destinoId || viewState.origenId);

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
   * En móvil se oculta mientras hay un panel abierto, igual que los
   * demás controles: el panel ya ocupa la pantalla y tiene su propio
   * cierre.
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
          territoryZone={territoryZone}
          municipios={municipiosMapa}
          resaltados={resaltados}
          routesMode={routesMode}
          vistaGeneralToken={vistaGeneralToken}
          onActivity={handleActivity}
          onSelectDestino={(id) => {
            setLinesDismissed(false);
            setViewState((prev) => viewTransitions.toDestino(id, prev));
          }}
          onSelectOrigen={(id) => {
            setLinesDismissed(false);
            setViewState((prev) => viewTransitions.toOrigen(id, prev));
          }}
          onReset={() => {
            setLinesDismissed(true);
            setViewState((prev) => viewTransitions.exitTimeline(viewTransitions.toAll(prev)));
          }}
        />
      </ClientOnly>

      <MarcadorHUD
        despachos={totalDespachosAsOf}
        day={territoryDay}
        lens={lens}
        instant={viewState.timelineInstant}
      />

      {/* Esquina superior izquierda, en una columna: primero cómo salir,
          después cómo leer. La leyenda de orígenes ya vivía acá; el botón
          de regreso se le pone encima en vez de buscarle otro rincón,
          porque un "volver" en cualquier otro lado no se encuentra.

          La columna entera arranca más abajo que el borde: pegada
          arriba, el botón competía con el marcador y con la barra
          superior del mapa. La leyenda baja con él a propósito, para que
          la distancia entre los dos siga siendo la que se decidió y no un
          resto de mover uno solo.

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

        {/* Siempre visible, no solo cuando hay algo seleccionado: la
            razón más común para querer reiniciar es haber movido la
            cámara, y eso este componente no puede detectarlo. Un botón
            que aparece a veces obliga a recordar cuándo aparece. */}
        <button
          type="button"
          onClick={reiniciarVista}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[#123E5C]/80 py-1.5 pl-2.5 pr-3.5 text-[13px] font-semibold text-white shadow-lg backdrop-blur transition hover:bg-[#0079C1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400]"
        >
          <RotateCcw className="size-4 shrink-0" aria-hidden />
          Reiniciar vista
        </button>

        {!viewState.destinoId && !viewState.origenId && <LeyendaOrigenes />}
      </div>

      {/* El contenedor va SIN pointer-events. Antes era
          `pointer-events-auto` y, como abarca todo el ancho, funcionaba
          como una barra invisible que se comía los clics del borde
          superior del mapa. Quien tiene que recibirlos es la píldora.

          En móvil baja cuando hay botón de regreso, que ocupa la esquina
          izquierda a esa misma altura. En escritorio no hace falta: uno
          está a la izquierda y la otra al centro. */}
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

      <AvisoEntrega frame={visibleActivity} />

      <TopBar
        viewState={viewState}
        seleccionNombre={seleccionNombre}
        onGoToAll={() => {
          setLinesDismissed(false);
          setViewState((prev) => viewTransitions.toAll(prev));
        }}
      />

      {!hayPanelAbiertoEnMobile && (
        <TerritoryControls
          municipios={municipiosMapa}
          lens={lens}
          day={territoryDay}
          zone={territoryZone}
          routesMode={routesMode}
          onLensChange={setLens}
          onZoneChange={setTerritoryZone}
          onRoutesModeChange={setRoutesMode}
        />
      )}

      {viewState.level === "DESTINO" && viewState.destinoId && (
        <DestinoPanel
          destinoId={viewState.destinoId}
          isMobile={isMobile}
          onClose={() => setViewState((prev) => viewTransitions.toAll(prev))}
        />
      )}

      {viewState.level === "ORIGEN" && viewState.origenId && origenSeleccionado && (
        <OrigenPanel
          origenId={viewState.origenId}
          origenNombre={origenSeleccionado.nombre}
          flujos={flujosFiltrados}
          isMobile={isMobile}
          onClose={() => setViewState((prev) => viewTransitions.toAll(prev))}
        />
      )}

      {!hayPanelAbiertoEnMobile && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 flex justify-center px-3">
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
  );
}

interface TerritoryControlsProps {
  municipios: ReadonlyMap<string, MunicipioMapa>;
  lens: TerritoryMapMode;
  /** Derivado del timeline. null = toda la operación. */
  day: string | null;
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
  const conEntregas = visibleMunicipalities.filter(
    (m) => valorTemporal(m, lens, day) > 0,
  ).length;

  return (
    /* Esquina inferior izquierda. Antes iba arriba a la izquierda, donde
       ahora está la leyenda de orígenes: primero se entiende de dónde
       sale cada línea y después se filtra el territorio. */
    <aside className="pointer-events-auto absolute inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 max-h-[45dvh] overflow-y-auto rounded-lg border border-border bg-surface/95 p-3 shadow-lg backdrop-blur md:inset-x-auto md:left-4 md:max-h-[52dvh] md:w-[20rem]">
      {/* Dos datos en una línea. La cifra grande ya vive en el marcador,
          así que acá alcanza con decir qué se está viendo. */}
      <p className="text-[15px] leading-tight text-foreground">
        <b className="font-semibold">{plural(totalDespachos, "despacho", "despachos")}</b>{" "}
        en {plural(conEntregas, "municipio", "municipios")}
        <span className="text-muted-foreground"> · {describeLens(lens, day)}</span>
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
      className={`rounded px-2 py-1.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}