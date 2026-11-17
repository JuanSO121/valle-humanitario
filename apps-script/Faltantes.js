/**
 * Faltantes.gs
 * -----------------------------------------------------------------------
 * GET ?route=faltantes
 *
 * «¿Qué hace falta hoy?»: lo que el equipo del centro de acopio anota en
 * la plantilla QUE_HACE_FALTA. Cada fila dice, de un elemento, si está
 * Agotado, Escaso o en Buena cantidad.
 *
 *   Categoría | Elemento | Estado | Observaciones
 *
 * Los datos los escribe una persona, así que acá se desconfía de todo:
 *
 * · Una categoría que no sea una de las 7 no se publica (se avisa). El
 *   tablero no inventa categorías.
 * · Un estado que no sea uno de los tres NO se convierte en otro: la fila
 *   se omite y se avisa. «No se revisó» no es «agotado» ni «suficiente».
 * · Las 7 categorías salen SIEMPRE, aunque estén vacías: son las tarjetas
 *   de la página.
 *
 * Es lo único del tablero que caduca en horas, así que viaja con su
 * `actualizadoEn` y no se siembra desde el navegador.
 * -----------------------------------------------------------------------
 */

var ESTADOS_FALTANTES_ = {
  'AGOTADO': 'Agotado',
  'ESCASO': 'Escaso',
  'BUENA CANTIDAD': 'Buena cantidad',
};

/**
 * Filas de la plantilla a partir de la matriz de la hoja. El encabezado
 * es la primera fila cuya primera celda dice «Categoría»: las de arriba
 * son título e instrucciones.
 * @return {{filas: Array, advertencias: Array<string>}}
 */
function parsearFaltantes_(matriz) {
  var advertencias = [];
  var inicio = -1;
  for (var i = 0; i < Math.min(15, matriz.length); i++) {
    if (normalizeText_((matriz[i] || [])[0]) === 'CATEGORIA') { inicio = i; break; }
  }
  if (inicio === -1) {
    return { filas: [], advertencias: ['No se encontró la fila de encabezados (primera celda «Categoría»).'] };
  }

  var enc = matriz[inicio].map(function (h) { return normalizeText_(h); });
  var col = {
    categoria: enc.indexOf('CATEGORIA'),
    elemento: enc.indexOf('ELEMENTO'),
    estado: enc.indexOf('ESTADO'),
    observaciones: enc.indexOf('OBSERVACIONES'),
  };
  if (col.elemento === -1 || col.estado === -1) {
    return { filas: [], advertencias: ['Faltan las columnas «Elemento» o «Estado».'] };
  }

  var filas = [];
  for (var r = inicio + 1; r < matriz.length; r++) {
    var f = matriz[r] || [];
    var elemento = textoOrNull_(f[col.elemento]);
    // Las filas con solo la categoría son la plantilla sin rellenar.
    if (!elemento) continue;

    var donde = 'fila ' + (r + 1) + ' (' + elemento + '): ';
    var categoria = CONFIG.CATEGORIAS.filter(function (c) {
      return normalizeText_(c) === normalizeText_(f[col.categoria]);
    })[0];
    if (!categoria) {
      advertencias.push(donde + 'categoría "' + f[col.categoria] + '" no es una de las 7. Fila omitida.');
      continue;
    }
    var estado = ESTADOS_FALTANTES_[normalizeText_(f[col.estado])];
    if (!estado) {
      advertencias.push(donde + 'estado "' + f[col.estado] + '" no es Agotado, Escaso ni Buena cantidad. Fila omitida.');
      continue;
    }
    filas.push({
      categoria: categoria,
      nombre: elemento,
      estado: estado,
      observacion: col.observaciones === -1 ? null : textoOrNull_(f[col.observaciones]),
    });
  }
  return { filas: filas, advertencias: advertencias };
}

function leerFaltantes_() {
  var libroId = idLibroFaltantes_();
  var nombre = CONFIG.SHEETS.FALTANTES;
  if (!libroId) return { filas: [], advertencias: ['No hay libro de plantilla configurado.'], existe: false };
  // La plantilla y, en el mismo libro, FAMILIAS: de ahí sale qué incluye cada categoría.
  var pestanas = leerPestanasDeLibro_(libroId, function (n) {
    return n === nombre || n === CONFIG.SHEETS.FAMILIAS;
  });
  var plantilla = pestanas.filter(function (p) { return p.nombre === nombre; })[0];
  if (!plantilla) return { filas: [], advertencias: ['La hoja ' + nombre + ' no existe.'], existe: false };
  var leido = parsearFaltantes_(plantilla.matriz);
  leido.existe = true;
  var hojaFamilias = pestanas.filter(function (p) { return p.nombre === CONFIG.SHEETS.FAMILIAS; })[0];
  leido.incluye = incluyePorCategoria_(hojaFamilias ? filasAObjetos_(hojaFamilias.matriz, null) : []);
  return leido;
}

/**
 * Qué incluye cada categoría: los grupos de producto (familias) que la hoja
 * FAMILIAS asigna a ella, en su orden. Lo que quedó «fuera de categoría» no se
 * lista: no pertenece a ninguna de las 7.
 * @return {Object<string, Array<string>>} categoría -> familias
 */
function incluyePorCategoria_(filasFamilias) {
  var out = Object.create(null);
  filasFamilias.forEach(function (f) {
    var fam = textoOrNull_(f.familia);
    var cat = CONFIG.CATEGORIAS.filter(function (c) {
      return normalizeText_(c) === normalizeText_(f.categoria);
    })[0];
    if (!fam || !cat) return;
    (out[cat] = out[cat] || []).push(fam);
  });
  return out;
}

var ORDEN_ESTADO_ = { 'Agotado': 0, 'Escaso': 1, 'Buena cantidad': 2 };

function buildFaltantes_() {
  var leido;
  try {
    leido = leerFaltantes_();
  } catch (err) {
    Logger.log('Faltantes: no se pudo leer la plantilla: ' + err);
    return { disponible: false, motivo: 'No se pudo leer la plantilla.', fuente: 'QUE_HACE_FALTA' };
  }

  // Sin plantilla no hay sección: una lista vacía no es «no falta nada».
  if (!leido.existe) return { disponible: false, motivo: 'La plantilla no existe.', fuente: 'QUE_HACE_FALTA' };

  var categorias = CONFIG.CATEGORIAS.map(function (nombre) {
    // Primero lo agotado, después lo escaso, al final lo cubierto; dentro
    // de cada estado, alfabético, para que la lista no se reordene sola.
    var elementos = leido.filas
      .filter(function (f) { return f.categoria === nombre; })
      .map(function (f) { return { nombre: f.nombre, estado: f.estado, observacion: f.observacion }; })
      .sort(function (a, b) {
        return ORDEN_ESTADO_[a.estado] - ORDEN_ESTADO_[b.estado] || a.nombre.localeCompare(b.nombre, 'es');
      });
    return {
      nombre: nombre,
      // Qué grupos de producto abarca la categoría (de la hoja FAMILIAS).
      incluye: (leido.incluye && leido.incluye[nombre]) || [],
      elementos: elementos,
      total: elementos.length,
      agotados: elementos.filter(function (e) { return e.estado === 'Agotado'; }).length,
      escasos: elementos.filter(function (e) { return e.estado === 'Escaso'; }).length,
    };
  });

  return {
    disponible: true,
    actualizadoEn: new Date().toISOString(),
    categorias: categorias,
    totalElementos: leido.filas.length,
    fuente: 'QUE_HACE_FALTA',
  };
}

/** Para el editor: qué filas de la plantilla no se publican y por qué. */
function revisarFaltantes() {
  var leido = leerFaltantes_();
  var lineas = ['QUE_HACE_FALTA: ' + leido.filas.length + ' elementos, ' + leido.advertencias.length + ' advertencias.'];
  leido.advertencias.forEach(function (a) { lineas.push('  · ' + a); });
  var salida = lineas.join('\n');
  Logger.log(salida);
  return salida;
}
