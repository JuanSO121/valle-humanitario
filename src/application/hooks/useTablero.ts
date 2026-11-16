/**
 * useTablero.ts
 * -----------------------------------------------------------------------
 * Las consultas del tablero, una por ruta del backend. Comparten forma
 * (una queryKey de un elemento, un queryFn del repositorio, el mismo
 * reintento), así que viven en una fábrica: nadie le cambia el staleTime
 * a una sola y las demás quedan desalineadas sin que se note.
 *
 * REINTENTOS
 *
 * Un Web App de Apps Script serializa las ejecuciones por usuario. Si
 * varias consultas se pisan, las que llegan tarde reciben un 404 de la
 * infraestructura de Google, no del script. Con tres reintentos y espera
 * creciente la consulta se recupera sola; sin ellos, ese fallo de un
 * segundo se vuelve permanente para toda la sesión.
 *
 * FRESCURA
 *
 * Los despachos y los contratos cambian cuando alguien carga una pestaña
 * o una fila, no en horas: cinco minutos de staleTime. «Qué hace falta»
 * sí caduca en horas (una lista vieja manda a donar lo que ya sobra) y
 * por eso tiene el suyo, más corto, y no se siembra desde el navegador.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ayudasApiRepository } from "@/infrastructure/api/container";
import type {
  CategoriasRespuesta,
  FaltantesRespuesta,
  MunicipiosRespuesta,
  OtrasRespuesta,
  ResumenRespuesta,
} from "@/domain/entities";

/** Espera creciente entre intentos: 1s, 2s, 4s, con tope de 8. */
export const REINTENTO_ESCALONADO = (intento: number) => Math.min(1000 * 2 ** intento, 8000);

const STALE_TIME_MS = 5 * 60 * 1000;
const STALE_TIME_FALTANTES_MS = 2 * 60 * 1000;

function consulta<T>(clave: string, leer: () => Promise<T>, staleTime = STALE_TIME_MS) {
  return (): UseQueryResult<T> =>
    useQuery({
      queryKey: [clave],
      queryFn: leer,
      staleTime,
      retry: 3,
      retryDelay: REINTENTO_ESCALONADO,
    });
}

export const useResumen = consulta<ResumenRespuesta>("resumen", () =>
  ayudasApiRepository.getResumen(),
);
export const useMunicipios = consulta<MunicipiosRespuesta>("municipios", () =>
  ayudasApiRepository.getMunicipios(),
);
export const useOtras = consulta<OtrasRespuesta>("otras", () => ayudasApiRepository.getOtras());
export const useCategorias = consulta<CategoriasRespuesta>("categorias", () =>
  ayudasApiRepository.getCategorias(),
);
export const useFaltantes = consulta<FaltantesRespuesta>(
  "faltantes",
  () => ayudasApiRepository.getFaltantes(),
  STALE_TIME_FALTANTES_MS,
);
