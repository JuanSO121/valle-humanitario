/**
 * FocoContext.tsx
 * -----------------------------------------------------------------------
 * El puente entre el relato y el mapa.
 *
 * Varias secciones mandan al mapa: la galería de municipios, el podio, el
 * calendario de evolución, las categorías de ayuda. Todas hacen lo mismo
 * —bajar al mapa y seleccionar algo— pero el viaje era de ida sola: una
 * vez abajo, para volver había que acordarse de en qué sección se estaba
 * y buscarla a mano en una página de ocho secciones.
 *
 * CÓMO SE RESUELVE EL REGRESO
 *
 * Guardando la POSICIÓN DEL SCROLL justo antes de bajar al mapa.
 *
 * La alternativa era que cada llamada declarara de qué sección venía. Se
 * probó y tiene un defecto de fondo: hay que tocar todos los puntos de
 * entrada, y el que se olvide queda sin regreso sin que nadie lo note.
 * Ya pasó: el botón estaba escrito y no aparecía nunca, porque ninguna
 * sección declaraba su origen.
 *
 * Con la posición del scroll el regreso funciona para TODOS los enlaces
 * sin tocar ninguno, incluidos los que se agreguen mañana. Y devuelve al
 * punto exacto donde estaba la persona, no al comienzo de la sección: si
 * venía del municipio número 30 de la galería, vuelve ahí.
 *
 * La etiqueta sigue siendo opcional. Sin ella el botón dice "Volver"; con
 * ella, "Volver a los municipios". Es lo único que gana algo por
 * declararse en el origen, y no declararlo no rompe nada.
 * -----------------------------------------------------------------------
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Id de la sección del mapa en StoryPage. */
const MAPA_ID = "mapa-de-ayudas";

/**
 * El contenedor que hace scroll. Es el <main> de StoryPage, no la
 * ventana: la página entera vive dentro de un `h-dvh overflow-y-auto`,
 * así que `window.scrollY` siempre vale 0 y no sirve para esto.
 */
const SCROLL_ROOT_ID = "ruta-solidaridad-scroll";

interface FocoValue {
  municipio: string | null;
  categoria: string | null;
  /** true si se llegó al mapa por un enlace y hay a dónde volver. */
  puedeVolver: boolean;
  /** Para el botón: "los municipios", "lo que se entregó". null = solo "Volver". */
  etiquetaRegreso: string | null;
  enfocarMunicipio: (nombre: string, etiqueta?: string) => void;
  enfocarCategoria: (nombre: string, etiqueta?: string) => void;
  /** Quita la selección pero deja el regreso disponible. */
  limpiar: () => void;
  /** Devuelve la vista al punto exacto de donde vino y borra el foco. */
  volver: () => void;
}

const FocoContext = createContext<FocoValue | null>(null);

function raizDeScroll(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(SCROLL_ROOT_ID);
}

function prefiereQuieto(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function FocoProvider({ children }: { children: ReactNode }) {
  const [municipio, setMunicipio] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [etiquetaRegreso, setEtiquetaRegreso] = useState<string | null>(null);

  /**
   * `useState` y no `useRef` para el booleano: el botón del mapa tiene
   * que volver a dibujarse cuando aparece o desaparece el regreso, y una
   * ref no dispara render.
   *
   * La posición sí va en ref: cambia junto con el booleano y nadie la
   * lee para pintar, así que guardarla en estado provocaría un render de
   * más en cada viaje.
   */
  const [puedeVolver, setPuedeVolver] = useState(false);
  const posicionPrevia = useRef(0);

  /**
   * Anota dónde estaba la persona y baja al mapa.
   *
   * El orden importa: primero se lee `scrollTop`, después se desplaza. Al
   * revés se guardaría la posición del mapa y el botón devolvería al
   * mismo lugar donde ya está.
   */
  const irAlMapa = useCallback((etiqueta?: string) => {
    const raiz = raizDeScroll();
    if (raiz) {
      posicionPrevia.current = raiz.scrollTop;
      setPuedeVolver(true);
    }

    setEtiquetaRegreso(etiqueta ?? null);

    const destino = document.getElementById(MAPA_ID);
    if (!destino) {
      if (import.meta.env.DEV) {
        console.warn(
          `[FocoContext] no existe la sección "${MAPA_ID}". El foco se aplica igual, ` +
            "pero la vista no se desplaza.",
        );
      }
      return;
    }

    destino.scrollIntoView({
      behavior: prefiereQuieto() ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const enfocarMunicipio = useCallback(
    (nombre: string, etiqueta?: string) => {
      // Municipio y categoría son dos lecturas distintas del mapa y no se
      // combinan: enfocar una limpia la otra.
      setMunicipio(nombre);
      setCategoria(null);
      irAlMapa(etiqueta);
    },
    [irAlMapa],
  );

  const enfocarCategoria = useCallback(
    (nombre: string, etiqueta?: string) => {
      setCategoria(nombre);
      setMunicipio(null);
      irAlMapa(etiqueta);
    },
    [irAlMapa],
  );

  /**
   * Solo quita el resaltado. El regreso sobrevive a propósito: la persona
   * sigue en el mapa habiendo llegado desde algún lado, y el botón tiene
   * que seguir ahí. Es lo que hace el "Ver todos" de la píldora amarilla.
   */
  const limpiar = useCallback(() => {
    setMunicipio(null);
    setCategoria(null);
  }, []);

  const volver = useCallback(() => {
    const raiz = raizDeScroll();
    if (raiz) {
      raiz.scrollTo({
        top: posicionPrevia.current,
        behavior: prefiereQuieto() ? "auto" : "smooth",
      });
    }

    setMunicipio(null);
    setCategoria(null);
    setEtiquetaRegreso(null);
    setPuedeVolver(false);
  }, []);

  const value = useMemo<FocoValue>(
    () => ({
      municipio,
      categoria,
      puedeVolver,
      etiquetaRegreso,
      enfocarMunicipio,
      enfocarCategoria,
      limpiar,
      volver,
    }),
    [
      municipio,
      categoria,
      puedeVolver,
      etiquetaRegreso,
      enfocarMunicipio,
      enfocarCategoria,
      limpiar,
      volver,
    ],
  );

  return <FocoContext.Provider value={value}>{children}</FocoContext.Provider>;
}

export function useFoco(): FocoValue {
  const valor = useContext(FocoContext);
  if (valor === null) {
    throw new Error("useFoco se usó fuera de <FocoProvider>. Envolvé la página con el proveedor.");
  }
  return valor;
}