import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapLayerMouseEvent, PointLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

maplibregl.setWorkerUrl(maplibreWorkerUrl);

import type { Origen, Flujo, DestinoResumenLista } from "@/domain/entities";
import { buildArcCoordinates, buildPulseGradient, easeOutCubic, type LngLat } from "./arcGeometry";
import { createArcAnimationEngine } from "./arcAnimationEngine";
import { normId } from "@/lib/id";
import { normMunicipalityName, sameMunicipality } from "@/lib/municipalityName";
import municipalBoundariesRaw from "@/data/valle-municipios.json";
import { createArrivalPulseEngine } from "./arrivalPulseEngine";
import { createDispatchActivityEngine, type ActivityFrame } from "./dispatchActivityEngine";
import {
  TERRITORY_BLUE_RAMP,
  getTerritoryStatByCode,
  territoryToneIndex,
  type TerritoryMapMode,
  type TerritoryRoutesMode,
  type TerritoryZone,
} from "@/presentation/data/territoryData";
import {
  describeLens,
  TONELADAS_POR_DESPACHO,
  valorTemporal,
} from "@/presentation/data/territoryTime";

/**
 * Lo que el mapa necesita saber de cada municipio. Viene de la API a
 * través de DashboardPage, no del catálogo estático: ese quedaba viejo
 * apenas alguien agregaba una entrega al Excel, y el panel del mapa
 * mostraba un total distinto al del resto de la página.
 *
 * La zona sí sale del catálogo, porque no cambia con las entregas.
 */
export interface MunicipioMapa {
  nombre: string;
  entregas: number;
  dias: Record<string, number>;
  toneladas: number;
  zona: string | null;
}

export type MunicipiosMapa = ReadonlyMap<string, MunicipioMapa>;

const OVERVIEW_CENTER: LngLat = [-76.35, 3.95];
const OVERVIEW_ZOOM = 7.1;
const ORIGIN_PULSE_PERIOD_MS = 1700;
const ORIGIN_PULSE_MAX_RADIUS_GROWTH = 22;

// Tolerancia de hit-test para clicks/taps sobre los puntos de origen y
// destino: en vez de exigir el pixel exacto del centro del círculo (que
// en mobile, con dedos gordos sobre un círculo de 5-10px de radio, falla
// seguido), se consulta una caja de +-8px alrededor del punto de click.
const POINT_HIT_TOLERANCE_PX = 8;

/**
 * Municipio sin despacho documentado. NO es "el tono más bajo de la
 * rampa": es una categoría aparte, igual que `DATA.sinDato` en el
 * tablero HTML de referencia. Por eso territoryToneIndex devuelve null
 * para valor 0 y no 0, ver territoryColorForTone.
 */
const TERRITORY_NO_DATA = "#162936";

/**
 * Santiago de Cali: excluida del consolidado municipal por instrucción
 * expresa (ver panoramaData / nivel "Canales"). Se pinta con un gris
 * propio para que no se lea ni como "sin datos" ni como un volumen bajo,
 * y no es clickeable.
 */
const TERRITORY_EXCLUDED = "#2A3D4A";
const CALI_DANE = "76001";

/**
 * Umbral heurístico de "verde pleno" para el mapa de calor de destinos.
 * No hay un campo de meta esperada por destino en el backend (Flujo /
 * DestinoResumenLista no lo traen, ver entities.ts), así que se usa un
 * número fijo documentado acá en vez de inventar un campo que el backend
 * no devuelve.
 */
const INTENSITY_FULL_THRESHOLD = 5;

/**
 * Ids de las capas de etiqueta. Se mantienen arriba de todo el resto.
 */
const CAPAS_ETIQUETA = ["municipios-etq-nombre", "municipios-etq-valor"] as const;

/**
 * Sube los nombres de municipio al tope del mapa.
 *
 * Las etiquetas se crean junto con los polígonos, o sea antes que los
 * arcos y los puntos, así que por orden de capa quedan debajo y el
 * relleno de los municipios las tapa. `moveLayer` sin segundo argumento
 * las manda al final de la pila.
 *
 * Hay que llamarlo cada vez que se agregan o se actualizan capas, no una
 * sola vez al cargar: cualquier capa creada después vuelve a quedar por
 * encima.
 */
function subirEtiquetas(map: MapLibreMap) {
  CAPAS_ETIQUETA.forEach((id) => {
    if (map.getLayer(id)) map.moveLayer(id);
  });
}

const EMPTY_COLLECTION: maplibregl.GeoJSONSourceSpecification["data"] = {
  type: "FeatureCollection",
  features: [],
};

function intensityFor(totalWeight: number): number {
  return Math.max(0, Math.min(1, totalWeight / INTENSITY_FULL_THRESHOLD));
}

/**
 * tone es el índice devuelto por territoryToneIndex: entra DIRECTO a la
 * rampa, sin invertir. TERRITORY_BLUE_RAMP ya está ordenada de menos a
 * más volumen (oscuro → claro), igual que DATA.rampa del HTML.
 */
function territoryColorForTone(tone: number | null): string {
  if (tone === null) return TERRITORY_NO_DATA;
  const i = Math.max(0, Math.min(TERRITORY_BLUE_RAMP.length - 1, tone));
  // El `??` es por noUncheckedIndexedAccess: aunque `i` ya está acotado
  // al rango de la rampa, indexar con una variable devuelve
  // `string | undefined`. El fallback nunca debería alcanzarse.
  return TERRITORY_BLUE_RAMP[i] ?? TERRITORY_NO_DATA;
}

function municipalityNameFromProperties(properties: Record<string, unknown> | undefined): string {
  if (!properties) return "";
  const candidates = [
    properties["name"],
    properties["nombre"],
    properties["municipio"],
    properties["municipality"],
    properties["NAME"],
    properties["NOMBRE"],
  ];
  return String(candidates.find((value) => value != null && String(value).trim() !== "") ?? "");
}

function municipalityCodeFromProperties(properties: Record<string, unknown> | undefined): string {
  if (!properties) return "";
  const candidates = [
    properties["municipalityCode"],
    properties["codigoDane"],
    properties["codigo_dane"],
    properties["DANE"],
    properties["dane"],
    properties["code"],
    properties["codigo"],
  ];
  return normId(String(candidates.find((value) => value != null && String(value).trim() !== "") ?? ""));
}

/**
 * Centro del bounding box del anillo exterior. Sirve como ancla de
 * etiqueta: no es el centroide real (un municipio en forma de C puede
 * caer fuera del polígono) pero para los 42 del Valle, que son convexos
 * o casi, alcanza, y evita meter turf.js solo por esto.
 */
function ringCenter(geometry: unknown): LngLat | null {
  const geo = geometry as { type?: string; coordinates?: unknown };
  const ring =
    geo?.type === "Polygon"
      ? (geo.coordinates as number[][][] | undefined)?.[0]
      : geo?.type === "MultiPolygon"
        ? (geo.coordinates as number[][][][] | undefined)?.[0]?.[0]
        : null;
  if (!Array.isArray(ring) || ring.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of ring) {
    const [x, y] = point as [number, number];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

interface BoundaryFeature {
  id?: string | number;
  geometry?: unknown;
  properties?: Record<string, unknown>;
}

function normalizeBoundaries(geojson: unknown): maplibregl.GeoJSONSourceSpecification["data"] {
  const collection = geojson as { features?: BoundaryFeature[] };
  if (!collection?.features) {
    return geojson as maplibregl.GeoJSONSourceSpecification["data"];
  }
  return {
    ...(collection as object),
    features: collection.features.map((feature) => {
      const properties = feature.properties ?? {};
      const code = normId(String(feature.id ?? "")) || municipalityCodeFromProperties(properties);
      const name = municipalityNameFromProperties(properties);
      const center = ringCenter(feature.geometry);
      return {
        ...feature,
        id: code || `idx-${feature.id ?? name}`, // nunca undefined, sin id, feature-state no pega
        properties: {
          ...properties,
          municipalityCode: code,
          name: name || properties["name"],
          labelLng: center?.[0] ?? null,
          labelLat: center?.[1] ?? null,
          // Placeholder hasta que corra el efecto de coloreo. Antes acá
          // se inyectaba el tono MÁS CLARO de la rampa, lo que producía
          // un frame inicial donde todo el departamento se veía como si
          // tuviera el volumen máximo.
          territoryToneColor: TERRITORY_NO_DATA,
        },
      };
    }),
  } as unknown as maplibregl.GeoJSONSourceSpecification["data"];
}

const municipalBoundaries = normalizeBoundaries(municipalBoundariesRaw);
const boundaryFeatures: BoundaryFeature[] =
  (municipalBoundaries as { features?: BoundaryFeature[] }).features ?? [];

function weightToLineWidth(weight: number): number {
  return 1.6 + Math.sqrt(Math.max(0, weight)) * 1.1;
}

const ORIGEN_COLOR: Record<string, string> = {
  "ORI-CALI": "#2f6fed",
  "ORI-CARTAGO": "#e6883c",
};

const ORIGEN_DIM_COLOR: Record<string, string> = {
  "ORI-CALI": "rgba(47,111,237,0.35)",
  "ORI-CARTAGO": "rgba(230,136,60,0.35)",
};

const ORIGEN_COLOR_BY_NORM_ID: Record<string, string> = Object.fromEntries(
  Object.entries(ORIGEN_COLOR).map(([id, color]) => [normId(id), color]),
);

const ORIGEN_DIM_COLOR_BY_NORM_ID: Record<string, string> = Object.fromEntries(
  Object.entries(ORIGEN_DIM_COLOR).map(([id, color]) => [normId(id), color]),
);

const BASE_STYLE: maplibregl.StyleSpecification = {
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
    // Gris niebla azulado: el fondo tiene que LEERSE como fondo. Antes
    // era #123E5C, el mismo azul profundo de la rampa territorial, así
    // que los municipios de menor volumen se confundían con el mar y con
    // los departamentos vecinos.
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

interface Props {
  origenes: Origen[];
  destinos: DestinoResumenLista[];
  flujos: Flujo[];
  instantTransition: boolean;
  /**
   * true cuando viewState.timelineDate !== null en DashboardPage. Gatea
   * el mapa de calor incremental y los pulsos de llegada: solo tienen
   * sentido narrativo durante la reproducción del timeline.
   */
  timelineActive: boolean;
  selectedDestinoId: string | null;
  selectedOrigenId: string | null;
  /** Cómo se lee el día elegido: acumulado hasta él, o solo ese día. */
  territoryMode: TerritoryMapMode;
  /**
   * Día de agosto en dos dígitos, derivado del timeline. null = toda la
   * operación. Antes era un `string` con su propio slider, y por eso los
   * polígonos podían mostrar el total mientras los arcos iban por el 14.
   */
  territoryDay: string | null;
  territoryZone: TerritoryZone | "todas";
  /** Entregas por municipio, indexadas por código DANE. Vienen de la API. */
  municipios: MunicipiosMapa;
  /**
   * Códigos DANE a resaltar. El resto se atenúa.
   *
   * Lo usa el foco por categoría: al tocar "Aseo personal" en otra
   * sección, el mapa deja a la vista solo los municipios que la
   * recibieron. null significa sin resaltado.
   */
  resaltados?: ReadonlySet<string> | null | undefined;
  routesMode: TerritoryRoutesMode;
  /**
   * Contador que pide devolver la cámara al encuadre inicial.
   *
   * Va como número y no como función imperativa ni como `boolean` a
   * propósito: cada incremento es una orden nueva, así que pedir dos
   * veces seguidas "volvé a centrar" funciona, cosa que con un booleano
   * no pasaría porque el segundo cambio no sería un cambio.
   */
  vistaGeneralToken?: number;
  onSelectDestino: (id: string) => void;
  onSelectOrigen: (id: string) => void;
  onReset: () => void;
  onActivity?: (frame: ActivityFrame | null) => void;
}

const flujoKey = (f: Flujo) => `${f.origenId}::${f.destino.id}`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

function popupHtml(label: string, pista?: string): string {
  return `<div style="font-family:Poppins,sans-serif;font-size:14px;min-width:150px">
             <strong style="display:block">${escapeHtml(label)}</strong>
             ${pista ? `<span style="display:block;margin-top:4px;color:#0079C1;font-size:13px">${escapeHtml(pista)}</span>` : ""}
           </div>`;
}

function municipalityPopupHtml(
  label: string,
  codigoDane: string,
  mode: TerritoryMapMode,
  day: string | null,
  municipios: MunicipiosMapa,
): string {
  const stat = municipios.get(codigoDane);
  if (!stat) {
    // Cali y cualquier polígono fuera del catálogo municipal caen acá.
    // Se explica por qué no tiene cifras de cobertura, pero SÍ se puede
    // abrir: Cali recibió sus propios despachos y tiene panel.
    return `<div style="font-family:Poppins,sans-serif;min-width:200px">
      <strong style="display:block;font-size:17px;margin-bottom:6px">${escapeHtml(label)}</strong>
      <span style="display:block;color:#6B93AA;font-size:14px;line-height:1.35">No hace parte del conteo por municipio</span>
      <span style="display:block;margin-top:6px;color:#0079C1;font-size:13px">Toca para ver lo que recibió</span>
    </div>`;
  }

  const value = valorTemporal(stat, mode, day);
  // stat.toneladas es el total FINAL del municipio: solo sirve cuando no
  // hay día elegido. Con día, se estima sobre los despachos de ese corte.
  const toneladas =
    day === null ? stat.toneladas : Math.round(value * TONELADAS_POR_DESPACHO);
  const moveLabel = value === 1 ? "entrega" : "entregas";
  const sinDespacho = value === 0;

  return `<div style="font-family:'IBM Plex Sans',sans-serif;min-width:200px;font-size:15px">
    <strong style="display:block;font-size:17px;margin-bottom:4px">${escapeHtml(label)}</strong>
    ${stat.zona ? `<span style="display:block;color:#22ABE2;font-size:13px;margin-bottom:2px">${escapeHtml(stat.zona)} del Valle</span>` : ""}
    <span style="display:block;color:#A8CFE2;font-size:13px;margin-bottom:10px">${escapeHtml(describeLens(mode, day))}</span>
    ${
      sinDespacho
        ? `<span style="color:#F58A76;font-size:14px;font-weight:600">Sin entregas en este periodo</span>`
        : `<div style="display:grid;grid-template-columns:1fr;gap:6px">
      <div><b style="font-size:22px">${value.toLocaleString("es-CO")}</b><span style="display:block;color:#A8CFE2;font-size:14px">${moveLabel}</span></div>
      <div><b style="font-size:22px">${toneladas.toLocaleString("es-CO")} t</b><span style="display:block;color:#A8CFE2;font-size:14px">estimadas</span></div>
    </div>`
    }
  </div>`;
}

export function MapCanvas({
  origenes,
  destinos,
  flujos,
  instantTransition,
  timelineActive,
  selectedDestinoId,
  selectedOrigenId,
  territoryMode,
  territoryDay,
  territoryZone,
  municipios,
  resaltados = null,
  routesMode,
  vistaGeneralToken = 0,
  onSelectDestino,
  onSelectOrigen,
  onReset,
  onActivity,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<Array<() => void>>([]);
  const whenReady = (fn: () => void) => (readyRef.current ? fn() : pendingRef.current.push(fn));

  const engineRef = useRef(createArcAnimationEngine());
  const pulseEngineRef = useRef(createArrivalPulseEngine());
  const activityEngineRef = useRef(createDispatchActivityEngine());
  const rafRef = useRef<number | null>(null);
  const coordsCacheRef = useRef<Map<string, LngLat[]>>(new Map());

  const handlersRef = useRef({ onSelectDestino, onSelectOrigen, onReset, onActivity });
  handlersRef.current = { onSelectDestino, onSelectOrigen, onReset, onActivity };

  // Igual que handlersRef: estos props pueden cambiar mientras el rAF
  // loop (armado una sola vez en el efecto de montaje) sigue vivo, así
  // que se leen vía ref dentro de animate(), no capturados por closure.
  const timelineActiveRef = useRef(timelineActive);
  timelineActiveRef.current = timelineActive;
  const territoryModeRef = useRef(territoryMode);
  territoryModeRef.current = territoryMode;
  const territoryDayRef = useRef(territoryDay);
  territoryDayRef.current = territoryDay;
  const routesModeRef = useRef(routesMode);
  routesModeRef.current = routesMode;
  const municipiosRef = useRef(municipios);
  municipiosRef.current = municipios;

  const hoveredOrigenIdRef = useRef<string | null>(null);
  const hoveredDestinoIdRef = useRef<string | null>(null);
  const destinoIdByNormNameRef = useRef<Map<string, string>>(new Map());
  // El handler de click se registra una sola vez, así que la lista de
  // destinos se lee por ref para no quedar fija al primer render.
  const destinosRef = useRef(destinos);
  destinosRef.current = destinos;
  const destinoCoordsByIdRef = useRef<Map<string, LngLat>>(new Map());
  const destinoMetaByIdRef = useRef<Map<string, { nombre: string; coords: LngLat }>>(new Map());
  const prevWeightsRef = useRef<Map<string, number>>(new Map());
  const destinoAcumuladoRef = useRef<Map<string, number>>(new Map());

  /**
   * Firma del conjunto de arcos asentados: sus claves y sus pesos.
   *
   * Existe para NO reescribir la fuente cuando la geometría no cambió.
   * El motivo largo está en animate(), donde se usa.
   */
  const firmaAsentadosRef = useRef("");
  /** Si el frame anterior tenía arcos creciendo. */
  const huboCreciendoRef = useRef(false);
  /** Si el frame anterior tenía pulsos de llegada activos. */
  const huboLlegadasRef = useRef(false);

  /**
   * Firma del conjunto de arcos visibles: sus claves, ordenadas.
   *
   * Sirve para saber si la selección cambió DE VERDAD. Este efecto vuelve
   * a correr cada vez que React rearma el array de flujos, aunque su
   * contenido sea el mismo, y sin esta comparación la red se reanimaría
   * sola en cada render.
   */
  const firmaArcosRef = useRef("");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: OVERVIEW_CENTER,
      zoom: OVERVIEW_ZOOM,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    // Abajo a la izquierda: arriba a la derecha vive el marcador y arriba
    // a la izquierda el panel de territorio. En móvil el gesto de pellizcar
    // ya cubre el zoom, así que estos botones no compiten por el espacio.
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");

    const destinoPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    const origenPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    const municipalityPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });

    map.on("load", () => {
      let hoveredMunicipalityId: string | null = null;

      try {
        map.addSource("municipios", { type: "geojson", data: municipalBoundaries });
        map.addLayer({
          id: "municipios-fill",
          type: "fill",
          source: "municipios",
          paint: {
            // El color territorial se calcula siempre a partir del tono.
            // Si todavía no existe feature-state (primer render), usa el
            // placeholder "sin dato" inyectado en normalizeBoundaries.
            // Nunca transparente y nunca el tono de volumen máximo.
            "fill-color": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              "#FFD400",
              ["boolean", ["feature-state", "filteredOut"], false],
              "#102332",
              ["coalesce", ["feature-state", "territoryToneColor"], ["get", "territoryToneColor"]],
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "filteredOut"], false],
              0.11,
              ["boolean", ["feature-state", "hovered"], false],
              0.82,
              0.62,
            ],
            "fill-opacity-transition": { duration: 150, delay: 0 },
            "fill-color-transition": { duration: 320, delay: 0 },
          },
        });
        map.addLayer({
          id: "municipios-line",
          type: "line",
          source: "municipios",
          paint: { "line-color": "#FBF8C6", "line-width": 0.9, "line-opacity": 0.32 },
        });

        // Etiquetas: fuente propia de PUNTOS, no la de polígonos. El
        // conteo tiene que cambiar al mover el slider de jornada y
        // `text-field` no puede leer feature-state, así que la única vía
        // es regenerar los datos (ver el efecto de etiquetas más abajo).
        map.addSource("municipios-etq", { type: "geojson", data: EMPTY_COLLECTION });
        map.addLayer({
          id: "municipios-etq-nombre",
          type: "symbol",
          source: "municipios-etq",
          minzoom: 7.4,
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 11,
            // El ancla del polígono es su centro geométrico, que es
            // justo donde el relleno es más sólido y donde suele caer el
            // arco que llega. Se sube el nombre y se baja el número, con
            // el centro libre.
            "text-offset": [0, -0.95],
            "text-anchor": "bottom",
            "text-transform": "uppercase",
            "text-letter-spacing": 0.04,
            // Sin esto, en municipios pequeños del norte las etiquetas se
            // pisan entre sí y MapLibre esconde algunas al azar.
            "text-padding": 4,
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#FFFFFF",
            // Halo grueso y oscuro: el nombre cae sobre toda la rampa
            // territorial, del azul más profundo al más claro, y sin
            // esto se pierde justo en los municipios de mayor volumen.
            "text-halo-color": "#08202E",
            "text-halo-width": 2.4,
            "text-halo-blur": 0.3,
          },
        });
        map.addLayer({
          id: "municipios-etq-valor",
          type: "symbol",
          source: "municipios-etq",
          minzoom: 7.4,
          filter: [">", ["get", "value"], 0],
          layout: {
            "text-field": ["to-string", ["get", "value"]],
            "text-font": ["Noto Sans Regular"],
            "text-size": 12,
            "text-offset": [0, 0.5],
            "text-anchor": "top",
            "text-padding": 3,
            "text-allow-overlap": false,
            // Si no cabe, se oculta el número antes que el nombre: sin el
            // nombre, la cifra no le dice nada a nadie.
            "text-optional": true,
          },
          paint: {
            "text-color": "#FFD400",
            "text-halo-color": "#08202E",
            "text-halo-width": 2.4,
            "text-halo-blur": 0.3,
          },
        });

        map.on("mousemove", "municipios-fill", (e: MapLayerMouseEvent) => {
          map.getCanvas().style.cursor = "pointer";
          const feature = e.features?.[0];
          const nextId = feature?.id != null ? String(feature.id) : null;
          if (nextId === hoveredMunicipalityId) {
            if (nextId != null) municipalityPopup.setLngLat(e.lngLat);
            return;
          }
          if (hoveredMunicipalityId != null) {
            map.setFeatureState({ source: "municipios", id: hoveredMunicipalityId }, { hovered: false });
          }
          if (nextId != null) {
            map.setFeatureState({ source: "municipios", id: nextId }, { hovered: true });
            const name = String(feature?.properties?.["name"] ?? "");
            const codigoDane = String(feature?.properties?.["municipalityCode"] ?? "");
            municipalityPopup
              .setLngLat(e.lngLat)
              .setHTML(
                municipalityPopupHtml(
                  name,
                  codigoDane,
                  territoryModeRef.current,
                  territoryDayRef.current,
                  municipiosRef.current,
                ),
              )
              .addTo(map);
          }
          hoveredMunicipalityId = nextId;
        });

        map.on("mouseleave", "municipios-fill", () => {
          map.getCanvas().style.cursor = "";
          if (hoveredMunicipalityId != null) {
            map.setFeatureState({ source: "municipios", id: hoveredMunicipalityId }, { hovered: false });
            hoveredMunicipalityId = null;
          }
          municipalityPopup.remove();
        });
      } catch (err) {
        console.error(
          "No se pudieron cargar los límites municipales (valle-municipios.json). " +
            "El mapa seguirá mostrando orígenes/destinos/arcos sin las divisiones.",
          err,
        );
      }

      map.addSource("origenes", { type: "geojson", data: EMPTY_COLLECTION });
      map.addLayer({
        id: "origenes-glow",
        type: "circle",
        source: "origenes",
        paint: {
          "circle-radius": 17,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.18,
          "circle-blur": 1,
        },
      });
      map.addLayer({
        id: "origenes-pulse",
        type: "circle",
        source: "origenes",
        paint: { "circle-radius": 9, "circle-color": ["get", "color"], "circle-opacity": 0 },
      });
      map.addLayer({
        id: "origenes-point",
        type: "circle",
        source: "origenes",
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            13,
            ["boolean", ["feature-state", "hover"], false],
            11.5,
            10,
          ],
          "circle-radius-transition": { duration: 180, delay: 0 },
          "circle-color": ["get", "color"],
          "circle-stroke-width": ["case", ["boolean", ["feature-state", "selected"], false], 3.5, 2.5],
          "circle-stroke-width-transition": { duration: 180, delay: 0 },
          "circle-stroke-color": "#0b0e14",
        },
      });

      map.addSource("destinos", { type: "geojson", data: EMPTY_COLLECTION });
      map.addLayer({
        id: "destinos-point",
        type: "circle",
        source: "destinos",
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            8,
            ["boolean", ["feature-state", "hover"], false],
            6.5,
            5,
          ],
          "circle-radius-transition": { duration: 180, delay: 0 },
          // Acá se CONSUME el feature-state `intensity` que alimentan
          // justSettled y el weight-bump. Sin esta expresión todo ese
          // motor incremental corría sin producir nada visible: era el
          // bug por el que los destinos nunca cambiaban de color al
          // avanzar el timeline.
          "circle-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#FFD400",
            [
              "interpolate",
              ["linear"],
              ["coalesce", ["feature-state", "intensity"], 0],
              0,
              "#F26049",
              0.5,
              "#FFD103",
              1,
              "#5CC46B",
            ],
          ],
          "circle-color-transition": { duration: 450, delay: 0 },
          "circle-stroke-width": 1.4,
          "circle-stroke-color": "#0b0e14",
        },
      });

      // Anillo de "pop": una sola capa nativa de MapLibre, alimentada en
      // cada frame de animate() desde arrivalPulseEngine.tick(). Cada
      // feature trae su propio radio/opacidad como PROPIEDAD (no
      // feature-state) porque cambian todos los frames.
      map.addSource("arrivals", { type: "geojson", data: EMPTY_COLLECTION });
      map.addLayer({
        id: "arrivals-pulse",
        type: "circle",
        source: "arrivals",
        paint: {
          "circle-radius": ["get", "radius"],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#e8ecf3",
          "circle-stroke-width": 2,
          "circle-stroke-opacity": ["get", "opacity"],
        },
      });

      map.addSource("arcos-creciendo", { type: "geojson", data: EMPTY_COLLECTION });
      map.addLayer({
        id: "arcos-creciendo-line",
        type: "line",
        source: "arcos-creciendo",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["get", "width"],
          "line-opacity": 0.9,
        },
      });

      map.addSource("arcos-asentados", {
        type: "geojson",
        lineMetrics: true,
        data: EMPTY_COLLECTION,
      });
      map.addLayer({
        id: "arcos-asentados-line",
        type: "line",
        source: "arcos-asentados",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": ["get", "width"],
          "line-gradient": buildPulseGradient(
            0,
            "rgba(232,236,243,0.22)",
            "#e8ecf3",
            0.06,
          ) as unknown as maplibregl.ExpressionSpecification,
        },
      });

      /**
       * Orden de prioridad del clic: origen, destino, ÁREA, reset.
       *
       * En Cali y en Cartago el punto de origen queda encima del punto de
       * destino, porque la bodega está en la misma coordenada que el
       * municipio. No hace falta separarlos: el punto abre el centro de
       * acopio y el ÁREA abre el municipio. Son dos gestos distintos para
       * dos cosas distintas, y el mapa ya no necesita trucos de
       * desplazamiento.
       */
      map.on("click", (e: MapLayerMouseEvent) => {
        const hitbox: [PointLike, PointLike] = [
          [e.point.x - POINT_HIT_TOLERANCE_PX, e.point.y - POINT_HIT_TOLERANCE_PX],
          [e.point.x + POINT_HIT_TOLERANCE_PX, e.point.y + POINT_HIT_TOLERANCE_PX],
        ];

        const origenHits = map.queryRenderedFeatures(hitbox, { layers: ["origenes-point"] });
        if (origenHits.length > 0) {
          const id = origenHits[0]?.properties?.["id"];
          if (id != null) handlersRef.current.onSelectOrigen(String(id));
          return;
        }

        const destinoHits = map.queryRenderedFeatures(hitbox, { layers: ["destinos-point"] });
        if (destinoHits.length > 0) {
          const id = destinoHits[0]?.properties?.["id"];
          if (id != null) handlersRef.current.onSelectDestino(String(id));
          return;
        }

        const municipioHits = map.getLayer("municipios-fill")
          ? map.queryRenderedFeatures(e.point, { layers: ["municipios-fill"] })
          : [];
        if (municipioHits.length > 0) {
          const municipio = municipioHits[0];
          const municipioCode = String(
            municipio?.properties?.["municipalityCode"] ?? municipio?.id ?? "",
          );
          const municipioName = municipio?.properties?.["name"];
          // Se prueba por nombre del polígono, por el nombre que trae el
          // catálogo vivo para ese código DANE, y por el código. El
          // segundo cubre los casos donde el GeoJSON escribe el municipio
          // distinto del Excel, como Buga y Guadalajara de Buga.
          const nombreCatalogo = municipiosRef.current.get(normId(municipioCode))?.nombre;
          const destinoId =
            (municipioName != null
              ? destinoIdByNormNameRef.current.get(normMunicipalityName(String(municipioName)))
              : undefined) ??
            (nombreCatalogo != null
              ? destinoIdByNormNameRef.current.get(normMunicipalityName(nombreCatalogo))
              : undefined) ??
            destinoIdByNormNameRef.current.get(normId(municipioCode)) ??
            // Último recurso: comparación tolerante contra cada destino,
            // que además resuelve los alias como Buga.
            destinosRef.current.find(
              (d) =>
                sameMunicipality(d.nombre, municipioName == null ? null : String(municipioName)) ||
                sameMunicipality(d.nombre, nombreCatalogo ?? null),
            )?.id;

          if (destinoId != null) {
            handlersRef.current.onSelectDestino(destinoId);
            return;
          }

          if (import.meta.env.DEV) {
            console.warn(
              `[MapCanvas] el clic en "${String(municipioName)}" (DANE ${municipioCode}) no ` +
                "encontró un destino. Probablemente ese municipio todavía no registra entregas.",
            );
          }
        }

        handlersRef.current.onReset();
      });

      map.on("mouseenter", "origenes-point", (e: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        if (f.id != null) {
          map.setFeatureState({ source: "origenes", id: f.id }, { hover: true });
          hoveredOrigenIdRef.current = String(f.id);
        }
        origenPopup
          .setLngLat((f.geometry as { coordinates: LngLat }).coordinates)
          .setHTML(
            popupHtml(
              String(f.properties?.["nombre"] ?? ""),
              // Sin esta pista, el punto de origen parece decorativo: no
              // hay nada que indique que al tocarlo el mapa deja solo lo
              // que salió de ahí.
              "Toca para ver solo sus despachos",
            ),
          )
          .addTo(map);
      });

      map.on("mouseleave", "origenes-point", () => {
        map.getCanvas().style.cursor = "";
        if (hoveredOrigenIdRef.current != null) {
          map.setFeatureState({ source: "origenes", id: hoveredOrigenIdRef.current }, { hover: false });
          hoveredOrigenIdRef.current = null;
        }
        origenPopup.remove();
      });

      map.on("mouseenter", "destinos-point", (e: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        if (f.id != null) {
          map.setFeatureState({ source: "destinos", id: f.id }, { hover: true });
          hoveredDestinoIdRef.current = String(f.id);
        }
        destinoPopup
          .setLngLat((f.geometry as { coordinates: LngLat }).coordinates)
          .setHTML(popupHtml(String(f.properties?.["nombre"] ?? ""), "Toca para ver el detalle"))
          .addTo(map);
      });

      map.on("mouseleave", "destinos-point", () => {
        map.getCanvas().style.cursor = "";
        if (hoveredDestinoIdRef.current != null) {
          map.setFeatureState({ source: "destinos", id: hoveredDestinoIdRef.current }, { hover: false });
          hoveredDestinoIdRef.current = null;
        }
        destinoPopup.remove();
      });

      const animate = (now: number) => {
        try {
          if (map.getLayer("origenes-pulse")) {
            const originT = (now % ORIGIN_PULSE_PERIOD_MS) / ORIGIN_PULSE_PERIOD_MS;
            const eased = easeOutCubic(originT);
            map.setPaintProperty(
              "origenes-pulse",
              "circle-radius",
              9 + eased * ORIGIN_PULSE_MAX_RADIUS_GROWTH,
            );
            map.setPaintProperty(
              "origenes-pulse",
              "circle-opacity",
              routesModeRef.current === "color" || territoryModeRef.current === "jornada"
                ? 0
                : (1 - originT) ** 2 * 0.55,
            );
          }

          const frame = engineRef.current.tick(now);

          // "Llegó": se dispara acá, no en el efecto que sincroniza
          // `flujos`, porque acá es donde el motor de arcos reporta el
          // frame exacto en que la línea terminó de crecer y tocó el
          // destino, coincide con lo que la persona ve.
          if (timelineActiveRef.current) {
            frame.justSettled.forEach((arc) => {
              const destinoId = arc.key.split("::")[1] ?? "";
              const nuevoTotal = (destinoAcumuladoRef.current.get(destinoId) ?? 0) + arc.weight;
              destinoAcumuladoRef.current.set(destinoId, nuevoTotal);
              map.setFeatureState(
                { source: "destinos", id: destinoId },
                { intensity: intensityFor(nuevoTotal) },
              );
              pulseEngineRef.current.spawn(destinoId, now);
              const meta = destinoMetaByIdRef.current.get(destinoId);
              if (meta) activityEngineRef.current.spawn(destinoId, meta.nombre, arc.weight, now);
            });
          }

          handlersRef.current.onActivity?.(activityEngineRef.current.tick(now));

          const pulsos = pulseEngineRef.current.tick(now);
          const arrivalsCollection = {
            type: "FeatureCollection" as const,
            features: pulsos.flatMap((p: { destinoId: string; progress: number }) => {
              const coords = destinoCoordsByIdRef.current.get(p.destinoId);
              if (!coords) return [];
              return [
                {
                  type: "Feature" as const,
                  properties: { radius: 5 + p.progress * 28, opacity: (1 - p.progress) * 0.85 },
                  geometry: { type: "Point" as const, coordinates: coords },
                },
              ];
            }),
          };

          // Mismo criterio que con los arcos: cuando no hay ninguna
          // llegada activa no hace falta seguir escribiendo una colección
          // vacía en cada frame, alcanza con vaciarla una vez.
          if (pulsos.length > 0) {
            huboLlegadasRef.current = true;
            (map.getSource("arrivals") as maplibregl.GeoJSONSource | undefined)?.setData(
              arrivalsCollection,
            );
          } else if (huboLlegadasRef.current) {
            huboLlegadasRef.current = false;
            (map.getSource("arrivals") as maplibregl.GeoJSONSource | undefined)?.setData(
              arrivalsCollection,
            );
          }

          const growingCollection = {
            type: "FeatureCollection" as const,
            features: frame.growing.flatMap((arc) => {
              const full = coordsCacheRef.current.get(arc.key);
              if (!full || full.length < 2) return [];
              const cut = Math.max(2, Math.floor(full.length * arc.sampleFraction));
              return [
                {
                  type: "Feature" as const,
                  properties: { color: colorForKey(arc.key), width: weightToLineWidth(arc.weight) },
                  geometry: { type: "LineString" as const, coordinates: full.slice(0, cut) },
                },
              ];
            }),
          };

          // Los que crecen cambian de verdad en cada frame, así que acá el
          // setData continuo está justificado. Lo que no hacía falta era
          // seguir escribiendo una colección vacía indefinidamente cuando
          // ya no queda ninguno.
          if (frame.growing.length > 0) {
            huboCreciendoRef.current = true;
            (map.getSource("arcos-creciendo") as maplibregl.GeoJSONSource | undefined)?.setData(
              growingCollection,
            );
          } else if (huboCreciendoRef.current) {
            huboCreciendoRef.current = false;
            (map.getSource("arcos-creciendo") as maplibregl.GeoJSONSource | undefined)?.setData(
              growingCollection,
            );
          }

          const settledCollection = {
            type: "FeatureCollection" as const,
            features: frame.settled.flatMap((arc) => {
              const full = coordsCacheRef.current.get(arc.key);
              if (!full || full.length < 2) return [];
              return [
                {
                  type: "Feature" as const,
                  properties: { width: weightToLineWidth(arc.weight) },
                  geometry: { type: "LineString" as const, coordinates: full },
                },
              ];
            }),
          };

          /**
           * Solo se reescribe cuando el conjunto cambia de verdad.
           *
           * La geometría de los arcos asentados no cambia entre frames: lo
           * único que se mueve es el gradiente, y ese es una propiedad de
           * PINTURA, no de la fuente.
           *
           * Reescribirla en cada frame obligaba a MapLibre a recalcular
           * las métricas de línea de todos los arcos —esta fuente lleva
           * `lineMetrics: true`—, que es justo el insumo que
           * `line-gradient` necesita para dibujarse: el gradiente se
           * pintaba contra una geometría que se estaba regenerando debajo.
           *
           * Se notaba sobre todo SIN timeline, porque ahí snapTo() asienta
           * los 54 arcos en el primer frame: unas 2.700 coordenadas
           * reprocesadas sesenta veces por segundo. Con timeline arranca
           * con pocos asentados y por eso ahí sí se veía fluido.
           *
           * La firma incluye el peso porque `bumpWeight` puede engordar
           * una línea sin que cambie el conjunto de claves, y ese cambio sí
           * tiene que llegar a la fuente.
           */
          const firmaAsentados = frame.settled.map((a) => `${a.key}:${a.weight}`).join("|");
          if (firmaAsentados !== firmaAsentadosRef.current) {
            firmaAsentadosRef.current = firmaAsentados;
            (map.getSource("arcos-asentados") as maplibregl.GeoJSONSource | undefined)?.setData(
              settledCollection,
            );
          }

          // Este SÍ va en cada frame: es lo único que tiene que moverse, y
          // como es propiedad de pintura no toca la fuente ni obliga a
          // recalcular nada de la geometría.
          if (map.getLayer("arcos-asentados-line")) {
            map.setPaintProperty(
              "arcos-asentados-line",
              "line-gradient",
              buildPulseGradient(
                frame.pulseLoopT,
                "rgba(232,236,243,0.22)",
                "#e8ecf3",
                0.06,
              ) as unknown as maplibregl.ExpressionSpecification,
            );
          }
        } catch (err) {
          console.error(
            "Error renderizando un frame de animación de arcos, se salta este frame.",
            err,
          );
        } finally {
          rafRef.current =
            document.visibilityState !== "hidden" ? requestAnimationFrame(animate) : null;
        }
      };

      rafRef.current = requestAnimationFrame(animate);

      subirEtiquetas(map);

      readyRef.current = true;
      pendingRef.current.forEach((fn) => fn());
      pendingRef.current = [];
    });

    const pulseEngine = pulseEngineRef.current;
    const activityEngine = activityEngineRef.current;

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      destinoPopup.remove();
      origenPopup.remove();
      municipalityPopup.remove();
      pulseEngine.clear();
      activityEngine.clear();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    whenReady(() => {
      const map = mapRef.current!;
      const source = map.getSource("origenes") as maplibregl.GeoJSONSource | undefined;
      source?.setData({
        type: "FeatureCollection",
        features: origenes
          .filter((o) => o.animable && o.latitud != null && o.longitud != null)
          .map((o) => ({
            type: "Feature",
            id: o.id,
            properties: {
              id: o.id,
              nombre: o.nombre,
              color: ORIGEN_COLOR_BY_NORM_ID[normId(o.id)] ?? "#e8ecf3",
            },
            geometry: { type: "Point", coordinates: [o.longitud, o.latitud] },
          })),
      });
    });
  }, [origenes]);

  useEffect(() => {
    whenReady(() => {
      const map = mapRef.current!;
      const source = map.getSource("destinos") as maplibregl.GeoJSONSource | undefined;
      source?.setData({
        type: "FeatureCollection",
        features: destinos
          .filter((d) => d.latitud != null && d.longitud != null)
          .map((d) => ({
            type: "Feature",
            id: d.id,
            properties: { id: d.id, nombre: d.nombre },
            geometry: { type: "Point", coordinates: [d.longitud, d.latitud] },
          })),
      });
      destinos.forEach((d) => {
        const total = destinoAcumuladoRef.current.get(d.id) ?? 0;
        map.setFeatureState({ source: "destinos", id: d.id }, { intensity: intensityFor(total) });
      });
    });

    /**
     * Índice para resolver el destino al hacer clic en el ÁREA de un
     * municipio.
     *
     * Antes las llaves se armaban con normId, que no hace case-fold ni
     * quita tildes: solo recorta ceros de ids numéricos. Con el GeoJSON
     * diciendo "RIOFRIO" y el destino "Riofrío" no había coincidencia, el
     * clic no encontraba nada y caía en el reset. Por eso solo funcionaba
     * el punto.
     */
    destinoIdByNormNameRef.current = new Map(
      destinos.flatMap((d) => [
        [normMunicipalityName(d.nombre), d.id],
        [normId(d.id), d.id],
      ]),
    );

    const conCoordenada = destinos.filter(
      (d): d is DestinoResumenLista & { latitud: number; longitud: number } =>
        d.latitud != null && d.longitud != null,
    );
    destinoCoordsByIdRef.current = new Map(
      conCoordenada.map((d) => [d.id, [d.longitud, d.latitud] as LngLat]),
    );
    destinoMetaByIdRef.current = new Map(
      conCoordenada.map((d) => [
        d.id,
        { nombre: d.nombre, coords: [d.longitud, d.latitud] as LngLat },
      ]),
    );
  }, [destinos]);

  useEffect(() => {
    whenReady(() => {
      const map = mapRef.current!;
      destinos.forEach((d) => {
        map.setFeatureState(
          { source: "destinos", id: d.id },
          { selected: d.id === selectedDestinoId },
        );
      });
    });
  }, [selectedDestinoId, destinos]);

  useEffect(() => {
    whenReady(() => {
      const map = mapRef.current!;
      origenes.forEach((o) => {
        map.setFeatureState({ source: "origenes", id: o.id }, { selected: o.id === selectedOrigenId });
      });
    });
  }, [selectedOrigenId, origenes]);

  // --- coloreo territorial ------------------------------------------------
  useEffect(() => {
    whenReady(() => {
      const map = mapRef.current!;
      if (!map.getSource("municipios")) {
        console.warn(
          "[MapCanvas] fuente 'municipios' no existe, se saltea el coloreo territorial. " +
            "Revisá el error de carga de valle-municipios.json más arriba en consola.",
        );
        return;
      }

      const selectedDestinoName = destinos.find((d) => d.id === selectedDestinoId)?.nombre;

      if (import.meta.env.DEV) {
        const sinMatch = boundaryFeatures
          .map((f) => String(f.id ?? f.properties?.["municipalityCode"] ?? ""))
          .filter((code) => code && code !== CALI_DANE && !getTerritoryStatByCode(code));
        if (sinMatch.length > 0) {
          console.warn("[MapCanvas] códigos DANE sin match en el catálogo:", [...new Set(sinMatch)]);
        }
      }

      boundaryFeatures.forEach((feature) => {
        const id = feature.id ?? feature.properties?.["municipalityCode"];
        if (id == null || String(id).trim() === "") return;
        const code = String(id);
        const esCali = normId(code) === CALI_DANE;
        const vivo = municipios.get(code);
        const zona = vivo?.zona ?? getTerritoryStatByCode(code)?.zone ?? null;
        const tone = territoryToneIndex(
          valorTemporal(vivo, territoryMode, territoryDay),
          territoryMode,
        );

        map.setFeatureState(
          { source: "municipios", id: code },
          {
            territoryToneColor: esCali ? TERRITORY_EXCLUDED : territoryColorForTone(tone),
            // Se atenúa por dos motivos independientes: no pertenecer a
            // la zona filtrada, o quedar fuera del resaltado por
            // categoría. Cali no tiene zona en el catálogo, así que cae
            // en el primero apenas se filtra por una zona concreta.
            filteredOut:
              (territoryZone !== "todas" && zona !== territoryZone) ||
              (resaltados !== null && !resaltados.has(code)),
            // Este SÍ va por nombre (el destino no trae código DANE),
            // pero con un normalizador que hace case-fold y saca tildes:
            // normId no lo hacía y "Riofrío" nunca matcheaba "RIOFRIO".
            selected:
              !esCali &&
              sameMunicipality(
                selectedDestinoName,
                vivo?.nombre ?? getTerritoryStatByCode(code)?.name ?? null,
              ),
          },
        );
      });

      // Cada repintado es un buen momento para reasegurar el orden: si
      // algún efecto agregó una capa entre tanto, los nombres vuelven a
      // quedar debajo del relleno.
      subirEtiquetas(map);
    });
  }, [destinos, municipios, resaltados, selectedDestinoId, territoryDay, territoryMode, territoryZone]);

  // --- etiquetas de municipio (nombre + conteo) ---------------------------
  useEffect(() => {
    whenReady(() => {
      const map = mapRef.current!;
      const source = map.getSource("municipios-etq") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      source.setData({
        type: "FeatureCollection",
        features: boundaryFeatures.flatMap((feature) => {
          const props = feature.properties ?? {};
          const lng = props["labelLng"];
          const lat = props["labelLat"];
          if (typeof lng !== "number" || typeof lat !== "number") return [];

          const code = String(feature.id ?? props["municipalityCode"] ?? "");
          if (normId(code) === CALI_DANE) return [];

          const vivo = municipios.get(code);
          const zona = vivo?.zona ?? getTerritoryStatByCode(code)?.zone ?? null;
          if (territoryZone !== "todas" && zona !== territoryZone) return [];

          return [
            {
              type: "Feature" as const,
              properties: {
                name: String(props["name"] ?? ""),
                value: valorTemporal(vivo, territoryMode, territoryDay),
              },
              geometry: { type: "Point" as const, coordinates: [lng, lat] },
            },
          ];
        }),
      });

      // Después de cada actualización, por si alguna capa se agregó
      // encima entre tanto.
      subirEtiquetas(map);
    });
  }, [municipios, territoryMode, territoryDay, territoryZone]);

  useEffect(() => {
    whenReady(() => {
      const map = mapRef.current!;
      const engine = engineRef.current;
      const pulseEngine = pulseEngineRef.current;
      const weights: Record<string, number> = {};
      const origenesPorId = new Map(origenes.map((o) => [normId(o.id), o]));
      const validKeys: string[] = [];

      flujos.forEach((f) => {
        const key = flujoKey(f);
        weights[key] = f.despachosCount;
        if (!coordsCacheRef.current.has(key)) {
          const origenMatch = origenesPorId.get(normId(f.origenId));
          if (
            origenMatch?.latitud != null &&
            origenMatch.longitud != null &&
            f.destino.latitud != null &&
            f.destino.longitud != null
          ) {
            coordsCacheRef.current.set(
              key,
              buildArcCoordinates(
                [origenMatch.longitud, origenMatch.latitud],
                [f.destino.longitud, f.destino.latitud],
              ),
            );
          }
        }
        if (coordsCacheRef.current.has(key)) validKeys.push(key);
      });

      /**
       * Cuándo se anima el crecimiento de los arcos.
       *
       * Un arco tiene dos aspectos distintos: mientras CRECE va del color
       * de su origen —azul si salió de Cali, naranja si salió de
       * Cartago—, y una vez ASENTADO pasa a la línea clara con el pulso
       * recorriéndola. Si se salta la primera fase, la ruta aparece ya
       * asentada y se pierde de dónde salió.
       *
       * Se anima siempre que el conjunto de arcos cambie, con una sola
       * excepción: `instantTransition`, que es el seek del timeline.
       * Nunca se anima un salto, porque redibujar una línea ya trazada se
       * lee como un error visual y no como "retrocedió en el tiempo".
       *
       * La comparación por firma es lo que evita que se reanime sola: sin
       * ella, cada render de React rearma el array de flujos y la red
       * volvería a crecer desde cero aunque no haya cambiado nada.
       */
      const firmaArcos = validKeys.slice().sort().join("|");
      const cambiaronLosArcos = firmaArcos !== firmaArcosRef.current;
      firmaArcosRef.current = firmaArcos;

      const animarEntrada =
        !instantTransition && validKeys.length > 0 && (timelineActive || cambiaronLosArcos);

      if (animarEntrada) {
        // Sin timeline, los arcos que sobreviven al cambio de selección
        // ya están en fase "settled" desde la vez anterior, y `enter()`
        // solo actúa sobre los que están en "idle". Vaciar el registro
        // primero es lo que los hace nacer de nuevo.
        //
        // Con timeline NO se vacía: ahí los arcos se van sumando jornada
        // a jornada y reiniciar los ya dibujados rompería la continuidad.
        if (!timelineActive) engine.snapTo([], {}, performance.now());
        engine.sync(validKeys, weights);
        validKeys.forEach((key) => engine.enter(key, performance.now()));
      } else {
        engine.snapTo(validKeys, weights, performance.now());
      }

      // La intensidad de los puntos sigue atada al timeline, no a la
      // cascada. Durante la entrada inicial los destinos ya toman su
      // color final mientras las líneas se dibujan: el degradado
      // progresivo es parte de la narración por jornada, y en la carga
      // dejaría los puntos en rojo hasta que termine la ola.
      if (instantTransition || !timelineActive) {
        const totales = new Map<string, number>();
        flujos.forEach((f) => {
          totales.set(f.destino.id, (totales.get(f.destino.id) ?? 0) + f.despachosCount);
        });
        destinoAcumuladoRef.current = totales;
        destinos.forEach((d) => {
          const total = totales.get(d.id) ?? 0;
          map.setFeatureState({ source: "destinos", id: d.id }, { intensity: intensityFor(total) });
        });
        pulseEngine.clear();
        activityEngineRef.current.clear();
        handlersRef.current.onActivity?.(null);
      } else {
        validKeys.forEach((key) => {
          const prev = prevWeightsRef.current.get(key);
          if (prev === undefined) return; // arco nuevo, lo maneja justSettled en animate()
          const delta = (weights[key] ?? 0) - prev;
          if (delta > 0) {
            const destinoId = key.split("::")[1] ?? "";
            const nuevoTotal = (destinoAcumuladoRef.current.get(destinoId) ?? 0) + delta;
            destinoAcumuladoRef.current.set(destinoId, nuevoTotal);
            map.setFeatureState(
              { source: "destinos", id: destinoId },
              { intensity: intensityFor(nuevoTotal) },
            );
            const meta = destinoMetaByIdRef.current.get(destinoId);
            if (meta) activityEngineRef.current.spawn(destinoId, meta.nombre, delta, performance.now());
          }
        });
      }

      prevWeightsRef.current = new Map(Object.entries(weights));
    });
  }, [flujos, instantTransition, origenes, destinos, timelineActive]);

  /**
   * Devolver la cámara al encuadre inicial.
   *
   * El primer valor del contador se ignora: si no, el mapa haría un
   * `easeTo` hacia el mismo sitio donde ya está apenas termina de
   * montarse, y se vería un tirón sin motivo al cargar la página.
   */
  const primerTokenRef = useRef(true);
  useEffect(() => {
    if (primerTokenRef.current) {
      primerTokenRef.current = false;
      return;
    }
    whenReady(() => {
      const prefiereQuieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      mapRef.current?.easeTo({
        center: OVERVIEW_CENTER,
        zoom: OVERVIEW_ZOOM,
        duration: prefiereQuieto ? 0 : 700,
      });
    });
  }, [vistaGeneralToken]);

  // --- visibilidad de puntos y rutas --------------------------------------
  useEffect(() => {
    whenReady(() => {
      const map = mapRef.current!;
      // En modo jornada los nodos estorban: el municipio ya lleva su
      // propio número y la lectura es el color del área, no el punto.
      // Mismo criterio que el `#capa-nodos { opacity: 0 }` del HTML.
      const hideNodes = routesMode === "color" || territoryMode === "jornada";
      const pointOpacity = hideNodes ? 0 : 1;
      const routeOpacity = routesMode === "color" ? 0 : 1;

      if (map.getLayer("origenes-glow"))
        map.setPaintProperty("origenes-glow", "circle-opacity", pointOpacity * 0.18);
      if (map.getLayer("origenes-point"))
        map.setPaintProperty("origenes-point", "circle-opacity", pointOpacity);
      if (map.getLayer("destinos-point"))
        map.setPaintProperty("destinos-point", "circle-opacity", pointOpacity);
      if (map.getLayer("arrivals-pulse"))
        map.setPaintProperty(
          "arrivals-pulse",
          "circle-stroke-opacity",
          pointOpacity === 0 ? 0 : ["get", "opacity"],
        );
      if (map.getLayer("arcos-creciendo-line"))
        map.setPaintProperty("arcos-creciendo-line", "line-opacity", routeOpacity * 0.9);
      if (map.getLayer("arcos-asentados-line"))
        map.setPaintProperty("arcos-asentados-line", "line-opacity", routeOpacity);
    });
  }, [routesMode, territoryMode]);

  return (
    <div className="absolute inset-0 h-full w-full">
      <div
        ref={containerRef}
        data-map-root=""
        className="absolute inset-0 h-full w-full"
        aria-label="Mapa de las ayudas entregadas en los municipios del Valle del Cauca"
      />
    </div>
  );
}

function colorForKey(key: string): string {
  const origenId = key.split("::")[0] ?? "";
  const norm = normId(origenId);
  return ORIGEN_COLOR_BY_NORM_ID[norm] ?? ORIGEN_DIM_COLOR_BY_NORM_ID[norm] ?? "#e8ecf3";
}