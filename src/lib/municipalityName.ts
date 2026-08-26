/**
 * municipalityName.ts
 * -----------------------------------------------------------------------
 * Normalización de NOMBRES de municipio para comparar texto contra texto.
 *
 * Existe porque `normId` (@/lib/id) NO sirve para esto: solo recorta
 * ceros a la izquierda de IDs numéricos, no hace case-fold ni saca
 * tildes. Usarlo para comparar "Riofrío" contra "RIOFRIO" da falso
 * negativo — ese era el bug que impedía que el polígono del municipio
 * quedara resaltado al seleccionar su destino en el mapa.
 *
 * Para unir contra el GeoJSON de límites municipales seguí usando el
 * código DANE (getTerritoryStatByCode). Esto es solo el fallback para
 * cuando del otro lado no hay código (ej. DestinoResumenLista, que trae
 * id/nombre/lat/lon/tipo y nada más).
 * -----------------------------------------------------------------------
 */

/** Alias entre el nombre oficial DANE y el de uso corriente, en ambos sentidos. */
const NAME_ALIASES: Array<[string, string]> = [
  ["Guadalajara de Buga", "Buga"],
  ["Santiago de Cali", "Cali"],
];

export function normMunicipalityName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

const ALIAS_MAP = new Map<string, string>();
for (const [a, b] of NAME_ALIASES) {
  ALIAS_MAP.set(normMunicipalityName(a), normMunicipalityName(b));
  ALIAS_MAP.set(normMunicipalityName(b), normMunicipalityName(a));
}

/** true si los dos nombres designan el mismo municipio, tildes y alias incluidos. */
export function sameMunicipality(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const na = normMunicipalityName(a);
  const nb = normMunicipalityName(b);
  return na === nb || ALIAS_MAP.get(na) === nb;
}

/** Slug estable para ids de DOM y llaves de React. */
export function municipalitySlug(name: string): string {
  return normMunicipalityName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}