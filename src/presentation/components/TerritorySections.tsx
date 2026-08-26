/**
 * TerritorySections.tsx
 * -----------------------------------------------------------------------
 * Las tres piezas que van DEBAJO del mapa en el nivel Territorio:
 * el podio, la cobertura por zona y la grilla de los 41 municipios.
 *
 * Todo se deriva de `territoryMunicipalities`, nada está escrito a mano.
 * Importa porque el catálogo v2 movió Dagua de Pacífico a Sur: los
 * totales por zona del tablero HTML (Pacífico 2/2) ya no aplican, y
 * calcularlos evita que queden dos verdades circulando.
 * -----------------------------------------------------------------------
 */
import { useMemo, useState } from "react";
import {
  TERRITORY_BLUE_RAMP,
  territoryMunicipalities,
  type TerritoryMunicipalityStat,
  type TerritoryZone,
} from "@/presentation/data/territoryData";
import { Bar, SectionLabel } from "./storyPrimitives";

const ZONAS: Array<TerritoryZone | "todas"> = ["todas", "Norte", "Centro", "Sur", "Pacífico"];
const ORDEN_ZONAS: TerritoryZone[] = ["Norte", "Centro", "Sur", "Pacífico"];

const MAX_DESPACHOS = Math.max(1, ...territoryMunicipalities.map((m) => m.despachos));

/** Tono medio de la rampa territorial, para que la barra de la tarjeta
 *  hable el mismo idioma de color que el mapa. El `??` es por
 *  noUncheckedIndexedAccess: indexar la rampa devuelve `string | undefined`. */
const BARRA_COLOR = TERRITORY_BLUE_RAMP[2] ?? "#2181B4";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * `| undefined` explícito: el proyecto usa exactOptionalPropertyTypes, y
 * MunicipiosGrid reenvía su propio onSelect a MunicipioCard. Sin esto,
 * pasar un opcional a otro opcional no compila.
 */
interface SelectableProps {
  /** Se dispara con el municipio elegido; el Story lo usa para volver al mapa. */
  onSelect?: ((municipio: TerritoryMunicipalityStat) => void) | undefined;
}

/* ── Podio ──────────────────────────────────────────────────────────── */

export function PodioMunicipios({ onSelect }: SelectableProps) {
  const top = useMemo(
    () =>
      [...territoryMunicipalities]
        .sort((a, b) => b.despachos - a.despachos || a.name.localeCompare(b.name, "es"))
        .slice(0, 6),
    [],
  );

  return (
    <section>
      <SectionLabel>Municipios que más ayuda recibieron</SectionLabel>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {top.map((m, i) => (
          <li key={m.codigoDane}>
            <button
              type="button"
              onClick={() => onSelect?.(m)}
              className="flex w-full items-center gap-3.5 rounded-lg border border-[#00578C]/12 bg-white p-4 text-left transition hover:border-[#00578C]/45 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00578C]"
            >
              <span className="min-w-7 text-center font-serif text-[27px] leading-none text-[#81C8EC]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[15px] text-[#0B2233]">{m.name}</b>
                <span className="mt-0.5 mb-2 block text-[15px] text-[#6E8B9E]">
                  {m.despachos} entregas · {m.toneladas} toneladas
                </span>
                <Bar ratio={m.despachos / MAX_DESPACHOS} />
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
  const zonas = useMemo(() => {
    const acc = new Map<TerritoryZone, { total: number; atendidos: number; despachos: number }>();
    for (const m of territoryMunicipalities) {
      const z = acc.get(m.zone) ?? { total: 0, atendidos: 0, despachos: 0 };
      z.total += 1;
      if (m.despachos > 0) z.atendidos += 1;
      z.despachos += m.despachos;
      acc.set(m.zone, z);
    }
    return ORDEN_ZONAS.filter((z) => acc.has(z)).map((z) => ({ zone: z, ...acc.get(z)! }));
  }, []);

  return (
    <section>
      <SectionLabel>Ayudas por zona</SectionLabel>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {zonas.map((z) => {
          const ratio = z.atendidos / z.total;
          const completa = z.atendidos === z.total;
          return (
            <div key={z.zone} className="rounded-lg border border-[#00578C]/12 bg-white p-5">
              <span className="text-base font-bold uppercase tracking-[0.08em] text-[#6E8B9E]">
                {z.zone}
              </span>
              <p className="mt-1 font-serif text-[38px] leading-none text-[#00578C]">
                {z.atendidos}
                <small className="text-base font-normal text-[#6E8B9E]"> / {z.total}</small>
              </p>
              <div className="mt-3.5">
                <Bar ratio={ratio} color={completa ? "#039A39" : "#F0B102"} />
              </div>
              <p className="mt-2 text-[13px] text-[#5E7789]">
                {z.atendidos === 1 ? "1 municipio" : `${z.atendidos} municipios`} ·{" "}
                {z.despachos} entregas
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
  const [zona, setZona] = useState<TerritoryZone | "todas">("todas");
  const [texto, setTexto] = useState("");

  const visibles = useMemo(() => {
    const q = norm(texto);
    return territoryMunicipalities
      .filter((m) => (zona === "todas" || m.zone === zona) && (!q || norm(m.name).includes(q)))
      .sort((a, b) => b.despachos - a.despachos || a.name.localeCompare(b.name, "es"));
  }, [zona, texto]);

  return (
    <section>
      <SectionLabel>Los {territoryMunicipalities.length} municipios</SectionLabel>

      <div className="mt-4 flex flex-wrap gap-2">
        {ZONAS.map((z) => (
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
            {z === "todas" ? "Todas las zonas" : z}
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
        {visibles.length === territoryMunicipalities.length
          ? `${visibles.length} municipios`
          : `${visibles.length} de ${territoryMunicipalities.length} municipios`}
      </p>

      {visibles.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-[#00578C]/25 p-8 text-center text-sm text-[#6E8B9E]">
          Ningún municipio coincide. Prueba con otro nombre o quita el filtro de zona.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(212px,1fr))]">
          {visibles.map((m) => (
            <MunicipioCard key={m.codigoDane} m={m} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  );
}

function MunicipioCard({ m, onSelect }: { m: TerritoryMunicipalityStat } & SelectableProps) {
  const sinDespacho = m.despachos === 0;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(m)}
      className="rounded-lg border border-[#00578C]/12 bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#00578C]/45 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00578C] motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-baseline justify-between gap-2">
        <b className="min-w-0 truncate text-lg text-[#0B2233]">{m.name}</b>
        <span
          className={`font-serif text-2xl ${sinDespacho ? "text-[#F26049]" : "text-[#00578C]"}`}
        >
          {m.despachos}
        </span>
      </div>

      <div className="my-2.5">
        <Bar ratio={m.despachos / MAX_DESPACHOS} color={BARRA_COLOR} />
      </div>

      <div className="flex justify-between text-[15px] text-[#6E8B9E]">
        <span>{m.toneladas} toneladas</span>
        <span>{plural(m.despachos, "entrega", "entregas")}</span>
      </div>

    </button>
  );
}


/** "1 entrega" y no "1 entregas". */
function plural(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString("es-CO")} ${n === 1 ? uno : varios}`;
}