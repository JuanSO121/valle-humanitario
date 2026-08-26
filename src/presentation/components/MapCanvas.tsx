import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
maplibregl.setWorkerUrl(maplibreWorkerUrl);

import type { Origen, Flujo, DestinoResumenLista } from "@/domain/entities";
import { buildArcCoordinates, buildPulseGradient, type LngLat } from "./arcGeometry";
import { createArcAnimationEngine } from "./arcAnimationEngine";
import { normId } from "@/lib/id";
import municipalBoundariesRaw from "@/data/valle-municipios.json";

const OVERVIEW_CENTER: LngLat = [-76.35, 3.95];
const OVERVIEW_ZOOM = 7.1;

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

// Los mapas de color de arriba están indexados por el id "canónico" tal
// como se escribe en este archivo ("ORI-CALI", "ORI-CARTAGO"). Se
// normalizan con la misma función (normId) que ya usa
// normalizeBoundaries() para municipalityCode, para blindar contra
// diferencias de formato entre route=origenes y route=flujos aunque hoy
// coincidan exactamente (ver conversación: la causa real de "no se ven
// arcos" terminó siendo otra — route=flujos llegando vacío por un
// contrato desactualizado en el backend — pero esta normalización no
// sobra como defensa a futuro).
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
      paint: { "raster-opacity": 0.28, "raster-saturation": -0.6, "raster-brightness-min": 0, "raster-brightness-max": 0.5 },
    },
  ],
};

interface Props {
  origenes: Origen[];
  destinos: DestinoResumenLista[];
  /**
   * Flujos a DIBUJAR — ya filtrados por el padre (DashboardPage) según la
   * selección activa (origen o destino). Este componente NO decide qué
   * mostrar, solo anima lo que recibe: si el padre manda `[]` (nada
   * seleccionado), no hay ningún arco en el mapa, a propósito — ver
   * conversación: los arcos ya no se animan solos al entrar, solo al
   * seleccionar un origen o un destino.
   */
  flujos: Flujo[];
  instantTransition: boolean;
  selectedDestinoId: string | null;
  /** Punto de ORIGEN resaltado en el mapa — independiente de selectedDestinoId (ver viewState.ts). */
  selectedOrigenId: string | null;
  onSelectDestino: (id: string) => void;
  onSelectOrigen: (id: string) => void;
  onReset: () => void;
}

const flujoKey = (f: Flujo) => `${f.origenId}::${f.destino.id}`;

// FIX: los tres popups (municipio/origen/destino) traían `color:#12161c`
// hardcodeado en el HTML inyectado — pensado para cuando el popup vivía
// sobre un fondo blanco (tema institucional claro). Con el tema
// `.theme-ayudas` (fondo/superficies oscuras), `.maplibregl-popup-content`
// pasa a tener `background: var(--surface)` OSCURO, pero ese inline style
// en el hijo ignora por completo el `color: var(--foreground) !important`
// que ya está declarado en el contenedor — un estilo inline en un
// elemento hijo siempre gana sobre lo heredado del padre, sea o no
// `!important` la regla del padre. Resultado: texto casi negro sobre un
// fondo casi negro, invisible.
//
// Se saca el `color` de acá y se deja que el texto herede del contenedor
// (`.maplibregl-popup-content { color: var(--foreground) !important }`,
// ya definido en styles.css para ambos temas). Así el popup se ve bien
// tanto en el tema institucional claro como en `.theme-ayudas` oscuro,
// sin duplicar la decisión de color en dos lugares.
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
            "fill-opacity": ["case", ["boolean", ["feature-state", "hovered"], false], 0.14, 0.05],
          },
        });
        map.addLayer({
          id: "municipios-line",
          type: "line",
          source: "municipios",
          paint: { "line-color": "#3d4a5c", "line-width": 0.8, "line-opacity": 0.5 },
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
          paint: { "text-color": "#8b95a5", "text-halo-color": "#0b0e14", "text-halo-width": 1.2 },
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
        id: "origenes-point",
        type: "circle",
        source: "origenes",
        paint: {
          // Resaltado del origen seleccionado — mismo patrón que ya usa
          // destinos-point con su feature-state "selected".
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 11, 8],
          "circle-color": ["get", "color"],
          "circle-stroke-width": ["case", ["boolean", ["feature-state", "selected"], false], 3, 2],
          "circle-stroke-color": "#0b0e14",
        },
      });

      map.addSource("destinos", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "destinos-point",
        type: "circle",
        source: "destinos",
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 8, 5],
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
          "line-gradient": buildPulseGradient(0, "rgba(232,236,243,0.22)", "#e8ecf3", 0.06) as unknown as maplibregl.ExpressionSpecification,
        },
      });

      // --- click: origen > destino > reset ------------------------------
      // Se prueban las capas de punto en este orden porque son las más
      // "pequeñas" en área de hit-test — si algún día se agrega un layer
      // que las tape, hay que revisar el orden acá.
      map.on("click", (e: MapLayerMouseEvent) => {
        const origenHits = map.queryRenderedFeatures(e.point, { layers: ["origenes-point"] });
        if (origenHits.length > 0) {
          const id = origenHits[0]?.properties?.["id"];
          if (id != null) handlersRef.current.onSelectOrigen(String(id));
          return;
        }
        const destinoHits = map.queryRenderedFeatures(e.point, { layers: ["destinos-point"] });
        if (destinoHits.length > 0) {
          const id = destinoHits[0]?.properties?.["id"];
          if (id != null) handlersRef.current.onSelectDestino(String(id));
          return;
        }
        handlersRef.current.onReset();
      });

      map.on("mouseenter", "origenes-point", (e: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        origenPopup
          .setLngLat((f.geometry as { coordinates: LngLat }).coordinates)
          .setHTML(popupHtml(String(f.properties?.["nombre"] ?? "")))
          .addTo(map);
      });
      map.on("mouseleave", "origenes-point", () => {
        map.getCanvas().style.cursor = "";
        origenPopup.remove();
      });

      map.on("mouseenter", "destinos-point", (e: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        destinoPopup
          .setLngLat((f.geometry as { coordinates: LngLat }).coordinates)
          .setHTML(popupHtml(String(f.properties?.["nombre"] ?? "")))
          .addTo(map);
      });
      map.on("mouseleave", "destinos-point", () => {
        map.getCanvas().style.cursor = "";
        destinoPopup.remove();
      });

      // --- driver de animación ---
      // FIX: todo el cuerpo va en try/catch. Antes, cualquier excepción acá
      // adentro (por ejemplo un `setData` con geometría inválida — ver el
      // fix en el efecto de `flujos` más abajo, que es la causa raíz real)
      // cortaba la función a mitad de camino y la línea final que
      // reprograma `requestAnimationFrame` nunca se ejecutaba: el loop
      // completo quedaba muerto para siempre (todos los arcos, no solo
      // el que causó el error), sin ningún indicio en la UI. Con el
      // try/catch, en el peor caso se pierde UN frame y el loop sigue.
      const animate = (now: number) => {
        try {
          const frame = engineRef.current.tick(now);

          const growingCollection = {
            type: "FeatureCollection" as const,
            features: frame.growing.flatMap((arc) => {
              const full = coordsCacheRef.current.get(arc.key);
              // Guarda extra: si por lo que sea no hay geometría cacheada
              // para esta clave, se descarta ESE arco en vez de emitir un
              // LineString vacío (que MapLibre rechaza y tumba el loop).
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
            // `id` a nivel de Feature (no solo en properties) es lo que
            // permite usar setFeatureState más abajo para el resaltado —
            // mismo patrón que ya usa el source "destinos".
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

  // --- flujos: sincroniza el motor cada vez que cambia el dataset ---------
  // Nota: `flujos` ya viene FILTRADO por selección desde DashboardPage —
  // sin origen/destino seleccionado, el padre manda `[]` y acá no hay
  // nada que registrar (por eso ya no se ve ningún arco "solo al entrar").
  useEffect(() => {
    whenReady(() => {
      const engine = engineRef.current;
      const weights: Record<string, number> = {};

      // Índice de orígenes por id normalizado — ver nota junto a
      // ORIGEN_COLOR_BY_NORM_ID más arriba.
      const origenesPorId = new Map(origenes.map((o) => [normId(o.id), o]));

      // FIX previo (ver arcAnimationEngine.ts / MapCanvas.tsx original):
      // antes, `keys` salía de `flujos.map(flujoKey)` sin condición, así
      // que un flujo cuyo origen o destino no trae lat/lon (dato
      // incompleto — pasa en producción) quedaba igual registrado en el
      // motor de animación aunque nunca lograra una entrada en
      // `coordsCacheRef`. Ese arco llegaba a `animate()` con
      // `coordinates: []`, `source.setData()` tira una excepción de
      // MapLibre por geometría inválida, y como `animate()` no tenía
      // try/catch, esa excepción abortaba la función ANTES de reprogramar
      // el siguiente `requestAnimationFrame` — bastaba un solo flujo mal
      // geolocalizado para congelar TODA la animación (todos los arcos)
      // en el primer frame en que apareciera. Ahora solo se registran en
      // el motor los flujos que sí tienen (o logran calcular acá) una
      // geometría válida; el resto se ignora para efectos de animación
      // sin tumbar nada más.
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