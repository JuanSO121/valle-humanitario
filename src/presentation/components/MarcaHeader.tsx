/**
 * MarcaHeader.tsx
 * -----------------------------------------------------------------------
 * La cinta superior de las piezas: logo institucional a la izquierda y el
 * lockup de campaña a la derecha.
 *
 * Los dos son imágenes porque son marcas registradas, con proporciones y
 * espacios de respeto definidos. Reconstruirlas en HTML las deformaría.
 *
 * SOBRE LAS TRES VERSIONES
 *
 * Cada marca viene en blanco, negro y full color. Elegir mal la versión
 * es el error de aplicación más frecuente, así que acá no se elige a
 * mano: se declara sobre qué fondo va y el componente resuelve cuál usa.
 *
 *   fondo="azul"   sobre azul, cyan o navy   -> versión blanca
 *   fondo="claro"  sobre crema o blanco      -> versión full color
 *   fondo="mono"   impresión o alto contraste -> versión negra
 *
 * Los archivos van en public/marca/. Ver RECURSOS-MARCA.md.
 */

type Fondo = "azul" | "claro" | "mono";

const VERSION: Record<Fondo, { gobernacion: string; campana: string }> = {
  azul: {
    gobernacion: "/marca/gobernacion-blanco.png",
    campana: "/marca/el-valle-blanco.png",
  },
  claro: {
    gobernacion: "/marca/gobernacion-color.png",
    campana: "/marca/el-valle-color.png",
  },
  mono: {
    gobernacion: "/marca/gobernacion-negro.png",
    campana: "/marca/el-valle-negro.png",
  },
};

interface Props {
  /** Sobre qué fondo se aplica. Decide la versión del logo. */
  fondo?: Fondo | undefined;
  /** Cinta compacta para secciones interiores. */
  compacto?: boolean | undefined;
}

export function MarcaHeader({ fondo = "azul", compacto = false }: Props) {
  const archivos = VERSION[fondo];

  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 sm:px-6 md:px-10 ${
        fondo === "azul" ? "vc-cinta" : ""
      } ${compacto ? "py-3" : "py-4 sm:py-6"}`}
    >
      <img
        src={archivos.gobernacion}
        alt="Gobernación del Valle del Cauca, Paraíso de todos"
        className={compacto ? "h-9 w-auto" : "h-10 w-auto sm:h-14"}
      />

      <img
        src={archivos.campana}
        alt="El Valle lo reconstruimos juntos"
        className={compacto ? "h-9 w-auto" : "h-10 w-auto sm:h-16"}
      />
    </div>
  );
}

/**
 * Pie con las dos marcas. El pie va sobre navy, así que usa la versión
 * blanca.
 */
export function MarcaFooter() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-6 border-t border-white/15 pt-8">
      <img
        src={VERSION.azul.campana}
        alt="El Valle lo reconstruimos juntos"
        className="h-12 w-auto"
      />
      <img
        src={VERSION.azul.gobernacion}
        alt="Gobernación del Valle del Cauca, Paraíso de todos"
        className="h-12 w-auto"
      />
    </div>
  );
}