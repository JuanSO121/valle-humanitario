import type { Criticality } from "@/domain/entities";

export const CRITICALITY_LABEL: Record<Criticality, string> = {
  ROJO: "Rojo",
  AMARILLO: "Amarillo",
  VERDE: "Verde",
  SIN_DETALLE: "Sin detalle",
};

/**
 * Token-backed colors, resolved once for MapLibre paint expressions.
 * Light-theme hex mirrors of the CSS custom properties in globals.css —
 * MapLibre paint expressions can't consume var(--x) directly, so these
 * must be kept in sync manually if the tokens change.
 */
export const CRITICALITY_HEX: Record<Criticality, string> = {
  ROJO: "#c2352a",
  AMARILLO: "#a66a0a",
  VERDE: "#1f7a52",
  SIN_DETALLE: "#7d8592",
};

export const CRITICALITY_CLASS: Record<Criticality, string> = {
  ROJO: "bg-critical text-critical-foreground",
  AMARILLO: "bg-warning text-warning-foreground",
  VERDE: "bg-safe text-safe-foreground",
  SIN_DETALLE: "bg-muted text-muted-foreground",
};

export const CRITICALITY_ORDER: Criticality[] = ["ROJO", "AMARILLO", "VERDE", "SIN_DETALLE"];

/**
 * Cluster ("agrupación de sedes") color — deliberately NOT part of the
 * criticality scale. A cluster represents "multiple records", not a risk
 * state, so it must never share hue-family with ROJO/AMARILLO/VERDE.
 * Same blue family as --primary (territorial identity) but a distinct
 * lightness so it still reads as its own category on the map/legend.
 */
export const CLUSTER_COLOR = "#2f6fed";
export const CLUSTER_STROKE = "#ffffff";
export const CLUSTER_LABEL = "Agrupación de sedes";