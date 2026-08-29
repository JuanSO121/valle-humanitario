/**
 * colaDePeticiones.ts
 * -----------------------------------------------------------------------
 * Limita cuántas peticiones al Web App viajan al mismo tiempo.
 *
 * EL PROBLEMA
 *
 * Un Web App de Apps Script serializa las ejecuciones por usuario. El
 * tablero monta ocho consultas a la vez —meta, origenes, municipios,
 * categorias, flujos, destinos, toneladas, ayuda— y las que se pisan
 * reciben un 404 de la infraestructura de Google, no del script.
 *
 * Ese 404 despista, porque parece que la ruta no existiera. No puede
 * serlo: `jsonResponse_` usa ContentService, que siempre responde 200.
 * Hasta `errorResponse_(..., 404)` devuelve un 200 con el 404 adentro del
 * JSON. Un 404 de HTTP significa que la petición no llegó a ejecutarse.
 *
 * LA SOLUCIÓN
 *
 * Una cola: como mucho dos peticiones en vuelo, el resto espera turno.
 * La página tarda una fracción de segundo más en terminar de cargar y a
 * cambio no se cae ninguna sección.
 *
 * Dos y no una: con una sola en vuelo, ocho rutas en serie se sienten
 * lentas. Con dos, Apps Script las atiende sin pisarse y la carga se
 * mantiene corta. Si aun así aparecen 404 sueltos, bajarlo a 1.
 * -----------------------------------------------------------------------
 */

/** Peticiones simultáneas como máximo. Bajar a 1 si siguen los 404. */
const MAX_EN_VUELO = 2;

let enVuelo = 0;
const esperando: Array<() => void> = [];

/**
 * Ejecuta `tarea` cuando haya cupo.
 *
 * El `finally` es lo que sostiene la cola: si una petición falla y no se
 * libera el cupo, las que esperan quedan colgadas para siempre y la
 * página se congela a medio cargar. Por eso el contador baja pase lo que
 * pase, y el error se vuelve a lanzar para que React Query lo vea y
 * reintente.
 */
export async function enCola<T>(tarea: () => Promise<T>): Promise<T> {
  if (enVuelo >= MAX_EN_VUELO) {
    await new Promise<void>((liberar) => esperando.push(liberar));
  }

  enVuelo += 1;
  try {
    return await tarea();
  } finally {
    enVuelo -= 1;
    const siguiente = esperando.shift();
    if (siguiente) siguiente();
  }
}