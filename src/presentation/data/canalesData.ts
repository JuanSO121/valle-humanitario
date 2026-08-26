/**
 * canalesData.ts — Nivel 6, "Lo que no cabe en el mapa municipal"
 * -----------------------------------------------------------------------
 * Los siete canales que el consolidado municipal deja fuera por regla.
 * Sin ellos la operación se ve más chica de lo que fue: 119 documentos y
 * 62.872 unidades viven acá.
 *
 * FUENTE: BD_Entregas_Operativa_v2.xlsx. `unidades` y `renglones` salen
 * de ENVIOS_CATEGORIA por destino; `despachos` cuenta despacho_id
 * únicos en DESPACHO_DESTINO.
 *
 * Ojo con "Municipios múltiples": ese destino aparece en
 * ENVIOS_CATEGORIA pero no en DESPACHO_DESTINO, así que su conteo de
 * despachos es el del tablero HTML (6) y no se pudo verificar contra el
 * workbook.
 * -----------------------------------------------------------------------
 */

export interface Canal {
  id: string;
  nombre: string;
  glosa: string;
  /** Despachos únicos del canal. */
  despachos: number;
  unidades: number;
  renglones: number;
  color: string;
  /** Top de categorías del canal, de mayor a menor. */
  categorias: Array<[nombre: string, unidades: number, color: string]>;
}

export const canales: Canal[] = [
  {
    id: "cali",
    nombre: "Cali",
    glosa: "Capital del departamento.",
    despachos: 55,
    unidades: 27246,
    renglones: 614,
    color: "#81C8EC",
    categorias: [
      ["Alimentos", 7460, "#5CC46B"],
      ["Protección y seguridad", 7416, "#F0801E"],
      ["Aseo personal", 6360, "#3E9BCB"],
      ["Líquidos e hidratación", 1874, "#00C4B0"],
      ["Descanso y abrigo", 1343, "#B57BB5"],
    ],
  },
  {
    id: "acopio-cartago",
    nombre: "Centro de acopio Cartago",
    glosa: "Bodega del norte que despacha a varios municipios",
    despachos: 35,
    unidades: 17106,
    renglones: 280,
    color: "#F0801E",
    categorias: [
      ["Líquidos e hidratación", 9526, "#00C4B0"],
      ["Alimentos", 3305, "#5CC46B"],
      ["Kits sin desagregar", 3037, "#6E8B9E"],
      ["Mascotas", 419, "#89A32C"],
      ["Ropa y calzado", 396, "#8375A9"],
    ],
  },
  {
    id: "otras-ayudas-solidarias",
    nombre: "Otras Ayudas Solidarias",
    glosa: "Entregas a instituciones y casos puntuales.",
    despachos: 18,
    unidades: 9932,
    renglones: 200,
    color: "#B57BB5",
    categorias: [
      ["Alimentos", 3505, "#5CC46B"],
      ["Líquidos e hidratación", 2090, "#00C4B0"],
      ["Aseo personal", 1860, "#3E9BCB"],
      ["Protección y seguridad", 1233, "#F0801E"],
      ["Sin clasificar", 716, "#4F6B7C"],
    ],
  },
  {
    id: "multiples",
    nombre: "Municipios múltiples",
    glosa: "Un formato que reparte a varios municipios a la vez",
    despachos: 6,
    unidades: 7490,
    renglones: 54,
    color: "#8375A9",
    categorias: [
      ["Aseo personal", 4181, "#3E9BCB"],
      ["Protección y seguridad", 1498, "#F0801E"],
      ["Alimentos", 535, "#5CC46B"],
      ["Kits sin desagregar", 300, "#6E8B9E"],
      ["Mascotas", 238, "#89A32C"],
    ],
  },
  {
    id: "inciva",
    nombre: "Inciva",
    glosa: "Instituto para la Investigación y la Preservación del Patrimonio",
    despachos: 1,
    unidades: 198,
    renglones: 6,
    color: "#B57BB5",
    categorias: [
      ["Alimentos", 100, "#5CC46B"],
      ["Sin clasificar", 52, "#4F6B7C"],
      ["Protección y seguridad", 40, "#F0801E"],
      ["Aseo del hogar", 6, "#2378A8"],
    ],
  },
  {
    id: "centro-proteccion",
    nombre: "Centro de Protección",
    glosa: "Centro de Protección Social",
    despachos: 1,
    unidades: 117,
    renglones: 4,
    color: "#B57BB5",
    categorias: [
      ["Alimentos", 102, "#5CC46B"],
      ["Sin clasificar", 15, "#4F6B7C"],
    ],
  },
  {
    id: "choco",
    nombre: "Chocó · fuera del Valle",
    glosa: "Ayuda enviada fuera del Valle del Cauca",
    despachos: 1,
    unidades: 783,
    renglones: 25,
    color: "#00A494",
    categorias: [
      ["Líquidos e hidratación", 266, "#00C4B0"],
      ["Aseo personal", 205, "#3E9BCB"],
      ["Descanso y abrigo", 199, "#B57BB5"],
      ["Alimentos", 40, "#5CC46B"],
      ["Mascotas", 26, "#89A32C"],
    ],
  },
];

/**
 * Municipios que declara cada formato del acopio de Cartago.
 *
 * OJO: suma 38 destinos sobre 35 documentos. No es un error de
 * transcripción — un mismo formato puede nombrar más de un municipio, así
 * que estas cifras cuentan MENCIONES, no documentos. Por eso no se
 * pueden sumar contra `documentos` del canal.
 */
export const redCartago: Array<[municipio: string, menciones: number]> = [
  ["Cartago", 9],
  ["Argelia", 5],
  ["Ansermanuevo", 4],
  ["Zarzal", 3],
  ["Roldanillo", 3],
  ["Alcalá", 2],
  ["Toro", 2],
  ["La Unión", 2],
  ["La Victoria", 2],
  ["Sevilla", 2],
  ["Versalles", 1],
  ["Obando", 1],
  ["Bolívar", 1],
  ["Ulloa", 1],
];