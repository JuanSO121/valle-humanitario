import { useEffect, type RefObject } from "react";

/**
 * Cuando algo se despliega (el detalle de un municipio, la lista de una
 * categoría), lo lleva a la vista con un desplazamiento suave: centrado si
 * cabe en la pantalla, y si es más alto que ella, con su borde superior
 * justo debajo del botón del menú.
 *
 * Se espera un instante antes de medir: el elemento acaba de insertarse y
 * su altura final (con la animación de entrada) todavía no es la real.
 * Con «reducir movimiento» activado, el salto es directo.
 */
export function useCentrarAlAbrir(ref: RefObject<HTMLElement | null>, clave: string | number) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const cabe = el.getBoundingClientRect().height <= window.innerHeight * 0.85;
      el.scrollIntoView({ block: cabe ? "center" : "start", behavior: quieto ? "auto" : "smooth" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [ref, clave]);
}
