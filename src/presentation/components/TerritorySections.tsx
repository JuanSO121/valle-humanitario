/**
 * TerritorySections.tsx
 * -----------------------------------------------------------------------
 * Podio, cobertura por zona y grilla de municipios. Todo se deriva de la
 * API vía OperacionContext, así que las cifras se actualizan solas.
 *
 * La zona de cada municipio sigue viniendo del catálogo estático, porque
 * no cambia con las entregas. El total de municipios también, para poder
 * decir cuántos hay en el departamento aunque alguno todavía no aparezca
 * en los flujos.
 */
import { useMemo, useState } from "react";
import { useOperacion } from "@/presentation/state/OperacionContext";
import type { MunicipioOperacion } from "@/application/derivations/operacion";
import { TERRITORY_BLUE_RAMP } from "@/presentation/data/territoryData";
import { Bar, SectionLabel } from "./storyPrimitives";

const TODAS = "todas";

const BARRA_COLOR = TERRITORY_BLUE_RAMP[2] ?? "#2181B4";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

interface SelectableProps {
  onSelect?: ((municipio: MunicipioOperacion) => void) | undefined;
}

function plural(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString("es-CO")} ${n === 1 ? uno : varios}`;
}

/* ── Podio ──────────────────────────────────────────────────────────── */

export function PodioMunicipios({ onSelect }: SelectableProps) {
  const { municipios } = useOperacion();
  const top = municipios.slice(0, 6);
  const max = Math.max(1, ...municipios.map((m) => m.entregas));

  if (top.length === 0) return null;

  return (
    <section>
      <SectionLabel>Municipios que más ayuda recibieron</SectionLabel>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {top.map((m, i) => (
          <li key={m.destinoId}>
            <button
              type="button"
              onClick={() => onSelect?.(m)}
              className="flex w-full items-center gap-3.5 rounded-lg border border-[#00578C]/12 bg-white p-4 text-left transition hover:border-[#00578C]/45 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00578C]"
            >
              <span className="min-w-7 text-center font-serif text-[27px] leading-none text-[#81C8EC]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-lg text-[#0B2233]">{m.nombre}</b>
                <span className="mt-0.5 mb-2 block text-[15px] text-[#6E8B9E]">
                  {plural(m.entregas, "entrega", "entregas")} · {m.toneladas} toneladas
                </span>
                <Bar ratio={m.entregas / max} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── Cobertura por zona ─────────────────────────────────────────────── */

export function CoberturaPorZona() {
  const { zonas } = useOperacion();

  if (zonas.length === 0) return null;

  return (
    <section>
      <SectionLabel>Ayudas por zona</SectionLabel>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {zonas.map((z) => {
          const ratio = z.total > 0 ? z.atendidos / z.total : 0;
          const completa = z.atendidos === z.total;
          return (
            <div key={z.zona} className="rounded-lg border border-[#00578C]/12 bg-white p-5">
              <span className="text-base font-bold uppercase tracking-[0.08em] text-[#6E8B9E]">
                {z.zona}
              </span>
              <p className="mt-1 font-serif text-[38px] leading-none text-[#00578C]">
                {z.atendidos}
                <small className="text-base font-normal text-[#6E8B9E]"> de {z.total}</small>
              </p>
              <div className="mt-3.5">
                <Bar ratio={ratio} color={completa ? "#039A39" : "#F0B102"} />
              </div>
              <p className="mt-2 text-base text-[#5E7789]">
                {completa
                  ? "Todos recibieron ayudas"
                  : `${z.total - z.atendidos} sin entregas todavía`}
              </p>
              <p className="mt-1 text-base text-[#6E8B9E]">
                {plural(z.entregas, "entrega", "entregas")} en total
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Grilla de municipios ───────────────────────────────────────────── */

export function MunicipiosGrid({ onSelect }: SelectableProps) {
  const { municipios, catalogo, zonas } = useOperacion();
  const [zona, setZona] = useState<string>(TODAS);
  const [texto, setTexto] = useState("");

  const max = Math.max(1, ...municipios.map((m) => m.entregas));

  /**
   * Se parte del catálogo para que aparezcan también los municipios que
   * todavía no registran entregas. La API solo devuelve los que sí.
   */
  const todos = useMemo(() => {
    const porNombre = new Map(municipios.map((m) => [norm(m.nombre), m]));
    return catalogo.map((cat) => {
      const vivo = porNombre.get(norm(cat.nombre));
      return (
        vivo ?? {
          destinoId: cat.codigoDane,
          nombre: cat.nombre,
          codigoDane: cat.codigoDane,
          zona: cat.zona,
          entregas: 0,
          toneladas: 0,
          dias: {},
          primeraFecha: null,
          ultimaFecha: null,
        }
      );
    });
  }, [municipios, catalogo]);

  const visibles = useMemo(() => {
    const q = norm(texto);
    return todos
      .filter((m) => (zona === TODAS || m.zona === zona) && (!q || norm(m.nombre).includes(q)))
      .sort((a, b) => b.entregas - a.entregas || a.nombre.localeCompare(b.nombre, "es"));
  }, [todos, zona, texto]);

  return (
    <section>
      <SectionLabel>Los {todos.length} municipios</SectionLabel>

      <div className="mt-4 flex flex-wrap gap-2">
        {[TODAS, ...zonas.map((z) => z.zona)].map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => setZona(z)}
            aria-pressed={zona === z}
            className={`rounded-full border px-3.5 py-1.5 text-base font-semibold transition ${
              zona === z
                ? "border-[#00578C] bg-[#00578C] text-white"
                : "border-[#00578C]/20 bg-white text-[#4E6B7C] hover:border-[#00578C]/50 hover:text-[#00578C]"
            }`}
          >
            {z === TODAS ? "Todas las zonas" : z}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar municipio…"
        aria-label="Buscar municipio"
        className="mt-3 w-full rounded-lg border border-[#00578C]/20 bg-white px-3.5 py-2.5 text-base text-[#0B2233] outline-none transition placeholder:text-[#8FAABC] focus:border-[#00578C]"
      />

      <p className="mt-3 text-base text-[#6E8B9E]" aria-live="polite">
        {visibles.length === todos.length
          ? plural(visibles.length, "municipio", "municipios")
          : `${visibles.length} de ${todos.length} municipios`}
      </p>

      {visibles.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-[#00578C]/25 p-8 text-center text-base text-[#6E8B9E]">
          Ningún municipio coincide. Prueba con otro nombre o quita el filtro de zona.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,212px),1fr))]">
          {visibles.map((m) => (
            <button
              key={m.destinoId}
              type="button"
              onClick={() => onSelect?.(m)}
              className="rounded-lg border border-[#00578C]/12 bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#00578C]/45 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00578C] motion-reduce:hover:translate-y-0"
            >
              <div className="flex items-baseline justify-between gap-2">
                <b className="min-w-0 truncate text-lg text-[#0B2233]">{m.nombre}</b>
                <span
                  className={`font-serif text-2xl ${
                    m.entregas === 0 ? "text-[#6E8B9E]" : "text-[#00578C]"
                  }`}
                >
                  {m.entregas}
                </span>
              </div>

              <div className="my-2.5">
                <Bar ratio={m.entregas / max} color={BARRA_COLOR} />
              </div>

              <div className="flex justify-between text-[15px] text-[#6E8B9E]">
                <span>{m.toneladas} toneladas</span>
                <span>{plural(m.entregas, "entrega", "entregas")}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}