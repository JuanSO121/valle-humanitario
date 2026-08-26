/**
 * TimelineStatsHUD.tsx
 * -----------------------------------------------------------------------
 * El número "primera plana" del timeline: total acumulado de despachos a
 * la fecha actual, con un "+N" que aparece un instante cuando avanza. El
 * delta NO se muestra en un seek/salto (prop `instant`) — mismo criterio
 * que ya usa viewState.timelineInstant y que usan las notificaciones por
 * destino en MapCanvas: un salto no es un evento nuevo que anunciar.
 *
 * Las burbujas de MapCanvas (dispatchToastEngine) cubren el "a dónde
 * llegó"; este HUD cubre el "cuánto en total", que no tiene una ubicación
 * geográfica natural para anclar en el mapa.
 * -----------------------------------------------------------------------
 */
import { useEffect, useRef, useState } from "react";

interface Props {
  /** Suma de despachosCount de los flujos visibles a la fecha actual del timeline (flujosParaMapa en DashboardPage). */
  totalDespachos: number;
  totalToneladas: number;
  /** null = timeline inactivo — el HUD no se muestra. */
  currentDate: string | null;
  /** Espeja viewState.timelineInstant: true en el frame inmediatamente después de un seek/rebobinar. */
  instant: boolean;
}

const DELTA_VISIBLE_MS = 1800;

export function TimelineStatsHUD({ totalDespachos, totalToneladas, currentDate, instant }: Props) {
  const prevTotalRef = useRef<number | null>(null);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    const prev = prevTotalRef.current;
    prevTotalRef.current = totalToneladas;

    // Primer render con timeline activo, o un seek: no hay "avance" que
    // anunciar, así que no se muestra delta (evita un "+N" falso al
    // activar el timeline o al arrastrar el handle hacia atrás).
    if (prev === null || instant) {
      setDelta(0);
      return;
    }

    const diff = totalToneladas - prev;
    if (diff <= 0) {
      setDelta(0);
      return;
    }
    setDelta(diff);
    const timeout = setTimeout(() => setDelta(0), DELTA_VISIBLE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- instant solo decide si ESTE cambio de total cuenta como avance; no debe reiniciar el timer de un delta ya en pantalla por otro motivo.
  }, [totalToneladas]);

  // Timeline apagado: nada que mostrar. Reseteamos el estado de "avance
  // previo" para que, si se vuelve a activar el timeline más adelante en
  // la sesión, no aparezca un delta espurio comparando contra el último
  // total visto la vez anterior.
  useEffect(() => {
    if (currentDate === null) {
      prevTotalRef.current = null;
      setDelta(0);
    }
  }, [currentDate]);

  if (!currentDate) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[calc(1rem+env(safe-area-inset-top))] z-10 flex justify-center px-4"
      aria-live="polite"
    >
      <div className="flex items-baseline gap-2 rounded-full border border-border bg-surface/95 px-4 py-1.5 shadow-sm backdrop-blur">
        <span className="font-display text-xl font-semibold tabular-nums text-foreground">
          {totalToneladas.toLocaleString("es-CO")}
        </span>
        <span className="label-caps text-[10px]">toneladas est. al {currentDate}</span>
        {delta > 0 && (
          <span
            key={`${currentDate}-${delta}`}
            className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary"
            style={{ animation: "toast-pop 260ms cubic-bezier(0.16,1,0.3,1) both" }}
          >
            +{delta.toLocaleString("es-CO")} t
          </span>
        )}
        <span className="hidden text-[11px] tabular-nums text-muted-foreground sm:inline">
          {totalDespachos.toLocaleString("es-CO")} despachos
        </span>
      </div>
    </div>
  );
}
