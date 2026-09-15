/**
 * useDestinoResumen.ts
 * -----------------------------------------------------------------------
 * Vista PRINCIPAL de un destino (route=destino&id=). Separado de
 * useDestinoLogistica a propósito: son dos fuentes que el backend nunca
 * mezcla.
 *
 * CAMBIO: staleTime y reintentos, como el resto del tablero.
 *
 * Sin staleTime, React Query daba el dato por viejo apenas llegaba, así
 * que cerrar y volver a abrir la ficha de un municipio disparaba otra
 * petición al Web App cada vez.
 * -----------------------------------------------------------------------
 */
import { useQuery } from "@tanstack/react-query";
import { ayudasApiRepository } from "@/infrastructure/api/container";
import { CATALOG_STALE_TIME_MS, REINTENTO_ESCALONADO } from "./useCatalogQueries";

export function useDestinoResumen(destinoId: string | null) {
  return useQuery({
    queryKey: ["destino", destinoId],
    queryFn: () => ayudasApiRepository.getDestino(destinoId!),
    enabled: destinoId !== null,
    staleTime: CATALOG_STALE_TIME_MS,
    retry: 3,
    retryDelay: REINTENTO_ESCALONADO,
  });
}