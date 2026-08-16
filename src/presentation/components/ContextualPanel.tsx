import { useEffect, useRef, useState } from "react";

interface Props {
  isMobile: boolean;
  title: string;
  subtitle?: string | undefined;
  onBack?: (() => void) | undefined;
  onClose: () => void;
  children: React.ReactNode;
  /** Changing this remounts the panel, replaying its entrance transition —
   *  pass something like `${level}-${municipalityId}-${siteId}`. */
  transitionKey: string;
}

export function ContextualPanel({ isMobile, title, subtitle, onBack, onClose, children, transitionKey }: Props) {
  return isMobile ? (
    <MobileSheet title={title} subtitle={subtitle} onBack={onBack} onClose={onClose} transitionKey={transitionKey}>
      {children}
    </MobileSheet>
  ) : (
    <DesktopCard title={title} subtitle={subtitle} onBack={onBack} onClose={onClose} transitionKey={transitionKey}>
      {children}
    </DesktopCard>
  );
}

function useEnterTransition(transitionKey: string) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setEntered(false);
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [transitionKey]);
  return entered;
}

function PanelHeader({
  title,
  subtitle,
  onBack,
  onClose,
}: {
  title: string;
  subtitle?: string | undefined;
  onBack?: (() => void) | undefined;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start gap-2 border-b border-border p-3.5">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="mt-0.5 rounded-md p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">{title}</h3>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Volver a Valle del Cauca"
        className="rounded-md p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function DesktopCard({ title, subtitle, onBack, onClose, children, transitionKey }: Omit<Props, "isMobile">) {
  const entered = useEnterTransition(transitionKey);
  return (
    <div
      className="pointer-events-auto absolute right-4 top-[4.75rem] z-10 flex w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl transition-all duration-200 ease-out"
      style={{
        maxHeight: "calc(100% - 6rem)",
        opacity: entered ? 1 : 0,
        transform: entered ? "translateX(0)" : "translateX(12px)",
      }}
    >
      <PanelHeader title={title} subtitle={subtitle} onBack={onBack} onClose={onClose} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function MobileSheet({ title, subtitle, onBack, onClose, children, transitionKey }: Omit<Props, "isMobile">) {
  const [expanded, setExpanded] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);
  const entered = useEnterTransition(transitionKey);

  // Reset to expanded whenever a new selection arrives, so the user sees
  // the content immediately rather than a collapsed handle.
  useEffect(() => setExpanded(true), [transitionKey]);

  return (
    <div
      ref={sheetRef}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out"
      style={{
        height: expanded ? "70vh" : "auto",
        transform: entered ? "translateY(0)" : "translateY(16px)",
        opacity: entered ? 1 : 0,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? "Contraer panel" : "Expandir panel"}
        className="flex w-full justify-center py-2"
      >
        <span className="h-1 w-9 rounded-full bg-border" />
      </button>
      <PanelHeader title={title} subtitle={subtitle} onBack={onBack} onClose={onClose} />
      <div className={`min-h-0 flex-1 ${expanded ? "overflow-y-auto" : "hidden"}`}>{children}</div>
    </div>
  );
}