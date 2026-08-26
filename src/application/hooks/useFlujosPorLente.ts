/**
 * useFlujosPorLente.ts
 * -----------------------------------------------------------------------
 * El equivalente de territoryTime pero para los ARCOS. Los polígonos y
 * las líneas tienen que responder a la misma pregunta temporal: si el
 * mapa dice "acumulado al 14", los arcos no pueden mostrar el total.
 *
 * Reemplaza a useFlujosAsOf, que solo cubría el caso acumulado. Ese hook
 * queda sin uso; se puede borrar cuando nadie más lo importe.
 *
 * Devuelve Flujo[] con `despachosCount` recalculado y `porFecha` intacto
 * — el motor de arcos solo lee despachosCount, y conservar porFecha
 * permite que quien reciba estos flujos (ej. OrigenPanel) siga viendo el
 * detalle por fecha si lo necesita.
 * -----------------------------------------------------------------------
 */
import { useMemo } from "react";
import type { Flujo } from "@/domain/entities";
import type { TerritoryMapMode } from "@/presentation/data/territoryData";

export function useFlujosPorLente(
  flujos: Flujo[] | undefined,
  lens: TerritoryMapMode,
  /** Fecha ISO del timeline, o null = toda la operación. */
  isoDate: string | null,
): Flujo[] {
  return useMemo(() => {
    if (!flujos) return [];
    if (isoDate === null) return flujos;

    if (lens === "jornada") {
      // Solo ese día. Los pares origen→destino que no despacharon
      // desaparecen del mapa, que es exactamente la lectura que se pide.
      return flujos.flatMap((f) => {
        const delDia = (f.porFecha ?? []).find((p) => p.fecha === isoDate);
        if (!delDia || delDia.despachosCount <= 0) return [];
        return [{ ...f, despachosCount: delDia.despachosCount }];
      });
    }

    // Acumulado hasta la fecha, inclusive. Comparación lexicográfica:
    // las fechas son ISO yyyy-MM-dd, así que ordena igual que la
    // cronológica y evita construir un Date por cada punto.
    return flujos.flatMap((f) => {
      const total = (f.porFecha ?? []).reduce(
        (sum, p) => (p.fecha <= isoDate ? sum + p.despachosCount : sum),
        0,
      );
      if (total <= 0) return [];
      return [{ ...f, despachosCount: total }];
    });
  }, [flujos, lens, isoDate]);
}