/**
 * EvolucionHeatmap.tsx
 * -----------------------------------------------------------------------
 * Una casilla por municipio y día, agrupadas por zona.
 *
 * Todo sale de la API vía OperacionContext: los días, las entregas y las
 * zonas se recalculan solos cuando cambia el Excel.
 *
 * SOBRE EL COLOR
 *
 * La pieza de diseño alterna crema, amarillo, naranja, azul y blanco.
 * Ahí es decoración, porque todas las casillas dicen 1 y es una maqueta.
 * Acá el color tiene que significar algo, así que se ordenan de menos a
 * más: crema para una entrega, naranja para el día más intenso. Se usa la
 * misma paleta de la pieza, solo que en secuencia.
 *
 * El cero no es el extremo bajo de la escala, es una categoría aparte:
 * queda en azul apagado, para que un día sin entregas no se confunda con
 * un día de poca actividad.
 * -----------------------------------------------------------------------
 */
import { useMemo } from "react";
import { useOperacion } from "@/presentation/state/OperacionContext";
import type { MunicipioOperacion } from "@/application/derivations/operacion";
import { ListaDeNombres } from "./ListaDeNombres";

/** De menos a más entregas. Tomada de la pieza. */
const ESCALA = ["#FDFBE0", "#FBF8C6", "#FCE07A", "#F7B733", "#F0801E"];

/** Día sin entregas. Categoría aparte, no el extremo de la escala. */
const SIN_ENTREGAS = "#0A5E97";

export function EvolucionHeatmap({
  onSelect,
}: {
  onSelect?: ((municipio: MunicipioOperacion) => void) | undefined;
}) {
  const { jornadas, municipios, zonas } = useOperacion();

  const dias = useMemo(() => jornadas.map((j) => j.dia), [jornadas]);

  /** Tope de la escala: la casilla más alta de toda la rejilla. */
  const maxDia = useMemo(
    () => Math.max(1, ...municipios.flatMap((m) => Object.values(m.dias))),
    [municipios],
  );

  const grupos = useMemo(
    () =>
      zonas
        .map((z) => ({
          zona: z.zona,
          filas: municipios
            .filter((m) => (m.zona ?? "Sin zona") === z.zona)
            .sort((a, b) => b.entregas - a.entregas || a.nombre.localeCompare(b.nombre, "es")),
        }))
        .filter((g) => g.filas.length > 0),
    [zonas, municipios],
  );

  if (dias.length === 0) return null;

  const colorDe = (valor: number) => {
    if (valor <= 0) return SIN_ENTREGAS;
    // El índice se reparte entre los tramos de la escala según qué tan
    // cerca está la casilla del máximo de la rejilla.
    const indice = Math.min(
      ESCALA.length - 1,
      Math.round(((valor - 1) / Math.max(1, maxDia - 1)) * (ESCALA.length - 1)),
    );
    return ESCALA[indice] ?? ESCALA[0];
  };

  return (
    <section>
      <h3 className="vc-titular text-[clamp(1.5rem,4.6vw,5.5rem)] text-[#0079C1]">
        ¿Cuánta ayuda se entregó cada día?
      </h3>
      {/* `max-w-3xl` y no `max-w`: esa última no es una clase de Tailwind
          (le falta el valor) y el navegador la ignoraba, así que en un
          monitor ancho la frase se estiraba a todo el ancho de la banda. */}
      <p className="mt-3 max-w-3xl text-lg leading-8 text-[#35708F]">
        Cada casilla representa un día. Los colores más intensos indican los días en que se
        hicieron más entregas.
      </p>

      <div className="mt-6 space-y-5">
        {grupos.map(({ zona, filas }) => (
          <div key={zona} className="rounded-md bg-[#123E5C] p-4 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:gap-8">
              {/* La zona y su lista de municipios, como en la pieza. */}
              <div className="lg:w-52 lg:shrink-0">
                <h4 className="vc-titular text-3xl text-white sm:text-4xl">{zona}</h4>
                {/* Con ListaDeNombres en vez de join(", "): en una
                    columna de 208 px, "La Victoria" y "Calima - El
                    Darién" se partían a la mitad y quedaba un "La"
                    huérfano al final del renglón. */}
                <ListaDeNombres
                  nombres={filas.map((m) => m.nombre)}
                  className="mt-3 block text-base leading-6 text-white"
                />
              </div>

              {/* La rejilla, con su marco cyan. */}
              <div className="min-w-0 flex-1 overflow-x-auto">
                <div className="min-w-160">
                  <Fila
                    dias={dias}
                    etiqueta=""
                    celdas={dias.map((d) => (
                      <span key={d} className="text-center text-sm font-bold text-white">
                        {d}
                      </span>
                    ))}
                    total={<span className="text-sm font-bold text-white">total</span>}
                    sobreOscuro
                  />

                  <div className="mt-2 rounded-sm bg-[#22ABE2] p-2.5">
                    {filas.map((m) => (
                      <button
                        key={m.destinoId}
                        type="button"
                        onClick={() => onSelect?.(m)}
                        className="block w-full rounded-sm transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                      >
                        <Fila
                          dias={dias}
                          etiqueta={m.nombre}
                          celdas={dias.map((d) => {
                            const v = m.dias[d] ?? 0;
                            return (
                              <span
                                key={d}
                                title={`${m.nombre}, día ${d}: ${
                                  v === 0 ? "sin entregas" : v === 1 ? "1 entrega" : `${v} entregas`
                                }`}
                                className="flex h-6 items-center justify-center rounded-[2px] text-[13px] font-bold text-[#0079C1]"
                                style={{ background: colorDe(v) }}
                              >
                                {v > 0 ? v : ""}
                              </span>
                            );
                          })}
                          total={
                            <span className="text-right text-base font-extrabold text-[#ffffff]">
                              {m.entregas}
                            </span>
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Fila({
  dias,
  etiqueta,
  celdas,
  total,
  sobreOscuro = false,
}: {
  dias: string[];
  etiqueta: string;
  celdas: React.ReactNode[];
  total: React.ReactNode;
  /** La fila de encabezado va sobre el navy; las demás, sobre el cyan. */
  sobreOscuro?: boolean;
}) {
  return (
    <div
      className="grid items-center gap-[3px] py-[2px]"
      style={{ gridTemplateColumns: `108px repeat(${dias.length}, 1fr) 44px` }}
    >
      <span
        className={`truncate pr-2 text-left text-[13px] font-semibold ${
          sobreOscuro ? "text-white" : "text-[#fefefe]"
        }`}
      >
        {etiqueta}
      </span>
      {celdas}
      {total}
    </div>
  );
}