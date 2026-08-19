/**
 * Normaliza identificadores que pueden venir en formatos ligeramente
 * distintos entre fuentes de datos (ej. GeoJSON de límites municipales vs.
 * el dataset/Excel de sedes): string vs number, ceros a la izquierda,
 * espacios. Es el único punto de comparación para IDs de municipio en
 * todo el visor — nunca comparar `===` directamente entre esas dos
 * fuentes sin pasar por acá.
 *
 * Idempotente: normId(normId(x)) === normId(x), así que es seguro
 * aplicarlo aunque el valor ya venga normalizado desde otro lado.
 */
export const normId = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .replace(/^0+(?=\d)/, "");