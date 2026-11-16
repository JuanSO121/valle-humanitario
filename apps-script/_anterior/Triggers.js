/**
 * Triggers.gs
 * -----------------------------------------------------------------------
 * Invalida la caché sola cuando cambia el Excel.
 *
 * El problema que resuelve: CONFIG.CACHE.TTL_SECONDS son 6 horas, así
 * que una corrección hecha a las 10 de la mañana puede no verse hasta
 * las 4 de la tarde. La solución hasta ahora era acordarse de correr
 * limpiarCache() a mano después de cada edición, y eso falla siempre,
 * porque quien edita la hoja no suele ser quien abre Apps Script.
 *
 * INSTALACIÓN, una sola vez
 *
 * 1. Pegar este archivo en el proyecto de Apps Script.
 *
 * 2. Seleccionar instalarDisparador en el desplegable y Ejecutar. Va a
 *    pedir permisos la primera vez.
 *
 * 3. Verificar en Activadores, el ícono del reloj en la barra
 *    izquierda, que aparezca uno para alCambiarLaHoja.
 *
 * Desde ahí, cada edición del Excel invalida la caché en el acto y la
 * siguiente carga del tablero trae el dato nuevo.
 *
 * NOTA sobre el TTL: con esto, dejarlo en 6 horas ya no molesta, porque
 * la invalidación no depende de que expire. Sigue actuando como red de
 * seguridad si el disparador falla o alguien edita la hoja por fuera de
 * la interfaz.
 * -----------------------------------------------------------------------
 */

var NOMBRE_DISPARADOR = 'alCambiarLaHoja';

/**
 * Se ejecuta con cada cambio en el archivo. Solo sube la versión de
 * caché, que es una escritura en ScriptProperties: barato incluso si
 * alguien está editando muchas celdas seguidas.
 */
function alCambiarLaHoja() {
  limpiarCache();
}

function instalarDisparador() {
  var existentes = ScriptApp.getProjectTriggers();

  for (var i = 0; i < existentes.length; i++) {
    if (existentes[i].getHandlerFunction() === NOMBRE_DISPARADOR) {
      Logger.log('El disparador ya existe. No se crea otro.');
      return 'ya existía';
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger(NOMBRE_DISPARADOR).forSpreadsheet(ss).onChange().create();

  Logger.log('Disparador instalado. La caché se invalida sola con cada cambio del Excel.');
  return 'instalado';
}

/** Por si hay que desactivarlo. */
function quitarDisparador() {
  var existentes = ScriptApp.getProjectTriggers();
  var quitados = 0;

  for (var i = 0; i < existentes.length; i++) {
    if (existentes[i].getHandlerFunction() === NOMBRE_DISPARADOR) {
      ScriptApp.deleteTrigger(existentes[i]);
      quitados += 1;
    }
  }

  Logger.log('Disparadores quitados: ' + quitados);
  return quitados;
}