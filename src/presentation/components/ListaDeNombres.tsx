/**
 * ListaDeNombres.tsx
 * -----------------------------------------------------------------------
 * Una lista de nombres separados por coma, donde ningún nombre se parte
 * entre dos líneas.
 *
 * EL PROBLEMA
 *
 * `nombres.join(", ")` produce una sola cadena, y el navegador no tiene
 * cómo distinguir el espacio de "La Victoria" del que separa dos
 * municipios: parte donde le convenga. En el listado de zonas se leía
 *
 *     ... Toro, Ulloa, La
 *     Victoria, Versalles ...
 *
 * y "La" quedaba huérfana al final del renglón. Pasa con La Victoria, La
 * Unión, La Cumbre, El Cerrito, El Águila, El Cairo, El Dovio, San
 * Pedro, Guadalajara de Buga, Santiago de Cali y Calima - El Darién:
 * once de los cuarenta y dos.
 *
 * POR QUÉ EL SEPARADOR VA AFUERA DEL SPAN
 *
 * Es lo que más se equivoca al resolver esto. Si el `, ` va adentro del
 * `whitespace-nowrap`, ese espacio también queda sin poder partirse, y
 * como es el único espacio entre un nombre y el siguiente, la lista
 * entera se vuelve una línea indivisible que desborda a lo ancho.
 *
 * Con el separador afuera, el navegador tiene exactamente una
 * oportunidad de corte entre nombre y nombre, que es lo que se quiere. Y
 * la coma queda pegada al nombre que la precede, porque entre el cierre
 * del span y la coma no hay ningún espacio.
 *
 * POR QUÉ NO SE USAN ESPACIOS DURos
 *
 * La alternativa corta era `nombre.replace(/ /g, "\u00A0")`. Funciona,
 * pero cambia el TEXTO y no solo cómo se pinta: buscar "La Victoria" con
 * Ctrl+F deja de encontrarlo, y al copiar la lista se pegan caracteres
 * invisibles raros. Acá el texto queda intacto y el que no parte es el
 * CSS.
 * -----------------------------------------------------------------------
 */
import { Fragment } from "react";

interface Props {
  nombres: string[];
  /** Qué va después del último nombre. Punto por defecto, "" para nada. */
  cierre?: string;
  className?: string | undefined;
}

export function ListaDeNombres({ nombres, cierre = ".", className }: Props) {
  if (nombres.length === 0) return null;

  return (
    <span className={className}>
      {nombres.map((nombre, i) => (
        <Fragment key={`${i}-${nombre}`}>
          <span className="whitespace-nowrap">{nombre}</span>
          {/* Afuera del span a propósito: es la única oportunidad de
              corte que le queda al navegador. */}
          {i < nombres.length - 1 ? ", " : cierre}
        </Fragment>
      ))}
    </span>
  );
}