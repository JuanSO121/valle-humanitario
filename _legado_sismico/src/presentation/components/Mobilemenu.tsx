import { useEffect } from "react";
import type { Criticality, DiagnosticFilters } from "@/domain/entities";
import {
  CRITICALITY_CLASS,
  CRITICALITY_HEX,
  CRITICALITY_LABEL,
  CRITICALITY_ORDER,
  CLUSTER_COLOR,
  CLUSTER_LABEL,
} from "./criticality";

interface Totals {
  total: number;
  red: number;
  yellow: number;
  green: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  filters: DiagnosticFilters;
  onChange: (next: DiagnosticFilters) => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  totals?: Totals | undefined;
}

/**
 * Mobile-only drawer that replaces the desktop's floating FilterPopover +
 * always-visible stats pill + always-visible legend card. On small screens
 * those three permanent overlays plus a 70vh bottom sheet left almost no
 * room for the map, which read as "the panels cover the whole screen".
 * Consolidating them behind a single ☰ button frees that space.
 */
export function MobileMenu({ open, onClose, filters, onChange, showHeatmap, onToggleHeatmap, totals }: Props) {
  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const selectedCriticality = filters.criticality ?? [];
  const toggleCriticality = (value: Criticality) => {
    const next = selectedCriticality.includes(value)
      ? selectedCriticality.filter((c) => c !== value)
      : [...selectedCriticality, value];
    onChange({ ...filters, criticality: next.length ? next : undefined });
  };
  const activeCount = (filters.search ? 1 : 0) + (filters.criticality?.length ?? 0) + (filters.onlyReviewRequired ? 1 : 0);

  return (
    <div className="fixed inset-0 z-30 flex">
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]"
      />

      <div className="relative z-10 flex h-full w-[86vw] max-w-[22rem] flex-col overflow-hidden bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-sm font-semibold leading-tight">Criticidad Sísmica Escolar</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-surface-raised hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {totals && (
            <section className="border-b border-border p-4">
              <span className="label-caps">Resumen</span>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                <MiniStat label="Sedes" value={totals.total} />
                <MiniStat label="Rojo" value={totals.red} color={CRITICALITY_HEX.ROJO} />
                <MiniStat label="Amarillo" value={totals.yellow} color={CRITICALITY_HEX.AMARILLO} />
                <MiniStat label="Verde" value={totals.green} color={CRITICALITY_HEX.VERDE} />
              </div>
            </section>
          )}

          <section className="space-y-4 border-b border-border p-4">
            <div className="flex items-center justify-between">
              <span className="label-caps">Filtros</span>
              {activeCount > 0 && (
                <button type="button" onClick={() => onChange({})} className="text-xs font-medium text-primary">
                  Limpiar
                </button>
              )}
            </div>

            <div>
              <label className="label-caps" htmlFor="mobile-search">
                Buscar sede / institución
              </label>
              <input
                id="mobile-search"
                value={filters.search ?? ""}
                onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
                placeholder="Ej. Simón Bolívar"
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
              />
            </div>

            <div>
              <span className="label-caps">Criticidad</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CRITICALITY_ORDER.map((c) => {
                  const active = selectedCriticality.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCriticality(c)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? CRITICALITY_CLASS[c]
                          : "border border-border bg-surface-raised text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {CRITICALITY_LABEL[c]}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(filters.onlyReviewRequired)}
                onChange={(e) => onChange({ ...filters, onlyReviewRequired: e.target.checked || undefined })}
                className="size-4 accent-primary"
              />
              Solo <span className="font-mono text-xs text-primary">MATCH_REVIEW_REQUIRED</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={showHeatmap} onChange={onToggleHeatmap} className="size-4 accent-primary" />
              Mapa de calor
            </label>
          </section>

          <section className="p-4">
            <span className="label-caps">Leyenda</span>
            <ul className="mt-2 space-y-1.5 text-xs">
              {CRITICALITY_ORDER.map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: CRITICALITY_HEX[c] }} />
                  {c.replace("_", " ").toLowerCase()}
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-border pt-3">
              <span className="flex items-center gap-2 text-xs font-medium">
                <span
                  className="size-3 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: CLUSTER_COLOR }}
                />
                {CLUSTER_LABEL}
              </span>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Un punto grande no indica alerta: agrupa varias sedes cercanas. Haz clic para ver cuáles.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1">
        {color && <span className="size-2 rounded-full" style={{ backgroundColor: color }} />}
        <span className="font-display text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}