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
import municipalBoundariesRaw from "@/data/valle-municipios.json";
import { createArrivalPulseEngine } from "./arrivalPulseEngine";
import { createDispatchActivityEngine, type ActivityFrame } from "./dispatchActivityEngine";

import {
  TERRITORY_BLUE_RAMP,
  getTerritoryStat,
  getTerritoryStatByCode,
  territoryToneIndex,
  territoryValueFor,
  type TerritoryMapMode,
  type TerritoryRoutesMode,
  type TerritoryZone,
} from "@/presentation/data/territoryData";

const OVERVIEW_CENTER: LngLat = [-76.35, 3.95];
const OVERVIEW_ZOOM = 7.1;

const ORIGIN_PULSE_PERIOD_MS = 1700;
const ORIGIN_PULSE_MAX_RADIUS_GROWTH = 22;

// Tolerancia de hit-test para clicks/taps sobre los puntos de origen y
// destino: en vez de exigir el pixel exacto del centro del círculo (que
// en mobile, con dedos gordos sobre un círculo de 5-10px de radio, falla
// seguido), se consulta una caja de +-8px alrededor del punto de click.
// Mismo criterio en ambos layers de punto.
const POINT_HIT_TOLERANCE_PX = 8;

/**
 * Umbral heurístico de "verde pleno" para el mapa de calor de destinos.
 * No hay un campo de meta esperada por destino en el backend (Flujo /
 * DestinoResumenLista no lo traen — ver entities.ts), así que se usa un
 * número fijo documentado acá en vez de inventar un campo que el backend
 * no devuelve. Si el día de mañana agregan una meta real por destino,
 * se reemplaza esta constante por ese campo sin tocar nada más del mapa.
 */
const INTENSITY_FULL_THRESHOLD = 5;

function intensityFor(totalWeight: number): number {
  return Math.max(0, Math.min(1, totalWeight / INTENSITY_FULL_THRESHOLD));
}

function municipalityNameFromProperties(
  properties: Record<string, unknown> | undefined,
): string {
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

function municipalityCodeFromProperties(
  properties: Record<string, unknown> | undefined,
): string {
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

function normalizeBoundaries(
  geojson: unknown,
): maplibregl.GeoJSONSourceSpecification["data"] {
  const collection = geojson as {
    features?: Array<{
      id?: string | number;
      properties?: Record<string, unknown>;
    }>;
  };

  if (!collection?.features) {
    return geojson as maplibregl.GeoJSONSourceSpecification["data"];
  }

  return {
    ...(collection as object),
    features: collection.features.map((feature) => {
      const properties = feature.properties ?? {};
      const code =
        normId(String(feature.id ?? "")) ||
        municipalityCodeFromProperties(properties);

      const name = municipalityNameFromProperties(properties);

      const stat = getTerritoryStat(name);
      const initialValue = territoryValueFor(stat, "acumulado", "11");
      const initialTone = territoryToneIndex(initialValue, "acumulado");

      return {
        ...feature,
        id: code || `idx-${feature.id ?? name}`, // nunca undefined — sin id, feature-state no pega
        properties: {
          ...properties,
          municipalityCode: code,
          name: name || properties["name"],
          territoryToneColor: TERRITORY_BLUE_RAMP[TERRITORY_BLUE_RAMP.length - 1], // placeholder; el efecto de coloreo lo pisa apenas el mapa carga
        },
      };
    }),
  } as unknown as maplibregl.GeoJSONSourceSpecification["data"];
}

const municipalBoundaries = normalizeBoundaries(municipalBoundariesRaw);

function territoryBlueForTone(tone: number | null | undefined): string {
  const index = Math.max(0, Math.min(TERRITORY_BLUE_RAMP.length - 1, tone ?? 0));
  return TERRITORY_BLUE_RAMP[TERRITORY_BLUE_RAMP.length - 1 - index] ?? TERRITORY_BLUE_RAMP[5];
}

function territoryToneFromValue(value: number, maxValue: number): number {
  if (!Number.isFinite(value) || value <= 0 || maxValue <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, value / maxValue));
  return Math.min(TERRITORY_BLUE_RAMP.length - 1, Math.floor(ratio * TERRITORY_BLUE_RAMP.length));
}

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
    { id: "bg", type: "background", paint: { "background-color": "#0B2233" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 0.1,
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
   * sentido narrativo durante la reproducción del timeline. Con el
   * timeline apagado, `flujos` representa el total sin filtrar, así que
   * la intensidad de cada destino se fija directo al valor final (sin
   * animar) en vez de ir subiendo despacho a despacho.
   */
  timelineActive: boolean;
  selectedDestinoId: string | null;
  selectedOrigenId: string | null;
  territoryMode: TerritoryMapMode;
  territoryDay: string;
  territoryZone: TerritoryZone | "todas";
  routesMode: TerritoryRoutesMode;
  onSelectDestino: (id: string) => void;
  onSelectOrigen: (id: string) => void;
  onReset: () => void;
  onActivity?: (frame: ActivityFrame | null) => void;
}

const flujoKey = (f: Flujo) => `${f.origenId}::${f.destino.id}`;

function popupHtml(label: string): string {
  return `<div style="font-family:'IBM Plex Sans',sans-serif;font-size:12px">
             <strong>${label}</strong>
           </div>`;
}

function municipalityPopupHtml(label: string, codigoDane: string, mode: TerritoryMapMode, day: string): string {
  const stat = getTerritoryStatByCode(codigoDane);
  if (!stat) return popupHtml(label);
  const value = territoryValueFor(stat, mode, day);
  const toneladas = mode === "acumulado" ? stat.toneladas : Math.round(value * 1.75);
  const moveLabel = mode === "acumulado" ? "despachos" : `despachos el ${day}`;

  return `<div style="font-family:'IBM Plex Sans',sans-serif;min-width:190px">
    <strong style="display:block;font-size:13px;margin-bottom:2px">${label}</strong>
    <span style="display:block;color:#81C8EC;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Zona ${stat.zone}</span>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
      <div><b style="font-size:16px">${value.toLocaleString("es-CO")}</b><span style="display:block;color:#9DB4C2">${moveLabel}</span></div>
      <div><b style="font-size:16px">${toneladas.toLocaleString("es-CO")} t</b><span style="display:block;color:#9DB4C2">estimadas</span></div>
      <div><b style="font-size:16px">${stat.unidades.toLocaleString("es-CO")}</b><span style="display:block;color:#9DB4C2">unidades</span></div>
      <div><b style="font-size:16px">${stat.renglones.toLocaleString("es-CO")}</b><span style="display:block;color:#9DB4C2">renglones</span></div>
    </div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c),
  );
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

  // Igual que handlersRef: timelineActive puede cambiar mientras el rAF
  // loop (armado una sola vez en el efecto de montaje) sigue vivo, así
  // que se lee vía ref dentro de animate(), no capturado por closure.
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

  // Índice nombre-normalizado -> id de destino, para poder resolver
  // "clickearon el municipio X" a "seleccioná el destino que corresponde
  // a X" sin depender de un código de municipio que `DestinoResumenLista`
  // no trae hoy (solo id/nombre/lat/lon/tipo).
  const destinoIdByNormNameRef = useRef<Map<string, string>>(new Map());

  // Coordenada por id de destino — la usan tanto el índice de arriba como
  // el render de pulsos de llegada (renderPulseFrames).
  const destinoCoordsByIdRef = useRef<Map<string, LngLat>>(new Map());
  const destinoMetaByIdRef = useRef<Map<string, { nombre: string; coords: LngLat }>>(new Map());

  // Peso previo por arco `key`, para detectar "este arco ya existía y su
  // despachosCount subió" (weight bump) al avanzar el timeline. El caso
  // de un arco NUEVO no se lee acá: se maneja en animate(), vía
  // engine.tick().justSettled, en el frame exacto en que la línea termina
  // de crecer y toca el destino.
  const prevWeightsRef = useRef<Map<string, number>>(new Map());

  // Peso TOTAL acumulado por destino (suma de despachos de todos los
  // orígenes que ya "tocaron" ese punto) — es lo que alimenta el
  // feature-state `intensity` del mapa de calor. Se actualiza de a
  // incrementos reales (weight-bump o justSettled), no de una sola vez,
  // para que el punto vaya pasando de rojo a amarillo a verde AL RITMO en
  // que las líneas realmente llegan, no antes de que se vea nada.
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

    const destinoPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });
    const origenPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });
    const municipalityPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 8,
    });

    map.on("load", () => {
      let hoveredMunicipalityId: string | null = null;
      try {
        map.addSource("municipios", { type: "geojson", data: municipalBoundaries });

        // TEMPORAL — borrar después de diagnosticar
          const feats = (municipalBoundaries as any).features ?? [];
          console.log("[debug] total features:", feats.length);
          console.log("[debug] primeras 5 props:", feats.slice(0, 5).map((f: any) => f.properties));
          console.log("[debug] ids asignados:", feats.slice(0, 5).map((f: any) => f.id));
          console.log(
            "[debug] nombres sin match en territoryData:",
            feats.filter((f: any) => !getTerritoryStat(f.properties?.name)).map((f: any) => f.properties?.name),
          );

        map.addLayer({
          id: "municipios-fill",
          type: "fill",
          source: "municipios",
          paint: {
            // El color territorial se calcula siempre a partir del tono.
            // Si todavía no existe feature-state (primer render), usa el
            // `territoryTone` que se inyectó en normalizeBoundaries.
            // El valor por defecto es 0 (azul más claro), nunca transparente.
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
        map.addLayer({
          id: "municipios-label",
          type: "symbol",
          source: "municipios",
          minzoom: 7.8,
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 10,
            "text-transform": "uppercase",
            "text-letter-spacing": 0.05,
          },
          paint: { "text-color": "#D7EDF8", "text-halo-color": "#0B2233", "text-halo-width": 1.2 },
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
            map.setFeatureState(
              { source: "municipios", id: hoveredMunicipalityId },
              { hovered: false },
            );
          }
          if (nextId != null) {
            map.setFeatureState({ source: "municipios", id: nextId }, { hovered: true });
            const name = String(feature?.properties?.["name"] ?? "");
            const codigoDane = String(feature?.properties?.["municipalityCode"] ?? "");
            municipalityPopup
              .setLngLat(e.lngLat)
              .setHTML(municipalityPopupHtml(name, codigoDane, territoryModeRef.current, territoryDayRef.current))
              .addTo(map);
          }
          hoveredMunicipalityId = nextId;
        });
        map.on("mouseleave", "municipios-fill", () => {
          map.getCanvas().style.cursor = "";
          if (hoveredMunicipalityId != null) {
            map.setFeatureState(
              { source: "municipios", id: hoveredMunicipalityId },
              { hovered: false },
            );
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

      map.addSource("origenes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

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
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            3.5,
            2.5,
          ],
          "circle-stroke-width-transition": { duration: 180, delay: 0 },
          "circle-stroke-color": "#0b0e14",
        },
      });

      map.addSource("destinos", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
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
          "circle-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#F0B102",
            "#e8ecf3",
          ],
          "circle-color-transition": { duration: 450, delay: 0 },
          "circle-stroke-width": 1.4,
          "circle-stroke-color": "#0b0e14",
        },
      });

      // Anillo de "pop": una sola capa nativa de MapLibre, alimentada en
      // cada frame de animate() desde arrivalPulseEngine.tick(). Cada
      // feature trae su propio radio/opacidad como PROPIEDAD (no
      // feature-state) porque cambian todos los frames — mismo patrón que
      // ya usan arcos-creciendo/arcos-asentados más abajo. Reemplaza al
      // <div> imperativo posicionado a mano que tenía el toast de texto:
      // acá no hace falta media_type overlay porque el pulso vive en su
      // propia coordenada geográfica, no compite por espacio en pantalla
      // aunque "popeen" cien destinos a la vez.
      map.addSource("arrivals", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
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

      map.addSource("arcos-creciendo", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
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
        data: { type: "FeatureCollection", features: [] },
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
      // Se agregó el tercer escalón (municipio) DESPUÉS de los puntos: si
      // el punto de un destino cae dentro de su propio polígono (el caso
      // normal), el click sobre el punto ya lo resuelve en el segundo
      // escalón y nunca llega a probar el polígono — el orden importa
      // para no hacer una consulta de más en el caso común.
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

        // Click en el ÁREA (no en el punto): si el municipio clickeado
        // tiene un destino con el mismo nombre normalizado, se selecciona
        // ese destino — mismo resultado que si hubieras tocado el punto.
        // La capa puede no existir si valle-municipios.json falló al cargar.
        // Nunca consultar una capa inexistente: MapLibre lanza una excepción.
        const municipioHits = map.getLayer("municipios-fill")
          ? map.queryRenderedFeatures(e.point, { layers: ["municipios-fill"] })
          : [];
        if (municipioHits.length > 0) {
          const municipio = municipioHits[0];
          const municipioName = municipio?.properties?.["name"];
          const municipioCode = municipio?.properties?.["municipalityCode"] ?? municipio?.id;
          const destinoId =
            (municipioName != null
              ? destinoIdByNormNameRef.current.get(normId(String(municipioName)))
              : undefined) ??
            (municipioCode != null
              ? destinoIdByNormNameRef.current.get(normId(String(municipioCode)))
              : undefined);
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
          map.setFeatureState(
            { source: "origenes", id: hoveredOrigenIdRef.current },
            { hover: false },
          );
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
          map.setFeatureState(
            { source: "destinos", id: hoveredDestinoIdRef.current },
            { hover: false },
          );
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
              routesModeRef.current === "color" ? 0 : (1 - originT) ** 2 * 0.55,
            );
          }

          const frame = engineRef.current.tick(now);

          // "Llegó": se dispara acá, no en el efecto que sincroniza
          // `flujos`, porque acá es donde el motor de arcos reporta el
          // frame exacto en que la línea terminó de crecer y tocó el
          // destino — coincide con lo que la persona ve, no con cuándo
          // llegaron los props nuevos. Gateado por timelineActiveRef:
          // fuera del modo timeline no tiene sentido narrativo animar
          // "llegadas" (ver comentario de la prop).
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
            features: pulseEngineRef.current.tick(now).flatMap((p: { destinoId: string; progress: number; }) => {
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

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      destinoPopup.remove();
      origenPopup.remove();
      municipalityPopup.remove();
      pulseEngine.clear();
      activityEngineRef.current.clear();
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
      // Arranque de feature-state para intensity: lo que ya se sepa
      // acumulado (si el efecto de `flujos` corrió antes) o 0. Sin esto,
      // ["feature-state","intensity"] es undefined en el primer frame y
      // la expresión de interpolación cae al valor del primer stop (rojo)
      // igual, pero mejor dejarlo explícito.
      destinos.forEach((d) => {
        const total = destinoAcumuladoRef.current.get(d.id) ?? 0;
        map.setFeatureState({ source: "destinos", id: d.id }, { intensity: intensityFor(total) });
      });
    });

    // Índice de nombre normalizado -> id, para el click sobre el ÁREA del
    // municipio (ver map.on("click", ...) más arriba). Se reconstruye acá
    // junto con el setData de arriba para no tener un tercer efecto que
    // dependa de `destinos` por separado.
    destinoIdByNormNameRef.current = new Map(
      destinos.flatMap((d) => [
        [normId(d.nombre), d.id],
        [normId(d.id), d.id],
      ]),
    );

    // Coordenada por id, para anclar los pulsos de llegada (renderPulseFrames
    // en animate() la lee vía destinoCoordsByIdRef).
    destinoCoordsByIdRef.current = new Map(
      destinos
        .filter(
          (d): d is DestinoResumenLista & { latitud: number; longitud: number } =>
            d.latitud != null && d.longitud != null,
        )
        .map((d) => [d.id, [d.longitud, d.latitud] as LngLat]),
    );

    destinoMetaByIdRef.current = new Map(
      destinos
        .filter(
          (d): d is DestinoResumenLista & { latitud: number; longitud: number } =>
            d.latitud != null && d.longitud != null,
        )
        .map((d) => [
          d.id,
          {
            nombre: d.nombre,
            coords: [d.longitud, d.latitud] as LngLat,
          },
        ]),
    );

    destinoMetaByIdRef.current = new Map(
      destinos
        .filter(
          (d): d is DestinoResumenLista & { latitud: number; longitud: number } =>
            d.latitud != null && d.longitud != null,
        )
        .map((d) => [d.id, { nombre: d.nombre, coords: [d.longitud, d.latitud] as LngLat }]),
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
        map.setFeatureState(
          { source: "origenes", id: o.id },
          { selected: o.id === selectedOrigenId },
        );
      });
    });
  }, [selectedOrigenId, origenes]);

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
      const features =
        (municipalBoundaries as { features?: Array<{ id?: string | number; properties?: Record<string, unknown> }> })
          .features ?? [];

      // El tono se calcula de forma relativa al máximo REAL de ayudas del
      // conjunto visible en el modo/día actual. Así, un municipio con más
      // ayudas siempre queda más oscuro y no dependemos de umbrales fijos
      // que pueden dejar casi todos los municipios en el mismo tono.
      const values = features.map((feature) => {
        const code = String(feature.id ?? feature.properties?.["municipalityCode"] ?? "");
        const stat = getTerritoryStatByCode(code);
        return territoryValueFor(stat, territoryMode, territoryDay);
      });
      const maxValue = Math.max(0, ...values);

      if (import.meta.env.DEV) {
        const sinMatch = features
          .map((f) => String(f.id ?? f.properties?.["municipalityCode"] ?? ""))
          .filter((code) => code && !getTerritoryStatByCode(code));
        if (sinMatch.length > 0) {
          console.warn("[MapCanvas] códigos DANE sin match en territoryData:", [...new Set(sinMatch)]);
        }
      }

      features.forEach((feature) => {
        const id = feature.id ?? feature.properties?.["municipalityCode"];
        if (id == null || String(id).trim() === "") return;
        const stat = getTerritoryStatByCode(String(id));
        const value = territoryValueFor(stat, territoryMode, territoryDay);
        const tone = territoryToneFromValue(value, maxValue);

        map.setFeatureState(
          { source: "municipios", id: String(id) },
          {
            territoryToneColor: territoryBlueForTone(tone),
            filteredOut: territoryZone !== "todas" && stat?.zone !== territoryZone,
            selected:
              selectedDestinoName != null &&
              stat != null &&
              normId(selectedDestinoName) === normId(stat.name), // este SÍ puede seguir por nombre — ver nota abajo
          },
        );
      });
    });
  }, [destinos, selectedDestinoId, territoryDay, territoryMode, territoryZone]);

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
        // Seek o timeline apagado: `flujos` ya representa el total (sin
        // filtrar por fecha, o saltado directo a una fecha) — la
        // intensidad de cada destino se fija de una, sin animar,
        // consistente con que el motor de arcos tampoco anima un salto.
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
        // Timeline avanzando paso a paso: solo procesa acá los arcos que
        // YA estaban asentados y cuyo peso subió (weight bump) — sube el
        // acumulado y dispara un pop, igual que un arco nuevo, pero sin
        // volver a crecer la línea (ver arcAnimationEngine.bumpWeight).
        // El caso de un arco NUEVO se maneja en animate(), vía
        // justSettled, para que el pop ocurra cuando la línea
        // visiblemente toca el destino, no antes de que se vea nada.
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

  useEffect(() => {
    whenReady(() => {
      const map = mapRef.current!;
      const pointOpacity = routesMode === "color" ? 0 : 1;
      const routeOpacity = routesMode === "color" ? 0 : 1;

      if (map.getLayer("origenes-glow")) map.setPaintProperty("origenes-glow", "circle-opacity", pointOpacity * 0.18);
      if (map.getLayer("origenes-point")) map.setPaintProperty("origenes-point", "circle-opacity", pointOpacity);
      if (map.getLayer("destinos-point")) map.setPaintProperty("destinos-point", "circle-opacity", pointOpacity);
      if (map.getLayer("arrivals-pulse")) map.setPaintProperty("arrivals-pulse", "circle-stroke-opacity", pointOpacity === 0 ? 0 : ["get", "opacity"]);
      if (map.getLayer("arcos-creciendo-line")) map.setPaintProperty("arcos-creciendo-line", "line-opacity", routeOpacity * 0.9);
      if (map.getLayer("arcos-asentados-line")) map.setPaintProperty("arcos-asentados-line", "line-opacity", routeOpacity);
    });
  }, [routesMode]);

  return (
    <div className="absolute inset-0 h-full w-full">
      <div ref={containerRef} data-map-root="" className="absolute inset-0 h-full w-full" aria-label="..." />
    </div>
  );
}

function colorForKey(key: string): string {
  const origenId = key.split("::")[0] ?? "";
  const norm = normId(origenId);
  return ORIGEN_COLOR_BY_NORM_ID[norm] ?? ORIGEN_DIM_COLOR_BY_NORM_ID[norm] ?? "#e8ecf3";
}