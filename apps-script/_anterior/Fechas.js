/**
 * Fechas.gs
 * -----------------------------------------------------------------------
 * Reemplaza a toIsoDateOrNull_ de Utils.gs.
 *
 * BORRAR toIsoDateOrNull_ DE Utils.gs ANTES DE PEGAR ESTE ARCHIVO. Apps
 * Script no avisa cuando dos archivos declaran la misma función: gana la
 * última que carga, y terminás ejecutando una versión distinta de la que
 * estás leyendo.
 *
 * EL BUG QUE CORRIGE
 *
 * La versión anterior formateaba con la zona escrita a mano:
 *
 *     Utilities.formatDate(value, 'America/Bogota', 'yyyy-MM-dd');
 *
 * Cuando una celda tiene formato de fecha, Sheets la devuelve como
 * medianoche EN LA ZONA DEL ARCHIVO. Si el archivo está en una zona
 * distinta de Bogotá, esa medianoche cae en la tarde del día anterior al
 * convertirla, y toda fecha retrocede un día.
 *
 * El síntoma: una fila escrita como 2026-08-26 se leía como 2026-08-25,
 * y el rango completo de la operación aparecía corrido, empezando el
 * mismo día del terremoto en vez del día siguiente.
 *
 * La corrección de fondo está en SheetService.gs: las fechas se leen por
 * el texto visible de la celda, así que ya no hay conversión de zona ni
 * corrimiento posible. Este archivo solo normaliza ese texto a ISO.
 *
 * zonaDelArchivo_ queda como respaldo por si alguna celda llega igual
 * como Date, y verificarFechas() sigue siendo la forma de comprobar que
 * lo leído coincide con lo escrito.
 * -----------------------------------------------------------------------
 */

/**
 * Zona horaria del archivo, leída una vez por request. Es una llamada a
 * SpreadsheetApp y esta función corre por cada celda de fecha de todas
 * las hojas.
 */
var _zonaDelArchivo_ = null;

/**
 * Cadena de respaldo, porque getSpreadsheetTimeZone() no siempre
 * devuelve un texto utilizable: según cómo se haya creado el archivo
 * puede venir vacío, y formatDate exige String o lanza
 * "Invalid argument: timeZone".
 *
 *   1. La zona del archivo, que es la correcta.
 *   2. La del proyecto de Apps Script.
 *   3. America/Bogota, que es donde opera la Gobernación.
 *
 * Si cae al tercer nivel y la zona real es otra, las fechas vuelven a
 * correrse. verificarFechas() lo detecta.
 */
function zonaDelArchivo_() {
  if (_zonaDelArchivo_ !== null) return _zonaDelArchivo_;

  var candidatas = [];

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) candidatas.push(ss.getSpreadsheetTimeZone());
  } catch (e) {
    // Sin archivo activo, por ejemplo en una ejecución suelta.
  }

  try {
    candidatas.push(Session.getScriptTimeZone());
  } catch (e) {
    // Ignorar.
  }

  candidatas.push('America/Bogota');

  for (var i = 0; i < candidatas.length; i++) {
    var z = candidatas[i];
    if (typeof z === 'string' && z.length > 0) {
      _zonaDelArchivo_ = z;
      return _zonaDelArchivo_;
    }
  }

  _zonaDelArchivo_ = 'America/Bogota';
  return _zonaDelArchivo_;
}

/**
 * Convierte una celda a fecha ISO yyyy-MM-dd.
 *
 * Con el SheetService nuevo, las fechas llegan como el TEXTO que muestra
 * la celda, así que acá solo hay que normalizar el formato. Ya no se
 * convierte entre zonas horarias, que era el origen del corrimiento de
 * un día.
 *
 * Formatos que reconoce:
 *   2026-08-26   ISO, se devuelve tal cual
 *   26/08/2026   día primero, el formato de Colombia
 *   26-08-2026   igual, con guiones
 *
 * Si llega un Date, cosa que ya no debería pasar, se formatea con la
 * zona del archivo como respaldo.
 */
function toIsoDateOrNull_(value) {
  if (isBlank_(value)) return null;

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, zonaDelArchivo_(), 'yyyy-MM-dd');
  }

  var texto = String(value).trim();

  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(texto)) return texto;

  // Día primero, que es como se escribe en Colombia.
  var partes = texto.match(/^([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-]([0-9]{4})$/);
  if (partes) {
    var dia = partes[1].length === 1 ? '0' + partes[1] : partes[1];
    var mes = partes[2].length === 1 ? '0' + partes[2] : partes[2];
    return partes[3] + '-' + mes + '-' + dia;
  }

  // Formato desconocido: se devuelve tal cual para que quede visible en
  // el diagnóstico en vez de convertirse en null silencioso.
  return texto;
}

/**
 * Verifica que las fechas se estén leyendo bien.
 *
 * Compara, para las últimas filas de DESPACHOS, lo que muestra la celda
 * contra lo que el backend interpreta. Si las dos columnas no coinciden,
 * hay un problema de zona horaria y todo el tablero va a mostrar el día
 * equivocado.
 *
 * Ejecutar desde el editor y leer el log.
 */
function verificarFechas() {
  resetSheetCache_();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lineas = [];

  var zonaArchivo = ss.getSpreadsheetTimeZone();
  var zonaProyecto = Session.getScriptTimeZone();

  lineas.push('ZONAS HORARIAS');
  lineas.push('  Del archivo: ' + zonaArchivo + '  (tipo: ' + typeof zonaArchivo + ')');
  lineas.push('  Del proyecto: ' + zonaProyecto + '  (tipo: ' + typeof zonaProyecto + ')');
  lineas.push('  La que se está usando: ' + zonaDelArchivo_());

  if (typeof zonaArchivo !== 'string' || !zonaArchivo) {
    lineas.push('  El archivo no reporta zona horaria válida. Se está usando el');
    lineas.push('  respaldo. Conviene fijarla en Archivo, Configuración,');
    lineas.push('  Zona horaria.');
  } else if (zonaArchivo !== zonaProyecto) {
    lineas.push('  Las dos no coinciden. Con esta corrección funciona igual, pero');
    lineas.push('  conviene igualarlas en Configuración del proyecto.');
  }

  var hoja = ss.getSheetByName(CONFIG.SHEETS.DESPACHOS);
  var ultimaFila = hoja.getLastRow();
  var encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];

  var colFecha = -1;
  for (var i = 0; i < encabezados.length; i++) {
    if (String(encabezados[i]).trim() === 'fecha') colFecha = i + 1;
  }

  if (colFecha === -1) {
    lineas.push('');
    lineas.push('No se encontró la columna "fecha" en DESPACHOS.');
    Logger.log(lineas.join('\n'));
    return lineas.join('\n');
  }

  var desde = Math.max(2, ultimaFila - 7);
  var cantidad = ultimaFila - desde + 1;
  var crudas = hoja.getRange(desde, colFecha, cantidad, 1).getValues();
  var mostradas = hoja.getRange(desde, colFecha, cantidad, 1).getDisplayValues();

  lineas.push('');
  lineas.push('ÚLTIMAS FILAS DE DESPACHOS');
  lineas.push('  fila | lo que muestra la celda | lo que lee el backend');

  var desajustes = 0;
  for (var f = 0; f < crudas.length; f++) {
    var interpretada = toIsoDateOrNull_(crudas[f][0]);
    var mostrada = String(mostradas[f][0]).trim();
    var marca = '';

    // Comparación tolerante: la celda puede mostrarse como 26/08/2026 y
    // el backend devolver 2026-08-26. Lo que importa es el día.
    var diaMostrado = mostrada.replace(/[^0-9]/g, '');
    var diaLeido = (interpretada || '').replace(/[^0-9]/g, '');
    if (diaMostrado && diaLeido && diaMostrado !== diaLeido) {
      marca = '  <-- NO COINCIDE';
      desajustes += 1;
    }

    lineas.push('  ' + (desde + f) + ' | ' + mostrada + ' | ' + interpretada + marca);
  }

  lineas.push('');
  if (desajustes === 0) {
    lineas.push('Las fechas se leen igual que como están escritas.');
  } else {
    lineas.push(desajustes + ' fila(s) no coinciden. Todo el tablero está mostrando');
    lineas.push('el día equivocado. Revisar que este archivo haya reemplazado a');
    lineas.push('toIsoDateOrNull_ de Utils.gs y que la vieja esté borrada.');
  }

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}