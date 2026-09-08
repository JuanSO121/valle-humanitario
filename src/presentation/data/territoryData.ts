/**
 * territoryData.ts
 * -----------------------------------------------------------------------
 * Catálogo de respaldo de los 41 municipios, y la escala de color del
 * mapa.
 *
 * QUÉ CAMBIÓ, Y POR QUÉ IMPORTA
 *
 * Este archivo dejó de ser una copia del Excel. Antes traía por municipio
 * `despachos`, `unidades`, `renglones`, `toneladas` y el detalle día por
 * día, todo con corte del 24 de agosto de 2026. Eran cifras que
 * envejecían solas y que nadie recordaba regenerar: su propio comentario
 * ya avisaba de un descuadre con movimientoData.ts y panoramaData.ts.
 *
 * Hoy todo eso llega de la API. `route=municipios` da el código DANE y la
 * subregión, `route=flujos` las entregas por día, `route=toneladas` el
 * peso. Nada de eso tiene por qué estar acá.
 *
 * Lo único que queda es lo que la API NO puede dar: el nombre y la zona
 * de cada municipio como último recurso si `route=municipios` no
 * responde, más la rampa de color, que es diseño.
 *
 * LAS ZONAS SON LAS DEL EXCEL, Y NO SE CORRIGEN ACÁ
 *
 * La versión anterior "arreglaba" seis zonas por su cuenta —pasaba Dagua
 * de Pacífico a Sur, Sevilla de Norte a Centro, El Cerrito, Ginebra y
 * Vijes de Centro a Sur, Caicedonia de Norte a Centro— y dejaba escrito
 * que el catálogo estaba equivocado. No lo estaba. La agrupación
 * confirmada por la Gobernación es Norte 18, Centro 14, Sur 7 y
 * Pacífico 2, que es la que está abajo.
 *
 * El efecto de aquella corrección era peor que el problema que creía
 * resolver: como el respaldo solo entra en juego cuando la API falla, un
 * municipio podía aparecer en Pacífico en el mapa y en Sur en la galería
 * dentro de la misma carga. Si mañana la Gobernación reclasifica un
 * municipio, se cambia en CAT_MUNICIPIOS y acá también, en ese orden.
 * -----------------------------------------------------------------------
 */

export type TerritoryZone = "Norte" | "Centro" | "Sur" | "Pacífico";
export type TerritoryMapMode = "acumulado" | "jornada";
export type TerritoryRoutesMode = "visibles" | "solo" | "color";

export interface TerritoryMunicipalityStat {
  name: string;
  /**
   * Código DANE del municipio, con los ceros a la izquierda tal cual los
   * trae la fuente. Es la ÚNICA llave que debería usarse para unir contra
   * el GeoJSON de límites municipales (`properties.municipalityCode` en
   * MapCanvas): ese archivo trae los nombres en mayúsculas y sin garantía
   * de tilde.
   */
  codigoDane: string;
  zone: TerritoryZone;
}

/** La escala del mapa, de menos a más volumen. Es diseño, no dato. */
export const TERRITORY_BLUE_RAMP = [
  "#0F3149",
  "#175A80",
  "#2181B4",
  "#3FAEDC",
  "#86D3F0",
  "#C6ECFB",
] as const;

/**
 * Cortes de la rampa, calculados sobre los datos del día.
 *
 * Antes eran dos listas fijas, `[1, 4, 7, 11, 16]` y `[1, 1, 2, 3, 4]`,
 * calibradas cuando el municipio que más había recibido tenía 21
 * entregas. Hoy Dagua tiene 34, y La Cumbre, Sevilla, Yotoco, Restrepo y
 * Trujillo caen todos por encima del último corte: seis municipios
 * pintados del mismo tono, con el mapa incapaz de distinguir al primero
 * del sexto.
 *
 * Con cortes derivados, la escala se recalibra sola en cada corte del
 * Excel y el mapa no vuelve a saturarse. Se reparte por cuantiles y no en
 * tramos iguales porque la distribución tiene una cola larga: un solo
 * municipio muy por encima del resto aplastaría a todos los demás en el
 * primer tono.
 */
export function calcularCortes(valores: number[]): number[] {
  const positivos = valores.filter((v) => v > 0).sort((a, b) => a - b);
  if (positivos.length === 0) return [1, 2, 3, 4, 5];

  const tramos = TERRITORY_BLUE_RAMP.length - 1;
  const cortes: number[] = [];
  for (let i = 1; i <= tramos; i += 1) {
    const pos = Math.ceil((positivos.length * i) / (tramos + 1)) - 1;
    const valor = positivos[Math.max(0, Math.min(pos, positivos.length - 1))] ?? 1;
    // Estrictamente creciente: con pocos municipios, dos cuantiles
    // pueden caer en el mismo valor y un corte repetido deja un tono de
    // la rampa sin usar.
    cortes.push(Math.max(valor, (cortes[cortes.length - 1] ?? 0) + 1));
  }
  return cortes;
}

/**
 * Los 41 municipios con su zona, como respaldo de `route=municipios`.
 *
 * Santiago de Cali queda fuera a propósito: va por su propio canal y no
 * entra en el consolidado municipal, por instrucción expresa.
 *
 * NO agregar cifras a esta lista. Todo lo cuantitativo viene de la API.
 */
export const territoryMunicipalities: TerritoryMunicipalityStat[] = [
  { name: "Alcalá", codigoDane: "76020", zone: "Norte" },
  { name: "Andalucía", codigoDane: "76036", zone: "Centro" },
  { name: "Ansermanuevo", codigoDane: "76041", zone: "Norte" },
  { name: "Argelia", codigoDane: "76054", zone: "Norte" },
  { name: "Bolívar", codigoDane: "76100", zone: "Norte" },
  { name: "Buenaventura", codigoDane: "76109", zone: "Pacífico" },
  { name: "Bugalagrande", codigoDane: "76113", zone: "Centro" },
  { name: "Caicedonia", codigoDane: "76122", zone: "Norte" },
  { name: "Calima - El Darién", codigoDane: "76126", zone: "Centro" },
  { name: "Candelaria", codigoDane: "76130", zone: "Sur" },
  { name: "Cartago", codigoDane: "76147", zone: "Norte" },
  { name: "Dagua", codigoDane: "76233", zone: "Pacífico" },
  { name: "El Cairo", codigoDane: "76246", zone: "Norte" },
  { name: "El Cerrito", codigoDane: "76248", zone: "Centro" },
  { name: "El Dovio", codigoDane: "76250", zone: "Norte" },
  { name: "El Águila", codigoDane: "76243", zone: "Norte" },
  { name: "Florida", codigoDane: "76275", zone: "Sur" },
  { name: "Ginebra", codigoDane: "76306", zone: "Centro" },
  { name: "Guacarí", codigoDane: "76318", zone: "Centro" },
  { name: "Guadalajara de Buga", codigoDane: "76111", zone: "Centro" },
  { name: "Jamundí", codigoDane: "76364", zone: "Sur" },
  { name: "La Cumbre", codigoDane: "76377", zone: "Sur" },
  { name: "La Unión", codigoDane: "76400", zone: "Norte" },
  { name: "La Victoria", codigoDane: "76403", zone: "Norte" },
  { name: "Obando", codigoDane: "76497", zone: "Norte" },
  { name: "Palmira", codigoDane: "76520", zone: "Sur" },
  { name: "Pradera", codigoDane: "76563", zone: "Sur" },
  { name: "Restrepo", codigoDane: "76606", zone: "Centro" },
  { name: "Riofrío", codigoDane: "76616", zone: "Centro" },
  { name: "Roldanillo", codigoDane: "76622", zone: "Norte" },
  { name: "San Pedro", codigoDane: "76670", zone: "Centro" },
  { name: "Sevilla", codigoDane: "76736", zone: "Norte" },
  { name: "Toro", codigoDane: "76823", zone: "Norte" },
  { name: "Trujillo", codigoDane: "76828", zone: "Centro" },
  { name: "Tuluá", codigoDane: "76834", zone: "Centro" },
  { name: "Ulloa", codigoDane: "76845", zone: "Norte" },
  { name: "Versalles", codigoDane: "76863", zone: "Norte" },
  { name: "Vijes", codigoDane: "76869", zone: "Centro" },
  { name: "Yotoco", codigoDane: "76890", zone: "Centro" },
  { name: "Yumbo", codigoDane: "76892", zone: "Sur" },
  { name: "Zarzal", codigoDane: "76895", zone: "Norte" },
];

/**
 * Normaliza un nombre de municipio para comparar TEXTO contra texto,
 * cuando no hay código DANE a mano del otro lado. Nunca usar esto para
 * unir contra el GeoJSON de límites: ahí va `getTerritoryStatByCode`, que
 * no depende de mayúsculas ni tildes.
 */
function normMunicipalityName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/**
 * Nombres que aparecen escritos de más de una forma en las fuentes.
 *
 * "Calima" es el que faltaba: DETALLE_PRODUCTO lo escribe corto y
 * CAT_DESTINOS largo, así que cuando el respaldo entraba en juego ese
 * municipio se quedaba sin zona y caía en el grupo "Sin zona" de la
 * galería. El backend ya lo resuelve con CONFIG.DESTINO_ALIAS; acá hacía
 * falta el equivalente.
 */
const NAME_ALIASES = new Map<string, string>([
  [normMunicipalityName("Guadalajara de Buga"), "Buga"],
  [normMunicipalityName("Buga"), "Guadalajara de Buga"],
  [normMunicipalityName("Cali"), "Santiago de Cali"],
  [normMunicipalityName("Calima"), "Calima - El Darién"],
  [normMunicipalityName("Calima - El Darién"), "Calima"],
  [normMunicipalityName("Calima El Darién"), "Calima - El Darién"],
]);

export const territoryByCode = new Map(territoryMunicipalities.map((m) => [m.codigoDane, m]));
export const territoryByName = new Map(
  territoryMunicipalities.map((m) => [normMunicipalityName(m.name), m]),
);

/** Preferido: join robusto por código DANE, sin ambigüedad de texto. */
export function getTerritoryStatByCode(
  codigoDane: string | null | undefined,
): TerritoryMunicipalityStat | undefined {
  if (!codigoDane) return undefined;
  return territoryByCode.get(codigoDane);
}

/** Respaldo por nombre, para cuando no hay código DANE del otro lado. */
export function getTerritoryStat(name: string): TerritoryMunicipalityStat | undefined {
  const key = normMunicipalityName(name);
  const directo = territoryByName.get(key);
  if (directo) return directo;
  const alias = NAME_ALIASES.get(key);
  return alias ? territoryByName.get(normMunicipalityName(alias)) : undefined;
}

/** El tono de la rampa que corresponde a un valor. `null` si no recibió. */
export function territoryToneIndex(value: number, cortes: number[]): number | null {
  if (value <= 0) return null;
  const idx = cortes.findIndex((limite) => value <= limite);
  return idx === -1 ? cortes.length : idx;
}