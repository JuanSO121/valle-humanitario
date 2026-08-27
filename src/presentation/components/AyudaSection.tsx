/**
 * AyudaSection.tsx
 * -----------------------------------------------------------------------
 * Composición de la ayuda entregada. Al elegir una categoría, la lista
 * de la derecha cambia a los artículos que la componen.
 *
 * Las cifras vienen de route=ayuda. El catálogo estático queda como
 * respaldo mientras esa ruta no exista, y como fuente de dos cosas que
 * el workbook no tiene: el color de cada categoría y los nombres de
 * producto. ENVIOS_CATEGORIA guarda cuántos productos distintos trae
 * cada envío, no cuáles.
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
import { useOperacion } from "@/presentation/state/OperacionContext";
import { useAyuda } from "@/application/hooks/useAyuda";
import { Aviso, Bar, Card, MiniList, SectionLabel, SectionTitle } from "./storyPrimitives";

interface CategoriaVista {
  nombre: string;
  unidades: number;
  /** Municipios del consolidado, sin Cali. Nunca pasa de 41. */
  municipios: number;
  color: string;
  productos: Array<[string, number]>;
}

export function AyudaSection() {
  const [activa, setActiva] = useState<string | null>(null);
  const { totalToneladas, toneladasMedidas } = useOperacion();
  const { data: ayuda } = useAyuda();

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
        municipios: c.destinos,
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
        color: local?.color ?? "#6E8B9E",
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

  const categoria = activa ? categorias.find((c) => c.nombre === activa) : undefined;
  const maxUnidades = Math.max(1, ...categorias.map((c) => c.unidades));

  // Cada bloque vale 1 por ciento del total del momento, no un número
  // fijo de unidades que queda viejo cuando cambia el Excel.
  const waffle = useMemo(
    () =>
      categorias.flatMap((c) =>
        Array.from({ length: Math.round((c.unidades / Math.max(1, totalUnidades)) * 100) }, () => c),
      ),
    [categorias, totalUnidades],
  );

  const productos = categoria
    ? categoria.productos.map(([label, value]) => ({ label, value, color: categoria.color }))
    : productosMasRepartidos.map(([label, value]) => ({ label, value }));

  return (
    <div className="mx-auto max-w-6xl">
      <SectionLabel>Qué se entregó</SectionLabel>
      <SectionTitle>La mayor parte de la ayuda es aseo, comida y agua</SectionTitle>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[#4E6B7C]">
        Seleccione una categoría para ver qué artículos incluyó.
      </p>

      <div className="mt-10 grid gap-8 rounded-xl border border-[#00578C]/12 bg-white p-5 sm:p-7 lg:grid-cols-[minmax(210px,0.7fr)_minmax(0,1.4fr)] lg:items-center">
        <div className="text-center">
          <b className="block font-serif text-[64px] leading-none tracking-[-0.02em] text-[#00578C]">
            {totalToneladas.toLocaleString("es-CO")}
          </b>
          <span className="mt-3 block text-lg text-[#4E6B7C]">toneladas de ayuda</span>
          <span className="mt-2 block text-base leading-6 text-[#6E8B9E]">
            {toneladasMedidas
              ? "entregadas en todo el departamento"
              : "estimadas a partir del número de entregas"}
          </span>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-[#0B2233]">De qué está hecha esa ayuda</h3>

          <div className="mt-4 flex h-8 overflow-hidden rounded-md sm:h-9">
            {categorias.map((c) => (
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

          <div className="mt-4 flex flex-wrap gap-[3px] sm:gap-1">
            {waffle.map((c, i) => (
              <i
                key={`${c.nombre}-${i}`}
                title={c.nombre}
                className="block size-[11px] rounded-[2px] sm:size-[15px] sm:rounded-[2.5px]"
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

      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-[15px] text-[#4E6B7C]">
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
                      : (colores[0] ?? "#8FAABC"),
                }}
              />
              <b className="font-semibold text-[#0B2233]">{f.nombre}</b>
              <span className="text-[#8FAABC]">· {f.categorias.join(", ")}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)] lg:items-start">
        <Card className="p-0">
          <p className="px-6 pt-6 text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]">
            Categorías
          </p>
          <ul className="mt-3">
            {categorias.map((c) => {
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
                      <span className="flex min-w-0 items-center gap-2 text-base font-semibold text-[#0B2233]">
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
                      Llegó a {c.municipios} {c.municipios === 1 ? "municipio" : "municipios"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]">
              {categoria ? categoria.nombre : "Lo más entregado"}
            </p>
            <div className="mt-4">
              {productos.length > 0 ? (
                <MiniList rows={productos} />
              ) : (
                <p className="text-base text-[#6E8B9E]">
                  No hay detalle de artículos para esta categoría.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]">
              Grupos atendidos
            </p>
            <div className="mt-4">
              <MiniList
                rows={poblaciones.map(([label, value]) => ({ label, value, color: "#7F207F" }))}
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
          entregó.{" "}
          {toneladasMedidas
            ? "Las toneladas son el peso registrado en todo el departamento, incluidas las rutas que no llegan a un municipio."
            : "Las toneladas son una estimación a partir del número de entregas."}
        </Aviso>
      </div>
    </div>
  );
}