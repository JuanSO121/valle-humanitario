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
import type { TerritoryMapMode } from "@/presentation/data/territoryData";

interface Props {
  /** Toneladas movilizadas al corte activo. */
  toneladas: number;
  /** Entregas visibles en el mapa al corte activo. */
  despachos: number;
  /** Día de agosto en dos dígitos, o null = toda la operación. */
  day: string | null;
  lens: TerritoryMapMode;
  /** true en un salto del timeline: se corta la animación de rodado. */
  instant?: boolean | undefined;
}

export function MarcadorHUD({ toneladas, despachos, day, lens, instant = false }: Props) {
  const corte =
    day === null
      ? "Total del departamento"
      : lens === "jornada"
        ? `Solo el ${day} de agosto`
        : `Hasta el ${day} de agosto`;

  return (
    <div className="pointer-events-none absolute right-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-10 select-none">
      <div className="rounded-xl border border-white/12 bg-[#0A1822]/85 px-6 py-5 shadow-lg backdrop-blur">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#81C8EC]">
          Ayuda entregada
        </p>

        <div className="mt-1.5 flex items-baseline gap-1.5">
          <Rodillo value={toneladas} instant={instant} className="text-[52px]" />
          <span className="font-serif text-2xl text-[#81C8EC]">toneladas</span>
        </div>

        <div className="mt-3 flex items-baseline gap-2 border-t border-white/12 pt-3">
          <Rodillo value={despachos} instant={instant} className="text-[24px]" />
          <span className="text-sm font-semibold text-[#9DB4C2]">
            entregas a municipios
          </span>
        </div>

        <p className="mt-3 text-sm text-[#7E9AAD]" aria-live="polite">
          {corte}
        </p>
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
      className={`inline-flex font-serif leading-none tabular-nums text-white ${className}`}
      // El valor legible va acá: un lector de pantalla no debería
      // escuchar las diez columnas de dígitos de cada rodillo.
      aria-label={texto}
      role="text"
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
      className="relative inline-block h-[1em] w-[0.58em] overflow-hidden"
      style={{ verticalAlign: "baseline" }}
    >
      <span
        className={
          instant
            ? "absolute inset-x-0 top-0"
            : "absolute inset-x-0 top-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        }
        style={{ transform: `translateY(${-digito * 100}%)` }}
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