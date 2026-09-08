/**
 * useToneladas.ts
 * -----------------------------------------------------------------------
 * Serie diaria de toneladas, desde `route=toneladas`.
 *
 * CAMBIO: se quita `retry: false`, por la misma razón que en useAyuda.
 *
 * Estaba puesto cuando la ruta todavía no existía: reintentar un 404
 * permanente no sirve de nada. Pero la ruta ya está publicada y responde,
 * así que ahora ese flag hace daño.
 *
 * Un Web App de Apps Script serializa las ejecuciones por usuario. El
 * tablero monta ocho consultas a la vez y las que se pisan reciben un 404
 * de la infraestructura de Google, no del script. Con `retry: false`, ese
 * fallo de un segundo se vuelve definitivo para toda la sesión: el peso
 * cae al respaldo por entregas y ahí se queda, aunque el backend esté
 * perfecto y la hoja tenga los datos.
 *
 * Es un fallo especialmente silencioso: no aparece ningún mensaje, solo
 * una cifra de toneladas parecida a la buena pero distinta.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ayudasApiRepository } from "@/infrastructure/api/container";
import type { ToneladasResponse } from "@/domain/entities";
import { CATALOG_STALE_TIME_MS, REINTENTO_ESCALONADO } from "./useCatalogQueries";

export function useToneladas(): UseQueryResult<ToneladasResponse> {
  return useQuery({
    queryKey: ["toneladas"],
    queryFn: () => ayudasApiRepository.getToneladas(),
    staleTime: CATALOG_STALE_TIME_MS,
    retry: 3,
    retryDelay: REINTENTO_ESCALONADO,
  });
}