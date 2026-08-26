/**
 * CanalesSection.tsx — Nivel 6, "Lo que no cabe en el mapa municipal"
 * -----------------------------------------------------------------------
 * Los canales que el consolidado deja fuera por regla. Se muestran
 * juntos y con su total explícito porque el punto del nivel es que sin
 * ellos la operación se ve más chica de lo que fue.
 * -----------------------------------------------------------------------
 */
import { canales, redCartago } from "@/presentation/data/canalesData";
import { Card, MiniList, SectionLabel, SectionTitle } from "./storyPrimitives";

const TOTAL_DESPACHOS = canales.reduce((s, c) => s + c.despachos, 0);
const TOTAL_UNIDADES = canales.reduce((s, c) => s + c.unidades, 0);

export function CanalesSection() {
  return (
    <div className="mx-auto max-w-6xl">
      <SectionLabel>Canales</SectionLabel>
      <SectionTitle>
        Cali, los dos acopios, las otras ayudas solidarias y lo que salió del Valle
      </SectionTitle>
      <p className="mt-4 max-w-2xl text-[15.5px] leading-7 text-[#4E6B7C]">
        El consolidado municipal deja fuera siete canales: {TOTAL_DESPACHOS} despachos y{" "}
        {TOTAL_UNIDADES.toLocaleString("es-CO")} unidades que se movieron igual.
      </p>

      <div className="mt-9 grid gap-4 md:grid-cols-2">
        {canales.map((c) => (
          <article
            key={c.id}
            className="rounded-lg border border-[#00578C]/12 border-t-[3px] bg-white p-5"
            style={{ borderTopColor: c.color }}
          >
            <h3 className="text-[17px] font-semibold text-[#0B2233]">{c.nombre}</h3>
            <p className="mt-1 min-h-[34px] text-[12.2px] leading-5 text-[#6E8B9E]">{c.glosa}</p>

            <dl className="mt-3 flex gap-6">
              {[
                ["despachos", c.despachos],
                ["unidades", c.unidades],
                ["renglones", c.renglones],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dd className="font-serif text-[23px] leading-none text-[#00578C]">
                    {(value as number).toLocaleString("es-CO")}
                  </dd>
                  <dt className="mt-1 text-[10.6px] uppercase tracking-[0.05em] text-[#6E8B9E]">
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
          <p className="mt-3 text-[13.2px] leading-6 text-[#4E6B7C]">
            Los formatos de esta bodega declaran a qué municipio salió cada despacho. Es la única
            ruta del sistema con origen distinto de Cali, y explica cómo se abasteció el norte.
          </p>
          <div className="mt-4">
            <MiniList
              rows={redCartago.map(([label, value]) => ({ label, value, color: "#E2690E" }))}
            />
          </div>
          <p className="mt-3.5 text-[11.8px] leading-5 text-[#6E8B9E]">
            Estas cifras cuentan menciones de municipio, no documentos: un mismo formato puede
            nombrar más de uno, y por eso suman más que los 35 formatos del canal.
          </p>
        </Card>

        <Card className="border-l-[3px] border-l-[#F0801E]">
          <b className="block font-serif text-[33px] leading-none text-[#00578C]">35</b>
          <p className="mt-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#6E8B9E]">
            Formatos del acopio de Cartago
          </p>
          <p className="mt-3 text-[13.4px] leading-6 text-[#4E6B7C]">
            Se reclasificaron desde las carpetas municipales a una carpeta propia del Drive.{" "}
            <b className="text-[#0B2233]">No se cuentan como despacho municipal</b> para no inflar la
            cifra del departamento: es la misma ayuda vista desde la bodega que la despacha.
          </p>
          <p className="mt-3 text-[13px] leading-6 text-[#6E8B9E]">
            Chocó, en cambio, sí suma como despacho —la ayuda se movió— pero no como municipio
            atendido: no pertenece al Valle.
          </p>
        </Card>
      </div>
    </div>
  );
}