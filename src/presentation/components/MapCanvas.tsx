import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
type GeoJSON_Point = { type: "Point"; coordinates: number[] };

import type { DiagnosedSiteView, MunicipalitySummary } from "@/domain/entities";
import { CRITICALITY_HEX, CLUSTER_COLOR, CLUSTER_STROKE } from "./criticality";
// Bundled at build time by Vite — no runtime HTTP route, so the boundaries load
// identically on any host (Cloudflare, Vercel, Netlify) and during SSR.
import municipalBoundaries from "@/data/valle-municipios.json";

const OVERVIEW_CENTER: [number, number] = [-76.35, 3.95];
const OVERVIEW_ZOOM = 7.1;
const MUNICIPALITY_ZOOM = 9.8;

/**
 * Presentation-only map — but now also the app's primary controller: clicks
 * here drive navigation state in DashboardPage rather than the other way
 * around ("el mapa controla el estado de la interfaz").
 */
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
  /** Currently focused municipality (MUNICIPALITY or SITE level). Null = ALL. */
  focusMunicipalityId: string | null;
  onSelectSite: (id: string) => void;
  onSelectMunicipality: (id: string) => void;
  /** Fired when the user clicks empty map area — parent decides this means "back to ALL". */
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
    const resizeObserver = new ResizeObserver(() => map.resize());
    requestAnimationFrame(() => map.resize());
    setTimeout(() => map.resize(), 400);
    resizeObserver.observe(containerRef.current);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const sitePopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
    const clusterPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 14, maxWidth: "220px" });

    map.on("load", async () => {
      // --- Municipal boundaries (optional layer) -------------------------
      // Still isolated in its own try/catch so a style/layer failure here can
      // never abort the "sedes" source/layers created below.
      try {
        map.addSource("municipios", {
          type: "geojson",
          data: municipalBoundaries as unknown as GeoJSON.FeatureCollection,
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

      // --- Sedes (points/clusters/heatmap) — must run regardless of ------
      // whether the boundaries above loaded successfully.
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

      map.on("click", "sedes-point", (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (f) handlersRef.current.onSelectSite(String(f.properties?.["id"]));
      });

      map.on("click", "clusters", (e: MapLayerMouseEvent) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        if (!f) return;
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
      });

      // Only wired when the boundaries layer actually exists — clicking
      // municipal polygons is meaningless if they never loaded.
      if (map.getLayer("municipios-fill")) {
        map.on("click", "municipios-fill", (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (f) handlersRef.current.onSelectMunicipality(String(f.properties?.["municipalityCode"]));
        });
        map.on("mouseenter", "municipios-fill", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "municipios-fill", () => (map.getCanvas().style.cursor = ""));
      }

      // Background click -> ALL. Only fires when the click hit none of the
      // interactive layers (their own handlers above already ran otherwise).
      map.on("click", (e: MapLayerMouseEvent) => {
        const layers = ["sedes-point", "clusters", ...(map.getLayer("municipios-fill") ? ["municipios-fill"] : [])];
        const hits = map.queryRenderedFeatures(e.point, { layers });
        if (hits.length === 0) handlersRef.current.onReset();
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

  // sites -> GeoJSON (municipalityId included so we can dim non-focused sites)
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
              municipalityId: s.municipality?.id ?? null,
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

  // municipal choropleth by criticality
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (!map.getLayer("municipios-fill")) return;
      if (!municipalities.length) {
        map.setPaintProperty("municipios-fill", "fill-color", "#2f6fed");
      } else {
        const matcher: (string | string[])[] = ["match", ["get", "municipalityCode"]];
        for (const summary of municipalities) matcher.push(summary.municipality.id, CRITICALITY_HEX[summary.criticality]);
        matcher.push("#2f6fed");
        map.setPaintProperty("municipios-fill", "fill-color", matcher as unknown as maplibregl.ExpressionSpecification);
      }
    };
    whenReady(apply);
  }, [municipalities]);

  // Focus emphasis: dim everything not belonging to the focused municipality,
  // and re-center/zoom the map. This is what makes "las sedes relacionadas
  // adquieren protagonismo, los demás elementos reducen su peso" real.
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
          map.setPaintProperty("municipios-line", "line-opacity", 0.55);
        }
        map.easeTo({ center: OVERVIEW_CENTER, zoom: OVERVIEW_ZOOM, duration: 700 });
        return;
      }

      map.setPaintProperty("sedes-point", "circle-opacity", [
        "case",
        ["==", ["get", "municipalityId"], focusMunicipalityId],
        1,
        0.22,
      ]);
      if (map.getLayer("municipios-fill")) {
        map.setPaintProperty("municipios-fill", "fill-opacity", [
          "case",
          ["==", ["get", "municipalityCode"], focusMunicipalityId],
          0.32,
          0.05,
        ]);
      }
      if (map.getLayer("municipios-line")) {
        map.setPaintProperty("municipios-line", "line-opacity", [
          "case",
          ["==", ["get", "municipalityCode"], focusMunicipalityId],
          0.9,
          0.2,
        ]);
      }

      const summary = municipalities.find((m) => m.municipality.id === focusMunicipalityId);
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

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" aria-label="Mapa de sedes diagnosticadas" />;
}