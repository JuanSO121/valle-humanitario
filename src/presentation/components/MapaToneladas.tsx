/**
 * MapaToneladas.tsx — "Mapa de Ayudas"
 * -----------------------------------------------------------------------
 * Los 42 municipios del Valle, pintados según las toneladas aproximadas
 * que recibieron, con la línea de tiempo del mapa de siempre: se mueve el
 * deslizador (o se reproduce, día por día) y cada municipio se enciende
 * cuando le llega ayuda.
 *
 * LA IDENTIDAD ES LA DEL MAPA ORIGINAL
 *
 * Mismo tema oscuro (`theme-ayudas`), mismas píldoras arriba, mismo
 * marcador de «Ayuda entregada» con sus dígitos rodantes, mismo panel de
 * filtros, misma línea de tiempo, mismo «¿Cómo leer este mapa?» y la misma
 * rampa de azules, de menos a más volumen. Cambia el dato, no el diseño.
 *
 * QUÉ SE PUEDE MOSTRAR CON EL DATO NUEVO, Y QUÉ NO
 *
 * El consolidado trae fecha, destino y peso de cada despacho, así que todo
 * lo que depende del TIEMPO y del PESO está: línea de tiempo por día,
 * acumulado, «solo ese día», pulsos de llegada y el detalle por municipio.
 * No trae el ORIGEN de cada despacho. Por eso las líneas animadas NO dicen
 * «este despacho salió de aquí»: son un trazo ESQUEMÁTICO desde el centro de
 * acopio de Cali (el de la Gobernación) hasta cada municipio que recibe
 * ayuda, para ver cómo se va extendiendo la entrega. La leyenda y el
 * «¿Cómo leer este mapa?» lo dicen. Si algún día el Excel registra el punto
 * de salida de cada despacho, el origen de cada arco sale de ahí.
 *
 * LA ESCALA
 *
 * Seis tonos por cuantiles de lo que recibieron los municipios, calculados
 * sobre TODO el período (no sobre el día): así un municipio no cambia de
 * color porque otro dejó de recibir. Un municipio sin despachos en la
 * ventana que se mira va en gris, distinto del tono más claro: «no hay
 * registro» no es «poco».
 *
 * ACCESIBLE: un mapa no se opera con teclado ni lo lee un lector de
 * pantalla. Las mismas cifras están, municipio por municipio, en
 * «¿Cuánta ayuda recibió cada municipio?», y el mapa lo indica.
 * -----------------------------------------------------------------------
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  GeoJSONSourceSpecification,
  Map as MapLibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { CircleHelp, RotateCcw, X } from "lucide-react";
import { useMunicipios, useResumen } from "@/application/hooks/useTablero";
import type { Municipio, Zona } from "@/domain/entities";
import { valleMunicipios } from "@/data/valleMunicipios";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFirstVisit } from "@/hooks/use-first-visit";
import { diaMes, entero, toneladas } from "@/lib/formato";
import { sameMunicipality } from "@/lib/municipalityName";
import { colorDeGrupo } from "@/presentation/data/categorias";
import { buildArcCoordinates, buildPulseGradient, type LngLat } from "./arcGeometry";
import { createArcAnimationEngine } from "./arcAnimationEngine";
import { createArrivalPulseEngine } from "./arrivalPulseEngine";
import { ContextualPanel } from "./ContextualPanel";
import { Timeline } from "./Timeline";

maplibregl.setWorkerUrl(maplibreWorkerUrl);

/**
 * El Valle completo (de Buenaventura a Ulloa, de Jamundí a El Águila). Se
 * encuadra con fitBounds y no con centro y zoom fijos: así llena la
 * pantalla igual en un teléfono vertical que en un monitor.
 */
const VALLE: [[number, number], [number, number]] = [
  [-77.55, 3.05],
  [-75.65, 4.95],
];

/** La rampa del mapa original, de menos a más volumen. Es diseño, no dato. */
/**
 * Márgenes con que se encuadra el Valle: dejan sitio a lo que flota sobre el mapa.
 * En celular son mayores: arriba van la fila de botones y la tarjeta de toneladas
 * (unos 190 px) y abajo la línea de tiempo en dos filas; con los márgenes de
 * escritorio la punta norte del Valle quedaba tapada por la tarjeta.
 */
const encuadre = () =>
  typeof window !== "undefined" && window.innerWidth < 768
    ? { top: 195, bottom: 150, left: 16, right: 16 }
    : { top: 110, bottom: 130, left: 24, right: 24 };
const RAMPA = ["#0F3149", "#175A80", "#2181B4", "#3FAEDC", "#86D3F0", "#C6ECFB"] as const;
const SIN_REGISTRO = "#33404B";
const FUERA_DEL_FILTRO = "#102332";
const SELECCIONADO = "#FFD400";

/** El centro de acopio de la Gobernación, desde donde parten las líneas. */
const DANE_CALI = "76001";
const COLOR_ORIGEN = "#2f6fed";
const COLOR_PUNTO = "#E2690E";
const COLOR_ARCO_TENUE = "rgba(232,236,243,0.22)";
const COLOR_ARCO_PULSO = "#e8ecf3";

/** Grosor de la línea según las toneladas que lleva: crece despacio. */
const anchoDeLinea = (t: number) => 1.4 + Math.sqrt(Math.max(0, t)) * 0.75;

const ESTILO: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    },
  },
  layers: [
    // Gris niebla azulado: el fondo tiene que LEERSE como fondo.
    { id: "bg", type: "background", paint: { "background-color": "#33404B" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 0.12,
        "raster-saturation": -0.7,
        "raster-brightness-min": 0.25,
        "raster-brightness-max": 0.8,
      },
    },
  ],
};

type Lente = "acumulado" | "jornada";
type FiltroZona = Zona | "todas";
/**
 * «auto»: las líneas solo aparecen cuando hay algo que contar: al elegir un
 * municipio (su línea) o mientras corre la línea de tiempo (las del día).
 * Quietas y todas a la vez saturan el mapa. «ninguna»: nunca.
 */
type ModoRutas = "auto" | "ninguna";

interface Limite {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: unknown;
}
interface Limites {
  type: "FeatureCollection";
  features: Limite[];
}

/** Cortes entre tonos: cuantiles de las toneladas de los municipios con despachos. */
function cortesDe(valores: number[]): number[] {
  const v = valores.filter((x) => x > 0).sort((a, b) => a - b);
  if (v.length === 0) return [];
  const out: number[] = [];
  for (let i = 1; i < RAMPA.length; i++) {
    const q = v[Math.min(v.length - 1, Math.floor((i * v.length) / RAMPA.length))]!;
    // `step` exige cortes estrictamente crecientes.
    if (out.length === 0 || q > out[out.length - 1]!) out.push(q);
  }
  return out;
}

/** Toneladas de un municipio en la ventana que se mira. */
function valorEn(m: Municipio, lente: Lente, fecha: string | null): number {
  if (fecha === null) return m.toneladas;
  let suma = 0;
  for (const d of m.dias ?? []) {
    if (lente === "jornada" ? d.fecha === fecha : d.fecha <= fecha) suma += d.toneladas;
  }
  return suma;
}

export function MapaToneladas() {
  const { data } = useMunicipios();
  const municipios = data && data.disponible ? data.municipios : null;
  if (data && !data.disponible) {
    return (
      <div className="theme-ayudas flex h-full items-center justify-center bg-background px-6 text-center text-foreground/80">
        El mapa no está disponible en este momento.
      </div>
    );
  }
  if (!municipios) {
    return (
      <div className="theme-ayudas flex h-full items-center justify-center bg-background text-sm text-foreground/70">
        Cargando mapa…
      </div>
    );
  }
  return <Mapa municipios={municipios} />;
}

function Mapa({ municipios }: { municipios: Municipio[] }) {
  const isMobile = useIsMobile();
  const intro = useFirstVisit("mapa-ayudas-intro-v2");
  const [ayuda, setAyuda] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapLibreMap | null>(null);
  const cargado = useRef(false);
  const pulsos = useRef(createArrivalPulseEngine());
  const motor = useRef(createArcAnimationEngine());
  const coordsArcos = useRef(new Map<string, LngLat[]>());
  // «snap»: el cambio salta (no se anima); «advance»: avanzó un día y los arcos nuevos crecen.
  const cambio = useRef<"snap" | "advance">("snap");
  const firmaAsentados = useRef("");
  // ¿Ya movieron el mapa (arrastre, zoom, selección)? Si no, al cambiar el tamaño del
  // contenedor se vuelve a encuadrar el Valle; si sí, se respeta su vista.
  const vistaLibre = useRef(false);
  // Para no reescribir cada cuadro las capas que ya están vacías.
  const crecenVacio = useRef(true);
  const pulsosVacio = useRef(true);

  const [fecha, setFecha] = useState<string | null>(null);
  const [lente, setLente] = useState<Lente>("acumulado");
  const [zona, setZona] = useState<FiltroZona>("todas");
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [rutas, setRutas] = useState<ModoRutas>("auto");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [vistaToken, setVistaToken] = useState(0);

  // Las fechas con despachos, ordenadas: son los pasos de la línea de tiempo.
  const fechas = useMemo(() => {
    const s = new Set<string>();
    for (const m of municipios) for (const d of m.dias ?? []) s.add(d.fecha);
    return [...s].sort();
  }, [municipios]);

  const porDane = useMemo(() => new Map(municipios.map((m) => [m.codigoDane, m])), [municipios]);

  // Cortes fijos: sobre el período entero, para cada lente.
  const cortes = useMemo(() => {
    const totales = municipios.map((m) => m.toneladas);
    const dias: number[] = [];
    for (const m of municipios) for (const d of m.dias ?? []) dias.push(d.toneladas);
    return { acumulado: cortesDe(totales), jornada: cortesDe(dias) };
  }, [municipios]);

  const enZona = useCallback((m: Municipio) => zona === "todas" || m.zona === zona, [zona]);

  /** Lo que se ve en el marcador y en el panel de controles. */
  const resumen = useMemo(() => {
    let t = 0;
    let con = 0;
    for (const m of municipios) {
      if (!enZona(m)) continue;
      const v = valorEn(m, lente, fecha);
      t += v;
      if (v > 0) con += 1;
    }
    return { toneladas: t, municipios: con };
  }, [municipios, enZona, lente, fecha]);

  const zonas = useMemo(
    () => [...new Set(municipios.map((m) => m.zona))].sort((a, b) => a.localeCompare(b, "es")),
    [municipios],
  );
  const elegido = seleccion ? (porDane.get(seleccion) ?? null) : null;

  // Los puntos de distribución: destinos del consolidado que no son un
  // municipio sino un lugar DENTRO de uno («Cartago – CAP»). Su peso no suma
  // al municipio; acá se dice. Sale del resumen, sin escribir nada a mano.
  const { data: resumenApi } = useResumen();
  const puntosPorDane = useMemo(() => {
    const out = new Map<string, { nombre: string; toneladas: number }[]>();
    if (!resumenApi || !resumenApi.disponible) return out;
    for (const d of resumenApi.calidad.traslados.destinos) {
      const prefijo = d.nombre.split(/\s[–-]\s/)[0] ?? "";
      const m = municipios.find((x) => sameMunicipality(x.nombre, prefijo));
      if (!m) continue;
      const lugar = d.nombre
        .slice(prefijo.length)
        .replace(/^\s[–-]\s/, "")
        .trim();
      out.set(m.codigoDane, [
        ...(out.get(m.codigoDane) ?? []),
        { nombre: lugar || d.nombre, toneladas: d.toneladas },
      ]);
    }
    return out;
  }, [resumenApi, municipios]);

  const origen = useMemo<LngLat | null>(() => {
    const cali = porDane.get(DANE_CALI);
    return cali ? [cali.longitud, cali.latitud] : null;
  }, [porDane]);

  /**
   * Las líneas del momento, con una regla única:
   *
   *   · con la línea de tiempo en el día X: una línea desde Cali a cada municipio
   *     que recibió ayuda ESE día, con el peso de ese día. Las de los días
   *     anteriores no se dibujan: el color del municipio ya guarda lo acumulado;
   *     la línea cuenta lo que pasa hoy.
   *   · sin línea de tiempo y con un municipio elegido: su línea, con su total.
   *   · sin ninguna de las dos: ninguna (un mapa quieto con todas las líneas satura).
   *
   * La clave lleva el día: dos días seguidos al mismo municipio son dos líneas
   * distintas, y por eso la segunda vuelve a animarse.
   */
  const arcosVivos = useMemo(() => {
    if (!origen || rutas === "ninguna") return [];
    if (!seleccion && fecha === null) return [];
    return municipios
      .filter((m) => m.codigoDane !== DANE_CALI && enZona(m))
      .filter((m) => !seleccion || m.codigoDane === seleccion)
      .map((m) => ({
        m,
        clave: `CALI::${m.codigoDane}::${fecha ?? "total"}`,
        peso: fecha === null ? m.toneladas : valorEn(m, "jornada", fecha),
      }))
      .filter((x) => x.peso > 0);
  }, [municipios, origen, rutas, enZona, seleccion, fecha]);

  const hayLineas = arcosVivos.length > 0;

  // --- creación del mapa (una sola vez) ---------------------------------
  const limites = useMemo<Limites>(() => {
    const base = valleMunicipios as unknown as Limites;
    return {
      type: "FeatureCollection",
      features: base.features.map((f) => ({
        ...f,
        properties: {
          dane: String(f.properties["municipalityCode"] ?? ""),
          valor: -1,
          estado: 0,
          hoy: 0,
        },
      })),
    };
  }, []);

  useEffect(() => {
    if (!contenedor.current || mapaRef.current) return;
    const map = new maplibregl.Map({
      container: contenedor.current,
      style: ESTILO,
      bounds: VALLE,
      fitBoundsOptions: { padding: encuadre() },
      attributionControl: { compact: true },
      // El mapa ocupa toda la pantalla: sin esto, al bajar por la página con
      // la rueda del ratón (o con un dedo en el celular) el mapa se queda con
      // el gesto, se aleja hasta quedar vacío y la página no baja. Con gestos
      // cooperativos la rueda desplaza la página; para acercar, Ctrl + rueda
      // (o dos dedos en el celular).
      cooperativeGestures: true,
      locale: {
        "CooperativeGesturesHandler.WindowsHelpText":
          "Use Ctrl + rueda del ratón para acercar el mapa",
        "CooperativeGesturesHandler.MacHelpText": "Use ⌘ + rueda del ratón para acercar el mapa",
        "CooperativeGesturesHandler.MobileHelpText": "Use dos dedos para mover el mapa",
      },
    });
    mapaRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");

    // Si la persona mueve el mapa, su vista se respeta. Si no, al cambiar el
    // tamaño del contenedor (la barra del navegador del celular que se esconde,
    // girar el teléfono, un iframe que crece) se vuelve a encuadrar el Valle:
    // sin esto el mapa quedaba descentrado o cortado («se desfasa»).
    const marcarLibre = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) vistaLibre.current = true;
    };
    map.on("dragstart", marcarLibre);
    map.on("zoomstart", marcarLibre);

    // Tocar el mapa cuando solo se ve una parte de él (la página quedó a medio
    // camino) lo trae completo a la pantalla: la persona pasa a estar «dentro»
    // del mapa, con su sección alineada arriba, como al llegar por el menú.
    // Solo con un toque o clic, no con un arrastre: maplibre no emite `click`
    // al terminar de arrastrar.
    map.on("click", () => {
      const seccion = contenedor.current?.closest("section");
      const marco = seccion?.parentElement;
      if (!seccion || !marco) return;
      const desfase = seccion.getBoundingClientRect().top - marco.getBoundingClientRect().top;
      if (Math.abs(desfase) < 6) return;
      const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      seccion.scrollIntoView({ block: "start", behavior: quieto ? "auto" : "smooth" });
    });
    let anchoPrevio = 0;
    let altoPrevio = 0;
    const observador = new ResizeObserver(([entrada]) => {
      const caja = entrada?.contentRect;
      if (!caja || caja.width === 0 || caja.height === 0) return;
      if (Math.abs(caja.width - anchoPrevio) < 1 && Math.abs(caja.height - altoPrevio) < 1) return;
      anchoPrevio = caja.width;
      altoPrevio = caja.height;
      map.resize();
      if (!vistaLibre.current) map.fitBounds(VALLE, { padding: encuadre(), duration: 0 });
    });
    observador.observe(contenedor.current);

    map.on("load", () => {
      map.addSource("municipios", {
        type: "geojson",
        data: limites as unknown as GeoJSONSourceSpecification["data"],
      });
      map.addLayer({
        id: "relleno",
        type: "fill",
        source: "municipios",
        paint: {
          "fill-color": SIN_REGISTRO,
          "fill-opacity": 0.86,
          "fill-color-transition": { duration: 320, delay: 0 },
          "fill-opacity-transition": { duration: 200, delay: 0 },
        },
      });
      map.addLayer({
        id: "borde",
        type: "line",
        source: "municipios",
        paint: { "line-color": "#FBF8C6", "line-width": 0.8, "line-opacity": 0.32 },
      });
      // Los que reciben ayuda el día que se está viendo: un borde claro, para que
      // «ese día ya sale marcado» se vea aunque el color ya venga de días anteriores.
      map.addLayer({
        id: "borde-hoy",
        type: "line",
        source: "municipios",
        filter: ["==", ["get", "hoy"], 1],
        paint: { "line-color": "#FFFFFF", "line-width": 2.2, "line-opacity": 0.95 },
      });
      map.addLayer({
        id: "borde-elegido",
        type: "line",
        source: "municipios",
        filter: ["==", ["get", "estado"], 2],
        paint: { "line-color": SELECCIONADO, "line-width": 2.4 },
      });
      // Las líneas: las que están creciendo, en el color del origen, y las ya
      // asentadas, por las que viaja un pulso de luz.
      map.addSource("arcos-creciendo", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "arcos-creciendo-line",
        type: "line",
        source: "arcos-creciendo",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": COLOR_ORIGEN, "line-width": ["get", "ancho"], "line-opacity": 0.95 },
      });
      map.addSource("arcos-asentados", {
        type: "geojson",
        lineMetrics: true,
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "arcos-asentados-line",
        type: "line",
        source: "arcos-asentados",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": ["get", "ancho"],
          "line-gradient": buildPulseGradient(0, COLOR_ARCO_TENUE, COLOR_ARCO_PULSO, 0.06) as never,
        },
      });
      // Cali: centro de acopio y punto de distribución. Siempre visible, y el más grande.
      map.addSource("origen", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "origen",
        type: "circle",
        source: "origen",
        paint: {
          "circle-radius": 9,
          "circle-color": COLOR_ORIGEN,
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2.4,
        },
      });

      // Puntos de distribución dentro de un municipio.
      map.addSource("puntos", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "puntos",
        type: "circle",
        source: "puntos",
        paint: {
          "circle-radius": 6,
          // Un poco arriba del centro: no tapa la cifra del municipio.
          "circle-translate": [0, -16],
          "circle-color": COLOR_PUNTO,
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2.4,
        },
      });

      // Pulso de llegada: un anillo que nace en el centro del municipio.
      map.addSource("pulsos", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "pulsos",
        type: "circle",
        source: "pulsos",
        paint: {
          "circle-radius": ["get", "radio"],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2,
          "circle-stroke-opacity": ["get", "opacidad"],
        },
      });
      // Etiquetas: el nombre de cada municipio con ayuda en la ventana.
      map.addSource("etiquetas", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "etiquetas",
        type: "symbol",
        source: "etiquetas",
        minzoom: 7.4,
        layout: {
          "text-field": ["get", "texto"],
          "text-size": 11,
          "text-font": ["Open Sans Semibold"],
          "text-allow-overlap": false,
        },
        paint: { "text-color": "#FFFFFF", "text-halo-color": "#0F3149", "text-halo-width": 1.6 },
      });

      map.on("mouseenter", "relleno", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "relleno", () => (map.getCanvas().style.cursor = ""));
      map.on("click", "relleno", (e) => {
        const dane = String(e.features?.[0]?.properties?.["dane"] ?? "");
        setSeleccion((s) => (s === dane ? null : dane));
      });
      cargado.current = true;
      setVistaToken((n) => n + 1); // fuerza el primer pintado
    });

    return () => {
      observador.disconnect();
      cargado.current = false;
      map.remove();
      mapaRef.current = null;
    };
  }, [limites]);

  // --- pintado: se rehace al cambiar la ventana, el filtro o la selección ---
  useEffect(() => {
    const map = mapaRef.current;
    if (!map || !cargado.current) return;
    const src = map.getSource("municipios") as GeoJSONSource | undefined;
    if (!src) return;

    const cortesLente = cortes[lente];
    const feats = limites.features.map((f) => {
      const dane = String(f.properties["dane"]);
      const m = porDane.get(dane);
      const valor = m ? valorEn(m, lente, fecha) : 0;
      const filtrado = m ? !enZona(m) : false;
      return {
        ...f,
        properties: {
          dane,
          valor: valor > 0 ? valor : -1,
          estado: dane === seleccion ? 2 : filtrado ? 1 : 0,
          // ¿Recibió ayuda ese día? Solo con la línea de tiempo en un día.
          hoy: fecha !== null && m && !filtrado && valorEn(m, "jornada", fecha) > 0 ? 1 : 0,
        },
      };
    });
    src.setData({ type: "FeatureCollection", features: feats } as never);

    const escala: ExpressionSpecification =
      cortesLente.length === 0
        ? ["literal", SIN_REGISTRO]
        : [
            "step",
            ["get", "valor"],
            RAMPA[0],
            ...cortesLente.flatMap((c, i) => [c, RAMPA[Math.min(i + 1, RAMPA.length - 1)]!]),
          ];
    map.setPaintProperty("relleno", "fill-color", [
      "case",
      ["==", ["get", "estado"], 2],
      SELECCIONADO,
      ["==", ["get", "estado"], 1],
      FUERA_DEL_FILTRO,
      ["<", ["get", "valor"], 0],
      SIN_REGISTRO,
      escala,
    ] as ExpressionSpecification);
    map.setPaintProperty("relleno", "fill-opacity", [
      "case",
      ["==", ["get", "estado"], 1],
      0.12,
      0.88,
    ] as ExpressionSpecification);

    // Etiquetas: solo los municipios con ayuda visible.
    const et = municipios
      .filter((m) => enZona(m) && valorEn(m, lente, fecha) > 0)
      .map((m) => ({
        type: "Feature" as const,
        properties: { texto: `${m.nombre}\n${toneladas(valorEn(m, lente, fecha))}` },
        geometry: { type: "Point" as const, coordinates: [m.longitud, m.latitud] },
      }));
    (map.getSource("etiquetas") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: et,
    } as never);
  }, [municipios, porDane, limites, cortes, lente, fecha, zona, seleccion, enZona, vistaToken]);

  // --- el punto de origen, solo cuando hay líneas ---
  useEffect(() => {
    const map = mapaRef.current;
    if (!map || !cargado.current) return;
    (map.getSource("origen") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: origen
        ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: origen } }]
        : [],
    } as never);
  }, [origen, vistaToken]);

  useEffect(() => {
    const map = mapaRef.current;
    if (!map || !cargado.current) return;
    (map.getSource("puntos") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: municipios
        .filter((m) => puntosPorDane.has(m.codigoDane))
        .map((m) => ({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [m.longitud, m.latitud] },
        })),
    } as never);
  }, [municipios, puntosPorDane, vistaToken]);

  // --- las líneas: se sincronizan con el motor de animación ---
  useEffect(() => {
    if (!origen) return;
    const ahora = performance.now();
    const claves = arcosVivos.map((x) => x.clave);
    const pesos: Record<string, number> = {};
    for (const x of arcosVivos) {
      pesos[x.clave] = x.peso;
      if (!coordsArcos.current.has(x.clave)) {
        coordsArcos.current.set(x.clave, buildArcCoordinates(origen, [x.m.longitud, x.m.latitud]));
      }
    }
    if (cambio.current === "advance") {
      // Empezó un día: las líneas de ese día salen en cascada desde Cali.
      motor.current.sync(claves, pesos);
      for (const x of arcosVivos) motor.current.enter(x.clave, ahora, { weight: x.peso });
    } else {
      // Un salto (buscar, filtrar, cambiar de modo): las líneas aparecen ya asentadas.
      motor.current.snapTo(claves, pesos, ahora);
    }
    cambio.current = "snap";
  }, [arcosVivos, origen]);

  // --- pulsos: un anillo por municipio que recibe ayuda el día que se llega a él ---
  const lanzarPulsos = useCallback(
    (dia: string) => {
      const ahora = performance.now();
      for (const m of municipios) {
        if (!enZona(m)) continue;
        if (!(m.dias ?? []).some((d) => d.fecha === dia)) continue;
        // Quien tiene línea ese día pulsa al LLEGAR la línea (ver el bucle de
        // animación). Pulsan de una vez los que no la tienen: Cali (es el origen),
        // todo si las líneas están ocultas, y los que no son el municipio elegido.
        const esperaLinea =
          rutas === "auto" &&
          m.codigoDane !== DANE_CALI &&
          (!seleccion || m.codigoDane === seleccion);
        if (!esperaLinea) pulsos.current.spawn(m.codigoDane, ahora);
      }
    },
    [municipios, enZona, rutas, seleccion],
  );

  useEffect(() => {
    let raf = 0;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** Traduce un cuadro del motor a las capas de MapLibre. */
    const dibujarArcos = (map: MapLibreMap, ahora: number, sinMovimiento: boolean) => {
      const cuadro = motor.current.tick(ahora);
      const peso = (clave: string) => {
        const dane = clave.split("::")[1] ?? "";
        const m = porDane.get(dane);
        return m ? m.toneladas : 0;
      };
      // Cuando un arco termina de crecer, el municipio pulsa: la ayuda llegó.
      for (const a of cuadro.justSettled) {
        const dane = a.key.split("::")[1];
        if (dane) pulsos.current.spawn(dane, ahora);
      }

      const crecen = map.getSource("arcos-creciendo") as GeoJSONSource | undefined;
      const hayCrecen = cuadro.growing.length > 0;
      if (hayCrecen || !crecenVacio.current)
        crecen?.setData({
          type: "FeatureCollection",
          features: cuadro.growing.flatMap((a) => {
            const completo = coordsArcos.current.get(a.key);
            if (!completo || completo.length < 2) return [];
            const corte = Math.max(
              2,
              Math.floor(completo.length * (sinMovimiento ? 1 : a.sampleFraction)),
            );
            return [
              {
                type: "Feature" as const,
                properties: { ancho: anchoDeLinea(a.weight || peso(a.key)) },
                geometry: { type: "LineString" as const, coordinates: completo.slice(0, corte) },
              },
            ];
          }),
        } as never);
      crecenVacio.current = !hayCrecen;

      // Los asentados solo se reescriben si cambia el conjunto: el pulso es
      // una propiedad de pintura, no de la fuente.
      const firma = cuadro.settled.map((a) => `${a.key}:${Math.round(a.weight * 10)}`).join("|");
      if (firma !== firmaAsentados.current) {
        firmaAsentados.current = firma;
        (map.getSource("arcos-asentados") as GeoJSONSource | undefined)?.setData({
          type: "FeatureCollection",
          features: cuadro.settled.flatMap((a) => {
            const completo = coordsArcos.current.get(a.key);
            if (!completo || completo.length < 2) return [];
            return [
              {
                type: "Feature" as const,
                properties: { ancho: anchoDeLinea(a.weight || peso(a.key)) },
                geometry: { type: "LineString" as const, coordinates: completo },
              },
            ];
          }),
        } as never);
      }
      if (map.getLayer("arcos-asentados-line")) {
        map.setPaintProperty(
          "arcos-asentados-line",
          "line-gradient",
          buildPulseGradient(
            sinMovimiento ? 0 : cuadro.pulseLoopT,
            COLOR_ARCO_TENUE,
            COLOR_ARCO_PULSO,
            0.06,
          ) as never,
        );
      }
    };

    const pasos = () => {
      const map = mapaRef.current;
      const src = map?.getSource("pulsos") as GeoJSONSource | undefined;
      if (map && src && cargado.current) {
        const ahora = performance.now();
        const cuadros = quieto ? [] : pulsos.current.tick(ahora);
        dibujarArcos(map, ahora, quieto);
        if (cuadros.length > 0 || !pulsosVacio.current)
          src.setData({
            type: "FeatureCollection",
            features: cuadros.flatMap((c) => {
              const m = porDane.get(c.destinoId);
              if (!m) return [];
              return [
                {
                  type: "Feature" as const,
                  properties: { radio: 6 + c.progress * 30, opacidad: 0.85 * (1 - c.progress) },
                  geometry: { type: "Point" as const, coordinates: [m.longitud, m.latitud] },
                },
              ];
            }),
          } as never);
        pulsosVacio.current = cuadros.length === 0;
      }
      raf = requestAnimationFrame(pasos);
    };
    raf = requestAnimationFrame(pasos);
    return () => cancelAnimationFrame(raf);
  }, [porDane]);

  // --- acciones de la línea de tiempo ---------------------------------------
  const activar = (primera: string) => {
    // Empezar en un día también lo anima: sus líneas salen desde Cali.
    cambio.current = "advance";
    setFecha(primera);
    pulsos.current.clear();
    lanzarPulsos(primera);
  };
  const buscar = (d: string) => {
    setFecha(d);
    pulsos.current.clear();
  };
  const avanzar = (d: string) => {
    cambio.current = "advance";
    setFecha(d);
    lanzarPulsos(d);
  };
  const salir = () => {
    setFecha(null);
    setLente("acumulado");
    pulsos.current.clear();
  };

  const reiniciar = () => {
    salir();
    setRutas("auto");
    setZona("todas");
    setSeleccion(null);
    vistaLibre.current = false;
    mapaRef.current?.fitBounds(VALLE, { padding: encuadre(), duration: 600 });
  };

  // Al elegir un municipio se acerca a él.
  useEffect(() => {
    const map = mapaRef.current;
    if (!map || !cargado.current || !elegido) return;
    vistaLibre.current = true;
    map.flyTo({
      center: [elegido.longitud, elegido.latitud],
      zoom: Math.max(map.getZoom(), 8.6),
      duration: 700,
      essential: false,
    });
  }, [elegido]);

  const corte =
    fecha === null
      ? "Total del Valle"
      : lente === "jornada"
        ? `Solo el ${diaMes(fecha)}`
        : `Hasta el ${diaMes(fecha)}`;

  return (
    <div className="theme-ayudas relative h-full min-h-[26rem] w-full overflow-hidden bg-background">
      <div
        ref={contenedor}
        // `h-full w-full`, NO `absolute inset-0`: MapLibre le pone `position:
        // relative` a su contenedor y eso anulaba el posicionamiento absoluto,
        // con lo que el contenedor colapsaba (el mapa quedaba en 300 px).
        className="h-full w-full"
        role="img"
        aria-label="Mapa del Valle del Cauca con las toneladas aproximadas recibidas por cada municipio. Las mismas cifras están en la lista de municipios."
      />

      <BarraSuperior
        seleccion={elegido?.nombre ?? null}
        onReiniciar={reiniciar}
        onTodo={() => setSeleccion(null)}
        origenVisible={origen !== null}
        conPuntos={puntosPorDane.size > 0}
        onAyuda={() => setAyuda(true)}
      />
      {/* Con un municipio elegido, el panel ya trae sus cifras: el marcador
          del total se oculta para no taparse con él. */}
      {!elegido && (
        <Marcador toneladas={resumen.toneladas} municipios={resumen.municipios} corte={corte} />
      )}

      {!isMobile && (
        <PanelControles
          lente={lente}
          setLente={setLente}
          hayFecha={fecha !== null}
          zona={zona}
          setZona={setZona}
          zonas={zonas}
          rutas={rutas}
          setRutas={setRutas}
        />
      )}
      {isMobile && !elegido && (
        <>
          <button
            type="button"
            onClick={() => setFiltrosAbiertos((v) => !v)}
            aria-expanded={filtrosAbiertos}
            className="pointer-events-auto absolute bottom-[8.5rem] left-3 z-10 min-h-11 rounded-full border border-border bg-surface/95 px-4 text-sm font-semibold text-foreground shadow-sm backdrop-blur"
          >
            {filtrosAbiertos ? "Cerrar filtros" : "Filtros"}
          </button>
          {filtrosAbiertos && (
            <div className="pointer-events-auto absolute inset-x-3 bottom-[11.75rem] z-10 max-h-[45dvh] overflow-y-auto">
              <PanelControles
                enLinea

                lente={lente}
                setLente={setLente}
                hayFecha={fecha !== null}
                zona={zona}
                setZona={setZona}
                zonas={zonas}
                rutas={rutas}
                setRutas={setRutas}
              />
            </div>
          )}
        </>
      )}

      {elegido && (
        <ContextualPanel
          isMobile={isMobile}
          title={elegido.nombre}
          subtitle={`Zona ${elegido.zona}`}
          onClose={() => setSeleccion(null)}
          transitionKey={elegido.codigoDane}
        >
          <DetalleMunicipio
            municipio={elegido}
            fecha={fecha}
            puntos={puntosPorDane.get(elegido.codigoDane) ?? []}
            esCali={elegido.codigoDane === DANE_CALI}
          />
        </ContextualPanel>
      )}

      {!(isMobile && elegido) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3 [&>*]:w-full md:[&>*]:w-auto">
          <Timeline
            dates={fechas}
            currentDate={fecha}
            onActivate={activar}
            onSeek={buscar}
            onAdvance={avanzar}
            onExit={salir}
          />
        </div>
      )}

      {(intro.show || ayuda) && (
        <ComoLeer
          onCerrar={() => {
            intro.dismiss();
            setAyuda(false);
          }}
        />
      )}
    </div>
  );
}

/* ── Piezas de interfaz (las del mapa original) ─────────────────────── */

function BarraSuperior({
  seleccion,
  onReiniciar,
  onTodo,
  origenVisible,
  conPuntos,
  onAyuda,
}: {
  seleccion: string | null;
  onReiniciar: () => void;
  onTodo: () => void;
  origenVisible: boolean;
  conPuntos: boolean;
  onAyuda: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(1rem+env(safe-area-inset-top))] z-10 flex flex-wrap items-center gap-2 pl-[calc(4.75rem+env(safe-area-inset-left))] pr-4 md:flex-col md:items-start md:px-4">
      <div className="max-md:contents md:flex md:flex-wrap md:items-center md:gap-2">
        <div className="pointer-events-auto hidden items-center rounded-full border border-border bg-surface/95 px-3.5 py-1.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur md:flex">
          Ayudas Humanitarias
        </div>
        <nav
          aria-label="Ubicación actual"
          className="pointer-events-auto flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur md:min-h-0"
        >
          <button
            type="button"
            onClick={onTodo}
            disabled={!seleccion}
            className={`rounded-full px-1.5 py-2 md:py-0.5 ${seleccion ? "text-muted-foreground hover:text-foreground" : "text-primary"}`}
          >
            Valle del Cauca
          </button>
          {seleccion && (
            <>
              <span aria-hidden className="text-muted-foreground">
                ›
              </span>
              <span className="max-w-[10rem] truncate text-foreground/90">{seleccion}</span>
            </>
          )}
        </nav>
      </div>
      <button
        type="button"
        onClick={onReiniciar}
        className="pointer-events-auto flex size-11 items-center justify-center gap-1.5 rounded-full border border-border bg-surface/95 text-xs font-semibold text-foreground shadow-sm backdrop-blur hover:bg-surface-raised active:bg-surface-raised md:size-auto md:min-h-9 md:px-3 md:py-1.5"
      >
        <RotateCcw aria-hidden className="size-4 md:size-3.5" />
        <span className="sr-only md:not-sr-only">Reiniciar vista</span>
      </button>
      <button
        type="button"
        onClick={onAyuda}
        className="pointer-events-auto flex size-11 items-center justify-center gap-1.5 rounded-full border border-border bg-surface/95 text-xs font-semibold text-foreground shadow-sm backdrop-blur hover:bg-surface-raised active:bg-surface-raised md:size-auto md:min-h-9 md:px-3 md:py-1.5"
      >
        <CircleHelp aria-hidden className="size-4 md:size-3.5" />
        <span className="sr-only md:not-sr-only">¿Cómo leer este mapa?</span>
      </button>
      {(origenVisible || conPuntos) && (
        <p className="pointer-events-auto hidden flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border bg-surface/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur md:flex">
          {origenVisible && (
            <span className="flex items-center gap-2">
              <i
                aria-hidden
                className="block size-2.5 shrink-0 rounded-full"
                style={{ background: COLOR_ORIGEN }}
              />
              Cali: centro de acopio y punto de distribución
            </span>
          )}
          {conPuntos && (
            <span className="flex items-center gap-2">
              <i
                aria-hidden
                className="block size-2.5 shrink-0 rounded-full"
                style={{ background: COLOR_PUNTO }}
              />
              Punto de distribución
            </span>
          )}
        </p>
      )}
    </div>
  );
}

/** El marcador de «Ayuda entregada», con dígitos que ruedan al cambiar. */
function Marcador({
  toneladas: valor,
  municipios,
  corte,
}: {
  toneladas: number;
  municipios: number;
  corte: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-10 select-none md:inset-x-auto md:right-4 md:top-[calc(1rem+env(safe-area-inset-top))] md:w-[19rem]">
      <div className="flex items-center gap-4 rounded-xl border border-white/12 bg-[#0B3049]/85 px-4 py-3 shadow-lg backdrop-blur md:block md:px-6 md:py-5">
        <div className="min-w-0 flex-1 md:flex-none">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#22ABE2] md:text-[13px]">
            Ayuda entregada
          </p>
          <div className="mt-1 flex items-baseline gap-1.5 md:mt-1.5">
            <Rodillo valor={valor} className="text-[34px] sm:text-[42px] md:text-[52px]" />
            <span className="text-lg font-bold text-[#22ABE2] md:text-2xl">toneladas</span>
          </div>
          <p className="mt-1.5 text-xs text-[#6B93AA] md:mt-3 md:text-sm" aria-live="polite">
            {corte}
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-2 border-l border-white/12 pl-4 md:mt-3 md:border-l-0 md:border-t md:pl-0 md:pt-3">
          <Rodillo valor={municipios} entero className="text-lg md:text-[24px]" />
          <span className="text-xs font-semibold text-[#A8CFE2] md:text-sm">municipios</span>
        </div>
      </div>
    </div>
  );
}

function Rodillo({
  valor,
  entero: soloEntero = false,
  className = "",
}: {
  valor: number;
  entero?: boolean;
  className?: string;
}) {
  // Hasta 10 t se muestra un decimal: con enteros, un día de 0,6 t diría «1».
  const decimales = !soloEntero && valor < 10 && valor > 0 ? 1 : 0;
  const texto = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Math.max(0, valor));
  return (
    <span
      className={`inline-flex font-extrabold leading-none tabular-nums text-white ${className}`}
      role="img"
      aria-label={texto}
    >
      {texto.split("").map((c, i) =>
        /\d/.test(c) ? (
          <Digito key={i} digito={Number(c)} />
        ) : (
          <span key={i} aria-hidden className="px-[0.02em]">
            {c}
          </span>
        ),
      )}
    </span>
  );
}

const DIGITOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Digito({ digito }: { digito: number }) {
  return (
    <span
      aria-hidden
      className="relative inline-block h-[1em] w-[0.58em] overflow-hidden align-baseline"
    >
      <span
        className="absolute inset-x-0 top-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        style={{ transform: `translateY(${-digito * 10}%)` }}
      >
        {DIGITOS.map((n) => (
          <span key={n} className="block h-[1em] text-center leading-[1em]">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

function PanelControles({
  lente,
  setLente,
  hayFecha,
  zona,
  setZona,
  zonas,
  rutas,
  setRutas,
  enLinea = false,
}: {
  lente: Lente;
  setLente: (l: Lente) => void;
  hayFecha: boolean;
  zona: FiltroZona;
  setZona: (z: FiltroZona) => void;
  zonas: Zona[];
  rutas: ModoRutas;
  setRutas: (r: ModoRutas) => void;
  enLinea?: boolean;
}) {
  return (
    <aside
      className={`pointer-events-auto z-10 w-[20rem] max-w-full rounded-lg border border-border bg-surface/95 p-3 shadow-lg backdrop-blur ${
        enLinea
          ? "w-full"
          : "absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 max-h-[52dvh] overflow-y-auto"
      }`}
    >
      <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-background/70 p-1">
        <Boton activo={lente === "acumulado"} onClick={() => setLente("acumulado")}>
          Todo lo entregado
        </Boton>
        <Boton
          activo={lente === "jornada"}
          onClick={() => setLente("jornada")}
          deshabilitado={!hayFecha}
          titulo={!hayFecha ? "Elige un día en la línea de tiempo" : undefined}
        >
          Solo ese día
        </Boton>
      </div>

      {!hayFecha && lente === "acumulado" && (
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          Mueva la línea de tiempo para ver cómo se entregaron las ayudas día por día.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por zona">
        {(["todas", ...zonas] as FiltroZona[]).map((z) => (
          <Boton key={z} activo={zona === z} onClick={() => setZona(z)}>
            {z === "todas" ? "Todas" : z}
          </Boton>
        ))}
      </div>

      <div
        className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-background/70 p-1"
        role="group"
        aria-label="Líneas de entrega"
      >
        <Boton activo={rutas === "auto"} onClick={() => setRutas("auto")}>
          Mostrar líneas
        </Boton>
        <Boton activo={rutas === "ninguna"} onClick={() => setRutas("ninguna")}>
          Ocultar líneas
        </Boton>
      </div>
    </aside>
  );
}

function Boton({
  activo,
  onClick,
  children,
  deshabilitado = false,
  titulo,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  deshabilitado?: boolean;
  titulo?: string | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      title={titulo}
      aria-pressed={activo}
      className={`min-h-11 rounded px-2 py-1.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0 ${
        activo
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/** El detalle de un municipio: lo que recibió, qué, y cuándo. */
function DetalleMunicipio({
  municipio: m,
  fecha,
  puntos,
  esCali,
}: {
  municipio: Municipio;
  fecha: string | null;
  puntos: { nombre: string; toneladas: number }[];
  esCali: boolean;
}) {
  // Las categorías en 0 no dicen nada: se omiten.
  const categorias = m.categorias.filter((c) => c.toneladas > 0);
  const maxCat = Math.max(1, ...categorias.map((c) => c.toneladas));
  const dias = m.dias ?? [];
  return (
    <div className="space-y-5 px-4 pb-6 pt-3 text-foreground">
      <div>
        <b className="block text-4xl font-extrabold leading-none tabular-nums text-white">
          {toneladas(m.toneladas)}
        </b>
        <span className="mt-1 block text-sm text-[#A8CFE2]">toneladas aproximadas</span>
      </div>

      {esCali && (
        <section
          className="rounded-lg border-l-[3px] bg-white/[0.06] px-3.5 py-3"
          style={{ borderLeftColor: COLOR_ORIGEN }}
        >
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-[#7FA8F5]">
            Centro de acopio y punto de distribución
          </h4>
        </section>
      )}

      {puntos.length > 0 && (
        <section
          className="rounded-lg border-l-[3px] bg-white/[0.06] px-3.5 py-3"
          style={{ borderLeftColor: COLOR_PUNTO }}
        >
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-[#F29A55]">
            Punto de distribución
          </h4>
          <p className="mt-1.5 text-sm leading-6 text-[#EAF7FC]">
            {toneladas(puntos.reduce((a, p) => a + p.toneladas, 0))} aproximadas llegaron además a
            este punto para repartirse desde aquí. No están sumadas a las {toneladas(m.toneladas)}{" "}
            del municipio.
          </p>
        </section>
      )}

      {categorias.length > 0 && (
        <section>
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-[#22ABE2]">
            Qué recibió
          </h4>
          <ul className="mt-2 space-y-2.5">
            {categorias.map((c) => (
              <li key={c.nombre}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{c.nombre}</span>
                  <b className="shrink-0 tabular-nums">{toneladas(c.toneladas)}</b>
                </div>
                <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-white/10">
                  <i
                    className="block h-full rounded-full"
                    style={{
                      width: `${(c.toneladas / maxCat) * 100}%`,
                      background: colorDeGrupo(c.nombre),
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(m.productos ?? []).length > 0 && (
        <section>
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-[#22ABE2]">
            Lo más entregado
          </h4>
          <ul className="mt-2 space-y-1 text-sm">
            {(m.productos ?? []).map((p) => (
              <li key={p.nombre} className="flex justify-between gap-3">
                <span className="truncate">{p.nombre}</span>
                <b className="shrink-0 tabular-nums">{toneladas(p.toneladas)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dias.length > 0 && (
        <section>
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-[#22ABE2]">
            Día por día
          </h4>
          <ul className="mt-2 divide-y divide-white/10 text-sm">
            {dias.map((d) => (
              <li
                key={d.fecha}
                className={`flex items-baseline justify-between gap-3 py-1.5 ${d.fecha === fecha ? "text-[#FFD400]" : ""}`}
              >
                <span>
                  <b className="tabular-nums">{diaMes(d.fecha)}</b>
                  {d.productos.length > 0 && (
                    <span className="block text-xs text-[#A8CFE2]">{d.productos.join(" · ")}</span>
                  )}
                </span>
                <b className="shrink-0 tabular-nums">{toneladas(d.toneladas)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** «¿Cómo leer este mapa?», la primera vez que se entra. */
function ComoLeer({ onCerrar }: { onCerrar: () => void }) {
  return (
    // `py-4` + `max-h-full` + `overflow-y-auto`: en un celular bajito el cuadro es más
    // alto que el mapa. Centrado a secas, se cortaba por arriba (el título) y por abajo.
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-4 pb-4 pt-[4.75rem] md:py-4">
      <div
        role="dialog"
        aria-label="Cómo leer este mapa"
        className="pointer-events-auto relative max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 text-[#123E5C] shadow-2xl sm:p-7"
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full text-[#35708F] hover:bg-[#EAF7FC]"
        >
          <X aria-hidden className="size-5" />
        </button>
        <h3 className="vc-rotulo pr-10 text-[1.6rem] text-[#0079C1]">¿Cómo leer este mapa?</h3>
        <p className="mt-3 text-base leading-7">
          El color de cada municipio refleja las toneladas aproximadas de ayuda recibidas. Los tonos
          oscuros indican una menor cantidad y los claros, una mayor.
        </p>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full">
          {RAMPA.map((c) => (
            <i key={c} className="block flex-1" style={{ background: c }} />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-sm text-[#35708F]">
          <span>Menor cantidad</span>
          <span>Mayor cantidad</span>
        </div>
        <ul className="mt-3 space-y-1.5 text-[15px] leading-6">
          <li className="flex items-center gap-2">
            <i
              className="block size-3 shrink-0 rounded-full"
              style={{ background: SIN_REGISTRO }}
            />
            Sin registro
          </li>
          <li className="flex items-start gap-2">
            <i
              className="mt-1.5 block size-3 shrink-0 rounded-full"
              style={{ background: COLOR_ORIGEN }}
            />
            Cali: centro de acopio y punto de distribución
          </li>
          <li className="flex items-start gap-2">
            <i
              className="mt-1.5 block size-3 shrink-0 rounded-full"
              style={{ background: COLOR_PUNTO }}
            />
            Punto de distribución, en Cartago y Buenaventura
          </li>
        </ul>
        <p className="mt-3 text-base leading-7">
          Con la línea de tiempo, cada día los municipios que reciben ayuda se marcan con un borde
          blanco y salen líneas desde Cali. Muestran hacia dónde fue la ayuda, no la ruta exacta.
        </p>
        <p className="mt-3 border-t border-[#123E5C]/15 pt-3 text-base leading-7">
          Toque un municipio para conocer qué recibió.
        </p>
      </div>
    </div>
  );
}
