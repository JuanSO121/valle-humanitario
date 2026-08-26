/**
 * Timeline.tsx
 * -----------------------------------------------------------------------
 * Selector de jornada. Componente de presentación puro: no decide fases
 * ni construye fechas, recibe la lista de fechas disponibles y el valor
 * actual, y avisa hacia arriba qué pasó.
 *
 * SE ELIMINÓ LA REPRODUCCIÓN AUTOMÁTICA. Era una carrera imposible de
 * ganar: el intervalo avanzaba el día mientras la cascada de arcos
 * todavía estaba arrancando los del día anterior, así que se perdían
 * llegadas, la línea nunca tocaba el destino, el pulso nunca aparecía, y
 * el backlog terminaba reproduciéndose después de que el timeline ya
 * había llegado al final. Sin autoplay, cada avance ocurre cuando la
 * persona lo pide y la ola siempre alcanza a completarse.
 *
 * La distinción seek-vs-advance de viewState.ts se preserva y ahora hace
 * más trabajo que antes:
 *   · Avanzar UN día (botón, o arrastrar un paso) → onAdvance, que anima
 *     el crecimiento de los arcos nuevos.
 *   · Saltar VARIOS días de un tirón → onSeek, que hace snapTo sin
 *     animar. Animar un salto de seis días se lee como un error visual,
 *     no como "avanzó en el tiempo".
 *
 * Cómo se lee ese día, acumulado o solo esa jornada, lo decide el toggle
 * del panel de territorio, no este componente.
 * -----------------------------------------------------------------------
 */
import type { ChangeEvent } from "react";

interface Props {
  /** Fechas ISO únicas y ordenadas, normalmente derivadas de flujos[].porFecha en el padre. */
  dates: string[];
  /** Fecha actual del playhead, o null si el timeline no está activo todavía. */
  currentDate: string | null;
  /** Salto sin animación. */
  onSeek: (date: string) => void;
  /** Avance de un día, con animación de arcos. */
  onAdvance: (date: string) => void;
  /** Se llama con la fecha elegida cuando el timeline pasa de inactivo a activo. */
  onActivate: (firstDate: string) => void;
  onExit: () => void;
}

export function Timeline({ dates, currentDate, onSeek, onAdvance, onActivate, onExit }: Props) {
  if (dates.length === 0) return null;

  const currentIndex = currentDate ? dates.indexOf(currentDate) : -1;
  const activo = currentIndex >= 0;

  /**
   * Un solo lugar decide activar / animar / saltar, para que los botones
   * y el arrastre no puedan discrepar entre sí.
   */
  const irA = (index: number) => {
    const date = dates[index];
    if (date === undefined) return;

    if (!activo) {
      onActivate(date);
      return;
    }
    if (index === currentIndex + 1) {
      onAdvance(date);
      return;
    }
    onSeek(date);
  };

  const handleScrub = (event: ChangeEvent<HTMLInputElement>) => irA(Number(event.target.value));

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-surface/95 px-3 py-2 shadow-sm backdrop-blur">
      <PasoButton
        direccion="anterior"
        onClick={() => irA(activo ? currentIndex - 1 : 0)}
        disabled={activo && currentIndex <= 0}
      />

      <input
        type="range"
        min={0}
        max={dates.length - 1}
        step={1}
        value={currentIndex >= 0 ? currentIndex : 0}
        onChange={handleScrub}
        aria-label="Jornada"
        className="h-1 w-40 shrink-0 accent-foreground md:w-64"
      />

      <PasoButton
        direccion="siguiente"
        onClick={() => irA(activo ? currentIndex + 1 : 0)}
        disabled={activo && currentIndex >= dates.length - 1}
      />

      <span
        className="min-w-[5.5rem] shrink-0 font-mono text-xs text-muted-foreground"
        aria-live="polite"
      >
        {currentDate ?? dates[0] ?? ""}
      </span>

      {activo && (
        <button
          type="button"
          onClick={onExit}
          className="ml-1 shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver todo
        </button>
      )}
    </div>
  );
}

function PasoButton({
  direccion,
  onClick,
  disabled,
}: {
  direccion: "anterior" | "siguiente";
  onClick: () => void;
  disabled: boolean;
}) {
  const esSiguiente = direccion === "siguiente";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={esSiguiente ? "Jornada siguiente" : "Jornada anterior"}
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d={esSiguiente ? "M8 4l10 8-10 8V4z" : "M16 4L6 12l10 8V4z"} />
      </svg>
    </button>
  );
}