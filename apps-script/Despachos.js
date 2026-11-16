/**
 * Despachos.gs
 * -----------------------------------------------------------------------
 * Todo lo que el tablero cuenta de las entregas sale de acá, y acá sale
 * de UNA sola fuente: la hoja plana DESPACHOS del libro de despachos.
 *
 *   GET ?route=resumen     totales, corte, calidad
 *   GET ?route=municipios  los 42, con toneladas y categorías
 *   GET ?route=otras       fundaciones, otros departamentos, entidades
 *   GET ?route=categorias  las 7 categorías y lo que quedó fuera
 *
 * Las cuatro rutas son vistas de UN cálculo (tableroDespachos_), que se
 * hace una vez por ejecución: no hay lecturas ni agregaciones repetidas
 * por ruta.
 *
 * ESTE ARCHIVO NO INTERPRETA TEXTO
 *
 * Cada kilo se clasifica con las hojas DESTINOS y FAMILIAS del mismo
 * libro: el `destino_original` de la fila se busca en DESTINOS (tipo,
 * municipio, regla) y su `familia` en FAMILIAS (categoría). Esas dos hojas
 * son donde se revisa y se corrige la clasificación, a la vista de todos.
 * El backend hace el cruce él mismo y NO depende de las columnas grises
 * de DESPACHOS (tipo_destino, municipio_dane, categoría…): son fórmulas
 * para que la gente las vea, y si alguien agrega filas sin copiarlas, el
 * tablero cuenta igual de bien. (Su verificación sí las usa: ver
 * RESUMEN_MUNICIPIO en el libro.)
 *
 * Lo que no se encuentra no se esconde ni se reparte: cuenta en el total
 * y se avisa en `calidad`. El backend no adivina nada.
 *
 * LA MEDIDA ES EL PESO
 *
 * `cantidad` mezcla presentaciones (kit, caja, rollo…) y sumarlas no
 * significa nada. El tablero habla en toneladas APROXIMADAS, las del
 * propio Excel; nunca se estiman multiplicando entregas por un factor.
 *
 * ÚNICA EXCEPCIÓN: ESTIMADO PROVISIONAL (11 al 24 de agosto)
 *
 * Esos días vienen del Excel anterior solo con fecha y destino, sin pesos
 * reales. Mientras se completan, se muestra la cifra por día que ese Excel ya
 * había estimado (hoja ESTIMADO_ANTERIOR), repartida por igual entre los
 * despachos del día. Queda marcada como ESTIMADA solo en los datos
 * (`calidad.estimado`, `municipio.estimado`); el sitio público no lo avisa. Cada despacho que recibe su peso real reemplaza su
 * parte. Se apaga con CONFIG.MOSTRAR_ESTIMADO_PROVISIONAL = false.
 *
 * NUEVOS_DESPACHOS: hoja de captura simple para quien no es técnico (ver
 * convertirNuevos_). Se lee junto con DESPACHOS.
 *
 * LO QUE EL EXCEL NO DICE, NO SE INVENTA
 *
 * Toneladas recibidas e inventario no están en el libro de despachos. Se
 * publican desde la hoja TOTALES (Totales.js) y, si está vacía, como null: la
 * página dice «sin dato».
 * -----------------------------------------------------------------------
 */

var _despachos_ = null;

function resetDespachos_() { _despachos_ = null; }

/** Columnas sin las cuales cada hoja no se puede leer. */
var COLUMNAS_DESPACHOS_ = [
  'fecha', 'destino_original', 'familia', 'peso_total_kg', 'por_verificar', 'peso_sin_soporte',
];
var COLUMNAS_DESTINOS_ = ['destino_original', 'tipo_destino', 'municipio_dane', 'regla'];
var COLUMNAS_FAMILIAS_ = ['familia', 'categoria'];

/**
 * «2026-08-25», «25/08/2026», una fecha de Sheets o un número de serie
 * -> «2026-08-25». null si no es una fecha.
 */
function fechaIso_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    // Número de serie de hoja de cálculo: días desde el 30-12-1899.
    var d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  if (Object.prototype.toString.call(v) === '[object Date]') {
    // Con la API de Sheets las fechas llegan como texto; un Date solo llega
    // en el respaldo con SpreadsheetApp. toISOString() usa UTC y puede
    // correr el día: se formatea en la zona del script (America/Bogota, ver
    // appsscript.json), que debe ser la misma del libro.
    if (typeof Utilities !== 'undefined' && typeof Session !== 'undefined') {
      return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    return v.toISOString().slice(0, 10);
  }
  var s = String(v).trim();
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return null;
}

/** Falla con un mensaje claro si a una hoja le falta una columna. */
function exigirColumnas_(filas, columnas, hoja) {
  if (filas.length === 0) throw new Error('La hoja "' + hoja + '" no tiene registros.');
  var faltan = columnas.filter(function (c) { return !(c in filas[0]); });
  if (faltan.length > 0) throw new Error('A la hoja "' + hoja + '" le faltan columnas: ' + faltan.join(', ') + '.');
}

/**
 * DESTINOS -> {clave: {tipo, dane, regla}}. La clave es el texto
 * normalizado (sin tildes, mayúsculas, espacios colapsados): igual que
 * BUSCARV, pero tolera una tilde o un espacio de más.
 */
function indexarDestinos_(filas, advertencias) {
  var idx = Object.create(null);
  filas.forEach(function (f) {
    var k = normalizeText_(f.destino_original);
    if (!k) return;
    var reg = {
      tipo: normalizeText_(f.tipo_destino),
      dane: isBlank_(f.municipio_dane) ? '' : String(f.municipio_dane).trim(),
      regla: textoOrNull_(f.regla) || '',
    };
    var previo = idx[k];
    if (previo && (previo.tipo !== reg.tipo || previo.dane !== reg.dane)) {
      advertencias.push('DESTINOS fila ' + f.__row + ': "' + f.destino_original +
        '" está repetido con otra clasificación. Se usa la primera.');
      return;
    }
    if (!previo) idx[k] = reg;
  });
  return idx;
}

/** FAMILIAS -> {clave: categoría}. */
function indexarFamilias_(filas) {
  var idx = Object.create(null);
  filas.forEach(function (f) {
    var k = normalizeText_(f.familia);
    if (k && !(k in idx)) idx[k] = textoOrNull_(f.categoria) || '';
  });
  return idx;
}

/**
 * La hoja NUEVOS_DESPACHOS: la hoja de captura para quien no es técnico.
 * Cada fila lleva fecha, destino (de la lista, o «otro_destino» si no está),
 * familia, producto, cantidad y peso. Se convierte a la forma de DESPACHOS y
 * se suma a esas filas.
 *
 * Solo se PUBLICA lo completo: una fila sin fecha, destino, familia o peso se
 * deja fuera y se cuenta en `calidad.pendientes`. Así los despachos de agosto
 * que vienen del Excel anterior (solo fecha y destino) no suman nada hasta
 * que alguien les ponga el peso: vacío no es cero.
 * @return {{filas: Array, pendientes: Array<{fila: number, motivo: string}>}}
 */
function convertirNuevos_(nuevas, estimados) {
  var filas = [];
  var pendientes = [];

  // ESTIMADO PROVISIONAL (ver CONFIG.MOSTRAR_ESTIMADO_PROVISIONAL): para un día
  // con una cifra del Excel anterior, cada despacho que sigue SIN peso real
  // lleva una parte de esa cifra (la cifra del día entre los despachos del
  // día), marcada `__estimado`. En cuanto se completa un despacho, su parte
  // estimada se cambia por el peso real; el resto sigue estimado.
  var estimadoPorDia = Object.create(null);
  var despachosPorDia = Object.create(null);
  if (CONFIG.MOSTRAR_ESTIMADO_PROVISIONAL) {
    (estimados || []).forEach(function (e) {
      var d = fechaIso_(e.fecha);
      var t = toNumberOrNull_(e.toneladas_estimadas);
      if (d && t !== null && t > 0) estimadoPorDia[d] = t * 1000;
    });
    (nuevas || []).forEach(function (f) {
      var d = fechaIso_(f.fecha);
      if (d && estimadoPorDia[d] && (textoOrNull_(f.destino) || textoOrNull_(f.otro_destino))) {
        despachosPorDia[d] = (despachosPorDia[d] || 0) + 1;
      }
    });
  }

  (nuevas || []).forEach(function (f) {
    var destino = textoOrNull_(f.destino) || textoOrNull_(f.otro_destino);
    var familia = textoOrNull_(f.familia);
    var fecha = fechaIso_(f.fecha);
    var kg = toNumberOrNull_(f.peso_total_kg);
    if (kg === null) {
      var cant = toNumberOrNull_(f.cantidad);
      var unit = toNumberOrNull_(f.peso_unitario_kg);
      if (cant !== null && unit !== null) kg = Math.round(cant * unit * 1000) / 1000;
    }
    var falta = [];
    if (!fecha) falta.push('fecha');
    if (!destino) falta.push('destino');
    if (!familia) falta.push('familia');
    if (kg === null || kg < 0) falta.push('peso');
    if (falta.length > 0) {
      pendientes.push({ fila: f.__row, motivo: 'falta ' + falta.join(', ') });
      // Sin peso real, pero con fecha y destino de un día estimado: entra con su parte estimada.
      if (fecha && destino && (kg === null || kg < 0) && estimadoPorDia[fecha]) {
        filas.push({
          fecha: f.fecha,
          destino_original: destino,
          familia: null,
          peso_total_kg: Math.round((estimadoPorDia[fecha] / despachosPorDia[fecha]) * 1000) / 1000,
          por_verificar: null,
          peso_sin_soporte: null,
          __estimado: true,
          __row: 'NUEVOS_DESPACHOS ' + f.__row + ' (estimado)',
        });
      }
      return;
    }
    filas.push({
      fecha: f.fecha,
      destino_original: destino,
      familia: familia,
      producto: f.producto,
      presentacion: f.presentacion,
      cantidad: f.cantidad,
      peso_unitario_kg: f.peso_unitario_kg,
      peso_total_kg: kg,
      por_verificar: f.por_verificar,
      peso_sin_soporte: null,
      observaciones: f.observaciones,
      __row: 'NUEVOS_DESPACHOS ' + f.__row,
    });
  });
  return { filas: filas, pendientes: pendientes };
}

/**
 * Lee las tres hojas del libro en UNA llamada (y NUEVOS_DESPACHOS, si existe).
 * @return {{filas: Array, destinos: Array, familias: Array, pendientes: Array}}
 */
function leerHojasDespachos_() {
  var libroId = idLibroOficial_();
  if (!libroId) throw new Error('Falta la propiedad LIBRO_OFICIAL_ID.');

  var nombres = [CONFIG.SHEETS.DESPACHOS, CONFIG.SHEETS.DESTINOS, CONFIG.SHEETS.FAMILIAS];
  var pestanas = leerPestanasDeLibro_(libroId, function (n) {
    return nombres.indexOf(n) !== -1 || n === CONFIG.SHEETS.NUEVOS || n === CONFIG.SHEETS.ESTIMADO;
  });
  var porNombre = {};
  pestanas.forEach(function (p) { porNombre[p.nombre] = filasAObjetos_(p.matriz, null); });
  nombres.forEach(function (n) {
    if (!porNombre[n]) throw new Error('No existe la hoja "' + n + '" en el libro de despachos.');
  });

  var filas = porNombre[CONFIG.SHEETS.DESPACHOS];
  var destinos = porNombre[CONFIG.SHEETS.DESTINOS];
  var familias = porNombre[CONFIG.SHEETS.FAMILIAS];
  exigirColumnas_(filas, COLUMNAS_DESPACHOS_, CONFIG.SHEETS.DESPACHOS);
  exigirColumnas_(destinos, COLUMNAS_DESTINOS_, CONFIG.SHEETS.DESTINOS);
  exigirColumnas_(familias, COLUMNAS_FAMILIAS_, CONFIG.SHEETS.FAMILIAS);

  // La hoja de captura es opcional: sin ella todo sigue como antes.
  var nuevos = convertirNuevos_(porNombre[CONFIG.SHEETS.NUEVOS] || [], porNombre[CONFIG.SHEETS.ESTIMADO] || []);
  return {
    filas: filas.concat(nuevos.filas),
    destinos: destinos,
    familias: familias,
    pendientes: nuevos.pendientes,
  };
}

function toneladas3_(kg) {
  return Math.round(((kg || 0) / 1000) * 1000) / 1000;
}

function porPeso_(a, b) {
  return b.kg - a.kg || a.nombre.localeCompare(b.nombre, 'es');
}

function sinKg_(x) { delete x.kg; return x; }

/** Los `n` productos de mayor peso de un mapa {nombre: kg}. */
function topProductos_(mapa, n) {
  return Object.keys(mapa)
    .map(function (k) { return { nombre: k, kg: mapa[k] }; })
    .sort(function (a, b) { return b.kg - a.kg || a.nombre.localeCompare(b.nombre, 'es'); })
    .slice(0, n);
}

function esSi_(v) { return normalizeText_(v) === 'SI'; }

/**
 * Agregación pura: filas de la hoja -> todo lo que publican las rutas.
 * Sin SpreadsheetApp, así se prueba con archivos.
 *
 * Cada kilo cae en UN solo lugar: un municipio, municipios múltiples, otras
 * ayudas, traslados o sin clasificar. Esos cinco suman el total.
 */
function agregarDespachos_(hojas) {
  var cat = catalogo42_();
  var advertencias = [];
  var filas = hojas.filas;
  var destinosIdx = indexarDestinos_(hojas.destinos, advertencias);
  var familiasIdx = indexarFamilias_(hojas.familias);

  var porMunicipio = Object.create(null);
  var otras = Object.create(null);
  var traslados = Object.create(null);
  var multiples = Object.create(null);
  var sinClasificar = { registros: 0, kg: 0, destinos: Object.create(null) };

  var categorias = Object.create(null);
  CONFIG.CATEGORIAS.forEach(function (n) { categorias[n] = { nombre: n, registros: 0, kg: 0 }; });
  var fuera = { registros: 0, kg: 0, familias: Object.create(null) };
  var sinCategoria = { registros: 0, kg: 0, familias: Object.create(null) };
  var categoriaDe = Object.create(null);
  CONFIG.CATEGORIAS.forEach(function (n) { categoriaDe[normalizeText_(n)] = n; });
  var claveFuera = normalizeText_(CONFIG.FUERA_DE_CATEGORIA);

  var fechas = Object.create(null);
  var totalKg = 0;
  var registros = 0;
  // Lo ESTIMADO (Excel anterior, mientras se completan los pesos reales). Suma en
  // el total y en el municipio, pero no en categorías ni en la calidad del peso.
  var estimado = { registros: 0, kg: 0, desde: null, hasta: null, porMunicipio: Object.create(null) };
  var calidad = {
    porVerificar: { registros: 0, kg: 0 },
    pesoSinSoporte: { registros: 0, kg: 0 },
    sinPeso: 0,
  };

  filas.forEach(function (f) {
    var donde = 'fila ' + f.__row + ': ';
    var fecha = fechaIso_(f.fecha);
    if (!fecha) {
      advertencias.push(donde + 'fecha inválida (' + f.fecha + '). Fila omitida.');
      return;
    }

    var kg = toNumberOrNull_(f.peso_total_kg);
    if (kg === null || kg < 0) {
      // Sin peso no hay toneladas que sumar. Se cuenta y se avisa; NO se
      // supone cero ni se estima.
      if (!isBlank_(f.peso_total_kg)) advertencias.push(donde + 'peso_total_kg "' + f.peso_total_kg + '" no es un número.');
      calidad.sinPeso += 1;
      kg = 0;
    }

    var esEstimado = f.__estimado === true;
    if (esEstimado) {
      estimado.registros += 1;
      estimado.kg += kg;
      if (!estimado.desde || fecha < estimado.desde) estimado.desde = fecha;
      if (!estimado.hasta || fecha > estimado.hasta) estimado.hasta = fecha;
    } else {
      registros += 1;
    }
    totalKg += kg;
    fechas[fecha] = true;
    if (!esEstimado && esSi_(f.por_verificar)) { calidad.porVerificar.registros += 1; calidad.porVerificar.kg += kg; }
    if (!esEstimado && esSi_(f.peso_sin_soporte)) { calidad.pesoSinSoporte.registros += 1; calidad.pesoSinSoporte.kg += kg; }

    // --- categoría ------------------------------------------------------
    var familia = textoOrNull_(f.familia) || 'Sin familia';
    // La categoría sale de FAMILIAS, no de la columna gris de la fila.
    var kCat = normalizeText_(familiasIdx[normalizeText_(f.familia)]);
    var nombreCategoria = categoriaDe[kCat] || null;
    if (esEstimado) {
      // Sin familia real todavía: no cuenta en ninguna categoría.
    } else if (nombreCategoria) {
      categorias[nombreCategoria].registros += 1;
      categorias[nombreCategoria].kg += kg;
    } else if (kCat === claveFuera) {
      fuera.registros += 1;
      fuera.kg += kg;
      var ff = fuera.familias[familia] || (fuera.familias[familia] = { nombre: familia, registros: 0, kg: 0 });
      ff.registros += 1;
      ff.kg += kg;
    } else {
      // Familia que no está en FAMILIAS o sin categoría: falta una fila ahí.
      sinCategoria.registros += 1;
      sinCategoria.kg += kg;
      var fs = sinCategoria.familias[familia] || (sinCategoria.familias[familia] = { nombre: familia, registros: 0, kg: 0 });
      fs.registros += 1;
      fs.kg += kg;
    }

    // --- destino --------------------------------------------------------
    var destino = textoOrNull_(f.destino_original) || 'Sin destino';
    // Tipo, municipio y regla salen de DESTINOS, no de las columnas grises.
    var reg = destinosIdx[normalizeText_(f.destino_original)];
    var tipo = reg ? reg.tipo : '';
    var municipio = reg && tipo === 'MUNICIPIO' ? cat.porDane[reg.dane] : null;

    if (municipio) {
      var x = porMunicipio[municipio.codigoDane] ||
        (porMunicipio[municipio.codigoDane] = { registros: 0, kg: 0, dias: {}, categorias: {}, productos: {} });
      x.registros += 1;
      x.kg += kg;
      // Lo que recibió cada día: alimenta la línea de tiempo del mapa.
      var dd = x.dias[fecha] || (x.dias[fecha] = { kg: 0, registros: 0, productos: {} });
      dd.kg += kg;
      dd.registros += 1;
      var prod = textoOrNull_(f.producto_consolidado) || textoOrNull_(f.producto);
      if (prod) {
        dd.productos[prod] = (dd.productos[prod] || 0) + kg;
        x.productos[prod] = (x.productos[prod] || 0) + kg;
      }
      if (esEstimado) {
        estimado.porMunicipio[municipio.codigoDane] = (estimado.porMunicipio[municipio.codigoDane] || 0) + kg;
      } else {
        var ck = nombreCategoria || (kCat === claveFuera ? CONFIG.FUERA_DE_CATEGORIA : 'Sin categoría');
        x.categorias[ck] = (x.categorias[ck] || 0) + kg;
      }
    } else if (tipo === 'OTRA' || tipo === 'TRASLADO' || tipo === 'MULTIPLE') {
      var dest = tipo === 'OTRA' ? otras : (tipo === 'TRASLADO' ? traslados : multiples);
      var o = dest[destino] || (dest[destino] = { nombre: destino, motivo: (reg && reg.regla) || tipo.toLowerCase(), registros: 0, kg: 0 });
      o.registros += 1;
      o.kg += kg;
    } else {
      // Destino que no está en DESTINOS, tipo desconocido o municipio_dane que no existe.
      sinClasificar.registros += 1;
      sinClasificar.kg += kg;
      var s = sinClasificar.destinos[destino] || (sinClasificar.destinos[destino] = { nombre: destino, registros: 0, kg: 0 });
      s.registros += 1;
      s.kg += kg;
    }
  });

  var municipios = cat.municipios.map(function (m) {
    var x = porMunicipio[m.codigoDane];
    return {
      id: m.id,
      codigoDane: m.codigoDane,
      nombre: m.nombre,
      zona: m.zona,
      latitud: m.latitud,
      longitud: m.longitud,
      atendido: !!x,
      toneladas: x ? toneladas3_(x.kg) : 0,
      // De esas toneladas, cuántas son ESTIMADAS (Excel anterior) y aún no tienen peso real.
      estimado: estimado.porMunicipio[m.codigoDane] ? toneladas3_(estimado.porMunicipio[m.codigoDane]) : 0,
      registros: x ? x.registros : 0,
      diasConDespacho: x ? Object.keys(x.dias).length : 0,
      // Día por día, en orden. `productos` son los dos más pesados de ese día.
      dias: x
        ? Object.keys(x.dias).sort().map(function (fecha) {
            var d = x.dias[fecha];
            return {
              fecha: fecha,
              toneladas: toneladas3_(d.kg),
              registros: d.registros,
              productos: topProductos_(d.productos, 2).map(function (p) { return p.nombre; }),
            };
          })
        : [],
      // Los cinco productos más pesados de todo el período.
      productos: x ? topProductos_(x.productos, 5).map(function (p) {
        return { nombre: p.nombre, toneladas: toneladas3_(p.kg) };
      }) : [],
      categorias: x
        ? Object.keys(x.categorias).map(function (n) {
            return { nombre: n, toneladas: toneladas3_(x.categorias[n]), kg: x.categorias[n] };
          }).sort(porPeso_).map(sinKg_)
        : [],
    };
  });

  function listar(mapa, extra) {
    return Object.keys(mapa).map(function (k) {
      var o = mapa[k];
      var r = { nombre: o.nombre, registros: o.registros, toneladas: toneladas3_(o.kg), kg: o.kg };
      if (extra) r.motivo = o.motivo;
      return r;
    }).sort(porPeso_);
  }
  function sumar(lista, campo) { return lista.reduce(function (a, o) { return a + o[campo]; }, 0); }

  var listaOtras = listar(otras, true);
  var listaTraslados = listar(traslados, true);
  var listaMultiples = listar(multiples, true);
  var listaSinClasificar = listar(sinClasificar.destinos, false);
  var fechasOrden = Object.keys(fechas).sort();

  return {
    periodo: {
      desde: fechasOrden.length ? fechasOrden[0] : null,
      hasta: fechasOrden.length ? fechasOrden[fechasOrden.length - 1] : null,
      diasConDespacho: fechasOrden.length,
    },
    totales: {
      toneladas: toneladas3_(totalKg),
      registros: registros,
      municipiosAtendidos: municipios.filter(function (m) { return m.atendido; }).length,
      municipiosTotales: municipios.length,
    },
    municipios: municipios,
    otras: {
      toneladas: toneladas3_(sumar(listaOtras, 'kg')),
      registros: sumar(listaOtras, 'registros'),
      destinos: listaOtras.map(sinKg_),
    },
    categorias: CONFIG.CATEGORIAS.map(function (n) {
      return { nombre: n, registros: categorias[n].registros, toneladas: toneladas3_(categorias[n].kg) };
    }),
    fueraDeCategoria: {
      toneladas: toneladas3_(fuera.kg),
      registros: fuera.registros,
      familias: listar(fuera.familias, false).map(sinKg_),
    },
    calidad: {
      registros: registros,
      porVerificar: { registros: calidad.porVerificar.registros, toneladas: toneladas3_(calidad.porVerificar.kg) },
      pesoSinSoporte: { registros: calidad.pesoSinSoporte.registros, toneladas: toneladas3_(calidad.pesoSinSoporte.kg) },
      sinPeso: calidad.sinPeso,
      // Toneladas ESTIMADAS del Excel anterior, incluidas en el total mientras
      // se completan los pesos reales. 0 cuando ya no queda ninguna.
      estimado: {
        registros: estimado.registros,
        toneladas: toneladas3_(estimado.kg),
        desde: estimado.desde,
        hasta: estimado.hasta,
      },
      // Filas de NUEVOS_DESPACHOS que aún no se publican (les falta fecha,
      // destino, familia o peso). No suman nada: vacío no es cero.
      pendientes: {
        registros: (hojas.pendientes || []).length,
        filas: (hojas.pendientes || []).slice(0, 25),
      },
      // Puntos logísticos: cuentan en el total, no son «otras ayudas» ni un
      // municipio. Si lo que sale de ellos también está en los despachos a
      // municipios, esas toneladas se cuentan dos veces: por eso se separan.
      traslados: {
        registros: sumar(listaTraslados, 'registros'),
        toneladas: toneladas3_(sumar(listaTraslados, 'kg')),
        destinos: listaTraslados.map(sinKg_),
      },
      // Ayuda que atendió a varios municipios a la vez sin decir cuánto
      // recibió cada uno («Trujillo y Sevilla»). Repartirla, o asignarla al
      // primero, sería inventar: va aparte, como «municipios múltiples».
      multiples: {
        registros: sumar(listaMultiples, 'registros'),
        toneladas: toneladas3_(sumar(listaMultiples, 'kg')),
        destinos: listaMultiples.map(sinKg_),
      },
      // Filas a las que les falta una regla en DESTINOS o FAMILIAS.
      sinClasificar: {
        registros: sinClasificar.registros,
        toneladas: toneladas3_(sinClasificar.kg),
        destinos: listaSinClasificar.map(sinKg_),
      },
      sinCategoria: {
        registros: sinCategoria.registros,
        toneladas: toneladas3_(sinCategoria.kg),
        familias: listar(sinCategoria.familias, false).map(sinKg_),
      },
    },
    advertencias: advertencias,
  };
}

/**
 * El cálculo completo, o {disponible: false} si el libro no se pudo
 * leer. Una sola vez por ejecución: las cuatro rutas comparten el
 * resultado.
 */
function tableroDespachos_() {
  if (_despachos_ !== null) return _despachos_;
  try {
    _despachos_ = agregarDespachos_(leerHojasDespachos_());
  } catch (err) {
    // Un libro inaccesible o una hoja mal formada no debe dejar el bundle
    // sin armar: las rutas lo dicen en su respuesta y el sitio no dibuja
    // la sección. El motivo exacto queda en el registro.
    Logger.log('Despachos: no se pudo leer la hoja: ' + err);
    _despachos_ = { disponible: false };
  }
  return _despachos_;
}

var NO_DISPONIBLE_ = { disponible: false, motivo: 'No se pudo leer el libro de despachos.', fuente: 'DESPACHOS' };
var AVISO_PESOS_ =
  'Pesos aproximados, tomados del Excel de despachos. Incluyen registros marcados ' +
  '«por verificar» (ver calidad).';

function buildResumen_() {
  var t = tableroDespachos_();
  if (t.disponible === false) return NO_DISPONIBLE_;
  // No están en el libro de despachos: las escribe el equipo en la hoja
  // TOTALES. Sin dato es null, nunca un valor supuesto.
  var totales = leerTotales_();
  return {
    disponible: true,
    periodo: t.periodo,
    corte: t.periodo.hasta,
    totales: t.totales,
    recibidas: totales.recibidas,
    inventario: totales.inventario,
    calidad: t.calidad,
    fuente: 'DESPACHOS',
    disclaimer: AVISO_PESOS_,
  };
}

function buildMunicipios_() {
  var t = tableroDespachos_();
  if (t.disponible === false) return NO_DISPONIBLE_;
  return { disponible: true, municipios: t.municipios, fuente: 'DESPACHOS', disclaimer: AVISO_PESOS_ };
}

function buildOtras_() {
  var t = tableroDespachos_();
  if (t.disponible === false) return NO_DISPONIBLE_;
  return {
    disponible: true,
    toneladas: t.otras.toneladas,
    registros: t.otras.registros,
    destinos: t.otras.destinos,
    fuente: 'DESPACHOS',
    disclaimer: AVISO_PESOS_,
  };
}

function buildCategorias_() {
  var t = tableroDespachos_();
  if (t.disponible === false) return NO_DISPONIBLE_;
  return {
    disponible: true,
    categorias: t.categorias,
    fueraDeCategoria: t.fueraDeCategoria,
    fuente: 'DESPACHOS',
    disclaimer: AVISO_PESOS_,
  };
}

/** Para el editor: qué filas o destinos de la hoja hay que mirar. */
function revisarDespachos() {
  resetSheetCache_();
  var t = agregarDespachos_(leerHojasDespachos_());
  var q = t.calidad;
  var lineas = [
    'DESPACHOS: ' + t.periodo.diasConDespacho + ' días (' + t.periodo.desde + ' → ' + t.periodo.hasta + '), ' +
      t.totales.registros + ' registros, ' + t.totales.toneladas + ' t.',
    t.totales.municipiosAtendidos + '/' + t.totales.municipiosTotales + ' municipios; otras ayudas ' +
      t.otras.toneladas + ' t; municipios múltiples ' + q.multiples.toneladas + ' t; traslados ' + q.traslados.toneladas + ' t.',
    t.advertencias.length + ' advertencias de lectura:',
  ];
  t.advertencias.forEach(function (a) { lineas.push('  · ' + a); });
  lineas.push('NUEVOS_DESPACHOS: ' + q.pendientes.registros + ' filas pendientes (no se publican hasta completarlas).');
  q.pendientes.filas.slice(0, 10).forEach(function (p) { lineas.push('  · fila ' + p.fila + ': ' + p.motivo); });
  if (q.sinClasificar.registros) {
    lineas.push('SIN CLASIFICAR (' + q.sinClasificar.toneladas + ' t): agregar a DESTINOS:');
    q.sinClasificar.destinos.forEach(function (d) { lineas.push('  · ' + d.nombre + ' (' + d.toneladas + ' t)'); });
  }
  if (q.sinCategoria.registros) {
    lineas.push('FAMILIAS SIN CATEGORÍA (' + q.sinCategoria.toneladas + ' t): agregar a la hoja FAMILIAS: ' +
      q.sinCategoria.familias.map(function (f) { return f.nombre; }).join(', '));
  }
  lineas.push('Municipios múltiples (varios municipios sin desagregar): ' + q.multiples.toneladas + ' t');
  q.multiples.destinos.forEach(function (d) { lineas.push('  · ' + d.nombre + ' (' + d.toneladas + ' t)'); });
  lineas.push('Traslados (puntos logísticos):');
  q.traslados.destinos.forEach(function (d) { lineas.push('  · ' + d.nombre + ' (' + d.toneladas + ' t)'); });
  var salida = lineas.join('\n');
  Logger.log(salida);
  return salida;
}
