// src/presentation/data/panoramaData.ts

export interface DonutStat {
  id: string;
  value: number;
  total: number;
  label: string;
  color: string;
}

// Radio 52, circunferencia = 2πr ≈ 326.7 (igual que el HTML de referencia)
export const CIRCUMFERENCE = 326.7;

export const panoramaDonuts: DonutStat[] = [
  { id: "municipios", value: 39, total: 41, label: "Municipios atendidos", color: "#039A39" },
  { id: "requerimientos-radicados", value: 38, total: 41, label: "Con requerimientos radicados", color: "#7F207F" },
  { id: "requerimientos-accion", value: 72, total: 199, label: "Requerimientos con acción registrada", color: "#F0B102" },
  { id: "jornadas", value: 14, total: 15, label: "Días con despacho, del 11 al 25", color: "#81C8EC" },
];

export interface PuenteRow {
  id: string;
  label: string;
  delta: number; // positivo, negativo o total (se muestra con signo aparte)
  kind: "base" | "resta" | "suma" | "subtotal" | "total";
  detail?: { label: string; value: number; note: string }[];
}

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
      { label: "Centro de acopio Cartago", value: 35, note: "Bodega: es la misma ayuda vista desde el origen" },
      { label: "Casos especiales", value: 19, note: "Entregas a instituciones, no a un municipio" },
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