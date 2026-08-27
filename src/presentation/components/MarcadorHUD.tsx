/**
 * MarcadorHUD.tsx
 * -----------------------------------------------------------------------
 * El contador del mapa, en clave de tablero de estadio: la cifra que
 * importa es cuánta ayuda se movilizó, y tiene que VERSE subir mientras
 * corre el timeline. Por eso los dígitos ruedan en vez de reemplazarse
 * de golpe, el movimiento es el dato.
 *
 * La unidad es la TONELADA. Las unidades sueltas (mercados, paquetes,
 * kilos y pacas mezclados en la misma columna del formato) no se
 * muestran acá: no son comparables entre sí y no dicen nada a esta
 * escala.
 *
 * Advertencia sobre las dos cifras, que no son divisibles entre sí:
 *   · Toneladas viene de la hoja TONELADAS del workbook, que es
 *     DEPARTAMENTAL: incluye Cali, el acopio de Cartago y las otras
 *     ayudas solidarias.
 *   · Despachos cuenta los flujos visibles en el mapa, que son solo los
 *     municipales.
 * Dividir una por otra no da toneladas por despacho.
 * -----------------------------------------------------------------------
 */
import { useOperacion } from "@/presentation/state/OperacionContext";
import type { TerritoryMapMode } from "@/presentation/data/territoryData";

interface Props {
  /** Entregas visibles en el mapa al corte activo. */
  despachos: number;
  /** Día de agosto en dos dígitos, o null = toda la operación. */
  day: string | null;
  lens: TerritoryMapMode;
  /** true en un salto del timeline: se corta la animación de rodado. */
  instant?: boolean | undefined;
}

export function MarcadorHUD({ despachos, day, lens, instant = false }: Props) {
  /**
   * Las toneladas se leen acá, del mismo contexto que alimenta al resto
   * de la página, en vez de recibirse por prop.
   *
   * Antes las calculaba DashboardPage y se las pasaba. Eso permitía que
   * el marcador y la página mostraran cifras distintas si una de las dos
   * quedaba con una versión vieja del cálculo, que fue exactamente lo que
   * pasó: el mapa seguía estimando cuando la ruta de toneladas ya
   * respondía el dato medido.
   */
  const { jornadas, totalToneladas } = useOperacion();

  const toneladas = (() => {
    if (!day) return totalToneladas;
    const jornada = jornadas.find((j) => j.dia === day);
    // Un día sin fila propia no significa cero toneladas acumuladas.
    if (!jornada) return totalToneladas;
    return lens === "jornada" ? jornada.toneladas : jornada.acumuladoToneladas;
  })();

  const corte =
    day === null
      ? "Total del departamento"
      : lens === "jornada"
        ? `Solo el ${day} de agosto`
        : `Hasta el ${day} de agosto`;

  return (
    <div className="pointer-events-none absolute inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-10 select-none md:inset-x-auto md:right-4 md:top-[calc(1rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-4 rounded-xl border border-white/12 bg-[#0B3049]/85 px-4 py-3 shadow-lg backdrop-blur md:block md:px-6 md:py-5">
        <div className="min-w-0 flex-1 md:flex-none">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#22ABE2] md:text-[13px]">
            Ayuda entregada
          </p>

          <div className="mt-1 flex items-baseline gap-1.5 md:mt-1.5">
            <Rodillo
              value={toneladas}
              instant={instant}
              className="text-[34px] sm:text-[42px] md:text-[52px]"
            />
            <span className="text-lg font-bold text-[#22ABE2] md:text-2xl">toneladas</span>
          </div>

          <p className="mt-1.5 text-xs text-[#6B93AA] md:mt-3 md:text-sm" aria-live="polite">
            {corte}
          </p>
        </div>

        <div className="flex shrink-0 items-baseline gap-2 border-l border-white/12 pl-4 md:mt-3 md:border-l-0 md:border-t md:pl-0 md:pt-3">
          <Rodillo value={despachos} instant={instant} className="text-lg md:text-[24px]" />
          <span className="text-xs font-semibold text-[#A8CFE2] md:text-sm">entregas</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Un número cuyos dígitos ruedan. Cada dígito es una columna con el 0-9
 * apilado y desplazada con translateY, que es lo que hace un tablero
 * mecánico. Los separadores de miles se renderizan como texto fijo: no
 * ruedan, solo aparecen cuando el número cruza el millar.
 *
 * `instant` corta la transición en los saltos del timeline: rodar cuatro
 * dígitos a la vez cuando alguien arrastra el control es ruido, no
 * información.
 */
function Rodillo({
  value,
  instant,
  className = "",
}: {
  value: number;
  instant: boolean;
  className?: string;
}) {
  const texto = Math.max(0, Math.round(value)).toLocaleString("es-CO");

  return (
    <span
      className={`inline-flex font-extrabold leading-none tabular-nums text-white ${className}`}
      // Un lector de pantalla no debería escuchar las diez columnas de
      // dígitos de cada rodillo, así que se anuncia el valor y se ocultan
      // las piezas. `role="img"` es el que agrupa contenido gráfico bajo
      // una sola etiqueta; `role="text"` solo lo entiende Safari.
      role="img"
      aria-label={texto}
    >
      {texto.split("").map((char, i) =>
        /\d/.test(char) ? (
          <Digito key={i} digito={Number(char)} instant={instant} />
        ) : (
          <span key={i} aria-hidden className="px-[0.02em]">
            {char}
          </span>
        ),
      )}
    </span>
  );
}

const DIGITOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Digito({ digito, instant }: { digito: number; instant: boolean }) {
  return (
    <span
      aria-hidden
      className="relative inline-block h-[1em] w-[0.58em] overflow-hidden align-baseline"
    >
      <span
        className={
          instant
            ? "absolute inset-x-0 top-0"
            : "absolute inset-x-0 top-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        }
        // Un porcentaje en translateY se calcula sobre la altura del
        // PROPIO elemento, y este mide 10em porque apila los diez
        // dígitos. Por eso el paso es 10% y no 100%: con 100% cada
        // dígito distinto de cero se iba diez veces más lejos de lo
        // debido y el contador se veía vacío.
        style={{ transform: `translateY(${-digito * 10}%)` }}
      >
        {DIGITOS.map((n) => (
          <span key={n} className="block h-[1em] text-center leading-[1em]">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}