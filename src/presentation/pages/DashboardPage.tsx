import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useOrigenes, useDestinos, useFlujos } from "@/application/hooks/useCatalogQueries";
import { useFlujosPorLente } from "@/application/hooks/useFlujosPorLente";
import {
  INITIAL_VIEW_STATE,
  viewTransitions,
  type ViewState,
} from "@/presentation/state/viewState";
import { MapCanvas, type MunicipioMapa } from "@/presentation/components/MapCanvas";
import { Timeline } from "@/presentation/components/Timeline";
import { MarcadorHUD } from "@/presentation/components/MarcadorHUD";
import { AvisoEntrega } from "@/presentation/components/AvisoEntrega";
import { FlujosLegend } from "@/presentation/components/FlujosLegend";
import { DestinoPanel } from "@/presentation/components/DestinoPanel";
import { OrigenPanel } from "@/presentation/components/OrigenPanel";
import { TopBar } from "@/presentation/components/TopBar";
import { useOperacion } from "@/presentation/state/OperacionContext";
import {
  getTerritoryStat,
  type TerritoryMapMode,
  type TerritoryRoutesMode,
  type TerritoryZone,
} from "@/presentation/data/territoryData";
import {
  dayFromIsoDate,
  describeLens,
  valorTemporal,
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
   * Ahora hay un solo control temporal, el Timeline, y este toggle solo
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

  const operacion = useOperacion();

  const flujosParaMapa = useFlujosPorLente(flujosResponse?.flujos, lens, isoDate);

  /**
   * Entregas por municipio, indexadas por código DANE, para que el mapa
   * pinte con los datos de la API. El catálogo estático solo aporta la
   * zona y el código de los municipios que todavía no registran
   * entregas, para que aparezcan en gris y no desaparezcan del mapa.
   */
  const municipiosMapa = useMemo(() => {
    const mapa = new Map<string, MunicipioMapa>();

    // Arranca con todos los municipios del catálogo en cero, para que
    // los que aún no reciben aparezcan en gris en vez de desaparecer.
    for (const cat of operacion.catalogo) {
      mapa.set(cat.codigoDane, {
        nombre: cat.nombre,
        entregas: 0,
        dias: {},
        toneladas: 0,
        zona: cat.zona,
      });
    }

    for (const m of operacion.municipios) {
      const codigo = m.codigoDane ?? getTerritoryStat(m.nombre)?.codigoDane;
      if (!codigo) continue;
      mapa.set(codigo, {
        nombre: m.nombre,
        entregas: m.entregas,
        dias: m.dias,
        toneladas: m.toneladas,
        zona: m.zona ?? getTerritoryStat(m.nombre)?.zone ?? null,
      });
    }

    return mapa;
  }, [operacion.catalogo, operacion.municipios]);

  const totalDespachosAsOf = useMemo(
    () => flujosParaMapa.reduce((sum, f) => sum + f.despachosCount, 0),
    [flujosParaMapa],
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
          ? "theme-ayudas relative h-full min-h-[26rem] w-full overflow-hidden bg-background"
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
          municipios={municipiosMapa}
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

      <MarcadorHUD
        despachos={totalDespachosAsOf}
        day={territoryDay}
        lens={lens}
        instant={viewState.timelineInstant}
      />

      <AvisoEntrega frame={visibleActivity} />

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
          municipios={municipiosMapa}
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
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 flex justify-center px-3">
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
  municipios: ReadonlyMap<string, MunicipioMapa>;
  lens: TerritoryMapMode;
  /** Derivado del timeline. null = toda la operación. */
  day: string | null;
  zone: TerritoryZone | "todas";
  routesMode: TerritoryRoutesMode;
  onLensChange: (lens: TerritoryMapMode) => void;
  onZoneChange: (zone: TerritoryZone | "todas") => void;
  onRoutesModeChange: (mode: TerritoryRoutesMode) => void;
}

const TODAS = "todas";

function TerritoryControls({
  municipios,
  lens,
  day,
  zone,
  routesMode,
  onLensChange,
  onZoneChange,
  onRoutesModeChange,
}: TerritoryControlsProps) {
  // Los mismos datos que pinta el mapa. Antes esto sumaba el catálogo
  // estático y el panel mostraba un total distinto al del resto de la
  // página.
  // Las zonas salen de los datos, no de una lista escrita a mano: si el
  // Excel reclasifica un municipio, el filtro se actualiza solo.
  const zonasDisponibles = [
    ...new Set(
      [...municipios.values()]
        .map((m) => m.zona)
        .filter((z): z is string => typeof z === "string" && z.length > 0),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

  const visibleMunicipalities = [...municipios.values()].filter(
    (m) => zone === "todas" || m.zona === zone,
  );

  const totalDespachos = visibleMunicipalities.reduce(
    (sum, m) => sum + valorTemporal(m, lens, day),
    0,
  );
  const conEntregas = visibleMunicipalities.filter(
    (m) => valorTemporal(m, lens, day) > 0,
  ).length;

  return (
    <aside className="pointer-events-auto absolute inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 max-h-[45dvh] overflow-y-auto rounded-lg border border-border bg-surface/95 p-4 shadow-sm backdrop-blur md:inset-x-auto md:bottom-auto md:left-4 md:top-[calc(1rem+env(safe-area-inset-top))] md:max-h-[calc(100dvh-9rem)] md:w-[22rem]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Ayudas entregadas</span>
          <p className="mt-1.5 text-base font-semibold text-foreground">
            {plural(totalDespachos, "entrega", "entregas")} en{" "}
            {plural(conEntregas, "municipio", "municipios")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{describeLens(lens, day)}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-background/70 p-1">
        <ToggleButton active={lens === "acumulado"} onClick={() => onLensChange("acumulado")}>
          Todo lo entregado
        </ToggleButton>
        <ToggleButton
          active={lens === "jornada"}
          onClick={() => onLensChange("jornada")}
          disabled={day === null}
          title={day === null ? "Elige una jornada en la línea de tiempo" : undefined}
        >
          Solo ese día
        </ToggleButton>
      </div>

      {day === null && lens === "acumulado" && (
        <p className="mt-2.5 text-sm leading-5 text-muted-foreground">
          Mueva la línea de tiempo para ver cómo se entregaron las ayudas día por día.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {[TODAS, ...zonasDisponibles].map((item) => (
          <ToggleButton
            key={item}
            active={zone === item}
            onClick={() => onZoneChange(item as TerritoryZone | "todas")}
          >
            {item === TODAS ? "Todas" : item}
          </ToggleButton>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1 rounded-md bg-background/70 p-1 sm:grid-cols-3">
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
      className={`rounded px-2.5 py-2 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}