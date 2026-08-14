import { useMemo, useState } from "react";
import type { DiagnosticFilters } from "@/domain/entities";
import { FiltersPanel } from "@/presentation/components/FiltersPanel";
import { MapCanvas } from "@/presentation/components/MapCanvas";
import { SiteDetailPanel } from "@/presentation/components/SiteDetailPanel";
import { SiteList } from "@/presentation/components/SiteList";
import { CRITICALITY_HEX } from "@/presentation/components/criticality";
import { useDatasetMeta, useMapView } from "@/presentation/hooks/useDiagnostics";

export function DashboardPage() {
  const [filters, setFilters] = useState<DiagnosticFilters>({});
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const { data, isLoading, error } = useMapView(filters);
  const { data: meta } = useDatasetMeta();

  const selectedView = useMemo(
    () => data?.sites.find((s) => s.diagnostic.id === selectedSiteId) ?? null,
    [data, selectedSiteId],
  );

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-surface px-5 py-3">
        <div>
          <h1 className="text-lg font-semibold">Criticidad Sísmica · Infraestructura Educativa</h1>
          <p className="label-caps">Valle del Cauca · MVP con datos locales</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-4">
          <Stat label="Sedes diagnosticadas" value={data?.totals.total ?? 0} />
          <Stat label="Rojo" value={data?.totals.red ?? 0} color={CRITICALITY_HEX.ROJO} />
          <Stat label="Amarillo" value={data?.totals.yellow ?? 0} color={CRITICALITY_HEX.AMARILLO} />
          <Stat label="Verde" value={data?.totals.green ?? 0} color={CRITICALITY_HEX.VERDE} />
          <Stat label="En revisión" value={data?.reviewRequired ?? 0} color="var(--primary)" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[24rem] shrink-0 flex-col border-r border-border bg-sidebar">
          <FiltersPanel
            filters={filters}
            municipalities={data?.municipalities ?? []}
            showHeatmap={showHeatmap}
            onToggleHeatmap={() => setShowHeatmap((v) => !v)}
            onChange={setFilters}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Cargando dataset…</p>
            ) : error ? (
              <p className="p-4 text-sm text-critical">No fue posible cargar el dataset local.</p>
            ) : (
              <SiteList sites={data?.sites ?? []} selectedId={selectedSiteId} onSelect={setSelectedSiteId} />
            )}
          </div>
          <footer className="border-t border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
            {data?.approximatePositions ? (
              <p>
                {data.approximatePositions} sedes se ubican en el centroide municipal con dispersión visible: las
                fuentes no contienen coordenadas.
              </p>
            ) : null}
            {meta ? <p className="mt-1 font-mono">ETL {new Date(meta.generatedAt).toLocaleDateString("es-CO")}</p> : null}
          </footer>
        </aside>

        <main className="relative h-full min-w-0 flex-1">
          <MapCanvas
            sites={data?.sites ?? []}
            municipalities={data?.municipalities ?? []}
            showHeatmap={showHeatmap}
            selectedSiteId={selectedSiteId}
            onSelectSite={setSelectedSiteId}
            onSelectMunicipality={(id) => setFilters((f) => ({ ...f, municipalityIds: [id] }))}
          />
          <div className="pointer-events-none absolute bottom-6 left-4 z-10 rounded-md border border-border bg-surface/90 p-3 backdrop-blur">
            <span className="label-caps">Criticidad</span>
            <ul className="mt-1.5 space-y-1 text-xs">
              {(["ROJO", "AMARILLO", "VERDE", "SIN_DETALLE"] as const).map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: CRITICALITY_HEX[c] }} />
                  {c.replace("_", " ").toLowerCase()}
                </li>
              ))}
            </ul>
          </div>
          {selectedView && <SiteDetailPanel view={selectedView} onClose={() => setSelectedSiteId(null)} />}
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1.5">
        {color && <span className="size-2 rounded-full" style={{ backgroundColor: color }} />}
        <span className="font-display text-xl leading-none font-semibold tabular-nums">{value}</span>
      </div>
      <span className="label-caps">{label}</span>
    </div>
  );
}