/**
 * Timeline.tsx
 * -----------------------------------------------------------------------
 * Control de jornadas del mapa. Componente de presentación puro: recibe
 * las fechas disponibles y la actual, y avisa hacia arriba qué pasó.
 *
 * La reproducción NUNCA arranca sola. El mapa carga con las rutas ya
 * dibujadas y solo se anima si la persona toca reproducir.
 *
 * El paso entre jornadas sale de animationTiming.ts, el mismo módulo del
 * que sale el presupuesto de la cascada de arcos. Una jornada dura lo
 * que tarda su último arco en salir y llegar, así que las líneas siempre
 * alcanzan a completarse antes de que cambie el día.
 *
 * Seek contra advance, la distinción que ya vive en viewState.ts:
 *   · Reproducir o avanzar un día llama a onAdvance, que anima.
 *   · Arrastrar varios días llama a onSeek, que salta sin animar.
 *     Animar un salto de seis días se lee como un error visual.
 *
 * El efecto del intervalo depende solo de [playing]. Eso deja la función
 * del tick con las props del momento en que arrancó, así que dates y
 * currentDate se leen desde refs que se actualizan en cada render. Sin
 * eso, cada tick recalcula el siguiente de la misma fecha inicial y la
 * reproducción avanza una vez y se traba.
 * -----------------------------------------------------------------------
 */
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { computeTimelineStepMs } from "./animationTiming";

interface Props {
  /** Fechas ISO únicas y ordenadas, derivadas de flujos[].porFecha en el padre. */
  dates: string[];
  /** Fecha actual, o null si el mapa muestra el total. */
  currentDate: string | null;
  onSeek: (date: string) => void;
  onAdvance: (date: string) => void;
  onActivate: (firstDate: string) => void;
  onExit: () => void;
}

export function Timeline({ dates, currentDate, onSeek, onAdvance, onActivate, onExit }: Props) {
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const datesRef = useRef(dates);
  datesRef.current = dates;
  const currentDateRef = useRef(currentDate);
  currentDateRef.current = currentDate;

  const currentIndex = currentDate ? dates.indexOf(currentDate) : -1;
  const activo = currentIndex >= 0;
  const alFinal = activo && currentIndex === dates.length - 1;

  useEffect(() => {
    if (currentDate === null) setPlaying(false);
  }, [currentDate]);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dates y currentDate se leen frescos vía ref dentro del tick; reiniciar el intervalo en cada fecha se vería entrecortado.
  }, [playing]);

  const alternarReproduccion = () => {
    if (!activo && dates.length > 0) {
      const primera = dates[0];
      if (primera !== undefined) onActivate(primera);
    } else if (alFinal) {
      const primera = dates[0];
      if (primera !== undefined) onSeek(primera);
    }
    setPlaying((v) => !v);
  };

  const handleScrub = (event: ChangeEvent<HTMLInputElement>) => {
    setPlaying(false);
    const index = Number(event.target.value);
    const date = dates[index];
    if (date === undefined) return;
    if (!activo) onActivate(date);
    else if (index === currentIndex + 1) onAdvance(date);
    else onSeek(date);
  };

  if (dates.length === 0) return null;

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-surface/95 px-4 py-2.5 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={alternarReproduccion}
        aria-label={playing ? "Pausar" : "Reproducir día por día"}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-90"
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="5" y="4" width="5" height="16" rx="1" />
            <rect x="14" y="4" width="5" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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
        aria-label="Día"
        className="h-1.5 w-44 shrink-0 accent-foreground md:w-72"
      />

      <span
        className="min-w-[6rem] shrink-0 text-center text-sm font-semibold tabular-nums text-foreground"
        aria-live="polite"
      >
        {currentDate ?? dates[0]}
      </span>

      {activo && (
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            onExit();
          }}
          className="ml-1 shrink-0 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver todo
        </button>
      )}
    </div>
  );
}