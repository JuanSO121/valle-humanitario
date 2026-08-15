import { useMemo, useState } from "react";
import type { DiagnosticFilters } from "@/domain/entities";
import { FiltersPanel } from "@/presentation/components/FiltersPanel";
import { MapCanvas } from "@/presentation/components/MapCanvas";
import { SiteDetailPanel } from "@/presentation/components/SiteDetailPanel";
import { SiteList } from "@/presentation/components/SiteList";
import { CRITICALITY_HEX } from "@/presentation/components/criticality";
import { useDatasetMeta, useMapView } from "@/presentation/hooks/useDiagnostics";
import { useIsMobile } from "@/hooks/use-mobile";

export function DashboardPage() {
  const [filters, setFilters] = useState<DiagnosticFilters>({});
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mobileTab, setMobileTab] = useState<"map" | "list">("map");
  const isMobile = useIsMobile();

  const { data, isLoading, error } = useMapView(filters);
  const { data: meta } = useDatasetMeta();

  const selectedView = useMemo(
    () => data?.sites.find((s) => s.diagnostic.id === selectedSiteId) ?? null,
    [data, selectedSiteId],
  );

  const showList = !isMobile || mobileTab === "list";
  const showMap = !isMobile || mobileTab === "map";

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-surface px-4 py-3 md:px-5">
        <div>
          <h1 className="text-base leading-tight font-semibold md:text-lg">
            Criticidad Sísmica · Infraestructura Educativa
          </h1>
          <p className="label-caps">Valle del Cauca · MVP con datos locales</p>
        </div>
        <div className="-mx-4 flex w-full items-center gap-4 overflow-x-auto px-4 md:mx-0 md:ml-auto md:w-auto md:flex-wrap md:overflow-visible md:px-0">
          <Stat label="Sedes diagnosticadas" value={data?.totals.total ?? 0} />
          <Stat label="Rojo" value={data?.totals.red ?? 0} color={CRITICALITY_HEX.ROJO} />
          <Stat label="Amarillo" value={data?.totals.yellow ?? 0} color={CRITICALITY_HEX.AMARILLO} />
          <Stat label="Verde" value={data?.totals.green ?? 0} color={CRITICALITY_HEX.VERDE} />
          <Stat label="En revisión" value={data?.reviewRequired ?? 0} color="var(--primary)" />
        </div>
      </header>

      {isMobile && (
        <div className="flex shrink-0 border-b border-border bg-surface">
          {(["map", "list"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                mobileTab === tab
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {tab === "map" ? "Mapa" : "Listado y filtros"}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={`${showList ? "flex" : "hidden"} w-full shrink-0 flex-col border-border bg-sidebar md:flex md:w-[24rem] md:border-r`}
        >
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
              <SiteList
                sites={data?.sites ?? []}
                selectedId={selectedSiteId}
                onSelect={(id) => {
                  setSelectedSiteId(id);
                  if (isMobile) setMobileTab("map");
                }}
              />
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

        <main className={`${showMap ? "block" : "hidden"} relative h-full min-w-0 flex-1 md:block`}>
          {showMap && (
            <>
          <MapCanvas
            sites={data?.sites ?? []}
            municipalities={data?.municipalities ?? []}
            showHeatmap={showHeatmap}
            selectedSiteId={selectedSiteId}
            onSelectSite={setSelectedSiteId}
            onSelectMunicipality={(id) => setFilters((f) => ({ ...f, municipalityIds: [id] }))}
          />
          <div className="pointer-events-none absolute bottom-4 left-3 z-10 rounded-md border border-border bg-surface/90 p-2.5 backdrop-blur md:bottom-6 md:left-4 md:p-3">
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
            </>
          )}
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