/**
 * Timeline.tsx
 * -----------------------------------------------------------------------
 * Componente de presentación puro: no decide fases ni construye fechas —
 * solo recibe la lista de fechas disponibles y el valor actual, y avisa
 * hacia arriba (onSeek/onAdvance/onTogglePlay) qué pasó. La distinción
 * seek-vs-advance que ya está en viewState.ts (seekTimeline nunca anima,
 * advanceTimeline sí) se preserva acá: arrastrar el handle llama
 * onSeek(), el intervalo de reproducción automática llama onAdvance().
 * Mismo principio que MapCanvas/arcAnimationEngine: la lógica de tiempo
 * vive en un solo lugar (el intervalo de abajo), el resto es traducción.
 * -----------------------------------------------------------------------
 */
import { useEffect, useRef, useState } from "react";

const PLAYBACK_STEP_MS = 650;

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

  const currentIndex = currentDate ? dates.indexOf(currentDate) : -1;
  const atEnd = currentIndex >= 0 && currentIndex === dates.length - 1;

  // El intervalo de reproducción vive acá, no en un módulo aparte: es
  // puramente "cada X ms, avanzar un índice", sin ramas ni estados
  // adicionales que valga la pena testear fuera del navegador — a
  // diferencia del motor de arcos, no hay riesgo de estados cruzados.
  useEffect(() => {
    if (!playing) {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(() => {
      const idx = currentDate ? dates.indexOf(currentDate) : -1;
      const next = dates[idx + 1];
      if (next === undefined) {
        setPlaying(false);
        return;
      }
      onAdvance(next);
    }, PLAYBACK_STEP_MS);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dates/currentDate se leen frescos dentro del tick, no hace falta reiniciar el interval por cada cambio de fecha.
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