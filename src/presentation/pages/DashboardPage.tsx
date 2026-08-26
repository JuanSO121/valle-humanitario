import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useOrigenes, useDestinos, useFlujos } from "@/application/hooks/useCatalogQueries";
import { useFlujosPorLente } from "@/application/hooks/useFlujosPorLente";
import {
  INITIAL_VIEW_STATE,
  viewTransitions,
  type ViewState,
} from "@/presentation/state/viewState";
import { MapCanvas } from "@/presentation/components/MapCanvas";
import { Timeline } from "@/presentation/components/Timeline";
import { MarcadorHUD } from "@/presentation/components/MarcadorHUD";
import { FlujosLegend } from "@/presentation/components/FlujosLegend";
import { DestinoPanel } from "@/presentation/components/DestinoPanel";
import { OrigenPanel } from "@/presentation/components/OrigenPanel";
import { TopBar } from "@/presentation/components/TopBar";
import {
  getTerritoryStat,
  territoryMunicipalities,
  type TerritoryMapMode,
  type TerritoryRoutesMode,
  type TerritoryZone,
} from "@/presentation/data/territoryData";
import {
  dayFromIsoDate,
  describeLens,
  territoryValue,
  toneladasMovilizadas,
} from "@/presentation/data/territoryTime";
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

  /**
   * `lens` es CÓMO se lee el día que marca el timeline, no un segundo
   * reloj. Antes esto era `territoryMode` y venía con su propio slider de
   * jornada, independiente del timeline: se podía tener los arcos en el
   * día 14 y los polígonos pintados con el total final de la operación.
   * Ahora hay un solo control temporal —el Timeline— y este toggle solo
   * decide si ese día se lee como acumulado o como jornada suelta.
   *
   * Por defecto acumulado: mover una línea de tiempo normalmente
   * significa "mostrame cómo iba", no "mostrame solo ese día".
   */
  const [lens, setLens] = useState<TerritoryMapMode>("acumulado");
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

  /** El único reloj. Todo lo temporal del mapa se deriva de acá. */
  const isoDate = viewState.timelineDate;
  const territoryDay = useMemo(() => dayFromIsoDate(isoDate), [isoDate]);

  const flujosParaMapa = useFlujosPorLente(flujosResponse?.flujos, lens, isoDate);

  const totalDespachosAsOf = useMemo(
    () => flujosParaMapa.reduce((sum, f) => sum + f.despachosCount, 0),
    [flujosParaMapa],
  );

  /**
   * Toneladas del HUD, con el mismo lente que todo lo demás.
   *
   * OJO: la serie de `jornadas` es DEPARTAMENTAL —incluye Cali, el acopio
   * de Cartago y las otras ayudas solidarias—, mientras que `totalDespachosAsOf`
   * cuenta solo los flujos visibles en el mapa. Las dos cifras del HUD no
   * son divisibles entre sí.
   */
  const totalToneladasAsOf = useMemo(
    () => toneladasMovilizadas(lens, territoryDay),
    [lens, territoryDay],
  );

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
   * Control de aparición de las notificaciones. El engine puede producir
   * varios frames mientras siguen llegando despachos; si una tarjeta
   * acaba de aparecer, no la reemplazamos durante 1200 ms.
   */
  const handleActivity = (frame: ActivityFrame | null) => {
    const now = performance.now();

    if (frame && now - lastShownAtRef.current < MIN_GAP_BETWEEN_POPS_MS && visibleActivity) {
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
          timelineActive={isoDate !== null}
          selectedDestinoId={viewState.destinoId}
          selectedOrigenId={viewState.origenId}
          territoryMode={lens}
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

      {/* Reemplaza a TimelineStatsHUD: la cifra que la gente sigue es la
          tonelada, y tiene que verse subir. Ver MarcadorHUD. */}
      <MarcadorHUD
        toneladas={totalToneladasAsOf}
        despachos={totalDespachosAsOf}
        day={territoryDay}
        lens={lens}
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
          lens={lens}
          day={territoryDay}
          zone={territoryZone}
          routesMode={routesMode}
          onLensChange={setLens}
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
  lens: TerritoryMapMode;
  /** Derivado del timeline. null = toda la operación. */
  day: string | null;
  zone: TerritoryZone | "todas";
  routesMode: TerritoryRoutesMode;
  onLensChange: (lens: TerritoryMapMode) => void;
  onZoneChange: (zone: TerritoryZone | "todas") => void;
  onRoutesModeChange: (mode: TerritoryRoutesMode) => void;
}

const ZONES: Array<TerritoryZone | "todas"> = ["todas", "Norte", "Centro", "Sur", "Pacífico"];

function TerritoryControls({
  lens,
  day,
  zone,
  routesMode,
  onLensChange,
  onZoneChange,
  onRoutesModeChange,
}: TerritoryControlsProps) {
  const visibleMunicipalities =
    zone === "todas"
      ? territoryMunicipalities
      : territoryMunicipalities.filter((m) => m.zone === zone);

  // Mismo lente que el mapa: si el panel dijera otra cosa que los
  // polígonos, volveríamos al problema que este cambio vino a arreglar.
  const totalDespachos = visibleMunicipalities.reduce(
    (sum, m) => sum + territoryValue(m, lens, day),
    0,
  );

  return (
    <aside className="pointer-events-auto absolute left-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-10 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-border bg-surface/95 p-3 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="label-caps text-[10px]">Territorio</span>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {plural(totalDespachos, "despacho", "despachos")} ·{" "}
            {plural(visibleMunicipalities.length, "municipio", "municipios")}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{describeLens(lens, day)}</p>
        </div>
      </div>

      {/* El slider de jornada se eliminó: era un segundo control temporal
          que competía con el timeline de abajo. Este toggle ya no elige
          un día, elige cómo leer el que marca el timeline. */}
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-background/70 p-1">
        <ToggleButton active={lens === "acumulado"} onClick={() => onLensChange("acumulado")}>
          Acumulado
        </ToggleButton>
        <ToggleButton
          active={lens === "jornada"}
          onClick={() => onLensChange("jornada")}
          disabled={day === null}
          title={day === null ? "Movés el timeline para elegir una jornada" : undefined}
        >
          Solo la jornada
        </ToggleButton>
      </div>

      {day === null && lens === "acumulado" && (
        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
          Mové la línea de tiempo para ver cómo se fue llenando el mapa.
        </p>
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
        <ToggleButton active={routesMode === "solo"} onClick={() => onRoutesModeChange("solo")}>
          Solo selección
        </ToggleButton>
        <ToggleButton active={routesMode === "color"} onClick={() => onRoutesModeChange("color")}>
          Solo color
        </ToggleButton>
      </div>
    </aside>
  );
}

/** "1 municipio" y no "1 municipios". */
function plural(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString("es-CO")} ${n === 1 ? uno : varios}`;
}

function ToggleButton({
  active,
  onClick,
  children,
  disabled = false,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`rounded px-2 py-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}