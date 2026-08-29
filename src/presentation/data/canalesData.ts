/**
 * canalesData.ts
 * -----------------------------------------------------------------------
 * Color y glosa de cada ruta que el consolidado municipal deja fuera.
 *
 * ESTE ARCHIVO NO TRAE CIFRAS. Las entregas, las unidades y las
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
    id: "cartago",
    // Coincide con el nombre que ahora tiene D044 en CAT_DESTINOS. Si
    // alguien lo vuelve a renombrar en el Excel, el backend manda: esto
    // es solo el respaldo para cuando route=ayuda no responde.
    nombre: "Centro de distribución Cartago",
    // La glosa anterior decía "Lugares fuera de Cali donde se recibieron
    // y distribuyeron las ayudas": plural, y sin decir qué es. Es un solo
    // lugar, y lo que lo distingue es que sus entregas SÍ están en el
    // conteo por municipio, porque salieron de acá hacia el norte.
    glosa:
      "Segunda bodega. Lo que salió de acá ya está contado en los municipios del norte que lo recibieron.",
    color: "#F7B733",
  },
  {
    id: "multiples",
    nombre: "Municipios múltiples",
    // Sin enlaces propios en DESPACHO_DESTINO: la ruta quedó registrada
    // de forma agregada, así que tiene unidades y no tiene entregas. La
    // glosa lo dice para que la ausencia no se lea como dato perdido.
    glosa: "Formatos que repartieron a varios municipios sin desagregar cuál recibió qué.",
    color: "#8375A9",
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
 * @deprecated NO USAR. Cifras transcritas a mano en su momento, sin
 * relación con el Excel actual.
 *
 * La red de Cartago la sirve `route=flujos` agrupada por origen, que es
 * lo que consume CanalesSection a través de `op.entregasPorOrigen`. Esta
 * lista quedó de la versión anterior y ya nadie debería importarla.
 *
 * Antes de borrarla:
 *     grep -rn "redCartago" src/
 *
 * Si no aparece en ningún lado, eliminar el bloque completo. Es la última
 * cifra escrita a mano que queda en la sección, y mientras exista alguien
 * va a terminar leyéndola como si fuera el dato de hoy.
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