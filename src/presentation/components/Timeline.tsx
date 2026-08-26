/**
 * Timeline.tsx
 * -----------------------------------------------------------------------
 * Componente de presentación puro: no decide fases ni construye fechas —
 * solo recibe la lista de fechas disponibles y el valor actual, y avisa
 * hacia arriba (onSeek/onAdvance/onTogglePlay) qué pasó. La distinción
 * seek-vs-advance que ya está en viewState.ts (seekTimeline nunca anima,
 * advanceTimeline sí) se preserva acá: arrastrar el handle llama
 * onSeek(), el intervalo de reproducción automática llama onAdvance().
 *
 * VELOCIDAD (fix "va demasiado rápido"): antes el paso era un valor fijo
 * (650ms) sin importar cuántas fechas hubiera — con datasets de muchas
 * fechas la reproducción completa terminaba en un parpadeo. Ahora el paso
 * se calcula repartiendo una duración TOTAL objetivo entre el número de
 * saltos que hay entre la primera y la última fecha (dates.length - 1),
 * con un piso y un techo para no volverse absurdo en los extremos (un
 * dataset de 2 fechas no debería tardar 20s en dar un solo paso, y uno de
 * 200 fechas no debería tardar 3 minutos completos).
 *
 * FIX (bug "el timeline se queda pegado en la segunda fecha"): el efecto
 * que arma el `setInterval` depende solo de `[playing]` a propósito —
 * cada play/pause reinicia el conteo desde cero, en vez de reiniciar el
 * intervalo (y por lo tanto el conteo del paso) en CADA cambio de fecha,
 * lo que se vería entrecortado. Pero eso significa que la función que
 * corre en el intervalo se crea UNA sola vez por cada play, y JavaScript
 * la deja con el `dates`/`currentDate` de ESE momento capturados por
 * closure — no se actualizan solos aunque lleguen props nuevas en cada
 * render. El código anterior leía `dates`/`currentDate` directo de los
 * props dentro del callback del intervalo, así que en cada tick seguía
 * viendo la fecha con la que arrancó la reproducción, nunca la fecha a
 * la que ya se había avanzado — el resultado observable era "avanza una
 * vez y después se traba", porque cada tick volvía a calcular el mismo
 * "siguiente" de la fecha original. La solución estándar de React para
 * esto es leer los valores desde un `ref` que se actualiza en cada
 * render (sin pasar por el ciclo de efectos): el intervalo sigue
 * viviendo el mismo tiempo total, pero en cada tick lee el valor de
 * verdad más reciente, no el que tenía al nacer.
 *
 * NOTA aparte (no es un bug de este archivo): si en desarrollo el
 * timeline solo avanza limpiando la caché del navegador, es casi seguro
 * Fast Refresh de Vite — agregar/quitar refs cambia la forma de los
 * hooks del componente, y Fast Refresh no siempre remonta con eso limpio;
 * puede quedar vivo un closure viejo hasta un reload completo
 * (Ctrl+Shift+R). En producción, revisar que el documento HTML raíz no
 * se sirva con cache-control largo (los assets con hash sí pueden).
 * -----------------------------------------------------------------------
 */
import { useEffect, useRef, useState } from "react";

/** Duración total objetivo de una reproducción completa, de la primera a la última fecha. */
const TOTAL_PLAYBACK_DURATION_MS = 20_000;
/** Piso: ningún paso individual debería sentirse más rápido que esto, sin importar cuántas fechas haya. */
const MIN_STEP_MS = 450;
/** Techo: ningún paso individual debería sentirse tan lento que parezca trabado, sin importar cuán pocas fechas haya. */
const MAX_STEP_MS = 2200;

function computeStepMs(dateCount: number): number {
  if (dateCount <= 1) return MIN_STEP_MS;
  const steps = dateCount - 1;
  const raw = TOTAL_PLAYBACK_DURATION_MS / steps;
  return Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, raw));
}

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
  // cada tick, sin que su valor quede fijo al closure del momento en que
  // arrancó `setInterval` (ver comentario largo arriba). Se actualizan en
  // cada render, de forma síncrona.
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
    // El paso se calcula UNA vez al arrancar la reproducción, a partir de
    // cuántas fechas hay en ese momento — no dentro del tick (eso
    // reiniciaría el timer en cada avance) ni en las deps del efecto
    // (eso reiniciaría el conteo de 650ms-ahora-variable en cada cambio
    // de fecha, el mismo problema que ya evita el `[playing]` de abajo).
    const stepMs = computeStepMs(datesRef.current.length);
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
