/**
 * Code.gs
 * -----------------------------------------------------------------------
 * Único punto de entrada HTTP. Ruteo por query param `route`:
 *
 *   GET ?route=bundle        (TODO el tablero en una petición)
 *   GET ?route=resumen       totales, fecha de corte, calidad
 *   GET ?route=municipios    los 42, con toneladas y categorías
 *   GET ?route=otras         fundaciones, otros departamentos, entidades
 *   GET ?route=categorias    las 7 categorías
 *   GET ?route=faltantes     «¿Qué hace falta hoy?» (plantilla)
 *   GET ?route=contratacion  contratos de la reconstrucción
 *
 * Las rutas viven en una tabla (RUTAS_) que comparten doGet y el
 * precalentado, así una ruta nueva queda cacheada y precalentada sin
 * tocar dos lugares.
 *
 * `bundle` existe porque cada petición a un Web App de Apps Script
 * tiene un costo fijo (arranque + redirección a googleusercontent) que
 * no se puede optimizar desde el código. Seis peticiones pagan ese
 * costo seis veces; una sola, una vez.
 * -----------------------------------------------------------------------
 */

var RUTAS_ = {
  resumen: function () { return buildResumen_(); },
  municipios: function () { return buildMunicipios_(); },
  otras: function () { return buildOtras_(); },
  categorias: function () { return buildCategorias_(); },
  faltantes: function () { return buildFaltantes_(); },
  contratacion: function () { return buildContratacion_(); },
};

var RUTAS_BUNDLE_ = Object.keys(RUTAS_);

/** Arma el bundle concatenando textos ya serializados, sin re-parsear. */
function componerBundle_(textos) {
  return '{' + RUTAS_BUNDLE_.map(function (nombre) {
    return JSON.stringify(nombre) + ':' + (textos[nombre] || 'null');
  }).join(',') + '}';
}

function construirBundle_() {
  var textos = {};
  RUTAS_BUNDLE_.forEach(function (nombre) {
    textos[nombre] = withCacheTexto_(nombre, RUTAS_[nombre]);
  });
  return componerBundle_(textos);
}

function doGet(e) {
  resetSheetCache_();

  try {
    var params = (e && e.parameter) || {};
    var route = params.route;

    if (!route) {
      return errorResponse_(
        'Falta el parámetro "route". Rutas disponibles: bundle, ' + RUTAS_BUNDLE_.join(', ') + '.',
        400
      );
    }

    if (route === 'bundle') {
      return jsonTextResponse_(withCacheTexto_('bundle', construirBundle_));
    }

    if (Object.prototype.hasOwnProperty.call(RUTAS_, route)) {
      return jsonTextResponse_(withCacheTexto_(route, RUTAS_[route]));
    }

    return errorResponse_('Ruta "' + route + '" no reconocida.', 404);
  } catch (err) {
    Logger.log('Error en doGet: ' + (err && err.stack ? err.stack : err));
    return errorResponse_('Error interno al procesar la solicitud.', 500);
  }
}
