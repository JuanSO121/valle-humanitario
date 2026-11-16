/**
 * Dataset.gs
 * -----------------------------------------------------------------------
 * Carga catálogos y hechos UNA vez por ejecución, con todas las hojas
 * pedidas en una sola llamada.
 *
 * Antes, cada ruta llamaba loadCatalogs_() y loadFacts_() por su cuenta.
 * Dentro de un doGet no importaba (una ruta por request), pero al
 * precalentar todas las rutas juntas se habría reconstruido el dataset
 * más de cien veces.
 * -----------------------------------------------------------------------
 */

var _catalogs_ = null;
var _dataset_ = null;

function resetDataset_() {
  _catalogs_ = null;
  _dataset_ = null;
}

function hojasDeCatalogo_() {
  var S = CONFIG.SHEETS;
  return [S.CAT_MUNICIPIOS, S.CAT_DESTINOS, S.CAT_CATEGORIAS, S.CAT_POBLACIONES, S.BD_DOCUMENTOS];
}

function hojasDeHechos_() {
  var S = CONFIG.SHEETS;
  return hojasDeCatalogo_().concat([
    S.DESPACHOS,
    S.DESPACHO_DESTINO,
    S.DESPACHO_POBLACION,
    S.ENVIOS_CATEGORIA,
    S.DETALLE_PRODUCTO,
  ]);
}

/**
 * Hojas opcionales, en su propia llamada: si una falta, no arrastra a
 * las obligatorias al camino lento.
 */
function hojasOpcionales_() {
  var S = CONFIG.SHEETS;
  return [S.TONELADAS, S.NECESIDADES_ACOPIO];
}

/**
 * Contratación va en su propia llamada y no en hojasOpcionales_: es una
 * hoja nueva que puede no existir todavía en el Excel de un entorno, y
 * batchGet falla completo si falta una sola. Aislada, su ausencia no
 * manda a TONELADAS y NECESIDADES_ACOPIO al camino lento.
 */
function hojasDeContratacion_() {
  // Con libro propio, precargarla acá la pediría al libro equivocado.
  return idLibroContratacion_() ? [] : [CONFIG.SHEETS.CONTRATACION];
}

function getCatalogs_() {
  if (_catalogs_ === null) {
    precargarHojas_(hojasDeCatalogo_());
    _catalogs_ = loadCatalogs_();
  }
  return _catalogs_;
}

function getDataset_() {
  if (_dataset_ === null) {
    precargarHojas_(hojasDeHechos_());
    var catalogs = getCatalogs_();
    _dataset_ = { catalogs: catalogs, facts: loadFacts_(catalogs) };
  }
  return _dataset_;
}