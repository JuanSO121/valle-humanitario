// src/presentation/data/panoramaData.ts

/**
 * Nivel 1, Panorama.
 *
 * DOS FUENTES CONVIVEN EN ESTE ARCHIVO, y no cuadran entre sí a propósito:
 *
 *   · Los donuts se verificaron contra BD_Entregas_Operativa_v2.xlsx.
 *   · El puente NO: sale del censo del Drive, que es un archivo aparte y
 *     no está en el workbook. Ver la nota sobre `puenteSteps`.
 *
 * Si alguien pregunta por qué el hero dice 321 despachos y el puente
 * cierra en 307, la respuesta está en esa nota. No es un error de suma:
 * son dos reglas de conteo distintas sobre dos censos con cortes
 * distintos.
 */

export interface DonutStat {
  id: string;
  value: number;
  total: number;
  label: string;
  color: string;
}

// Radio 52, circunferencia = 2πr ≈ 326.7 (igual que el HTML de referencia)
export const CIRCUMFERENCE = 326.7;

/**
 * Verificados contra el workbook:
 *   · 39/41 → CAT_MUNICIPIOS menos Cali, cruzado con DESPACHO_DESTINO.
 *     Faltan Candelaria y Florida.
 *   · 38/41 → municipios con al menos un requerimiento en pmuData. Los
 *     tres que no radicaron son Florida, Trujillo y Vijes.
 *   · 72/199 → 37 atendidos + 35 parcialmente atendidos.
 *   · 13/15 → días con al menos un despacho entre el 11 y el 25. Antes
 *     decía 14: no hay despacho ni el 23 ni el 25. (La hoja TONELADAS sí
 *     anota 4 t el 25, así que el workbook se contradice ahí; se cuenta
 *     por DESPACHOS, que es la tabla de hechos.)
 */
export const panoramaDonuts: DonutStat[] = [
  { id: "jornadas", value: 13, total: 15, label: "Días con entregas, del 11 al 25", color: "#81C8EC" },
];

export interface PuenteRow {
  id: string;
  label: string;
  delta: number; // positivo, negativo o total (se muestra con signo aparte)
  kind: "base" | "resta" | "suma" | "subtotal" | "total";
  detail?: { label: string; value: number; note: string }[];
}

/**
 * FUENTE: censo del Drive, corte del 25 de agosto de 2026. NO se puede
 * regenerar desde BD_Entregas_Operativa_v2.xlsx, se intentó y no da:
 * la hoja BD_DOCUMENTOS trae 386 documentos, no 414, con Cali en 48 y
 * otras ayudas solidarias en 17, y sin carpetas para _RAIZ ni municipios
 * múltiples. Es un censo anterior o con otro criterio de catalogación.
 *
 * Por eso el total de acá (307) difiere del de movimientoData (321):
 *
 *   · Acá se cuenta UN DOCUMENTO = UN DESPACHO, y los formatos conjuntos
 *     se reparten a mano (+15).
 *   · Allá se cuentan ENLACES despacho→municipio de DESPACHO_DESTINO,
 *     que es la tabla de hechos del workbook.
 *
 * Para unificarlos hace falta el censo del Drive actualizado. Mientras
 * tanto, esta sección se presenta como lo que es: la trazabilidad del
 * archivo, no el conteo operativo.
 */
export const PUENTE_FUENTE = "Censo del Drive · corte 25 de agosto de 2026";

export const puenteSteps: PuenteRow[] = [
  {
    id: "base",
    kind: "base",
    label: "Documentos catalogados en el Drive",
    delta: 414,
  },
  {
    id: "propio-canal",
    kind: "resta",
    label: "Carpetas que van por su propio canal",
    delta: -113,
    detail: [
      { label: "Cali", value: 56, note: "Excluida del consolidado por instrucción expresa" },
      { label: "Centro de distribución Cartago", value: 35, note: "Bodega: es la misma ayuda vista desde el origen" },
      { label: "Otras Ayudas Solidarias", value: 19, note: "Entregas a instituciones, no a un municipio" },
      { label: "Inciva", value: 1, note: "Entrega institucional" },
      { label: "Centro de Protección", value: 1, note: "Entrega institucional" },
      { label: "CHOCO", value: 1, note: "Fuera del Valle: suma como despacho, no como municipio" },
    ],
  },
  {
    id: "formatos-conjuntos",
    kind: "resta",
    label: "Formatos conjuntos, contados por municipio",
    delta: -7,
    detail: [
      { label: "Municipios múltiples", value: 6, note: "Un formato que reparte a varios municipios" },
      { label: "_RAIZ", value: 1, note: "Formato conjunto suelto en la raíz del Drive" },
    ],
  },
  {
    id: "subtotal-1",
    kind: "subtotal",
    label: "Archivos en carpetas de municipio",
    delta: 294,
  },
  {
    id: "reescaneos",
    kind: "resta",
    label: "Reescaneos del mismo despacho",
    delta: -3,
    detail: [
      { label: "Argelia", value: 1, note: "12_08_2026_ARGELIA" },
      { label: "Zarzal", value: 1, note: "12_08_2026_Zarzal" },
      { label: "Yotoco", value: 1, note: "13_08_2026_YOTOCO PDF.pdf" },
    ],
  },
  {
    id: "subtotal-2",
    kind: "subtotal",
    label: "Despachos con documento propio",
    delta: 291,
  },
  {
    id: "reparto-conjuntos",
    kind: "suma",
    label: "Entregas que reparten los 7 formatos conjuntos",
    delta: 15,
  },
  {
    id: "subtotal-3",
    kind: "subtotal",
    label: "Despachos municipales",
    delta: 306,
  },
  {
    id: "choco",
    kind: "suma",
    label: "Despacho fuera del Valle (Chocó)",
    delta: 1,
  },
  {
    id: "total",
    kind: "total",
    label: "DESPACHOS DOCUMENTADOS",
    delta: 307,
  },
];