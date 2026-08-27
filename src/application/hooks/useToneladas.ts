/**
 * useToneladas.ts
 * -----------------------------------------------------------------------
 * Serie diaria de toneladas, desde `route=toneladas`.
 *
 * Sigue el mismo patrón que useCatalogQueries: una queryKey de un
 * elemento y el mismo staleTime.
 *
 * Una diferencia a propósito: `retry: false`. Mientras la ruta no esté
 * publicada, el backend responde 404 y no tiene sentido reintentar tres
 * veces en cada carga. El tablero cae al estimado por entregas y sigue
 * funcionando. Ver OperacionContext.
 *
 * ANTES DE USARLO hay que agregar el método al repositorio, junto a los
 * otros seis GET sin parámetros:
 *
 *     getToneladas(): Promise<ToneladasResponse> {
 *       return this.get<ToneladasResponse>("toneladas");
 *     }
 *
 * Y el tipo en domain/entities.ts:
 *
 *     export interface ToneladasPunto {
 *       dia: string;
 *       toneladas: number;
 *       acumulado: number;
 *     }
 *
 *     export interface ToneladasResponse {
 *       serie: ToneladasPunto[];
 *       total: number;
 *       fuente: "TONELADAS";
 *       disclaimer: string;
 *     }
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ayudasApiRepository } from "@/infrastructure/api/container";
import type { ToneladasResponse } from "@/domain/entities";

/** Igual que en useCatalogQueries. Si cambia allá, cambia acá. */
const CATALOG_STALE_TIME_MS = 5 * 60 * 1000;

export function useToneladas(): UseQueryResult<ToneladasResponse> {
  return useQuery({
    queryKey: ["toneladas"],
    queryFn: () => ayudasApiRepository.getToneladas(),
    staleTime: CATALOG_STALE_TIME_MS,
    retry: false,
  });
}