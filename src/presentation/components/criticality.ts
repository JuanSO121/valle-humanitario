import type { Criticality } from "@/domain/entities";

export const CRITICALITY_LABEL: Record<Criticality, string> = {
  ROJO: "Rojo",
  AMARILLO: "Amarillo",
  VERDE: "Verde",
  SIN_DETALLE: "Sin detalle",
};

/** Token-backed colors, resolved once for MapLibre paint expressions. */
export const CRITICALITY_HEX: Record<Criticality, string> = {
  ROJO: "#e05545",
  AMARILLO: "#e6b23c",
  VERDE: "#3fbf87",
  SIN_DETALLE: "#8a8f98",
};

export const CRITICALITY_CLASS: Record<Criticality, string> = {
  ROJO: "bg-critical text-critical-foreground",
  AMARILLO: "bg-warning text-warning-foreground",
  VERDE: "bg-safe text-safe-foreground",
  SIN_DETALLE: "bg-muted text-muted-foreground",
};

export const CRITICALITY_ORDER: Criticality[] = ["ROJO", "AMARILLO", "VERDE", "SIN_DETALLE"];