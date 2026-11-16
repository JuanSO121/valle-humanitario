/**
 * Utils.gs
 * -----------------------------------------------------------------------
 * Helpers puros, sin dependencia de SpreadsheetApp.
 *
 * OPTIMIZACIONES
 *   · normalizeText_ memoizada: se llama decenas de miles de veces por
 *     carga (6.110 filas de detalle × destino y categoría, más todos los
 *     índices) con muy pocos valores distintos. NFD + dos regex por
 *     llamada era trabajo repetido.
 *   · jsonTextResponse_: sirve el texto que ya viene de la caché sin
 *     JSON.parse + JSON.stringify de ida y vuelta.
 * -----------------------------------------------------------------------
 */

// Object.create(null): sin prototipo, así un valor como "constructor"
// no choca con propiedades heredadas.
var _normCache_ = Object.create(null);

function normalizeText_(value) {
  if (value === null || value === undefined) return '';
  var s = String(value);
  var hit = _normCache_[s];
  if (hit !== undefined) return hit;

  var r = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');

  _normCache_[s] = r;
  return r;
}

function isBlank_(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function toNumberOrNull_(value) {
  if (isBlank_(value)) return null;
  var n = Number(value);
  return isNaN(n) ? null : n;
}

/** Texto con espacios colapsados, o null si está vacío. */
function textoOrNull_(valor) {
  if (isBlank_(valor)) return null;
  return String(valor).replace(/\s+/g, ' ').trim();
}

function round2_(n) {
  if (n === null || n === undefined) return null;
  return Math.round(n * 100) / 100;
}

/** Respuesta JSON a partir de un objeto. */
function jsonResponse_(payload) {
  return jsonTextResponse_(JSON.stringify(payload));
}

/** Respuesta JSON a partir de un texto ya serializado. */
function jsonTextResponse_(texto) {
  return ContentService
    .createTextOutput(texto)
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse_(message, statusCode) {
  return jsonResponse_({
    error: true,
    status: statusCode || 400,
    message: message,
  });
}

/** Indexa un array de objetos por una key, para lookups O(1). */
function indexBy_(list, keyFn) {
  var map = {};
  for (var i = 0; i < list.length; i++) {
    map[keyFn(list[i])] = list[i];
  }
  return map;
}

/** Agrupa un array de objetos por una key, devolviendo listas. */
function groupBy_(list, keyFn) {
  var map = {};
  for (var i = 0; i < list.length; i++) {
    var key = keyFn(list[i]);
    if (!map[key]) map[key] = [];
    map[key].push(list[i]);
  }
  return map;
}