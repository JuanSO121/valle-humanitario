/**
 * CanalesSection.tsx
 * -----------------------------------------------------------------------
 * Las rutas que el conteo por municipio deja fuera.
 *
 * Cali y el centro de acopio de Cartago se calculan desde la API. Los
 * otros cinco canales no pueden: sus destinos no están atados a un
 * municipio, así que quedan fuera de route=flujos por diseño (ver
 * Catalogs.gs, precision SIN_UBICAR). Esos siguen con cifras del
 * catálogo y van marcados.
 *
 * Las unidades por categoría vienen de ENVIOS_CATEGORIA, que ninguna
 * ruta expone todavía. Son las mismas para todos los canales.
 */
import { useOperacion } from "@/presentation/state/OperacionContext";
import { useAyuda } from "@/application/hooks/useAyuda";
import { sameMunicipality } from "@/lib/municipalityName";
import { canales } from "@/presentation/data/canalesData";
import { Card, MiniList, SectionLabel, SectionTitle } from "./storyPrimitives";

const ORIGEN_CARTAGO = "ORI-CARTAGO";
const ID_CALI = "cali";
const ID_CARTAGO = "acopio-cartago";

export function CanalesSection() {
  const op = useOperacion();
  const { data: ayuda } = useAyuda();
  const cartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO);

  /**
   * Las categorías de cada canal salen de route=ayuda cuando existe. El
   * catálogo queda de respaldo y como fuente del color, que es una
   * decisión de diseño y no un dato.
   */
  const categoriasDe = (nombre: string, respaldo: Array<[string, number, string]>) => {
    const vivo = ayuda?.canales.find((c) => sameMunicipality(c.nombre, nombre) || c.nombre === nombre);
    if (!vivo) return respaldo.map(([label, value, color]) => ({ label, value, color }));

    return vivo.categorias.map((cat) => ({
      label: cat.nombre,
      value: cat.unidades,
      color: respaldo.find(([n]) => n === cat.nombre)?.[2] ?? "#6B93AA",
    }));
  };

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
   *
   * Es un estimado y la sección lo dice. Si algún día se registra el peso
   * por despacho, esto se reemplaza por el dato real.
   */
  const entregasDepartamentales = op.totalEntregas + total;
  const toneladasPorEntrega =
    entregasDepartamentales > 0 ? op.totalToneladas / entregasDepartamentales : 0;

  const toneladasDe = (entregas: number) => Math.round(entregas * toneladasPorEntrega);

  return (
    <div className="mx-auto max-w-6xl">
      <SectionTitle>
        ¿De dónde salió la ayuda?
      </SectionTitle>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-[#35708F]">
        Además de los municipios, la ayuda se distribuyó a través de 5 rutas adicionales.
      </p>

      <div className="mt-9 grid gap-4 md:grid-cols-2">
        {canales.map((c) => (
          <article
            key={c.id}
            className="rounded-lg border border-[#0079C1]/12 border-t-[3px] bg-white p-5"
            style={{ borderTopColor: c.color }}
          >
            <h3 className="text-xl font-semibold text-[#123E5C]">{c.nombre}</h3>
            <p className="mt-1 min-h-[34px] text-base leading-6 text-[#6B93AA]">{c.glosa}</p>

            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dd className="text-[23px] font-extrabold leading-none text-[#0079C1]">
                  {entregasDe(c.id, c.despachos).toLocaleString("es-CO")}
                </dd>
                <dt className="mt-1 text-sm text-[#6B93AA]">entregas</dt>
              </div>
              <div>
                <dd className="text-[23px] font-extrabold leading-none text-[#0079C1]">
                  {toneladasDe(entregasDe(c.id, c.despachos)).toLocaleString("es-CO")}
                </dd>
                <dt className="mt-1 text-sm text-[#6B93AA]">toneladas estimadas</dt>
              </div>
            </dl>

            <div className="mt-4">
              <MiniList rows={categoriasDe(c.nombre, c.categorias)} />
            </div>
          </article>
        ))}
      </div>

      {cartago && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.85fr)] lg:items-start">
          <Card>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0079C1]">
              Centro de distribución Cartago
            </p>
            <p className="mt-3 text-base leading-7 text-[#35708F]">
              Esta bodega registra a qué municipio salió cada entrega. Es la única ruta que no parte
              de Cali y explica cómo se abasteció el norte.
            </p>
            <div className="mt-4">
              <MiniList
                rows={cartago.destinos.map((d) => ({
                  label: d.nombre,
                  value: d.entregas,
                  color: "#E2690E",
                }))}
              />
            </div>
          </Card>

          <Card className="border-l-[3px] border-l-[#F0801E]">
            <b className="block text-[33px] font-extrabold leading-none text-[#0079C1]">
              {cartago.entregas}
            </b>
            <p className="mt-1.5 text-base font-semibold text-[#6B93AA]">Entregas desde Cartago</p>
            <p className="mt-3 text-base leading-7 text-[#35708F]">
              Llegaron a {cartago.municipios} municipios del norte del Valle. Se cuentan como
              entrega municipal, igual que las que salen de Cali.
            </p>
            <p className="mt-3 text-base leading-7 text-[#6B93AA]">
              La ayuda enviada al Chocó sí cuenta como entrega. No cuenta como municipio del Valle,
              porque no pertenece al departamento.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}