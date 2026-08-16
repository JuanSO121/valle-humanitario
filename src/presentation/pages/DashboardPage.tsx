// DashboardPage.tsx
import { useEffect, useMemo, useState } from "react";
import type { DiagnosticFilters } from "@/domain/entities";
import { Breadcrumb } from "@/presentation/components/Breadcrumb";

import { MapCanvas } from "@/presentation/components/MapCanvas";
import { SiteDetailPanel } from "@/presentation/components/SiteDetailPanel";
import { CLUSTER_COLOR, CLUSTER_LABEL, CRITICALITY_HEX } from "@/presentation/components/criticality";
import { useDatasetMeta, useMapView } from "@/presentation/hooks/useDiagnostics";
import { useIsMobile } from "@/hooks/use-mobile";
import { ContextualPanel } from "../components/ContextualPanel";
import { CriticalityStatsBar } from "../components/CriticalityStatsBar";
import { FilterPopover } from "../components/FilterPopover";
import { MunicipalityPanel } from "../components/MunicipalityPanel";
import { INITIAL_VIEW_STATE, viewTransitions } from "../state/viewState";
import { MobileMenu } from "../components/Mobilemenu";

const activeFilterCount = (f: DiagnosticFilters) =>
  (f.search ? 1 : 0) + (f.criticality?.length ?? 0) + (f.onlyReviewRequired ? 1 : 0);

const HINT_AUTOHIDE_MS = 4500;

export function DashboardPage() {
  const [filters, setFilters] = useState<DiagnosticFilters>({});
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [overlayCollapsed, setOverlayCollapsed] = useState(false);
  const isMobile = useIsMobile();

  const { data, isLoading, error } = useMapView(filters);
  const { data: meta } = useDatasetMeta();

  useEffect(() => {
    const timer = setTimeout(() => setHintDismissed(true), HINT_AUTOHIDE_MS);
    return () => clearTimeout(timer);
  }, []);

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

  const selectMunicipality = (id: string) => {
    setHintDismissed(true);
    setViewState((prev) => viewTransitions.toMunicipality(id, prev));
  };
  const selectSite = (id: string) => {
    setHintDismissed(true);
    const view = data?.sites.find((s) => s.diagnostic.id === id);
    setViewState((prev) => viewTransitions.toSite(id, view?.municipality?.id ?? null, prev));
  };
  const goToAll = () => setViewState(viewTransitions.toAll());
  const goToMunicipality = () => setViewState((prev) => viewTransitions.toMunicipalityFromSite(prev));

  const panelOpen = viewState.level !== "ALL";
  const filterCount = activeFilterCount(filters);
  const showHint = viewState.level === "ALL" && !isLoading && !hintDismissed && !overlayCollapsed;
  const overlayExpanded = isMobile || !overlayCollapsed;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
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

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="pointer-events-auto flex min-w-0 items-center gap-1.5">
            <div
              className={`min-w-0 rounded-full border border-border bg-surface/95 px-3.5 py-1.5 shadow-sm backdrop-blur ${
                isMobile ? "max-w-[60%]" : "flex-1 md:flex-initial"
              }`}
            >
              <h1 className="truncate text-sm font-semibold leading-tight md:text-[15px]">Criticidad Sísmica Escolar</h1>
            </div>

            {!isMobile && (
              <button
                type="button"
                onClick={() => setOverlayCollapsed((v) => !v)}
                aria-expanded={overlayExpanded}
                aria-label={overlayExpanded ? "Ocultar panel de resumen" : "Mostrar panel de resumen"}
                title={overlayExpanded ? "Ocultar panel" : "Mostrar panel"}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface/95 text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className={`transition-transform duration-200 ${overlayExpanded ? "rotate-0" : "-rotate-90"}`}
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>

          {!isMobile && (
            <FilterPopover
              filters={filters}
              showHeatmap={showHeatmap}
              onToggleHeatmap={() => setShowHeatmap((v) => !v)}
              onChange={setFilters}
            />
          )}
        </div>

        {overlayExpanded && (
          <>
            <div className="flex items-center gap-2">
              <Breadcrumb
                viewState={viewState}
                municipalityName={selectedMunicipality?.municipality.name ?? null}
                siteName={selectedSite ? (selectedSite.site?.name ?? selectedSite.diagnostic.sourceSite ?? null) : null}
                onGoToAll={goToAll}
                onGoToMunicipality={goToMunicipality}
              />
            </div>

            {!isMobile && data && (
              <CriticalityStatsBar
                filters={filters}
                onChange={setFilters}
                total={data.totals.total}
                red={data.totals.red}
                yellow={data.totals.yellow}
                green={data.totals.green}
              />
            )}
          </>
        )}
      </div>

      {showHint && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center px-3 transition-opacity duration-300 md:top-24">
          <button
            type="button"
            onClick={() => setHintDismissed(true)}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface/90 px-4 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
          >
            Explora el mapa para consultar municipios y sedes
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {isMobile && (
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menú de filtros y leyenda"
          className="pointer-events-auto fixed right-3 top-24 z-20 flex items-center gap-1.5 rounded-full border border-border bg-surface/95 px-3 py-2 shadow-sm backdrop-blur"
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
      )}

      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">Cargando dataset…</p>
        </div>
      )}

      {/* Leyenda — antes solo dependía de "!isMobile", por lo que se quedaba
          visible aunque el usuario colapsara el resto del panel superior.
          Ahora también depende de "overlayExpanded": al colapsar el título,
          la leyenda se oculta junto con breadcrumb y stats, como un solo
          panel coherente; al expandir, vuelve a aparecer. */}
      {!isMobile && overlayExpanded && (
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

      {meta && !isMobile && (
        <p className="pointer-events-none absolute bottom-2 right-3 z-10 font-mono text-[10px] text-muted-foreground/70">
          ETL {new Date(meta.generatedAt).toLocaleDateString("es-CO")}
        </p>
      )}
    </div>
  );
}