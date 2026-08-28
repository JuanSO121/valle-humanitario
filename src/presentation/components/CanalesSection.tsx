/**
 * CanalesSection.tsx
 * -----------------------------------------------------------------------
 * Las rutas que el conteo por municipio deja fuera.
 *
 * Cali y el centro de acopio de Cartago se calculan desde la API. Los
 * otros cinco no pueden: sus destinos no están atados a un municipio, así
 * que quedan fuera de route=flujos por diseño (ver Catalogs.gs,
 * precision SIN_UBICAR). Esos siguen con cifras del catálogo.
 *
 * SOBRE LA PRESENTACIÓN
 *
 * Las siete rutas no pesan lo mismo. Cali y Cartago concentran la mayor
 * parte y las otras cinco son casos puntuales, algunas de una sola
 * entrega. Mostrarlas todas en fichas idénticas hacía parecer que un
 * despacho a Inciva equivale al acopio que abastece al norte del
 * departamento.
 *
 * Ahora las dos grandes ocupan fichas destacadas y las cinco restantes
 * van en una fila compacta debajo.
 * -----------------------------------------------------------------------
 */
import { type CSSProperties } from "react";
import { useOperacion } from "@/presentation/state/OperacionContext";
import { useAyuda } from "@/application/hooks/useAyuda";
import { sameMunicipality } from "@/lib/municipalityName";
import { canales } from "@/presentation/data/canalesData";
import { SectionLabel, SectionTitle } from "./storyPrimitives";

const ORIGEN_CARTAGO = "ORI-CARTAGO";
const ID_CALI = "cali";
const ID_CARTAGO = "acopio-cartago";

export function CanalesSection() {
  const op = useOperacion();
  const { data: ayuda } = useAyuda();
  const cartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO);

  // Las dos rutas que la API sí conoce pisan su cifra del catálogo. Antes
  // la tarjeta decía 35 mientras las conclusiones decían 38, calculadas
  // sobre los mismos despachos.
  const entregasDe = (id: string, respaldo: number) => {
    if (id === ID_CALI && op.entregasCali > 0) return op.entregasCali;
    if (id === ID_CARTAGO && cartago) return cartago.entregas;
    return respaldo;
  };

  const total = canales.reduce((sum, c) => sum + entregasDe(c.id, c.despachos), 0);

  /**
   * Toneladas por canal, estimadas.
   *
   * La hoja TONELADAS registra el peso POR DÍA y para todo el
   * departamento. No hay ninguna fuente que diga cuánto pesó lo que salió
   * por cada ruta, así que la única forma de dar esa cifra es repartir el
   * total entre todas las entregas conocidas.
   *
   * El denominador incluye las municipales Y las de estos canales: si se
   * dividiera solo entre las municipales, se le atribuiría a los
   * municipios todo el peso del departamento y cada canal quedaría
   * inflado.
   */
  const entregasDepartamentales = op.entregasTodas > 0 ? op.entregasTodas : op.totalEntregas + total;
  const toneladasPorEntrega =
    entregasDepartamentales > 0 ? op.totalToneladas / entregasDepartamentales : 0;

  const toneladasDe = (entregas: number) => Math.round(entregas * toneladasPorEntrega);

  /**
   * Las categorías de cada canal salen de route=ayuda cuando existe. El
   * catálogo queda de respaldo y como fuente del color, que es una
   * decisión de diseño y no un dato.
   */
  const categoriasDe = (nombre: string, respaldo: Array<[string, number, string]>) => {
    const vivo = ayuda?.canales.find(
      (c) => sameMunicipality(c.nombre, nombre) || c.nombre === nombre,
    );
    if (!vivo) return respaldo.map(([label, value, color]) => ({ label, value, color }));

    return vivo.categorias.map((cat) => ({
      label: cat.nombre,
      value: cat.unidades,
      color: respaldo.find(([n]) => n === cat.nombre)?.[2] ?? "#6B93AA",
    }));
  };

  const conEntregas = canales
    .map((c) => ({ ...c, entregas: entregasDe(c.id, c.despachos) }))
    .sort((a, b) => b.entregas - a.entregas);

  const principales = conEntregas.slice(0, 2);
  const secundarias = conEntregas.slice(2);

  return (
    <div className="mx-auto max-w-6xl">
      <SectionLabel>¿De dónde salió?</SectionLabel>
      <SectionTitle>Además de los municipios, la ayuda salió por otras rutas</SectionTitle>

      <p className="mt-5 max-w-2xl text-lg leading-8 text-[#35708F]">
        El conteo por municipio deja fuera estas rutas.
      </p>

      {/* Las dos rutas grandes. */}
      <div className="mt-9 grid gap-4 lg:grid-cols-2">
        {principales.map((c, i) => (
          <article
            key={c.id}
            style={{ "--i": i } as CSSProperties}
            className="vc-aparece rounded-lg bg-[#123E5C] p-7 sm:p-9"
          >
            <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#FFD400]">
              Ruta principal
            </span>

            <h3 className="vc-titular mt-3 text-[clamp(1.75rem,4.5vw,2.75rem)] text-white">
              {c.nombre}
            </h3>
            <p className="mt-2 text-base leading-6 text-[#A8CFE2]">{c.glosa}</p>

            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <b className="block text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-none text-[#FBF8C6]">
                  {c.entregas.toLocaleString("es-CO")}
                </b>
                <span className="mt-1 block text-base text-[#A8CFE2]">entregas</span>
              </div>
              <div>
                <b className="block text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-none text-[#FBF8C6]">
                  {toneladasDe(c.entregas).toLocaleString("es-CO")}
                </b>
                <span className="mt-1 block text-base text-[#A8CFE2]">toneladas estimadas</span>
              </div>
            </div>

            <ul className="mt-7 flex flex-col gap-3 border-t border-white/15 pt-6">
              {categoriasDe(c.nombre, c.categorias).map((cat, j) => {
                const maximo = Math.max(
                  1,
                  ...categoriasDe(c.nombre, c.categorias).map((x) => x.value),
                );
                return (
                  <li key={cat.label} style={{ "--i": j } as CSSProperties} className="vc-aparece">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-base text-white">{cat.label}</span>
                      <b className="shrink-0 tabular-nums text-[#FBF8C6]">
                        {cat.value.toLocaleString("es-CO")}
                      </b>
                    </div>
                    <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/20">
                      <i
                        className="vc-crece block h-full rounded-full"
                        style={
                          {
                            width: `${(cat.value / maximo) * 100}%`,
                            background: cat.color,
                            "--i": j,
                          } as CSSProperties
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>

      {/* Las cinco restantes, compactas. Varias son de una sola entrega y
          en fichas del mismo tamaño que las de arriba parecían pesar lo
          mismo que el acopio que abastece al norte. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {secundarias.map((c, i) => (
          <article
            key={c.id}
            style={{ "--i": i } as CSSProperties}
            className="vc-aparece rounded-lg bg-white p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0"
          >
            <span className="block h-1 w-10 rounded-full" style={{ background: c.color }} />
            <h3 className="mt-3 text-lg font-semibold text-[#123E5C]">{c.nombre}</h3>
            <p className="mt-1 text-[15px] leading-6 text-[#6B93AA]">{c.glosa}</p>

            <p className="mt-4 flex items-baseline gap-2">
              <b className="text-3xl font-extrabold leading-none text-[#0079C1]">{c.entregas}</b>
              <span className="text-base text-[#6B93AA]">
                {c.entregas === 1 ? "entrega" : "entregas"}
              </span>
            </p>
            <p className="mt-1 text-[15px] text-[#6B93AA]">
              {toneladasDe(c.entregas).toLocaleString("es-CO")} toneladas estimadas
            </p>
          </article>
        ))}
      </div>

      {cartago && (
        <div className="mt-4 rounded-lg bg-[#0079C1] p-7 sm:p-9">
          <h3 className="vc-titular text-[clamp(1.5rem,4vw,2.25rem)] text-[#FBF8C6]">
            La red del acopio de Cartago
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

      <p className="mt-6 max-w-3xl text-base leading-7 text-[#6B93AA]">
        Las toneladas por ruta son una estimación. El peso se registra por día y para todo el
        departamento, no por cada envío, así que el total se reparte entre las entregas. La ayuda
        enviada al Chocó cuenta como entrega, pero no como municipio del Valle.
      </p>
    </div>
  );
}