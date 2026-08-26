/**
 * viewState.ts
 * -----------------------------------------------------------------------
 * Estado de navegación del dashboard. El clic puede caer sobre un punto
 * de ORIGEN (muestra sus flujos salientes) o sobre un punto de DESTINO
 * (muestra sus flujos entrantes) — son mutuamente excluyentes: nunca hay
 * `origenId` y `destinoId` seteados a la vez. No es una unión discriminada
 * real a nivel de tipos (seguiría permitiendo, en teoría, setear ambos
 * campos a mano) — la exclusión la garantizan las funciones de
 * `viewTransitions`, que siempre limpian el otro campo al setear uno.
 *
 * `timelineDate` vive en este mismo estado (no en un estado aparte) a
 * propósito: el modo timeline y la selección de origen/destino son
 * ortogonales (se puede tener una selección abierta MIENTRAS se
 * reproduce el timeline), pero ambos son "qué está mirando la persona
 * ahora mismo" — separarlos en dos fuentes de estado independientes
 * abriría la puerta a que queden desincronizados entre sí durante un
 * re-render.
 * -----------------------------------------------------------------------
 */

export type ViewLevel = "ALL" | "ORIGEN" | "DESTINO";

export interface ViewState {
  level: ViewLevel;
  destinoId: string | null;
  /** Punto de ORIGEN seleccionado — excluyente con destinoId (ver viewTransitions). */
  origenId: string | null;
  /** null = modo estático (comportamiento por defecto, sin timeline activo). */
  timelineDate: string | null;
  /** true en el frame inmediatamente después de un seek/rebobinar — le dice a MapCanvas que no anime esa transición. Se resetea a false por viewTransitions.clearInstantFlag. */
  timelineInstant: boolean;
}

export const INITIAL_VIEW_STATE: ViewState = {
  level: "ALL",
  destinoId: null,
  origenId: null,
  timelineDate: null,
  timelineInstant: false,
};

export const viewTransitions = {
  /** Click en un destino — muestra sus flujos entrantes (de dónde vino lo que llegó ahí). */
  toDestino(destinoId: string, prev: ViewState): ViewState {
    return { ...prev, level: "DESTINO", destinoId, origenId: null };
  },

  /** Click en un origen — muestra sus flujos salientes (a dónde se distribuyó desde ahí). */
  toOrigen(origenId: string, prev: ViewState): ViewState {
    return { ...prev, level: "ORIGEN", origenId, destinoId: null };
  },

  /** Click en vacío / reset — sin selección, sin arcos (ver MapCanvas: flujos=[] no dibuja nada). */
  toAll(prev: ViewState): ViewState {
    return { ...prev, level: "ALL", destinoId: null, origenId: null };
  },

  /** Arrancar o reanudar la reproducción — primer frame, se trata como salto instantáneo a esa fecha. */
  startTimeline(fromDate: string, prev: ViewState): ViewState {
    return { ...prev, timelineDate: fromDate, timelineInstant: true };
  },

  /** Avance automático (play) — nunca instantáneo, MapCanvas debe animar la entrada de arcos nuevos. */
  advanceTimeline(toDate: string, prev: ViewState): ViewState {
    return { ...prev, timelineDate: toDate, timelineInstant: false };
  },

  /** Arrastrar el handle o tocar un tick — siempre instantáneo (ver conversación: nunca se anima un seek). */
  seekTimeline(toDate: string, prev: ViewState): ViewState {
    return { ...prev, timelineDate: toDate, timelineInstant: true };
  },

  /** Salir del modo timeline y volver al estado estático (todos los flujos completos, sin fecha). */
  exitTimeline(prev: ViewState): ViewState {
    return { ...prev, timelineDate: null, timelineInstant: false };
  },

  /** Llamar después de que MapCanvas ya consumió un frame instantáneo, para que el siguiente avance sí anime. */
  clearInstantFlag(prev: ViewState): ViewState {
    return prev.timelineInstant ? { ...prev, timelineInstant: false } : prev;
  },
};