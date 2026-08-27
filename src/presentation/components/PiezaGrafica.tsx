/**
 * PiezaGrafica.tsx
 * -----------------------------------------------------------------------
 * Una pieza de diseño exportada como imagen, en sus versiones de
 * escritorio y de celular.
 *
 * DOS MODOS, SEGÚN QUÉ ES LA PIEZA
 *
 * 1. SLIDE. La pieza ES el contenido: portada, cierres, separadores.
 *    Se renderiza como <img> con object-contain, así que se ve entera y
 *    NUNCA se recorta. Lo que sobra del alto o del ancho se rellena con
 *    el azul de campaña.
 *
 * 2. MARCO. La pieza es el fondo y los datos van encima, como el índice.
 *    Se renderiza como background con `cover`, así que llena la sección
 *    sin dejar franjas y sin reclamar su propia altura. Acá manda el
 *    contenido: la sección crece con los datos y la pieza acompaña.
 *
 * El modo se decide solo, según se pasen o no `children`. Antes usaba
 * <img> en los dos casos, y en el índice eso hacía que la imagen exigiera
 * su proporción completa y empujara los indicadores hacia abajo.
 *
 * POR QUÉ EL MARCO SÍ PUEDE RECORTAR
 *
 * Porque en ese modo la pieza no lleva información: el título y el fondo
 * son decoración, y los datos están en HTML encima. Recortar unos píxeles
 * del borde no pierde nada. En el modo slide, en cambio, recortar se come
 * los logos y los créditos, por eso ahí no se recorta nunca.
 *
 * DOS ARCHIVOS, UNA DESCARGA
 *
 * <picture> deja que el navegador elija según el ancho y baje UNA sola.
 * En el modo marco se logra lo mismo con `image-set()`.
 *
 * EL TEXTO ALTERNATIVO
 *
 * Una pieza con texto adentro es invisible para un lector de pantalla y
 * para un buscador. `alt` debe traer el texto de la pieza, no "portada"
 * ni "imagen". En el modo marco se aplica como `aria-label` sobre la
 * sección, porque un background no es anunciable por sí solo.
 * -----------------------------------------------------------------------
 */
import type React from "react";

/** Azul de campaña. Rellena lo que la pieza no cubre. */
const AZUL_RELLENO = "#0076BC";

interface Props {
  /** Ruta de la versión horizontal. Ej. "/marca/portada-escritorio.jpg" */
  escritorio: string;
  /** Ruta de la versión vertical. Si falta, se usa la de escritorio. */
  movil?: string | undefined;
  /** Texto que aparece en la pieza. */
  alt: string;
  /**
   * Color de relleno. En el modo slide se ve en las franjas; en el modo
   * marco, mientras la imagen carga.
   */
  fondo?: string | undefined;
  /**
   * true en la primera pieza de la página. Le dice al navegador que la
   * baje antes que el resto, porque es lo primero que se ve.
   */
  prioritaria?: boolean | undefined;
  /** Ancho a partir del cual se usa la versión de escritorio. */
  cortePx?: number | undefined;
  /** id de la sección, para el menú lateral. */
  id?: string | undefined;
  /**
   * Contenido que va encima de la pieza. Su presencia activa el modo
   * marco. Sirve para las piezas que traen el título y el fondo pero
   * cuyos datos tienen que seguir vivos: una cifra dentro de la imagen
   * queda vieja el día que cambia el Excel y nadie se entera.
   */
  children?: React.ReactNode;
}

export function PiezaGrafica({
  escritorio,
  movil,
  alt,
  fondo = AZUL_RELLENO,
  prioritaria = false,
  cortePx = 768,
  id,
  children,
}: Props) {
  // ── Modo marco ───────────────────────────────────────────────────────
  if (children) {
    return (
      <section
        id={id}
        role="img"
        aria-label={alt}
        className="vc-pieza-marco relative flex min-h-dvh items-center justify-center px-4 py-16 sm:px-6 md:px-10"
        style={
          {
            backgroundColor: fondo,
            "--pieza-escritorio": `url(${escritorio})`,
            "--pieza-movil": `url(${movil ?? escritorio})`,
            "--pieza-corte": `${cortePx}px`,
          } as React.CSSProperties
        }
      >
        <div className="relative z-10 w-full">{children}</div>
      </section>
    );
  }

  // ── Modo slide ───────────────────────────────────────────────────────
  return (
    <section
      id={id}
      className="relative h-dvh w-full overflow-hidden"
      style={{ backgroundColor: fondo }}
    >
      <picture>
        {movil && <source media={`(max-width: ${cortePx - 1}px)`} srcSet={movil} />}
        <img
          src={escritorio}
          alt={alt}
          loading={prioritaria ? "eager" : "lazy"}
          fetchPriority={prioritaria ? "high" : "auto"}
          decoding="async"
          // object-contain, nunca cover: la pieza se ve entera y el resto
          // del slide queda del color de fondo.
          className="absolute inset-0 h-full w-full object-contain object-center"
        />
      </picture>
    </section>
  );
}