/**
 * TopBar.tsx
 * -----------------------------------------------------------------------
 * La "capa superior" que faltaba (ver captura de referencia): título del
 * dashboard + breadcrumb de ubicación, fijos arriba a la izquierda.
 *
 * A diferencia de la referencia no lleva botón de "Búsqueda" — no se
 * pidió y este dashboard no tiene filtros hoy (solo selección de
 * origen/destino en el mapa); un botón sin función real sería puro
 * decorado.
 *
 * Responsive: en mobile el título se trunca con un ancho máximo en vez
 * de partir en dos líneas o empujar el breadcrumb fuera de pantalla —
 * ambas píldoras quedan en una sola fila.
 * -----------------------------------------------------------------------
 */
import type { ViewState } from "@/presentation/state/viewState";
import { Breadcrumb } from "./Breadcrumb";

interface Props {
  viewState: ViewState;
  seleccionNombre: string | null;
  onGoToAll: () => void;
}

export function TopBar({ viewState, seleccionNombre, onGoToAll }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(1rem+env(safe-area-inset-top))] z-10 flex items-center gap-2 px-4">
      <div className="pointer-events-auto flex max-w-[55vw] items-center rounded-full border border-border bg-surface/95 px-3.5 py-1.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur sm:max-w-none">
        <span className="truncate">Ayudas Humanitarias</span>
      </div>
      <Breadcrumb viewState={viewState} seleccionNombre={seleccionNombre} onGoToAll={onGoToAll} />
    </div>
  );
}