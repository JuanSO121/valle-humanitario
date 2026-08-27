/**
 * useAyuda.ts
 * -----------------------------------------------------------------------
 * Composición de lo entregado, desde route=ayuda.
 *
 * Mismo patrón y mismo staleTime que useCatalogQueries, y `retry: false`
 * como useToneladas: mientras la ruta no esté publicada, el backend
 * responde 404 y no tiene sentido reintentar. La sección cae a las
 * cifras del catálogo y sigue funcionando.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ayudasApiRepository } from "@/infrastructure/api/container";
import type { AyudaResponse } from "@/domain/entities";

/** Igual que en useCatalogQueries. Si cambia allá, cambia acá. */
const CATALOG_STALE_TIME_MS = 5 * 60 * 1000;

export function useAyuda(): UseQueryResult<AyudaResponse> {
  return useQuery({
    queryKey: ["ayuda"],
    queryFn: () => ayudasApiRepository.getAyuda(),
    staleTime: CATALOG_STALE_TIME_MS,
    retry: false,
  });
}