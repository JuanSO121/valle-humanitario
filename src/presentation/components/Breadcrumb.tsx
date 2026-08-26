/**
 * Breadcrumb.tsx
 * -----------------------------------------------------------------------
 * Adaptado del breadcrumb de Criticidad Sísmica Escolar a la jerarquía de
 * este dashboard: acá solo hay DOS niveles (ALL y una selección puntual,
 * origen o destino — nunca un tercer nivel), así que a diferencia del
 * original no hay una migaja "intermedia" clickeable: la migaja de la
 * selección actual siempre es el final de la cadena, texto plano, no
 * botón (mismo criterio que `siteName` en el breadcrumb original).
 * -----------------------------------------------------------------------
 */
import type { ViewState } from "@/presentation/state/viewState";

interface Props {
  viewState: ViewState;
  seleccionNombre: string | null;
  onGoToAll: () => void;
}

export function Breadcrumb({ viewState, seleccionNombre, onGoToAll }: Props) {
  const enAll = viewState.level === "ALL";
  return (
    <nav
      aria-label="Ubicación actual"
      className="pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur"
    >
      <Crumb label="Valle del Cauca" active={enAll} onClick={enAll ? undefined : onGoToAll} />
      {seleccionNombre && (
        <>
          <Sep />
          <span className="max-w-[10rem] truncate text-foreground/90">{seleccionNombre}</span>
        </>
      )}
    </nav>
  );
}

function Crumb({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  /** exactOptionalPropertyTypes: true en este proyecto — igual que en el
   *  breadcrumb original, `| undefined` explícito y no solo `?:`. */
  onClick?: (() => void) | undefined;
}) {
  const clickable = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`tap-target max-w-[10rem] truncate rounded-full px-1.5 py-0.5 transition-colors ${
        active ? "text-primary" : clickable ? "text-muted-foreground hover:text-foreground" : "text-foreground/90"
      } ${clickable ? "cursor-pointer" : "cursor-default"}`}
    >
      {label}
    </button>
  );
}

function Sep() {
  return (
    <span className="text-muted-foreground/60" aria-hidden>
      /
    </span>
  );
}