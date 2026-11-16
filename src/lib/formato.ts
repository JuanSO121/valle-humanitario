/**
 * lib/formato.ts
 * -----------------------------------------------------------------------
 * Formato de cifras y fechas del tablero, en un solo lugar para que una
 * misma cantidad se lea igual en el balance, en el mapa y en la lista.
 *
 * Todas las toneladas del tablero son APROXIMADAS (vienen de pesos
 * estimados en el Excel de despachos). Los decimales se ajustan al
 * tamaño: 294 t se lee mejor que 294,034 t, pero un municipio con 45 kg
 * no puede quedar en «0 t».
 * -----------------------------------------------------------------------
 */

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** «294 t», «23,4 t», «0,05 t». Sin sufijo si `sufijo` es false. */
export function toneladas(n: number, sufijo = true): string {
  const decimales = n >= 100 ? 0 : n >= 10 ? 1 : 2;
  const texto = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: decimales,
  }).format(n);
  return sufijo ? `${texto} t` : texto;
}

export const entero = (n: number): string => new Intl.NumberFormat("es-CO").format(n);

/** «$1.300.000.000». Es un dato público: no se redondea. */
export function pesos(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

/** «2026-10-30» -> «30 de octubre de 2026». Vacío si no hay fecha válida. */
export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("-");
  const nombre = MESES[Number(mes) - 1];
  if (!anio || !dia || !nombre) return "";
  return `${Number(dia)} de ${nombre} de ${anio}`;
}

/** «2026-08-25» -> «25 de agosto». */
export function diaMes(iso: string | null | undefined): string {
  if (!iso) return "";
  const [, mes, dia] = iso.split("-");
  const nombre = MESES[Number(mes) - 1];
  return nombre && dia ? `${Number(dia)} de ${nombre}` : "";
}

/** «1,5%», «15%»: un decimal por debajo del 10%, entero desde ahí. */
export function porcentaje(parte: number, total: number): string {
  if (total <= 0) return "0%";
  const n = (parte / total) * 100;
  const texto = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: n < 10 ? 1 : 0,
  }).format(n);
  return `${texto}%`;
}
