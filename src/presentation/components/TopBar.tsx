/**
 * TopBar.tsx
 * -----------------------------------------------------------------------
 * La capa superior del mapa: el nombre del tablero y el breadcrumb de
 * ubicación.
 *
 * No lleva botón de búsqueda. No se pidió, y los filtros del mapa viven
 * abajo, con el resto de los controles: un botón sin función sería puro
 * decorado ocupando la esquina más disputada de la pantalla.
 *
 * DOS CORRECCIONES DE CELULAR
 *
 * 1. LA BARRA ARRANCABA DEBAJO DEL BOTÓN DE MENÚ.
 *
 *    El `px-4` la pegaba al borde izquierdo, que es exactamente donde
 *    flota la hamburguesa de SidebarNav mientras no hay riel lateral, o
 *    sea por debajo de `md`. El resultado era una píldora que decía "das
 *    Humanitarias": el botón le tapaba las tres primeras letras.
 *
 *    Ahora el relleno izquierdo deja libre esa esquina en celular y
 *    vuelve a la medida normal en escritorio, donde el riel ya corre el
 *    contenido y la hamburguesa no flota sobre nada.
 *
 * 2. EL TÍTULO NO APARECE EN PANTALLAS ANGOSTAS.
 *
 *    Descontando el botón de menú y los márgenes, en un teléfono de 390
 *    px quedan unos 290 para las dos píldoras, y entre las dos piden más
 *    de 320. Algo tenía que salir.
 *
 *    Sale el título, y no el breadcrumb, porque el título dice siempre lo
 *    mismo: cuesta los mismos píxeles en cada pantalla y no informa nada
 *    que la persona no sepa ya, habiendo llegado hasta acá. El breadcrumb
 *    cambia con la selección, es lo que responde "¿dónde estoy?", y
 *    además se toca para volver al departamento entero.
 *
 *    Un rótulo fijo desplazando a un control es la forma más común de
 *    perder una barra superior en celular.
 * -----------------------------------------------------------------------
 */
import type { ViewState } from "@/presentation/state/viewState";
import { Breadcrumb } from "./Breadcrumb";

interface Props {
  viewState: ViewState;
  seleccionNombre: string | null;
  onGoToAll: () => void;
}

export function TopBar({ viewState, seleccionNombre, onGoToAll }: Props) {
  return (
    /* `pl-[4.75rem]` es el ancho del botón de menú más aire. Se apaga en
       `md`, que es donde SidebarNav pasa a riel y deja de flotar sobre el
       mapa: si el número del riel cambia allá, este también. */
    <div className="pointer-events-none absolute inset-x-0 top-[calc(1rem+env(safe-area-inset-top))] z-10 flex items-center gap-2 pl-[4.75rem] pr-4 md:px-4">
      <div className="pointer-events-auto hidden min-w-0 items-center rounded-full border border-border bg-surface/95 px-3.5 py-1.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur sm:flex">
        <span className="truncate">Ayudas Humanitarias</span>
      </div>
      <Breadcrumb viewState={viewState} seleccionNombre={seleccionNombre} onGoToAll={onGoToAll} />
    </div>
  );
}