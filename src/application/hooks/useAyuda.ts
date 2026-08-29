/**
 * useAyuda.ts
 * -----------------------------------------------------------------------
 * Composición de lo entregado, desde route=ayuda.
 *
 * CAMBIO: se quita `retry: false`.
 *
 * Estaba puesto con buen criterio: mientras la ruta no existía en el
 * backend, el 404 era permanente y reintentar no servía de nada. Pero la
 * ruta ya está publicada, y ahora ese flag hace daño.
 *
 * Un Web App de Apps Script serializa las ejecuciones por usuario. El
 * tablero monta ocho consultas a la vez y las que se pisan reciben un 404
 * de la infraestructura de Google, no del script. Con `retry: false`, ese
 * fallo de un segundo se vuelve definitivo para toda la sesión: la
 * sección cae al catálogo estático y ahí se queda, aunque el backend esté
 * perfecto.
 *
 * Con tres reintentos y espera creciente, la consulta se recupera sola.
 * El costo si la ruta de verdad no existiera son unos siete segundos
 * antes de caer al respaldo, que es una espera aceptable a cambio de no
 * mostrar datos viejos cuando los buenos estaban disponibles.
 *
 * La cola de `colaDePeticiones` es la que ataca la causa; esto es la red
 * de seguridad. Conviene tener las dos: la cola no puede evitar un fallo
 * de red del lado del usuario.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ayudasApiRepository } from "@/infrastructure/api/container";
import type { AyudaResponse } from "@/domain/entities";

/** Igual que en useCatalogQueries. Si cambia allá, cambia acá. */
const CATALOG_STALE_TIME_MS = 5 * 60 * 1000;

/**
 * Espera creciente entre intentos: 1s, 2s, 4s, con tope de 8.
 *
 * Sin la espera creciente, los tres reintentos salen casi juntos y se
 * vuelven a pisar con las otras consultas, que es exactamente lo que se
 * está tratando de evitar.
 */
export const REINTENTO_ESCALONADO = (intento: number) =>
  Math.min(1000 * 2 ** intento, 8000);

export function useAyuda(): UseQueryResult<AyudaResponse> {
  return useQuery({
    queryKey: ["ayuda"],
    queryFn: () => ayudasApiRepository.getAyuda(),
    staleTime: CATALOG_STALE_TIME_MS,
    retry: 3,
    retryDelay: REINTENTO_ESCALONADO,
  });
}