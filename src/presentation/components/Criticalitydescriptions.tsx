import type { Criticality } from "@/domain/entities";

/**
 * Explicación en lenguaje simple de cada nivel de criticidad, para mostrar
 * junto al color/etiqueta en cualquier panel (leyenda, detalle de sede,
 * tarjetas de municipio). Única fuente para no repetir el texto en cada
 * componente.
 *
 * Redactado a propósito para describir lo que el Excel realmente reporta
 * (afectaciones clasificadas por criticidad, con acción recomendada) y no
 * afirmar un diagnóstico estructural que aún no se ha hecho — la columna
 * "Criticidad" viene definida así en la fuente, la app solo la muestra.
 */
export const CRITICALITY_DESCRIPTION: Record<Criticality, string> = {
  ROJO: "Riesgo alto: se identificaron afectaciones clasificadas como críticas. Se recomienda restringir el acceso a la zona y solicitar evaluación urgente de un ingeniero estructural.",
  AMARILLO: "Riesgo medio: se identificaron afectaciones que requieren seguimiento y reparación, sin necesidad de restringir el acceso de inmediato.",
  VERDE: "Riesgo bajo: no se identificaron afectaciones clasificadas como críticas o de seguimiento en esta sede.",
  SIN_DETALLE: "Sin información suficiente para clasificar el riesgo todavía.",
};

export const CRITICALITY_SHORT_LABEL: Record<Criticality, string> = {
  ROJO: "Riesgo alto",
  AMARILLO: "Riesgo medio",
  VERDE: "Riesgo bajo",
  SIN_DETALLE: "Sin evaluar",
};