/**
 * domain/entities.ts
 * -----------------------------------------------------------------------
 * Contrato de la API (Apps Script), ruta por ruta.
 *
 * No son las hojas del Excel: es la forma que devuelve el backend. Si
 * cambia una respuesta, este archivo es el único lugar del dominio que se
 * toca.
 *
 * DOS FUENTES, Y SOLO DOS
 *
 *   · Hoja DESPACHOS (libro de despachos) -> resumen, municipios, otras, categorias
 *   · Hoja CONTRATACION           -> contratacion
 *   · Plantilla QUE_HACE_FALTA    -> faltantes (la llena el equipo del acopio)
 *
 * TONELADAS APROXIMADAS
 *
 * Todo peso es el que anota el Excel oficial, redondeado a tres decimales
 * y siempre aproximado. Nunca se estima multiplicando entregas por un
 * factor. Lo que el Excel no trae (toneladas recibidas, inventario) viene
 * en `null`: la página dice «sin dato», no un valor supuesto.
 * -----------------------------------------------------------------------
 */

/** El backend no pudo leer el libro o la plantilla. La sección no se dibuja. */
export interface NoDisponible {
  disponible: false;
  motivo: string;
  fuente: string;
}

/** Los 42 municipios del Valle, Cali incluida. */
export type Zona = "Norte" | "Centro" | "Sur" | "Pacífico";

/** Los pesos que el propio Excel marca con dudas. Cuentan en los totales. */
export interface CalidadDespachos {
  registros: number;
  /** Observación «POR VERIFICAR» en el Excel. */
  porVerificar: { registros: number; toneladas: number };
  /** Peso anotado sin soporte suficiente. */
  pesoSinSoporte: { registros: number; toneladas: number };
  sinPeso: number;
  /**
   * Toneladas ESTIMADAS del Excel anterior (11 al 24 de agosto), incluidas en el
   * total mientras se completan los pesos reales. 0 cuando ya no queda ninguna.
   * Opcional: un backend anterior no lo trae.
   */
  estimado?: { registros: number; toneladas: number; desde: string | null; hasta: string | null };
  /**
   * Puntos logísticos a donde se envía ayuda para repartirla (centros de
   * acopio, CAP, PMU). Cuentan en el total, pero no son una entrega a la
   * población ni «otras ayudas»: si lo que sale de ellos también está en
   * los despachos a municipios, esas toneladas se cuentan dos veces.
   */
  traslados: {
    registros: number;
    toneladas: number;
    destinos: { nombre: string; motivo: string; registros: number; toneladas: number }[];
  };
  /**
   * Ayuda que atendió a varios municipios a la vez sin decir cuánto recibió
   * cada uno («Trujillo y Sevilla»). No se reparte ni se asigna a uno: va
   * aparte, y cuenta en el total.
   */
  multiples: {
    registros: number;
    toneladas: number;
    destinos: { nombre: string; motivo: string; registros: number; toneladas: number }[];
  };
  /** Filas a las que les falta una regla en DESTINOS. Cuentan en el total. */
  sinClasificar: {
    registros: number;
    toneladas: number;
    destinos: { nombre: string; registros: number; toneladas: number }[];
  };
  /** Filas cuya familia no tiene categoría en FAMILIAS. Cuentan en el total. */
  sinCategoria: {
    registros: number;
    toneladas: number;
    familias: { nombre: string; registros: number; toneladas: number }[];
  };
}

/** route=resumen */
export interface ResumenResponse {
  disponible: true;
  periodo: { desde: string | null; hasta: string | null; diasConDespacho: number };
  /** Fecha de la última pestaña diaria cargada: la fecha de corte del tablero. */
  corte: string | null;
  totales: {
    toneladas: number;
    registros: number;
    municipiosAtendidos: number;
    municipiosTotales: number;
  };
  /** El Excel de despachos no lo trae: null hasta que haya fuente. */
  recibidas: number | null;
  inventario: number | null;
  calidad: CalidadDespachos;
  fuente: "DESPACHOS";
  disclaimer: string;
}
export type ResumenRespuesta = ResumenResponse | NoDisponible;

export interface Municipio {
  id: string;
  codigoDane: string;
  nombre: string;
  zona: Zona;
  latitud: number;
  longitud: number;
  /** false = el Excel no registra despachos a este municipio. */
  atendido: boolean;
  toneladas: number;
  /** De esas toneladas, cuántas son ESTIMADAS (sin peso real todavía). */
  estimado?: number;
  registros: number;
  diasConDespacho: number;
  /** Lo que recibió cada día, en orden: es lo que anima la línea de tiempo del mapa. */
  dias: {
    fecha: string;
    toneladas: number;
    registros: number;
    /** Los dos productos más pesados de ese día. */
    productos: string[];
  }[];
  /** Los cinco productos más pesados de todo el período. */
  productos: { nombre: string; toneladas: number }[];
  /** De mayor a menor. Incluye «Fuera de categoría» cuando aplica. */
  categorias: { nombre: string; toneladas: number }[];
}
/** route=municipios */
export interface MunicipiosResponse {
  disponible: true;
  municipios: Municipio[];
  fuente: "DESPACHOS";
  disclaimer: string;
}
export type MunicipiosRespuesta = MunicipiosResponse | NoDisponible;

/** route=otras: ayudas a fundaciones, otros departamentos y otras entidades. */
export interface OtrasResponse {
  disponible: true;
  toneladas: number;
  registros: number;
  destinos: {
    nombre: string;
    /** "entidad" o "sin municipio" (nombre que el catálogo no reconoce). */
    motivo: string;
    registros: number;
    toneladas: number;
  }[];
  fuente: "DESPACHOS";
  disclaimer: string;
}
export type OtrasRespuesta = OtrasResponse | NoDisponible;

/** route=categorias: las 7 categorías del tablero. */
export interface CategoriasResponse {
  disponible: true;
  categorias: {
    nombre: string;
    registros: number;
    toneladas: number;
    /** Los productos de más peso de la categoría. Opcional: un backend anterior no lo trae. */
    productos?: { nombre: string; toneladas: number }[];
    /** Toneladas de los productos que no entran en la lista. */
    otros?: number;
  }[];
  /** Juguetería, kits escolares y «otros»: cuentan en el total, no en las 7. */
  fueraDeCategoria: {
    toneladas: number;
    registros: number;
    familias: { nombre: string; registros: number; toneladas: number }[];
  };
  fuente: "DESPACHOS";
  disclaimer: string;
}
export type CategoriasRespuesta = CategoriasResponse | NoDisponible;

export type EstadoFaltante = "Agotado" | "Escaso" | "Buena cantidad";

/** route=faltantes: «¿Qué hace falta hoy?», de la plantilla que llena el acopio. */
export interface ElementoFaltante {
  nombre: string;
  estado: EstadoFaltante;
  observacion: string | null;
}
export interface CategoriaFaltantes {
  nombre: string;
  /** Qué grupos de producto abarca la categoría, según la hoja FAMILIAS. Opcional: un backend anterior no lo trae. */
  incluye?: string[];
  elementos: ElementoFaltante[];
  total: number;
  agotados: number;
  escasos: number;
}
export interface FaltantesResponse {
  disponible: true;
  /** Cuándo el backend armó la respuesta. */
  actualizadoEn: string;
  /** Siempre las 7 categorías, aunque estén vacías. */
  categorias: CategoriaFaltantes[];
  totalElementos: number;
  fuente: "QUE_HACE_FALTA";
}
export type FaltantesRespuesta = FaltantesResponse | NoDisponible;

/**
 * route=contratacion, hoja CONTRATACION: contratos de la reconstrucción.
 *
 * Todo lo que el Excel no informó viene en null y NO se rellena: un
 * `valorInicial` null no es cero, y un `enlaceSecop` null no es "sin
 * publicar", solo "no se cargó el enlace".
 */
export interface Contrato {
  /** Estable (CTR0001…). Sirve de clave. */
  id: string;
  dependencia: string | null;
  objeto: string;
  /** Pesos. null = no informado; NUNCA 0 por defecto. */
  valorInicial: number | null;
  contratista: string | null;
  /** URL http(s) completa de la publicación en SECOP, ya validada en el backend. */
  enlaceSecop: string | null;
}
export interface ContratacionResponse {
  /** Cuándo el backend armó la respuesta. NO es la fecha de los contratos. */
  actualizadoEn: string;
  totalContratos: number;
  /** Suma solo de los contratos con valor informado. */
  valorTotalInformado: number;
  /** Contratos que quedaron fuera de esa suma por no traer valor. */
  sinValorInformado: number;
  contratos: Contrato[];
  fuente: "CONTRATACION";
}

/**
 * route=bundle. Todo el tablero en una sola petición.
 *
 * Cada parte es exactamente la respuesta de su ruta individual. Puede
 * venir en null si el backend no pudo armarla; en ese caso el
 * repositorio la pide sola por su ruta.
 */
export interface BundleResponse {
  resumen: ResumenRespuesta | null;
  municipios: MunicipiosRespuesta | null;
  otras: OtrasRespuesta | null;
  categorias: CategoriasRespuesta | null;
  faltantes: FaltantesRespuesta | null;
  contratacion: ContratacionResponse | null;
}

export type ParteBundle = keyof BundleResponse;
