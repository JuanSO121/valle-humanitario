/**
 * canalesData.ts
 * -----------------------------------------------------------------------
 * Color y glosa de cada ruta que el consolidado municipal deja fuera.
 *
 * ESTE ARCHIVO YA NO TRAE CIFRAS. Las entregas, las unidades y las
 * categorías salen de route=ayuda, que las agrupa por tipo de destino
 * leyendo CAT_DESTINOS. Acá quedan solo dos cosas que no son datos: el
 * color, que es una decisión de diseño, y la glosa, que es redacción.
 *
 * Antes había una entrada por destino, así que Inciva y el Centro de
 * Protección aparecían como rutas propias de una entrega cada una, al
 * lado de Cali con 55. Y cada entidad nueva del Excel obligaba a editar
 * este archivo. Ahora el agrupamiento vive en el backend.
 *
 * El `id` coincide con el que devuelve route=ayuda.
 * -----------------------------------------------------------------------
 */

export interface CanalPresentacion {
  id: string;
  nombre: string;
  glosa: string;
  color: string;
}

export const canalesPresentacion: CanalPresentacion[] = [
  {
    id: "cali",
    nombre: "Cali",
    glosa: "Capital del departamento. Va por su propio canal, fuera del conteo por municipio.",
    color: "#22ABE2",
  },
  {
    id: "multiples",
    nombre: "Municipios múltiples",
    glosa: "Ruta de entrega que atendió a varios municipios.",
    color: "#8375A9",
  },
  {
    id: "cartago",
    nombre: "Centro de distribución Cartago",
    glosa: "Lugares fuera de Cali donde se recibieron y distribuyeron las ayudas.",
    color: "#F7B733",
  },
  {
    id: "otras-ayudas-solidarias",
    nombre: "Otras ayudas humanitarias",
    glosa:
      "Ayudas entregadas a otros grupos de personas afectadas, sin estar asociadas a un municipio específico.",
    color: "#F0801E",
  },
];

/** Color y glosa de un grupo, por su id. */
export function presentacionDe(id: string): CanalPresentacion | undefined {
  return canalesPresentacion.find((c) => c.id === id);
}

/**
 * Municipios que declara cada formato del acopio de Cartago.
 *
 * OJO: suma 38 destinos sobre 35 documentos. No es un error de
 * transcripción, un mismo formato puede nombrar más de un municipio, así
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