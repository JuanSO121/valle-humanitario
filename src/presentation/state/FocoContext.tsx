/**
 * FocoContext.tsx
 * -----------------------------------------------------------------------
 * Qué está mirando la persona, compartido entre las secciones y el mapa.
 *
 * Las secciones de arriba llevan al mapa, pero hasta ahora solo hacían
 * scroll: se llegaba al mapa sin nada seleccionado y había que buscar a
 * mano el municipio en el que se venía de hacer clic.
 *
 * Este contexto guarda esa intención. Al tocar un municipio se enfoca ese
 * municipio; al tocar una categoría se enfocan todos los que la
 * recibieron. El mapa lee el foco y responde.
 *
 * Vive aparte de OperacionContext a propósito: uno son los datos, que
 * cambian cuando cambia el Excel, y el otro es la navegación, que cambia
 * con cada clic. Mezclarlos haría que todo el árbol se vuelva a dibujar
 * cada vez que alguien toca una ficha.
 * -----------------------------------------------------------------------
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface Foco {
  /** Nombre del municipio enfocado, o null. */
  municipio: string | null;
  /** Nombre de la categoría enfocada, o null. */
  categoria: string | null;
}

interface FocoContextValue extends Foco {
  enfocarMunicipio: (nombre: string) => void;
  enfocarCategoria: (nombre: string | null) => void;
  limpiar: () => void;
}

const FOCO_VACIO: FocoContextValue = {
  municipio: null,
  categoria: null,
  enfocarMunicipio: () => {},
  enfocarCategoria: () => {},
  limpiar: () => {},
};

const FocoContext = createContext<FocoContextValue>(FOCO_VACIO);

/** Lleva la vista al mapa. Se usa siempre junto con enfocar. */
function irAlMapa() {
  document.getElementById("mapa-de-ayudas")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function FocoProvider({ children }: { children: ReactNode }) {
  const [municipio, setMunicipio] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);

  // Municipio y categoría se excluyen: enfocar uno limpia el otro. Ver
  // los dos a la vez daría un mapa con un municipio seleccionado dentro
  // de un filtro que quizá no lo incluye.
  const enfocarMunicipio = useCallback((nombre: string) => {
    setCategoria(null);
    setMunicipio(nombre);
    irAlMapa();
  }, []);

  const enfocarCategoria = useCallback((nombre: string | null) => {
    setMunicipio(null);
    setCategoria(nombre);
    if (nombre) irAlMapa();
  }, []);

  const limpiar = useCallback(() => {
    setMunicipio(null);
    setCategoria(null);
  }, []);

  const value = useMemo<FocoContextValue>(
    () => ({ municipio, categoria, enfocarMunicipio, enfocarCategoria, limpiar }),
    [municipio, categoria, enfocarMunicipio, enfocarCategoria, limpiar],
  );

  return <FocoContext.Provider value={value}>{children}</FocoContext.Provider>;
}

export function useFoco(): FocoContextValue {
  return useContext(FocoContext);
}