import type { DiagnosedSiteView } from "@/domain/entities";
import { CRITICALITY_HEX } from "./criticality";

interface Props {
  sites: DiagnosedSiteView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SiteList({ sites, selectedId, onSelect }: Props) {
  if (!sites.length) {
    return <p className="p-4 text-sm text-muted-foreground">Ningún diagnóstico coincide con los filtros.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {sites.map((view) => {
        const { diagnostic } = view;
        const active = diagnostic.id === selectedId;
        return (
          <li key={diagnostic.id}>
            <button
              type="button"
              onClick={() => onSelect(diagnostic.id)}
              className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-surface-raised ${
                active ? "bg-surface-raised" : ""
              }`}
            >
              <span
                className="mt-1.5 size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CRITICALITY_HEX[diagnostic.criticality] }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {view.site?.name ?? diagnostic.sourceSite ?? "Sede sin nombre"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {view.municipality?.name ?? diagnostic.sourceMunicipality ?? "—"} ·{" "}
                  {view.institution?.name ?? diagnostic.sourceInstitution ?? "—"}
                </span>
                <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono">#{diagnostic.rank}</span>
                  <span>{diagnostic.totalZones} zonas</span>
                  {diagnostic.resolution.status !== "RESOLVED" && (
                    <span className="rounded-sm border border-primary/60 px-1 font-mono text-[10px] text-primary">
                      REVISIÓN
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}