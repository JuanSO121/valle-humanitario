/**
 * AyudaSection.tsx, Nivel 4, "¿Qué se está movilizando?"
 * -----------------------------------------------------------------------
 * La cinta es la composición real de la ayuda. Al elegir una categoría,
 * la lista de la derecha cambia a los productos que la componen; al
 * volver a tocarla, vuelve al top general. Es la misma interacción del
 * tablero HTML, pero con estado de React en vez de innerHTML.
 * -----------------------------------------------------------------------
 */
import { useMemo, useState } from "react";
import {
  categoriasAyuda,
  familiasDeAyuda,
  poblacionesFocalizadas,
  productosMasRepartidos,
  TOTAL_UNIDADES,
} from "@/presentation/data/ayudaData";
import { TOTAL_TONELADAS } from "@/presentation/data/movimientoData";
import { Aviso, Bar, Card, MiniList, SectionLabel, SectionTitle } from "./storyPrimitives";

/** Cada bloque del waffle vale 1 por ciento del total entregado. */
const UNIDADES_POR_BLOQUE = Math.round(TOTAL_UNIDADES / 100);

export function AyudaSection() {
  const [activa, setActiva] = useState<string | null>(null);

  const categoria = activa ? categoriasAyuda.find((c) => c.nombre === activa) : undefined;
  // Math.max sobre el array en vez de [0]: con noUncheckedIndexedAccess,
  // indexar devuelve `CategoriaAyuda | undefined` aunque el array sea
  // literal y no vacío. El 1 es piso de seguridad para no dividir por 0.
  const maxUnidades = Math.max(1, ...categoriasAyuda.map((c) => c.unidades));

  const waffle = useMemo(
    () =>
      categoriasAyuda.flatMap((c) =>
        Array.from({ length: Math.round(c.unidades / UNIDADES_POR_BLOQUE) }, () => c),
      ),
    [],
  );

  const productos = categoria
    ? categoria.productos.map(([label, value]) => ({ label, value, color: categoria.color }))
    : productosMasRepartidos.map(([label, value]) => ({ label, value }));

  return (
    <div className="mx-auto max-w-6xl">
      <SectionLabel>Qué se entregó</SectionLabel>
      <SectionTitle>La mayor parte de la ayuda es aseo, comida y agua</SectionTitle>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[#4E6B7C]">
        Toca una categoría y ves qué artículos incluyó.
      </p>

      {/* Cifra total + composición */}
      <div className="mt-10 grid gap-8 rounded-xl border border-[#00578C]/12 bg-white p-7 lg:grid-cols-[minmax(210px,0.7fr)_minmax(0,1.4fr)] lg:items-center">
        <div className="text-center">
          <b className="block font-serif text-[64px] leading-none tracking-[-0.02em] text-[#00578C]">
            {TOTAL_TONELADAS}
          </b>
          <span className="mt-3 block text-lg text-[#4E6B7C]">toneladas de ayuda</span>
          <span className="mt-2 block text-base leading-6 text-[#6E8B9E]">
            entregadas en todo el departamento
          </span>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-[#0B2233]">De qué está hecha esa ayuda</h3>

          <div className="mt-4 flex h-9 overflow-hidden rounded-md">
            {categoriasAyuda.map((c) => (
              <i
                key={c.nombre}
                title={`${c.nombre}: ${pct(c.unidades)} por ciento de la ayuda`}
                className="block transition-opacity"
                style={{
                  flex: c.unidades,
                  background: c.color,
                  opacity: activa && activa !== c.nombre ? 0.28 : 1,
                }}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-[3px]">
            {waffle.map((c, i) => (
              <i
                key={`${c.nombre}-${i}`}
                title={c.nombre}
                className="block size-[15px] rounded-[2.5px]"
                style={{ background: c.color, opacity: activa && activa !== c.nombre ? 0.28 : 1 }}
              />
            ))}
          </div>
          <p className="mt-3 text-base text-[#6E8B9E]">
            Cada bloque es el 1 por ciento de la ayuda. El color indica a qué necesidad responde
            cada categoría.
          </p>
        </div>
      </div>

      {/* Familias */}
      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-[15px] text-[#4E6B7C]">
        {familiasDeAyuda.map((f) => {
          // El type guard en el filter (en vez de `as string[]`) hace que
          // colores[0] siga siendo `string | undefined` bajo
          // noUncheckedIndexedAccess, de ahí el fallback del fondo.
          const colores = f.categorias
            .map((n) => categoriasAyuda.find((c) => c.nombre === n)?.color)
            .filter((c): c is string => typeof c === "string");
          return (
            <li key={f.nombre} className="flex items-center gap-2">
              <i
                className="block h-2 w-6 rounded-sm"
                style={{
                  background:
                    colores.length > 1
                      ? `linear-gradient(90deg, ${colores.join(",")})`
                      : (colores[0] ?? "#8FAABC"),
                }}
              />
              <b className="font-semibold text-[#0B2233]">{f.nombre}</b>
              <span className="text-[#8FAABC]">· {f.categorias.join(", ")}</span>
            </li>
          );
        })}
      </ul>

      {/* Categorías + productos */}
      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)] lg:items-start">
        <Card className="p-0">
          <p className="px-6 pt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]">
            Categorías
          </p>
          <ul className="mt-3">
            {categoriasAyuda.map((c) => {
              const seleccionada = activa === c.nombre;
              return (
                <li key={c.nombre}>
                  <button
                    type="button"
                    aria-pressed={seleccionada}
                    onClick={() => setActiva(seleccionada ? null : c.nombre)}
                    className={`w-full border-b border-[#00578C]/10 px-6 py-3 text-left transition ${
                      seleccionada ? "bg-[#E8F6FC]" : "hover:bg-[#F7FBFD]"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#0B2233]">
                        <i
                          className="block size-2.5 shrink-0 rounded-sm"
                          style={{ background: c.color }}
                        />
                        <span className="truncate">{c.nombre}</span>
                      </span>
                      <span className="shrink-0 font-serif text-xl text-[#00578C]">
                        {pct(c.unidades)}%
                      </span>
                    </span>
                    <span className="mt-2 block">
                      <Bar ratio={c.unidades / maxUnidades} color={c.color} />
                    </span>
                    <span className="mt-2 block text-[15px] text-[#6E8B9E]">
                      Llegó a {c.destinos} municipios
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]">
              {categoria ? `${categoria.nombre}` : "Lo más entregado"}
            </p>
            <div className="mt-4">
              <MiniList rows={productos} />
            </div>
          </Card>

          <Card>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]">
              Grupos atendidos
            </p>
            <div className="mt-4">
              <MiniList
                rows={poblacionesFocalizadas.map(([label, value]) => ({
                  label,
                  value,
                  color: "#7F207F",
                }))}
              />
            </div>
            <p className="mt-3 text-base text-[#6E8B9E]">
              Entregas que incluyeron ayuda dirigida a cada grupo.
            </p>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Aviso>
          <b>Cómo leer estas cifras.</b> Los porcentajes comparan cuánta ayuda de cada tipo se
          entregó. Las toneladas son una estimación a partir del número de entregas.
        </Aviso>
      </div>
    </div>
  );
}

function pct(unidades: number): number {
  return Math.round((unidades / TOTAL_UNIDADES) * 100);
}