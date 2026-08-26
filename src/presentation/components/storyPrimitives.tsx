/**
 * storyPrimitives.tsx
 * -----------------------------------------------------------------------
 * Piezas mínimas que repiten TODOS los niveles del Story. Viven acá para
 * que el eyebrow, la barra proporcional y la lista de "categoría · valor"
 * se vean idénticas en Panorama, Territorio, Qué se mueve, Canales y
 * Brechas, antes cada sección las reescribía con su propio tamaño de
 * texto y su propio gris.
 *
 * NOTA sobre los tipos: el proyecto compila con
 * `exactOptionalPropertyTypes: true`, así que `color?: string` significa
 * "la propiedad puede faltar", NO "puede valer undefined". Como estos
 * componentes reciben valores reenviados desde arriba (ej.
 * `color={fila.color}`, que es `string | undefined`), los opcionales se
 * declaran `?: T | undefined` a propósito. Sacar el `| undefined` rompe
 * la compilación en MiniList.
 * -----------------------------------------------------------------------
 */
import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]">{children}</p>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.12] text-[#0B2233] md:text-5xl">
      {children}
    </h2>
  );
}

export function SectionIntro({ children }: { children: ReactNode }) {
  return <p className="mt-5 max-w-2xl text-lg leading-8 text-[#4E6B7C]">{children}</p>;
}

interface BarProps {
  /** De 0 a 1. Se recorta a ese rango, así que un ratio > 1 no desborda. */
  ratio: number;
  color?: string | undefined;
}

/** Barra proporcional. */
export function Bar({ ratio, color = "#00578C" }: BarProps) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div className="h-[6px] overflow-hidden rounded-full bg-[#E6F0F7]">
      <i
        className="block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export interface MiniRow {
  label: string;
  value: number;
  color?: string | undefined;
  /** Sufijo de la cifra, ej. " t" o " und". */
  suffix?: string | undefined;
}

/** Lista "etiqueta, barra, cifra". El máximo se calcula sobre la propia lista. */
export function MiniList({ rows }: { rows: MiniRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 text-base">
          <span className="min-w-0 flex-1 truncate text-[#4E6B7C]">{r.label}</span>
          <span className="w-[38%] shrink-0">
            <Bar ratio={r.value / max} color={r.color} />
          </span>
          <b className="w-20 shrink-0 text-right tabular-nums text-[#0B2233]">
            {r.value.toLocaleString("es-CO")}
            {r.suffix ?? ""}
          </b>
        </li>
      ))}
    </ul>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-[#00578C]/12 bg-white p-6 ${className}`}>{children}</div>
  );
}

/** Aviso metodológico. Amarillo, porque siempre dice qué NO se puede afirmar. */
export function Aviso({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#F0B102]/40 border-l-[3px] border-l-[#F0B102] bg-[#FFF8E5] p-5 text-base leading-7 text-[#6B5200]">
      {children}
    </div>
  );
}