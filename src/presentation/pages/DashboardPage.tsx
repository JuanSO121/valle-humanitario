/**
 * DashboardPage.tsx
 * -----------------------------------------------------------------------
 * Junta todo: catálogos (useCatalogQueries), estado de navegación
 * (viewState.ts), el mapa (MapCanvas), el timeline (Timeline) y el panel
 * de destino (DestinoPanel). Es el único componente que conoce todas las
 * piezas a la vez — cada hook/componente que ensambla ya es independiente
 * y no sabe de los demás (MapCanvas no sabe de Timeline, Timeline no sabe
 * de destinos, DestinoPanel no sabe del timeline). Mantener ese
 * desacoplamiento es la razón de que este archivo exista en vez de que
 * cada pieza se importe entre sí.
 * -----------------------------------------------------------------------
 */
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

// Breakpoint único compartido con el CSS (md: en Tailwind = 768px) — no
// existía un hook de este tipo en el proyecto viejo (ContextualPanel
// recibía `isMobile` desde afuera, pero nunca se vio de dónde lo sacaba
// en los archivos compartidos), así que se resuelve acá con la forma más
// simple posible: sin librería, sin debounce, matchMedia + un listener.
//
// El estado inicial es SIEMPRE `false`, nunca `window.innerWidth` — esto
// es TanStack Start con SSR real (ver router.tsx/server-entry.ts), así
// que el primer render del cliente tiene que coincidir exactamente con
// el HTML que ya mandó el servidor (que no tiene `window`) o React tira
// un hydration mismatch. El valor real se aplica recién en el
// `useEffect`, que solo corre en el cliente después de hidratar.
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

  // Fechas únicas para el Timeline, derivadas de flujos[].porFecha — el
  // backend no expone una ruta de "fechas disponibles" aparte porque
  // sería puramente derivable de un dato que ya viaja en /flujos; agregar
  // una ruta solo para esto duplicaría una fuente de verdad sin necesidad.
  const timelineDates = useMemo(() => {
    if (!flujosResponse?.flujos) return [];
    const set = new Set<string>();
    flujosResponse.flujos.forEach((f) => f.porFecha.forEach((p) => set.add(p.fecha)));
    return [...set].sort();
  }, [flujosResponse]);

  const flujosParaMapa = useFlujosAsOf(flujosResponse?.flujos, viewState.timelineDate);

  // MapCanvas consume `instantTransition` en el mismo commit en que
  // cambian los `flujos` (su useEffect corre sobre las props ya
  // actualizadas). Una vez consumido, hay que bajar la bandera para que
  // el SIGUIENTE cambio (un "advance" del Timeline) vuelva a animar —
  // si no se resetea acá, todo avance posterior a un seek quedaría
  // congelado en modo instantáneo. clearInstantFlag ya es un no-op si la
  // bandera está en false, así que este efecto es seguro de dejar
  // corriendo en cada render.
  useEffect(() => {
    if (!viewState.timelineInstant) return;
    setViewState((prev) => viewTransitions.clearInstantFlag(prev));
  }, [viewState.timelineInstant, viewState.timelineDate]);

  return (
    // `theme-ayudas`: activa el scope de custom properties definido en
    // theme-ayudas.css (pegado al final de src/styles.css) — ver ese
    // archivo para el razonamiento de por qué es un tema con scope y no
    // un :root global.
    <div className="theme-ayudas relative h-dvh w-dvw overflow-hidden bg-background">
      {/*
        ClientOnly (no un simple `useEffect` + "mounted" flag casero):
        maplibre-gl toca `document`/`window` apenas se IMPORTA el módulo
        (MapCanvas.tsx llama `maplibregl.setWorkerUrl(...)` a nivel de
        módulo, fuera de cualquier componente), así que ni siquiera puede
        evaluarse ese `import` durante el render en el servidor — no es
        solo un problema de qué se pinta, sino de qué se carga. ClientOnly
        de TanStack Router existe exactamente para este caso: el bundle
        del fallback se manda en el HTML servido, y el del `children`
        (con MapCanvas y su import de maplibre-gl adentro) recién se
        resuelve en el cliente.
      */}
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
          flujos={flujosParaMapa}
          instantTransition={viewState.timelineInstant}
          selectedDestinoId={viewState.destinoId}
          onSelectDestino={(id) => setViewState((prev) => viewTransitions.toDestino(id, prev))}
          onReset={() => setViewState((prev) => viewTransitions.toAll(prev))}
        />
      </ClientOnly>

      {/*
        Legend: card fija en desktop, botón+popover en mobile — ver
        razonamiento en FlujosLegend.tsx. Se oculta con destino abierto en
        AMBOS casos (ya lo hacía antes de este cambio): con el panel
        abierto no aporta nada que el panel mismo no explique mejor.
      */}
      {!viewState.destinoId && <FlujosLegend compact={isMobile} />}

      {viewState.level === "DESTINO" && viewState.destinoId && (
        <DestinoPanel
          destinoId={viewState.destinoId}
          isMobile={isMobile}
          onClose={() => setViewState((prev) => viewTransitions.toAll(prev))}
        />
      )}

      {/*
        En desktop el panel de destino es una card lateral (top-right, ver
        DesktopCard en ContextualPanel.tsx) que nunca toca la franja de
        abajo — el Timeline puede quedarse visible siempre.
        En mobile el panel es un MobileSheet anclado abajo (70vh) — mismo
        borde de pantalla que el Timeline. Mostrar los dos a la vez los
        hace pelear por el mismo espacio (y ambos en z-10, sin orden de
        apilado garantizado). Se oculta el Timeline mientras haya un
        destino abierto en mobile: es la solución más simple que no
        requiere que DashboardPage conozca el estado interno
        expanded/collapsed del sheet (eso vive dentro de ContextualPanel,
        a propósito, para no acoplar los dos componentes).
      */}
      {!(isMobile && viewState.destinoId) && (
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