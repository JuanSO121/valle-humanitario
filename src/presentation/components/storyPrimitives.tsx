/**
 * storyPrimitives.tsx
 * -----------------------------------------------------------------------
 * Piezas mínimas que repiten todos los niveles del Story: el rótulo, el
 * titular, la banda de color, la barra proporcional y la lista de
 * "categoría · valor". Viven acá para que se vean idénticas en Balance,
 * Territorio, Qué se entregó, Canales y Hallazgos, en vez de que cada
 * sección las reescriba con su propio tamaño y su propio gris.
 *
 * SOBRE LA ACTUALIZACIÓN A LA LÍNEA GRÁFICA
 *
 * `SectionTitle` venía de la etapa anterior del proyecto: `font-serif` y
 * `text-4xl`. Ninguna de las dos existe en el sistema de la campaña, que
 * usa Agenda ExtraCondensed en mayúscula —la clase `.vc-titular` de
 * marca.css— y dimensiona con `clamp` para que el titular ocupe lo mismo
 * en un teléfono que en un monitor. El resultado era que las secciones
 * construidas con estas primitivas parecían de otro sitio.
 *
 * Se agregan además las dos piezas que faltaban para que cualquier
 * sección pueda armarse como las piezas impresas: `Banda`, que es la
 * franja de color a sangre, y `Resaltado`, el recuadro amarillo detrás
 * de una palabra del rótulo. Sin ellas, cada sección resolvía el color
 * de fondo por su cuenta y el sitio perdía la estructura por franjas que
 * es lo que identifica a la campaña.
 *
 * NOTA sobre los tipos: el proyecto compila con
 * `exactOptionalPropertyTypes: true`, así que `color?: string` significa
 * "la propiedad puede faltar", NO "puede valer undefined". Como estos
 * componentes reciben valores reenviados desde arriba (ej.
 * `color={fila.color}`, que es `string | undefined`), los opcionales se
 * declaran `?: T | undefined` a propósito. Sacar el `| undefined` rompe
 * la compilación en MiniList.
 * -----------------------------------------------------------------------
 */
import type { ReactNode } from "react";

/**
 * Los cinco fondos del sistema. Cualquier sección del Story es una
 * sucesión de estos y nada más: en las piezas el color no decora, marca
 * en qué capítulo va el lector.
 */
export type Tono = "cyan" | "azul" | "navy" | "crema" | "hueso" | "blanco";

const FONDO: Record<Tono, string> = {
  cyan: "bg-[#22ABE2]",
  azul: "bg-[#0079C1]",
  navy: "bg-[#123E5C]",
  crema: "bg-[#FBF8C6]",
  hueso: "bg-[#F2FAFD]",
  blanco: "bg-white",
};

/** Tonos sobre los que el texto va claro. Decide el color por defecto. */
const OSCURO: Record<Tono, boolean> = {
  cyan: true,
  azul: true,
  navy: true,
  crema: false,
  hueso: false,
  blanco: false,
};

/* ── Estructura ─────────────────────────────────────────────────────── */

interface BandaProps {
  tono?: Tono;
  children: ReactNode;
  /** Para ajustar el relleno vertical en bandas de rótulo, que son bajas. */
  className?: string;
}

/**
 * La franja de color a sangre.
 *
 * El color toca los dos bordes de la ventana y el ancho del contenido se
 * controla adentro con `max-w-6xl`. Al revés —una caja de color centrada
 * dentro de la sección— la pieza deja de leerse como sistema y parece
 * una tarjeta suelta en medio de la página.
 */
export function Banda({ tono = "hueso", className = "", children }: BandaProps) {
  return (
    <div className={`${FONDO[tono]} px-4 py-12 sm:px-6 sm:py-14 md:px-10 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  );
}

/**
 * El recuadro amarillo detrás de una palabra del rótulo o del titular.
 *
 * `crema` para cuando el fondo ya es amarillo o cuando el recuadro cae
 * sobre una banda cyan, donde el amarillo compite con el fondo.
 */
export function Resaltado({
  children,
  variante = "amarillo",
}: {
  children: ReactNode;
  variante?: "amarillo" | "crema";
}) {
  return (
    <span className={variante === "crema" ? "vc-resaltado-crema" : "vc-resaltado"}>{children}</span>
  );
}

/* ── Texto ──────────────────────────────────────────────────────────── */

interface TextoProps {
  children: ReactNode;
  /** El tono del FONDO sobre el que va el texto, no el del texto. */
  tono?: Tono;
}

/**
 * El rótulo de un bloque.
 *
 * En las piezas no es un eyebrow diminuto sino una línea de peso, en
 * Agenda ExtraCondensed y con una palabra resaltada en amarillo. Usa
 * `.vc-rotulo` y no `.vc-titular` porque este último fuerza mayúscula y
 * los rótulos de la campaña van en caja mixta.
 *
 * El tamaño es mayor de lo que pediría en Poppins: Agenda es extra
 * condensada y a igual cuerpo ocupa cerca de un tercio menos de ancho.
 */
export function SectionLabel({ children, tono = "hueso" }: TextoProps) {
  return (
    <h3
      className={`vc-rotulo text-[clamp(1.5rem,3.6vw,2.5rem)] ${
        OSCURO[tono] ? "text-white" : "text-[#0079C1]"
      }`}
    >
      {children}
    </h3>
  );
}

/**
 * El titular de una sección.
 *
 * Agenda ExtraCondensed en mayúscula, vía `.vc-titular`. El `clamp` lo
 * dimensiona entre 28 y 52 px según el ancho, que es el mismo rango que
 * usan las secciones escritas a mano: así un titular de primitiva y uno
 * de sección se ven iguales.
 */
export function SectionTitle({ children, tono = "hueso" }: TextoProps) {
  return (
    <h2
      className={`vc-titular max-w-4xl text-[clamp(1.75rem,5.5vw,3.25rem)] ${
        OSCURO[tono] ? "text-[#FBF8C6]" : "text-[#0079C1]"
      }`}
    >
      {children}
    </h2>
  );
}

export function SectionIntro({ children, tono = "hueso" }: TextoProps) {
  return (
    <p
      className={`mt-5 max-w-2xl text-lg leading-8 ${
        OSCURO[tono] ? "text-[#DDF0FA]" : "text-[#35708F]"
      }`}
    >
      {children}
    </p>
  );
}

/* ── Datos ──────────────────────────────────────────────────────────── */

interface BarProps {
  /** De 0 a 1. Se recorta a ese rango, así que un ratio > 1 no desborda. */
  ratio: number;
  color?: string | undefined;
}

/** Barra proporcional. */
export function Bar({ ratio, color = "#0079C1" }: BarProps) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div className="h-[6px] overflow-hidden rounded-full bg-[#DDF0FA]">
      <i
        className="block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export interface MiniRow {
  label: string;
  value: number;
  color?: string | undefined;
  /** Sufijo de la cifra, ej. " t" o " und". */
  suffix?: string | undefined;
}

/** Lista "etiqueta, barra, cifra". El máximo se calcula sobre la propia lista. */
export function MiniList({ rows }: { rows: MiniRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 text-base">
          <span className="min-w-0 flex-1 truncate text-[#35708F]">{r.label}</span>
          <span className="w-[30%] shrink-0 sm:w-[38%]">
            <Bar ratio={r.value / max} color={r.color} />
          </span>
          <b className="w-20 shrink-0 text-right tabular-nums text-[#123E5C]">
            {r.value.toLocaleString("es-CO")}
            {r.suffix ?? ""}
          </b>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tarjeta blanca.
 *
 * El canto pasó de `border` a `ring`, que es lo que usan las fichas de
 * Territorio: sobre el crema de la campaña, blanco contra #FBF8C6
 * contrasta 1.1 a 1 y sin filete el borde de la tarjeta se difumina.
 * `ring` además no ocupa espacio de maqueta, así que dos tarjetas
 * vecinas no se descuadran por un píxel.
 */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg bg-white p-6 shadow-sm ring-1 ring-[#123E5C]/10 ${className}`}>
      {children}
    </div>
  );
}

/** Aviso metodológico. Amarillo, porque siempre dice qué NO se puede afirmar. */
export function Aviso({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#FFD400]/40 border-l-[3px] border-l-[#FFD400] bg-[#FFF8E5] p-5 text-base leading-7 text-[#6B5200]">
      {children}
    </div>
  );
}