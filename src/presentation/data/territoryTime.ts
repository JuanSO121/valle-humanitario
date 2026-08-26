/**
 * territoryTime.ts
 * -----------------------------------------------------------------------
 * El lente temporal del territorio. Existe porque `territoryValueFor`
 * solo sabe responder dos preguntas —"¿cuánto en total?" y "¿cuánto ese
 * día?"— y faltaba justo la del medio: "¿cuánto llevaba acumulado al
 * día X?". Esa es la que necesita el mapa mientras corre el timeline.
 *
 * Antes el mapa mostraba los arcos del día 14 sobre polígonos pintados
 * con el acumulado FINAL de la operación: dos relojes distintos en la
 * misma pantalla. Con esto hay uno solo.
 *
 * Vocabulario, para no volver a mezclarlo:
 *   · `day` es el día de agosto en dos dígitos ("14"), o null = toda la
 *     operación.
 *   · `lens` es CÓMO se lee ese día, no un segundo reloj:
 *       - "acumulado": todo lo que llevaba hasta ese día, inclusive.
 *       - "jornada": solo lo que se movió ese día.
 * -----------------------------------------------------------------------
 */
import { jornadas } from "./movimientoData";
import {
  territoryMunicipalities,
  type TerritoryMapMode,
  type TerritoryMunicipalityStat,
} from "./territoryData";

/**
 * Días que REALMENTE tuvieron despacho municipal, derivados del
 * catálogo en vez de escritos a mano.
 *
 * TERRITORY_DAYS incluía "25", pero ningún municipio tiene despacho ese
 * día (verificado contra DESPACHOS del workbook v2): era una posición
 * muerta del control temporal. También falta el 23, que nunca estuvo.
 */
export const TERRITORY_DAYS_REALES: string[] = [
  ...new Set(territoryMunicipalities.flatMap((m) => Object.keys(m.dias))),
].sort((a, b) => Number(a) - Number(b));

/** "2026-08-14" → "14". Devuelve null si no hay fecha. */
export function dayFromIsoDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const dd = iso.slice(-2);
  return /^\d{2}$/.test(dd) ? dd : null;
}

/** Acumulado del municipio hasta `day` inclusive. Con day null, el total. */
export function territoryValueAsOf(
  stat: TerritoryMunicipalityStat | undefined,
  day: string | null,
): number {
  if (!stat) return 0;
  if (day === null) return stat.despachos;
  const limite = Number(day);
  return Object.entries(stat.dias).reduce(
    (sum, [d, v]) => (Number(d) <= limite ? sum + v : sum),
    0,
  );
}

/** Lo que se movió exactamente ese día. Con day null, 0: una jornada sin día no existe. */
export function territoryValueOnDay(
  stat: TerritoryMunicipalityStat | undefined,
  day: string | null,
): number {
  if (!stat || day === null) return 0;
  return stat.dias[day] ?? 0;
}

/**
 * Punto de entrada único del mapa. Reemplaza a `territoryValueFor`, que
 * ignoraba el día cuando el modo era "acumulado" y por eso pintaba el
 * total final mientras el timeline iba por la mitad.
 */
export function territoryValue(
  stat: TerritoryMunicipalityStat | undefined,
  lens: TerritoryMapMode,
  day: string | null,
): number {
  // Sin día elegido no hay jornada que mostrar, así que se cae a
  // acumulado total en vez de pintar el departamento entero en gris.
  if (lens === "jornada" && day !== null) return territoryValueOnDay(stat, day);
  return territoryValueAsOf(stat, day);
}

/** Etiqueta del estado temporal, para el HUD y los popups. */
export function describeLens(lens: TerritoryMapMode, day: string | null): string {
  if (day === null) return "Toda la operación";
  return lens === "jornada" ? `Solo el ${day} de agosto` : `Acumulado al ${day} de agosto`;
}

/**
 * Toneladas movilizadas al corte activo.
 *
 * Vive acá y no en DashboardPage porque tenía un `return 0` que se
 * disparaba cada vez que el timeline caía en un día sin fila en
 * `jornadas` — y ahí el marcador se vaciaba. Un día sin fila no significa
 * "cero toneladas acumuladas": significa "ese día no hubo movimiento",
 * así que el acumulado es el del último día que sí lo tuvo.
 *
 * La serie es DEPARTAMENTAL (hoja TONELADAS del workbook): incluye Cali,
 * el acopio de Cartago y las otras ayudas solidarias. No es divisible
 * contra los despachos municipales que muestra el mapa.
 */
export function toneladasMovilizadas(lens: TerritoryMapMode, day: string | null): number {
  const ultima = jornadas.at(-1)?.acumuladoToneladas ?? 0;
  if (day === null) return ultima;

  const exacta = jornadas.find((j) => j.dia === day);
  if (lens === "jornada") return exacta?.toneladas ?? 0;
  if (exacta) return exacta.acumuladoToneladas;

  // Día sin fila propia (el 23, por ejemplo): se arrastra el acumulado
  // del último día anterior con movimiento, nunca cero.
  const previas = jornadas.filter((j) => Number(j.dia) <= Number(day));
  return previas.at(-1)?.acumuladoToneladas ?? 0;
}