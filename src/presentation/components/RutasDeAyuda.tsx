/**
 * RutasDeAyuda.tsx — "Además de los municipios, la ayuda salió por otras rutas"
 * -----------------------------------------------------------------------
 * Lo despachado que NO se puede atribuir a un solo municipio, con el diseño
 * de las rutas del tablero original: una píldora de color con su nombre y su
 * cifra, el círculo con el ícono sobre el hilo y, al lado, qué es.
 *
 *   Ruta 1  Municipios múltiples        ayuda que atendió a varios a la vez
 *   Ruta 2  Otras ayudas humanitarias   fundaciones, entidades, otros departamentos
 *   Ruta 3  Puntos de distribución      enviada a centros desde donde se reparte
 *
 * Las rutas 1 a 3 de antes (municipios atendidos, Cartago y Cali) se fueron:
 * medían entregas y orígenes, y el registro de despachos ya no los trae. Estas
 * tres no dependen de eso: son pesos, y salen de la misma base que todo lo
 * demás. Por eso se renumeraron desde 1.
 *
 * Cada cifra es el peso aproximado y su parte del total despachado. Una ruta
 * sin nada que mostrar no se dibuja.
 * -----------------------------------------------------------------------
 */
import type { CSSProperties } from "react";
import { Boxes, HeartHandshake, Warehouse, type LucideIcon } from "lucide-react";
import { useOtras, useResumen } from "@/application/hooks/useTablero";
import { porcentaje, toneladas } from "@/lib/formato";
import { SectionLabel } from "./storyPrimitives";

interface Ruta {
  id: string;
  titulo: string;
  descripcion: string;
  toneladas: number;
  color: string;
  tinta: string;
  icono: LucideIcon;
}

export function RutasDeAyuda() {
  const { data: resumen } = useResumen();
  const { data: otras } = useOtras();
  if (!resumen || !resumen.disponible) return null;

  const total = resumen.totales.toneladas;
  const { multiples, traslados } = resumen.calidad;

  const rutas: Ruta[] = [
    {
      id: "multiples",
      titulo: "Municipios múltiples",
      descripcion:
        "Ruta de entrega que atendió a varios municipios sin desagregar cuál recibió qué.",
      toneladas: multiples.toneladas,
      color: "#2A7F42",
      tinta: "#236B37",
      icono: Boxes,
    },
    {
      id: "otras",
      titulo: "Otras ayudas humanitarias",
      descripcion: "Ayudas entregadas a fundaciones, otros departamentos y otras entidades.",
      toneladas: otras && otras.disponible ? otras.toneladas : 0,
      color: "#0C739E",
      tinta: "#0C5F85",
      icono: HeartHandshake,
    },
    {
      id: "puntos",
      titulo: "Puntos de distribución",
      descripcion: "Ayuda que llega primero a estos puntos y se reparte después.",
      toneladas: traslados.toneladas,
      color: "#B94F00",
      tinta: "#8F3E00",
      icono: Warehouse,
    },
  ].filter((r) => r.toneladas > 0);

  if (rutas.length === 0) return null;

  return (
    <div className="mt-10 md:mt-12">
      <SectionLabel>Además de los municipios, la ayuda salió por otras rutas</SectionLabel>

      {/* En escritorio, una línea de tiempo: el círculo del centro las encadena
          y el hilo vertical hace leer todas como una sola secuencia. En
          celular, burbujas apiladas. */}
      <ol className="relative mt-6 space-y-4 md:mt-6 md:space-y-0">
        <span
          aria-hidden
          className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-[#0079C1]/25 md:block"
        />

        {rutas.map((r, i) => {
          const Icono = r.icono;
          return (
            <li
              key={r.id}
              style={{ "--i": i } as CSSProperties}
              className="vc-aparece relative md:grid md:grid-cols-[1fr_4.5rem_1fr] md:items-center md:py-2.5"
            >
              {/* La burbuja: en escritorio se disuelve con `md:contents` y sus
                  tres hijos pasan a ser las celdas de la rejilla. */}
              <div className="overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#123E5C]/10 md:contents">
                <div className="flex flex-col items-start gap-2.5 md:flex-row md:items-center md:justify-between md:gap-4 md:pr-6">
                  <span
                    className="shrink-0 text-[clamp(1.5rem,4vw,2rem)] font-bold uppercase tracking-tight md:min-w-24"
                    style={{ color: r.tinta }}
                  >
                    Ruta {i + 1}
                  </span>

                  <div
                    className="flex w-full items-center gap-4 rounded-[1.5rem] px-5 py-4 text-white md:max-w-[24rem] md:flex-1 md:rounded-full md:px-6 md:text-right"
                    style={{ background: r.color }}
                  >
                    <span
                      aria-hidden
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20 md:hidden"
                    >
                      <Icono className="size-5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <b className="block text-lg leading-tight">{r.titulo}</b>
                      <span className="mt-2 flex flex-wrap gap-x-6 gap-y-1 md:justify-end">
                        <span className="text-[15px] font-bold text-white">
                          <b className="text-base font-extrabold text-white">
                            {porcentaje(r.toneladas, total)}
                          </b>{" "}
                          del total
                        </span>
                        <span className="text-[15px] font-bold text-white">
                          <b className="text-base font-extrabold text-white">
                            {toneladas(r.toneladas, false)}
                          </b>{" "}
                          toneladas
                        </span>
                      </span>
                    </span>
                  </div>
                </div>

                {/* El círculo del hilo. En celular su copia ya viaja dentro del óvalo. */}
                <div className="hidden justify-center md:flex">
                  <span
                    className="flex size-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white"
                    style={{ background: r.color }}
                  >
                    <Icono className="size-6" aria-hidden />
                  </span>
                </div>

                <p className="mt-3 text-[15px] leading-6 text-[#35708F] md:mt-0 md:pl-6 md:text-base">
                  {r.descripcion}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
