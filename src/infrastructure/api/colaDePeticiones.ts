/**
 * colaDePeticiones.ts
 * -----------------------------------------------------------------------
 * Limita cuántas peticiones al Web App viajan al mismo tiempo, y
 * reintenta las que se caen por concurrencia.
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
 * TRES CAMBIOS EN ESTA VERSIÓN
 *
 * 1. UNA SOLA EN VUELO.
 *
 *    Estaba en dos con el argumento de que la carga se sentía lenta en
 *    serie. Pero Apps Script YA las serializa por dentro: las dos no se
 *    atienden en paralelo, se atropellan. El paralelismo era aparente y
 *    el costo, un 404 intermitente en una ruta al azar.
 *
 *    La carga tarda algo más. A cambio, ninguna sección se cae.
 *
 * 2. EL SEMÁFORO DEJA DE PERMITIR MÁS DEL MÁXIMO.
 *
 *    El `if` de la versión anterior tenía una carrera. Al liberarse un
 *    cupo, el contador baja y se despierta al que esperaba, pero ese
 *    despertar es un microtask: no retoma en el acto. En esa rendija,
 *    una petición nueva encuentra el contador por debajo del máximo, se
 *    salta la cola entera y ocupa el cupo. Cuando el que esperaba
 *    retoma, suma igual, sin volver a comprobar nada.
 *
 *    Resultado: con el máximo en 2 llegaba a haber 3 en vuelo, y era
 *    justo bajo carga —las ocho del arranque— cuando pasaba. La cola
 *    fallaba precisamente en el escenario para el que existe.
 *
 *    Con `while` en vez de `if`, el que despierta vuelve a comprobar y,
 *    si le ganaron el cupo, se vuelve a formar.
 *
 * 3. LA COLA REINTENTA LOS 404 DE INFRAESTRUCTURA.
 *
 *    React Query ya reintenta, pero espera un tiempo fijo y no sabe nada
 *    de la cola: puede volver a disparar justo cuando el Web App sigue
 *    ocupado. La cola sí sabe cuándo hay hueco, así que reintentar acá
 *    es más barato y más certero.
 *
 *    Las dos capas se complementan. Esta cubre el atropello entre rutas;
 *    la de React Query cubre lo que la cola no puede ver, como un corte
 *    de red del lado de la persona.
 *
 *    El cupo se SUELTA mientras se espera entre intentos. Retenerlo
 *    convertiría la espera de un reintento en una pausa para todas las
 *    demás rutas.
 * -----------------------------------------------------------------------
 */

/**
 * Peticiones simultáneas como máximo.
 *
 * Subirlo no acelera nada: el Web App atiende de a una de todos modos.
 * Lo único que cambia es cuántas se pisan.
 */
const MAX_EN_VUELO = 1;

/** Intentos adicionales cuando la respuesta parece un atropello. */
const REINTENTOS = 3;

/** Espera antes de cada reintento: 400 ms, 800, 1600. */
const espera = (intento: number) => Math.min(400 * 2 ** intento, 4000);

/**
 * Códigos que valen la pena reintentar.
 *
 * El 404 está acá por el motivo de arriba, y es el caso importante. Los
 * demás son los de un backend momentáneamente saturado. Un 404 legítimo
 * —una URL de despliegue mal escrita— también se reintenta tres veces,
 * que son dos segundos perdidos una sola vez: barato comparado con
 * perder una sección entera de la página.
 */
const ESTADOS_REINTENTABLES = new Set([404, 408, 429, 500, 502, 503, 504]);

let enVuelo = 0;
const esperando: Array<() => void> = [];

function liberarCupo() {
  enVuelo -= 1;
  const siguiente = esperando.shift();
  if (siguiente) siguiente();
}

/** Espera turno. El `while` es lo que sostiene el máximo, ver arriba. */
async function tomarCupo(): Promise<void> {
  while (enVuelo >= MAX_EN_VUELO) {
    await new Promise<void>((liberar) => esperando.push(liberar));
  }
  enVuelo += 1;
}

const dormir = (ms: number) => new Promise<void>((seguir) => setTimeout(seguir, ms));

/**
 * `true` si el resultado es una respuesta HTTP que conviene repetir.
 *
 * Se comprueba en tiempo de ejecución y no por tipos porque `enCola` es
 * genérica: hoy solo la usa el `fetch` del repositorio, pero nada impide
 * que mañana encole otra cosa, y en ese caso el resultado simplemente no
 * es un `Response` y se devuelve tal cual.
 */
function convieneReintentar(resultado: unknown): resultado is Response {
  return (
    typeof Response !== "undefined" &&
    resultado instanceof Response &&
    ESTADOS_REINTENTABLES.has(resultado.status)
  );
}

/**
 * Ejecuta `tarea` cuando haya cupo, y la repite si se cae por
 * concurrencia.
 *
 * El cupo se libera pase lo que pase. Si una petición falla y no se
 * libera, las que esperan quedan colgadas para siempre y la página se
 * congela a medio cargar; por eso cada camino de salida pasa por
 * `liberarCupo`.
 *
 * Lo que la tarea devuelva —incluida una respuesta con error tras
 * agotar los intentos— sale de acá sin tocar, para que el repositorio
 * haga su propio diagnóstico y React Query decida si reintenta.
 *
 * `etiqueta` es solo para el registro, pero hace toda la diferencia al
 * diagnosticar. La cola recibe una función, no una URL, así que sin este
 * dato el aviso decía "HTTP 404 en el intento 1" sin nombrar la ruta, y
 * un tropiezo aislado se lee igual que una ruta rota. Con el nombre, dos
 * avisos seguidos de la misma ruta ya son un patrón y no una casualidad.
 */
export async function enCola<T>(tarea: () => Promise<T>, etiqueta = "petición"): Promise<T> {
  let ultimoError: unknown = null;

  for (let intento = 0; intento <= REINTENTOS; intento += 1) {
    await tomarCupo();

    try {
      const resultado = await tarea();

      if (intento < REINTENTOS && convieneReintentar(resultado)) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(
            `[cola] ${etiqueta}: HTTP ${resultado.status} en el intento ${intento + 1} de ` +
              `${REINTENTOS + 1}. Reintentando en ${espera(intento)} ms.\n` +
              "Si el siguiente intento pasa, no hay nada que corregir: es el Web App " +
              "atendiendo otra petición. Si SIEMPRE falla la misma ruta, no es " +
              "concurrencia: republicar con Nueva versión y correr probarRutas().",
          );
        }
        // El cupo se suelta ANTES de dormir: si no, la espera de este
        // reintento sería una pausa para todas las demás rutas.
        liberarCupo();
        await dormir(espera(intento));
        continue;
      }

      liberarCupo();
      return resultado;
    } catch (error) {
      // Un fallo de red, no una respuesta con error. `fetch` solo lanza
      // cuando la petición ni siquiera llegó a completarse.
      ultimoError = error;
      liberarCupo();
      if (intento >= REINTENTOS) break;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn(`[cola] ${etiqueta}: la red falló en el intento ${intento + 1}.`, error);
      }
      await dormir(espera(intento));
    }
  }

  throw (
    ultimoError ??
    new Error(`La ${etiqueta} falló tras ${REINTENTOS + 1} intentos de la cola.`)
  );
}

/**
 * Estado de la cola, para diagnosticar desde la consola.
 *
 * Si `esperando` crece y no baja, algún camino dejó de liberar su cupo y
 * la página se va a quedar a medio cargar.
 */
export function estadoDeLaCola(): { enVuelo: number; esperando: number; maximo: number } {
  return { enVuelo, esperando: esperando.length, maximo: MAX_EN_VUELO };
}