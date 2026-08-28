/**
 * AyudaSection.tsx
 * -----------------------------------------------------------------------
 * Composición de la ayuda entregada. Al elegir una categoría, la lista
 * de la derecha cambia a los artículos que la componen.
 *
 * Las cifras vienen de route=ayuda. El catálogo estático queda como
 * respaldo mientras esa ruta no exista, y como fuente de dos cosas que
 * el workbook no tiene: el color de cada categoría y los nombres de
 * producto. ENVIOS_CATEGORIA guarda cuántos productos distintos trae
 * cada envío, no cuáles.
 * -----------------------------------------------------------------------
 */
import { useMemo, useState, type CSSProperties } from "react";
import {
  categoriasAyuda,
  familiasDeAyuda,
  poblacionesFocalizadas,
  productosMasRepartidos,
  TOTAL_UNIDADES,
} from "@/presentation/data/ayudaData";
import { useOperacion } from "@/presentation/state/OperacionContext";
import { useAyuda } from "@/application/hooks/useAyuda";
import { useFoco } from "@/presentation/state/FocoContext";
import { Aviso, Card, SectionLabel, SectionTitle } from "./storyPrimitives";

interface CategoriaVista {
  nombre: string;
  unidades: number;
  /**
   * Municipios del consolidado, sin Cali. Nunca pasa de 41.
   *
   * `null` cuando route=ayuda no respondió. Es deliberado: el catálogo
   * estático solo tiene un conteo de DESTINOS, que incluye acopios,
   * entidades y Cali, y usarlo como si fueran municipios hacía que la
   * página dijera "llegó a 46 municipios" en un departamento de 41.
   * Antes que mostrar un número equivocado, no se muestra ninguno.
   */
  municipios: number | null;
  color: string;
  productos: Array<[string, number]>;
}

export function AyudaSection() {
  const [activa, setActiva] = useState<string | null>(null);
  const { totalToneladas, toneladasMedidas } = useOperacion();
  const { data: ayuda } = useAyuda();
  const { enfocarCategoria } = useFoco();

  /**
   * Antes esta lista decía "llegó a 44 municipios" en un departamento de
   * 41, porque el catálogo cuenta destinos de cualquier tipo. La ruta
   * separa las dos cuentas y acá se usa la de municipios.
   */
  const categorias = useMemo<CategoriaVista[]>(() => {
    if (!ayuda) {
      return categoriasAyuda.map((c) => ({
        nombre: c.nombre,
        unidades: c.unidades,
        municipios: null,
        color: c.color,
        productos: c.productos,
      }));
    }

    return ayuda.categorias.map((viva) => {
      const local = categoriasAyuda.find((c) => c.nombre === viva.nombre);
      return {
        nombre: viva.nombre,
        unidades: viva.unidades,
        municipios: viva.municipios,
        color: local?.color ?? "#6B93AA",
        productos: local?.productos ?? [],
      };
    });
  }, [ayuda]);

  const totalUnidades = ayuda?.totalUnidades ?? TOTAL_UNIDADES;

  const poblaciones: Array<[string, number]> = ayuda
    ? ayuda.poblaciones.map((p) => [p.nombre, p.despachos])
    : poblacionesFocalizadas.map(([nombre, despachos]) => [nombre, despachos]);

  const pct = (unidades: number) =>
    totalUnidades > 0 ? Math.round((unidades / totalUnidades) * 100) : 0;

  /**
   * Porcentaje para mostrar.
   *
   * Herramientas y materiales son 828 unidades de 256.650, un 0,32 por
   * ciento, y Salud son 87, un 0,03. Redondeados dan cero, y un cero se
   * lee como que no se entregó nada. Sí se entregó, solo que poco.
   *
   * "menos de 1" dice lo mismo sin mentir. Cero se reserva para cuando
   * de verdad no hay nada.
   */
  const pctTexto = (unidades: number) => {
    if (unidades <= 0) return "0%";
    const redondeado = pct(unidades);
    return redondeado === 0 ? "<1%" : `${redondeado}%`;
  };

  const categoria = activa ? categorias.find((c) => c.nombre === activa) : undefined;
  const maxUnidades = Math.max(1, ...categorias.map((c) => c.unidades));

  // Cada bloque vale 1 por ciento del total del momento, no un número
  // fijo de unidades que queda viejo cuando cambia el Excel.
  const waffle = useMemo(
    () =>
      categorias.flatMap((c) =>
        Array.from({ length: Math.round((c.unidades / Math.max(1, totalUnidades)) * 100) }, () => c),
      ),
    [categorias, totalUnidades],
  );

  /**
   * Tipo explícito, con `color` opcional.
   *
   * Sin él, TypeScript infiere una unión de dos formas distintas, una con
   * color y otra sin, y solo deja leer lo que existe en las dos. El
   * color solo aplica cuando hay categoría seleccionada: en la lista
   * general los artículos vienen de categorías distintas y pintarlos
   * todos igual sería mentir sobre a cuál pertenecen.
   */
  const productos: Array<{ label: string; value: number; color?: string }> = categoria
    ? categoria.productos.map(([label, value]) => ({ label, value, color: categoria.color }))
    : productosMasRepartidos.map(([label, value]) => ({ label, value }));

  return (
    <div className="mx-auto max-w-6xl">
      <SectionLabel>Qué se entregó</SectionLabel>
      <SectionTitle>La mayor parte de la ayuda es aseo, comida y agua</SectionTitle>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[#35708F]">
        Seleccione una categoría para ver qué artículos incluyó.
      </p>

      <div className="mt-10 grid gap-8 rounded-xl border border-[#0079C1]/12 bg-white p-5 sm:p-7 lg:grid-cols-[minmax(210px,0.7fr)_minmax(0,1.4fr)] lg:items-center">
        <div className="text-center">
          <b className="block font-serif text-[64px] leading-none tracking-[-0.02em] text-[#0079C1]">
            {totalToneladas.toLocaleString("es-CO")}
          </b>
          <span className="mt-3 block text-lg text-[#35708F]">toneladas de ayuda</span>
          <span className="mt-2 block text-base leading-6 text-[#6B93AA]">
            {toneladasMedidas
              ? "entregadas en todo el departamento"
              : "estimadas a partir del número de entregas"}
          </span>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-[#123E5C]">De qué está hecha esa ayuda</h3>

          <div className="mt-4 flex h-8 overflow-hidden rounded-md sm:h-9">
            {categorias.map((c) => (
              <i
                key={c.nombre}
                title={`${c.nombre}: ${c.unidades.toLocaleString("es-CO")} unidades, ${pctTexto(
                  c.unidades,
                )} de la ayuda`}
                className="block transition-opacity"
                style={{
                  flex: c.unidades,
                  background: c.color,
                  opacity: activa && activa !== c.nombre ? 0.28 : 1,
                }}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-[3px] sm:gap-1">
            {waffle.map((c, i) => (
              <i
                key={`${c.nombre}-${i}`}
                title={c.nombre}
                className="block size-[11px] rounded-[2px] sm:size-[15px] sm:rounded-[2.5px]"
                style={{ background: c.color, opacity: activa && activa !== c.nombre ? 0.28 : 1 }}
              />
            ))}
          </div>
          <p className="mt-3 text-base text-[#6B93AA]">
            Cada bloque es el 1 por ciento de la ayuda. El color indica a qué necesidad responde
            cada categoría.
          </p>
        </div>
      </div>

      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-[15px] text-[#35708F]">
        {familiasDeAyuda.map((f) => {
          // El type guard en el filter, en vez de `as string[]`, mantiene
          // colores[0] como `string | undefined` bajo
          // noUncheckedIndexedAccess, de ahí el respaldo del fondo.
          const colores = f.categorias
            .map((n) => categorias.find((c) => c.nombre === n)?.color)
            .filter((c): c is string => typeof c === "string");
          return (
            <li key={f.nombre} className="flex items-center gap-2">
              <i
                className="block h-2 w-6 rounded-sm"
                style={{
                  background:
                    colores.length > 1
                      ? `linear-gradient(90deg, ${colores.join(",")})`
                      : (colores[0] ?? "#6B93AA"),
                }}
              />
              <b className="font-semibold text-[#123E5C]">{f.nombre}</b>
              <span className="text-[#6B93AA]">· {f.categorias.join(", ")}</span>
            </li>
          );
        })}
      </ul>

      {/* Categorías y artículos van juntos: al elegir una categoría, la
          lista de la derecha cambia. Son la misma lectura.

          Las categorías van en rejilla de fichas y no en lista vertical:
          catorce filas apiladas obligan a recorrer con la vista de arriba
          abajo y hacen la sección larga y plana. En rejilla se comparan
          de un vistazo. */}
      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)] lg:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0079C1]">
            Categorías
          </p>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {categorias.map((c, i) => {
              const seleccionada = activa === c.nombre;
              return (
                <button
                  key={c.nombre}
                  type="button"
                  aria-pressed={seleccionada}
                  onClick={() => setActiva(seleccionada ? null : c.nombre)}
                  style={{ "--i": i } as CSSProperties}
                  className={`vc-aparece group relative overflow-hidden rounded-md p-4 text-left transition duration-200 ${
                    seleccionada
                      ? "-translate-y-0.5 text-white shadow-lg"
                      : "bg-white hover:-translate-y-0.5 hover:shadow-md"
                  } motion-reduce:hover:translate-y-0`}
                >
                  {/* El color de la categoría llena la ficha al
                      seleccionarla. Como es un fondo y no un borde, se
                      reconoce sin leer. */}
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 transition-opacity duration-200"
                    style={{ background: c.color, opacity: seleccionada ? 1 : 0 }}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1"
                    style={{ background: seleccionada ? "transparent" : c.color }}
                  />

                  <span className="flex items-baseline justify-between gap-3">
                    <span
                      className={`min-w-0 truncate text-base font-semibold ${
                        seleccionada ? "text-white" : "text-[#123E5C]"
                      }`}
                    >
                      {c.nombre}
                    </span>
                    <span
                      className={`shrink-0 text-2xl font-extrabold ${
                        seleccionada ? "text-white" : "text-[#0079C1]"
                      }`}
                    >
                      {pctTexto(c.unidades)}
                    </span>
                  </span>

                  <span className="mt-3 block h-[5px] overflow-hidden rounded-full bg-black/10">
                    <i
                      className="vc-crece block h-full rounded-full"
                      style={
                        {
                          width: `${(c.unidades / maxUnidades) * 100}%`,
                          background: seleccionada ? "#FFFFFF" : c.color,
                          "--i": i,
                        } as CSSProperties
                      }
                    />
                  </span>

                  {c.municipios !== null && (
                    <span
                      className={`mt-2.5 block text-[15px] ${
                        seleccionada ? "text-white/85" : "text-[#6B93AA]"
                      }`}
                    >
                      Llegó a {c.municipios} {c.municipios === 1 ? "municipio" : "municipios"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* El `key` fuerza a React a remontar la lista al cambiar de
            categoría, y con eso la animación de entrada se vuelve a
            disparar. Sin él, los artículos se reemplazarían de golpe. */}
        <Card key={categoria?.nombre ?? "general"} className="lg:sticky lg:top-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0079C1]">
            {categoria ? categoria.nombre : "Lo más entregado"}
          </p>

          {productos.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-3">
              {productos.map((prod, i) => {
                const maximo = Math.max(1, ...productos.map((x) => x.value));
                return (
                  <li
                    key={prod.label}
                    style={{ "--i": i } as CSSProperties}
                    className="vc-aparece"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-base text-[#35708F]">
                        {prod.label}
                      </span>
                      <b className="shrink-0 tabular-nums text-[#123E5C]">
                        {prod.value.toLocaleString("es-CO")}
                      </b>
                    </div>
                    <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[#DDF0FA]">
                      <i
                        className="vc-crece block h-full rounded-full"
                        style={
                          {
                            width: `${(prod.value / maximo) * 100}%`,
                            background: prod.color ?? "#0079C1",
                            "--i": i,
                          } as CSSProperties
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-base text-[#6B93AA]">
              No hay detalle de artículos para esta categoría.
            </p>
          )}

          {categoria && (
            <div className="mt-6 flex flex-col gap-3 border-t border-[#0079C1]/12 pt-5">
              {/* Llevar la categoría al mapa. La lista de artículos dice
                  QUÉ se entregó; el mapa dice DÓNDE. Es la continuación
                  natural de la lectura. */}
              <button
                type="button"
                onClick={() => enfocarCategoria(categoria.nombre)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0079C1] px-5 py-3 text-base font-bold text-white transition hover:bg-[#00639F]"
              >
                Ver en el mapa dónde llegó
              </button>

              <button
                type="button"
                onClick={() => setActiva(null)}
                className="text-base font-semibold text-[#0079C1] underline-offset-4 hover:underline"
              >
                Ver lo más entregado en total
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Grupos atendidos responde otra pregunta: no QUÉ se entregó sino
          A QUIÉN. Va en su propio apartado, con el tratamiento en azul de
          la campaña, para que no compita con la lectura de arriba. */}
      <div className="mt-14 rounded-md bg-[#0079C1] p-6 sm:p-10">
        <h3 className="vc-titular text-[clamp(1.5rem,4vw,2.5rem)] text-[#FBF8C6]">
          A quién se dirigió la ayuda
        </h3>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white sm:text-lg">
          Entregas que declararon ayuda dirigida a un grupo. Una misma entrega puede nombrar
          varios, así que la suma es mayor que el total de entregas.
        </p>

        <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {poblaciones.map(([nombre, entregas]) => {
            const maximo = Math.max(1, ...poblaciones.map(([, v]) => v));
            return (
              <li key={nombre}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-base text-white sm:text-lg">{nombre}</span>
                  <b className="shrink-0 text-xl font-extrabold text-[#FBF8C6]">{entregas}</b>
                </div>
                <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-white/25">
                  <i
                    className="block h-full rounded-full bg-[#FFD400]"
                    style={{ width: `${(entregas / maximo) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6">
        <Aviso>
          <b>Cómo leer estas cifras.</b> Los porcentajes comparan cuánta ayuda de cada tipo se
          entregó.{" "}
          {toneladasMedidas
            ? "Las toneladas son el peso registrado en todo el departamento, incluidas las rutas que no llegan a un municipio."
            : "Las toneladas son una estimación a partir del número de entregas."}
        </Aviso>
      </div>
    </div>
  );
}