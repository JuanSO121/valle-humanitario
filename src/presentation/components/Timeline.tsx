/**
 * Timeline.tsx
 * -----------------------------------------------------------------------
 * Componente de presentación puro: no decide fases ni construye fechas —
 * solo recibe la lista de fechas disponibles y el valor actual, y avisa
 * hacia arriba (onSeek/onAdvance) qué pasó. La distinción seek-vs-advance
 * que ya está en viewState.ts (seekTimeline nunca anima, advanceTimeline
 * sí) se preserva acá: arrastrar el handle llama onSeek(), el intervalo
 * de reproducción automática llama onAdvance().
 *
 * VELOCIDAD: el paso ya no se calcula acá. Antes repartía 20 s entre las
 * fechas, lo que con el dataset real daba 1.667 ms por jornada — mientras
 * la cascada de arcos necesitaba 9.000 ms solo para arrancar el último
 * arco del día. El día cambiaba cinco veces antes de que las líneas
 * llegaran. Ahora el paso sale de animationTiming.ts, que es el mismo
 * módulo del que sale el presupuesto de la cascada: una jornada dura lo
 * que tarda su último arco en salir y llegar.
 *
 * FIX (bug "el timeline se queda pegado en la segunda fecha"): el efecto
 * que arma el `setInterval` depende solo de `[playing]` a propósito —
 * cada play/pause reinicia el conteo desde cero, en vez de reiniciar el
 * intervalo en CADA cambio de fecha, lo que se vería entrecortado. Pero
 * eso significa que la función del intervalo se crea UNA sola vez por
 * play, con el `dates`/`currentDate` de ESE momento capturados por
 * closure. Por eso ambos se leen desde un `ref` que se actualiza en cada
 * render: el intervalo vive lo mismo, pero cada tick lee el valor de
 * verdad más reciente.
 *
 * NOTA aparte (no es un bug de este archivo): si en desarrollo el
 * timeline solo avanza limpiando la caché del navegador, es casi seguro
 * Fast Refresh de Vite — agregar/quitar refs cambia la forma de los
 * hooks, y puede quedar vivo un closure viejo hasta un reload completo
 * (Ctrl+Shift+R).
 * -----------------------------------------------------------------------
 */
import { useEffect, useRef, useState } from "react";
import { computeTimelineStepMs } from "./animationTiming";

interface Props {
  /** Fechas ISO únicas y ordenadas — normalmente derivadas de flujos[].porFecha en el padre. */
  dates: string[];
  /** Fecha actual del playhead, o null si el timeline no está activo todavía. */
  currentDate: string | null;
  onSeek: (date: string) => void;
  onAdvance: (date: string) => void;
  /** Se llama con la primera fecha disponible cuando el timeline pasa de inactivo a activo. */
  onActivate: (firstDate: string) => void;
  onExit: () => void;
}

export function Timeline({ dates, currentDate, onSeek, onAdvance, onActivate, onExit }: Props) {
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Espejo por ref de los props que el intervalo necesita leer FRESCOS en
  // cada tick, sin que queden fijos al closure del momento en que arrancó
  // `setInterval` (ver comentario largo arriba).
  const datesRef = useRef(dates);
  datesRef.current = dates;
  const currentDateRef = useRef(currentDate);
  currentDateRef.current = currentDate;

  const currentIndex = currentDate ? dates.indexOf(currentDate) : -1;
  const atEnd = currentIndex >= 0 && currentIndex === dates.length - 1;

  useEffect(() => {
    if (currentDate === null) setPlaying(false);
  }, [currentDate]);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    // El paso se fija UNA vez al arrancar la reproducción — no dentro del
    // tick (reiniciaría el timer en cada avance) ni en las deps del
    // efecto (reiniciaría el conteo en cada cambio de fecha).
    const stepMs = computeTimelineStepMs(datesRef.current.length);
    intervalRef.current = setInterval(() => {
      const freshDates = datesRef.current;
      const freshCurrent = currentDateRef.current;
      const idx = freshCurrent ? freshDates.indexOf(freshCurrent) : -1;
      const next = freshDates[idx + 1];
      if (next === undefined) {
        setPlaying(false);
        return;
      }
      onAdvance(next);
    }, stepMs);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dates/currentDate se leen frescos vía ref dentro del tick (ver arriba); no hace falta reiniciar el interval por cada cambio de fecha.
  }, [playing]);

  const handleTogglePlay = () => {
    if (!currentDate && dates.length > 0) {
      const first = dates[0];
      if (first !== undefined) onActivate(first);
    }
    if (atEnd) {
      const first = dates[0];
      if (first !== undefined) onSeek(first); // reiniciar desde el principio al llegar al final
    }
    setPlaying((v) => !v);
  };

  const handleScrub = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPlaying(false);
    const idx = Number(event.target.value);
    const date = dates[idx];
    if (date !== undefined) onSeek(date);
  };

  if (dates.length === 0) return null;

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-surface/95 px-4 py-2 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={handleTogglePlay}
        aria-label={playing ? "Pausar reproducción" : "Reproducir por fecha"}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
      >
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="5" y="4" width="5" height="16" />
            <rect x="14" y="4" width="5" height="16" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M6 4l14 8-14 8V4z" />
          </svg>
        )}
      </button>

      <input
        type="range"
        min={0}
        max={dates.length - 1}
        step={1}
        value={currentIndex >= 0 ? currentIndex : 0}
        onChange={handleScrub}
        aria-label="Fecha del timeline"
        className="h-1 w-40 shrink-0 accent-foreground md:w-64"
      />

      <span className="min-w-[5.5rem] shrink-0 font-mono text-xs text-muted-foreground">
        {currentDate ?? dates[0]}
      </span>

      <button
        type="button"
        onClick={() => {
          setPlaying(false);
          onExit();
        }}
        aria-label="Salir del modo timeline"
        className="ml-1 shrink-0 text-xs text-muted-foreground hover:text-foreground"
      >
        Ver todo
      </button>
    </div>
  );
}