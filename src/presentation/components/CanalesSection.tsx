/**
 * CanalesSection.tsx, Nivel 6, "Lo que no cabe en el mapa municipal"
 * -----------------------------------------------------------------------
 * Los canales que el consolidado deja fuera por regla. Se muestran
 * juntos y con su total explícito porque el punto del nivel es que sin
 * ellos la operación se ve más chica de lo que fue.
 * -----------------------------------------------------------------------
 */
import { canales, redCartago } from "@/presentation/data/canalesData";
import { Card, MiniList, SectionLabel, SectionTitle } from "./storyPrimitives";

const TOTAL_DESPACHOS = canales.reduce((s, c) => s + c.despachos, 0);

export function CanalesSection() {
  return (
    <div className="mx-auto max-w-6xl">
      <SectionLabel>De dónde salió</SectionLabel>
      <SectionTitle>
        Además de los municipios, la ayuda salió por otras siete rutas
      </SectionTitle>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[#4E6B7C]">
        El conteo por municipio deja fuera estas rutas. Suman {TOTAL_DESPACHOS} entregas que
        también se movieron.
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

            <dl className="mt-3 flex gap-6">
              {[
                ["entregas", c.despachos],
                                              ].map(([label, value]) => (
                <div key={label as string}>
                  <dd className="font-serif text-[23px] leading-none text-[#00578C]">
                    {(value as number).toLocaleString("es-CO")}
                  </dd>
                  <dt className="mt-1 text-sm text-[#6E8B9E]">
                    {label}
                  </dt>
                </div>
              ))}
            </dl>

            <div className="mt-4">
              <MiniList
                rows={c.categorias.map(([label, value, color]) => ({ label, value, color }))}
              />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.85fr)] lg:items-start">
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]">
            La red del acopio de Cartago
          </p>
          <p className="mt-3 text-base leading-7 text-[#4E6B7C]">
            Esta bodega registra a qué municipio salió cada entrega. Es la única ruta que no parte
            de Cali y explica cómo se abasteció el norte.
          </p>
          <div className="mt-4">
            <MiniList
              rows={redCartago.map(([label, value]) => ({ label, value, color: "#E2690E" }))}
            />
          </div>
          <p className="mt-3.5 text-[15px] leading-6 text-[#6E8B9E]">
            Una misma entrega llega a veces a más de un municipio, por eso la suma de esta lista
            es mayor que el total del centro de acopio.
          </p>
        </Card>

        <Card className="border-l-[3px] border-l-[#F0801E]">
          <b className="block font-serif text-[33px] leading-none text-[#00578C]">35</b>
          <p className="mt-1.5 text-base font-semibold text-[#6E8B9E]">
            Entregas desde Cartago
          </p>
          <p className="mt-3 text-base leading-7 text-[#4E6B7C]">
            <b className="text-[#0B2233]">No se cuentan como entrega municipal</b> para no repetir
            la misma ayuda dos veces. Es la ayuda vista desde la bodega que la envía.
          </p>
          <p className="mt-3 text-base leading-7 text-[#6E8B9E]">
            La ayuda enviada al Chocó sí cuenta como entrega. No cuenta como municipio del Valle,
            porque no pertenece al departamento.
          </p>
        </Card>
      </div>
    </div>
  );
}