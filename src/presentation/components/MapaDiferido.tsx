/**
 * MapaDiferido.tsx
 * -----------------------------------------------------------------------
 * Monta el mapa recién cuando la persona se acerca a la sección
 * del mapa.
 *
 * POR QUÉ
 *
 * Sin esto, MapLibre GL —de las librerías más pesadas de todo el sitio—
 * viajaría en el JavaScript inicial. El mapa es la ÚLTIMA sección del
 * relato: la portada, el balance y "¿Qué hace falta hoy?" esperaban a
 * que el teléfono descargara y compilara un mapa que todavía no se ve.
 *
 * DOS PASOS
 *
 *   1. En un momento ocioso, después de la primera pintura, se descarga
 *      el código del mapa. No se ejecuta, solo queda listo.
 *   2. Cuando la sección está a ~800 px de entrar en pantalla, se monta.
 *      Para entonces el código casi siempre ya llegó, así que no se ve
 *      espera.
 *
 * El observador usa como raíz el contenedor con scroll del relato, no la
 * ventana: en esta página la ventana no se desplaza, se desplaza el
 * <main>. Con la ventana como raíz, la sección nunca "entraría".
 *
 * No hay desajuste de hidratación: el servidor y el primer render del
 * cliente dibujan los dos el marcador de carga.
 * -----------------------------------------------------------------------
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";

const cargarMapa = () => import("@/presentation/components/MapaToneladas");

const Mapa = lazy(() => cargarMapa().then((modulo) => ({ default: modulo.MapaToneladas })));

/** Cuánto antes de llegar se monta. Un poco más de una pantalla. */
const MARGEN_ANTICIPADO = "800px 0px";

type VentanaConOcio = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

function CargandoMapa() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
      Cargando mapa…
    </div>
  );
}

export function MapaDiferido({ scrollRootId }: { scrollRootId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [montar, setMontar] = useState(false);

  // Paso 1: bajar el código cuando el navegador esté libre.
  useEffect(() => {
    const ventana = window as VentanaConOcio;
    const precargar = () => {
      void cargarMapa();
    };

    if (ventana.requestIdleCallback) {
      const id = ventana.requestIdleCallback(precargar, { timeout: 4000 });
      return () => ventana.cancelIdleCallback?.(id);
    }
    const temporizador = window.setTimeout(precargar, 2500);
    return () => window.clearTimeout(temporizador);
  }, []);

  // Paso 2: montar al acercarse.
  useEffect(() => {
    if (montar) return;
    const elemento = ref.current;
    if (!elemento) return;

    if (typeof IntersectionObserver === "undefined") {
      setMontar(true);
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setMontar(true);
          observador.disconnect();
        }
      },
      { root: document.getElementById(scrollRootId), rootMargin: MARGEN_ANTICIPADO },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [montar, scrollRootId]);

  return (
    <div ref={ref} className="relative h-full w-full">
      {montar ? (
        <Suspense fallback={<CargandoMapa />}>
          <Mapa />
        </Suspense>
      ) : (
        <CargandoMapa />
      )}
    </div>
  );
}
