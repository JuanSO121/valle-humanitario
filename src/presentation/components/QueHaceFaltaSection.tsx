/**
 * QueHaceFaltaSection.tsx
 * -----------------------------------------------------------------------
 * "¿Qué hace falta hoy?": las cuatro categorías del centro de acopio.
 * Al tocar una, se abre un cajón con lo que se necesita, producto por
 * producto y en orden de urgencia.
 *
 * CADA PRODUCTO LLEVA SU ESTADO
 *
 * Agotado, Escaso o Buena cantidad. Son las palabras del papel del
 * acopio —NADA, POCO, BASTANTE— dichas en lenguaje corriente, y su
 * significado se explica en la leyenda.
 *
 * Que aparezca el estado es lo que permite mostrar también lo que está
 * en buena cantidad. Sin etiqueta, una lista solo puede leerse como
 * "esto hace falta" y pedir algo que sobra desperdicia una donación; con
 * ella, ese mismo renglón sirve al revés y dice qué NO hay que llevar.
 *
 * LO QUE NO SE REVISÓ NO SE MUESTRA
 *
 * La hoja trae dos renglones con la existencia sin anotar. No aparecen:
 * sin estado no se pueden ordenar ni etiquetar, y ponerlos con una
 * etiqueta inventada sería peor que omitirlos.
 *
 * Hoy son "Enlatados" y "Granos de todo tipo", los dos en Alimentos, y
 * los dos son necesidades reales que quedan fuera de la página. Se
 * arreglan anotando su existencia en NECESIDADES_ACOPIO: aparecen solas,
 * sin tocar código.
 *
 * ESTA SECCIÓN LE HABLA A UN CIUDADANO, NO A UN OPERADOR
 *
 * Quien lee esto está decidiendo si sale a comprar algo. No aparecen
 * «URGENTE», «nivel 0», «existencias en bodega» ni «inventario».
 *
 * POR QUÉ LAS CUATRO ILUSTRACIONES VAN EN UNA TARJETA
 *
 * Porque no comparten ninguna geometría. Cada PNG tiene su píldora en una
 * esquina distinta, su dibujo desbordando hacia otro lado y proporciones
 * que van de 1,97 a 2,84. Sueltas en la rejilla, con ancho fijo, la más
 * apaisada medía 146 px de alto y la más cuadrada 213: las filas quedaban
 * desparejas por 67 px, ninguna píldora coincidía con la de al lado y el
 * ojo buscaba una cuadrícula que no existía. Eso era la desconexión.
 *
 * La tarjeta lo resuelve con dos cosas: un contenedor idéntico para las
 * cuatro y una caja de imagen de ALTO FIJO con `object-contain`. Lo que
 * cambia entre una y otra pasa a ser el dibujo, no el encuadre.
 *
 * POR QUÉ EL CAJÓN OCUPA LA FILA ENTERA
 *
 * Abrir la lista dentro de la media columna del botón se veía mal: la
 * tarjeta de al lado quedaba flotando con un hueco debajo, la fila
 * siguiente se iba hacia abajo sin explicación, y la lista se partía en
 * cinco o seis renglones.
 *
 * Ahora el cajón abarca las dos columnas y se inserta debajo de la FILA
 * del botón. Lo hacen legible una PUNTA alineada con la tarjeta abierta,
 * la altura ANIMADA con `grid-template-rows` de 0fr a 1fr, y el cajón
 * montado durante el cierre para que también se anime.
 *
 * POR QUÉ LAS ILUSTRACIONES SE EMPAREJAN POR PALABRA CLAVE
 *
 * Antes era un diccionario con el nombre exacto de la sección como
 * llave, y cualquier diferencia dejaba la tarjeta sin dibujo sin ningún
 * aviso: un `undefined` en un diccionario no se queja. Ya pasó tres veces
 * en este proyecto con cruces por texto. Ahora basta con que una palabra
 * clave aparezca en el nombre, y si ninguna calza queda un aviso en
 * consola con el texto exacto que llegó.
 * -----------------------------------------------------------------------
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useNecesidades } from "@/application/hooks/useNecesidades";
import type { ElementoNecesario, SeccionNecesidades } from "@/domain/entities";

/** Colores muestreados del JPG original, para reconstruir el fondo. */
const CYAN_CENTRO = "#40BBE5";
const CYAN_BORDE = "#0E8BB7";

/**
 * Sombras que respetan la silueta del PNG.
 *
 * `drop-shadow` se calcula sobre el canal alfa, a diferencia de
 * `box-shadow`, que dibuja la caja rectangular del elemento. Con
 * ilustraciones recortadas es la diferencia entre una sombra que sigue el
 * contorno y un rectángulo flotando detrás.
 */
const SOMBRA_REPOSO = "drop-shadow(0 6px 10px rgba(0,0,0,0.18))";
const SOMBRA_ACTIVA = "drop-shadow(0 14px 20px rgba(0,0,0,0.32))";

interface Estado {
  etiqueta: string;
  /** Qué significa. Se muestra en la leyenda. */
  glosa: string;
  barra: string;
  fondo: string;
  texto: string;
}

/**
 * Los tres estados, en el orden en que se leen: de lo que falta a lo que
 * sobra.
 *
 * Semáforo de tres pasos, pero con la PALABRA siempre visible además del
 * color. El color solo no alcanza: una de cada doce personas no
 * distingue el rojo del verde, y este es justamente el dato que decide
 * si alguien compra algo o no.
 */
const ESTADOS: Estado[] = [
  {
    etiqueta: "Agotado",
    glosa: "En este momento no hay existencias.",
    barra: "#F26049",
    fondo: "#F26049",
    texto: "#FFFFFF",
  },
  {
    etiqueta: "Escaso",
    glosa: "Se necesita más.",
    barra: "#F7B733",
    fondo: "#FFD400",
    texto: "#123E5C",
  },
  {
    etiqueta: "Buena cantidad",
    glosa: "Hay existencias suficientes por ahora.",
    barra: "#5CC46B",
    fondo: "#5CC46B",
    texto: "#123E5C",
  },
];

/**
 * El estado de un producto según el `nivel` de la hoja.
 *
 * Devuelve `null` cuando no se anotó, y ese elemento no se dibuja. Un
 * `nivel` fuera de la escala conocida cae en "Buena cantidad" y no en
 * "Agotado": si el dato es dudoso, más vale no mandar a nadie a comprar
 * de más.
 */
function estadoDe(nivel: number | null): Estado | null {
  if (nivel === null) return null;
  if (nivel === 0) return ESTADOS[0]!;
  if (nivel === 1) return ESTADOS[1]!;
  return ESTADOS[2]!;
}

interface Ilustracion {
  /**
   * Basta con que UNA de estas aparezca en el nombre de la sección. Van
   * normalizadas: mayúsculas y sin tildes.
   *
   * El orden del array importa: se prueba de arriba abajo y gana la
   * primera. Por eso "OTRO" va al final, que es la más genérica y se
   * comería cualquier nombre que la contenga.
   */
  claves: string[];
  src: string;
  alt: string;
  /**
   * Ancho de esta ilustración dentro de su caja, de 0 a 1. Por omisión 1.
   *
   * Existe para una sola cosa: emparejar el tamaño de las PÍLDORAS, que
   * es lo único que el ojo compara entre las cuatro tarjetas.
   *
   * Normalizar por ancho ya deja tres de las cuatro casi iguales, porque
   * las píldoras ocupan entre el 90% y el 97% del ancho de su lienzo. La
   * de aseo desentona porque está dibujada más alta —240 px contra los
   * ~177 de las demás— y por eso baja al 75%: con ese valor su píldora
   * mide 95,6 px contra 94,9, 101,9 y 95,8 de las otras tres.
   *
   * OJO: el valor pertenece al ARCHIVO, no a la categoría. Si se
   * reemplaza un PNG por otro con distinta composición, hay que volver a
   * mirarlo o la tarjeta vuelve a desentonar. La solución de fondo es
   * pedir los cuatro con la píldora del mismo tamaño; entonces esto se
   * puede borrar.
   */
  escala?: number;
}

/**
 * OJO CON LOS NOMBRES DE ARCHIVO. Los originales vienen como
 * `Otros_pelementos.png` y `alimentos_no_pere.png`. Acá se asumen
 * renombrados a minúsculas y sin tildes en `public/marca/`. En Windows el
 * servidor de desarrollo no distingue mayúsculas y en el Linux del
 * despliegue sí: un nombre mal copiado funciona en tu máquina y da 404 en
 * producción.
 */
const ILUSTRACIONES: Ilustracion[] = [
  {
    claves: ["ALIMENTO", "PERECEDERO", "COMIDA", "MERCADO"],
    src: "/marca/que-hace-falta-alimentos.png",
    alt: "Alimentos no perecederos: arroz, pasta, lentejas, frijoles, harina, azúcar, sal, atún, sardinas, enlatados, aceite.",
    escala: 0.75,
  },
  {
    claves: ["ASEO", "HIGIENE"],
    src: "/marca/que-hace-falta-aseo.png",
    alt: "Aseo personal: papel higiénico, kit de higiene, cepillos y pasta dental, jabón.",
    // Su píldora está dibujada un 35% más alta que la de las otras tres.
    escala: 0.75,
  },
  {
    claves: ["DORMIR", "ABRIGO", "COLCHON", "DESCANSO"],
    src: "/marca/que-hace-falta-dormir.png",
    alt: "Elementos para dormir y abrigo: colchonetas, almohadas, cobijas, sábanas y ropa de abrigo.",
    escala: 0.75,
  },
  {
    claves: ["OTRO"],
    src: "/marca/que-hace-falta-otros.png",
    alt: "Otros elementos necesarios: agua potable, pañales, detergente, cloro, limpiador multiusos, botiquín, bolsas de basura, linterna, pilas y guantes.",
    escala: 0.75,
  },
  
];

/**
 * La caja de la ilustración.
 *
 * `flex-1` y no un alto fijo: la caja crece hasta llenar lo que le deja
 * la tarjeta, y la tarjeta se estira a la altura de su vecina por el
 * `stretch` de la rejilla. Así las dos de una fila terminan del mismo
 * alto sin que haya que declarar ningún número.
 */
const CAJA_ILUSTRACION = "flex w-full flex-1 items-center justify-center";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * La ilustración de una sección, o `undefined` si ninguna calza.
 *
 * El aviso en consola es la parte importante: sin él, una sección
 * renombrada pierde su dibujo en silencio y hay que ir a leer el código
 * para entender por qué apareció una caja de texto.
 */
function ilustracionDe(nombreSeccion: string): Ilustracion | undefined {
  const nombre = normalizar(nombreSeccion);
  const encontrada = ILUSTRACIONES.find((i) => i.claves.some((c) => nombre.includes(c)));

  if (!encontrada && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      `[QueHaceFalta] la sección "${nombreSeccion}" no calza con ninguna ilustración. ` +
        "Agregar una palabra suya a `claves` en ILUSTRACIONES, o revisar la columna " +
        "`seccion` de NECESIDADES_ACOPIO.",
    );
  }

  return encontrada;
}

/**
 * Cuántas tarjetas caben por fila, según el mismo corte que usa la
 * grilla (`sm`, 640 px).
 *
 * Hace falta en JavaScript y no solo en CSS porque el cajón se inserta
 * DESPUÉS de la última tarjeta de su fila, y cuál es esa depende de si
 * hay una o dos columnas.
 */
function useColumnas(): number {
  const [columnas, setColumnas] = useState(1);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    const actualizar = () => setColumnas(mql.matches ? 2 : 1);
    actualizar();
    mql.addEventListener("change", actualizar);
    return () => mql.removeEventListener("change", actualizar);
  }, []);

  return columnas;
}

export function QueHaceFaltaSection() {
  const { data } = useNecesidades();
  const [abierta, setAbierta] = useState<string | null>(null);
  const columnas = useColumnas();

  const secciones = useMemo(() => data?.secciones ?? [], [data]);
  const indiceAbierta = secciones.findIndex((s) => s.nombre === abierta);

  /**
   * Se recorre por FILAS y no por tarjetas para poder meter el cajón
   * justo después de la última de cada fila.
   */
  const filas: SeccionNecesidades[][] = [];
  for (let i = 0; i < secciones.length; i += columnas) {
    filas.push(secciones.slice(i, i + columnas));
  }

  /**
   * Al cerrar, devolver la vista a las cuatro tarjetas.
   *
   * El cajón puede medir varios cientos de píxeles. Al colapsarlo, todo
   * lo que estaba debajo sube de golpe y la persona se queda mirando la
   * sección siguiente sin haber pedido moverse. Recentrar las tarjetas
   * devuelve el punto de partida y deja claro que puede abrir otra.
   *
   * `anterior` distingue un cierre real de la carga inicial, donde
   * `abierta` ya vale null. Cambiar de una categoría a otra tampoco entra
   * acá, porque ahí `abierta` pasa de un nombre a otro, nunca por null.
   */
  const tarjetasRef = useRef<HTMLDivElement>(null);
  const anterior = useRef<string | null>(null);

  useEffect(() => {
    const seCerro = anterior.current !== null && abierta === null;
    anterior.current = abierta;
    if (!seCerro) return;

    const prefiereQuieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(
      () => {
        tarjetasRef.current?.scrollIntoView({
          behavior: prefiereQuieto ? "auto" : "smooth",
          block: "center",
        });
      },
      prefiereQuieto ? 0 : 320,
    );
    return () => window.clearTimeout(id);
  }, [abierta]);

  return (
    <section
      id="que-hace-falta"
      className="vc-seccion px-4 py-12 sm:px-6 sm:py-16 md:px-10"
      style={{
        background: `radial-gradient(ellipse at center, ${CYAN_CENTRO} 0%, ${CYAN_BORDE} 80%)`,
      }}
    >
      <div className="mx-auto max-w-6xl">
        {/* El titular con la caja crema de la campaña. `w-fit` para que la
            caja mida lo que mide el texto y no se estire a toda la banda. */}
        <h2 className="vc-titular mx-auto w-fit bg-[#FBF8C6] px-[0.3em] py-[0.1em] text-center text-[clamp(1.75rem,6vw,3.5rem)] leading-tight text-[#0079C1]">
          ¿Qué hace falta hoy?
        </h2>
        <h3 className="vc-titular mx-auto w-fit px-[1em] py-[0.7em] text-center text-[clamp(1.75rem,2vw,3.5rem)] leading-tight text-[#FBF8C6]">
          Toque una categoría para conocer qué se necesita en el centro de acopio y qué elementos
          están agotados, escasos o disponibles en buena cantidad.
        </h3>

        {/* La leyenda va ANTES de las tarjetas: explica el significado de
            los colores, y al final quedaba después de lo que pretendía
            explicar. */}
        <Leyenda />

        {secciones.length > 0 ? (
          <div ref={tarjetasRef} className="mt-8 space-y-5">
            {filas.map((fila, indiceFila) => {
              const enEstaFila =
                indiceAbierta >= 0 && Math.floor(indiceAbierta / columnas) === indiceFila
                  ? secciones[indiceAbierta]!
                  : null;

              // Posición de la tarjeta abierta dentro de su fila, para
              // apuntar la punta del cajón hacia ella.
              const columnaAbierta = enEstaFila ? indiceAbierta % columnas : 0;

              return (
                <div key={indiceFila}>
                  {/* Sin `items-start`: ahora que cada tarjeta tiene su
                      propia superficie, se las quiere de la misma altura.
                      Estirándose, las dos de una fila comparten borde
                      superior e inferior y por fin hay una cuadrícula que
                      el ojo puede seguir. */}
                  <ul className="grid gap-5 sm:grid-cols-2">
                    {fila.map((s) => (
                      <TarjetaCategoria
                        key={s.nombre}
                        seccion={s}
                        abierta={abierta === s.nombre}
                        onToggle={() => setAbierta(abierta === s.nombre ? null : s.nombre)}
                      />
                    ))}
                  </ul>

                  <CajonDeFila
                    seccion={enEstaFila}
                    columnaAbierta={columnaAbierta}
                    columnas={columnas}
                    onCerrar={() => setAbierta(null)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          // Sin la ruta publicada, las ilustraciones quedan como índice
          // visual pero no abren nada. Mismo encuadre que las de verdad,
          // para que el paso de un estado al otro no cambie la maqueta.
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {ILUSTRACIONES.map((arte) => (
              <li key={arte.src}>
                <div className="flex h-full flex-col rounded-2xl bg-white/10 p-4">
                  <span className={CAJA_ILUSTRACION}>
                    <img
                      src={arte.src}
                      alt={arte.alt}
                      loading="lazy"
                      decoding="async"
                      style={{ filter: SOMBRA_REPOSO, width: `${(arte.escala ?? 1) * 100}%` }}
                      className="h-auto object-contain"
                    />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * El significado de los tres estados.
 *
 * Va sobre una tarjeta blanca y no directamente sobre el cyan: el
 * degradado va de #40BBE5 en el centro a #0E8BB7 en los bordes, y no hay
 * un solo color de texto que pase el 4,5 de contraste en los dos
 * extremos. Sobre blanco, el azul profundo lo pasa de sobra.
 */
function Leyenda() {
  return (
    <div className="rounded-xl bg-white px-5 py-4 sm:px-6 sm:py-5">
      {/* Tres columnas en pantallas anchas, apiladas en celular. La ficha
          usa el mismo color y la misma forma que en la lista, para que la
          leyenda se reconozca sin tener que comparar. */}
      <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
        {ESTADOS.map((e) => (
          <li key={e.etiqueta} className="flex flex-col items-center text-center">
            <span
              className="rounded-full px-2.5 py-0.5 text-[13px] font-extrabold"
              style={{ background: e.fondo, color: e.texto }}
            >
              {e.etiqueta}
            </span>
            <span className="mt-2 text-[15px] leading-6 text-[#35708F]">{e.glosa}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TarjetaCategoria({
  seccion,
  abierta,
  onToggle,
}: {
  seccion: SeccionNecesidades;
  abierta: boolean;
  onToggle: () => void;
}) {
  const arte = useMemo(() => ilustracionDe(seccion.nombre), [seccion.nombre]);

  return (
    <li>
      {/* LA TARJETA, no la ilustración suelta.
          El fondo es blanco translúcido y no blanco pleno: las píldoras
          de los PNG son crema, azul, amarilla y naranja, y una superficie
          opaca competiría con ellas. Al 10% se ve el cyan por debajo y la
          caja apenas se insinúa, que es todo lo que hace falta para que
          las cuatro se lean como un conjunto.

          `aria-expanded` y no `aria-pressed`: esto no es un interruptor,
          es algo que muestra y esconde contenido. El único recuadro es el
          de `focus-visible`, que solo aparece con teclado. */}
      <button
        type="button"
        aria-expanded={abierta}
        onClick={onToggle}
        className={`flex h-full w-full flex-col rounded-2xl px-4 pb-2.5 pt-4 transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FBF8C6] motion-reduce:transform-none ${
          abierta
            ? "-translate-y-1.5 bg-white/25"
            : "bg-white/10 hover:-translate-y-1.5 hover:bg-white/20"
        }`}
      >
        {/* SE IGUALA EL ANCHO, NO EL ALTO.
            Es el cambio que más acerca las cuatro píldoras sin depender
            de ningún ajuste por archivo.

            Los cuatro PNG reparten su lienzo distinto: la píldora ocupa
            casi todo el ancho en las cuatro —entre el 90% y el 97%— pero
            un alto muy variable, del 37,5% en alimentos al 72,5% en
            aseo. Igualando el ALTO de la imagen, la píldora de aseo
            quedaba 93% más grande que la de alimentos. Igualando el
            ANCHO, la diferencia baja a 34%.

            Lo que queda de diferencia ya no es de encuadre: es que en la
            ilustración de aseo la píldora está dibujada más alta. Eso no
            se corrige con CSS, se corrige reexportando. */}
        <span className={CAJA_ILUSTRACION}>
          {arte ? (
            <img
              src={arte.src}
              alt={arte.alt}
              loading="lazy"
              decoding="async"
              style={{
                filter: abierta ? SOMBRA_ACTIVA : SOMBRA_REPOSO,
                width: `${(arte.escala ?? 1) * 100}%`,
              }}
              className="h-auto object-contain"
            />
          ) : (
            // Sección sin ilustración que le calce. Aparece igual, con su
            // nombre, y el aviso de ilustracionDe queda en la consola.
            <span className="rounded-xl bg-[#FBF8C6] px-6 py-4 text-xl font-bold text-[#0079C1]">
              {seccion.nombre}
            </span>
          )}
        </span>

        {/* La flecha vive DENTRO de la tarjeta y separada por un filete.
            Antes flotaba en el cyan, debajo de una imagen cuyo centro
            visual no coincide con el centro de su caja, así que parecía
            un adorno suelto entre dos tarjetas en vez del control de una. */}
        <span className="mt-3 flex w-full justify-center border-t border-white/25 pt-2">
          <ChevronDown
            aria-hidden
            className={`size-6 text-white transition-transform duration-200 motion-reduce:transform-none ${
              abierta ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>
    </li>
  );
}

/**
 * El cajón que se abre debajo de una fila de tarjetas.
 *
 * Recibe `null` cuando ninguna de su fila está abierta, pero NO se
 * desmonta: conserva el contenido de la última que estuvo abierta
 * mientras la altura vuelve a cero. Sin eso, cerrar sería un corte seco.
 */
function CajonDeFila({
  seccion,
  columnaAbierta,
  columnas,
  onCerrar,
}: {
  seccion: SeccionNecesidades | null;
  columnaAbierta: number;
  columnas: number;
  onCerrar: () => void;
}) {
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Lo último que mostró este cajón, para poder animar el cierre.
  const ultima = useRef<SeccionNecesidades | null>(null);
  if (seccion) ultima.current = seccion;
  const contenido = seccion ?? ultima.current;

  const abierto = seccion !== null;

  /**
   * Al abrir, asegurarse de que el cajón quepa en pantalla.
   *
   * El `setTimeout` dura lo mismo que la transición: si se llama antes,
   * el navegador mide el cajón todavía colapsado y desplaza de menos.
   */
  useEffect(() => {
    if (!abierto) return;
    const prefiereQuieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(
      () => {
        panelRef.current?.scrollIntoView({
          behavior: prefiereQuieto ? "auto" : "smooth",
          block: "nearest",
        });
      },
      prefiereQuieto ? 0 : 320,
    );
    return () => window.clearTimeout(id);
  }, [abierto]);

  if (!contenido) return null;

  // La punta se centra sobre la tarjeta abierta: con dos columnas, al 25%
  // o al 75% del ancho; con una, al 50%.
  const puntaIzquierda =
    columnas === 1 ? "50%" : `${(columnaAbierta + 0.5) * (100 / columnas)}%`;

  return (
    /**
     * El truco de `grid-template-rows` de 0fr a 1fr es lo que permite
     * animar una altura que no se conoce de antemano. `max-height` obliga
     * a inventar un número: si queda corto recorta la lista, y si queda
     * largo la animación arranca con un tramo muerto.
     */
    <div
      id={panelId}
      ref={panelRef}
      aria-hidden={!abierto}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        abierto ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
      }`}
    >
      {/* `overflow-hidden` y `min-h-0` son obligatorios: sin ellos el
          contenido desborda su celda y la fila de 0fr no colapsa. */}
      <div className="min-h-0 overflow-hidden">
        <div className="relative rounded-2xl bg-white p-5 pt-6 sm:p-8 sm:pt-9">
          {/* La punta. Es un cuadrado girado 45 grados con el mismo fondo
              del cajón: responde "¿de cuál de las tarjetas es esta
              lista?" sin obligar a leer el título. */}
          <span
            aria-hidden
            className="absolute -top-2 size-4 -translate-x-1/2 rotate-45 rounded-[3px] bg-white"
            style={{ left: puntaIzquierda }}
          />

          {/* Cerrar donde se lo busca. La tarjeta también cierra al
              volver a tocarla, pero eso hay que descubrirlo: la X está
              siempre en el mismo lugar y no se descubre, se ve.

              `tabIndex` −1 cuando el cajón está cerrado: sigue en el DOM
              para poder animar el cierre, y sin esto quedaría un botón
              invisible al que se puede llegar con el tabulador. */}
          <button
            type="button"
            onClick={onCerrar}
            tabIndex={abierto ? 0 : -1}
            aria-label={`Cerrar ${contenido.nombre}`}
            className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-[#6B93AA] transition hover:bg-[#DDF0FA] hover:text-[#0079C1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1] sm:right-5 sm:top-5"
          >
            <X className="size-6" aria-hidden />
          </button>

          <ListaDeNecesidades seccion={contenido} />
        </div>
      </div>
    </div>
  );
}

function ListaDeNecesidades({ seccion }: { seccion: SeccionNecesidades }) {
  /**
   * Solo los que tienen estado. Los que la hoja dejó sin anotar no se
   * pueden ordenar ni etiquetar, y ponerlos con una etiqueta inventada
   * sería peor que omitirlos.
   */
  const elementos = useMemo(
    () =>
      (seccion.elementos ?? [])
        .map((e: ElementoNecesario) => ({ elemento: e, estado: estadoDe(e.nivel) }))
        .filter((x): x is { elemento: ElementoNecesario; estado: Estado } => x.estado !== null),
    [seccion.elementos],
  );

  return (
    <>
      {/* `pr-12` para que el título no se meta debajo de la X. */}
      <h3 className="vc-titular pr-12 text-[clamp(1.375rem,3.4vw,2.25rem)] text-[#0079C1]">
        {seccion.nombre}
      </h3>
      <p className="mt-1 text-base text-[#6B93AA]">De lo que más falta a lo que ya hay.</p>

      {elementos.length === 0 ? (
        <p className="mt-5 text-lg leading-8 text-[#35708F]">
          Por ahora no hay nada anotado en esta categoría.
        </p>
      ) : (
        /* El orden lo pone el backend, de lo agotado a lo cubierto, así
           que la lista se lee de arriba abajo por urgencia sin que haga
           falta agruparla ni numerarla.

           Tres columnas en pantallas anchas: con una sola, catorce
           renglones de alimentos obligan a bajar la vista por una columna
           larguísima y el cajón crece de más. */
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {elementos.map(({ elemento, estado }) => (
            <li
              key={elemento.nombre}
              className="rounded-xl border-l-[6px] bg-[#F2FAFD] px-4 py-3.5"
              style={{ borderLeftColor: estado.barra }}
            >
              <span className="block text-[clamp(1rem,1.6vw,1.1875rem)] font-bold leading-snug text-[#123E5C]">
                {elemento.nombre}
              </span>
              {/* La palabra va SIEMPRE, además del color. Una de cada
                  doce personas no distingue el rojo del verde, y este es
                  justo el dato que decide si alguien compra algo. */}
              <span
                className="mt-2 inline-block rounded-full px-3 py-1 text-sm font-extrabold"
                style={{ background: estado.fondo, color: estado.texto }}
              >
                {estado.etiqueta}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}