/**
 * territoryTime.ts
 * -----------------------------------------------------------------------
 * El lente temporal del territorio: cómo se lee el día que marca el
 * timeline.
 *
 * Vocabulario, para no volver a mezclarlo:
 *   · `day` es el día del mes en dos dígitos ("14"), o null = toda la
 *     operación.
 *   · `lens` es CÓMO se lee ese día, no un segundo reloj:
 *       - "acumulado": todo lo que llevaba hasta ese día, inclusive.
 *       - "jornada": solo lo que se movió ese día.
 *
 * CAMBIO: este archivo ya no lee el catálogo estático.
 *
 * `TERRITORY_DAYS_REALES` se derivaba de `territoryMunicipalities`, que
 * traía el detalle día por día de cada municipio con corte del 24 de
 * agosto. Ese detalle salió del catálogo, porque hoy lo da
 * `route=flujos`, y con él se fue la base de este cálculo.
 *
 * Las tres funciones que recibían un `TerritoryMunicipalityStat` pasan a
 * recibir `ValorTemporal`, que es la forma que ya usa el mapa con los
 * datos de la API. Si algo seguía pasándoles el catálogo estático, el
 * compilador lo señala: es información del 24 de agosto y no debería
 * estar pintando nada.
 * -----------------------------------------------------------------------
 */
import type { TerritoryMapMode } from "./territoryData";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * Cualquier cosa con entregas y un desglose por día. Es lo que devuelve
 * la derivación de `route=flujos` para cada municipio.
 */
export interface ValorTemporal {
  entregas: number;
  dias: Record<string, number>;
}

/**
 * Los días que realmente tuvieron entrega, a partir de los municipios
 * vivos.
 *
 * Antes esto era la constante `TERRITORY_DAYS_REALES`, calculada al
 * importar el módulo sobre el catálogo estático. Como función deja de
 * depender de un archivo congelado y de paso deja de tener el problema
 * de la constante original: la lista terminaba el 25 de agosto y la
 * operación ya va por el 7 de septiembre.
 *
 * OJO CON EL ORDEN si la operación cruza de mes. Estos son días del mes,
 * así que el 1 de septiembre ordena antes que el 11 de agosto. Para
 * cualquier eje temporal, usar `op.fechas`, que son ISO completas. Esto
 * sirve para saber QUÉ días existen, no para ordenarlos.
 */
export function diasConEntrega(municipios: readonly ValorTemporal[]): string[] {
  return [...new Set(municipios.flatMap((m) => Object.keys(m.dias ?? {})))].sort(
    (a, b) => Number(a) - Number(b),
  );
}

/** "2026-09-03" a "03". Devuelve null si no hay fecha. */
export function dayFromIsoDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const dd = iso.slice(-2);
  return /^\d{2}$/.test(dd) ? dd : null;
}

/** Acumulado hasta `day` inclusive. Con day null, el total. */
export function territoryValueAsOf(
  stat: ValorTemporal | undefined,
  day: string | null,
): number {
  if (!stat) return 0;
  if (day === null) return stat.entregas;
  const limite = Number(day);
  return Object.entries(stat.dias ?? {}).reduce(
    (sum, [d, v]) => (Number(d) <= limite ? sum + v : sum),
    0,
  );
}

/** Lo que se movió exactamente ese día. Con day null, 0. */
export function territoryValueOnDay(
  stat: ValorTemporal | undefined,
  day: string | null,
): number {
  if (!stat || day === null) return 0;
  return stat.dias?.[day] ?? 0;
}

/**
 * Punto de entrada único del mapa.
 *
 * Sin día elegido no hay jornada que mostrar, así que se cae a acumulado
 * total en vez de pintar el departamento entero en gris.
 */
export function valorTemporal(
  stat: ValorTemporal | undefined,
  lens: TerritoryMapMode,
  day: string | null,
): number {
  if (lens === "jornada" && day !== null) return territoryValueOnDay(stat, day);
  return territoryValueAsOf(stat, day);
}

/** Alias histórico de `valorTemporal`. Se puede borrar cuando nadie lo importe. */
export const territoryValue = valorTemporal;

/**
 * Etiqueta del estado temporal, para el HUD y los popups.
 *
 * CORRECCIÓN: el mes deja de estar escrito a mano. Decía "Solo el 03 de
 * agosto" para el 3 de septiembre, el mismo error que tenían las
 * tarjetas de jornada.
 *
 * `iso` es opcional para no romper a quien todavía llame con dos
 * argumentos. Sin ella no se inventa un mes: se dice "el día 3" y
 * listo. Quien la pase obtiene la etiqueta completa, que es lo que
 * debería hacer todo el mundo — en DashboardPage es cambiar
 * `describeLens(lens, day)` por `describeLens(lens, day, isoDate)`.
 */
export function describeLens(
  lens: TerritoryMapMode,
  day: string | null,
  iso?: string | null,
): string {
  if (day === null) return "Total del departamento";

  const [, mes, dia] = (iso ?? "").split("-");
  const nombreMes = MESES[Number(mes) - 1];
  const cuando = nombreMes && dia ? `${Number(dia)} de ${nombreMes}` : `día ${Number(day)}`;

  return lens === "jornada" ? `Solo el ${cuando}` : `Hasta el ${cuando}`;
}

/**
 * Toneladas por entrega.
 *
 * @deprecated Usar `op.pesoPorEntrega` de OperacionContext.
 *
 * Esta constante era una de las tres que convivían en la página: 1,38
 * acá, 1,46 en BalanceFinal y 1,35 en CanalesSection. Por eso las rutas
 * del balance sumaban 784 t debajo de un titular que decía 725.
 *
 * El factor ahora se deriva una sola vez en `operacion.ts`, del peso
 * medido de la hoja TONELADAS dividido entre TODAS las entregas de la
 * operación, incluidas las que el mapa no dibuja. Se recalcula solo en
 * cada corte del Excel, y las partes siempre suman el entero.
 *
 * Se deja exportada un ciclo para no romper importaciones sueltas.
 * Buscar `TONELADAS_POR_DESPACHO` y `toneladasEstimadas` en el proyecto,
 * reemplazarlos por `op.pesoPorEntrega`, y borrar las dos.
 */
export const TONELADAS_POR_DESPACHO = 1.38;

/** @deprecated Usar `Math.round(entregas * op.pesoPorEntrega)`. */
export function toneladasEstimadas(despachos: number): number {
  return Math.round(despachos * TONELADAS_POR_DESPACHO);
}