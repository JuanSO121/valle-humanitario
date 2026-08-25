/**
 * useFlujosAsOf.ts
 * -----------------------------------------------------------------------
 * Deriva, en el cliente y sin red, el estado acumulado de los flujos a
 * una fecha dada del timeline. useFlujos() ya trae todo el `porFecha` de
 * cada par en memoria desde el primer fetch — recalcular "cuánto se había
 * entregado al día X" es sumar un array corto, no vale la pena un fetch
 * por cada tick del scrub (arrastrar el slider generaría decenas de
 * requests por segundo contra un backend con cuota de ejecuciones).
 *
 * NOTA: depende de que `Transforms.gs` incluya `porFecha` en la respuesta
 * de route=flujos (cambio propuesto, ver conversación — un campo más en
 * la misma ruta, no una ruta nueva, para no desincronizar el TTL de
 * CacheLayer.gs entre dos vistas del mismo dataset).
 * -----------------------------------------------------------------------
 */
import { useMemo } from "react";
import type { Flujo } from "@/domain/entities";

/**
 * @param flujos           salida completa de useFlujos().data.flujos
 * @param timelineDate     fecha ISO del playhead, o null para modo estático
 *                          (en cuyo caso se devuelven los flujos tal cual,
 *                          sin filtrar — mismo comportamiento que ya
 *                          existía antes de que existiera el timeline)
 */
export function useFlujosAsOf(flujos: Flujo[] | undefined, timelineDate: string | null): Flujo[] {
  return useMemo(() => {
    if (!Array.isArray(flujos)) return [];
    if (timelineDate === null) return flujos;

    return flujos
      .map((flujo) => {
        const acumulado = (flujo.porFecha ?? [])
          .filter((p) => p.fecha <= timelineDate)
          .reduce((sum, p) => sum + p.despachosCount, 0);

        // Un flujo sin ningún despacho hasta esta fecha del timeline no
        // existe todavía en este punto de la reproducción — se excluye en
        // vez de mostrarse con despachosCount 0 (que MapCanvas leería como
        // "un arco muy delgado" en lugar de "este arco no ha ocurrido aún").
        return acumulado > 0 ? { ...flujo, despachosCount: acumulado } : null;
      })
      .filter((f): f is Flujo => f !== null);
  }, [flujos, timelineDate]);
}