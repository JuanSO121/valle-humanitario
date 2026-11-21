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
    if (pedido.accion === 'aplicar') return jsonResponse_(aplicarCarga_(pedido.carga));
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
  return construirContexto_(
    porNombre[CONFIG.SHEETS.DESPACHOS], porNombre[CONFIG.SHEETS.DESTINOS], porNombre[CONFIG.SHEETS.FAMILIAS],
    otras[CONFIG.SHEETS.FALTANTES] || null, otras[CONFIG.SHEETS.TOTALES] || null, hoyIso_());
}

function claveDespacho_(fecha, destino, familia, producto, kg) {
  return [fecha, normalizeText_(destino), normalizeText_(familia), normalizeText_(producto || ''),
    (Math.round(kg * 1000) / 1000).toFixed(3)].join('|');
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
    }
  }
  return { existentes: existentes, pendientes: pendientes, ultimaFila: ultimaFila };
}

function construirContexto_(mDespachos, mDestinos, mFamilias, mFaltantes, mTotales, hoy) {
  var destinosIdx = indexarDestinos_(filasAObjetos_(mDestinos, null), []);
  var familiasIdx = indexarFamilias_(filasAObjetos_(mFamilias, null));
  var analisis = analizarDespachosExistentes_(mDespachos);
  var faltantesActual = mFaltantes ? parsearFaltantes_(mFaltantes).filas.length : null;
  var totalesActual = mTotales ? parsearTotales_(mTotales) : { recibidas: null, inventario: null };
  return {
    hoy: hoy,
    destinosIdx: destinosIdx,
    familiasIdx: familiasIdx,
    existentes: analisis.existentes,
    pendientes: analisis.pendientes,
    ultimaFila: analisis.ultimaFila,
    faltantesActual: faltantesActual,
    totalesActual: totalesActual,
    matrizFaltantes: mFaltantes,
    matrizTotales: mTotales,
  };
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

function planificarDistribucion_(filas, ctx) {
  var salida = [];
  var usados = {};
  var existentes = {};
  Object.keys(ctx.existentes).forEach(function (k) { existentes[k] = ctx.existentes[k]; });
  var pendientes = {};
  Object.keys(ctx.pendientes).forEach(function (k) { pendientes[k] = ctx.pendientes[k].slice(); });
  var manana = sumarUnDia_(ctx.hoy);

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
        fila.estado = 'duplicada';
      } else {
        var kp = fecha + '|' + normalizeText_(tDestino.valor);
        var libres = pendientes[kp];
        if (libres && libres.length > 0) {
          var p = libres.shift();
          fila.estado = 'completa';
          fila.filaLibro = p.fila;
          fila.observacionesPrevias = p.observaciones;
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
  var plan = { errores: [], avisos: [], informacionGeneral: null, queHaceFalta: null, distribucion: null };
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
      plan.queHaceFalta = {
        antes: ctx.faltantesActual, despues: buenas, filas: ff,
        reemplaza: buenas > 0,
      };
      if (buenas === 0) plan.avisos.push('«Qué hace falta» no tiene ninguna fila válida: la lista actual no se cambia.');
    }
  }

  if (carga.distribucion !== undefined && carga.distribucion !== null) {
    hay = true;
    if (!Array.isArray(carga.distribucion)) {
      plan.errores.push('«distribucion» debe ser una lista.');
    } else if (carga.distribucion.length > CARGA_MAX_FILAS_) {
      plan.errores.push('«distribucion» tiene más de ' + CARGA_MAX_FILAS_ + ' filas. Divida el archivo.');
    } else {
      var dd = planificarDistribucion_(carga.distribucion, ctx);
      var cuenta = { nueva: 0, completa: 0, duplicada: 0, error: 0 };
      var conAviso = 0;
      dd.forEach(function (f) { cuenta[f.estado] += 1; if (f.avisos.length) conAviso += 1; });
      plan.distribucion = {
        filas: dd,
        resumen: { nuevas: cuenta.nueva, completan: cuenta.completa, duplicadas: cuenta.duplicada, conProblema: cuenta.error, conAviso: conAviso },
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
    if (r.nuevas + r.completan > 0) return true;
  }
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

function escribirDistribucion_(plan, ctx, libroId) {
  var datos = [];
  var nuevas = [];
  plan.distribucion.filas.forEach(function (f) {
    if (f.estado === 'completa') {
      var obs = f.observaciones || f.observacionesPrevias || '';
      datos.push({ range: rangoA1_(CONFIG.SHEETS.DESPACHOS, 'A', f.filaLibro, 'J', f.filaLibro), values: [valoresDeFila_(f, obs)] });
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
  Sheets.Spreadsheets.Values.clear({}, libroF, rangoA1_(CONFIG.SHEETS.FALTANTES, 'A', primera, 'D'));
  asegurarFilas_(libroF, CONFIG.SHEETS.FALTANTES, primera + filas.length);
  Sheets.Spreadsheets.Values.update(
    { values: filas }, libroF, rangoA1_(CONFIG.SHEETS.FALTANTES, 'A', primera, 'D', primera + filas.length - 1),
    { valueInputOption: 'RAW' });
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
    hoja.appendRow(['cuando', 'filas_nuevas', 'filas_completadas', 'filas_repetidas', 'filas_con_problema', 'que_hace_falta', 'totales', 'fuente']);
    hoja.hideSheet();
  }
  hoja.appendRow([
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    resumen.nuevas, resumen.completadas, resumen.repetidas, resumen.conProblema, resumen.faltantes, resumen.totales, resumen.fuente || '',
  ]);
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

function aplicarCarga_(carga) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw amistoso_('Hay otra carga en curso. Espere un momento y vuelva a intentar.');
  try {
    var ctx = leerContextoCarga_();
    var plan = planificarCarga_(carga, ctx);
    if (plan.errores.length > 0) throw amistoso_(plan.errores[0]);
    if (!cargaTieneAlgoParaEscribir_(plan)) throw amistoso_('No hay nada nuevo para cargar.');

    var libroId = idLibroOficial_();
    var libroF = idLibroFaltantes_();
    var res = { nuevas: 0, completadas: 0, repetidas: 0, conProblema: 0, faltantes: 0, totales: 0, fuente: carga.fuente };

    if (plan.distribucion) {
      res.completadas = plan.distribucion.resumen.completan;
      res.repetidas = plan.distribucion.resumen.duplicadas;
      res.conProblema = plan.distribucion.resumen.conProblema;
      res.nuevas = escribirDistribucion_(plan, ctx, libroId);
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
