/**
 * useDestinoResumen.ts
 * -----------------------------------------------------------------------
 * Vista PRINCIPAL de un destino (route=destino&id=), solo ENVIOS_CATEGORIA.
 * Separado de useDestinoLogistica.ts a propósito: son dos requests
 * independientes porque son dos fuentes que el backend nunca mezcla (ver
 * disclaimer de cada respuesta) — tenerlos en el mismo hook facilitaría
 * combinarlos sin darse cuenta en un total que no corresponde sumar.
 * -----------------------------------------------------------------------
 */
import { useQuery } from "@tanstack/react-query";
import { ayudasApiRepository } from "@/infrastructure/api/container";

export function useDestinoResumen(destinoId: string | null) {
  return useQuery({
    queryKey: ["destino", destinoId],
    queryFn: () => ayudasApiRepository.getDestino(destinoId!),
    enabled: destinoId !== null,
  });
}