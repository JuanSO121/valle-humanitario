/**
 * Prueba.gs — SOLO para probar el backend nuevo sin tocar el Web App real.
 * -----------------------------------------------------------------------
 * Proyecto de Apps Script APARTE (autónomo o enlazado a cualquier Sheet).
 * Archivos a pegar, de la carpeta apps-script/, sin cambios:
 *
 *   Config.js  Utils.js  Sheetservice.js  Catalogo42.js  Despachos.js
 *   Faltantes.js  Contratacion.js  +  este archivo
 *
 * NO pegar nada de migracion/ ni de _anterior/: son reglas de carga y el
 * backend anterior, y varios declaran funciones con el mismo nombre que
 * los nuevos (Apps Script no avisa cuál gana).
 *
 * Y en appsscript.json, el servicio avanzado Sheets (v4). Sin él todo
 * funciona, pero lee pestaña por pestaña.
 *
 * Propiedades del script (docs/01-apps-script-de-prueba.md):
 *   LIBRO_OFICIAL_ID (obligatoria), LIBRO_CONTRATACION_ID, LIBRO_FALTANTES_ID
 *
 * Este archivo NO se pega en el proyecto real.
 * -----------------------------------------------------------------------
 */
var RUTAS_PRUEBA_ = {
  resumen: function () { return buildResumen_(); },
  municipios: function () { return buildMunicipios_(); },
  otras: function () { return buildOtras_(); },
  categorias: function () { return buildCategorias_(); },
  faltantes: function () { return buildFaltantes_(); },
  contratacion: function () { return buildContratacion_(); },
};

/** Todas las rutas en una respuesta, igual que el bundle real (sin caché). */
function bundlePrueba_() {
  var out = {};
  Object.keys(RUTAS_PRUEBA_).forEach(function (n) { out[n] = RUTAS_PRUEBA_[n](); });
  return out;
}

function doGet(e) {
  resetSheetCache_();
  var route = e && e.parameter && e.parameter.route;
  if (route === 'bundle') return jsonResponse_(bundlePrueba_());
  if (!Object.prototype.hasOwnProperty.call(RUTAS_PRUEBA_, route)) {
    return errorResponse_(
      'Proyecto de prueba: solo existen bundle, ' + Object.keys(RUTAS_PRUEBA_).join(', ') + '.', 404);
  }
  return jsonResponse_(RUTAS_PRUEBA_[route]());
}

/** Correr desde el editor antes de desplegar: confirma que los libros se leen. */
function probar() {
  resetSheetCache_();
  var lineas = [];
  lineas.push('Libro oficial: ' + idLibroOficial_());
  lineas.push('Libro contratación: ' + (idLibroContratacion_() || '(el base)'));
  lineas.push('');
  lineas.push(revisarDespachos());
  lineas.push('');
  lineas.push(revisarContratacion());
  lineas.push('');
  lineas.push(revisarFaltantes());

  var salida = lineas.join('\n');
  Logger.log(salida);
  return salida;
}
