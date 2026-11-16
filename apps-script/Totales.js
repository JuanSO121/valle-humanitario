/**
 * Totales.gs
 * -----------------------------------------------------------------------
 * Las dos cifras del balance que NO salen del registro de despachos:
 * toneladas recibidas y toneladas en inventario. Las escribe el equipo,
 * en UNA fila de la hoja TOTALES del libro de la plantilla:
 *
 *   Toneladas recibidas | Toneladas en inventario | Observaciones
 *
 * · Una celda vacía es «sin dato» (null): nunca un cero ni un valor
 *   calculado por diferencia.
 * · Se aceptan decimales con coma o con punto («1.234,5» o «1234.5»).
 * · Un valor que no es un número no se publica y se avisa.
 * · Si hay varias filas rellenas, vale la PRIMERA: es una sola fila.
 * -----------------------------------------------------------------------
 */

/** Número de una celda escrita a mano, o null. @return {{valor: ?number, error: boolean}} */
function numeroDeCelda_(v) {
  if (isBlank_(v)) return { valor: null, error: false };
  if (typeof v === 'number') return { valor: v >= 0 ? v : null, error: v < 0 };
  var t = String(v).replace(/\s|t$/gi, '');
  // «1.234,5» → 1234.5 ; «1234,5» → 1234.5 ; «1234.5» se deja.
  if (t.indexOf(',') !== -1) t = t.replace(/\./g, '').replace(',', '.');
  var n = Number(t);
  return isNaN(n) || n < 0 ? { valor: null, error: true } : { valor: n, error: false };
}

/** @return {{recibidas: ?number, inventario: ?number, advertencias: Array<string>}} */
function parsearTotales_(matriz) {
  var vacio = { recibidas: null, inventario: null, advertencias: [] };
  var inicio = -1;
  for (var i = 0; i < Math.min(15, matriz.length); i++) {
    if (normalizeText_((matriz[i] || [])[0]).indexOf('TONELADAS RECIBIDAS') === 0) { inicio = i; break; }
  }
  if (inicio === -1) {
    vacio.advertencias.push('No se encontró la fila de encabezados (primera celda «Toneladas recibidas»).');
    return vacio;
  }
  var enc = matriz[inicio].map(function (h) { return normalizeText_(h); });
  var cRec = enc.indexOf('TONELADAS RECIBIDAS');
  var cInv = enc.indexOf('TONELADAS EN INVENTARIO');
  for (var r = inicio + 1; r < matriz.length; r++) {
    var f = matriz[r] || [];
    var rec = numeroDeCelda_(f[cRec]);
    var inv = cInv === -1 ? { valor: null, error: false } : numeroDeCelda_(f[cInv]);
    if (rec.valor === null && inv.valor === null && !rec.error && !inv.error) continue;
    var adv = [];
    if (rec.error) adv.push('Toneladas recibidas no es un número válido: se muestra «sin dato».');
    if (inv.error) adv.push('Toneladas en inventario no es un número válido: se muestra «sin dato».');
    return { recibidas: rec.valor, inventario: inv.valor, advertencias: adv };
  }
  return vacio;
}

function leerTotales_() {
  var libroId = idLibroFaltantes_();
  var nombre = CONFIG.SHEETS.TOTALES;
  var nulo = { recibidas: null, inventario: null, advertencias: [] };
  if (!libroId) return nulo;
  try {
    var pestanas = leerPestanasDeLibro_(libroId, function (n) { return n === nombre; });
    return pestanas.length === 0 ? nulo : parsearTotales_(pestanas[0].matriz);
  } catch (err) {
    Logger.log('Totales: no se pudo leer la hoja ' + nombre + ': ' + err);
    return nulo;
  }
}

/** Para el editor: qué se publica de recibidas/inventario y por qué. */
function revisarTotales() {
  var t = leerTotales_();
  var lineas = ['TOTALES: recibidas=' + t.recibidas + ' t, inventario=' + t.inventario + ' t.'];
  t.advertencias.forEach(function (a) { lineas.push('  · ' + a); });
  var salida = lineas.join('\n');
  Logger.log(salida);
  return salida;
}
