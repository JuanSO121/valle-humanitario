/**
 * AyudaSection.tsx
 * -----------------------------------------------------------------------
 * Composición de la ayuda entregada. Al elegir una categoría, la lista
 * de la derecha cambia a los artículos que la componen.
 *
 * QUÉ VIENE DE LA BASE Y QUÉ NO
 *
 * De route=ayuda: unidades, porcentaje, municipios por categoría, y las
 * poblaciones atendidas. De route=toneladas: el peso. Todo eso se
 * actualiza solo cuando cambia el Excel.
 *
 * De ayudaData.ts, a mano: el color de cada categoría, que es una
 * decisión de diseño, y los NOMBRES DE PRODUCTO de la lista de la
 * derecha. Esos últimos no se pueden conectar: ENVIOS_CATEGORIA guarda
 * cuántos productos distintos trae cada envío, no cuáles. Mientras esa
 * lista siga siendo una transcripción, hay que revisarla a mano cuando
 * cambie el inventario.
 *
 * OJO CON EL RESPALDO. `TOTAL_UNIDADES` de ayudaData.ts quedó viejo:
 * declara 256.650 unidades y el Excel tiene 96.360. Solo se usa si
 * route=ayuda no responde, pero en ese caso la página muestra
 * porcentajes falsos en vez de no mostrar ninguno. Conviene actualizarlo
 * o, mejor, quitar el respaldo y no dibujar los porcentajes sin datos.
 *
 * SOBRE LAS BANDAS
 *
 * La sección ahora emite sus propias franjas a sangre, como las de
 * "¿Cuándo llegaron las ayudas?" y "¿Cuánta ayuda recibió cada
 * municipio?": titular sobre cyan, contenido sobre el fondo de la
 * sección.
 *
 * Antes no las emitía, aunque el comentario de StoryPage decía que sí.
 * Como la <section> de allá no lleva `px-*` —justamente porque se
 * esperaba que el relleno lo pusiera cada banda de acá— el contenido
 * quedaba pegado al borde de la pantalla en todo lo que fuera menor a
 * 1152 px, que es donde `max-w-6xl` deja de tocar los lados.
 *
 * El titular va compuesto como el banner de la campaña: la primera
 * mitad dentro de una caja crema en azul, la segunda suelta en blanco
 * sobre el cyan.
 *
 * TRES CAMBIOS ANTERIORES QUE SIGUEN VIGENTES
 *
 * 1. El panel grande responde a la selección, con datos reales.
 *
 *    Las toneladas NO se desagregan por categoría, y estimarlas
 *    repartiendo el total proporcional a las unidades sería inventarlas:
 *    esa columna mezcla mercados, paquetes, kilos y pacas, así que
 *    asumiría que un mercado pesa lo mismo que un paquete de pañales.
 *
 *    En vez de eso, al elegir una categoría la cifra grande pasa a ser
 *    las unidades de esa categoría, con su porcentaje y sus municipios.
 *
 * 2. Al elegir una categoría, la vista baja hasta la lista de artículos.
 *
 *    En móvil la tarjeta queda debajo de la rejilla, así que al tocar la
 *    última categoría no pasaba nada visible. Se usa block "nearest": en
 *    escritorio, donde la tarjeta es sticky y ya está a la vista, no se
 *    mueve nada.
 *
 * 3. Cerrar es una X en la esquina, no un botón de texto abajo.
 * -----------------------------------------------------------------------
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
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
import { Aviso, Card } from "./storyPrimitives";

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
  const panelRef = useRef<HTMLDivElement>(null);

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
   * Herramientas y materiales son 851 unidades de 96.360, un 0,88 por
   * ciento, y Salud son 87, un 0,09. Redondeados dan cero, y un cero se
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

  /**
   * Al elegir una categoría, llevar la vista a la lista de artículos.
   *
   * `block: "nearest"` es la pieza importante: si la tarjeta ya está
   * visible, como en escritorio donde es sticky, el navegador no
   * desplaza nada. El salto ocurre solo cuando hace falta, que es en
   * pantallas angostas.
   *
   * No se hace al deseleccionar: ahí el foco vuelve a la rejilla y
   * moverse sería desorientador.
   */
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
    <>
      {/* Banda del titular, a sangre. Mismo tratamiento que el banner de
          la campaña: la primera mitad dentro de una caja crema en azul,
          la segunda suelta en blanco sobre el cyan.

          El relleno de la caja va en `em` y no en píxeles para que crezca
          con el `clamp` del titular. En píxeles, a 2rem ahogaría el texto
          y a 4.5rem quedaría como un filete suelto alrededor.

          `box-decoration-clone` sostiene la pieza cuando la caja parte en
          dos líneas, cosa que acá pasa seguido porque el titular es
          largo: sin él, el relleno lateral se aplica solo al comienzo del
          primer fragmento y al final del último, y la caja aparece
          abierta por un lado.

          El `leading` sube a 1.25 porque la caja crece hacia arriba y
          hacia abajo desde la línea base: con la interlínea cerrada del
          titular, las líneas de la caja se montarían entre sí. */}
      <div className="bg-[#22ABE2] px-4 py-12 sm:px-6 sm:py-12 md:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="vc-titular max-w-4xl text-[clamp(2rem,6.5vw,4.5rem)] leading-[1.4] text-white">
            <span>
              La mayor parte de la ayuda
            </span>
            <br />
            <span className="box-decoration-clone bg-[#FBF8C6] px-[0.3em] py-[0.1em] text-[#0079C1]">
              es aseo, comida y agua
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

          <div className="mt-10 grid gap-8 rounded-xl border border-[#0079C1]/12 bg-white p-5 sm:p-7 lg:grid-cols-[minmax(210px,0.7fr)_minmax(0,1.4fr)] lg:items-center">
            {/* La cifra grande cambia con la selección, pero solo entre
                datos que existen. Las toneladas no se desagregan por
                categoría y estimarlas sería inventarlas, así que cuando
                hay categoría elegida el protagonismo pasa a las unidades. */}
            <div className="text-center">
              {categoria ? (
                <>
                  <b className="block font-serif text-[64px] leading-none tracking-[-0.02em] text-[#0079C1]">
                    {categoria.unidades.toLocaleString("es-CO")}
                  </b>
                  <span className="mt-3 block text-lg text-[#35708F]">
                    unidades de {categoria.nombre.toLowerCase()}
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
                  <span className="mt-4 block border-t border-[#0079C1]/12 pt-3 text-[15px] leading-6 text-[#6B93AA]">
                    El peso se registra por día y para todo el departamento
                    {toneladasMedidas ? ` (${totalToneladas.toLocaleString("es-CO")} t)` : ""}, no
                    por categoría.
                  </span>
                </>
              ) : (
                <>
                  <b className="block font-serif text-[64px] leading-none tracking-[-0.02em] text-[#0079C1]">
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
                    style={{
                      background: c.color,
                      opacity: activa && activa !== c.nombre ? 0.28 : 1,
                    }}
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

            {/* El sticky pasó de la Card a este contenedor para poder colgarle
                la ref sin envolver la tarjeta en un div que rompiera el
                posicionamiento. `scroll-mt-6` deja aire arriba cuando el
                navegador lo trae a la vista. */}
            <div ref={panelRef} className="scroll-mt-6 lg:sticky lg:top-6">
              {/* El `key` fuerza a React a remontar la lista al cambiar de
                  categoría, y con eso la animación de entrada se vuelve a
                  disparar. Sin él, los artículos se reemplazarían de golpe. */}
              <Card key={categoria?.nombre ?? "general"} className="relative">
                {/* Cerrar donde se lo busca. Antes era un botón de texto al
                    final de la tarjeta: para volver había que recorrer toda
                    la lista de artículos. */}
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
                    {/* Llevar la categoría al mapa. La lista de artículos dice
                        QUÉ se entregó; el mapa dice DÓNDE. Es la continuación
                        natural de la lectura, y ahora es la única acción de
                        la tarjeta: cerrar se hace con la X de arriba. */}
                    <button
                      type="button"
                      onClick={() => enfocarCategoria(categoria.nombre)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0079C1] px-5 py-3 text-base font-bold text-white transition hover:bg-[#00639F]"
                    >
                      Ver en el mapa dónde llegó
                    </button>
                  </div>
                )}
              </Card>
            </div>
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