/**
 * CanalesSection.tsx
 * -----------------------------------------------------------------------
 * Las rutas que el conteo por municipio deja fuera.
 *
 * TODO viene de route=ayuda, que agrupa por tipo de destino leyendo
 * CAT_DESTINOS. El catálogo local solo aporta color y glosa.
 *
 * El centro de distribución de Cartago se suma aparte porque es un
 * ORIGEN, no un destino: no aparece en ENVIOS_CATEGORIA. Sus cifras
 * salen de route=flujos, agrupadas por origen.
 * -----------------------------------------------------------------------
 */
import { type CSSProperties } from "react";
import { useOperacion } from "@/presentation/state/OperacionContext";
import { useAyuda } from "@/application/hooks/useAyuda";
import { canalesPresentacion, presentacionDe } from "@/presentation/data/canalesData";
import { SectionLabel, SectionTitle } from "./storyPrimitives";

const ORIGEN_CARTAGO = "ORI-CARTAGO";

interface Ruta {
  id: string;
  nombre: string;
  glosa: string;
  color: string;
  entregas: number;
  /** Unidades del grupo. Para Municipios múltiples es lo único que tiene. */
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
  const rutas: Ruta[] = (ayuda?.canales ?? [])
    .map((c) => {
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
    })
    // Se ordena por unidades y no por entregas: Municipios múltiples no
    // tiene enlaces propios en DESPACHO_DESTINO, así que ordenar por
    // entregas la mandaba al final con un cero.
    .sort((a, b) => b.unidades - a.unidades);

  // Sin la ruta publicada, se muestran los nombres del catálogo sin
  // cifras: es preferible a inventar números viejos.
  const sinDatos = rutas.length === 0;

  const totalRutas = rutas.reduce((sum, r) => sum + r.entregas, 0);

  /**
   * Toneladas por ruta, estimadas. El peso se registra por día y para
   * todo el departamento, no por envío, así que el total se reparte
   * entre todas las entregas conocidas.
   */
  const toneladasDe = (entregas: number) =>
    op.entregasTodas > 0
      ? Math.round(entregas * (op.totalToneladas / op.entregasTodas))
      : 0;

  const principales = rutas.slice(0, 2);
  const secundarias = rutas.slice(2);

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
            El conteo por municipio deja fuera estas rutas. Suman {totalRutas} entregas y unas{" "}
            {toneladasDe(totalRutas).toLocaleString("es-CO")} toneladas que también se movieron.
          </p>

          {/* Las dos rutas grandes. */}
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
                    <div>
                      <b className="block text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-none text-[#FBF8C6]">
                        {(r.entregas > 0 ? r.entregas : r.unidades).toLocaleString("es-CO")}
                      </b>
                      <span className="mt-1 block text-base text-[#A8CFE2]">
                        {r.entregas > 0 ? "entregas" : "unidades"}
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
                      {(r.entregas > 0 ? r.entregas : r.unidades).toLocaleString("es-CO")}
                    </b>
                    <span className="text-base text-[#6B93AA]">
                      {r.entregas > 0 ? (r.entregas === 1 ? "entrega" : "entregas") : "unidades"}
                    </span>
                  </p>
                  {r.entregas > 0 && (
                    <p className="mt-1 text-[15px] text-[#6B93AA]">
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