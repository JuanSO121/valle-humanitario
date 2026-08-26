import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useOrigenes, useDestinos, useFlujos } from "@/application/hooks/useCatalogQueries";
import { useFlujosAsOf } from "@/application/hooks/useFlujosAsOf";
import {
  INITIAL_VIEW_STATE,
  viewTransitions,
  type ViewState,
} from "@/presentation/state/viewState";
import { MapCanvas } from "@/presentation/components/MapCanvas";
import { Timeline } from "@/presentation/components/Timeline";
import { TimelineStatsHUD } from "@/presentation/components/TimelineStatsHUD";
import { FlujosLegend } from "@/presentation/components/FlujosLegend";
import { DestinoPanel } from "@/presentation/components/DestinoPanel";
import { OrigenPanel } from "@/presentation/components/OrigenPanel";
import { TopBar } from "@/presentation/components/TopBar";
import {
  TERRITORY_DAYS,
  getTerritoryStat,
  territoryMunicipalities,
  type TerritoryMapMode,
  type TerritoryRoutesMode,
  type TerritoryZone,
} from "@/presentation/data/territoryData";
import { jornadas } from "@/presentation/data/movimientoData";
import type { ActivityFrame } from "@/presentation/components/dispatchActivityEngine";

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

interface DashboardPageProps {
  embedded?: boolean;
}

export function DashboardPage({ embedded = false }: DashboardPageProps) {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [linesDismissed, setLinesDismissed] = useState(false);
  const [territoryMode, setTerritoryMode] = useState<TerritoryMapMode>("acumulado");
  const [territoryDay, setTerritoryDay] = useState(TERRITORY_DAYS[0] ?? "11");
  const [territoryZone, setTerritoryZone] = useState<TerritoryZone | "todas">("todas");
  const [routesMode, setRoutesMode] = useState<TerritoryRoutesMode>("visibles");

  // Actividad visible tipo "Instagram": no permitimos que una nueva llegada
  // reemplace inmediatamente la tarjeta que acaba de aparecer.
  const [visibleActivity, setVisibleActivity] = useState<ActivityFrame | null>(null);
  const lastShownAtRef = useRef(0);
  const MIN_GAP_BETWEEN_POPS_MS = 1200;

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
  // TODOS los flujos visibles a la fecha actual del timeline.
  const totalDespachosAsOf = useMemo(
    () => flujosParaMapa.reduce((sum, f) => sum + f.despachosCount, 0),
    [flujosParaMapa],
  );

  const totalToneladasAsOf = useMemo(() => {
    if (!viewState.timelineDate) return jornadas.at(-1)?.acumuladoToneladas ?? 0;
    const day = viewState.timelineDate.slice(-2);
    return jornadas.find((j) => j.dia === day)?.acumuladoToneladas ?? 0;
  }, [viewState.timelineDate]);

  const flujosFiltrados = useMemo(() => {
    if (linesDismissed && !viewState.origenId && !viewState.destinoId) {
      return [];
    }
    if (viewState.origenId) {
      return flujosParaMapa.filter((f) => f.origenId === viewState.origenId);
    }
    if (viewState.destinoId) {
      return flujosParaMapa.filter((f) => f.destino.id === viewState.destinoId);
    }
    return flujosParaMapa;
  }, [flujosParaMapa, linesDismissed, viewState.origenId, viewState.destinoId]);

  const flujosParaRutas = useMemo(() => {
    const byZone =
      territoryZone === "todas"
        ? flujosFiltrados
        : flujosFiltrados.filter((f) => getTerritoryStat(f.destino.nombre)?.zone === territoryZone);

    if (routesMode === "color") return [];
    if (routesMode === "solo" && !viewState.origenId && !viewState.destinoId) return [];
    return byZone;
  }, [flujosFiltrados, routesMode, territoryZone, viewState.destinoId, viewState.origenId]);

  const origenSeleccionado = useMemo(
    () => origenes?.find((o) => o.id === viewState.origenId) ?? null,
    [origenes, viewState.origenId],
  );

  const destinoSeleccionado = useMemo(
    () => destinos?.find((d) => d.id === viewState.destinoId) ?? null,
    [destinos, viewState.destinoId],
  );

  const seleccionNombre = origenSeleccionado?.nombre ?? destinoSeleccionado?.nombre ?? null;

  /**
   * Control de aparición de las notificaciones.
   *
   * El engine puede producir varios frames mientras siguen llegando despachos.
   * Si una tarjeta acaba de aparecer, no la reemplazamos durante 1200 ms.
   * Esto evita el parpadeo y hace que la notificación se sienta más efímera,
   * tipo Instagram Story.
   */
  const handleActivity = (frame: ActivityFrame | null) => {
    const now = performance.now();

    if (
      frame &&
      now - lastShownAtRef.current < MIN_GAP_BETWEEN_POPS_MS &&
      visibleActivity
    ) {
      return;
    }

    if (frame) {
      lastShownAtRef.current = now;
    }

    setVisibleActivity(frame);
  };

  useEffect(() => {
    if (!viewState.timelineInstant) return;
    setViewState((prev) => viewTransitions.clearInstantFlag(prev));
  }, [viewState.timelineInstant, viewState.timelineDate]);

  const hayPanelAbiertoEnMobile = isMobile && (viewState.destinoId || viewState.origenId);

  return (
    <div
      className={
        embedded
          ? "theme-ayudas relative h-full min-h-[720px] w-full overflow-hidden bg-background"
          : "theme-ayudas relative h-dvh w-dvw overflow-hidden bg-background"
      }
    >
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
          flujos={flujosParaRutas}
          instantTransition={viewState.timelineInstant}
          timelineActive={viewState.timelineDate !== null}
          selectedDestinoId={viewState.destinoId}
          selectedOrigenId={viewState.origenId}
          territoryMode={territoryMode}
          territoryDay={territoryDay}
          territoryZone={territoryZone}
          routesMode={routesMode}
          onActivity={handleActivity}
          onSelectDestino={(id) => {
            setLinesDismissed(false);
            setViewState((prev) => viewTransitions.toDestino(id, prev));
          }}
          onSelectOrigen={(id) => {
            setLinesDismissed(false);
            setViewState((prev) => viewTransitions.toOrigen(id, prev));
          }}
          onReset={() => {
            setLinesDismissed(true);
            setViewState((prev) => viewTransitions.exitTimeline(viewTransitions.toAll(prev)));
          }}
        />
      </ClientOnly>

      <TimelineStatsHUD
        totalDespachos={totalDespachosAsOf}
        totalToneladas={totalToneladasAsOf}
        currentDate={viewState.timelineDate}
        instant={viewState.timelineInstant}
      />

      <TopBar
        viewState={viewState}
        seleccionNombre={seleccionNombre}
        onGoToAll={() => {
          setLinesDismissed(false);
          setViewState((prev) => viewTransitions.toAll(prev));
        }}
      />

      {!viewState.destinoId && !viewState.origenId && <FlujosLegend compact={isMobile} />}

      {!hayPanelAbiertoEnMobile && (
        <TerritoryControls
          mode={territoryMode}
          day={territoryDay}
          zone={territoryZone}
          routesMode={routesMode}
          onModeChange={setTerritoryMode}
          onDayChange={setTerritoryDay}
          onZoneChange={setTerritoryZone}
          onRoutesModeChange={setRoutesMode}
        />
      )}

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
            onActivate={(first) => {
              setLinesDismissed(false);
              setViewState((prev) => viewTransitions.startTimeline(first, prev));
            }}
            onSeek={(date) => {
              setLinesDismissed(false);
              setViewState((prev) => viewTransitions.seekTimeline(date, prev));
            }}
            onAdvance={(date) => {
              setLinesDismissed(false);
              setViewState((prev) => viewTransitions.advanceTimeline(date, prev));
            }}
            onExit={() => {
              setLinesDismissed(false);
              setViewState((prev) => viewTransitions.exitTimeline(prev));
            }}
          />
        </div>
      )}
    </div>
  );
}

interface TerritoryControlsProps {
  mode: TerritoryMapMode;
  day: string;
  zone: TerritoryZone | "todas";
  routesMode: TerritoryRoutesMode;
  onModeChange: (mode: TerritoryMapMode) => void;
  onDayChange: (day: string) => void;
  onZoneChange: (zone: TerritoryZone | "todas") => void;
  onRoutesModeChange: (mode: TerritoryRoutesMode) => void;
}

const ZONES: Array<TerritoryZone | "todas"> = ["todas", "Norte", "Centro", "Sur", "Pacífico"];

function TerritoryControls({
  mode,
  day,
  zone,
  routesMode,
  onModeChange,
  onDayChange,
  onZoneChange,
  onRoutesModeChange,
}: TerritoryControlsProps) {
  const dayIndex = Math.max(0, TERRITORY_DAYS.indexOf(day));
  const activeDayStat = jornadas.find((j) => j.dia === day);

  const visibleMunicipalities =
    zone === "todas"
      ? territoryMunicipalities
      : territoryMunicipalities.filter((m) => m.zone === zone);

  const totalDespachos = visibleMunicipalities.reduce(
    (sum, m) => sum + (mode === "acumulado" ? m.despachos : m.dias[day] ?? 0),
    0,
  );

  return (
    <aside className="pointer-events-auto absolute left-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-10 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-border bg-surface/95 p-3 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="label-caps text-[10px]">Territorio</span>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {totalDespachos.toLocaleString("es-CO")} despachos · {visibleMunicipalities.length} municipios
          </p>
        </div>

        {activeDayStat && mode === "jornada" && (
          <div className="text-right">
            <span className="label-caps text-[10px]">Toneladas</span>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {activeDayStat.toneladas} t
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-background/70 p-1">
        <ToggleButton active={mode === "acumulado"} onClick={() => onModeChange("acumulado")}>
          Acumulado
        </ToggleButton>
        <ToggleButton active={mode === "jornada"} onClick={() => onModeChange("jornada")}>
          Por jornada
        </ToggleButton>
      </div>

      {mode === "jornada" && (
        <div className="mt-3">
          <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
            <span>Día {day} de agosto</span>
            <span>{activeDayStat?.despachos ?? 0} despachos</span>
          </div>

          <input
            type="range"
            min={0}
            max={TERRITORY_DAYS.length - 1}
            step={1}
            value={dayIndex}
            onChange={(event) =>
              onDayChange(TERRITORY_DAYS[Number(event.target.value)] ?? day)
            }
            aria-label="Día de jornada para colorear municipios"
            className="h-1 w-full accent-primary"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {ZONES.map((item) => (
          <ToggleButton key={item} active={zone === item} onClick={() => onZoneChange(item)}>
            {item === "todas" ? "Todas" : item}
          </ToggleButton>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-md bg-background/70 p-1">
        <ToggleButton
          active={routesMode === "visibles"}
          onClick={() => onRoutesModeChange("visibles")}
        >
          Rutas visibles
        </ToggleButton>
        <ToggleButton
          active={routesMode === "solo"}
          onClick={() => onRoutesModeChange("solo")}
        >
          Solo selección
        </ToggleButton>
        <ToggleButton
          active={routesMode === "color"}
          onClick={() => onRoutesModeChange("color")}
        >
          Solo color
        </ToggleButton>
      </div>
    </aside>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1.5 text-[11px] font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
