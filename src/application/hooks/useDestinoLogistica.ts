/**
 * useDestinoLogistica.ts
 * -----------------------------------------------------------------------
 * Vista SECUNDARIA de un destino (route=destino-logistica&id=), solo
 * DESPACHOS. Se dispara recién cuando la persona expande el bloque de
 * logística, no junto con el resumen.
 *
 * CAMBIO: staleTime y reintentos, igual que useDestinoResumen, para que
 * expandir y contraer el bloque no repita la petición.
 * -----------------------------------------------------------------------
 */
import { useQuery } from "@tanstack/react-query";
import { ayudasApiRepository } from "@/infrastructure/api/container";
import { CATALOG_STALE_TIME_MS, REINTENTO_ESCALONADO } from "./useCatalogQueries";

export function useDestinoLogistica(destinoId: string | null, expanded: boolean) {
  return useQuery({
    queryKey: ["destino-logistica", destinoId],
    queryFn: () => ayudasApiRepository.getDestinoLogistica(destinoId!),
    enabled: destinoId !== null && expanded,
    staleTime: CATALOG_STALE_TIME_MS,
    retry: 3,
    retryDelay: REINTENTO_ESCALONADO,
  });
}