/**
 * AyudaSection.tsx — Nivel 4, "¿Qué se está movilizando?"
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
  TOTAL_RENGLONES,
  TOTAL_UNIDADES,
} from "@/presentation/data/ayudaData";
import { Aviso, Bar, Card, MiniList, SectionLabel, SectionTitle } from "./storyPrimitives";

/** Una casilla del waffle equivale a esto. Redondeado para que la glosa sea legible. */
const UNIDADES_POR_BLOQUE = 1700;

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
      <SectionLabel>Qué se mueve</SectionLabel>
      <SectionTitle>Dos de cada tres unidades son higiene, comida o agua</SectionTitle>
      <p className="mt-4 max-w-2xl text-[15.5px] leading-7 text-[#4E6B7C]">
        Cada renglón manuscrito se transcribió y se clasificó. Elegí una categoría para ver qué
        producto la compone.
      </p>

      {/* Cifra total + composición */}
      <div className="mt-10 grid gap-8 rounded-xl border border-[#00578C]/12 bg-white p-7 lg:grid-cols-[minmax(210px,0.7fr)_minmax(0,1.4fr)] lg:items-center">
        <div className="text-center">
          <b className="block font-serif text-[58px] leading-none tracking-[-0.02em] text-[#00578C]">
            {TOTAL_UNIDADES.toLocaleString("es-CO")}
          </b>
          <span className="mt-2.5 block text-[12.5px] leading-5 text-[#6E8B9E]">
            unidades registradas en {TOTAL_RENGLONES.toLocaleString("es-CO")} renglones
            <br />
            transcritos de los formatos
          </span>
        </div>

        <div>
          <h3 className="text-[17px] font-semibold text-[#0B2233]">De qué está hecha esa ayuda</h3>

          <div className="mt-4 flex h-9 overflow-hidden rounded-md">
            {categoriasAyuda.map((c) => (
              <i
                key={c.nombre}
                title={`${c.nombre} · ${c.unidades.toLocaleString("es-CO")} unidades (${pct(c.unidades)}%)`}
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
          <p className="mt-2.5 text-xs text-[#6E8B9E]">
            Cada bloque equivale a{" "}
            <b className="text-[#0B2233]">{UNIDADES_POR_BLOQUE.toLocaleString("es-CO")} unidades</b>.
            El color dice a qué necesidad responde la categoría, no en qué puesto va.
          </p>
        </div>
      </div>

      {/* Familias */}
      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-[11.6px] text-[#4E6B7C]">
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
                      <span className="shrink-0 font-serif text-base text-[#00578C]">
                        {c.unidades.toLocaleString("es-CO")}
                      </span>
                    </span>
                    <span className="mt-2 block">
                      <Bar ratio={c.unidades / maxUnidades} color={c.color} />
                    </span>
                    <span className="mt-1.5 block text-[11.4px] text-[#6E8B9E]">
                      {pct(c.unidades)}% · {c.destinos} destinos
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
              {categoria ? `${categoria.nombre} · qué la compone` : "Productos más repartidos"}
            </p>
            <div className="mt-4">
              <MiniList rows={productos} />
            </div>
          </Card>

          <Card>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]">
              Poblaciones focalizadas
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
            <p className="mt-3 text-xs text-[#6E8B9E]">
              Número de despachos que declaran expresamente cada población en el formato.
            </p>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Aviso>
          <b>Cómo leer estas cifras.</b> «Unidades» suma las cantidades tal como están escritas en el
          papel, y el papel mezcla unidades: mercados, paquetes, kilos y pacas conviven en la misma
          columna. Sirve para comparar composición y peso relativo entre categorías y municipios,{" "}
          <b>no es un peso ni un conteo de personas</b>. Las toneladas son una estimación aparte.
        </Aviso>
      </div>
    </div>
  );
}

function pct(unidades: number): number {
  return Math.round((unidades / TOTAL_UNIDADES) * 100);
}