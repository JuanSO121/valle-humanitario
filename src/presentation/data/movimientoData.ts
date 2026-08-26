/**
 * movimientoData.ts — Nivel 2, "¿Cómo se está moviendo?"
 * -----------------------------------------------------------------------
 * REGENERADO desde BD_Entregas_Operativa_v2.xlsx (hojas DESPACHOS +
 * DESPACHO_DESTINO + CAT_DESTINOS + TONELADAS). Reemplaza a la versión
 * anterior, que venía del tablero HTML y hablaba de 307 despachos.
 *
 * Definición de la serie, para que nadie la vuelva a mezclar:
 *
 *   · `despachos` cuenta ENLACES despacho→municipio del tipo
 *     "municipio", EXCLUYENDO Santiago de Cali (fuera del consolidado
 *     por instrucción expresa). Un formato que reparte a varios
 *     municipios suma uno a cada uno. Total: 321 enlaces, de los cuales
 *     320 tienen fecha — hay 1 despacho municipal sin fecha en la
 *     fuente, por eso la serie cierra en 320 y no en 321.
 *
 *   · `toneladas` viene de la hoja TONELADAS, que es DEPARTAMENTAL: mide
 *     todo lo que se movió ese día, incluidos Cali, el acopio de Cartago
 *     y los casos especiales. NO es la tonelada de los despachos
 *     municipales de la misma fila. Por eso el 24 y el 25 muestran
 *     toneladas con pocos o ningún despacho municipal: ese peso salió
 *     por los otros canales. No dividir una columna por la otra.
 *
 *   · El 25 de agosto no tuvo despacho municipal. Se conserva la fila
 *     porque TERRITORY_DAYS lo incluye y porque sí hubo movimiento
 *     departamental.
 *
 * Cobertura: 39 de 41 municipios. Faltan Candelaria y Florida.
 * -----------------------------------------------------------------------
 */

export interface Jornada {
  /** Día de agosto de 2026, en dos dígitos. Llave contra TERRITORY_DAYS. */
  dia: string;
  /** Despachos municipales de la jornada, sin Cali. */
  despachos: number;
  /** Municipios distintos alcanzados ese día. */
  municipiosDelDia: number;
  /** Toneladas DEPARTAMENTALES del día — ver nota de arriba. */
  toneladas: number;
  acumuladoDespachos: number;
  acumuladoToneladas: number;
}

export const TOTAL_DESPACHOS_MUNICIPALES = 321;
export const TOTAL_TONELADAS = 531;
export const MUNICIPIOS_ATENDIDOS = 39;
export const MUNICIPIOS_TOTALES = 41;
export const FECHA_CORTE = "25 de agosto de 2026";

export const jornadas: Jornada[] = [
  { dia: "11", despachos: 5, municipiosDelDia: 5, toneladas: 14, acumuladoDespachos: 5, acumuladoToneladas: 14 },
  { dia: "12", despachos: 52, municipiosDelDia: 32, toneladas: 50, acumuladoDespachos: 57, acumuladoToneladas: 64 },
  { dia: "13", despachos: 39, municipiosDelDia: 24, toneladas: 70, acumuladoDespachos: 96, acumuladoToneladas: 134 },
  { dia: "14", despachos: 21, municipiosDelDia: 14, toneladas: 35, acumuladoDespachos: 117, acumuladoToneladas: 169 },
  { dia: "15", despachos: 24, municipiosDelDia: 18, toneladas: 60, acumuladoDespachos: 141, acumuladoToneladas: 229 },
  { dia: "16", despachos: 16, municipiosDelDia: 10, toneladas: 45, acumuladoDespachos: 157, acumuladoToneladas: 274 },
  { dia: "17", despachos: 58, municipiosDelDia: 26, toneladas: 80, acumuladoDespachos: 215, acumuladoToneladas: 354 },
  { dia: "18", despachos: 33, municipiosDelDia: 17, toneladas: 42, acumuladoDespachos: 248, acumuladoToneladas: 396 },
  { dia: "19", despachos: 19, municipiosDelDia: 15, toneladas: 19, acumuladoDespachos: 267, acumuladoToneladas: 415 },
  { dia: "20", despachos: 14, municipiosDelDia: 13, toneladas: 19, acumuladoDespachos: 281, acumuladoToneladas: 434 },
  { dia: "21", despachos: 18, municipiosDelDia: 16, toneladas: 37, acumuladoDespachos: 299, acumuladoToneladas: 471 },
  { dia: "22", despachos: 19, municipiosDelDia: 13, toneladas: 33, acumuladoDespachos: 318, acumuladoToneladas: 504 },
  { dia: "24", despachos: 2, municipiosDelDia: 2, toneladas: 23, acumuladoDespachos: 320, acumuladoToneladas: 527 },
  { dia: "25", despachos: 0, municipiosDelDia: 0, toneladas: 4, acumuladoDespachos: 320, acumuladoToneladas: 531 },
];

export interface MunicipiosNuevos {
  /** Etiqueta legible; JornadaBars la busca por prefijo "DD ". */
  dia: string;
  cantidad: number;
  nombres: string[];
}

/** Solo las jornadas que sumaron territorio nuevo. Suman 39. */
export const municipiosNuevosPorDia: MunicipiosNuevos[] = [
  {
    dia: "11 de agosto",
    cantidad: 5,
    nombres: ["El Cerrito", "El Águila", "La Unión", "Toro", "Versalles"],
  },
  {
    dia: "12 de agosto",
    cantidad: 28,
    nombres: ["Alcalá", "Andalucía", "Ansermanuevo", "Argelia", "Bolívar", "Buenaventura", "Bugalagrande", "Caicedonia", "Calima", "Dagua", "El Cairo", "El Dovio", "Ginebra", "Jamundí", "La Cumbre", "La Victoria", "Obando", "Palmira", "Restrepo", "Riofrío", "Roldanillo", "San Pedro", "Sevilla", "Ulloa", "Vijes", "Yotoco", "Yumbo", "Zarzal"],
  },
  {
    dia: "13 de agosto",
    cantidad: 3,
    nombres: ["Guacarí", "Guadalajara de Buga", "Trujillo"],
  },
  {
    dia: "17 de agosto",
    cantidad: 2,
    nombres: ["Cartago", "Tuluá"],
  },
  {
    dia: "18 de agosto",
    cantidad: 1,
    nombres: ["Pradera"],
  },
];

export interface MovimientoStat {
  /** Cifra grande de la tarjeta, ya formateada. */
  valor: string;
  label: string;
  /** Glosa. Vive acá y no en el componente: cambia cada vez que se
   *  regenera la serie, y tenerla en el JSX era lo que dejaba las
   *  tarjetas diciendo "el 12 de agosto" con datos del 17. */
  nota: string;
  color: string;
}

/**
 * Las cuatro lecturas de la jornada. Recalculadas sobre el v2:
 *
 *   · pico: 58 despachos el 17. El HTML decía 56 el 12 — el 12 sigue
 *     siendo el día de mayor COBERTURA (32 municipios), pero no el de
 *     mayor volumen. Son dos hechos distintos y ahora van separados.
 *   · promedio: 320 despachos con fecha / 13 jornadas con despacho
 *     municipal = 24,6. No se divide por 14: el 25 de agosto figura en
 *     la serie con 0 despachos y metería un cero en el promedio.
 *   · 48 h: 57 de 321 = 17,8%.
 */
export const movimientoStats: MovimientoStat[] = [
  {
    valor: "58",
    label: "Pico de volumen",
    nota: "El 17 de agosto, hacia 26 municipios.",
    color: "#F0801E",
  },
  {
    valor: "32",
    label: "Pico de cobertura",
    nota: "El 12 de agosto: el día que más territorio alcanzó.",
    color: "#5CC46B",
  },
  {
    valor: "18%",
    label: "Salió en las primeras 48 h",
    nota: "57 despachos entre el 11 y el 12.",
    color: "#F0B102",
  },
  {
    valor: "35",
    label: "Despachos desde Cartago",
    nota: "Segundo origen: 13 municipios del norte.",
    color: "#B57BB5",
  },
];

/** Promedio por jornada, expuesto aparte por si se necesita como número. */
export const PROMEDIO_POR_JORNADA = 24.6;
export const JORNADAS_CON_DESPACHO = 13;