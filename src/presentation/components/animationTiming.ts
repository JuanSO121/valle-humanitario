/**
 * animationTiming.ts
 * -----------------------------------------------------------------------
 * Los tiempos del timeline y los de la animación de arcos son UN SOLO
 * presupuesto, no dos. Vivían separados en dos archivos: 20 s repartidos entre
 * las fechas en Timeline.tsx y 9 s de cascada en arcAnimationEngine.ts. Con el
 * dataset real eso daba un paso de 1.667 ms contra una ola que tardaba
 * 9.000 ms solo en ARRANCAR el último arco. El resultado: las líneas no
 * alcanzaban a llegar antes de que cambiara el día, y el backlog crecía
 * hasta reproducirse mucho después de que el timeline había terminado.
 *
 * La regla es una sola y se lee de arriba abajo:
 *
 *     paso del timeline  =  cascada  +  crecimiento del último arco
 *
 * Es decir: una jornada dura lo que tarda su último arco en salir y
 * llegar. Si se cambia cualquiera de los tres números, los otros se
 * reacomodan solos, por eso están acá y no repartidos en dos archivos.
 * -----------------------------------------------------------------------
 */

/** Lo que tarda un arco en crecer del origen al destino. */
export const ARC_GROWTH_MS = 900;

/**
 * Ventana de una jornada: lo que la ola de arcos de un día tiene para
 * salir y llegar completa.
 *
 * Ya no hay reproducción automática (ver Timeline.tsx), así que esto no
 * dispara nada por sí solo, sigue siendo el presupuesto del que se
 * deriva la cascada, y es lo que tarda una jornada en resolverse
 * visualmente cuando alguien toca "siguiente".
 */
export const TIMELINE_STEP_MS = 2800;

/**
 * Lo que tiene la ola de arcos de una jornada para arrancar TODOS sus
 * arcos. Deriva del paso: lo que sobra después de reservar el
 * crecimiento del último. No se escribe a mano.
 */
export const CASCADE_BUDGET_MS = Math.max(600, TIMELINE_STEP_MS - ARC_GROWTH_MS);

/**
 * Piso del intervalo entre dos entradas consecutivas. Bajo a propósito:
 * el 12 de agosto entran 32 municipios y tienen que caber en el
 * presupuesto. A 60 ms todavía se lee como cascada, no como un flash
 * simultáneo.
 */
export const CASCADE_STEP_MIN_MS = 60;

/** Techo: con pocos arcos mantiene el ritmo "entra el siguiente cuando el anterior va por la mitad". */
export const CASCADE_STEP_MAX_MS = 450;

/**
 * Techo de una reproducción completa, como red de seguridad. Con las 13
 * fechas del dataset real no hace nada. Si algún día llegan muchas más,
 * comprime el paso para que la reproducción no dure diez minutos.
 */
export const TIMELINE_MAX_PLAYBACK_MS = 120_000;

/** Paso real entre jornadas según cuántas fechas haya. */
export function computeTimelineStepMs(dateCount: number): number {
  if (dateCount <= 1) return TIMELINE_STEP_MS;
  const comprimido = TIMELINE_MAX_PLAYBACK_MS / (dateCount - 1);
  return Math.min(TIMELINE_STEP_MS, Math.max(CASCADE_STEP_MAX_MS, comprimido));
}