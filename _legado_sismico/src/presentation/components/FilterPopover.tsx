// FilterPopover.tsx
import { useEffect, useRef, useState } from "react";
import type { DiagnosticFilters } from "@/domain/entities";

interface Props {
  filters: DiagnosticFilters;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onChange: (next: DiagnosticFilters) => void;
}

/**
 * Ya NO incluye los botones de criticidad (Rojo/Amarillo/Verde): esos ahora
 * viven en la barra de stats (ver CriticalityStatsBar), donde además cumplen
 * doble función de mostrar el conteo y servir de filtro — sin duplicar UI.
 *
 * Fix de layout: el panel es `absolute` respecto al wrapper `relative` del
 * propio botón, en vez de ser un hijo más de la fila flex de arriba. Antes,
 * al no estar fuera del flujo, su ancho real empujaba la fila entera más
 * allá del viewport → scroll horizontal → toda la página se corría a la
 * izquierda (por eso "ROJO" se veía cortado como "OJO"). Además se clampea
 * el ancho a `calc(100vw - 1.5rem)` para que en pantallas angostas nunca
 * se salga, y se cierra con click-afuera + Escape.
 */
export function FilterPopover({ filters, showHeatmap, onToggleHeatmap, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const reviewCount = filters.onlyReviewRequired ? 1 : 0;
  const searchCount = filters.search ? 1 : 0;
  const badgeCount = reviewCount + searchCount;

  return (
    // pointer-events-auto: el wrapper padre (top overlay) es pointer-events-none
    // para dejar pasar los clics al mapa; este componente reactiva sus propios
    // eventos aquí mismo.
    <div ref={rootRef} className="pointer-events-auto relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface/95 px-3.5 py-1.5 text-sm font-medium shadow-sm backdrop-blur"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 6h16M7 12h10M10 18h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Busqueda
        {badgeCount > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Filtros"
          className="absolute right-0 top-full z-20 mt-2 w-[20rem] max-w-[calc(100vw-1.5rem)] rounded-lg border border-border bg-surface p-4 shadow-lg"
        >
          <div>
            <label className="label-caps" htmlFor="filter-search">
              Buscar sede / institución
            </label>
            <input
              id="filter-search"
              value={filters.search ?? ""}
              onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
              placeholder="Ej. Simón Bolívar"
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
            />
          </div>

          <div className="mt-4 border-t border-border pt-4">
            {/* Antes: "Solo MATCH_REVIEW_REQUIRED" — jerga de backend expuesta
                directamente. Ahora: lenguaje llano + una línea de contexto,
                sin exponer el nombre técnico del campo al usuario final. */}
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={Boolean(filters.onlyReviewRequired)}
                onChange={(e) => onChange({ ...filters, onlyReviewRequired: e.target.checked || undefined })}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                <span className="block font-medium">Solo pendientes de revisión</span>
                <span className="block text-xs text-muted-foreground">
                  Oculta las sedes ya resueltas o validadas.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={onToggleHeatmap}
                className="size-4 accent-primary"
              />
              Mostrar mapa de calor
            </label>
          </div>

          {(filters.search || filters.onlyReviewRequired) && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: undefined, onlyReviewRequired: undefined })}
              className="mt-4 w-full rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Limpiar estos filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}