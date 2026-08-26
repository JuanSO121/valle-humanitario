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
import { sameMunicipality } from "@/lib/municipalityName";
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
import { describeLens, territoryValue } from "@/presentation/data/territoryTime";

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
 * para valor 0 y no 0 — ver territoryColorForTone.
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
 * Razón toneladas/despacho de toda la operación (531 t / 397 despachos).
 * Es la MISMA constante documentada en territoryData.toneladas — se
 * repite acá para estimar toneladas del modo "jornada", donde no hay un
 * acumulado por municipio que consultar. Antes este archivo usaba 1.75,
 * que venía de otra fuente y no cuadraba con el catálogo.
 */
const TONELADAS_POR_DESPACHO = 1.34;

/**
 * Umbral heurístico de "verde pleno" para el mapa de calor de destinos.
 * No hay un campo de meta esperada por destino en el backend (Flujo /
 * DestinoResumenLista no lo traen — ver entities.ts), así que se usa un
 * número fijo documentado acá en vez de inventar un campo que el backend
 * no devuelve.
 */
const INTENSITY_FULL_THRESHOLD = 5;

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
 * o casi, alcanza — y evita meter turf.js solo por esto.
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
        id: code || `idx-${feature.id ?? name}`, // nunca undefined — sin id, feature-state no pega
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
    // era #0B2233, el mismo azul profundo de la rampa territorial, así
    // que los municipios de menor volumen se confundían con el mar y con
    // los departamentos vecinos.
    { id: "bg", type: "background", paint: { "background-color": "#586A78" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 0.14,
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
  routesMode: TerritoryRoutesMode;
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

function popupHtml(label: string): string {
  return `<div style="font-family:'IBM Plex Sans',sans-serif;font-size:12px">
             <strong>${escapeHtml(label)}</strong>
           </div>`;
}

function municipalityPopupHtml(
  label: string,
  codigoDane: string,
  mode: TerritoryMapMode,
  day: string | null,
): string {
  const stat = getTerritoryStatByCode(codigoDane);
  if (!stat) {
    // Cali y cualquier polígono fuera del catálogo caen acá: se dice por
    // qué no hay cifras, en vez de mostrar un popup vacío.
    return `<div style="font-family:'IBM Plex Sans',sans-serif;min-width:170px">
      <strong style="display:block;font-size:13px;margin-bottom:4px">${escapeHtml(label)}</strong>
      <span style="color:#9DB4C2;font-size:11.5px">Fuera del consolidado municipal</span>
    </div>`;
  }

  const value = territoryValue(stat, mode, day);
  // stat.toneladas es el total FINAL del municipio: solo sirve cuando no
  // hay día elegido. Con día, se estima sobre los despachos de ese corte.
  const toneladas =
    day === null ? stat.toneladas : Math.round(value * TONELADAS_POR_DESPACHO);
  const moveLabel = "despachos";
  const sinDespacho = value === 0;

  return `<div style="font-family:'IBM Plex Sans',sans-serif;min-width:190px">
    <strong style="display:block;font-size:13px;margin-bottom:2px">${escapeHtml(label)}</strong>
    <span style="display:block;color:#81C8EC;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">Zona ${escapeHtml(stat.zone)}</span>
    <span style="display:block;color:#9DB4C2;font-size:11px;margin-bottom:8px">${escapeHtml(describeLens(mode, day))}</span>
    ${
      sinDespacho
        ? `<span style="color:#F58A76;font-size:12px;font-weight:600">Sin despacho en este corte</span>`
        : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
      <div><b style="font-size:16px">${value.toLocaleString("es-CO")}</b><span style="display:block;color:#9DB4C2">${moveLabel}</span></div>
      <div><b style="font-size:16px">${toneladas.toLocaleString("es-CO")} t</b><span style="display:block;color:#9DB4C2">estimadas</span></div>
      <div><b style="font-size:16px">${stat.unidades.toLocaleString("es-CO")}</b><span style="display:block;color:#9DB4C2">unidades</span></div>
      <div><b style="font-size:16px">${stat.renglones.toLocaleString("es-CO")}</b><span style="display:block;color:#9DB4C2">renglones</span></div>
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
  routesMode,
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

  const hoveredOrigenIdRef = useRef<string | null>(null);
  const hoveredDestinoIdRef = useRef<string | null>(null);

  const destinoIdByNormNameRef = useRef<Map<string, string>>(new Map());
  const destinoCoordsByIdRef = useRef<Map<string, LngLat>>(new Map());
  const destinoMetaByIdRef = useRef<Map<string, { nombre: string; coords: LngLat }>>(new Map());
  const prevWeightsRef = useRef<Map<string, number>>(new Map());
  const destinoAcumuladoRef = useRef<Map<string, number>>(new Map());

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
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

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
            // placeholder "sin dato" inyectado en normalizeBoundaries —
            // nunca transparente y nunca el tono de volumen máximo.
            "fill-color": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              "#F0B102",
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
          paint: { "line-color": "#CBE4F2", "line-width": 0.9, "line-opacity": 0.32 },
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
            "text-size": 10.5,
            "text-offset": [0, -0.35],
            "text-transform": "uppercase",
            "text-letter-spacing": 0.04,
          },
          paint: { "text-color": "#EAF4FA", "text-halo-color": "#08202E", "text-halo-width": 1.8 },
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
            "text-size": 11,
            "text-offset": [0, 0.8],
          },
          paint: { "text-color": "#FFD103", "text-halo-color": "#08202E", "text-halo-width": 1.8 },
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
                municipalityPopupHtml(name, codigoDane, territoryModeRef.current, territoryDayRef.current),
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
            "#F0B102",
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

      // --- click: origen > destino > ÁREA de municipio > reset -----------
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

          // Cali no abre panel: está fuera del consolidado municipal, no
          // tiene fila en el catálogo y abrir un panel vacío se lee como
          // un bug. Se traga el click sin resetear la vista.
          if (normId(municipioCode) === CALI_DANE) return;

          const municipioName = municipio?.properties?.["name"];
          const destinoId =
            (municipioName != null
              ? destinoIdByNormNameRef.current.get(normId(String(municipioName)))
              : undefined) ?? destinoIdByNormNameRef.current.get(normId(municipioCode));
          if (destinoId != null) {
            handlersRef.current.onSelectDestino(destinoId);
            return;
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
          .setHTML(popupHtml(String(f.properties?.["nombre"] ?? "")))
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
          .setHTML(popupHtml(String(f.properties?.["nombre"] ?? "")))
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
          // destino — coincide con lo que la persona ve.
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

          const arrivalsCollection = {
            type: "FeatureCollection" as const,
            features: pulseEngineRef.current
              .tick(now)
              .flatMap((p: { destinoId: string; progress: number }) => {
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
          (map.getSource("arrivals") as maplibregl.GeoJSONSource | undefined)?.setData(
            arrivalsCollection,
          );

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
          (map.getSource("arcos-creciendo") as maplibregl.GeoJSONSource | undefined)?.setData(
            growingCollection,
          );

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
          (map.getSource("arcos-asentados") as maplibregl.GeoJSONSource | undefined)?.setData(
            settledCollection,
          );

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
            "Error renderizando un frame de animación de arcos — se salta este frame.",
            err,
          );
        } finally {
          rafRef.current =
            document.visibilityState !== "hidden" ? requestAnimationFrame(animate) : null;
        }
      };
      rafRef.current = requestAnimationFrame(animate);

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

    destinoIdByNormNameRef.current = new Map(
      destinos.flatMap((d) => [
        [normId(d.nombre), d.id],
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
          "[MapCanvas] fuente 'municipios' no existe — se saltea el coloreo territorial. " +
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
          console.warn("[MapCanvas] códigos DANE sin match en territoryData:", [...new Set(sinMatch)]);
        }
      }

      boundaryFeatures.forEach((feature) => {
        const id = feature.id ?? feature.properties?.["municipalityCode"];
        if (id == null || String(id).trim() === "") return;

        const code = String(id);
        const esCali = normId(code) === CALI_DANE;
        const stat = getTerritoryStatByCode(code);
        const tone = territoryToneIndex(territoryValue(stat, territoryMode, territoryDay), territoryMode);

        map.setFeatureState(
          { source: "municipios", id: code },
          {
            territoryToneColor: esCali ? TERRITORY_EXCLUDED : territoryColorForTone(tone),
            // Cali no tiene zona en el catálogo, así que se atenúa junto
            // con el resto apenas se filtra por una zona concreta.
            filteredOut: territoryZone !== "todas" && stat?.zone !== territoryZone,
            // Este SÍ va por nombre (el destino no trae código DANE),
            // pero con un normalizador que hace case-fold y saca tildes:
            // normId no lo hacía y "Riofrío" nunca matcheaba "RIOFRIO".
            selected: !esCali && stat != null && sameMunicipality(selectedDestinoName, stat.name),
          },
        );
      });
    });
  }, [destinos, selectedDestinoId, territoryDay, territoryMode, territoryZone]);

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

          const stat = getTerritoryStatByCode(code);
          if (territoryZone !== "todas" && stat?.zone !== territoryZone) return [];

          return [
            {
              type: "Feature" as const,
              properties: {
                name: String(props["name"] ?? ""),
                value: territoryValue(stat, territoryMode, territoryDay),
              },
              geometry: { type: "Point" as const, coordinates: [lng, lat] },
            },
          ];
        }),
      });
    });
  }, [territoryMode, territoryDay, territoryZone]);

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

      if (instantTransition) {
        engine.snapTo(validKeys, weights, performance.now());
      } else {
        engine.sync(validKeys, weights);
        validKeys.forEach((key) => engine.enter(key, performance.now()));
      }

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
        aria-label="Mapa del Valle del Cauca con los despachos por municipio y las rutas desde los centros de acopio"
      />
    </div>
  );
}

function colorForKey(key: string): string {
  const origenId = key.split("::")[0] ?? "";
  const norm = normId(origenId);
  return ORIGEN_COLOR_BY_NORM_ID[norm] ?? ORIGEN_DIM_COLOR_BY_NORM_ID[norm] ?? "#e8ecf3";
}