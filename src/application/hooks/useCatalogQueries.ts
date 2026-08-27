/**
 * useCatalogQueries.ts
 * -----------------------------------------------------------------------
 * Los seis GET sin parámetros (meta, origenes, municipios, categorias,
 * flujos, destinos) comparten exactamente la misma forma: una queryKey de
 * un elemento, un queryFn que llama al repositorio, y el mismo staleTime.
 * Consolidarlos en una fábrica evita que, con el tiempo, alguien le
 * cambie el staleTime a uno solo y los seis queden desalineados sin que
 * nadie lo note en review.
 *
 * SOBRE EL staleTime: antes eran 6 horas, igual al TTL de CacheLayer.gs.
 * El razonamiento era que revalidar más seguido que el backend solo
 * produce requests que devuelven lo mismo. Es cierto, pero tiene una
 * consecuencia que costó caro: cuando se corrige el Excel y se invalida
 * la caché del backend, una pestaña abierta sigue mostrando lo viejo
 * durante 6 horas. Para un dataset que se actualiza a diario, 5 minutos
 * es un intercambio mejor. El costo de un request de más es despreciable
 * frente a mostrar cifras equivocadas.
 *
 * Si esto se cambia, cambiar también CONFIG.CACHE.TTL_SECONDS en
 * Config.gs: el frontend nunca puede ser más fresco que el backend.
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

const CATALOG_STALE_TIME_MS = 5 * 60 * 1000;

function createCatalogQuery<T>(key: string, fetcher: () => Promise<T>) {
  return function useThisCatalogQuery(): UseQueryResult<T> {
    return useQuery({
      queryKey: [key],
      queryFn: fetcher,
      staleTime: CATALOG_STALE_TIME_MS,
      refetchOnWindowFocus: true,
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