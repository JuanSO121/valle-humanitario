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
 *
 * DOS FILAS EN CELULAR
 *
 * En una sola línea no cabía: el botón, un deslizador de 176 px, la
 * fecha de 96 y "Ver todo" suman más de 450 px, y un teléfono común
 * tiene 390 de ancho. El control se salía por la derecha y "Ver todo"
 * quedaba cortado a la mitad, o sea que la única forma de volver al
 * total quedaba fuera de la pantalla.
 *
 * En celular la fecha y "Ver todo" suben a su propia línea, y el
 * deslizador se queda con todo el ancho de la de abajo. No es solo que
 * quepa: el deslizador es el gesto principal de este control, y con 176
 * px cada día medía nueve píxeles. Con el ancho completo mide el doble.
 *
 * En escritorio nada cambia: sigue siendo una píldora de una línea.
 *
 * LA FECHA SE ESCRIBE, NO SE CODIFICA
 *
 * Decía "2026-08-16". Es una fecha ISO, que es un formato para
 * máquinas: quien lee un mapa de ayudas no tiene por qué descifrar el
 * orden de los campos ni traducir el 08. Ahora dice "16 de agosto", con
 * el mes leído del dato y no escrito a mano, que es el error que ya
 * apareció en tres sitios de este proyecto.
 * -----------------------------------------------------------------------
 */
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { fechaCorta } from "@/application/derivations/operacion";
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

  const fechaMostrada = currentDate ?? dates[0] ?? null;
  const etiqueta = fechaCorta(fechaMostrada);

  const botonVerTodo = (
    <button
      type="button"
      onClick={() => {
        setPlaying(false);
        onExit();
      }}
      className="min-h-11 shrink-0 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground md:ml-1 md:min-h-0 md:px-0"
    >
      Ver todo
    </button>
  );

  return (
    <div className="pointer-events-auto w-full max-w-[28rem] rounded-2xl border border-border bg-surface/95 px-3 py-2 shadow-sm backdrop-blur md:w-auto md:max-w-none md:rounded-full md:px-4 md:py-2.5">
      {/* Fila de la fecha, solo en celular. Arriba y no abajo porque es
          lo que responde "¿qué estoy viendo?", y el deslizador de abajo
          es lo que lo cambia: primero el estado, después el control. */}
      <div className="flex items-center justify-between gap-3 md:hidden">
        <span
          className="min-w-0 truncate text-sm font-semibold tabular-nums text-foreground"
          aria-live="polite"
        >
          {etiqueta}
        </span>
        {/* Sin timeline activo no hay a dónde volver, así que el botón no
            existe en vez de quedar deshabilitado ocupando sitio. */}
        {activo && botonVerTodo}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={alternarReproduccion}
          aria-label={playing ? "Pausar" : "Reproducir día por día"}
          /* 44 px en celular, que es el mínimo cómodo para un pulgar. En
             escritorio vuelve a 40, donde se apunta con el cursor. */
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-90 md:size-10"
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

        {/* En celular se lleva todo el ancho de la fila; en escritorio
            vuelve a su medida fija para que la píldora no crezca sin
            motivo. El `min-w-0` es lo que le permite encogerse dentro
            del flex en vez de desbordar el contenedor. */}
        <input
          type="range"
          min={0}
          max={dates.length - 1}
          step={1}
          value={currentIndex >= 0 ? currentIndex : 0}
          onChange={handleScrub}
          aria-label="Día de la operación"
          /* Sin esto, un lector de pantalla anuncia "3 de 25", que es la
             posición y no la fecha. El valor que importa es el día. */
          aria-valuetext={etiqueta}
          className="h-11 w-full min-w-0 flex-1 cursor-pointer accent-foreground md:h-1.5 md:w-72 md:flex-none"
        />

        {/* En escritorio la fecha y "Ver todo" siguen en esta misma
            línea, como siempre. */}
        <span
          className="hidden min-w-[7rem] shrink-0 text-center text-sm font-semibold tabular-nums text-foreground md:inline"
          aria-live="polite"
        >
          {etiqueta}
        </span>
        {activo && <span className="hidden md:inline">{botonVerTodo}</span>}
      </div>
    </div>
  );
}