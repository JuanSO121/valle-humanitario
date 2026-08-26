/**
 * dispatchToastEngine.ts
 * -----------------------------------------------------------------------
 * Motor puro para las notificaciones "llegó un despacho" que se muestran
 * ancladas a un destino en el mapa (ver MapCanvas). Mismo principio que
 * arcAnimationEngine.ts: sin dependencia de MapLibre/React, reloj
 * inyectado, testeable con expect(...) directo, sin navegador.
 * MapCanvas.tsx solo llama spawn()/tick() y traduce el resultado a
 * posición de pantalla vía map.project() — nunca decide fases ni tiempos
 * acá.
 * -----------------------------------------------------------------------
 */

interface ToastRecord {
  id: string;
  destinoId: string;
  destinoNombre: string;
  count: number;
  createdAt: number;
}

const TOAST_LIFETIME_MS = 2600;
const TOAST_ENTER_MS = 220;
const TOAST_EXIT_MS = 260;
/** Si llegan varias notificaciones al mismo destino casi juntas, se apilan en vez de superponerse — pero solo hasta acá, para no tapar el mapa. */
const MAX_STACK_PER_DESTINO = 3;

export interface ToastFrame {
  id: string;
  destinoId: string;
  destinoNombre: string;
  count: number;
  /** 0 = la más reciente. MapCanvas lo usa para el offset vertical del apilado. */
  stackIndex: number;
  /** 0..1 dentro de su fase actual — MapCanvas lo traduce a opacity/scale/translateY. */
  progress: number;
  phase: "entering" | "holding" | "exiting";
}

export function createDispatchToastEngine() {
  let records: ToastRecord[] = [];
  let counter = 0;

  /**
   * Encola una notificación. No hace nada si count <= 0 — evita
   * "notificaciones" vacías por ruido de redondeo o por un re-sync que no
   * trae despachos nuevos de verdad.
   */
  function spawn(destinoId: string, destinoNombre: string, count: number, now: number) {
    if (count <= 0) return;
    counter += 1;
    records.push({ id: `toast-${counter}`, destinoId, destinoNombre, count, createdAt: now });
  }

  /**
   * Devuelve las notificaciones activas en este instante, ya con su fase
   * (entering/holding/exiting), progreso 0..1 dentro de esa fase, y su
   * posición dentro del stack si hay varias en el mismo destino. Purga
   * internamente las que ya vencieron — no hace falta un `dispose()`
   * separado por notificación.
   */
  function tick(now: number): ToastFrame[] {
    records = records.filter((r) => now - r.createdAt < TOAST_LIFETIME_MS);

    const byDestino = new Map<string, ToastRecord[]>();
    for (const r of records) {
      const list = byDestino.get(r.destinoId) ?? [];
      list.push(r);
      byDestino.set(r.destinoId, list);
    }

    const frames: ToastFrame[] = [];
    byDestino.forEach((list) => {
      list
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, MAX_STACK_PER_DESTINO)
        .forEach((r, stackIndex) => {
          const age = now - r.createdAt;
          let phase: ToastFrame["phase"];
          let progress: number;
          if (age < TOAST_ENTER_MS) {
            phase = "entering";
            progress = age / TOAST_ENTER_MS;
          } else if (age < TOAST_LIFETIME_MS - TOAST_EXIT_MS) {
            phase = "holding";
            progress = 1;
          } else {
            phase = "exiting";
            progress = 1 - (age - (TOAST_LIFETIME_MS - TOAST_EXIT_MS)) / TOAST_EXIT_MS;
          }
          frames.push({
            id: r.id,
            destinoId: r.destinoId,
            destinoNombre: r.destinoNombre,
            count: r.count,
            stackIndex,
            progress: Math.max(0, Math.min(1, progress)),
            phase,
          });
        });
    });
    return frames;
  }

  /** Usado al desmontar MapCanvas o al resetear el timeline a fecha nula — vacía el registro sin esperar a que cada notificación venza sola. */
  function clear() {
    records = [];
  }

  return { spawn, tick, clear };
}