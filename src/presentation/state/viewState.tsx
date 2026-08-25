/**
 * viewState.ts
 * -----------------------------------------------------------------------
 * Estado de navegación del dashboard. A diferencia del proyecto viejo
 * (ALL → MUNICIPALITY → SITE, dos niveles porque el clic caía sobre un
 * polígono de municipio o una sede individual), acá el clic es directo
 * sobre un destino — no hay agrupación geográfica intermedia — así que
 * el nivel es un solo booleano de hecho, modelado como unión discriminada
 * para que sea imposible tener `destinoId` seteado en nivel "ALL".
 *
 * `timelineDate` vive en este mismo estado (no en un estado aparte) a
 * propósito: el modo timeline y la selección de destino son ortogonales
 * (se puede tener un destino abierto MIENTRAS se reproduce el timeline),
 * pero ambos son "qué está mirando la persona ahora mismo" — separarlos
 * en dos fuentes de estado independientes abriría la puerta a que queden
 * desincronizados entre sí durante un re-render.
 * -----------------------------------------------------------------------
 */

export type ViewLevel = "ALL" | "DESTINO";

export interface ViewState {
  level: ViewLevel;
  destinoId: string | null;
  /** null = modo estático (comportamiento por defecto, sin timeline activo). */
  timelineDate: string | null;
  /** true en el frame inmediatamente después de un seek/rebobinar — le dice a MapCanvas que no anime esa transición. Se resetea a false por viewTransitions.tickTimeline. */
  timelineInstant: boolean;
}

export const INITIAL_VIEW_STATE: ViewState = {
  level: "ALL",
  destinoId: null,
  timelineDate: null,
  timelineInstant: false,
};

export const viewTransitions = {
  toDestino(destinoId: string, prev: ViewState): ViewState {
    return { ...prev, level: "DESTINO", destinoId };
  },

  toAll(prev: ViewState): ViewState {
    return { ...prev, level: "ALL", destinoId: null };
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