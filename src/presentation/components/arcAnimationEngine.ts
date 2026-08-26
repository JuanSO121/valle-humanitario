/**
 * arcAnimationEngine.ts
 * -----------------------------------------------------------------------
 * Máquina de estados de la animación de arcos, sin ninguna dependencia de
 * MapLibre/React — mismo principio que arcGeometry.ts. Se testea con reloj
 * inyectado, sin navegador. MapCanvas.tsx solo llama tick() y traduce el
 * resultado a llamadas de MapLibre; nunca decide fases ahí.
 *
 * CAMBIO (v2, sobre la cascada secuencial ya existente): el disparo del
 * siguiente arco de la cola dejó de depender de que el arco activo
 * cruzara el 50% de SU crecimiento (fijo en ~450ms, sin importar cuántos
 * arcos hubiera en cola). Con datasets grandes (40+ municipios) ese
 * intervalo fijo hacía que las líneas se empezaran a solapar
 * prematuramente — muchas creciendo a la vez, otra vez ilegible, aunque
 * ya no fuera simultáneo puro.
 *
 * Ahora el intervalo entre entradas se calcula UNA vez por "ola" de
 * cascada (cuando la cola pasa de vacía a tener algo, con nadie creciendo
 * activamente): se reparte un presupuesto total objetivo
 * (`CASCADE_TOTAL_BUDGET_MS`) entre la cantidad de arcos que hay en cola
 * en ese momento, con un piso (`CASCADE_STEP_MIN_MS`) para que nunca se
 * sientan simultáneos incluso con muchísimos arcos, y un techo
 * (`CASCADE_STEP_MAX_MS`) para que con pocos arcos el ritmo siga siendo
 * el "entra el siguiente cuando el anterior va como a la mitad" que se
 * pidió originalmente. Así 5 municipios y 45 municipios entran ambos en
 * un tiempo total razonable, sin ventana de entrada que se dispare a
 * 20+ segundos ni se comprima tanto que vuelva a verse caótico.
 *
 * El arco activo sigue creciendo de forma independiente después de
 * disparar al siguiente — por eso en un momento dado puede haber más de
 * un arco en fase "growing" (el saliente terminando, el entrante
 * empezando), que es el efecto de solapamiento suave que se pidió, no
 * arcos completamente en serie uno-espera-al-otro.
 *
 * `justSettled` sigue funcionando igual que antes: se puebla el tick en
 * que un arco individual termina de crecer, y `snapTo()` (seek del
 * timeline) sigue sin poblarlo ni pasar por la cola — un salto no anima
 * ni tiene "llegada" que notificar.
 * -----------------------------------------------------------------------
 */
import { easeOutCubic } from "./arcGeometry";

export type ArcPhase = "idle" | "queued" | "growing" | "settled";

const GROWTH_DURATION_MS = 900;
const PULSE_PERIOD_MS = 3200;

/** Presupuesto total objetivo para que toda una "ola" de cascada (todos los arcos encolados juntos) termine de arrancar. No es cuánto tarda en asentarse todo — es cuánto tarda en que el ÚLTIMO arco empiece a crecer. */
const CASCADE_TOTAL_BUDGET_MS = 9000;
/** Piso del intervalo entre entradas — con muchos arcos en cola, nunca debería sentirse instantáneo/simultáneo. */
const CASCADE_STEP_MIN_MS = 180;
/** Techo del intervalo entre entradas — con pocos arcos, mantiene el ritmo "entra el siguiente a la mitad del anterior" que ya se sentía bien antes. */
const CASCADE_STEP_MAX_MS = 450;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface ArcRecord {
  key: string; // `${origenId}::${destinoId}`
  phase: ArcPhase;
  enteredAt: number | null; // timestamp en el que empezó a crecer (null si aún no le toca)
  weight: number; // despachosCount actual — puede subir sin regrow
}

export interface ArcFrame {
  key: string;
  phase: ArcPhase;
  sampleFraction: number; // 0..1 — fracción de ARC_SAMPLES a renderizar si "growing"
  weight: number;
}

export interface EngineFrame {
  growing: ArcFrame[];
  settled: ArcFrame[];
  /**
   * Arcos que TERMINARON de crecer justo en este tick — evento puntual,
   * no acumulado (a diferencia de `settled`, que siempre trae TODOS los
   * arcos ya asentados). Un arco aparece acá una única vez, en el frame
   * exacto en que su `sampleFraction` llega a 1. `snapTo()` nunca lo
   * puebla.
   */
  justSettled: ArcFrame[];
  pulseLoopT: number; // 0..1, reloj compartido de pulso — todos los arcos asentados
  // comparten el mismo reloj a propósito, para leerse como un único impulso
  // recorriendo la red, no como parpadeos independientes.
}

export function createArcAnimationEngine() {
  const registry = new Map<string, ArcRecord>();

  /** Keys esperando su turno para entrar, en el orden en que se llamó enter(). */
  let queue: string[] = [];
  /** Key del arco cuyo disparo de tiempo activa la entrada del siguiente de la cola. null = nadie creciendo activamente en ese rol. */
  let activeGrowingKey: string | null = null;
  /** Timestamp en el que corresponde disparar al siguiente de la cola (enteredAt del activo + cascadeStepMs de esta ola). null si no hay nadie activo. */
  let activeTriggerAt: number | null = null;
  /** Intervalo de esta ola de cascada, fijado al arrancarla y constante durante toda la ola (ver comentario de cabecera). null = no hay ola en curso, toca recalcular en el próximo advanceQueue. */
  let cascadeStepMs: number | null = null;

  /**
   * Sincroniza el registro contra las claves vivas (según flujos o
   * flujosAsOf actuales). Claves que ya no existen se eliminan del
   * registro Y de la cola — evita fugas de memoria y evita que la cola
   * intente arrancar un arco que el dataset actual ya no incluye (ej. al
   * mover el timeline a una fecha que excluye un par que antes existía).
   */
  function sync(liveKeys: string[], weights: Record<string, number>) {
    const live = new Set(liveKeys);
    for (const key of registry.keys()) {
      if (!live.has(key)) registry.delete(key);
    }
    queue = queue.filter((key) => live.has(key));
    if (activeGrowingKey !== null && !live.has(activeGrowingKey)) {
      activeGrowingKey = null;
      activeTriggerAt = null;
    }

    for (const key of liveKeys) {
      if (!registry.has(key)) {
        registry.set(key, { key, phase: "idle", enteredAt: null, weight: weights[key] ?? 0 });
      } else {
        registry.get(key)!.weight = weights[key] ?? registry.get(key)!.weight;
      }
    }
  }

  /**
   * Encola la entrada animada de un arco. Si el arco ya no está en
   * "idle" (ya está en cola, creciendo o ya se asentó) no hace nada —
   * evita que un segundo `enter()` accidental lo vuelva a encolar o
   * reinicie una animación en curso.
   */
  function enter(key: string, now: number, opts: { weight?: number } = {}) {
    const record = registry.get(key);
    if (!record || record.phase !== "idle") return;
    if (opts.weight !== undefined) record.weight = opts.weight;
    record.phase = "queued";
    queue.push(key);
    // Si no hay nadie creciendo activamente, este arco puede arrancar ya
    // mismo en el próximo tick (ver `tick()`) — no hace falta esperar un
    // trigger, eso es solo lo que dispara al SIGUIENTE una vez arrancado.
  }

  /**
   * Saca el próximo de la cola y lo pone a crecer. Si la cola queda
   * vacía, activeGrowingKey pasa a null y se resetea cascadeStepMs — la
   * próxima ola recalcula su propio presupuesto en vez de heredar el de
   * esta. Salta keys que hayan quedado obsoletas por un sync() intermedio.
   */
    function advanceQueue(now: number) {
      // Recalcula el paso en CADA disparo, no solo al arrancar una ola desde
      // cola vacía. Si el timeline sigue metiendo días nuevos más rápido de
      // lo que la cola logra drenar, esto acelera el ritmo para compensar —
      // en vez de quedarse congelado al ritmo (lento) que tenía la ola del
      // primer día, que es lo que hacía que el backlog creciera sin techo y
      // terminara reproduciéndose minutos después de que el timeline ya
      // había terminado de avanzar.
      cascadeStepMs = clamp(
        CASCADE_TOTAL_BUDGET_MS / Math.max(1, queue.length + 1),
        CASCADE_STEP_MIN_MS,
        CASCADE_STEP_MAX_MS,
      );

      let nextKey = queue.shift();
      while (nextKey !== undefined) {
        const record = registry.get(nextKey);
        if (record && record.phase === "queued") {
          record.phase = "growing";
          record.enteredAt = now;
          activeGrowingKey = nextKey;
          activeTriggerAt = now + cascadeStepMs;
          return;
        }
        nextKey = queue.shift();
      }
      activeGrowingKey = null;
      activeTriggerAt = null;
    }

  /**
   * Usado por seek/rebobinar del timeline: todo lo que corresponde a la
   * fecha destino pasa directo a "settled", sin transición ni cola —
   * nunca se anima un salto, ni hacia adelante ni hacia atrás (encoger
   * una línea ya dibujada se lee como un error visual, no como
   * "retrocedió en el tiempo"). Por eso limpia la cola: un seek no debe
   * dejar arranques pendientes de un estado que ya no existe.
   */
  function snapTo(liveKeys: string[], weights: Record<string, number>, now: number) {
    sync(liveKeys, weights);
    queue = [];
    activeGrowingKey = null;
    activeTriggerAt = null;
    cascadeStepMs = null;
    for (const key of liveKeys) {
      const record = registry.get(key)!;
      record.phase = "settled";
      record.enteredAt = now;
    }
  }

  /** Sube el peso de un arco ya asentado sin reanimarlo (línea que engorda, no que vuelve a crecer). */
  function bumpWeight(key: string, weight: number) {
    const record = registry.get(key);
    if (record) record.weight = weight;
  }

  function tick(now: number): EngineFrame {
    // Si nadie está en el rol de "activo" pero hay cola esperando,
    // arranca el primero — cubre tanto el arranque inicial (nada
    // creciendo todavía) como el caso en que el último disparo ya settled
    // sin que quedara nadie más por delante.
    if (activeGrowingKey === null && queue.length > 0) {
      advanceQueue(now);
    }

    const growing: ArcFrame[] = [];
    const settled: ArcFrame[] = [];
    const justSettled: ArcFrame[] = [];

    for (const record of registry.values()) {
      if (record.phase === "growing" && record.enteredAt !== null) {
        if (now < record.enteredAt) continue;
        const t = (now - record.enteredAt) / GROWTH_DURATION_MS;
        const eased = easeOutCubic(t);

        // Dispara al siguiente de la cola por TIEMPO, no por fracción de
        // crecimiento del activo — ver comentario de cabecera. Solo una
        // vez: advanceQueue ya cambió activeGrowingKey/activeTriggerAt y
        // esta condición deja de cumplirse para este arco en el próximo tick.
        if (record.key === activeGrowingKey && activeTriggerAt !== null && now >= activeTriggerAt) {
          advanceQueue(now);
        }

        if (eased >= 1) {
          record.phase = "settled";
          const frame: ArcFrame = { key: record.key, phase: "settled", sampleFraction: 1, weight: record.weight };
          settled.push(frame);
          justSettled.push(frame);
        } else {
          growing.push({ key: record.key, phase: "growing", sampleFraction: eased, weight: record.weight });
        }
      } else if (record.phase === "settled") {
        settled.push({ key: record.key, phase: "settled", sampleFraction: 1, weight: record.weight });
      }
    }

    const pulseLoopT = (now % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
    return { growing, settled, justSettled, pulseLoopT };
  }

  return { sync, enter, snapTo, bumpWeight, tick };
}