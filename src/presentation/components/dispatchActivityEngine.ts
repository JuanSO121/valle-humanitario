/**
 * dispatchActivityEngine.ts
 * -----------------------------------------------------------------------
 * Agrupa llegadas recientes en UNA sola actividad global del mapa.
 *
 * UX:
 * - Nunca crea una tarjeta por municipio.
 * - Agrupa eventos que ocurren cerca en el tiempo.
 * - Muestra el total reciente y cuántos municipios participaron.
 * - La ubicación exacta del evento se comunica mediante arrivalPulseEngine.
 * - El detalle por municipio queda para hover/click, evitando saturación.
 * -----------------------------------------------------------------------
 */

interface ActivityRecord {
  id: string;
  destinoId: string;
  destinoNombre: string;
  count: number;
  createdAt: number;
}

const ACTIVITY_LIFETIME_MS = 2600;
const ACTIVITY_ENTER_MS = 180;
const ACTIVITY_EXIT_MS = 320;

export interface ActivityFrame {
  count: number;
  destinations: number;
  lastDestino: string | null;
  lastCount: number;
  progress: number;
  phase: "entering" | "holding" | "exiting";
}

export function createDispatchActivityEngine() {
  let records: ActivityRecord[] = [];
  let counter = 0;

  function spawn(
    destinoId: string,
    destinoNombre: string,
    count: number,
    now: number,
  ) {
    if (count <= 0) return;

    counter += 1;
    records.push({
      id: `activity-${counter}`,
      destinoId,
      destinoNombre,
      count,
      createdAt: now,
    });
  }

  function tick(now: number): ActivityFrame | null {
    records = records.filter(
      (record) => now - record.createdAt < ACTIVITY_LIFETIME_MS,
    );

    if (records.length === 0) return null;

    const count = records.reduce((sum, record) => sum + record.count, 0);
    const destinations = new Set(records.map((record) => record.destinoId)).size;
    const last = records.reduce((latest, record) =>
      record.createdAt > latest.createdAt ? record : latest,
    );

    const age = now - last.createdAt;

    let phase: ActivityFrame["phase"];
    let progress: number;

    if (age < ACTIVITY_ENTER_MS) {
      phase = "entering";
      progress = age / ACTIVITY_ENTER_MS;
    } else if (age < ACTIVITY_LIFETIME_MS - ACTIVITY_EXIT_MS) {
      phase = "holding";
      progress = 1;
    } else {
      phase = "exiting";
      progress = 1 -
        (age - (ACTIVITY_LIFETIME_MS - ACTIVITY_EXIT_MS)) /
          ACTIVITY_EXIT_MS;
    }

    return {
      count,
      destinations,
      lastDestino: last.destinoNombre,
      lastCount: last.count,
      progress: Math.max(0, Math.min(1, progress)),
      phase,
    };
  }

  function clear() {
    records = [];
  }

  return { spawn, tick, clear };
}