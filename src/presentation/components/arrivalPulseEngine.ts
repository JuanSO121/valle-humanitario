/**
 * arrivalPulseEngine.ts
 * -----------------------------------------------------------------------
 * Reemplaza a dispatchToastEngine.ts. Antes cada "llegó un despacho" era
 * una tarjeta de texto flotante (📦 +N · Municipio) posicionada a mano
 * sobre el mapa — con 40+ municipios eso se apilaba y saturaba la
 * pantalla. Se decidió (ver conversación) ir por mapa de calor + pop:
 * el punto de destino cambia de color (rojo → amarillo → verde) según
 * cuánto acumuló, y acá solo vive el "pop" — un pulso geográfico anclado
 * al punto exacto, sin nombre, sin conteo, sin categoría.
 *
 * Por eso esta interfaz es mucho más chica que la de dispatchToastEngine:
 * no hay stacking (MAX_STACK_PER_DESTINO ya no aplica — el pulso vive en
 * su propia coordenada, dos pulsos en el mismo destino simplemente se
 * dibujan superpuestos y no compiten por espacio en pantalla como hacía
 * el texto). No hay fases entering/holding/exiting tampoco: es una sola
 * curva continua de progreso 0→1 que MapCanvas traduce a radio+opacidad
 * de un anillo que crece y se desvanece.
 *
 * Sin dependencia de MapLibre/React, reloj inyectado, testeable con
 * expect(...) directo — mismo criterio que el resto del motor.
 * -----------------------------------------------------------------------
 */

interface PulseRecord {
  id: string;
  destinoId: string;
  createdAt: number;
}

/** Vida del anillo. Corto a propósito: es un "pop" puntual, no una notificación que hay que leer — con muchos destinos "pop-eando" a la vez, uno que se queda vivo mucho tiempo empieza a leerse como acumulación otra vez. */
const PULSE_LIFETIME_MS = 700;

export interface ArrivalPulseFrame {
  id: string;
  destinoId: string;
  /** 0 = recién nacido, 1 = a punto de desaparecer. MapCanvas lo traduce a radio/opacidad del anillo. */
  progress: number;
}

export function createArrivalPulseEngine() {
  let records: PulseRecord[] = [];
  let counter = 0;

  /** Dispara un pulso en un destino. No agrupa ni filtra por destino repetido a propósito — cada arco que toca (o cada weight-bump) es un evento geográfico independiente; si caen varios casi juntos en el mismo punto, se ven como el mismo anillo reforzándose, no como ruido apilado (a diferencia del texto, que si necesitaba MAX_STACK_PER_DESTINO). */
  function spawn(destinoId: string, now: number) {
    counter += 1;
    records.push({ id: `pulse-${counter}`, destinoId, createdAt: now });
  }

  /** Purga los vencidos y devuelve el progreso de los vivos. Sin dispose() aparte, igual que el motor de toasts que reemplaza. */
  function tick(now: number): ArrivalPulseFrame[] {
    records = records.filter((r) => now - r.createdAt < PULSE_LIFETIME_MS);
    return records.map((r) => ({
      id: r.id,
      destinoId: r.destinoId,
      progress: Math.max(0, Math.min(1, (now - r.createdAt) / PULSE_LIFETIME_MS)),
    }));
  }

  /** Usado al desmontar MapCanvas o al apagar/seekear el timeline — mismo criterio que dispatchToastEngine.clear(). */
  function clear() {
    records = [];
  }

  return { spawn, tick, clear };
}