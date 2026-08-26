import { useEffect, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import {
  useOrigenes,
  useDestinos,
  useFlujos,
} from "@/application/hooks/useCatalogQueries";
import { useFlujosAsOf } from "@/application/hooks/useFlujosAsOf";
import { INITIAL_VIEW_STATE, viewTransitions, type ViewState } from "@/presentation/state/viewState";
import { MapCanvas } from "@/presentation/components/MapCanvas";
import { Timeline } from "@/presentation/components/Timeline";
import { FlujosLegend } from "@/presentation/components/FlujosLegend";
import { DestinoPanel } from "@/presentation/components/DestinoPanel";
import { OrigenPanel } from "@/presentation/components/OrigenPanel";
import { TopBar } from "@/presentation/components/TopBar";

function useIsMobile(breakpointPx = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpointPx]);
  return isMobile;
}

export function DashboardPage() {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const isMobile = useIsMobile();

  const { data: origenes } = useOrigenes();
  const { data: destinos } = useDestinos();
  const { data: flujosResponse } = useFlujos();

  const timelineDates = useMemo(() => {
    if (!flujosResponse?.flujos) return [];
    const set = new Set<string>();
    flujosResponse.flujos.forEach((f) => (f.porFecha ?? []).forEach((p) => set.add(p.fecha)));
    return [...set].sort();
  }, [flujosResponse]);

  const flujosParaMapa = useFlujosAsOf(flujosResponse?.flujos, viewState.timelineDate);

  const flujosFiltrados = useMemo(() => {
    if (viewState.origenId) {
      return flujosParaMapa.filter((f) => f.origenId === viewState.origenId);
    }
    if (viewState.destinoId) {
      return flujosParaMapa.filter((f) => f.destino.id === viewState.destinoId);
    }
    return [];
  }, [flujosParaMapa, viewState.origenId, viewState.destinoId]);

  const origenSeleccionado = useMemo(
    () => origenes?.find((o) => o.id === viewState.origenId) ?? null,
    [origenes, viewState.origenId],
  );

  // Igual que origenSeleccionado, pero para el breadcrumb: DestinoPanel
  // hace su propio fetch de detalle (useDestinoResumen), pero el nombre
  // para el breadcrumb ya está disponible en el catálogo `destinos` que
  // este componente ya tiene cargado — no vale la pena esperar el fetch
  // del panel solo para pintar la migaja de arriba.
  const destinoSeleccionado = useMemo(
    () => destinos?.find((d) => d.id === viewState.destinoId) ?? null,
    [destinos, viewState.destinoId],
  );

  const seleccionNombre = origenSeleccionado?.nombre ?? destinoSeleccionado?.nombre ?? null;

  useEffect(() => {
    if (!viewState.timelineInstant) return;
    setViewState((prev) => viewTransitions.clearInstantFlag(prev));
  }, [viewState.timelineInstant, viewState.timelineDate]);

  const hayPanelAbiertoEnMobile = isMobile && (viewState.destinoId || viewState.origenId);

  return (
    <div className="theme-ayudas relative h-dvh w-dvw overflow-hidden bg-background">
      <ClientOnly
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e14] text-xs text-muted-foreground">
            Cargando mapa…
          </div>
        }
      >
        <MapCanvas
          origenes={origenes ?? []}
          destinos={destinos ?? []}
          flujos={flujosFiltrados}
          instantTransition={viewState.timelineInstant}
          selectedDestinoId={viewState.destinoId}
          selectedOrigenId={viewState.origenId}
          onSelectDestino={(id) => setViewState((prev) => viewTransitions.toDestino(id, prev))}
          onSelectOrigen={(id) => setViewState((prev) => viewTransitions.toOrigen(id, prev))}
          onReset={() => setViewState((prev) => viewTransitions.toAll(prev))}
        />
      </ClientOnly>

      <TopBar
        viewState={viewState}
        seleccionNombre={seleccionNombre}
        onGoToAll={() => setViewState((prev) => viewTransitions.toAll(prev))}
      />

      {!viewState.destinoId && !viewState.origenId && <FlujosLegend compact={isMobile} />}

      {viewState.level === "DESTINO" && viewState.destinoId && (
        <DestinoPanel
          destinoId={viewState.destinoId}
          isMobile={isMobile}
          onClose={() => setViewState((prev) => viewTransitions.toAll(prev))}
        />
      )}

      {viewState.level === "ORIGEN" && viewState.origenId && origenSeleccionado && (
        <OrigenPanel
          origenId={viewState.origenId}
          origenNombre={origenSeleccionado.nombre}
          flujos={flujosFiltrados}
          isMobile={isMobile}
          onClose={() => setViewState((prev) => viewTransitions.toAll(prev))}
        />
      )}

      {!hayPanelAbiertoEnMobile && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 flex justify-center px-4">
          <Timeline
            dates={timelineDates}
            currentDate={viewState.timelineDate}
            onActivate={(first) => setViewState((prev) => viewTransitions.startTimeline(first, prev))}
            onSeek={(date) => setViewState((prev) => viewTransitions.seekTimeline(date, prev))}
            onAdvance={(date) => setViewState((prev) => viewTransitions.advanceTimeline(date, prev))}
            onExit={() => setViewState((prev) => viewTransitions.exitTimeline(prev))}
          />
        </div>
      )}
    </div>
  );
}