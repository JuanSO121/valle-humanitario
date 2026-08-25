/**
 * useDestinoLogistica.ts
 * -----------------------------------------------------------------------
 * Vista SECUNDARIA de un destino (route=destino-logistica&id=), solo
 * DESPACHOS. A diferencia de useDestinoResumen, acepta un segundo
 * parámetro `expanded`: el panel de destino abre primero mostrando solo
 * categorías (useDestinoResumen), y este request recién se dispara si la
 * persona expande explícitamente el bloque de logística — igual que ya
 * decidimos en la sección de arquitectura ("SOLO se dispara al expandir
 * el nivel secundario, lazy, no junto con el resumen"). Evita un request
 * innecesario contra la cuota de ejecuciones de Apps Script para quien
 * nunca abre ese detalle.
 * -----------------------------------------------------------------------
 */
import { useQuery } from "@tanstack/react-query";
import { ayudasApiRepository } from "@/infrastructure/api/container";

export function useDestinoLogistica(destinoId: string | null, expanded: boolean) {
  return useQuery({
    queryKey: ["destino-logistica", destinoId],
    queryFn: () => ayudasApiRepository.getDestinoLogistica(destinoId!),
    enabled: destinoId !== null && expanded,
  });
}