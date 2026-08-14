import type { Criticality, DiagnosticFilters, MunicipalitySummary } from "@/domain/entities";
import { CRITICALITY_CLASS, CRITICALITY_LABEL, CRITICALITY_ORDER } from "./criticality";

interface Props {
  filters: DiagnosticFilters;
  municipalities: MunicipalitySummary[];
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onChange: (next: DiagnosticFilters) => void;
}

export function FiltersPanel({ filters, municipalities, showHeatmap, onToggleHeatmap, onChange }: Props) {
  const selectedCriticality = filters.criticality ?? [];

  const toggleCriticality = (value: Criticality) => {
    const next = selectedCriticality.includes(value)
      ? selectedCriticality.filter((c) => c !== value)
      : [...selectedCriticality, value];
    onChange({ ...filters, criticality: next.length ? next : undefined });
  };

  return (
    <div className="space-y-4 border-b border-border p-4">
      <div>
        <label className="label-caps" htmlFor="search">
          Buscar sede / institución
        </label>
        <input
          id="search"
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
                  active ? CRITICALITY_CLASS[c] : "border border-border bg-surface-raised text-muted-foreground hover:text-foreground"
                }`}
              >
                {CRITICALITY_LABEL[c]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label-caps" htmlFor="municipio">
          Municipio
        </label>
        <select
          id="municipio"
          value={filters.municipalityIds?.[0] ?? ""}
          onChange={(e) =>
            onChange({ ...filters, municipalityIds: e.target.value ? [e.target.value] : undefined })
          }
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        >
          <option value="">Todos ({municipalities.length})</option>
          {municipalities
            .slice()
            .sort((a, b) => a.municipality.name.localeCompare(b.municipality.name))
            .map((m) => (
              <option key={m.municipality.id} value={m.municipality.id}>
                {m.municipality.name} · {m.affectedSites}
              </option>
            ))}
        </select>
      </div>

      <div className="flex flex-col gap-2 pt-1">
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
    </div>
  );
}