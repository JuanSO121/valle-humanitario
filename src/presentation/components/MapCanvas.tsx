import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre GL JS v6 is ESM-only and loads its web worker from a separate
// file at runtime. Bundlers can't rewrite that URL on their own, so it must
// be pointed at the bundled, hashed asset explicitly — otherwise the worker
// request 404s in production (it works in `vite dev` only because dev serves
// node_modules unbundled). `?worker&url` (not plain `?url`) is required：the
// worker file imports a sibling `maplibre-gl-shared.mjs`, and only
// `?worker&url` routes it through Vite's worker pipeline to emit a
// self-contained chunk with that sibling included.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
maplibregl.setWorkerUrl(maplibreWorkerUrl);
type GeoJSON_Point = { type: "Point"; coordinates: number[] };

import type { DiagnosedSiteView, MunicipalitySummary } from "@/domain/entities";
import { normId } from "@/lib/id";
import { CRITICALITY_HEX, CLUSTER_COLOR, CLUSTER_STROKE } from "./criticality";
// Bundled at build time by Vite — no runtime HTTP route, so the boundaries load
// identically on any host (Cloudflare, Vercel, Netlify) and during SSR.
import municipalBoundariesRaw from "@/data/valle-municipios.json";

const OVERVIEW_CENTER: [number, number] = [-76.35, 3.95];
const OVERVIEW_ZOOM = 7.1;
const MUNICIPALITY_ZOOM = 9.8;

// El GeoJSON de límites y el dataset de sedes (Excel/ETL) no siempre
// traen `municipalityCode` en el mismo formato exacto (ceros a la
// izquierda, string vs number). Se normaliza UNA sola vez acá, a la hora
// de importar el archivo, en vez de intentar normalizar dentro de una
// expresión de estilo de MapLibre (que no puede correr JS arbitrario por
// feature). A partir de acá, todo el resto del componente puede asumir
// que `municipalityCode` ya viene en el mismo formato que
// `summary.municipality.id`, siempre que ese id también pase por normId().
//
// También se le asigna acá el `id` de feature a nivel raíz (no dentro de
// `properties`): MapLibre solo soporta feature-state (usado para el hover)
// sobre features con `id`, y el GeoJSON de límites no traía ninguno.
function normalizeBoundaries(
  geojson: unknown,
): maplibregl.GeoJSONSourceSpecification["data"] {
  const collection = geojson as { features?: Array<{ properties?: Record<string, unknown> }> };
  if (!collection?.features) return geojson as maplibregl.GeoJSONSourceSpecification["data"];
  return {
    ...(collection as object),
    features: collection.features.map((f) => {
      const code = normId((f.properties as Record<string, unknown> | undefined)?.["municipalityCode"]);
      return {
        ...f,
        id: code,
        properties: {
          ...f.properties,
          municipalityCode: code,
        },
      };
    }),
  } as unknown as maplibregl.GeoJSONSourceSpecification["data"];
}

const municipalBoundaries = normalizeBoundaries(municipalBoundariesRaw);

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
    { id: "bg", type: "background", paint: { "background-color": "#eef1f5" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: { "raster-opacity": 0.65, "raster-saturation": -0.3, "raster-contrast": 0 },
    },
  ],
};

interface Props {
  sites: DiagnosedSiteView[];
  municipalities: MunicipalitySummary[];
  showHeatmap: boolean;
  selectedSiteId: string | null;
  focusMunicipalityId: string | null;
  onSelectSite: (id: string) => void;
  onSelectMunicipality: (id: string) => void;
  onReset: () => void;
}

export function MapCanvas({
  sites,
  municipalities,
  showHeatmap,
  selectedSiteId,
  focusMunicipalityId,
  onSelectSite,
  onSelectMunicipality,
  onReset,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<Array<() => void>>([]);
  const whenReady = (fn: () => void) => {
    if (readyRef.current) fn();
    else pendingRef.current.push(fn);
  };
  const handlersRef = useRef({ onSelectSite, onSelectMunicipality, onReset });
  handlersRef.current = { onSelectSite, onSelectMunicipality, onReset };

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

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    requestAnimationFrame(() => map.resize());
    setTimeout(() => map.resize(), 400);
    resizeObserver.observe(containerRef.current);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const sitePopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
    const clusterPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 14, maxWidth: "220px" });

    map.on("load", async () => {
      // --- Municipal boundaries (optional layer) -------------------------
      // Isolated in its own try/catch so a style/layer failure here can
      // never abort the "sedes" source/layers created below.
      try {
        map.addSource("municipios", {
          type: "geojson",
          data: municipalBoundaries,
        });

        map.addLayer({
          id: "municipios-fill",
          type: "fill",
          source: "municipios",
          paint: { "fill-color": "#2f6fed", "fill-opacity": 0.08 },
        });
        map.addLayer({
          id: "municipios-line",
          type: "line",
          source: "municipios",
          paint: { "line-color": "#2f6fed", "line-width": 0.9, "line-opacity": 0.55 },
        });
        map.addLayer({
          id: "municipios-label",
          type: "symbol",
          source: "municipios",
          minzoom: 7.6,
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 11,
            "text-transform": "uppercase",
            "text-letter-spacing": 0.05,
          },
          paint: { "text-color": "#4a5568", "text-halo-color": "#ffffff", "text-halo-width": 1.4 },
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "No se pudieron cargar los límites municipales (valle-municipios.json). " +
            "El mapa seguirá mostrando las sedes sin el choropleth/etiquetas de municipio.",
          err,
        );
      }

      map.addSource("sedes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 46,
        clusterMaxZoom: 11,
        clusterProperties: {
          rojo: ["+", ["case", ["==", ["get", "criticality"], "ROJO"], 1, 0]],
          amarillo: ["+", ["case", ["==", ["get", "criticality"], "AMARILLO"], 1, 0]],
          verde: ["+", ["case", ["==", ["get", "criticality"], "VERDE"], 1, 0]],
        },
      });

      map.addSource("sedes-heat-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "sedes-heat",
        type: "heatmap",
        source: "sedes-heat-source",
        layout: { visibility: "none" },
        paint: {
          "heatmap-weight": ["match", ["get", "criticality"], "ROJO", 1, "AMARILLO", 0.7, "VERDE", 0.38, 0.2],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 6, 1.25, 11, 2.2],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 6, 24, 11, 48],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.75, 12, 0.35],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)", 0.18, "#3fbf87", 0.48, "#e6b23c", 0.72, "#ef7b45", 1, "#c2352a",
          ],
        },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "sedes",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": CLUSTER_COLOR,
          "circle-opacity": 0.92,
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 15, 28],
          "circle-stroke-width": 2,
          "circle-stroke-color": CLUSTER_STROKE,
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "sedes",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12, "text-font": ["Noto Sans Bold"] },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "sedes-point",
        type: "circle",
        source: "sedes",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match", ["get", "criticality"],
            "ROJO", CRITICALITY_HEX.ROJO, "AMARILLO", CRITICALITY_HEX.AMARILLO, "VERDE", CRITICALITY_HEX.VERDE,
            CRITICALITY_HEX.SIN_DETALLE,
          ],
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 11, 7],
          "circle-stroke-width": ["case", ["==", ["get", "review"], true], 2.5, 1.4],
          "circle-stroke-color": ["case", ["==", ["get", "review"], true], "#12161c", "#ffffff"],
          "circle-stroke-opacity": 0.95,
          "circle-opacity": 1,
        },
      });

      map.addLayer({
        id: "selected-site-halo",
        type: "circle",
        source: "sedes",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-color": "#2f6fed",
          "circle-radius": 15,
          "circle-opacity": 0.16,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#2f6fed",
          "circle-stroke-opacity": 0.9,
        },
      });

      // Hover de municipio: se trackea con feature-state (no con React
      // state) porque feature-state es lo que MapLibre está optimizado
      // para actualizar en cada frame de mousemove sin recalcular toda la
      // expresión de estilo cada vez — solo repinta esa feature. La capa
      // de relleno referencia ["feature-state","hovered"] en su
      // "fill-opacity" (ver el efecto de `municipalities`/`focusMunicipalityId`
      // más abajo), así que no hace falta llamar setPaintProperty acá.
      let hoveredMunicipalityId: string | null = null;
      if (map.getLayer("municipios-fill")) {
        map.on("mousemove", "municipios-fill", (e: MapLayerMouseEvent) => {
          map.getCanvas().style.cursor = "pointer";
          const feature = e.features?.[0];
          const nextId = feature?.id != null ? String(feature.id) : null;
          if (nextId === hoveredMunicipalityId) return;
          if (hoveredMunicipalityId != null) {
            map.setFeatureState({ source: "municipios", id: hoveredMunicipalityId }, { hovered: false });
          }
          if (nextId != null) {
            map.setFeatureState({ source: "municipios", id: nextId }, { hovered: true });
          }
          hoveredMunicipalityId = nextId;
        });
        map.on("mouseleave", "municipios-fill", () => {
          map.getCanvas().style.cursor = "";
          if (hoveredMunicipalityId != null) {
            map.setFeatureState({ source: "municipios", id: hoveredMunicipalityId }, { hovered: false });
            hoveredMunicipalityId = null;
          }
        });
      }

      const openClusterPopup = (f: maplibregl.MapGeoJSONFeature) => {
        const props = f.properties ?? {};
        const coords = (f.geometry as GeoJSON_Point).coordinates as [number, number];
        const count = props["point_count"] ?? 0;
        const rojo = props["rojo"] ?? 0;
        const amarillo = props["amarillo"] ?? 0;
        const verde = props["verde"] ?? 0;

        clusterPopup
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:#12161c;min-width:168px">
               <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                 <span style="display:inline-block;width:9px;height:9px;border-radius:999px;background:${CLUSTER_COLOR}"></span>
                 <strong>${count} sedes agrupadas</strong>
               </div>
               <p style="margin:0 0 8px 0;color:#5b6472;line-height:1.4">
                 Este punto no indica un estado de riesgo: agrupa varias sedes cercanas.
               </p>
               <div style="display:flex;gap:10px;font-size:11px;margin-bottom:10px">
                 <span>🔴 ${rojo}</span><span>🟡 ${amarillo}</span><span>🟢 ${verde}</span>
               </div>
               <button id="expand-cluster-btn" type="button"
                 style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid #dfe3e8;
                        background:#f6f7f9;color:#12161c;font-size:12px;cursor:pointer">
                 Ver sedes de este grupo
               </button>
             </div>`,
          )
          .addTo(map);

        document.getElementById("expand-cluster-btn")?.addEventListener(
          "click",
          async () => {
            const source = map.getSource("sedes") as maplibregl.GeoJSONSource;
            const zoom = await source.getClusterExpansionZoom(props["cluster_id"] as number);
            map.easeTo({ center: coords, zoom });
            clusterPopup.remove();
          },
          { once: true },
        );
      };

      // Un único handler de clic con prioridad explícita, en vez de varios
      // "map.on('click', 'layerId', ...)" delegados compitiendo entre sí.
      // FIX del bug real: MapLibre/Mapbox dispara TODOS los listeners de
      // capa cuyo feature intersecta el punto de clic, sin importar cuál
      // está visualmente encima — y `event.preventDefault()` NO detiene esa
      // propagación entre capas (solo bloquea gestos por defecto del mapa
      // como drag/box-zoom). Como "municipios-fill" es un polígono enorme,
      // casi cualquier clic sobre una sede también caía dentro de él, y su
      // handler llamaba a onSelectMunicipality() pisando el onSelectSite()
      // que se acababa de disparar. Por eso las sedes fuera del polígono
      // del Valle sí funcionaban: nunca intersectaban municipios-fill.
      // Consultando las capas manualmente y devolviendo en el primer match
      // (sede > cluster > municipio > nada) queda sin ambigüedad.
      map.on("click", (e: MapLayerMouseEvent) => {
        const siteHits = map.queryRenderedFeatures(e.point, { layers: ["sedes-point"] });
        if (siteHits.length > 0) {
          const id = siteHits[0]?.properties?.["id"];
          if (id != null) handlersRef.current.onSelectSite(String(id));
          return;
        }

        const clusterHits = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        if (clusterHits.length > 0 && clusterHits[0]) {
          openClusterPopup(clusterHits[0]);
          return;
        }

        if (map.getLayer("municipios-fill")) {
          const municipalityHits = map.queryRenderedFeatures(e.point, { layers: ["municipios-fill"] });
          if (municipalityHits.length > 0) {
            // municipalBoundaries ya viene normalizado (ver
            // normalizeBoundaries arriba), así que esto ya está en el
            // mismo formato que summary.municipality.id normalizado.
            // Igual pasamos por normId() acá por si en el futuro se
            // cambia la fuente de datos y deja de venir pre-normalizada.
            const code = municipalityHits[0]?.properties?.["municipalityCode"];
            if (code != null) handlersRef.current.onSelectMunicipality(normId(code));
            return;
          }
        }

        handlersRef.current.onReset();
      });

      map.on("mouseenter", "sedes-point", (e: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        sitePopup
          .setLngLat((f.geometry as GeoJSON_Point).coordinates as [number, number])
          .setHTML(
            `<div style="font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:#12161c">
               <strong>${f.properties?.["name"] ?? ""}</strong><br/>
               <span style="color:#5b6472">${f.properties?.["institution"] ?? ""}</span>
             </div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", "sedes-point", () => {
        map.getCanvas().style.cursor = "";
        sitePopup.remove();
      });
      map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));

      readyRef.current = true;
      pendingRef.current.forEach((fn) => fn());
      pendingRef.current = [];
    });

    return () => {
      resizeObserver.disconnect();
      pendingRef.current = [];
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource("sedes") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      const collection = {
        type: "FeatureCollection",
        features: sites
          .filter((s) => s.position)
          .map((s) => ({
            type: "Feature" as const,
            id: Number(s.diagnostic.rank),
            properties: {
              id: s.diagnostic.id,
              name: s.site?.name ?? s.diagnostic.sourceSite ?? "",
              institution: s.institution?.name ?? s.diagnostic.sourceInstitution ?? "",
              criticality: s.diagnostic.criticality,
              review: s.diagnostic.resolution.status !== "RESOLVED",
              municipalityId: s.municipality?.id ? normId(s.municipality.id) : null,
            },
            geometry: {
              type: "Point" as const,
              coordinates: [s.position?.longitude ?? 0, s.position?.latitude ?? 0],
            },
          })),
      } as const;
      source.setData(collection);
      const heatSource = map.getSource("sedes-heat-source") as maplibregl.GeoJSONSource | undefined;
      heatSource?.setData(collection);
    };
    whenReady(apply);
  }, [sites]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (!map.getLayer("municipios-fill")) return;
      if (!municipalities.length) {
        map.setPaintProperty("municipios-fill", "fill-color", "#2f6fed");
      } else {
        // Comparamos siempre contra el mismo formato normalizado que
        // trae municipalBoundaries (ver normalizeBoundaries arriba) —
        // esto es lo que estaba roto antes: acá se empujaban los ids
        // "crudos" del dataset, que no necesariamente coincidían con el
        // `municipalityCode` del GeoJSON (ceros a la izquierda, string
        // vs number), así que ningún municipio hacía match y todos
        // caían en el color de respaldo (#2f6fed) al final del "match".
        const matcher: (string | string[])[] = ["match", ["get", "municipalityCode"]];
        for (const summary of municipalities) {
          matcher.push(normId(summary.municipality.id), CRITICALITY_HEX[summary.criticality]);
        }
        matcher.push("#2f6fed");
        map.setPaintProperty("municipios-fill", "fill-color", matcher as unknown as maplibregl.ExpressionSpecification);
      }
    };
    whenReady(apply);
  }, [municipalities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (!map.getLayer("sedes-point")) return;

      if (!focusMunicipalityId) {
        map.setPaintProperty("sedes-point", "circle-opacity", 1);
        if (map.getLayer("municipios-fill")) {
          map.setPaintProperty("municipios-fill", "fill-opacity", municipalities.length ? 0.22 : 0.08);
        }
        if (map.getLayer("municipios-line")) {
          map.setPaintProperty("municipios-line", "line-color", "#2f6fed");
          map.setPaintProperty("municipios-line", "line-width", 0.9);
          map.setPaintProperty("municipios-line", "line-opacity", 0.55);
        }
        map.easeTo({ center: OVERVIEW_CENTER, zoom: OVERVIEW_ZOOM, duration: 700 });
        return;
      }

      const focusId = normId(focusMunicipalityId);

      map.setPaintProperty("sedes-point", "circle-opacity", [
        "case",
        ["==", ["get", "municipalityId"], focusId],
        1,
        0.22,
      ]);
      if (map.getLayer("municipios-fill")) {
        map.setPaintProperty("municipios-fill", "fill-opacity", [
          "case",
          ["==", ["get", "municipalityCode"], focusId],
          0.32,
          0.05,
        ]);
      }
      if (map.getLayer("municipios-line")) {
        // Antes solo cambiaba la opacidad de la línea, que sobre un
        // relleno ya coloreado por criticidad puede pasar casi
        // desapercibido. Ahora también engrosa el borde y lo pone en un
        // color de "selección" fijo (no depende de la criticidad), para
        // que el clic tenga una respuesta visual inmediata y clara antes
        // de que el panel termine de abrir.
        map.setPaintProperty("municipios-line", "line-color", [
          "case",
          ["==", ["get", "municipalityCode"], focusId],
          "#12161c",
          "#2f6fed",
        ]);
        map.setPaintProperty("municipios-line", "line-width", [
          "case",
          ["==", ["get", "municipalityCode"], focusId],
          2.5,
          0.9,
        ]);
        map.setPaintProperty("municipios-line", "line-opacity", [
          "case",
          ["==", ["get", "municipalityCode"], focusId],
          0.9,
          0.2,
        ]);
      }

      const summary = municipalities.find((m) => normId(m.municipality.id) === focusId);
      const lat = summary?.municipality.latitude;
      const lng = summary?.municipality.longitude;
      if (lat != null && lng != null) {
        map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), MUNICIPALITY_ZOOM), duration: 700 });
      }
    };
    whenReady(apply);
  }, [focusMunicipalityId, municipalities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (!map.getLayer("sedes-heat")) return;
      map.setLayoutProperty("sedes-heat", "visibility", showHeatmap ? "visible" : "none");
    };
    whenReady(apply);
  }, [showHeatmap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (map.getLayer("selected-site-halo")) {
        map.setFilter("selected-site-halo", ["==", ["get", "id"], selectedSiteId ?? ""]);
      }
      if (!selectedSiteId) return;
      const target = sites.find((s) => s.diagnostic.id === selectedSiteId);
      if (target?.position) {
        map.easeTo({
          center: [target.position.longitude, target.position.latitude],
          zoom: Math.max(map.getZoom(), 13),
          duration: 700,
        });
      }
    };
    whenReady(apply);
  }, [selectedSiteId, sites]);

  return (
    <div
      ref={containerRef}
      data-map-root=""
      className="absolute inset-0 h-full w-full"
      aria-label="Mapa de sedes diagnosticadas"
    />
  );
}