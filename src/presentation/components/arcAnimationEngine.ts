/**
 * arcAnimationEngine.ts
 * -----------------------------------------------------------------------
 * Máquina de estados de la animación de arcos, sin ninguna dependencia de
 * MapLibre/React — mismo principio que arcGeometry.ts. Se testea con reloj
 * inyectado, sin navegador. MapCanvas.tsx solo llama tick() y traduce el
 * resultado a llamadas de MapLibre; nunca decide fases ahí.
 *
 * CASCADA (v3): el presupuesto de la ola ya no es un número propio de
 * este archivo. Antes eran 9.000 ms fijos, contra un paso de timeline de
 * 1.667 ms — el día cambiaba cinco veces antes de que el último arco de
 * la jornada llegara a arrancar, y el backlog crecía hasta reproducirse
 * después de que el timeline había terminado. Ahora sale de
 * animationTiming.ts, donde el paso del timeline y esta cascada se
 * derivan uno del otro:
 *
 *     paso del timeline  =  cascada  +  crecimiento del último arco
 *
 * El intervalo entre entradas se sigue calculando en cada disparo
 * repartiendo ese presupuesto entre lo que quede en cola, con piso y
 * techo: así una jornada de 32 municipios y una de 3 caben ambas en su
 * ventana, sin sentirse simultáneas ni quedar arrastrándose.
 *
 * El arco activo sigue creciendo de forma independiente después de
 * disparar al siguiente — por eso en un momento dado puede haber más de
 * un arco en fase "growing" (el saliente terminando, el entrante
 * empezando), que es el solapamiento suave buscado, no arcos en serie.
 *
 * `justSettled` se puebla en el tick en que un arco individual termina de
 * crecer; `snapTo()` (seek del timeline) no lo puebla ni pasa por la cola
 * — un salto no anima ni tiene "llegada" que notificar.
 * -----------------------------------------------------------------------
 */
import { easeOutCubic } from "./arcGeometry";
import {
  ARC_GROWTH_MS,
  CASCADE_BUDGET_MS,
  CASCADE_STEP_MAX_MS,
  CASCADE_STEP_MIN_MS,
} from "./animationTiming";

export type ArcPhase = "idle" | "queued" | "growing" | "settled";

const GROWTH_DURATION_MS = ARC_GROWTH_MS;
const PULSE_PERIOD_MS = 3200;

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
  /** 0..1, reloj compartido de pulso — todos los arcos asentados comparten
   *  el mismo reloj a propósito, para leerse como un único impulso
   *  recorriendo la red, no como parpadeos independientes. */
  pulseLoopT: number;
}

export function createArcAnimationEngine() {
  const registry = new Map<string, ArcRecord>();

  /** Keys esperando su turno para entrar, en el orden en que se llamó enter(). */
  let queue: string[] = [];
  /** Key del arco cuyo disparo de tiempo activa la entrada del siguiente de la cola. */
  let activeGrowingKey: string | null = null;
  /** Timestamp en el que corresponde disparar al siguiente de la cola. */
  let activeTriggerAt: number | null = null;

  /**
   * Sincroniza el registro contra las claves vivas (según los flujos del
   * corte actual). Claves que ya no existen se eliminan del registro Y de
   * la cola — evita fugas de memoria y evita que la cola intente arrancar
   * un arco que el dataset actual ya no incluye.
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
      const existente = registry.get(key);
      if (!existente) {
        registry.set(key, { key, phase: "idle", enteredAt: null, weight: weights[key] ?? 0 });
      } else {
        existente.weight = weights[key] ?? existente.weight;
      }
    }
  }

  /**
   * Encola la entrada animada de un arco. Si el arco ya no está en
   * "idle" (ya está en cola, creciendo o asentado) no hace nada — evita
   * que un segundo `enter()` accidental lo reencole o reinicie una
   * animación en curso.
   */
  function enter(key: string, now: number, opts: { weight?: number } = {}) {
    const record = registry.get(key);
    if (!record || record.phase !== "idle") return;
    if (opts.weight !== undefined) record.weight = opts.weight;
    record.phase = "queued";
    queue.push(key);
  }

  /**
   * Saca el próximo de la cola y lo pone a crecer.
   *
   * El paso se recalcula en CADA disparo, no una vez por ola: si el
   * timeline sigue metiendo jornadas más rápido de lo que la cola drena,
   * el ritmo se acelera solo para compensar, en vez de quedar congelado
   * al ritmo del primer día y acumular backlog sin techo.
   */
  function advanceQueue(now: number) {
    const stepMs = clamp(
      CASCADE_BUDGET_MS / Math.max(1, queue.length),
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
        activeTriggerAt = now + stepMs;
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
    for (const key of liveKeys) {
      const record = registry.get(key);
      if (!record) continue;
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
    // arranca el primero — cubre el arranque inicial y el caso en que el
    // último disparo ya se asentó sin nadie más por delante.
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
        // crecimiento del activo. Una sola vez: advanceQueue ya cambió
        // activeGrowingKey/activeTriggerAt y la condición deja de
        // cumplirse para este arco en el próximo tick.
        if (record.key === activeGrowingKey && activeTriggerAt !== null && now >= activeTriggerAt) {
          advanceQueue(now);
        }

        if (eased >= 1) {
          record.phase = "settled";
          const frame: ArcFrame = {
            key: record.key,
            phase: "settled",
            sampleFraction: 1,
            weight: record.weight,
          };
          settled.push(frame);
          justSettled.push(frame);
        } else {
          growing.push({
            key: record.key,
            phase: "growing",
            sampleFraction: eased,
            weight: record.weight,
          });
        }
      } else if (record.phase === "settled") {
        settled.push({
          key: record.key,
          phase: "settled",
          sampleFraction: 1,
          weight: record.weight,
        });
      }
    }

    const pulseLoopT = (now % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
    return { growing, settled, justSettled, pulseLoopT };
  }

  return { sync, enter, snapTo, bumpWeight, tick };
}