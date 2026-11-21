/**
 * SheetService.gs
 * -----------------------------------------------------------------------
 * Única capa que lee el Excel.
 *
 * OPTIMIZACIÓN
 *
 * Antes: por cada hoja, getValues() + getDisplayValues() sobre el rango
 * completo. Nueve hojas = dieciocho llamadas lentas, y la segunda
 * lectura de DETALLE_PRODUCTO (6.110 filas) solo servía para las fechas,
 * que en esa hoja ni existen.
 *
 * Ahora: UNA sola llamada a la Sheets API (Values.batchGet) para todas
 * las hojas, con
 *
 *   valueRenderOption:    UNFORMATTED_VALUE   números como números
 *   dateTimeRenderOption: FORMATTED_STRING    fechas como el texto visible
 *
 * Es exactamente la misma combinación que armaba el código anterior
 * (tipo original + texto visible solo para las fechas), así que la
 * corrección del corrimiento de un día se conserva sin segunda lectura.
 *
 * Requiere el servicio avanzado "Google Sheets API" (ver
 * appsscript.json). Si no está habilitado, se cae a SpreadsheetApp, que
 * también quedó más liviano: getDisplayValues() solo sobre las columnas
 * que de verdad traen fechas.
 * -----------------------------------------------------------------------
 */

var _sheetCache_ = Object.create(null);
var _spreadsheetId_ = null;

/**
 * Propiedades del script que apuntan a cada libro. Son la «configuración
 * de entorno» del backend: se editan en Apps Script → Configuración del
 * proyecto → Propiedades del script, sin tocar código.
 *
 *   LIBRO_BASE_ID          el libro enlazado al script. Si no está, se usa
 *                          el que el script tiene abierto (producción).
 *   LIBRO_OFICIAL_ID       el libro de despachos (hoja DESPACHOS). Obligatoria.
 *   LIBRO_CONTRATACION_ID  OPCIONAL. La hoja CONTRATACION está en el libro oficial;
 *                          solo se pone si se separa en otro libro.
 *   LIBRO_FALTANTES_ID     OPCIONAL. Las hojas QUE_HACE_FALTA y TOTALES están
 *                          en el libro oficial; solo se pone si se separan.
 */
var PROP_LIBRO_BASE_ = 'LIBRO_BASE_ID';
var PROP_LIBRO_OFICIAL_ = 'LIBRO_OFICIAL_ID';
var PROP_LIBRO_CONTRATACION_ = 'LIBRO_CONTRATACION_ID';

function propiedadDelScript_(nombre) {
  var v = PropertiesService.getScriptProperties().getProperty(nombre);
  v = v ? String(v).trim() : '';
  return v || null;
}

function idLibroOficial_() {
  return propiedadDelScript_(PROP_LIBRO_OFICIAL_);
}

var PROP_LIBRO_FALTANTES_ = 'LIBRO_FALTANTES_ID';

/**
 * La hoja QUE_HACE_FALTA y la hoja TOTALES viven en el libro OFICIAL (un solo
 * libro para quien carga y mantiene los despachos). Si algún día se separan,
 * la propiedad LIBRO_FALTANTES_ID apunta al otro libro.
 */
function idLibroFaltantes_() {
  return propiedadDelScript_(PROP_LIBRO_FALTANTES_) || idLibroOficial_() || spreadsheetId_();
}

/**
 * La hoja CONTRATACION vive en el libro OFICIAL, con los despachos. Si algún día se
 * separa, la propiedad LIBRO_CONTRATACION_ID apunta al otro libro. null si no hay
 * ninguno: la hoja no se puede leer.
 */
function idLibroContratacion_() {
  return propiedadDelScript_(PROP_LIBRO_CONTRATACION_) || idLibroOficial_() || spreadsheetId_();
}

/**
 * Id del libro «base»: el de la propiedad LIBRO_BASE_ID o el que el script
 * tiene enlazado. null en un proyecto autónomo sin esa propiedad: quien lo
 * use decide qué hacer sin libro (las secciones opcionales no se dibujan)
 * en vez de fallar con un error de Google.
 */
function spreadsheetId_() {
  if (_spreadsheetId_ === null) {
    var id = propiedadDelScript_(PROP_LIBRO_BASE_);
    if (!id) {
      try {
        var activo = SpreadsheetApp.getActiveSpreadsheet();
        id = activo ? activo.getId() : null;
      } catch (e) {
        id = null;
      }
    }
    _spreadsheetId_ = id || false;
  }
  return _spreadsheetId_ || null;
}

function sheetsApiDisponible_() {
  try {
    return typeof Sheets !== 'undefined' && !!Sheets.Spreadsheets && !!Sheets.Spreadsheets.Values;
  } catch (e) {
    return false;
  }
}

/** Nombre de hoja como rango A1, con comillas por si trae espacios. */
function rangoDeHoja_(nombre) {
  return "'" + String(nombre).replace(/'/g, "''") + "'";
}

/**
 * Carga varias hojas en una sola llamada y las deja en la caché del
 * request. Si la llamada falla (servicio no habilitado, hoja
 * inexistente), no lanza: getSheet_ las lee una por una después y ahí
 * sí aparece el error con el nombre de la hoja.
 */
function precargarHojas_(nombres) {
  var vistos = {};
  var faltan = [];
  (nombres || []).forEach(function (n) {
    if (!n || vistos[n] || _sheetCache_[n]) return;
    vistos[n] = true;
    faltan.push(n);
  });

  if (faltan.length === 0 || !sheetsApiDisponible_()) return;

  try {
    var resp = Sheets.Spreadsheets.Values.batchGet(spreadsheetId_(), {
      ranges: faltan.map(rangoDeHoja_),
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
      majorDimension: 'ROWS',
    });

    var rangos = (resp && resp.valueRanges) || [];
    if (rangos.length !== faltan.length) {
      Logger.log('batchGet devolvió ' + rangos.length + ' rangos para ' + faltan.length + ' hojas. Se lee hoja por hoja.');
      return;
    }

    for (var i = 0; i < faltan.length; i++) {
      _sheetCache_[faltan[i]] = filasAObjetos_(rangos[i].values || [], null);
    }
  } catch (e) {
    Logger.log('batchGet falló para [' + faltan.join(', ') + ']: ' + e + '. Se lee hoja por hoja.');
  }
}

/**
 * Matriz de valores -> array de objetos, usando la fila 1 como nombres
 * de campo. Mismo contrato que antes: celdas vacías como null, filas
 * vacías descartadas, __row con la fila real del Sheet.
 *
 * @param {Array<Array>} values
 * @param {Object|null} fechasPorColumna  solo en el camino SpreadsheetApp:
 *        índice de columna -> getDisplayValues() de esa columna.
 */
function filasAObjetos_(values, fechasPorColumna) {
  if (!values || values.length < 2) return [];

  var headers = (values[0] || []).map(function (h) {
    return String(h === null || h === undefined ? '' : h).trim();
  });

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i] || [];

    var vacia = true;
    for (var k = 0; k < row.length; k++) {
      var v = row[k];
      if (v !== '' && v !== null && v !== undefined) {
        vacia = false;
        break;
      }
    }
    if (vacia) continue;

    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      var celda = row[c];

      if (celda === undefined || celda === '') {
        obj[headers[c]] = null;
        continue;
      }

      if (fechasPorColumna && fechasPorColumna[c] && esFecha_(celda)) {
        obj[headers[c]] = String(fechasPorColumna[c][i][0]).trim();
        continue;
      }

      obj[headers[c]] = celda;
    }

    obj.__row = i + 1;
    rows.push(obj);
  }
  return rows;
}

function esFecha_(valor) {
  return typeof valor === 'object' && valor !== null &&
    Object.prototype.toString.call(valor) === '[object Date]';
}

/**
 * Camino de respaldo con SpreadsheetApp. Una lectura de valores y, solo
 * para las columnas que contienen fechas, una lectura de texto visible.
 */
function readSheetAsObjects_(sheetName) {
  var sheet = SpreadsheetApp.openById(spreadsheetId_()).getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('No existe la hoja "' + sheetName + '". Revisa CONFIG.SHEETS.');
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  var columnasFecha = {};
  var hayFechas = false;
  for (var r = 1; r < values.length; r++) {
    var fila = values[r];
    for (var c = 0; c < fila.length; c++) {
      if (!columnasFecha[c] && esFecha_(fila[c])) {
        columnasFecha[c] = true;
        hayFechas = true;
      }
    }
  }

  var fechas = null;
  if (hayFechas) {
    fechas = {};
    Object.keys(columnasFecha).forEach(function (col) {
      fechas[col] = sheet.getRange(1, Number(col) + 1, lastRow, 1).getDisplayValues();
    });
  }

  return filasAObjetos_(values, fechas);
}

/** Todas las lecturas pasan por acá, cacheadas en memoria del request. */
function getSheet_(sheetKey) {
  if (!_sheetCache_[sheetKey]) {
    precargarHojas_([sheetKey]);
    if (!_sheetCache_[sheetKey]) {
      _sheetCache_[sheetKey] = readSheetAsObjects_(sheetKey);
    }
  }
  return _sheetCache_[sheetKey];
}

/** Se llama al inicio de cada doGet y de cada diagnóstico. */
function resetSheetCache_() {
  _sheetCache_ = Object.create(null);
  if (typeof resetDataset_ === 'function') resetDataset_();
  if (typeof resetDespachos_ === 'function') resetDespachos_();
}

// --- otro libro (Excel oficial) -----------------------------------------

/**
 * Pestañas de OTRO libro, como matrices de valores sin interpretar.
 *
 * Aparte de getSheet_ a propósito: esas hojas son planas (encabezado en
 * la fila 1) y esta lectura no lo es; el parser de cada formato decide
 * qué fila es cada cosa. Sigue siendo esta capa la única que toca
 * SpreadsheetApp / Sheets API.
 *
 * @param {string} libroId
 * @param {function(string):boolean} quiere  filtro por nombre de pestaña
 * @return {Array<{nombre: string, matriz: Array<Array>}>}
 */
function leerPestanasDeLibro_(libroId, quiere) {
  if (sheetsApiDisponible_()) {
    try {
      var meta = Sheets.Spreadsheets.get(libroId, { fields: 'sheets.properties.title' });
      var nombres = (meta.sheets || [])
        .map(function (s) { return s.properties.title; })
        .filter(quiere);
      if (nombres.length === 0) return [];

      var resp = Sheets.Spreadsheets.Values.batchGet(libroId, {
        ranges: nombres.map(rangoDeHoja_),
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
        majorDimension: 'ROWS',
      });
      var rangos = (resp && resp.valueRanges) || [];
      if (rangos.length === nombres.length) {
        return nombres.map(function (n, i) { return { nombre: n, matriz: rangos[i].values || [] }; });
      }
      Logger.log('batchGet del libro oficial devolvió ' + rangos.length + ' rangos para ' + nombres.length + '. Se lee con SpreadsheetApp.');
    } catch (e) {
      Logger.log('Sheets API falló en el libro oficial: ' + e + '. Se lee con SpreadsheetApp.');
    }
  }

  return SpreadsheetApp.openById(libroId).getSheets()
    .filter(function (h) { return quiere(h.getName()); })
    .map(function (h) { return { nombre: h.getName(), matriz: h.getDataRange().getValues() }; });
}
