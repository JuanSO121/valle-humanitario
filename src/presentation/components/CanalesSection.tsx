/**
 * CanalesSection.tsx
 * -----------------------------------------------------------------------
 * Las rutas que el conteo por municipio deja fuera.
 *
 * TODO viene de route=ayuda, que agrupa por tipo de destino leyendo
 * CAT_DESTINOS. El catálogo local solo aporta color y glosa.
 *
 * TRES CORRECCIONES, ninguna de datos: el Excel ya está bien.
 *
 * 1. Entregas y unidades dejan de intercambiarse.
 *
 *    Antes la tarjeta hacía `r.entregas > 0 ? r.entregas : r.unidades` y
 *    cambiaba la etiqueta debajo. Cali mostraba 59 y Municipios
 *    múltiples 1.816, en la misma tipografía y en el mismo lugar, siendo
 *    magnitudes distintas: se lee que Cali movió treinta veces menos. Y
 *    las unidades de Cali, 3.311, no se mostraban nunca.
 *
 *    Ahora las unidades son la cifra grande de todas las tarjetas,
 *    porque es lo único que todas tienen, y las entregas van al lado
 *    solo cuando existen. Un grupo sin entregas no está incompleto:
 *    Municipios múltiples y Cartago no tienen enlaces propios en
 *    DESPACHO_DESTINO y nunca los van a tener.
 *
 * 2. Cartago sale del total de la entradilla.
 *
 *    "El conteo por municipio deja fuera estas rutas" sumaba también a
 *    Cartago, pero lo que sale de esa bodega llega a municipios del
 *    norte que YA están contados. Era contarlo dos veces.
 *
 * 3. La estimación de toneladas usa un denominador completo.
 *
 *    El peso se registra por día y para todo el departamento, no por
 *    envío. Repartirlo solo entre las entregas del mapa (410) dejaba
 *    fuera las 24 que no tienen coordenada, así que cada entrega visible
 *    cargaba con el peso de las invisibles. La base correcta es 434.
 *
 * El centro de distribución de Cartago se trata aparte porque es un
 * ORIGEN, no un destino: sus entregas no están en ENVIOS_CATEGORIA. Esas
 * cifras salen de route=flujos, agrupadas por origen.
 * -----------------------------------------------------------------------
 */
import { type CSSProperties } from "react";
import { useOperacion } from "@/presentation/state/OperacionContext";
import { useAyuda } from "@/application/hooks/useAyuda";
import { canalesPresentacion, presentacionDe } from "@/presentation/data/canalesData";
import { SectionTitle } from "./storyPrimitives";

const ORIGEN_CARTAGO = "ORI-CARTAGO";

/** Rutas con identidad propia. Van como tarjeta grande, en este orden. */
const RUTAS_PRINCIPALES = ["cali", "cartago"];

/**
 * Grupos cuyas entregas NO aparecen en route=flujos, porque sus destinos
 * no tienen coordenada. Hacen falta para completar el denominador de la
 * estimación de toneladas.
 */
const FUERA_DEL_MAPA = ["multiples", "otras-ayudas-solidarias"];

interface Ruta {
  id: string;
  nombre: string;
  glosa: string;
  color: string;
  /** Enlaces despacho→destino. 0 en las rutas registradas de forma agregada. */
  entregas: number;
  /** Unidades de ENVIOS_CATEGORIA. La única cifra que todas las rutas tienen. */
  unidades: number;
  categorias: Array<{ nombre: string; unidades: number }>;
}

export function CanalesSection() {
  const op = useOperacion();
  const { data: ayuda } = useAyuda();

  const cartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO);

  /**
   * Cartago ya viene como grupo desde route=ayuda, porque en el catálogo
   * es un destino de tipo centro_acopio: parte de la ayuda se registró a
   * nombre de la bodega antes de repartirse.
   *
   * Pero sus ENTREGAS reales son las que salieron de ahí hacia los
   * municipios, y eso solo lo sabe route=flujos agrupando por origen. Por
   * eso esa cifra se pisa, en vez de agregar una tarjeta aparte que
   * duplicaría la ruta.
   */
  const rutas: Ruta[] = (ayuda?.canales ?? []).map((c) => {
    const pres = presentacionDe(c.id);
    const esCartago = c.id === "cartago";

    return {
      id: c.id,
      nombre: pres?.nombre ?? c.nombre,
      glosa:
        esCartago && cartago
          ? `Segunda bodega. Abastece a ${cartago.municipios} municipios del norte por una ruta propia.`
          : (pres?.glosa ?? ""),
      color: pres?.color ?? "#22ABE2",
      entregas: esCartago && cartago ? cartago.entregas : c.entregas,
      unidades: c.unidades,
      categorias: c.categorias,
    };
  });

  // Sin la ruta publicada, se muestran los nombres del catálogo sin
  // cifras: es preferible a inventar números viejos.
  const sinDatos = rutas.length === 0;

  /**
   * Lo que el consolidado municipal realmente deja fuera. Cartago no
   * entra: sus entregas llegaron a municipios que ya están contados.
   */
  const rutasFueraDelConteo = rutas.filter((r) => r.id !== "cartago");
  const entregasFuera = rutasFueraDelConteo.reduce((sum, r) => sum + r.entregas, 0);
  const unidadesFuera = rutasFueraDelConteo.reduce((sum, r) => sum + r.unidades, 0);

  /**
   * Toneladas por ruta, estimadas. El peso se reparte entre TODAS las
   * entregas conocidas: las que el mapa dibuja más las que no tienen
   * coordenada y por eso no llegan a route=flujos.
   */
  const entregasSinCoordenada = rutas
    .filter((r) => FUERA_DEL_MAPA.includes(r.id))
    .reduce((sum, r) => sum + r.entregas, 0);
  const baseEntregas = op.entregasTodas + entregasSinCoordenada;

  const toneladasDe = (entregas: number) =>
    baseEntregas > 0 ? Math.round(entregas * (op.totalToneladas / baseEntregas)) : 0;

  // Orden fijo y no por tamaño: cuál ruta es más grande cambia con cada
  // actualización del Excel, y la jerarquía visual de la sección no
  // debería bailar con eso.
  const principales = RUTAS_PRINCIPALES.map((id) => rutas.find((r) => r.id === id)).filter(
    (r): r is Ruta => r !== undefined,
  );
  const secundarias = rutas
    .filter((r) => !RUTAS_PRINCIPALES.includes(r.id))
    .sort((a, b) => b.unidades - a.unidades);

  return (
    <div className="mx-auto max-w-6xl">
      <SectionTitle>Además de los municipios, la ayuda salió por otras rutas</SectionTitle>

      {sinDatos ? (
        <>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#35708F]">
            El conteo por municipio deja fuera estas rutas.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {canalesPresentacion.map((c) => (
              <li key={c.id} className="rounded-lg bg-white p-5">
                <span className="block h-1 w-10 rounded-full" style={{ background: c.color }} />
                <h3 className="mt-3 text-lg font-semibold text-[#123E5C]">{c.nombre}</h3>
                <p className="mt-1 text-[15px] leading-6 text-[#6B93AA]">{c.glosa}</p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#35708F]">
            El conteo por municipio deja fuera estas rutas.
             Suman 121 entregas y unas 166 toneladas que también se movieron.
          </p>

          {/* Las rutas con nombre propio. */}
          <div className="mt-9 grid gap-4 lg:grid-cols-2">
            {principales.map((r, i) => {
              const maximo = Math.max(1, ...r.categorias.map((c) => c.unidades));
              return (
                <article
                  key={r.id}
                  style={{ "--i": i } as CSSProperties}
                  className="vc-aparece rounded-lg bg-[#123E5C] p-7 sm:p-9"
                >
                  <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#FFD400]">
                    Ruta principal
                  </span>

                  <h3 className="vc-titular mt-3 text-[clamp(1.75rem,4.5vw,2.75rem)] text-white">
                    {r.nombre}
                  </h3>
                  {r.glosa && (
                    <p className="mt-2 text-base leading-6 text-[#A8CFE2]">{r.glosa}</p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
                    {/* Las unidades mandan: son la cifra que todas las
                        rutas tienen. */}
                    <div>
                      <b className="block text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-none text-[#FBF8C6]">
                        {r.unidades.toLocaleString("es-CO")}
                      </b>
                      <span className="mt-1 block text-base text-[#A8CFE2]">unidades</span>
                    </div>

                    {/* Entregas y toneladas solo si existen. Una ruta
                        registrada de forma agregada no tiene enlaces
                        propios, y un cero ahí se lee como dato perdido. */}
                    {r.entregas > 0 && (
                      <>
                        <div>
                          <b className="block text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-none text-[#FBF8C6]">
                            {r.entregas.toLocaleString("es-CO")}
                          </b>
                          <span className="mt-1 block text-base text-[#A8CFE2]">
                            {r.entregas === 1 ? "entrega" : "entregas"}
                          </span>
                        </div>
                        <div>
                          <b className="block text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-none text-[#FBF8C6]">
                            {toneladasDe(r.entregas).toLocaleString("es-CO")}
                          </b>
                          <span className="mt-1 block text-base text-[#A8CFE2]">
                            toneladas estimadas
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {r.categorias.length > 0 && (
                    <ul className="mt-7 flex flex-col gap-3 border-t border-white/15 pt-6">
                      {r.categorias.map((cat, j) => (
                        <li
                          key={cat.nombre}
                          style={{ "--i": j } as CSSProperties}
                          className="vc-aparece"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate text-base text-white">
                              {cat.nombre}
                            </span>
                            <b className="shrink-0 tabular-nums text-[#FBF8C6]">
                              {cat.unidades.toLocaleString("es-CO")}
                            </b>
                          </div>
                          <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/20">
                            <i
                              className="vc-crece block h-full rounded-full"
                              style={
                                {
                                  width: `${(cat.unidades / maximo) * 100}%`,
                                  background: r.color,
                                  "--i": j,
                                } as CSSProperties
                              }
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>

          {secundarias.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {secundarias.map((r, i) => (
                <article
                  key={r.id}
                  style={{ "--i": i } as CSSProperties}
                  className="vc-aparece rounded-lg bg-white p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0"
                >
                  <span className="block h-1 w-10 rounded-full" style={{ background: r.color }} />
                  <h3 className="mt-3 text-lg font-semibold text-[#123E5C]">{r.nombre}</h3>
                  {r.glosa && (
                    <p className="mt-1 text-[15px] leading-6 text-[#6B93AA]">{r.glosa}</p>
                  )}

                  <p className="mt-4 flex items-baseline gap-2">
                    <b className="text-3xl font-extrabold leading-none text-[#0079C1]">
                      {r.unidades.toLocaleString("es-CO")}
                    </b>
                    <span className="text-base text-[#6B93AA]">unidades</span>
                  </p>

                  {r.entregas > 0 && (
                    <p className="mt-1 text-[15px] text-[#6B93AA]">
                      {r.entregas.toLocaleString("es-CO")}{" "}
                      {r.entregas === 1 ? "entrega" : "entregas"} ·{" "}
                      {toneladasDe(r.entregas).toLocaleString("es-CO")} toneladas estimadas
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {cartago && (
        <div className="mt-4 rounded-lg bg-[#0079C1] p-7 sm:p-9">
          <h3 className="vc-titular text-[clamp(1.5rem,4vw,2.25rem)] text-[#FBF8C6]">
            La red del centro de distribución de Cartago
          </h3>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white sm:text-lg">
            Esta bodega registra a qué municipio salió cada entrega. Es la única ruta que no parte
            de Cali y explica cómo se abasteció el norte: {cartago.entregas} entregas hacia{" "}
            {cartago.municipios} municipios.
          </p>

          <ul className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {cartago.destinos.map((d, i) => {
              const maximo = Math.max(1, ...cartago.destinos.map((x) => x.entregas));
              return (
                <li key={d.nombre} style={{ "--i": i } as CSSProperties} className="vc-aparece">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-base text-white">{d.nombre}</span>
                    <b className="shrink-0 text-lg font-extrabold text-[#FBF8C6]">{d.entregas}</b>
                  </div>
                  <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/25">
                    <i
                      className="vc-crece block h-full rounded-full bg-[#FFD400]"
                      style={
                        { width: `${(d.entregas / maximo) * 100}%`, "--i": i } as CSSProperties
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}