/**
 * dispatchToastEngine.ts
 * -----------------------------------------------------------------------
 * Motor puro para las notificaciones "llegó un despacho" que se muestran
 * ancladas a un destino en el mapa (ver MapCanvas). Sin dependencia de
 * MapLibre/React, reloj inyectado, testeable con expect(...) directo.
 * MapCanvas.tsx solo llama spawn()/tick() y traduce el resultado a
 * posición + ícono en pantalla — nunca decide fases ni tiempos acá.
 *
 * ÍCONO POR CATEGORÍA: el motor NO conoce la lista de categorías ni sus
 * íconos — eso es una decisión de presentación (igual que color/glyph),
 * así que vive en MapCanvas, no acá. Este archivo solo transporta
 * `categoria` desde spawn() hasta el ToastFrame, de punta a punta, sin
 * interpretarla. HOY nadie llama spawn() con una categoría real —
 * `Flujo` (entities.ts) no trae ese campo, solo existe en
 * `DespachoLogistico.categoriaPrincipal` (endpoint destino-logistica, por
 * destino individual) — así que en la práctica `categoria` llega `null`
 * y MapCanvas cae en el ícono genérico. El día que route=flujos incluya
 * categoría por despacho, alcanza con pasarla acá; no hace falta tocar
 * este motor.
 * -----------------------------------------------------------------------
 */

interface ToastRecord {
  id: string;
  destinoId: string;
  destinoNombre: string;
  count: number;
  categoria: string | null;
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
  /** Categoría cruda del despacho, o null si no está disponible (ver nota de arriba). MapCanvas la traduce a ícono. */
  categoria: string | null;
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
   * trae despachos nuevos de verdad. `categoria` es opcional a propósito:
   * ver nota de cabecera, hoy ningún caller la tiene disponible.
   */
  function spawn(destinoId: string, destinoNombre: string, count: number, now: number, categoria: string | null = null) {
    if (count <= 0) return;
    counter += 1;
    records.push({ id: `toast-${counter}`, destinoId, destinoNombre, count, categoria, createdAt: now });
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
            categoria: r.categoria,
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