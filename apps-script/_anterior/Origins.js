/**
 * Origins.gs
 * -----------------------------------------------------------------------
 * El Excel no trae un catálogo de orígenes: se infiere de DESPACHOS.canal.
 * Esta es la única función que debe tocarse si en el futuro aparece un
 * tercer punto de acopio real con coordenada propia.
 * -----------------------------------------------------------------------
 */

function resolveOrigenId_(canal) {
  var id = CONFIG.ORIGENES[canal];
  return id || 'ORI-DESCONOCIDO';
}

function getOrigenCatalogo_() {
  return CONFIG.ORIGEN_CATALOGO;
}

function getOrigenById_(id) {
  for (var i = 0; i < CONFIG.ORIGEN_CATALOGO.length; i++) {
    if (CONFIG.ORIGEN_CATALOGO[i].id === id) return CONFIG.ORIGEN_CATALOGO[i];
  }
  return null;
}