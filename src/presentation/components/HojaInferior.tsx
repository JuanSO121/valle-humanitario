/**
 * HojaInferior.tsx
 * -----------------------------------------------------------------------
 * El panel de celular: una hoja que sube desde abajo y se arrastra.
 *
 * EL PROBLEMA QUE RESUELVE
 *
 * En celular, abrir la ficha de un municipio tapaba la pantalla entera.
 * El mapa desaparecía, y con él todo el contexto: cuál municipio se
 * había tocado, dónde queda, qué hay alrededor. La única salida era
 * cerrar, y para comparar dos municipios había que abrir, memorizar,
 * cerrar y volver a abrir.
 *
 * Un panel a pantalla completa no es una versión móvil de un panel
 * lateral. En escritorio el panel ocupa un tercio y el mapa sigue ahí;
 * la traducción honesta de eso a un teléfono es una hoja que deja ver el
 * mapa por encima, no un reemplazo.
 *
 * LOS TRES ANCLAJES
 *
 * · ASOMADA (32%): el título y una línea de resumen. Suficiente para
 *   saber qué se tocó sin perder el mapa. Es donde abre.
 * · MEDIA (62%): la ficha completa, con el mapa todavía visible arriba.
 * · LLENA (94%): para leer listas largas. Acá sí aparece el velo.
 *
 * Abre en ASOMADA y no en MEDIA a propósito. El gesto de tocar un
 * municipio en un mapa suele ser exploratorio —"¿y este cuánto?"—, no
 * una decisión de ponerse a leer. Que abra bajo respeta eso: quien
 * quiera más, arrastra, y ese gesto es más barato que cerrar.
 *
 * POR QUÉ SOLO SE ARRASTRA DESDE EL ENCABEZADO
 *
 * El cuerpo tiene su propio desplazamiento. Si el arrastre naciera
 * también ahí, cada intento de leer hacia abajo competiría con el de
 * mover la hoja, y el resultado es el gesto ambiguo que hace que estas
 * hojas se sientan rotas. El encabezado, con su agarradera visible, es
 * la zona de arrastre; el cuerpo, la de lectura. Cada gesto en un sitio.
 *
 * EL VELO
 *
 * Solo en LLENA, y con opacidad proporcional a lo que subió. En los
 * otros dos anclajes el mapa TIENE que seguir siendo tocable: es la
 * mitad de para qué existe la hoja. Un velo permanente convertiría esto
 * en el mismo diálogo a pantalla completa de antes, solo que más bajo.
 * -----------------------------------------------------------------------
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

/** Fracción de la pantalla que ocupa la hoja en cada anclaje. */
const ANCLAJES = [0.32, 0.62, 0.94] as const;
const ASOMADA = 0;
const LLENA = ANCLAJES.length - 1;

/**
 * Cuánto hay que arrastrar hacia abajo desde el anclaje más bajo para
 * que la hoja se cierre.
 *
 * 64 px es aproximadamente el recorrido de un pulgar sin mover la mano.
 * Más corto y la hoja se cierra sola al intentar ajustarla; más largo y
 * el gesto de descartar se siente trabado.
 */
const CERRAR_PX = 64;

/** Arrastre mínimo para considerar que hubo gesto y no un toque. */
const UMBRAL_GESTO_PX = 6;

interface Props {
  abierta: boolean;
  onCerrar: () => void;
  /** Va en el encabezado, visible ya en el anclaje más bajo. */
  titulo: string;
  /**
   * Una línea corta bajo el título. Es lo único que se lee sin
   * arrastrar, así que debería responder la pregunta que motivó el
   * toque: cuántas entregas, cuántas toneladas.
   */
  resumen?: ReactNode | undefined;
  children: ReactNode;
  /**
   * Alto visible de la hoja, en píxeles, cada vez que cambia.
   *
   * Lo consume el mapa para desplazar su centro hacia arriba: sin eso,
   * el municipio que se acaba de tocar queda justo detrás de la hoja y
   * la selección amarilla no se ve.
   */
  onAlturaChange?: ((px: number) => void) | undefined;
  /**
   * En qué anclaje abre. 0 es el más bajo, y es lo correcto para una
   * ficha: el gesto de tocar un municipio es exploratorio.
   *
   * Para una hoja que se abre desde un botón —los filtros del mapa— el
   * bajo no sirve: ahí la persona ya declaró que quiere ver el contenido,
   * y dejarla asomada la obliga a un segundo gesto para lo que acaba de
   * pedir.
   */
  anclajeInicial?: number | undefined;
}

export function HojaInferior({
  abierta,
  onCerrar,
  titulo,
  resumen,
  children,
  onAlturaChange,
  anclajeInicial = ASOMADA,
}: Props) {
  const [anclaje, setAnclaje] = useState<number>(anclajeInicial);
  /** Desplazamiento del dedo respecto del anclaje actual. Positivo = hacia abajo. */
  const [arrastre, setArrastre] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [altoPantalla, setAltoPantalla] = useState(0);

  const hojaRef = useRef<HTMLDivElement>(null);
  const cuerpoRef = useRef<HTMLDivElement>(null);
  const inicioRef = useRef(0);

  // `innerHeight` y no `100dvh` en CSS porque las cuentas del arrastre
  // necesitan el número, y mezclar dos fuentes de verdad para el mismo
  // alto termina en una hoja que salta al soltarla.
  useLayoutEffect(() => {
    const medir = () => setAltoPantalla(window.innerHeight);
    medir();
    window.addEventListener("resize", medir);
    // En iOS la barra del navegador aparece y desaparece al desplazarse,
    // y eso cambia el alto sin disparar `resize` en todos los casos.
    window.visualViewport?.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("resize", medir);
      window.visualViewport?.removeEventListener("resize", medir);
    };
  }, []);

  // Cada vez que se abre vuelve al anclaje bajo. Sin esto, quien la dejó
  // en LLENA la siguiente ficha se le abre tapando el mapa, que es
  // justamente lo que se quiso evitar.
  useEffect(() => {
    if (abierta) {
      setAnclaje(anclajeInicial);
      setArrastre(0);
    }
  }, [abierta, anclajeInicial]);

  const altoMaximo = altoPantalla * ANCLAJES[LLENA]!;
  const altoDelAnclaje = altoPantalla * ANCLAJES[anclaje]!;
  // Hacia abajo se puede arrastrar libremente; hacia arriba se frena en
  // el tope, porque una hoja que se despega del borde superior se lee
  // como un fallo de maqueta y no como una elasticidad intencional.
  const altoVisible = Math.min(altoMaximo, Math.max(0, altoDelAnclaje - arrastre));
  const desplazamiento = altoMaximo - altoVisible;

  useEffect(() => {
    onAlturaChange?.(abierta ? altoVisible : 0);
  }, [abierta, altoVisible, onAlturaChange]);

  // Al desmontarse, avisar que ya no ocupa nada. Sin esto el mapa se
  // queda descentrado después de cerrar.
  useEffect(() => () => onAlturaChange?.(0), [onAlturaChange]);

  const alPresionar = (evento: ReactPointerEvent<HTMLDivElement>) => {
    inicioRef.current = evento.clientY;
    setArrastrando(true);
    evento.currentTarget.setPointerCapture(evento.pointerId);
  };

  const alMover = (evento: ReactPointerEvent<HTMLDivElement>) => {
    if (!arrastrando) return;
    setArrastre(evento.clientY - inicioRef.current);
  };

  const alSoltar = (evento: ReactPointerEvent<HTMLDivElement>) => {
    if (!arrastrando) return;
    evento.currentTarget.releasePointerCapture(evento.pointerId);
    setArrastrando(false);

    const recorrido = arrastre;
    setArrastre(0);

    // Un toque sin recorrido alterna entre el anclaje bajo y el medio.
    // Es el atajo que espera cualquiera que haya usado un mapa en el
    // teléfono, y evita obligar a arrastrar para lo más común.
    if (Math.abs(recorrido) < UMBRAL_GESTO_PX) {
      setAnclaje((actual) => (actual === ASOMADA ? 1 : ASOMADA));
      return;
    }

    if (anclaje === ASOMADA && recorrido > CERRAR_PX) {
      onCerrar();
      return;
    }

    // Al anclaje más cercano a donde quedó el dedo. Comparar alturas
    // reales, y no la dirección del gesto, es lo que hace que un
    // arrastre largo salte dos anclajes de una vez en lugar de subir uno
    // solo y quedarse corto.
    const objetivo = altoDelAnclaje - recorrido;
    let cercano = ASOMADA;
    let menorDistancia = Infinity;
    ANCLAJES.forEach((fraccion, i) => {
      const distancia = Math.abs(fraccion * altoPantalla - objetivo);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        cercano = i;
      }
    });
    setAnclaje(cercano);
  };

  const cerrarConTeclado = useCallback(
    (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    },
    [onCerrar],
  );

  useEffect(() => {
    if (!abierta) return;
    document.addEventListener("keydown", cerrarConTeclado);
    return () => document.removeEventListener("keydown", cerrarConTeclado);
  }, [abierta, cerrarConTeclado]);

  // El cuerpo solo se desplaza cuando hay espacio para leer. En el
  // anclaje bajo, dejarlo desplazable haría que el resumen se fuera
  // hacia arriba y quedara un encabezado vacío.
  const cuerpoDesplazable = anclaje > ASOMADA;
  useEffect(() => {
    if (!cuerpoDesplazable) cuerpoRef.current?.scrollTo({ top: 0 });
  }, [cuerpoDesplazable]);

  if (!abierta || altoPantalla === 0) return null;

  const proporcionLlena = ANCLAJES[LLENA]! - ANCLAJES[1]!;
  const velo =
    altoVisible <= altoPantalla * ANCLAJES[1]!
      ? 0
      : Math.min(0.5, ((altoVisible / altoPantalla - ANCLAJES[1]!) / proporcionLlena) * 0.5);

  return (
    <>
      {/* El velo aparece solo cerca del anclaje más alto, y ahí sí cierra
          al tocarlo. Con `pointer-events` apagado mientras es invisible,
          el mapa de abajo sigue recibiendo los toques. */}
      <div
        aria-hidden
        onClick={onCerrar}
        className="absolute inset-0 z-30 bg-[#08202E] md:hidden"
        style={{
          opacity: velo,
          pointerEvents: velo > 0.05 ? "auto" : "none",
          transition: arrastrando ? "none" : "opacity 220ms ease-out",
        }}
      />

      <div
        ref={hojaRef}
        role="dialog"
        aria-label={titulo}
        className="absolute inset-x-0 bottom-0 z-40 flex flex-col rounded-t-[1.5rem] bg-white shadow-[0_-8px_32px_rgba(8,32,46,0.28)] md:hidden"
        style={
          {
            height: altoMaximo,
            transform: `translateY(${desplazamiento}px)`,
            // Sin transición mientras el dedo está abajo: el `transform`
            // tiene que seguir al pulgar cuadro a cuadro. La curva entra
            // solo al soltar, que es cuando hay un salto que suavizar.
            transition: arrastrando ? "none" : "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)",
            paddingBottom: "env(safe-area-inset-bottom)",
          } as CSSProperties
        }
      >
        {/* Zona de arrastre. `touch-action: none` es lo que impide que el
            navegador interprete el gesto como un desplazamiento de la
            página y se lleve el evento a mitad de camino. */}
        <div
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          className="shrink-0 cursor-grab touch-none select-none px-5 pb-3 pt-2.5 active:cursor-grabbing"
        >
          {/* La agarradera. Es lo único que dice "esto se arrastra", así
              que va centrada, con contraste suficiente y con área
              tocable propia por encima de su tamaño visible. */}
          <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[#123E5C]/25" />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold leading-tight text-[#123E5C]">{titulo}</h2>
              {resumen && (
                <div className="mt-1 text-[15px] leading-6 text-[#35708F]">{resumen}</div>
              )}
            </div>

            {/* 44 px de lado, que es el mínimo cómodo para un pulgar.
                Un icono de 20 px sin área alrededor obliga a apuntar, y
                apuntar con el pulgar en el borde inferior de la pantalla
                es justo donde peor se acierta. */}
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-[#6B93AA] transition hover:bg-[#DDF0FA] hover:text-[#0079C1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1]"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        <div
          ref={cuerpoRef}
          className={`min-h-0 flex-1 px-5 pb-6 ${
            cuerpoDesplazable ? "overflow-y-auto overscroll-contain" : "overflow-hidden"
          }`}
        >
          {children}
        </div>
      </div>
    </>
  );
}