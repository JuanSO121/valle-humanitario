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

function normalizeBoundaries(geojson: unknown): maplibregl.GeoJSONSourceSpecification["data"] {
  const collection = geojson as { features?: Array<{ properties?: Record<string, unknown> }> };
  if (!collection?.features) return geojson as maplibregl.GeoJSONSourceSpecification["data"];
  return {
    ...(collection as object),
    features: collection.features.map((f) => {
      const code = normId((f.properties as Record<string, unknown> | undefined)?.["municipalityCode"]);
      return {
        ...f,
        id: code,
        properties: { ...f.properties, municipalityCode: code },
      };
    }),
  } as unknown as maplibregl.GeoJSONSourceSpecification["data"];
}

const municipalBoundaries = normalizeBoundaries(municipalBoundariesRaw);

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
    { id: "bg", type: "background", paint: { "background-color": "#0b0e14" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: { "raster-opacity": 0.42, "raster-saturation": -0.35, "raster-brightness-min": 0, "raster-brightness-max": 0.62 },
    },
  ],
};

interface Props {
  origenes: Origen[];
  destinos: DestinoResumenLista[];
  flujos: Flujo[];
  instantTransition: boolean;
  selectedDestinoId: string | null;
  selectedOrigenId: string | null;
  onSelectDestino: (id: string) => void;
  onSelectOrigen: (id: string) => void;
  onReset: () => void;
}

const flujoKey = (f: Flujo) => `${f.origenId}::${f.destino.id}`;

function popupHtml(label: string): string {
  return `<div style="font-family:'IBM Plex Sans',sans-serif;font-size:12px">
             <strong>${label}</strong>
           </div>`;
}

export function MapCanvas({
  origenes,
  destinos,
  flujos,
  instantTransition,
  selectedDestinoId,
  selectedOrigenId,
  onSelectDestino,
  onSelectOrigen,
  onReset,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<Array<() => void>>([]);
  const whenReady = (fn: () => void) => (readyRef.current ? fn() : pendingRef.current.push(fn));

  const engineRef = useRef(createArcAnimationEngine());
  const rafRef = useRef<number | null>(null);
  const coordsCacheRef = useRef<Map<string, LngLat[]>>(new Map());
  const handlersRef = useRef({ onSelectDestino, onSelectOrigen, onReset });
  handlersRef.current = { onSelectDestino, onSelectOrigen, onReset };

  const hoveredOrigenIdRef = useRef<string | null>(null);
  const hoveredDestinoIdRef = useRef<string | null>(null);

  // NUEVO: índice nombre-normalizado -> id de destino, para poder
  // resolver "clickearon el municipio X" a "seleccioná el destino que
  // corresponde a X" sin depender de un código de municipio que
  // `DestinoResumenLista` no trae hoy (solo id/nombre/lat/lon/tipo). Se
  // reconstruye cada vez que cambia `destinos`, junto con el efecto de
  // sincronización del source más abajo — vive en un ref (no en el
  // source de MapLibre) porque el click handler necesita leerlo de forma
  // síncrona, no vía queryRenderedFeatures.
  const destinoIdByNormNameRef = useRef<Map<string, string>>(new Map());

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
            "fill-color": "#2f6fed",
            "fill-opacity": ["case", ["boolean", ["feature-state", "hovered"], false], 0.2, 0.08],
            "fill-opacity-transition": { duration: 150, delay: 0 },
          },
        });
        map.addLayer({
          id: "municipios-line",
          type: "line",
          source: "municipios",
          paint: { "line-color": "#5b6b85", "line-width": 0.9, "line-opacity": 0.65 },
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
          paint: { "text-color": "#a3adc0", "text-halo-color": "#0b0e14", "text-halo-width": 1.2 },
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
            municipalityPopup.setLngLat(e.lngLat).setHTML(popupHtml(name)).addTo(map);
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
        // eslint-disable-next-line no-console
        console.error(
          "No se pudieron cargar los límites municipales (valle-municipios.json). " +
            "El mapa seguirá mostrando orígenes/destinos/arcos sin las divisiones.",
          err,
        );
      }

      map.addSource("origenes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      map.addLayer({
        id: "origenes-glow",
        type: "circle",
        source: "origenes",
        paint: { "circle-radius": 17, "circle-color": ["get", "color"], "circle-opacity": 0.18, "circle-blur": 1 },
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
            ["boolean", ["feature-state", "selected"], false], 13,
            ["boolean", ["feature-state", "hover"], false], 11.5,
            10,
          ],
          "circle-radius-transition": { duration: 180, delay: 0 },
          "circle-color": ["get", "color"],
          "circle-stroke-width": ["case", ["boolean", ["feature-state", "selected"], false], 3.5, 2.5],
          "circle-stroke-width-transition": { duration: 180, delay: 0 },
          "circle-stroke-color": "#0b0e14",
        },
      });

      map.addSource("destinos", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "destinos-point",
        type: "circle",
        source: "destinos",
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 8,
            ["boolean", ["feature-state", "hover"], false], 6.5,
            5,
          ],
          "circle-radius-transition": { duration: 180, delay: 0 },
          "circle-color": "#e8ecf3",
          "circle-stroke-width": 1.4,
          "circle-stroke-color": "#0b0e14",
        },
      });

      map.addSource("arcos-creciendo", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "arcos-creciendo-line",
        type: "line",
        source: "arcos-creciendo",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["get", "color"], "line-width": ["get", "width"], "line-opacity": 0.9 },
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
          "line-gradient": buildPulseGradient(0, "rgba(232,236,243,0.22)", "#e8ecf3", 0.06) as unknown as maplibregl.ExpressionSpecification,
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
        const municipioHits = map.queryRenderedFeatures(e.point, { layers: ["municipios-fill"] });
        if (municipioHits.length > 0) {
          const municipioName = municipioHits[0]?.properties?.["name"];
          if (municipioName != null) {
            const destinoId = destinoIdByNormNameRef.current.get(normId(String(municipioName)));
            if (destinoId != null) {
              handlersRef.current.onSelectDestino(destinoId);
              return;
            }
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
            map.setPaintProperty("origenes-pulse", "circle-radius", 9 + eased * ORIGIN_PULSE_MAX_RADIUS_GROWTH);
            map.setPaintProperty("origenes-pulse", "circle-opacity", (1 - originT) ** 2 * 0.55);
          }

          const frame = engineRef.current.tick(now);

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
          (map.getSource("arcos-creciendo") as maplibregl.GeoJSONSource | undefined)?.setData(growingCollection);

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
          (map.getSource("arcos-asentados") as maplibregl.GeoJSONSource | undefined)?.setData(settledCollection);

          if (map.getLayer("arcos-asentados-line")) {
            map.setPaintProperty(
              "arcos-asentados-line",
              "line-gradient",
              buildPulseGradient(frame.pulseLoopT, "rgba(232,236,243,0.22)", "#e8ecf3", 0.06) as unknown as maplibregl.ExpressionSpecification,
            );
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Error renderizando un frame de animación de arcos — se salta este frame.", err);
        } finally {
          rafRef.current = document.visibilityState !== "hidden" ? requestAnimationFrame(animate) : null;
        }
      };
      rafRef.current = requestAnimationFrame(animate);

      readyRef.current = true;
      pendingRef.current.forEach((fn) => fn());
      pendingRef.current = [];
    });

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      destinoPopup.remove();
      origenPopup.remove();
      municipalityPopup.remove();
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
            properties: { id: o.id, nombre: o.nombre, color: ORIGEN_COLOR_BY_NORM_ID[normId(o.id)] ?? "#e8ecf3" },
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
    });

    // Índice de nombre normalizado -> id, para el click sobre el ÁREA del
    // municipio (ver map.on("click", ...) más arriba). Se reconstruye acá
    // junto con el setData de arriba para no tener un tercer efecto que
    // dependa de `destinos` por separado.
    destinoIdByNormNameRef.current = new Map(destinos.map((d) => [normId(d.nombre), d.id]));
  }, [destinos]);

  useEffect(() => {
    whenReady(() => {
      const map = mapRef.current!;
      destinos.forEach((d) => {
        map.setFeatureState({ source: "destinos", id: d.id }, { selected: d.id === selectedDestinoId });
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

  useEffect(() => {
    whenReady(() => {
      const engine = engineRef.current;
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
              buildArcCoordinates([origenMatch.longitud, origenMatch.latitud], [f.destino.longitud, f.destino.latitud]),
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
    });
  }, [flujos, instantTransition, origenes]);

  return (
    <div
      ref={containerRef}
      data-map-root=""
      className="absolute inset-0 h-full w-full"
      aria-label="Mapa de ayudas humanitarias — Valle del Cauca"
    />
  );
}

function colorForKey(key: string): string {
  const origenId = key.split("::")[0] ?? "";
  const norm = normId(origenId);
  return ORIGEN_COLOR_BY_NORM_ID[norm] ?? ORIGEN_DIM_COLOR_BY_NORM_ID[norm] ?? "#e8ecf3";
}