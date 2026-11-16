/**
 * Oficial.gs  (MIGRACIÓN: no se pega en el proyecto de producción)
 * -----------------------------------------------------------------------
 * Parser de las pestañas diarias del Excel OFICIAL de despachos
 * («25-08-2026», «26-08-2026»…). Funciones PURAS: reciben la matriz de
 * valores y devuelven registros; no leen hojas (eso es Sheetservice.js).
 *
 * POR QUÉ NO SE LEEN COMO LAS HOJAS PLANAS
 *
 * filasAObjetos_ asume encabezado en la fila 1 y una fila por registro.
 * Cada pestaña diaria trae, en cambio:
 *
 *   fila 1    título («DESPACHOS DEL 25/08/2026»)
 *   fila 2    nota
 *   fila 4    encabezados (N°, Municipio / destino, Producto, …)
 *   luego     una cabecera «MUNICIPIO / DESTINO: X» por grupo, los
 *             registros numerados, y un «SUBTOTAL X» al cierre
 *   al final  «TOTAL DEL DÍA dd/mm/aaaa»
 *
 * Y la FECHA no es una columna: es el nombre de la pestaña.
 *
 * LAS COLUMNAS SE BUSCAN POR NOMBRE, NO POR POSICIÓN
 *
 * Si alguien inserta una columna, el parser sigue leyendo bien; si falta
 * una obligatoria, la pestaña se rechaza entera con un aviso en lugar de
 * leer cantidades de la columna equivocada.
 *
 * LA REGLA DE ESTE ARCHIVO: NO COMPLETAR NADA
 *
 * Un número que no se puede leer queda null y se avisa. Nunca 0.
 * Los subtotales y totales del Excel NO se suman: se usan solo para
 * verificar que el parser leyó lo mismo que ellos (ver
 * verificarDiaOficial_).
 * -----------------------------------------------------------------------
 */

/** Pestañas diarias: dd-mm-aaaa. Cualquier otra pestaña no es un día. */
var RE_PESTANA_DIA_ = /^(\d{2})-(\d{2})-(\d{4})$/;

/** Columnas por nombre normalizado. `obligatoria`: sin ella no se lee el día. */
var COLUMNAS_OFICIAL_ = {
  n: { texto: 'N°', obligatoria: true },
  destino: { texto: 'MUNICIPIO / DESTINO', obligatoria: true },
  producto: { texto: 'PRODUCTO', obligatoria: true },
  productoConsolidado: { texto: 'PRODUCTO CONSOLIDADO', obligatoria: false },
  familia: { texto: 'FAMILIA', obligatoria: true },
  presentacion: { texto: 'PRESENTACION', obligatoria: false },
  cantidad: { texto: 'CANTIDAD', obligatoria: true },
  pesoUnitarioKg: { texto: 'PESO APROX. POR UNIDAD (KG)', obligatoria: false },
  pesoTotalKg: { texto: 'PESO TOTAL APROX. (KG)', obligatoria: false },
  toneladas: { texto: 'TONELADAS APROX.', obligatoria: false },
  fuentePeso: { texto: 'FUENTE DEL PESO UTILIZADO', obligatoria: false },
  documento: { texto: 'DOCUMENTO DE ORIGEN', obligatoria: false },
  pagina: { texto: 'PAGINA', obligatoria: false },
  observaciones: { texto: 'OBSERVACIONES', obligatoria: false },
};

/** «25-08-2026» -> «2026-08-25», o null si no es un día válido. */
function fechaDePestana_(nombre) {
  var m = RE_PESTANA_DIA_.exec(String(nombre || '').trim());
  if (!m) return null;
  var d = Number(m[1]);
  var mes = Number(m[2]);
  var a = Number(m[3]);
  if (mes < 1 || mes > 12 || d < 1 || d > 31) return null;
  // Date.UTC normaliza el 31 de febrero a marzo; se compara para rechazarlo.
  var f = new Date(Date.UTC(a, mes - 1, d));
  if (f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== d) return null;
  return m[3] + '-' + m[2] + '-' + m[1];
}

/**
 * Número de una celda. Acepta lo que Sheets entrega como número y, si la
 * celda llegó como texto, SOLO el formato en que el Excel oficial lo
 * muestra («1,400.00»: coma de miles, punto decimal). Cualquier otra cosa
 * es null: «1.400» sin contexto puede ser mil cuatrocientos o uno coma
 * cuatro, y adivinar cambia la cifra por un factor de mil.
 */
function numeroOficial_(celda) {
  if (celda === null || celda === undefined) return null;
  if (typeof celda === 'number') return isFinite(celda) ? celda : null;

  var s = String(celda).trim();
  if (s === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(s) || /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    return Number(s.replace(/,/g, ''));
  }
  return null;
}

/** Índice de columnas a partir de la fila de encabezados, o null. */
function indiceDeColumnas_(filaEncabezados) {
  var porNombre = {};
  (filaEncabezados || []).forEach(function (h, i) {
    var k = normalizeText_(h);
    if (k && porNombre[k] === undefined) porNombre[k] = i;
  });

  var indice = {};
  var faltan = [];
  Object.keys(COLUMNAS_OFICIAL_).forEach(function (campo) {
    var def = COLUMNAS_OFICIAL_[campo];
    var i = porNombre[normalizeText_(def.texto)];
    if (i === undefined) {
      if (def.obligatoria) faltan.push(def.texto);
    } else {
      indice[campo] = i;
    }
  });
  return { indice: indice, faltan: faltan };
}

function celdaTexto_(fila, indice, campo) {
  var i = indice[campo];
  if (i === undefined) return null;
  var v = fila[i];
  if (v === null || v === undefined) return null;
  var s = String(v).replace(/\s+/g, ' ').trim();
  return s === '' ? null : s;
}

/**
 * Lee una pestaña diaria.
 *
 * @param {string} nombrePestana  «25-08-2026»
 * @param {Array<Array>} matriz   valores de la hoja, fila por fila
 * @return {{
 *   fecha: string, registros: Array, advertencias: Array<string>,
 *   totalDia: {unidades: number|null, pesoKg: number|null, toneladas: number|null}|null,
 *   rechazada: boolean
 * }}
 */
function parsearDiaOficial_(nombrePestana, matriz) {
  var fecha = fechaDePestana_(nombrePestana);
  var salida = { fecha: fecha, registros: [], advertencias: [], totalDia: null, rechazada: false };
  var donde = 'Pestaña ' + nombrePestana + ': ';

  if (!fecha) {
    salida.rechazada = true;
    salida.advertencias.push(donde + 'el nombre no es una fecha dd-mm-aaaa.');
    return salida;
  }

  // El encabezado es la primera fila (dentro de las 15 primeras) cuya
  // primera celda sea «N°». Buscarlo y no fijarlo en la fila 4 tolera que
  // alguien agregue una línea de nota arriba.
  var filaEnc = -1;
  for (var i = 0; i < Math.min(15, matriz.length); i++) {
    if (normalizeText_((matriz[i] || [])[0]) === normalizeText_('N°')) {
      filaEnc = i;
      break;
    }
  }
  if (filaEnc === -1) {
    salida.rechazada = true;
    salida.advertencias.push(donde + 'no se encontró la fila de encabezados (primera celda «N°»).');
    return salida;
  }

  var cols = indiceDeColumnas_(matriz[filaEnc]);
  if (cols.faltan.length > 0) {
    salida.rechazada = true;
    salida.advertencias.push(donde + 'faltan columnas obligatorias: ' + cols.faltan.join(', ') + '.');
    return salida;
  }
  var ix = cols.indice;

  for (var r = filaEnc + 1; r < matriz.length; r++) {
    var fila = matriz[r] || [];
    var c0 = fila[0];
    var c1 = fila[1];
    var dondeFila = donde + 'fila ' + (r + 1) + ': ';

    // «TOTAL DEL DÍA dd/mm/aaaa»: solo para verificar.
    if (normalizeText_(c1).indexOf('TOTAL DEL DIA') === 0) {
      salida.totalDia = {
        unidades: numeroOficial_(fila[ix.cantidad]),
        pesoKg: ix.pesoTotalKg !== undefined ? numeroOficial_(fila[ix.pesoTotalKg]) : null,
        toneladas: ix.toneladas !== undefined ? numeroOficial_(fila[ix.toneladas]) : null,
      };
      continue;
    }

    // Registro = N° entero. Cabeceras de grupo y subtotales no lo tienen.
    var n = numeroOficial_(c0);
    if (n === null || Math.floor(n) !== n) continue;

    var destino = celdaTexto_(fila, ix, 'destino');
    var producto = celdaTexto_(fila, ix, 'producto');
    var familia = celdaTexto_(fila, ix, 'familia');
    if (!destino || !producto) {
      salida.advertencias.push(dondeFila + 'registro ' + n + ' sin destino o sin producto. Omitido.');
      continue;
    }

    var cantidad = numeroOficial_(fila[ix.cantidad]);
    if (cantidad === null || cantidad < 0) {
      // Sin cantidad no hay entrega que contar. Se avisa; NO se asume 0.
      salida.advertencias.push(dondeFila + 'registro ' + n + ' (' + producto + ') sin cantidad válida. Omitido.');
      continue;
    }
    if (!familia) {
      salida.advertencias.push(dondeFila + 'registro ' + n + ' (' + producto + ') sin familia. Se publica sin categoría.');
    }

    salida.registros.push({
      fecha: fecha,
      n: n,
      destino: destino,
      producto: celdaTexto_(fila, ix, 'productoConsolidado') || producto,
      productoOriginal: producto,
      familia: familia,
      presentacion: celdaTexto_(fila, ix, 'presentacion'),
      presentacionCanonica: presentacionCanonica_(celdaTexto_(fila, ix, 'presentacion')),
      cantidad: cantidad,
      pesoUnitarioKg: ix.pesoUnitarioKg !== undefined ? numeroOficial_(fila[ix.pesoUnitarioKg]) : null,
      pesoTotalKg: ix.pesoTotalKg !== undefined ? numeroOficial_(fila[ix.pesoTotalKg]) : null,
      fuentePeso: celdaTexto_(fila, ix, 'fuentePeso'),
      documento: celdaTexto_(fila, ix, 'documento'),
      pagina: celdaTexto_(fila, ix, 'pagina'),
      observaciones: celdaTexto_(fila, ix, 'observaciones'),
      // Marcas de calidad que el propio Excel deja escritas en texto. Se
      // convierten en booleanos acá para que nadie las busque con una
      // regex distinta en otro lado.
      porVerificar: /POR VERIFICAR/i.test(celdaTexto_(fila, ix, 'observaciones') || ''),
      pesoSinSoporte: /NO ES POSIBLE DETERMINAR/i.test(celdaTexto_(fila, ix, 'fuentePeso') || ''),
      filaOrigen: r + 1,
    });
  }

  if (salida.registros.length === 0) {
    salida.advertencias.push(donde + 'no tiene registros.');
  }
  return salida;
}

/**
 * Compara lo leído con el «TOTAL DEL DÍA» que trae la propia pestaña.
 * Si no coinciden, el parser leyó algo distinto de lo que el Excel suma
 * (un registro omitido, un peso ilegible) y hay que mirar la pestaña.
 * @return {Array<string>} advertencias
 */
function verificarDiaOficial_(nombrePestana, dia) {
  var out = [];
  var donde = 'Pestaña ' + nombrePestana + ': ';
  if (dia.rechazada) return out;

  if (!dia.totalDia) {
    out.push(donde + 'no trae fila «TOTAL DEL DÍA»; no se pudo verificar.');
    return out;
  }

  var unidades = 0;
  var pesoKg = 0;
  var sinPeso = 0;
  dia.registros.forEach(function (x) {
    unidades += x.cantidad;
    if (x.pesoTotalKg === null) sinPeso += 1;
    else pesoKg += x.pesoTotalKg;
  });

  if (dia.totalDia.unidades !== null && Math.abs(unidades - dia.totalDia.unidades) > 0.5) {
    out.push(donde + 'unidades leídas ' + unidades + ' ≠ TOTAL DEL DÍA ' + dia.totalDia.unidades + '.');
  }
  if (dia.totalDia.pesoKg !== null && Math.abs(pesoKg - dia.totalDia.pesoKg) > 1) {
    out.push(donde + 'peso leído ' + round2_(pesoKg) + ' kg ≠ TOTAL DEL DÍA ' + dia.totalDia.pesoKg + ' kg.');
  }
  if (sinPeso > 0) {
    out.push(donde + sinPeso + ' registros sin peso total legible.');
  }
  return out;
}

// --- presentación -------------------------------------------------------

/**
 * La palabra principal de cada presentación -> su forma canónica.
 * El Excel trae 121 escrituras («Unidad», «unidad», «Paca x 24»,
 * «Unidad (kit)», «bulto 25kg»…) que son unas quince cosas.
 */
var PRESENTACION_CANONICA_ = {
  UNIDAD: 'unidad', UNIDADES: 'unidad',
  KIT: 'kit', KITS: 'kit', COMBO: 'kit', JUEGO: 'kit', SET: 'kit',
  CAJA: 'caja', CAJAS: 'caja',
  PACA: 'paca', PACAS: 'paca',
  PAQUETE: 'paquete', PAQUETES: 'paquete', PACK: 'paquete',
  BOLSA: 'bolsa', BOLSAS: 'bolsa',
  BULTO: 'bulto', BULTOS: 'bulto', COSTAL: 'bulto',
  ROLLO: 'rollo', ROLLOS: 'rollo',
  SOBRE: 'sobre', SOBRES: 'sobre',
  PAR: 'par', PARES: 'par',
  PRENDA: 'prenda', PRENDAS: 'prenda',
  LATA: 'envase', TARRO: 'envase', ENVASE: 'envase', BOTELLA: 'envase', CANECA: 'envase',
  BALDE: 'envase', AEROSOL: 'envase', BARRA: 'envase',
  KG: 'kg', KILOGRAMO: 'kg', KILOGRAMOS: 'kg',
  LIBRA: 'libra', LIBRAS: 'libra', LB: 'libra',
  ARROBA: 'arroba', ARROBAS: 'arroba',
  LITRO: 'litro', LITROS: 'litro', L: 'litro',
  GALON: 'galón', GALONES: 'galón',
};

/**
 * Presentación canónica de una celda.
 *
 * Se toma SOLO la primera palabra: lo que sigue («x 24», «(kit)», «25kg»,
 * «1 L») describe el contenido de cada unidad, no cuántas hay, y la
 * cantidad de la fila cuenta paquetes, no lo que traen adentro. Lo que no
 * se reconoce queda como «otra» (se cuenta, no se descarta); lo vacío o
 * «No registrada» / «Sin unidad» queda como «sin dato».
 */
function presentacionCanonica_(texto) {
  var k = normalizeText_(texto);
  if (!k) return 'sin dato';
  var cabeza = /^[A-Z]+/.exec(k);
  cabeza = cabeza ? cabeza[0] : '';
  if (cabeza === 'NO' || cabeza === 'SIN') return 'sin dato';
  return PRESENTACION_CANONICA_[cabeza] || 'otra';
}

// --- categorías ---------------------------------------------------------

var _familiaCategoria_ = null;

function indiceFamilias_() {
  if (_familiaCategoria_ !== null) return _familiaCategoria_;
  var idx = Object.create(null);
  Object.keys(REGLAS.FAMILIA_CATEGORIA).forEach(function (f) {
    idx[normalizeText_(f)] = REGLAS.FAMILIA_CATEGORIA[f];
  });
  (REGLAS.FAMILIAS_FUERA_DE_CATEGORIA || []).forEach(function (f) {
    idx[normalizeText_(f)] = null;
  });
  _familiaCategoria_ = idx;
  return idx;
}

/**
 * Categoría (una de CONFIG.CATEGORIAS) de una familia del Excel.
 * @return {{categoria: string|null, conocida: boolean}} `conocida: false`
 *   es una familia nueva: no se adivina, se avisa y queda fuera.
 */
function categoriaDeFamilia_(familia) {
  var k = normalizeText_(familia);
  var idx = indiceFamilias_();
  if (k in idx) return { categoria: idx[k], conocida: true };
  return { categoria: null, conocida: false };
}
