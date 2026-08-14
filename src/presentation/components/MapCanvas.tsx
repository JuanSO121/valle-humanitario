import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl/dist/maplibre-gl-csp";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker.js?url";
import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// CSP build + explicit worker URL: keeps the worker resolvable through Vite.
maplibregl.setWorkerUrl(maplibreWorkerUrl);
type GeoJSON_Point = { type: "Point"; coordinates: number[] };

import type { DiagnosedSiteView, MunicipalitySummary } from "@/domain/entities";
import { CRITICALITY_HEX } from "./criticality";

/**
 * Presentation-only map. The domain never learns about MapLibre or tiles;
 * swapping the tile/geocoding provider only touches this file.
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
    { id: "bg", type: "background", paint: { "background-color": "#12161c" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: { "raster-opacity": 0.42, "raster-saturation": -0.85, "raster-contrast": 0.1 },
    },
  ],
};

interface Props {
  sites: DiagnosedSiteView[];
  municipalities: MunicipalitySummary[];
  showHeatmap: boolean;
  selectedSiteId: string | null;
  onSelectSite: (id: string | null) => void;
  onSelectMunicipality: (id: string) => void;
}

export function MapCanvas({
  sites,
  municipalities,
  showHeatmap,
  selectedSiteId,
  onSelectSite,
  onSelectMunicipality,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<Array<() => void>>([]);
  const whenReady = (fn: () => void) => {
    if (readyRef.current) fn();
    else pendingRef.current.push(fn);
  };
  const handlersRef = useRef({ onSelectSite, onSelectMunicipality });
  handlersRef.current = { onSelectSite, onSelectMunicipality };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [-76.35, 3.95],
      zoom: 7.1,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

    map.on("load", async () => {
      const boundaries = await fetch("/data/valle-municipios.geojson").then((r) => r.json());
      map.addSource("municipios", { type: "geojson", data: boundaries });
      map.addLayer({
        id: "municipios-fill",
        type: "fill",
        source: "municipios",
        paint: { "fill-color": "#5b6472", "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "municipios-line",
        type: "line",
        source: "municipios",
        paint: { "line-color": "#6c7787", "line-width": 0.7, "line-opacity": 0.8 },
      });

      map.addSource("sedes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 46,
        clusterMaxZoom: 11,
        clusterProperties: { rojo: ["+", ["case", ["==", ["get", "criticality"], "ROJO"], 1, 0]] },
      });

      map.addLayer({
        id: "sedes-heat",
        type: "heatmap",
        source: "sedes",
        layout: { visibility: "none" },
        paint: {
          "heatmap-weight": ["case", ["==", ["get", "criticality"], "ROJO"], 1, 0.4],
          "heatmap-radius": 34,
          "heatmap-opacity": 0.75,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.3, "#2f6f5e",
            0.6, "#e6b23c",
            1, "#e05545",
          ],
        },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "sedes",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["case", [">", ["get", "rojo"], 0], CRITICALITY_HEX.ROJO, "#4a5464"],
          "circle-opacity": 0.85,
          "circle-radius": ["step", ["get", "point_count"], 15, 5, 20, 15, 26],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#12161c",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "sedes",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "sedes-point",
        type: "circle",
        source: "sedes",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "criticality"],
            "ROJO", CRITICALITY_HEX.ROJO,
            "AMARILLO", CRITICALITY_HEX.AMARILLO,
            "VERDE", CRITICALITY_HEX.VERDE,
            CRITICALITY_HEX.SIN_DETALLE,
          ],
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 11, 7],
          "circle-stroke-width": ["case", ["==", ["get", "review"], true], 2.5, 1.2],
          "circle-stroke-color": ["case", ["==", ["get", "review"], true], "#f2f4f7", "#12161c"],
          "circle-stroke-opacity": 0.9,
        },
      });

      map.on("click", "sedes-point", (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (f) handlersRef.current.onSelectSite(String(f.properties?.["id"]));
      });
      map.on("click", "clusters", async (e: MapLayerMouseEvent) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        if (!f) return;
        const source = map.getSource("sedes") as maplibregl.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(f.properties?.["cluster_id"] as number);
        map.easeTo({ center: (f.geometry as GeoJSON_Point).coordinates as [number, number], zoom });
      });
      map.on("click", "municipios-fill", (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (f) handlersRef.current.onSelectMunicipality(String(f.properties?.["municipalityCode"]));
      });
      map.on("mouseenter", "sedes-point", (e: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        popup
          .setLngLat((f.geometry as GeoJSON_Point).coordinates as [number, number])
          .setHTML(
            `<div style="font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:#0f1319">
               <strong>${f.properties?.["name"] ?? ""}</strong><br/>${f.properties?.["institution"] ?? ""}
             </div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", "sedes-point", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      readyRef.current = true;
      pendingRef.current.forEach((fn) => fn());
      pendingRef.current = [];
    });

    return () => {
      pendingRef.current = [];
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  // sites -> GeoJSON
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource("sedes") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData({
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
            },
            geometry: {
              type: "Point" as const,
              coordinates: [s.position!.longitude, s.position!.latitude],
            },
          })),
      });
    };
    whenReady(apply);
  }, [sites]);

  // municipal choropleth by criticality
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (!map.getLayer("municipios-fill")) return;
      const matcher: (string | string[])[] = ["match", ["get", "municipalityCode"]];
      for (const summary of municipalities) {
        matcher.push(summary.municipality.id, CRITICALITY_HEX[summary.criticality]);
      }
      matcher.push("#4b5462");
      map.setPaintProperty(
        "municipios-fill",
        "fill-color",
        municipalities.length ? (matcher as unknown as maplibregl.ExpressionSpecification) : "#4b5462",
      );
      map.setPaintProperty("municipios-fill", "fill-opacity", 0.22);
    };
    whenReady(apply);
  }, [municipalities]);

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
    if (!map || !selectedSiteId) return;
    const target = sites.find((s) => s.diagnostic.id === selectedSiteId);
    if (target?.position) {
      map.easeTo({
        center: [target.position.longitude, target.position.latitude],
        zoom: Math.max(map.getZoom(), 11.5),
        duration: 700,
      });
    }
  }, [selectedSiteId, sites]);

  return <div ref={containerRef} className="absolute inset-0" aria-label="Mapa de sedes diagnosticadas" />;
}