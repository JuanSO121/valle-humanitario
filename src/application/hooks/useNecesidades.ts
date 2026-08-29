/**
 * useNecesidades.ts
 * -----------------------------------------------------------------------
 * Lo que falta hoy en el centro de acopio, desde route=necesidades.
 *
 * `staleTime` mucho más corto que el resto del tablero: cinco minutos
 * contra los treinta de los catálogos. Todo lo demás cuenta lo que ya
 * pasó y no cambia; esto cambia con cada inventario, y una lista vieja no
 * es un dato impreciso, es una lista que manda a la gente a donar lo que
 * ya sobra.
 *
 * Reintentos como en useAyuda: el Web App de Apps Script serializa las
 * ejecuciones por usuario, así que un 404 de concurrencia no debe darse
 * por definitivo.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ayudasApiRepository } from "@/infrastructure/api/container";
import type { NecesidadesResponse } from "@/domain/entities";
import { REINTENTO_ESCALONADO } from "@/application/hooks/useAyuda";

const NECESIDADES_STALE_TIME_MS = 5 * 60 * 1000;

export function useNecesidades(): UseQueryResult<NecesidadesResponse> {
  return useQuery({
    queryKey: ["necesidades"],
    queryFn: () => ayudasApiRepository.getNecesidades(),
    staleTime: NECESIDADES_STALE_TIME_MS,
    retry: 3,
    retryDelay: REINTENTO_ESCALONADO,
  });
}