/**
 * Ids.gs
 * -----------------------------------------------------------------------
 * Puebla las columnas *_id de las tablas de hecho.
 *
 * POR QUÉ HACE FALTA
 *
 * El modelo relacional declara llaves foráneas por id:
 *
 *   DESPACHO_DESTINO.destino_id    -> CAT_DESTINOS.destino_id
 *   DESPACHO_POBLACION.poblacion_id -> CAT_POBLACIONES.poblacion_id
 *   DESPACHOS.categoria_id          -> CAT_CATEGORIAS.categoria_id
 *   DESPACHOS.documento_id          -> BD_DOCUMENTOS.documento_id
 *
 * Pero esas columnas están vacías en el Excel, así que Facts.gs resuelve
 * todo comparando NOMBRES. Eso funciona hasta que alguien escribe
 * "donación Japón" y el catálogo dice otra cosa: la fila se descarta en
 * silencio y nadie se entera hasta que un total no cuadra.
 *
 * Con las columnas pobladas, el join deja de depender de cómo se escribió
 * el texto, y la migración a PostgreSQL o Supabase se vuelve directa: las
 * tablas de unión llegan con su llave en vez de con un nombre.
 *
 * CÓMO USARLO
 *
 * 1. Ejecutar revisarIds() y leer el log. No escribe nada.
 * 2. Corregir en el Excel los valores que aparezcan como sin resolver.
 * 3. Ejecutar poblarIds(). Solo llena celdas VACÍAS, nunca pisa un valor
 *    existente, y no toca ninguna fila que no haya podido resolver.
 * 4. Volver a ejecutar revisarIds() para confirmar.
 *
 * Conviene hacer una copia del archivo antes del paso 3.
 * -----------------------------------------------------------------------
 */

/** Las cuatro columnas a poblar, con de dónde sale cada valor. */
function planDeIds_(catalogs) {
  return [
    {
      hoja: CONFIG.SHEETS.DESPACHO_DESTINO,
      columnaId: 'destino_id',
      columnaTexto: 'destino',
      resolver: function (valor) {
        var d = catalogs.destinosByNombreNorm[normalizeText_(valor)];
        return d ? d.id : null;
      },
    },
    {
      hoja: CONFIG.SHEETS.DESPACHO_POBLACION,
      columnaId: 'poblacion_id',
      columnaTexto: 'poblacion',
      resolver: function (valor) {
        var p = catalogs.poblacionesByNombreNorm[normalizeText_(valor)];
        return p ? p.id : null;
      },
    },
    {
      hoja: CONFIG.SHEETS.DESPACHOS,
      columnaId: 'categoria_id',
      columnaTexto: 'categoria_principal',
      resolver: function (valor) {
        var c = catalogs.categoriasByNombreNorm[normalizeText_(valor)];
        return c ? c.id : null;
      },
    },
    {
      hoja: CONFIG.SHEETS.DESPACHOS,
      columnaId: 'documento_id',
      columnaTexto: 'drive_id',
      resolver: function (valor) {
        var d = catalogs.documentosByDriveId[String(valor).trim()];
        return d ? d.id : null;
      },
    },
    {
      hoja: CONFIG.SHEETS.ENVIOS_CATEGORIA,
      columnaId: 'destino_id',
      columnaTexto: 'destino',
      resolver: function (valor) {
        var d = catalogs.destinosByNombreNorm[normalizeText_(valor)];
        return d ? d.id : null;
      },
    },
    {
      hoja: CONFIG.SHEETS.ENVIOS_CATEGORIA,
      columnaId: 'categoria_id',
      columnaTexto: 'categoria',
      resolver: function (valor) {
        var c = catalogs.categoriasByNombreNorm[normalizeText_(valor)];
        return c ? c.id : null;
      },
    },
  ];
}

/** Índice de columna por nombre de encabezado, o -1. */
function columnaPorNombre_(encabezados, nombre) {
  for (var i = 0; i < encabezados.length; i++) {
    if (String(encabezados[i]).trim() === nombre) return i + 1;
  }
  return -1;
}

/**
 * Informe sin escribir nada. Dice cuántas celdas se llenarían y qué
 * valores no se pudieron resolver.
 */
function revisarIds() {
  resetSheetCache_();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var catalogs = loadCatalogs_();
  var lineas = [];

  lineas.push('REVISIÓN DE COLUMNAS DE ID');
  lineas.push('  Nada se escribe en esta ejecución.');

  planDeIds_(catalogs).forEach(function (tarea) {
    var hoja = ss.getSheetByName(tarea.hoja);
    if (!hoja) {
      lineas.push('');
      lineas.push('  ' + tarea.hoja + ': la hoja no existe.');
      return;
    }

    var ultimaFila = hoja.getLastRow();
    var ultimaCol = hoja.getLastColumn();
    var encabezados = hoja.getRange(1, 1, 1, ultimaCol).getValues()[0];

    var colId = columnaPorNombre_(encabezados, tarea.columnaId);
    var colTexto = columnaPorNombre_(encabezados, tarea.columnaTexto);

    lineas.push('');
    lineas.push('  ' + tarea.hoja + '.' + tarea.columnaId +
      ' desde ' + tarea.columnaTexto);

    if (colId === -1) {
      lineas.push('    No existe la columna ' + tarea.columnaId + '. Hay que crearla.');
      return;
    }
    if (colTexto === -1) {
      lineas.push('    No existe la columna ' + tarea.columnaTexto + '.');
      return;
    }

    var ids = hoja.getRange(2, colId, ultimaFila - 1, 1).getValues();
    var textos = hoja.getRange(2, colTexto, ultimaFila - 1, 1).getValues();

    var yaTenian = 0;
    var seLlenarian = 0;
    var sinResolver = {};

    for (var f = 0; f < ids.length; f++) {
      var actual = String(ids[f][0] || '').trim();
      var texto = textos[f][0];

      if (isBlank_(texto)) continue;
      if (actual) {
        yaTenian += 1;
        continue;
      }

      var resuelto = tarea.resolver(texto);
      if (resuelto) {
        seLlenarian += 1;
      } else {
        var clave = String(texto).trim();
        sinResolver[clave] = (sinResolver[clave] || 0) + 1;
      }
    }

    lineas.push('    Ya tienen id: ' + yaTenian);
    lineas.push('    Se llenarían: ' + seLlenarian);

    var claves = Object.keys(sinResolver);
    if (claves.length > 0) {
      lineas.push('    SIN RESOLVER: ' + claves.length + ' valor(es) distintos');
      claves.slice(0, 15).forEach(function (k) {
        lineas.push('      "' + k + '" en ' + sinResolver[k] + ' fila(s)');
      });
      lineas.push('    Estos no están en su catálogo. Agregarlos ahí primero.');
    }
  });

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/**
 * Escribe los ids en las celdas vacías.
 *
 * Nunca pisa un valor existente y nunca escribe en una fila que no pudo
 * resolver. Hacer una copia del archivo antes de ejecutarlo.
 */
function poblarIds() {
  resetSheetCache_();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var catalogs = loadCatalogs_();
  var lineas = [];
  var totalEscritas = 0;

  lineas.push('POBLANDO COLUMNAS DE ID');

  planDeIds_(catalogs).forEach(function (tarea) {
    var hoja = ss.getSheetByName(tarea.hoja);
    if (!hoja) return;

    var ultimaFila = hoja.getLastRow();
    var ultimaCol = hoja.getLastColumn();
    var encabezados = hoja.getRange(1, 1, 1, ultimaCol).getValues()[0];

    var colId = columnaPorNombre_(encabezados, tarea.columnaId);
    var colTexto = columnaPorNombre_(encabezados, tarea.columnaTexto);
    if (colId === -1 || colTexto === -1) {
      lineas.push('  ' + tarea.hoja + '.' + tarea.columnaId + ': falta una columna, se salta.');
      return;
    }

    var rangoId = hoja.getRange(2, colId, ultimaFila - 1, 1);
    var ids = rangoId.getValues();
    var textos = hoja.getRange(2, colTexto, ultimaFila - 1, 1).getValues();

    var escritas = 0;

    for (var f = 0; f < ids.length; f++) {
      var actual = String(ids[f][0] || '').trim();
      var texto = textos[f][0];

      if (actual || isBlank_(texto)) continue;

      var resuelto = tarea.resolver(texto);
      if (!resuelto) continue;

      ids[f][0] = resuelto;
      escritas += 1;
    }

    // Una sola escritura por hoja y columna, no una por celda.
    if (escritas > 0) rangoId.setValues(ids);

    totalEscritas += escritas;
    lineas.push('  ' + tarea.hoja + '.' + tarea.columnaId + ': ' + escritas + ' celda(s)');
  });

  lineas.push('');
  lineas.push('Total escrito: ' + totalEscritas + ' celda(s).');
  lineas.push('Las filas sin resolver quedaron intactas. Correr revisarIds()');
  lineas.push('para ver cuáles siguen pendientes.');

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/**
 * Verifica que cada *_id apunte a un renglón real del catálogo, y que
 * coincida con el nombre escrito al lado.
 *
 * revisarIds() solo mira si la celda tiene contenido. Esta comprueba la
 * integridad referencial, que es otra cosa: un id puede estar escrito y
 * no existir, o existir y no corresponder al nombre de la misma fila.
 *
 * Reporta tres problemas distintos:
 *
 *   HUÉRFANO      el id no está en el catálogo. Puede ser un id viejo, o
 *                 un renglón del catálogo con activo en NO, porque
 *                 loadCatalogs_ filtra esos y para el sistema dejan de
 *                 existir.
 *   DESACUERDO    el id apunta a un renglón, pero el nombre de la fila
 *                 dice otra cosa. Manda el id, así que el tablero muestra
 *                 algo distinto de lo que se lee en la hoja.
 *   SOLO POR NOMBRE  el nombre resuelve pero el id no. Es lo que hoy pasa
 *                 con las poblaciones que caen en advertencia.
 */
function verificarIds() {
  resetSheetCache_();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var catalogs = loadCatalogs_();
  var lineas = [];

  lineas.push('INTEGRIDAD DE LAS COLUMNAS DE ID');
  lineas.push('  Comprueba que cada id exista en su catálogo activo.');

  var planes = [
    {
      hoja: CONFIG.SHEETS.DESPACHO_DESTINO,
      columnaId: 'destino_id',
      columnaTexto: 'destino',
      porId: catalogs.destinosById,
      nombreDe: function (r) { return r.nombre; },
      porNombre: catalogs.destinosByNombreNorm,
    },
    {
      hoja: CONFIG.SHEETS.DESPACHO_POBLACION,
      columnaId: 'poblacion_id',
      columnaTexto: 'poblacion',
      porId: catalogs.poblacionesById,
      nombreDe: function (r) { return r.nombre; },
      porNombre: catalogs.poblacionesByNombreNorm,
    },
    {
      hoja: CONFIG.SHEETS.ENVIOS_CATEGORIA,
      columnaId: 'categoria_id',
      columnaTexto: 'categoria',
      porId: catalogs.categoriasById,
      nombreDe: function (r) { return r.nombre; },
      porNombre: catalogs.categoriasByNombreNorm,
    },
    {
      hoja: CONFIG.SHEETS.ENVIOS_CATEGORIA,
      columnaId: 'destino_id',
      columnaTexto: 'destino',
      porId: catalogs.destinosById,
      nombreDe: function (r) { return r.nombre; },
      porNombre: catalogs.destinosByNombreNorm,
    },
  ];

  var totalHuerfanos = 0;

  planes.forEach(function (plan) {
    var hoja = ss.getSheetByName(plan.hoja);
    if (!hoja) return;

    var ultimaFila = hoja.getLastRow();
    var encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    var colId = columnaPorNombre_(encabezados, plan.columnaId);
    var colTexto = columnaPorNombre_(encabezados, plan.columnaTexto);

    lineas.push('');
    lineas.push('  ' + plan.hoja + '.' + plan.columnaId);

    if (colId === -1) {
      lineas.push('    No existe esa columna.');
      return;
    }

    var ids = hoja.getRange(2, colId, ultimaFila - 1, 1).getValues();
    var textos = colTexto === -1 ? null : hoja.getRange(2, colTexto, ultimaFila - 1, 1).getValues();

    var huerfanos = {};
    var desacuerdos = {};
    var soloNombre = {};
    var correctos = 0;

    for (var f = 0; f < ids.length; f++) {
      var id = String(ids[f][0] || '').trim();
      var texto = textos ? String(textos[f][0] || '').trim() : '';
      if (!id && !texto) continue;

      var registro = id ? plan.porId[id] : null;
      var porNombre = texto ? plan.porNombre[normalizeText_(texto)] : null;

      if (id && !registro) {
        var clave = id + (texto ? '  (fila dice "' + texto + '")' : '');
        huerfanos[clave] = (huerfanos[clave] || 0) + 1;
        if (porNombre) soloNombre[texto] = (soloNombre[texto] || 0) + 1;
        continue;
      }

      if (registro && texto && normalizeText_(plan.nombreDe(registro)) !== normalizeText_(texto)) {
        var d = id + ': catálogo dice "' + plan.nombreDe(registro) + '", fila dice "' + texto + '"';
        desacuerdos[d] = (desacuerdos[d] || 0) + 1;
        continue;
      }

      correctos += 1;
    }

    lineas.push('    Correctos: ' + correctos);

    var kh = Object.keys(huerfanos);
    if (kh.length > 0) {
      totalHuerfanos += kh.length;
      lineas.push('    HUÉRFANOS: ' + kh.length + ' id(s) que no están en el catálogo activo');
      kh.slice(0, 12).forEach(function (k) {
        lineas.push('      ' + k + '  en ' + huerfanos[k] + ' fila(s)');
      });
      lineas.push('      Revisar que esos renglones existan y tengan activo distinto de NO.');
    }

    var kd = Object.keys(desacuerdos);
    if (kd.length > 0) {
      lineas.push('    DESACUERDOS: ' + kd.length);
      kd.slice(0, 12).forEach(function (k) {
        lineas.push('      ' + k + '  en ' + desacuerdos[k] + ' fila(s)');
      });
      lineas.push('      Manda el id, así que el tablero muestra el nombre del catálogo.');
    }

    var ks = Object.keys(soloNombre);
    if (ks.length > 0) {
      lineas.push('    Resuelven por nombre pero no por id: ' + ks.join(', '));
    }
  });

  lineas.push('');
  if (totalHuerfanos === 0) {
    lineas.push('Todos los ids apuntan a un renglón activo. El backend puede');
    lineas.push('pasar a unir por id en vez de por nombre sin perder filas.');
  } else {
    lineas.push('Hay ids huérfanos. Corregirlos ANTES de cambiar los joins a id,');
    lineas.push('o esas filas van a desaparecer del tablero.');
  }

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}