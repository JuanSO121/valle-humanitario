/**
 * FlujosLegend.tsx
 * -----------------------------------------------------------------------
 * Leyenda fija de colores por origen. Deliberadamente NO se calcula a
 * partir de `origenes` (route=origenes) en tiempo real: solo hay dos
 * orígenes animables (Cali/Cartago, ver MapCanvas.ORIGEN_COLOR) y son
 * estables — derivar la leyenda del catálogo agregaría una dependencia de
 * red a un componente que es puro texto+color, y arriesgaría desincronía
 * de color si algún día MapCanvas cambia su paleta sin tocar este
 * archivo. Los colores están duplicados a propósito en las dos
 * constantes de abajo; si se tocan, se tocan juntas (mismo criterio que
 * ya se usó para ORIGEN_COLOR en MapCanvas.tsx).
 *
 * `compact`: variante mobile. NO es un MobileMenu-style drawer como el
 * del proyecto viejo — ese consolidaba 3 paneles de FILTRADO (buscar,
 * criticidad, mapa de calor) detrás de un botón, porque eran controles de
 * configuración que no hacía falta ver todo el tiempo. Acá el contenido
 * es 2 líneas de texto puramente informativas y no hay nada que
 * "configurar" — un drawer de pantalla completa sería sobre-ingeniería
 * para el tamaño real del contenido (ver frontend-design: "match
 * complexity to content"). Se resuelve con un botón redondo + popover,
 * del tamaño que el contenido realmente necesita.
 * -----------------------------------------------------------------------
 */
import { useState } from "react";

const ORIGENES_LEGEND = [
  { id: "ORI-CALI", nombre: "Cali (bodega central)", color: "#2f6fed" },
  { id: "ORI-CARTAGO", nombre: "Centro de acopio Cartago", color: "#e6883c" },
] as const;

function LegendContent() {
  return (
    <>
      <span className="label-caps text-[10px] text-muted-foreground">Origen del envío</span>
      <ul className="mt-2 flex flex-col gap-1.5">
        {ORIGENES_LEGEND.map((o) => (
          <li key={o.id} className="flex items-center gap-2">
            <span className="h-0.5 w-5 shrink-0 rounded-full" style={{ backgroundColor: o.color }} aria-hidden />
            <span className="text-foreground">{o.nombre}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 max-w-[13rem] text-[10px] leading-snug text-muted-foreground">
        El grosor de cada arco refleja el número de despachos, no las unidades entregadas.
      </p>
    </>
  );
}

export function FlujosLegend({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  if (!compact) {
    return (
      <div
        className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col gap-2 rounded-lg border border-border bg-surface/90 px-3.5 py-3 text-xs shadow-sm backdrop-blur"
        aria-label="Leyenda de orígenes de ayuda"
      >
        <LegendContent />
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-10">
      {open && (
        <div className="absolute bottom-11 left-0 w-52 rounded-lg border border-border bg-surface/95 px-3.5 py-3 text-xs shadow-lg backdrop-blur">
          <LegendContent />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Cerrar leyenda" : "Ver leyenda de orígenes"}
        className="flex size-9 items-center justify-center rounded-full border border-border bg-surface/95 text-muted-foreground shadow-sm backdrop-blur"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="8" r="1" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}