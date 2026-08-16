import { useEffect, useRef, useState } from "react";
import type { Criticality, DiagnosticFilters } from "@/domain/entities";
import { CRITICALITY_CLASS, CRITICALITY_LABEL, CRITICALITY_ORDER } from "./criticality";

interface Props {
  filters: DiagnosticFilters;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onChange: (next: DiagnosticFilters) => void;
}

const activeFilterCount = (f: DiagnosticFilters) =>
  (f.search ? 1 : 0) + (f.criticality?.length ?? 0) + (f.onlyReviewRequired ? 1 : 0);

export function FilterPopover({ filters, showHeatmap, onToggleHeatmap, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const count = activeFilterCount(filters);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const selectedCriticality = filters.criticality ?? [];
  const toggleCriticality = (value: Criticality) => {
    const next = selectedCriticality.includes(value)
      ? selectedCriticality.filter((c) => c !== value)
      : [...selectedCriticality, value];
    onChange({ ...filters, criticality: next.length ? next : undefined });
  };

  return (
    <div ref={containerRef} className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3.5 py-2 text-sm font-medium shadow-sm backdrop-blur transition-colors hover:bg-surface-raised"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Filtros
        {count > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-72 space-y-4 rounded-xl border border-border bg-surface p-4 shadow-lg">
          <div>
            <label className="label-caps" htmlFor="search">
              Buscar sede / institución
            </label>
            <input
              id="search"
              autoFocus
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

          <div className="flex flex-col gap-2 border-t border-border pt-3">
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
          </div>

          {count > 0 && (
            <button
              type="button"
              onClick={() => onChange({})}
              className="w-full rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}