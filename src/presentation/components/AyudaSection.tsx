/**
 * AyudaSection.tsx
 * -----------------------------------------------------------------------
 * Composición de la ayuda entregada. Al elegir una categoría, la lista
 * de la derecha cambia a los artículos que la componen.
 *
 * AHORA TODO VIENE DE LA BASE
 *
 * Los nombres de producto salían de `ayudaData.ts`, escritos a mano, y
 * contradecían al propio tablero en la misma pantalla: decía "Tapabocas
 * 17.100" al lado de "Protección y seguridad: 11.167 unidades", y la
 * suma de los catorce artículos del listado general, 100.426, superaba
 * el total de toda la operación, 96.360.
 *
 * La hoja DETALLE_PRODUCTO resolvió las dos cosas a la vez. De ahí salen
 * ahora los productos Y las unidades, así que las dos cifras nacen del
 * mismo sitio y no pueden volver a divergir.
 *
 * De paso quedó claro que `ayudaData.ts` NUNCA estuvo desactualizado:
 * sus 256.650 unidades y sus diez productos más entregados coinciden con
 * el detalle real. Lo que estaba mal era ENVIOS_CATEGORIA.unidades, que
 * es de donde el tablero venía sacando sus 96.360.
 *
 * QUÉ QUEDA DEL CATÁLOGO ESTÁTICO
 *
 * Solo dos cosas, y las dos son decisiones editoriales, no datos: el
 * COLOR de cada categoría y la agrupación en FAMILIAS. Ni una cifra.
 *
 * TRES COMPORTAMIENTOS QUE SIGUEN VIGENTES
 *
 * 1. El panel grande responde a la selección con datos reales. Las
 *    toneladas NO se desagregan por categoría, y repartir el total
 *    proporcional a las unidades sería inventarlas: esa columna mezcla
 *    mercados, paquetes, kilos y pacas. Así que al elegir una categoría
 *    la cifra grande pasa a ser sus unidades.
 *
 * 2. Al elegir una categoría, la vista baja hasta la lista de artículos.
 *    `block: "nearest"` no mueve nada en escritorio, donde la tarjeta es
 *    sticky y ya está a la vista.
 *
 * 3. Cerrar es una X en la esquina, no un botón de texto al final.
 * -----------------------------------------------------------------------
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { categoriasAyuda, familiasDeAyuda } from "@/presentation/data/ayudaData";
import { useOperacion } from "@/presentation/state/OperacionContext";
import { useAyuda } from "@/application/hooks/useAyuda";
import { useFoco } from "@/presentation/state/FocoContext";
import { Aviso, Card } from "./storyPrimitives";

interface CategoriaVista {
  nombre: string;
  unidades: number;
  /**
   * Municipios del consolidado, sin Cali. Nunca pasa de 41.
   *
   * `null` cuando route=ayuda no respondió: el catálogo estático solo
   * tiene un conteo de DESTINOS, que incluye acopios, entidades y Cali, y
   * usarlo como si fueran municipios hacía que la página dijera "llegó a
   * 46 municipios" en un departamento de 41.
   */
  municipios: number | null;
  color: string;
  productos: Array<{ nombre: string; unidades: number }>;
  productosDistintos: number;
}

export function AyudaSection() {
  const [activa, setActiva] = useState<string | null>(null);
  const { totalToneladas, toneladasMedidas } = useOperacion();
  const { data: ayuda } = useAyuda();
  const { enfocarCategoria } = useFoco();
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * El color y nada más sale del archivo local. Todo lo demás —unidades,
   * municipios, productos— viene de la ruta.
   */
  const categorias = useMemo<CategoriaVista[]>(() => {
    if (!ayuda) return [];

    return ayuda.categorias.map((viva) => {
      const local = categoriasAyuda.find((c) => c.nombre === viva.nombre);
      return {
        nombre: viva.nombre,
        unidades: viva.unidades,
        municipios: viva.municipios,
        color: local?.color ?? "#6B93AA",
        productos: viva.productos ?? [],
        productosDistintos: viva.productosDistintos ?? (viva.productos?.length ?? 0),
      };
    });
  }, [ayuda]);

  const totalUnidades = ayuda?.totalUnidades ?? 0;

  const poblaciones: Array<[string, number]> = useMemo(
    () => (ayuda?.poblaciones ?? []).map((p) => [p.nombre, p.despachos] as [string, number]),
    [ayuda],
  );

  const pct = (unidades: number) =>
    totalUnidades > 0 ? Math.round((unidades / totalUnidades) * 100) : 0;

  /**
   * Porcentaje para mostrar.
   *
   * Salud son 87 unidades de 256.263, un 0,03 por ciento. Redondeado da
   * cero, y un cero se lee como que no se entregó nada. Sí se entregó,
   * solo que poco. "menos de 1" dice lo mismo sin mentir.
   */
  const pctTexto = (unidades: number) => {
    if (unidades <= 0) return "0%";
    const redondeado = pct(unidades);
    return redondeado === 0 ? "<1%" : `${redondeado}%`;
  };

  const categoria = activa ? categorias.find((c) => c.nombre === activa) : undefined;
  const maxUnidades = Math.max(1, ...categorias.map((c) => c.unidades));

  useEffect(() => {
    if (!activa || !panelRef.current) return;
    const prefiereQuieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current.scrollIntoView({
      behavior: prefiereQuieto ? "auto" : "smooth",
      block: "nearest",
    });
  }, [activa]);

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
   * Los artículos que se listan a la derecha.
   *
   * Con categoría elegida, los suyos y en su color. Sin categoría, el
   * ranking general que calcula el backend: no se puede armar sumando
   * las listas por categoría, porque cada una viene recortada a sus doce
   * primeros y el resultado sería un ranking de los recortes.
   */
  const productos: Array<{ label: string; value: number; color?: string }> = categoria
    ? categoria.productos.map((p) => ({ label: p.nombre, value: p.unidades, color: categoria.color }))
    : (ayuda?.productosDestacados ?? []).map((p) => ({ label: p.nombre, value: p.unidades }));

  // Sin datos no se dibujan porcentajes. Antes había un respaldo
  // estático, y como sus cifras eran de otro corte, la página mostraba
  // proporciones falsas cuando la ruta fallaba.
  const sinDatos = categorias.length === 0;

  return (
    <>
      {/* Banda del titular, a sangre. */}
      <div className="bg-[#22ABE2] px-4 py-12 sm:px-6 sm:py-12 md:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="vc-titular max-w-4xl text-[clamp(2rem,6.5vw,4.5rem)] text-white">
            <span className="block">La mayor parte de la ayuda es</span>
            <span className="mt-2 block w-fit bg-[#FBF8C6] px-[0.3em] py-[0.06em] text-[#0079C1]">
              aseo, comida y agua
            </span>
          </h2>
        </div>
      </div>

      {/* Banda de contenido. El relleno horizontal vive acá y no en la
          <section> de StoryPage, que va sin `px-*` para que las franjas
          de color lleguen a los bordes. */}
      <div className="px-4 py-12 pb-16 sm:px-6 sm:py-14 md:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="max-w-3xl text-lg leading-8 text-[#35708F]">
            Las categorías de entrega muestran los diferentes tipos de ayudas entregadas a las
            comunidades afectadas, de acuerdo con las necesidades identificadas durante la atención
            de la emergencia.
          </p>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-[#35708F]">
            Seleccione una categoría para ver qué artículos incluyó.
          </p>

          {sinDatos ? (
            <div className="mt-10">
              <Aviso>
                <b>No se pudieron cargar las cifras.</b> La composición de la ayuda se calcula desde
                el registro de entregas y en este momento no está disponible. Vuelva a intentarlo en
                unos minutos.
              </Aviso>
            </div>
          ) : (
            <>
              <div className="mt-10 grid gap-8 rounded-xl border border-[#0079C1]/12 bg-white p-5 sm:p-7 lg:grid-cols-[minmax(210px,0.7fr)_minmax(0,1.4fr)] lg:items-center">
                {/* La cifra grande cambia con la selección, pero solo
                    entre datos que existen. Las toneladas no se
                    desagregan por categoría y estimarlas sería
                    inventarlas. */}
                <div className="text-center">
                  {categoria ? (
                    <>
                      <b className="vc-titular block text-[64px] tracking-[-0.02em] tabular-nums text-[#0079C1]">
                        {categoria.unidades.toLocaleString("es-CO")}
                      </b>
                      <span className="mt-3 block text-lg text-[#35708F]">
                        Unidades de {categoria.nombre.toLowerCase()}
                      </span>
                      <span className="mt-2 block text-base leading-6 text-[#6B93AA]">
                        {pctTexto(categoria.unidades)} de toda la ayuda
                        {categoria.municipios !== null && (
                          <>
                            {" · "}
                            {categoria.municipios}{" "}
                            {categoria.municipios === 1 ? "municipio" : "municipios"}
                          </>
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <b className="vc-titular block text-[64px] tracking-[-0.02em] tabular-nums text-[#0079C1]">
                        {totalToneladas.toLocaleString("es-CO")}
                      </b>
                      <span className="mt-3 block text-lg text-[#35708F]">toneladas de ayuda</span>
                      <span className="mt-2 block text-base leading-6 text-[#6B93AA]">
                        {toneladasMedidas
                          ? "entregadas en todo el departamento, por todas las rutas"
                          : "estimadas a partir del número de entregas"}
                      </span>
                    </>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[#123E5C]">
                    ¿De qué está hecha esa ayuda?
                  </h3>

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
                        style={{
                          background: c.color,
                          opacity: activa && activa !== c.nombre ? 0.28 : 1,
                        }}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-base text-[#6B93AA]">
                    Cada bloque es el 1 por ciento de la ayuda. El color indica a qué necesidad
                    responde cada categoría.
                  </p>
                </div>
              </div>

              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-[15px] text-[#35708F]">
                {familiasDeAyuda.map((f) => {
                  // El type guard en el filter, en vez de `as string[]`,
                  // mantiene colores[0] como `string | undefined` bajo
                  // noUncheckedIndexedAccess, de ahí el respaldo.
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

              {/* Categorías y artículos van juntos: al elegir una
                  categoría, la lista de la derecha cambia. Son la misma
                  lectura. */}
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
                              Llegó a {c.municipios}{" "}
                              {c.municipios === 1 ? "municipio" : "municipios"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* El sticky vive en este contenedor y no en la Card para
                    poder colgarle la ref sin envolver la tarjeta en un
                    div que rompiera el posicionamiento. */}
                <div ref={panelRef} className="scroll-mt-6 lg:sticky lg:top-6">
                  {/* El `key` fuerza a React a remontar la lista al
                      cambiar de categoría, y con eso la animación de
                      entrada se vuelve a disparar. */}
                  <Card key={categoria?.nombre ?? "general"} className="relative">
                    {categoria && (
                      <button
                        type="button"
                        onClick={() => setActiva(null)}
                        aria-label={`Cerrar ${categoria.nombre} y volver a lo más entregado`}
                        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-[#6B93AA] transition hover:bg-[#DDF0FA] hover:text-[#0079C1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1]"
                      >
                        <X className="size-5" aria-hidden />
                      </button>
                    )}

                    <p className="pr-10 text-sm font-bold uppercase tracking-[0.16em] text-[#0079C1]">
                      {categoria ? categoria.nombre : "Lo más entregado"}
                    </p>

                    {/* Cuántos productos distintos tiene la categoría en
                        total. Sin esto, "12 de 12" y "12 de 102" se ven
                        igual, y la lista parece completa cuando es la
                        punta de una mucho más larga. */}
                    {categoria && categoria.productosDistintos > categoria.productos.length && (
                      <p className="mt-1 text-[15px] text-[#6B93AA]">
                        Los {categoria.productos.length} más entregados de{" "}
                        {categoria.productosDistintos} artículos distintos.
                      </p>
                    )}

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
                      <div className="mt-6 border-t border-[#0079C1]/12 pt-5">
                        <button
                          type="button"
                          onClick={() => enfocarCategoria(categoria.nombre)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0079C1] px-5 py-3 text-base font-bold text-white transition hover:bg-[#00639F]"
                        >
                          Conozca dónde llegó la ayuda
                        </button>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </>
          )}

          {/* Grupos atendidos responde otra pregunta: no QUÉ se entregó
              sino A QUIÉN. */}
          {poblaciones.length > 0 && (
            <div className="mt-14 rounded-md bg-[#0079C1] p-6 sm:p-10">
              <h3 className="vc-titular text-[clamp(1.5rem,4vw,2.5rem)] text-[#FBF8C6]">
                ¿A quién llegó la ayuda?
              </h3>
              <p className="mt-3 max-w-3xl text-base leading-7 text-white sm:text-lg">
                Conozca los grupos a los que fue dirigida. Una misma entrega puede incluir varios
                grupos, por eso la suma puede ser mayor que el total de entregas.
              </p>

              <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                {poblaciones.map(([nombre, entregas]) => {
                  const maximo = Math.max(1, ...poblaciones.map(([, v]) => v));
                  return (
                    <li key={nombre}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-base text-white sm:text-lg">
                          {nombre}
                        </span>
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
          )}

          <div className="mt-6">
            <Aviso>
              <b>Cómo leer estas cifras.</b> Los porcentajes comparan cuánta ayuda de cada tipo se
              entregó.{" "}
              {toneladasMedidas
                ? "Las toneladas son el peso registrado en todo el departamento, incluidas las rutas que no llegan a un municipio. No están desagregadas por categoría."
                : "Las toneladas son una estimación a partir del número de entregas."}
            </Aviso>
          </div>
        </div>
      </div>
    </>
  );
}