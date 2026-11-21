/**
 * Admin.gs
 * -----------------------------------------------------------------------
 * POST — la carga de datos desde la página protegida /admin.
 *
 * Una persona sube un archivo JSON (lo prepara una IA a partir de la
 * plantilla del DADI), mira los datos como tabla y, si están bien, se
 * cargan al libro. Hay dos acciones:
 *
 *   revisar   NO escribe nada. Valida el archivo contra el libro y devuelve
 *             lo que pasaría fila por fila. Es lo que se ve como tabla.
 *   aplicar   Vuelve a validar (no confía en la revisión) y escribe.
 *
 * QUÉ SE ESCRIBE Y CÓMO
 *
 *   distribucion        Se AGREGA al final de DESPACHOS. Una fila que ya está
 *                       en el libro (misma fecha, destino, familia, producto y
 *                       peso) no se repite: así se puede volver a subir un
 *                       archivo acumulado sin duplicar. Una fila que corresponde
 *                       a un despacho pendiente del 11 al 24 de agosto (con
 *                       fecha y destino, sin peso) lo COMPLETA en su lugar.
 *   queHaceFalta        REEMPLAZA la lista: es la foto de hoy, no un historial.
 *   informacionGeneral  Cambia solo las cifras que vienen; lo que no viene no se
 *                       toca.
 *
 * SEGURIDAD
 *
 * El Web App es público, así que lo único que protege la escritura es el
 * token de la propiedad del script ADMIN_TOKEN (largo, al azar). Sin esa
 * propiedad, o con menos de 24 caracteres, la escritura queda apagada. El token
 * lo guarda el servidor del sitio (nunca el navegador) y se compara sin
 * revelar en qué carácter falla. Tras 20 intentos fallidos en 10 minutos se
 * bloquea todo por un rato.
 *
 * Se escribe con valueInputOption RAW: un texto que empiece por «=» queda como
 * texto, nunca como fórmula. Las fechas se escriben como número de serie.
 *
 * Después de escribir se programa una publicación para el minuto siguiente
 * (publicarTrasCarga), para que el tablero muestre lo nuevo sin esperar.
 *
 * Cada carga deja una fila en la hoja oculta CARGAS (quién la mandó no se
 * sabe: el sitio tiene una sola clave; sí cuándo, cuántas filas y de qué
 * archivo vino).
 * -----------------------------------------------------------------------
 */

var PROP_ADMIN_TOKEN_ = 'ADMIN_TOKEN';
var CARGA_FORMATO_ = 'ruta-solidaridad/carga';
var CARGA_VERSION_ = 1;
var CARGA_MAX_FILAS_ = 1500;
var CARGA_MAX_BYTES_ = 2500000;
var CARGA_MAX_TEXTO_ = 300;
var CARGA_MAX_OBS_ = 500;
var CARGA_PESO_ALTO_KG_ = 100000;
var CARGA_FECHA_MINIMA_ = '2026-08-10';
var COLUMNAS_ESCRITURA_ = [
  'fecha', 'destino', 'familia', 'producto', 'presentacion',
  'cantidad', 'peso_unitario_kg', 'peso_total_kg', 'por_verificar', 'observaciones',
];

// --- entrada HTTP -------------------------------------------------------

/** Error con un mensaje que sí se le puede mostrar a la persona. */
function amistoso_(mensaje) {
  return { amistoso: mensaje };
}

function tokenValido_(recibido) {
  var esperado = propiedadDelScript_(PROP_ADMIN_TOKEN_);
  if (!esperado || esperado.length < 24) return false;
  var r = String(recibido === null || recibido === undefined ? '' : recibido);
  // Comparación que recorre siempre todo el token esperado.
  var diff = r.length ^ esperado.length;
  for (var i = 0; i < esperado.length; i++) {
    var c = r.length ? r.charCodeAt(i % r.length) : 0;
    diff |= c ^ esperado.charCodeAt(i);
  }
  return diff === 0;
}

function intentosBloqueados_() {
  var v = CacheService.getScriptCache().get('admin_fallos');
  return Number(v || 0) >= 20;
}

function registrarFallo_() {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get('admin_fallos') || 0) + 1;
  cache.put('admin_fallos', String(n), 600);
}

function doPost(e) {
  try {
    var cuerpo = e && e.postData && e.postData.contents;
    if (!cuerpo || cuerpo.length > CARGA_MAX_BYTES_) {
      return errorResponse_('La petición está vacía o es demasiado grande.', 400);
    }
    if (intentosBloqueados_()) return errorResponse_('Demasiados intentos. Espere unos minutos.', 429);

    var pedido = JSON.parse(cuerpo);
    if (!tokenValido_(pedido && pedido.token)) {
      registrarFallo_();
      return errorResponse_('No autorizado.', 401);
    }
    resetSheetCache_();
    if (pedido.accion === 'revisar') return jsonResponse_(revisarCarga_(pedido.carga));
    if (pedido.accion === 'aplicar') return jsonResponse_(aplicarCarga_(pedido.carga, pedido.decisiones));
    return errorResponse_('Acción desconocida.', 400);
  } catch (err) {
    if (err && err.amistoso) return errorResponse_(err.amistoso, 400);
    Logger.log('Admin: ' + err);
    return errorResponse_('No se pudo procesar la carga. Intente de nuevo.', 500);
  }
}

// --- lectura del libro --------------------------------------------------

function hoyIso_() {
  if (typeof Utilities !== 'undefined' && typeof Session !== 'undefined') {
    return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return new Date().toISOString().slice(0, 10);
}

/** Fila de encabezados de una hoja con filas de título arriba: primera cuyo texto inicia con `texto`. */
function filaDeEncabezado_(matriz, texto) {
  for (var i = 0; i < Math.min(15, matriz.length); i++) {
    if (normalizeText_((matriz[i] || [])[0]).indexOf(texto) === 0) return i;
  }
  return -1;
}

function leerContextoCarga_() {
  var libroId = idLibroOficial_();
  if (!libroId) throw amistoso_('Falta configurar el libro de despachos en el script.');
  var porNombre = {};
  leerPestanasDeLibro_(libroId, function (n) {
    return n === CONFIG.SHEETS.DESPACHOS || n === CONFIG.SHEETS.DESTINOS || n === CONFIG.SHEETS.FAMILIAS;
  }).forEach(function (p) { porNombre[p.nombre] = p.matriz; });
  [CONFIG.SHEETS.DESPACHOS, CONFIG.SHEETS.DESTINOS, CONFIG.SHEETS.FAMILIAS].forEach(function (n) {
    if (!porNombre[n]) throw amistoso_('No se encontró la hoja ' + n + ' en el libro.');
  });

  var libroF = idLibroFaltantes_();
  var otras = {};
  if (libroF) {
    leerPestanasDeLibro_(libroF, function (n) {
      return n === CONFIG.SHEETS.FALTANTES || n === CONFIG.SHEETS.TOTALES;
    }).forEach(function (p) { otras[p.nombre] = p.matriz; });
  }
  var libroC = idLibroContratacion_();
  var contratos = null;
  if (libroC) {
    var pc = leerPestanasDeLibro_(libroC, function (n) { return n === CONFIG.SHEETS.CONTRATACION; });
    contratos = pc.length > 0 ? pc[0].matriz : null;
  }
  return construirContexto_(
    porNombre[CONFIG.SHEETS.DESPACHOS], porNombre[CONFIG.SHEETS.DESTINOS], porNombre[CONFIG.SHEETS.FAMILIAS],
    otras[CONFIG.SHEETS.FALTANTES] || null, otras[CONFIG.SHEETS.TOTALES] || null, hoyIso_(), contratos);
}

function claveDespacho_(fecha, destino, familia, producto, kg) {
  return [fecha, normalizeText_(destino), normalizeText_(familia), normalizeText_(producto || ''),
    (Math.round(kg * 1000) / 1000).toFixed(3)].join('|');
}

/** Igual que claveDespacho_ pero sin el peso: para avisar de una fila «casi igual» con otro peso. */
function claveParecida_(fecha, destino, familia, producto) {
  return [fecha, normalizeText_(destino), normalizeText_(familia), normalizeText_(producto || '')].join('|');
}

/** Mismo día, destino y peso: para detectar un envío que se volvió a escribir con otro nombre de producto. */
function claveDePeso_(fecha, destino, kg) {
  return [fecha, normalizeText_(destino), (Math.round(kg * 1000) / 1000).toFixed(3)].join('|');
}

/** Lo que ya hay en DESPACHOS: para no repetir filas y para completar las pendientes. */
function analizarDespachosExistentes_(matriz) {
  var enc = (matriz[0] || []).slice(0, 10).map(function (h) {
    var t = String(h === null || h === undefined ? '' : h).trim().toLowerCase();
    return t === 'destino_original' ? 'destino' : t;
  });
  if (enc.join('|') !== COLUMNAS_ESCRITURA_.join('|')) {
    throw amistoso_('La hoja DESPACHOS no tiene las columnas esperadas (' + COLUMNAS_ESCRITURA_.join(', ') + ').');
  }
  var existentes = Object.create(null);
  var pendientes = Object.create(null);
  var porDia = Object.create(null);
  var parecidas = Object.create(null);
  var porPeso = Object.create(null);
  var ultimaFila = 1;
  for (var i = 1; i < matriz.length; i++) {
    var f = matriz[i] || [];
    var fecha = fechaIso_(f[0]);
    if (!fecha) continue;
    ultimaFila = i + 1;
    var destino = textoOrNull_(f[1]);
    var familia = textoOrNull_(f[2]);
    var kg = toNumberOrNull_(f[7]);
    if (destino && !familia && kg === null) {
      var kp = fecha + '|' + normalizeText_(destino);
      (pendientes[kp] = pendientes[kp] || []).push({ fila: i + 1, observaciones: textoOrNull_(f[9]) });
    } else if (destino && familia && kg !== null) {
      var k = claveDespacho_(fecha, destino, familia, textoOrNull_(f[3]), kg);
      existentes[k] = (existentes[k] || 0) + 1;
      porDia[fecha] = (porDia[fecha] || 0) + 1;
      var existente = {
        fila: i + 1, fecha: fecha, destino: destino, familia: familia, producto: textoOrNull_(f[3]),
        presentacion: textoOrNull_(f[4]), cantidad: toNumberOrNull_(f[5]), kilosUnitario: toNumberOrNull_(f[6]),
        kg: kg, observaciones: textoOrNull_(f[9]),
      };
      var kq = claveParecida_(fecha, destino, familia, existente.producto);
      (parecidas[kq] = parecidas[kq] || []).push(existente);
      var kw = claveDePeso_(fecha, destino, kg);
      (porPeso[kw] = porPeso[kw] || []).push(existente);
    }
  }
  return {
    existentes: existentes, pendientes: pendientes, porDia: porDia, parecidas: parecidas, porPeso: porPeso,
    ultimaFila: ultimaFila,
  };
}

function construirContexto_(mDespachos, mDestinos, mFamilias, mFaltantes, mTotales, hoy, mContratos) {
  var filasDestinos = filasAObjetos_(mDestinos, null);
  var destinosIdx = indexarDestinos_(filasDestinos, []);
  var destinosCompactos = Object.create(null);
  var ultimaFilaDestinos = 1;
  filasDestinos.forEach(function (d) {
    var nombre = textoOrNull_(d.destino_original);
    if (nombre) {
      destinosCompactos[compactoDestino_(nombre)] = nombre;
      if (d.__row > ultimaFilaDestinos) ultimaFilaDestinos = d.__row;
    }
  });
  var familiasIdx = indexarFamilias_(filasAObjetos_(mFamilias, null));
  var analisis = analizarDespachosExistentes_(mDespachos);
  var filasFaltantes = mFaltantes ? parsearFaltantes_(mFaltantes).filas : null;
  var faltantesActual = filasFaltantes ? filasFaltantes.length : null;
  var totalesActual = mTotales ? parsearTotales_(mTotales) : { recibidas: null, inventario: null };
  return {
    hoy: hoy,
    destinosIdx: destinosIdx,
    familiasIdx: familiasIdx,
    existentes: analisis.existentes,
    pendientes: analisis.pendientes,
    porDia: analisis.porDia,
    parecidas: analisis.parecidas,
    porPeso: analisis.porPeso,
    ultimaFila: analisis.ultimaFila,
    faltantesActual: faltantesActual,
    faltantesFilas: filasFaltantes,
    totalesActual: totalesActual,
    matrizFaltantes: mFaltantes,
    matrizTotales: mTotales,
    matrizContratos: mContratos || null,
    destinosCompactos: destinosCompactos,
    ultimaFilaDestinos: ultimaFilaDestinos,
  };
}


// --- contratos y destinos nuevos ----------------------------------------
//
// CONTRATACION  Un contrato se identifica por su código (CTR0001). Uno nuevo se agrega; uno que ya está
//               igual se salta; uno que ya está con otros datos es un CONFLICTO (dejar o cambiar; un
//               contrato no se agrega dos veces). Así se marca un contrato como «Finalizado»: se sube con
//               su estado nuevo y se elige «cambiar». Nada se borra.
// DESTINOS      Un destino que no existe se agrega con su tipo y su municipio. Uno que ya existe igual se
//               salta. Uno que ya existe con OTRA clasificación no se cambia desde aquí: se corrige a mano.

var CARGA_MAX_OBJETO_ = 2000;
var CARGA_MAX_ENLACE_ = 1000;
var CONTRATOS_COLUMNAS_ = ['contratacion_id', 'dependencia', 'objeto', 'valor_inicial', 'contratista', 'enlace_secop', 'estado'];
var TIPOS_DESTINO_ = { 'MUNICIPIO': 'municipio', 'OTRA': 'otra', 'TRASLADO': 'traslado', 'MULTIPLE': 'multiple' };
var DESTINOS_FILA_MAXIMA_ = 600;
var ALIAS_MUNICIPIO_ = {
  'CALI': 'Santiago de Cali', 'BUGA': 'Guadalajara de Buga',
  'CALIMA': 'Calima - El Darién', 'CALIMA DARIEN': 'Calima - El Darién', 'CALIMA EL DARIEN': 'Calima - El Darién',
};

function compactoDestino_(s) {
  return normalizeText_(s).replace(/[^A-Z0-9]/g, '');
}

function resolverMunicipio_(texto) {
  var n = normalizeText_(texto);
  if (!n) return null;
  var nombre = ALIAS_MUNICIPIO_[n] ? normalizeText_(ALIAS_MUNICIPIO_[n]) : n;
  var lista = catalogo42_().municipios;
  for (var i = 0; i < lista.length; i++) {
    if (normalizeText_(lista[i].nombre) === nombre) return lista[i];
  }
  return null;
}

// -- contratos ---------------------------------------------------------

function estadoContratoCarga_(v) {
  if (v === null || v === undefined || v === '') return 'Vigente';
  return ESTADOS_CONTRATO_[normalizeText_(v)] || null;
}

/** Lo que ya hay en CONTRATACION, por código. Falla con un mensaje claro si falta una columna (p. ej. «estado»). */
function analizarContratosExistentes_(matriz) {
  if (!matriz) throw amistoso_('No se encontró la hoja ' + CONFIG.SHEETS.CONTRATACION + ' en el libro.');
  var enc = (matriz[0] || []).slice(0, CONTRATOS_COLUMNAS_.length).map(function (h) {
    return String(h === null || h === undefined ? '' : h).trim().toLowerCase();
  });
  if (enc.join('|') !== CONTRATOS_COLUMNAS_.join('|')) {
    throw amistoso_('La hoja CONTRATACION no tiene las columnas esperadas (' + CONTRATOS_COLUMNAS_.join(', ') +
      '). ¿Falta la columna «estado»?');
  }
  var porId = Object.create(null);
  var ultimaFila = 1;
  for (var i = 1; i < matriz.length; i++) {
    var f = matriz[i] || [];
    var id = textoOrNull_(f[0]);
    if (!id) continue;
    ultimaFila = i + 1;
    var estado = estadoContratoCarga_(f[6]);
    porId[normalizeText_(id)] = {
      fila: i + 1, id: id, dependencia: textoOrNull_(f[1]), objeto: textoOrNull_(f[2]),
      valorInicial: toNumberOrNull_(f[3]), contratista: textoOrNull_(f[4]), enlaceSecop: textoOrNull_(f[5]),
      estado: estado || textoOrNull_(f[6]),
    };
  }
  return { porId: porId, ultimaFila: ultimaFila };
}

function camposContrato_(libro, archivo) {
  function t(v) { return v === null || v === undefined ? '—' : String(v); }
  return [
    { campo: 'Código', libro: t(libro.id), archivo: t(archivo.id) },
    { campo: 'Dependencia', libro: t(libro.dependencia), archivo: t(archivo.dependencia) },
    { campo: 'Objeto', libro: t(libro.objeto), archivo: t(archivo.objeto) },
    { campo: 'Valor inicial', libro: t(libro.valorInicial), archivo: t(archivo.valorInicial) },
    { campo: 'Contratista', libro: t(libro.contratista), archivo: t(archivo.contratista) },
    { campo: 'Enlace de SECOP', libro: t(libro.enlaceSecop), archivo: t(archivo.enlaceSecop) },
    { campo: 'Estado', libro: t(libro.estado), archivo: t(archivo.estado) },
  ];
}

function planificarContratos_(filas, ctx) {
  var analisis = analizarContratosExistentes_(ctx.matrizContratos);
  ctx.ultimaFilaContratos = analisis.ultimaFila;
  var existentes = analisis.porId;
  var vistos = Object.create(null);
  var salida = [];
  filas.forEach(function (r, i) {
    r = r && typeof r === 'object' ? r : {};
    var errores = [];
    var tId = textoCarga_(r.id, 60);
    if (!tId.valor) errores.push('Falta el código del contrato.');
    else if (tId.largo || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(tId.valor)) {
      errores.push('El código solo puede llevar letras, números, punto, guion y guion bajo (máximo 60).');
    }
    var tObjeto = textoCarga_(r.objeto, CARGA_MAX_OBJETO_);
    if (!tObjeto.valor) errores.push('Falta el objeto del contrato.');
    else if (tObjeto.largo) errores.push('El objeto es demasiado largo.');
    var tDep = textoCarga_(r.dependencia, CARGA_MAX_TEXTO_);
    if (tDep.largo) errores.push('La dependencia es demasiado larga.');
    var tContr = textoCarga_(r.contratista, CARGA_MAX_TEXTO_);
    if (tContr.largo) errores.push('El contratista es demasiado largo.');
    var valor = numeroCarga_(r.valorInicial);
    if (valor.malo || (valor.valor !== null && valor.valor < 0)) errores.push('El valor inicial debe ser un número sin «$» ni puntos de miles.');
    var tEnlace = textoCarga_(r.enlaceSecop, CARGA_MAX_ENLACE_);
    if (tEnlace.valor && (tEnlace.largo || !RE_URL_SECOP_.test(tEnlace.valor))) {
      errores.push('El enlace de SECOP debe ser una dirección completa que empiece por https://');
    }
    var estado = estadoContratoCarga_(r.estado);
    if (!estado) errores.push('El estado debe ser Vigente, Finalizado o Inhabilitado.');

    var clave = tId.valor ? normalizeText_(tId.valor) : null;
    if (clave && vistos[clave]) errores.push('El código ' + tId.valor + ' está repetido en el archivo (fila ' + vistos[clave] + ').');
    if (clave && !vistos[clave]) vistos[clave] = i + 1;

    var fila = {
      n: i + 1, id: tId.valor, dependencia: tDep.valor, objeto: tObjeto.valor,
      valorInicial: valor.valor, contratista: tContr.valor, enlaceSecop: tEnlace.valor, estado: estado,
      estadoFila: 'nueva', filaLibro: null, errores: errores, conflicto: null,
    };
    if (errores.length > 0) {
      fila.estadoFila = 'error';
    } else {
      var ex = existentes[clave];
      if (ex) {
        var igual = (ex.dependencia || null) === fila.dependencia && (ex.objeto || null) === fila.objeto &&
          (ex.valorInicial === null ? null : ex.valorInicial) === fila.valorInicial &&
          (ex.contratista || null) === fila.contratista && (ex.enlaceSecop || null) === fila.enlaceSecop &&
          ex.estado === fila.estado;
        if (igual) {
          fila.estadoFila = 'duplicada';
        } else {
          fila.estadoFila = 'conflicto';
          fila.filaLibro = ex.fila;
          fila.conflicto = { campos: camposContrato_(ex, fila), existente: ex };
        }
      }
    }
    salida.push(fila);
  });
  return salida;
}

function resumenContratos_(filas) {
  var r = { nuevas: 0, duplicadas: 0, conflictos: 0, conProblema: 0, reemplazan: 0, conservadas: 0 };
  filas.forEach(function (f) {
    if (f.estadoFila === 'nueva') r.nuevas += 1;
    else if (f.estadoFila === 'duplicada') r.duplicadas += 1;
    else if (f.estadoFila === 'conflicto') r.conflictos += 1;
    else if (f.estadoFila === 'error') r.conProblema += 1;
  });
  return r;
}

/** Decisiones sobre los conflictos de contratos (claves «c1», «c2»…): solo «conservar» o «reemplazar». */
function aplicarDecisionesContratos_(plan, decisiones) {
  var d = decisiones && typeof decisiones === 'object' && !Array.isArray(decisiones) ? decisiones : {};
  plan.contratacion.filas.forEach(function (f) {
    if (f.estadoFila !== 'conflicto') return;
    var eleccion = d['c' + f.n];
    if (eleccion === 'agregar') {
      throw amistoso_('El contrato ' + f.id + ' ya existe: un contrato no se agrega dos veces. Elija «dejar» o «cambiar».');
    }
    if (eleccion !== 'conservar' && eleccion !== 'reemplazar') {
      throw amistoso_('Falta decidir qué hacer con el conflicto del contrato ' + f.id + '.');
    }
    f.estadoFila = eleccion === 'conservar' ? 'conservada' : 'reemplaza';
    f.previo = f.conflicto.existente;
  });
  var r = plan.contratacion.resumen;
  r.conflictos = 0;
  r.reemplazan = plan.contratacion.filas.filter(function (f) { return f.estadoFila === 'reemplaza'; }).length;
  r.conservadas = plan.contratacion.filas.filter(function (f) { return f.estadoFila === 'conservada'; }).length;
  r.nuevas = plan.contratacion.filas.filter(function (f) { return f.estadoFila === 'nueva'; }).length;
}

function valoresDeContrato_(f) {
  return [f.id, f.dependencia || '', f.objeto, f.valorInicial === null ? '' : f.valorInicial,
    f.contratista || '', f.enlaceSecop || '', f.estado];
}

function escribirContratos_(plan, ctx, libroC) {
  var datos = [];
  var nuevas = [];
  plan.contratacion.filas.forEach(function (f) {
    if (f.estadoFila === 'reemplaza') {
      datos.push({ range: rangoA1_(CONFIG.SHEETS.CONTRATACION, 'A', f.filaLibro, 'G', f.filaLibro), values: [valoresDeContrato_(f)] });
    } else if (f.estadoFila === 'nueva') {
      nuevas.push(valoresDeContrato_(f));
    }
  });
  if (nuevas.length > 0) {
    var inicio = ctx.ultimaFilaContratos + 1;
    var fin = inicio + nuevas.length - 1;
    asegurarFilas_(libroC, CONFIG.SHEETS.CONTRATACION, fin);
    datos.push({ range: rangoA1_(CONFIG.SHEETS.CONTRATACION, 'A', inicio, 'G', fin), values: nuevas });
  }
  if (datos.length > 0) Sheets.Spreadsheets.Values.batchUpdate({ valueInputOption: 'RAW', data: datos }, libroC);
  return nuevas.length;
}

/** Guarda cómo estaba cada contrato antes de cambiarlo. */
function registrarReemplazosContratos_(libroId, previos) {
  if (!previos || previos.length === 0) return;
  var nombre = CONFIG.SHEETS.REEMPLAZOS_CONTRATOS;
  var ss = SpreadsheetApp.openById(libroId);
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    hoja.appendRow(['cuando', 'fila_del_libro', 'contratacion_id', 'dependencia', 'objeto', 'valor_inicial', 'contratista', 'enlace_secop', 'estado']);
    hoja.hideSheet();
  }
  var cuando = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  previos.forEach(function (p) {
    hoja.appendRow([cuando, p.fila, p.id, p.dependencia || '', p.objeto || '', p.valorInicial === null ? '' : p.valorInicial,
      p.contratista || '', p.enlaceSecop || '', p.estado || '']);
  });
}

// -- destinos nuevos ---------------------------------------------------

function planificarDestinosNuevos_(filas, ctx) {
  var salida = [];
  var vistos = Object.create(null);
  var compactosVistos = Object.create(null);
  filas.forEach(function (r, i) {
    r = r && typeof r === 'object' ? r : {};
    var errores = [];
    var tDestino = textoCarga_(r.destino, CARGA_MAX_TEXTO_);
    if (!tDestino.valor) errores.push('Falta el nombre del destino.');
    else if (tDestino.largo) errores.push('El nombre del destino es demasiado largo.');

    var tipo = TIPOS_DESTINO_[normalizeText_(r.tipo)];
    if (!tipo) errores.push('El tipo debe ser municipio, otra, traslado o multiple.');

    var muni = null;
    var tMuni = textoCarga_(r.municipio, CARGA_MAX_TEXTO_);
    if (tipo === 'municipio') {
      muni = resolverMunicipio_(tMuni.valor);
      if (!muni) errores.push('Falta el municipio, o «' + (tMuni.valor || '') + '» no es uno de los 42 del Valle.');
    } else if (tipo && tMuni.valor) {
      errores.push('Solo los destinos de tipo «municipio» llevan municipio.');
    }

    var fila = {
      n: i + 1, destino: tDestino.valor, tipo: tipo || textoCarga_(r.tipo, 40).valor,
      municipio: muni ? muni.nombre : null, dane: muni ? muni.codigoDane : null,
      estadoFila: 'nueva', errores: errores, avisos: [],
    };
    if (errores.length === 0) {
      var clave = normalizeText_(tDestino.valor);
      var compacto = compactoDestino_(tDestino.valor);
      var ex = ctx.destinosIdx[clave];
      if (vistos[clave]) {
        var mismo = vistos[clave].tipo === tipo && vistos[clave].dane === fila.dane;
        if (mismo) fila.estadoFila = 'duplicada';
        else fila.errores.push('Está repetido en el archivo con otra clasificación (fila ' + vistos[clave].n + ').');
      } else if (ex) {
        var igual = ex.tipo === tipo.toUpperCase() && (tipo !== 'municipio' || ex.dane === fila.dane);
        if (igual) fila.estadoFila = 'duplicada';
        else {
          fila.errores.push('Ya existe en DESTINOS con otra clasificación (' + String(ex.tipo).toLowerCase() +
            '). No se cambia desde aquí: corríjalo a mano en la hoja DESTINOS.');
        }
      } else {
        var parecido = ctx.destinosCompactos[compacto] || compactosVistos[compacto];
        if (parecido) {
          fila.errores.push('Se parece mucho a «' + parecido + '», que ya existe. Si es el mismo lugar, use ese nombre en los envíos y no lo agregue de nuevo.');
        }
      }
      if (fila.errores.length === 0 && !vistos[clave]) vistos[clave] = fila;
      if (fila.errores.length === 0 && fila.estadoFila === 'nueva') compactosVistos[compacto] = tDestino.valor;
    }
    if (fila.errores.length > 0) fila.estadoFila = 'error';
    salida.push(fila);
  });
  return salida;
}

function resumenDestinos_(filas) {
  var r = { nuevos: 0, duplicados: 0, conProblema: 0 };
  filas.forEach(function (f) {
    if (f.estadoFila === 'nueva') r.nuevos += 1;
    else if (f.estadoFila === 'duplicada') r.duplicados += 1;
    else r.conProblema += 1;
  });
  return r;
}

function escribirDestinos_(plan, ctx, libroId) {
  var nuevos = plan.destinosNuevos.filas.filter(function (f) { return f.estadoFila === 'nueva'; });
  if (nuevos.length === 0) return 0;
  var inicio = ctx.ultimaFilaDestinos + 1;
  var fin = inicio + nuevos.length - 1;
  if (fin > DESTINOS_FILA_MAXIMA_) {
    throw amistoso_('La hoja DESTINOS llegó a su límite de filas (' + DESTINOS_FILA_MAXIMA_ + '). Avise al encargado.');
  }
  var valores = nuevos.map(function (f) {
    return [f.destino, f.tipo, f.dane || '', f.municipio || '', 'carga /admin'];
  });
  Sheets.Spreadsheets.Values.batchUpdate({
    valueInputOption: 'RAW',
    data: [{ range: rangoA1_(CONFIG.SHEETS.DESTINOS, 'A', inicio, 'E', fin), values: valores }],
  }, libroId);
  return nuevos.length;
}

// --- validación (pura: no toca el libro) --------------------------------

/** Número de una celda del archivo: un número, o un texto como «14,5». null si no es número. */
function numeroCarga_(v) {
  if (v === null || v === undefined || v === '') return { valor: null, malo: false };
  if (typeof v === 'number') return isFinite(v) ? { valor: v, malo: false } : { valor: null, malo: true };
  if (typeof v !== 'string') return { valor: null, malo: true };
  var t = v.replace(/\s/g, '');
  if (t.indexOf(',') !== -1) t = t.replace(/\./g, '').replace(',', '.');
  var n = Number(t);
  return t === '' || isNaN(n) ? { valor: null, malo: true } : { valor: n, malo: false };
}

function textoCarga_(v, max) {
  if (v === null || v === undefined) return { valor: null, largo: false };
  var t = String(v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (t === '') return { valor: null, largo: false };
  return { valor: t, largo: t.length > max };
}

function esSiCarga_(v) {
  if (v === true) return true;
  return typeof v === 'string' && normalizeText_(v) === 'SI';
}

/** Fecha del archivo: solo texto «2026-10-31» y que exista en el calendario. null si no. */
function fechaCarga_(v) {
  if (typeof v !== 'string') return null;
  var iso = fechaIso_(v);
  if (!iso) return null;
  var p = iso.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  return d.getUTCFullYear() === +p[0] && d.getUTCMonth() === +p[1] - 1 && d.getUTCDate() === +p[2] ? iso : null;
}

function serialDeFecha_(iso) {
  var p = iso.split('-');
  return Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(1899, 11, 30)) / 86400000);
}

function sumarUnDia_(iso) {
  var p = iso.split('-');
  return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + 1)).toISOString().slice(0, 10);
}

function quedanPendientesDelDia_(pendientes, fecha) {
  var prefijo = fecha + '|';
  return Object.keys(pendientes).some(function (k) { return k.indexOf(prefijo) === 0 && pendientes[k].length > 0; });
}

function planificarDistribucion_(filas, ctx) {
  var salida = [];
  var usados = {};
  var existentes = {};
  Object.keys(ctx.existentes).forEach(function (k) { existentes[k] = ctx.existentes[k]; });
  var pendientes = {};
  Object.keys(ctx.pendientes).forEach(function (k) { pendientes[k] = ctx.pendientes[k].slice(); });
  var manana = sumarUnDia_(ctx.hoy);
  // Filas del libro que todavía pueden entrar en un conflicto: las que ya se reconocieron como
  // el mismo envío (duplicada exacta) salen de la lista para no chocar con ellas.
  var restos = { parecidas: {}, porPeso: {} };
  function disponibles_(indice, copia, clave) {
    if (!(clave in copia)) copia[clave] = (indice[clave] || []).slice();
    return copia[clave];
  }
  function consumir_(fecha, destino, familia, producto, kg) {
    [[ctx.parecidas, restos.parecidas, claveParecida_(fecha, destino, familia, producto)],
     [ctx.porPeso, restos.porPeso, claveDePeso_(fecha, destino, kg)]].forEach(function (par) {
      var lista = disponibles_(par[0], par[1], par[2]);
      for (var q = 0; q < lista.length; q++) {
        if (lista[q].kg === kg && normalizeText_(lista[q].producto || '') === normalizeText_(producto || '') &&
            normalizeText_(lista[q].familia) === normalizeText_(familia)) {
          lista.splice(q, 1);
          break;
        }
      }
    });
  }
  function resumenExistente_(o) {
    return {
      fila: o.fila, fecha: o.fecha, destino: o.destino, familia: o.familia, producto: o.producto,
      presentacion: o.presentacion, cantidad: o.cantidad, kilosUnitario: o.kilosUnitario, kilosTotal: o.kg,
      observaciones: o.observaciones,
    };
  }

  filas.forEach(function (r, i) {
    r = r && typeof r === 'object' ? r : {};
    var errores = [];
    var avisos = [];

    var fecha = fechaCarga_(r.fecha);
    if (!fecha) errores.push('La fecha no es válida (use el formato 2026-10-31).');
    else if (fecha > manana) errores.push('La fecha es futura.');
    else if (fecha < CARGA_FECHA_MINIMA_) avisos.push('La fecha es anterior al terremoto (10 de agosto).');

    var tDestino = textoCarga_(r.destino, CARGA_MAX_TEXTO_);
    if (!tDestino.valor) errores.push('Falta el destino.');
    else if (tDestino.largo) errores.push('El destino es demasiado largo.');
    else if (!ctx.destinosIdx[normalizeText_(tDestino.valor)]) {
      avisos.push('Este destino no está en la lista: contará en el total, pero sin municipio, hasta que se agregue en DESTINOS.');
    }

    var tFamilia = textoCarga_(r.familia, CARGA_MAX_TEXTO_);
    if (!tFamilia.valor) errores.push('Falta el tipo de ayuda (familia).');
    else if (!(normalizeText_(tFamilia.valor) in ctx.familiasIdx)) {
      errores.push('El tipo de ayuda «' + tFamilia.valor + '» no está en la lista de familias.');
    }

    var tProducto = textoCarga_(r.producto, CARGA_MAX_TEXTO_);
    if (tProducto.largo) errores.push('El producto es demasiado largo.');
    if (!tProducto.valor) avisos.push('No trae producto.');
    var tPres = textoCarga_(r.presentacion, CARGA_MAX_TEXTO_);
    if (tPres.largo) errores.push('La presentación es demasiado larga.');
    var tObs = textoCarga_(r.observaciones, CARGA_MAX_OBS_);
    if (tObs.largo) errores.push('Las observaciones son demasiado largas.');

    var cant = numeroCarga_(r.cantidad);
    var unit = numeroCarga_(r.kilosUnitario);
    var total = numeroCarga_(r.kilosTotal);
    if (cant.malo) errores.push('La cantidad no es un número.');
    if (unit.malo) errores.push('Los kilos de cada uno no son un número.');
    if (total.malo) errores.push('Los kilos en total no son un número.');
    [cant.valor, unit.valor, total.valor].forEach(function (n) {
      if (n !== null && n < 0) errores.push('Hay un número negativo.');
    });
    var kg = total.valor;
    var calculado = cant.valor !== null && unit.valor !== null ? Math.round(cant.valor * unit.valor * 1000) / 1000 : null;
    if (kg === null) kg = calculado;
    else if (calculado !== null && Math.abs(calculado - kg) > Math.max(0.5, kg * 0.01)) {
      avisos.push('Los kilos en total no coinciden con cantidad por kilos de cada uno.');
    }
    if (kg === null && !cant.malo && !unit.malo && !total.malo) errores.push('Falta el peso.');
    if (kg !== null && kg === 0) avisos.push('El peso es 0: eso quiere decir que no se envió nada.');
    if (kg !== null && kg > CARGA_PESO_ALTO_KG_) avisos.push('El peso es muy grande (más de 100 toneladas en una fila).');

    var fila = {
      n: i + 1,
      fecha: fecha,
      destino: tDestino.valor,
      familia: tFamilia.valor,
      producto: tProducto.valor,
      presentacion: tPres.valor,
      cantidad: cant.valor,
      kilosUnitario: unit.valor,
      kilosTotal: kg,
      dudas: esSiCarga_(r.dudas),
      observaciones: tObs.valor,
      estado: 'nueva',
      filaLibro: null,
      avisos: avisos,
      errores: errores,
    };

    if (errores.length > 0) {
      fila.estado = 'error';
    } else {
      var k = claveDespacho_(fecha, tDestino.valor, tFamilia.valor, tProducto.valor, kg);
      if (existentes[k] > 0) {
        existentes[k] -= 1;
        consumir_(fecha, tDestino.valor, tFamilia.valor, tProducto.valor, kg);
        fila.estado = 'duplicada';
      } else {
        var kp = fecha + '|' + normalizeText_(tDestino.valor);
        var libres = pendientes[kp];
        if (libres && libres.length > 0) {
          var p = libres.shift();
          fila.estado = 'completa';
          fila.filaLibro = p.fila;
          fila.observacionesPrevias = p.observaciones;
        } else {
          // ¿Se parece a algo que ya está pero no es igual? Eso no lo puede decidir el sistema: es un CONFLICTO.
          var mismos = disponibles_(ctx.parecidas, restos.parecidas, claveParecida_(fecha, tDestino.valor, tFamilia.valor, tProducto.valor))
            .filter(function (o) { return o.kg !== kg; });
          var tipo = 'peso';
          if (mismos.length === 0) {
            tipo = 'nombre';
            mismos = disponibles_(ctx.porPeso, restos.porPeso, claveDePeso_(fecha, tDestino.valor, kg));
          }
          if (mismos.length > 0) {
            fila.estado = 'conflicto';
            fila.conflicto = {
              tipo: tipo,
              existentes: mismos.slice(0, 3).map(resumenExistente_),
              total: mismos.length,
            };
          } else {
            if (ctx.porDia[fecha] > 0) {
              fila.posibleRepeticion = true;
              fila.avisos.push('Ese día ya tiene ' + ctx.porDia[fecha] + ' filas en el libro. Si este envío ya estaba cargado con otros datos, quedaría repetido.');
            }
            if (quedanPendientesDelDia_(pendientes, fecha)) {
              fila.avisos.push('Ese día tiene despachos pendientes (del Excel anterior) que no coinciden con este destino: su cifra estimada seguirá contando además de este envío.');
            }
          }
        }
      }
    }
    salida.push(fila);
  });
  return salida;
}

function planificarFaltantes_(filas, ctx) {
  var vistos = {};
  var estados = ESTADOS_FALTANTES_;
  return filas.map(function (r, i) {
    r = r && typeof r === 'object' ? r : {};
    var errores = [];
    var cat = CONFIG.CATEGORIAS.filter(function (c) { return normalizeText_(c) === normalizeText_(r.categoria); })[0];
    if (!cat) errores.push('La categoría no es una de las 7.');
    var tEl = textoCarga_(r.elemento, 200);
    if (!tEl.valor) errores.push('Falta el elemento.');
    else if (tEl.largo) errores.push('El elemento es demasiado largo.');
    var estado = estados[normalizeText_(r.estado)];
    if (!estado) errores.push('El estado debe ser Agotado, Escaso o Buena cantidad.');
    var tObs = textoCarga_(r.observaciones, CARGA_MAX_OBS_);
    if (tObs.largo) errores.push('Las observaciones son demasiado largas.');
    if (errores.length === 0) {
      var k = normalizeText_(cat) + '|' + normalizeText_(tEl.valor);
      if (vistos[k]) errores.push('Este elemento está repetido en la misma categoría.');
      vistos[k] = true;
    }
    return {
      n: i + 1, categoria: cat || textoCarga_(r.categoria, 80).valor, elemento: tEl.valor, estado: estado || textoCarga_(r.estado, 40).valor,
      observaciones: tObs.valor, estadoFila: errores.length ? 'error' : 'ok', errores: errores,
    };
  });
}

function planificarCarga_(carga, ctx) {
  var plan = {
    errores: [], avisos: [], informacionGeneral: null, queHaceFalta: null, distribucion: null,
    contratacion: null, destinosNuevos: null,
  };
  if (!carga || typeof carga !== 'object' || Array.isArray(carga)) {
    plan.errores.push('El archivo no tiene el formato esperado.');
    return plan;
  }
  if (carga.formato !== CARGA_FORMATO_ || carga.version !== CARGA_VERSION_) {
    plan.errores.push('El archivo no es una carga válida (formato «' + CARGA_FORMATO_ + '», versión ' + CARGA_VERSION_ + ').');
    return plan;
  }
  var hay = false;

  if (carga.informacionGeneral !== undefined && carga.informacionGeneral !== null) {
    hay = true;
    var g = carga.informacionGeneral;
    var rec = numeroCarga_(g && g.toneladasRecibidas);
    var inv = numeroCarga_(g && g.toneladasInventario);
    var errG = [];
    if (rec.malo || (rec.valor !== null && rec.valor < 0)) errG.push('Las toneladas recibidas no son un número válido.');
    if (inv.malo || (inv.valor !== null && inv.valor < 0)) errG.push('Las toneladas en inventario no son un número válido.');
    plan.informacionGeneral = {
      errores: errG,
      recibidas: { antes: ctx.totalesActual.recibidas, despues: rec.valor, cambia: rec.valor !== null && rec.valor !== ctx.totalesActual.recibidas },
      inventario: { antes: ctx.totalesActual.inventario, despues: inv.valor, cambia: inv.valor !== null && inv.valor !== ctx.totalesActual.inventario },
    };
  }

  if (carga.queHaceFalta !== undefined && carga.queHaceFalta !== null) {
    hay = true;
    if (!Array.isArray(carga.queHaceFalta)) {
      plan.errores.push('«queHaceFalta» debe ser una lista.');
    } else if (carga.queHaceFalta.length > CARGA_MAX_FILAS_) {
      plan.errores.push('«queHaceFalta» tiene demasiadas filas.');
    } else {
      var ff = planificarFaltantes_(carga.queHaceFalta, ctx);
      var buenas = ff.filter(function (f) { return f.estadoFila === 'ok'; }).length;
      var nuevasClaves = {};
      ff.forEach(function (f) {
        if (f.estadoFila === 'ok') nuevasClaves[normalizeText_(f.categoria) + '|' + normalizeText_(f.elemento)] = true;
      });
      var seQuitan = (ctx.faltantesFilas || []).filter(function (a) {
        return !nuevasClaves[normalizeText_(a.categoria) + '|' + normalizeText_(a.nombre)];
      }).map(function (a) { return { categoria: a.categoria, elemento: a.nombre, estado: a.estado }; });
      plan.queHaceFalta = {
        antes: ctx.faltantesActual, despues: buenas, filas: ff,
        reemplaza: buenas > 0,
        seQuitan: buenas > 0 ? seQuitan.slice(0, 100) : [],
        seQuitanTotal: buenas > 0 ? seQuitan.length : 0,
      };
      if (buenas === 0) plan.avisos.push('«Qué hace falta» no tiene ninguna fila válida: la lista actual no se cambia.');
    }
  }

  var ctxDistribucion = ctx;
  if (carga.destinosNuevos !== undefined && carga.destinosNuevos !== null) {
    hay = true;
    if (!Array.isArray(carga.destinosNuevos)) {
      plan.errores.push('«destinosNuevos» debe ser una lista.');
    } else if (carga.destinosNuevos.length > CARGA_MAX_FILAS_) {
      plan.errores.push('«destinosNuevos» tiene demasiadas filas.');
    } else {
      var dn = planificarDestinosNuevos_(carga.destinosNuevos, ctx);
      plan.destinosNuevos = { filas: dn, resumen: resumenDestinos_(dn) };
      // Los envíos del mismo archivo pueden usar un destino que se agrega en esta carga.
      var ampliado = Object.create(null);
      Object.keys(ctx.destinosIdx).forEach(function (k) { ampliado[k] = ctx.destinosIdx[k]; });
      dn.forEach(function (f) {
        if (f.estadoFila === 'nueva') ampliado[normalizeText_(f.destino)] = { tipo: f.tipo.toUpperCase(), dane: f.dane || '', regla: '' };
      });
      ctxDistribucion = {};
      Object.keys(ctx).forEach(function (k) { ctxDistribucion[k] = ctx[k]; });
      ctxDistribucion.destinosIdx = ampliado;
    }
  }

  if (carga.contratacion !== undefined && carga.contratacion !== null) {
    hay = true;
    if (!Array.isArray(carga.contratacion)) {
      plan.errores.push('«contratacion» debe ser una lista.');
    } else if (carga.contratacion.length > CARGA_MAX_FILAS_) {
      plan.errores.push('«contratacion» tiene demasiadas filas.');
    } else {
      var cc = planificarContratos_(carga.contratacion, ctx);
      plan.contratacion = { filas: cc, resumen: resumenContratos_(cc) };
    }
  }

  if (carga.distribucion !== undefined && carga.distribucion !== null) {
    hay = true;
    if (!Array.isArray(carga.distribucion)) {
      plan.errores.push('«distribucion» debe ser una lista.');
    } else if (carga.distribucion.length > CARGA_MAX_FILAS_) {
      plan.errores.push('«distribucion» tiene más de ' + CARGA_MAX_FILAS_ + ' filas. Divida el archivo.');
    } else {
      var dd = planificarDistribucion_(carga.distribucion, ctxDistribucion);
      var cuenta = { nueva: 0, completa: 0, duplicada: 0, error: 0, conflicto: 0 };
      var conAviso = 0;
      var posiblesRepetidas = 0;
      dd.forEach(function (f) {
        cuenta[f.estado] += 1;
        if (f.avisos.length) conAviso += 1;
        if (f.posibleRepeticion) posiblesRepetidas += 1;
      });
      plan.distribucion = {
        filas: dd,
        resumen: { nuevas: cuenta.nueva, completan: cuenta.completa, duplicadas: cuenta.duplicada, conProblema: cuenta.error, conAviso: conAviso,
          posiblesRepetidas: posiblesRepetidas, conflictos: cuenta.conflicto },
      };
    }
  }

  if (!hay) plan.errores.push('El archivo no trae ninguna sección con datos.');
  if (Array.isArray(carga.avisos)) {
    plan.avisosDeLaIA = carga.avisos.slice(0, 50).map(function (a) { return textoCarga_(a, 400).valor; }).filter(Boolean);
  }
  return plan;
}

/** Lo que se le muestra a la persona: el plan completo. */
function revisarCarga_(carga) {
  var ctx = leerContextoCarga_();
  var plan = planificarCarga_(carga, ctx);
  plan.puedeCargar = plan.errores.length === 0 && cargaTieneAlgoParaEscribir_(plan);
  plan.fuente = carga && typeof carga.fuente === 'string' ? textoCarga_(carga.fuente, 120).valor : null;
  return plan;
}

function cargaTieneAlgoParaEscribir_(plan) {
  if (plan.informacionGeneral && plan.informacionGeneral.errores.length === 0 &&
      (plan.informacionGeneral.recibidas.cambia || plan.informacionGeneral.inventario.cambia)) return true;
  if (plan.queHaceFalta && plan.queHaceFalta.reemplaza) return true;
  if (plan.distribucion) {
    var r = plan.distribucion.resumen;
    if (r.nuevas + r.completan + (r.reemplazan || 0) > 0) return true;
  }
  if (plan.contratacion) {
    var rc = plan.contratacion.resumen;
    if (rc.nuevas + (rc.reemplazan || 0) > 0) return true;
  }
  if (plan.destinosNuevos && plan.destinosNuevos.resumen.nuevos > 0) return true;
  return false;
}

// --- escritura ----------------------------------------------------------

function valoresDeFila_(f, observacionesFinal) {
  return [
    serialDeFecha_(f.fecha), f.destino, f.familia, f.producto || '', f.presentacion || '',
    f.cantidad === null ? '' : f.cantidad, f.kilosUnitario === null ? '' : f.kilosUnitario,
    f.kilosTotal, f.dudas ? 'SI' : '', observacionesFinal || '',
  ];
}

function rangoA1_(hoja, desdeCol, desdeFila, hastaCol, hastaFila) {
  return rangoDeHoja_(hoja) + '!' + desdeCol + desdeFila + ':' + hastaCol + (hastaFila === undefined ? '' : hastaFila);
}

/** Cuántas filas tiene la hoja; si faltan, agrega y copia el formato y las fórmulas de la última. */
function asegurarFilas_(libroId, hoja, hastaFila) {
  var meta = Sheets.Spreadsheets.get(libroId, { fields: 'sheets.properties(sheetId,title,gridProperties.rowCount)' });
  var h = (meta.sheets || []).filter(function (s) { return s.properties.title === hoja; })[0];
  if (!h) throw amistoso_('No se encontró la hoja ' + hoja + '.');
  var total = h.properties.gridProperties.rowCount;
  if (hastaFila <= total) return;
  var extra = hastaFila - total + 200;
  var sh = SpreadsheetApp.openById(libroId).getSheetByName(hoja);
  sh.insertRowsAfter(total, extra);
  var cols = Math.min(12, sh.getMaxColumns());
  sh.getRange(total, 1, 1, cols).copyTo(sh.getRange(total + 1, 1, extra, cols));
}

/**
 * Justo antes de escribir: ¿alguien tocó el libro desde que se leyó? Si las filas donde se iba a
 * escribir ya no están como se esperaba (alguien escribió al final, o completó/borró una pendiente),
 * NO se escribe nada: es mejor repetir la revisión que pisar el trabajo de otra persona.
 */
function verificarSinCambios_(plan, ctx, libroId) {
  var nuevas = plan.distribucion.filas.filter(function (f) { return f.estado === 'nueva'; }).length;
  var completas = plan.distribucion.filas.filter(function (f) { return f.estado === 'completa'; });
  var rangos = [];
  var inicio = ctx.ultimaFila + 1;
  if (nuevas > 0) rangos.push(rangoA1_(CONFIG.SHEETS.DESPACHOS, 'A', inicio, 'A', inicio + nuevas - 1));
  completas.forEach(function (f) { rangos.push(rangoA1_(CONFIG.SHEETS.DESPACHOS, 'B', f.filaLibro, 'H', f.filaLibro)); });
  var reemplazos = plan.distribucion.filas.filter(function (f) { return f.estado === 'reemplaza'; });
  reemplazos.forEach(function (f) { rangos.push(rangoA1_(CONFIG.SHEETS.DESPACHOS, 'B', f.filaLibro, 'H', f.filaLibro)); });
  if (rangos.length === 0) return;

  var mensaje = 'El libro cambió mientras se preparaba la carga (alguien escribió, completó o borró filas). ' +
    'No se cargó nada. Vuelva a revisar el archivo y cárguelo de nuevo.';
  var resp = Sheets.Spreadsheets.Values.batchGet(libroId, {
    ranges: rangos, valueRenderOption: 'UNFORMATTED_VALUE', majorDimension: 'ROWS',
  });
  var rs = (resp && resp.valueRanges) || [];
  var i = 0;
  if (nuevas > 0) {
    var ocupadas = (rs[i++].values || []).some(function (r) {
      return r.some(function (c) { return c !== '' && c !== null && c !== undefined; });
    });
    if (ocupadas) throw amistoso_(mensaje);
  }
  completas.forEach(function (f) {
    var v = ((rs[i++] || {}).values || [[]])[0] || [];
    // B..H: destino, familia, producto, presentación, cantidad, kilos de cada uno, kilos en total.
    if (!textoOrNull_(v[0]) || textoOrNull_(v[1]) || toNumberOrNull_(v[6]) !== null) throw amistoso_(mensaje);
  });
  // Una fila que se va a reemplazar debe seguir siendo exactamente la que se vio en la revisión.
  reemplazos.forEach(function (f) {
    var v = ((rs[i++] || {}).values || [[]])[0] || [];
    var p = f.previo;
    var igual = normalizeText_(v[0]) === normalizeText_(p.destino) && normalizeText_(v[1]) === normalizeText_(p.familia) &&
      toNumberOrNull_(v[6]) === p.kg;
    if (!igual) throw amistoso_(mensaje);
  });
}

function hayCambioError_() {
  return amistoso_('El libro cambió mientras se preparaba la carga (alguien escribió, completó o borró filas). ' +
    'No se cargó nada. Vuelva a revisar el archivo y cárguelo de nuevo.');
}

function estaVacio_(valores) {
  return !(valores || []).some(function (r) {
    return r.some(function (c) { return c !== '' && c !== null && c !== undefined; });
  });
}

/** Antes de escribir: las filas donde van los destinos nuevos siguen vacías. */
function verificarDestinos_(plan, ctx, libroId) {
  var n = plan.destinosNuevos.filas.filter(function (f) { return f.estadoFila === 'nueva'; }).length;
  if (n === 0) return;
  var inicio = ctx.ultimaFilaDestinos + 1;
  var resp = Sheets.Spreadsheets.Values.batchGet(libroId, {
    ranges: [rangoA1_(CONFIG.SHEETS.DESTINOS, 'A', inicio, 'A', inicio + n - 1)],
    valueRenderOption: 'UNFORMATTED_VALUE', majorDimension: 'ROWS',
  });
  if (!estaVacio_(((resp.valueRanges || [])[0] || {}).values)) throw hayCambioError_();
}

/** Antes de escribir: los contratos a cambiar siguen siendo los que se vieron, y las filas nuevas siguen vacías. */
function verificarContratos_(plan, ctx, libroC) {
  var nuevas = plan.contratacion.filas.filter(function (f) { return f.estadoFila === 'nueva'; }).length;
  var cambios = plan.contratacion.filas.filter(function (f) { return f.estadoFila === 'reemplaza'; });
  var rangos = [];
  if (nuevas > 0) rangos.push(rangoA1_(CONFIG.SHEETS.CONTRATACION, 'A', ctx.ultimaFilaContratos + 1, 'A', ctx.ultimaFilaContratos + nuevas));
  cambios.forEach(function (f) { rangos.push(rangoA1_(CONFIG.SHEETS.CONTRATACION, 'A', f.filaLibro, 'G', f.filaLibro)); });
  if (rangos.length === 0) return;
  var rs = (Sheets.Spreadsheets.Values.batchGet(libroC, {
    ranges: rangos, valueRenderOption: 'UNFORMATTED_VALUE', majorDimension: 'ROWS',
  }) || {}).valueRanges || [];
  var i = 0;
  if (nuevas > 0 && !estaVacio_((rs[i++] || {}).values)) throw hayCambioError_();
  cambios.forEach(function (f) {
    var v = ((rs[i++] || {}).values || [[]])[0] || [];
    var p = f.previo;
    var igual = normalizeText_(v[0]) === normalizeText_(p.id) && (textoOrNull_(v[2]) || null) === (p.objeto || null) &&
      (estadoContratoCarga_(v[6]) || textoOrNull_(v[6])) === p.estado;
    if (!igual) throw hayCambioError_();
  });
}

function escribirDistribucion_(plan, ctx, libroId) {
  var datos = [];
  var nuevas = [];
  plan.distribucion.filas.forEach(function (f) {
    if (f.estado === 'completa') {
      var obs = f.observaciones || f.observacionesPrevias || '';
      datos.push({ range: rangoA1_(CONFIG.SHEETS.DESPACHOS, 'A', f.filaLibro, 'J', f.filaLibro), values: [valoresDeFila_(f, obs)] });
    } else if (f.estado === 'reemplaza') {
      var obsR = f.observaciones || f.previo.observaciones || '';
      datos.push({ range: rangoA1_(CONFIG.SHEETS.DESPACHOS, 'A', f.filaLibro, 'J', f.filaLibro), values: [valoresDeFila_(f, obsR)] });
    } else if (f.estado === 'nueva') {
      nuevas.push(valoresDeFila_(f, f.observaciones));
    }
  });
  if (nuevas.length > 0) {
    var inicio = ctx.ultimaFila + 1;
    var fin = inicio + nuevas.length - 1;
    asegurarFilas_(libroId, CONFIG.SHEETS.DESPACHOS, fin);
    datos.push({ range: rangoA1_(CONFIG.SHEETS.DESPACHOS, 'A', inicio, 'J', fin), values: nuevas });
  }
  if (datos.length > 0) {
    Sheets.Spreadsheets.Values.batchUpdate({ valueInputOption: 'RAW', data: datos }, libroId);
  }
  return nuevas.length;
}

function escribirFaltantes_(plan, ctx, libroF) {
  var ini = filaDeEncabezado_(ctx.matrizFaltantes, 'CATEGORIA');
  if (ini === -1) throw amistoso_('No se encontró la fila de títulos en QUE_HACE_FALTA.');
  var primera = ini + 2; // fila del libro de la primera fila de datos
  var filas = plan.queHaceFalta.filas.filter(function (f) { return f.estadoFila === 'ok'; })
    .map(function (f) { return [f.categoria, f.elemento, f.estado, f.observaciones || '']; });
  var fin = primera + filas.length - 1;
  asegurarFilas_(libroF, CONFIG.SHEETS.FALTANTES, fin);
  // Primero se escribe la lista nueva y después se limpia lo que sobra: si algo falla a la mitad,
  // la lista nunca queda vacía.
  Sheets.Spreadsheets.Values.update(
    { values: filas }, libroF, rangoA1_(CONFIG.SHEETS.FALTANTES, 'A', primera, 'D', fin),
    { valueInputOption: 'RAW' });
  Sheets.Spreadsheets.Values.clear({}, libroF, rangoA1_(CONFIG.SHEETS.FALTANTES, 'A', fin + 1, 'D'));
  return filas.length;
}

function escribirTotales_(plan, ctx, libroF) {
  var ini = filaDeEncabezado_(ctx.matrizTotales, 'TONELADAS RECIBIDAS');
  if (ini === -1) throw amistoso_('No se encontró la fila de títulos en TOTALES.');
  var fila = ini + 2;
  var datos = [];
  var g = plan.informacionGeneral;
  if (g.recibidas.cambia) datos.push({ range: rangoA1_(CONFIG.SHEETS.TOTALES, 'A', fila, 'A', fila), values: [[g.recibidas.despues]] });
  if (g.inventario.cambia) datos.push({ range: rangoA1_(CONFIG.SHEETS.TOTALES, 'B', fila, 'B', fila), values: [[g.inventario.despues]] });
  if (datos.length > 0) Sheets.Spreadsheets.Values.batchUpdate({ valueInputOption: 'RAW', data: datos }, libroF);
  return datos.length;
}

function registrarCarga_(libroId, resumen) {
  var nombre = CONFIG.SHEETS.CARGAS;
  var ss = SpreadsheetApp.openById(libroId);
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    hoja.appendRow(['cuando', 'filas_nuevas', 'filas_completadas', 'filas_repetidas', 'filas_con_problema', 'que_hace_falta', 'totales', 'fuente', 'filas_reemplazadas', 'conflictos_dejados', 'contratos_nuevos', 'contratos_cambiados', 'destinos_nuevos']);
    hoja.hideSheet();
  }
  hoja.appendRow([
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    resumen.nuevas, resumen.completadas, resumen.repetidas, resumen.conProblema, resumen.faltantes, resumen.totales, resumen.fuente || '',
    resumen.reemplazadas || 0, resumen.conservadas || 0,
    resumen.contratosNuevos || 0, resumen.contratosCambiados || 0, resumen.destinosNuevos || 0,
  ]);
}

/** Guarda cómo estaba cada fila antes de reemplazarla: así nada se pierde. */
function registrarReemplazos_(libroId, previos) {
  if (!previos || previos.length === 0) return;
  var nombre = CONFIG.SHEETS.REEMPLAZOS;
  var ss = SpreadsheetApp.openById(libroId);
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    hoja.appendRow(['cuando', 'fila_del_libro', 'fecha', 'destino', 'familia', 'producto', 'presentacion', 'cantidad', 'kilos_de_cada_uno', 'kilos_en_total', 'observaciones']);
    hoja.hideSheet();
  }
  var cuando = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  previos.forEach(function (p) {
    hoja.appendRow([cuando, p.fila, p.fecha, p.destino, p.familia, p.producto || '', p.presentacion || '',
      p.cantidad === null ? '' : p.cantidad, p.kilosUnitario === null ? '' : p.kilosUnitario, p.kg, p.observaciones || '']);
  });
}

/**
 * Aplica lo que la persona decidió en cada conflicto. Sin decisión, no se carga: nada se resuelve solo.
 *   conservar   se deja la fila del libro y la del archivo no se carga
 *   reemplazar  la fila del libro se cambia por la del archivo (la anterior queda guardada en REEMPLAZOS)
 *   agregar     son envíos distintos: la del archivo se agrega también
 */
function aplicarDecisiones_(plan, decisiones) {
  var d = decisiones && typeof decisiones === 'object' && !Array.isArray(decisiones) ? decisiones : {};
  var cuenta = { reemplazan: 0, conservadas: 0 };
  var reemplazadas = {};
  plan.distribucion.filas.forEach(function (f) {
    if (f.estado !== 'conflicto') return;
    var eleccion = d[String(f.n)];
    if (eleccion !== 'conservar' && eleccion !== 'reemplazar' && eleccion !== 'agregar') {
      throw amistoso_('Falta decidir qué hacer con el conflicto de la fila ' + f.n + ' del archivo.');
    }
    if (eleccion === 'conservar') {
      f.estado = 'conservada';
      cuenta.conservadas += 1;
    } else if (eleccion === 'agregar') {
      f.estado = 'nueva';
    } else {
      if (f.conflicto.total !== 1) throw amistoso_('La fila ' + f.n + ' se parece a varias filas del libro: elija «agregar» o «conservar».');
      var destinoFila = f.conflicto.existentes[0].fila;
      if (reemplazadas[destinoFila]) {
        throw amistoso_('Las filas ' + reemplazadas[destinoFila] + ' y ' + f.n + ' del archivo quieren reemplazar la misma fila del libro (la ' +
          destinoFila + '). Elija «reemplazar» solo para una de las dos.');
      }
      reemplazadas[destinoFila] = f.n;
      f.estado = 'reemplaza';
      f.filaLibro = destinoFila;
      f.previo = {
        fila: f.filaLibro, fecha: f.conflicto.existentes[0].fecha, destino: f.conflicto.existentes[0].destino,
        familia: f.conflicto.existentes[0].familia, producto: f.conflicto.existentes[0].producto,
        presentacion: f.conflicto.existentes[0].presentacion, cantidad: f.conflicto.existentes[0].cantidad,
        kilosUnitario: f.conflicto.existentes[0].kilosUnitario, kg: f.conflicto.existentes[0].kilosTotal,
        observaciones: f.conflicto.existentes[0].observaciones,
      };
      cuenta.reemplazan += 1;
    }
  });
  var r = plan.distribucion.resumen;
  r.conflictos = 0;
  r.reemplazan = cuenta.reemplazan;
  r.conservadas = cuenta.conservadas;
  r.nuevas = plan.distribucion.filas.filter(function (f) { return f.estado === 'nueva'; }).length;
}

/** Programa UNA publicación para el minuto siguiente: el tablero muestra lo cargado sin esperar a los 5 minutos. */
function programarPublicacion_() {
  PropertiesService.getScriptProperties().setProperty(PROP_PENDIENTE, String(Date.now()));
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'publicarTrasCarga') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('publicarTrasCarga').timeBased().after(60 * 1000).create();
}

/** La ejecuta el disparador de una sola vez de programarPublicacion_. */
function publicarTrasCarga() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'publicarTrasCarga') ScriptApp.deleteTrigger(t);
  });
  return precalentarAhora();
}

function aplicarCarga_(carga, decisiones) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw amistoso_('Hay otra carga en curso. Espere un momento y vuelva a intentar.');
  try {
    var ctx = leerContextoCarga_();
    var plan = planificarCarga_(carga, ctx);
    if (plan.errores.length > 0) throw amistoso_(plan.errores[0]);
    if (plan.distribucion) aplicarDecisiones_(plan, decisiones);
    if (plan.contratacion) aplicarDecisionesContratos_(plan, decisiones);
    if (!cargaTieneAlgoParaEscribir_(plan)) throw amistoso_('No hay nada nuevo para cargar. Lo que se dejó como «conservar» queda como está en el libro.');

    var libroId = idLibroOficial_();
    var libroF = idLibroFaltantes_();
    var res = {
      nuevas: 0, completadas: 0, repetidas: 0, conProblema: 0, faltantes: 0, totales: 0, reemplazadas: 0, conservadas: 0,
      contratosNuevos: 0, contratosCambiados: 0, contratosDejados: 0, destinosNuevos: 0,
      fuente: carga.fuente,
    };
    var libroC = idLibroContratacion_();

    // Primero se comprueba todo; solo si el libro sigue como se vio, se escribe.
    if (plan.distribucion) verificarSinCambios_(plan, ctx, libroId);
    if (plan.destinosNuevos) verificarDestinos_(plan, ctx, libroId);
    if (plan.contratacion) verificarContratos_(plan, ctx, libroC);

    // Los destinos van primero: los envíos de esta carga ya se clasifican con ellos.
    if (plan.destinosNuevos) res.destinosNuevos = escribirDestinos_(plan, ctx, libroId);
    if (plan.contratacion) {
      res.contratosNuevos = escribirContratos_(plan, ctx, libroC);
      res.contratosCambiados = plan.contratacion.resumen.reemplazan || 0;
      res.contratosDejados = plan.contratacion.resumen.conservadas || 0;
      try {
        registrarReemplazosContratos_(libroC, plan.contratacion.filas.filter(function (f) { return f.estadoFila === 'reemplaza'; })
          .map(function (f) { return f.previo; }));
      } catch (e) { Logger.log('No se pudo guardar lo reemplazado de contratos: ' + e); }
    }
    if (plan.distribucion) {
      res.completadas = plan.distribucion.resumen.completan;
      res.repetidas = plan.distribucion.resumen.duplicadas;
      res.conProblema = plan.distribucion.resumen.conProblema;
      res.reemplazadas = plan.distribucion.resumen.reemplazan || 0;
      res.conservadas = plan.distribucion.resumen.conservadas || 0;
      res.nuevas = escribirDistribucion_(plan, ctx, libroId);
      try {
        registrarReemplazos_(libroId, plan.distribucion.filas.filter(function (f) { return f.estado === 'reemplaza'; })
          .map(function (f) { return f.previo; }));
      } catch (e) { Logger.log('No se pudo guardar lo reemplazado: ' + e); }
    }
    if (plan.queHaceFalta && plan.queHaceFalta.reemplaza) res.faltantes = escribirFaltantes_(plan, ctx, libroF);
    if (plan.informacionGeneral && plan.informacionGeneral.errores.length === 0) res.totales = escribirTotales_(plan, ctx, libroF);

    try { registrarCarga_(libroId, res); } catch (e) { Logger.log('No se pudo registrar la carga: ' + e); }
    programarPublicacion_();
    return { ok: true, cargado: res };
  } finally {
    lock.releaseLock();
  }
}
