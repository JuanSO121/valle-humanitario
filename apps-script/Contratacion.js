/**
 * Contratacion.gs
 * -----------------------------------------------------------------------
 * GET ?route=contratacion
 *
 * Alimenta la sección "La contratación de la reconstrucción" desde la
 * hoja CONTRATACION: una fila por contrato, tal como lo publica la
 * entidad contratante.
 *
 * PASOS PARA INSTALARLO
 *
 * 1. Crear la hoja CONTRATACION en el Excel (columnas y reglas de carga
 *    en apps-script/CONTRATACION.md).
 * 2. Pegar este archivo en el proyecto de Apps Script, junto con los
 *    cambios en Config.gs, Dataset.gs, Code.gs y Precalentar.gs.
 * 3. Republicar con Nueva versión y correr precalentarAhora().
 *
 * Mientras la hoja no exista la ruta responde una lista vacía y el sitio
 * simplemente no muestra la sección: desplegar el código antes que el
 * Excel no rompe nada.
 *
 * REGLA DE ESTE ARCHIVO: NO COMPLETAR NADA
 *
 * Lo que no viene en la hoja queda null. Un valor sin informar NO es
 * cero (sumaría como si el contrato fuera gratis), un enlace que no es
 * una URL NO se arregla, y un contratista vacío NO se deduce de otra
 * fila. Lo que no se puede publicar bien se omite o se deja en null, y
 * se avisa en el log (ver revisarContratacion).
 *
 * POR QUÉ LAS ADVERTENCIAS NO VIAJAN EN LA RESPUESTA
 *
 * Son para quien carga la hoja, no para quien lee el sitio: hablan de
 * números de fila. Se consultan corriendo revisarContratacion() desde el
 * editor, que es donde está quien las puede corregir.
 * -----------------------------------------------------------------------
 */

/** Solo http(s): un esquema como javascript: nunca debe llegar a un href. */
var RE_URL_SECOP_ = /^https?:\/\/[^\s]+$/i;

/**
 * Las filas de la hoja CONTRATACION, esté donde esté: en su propio libro
 * (propiedad LIBRO_CONTRATACION_ID) o en el libro base. El resto de este
 * archivo no sabe de dónde vienen las filas.
 */
function filasDeContratacion_() {
  var libroId = idLibroContratacion_();
  var nombre = CONFIG.SHEETS.CONTRATACION;
  if (!libroId) throw new Error('No existe la hoja "' + nombre + '": no hay libro de contratación configurado.');

  var pestanas = leerPestanasDeLibro_(libroId, function (n) { return n === nombre; });
  if (pestanas.length === 0) throw new Error('No existe la hoja "' + nombre + '" en el libro de contratación.');
  return filasAObjetos_(pestanas[0].matriz, null);
}

/**
 * Lee la hoja y separa lo publicable de lo que hay que corregir.
 * @return {{contratos: Array, advertencias: Array<string>}}
 */
function leerContratacion_() {
  var advertencias = [];
  var filas;

  try {
    filas = filasDeContratacion_();
  } catch (err) {
    // Solo la hoja inexistente se tolera. Cualquier otro fallo (cuota,
    // permisos) tiene que verse, no disfrazarse de "sin contratos".
    if (!/No existe la hoja/.test(String(err && err.message ? err.message : err))) throw err;
    Logger.log('CONTRATACION: la hoja no existe todavía. Se responde sin contratos.');
    return { contratos: [], advertencias: ['La hoja CONTRATACION no existe.'] };
  }

  var contratos = [];
  var vistos = {};

  filas.forEach(function (f) {
    var donde = 'fila ' + f.__row + ': ';
    var id = textoOrNull_(f.contratacion_id);
    var objeto = textoOrNull_(f.objeto);

    // Sin id no hay clave estable; sin objeto no hay nada que contarle a
    // la gente. En los dos casos la fila no se puede publicar.
    if (!id) {
      advertencias.push(donde + 'sin contratacion_id. Fila omitida.');
      return;
    }
    if (vistos[id]) {
      advertencias.push(donde + 'contratacion_id "' + id + '" repetido (ya está en la fila ' + vistos[id] + '). Fila omitida.');
      return;
    }
    if (!objeto) {
      advertencias.push(donde + id + ' sin objeto. Fila omitida.');
      return;
    }
    vistos[id] = f.__row;

    contratos.push({
      id: id,
      dependencia: textoOrNull_(f.dependencia),
      objeto: objeto,
      valorInicial: valorInicial_(f.valor_inicial, donde + id + ': ', advertencias),
      contratista: textoOrNull_(f.contratista),
      enlaceSecop: enlaceSecop_(f.enlace_secop, donde + id + ': ', advertencias),
    });
  });

  return { contratos: contratos, advertencias: advertencias };
}

function buildContratacion_() {
  var leido = leerContratacion_();
  var contratos = leido.contratos;

  var total = 0;
  var sinValor = 0;
  contratos.forEach(function (c) {
    if (c.valorInicial === null) sinValor += 1;
    else total += c.valorInicial;
  });

  return {
    // Cuándo se armó esta respuesta, NO la fecha de los contratos: la
    // hoja no trae fecha y no se inventa una. No usar como "datos al".
    actualizadoEn: new Date().toISOString(),
    totalContratos: contratos.length,
    // Suma solo de lo informado. `sinValorInformado` dice cuántos
    // contratos quedaron fuera de esa suma, para que el total no se lea
    // como completo cuando no lo es.
    valorTotalInformado: round2_(total),
    sinValorInformado: sinValor,
    contratos: contratos,
    fuente: 'CONTRATACION',
  };
}

/** Para ejecutar desde el editor después de cargar la hoja. */
function revisarContratacion() {
  resetSheetCache_();
  var leido = leerContratacion_();
  var lineas = ['CONTRATACION: ' + leido.contratos.length + ' contratos publicables, ' +
    leido.advertencias.length + ' advertencias.'];
  leido.advertencias.forEach(function (a) { lineas.push('  · ' + a); });
  var salida = lineas.join('\n');
  Logger.log(salida);
  return salida;
}

// --- celdas -------------------------------------------------------------

/**
 * Valor en pesos. Solo se acepta lo que Sheets entrega como número: un
 * texto como "$1.300.000.000" depende de si el punto es miles o decimal,
 * y adivinar ahí cambia la cifra por un factor de mil sin avisar.
 */
function valorInicial_(celda, donde, advertencias) {
  if (isBlank_(celda)) return null;

  if (typeof celda !== 'number' || !isFinite(celda)) {
    advertencias.push(donde + 'valor_inicial "' + celda + '" no es un número. Se publica sin valor. ' +
      'Escribirlo como número, sin "$" ni puntos.');
    return null;
  }
  if (celda < 0) {
    advertencias.push(donde + 'valor_inicial negativo (' + celda + '). Se publica sin valor.');
    return null;
  }
  return celda;
}

function enlaceSecop_(celda, donde, advertencias) {
  var url = textoOrNull_(celda);
  if (url === null) return null;

  if (!RE_URL_SECOP_.test(url)) {
    advertencias.push(donde + 'enlace_secop no es una URL http(s) completa ("' + url + '"). Se publica sin enlace.');
    return null;
  }
  return url;
}
