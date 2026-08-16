import { useMemo, useState } from "react";
import type { DiagnosticFilters } from "@/domain/entities";
import { Breadcrumb } from "@/presentation/components/Breadcrumb";

import { MapCanvas } from "@/presentation/components/MapCanvas";
import { SiteDetailPanel } from "@/presentation/components/SiteDetailPanel";
import { CRITICALITY_HEX, CLUSTER_COLOR, CLUSTER_LABEL } from "@/presentation/components/criticality";
import { useDatasetMeta, useMapView } from "@/presentation/hooks/useDiagnostics";
import { useIsMobile } from "@/hooks/use-mobile";
import { ContextualPanel } from "../components/ContextualPanel";
import { FilterPopover } from "../components/FilterPopover";
import { MunicipalityPanel } from "../components/MunicipalityPanel";
import { INITIAL_VIEW_STATE, viewTransitions } from "../state/viewState";
import { MobileMenu } from "../components/Mobilemenu";

const activeFilterCount = (f: DiagnosticFilters) =>
  (f.search ? 1 : 0) + (f.criticality?.length ?? 0) + (f.onlyReviewRequired ? 1 : 0);

export function DashboardPage() {
  const [filters, setFilters] = useState<DiagnosticFilters>({});
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data, isLoading, error } = useMapView(filters);
  const { data: meta } = useDatasetMeta();

  const selectedMunicipality = useMemo(
    () => data?.municipalities.find((m) => m.municipality.id === viewState.municipalityId) ?? null,
    [data, viewState.municipalityId],
  );
  const selectedSite = useMemo(
    () => data?.sites.find((s) => s.diagnostic.id === viewState.siteId) ?? null,
    [data, viewState.siteId],
  );
  const municipalitySites = useMemo(
    () => (viewState.municipalityId ? (data?.sites.filter((s) => s.municipality?.id === viewState.municipalityId) ?? []) : []),
    [data, viewState.municipalityId],
  );

  const selectMunicipality = (id: string) => setViewState((prev) => viewTransitions.toMunicipality(id, prev));
  const selectSite = (id: string) => {
    const view = data?.sites.find((s) => s.diagnostic.id === id);
    setViewState((prev) => viewTransitions.toSite(id, view?.municipality?.id ?? null, prev));
  };
  const goToAll = () => setViewState(viewTransitions.toAll());
  const goToMunicipality = () => setViewState((prev) => viewTransitions.toMunicipalityFromSite(prev));

  const panelOpen = viewState.level !== "ALL";
  const filterCount = activeFilterCount(filters);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Map is the entire canvas — everything else is an overlay on top of it. */}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-critical">
          No fue posible cargar el dataset local.
        </div>
      ) : (
        <MapCanvas
          sites={data?.sites ?? []}
          municipalities={data?.municipalities ?? []}
          showHeatmap={showHeatmap}
          selectedSiteId={viewState.siteId}
          focusMunicipalityId={viewState.municipalityId}
          onSelectSite={selectSite}
          onSelectMunicipality={selectMunicipality}
          onReset={goToAll}
        />
      )}

      {/* Top overlay: compact title + breadcrumb + filters trigger, never a
          fixed block competing with the map. On mobile this collapses to
          title + a single ☰ button — filters/stats/legend move into
          MobileMenu so they don't stack up and eat the screen. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="pointer-events-auto min-w-0 flex-1 rounded-full border border-border bg-surface/95 px-3.5 py-1.5 shadow-sm backdrop-blur md:flex-initial">
            <h1 className="truncate text-sm font-semibold leading-tight md:text-[15px]">Criticidad Sísmica Escolar</h1>
          </div>

          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú de filtros y leyenda"
              className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface/95 px-3 py-2 shadow-sm backdrop-blur"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {filterCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {filterCount}
                </span>
              )}
            </button>
          ) : (
            <FilterPopover
              filters={filters}
              showHeatmap={showHeatmap}
              onToggleHeatmap={() => setShowHeatmap((v) => !v)}
              onChange={setFilters}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Breadcrumb
            viewState={viewState}
            municipalityName={selectedMunicipality?.municipality.name ?? null}
            siteName={selectedSite ? (selectedSite.site?.name ?? selectedSite.diagnostic.sourceSite ?? null) : null}
            onGoToAll={goToAll}
            onGoToMunicipality={goToMunicipality}
          />
        </div>

        {/* Stats — visible only at TODOS, and only on desktop; on mobile they
            live inside MobileMenu so they don't add another floating pill. */}
        {!isMobile && viewState.level === "ALL" && (
          <div className="pointer-events-auto flex w-fit flex-wrap items-center gap-3 rounded-full border border-border bg-surface/95 px-3.5 py-1.5 text-xs shadow-sm backdrop-blur md:gap-4">
            <Stat label="Sedes" value={data?.totals.total ?? 0} />
            <Stat label="Rojo" value={data?.totals.red ?? 0} color={CRITICALITY_HEX.ROJO} />
            <Stat label="Amarillo" value={data?.totals.yellow ?? 0} color={CRITICALITY_HEX.AMARILLO} />
            <Stat label="Verde" value={data?.totals.green ?? 0} color={CRITICALITY_HEX.VERDE} />
          </div>
        )}
      </div>

      {/* Exploration hint — only shown at TODOS with nothing selected, tells
          a first-time user what to do without a permanent instructional block. */}
      {viewState.level === "ALL" && !isLoading && (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center md:top-20">
          <p className="pointer-events-auto max-w-[85vw] rounded-full border border-border bg-surface/90 px-4 py-1.5 text-center text-xs text-muted-foreground shadow-sm backdrop-blur">
            Explora el mapa para consultar municipios y sedes
          </p>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">Cargando dataset…</p>
        </div>
      )}

      {/* Legend — always visible on desktop; on mobile it moves into
          MobileMenu so it doesn't sit permanently over the map on a small
          viewport. */}
      {!isMobile && (
        <div className="pointer-events-none absolute bottom-4 left-3 z-10 md:bottom-6 md:left-4">
          <div className="pointer-events-auto rounded-md border border-border bg-surface/95 p-3 shadow-sm backdrop-blur">
            <span className="label-caps">Criticidad</span>
            <ul className="mt-1.5 space-y-1 text-xs">
              {(["ROJO", "AMARILLO", "VERDE", "SIN_DETALLE"] as const).map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: CRITICALITY_HEX[c] }} />
                  {c.replace("_", " ").toLowerCase()}
                </li>
              ))}
            </ul>
            <div className="mt-2.5 border-t border-border pt-2.5">
              <span className="flex items-center gap-2 text-xs font-medium">
                <span className="size-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: CLUSTER_COLOR }} />
                {CLUSTER_LABEL}
              </span>
              <p className="mt-1 max-w-[13rem] text-[11px] leading-snug text-muted-foreground">
                Un punto grande no indica alerta: agrupa varias sedes cercanas. Haz clic para ver cuáles.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile drawer — filters, resumen and leyenda consolidated behind
          the ☰ button so they never stack on top of the map at once. */}
      {isMobile && (
        <MobileMenu
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          filters={filters}
          onChange={setFilters}
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap((v) => !v)}
          totals={
            data
              ? { total: data.totals.total, red: data.totals.red, yellow: data.totals.yellow, green: data.totals.green }
              : undefined
          }
        />
      )}

      {/* Contextual panel — only exists when the user has drilled into a
          municipality or a site. Nothing permanent competes with the map. */}
      {panelOpen && viewState.level === "MUNICIPALITY" && selectedMunicipality && (
        <ContextualPanel
          isMobile={isMobile}
          title={selectedMunicipality.municipality.name}
          subtitle={`${selectedMunicipality.affectedSites} sedes`}
          onClose={goToAll}
          transitionKey={`municipality-${selectedMunicipality.municipality.id}`}
        >
          <MunicipalityPanel summary={selectedMunicipality} sites={municipalitySites} onSelectSite={selectSite} />
        </ContextualPanel>
      )}

      {panelOpen && viewState.level === "SITE" && selectedSite && (
        <ContextualPanel
          isMobile={isMobile}
          title={selectedSite.site?.name ?? selectedSite.diagnostic.sourceSite ?? "Sede"}
          subtitle={selectedSite.institution?.name ?? selectedSite.diagnostic.sourceInstitution ?? undefined}
          onBack={goToMunicipality}
          onClose={goToAll}
          transitionKey={`site-${selectedSite.diagnostic.id}`}
        >
          <SiteDetailPanel view={selectedSite} />
        </ContextualPanel>
      )}

      {/* ETL footnote — hidden on mobile (bottom-right collides with the
          bottom sheet's drag handle there); still shown on desktop. */}
      {meta && !isMobile && (
        <p className="pointer-events-none absolute bottom-2 right-3 z-10 font-mono text-[10px] text-muted-foreground/70">
          ETL {new Date(meta.generatedAt).toLocaleDateString("es-CO")}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {color && <span className="size-2 rounded-full" style={{ backgroundColor: color }} />}
      <span className="font-display font-semibold tabular-nums">{value}</span>
      <span className="label-caps">{label}</span>
    </div>
  );
}