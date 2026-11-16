/**
 * Precalentar.gs
 * -----------------------------------------------------------------------
 * REEMPLAZA A Triggers.gs. Borrar Triggers.gs antes de pegar este
 * archivo: los dos declaran alCambiarLaHoja y Apps Script no avisa.
 *
 * EL PROBLEMA
 *
 * alCambiarLaHoja llamaba limpiarCache() en CADA cambio del Excel.
 * Mientras alguien edita, la caché queda vacía casi todo el tiempo, y el
 * siguiente visitante del tablero paga la carga completa: leer nueve
 * hojas y armar todo, varias veces en paralelo.
 *
 * LA SOLUCIÓN: "servir lo viejo mientras se arma lo nuevo"
 *
 *   1. Editar el Excel solo anota que hay cambios pendientes. Barato.
 *   2. Cada 5 minutos, precalentarSiHaceFalta() revisa esa marca. Si hay
 *      cambios y pasó al menos un minuto sin ediciones, arma TODAS las
 *      respuestas en una versión nueva de la caché.
 *   3. Recién cuando la versión nueva está completa, se publica. Los
 *      visitantes pasan de la versión vieja a la nueva sin encontrar
 *      nunca la caché vacía.
 *   4. Aunque no haya cambios, la caché se rearma antes de que venzan
 *      las 6 h del TTL, así nunca expira sola.
 *
 * Costo: una edición tarda hasta ~6 minutos en verse. Para verla ya,
 * ejecutar precalentarAhora().
 *
 * INSTALACIÓN, una sola vez
 *
 *   Ejecutar instalarDisparadores() y verificar en Activadores que
 *   aparezcan alCambiarLaHoja (al cambiar) y precalentarSiHaceFalta
 *   (cada 5 minutos). Después, precalentarAhora() para arrancar.
 * -----------------------------------------------------------------------
 */

var PROP_PENDIENTE = 'CACHE_PENDIENTE';
var PROP_CALENTADO_EN = 'CACHE_CALENTADO_EN';
var PROP_CALENTANDO_DESDE = 'CACHE_CALENTANDO_DESDE';

var ESPERA_TRAS_EDICION_MS = 60 * 1000;
var REFRESCO_PREVENTIVO_MS = 5 * 60 * 60 * 1000; // antes de las 6 h del TTL
var CALENTADO_MAXIMO_MS = 5 * 60 * 1000;         // guarda contra ejecuciones colgadas

/** Disparador onChange: solo anota. */
function alCambiarLaHoja() {
  PropertiesService.getScriptProperties().setProperty(PROP_PENDIENTE, String(Date.now()));
}

/** Disparador cada 5 minutos. Sin cambios, cuesta una lectura de propiedades. */
function precalentarSiHaceFalta() {
  var p = PropertiesService.getScriptProperties().getProperties();
  var ahora = Date.now();

  var pendiente = Number(p[PROP_PENDIENTE] || 0);
  var calentadoEn = Number(p[PROP_CALENTADO_EN] || 0);

  var hayCambiosQuietos = pendiente > 0 && ahora - pendiente >= ESPERA_TRAS_EDICION_MS;
  var porVencer = ahora - calentadoEn >= REFRESCO_PREVENTIVO_MS;

  if (!hayCambiosQuietos && !porVencer) return 'sin trabajo';
  return precalentar_(pendiente);
}

/** Para ejecutar a mano: publica los datos nuevos sin dejar la caché vacía. */
function precalentarAhora() {
  var pendiente = Number(PropertiesService.getScriptProperties().getProperty(PROP_PENDIENTE) || 0);
  return precalentar_(pendiente);
}

function precalentar_(marcaPendiente) {
  var props = PropertiesService.getScriptProperties();

  var desde = Number(props.getProperty(PROP_CALENTANDO_DESDE) || 0);
  if (desde && Date.now() - desde < CALENTADO_MAXIMO_MS) {
    Logger.log('Ya hay un precalentado en curso.');
    return 'en curso';
  }
  props.setProperty(PROP_CALENTANDO_DESDE, String(Date.now()));

  try {
    var inicio = Date.now();
    resetSheetCache_();

    var versionNueva = String(Number(cacheVersion_()) + 1);
    var respuestas = llenarVersion_(versionNueva);

    // Publicar: desde acá, todas las peticiones leen la versión nueva.
    props.setProperty(CACHE_VERSION_PROP, versionNueva);
    _cacheVersion_ = versionNueva;

    // Solo se borra la marca si nadie editó mientras se armaba. Si hubo
    // ediciones, la marca cambió y la próxima corrida vuelve a armar.
    var actual = props.getProperty(PROP_PENDIENTE);
    if (actual !== null && Number(actual) === marcaPendiente) {
      props.deleteProperty(PROP_PENDIENTE);
    }

    var msg = 'Publicada v' + versionNueva + ': ' + Object.keys(respuestas).length +
      ' respuestas en ' + (Date.now() - inicio) + ' ms.';
    Logger.log(msg);
    return msg;
  } finally {
    props.deleteProperty(PROP_CALENTANDO_DESDE);
  }
}

/**
 * Arma todas las respuestas del tablero, con UNA lectura del Excel.
 * @return {Object} routeKey -> texto JSON
 */
function construirTodasLasRespuestas_() {
  // Los libros se leen en el primer build*: el cálculo de despachos se
  // memoiza por ejecución y las demás rutas lo reutilizan.
  var salida = {};
  var todasBien = true;

  RUTAS_BUNDLE_.forEach(function (nombre) {
    try {
      salida[nombre] = JSON.stringify(RUTAS_[nombre]());
    } catch (err) {
      todasBien = false;
      Logger.log('No se pudo armar ' + nombre + ': ' + err);
    }
  });

  // Un bundle con huecos no se cachea: se arma a pedido y el error queda
  // visible en vez de quedar congelado seis horas.
  if (todasBien) salida.bundle = componerBundle_(salida);

  return salida;
}

/** Arma todo y lo escribe en la caché bajo la versión indicada. */
function llenarVersion_(version) {
  var respuestas = construirTodasLasRespuestas_();

  var entradas = {};
  Object.keys(respuestas).forEach(function (routeKey) {
    agregarEntradas_(entradas, claveConVersion_(version, routeKey), respuestas[routeKey]);
  });
  // La marca va al final: solo existe si todo lo anterior se escribió.
  entradas[claveConVersion_(version, CACHE_MARCA_COMPLETA)] = '1';

  guardarEntradas_(CacheService.getScriptCache(), entradas);
  PropertiesService.getScriptProperties().setProperty(PROP_CALENTADO_EN, String(Date.now()));
  return respuestas;
}

// --- disparadores -------------------------------------------------------

var HANDLERS_CACHE_ = ['alCambiarLaHoja', 'precalentarSiHaceFalta'];

function instalarDisparadores() {
  quitarDisparadores();

  // Un onChange POR LIBRO que alimenta el tablero. Con uno solo, una
  // edición en el libro de despachos, el de contratación o la plantilla no marcaría
  // cambios pendientes y se vería recién en el refresco preventivo (hasta
  // 5 h después). Requiere permiso de edición sobre cada libro; si falta
  // en alguno, se avisa y se sigue con los demás.
  var ids = {};
  [idLibroOficial_(), idLibroContratacion_(), idLibroFaltantes_()].forEach(function (id) {
    if (id) ids[id] = true;
  });

  var fallidos = [];
  Object.keys(ids).forEach(function (id) {
    try {
      ScriptApp.newTrigger('alCambiarLaHoja').forSpreadsheet(id).onChange().create();
    } catch (err) {
      fallidos.push(id + ' (' + err + ')');
    }
  });
  ScriptApp.newTrigger('precalentarSiHaceFalta').timeBased().everyMinutes(5).create();

  if (fallidos.length > 0) {
    Logger.log('SIN disparador en: ' + fallidos.join('; ') + '. Sus ediciones no invalidan la caché: ' +
      'correr precalentarAhora() tras editarlos.');
  }
  Logger.log('Disparadores instalados en ' + (Object.keys(ids).length - fallidos.length) +
    ' libro(s). Ejecutar precalentarAhora() para arrancar.');
  return fallidos.length ? 'instalados con avisos' : 'instalados';
}

/** Nombre anterior, por compatibilidad. */
function instalarDisparador() {
  return instalarDisparadores();
}

function quitarDisparadores() {
  var quitados = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (HANDLERS_CACHE_.indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
      quitados += 1;
    }
  });
  Logger.log('Disparadores quitados: ' + quitados);
  return quitados;
}

// --- medición -----------------------------------------------------------

/**
 * Mide cada ruta y su tamaño. Ejecutar antes y después de un cambio para
 * comparar con números reales.
 */
function medirRendimiento() {
  var lineas = ['RENDIMIENTO'];
  var t = Date.now();

  function marca(nombre) {
    var ahora = Date.now();
    var ms = String(ahora - t);
    while (ms.length < 7) ms = ' ' + ms;
    lineas.push(ms + ' ms  ' + nombre);
    t = ahora;
  }

  resetSheetCache_();
  lineas.push('  Lectura: ' + (sheetsApiDisponible_() ? 'Sheets API (batchGet)' : 'SpreadsheetApp (respaldo)'));

  RUTAS_BUNDLE_.forEach(function (nombre) {
    try {
      var texto = JSON.stringify(RUTAS_[nombre]());
      marca('ruta ' + nombre + '  (' + Math.round(texto.length / 1024) + ' KB, ' +
        Math.round(comprimir_(texto).length / 1024) + ' KB comprimido)');
    } catch (err) {
      marca('ruta ' + nombre + '  FALLA: ' + err);
    }
  });

  var salida = lineas.join('\n');
  Logger.log(salida);
  return salida;
}
