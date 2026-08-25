/**
 * useCatalogQueries.ts
 * -----------------------------------------------------------------------
 * Los seis GET sin parámetros (meta, origenes, municipios, categorias,
 * flujos, destinos) comparten exactamente la misma forma: una queryKey de
 * un elemento, un queryFn que llama al repositorio, y el mismo staleTime
 * (estos catálogos ya están cacheados 6h del lado del backend en
 * CacheLayer.gs — no tiene sentido que el cliente los revalide más
 * seguido que eso). Consolidarlos en una fábrica evita que, con el
 * tiempo, alguien le cambie el staleTime a uno solo y los seis queden
 * desalineados sin que nadie lo note en review.
 * -----------------------------------------------------------------------
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ayudasApiRepository } from "@/infrastructure/api/container";
import type {
  Meta,
  Origen,
  Municipio,
  Categoria,
  FlujosResponse,
  DestinoResumenLista,
} from "@/domain/entities";

// Igual al TTL de CacheLayer.gs — revalidar más seguido que el propio
// backend solo generaría requests que van a devolver exactamente lo
// mismo que ya está en cache del lado del servidor.
const CATALOG_STALE_TIME_MS = 6 * 60 * 60 * 1000;

function createCatalogQuery<T>(key: string, fetcher: () => Promise<T>) {
  return function useThisCatalogQuery(): UseQueryResult<T> {
    return useQuery({
      queryKey: [key],
      queryFn: fetcher,
      staleTime: CATALOG_STALE_TIME_MS,
    });
  };
}

export const useMeta = createCatalogQuery<Meta>("meta", () => ayudasApiRepository.getMeta());
export const useOrigenes = createCatalogQuery<Origen[]>("origenes", () => ayudasApiRepository.getOrigenes());
export const useMunicipios = createCatalogQuery<Municipio[]>("municipios", () => ayudasApiRepository.getMunicipios());
export const useCategorias = createCatalogQuery<Categoria[]>("categorias", () => ayudasApiRepository.getCategorias());
export const useFlujos = createCatalogQuery<FlujosResponse>("flujos", () => ayudasApiRepository.getFlujos());
export const useDestinos = createCatalogQuery<DestinoResumenLista[]>("destinos", () =>
  ayudasApiRepository.getDestinos(),
);