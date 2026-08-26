import { useEffect } from "react";
import { CLUSTER_COLOR, CRITICALITY_HEX } from "./criticality";

interface Props {
  onClose: () => void;
}

/**
 * Modal de bienvenida para quien entra por primera vez al visor. Se
 * muestra una sola vez por navegador (ver useFirstVisit) y explica lo
 * mínimo necesario para interpretar el mapa: qué son los colores, qué es
 * un cluster, y cómo navegar entre municipio y sede.
 *
 * Se cierra con click/tap fuera del contenido (en el fondo oscuro) o con
 * Escape, como cualquier modal actual — no solo con el botón "Entendido".
 */
export function WelcomeModal({ onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      // El fondo cierra el modal; el contenido detiene la propagación para
      // que un click DENTRO de la tarjeta no la cierre (ver stopPropagation
      // más abajo).
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="welcome-modal-title" className="text-base font-semibold">
          Criticidad Sísmica Escolar
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Este mapa muestra sedes educativas del Valle del Cauca diagnosticadas por criticidad sísmica, a
          partir del reporte de afectaciones.
        </p>

        <ul className="mt-4 space-y-2.5 text-xs">
          <li className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CRITICALITY_HEX["ROJO"] }} />
            Riesgo alto — se recomienda evaluación urgente
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CRITICALITY_HEX["AMARILLO"] }} />
            Riesgo medio — requiere seguimiento
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CRITICALITY_HEX["VERDE"] }} />
            Riesgo bajo — sin afectaciones críticas
          </li>
          <li className="flex items-start gap-2 border-t border-border pt-2.5">
            <span
              className="mt-0.5 size-2.5 shrink-0 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: CLUSTER_COLOR }}
            />
            <span>
              <strong className="font-medium text-foreground">Círculo grande con número:</strong> varias sedes
              agrupadas — no indica riesgo. Haz clic o acércate (zoom) para separarlas.
            </span>
          </li>
        </ul>

        <p className="mt-4 text-xs text-muted-foreground">
          Haz clic en un municipio para ver su resumen, o en un punto para ver el detalle de esa sede.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}