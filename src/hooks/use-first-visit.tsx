import { useEffect, useState } from "react";

/**
 * Detecta si es la primera vez que este navegador visita la app (según
 * localStorage) y expone una función para marcarla como vista. Es
 * puramente local al navegador — no sincroniza entre dispositivos, y eso
 * está bien para un modal de "cómo leer el mapa" que no necesita más.
 */
export function useFirstVisit(key: string) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(key)) setShow(true);
    } catch {
      // localStorage puede fallar en modo incógnito estricto o con
      // almacenamiento deshabilitado — en ese caso simplemente no
      // mostramos el modal de bienvenida en vez de romper la app.
    }
  }, [key]);

  const dismiss = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      // idem — si no se puede persistir, igual cerramos el modal para
      // esta sesión.
    }
    setShow(false);
  };

  return { show, dismiss };
}