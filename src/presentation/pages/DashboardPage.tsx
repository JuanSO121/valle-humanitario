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
import { TimelineStatsHUD } from "@/presentation/components/TimelineStatsHUD";
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

  // Total "primera plana" para TimelineStatsHUD: suma de despachos de
  // TODOS los flujos visibles a la fecha actual del timeline, sin filtrar
  // por origen/destino seleccionado — es el número global de la red, no
  // el de la selección puntual (eso ya lo muestran DestinoPanel/
  // OrigenPanel con sus propios totales).
  const totalDespachosAsOf = useMemo(
    () => flujosParaMapa.reduce((sum, f) => sum + f.despachosCount, 0),
    [flujosParaMapa],
  );

  /**
   * FIX (bug "el timeline no muestra animación de líneas"): la rama sin
   * selección (nivel ALL) devolvía `[]` en vez de `flujosParaMapa`. Este
   * mismo array es el que se le pasa a MapCanvas como `flujos` — los
   * arcos que efectivamente dibuja y anima. Reproducir el timeline NO
   * requiere tener un origen/destino seleccionado (de hecho el caso
   * típico es justo ALL: "ver por días hacia dónde se despachó" en toda
   * la red), así que con el `[]` de antes, el mapa se quedaba sin ningún
   * arco que animar apenas no había selección — la fecha del timeline
   * cambiaba (el estado sí avanzaba) pero no había nada dibujado para
   * mostrar ese avance, y se leía como "no funciona". Ahora, sin
   * selección, se devuelven TODOS los flujos vigentes a la fecha actual.
   * El comportamiento con un origen/destino seleccionado no cambia: sigue
   * filtrando exactamente igual que antes (y sigue siendo lo que reciben
   * OrigenPanel/DestinoPanel para sus propios totales).
   */
  const flujosFiltrados = useMemo(() => {
    if (viewState.origenId) {
      return flujosParaMapa.filter((f) => f.origenId === viewState.origenId);
    }
    if (viewState.destinoId) {
      return flujosParaMapa.filter((f) => f.destino.id === viewState.destinoId);
    }
    return flujosParaMapa;
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
          timelineActive={viewState.timelineDate !== null}
          selectedDestinoId={viewState.destinoId}
          selectedOrigenId={viewState.origenId}
          onSelectDestino={(id) => setViewState((prev) => viewTransitions.toDestino(id, prev))}
          onSelectOrigen={(id) => setViewState((prev) => viewTransitions.toOrigen(id, prev))}
          onReset={() => setViewState((prev) => viewTransitions.toAll(prev))}
        />
      </ClientOnly>

      <TimelineStatsHUD
        totalDespachos={totalDespachosAsOf}
        currentDate={viewState.timelineDate}
        instant={viewState.timelineInstant}
      />

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