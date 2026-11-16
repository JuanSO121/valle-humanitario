/**
 * VolverArriba.tsx
 * -----------------------------------------------------------------------
 * Un botón flotante, solo en el celular, para volver al inicio sin tener
 * que arrastrar el dedo por toda la página (la lista de municipios sola
 * mide dos pantallas y media).
 *
 * Aparece cuando se bajó más de una pantalla y se esconde sobre el mapa,
 * donde el dedo está moviendo el mapa y el botón estorbaría a la línea de
 * tiempo.
 * -----------------------------------------------------------------------
 */
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function VolverArriba({ scrollRootId, mapaId }: { scrollRootId: string; mapaId: string }) {
  const [lejos, setLejos] = useState(false);
  const [enMapa, setEnMapa] = useState(false);

  useEffect(() => {
    const raiz = document.getElementById(scrollRootId);
    if (!raiz) return;
    const alMover = () => setLejos(raiz.scrollTop > window.innerHeight);
    alMover();
    raiz.addEventListener("scroll", alMover, { passive: true });

    const mapa = document.getElementById(mapaId);
    const obs = mapa
      ? new IntersectionObserver(([e]) => setEnMapa(!!e && e.isIntersecting), {
          root: raiz,
          threshold: 0.3,
        })
      : null;
    if (mapa) obs?.observe(mapa);
    return () => {
      raiz.removeEventListener("scroll", alMover);
      obs?.disconnect();
    };
  }, [scrollRootId, mapaId]);

  const visible = lejos && !enMapa;

  return (
    <button
      type="button"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label="Volver al inicio"
      onClick={() => {
        const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document
          .getElementById(scrollRootId)
          ?.scrollTo({ top: 0, behavior: quieto ? "auto" : "smooth" });
      }}
      className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-12 items-center justify-center rounded-full bg-[#0079C1] text-white shadow-lg ring-2 ring-white transition duration-200 active:scale-95 md:hidden motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp className="size-6" aria-hidden />
    </button>
  );
}
