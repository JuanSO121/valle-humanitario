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
      color: respaldo.find(([n]) => n === cat.nombre)?.[2] ?? "#6E8B9E",
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

  return (
    <div className="mx-auto max-w-6xl">
      <SectionLabel>De dónde salió</SectionLabel>
      <SectionTitle>
        Además de los municipios, la ayuda salió por otras siete rutas
      </SectionTitle>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-[#4E6B7C]">
        El conteo por municipio deja fuera estas rutas. Suman {total} entregas que también se
        movieron.
      </p>

      <div className="mt-9 grid gap-4 md:grid-cols-2">
        {canales.map((c) => (
          <article
            key={c.id}
            className="rounded-lg border border-[#00578C]/12 border-t-[3px] bg-white p-5"
            style={{ borderTopColor: c.color }}
          >
            <h3 className="text-xl font-semibold text-[#0B2233]">{c.nombre}</h3>
            <p className="mt-1 min-h-[34px] text-base leading-6 text-[#6E8B9E]">{c.glosa}</p>

            <dl className="mt-3">
              <dd className="font-serif text-[23px] leading-none text-[#00578C]">
                {entregasDe(c.id, c.despachos).toLocaleString("es-CO")}
              </dd>
              <dt className="mt-1 text-sm text-[#6E8B9E]">entregas</dt>
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
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]">
              La red del acopio de Cartago
            </p>
            <p className="mt-3 text-base leading-7 text-[#4E6B7C]">
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
            <b className="block font-serif text-[33px] leading-none text-[#00578C]">
              {cartago.entregas}
            </b>
            <p className="mt-1.5 text-base font-semibold text-[#6E8B9E]">Entregas desde Cartago</p>
            <p className="mt-3 text-base leading-7 text-[#4E6B7C]">
              Llegaron a {cartago.municipios} municipios del norte del Valle. Se cuentan como
              entrega municipal, igual que las que salen de Cali.
            </p>
            <p className="mt-3 text-base leading-7 text-[#6E8B9E]">
              La ayuda enviada al Chocó sí cuenta como entrega. No cuenta como municipio del Valle,
              porque no pertenece al departamento.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}