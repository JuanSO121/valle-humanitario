/**
 * arcAnimationEngine.ts
 * -----------------------------------------------------------------------
 * Máquina de estados de la animación de arcos, sin ninguna dependencia de
 * MapLibre/React — mismo principio que arcGeometry.ts. Se testea con reloj
 * inyectado (ver arcAnimationEngine.test.ts), sin navegador. MapCanvas.tsx
 * solo llama tick() y traduce el resultado a llamadas de MapLibre; nunca
 * decide fases ahí.
 * -----------------------------------------------------------------------
 */
import { easeOutCubic } from "./arcGeometry";

export type ArcPhase = "idle" | "growing" | "settled";

const GROWTH_DURATION_MS = 900;
const PULSE_PERIOD_MS = 3200;
const STAGGER_WINDOW_MS = 1400;

interface ArcRecord {
  key: string; // `${origenId}::${destinoId}`
  phase: ArcPhase;
  enteredAt: number | null; // timestamp en el que empezó (o debería empezar) a crecer
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
  pulseLoopT: number; // 0..1, reloj compartido de pulso — ver nota de diseño en la conversación:
  // todos los arcos asentados comparten el mismo reloj a propósito, para leerse
  // como un único impulso recorriendo la red, no como parpadeos independientes.
}

/** Delay determinístico de entrada — mismo hash simple que ya usaba `phase` en las sedes del proyecto viejo. */
export function staggerDelay(key: string, weight: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const base = hash % STAGGER_WINDOW_MS;
  // Peso alto entra un poco antes, nunca al revés — regla suave, no dura.
  return Math.max(0, base - Math.min(weight, 20) * 15);
}

export function createArcAnimationEngine() {
  const registry = new Map<string, ArcRecord>();

  /**
   * Sincroniza el registro contra las claves vivas (según flujos o
   * flujosAsOf actuales). Claves que ya no existen se eliminan — evita
   * fugas de memoria si el dataset cambia (ej. al mover el timeline a una
   * fecha que excluye un par que antes existía).
   */
  function sync(liveKeys: string[], weights: Record<string, number>) {
    const live = new Set(liveKeys);
    for (const key of registry.keys()) {
      if (!live.has(key)) registry.delete(key);
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
   * Dispara la entrada animada de un arco. Si el arco ya no está en
   * "idle" (ya está creciendo o ya se asentó) no hace nada — evita que un
   * segundo `enter()` accidental reinicie una animación en curso.
   */
  function enter(key: string, now: number, opts: { weight?: number } = {}) {
    const record = registry.get(key);
    if (!record || record.phase !== "idle") return;
    if (opts.weight !== undefined) record.weight = opts.weight;
    record.phase = "growing";
    record.enteredAt = now + staggerDelay(key, record.weight);
  }

  /**
   * Usado por seek/rebobinar del timeline: todo lo que corresponde a la
   * fecha destino pasa directo a "settled", sin transición. Nunca se
   * anima un salto — ni hacia adelante ni hacia atrás (ver razonamiento
   * en la conversación: encoger una línea ya dibujada se lee como un
   * error visual, no como "retrocedió en el tiempo").
   */
  function snapTo(liveKeys: string[], weights: Record<string, number>, now: number) {
    sync(liveKeys, weights);
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
    const growing: ArcFrame[] = [];
    const settled: ArcFrame[] = [];

    for (const record of registry.values()) {
      if (record.phase === "growing" && record.enteredAt !== null) {
        if (now < record.enteredAt) continue; // aún en su delay de stagger
        const t = (now - record.enteredAt) / GROWTH_DURATION_MS;
        const eased = easeOutCubic(t);
        if (eased >= 1) {
          record.phase = "settled";
          settled.push({ key: record.key, phase: "settled", sampleFraction: 1, weight: record.weight });
        } else {
          growing.push({ key: record.key, phase: "growing", sampleFraction: eased, weight: record.weight });
        }
      } else if (record.phase === "settled") {
        settled.push({ key: record.key, phase: "settled", sampleFraction: 1, weight: record.weight });
      }
    }

    const pulseLoopT = (now % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
    return { growing, settled, pulseLoopT };
  }

  return { sync, enter, snapTo, bumpWeight, tick };
}