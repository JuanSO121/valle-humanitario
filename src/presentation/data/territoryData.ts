export type TerritoryZone = "Norte" | "Centro" | "Sur" | "Pacífico";
export type TerritoryMapMode = "acumulado" | "jornada";
export type TerritoryRoutesMode = "visibles" | "solo" | "color";

export interface TerritoryMunicipalityStat {
  name: string;
  /**
   * Código DANE del municipio (string, con ceros a la izquierda tal cual
   * lo trae la fuente). Es la ÚNICA llave que debería usarse para unir
   * este catálogo con el GeoJSON de límites municipales
   * (`properties.municipalityCode` en MapCanvas) — nunca comparar por
   * nombre entre esas dos fuentes: el GeoJSON trae los nombres en
   * MAYÚSCULAS y sin garantía de tilde, mientras que acá se preserva la
   * capitalización real (ver getTerritoryStatByCode).
   */
  codigoDane: string;
  zone: TerritoryZone;
  despachos: number;
  toneladas: number;
  unidades: number;
  renglones: number;
  dias: Record<string, number>;
}

export const TERRITORY_DAYS = ["11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "24", "25"];
export const TERRITORY_BLUE_RAMP = [
  "#0F3149",
  "#175A80",
  "#2181B4",
  "#3FAEDC",
  "#86D3F0",
  "#C6ECFB",
] as const;
export const TERRITORY_ACCUMULATED_BREAKS = [1, 4, 7, 11, 16];
export const TERRITORY_DAILY_BREAKS = [1, 1, 2, 3, 4];

/**
 * Datos reales extraídos de BD_Entregas_Operativa_v2.xlsx (hojas
 * RESUMEN + ENVIOS_CATEGORIA + DESPACHOS + DESPACHO_DESTINO +
 * CAT_MUNICIPIOS), corte del 24 de agosto de 2026. Reemplaza al set
 * anterior extraído a mano del HTML de referencia, que tenía nombres sin
 * tilde/en mayúsculas (rompía el matching con el GeoJSON) y al menos una
 * zona mal asignada (Dagua figuraba como "Pacífico"; el catálogo real
 * dice "Sur").
 *
 * `despachos`/`unidades` vienen directo de RESUMEN (fórmulas vivas del
 * workbook). `renglones` es la suma por destino de ENVIOS_CATEGORIA.
 * `dias` sale de unir DESPACHOS.fecha con DESPACHO_DESTINO por
 * despacho_id — validado 1:1 contra RESUMEN.despachos para los 41
 * municipios (0 discrepancias).
 *
 * `toneladas` NO tiene fuente real por municipio (la hoja TONELADAS solo
 * trae el total por día, no desagregado). Se estima con la razón global
 * toneladas/despacho de toda la operación: 531 t acumuladas / 397
 * despachos totales (todos los tipos de destino, ver fila TOTAL de
 * RESUMEN) ≈ 1.34 t por despacho. Es un estimado, igual que el `* 1.75`
 * que ya usaba MapCanvas.municipalityPopupHtml para el modo "jornada" —
 * no un valor medido por municipio.
 *
 * Santiago de Cali queda excluida a propósito (igual que antes): ver
 * panoramaData.ts, "Cali: Excluida del consolidado por instrucción
 * expresa".
 *
 * IMPORTANTE — descuadre conocido con el resto de la narrativa: esta
 * base (v2) es más reciente/completa que la que generó los totales
 * "307 despachos" / "553 t" de movimientoData.ts y panoramaData.ts
 * (StoryPage). El total real de despachos en estos 41 municipios es 321,
 * no 307. Las `unidades` sí cuadran exactamente (256.650 en ambas
 * fuentes). No se tocó movimientoData.ts/panoramaData.ts en este cambio
 * porque afecta a toda la narrativa del Story y no era lo pedido — pero
 * si se quiere que TODA la app hable del mismo número, esos dos archivos
 * también necesitan regenerarse desde este Excel.
 */
export const territoryMunicipalities: TerritoryMunicipalityStat[] = [
  { name: "Alcalá", codigoDane: "76020", zone: "Norte", despachos: 6, toneladas: 8, unidades: 3279, renglones: 82, dias: {"12": 1, "13": 1, "16": 1, "17": 1, "20": 1, "22": 1} },
  { name: "Andalucía", codigoDane: "76036", zone: "Centro", despachos: 5, toneladas: 7, unidades: 5691, renglones: 85, dias: {"12": 1, "14": 1, "18": 1, "19": 1, "21": 1} },
  { name: "Ansermanuevo", codigoDane: "76041", zone: "Norte", despachos: 9, toneladas: 12, unidades: 1561, renglones: 64, dias: {"12": 1, "13": 1, "17": 4, "19": 1, "22": 2} },
  { name: "Argelia", codigoDane: "76054", zone: "Norte", despachos: 12, toneladas: 16, unidades: 4379, renglones: 167, dias: {"12": 2, "13": 2, "15": 1, "17": 4, "19": 1, "20": 1, "21": 1} },
  { name: "Bolívar", codigoDane: "76100", zone: "Norte", despachos: 12, toneladas: 16, unidades: 6564, renglones: 236, dias: {"12": 1, "13": 3, "14": 2, "15": 2, "17": 2, "19": 1, "20": 1} },
  { name: "Buenaventura", codigoDane: "76109", zone: "Pacífico", despachos: 10, toneladas: 13, unidades: 11558, renglones: 77, dias: {"12": 1, "13": 1, "16": 1, "19": 1, "20": 1, "21": 1, "22": 3, "24": 1} },
  { name: "Bugalagrande", codigoDane: "76113", zone: "Centro", despachos: 7, toneladas: 9, unidades: 2464, renglones: 30, dias: {"12": 2, "17": 2, "19": 1, "20": 1, "21": 1} },
  { name: "Caicedonia", codigoDane: "76122", zone: "Centro", despachos: 7, toneladas: 9, unidades: 9715, renglones: 223, dias: {"12": 2, "13": 1, "15": 1, "17": 1, "18": 1, "22": 1} },
  { name: "Calima", codigoDane: "76126", zone: "Centro", despachos: 12, toneladas: 16, unidades: 5102, renglones: 142, dias: {"12": 1, "13": 1, "14": 1, "15": 2, "16": 1, "20": 1, "21": 3, "22": 2} },
  { name: "Candelaria", codigoDane: "76130", zone: "Sur", despachos: 0, toneladas: 0, unidades: 0, renglones: 0, dias: {} },
  { name: "Cartago", codigoDane: "76147", zone: "Norte", despachos: 12, toneladas: 16, unidades: 1400, renglones: 25, dias: {"17": 1, "18": 5, "19": 4, "20": 1, "22": 1} },
  { name: "Dagua", codigoDane: "76233", zone: "Sur", despachos: 21, toneladas: 28, unidades: 12123, renglones: 266, dias: {"12": 3, "13": 3, "14": 3, "15": 2, "16": 2, "17": 3, "18": 3, "21": 1, "22": 1} },
  { name: "El Cairo", codigoDane: "76246", zone: "Norte", despachos: 5, toneladas: 7, unidades: 3626, renglones: 133, dias: {"12": 2, "14": 1, "17": 2} },
  { name: "El Cerrito", codigoDane: "76248", zone: "Sur", despachos: 3, toneladas: 4, unidades: 1511, renglones: 63, dias: {"11": 1, "12": 1, "21": 1} },
  { name: "El Dovio", codigoDane: "76250", zone: "Norte", despachos: 4, toneladas: 5, unidades: 3579, renglones: 58, dias: {"12": 1, "17": 2, "24": 1} },
  { name: "El Águila", codigoDane: "76243", zone: "Norte", despachos: 11, toneladas: 15, unidades: 3676, renglones: 96, dias: {"11": 1, "12": 1, "13": 1, "15": 1, "16": 4, "22": 3} },
  { name: "Florida", codigoDane: "76275", zone: "Sur", despachos: 0, toneladas: 0, unidades: 0, renglones: 0, dias: {} },
  { name: "Ginebra", codigoDane: "76306", zone: "Sur", despachos: 1, toneladas: 1, unidades: 562, renglones: 26, dias: {"12": 1} },
  { name: "Guacarí", codigoDane: "76318", zone: "Centro", despachos: 3, toneladas: 4, unidades: 2933, renglones: 81, dias: {"13": 1, "15": 1, "21": 1} },
  { name: "Guadalajara de Buga", codigoDane: "76111", zone: "Centro", despachos: 5, toneladas: 7, unidades: 3638, renglones: 92, dias: {"13": 1, "15": 1, "17": 2, "21": 1} },
  { name: "Jamundí", codigoDane: "76364", zone: "Sur", despachos: 5, toneladas: 7, unidades: 1913, renglones: 55, dias: {"12": 3, "18": 1, "22": 1} },
  { name: "La Cumbre", codigoDane: "76377", zone: "Sur", despachos: 11, toneladas: 15, unidades: 6020, renglones: 178, dias: {"12": 3, "13": 2, "15": 2, "17": 3, "19": 1} },
  { name: "La Unión", codigoDane: "76400", zone: "Norte", despachos: 10, toneladas: 13, unidades: 6758, renglones: 99, dias: {"11": 1, "12": 2, "15": 1, "17": 4, "20": 1, "21": 1} },
  { name: "La Victoria", codigoDane: "76403", zone: "Norte", despachos: 7, toneladas: 9, unidades: 2487, renglones: 72, dias: {"12": 1, "14": 1, "17": 3, "18": 1, "19": 1} },
  { name: "Obando", codigoDane: "76497", zone: "Norte", despachos: 6, toneladas: 8, unidades: 2544, renglones: 134, dias: {"12": 1, "13": 1, "15": 2, "17": 1, "18": 1} },
  { name: "Palmira", codigoDane: "76520", zone: "Sur", despachos: 7, toneladas: 9, unidades: 3596, renglones: 84, dias: {"12": 1, "13": 1, "14": 1, "16": 1, "17": 2, "21": 1} },
  { name: "Pradera", codigoDane: "76563", zone: "Sur", despachos: 2, toneladas: 3, unidades: 4013, renglones: 61, dias: {"18": 1, "19": 1} },
  { name: "Restrepo", codigoDane: "76606", zone: "Centro", despachos: 12, toneladas: 16, unidades: 5885, renglones: 223, dias: {"12": 1, "13": 3, "14": 3, "17": 2, "18": 2, "19": 1} },
  { name: "Riofrío", codigoDane: "76616", zone: "Centro", despachos: 11, toneladas: 15, unidades: 7241, renglones: 178, dias: {"12": 3, "13": 2, "14": 2, "15": 1, "16": 1, "18": 1, "20": 1} },
  { name: "Roldanillo", codigoDane: "76622", zone: "Norte", despachos: 12, toneladas: 16, unidades: 3984, renglones: 53, dias: {"12": 3, "17": 3, "18": 2, "19": 2, "21": 1, "22": 1} },
  { name: "San Pedro", codigoDane: "76670", zone: "Centro", despachos: 3, toneladas: 4, unidades: 3732, renglones: 98, dias: {"12": 1, "13": 1, "14": 1} },
  { name: "Sevilla", codigoDane: "76736", zone: "Centro", despachos: 20, toneladas: 27, unidades: 24982, renglones: 817, dias: {"12": 3, "13": 3, "14": 1, "15": 2, "16": 3, "17": 2, "18": 3, "19": 1, "20": 1, "22": 1} },
  { name: "Toro", codigoDane: "76823", zone: "Norte", despachos: 5, toneladas: 7, unidades: 4218, renglones: 73, dias: {"11": 1, "13": 1, "14": 1, "17": 2} },
  { name: "Trujillo", codigoDane: "76828", zone: "Centro", despachos: 12, toneladas: 16, unidades: 6539, renglones: 209, dias: {"13": 1, "14": 2, "15": 1, "17": 3, "18": 4, "21": 1} },
  { name: "Tuluá", codigoDane: "76834", zone: "Centro", despachos: 4, toneladas: 5, unidades: 1172, renglones: 28, dias: {"17": 1, "18": 2, "21": 1} },
  { name: "Ulloa", codigoDane: "76845", zone: "Norte", despachos: 5, toneladas: 7, unidades: 2267, renglones: 58, dias: {"12": 1, "13": 1, "16": 1, "20": 1, "22": 1} },
  { name: "Versalles", codigoDane: "76863", zone: "Norte", despachos: 10, toneladas: 13, unidades: 3152, renglones: 101, dias: {"11": 1, "12": 1, "13": 2, "14": 1, "16": 1, "17": 3, "18": 1} },
  { name: "Vijes", codigoDane: "76869", zone: "Sur", despachos: 6, toneladas: 8, unidades: 1612, renglones: 75, dias: {"12": 1, "13": 1, "15": 1, "17": 1, "20": 2} },
  { name: "Yotoco", codigoDane: "76890", zone: "Centro", despachos: 16, toneladas: 21, unidades: 10140, renglones: 237, dias: {"12": 4, "13": 4, "15": 1, "17": 1, "18": 2, "19": 1, "21": 1, "22": 1} },
  { name: "Yumbo", codigoDane: "76892", zone: "Sur", despachos: 5, toneladas: 7, unidades: 2423, renglones: 110, dias: {"12": 1, "15": 1, "18": 2, "21": 1} },
  { name: "Zarzal", codigoDane: "76895", zone: "Norte", despachos: 7, toneladas: 9, unidades: 5739, renglones: 39, dias: {"12": 1, "15": 1, "17": 3, "19": 1, "20": 1} },
];

/**
 * Normaliza un nombre de municipio para comparar TEXTO contra texto
 * (ej. el nombre de un destino seleccionado vs. este catálogo) cuando no
 * hay código DANE a mano en el otro lado. Nunca usar esto para unir
 * contra el GeoJSON de límites — ahí usar codigoDane vía
 * getTerritoryStatByCode, que no depende de mayúsculas/tildes en
 * absoluto. `normId` (@/lib/id) NO sirve para esto: solo recorta ceros a
 * la izquierda de IDs numéricos, no hace case-fold ni saca tildes.
 */
function normMunicipalityName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

const NAME_ALIASES = new Map<string, string>([
  [normMunicipalityName("Guadalajara de Buga"), "Buga"],
  [normMunicipalityName("Buga"), "Guadalajara de Buga"],
  [normMunicipalityName("Cali"), "Santiago de Cali"],
]);

export const territoryByCode = new Map(territoryMunicipalities.map((m) => [m.codigoDane, m]));
export const territoryByName = new Map(
  territoryMunicipalities.map((m) => [normMunicipalityName(m.name), m]),
);

/** Preferido: join robusto por código DANE, sin ambigüedad de texto. */
export function getTerritoryStatByCode(codigoDane: string | null | undefined): TerritoryMunicipalityStat | undefined {
  if (!codigoDane) return undefined;
  return territoryByCode.get(codigoDane);
}

/** Fallback por nombre, para cuando no hay código DANE disponible del otro lado (ej. DestinoResumenLista). */
export function getTerritoryStat(name: string): TerritoryMunicipalityStat | undefined {
  const key = normMunicipalityName(name);
  return territoryByName.get(key) ?? territoryByName.get(normMunicipalityName(NAME_ALIASES.get(key) ?? ""));
}

export function territoryValueFor(stat: TerritoryMunicipalityStat | undefined, mode: TerritoryMapMode, day: string): number {
  if (!stat) return 0;
  return mode === "acumulado" ? stat.despachos : stat.dias[day] ?? 0;
}

export function territoryToneIndex(value: number, mode: TerritoryMapMode): number | null {
  if (value <= 0) return null;
  const breaks = mode === "acumulado" ? TERRITORY_ACCUMULATED_BREAKS : TERRITORY_DAILY_BREAKS;
  const idx = breaks.findIndex((limit) => value <= limit);
  return idx === -1 ? breaks.length : idx;
}