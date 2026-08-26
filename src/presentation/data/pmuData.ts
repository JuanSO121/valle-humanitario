/**
 * pmuData.ts — Nivel 7, "¿Qué más están pidiendo los municipios?"
 * -----------------------------------------------------------------------
 * 199 requerimientos radicados ante el Puesto de Mando Unificado, con
 * corte al 21 de agosto de 2026 — cuatro jornadas ANTES del corte de
 * despachos. Ese desfase es la advertencia principal del nivel: un
 * "NO ATENDIDO" puede haberse resuelto después del corte.
 *
 * "Abiertos" en las tablas = estado NO ATENDIDO. No incluye SIN ESTADO,
 * que significa que la casilla de seguimiento quedó vacía, no que se
 * haya negado.
 *
 * Se transcriben AGREGADOS, no los 199 renglones crudos: el texto libre
 * de cada requerimiento no se portó porque no hay una vista que lo
 * consuma todavía (el panel del municipio en el HTML mostraba los 4
 * primeros). Si se necesita, sale de la misma matriz.
 *
 * La llave es el código DANE, no el nombre — mismo criterio que
 * territoryData, para poder unir sin pelear con tildes ni con
 * "Buga" vs "Guadalajara de Buga".
 * -----------------------------------------------------------------------
 */

export type EstadoRequerimiento =
  | "ATENDIDO"
  | "PARCIALMENTE ATENDIDO"
  | "NO ATENDIDO"
  | "EXCEDE CAPACIDAD ACTUAL"
  | "SIN ESTADO";

export const PMU_FECHA_CORTE = "21 de agosto de 2026";
export const PMU_TOTAL_REQUERIMIENTOS = 199;

export const estadosRequerimientos: Array<{
  estado: EstadoRequerimiento;
  cantidad: number;
  color: string;
  /** Clase de texto para el chip; el fondo se deriva del color con opacidad. */
  texto: string;
}> = [
  { estado: "ATENDIDO", cantidad: 37, color: "#039A39", texto: "#0B6B2B" },
  { estado: "PARCIALMENTE ATENDIDO", cantidad: 35, color: "#F0B102", texto: "#8A6500" },
  { estado: "NO ATENDIDO", cantidad: 95, color: "#DC3514", texto: "#A3260E" },
  { estado: "EXCEDE CAPACIDAD ACTUAL", cantidad: 2, color: "#7F207F", texto: "#5E175E" },
  { estado: "SIN ESTADO", cantidad: 30, color: "#9AA7AE", texto: "#5E7789" },
];

/**
 * Por sector. La lectura del nivel está acá: solo 52 de 199 son ayuda
 * humanitaria. El resto son obras, y no se cierran despachando mercados.
 */
export const sectoresRequerimientos: Array<[sector: string, cantidad: number]> = [
  ["Infraestructura", 75],
  ["Ayuda humanitaria", 52],
  ["Vivienda", 22],
  ["Servicios públicos", 12],
  ["Salud", 8],
  ["Agua y saneamiento", 8],
  ["Edificaciones públicas", 4],
  ["Otros", 4],
  ["Poblaciones", 3],
];

export interface ResumenPmuMunicipio {
  codigoDane: string;
  municipio: string;
  total: number;
  atendido: number;
  parcial: number;
  /** Estado NO ATENDIDO al corte del 21 de agosto. */
  abiertos: number;
  excede: number;
  sinEstado: number;
}

/** Los 41 municipios del catálogo. Cali no radica por esta vía. */
export const pmuPorMunicipio: ResumenPmuMunicipio[] = [
  { codigoDane: "76020", municipio: "Alcalá", total: 1, atendido: 1, parcial: 0, abiertos: 0, excede: 0, sinEstado: 0 },
  { codigoDane: "76036", municipio: "Andalucía", total: 7, atendido: 2, parcial: 2, abiertos: 3, excede: 0, sinEstado: 0 },
  { codigoDane: "76041", municipio: "Ansermanuevo", total: 8, atendido: 4, parcial: 2, abiertos: 2, excede: 0, sinEstado: 0 },
  { codigoDane: "76054", municipio: "Argelia", total: 5, atendido: 3, parcial: 0, abiertos: 2, excede: 0, sinEstado: 0 },
  { codigoDane: "76100", municipio: "Bolívar", total: 5, atendido: 2, parcial: 2, abiertos: 1, excede: 0, sinEstado: 0 },
  { codigoDane: "76109", municipio: "Buenaventura", total: 3, atendido: 3, parcial: 0, abiertos: 0, excede: 0, sinEstado: 0 },
  { codigoDane: "76111", municipio: "Guadalajara de Buga", total: 10, atendido: 0, parcial: 0, abiertos: 9, excede: 0, sinEstado: 1 },
  { codigoDane: "76113", municipio: "Bugalagrande", total: 1, atendido: 0, parcial: 1, abiertos: 0, excede: 0, sinEstado: 0 },
  { codigoDane: "76122", municipio: "Caicedonia", total: 1, atendido: 1, parcial: 0, abiertos: 0, excede: 0, sinEstado: 0 },
  { codigoDane: "76126", municipio: "Calima", total: 5, atendido: 3, parcial: 1, abiertos: 1, excede: 0, sinEstado: 0 },
  { codigoDane: "76130", municipio: "Candelaria", total: 6, atendido: 0, parcial: 0, abiertos: 4, excede: 0, sinEstado: 2 },
  { codigoDane: "76147", municipio: "Cartago", total: 4, atendido: 1, parcial: 0, abiertos: 3, excede: 0, sinEstado: 0 },
  { codigoDane: "76233", municipio: "Dagua", total: 15, atendido: 3, parcial: 1, abiertos: 8, excede: 0, sinEstado: 3 },
  { codigoDane: "76243", municipio: "El Águila", total: 9, atendido: 0, parcial: 4, abiertos: 1, excede: 0, sinEstado: 4 },
  { codigoDane: "76246", municipio: "El Cairo", total: 1, atendido: 1, parcial: 0, abiertos: 0, excede: 0, sinEstado: 0 },
  { codigoDane: "76248", municipio: "El Cerrito", total: 10, atendido: 0, parcial: 1, abiertos: 3, excede: 0, sinEstado: 6 },
  { codigoDane: "76250", municipio: "El Dovio", total: 1, atendido: 0, parcial: 0, abiertos: 1, excede: 0, sinEstado: 0 },
  { codigoDane: "76275", municipio: "Florida", total: 0, atendido: 0, parcial: 0, abiertos: 0, excede: 0, sinEstado: 0 },
  { codigoDane: "76306", municipio: "Ginebra", total: 4, atendido: 0, parcial: 0, abiertos: 3, excede: 0, sinEstado: 1 },
  { codigoDane: "76318", municipio: "Guacarí", total: 1, atendido: 0, parcial: 0, abiertos: 1, excede: 0, sinEstado: 0 },
  { codigoDane: "76364", municipio: "Jamundí", total: 5, atendido: 0, parcial: 1, abiertos: 4, excede: 0, sinEstado: 0 },
  { codigoDane: "76377", municipio: "La Cumbre", total: 11, atendido: 1, parcial: 2, abiertos: 8, excede: 0, sinEstado: 0 },
  { codigoDane: "76400", municipio: "La Unión", total: 3, atendido: 0, parcial: 2, abiertos: 1, excede: 0, sinEstado: 0 },
  { codigoDane: "76403", municipio: "La Victoria", total: 14, atendido: 0, parcial: 2, abiertos: 9, excede: 0, sinEstado: 3 },
  { codigoDane: "76497", municipio: "Obando", total: 6, atendido: 1, parcial: 1, abiertos: 1, excede: 0, sinEstado: 3 },
  { codigoDane: "76520", municipio: "Palmira", total: 2, atendido: 0, parcial: 0, abiertos: 2, excede: 0, sinEstado: 0 },
  { codigoDane: "76563", municipio: "Pradera", total: 5, atendido: 0, parcial: 2, abiertos: 1, excede: 0, sinEstado: 2 },
  { codigoDane: "76606", municipio: "Restrepo", total: 8, atendido: 0, parcial: 3, abiertos: 4, excede: 0, sinEstado: 1 },
  { codigoDane: "76616", municipio: "Riofrío", total: 5, atendido: 2, parcial: 1, abiertos: 2, excede: 0, sinEstado: 0 },
  { codigoDane: "76622", municipio: "Roldanillo", total: 4, atendido: 0, parcial: 1, abiertos: 1, excede: 2, sinEstado: 0 },
  { codigoDane: "76670", municipio: "San Pedro", total: 2, atendido: 0, parcial: 0, abiertos: 2, excede: 0, sinEstado: 0 },
  { codigoDane: "76736", municipio: "Sevilla", total: 3, atendido: 1, parcial: 0, abiertos: 2, excede: 0, sinEstado: 0 },
  { codigoDane: "76823", municipio: "Toro", total: 4, atendido: 0, parcial: 1, abiertos: 3, excede: 0, sinEstado: 0 },
  { codigoDane: "76828", municipio: "Trujillo", total: 0, atendido: 0, parcial: 0, abiertos: 0, excede: 0, sinEstado: 0 },
  { codigoDane: "76834", municipio: "Tuluá", total: 1, atendido: 0, parcial: 1, abiertos: 0, excede: 0, sinEstado: 0 },
  { codigoDane: "76845", municipio: "Ulloa", total: 5, atendido: 1, parcial: 0, abiertos: 4, excede: 0, sinEstado: 0 },
  { codigoDane: "76863", municipio: "Versalles", total: 8, atendido: 0, parcial: 3, abiertos: 2, excede: 0, sinEstado: 3 },
  { codigoDane: "76869", municipio: "Vijes", total: 0, atendido: 0, parcial: 0, abiertos: 0, excede: 0, sinEstado: 0 },
  { codigoDane: "76890", municipio: "Yotoco", total: 4, atendido: 1, parcial: 0, abiertos: 3, excede: 0, sinEstado: 0 },
  { codigoDane: "76892", municipio: "Yumbo", total: 1, atendido: 0, parcial: 0, abiertos: 1, excede: 0, sinEstado: 0 },
  { codigoDane: "76895", municipio: "Zarzal", total: 4, atendido: 2, parcial: 0, abiertos: 2, excede: 0, sinEstado: 0 },
];

export const pmuPorCodigo = new Map(pmuPorMunicipio.map((r) => [r.codigoDane, r]));

/**
 * Criterio de "fila que pide una mirada", igual que el resaltado del
 * tablero: 8 o más requerimientos abiertos, o municipio sin un solo
 * despacho documentado.
 */
export const UMBRAL_ALERTA_ABIERTOS = 8;