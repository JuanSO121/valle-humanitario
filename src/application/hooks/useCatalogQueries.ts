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
 * es un intercambio mejor.
 *
 * Si esto se cambia, cambiar también CONFIG.CACHE.TTL_SECONDS en
 * Config.gs: el frontend nunca puede ser más fresco que el backend.
 *
 * CAMBIO: los seis reintentan, igual que useAyuda y useToneladas.
 *
 * Apps Script serializa las ejecuciones por usuario y el tablero monta
 * ocho consultas a la vez. Las que se pisan reciben un 404 de la
 * infraestructura de Google, no del script, y sin reintento ese fallo de
 * un segundo se vuelve permanente para toda la sesión.
 *
 * El síntoma es distinto en cada ruta y ninguno se parece a un error de
 * red: sin `municipios` las zonas caen al catálogo estático, sin
 * `toneladas` el peso cae al estimado, sin `ayuda` desaparecen las
 * cuatro rutas del balance. Tres bugs de datos aparentes, una sola causa.
 *
 * La espera creciente importa: sin ella los tres reintentos salen casi
 * juntos y se vuelven a pisar entre sí, que es justo lo que se quiere
 * evitar.
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

export const CATALOG_STALE_TIME_MS = 5 * 60 * 1000;

/** Espera creciente entre intentos: 1s, 2s, 4s, con tope de 8. */
export const REINTENTO_ESCALONADO = (intento: number) => Math.min(1000 * 2 ** intento, 8000);

function createCatalogQuery<T>(key: string, fetcher: () => Promise<T>) {
  return function useThisCatalogQuery(): UseQueryResult<T> {
    return useQuery({
      queryKey: [key],
      queryFn: fetcher,
      staleTime: CATALOG_STALE_TIME_MS,
      refetchOnWindowFocus: true,
      retry: 3,
      retryDelay: REINTENTO_ESCALONADO,
    });
  };
}

export const useMeta = createCatalogQuery<Meta>("meta", () => ayudasApiRepository.getMeta());
export const useOrigenes = createCatalogQuery<Origen[]>("origenes", () =>
  ayudasApiRepository.getOrigenes(),
);
export const useMunicipios = createCatalogQuery<Municipio[]>("municipios", () =>
  ayudasApiRepository.getMunicipios(),
);
export const useCategorias = createCatalogQuery<Categoria[]>("categorias", () =>
  ayudasApiRepository.getCategorias(),
);
export const useFlujos = createCatalogQuery<FlujosResponse>("flujos", () =>
  ayudasApiRepository.getFlujos(),
);
export const useDestinos = createCatalogQuery<DestinoResumenLista[]>("destinos", () =>
  ayudasApiRepository.getDestinos(),
);