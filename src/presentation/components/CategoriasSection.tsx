/**
 * CategoriasSection.tsx — "Ayuda distribuida por categorías"
 * -----------------------------------------------------------------------
 * Las siete categorías del tablero, como pestañas. Es lo único que queda
 * de la sección: sin texto explicativo, sin barra de colores y sin total
 * de toneladas.
 *
 * Cada pestaña lleva el color de su grupo (subsistencia en verde, higiene
 * en azul, habitabilidad en morado, protección en naranja, mascotas en
 * oliva): el mismo con que «¿Qué se entregó?» las identificaba, para que
 * quien ya conocía el tablero las reconozca.
 *
 * POR QUÉ CERRADAS
 *
 * Qué artículos incluye cada categoría todavía no está definido, y la
 * clasificación del Excel viene de registros cargados a mano, con errores
 * de nombre. Abrir cada categoría a su detalle mostraría esa
 * desorganización como si fuera información. Cuando se defina, se abre.
 *
 * Las categorías y su orden vienen del backend; si la ruta no está
 * disponible, la sección no se dibuja.
 * -----------------------------------------------------------------------
 */
import type { CSSProperties } from "react";
import { useCategorias } from "@/application/hooks/useTablero";
import { Cargando } from "./storyPrimitives";
import { colorDeGrupo, iconoDeCategoria } from "@/presentation/data/categorias";

export function CategoriasSection() {
  const { data, isPending } = useCategorias();
  if (isPending)
    return (
      <Cargando
        id="categorias"
        className="min-h-[34rem] bg-[#0B7DB1] [&_p]:text-white"
        texto="Cargando las categorías…"
      />
    );
  if (!data || !data.disponible || data.categorias.length === 0) return null;

  return (
    <section
      id="categorias"
      className="vc-seccion bg-[#0B7DB1] px-4 pb-12 pt-20 sm:px-6 sm:py-14 md:px-10"
    >
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="vc-titular mx-auto w-fit text-center text-[clamp(1.75rem,5.5vw,3.25rem)] text-[#FBF8C6]">
          Ayuda distribuida por
          <br />
          <span className="mt-1 inline-block bg-[#FBF8C6] px-[0.3em] py-[0.05em] text-[#0079C1]">
            categorías
          </span>
        </h2>
        <ul className="mt-8 flex flex-wrap justify-center gap-3" aria-label="Categorías de ayuda">
          {data.categorias.map((c, i) => {
            const Icono = iconoDeCategoria(c.nombre);
            const color = colorDeGrupo(c.nombre);
            return (
              <li
                key={c.nombre}
                // La franja del color del grupo, como las fichas de «¿Qué se
                // entregó?».
                style={{ "--i": i, borderLeftColor: color } as CSSProperties}
                className="vc-aparece flex min-h-14 w-full items-center gap-3 sm:min-h-16 sm:w-auto sm:basis-[calc(50%-0.375rem)] lg:basis-[calc(25%-0.5625rem)] rounded-lg border-l-[4px] bg-white px-5 py-3 text-lg font-bold text-[#123E5C] shadow-sm ring-1 ring-[#123E5C]/10"
              >
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `${color}22` }}
                >
                  <Icono className="size-6" style={{ color }} strokeWidth={2} />
                </span>
                {c.nombre}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
