import type { DiagnosedSiteView, MunicipalitySummary } from "@/domain/entities";
import { CRITICALITY_HEX, CRITICALITY_LABEL } from "./criticality";

interface Props {
  summary: MunicipalitySummary;
  sites: DiagnosedSiteView[];
  onSelectSite: (id: string) => void;
}

export function MunicipalityPanel({ summary, sites, onSelectSite }: Props) {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border p-4">
        <span
          className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: `${CRITICALITY_HEX[summary.criticality]}1a`, color: CRITICALITY_HEX[summary.criticality] }}
        >
          {CRITICALITY_LABEL[summary.criticality]}
        </span>
        <h2 className="mt-2 text-base leading-tight font-semibold">{summary.municipality.name}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{summary.affectedSites} sedes diagnosticadas</p>
      </header>

      <div className="grid grid-cols-3 gap-2 border-b border-border p-4 text-center">
        <MiniStat label="Rojo" value={summary.red} color={CRITICALITY_HEX.ROJO} />
        <MiniStat label="Amarillo" value={summary.yellow} color={CRITICALITY_HEX.AMARILLO} />
        <MiniStat label="Verde" value={summary.green} color={CRITICALITY_HEX.VERDE} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="px-4 pb-1 pt-3 label-caps">Sedes</p>
        <ul className="divide-y divide-border">
          {sites.map((view) => (
            <li key={view.diagnostic.id}>
              <button
                type="button"
                onClick={() => onSelectSite(view.diagnostic.id)}
                className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-surface-raised"
              >
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: CRITICALITY_HEX[view.diagnostic.criticality] }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {view.site?.name ?? view.diagnostic.sourceSite ?? "Sede sin nombre"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {view.institution?.name ?? view.diagnostic.sourceInstitution ?? "—"}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {sites.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Sin sedes diagnosticadas para los filtros actuales.</p>
          )}
        </ul>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5">
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-display text-lg font-semibold tabular-nums">{value}</span>
      </div>
      <span className="label-caps">{label}</span>
    </div>
  );
}