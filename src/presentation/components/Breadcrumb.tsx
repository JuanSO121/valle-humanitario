import type { ViewState } from "@/presentation/state/viewState";

interface Props {
  viewState: ViewState;
  municipalityName: string | null;
  siteName: string | null;
  onGoToAll: () => void;
  onGoToMunicipality: () => void;
}

export function Breadcrumb({ viewState, municipalityName, siteName, onGoToAll, onGoToMunicipality }: Props) {
  return (
    <nav
      aria-label="Ubicación actual"
      className="pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur"
    >
      <Crumb label="Valle del Cauca" active={viewState.level === "ALL"} onClick={onGoToAll} />
      {municipalityName && (
        <>
          <Sep />
          <Crumb
            label={municipalityName}
            active={viewState.level === "MUNICIPALITY"}
            onClick={viewState.level === "SITE" ? onGoToMunicipality : undefined}
          />
        </>
      )}
      {siteName && (
        <>
          <Sep />
          <span className="max-w-[10rem] truncate text-foreground/90">{siteName}</span>
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
  /** Explicit `| undefined` (not just `?:`) because this project has
   *  `exactOptionalPropertyTypes: true` — an omitted prop and a prop
   *  explicitly passed as `undefined` are different types under that
   *  flag, and callers here do the latter (conditional ternaries). */
  onClick?: (() => void) | undefined;
}) {
  const clickable = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`max-w-[10rem] truncate rounded-full px-1.5 py-0.5 transition-colors ${
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