/**
 * useContratacion.ts
 * -----------------------------------------------------------------------
 * Contratos de la reconstrucción, desde route=contratacion.
 *
 * La lista cambia cuando alguien carga la hoja, no en horas (a diferencia
 * de necesidades), así que sí se siembra desde el snapshot del navegador
 * (ver usePrecargaDesdeSnapshot). Reintentos escalonados por la misma
 * razón que en useAyuda.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ayudasApiRepository } from "@/infrastructure/api/container";
import type { ContratacionResponse } from "@/domain/entities";
import { REINTENTO_ESCALONADO } from "@/application/hooks/useTablero";

const CONTRATACION_STALE_TIME_MS = 5 * 60 * 1000;

export function useContratacion(): UseQueryResult<ContratacionResponse> {
  return useQuery({
    queryKey: ["contratacion"],
    queryFn: () => ayudasApiRepository.getContratacion(),
    staleTime: CONTRATACION_STALE_TIME_MS,
    retry: 3,
    retryDelay: REINTENTO_ESCALONADO,
  });
}
