import { useEffect, useRef, useState } from "react";

interface Props {
  isMobile: boolean;
  title: string;
  subtitle?: string | undefined;
  onBack?: (() => void) | undefined;
  onClose: () => void;
  children: React.ReactNode;
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

function useCloseOnOutsideClick<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if ((target as HTMLElement)?.closest?.("[data-map-root]")) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose]);
  return ref;
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
          className="tap-target mt-0.5 rounded-md p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        {/* FIX: text-foreground explícito — no depender de herencia de body
            para el título, que es el elemento con más peso visual del panel. */}
        <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Volver a Valle del Cauca"
        className="tap-target rounded-md p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground"
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
  const ref = useCloseOnOutsideClick<HTMLDivElement>(onClose);
  return (
    <div
      ref={ref}
      className="pointer-events-auto absolute right-4 top-[4.75rem] z-10 flex w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl transition-all duration-300"
      style={{
        maxHeight: "calc(100% - 6rem)",
        opacity: entered ? 1 : 0,
        // Se agrega un leve scale además del translateX que ya había —
        // el translate solo se lee como "desliza"; el scale de 0.97→1
        // le da la sensación de que el panel "aterriza", no solo entra.
        transform: entered ? "translateX(0) scale(1)" : "translateX(12px) scale(0.97)",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <PanelHeader title={title} subtitle={subtitle} onBack={onBack} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function MobileSheet({ title, subtitle, onBack, onClose, children, transitionKey }: Omit<Props, "isMobile">) {
  const [expanded, setExpanded] = useState(true);
  const entered = useEnterTransition(transitionKey);
  const ref = useCloseOnOutsideClick<HTMLDivElement>(onClose);

  useEffect(() => setExpanded(true), [transitionKey]);

  return (
    <>
      {/* Scrim: antes el sheet no tenía ningún velo detrás — sobre un
          mapa oscuro con puntos brillantes, el borde del panel se perdía
          y "cerrar tocando afuera" no tenía ninguna señal visual de que
          era posible. Fade-in propio, no ligado a `entered` del sheet
          (así el velo no se mueve, solo aparece/desaparece). */}
      <div
        className="pointer-events-none absolute inset-0 z-[9] bg-black/40"
        style={{ animation: "scrim-in 200ms ease-out" }}
        aria-hidden
      />
      <div
        ref={ref}
        className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.35)] transition-all duration-300"
        style={{
          height: expanded ? "70vh" : "auto",
          transform: entered ? "translateY(0)" : "translateY(16px)",
          opacity: entered ? 1 : 0,
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Contraer panel" : "Expandir panel"}
          className="tap-target flex w-full justify-center py-2"
        >
          <span className="h-1 w-9 rounded-full bg-border" />
        </button>
        <PanelHeader title={title} subtitle={subtitle} onBack={onBack} onClose={onClose} />
        <div className={`min-h-0 flex-1 ${expanded ? "overflow-y-auto" : "hidden"}`}>{children}</div>
      </div>
    </>
  );
}