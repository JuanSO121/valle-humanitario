/**
 * Diagnostico.gs
 * -----------------------------------------------------------------------
 * Responde la pregunta "por qué el tablero no muestra lo que dice el
 * Excel" sin tener que abrir el Excel.
 *
 * OJO ANTES DE PEGAR ESTE ARCHIVO: si dejaste la función diagnostico()
 * dentro de CacheLayer.gs, borrala de allá. Apps Script no avisa cuando
 * dos archivos declaran la misma función: simplemente gana la última que
 * carga, y terminás ejecutando una versión distinta de la que estás
 * leyendo.
 *
 * Uso: seleccionar diagnostico en el desplegable del editor, Ejecutar, y
 * leer el log.
 * -----------------------------------------------------------------------
 */

function diagnostico() {
  resetSheetCache_();

  var catalogs = loadCatalogs_();
  var facts = loadFacts_(catalogs);
  var flujos = buildFlujos_(catalogs, facts);

  var lineas = [];

  // --- estado de la caché y del deployment ------------------------------
  lineas.push('CACHÉ');
  lineas.push('  Versión: v' + cacheVersion_());
  lineas.push('  TTL: ' + CONFIG.CACHE.TTL_SECONDS + ' segundos (' +
    Math.round(CONFIG.CACHE.TTL_SECONDS / 3600) + ' horas)');
  if (CONFIG.CACHE.TTL_SECONDS > 900) {
    lineas.push('  AVISO: con este TTL, una corrección del Excel puede tardar hasta');
    lineas.push('  ' + Math.round(CONFIG.CACHE.TTL_SECONDS / 3600) + ' horas en verse. Para un archivo que cambia a diario,');
    lineas.push('  conviene bajarlo a 300 en Config.gs.');
  }

  // --- fechas -----------------------------------------------------------
  var ultima = null;
  var sinFecha = [];
  facts.despachos.forEach(function (d) {
    if (!d.fecha) {
      sinFecha.push(d.id);
      return;
    }
    if (ultima === null || d.fecha > ultima) ultima = d.fecha;
  });

  lineas.push('');
  lineas.push('FECHAS');
  lineas.push('  Último despacho con fecha: ' + (ultima || 'ninguno'));
  lineas.push('  Sin fecha: ' + sinFecha.length +
    (sinFecha.length ? ' (' + sinFecha.slice(0, 10).join(', ') + ')' : ''));
  if (sinFecha.length) {
    lineas.push('  Estos no aparecen en la curva, en la rejilla por día ni en la');
    lineas.push('  línea de tiempo, pero sí en el total por municipio. Es la razón');
    lineas.push('  de que esos dos números puedan diferir en uno o dos.');
  }

  // --- de 422 filas a las entregas del mapa -----------------------------
  var enlaces = 0;
  var enlacesMunicipales = 0;
  facts.despachos.forEach(function (d) {
    enlaces += d.destinos.length;
    d.destinos.forEach(function (rel) {
      var destino = catalogs.destinosById[rel.destinoId];
      if (destino && destino.tipo === 'municipio') enlacesMunicipales += 1;
    });
  });

  lineas.push('');
  lineas.push('DE LA HOJA AL MAPA');
  lineas.push('  Filas en DESPACHOS: ' + facts.despachos.length);
  lineas.push('  Enlaces despacho a destino: ' + enlaces);
  lineas.push('  De esos, a un municipio: ' + enlacesMunicipales);
  lineas.push('  Pares origen-destino en route=flujos: ' + flujos.flujos.length);
  lineas.push('  Excluidos de route=flujos: ' + flujos.excluidos.length);

  // El total de entregas es lo único que distingue las dos versiones de
  // buildFlujos_. Los pares únicos y los excluidos dan igual en las dos,
  // porque los destinos secundarios de un formato conjunto son
  // municipios que ya tenían par y que sí tienen coordenada.
  var entregas = 0;
  var entregasMunicipales = 0;
  var caliId = idDeCali_(catalogs);

  flujos.flujos.forEach(function (f) {
    entregas += f.despachosCount;
    if (f.destino.tipo === 'municipio' && f.destino.id !== caliId) {
      entregasMunicipales += f.despachosCount;
    }
  });

  var despachosIncluidos = facts.despachos.length - contarDespachosSinArco_(facts, flujos);

  lineas.push('  Entregas totales en route=flujos: ' + entregas);
  lineas.push('  De esas, municipales sin Cali: ' + entregasMunicipales);
  lineas.push('  (este último es el número que debe mostrar el tablero)');
  lineas.push('');

  if (entregas > despachosIncluidos) {
    lineas.push('  CRITERIO ACTIVO: una entrega por MUNICIPIO atendido.');
    lineas.push('  buildFlujos_ recorre todos los destinos del puente, así que un');
    lineas.push('  formato que reparte a varios municipios suma uno a cada uno.');
    lineas.push('  Diferencia contra el conteo por formato: ' + (entregas - despachosIncluidos) + ' entregas.');
  } else {
    lineas.push('  CRITERIO ACTIVO: una entrega por FORMATO.');
    lineas.push('  buildFlujos_ toma solo el destino principal de cada despacho, así');
    lineas.push('  que un formato que reparte a varios municipios cuenta una vez.');
    lineas.push('  Hay ' + (enlacesMunicipales - entregasMunicipales) + ' enlace(s) del puente que el mapa no dibuja.');
  }

  var porMotivo = {};
  flujos.excluidos.forEach(function (e) {
    porMotivo[e.motivo] = (porMotivo[e.motivo] || 0) + 1;
  });
  Object.keys(porMotivo).forEach(function (motivo) {
    lineas.push('  Excluidos por ' + motivo + ': ' + porMotivo[motivo]);
  });

  // --- calendario día por día -------------------------------------------
  // Responde "por qué el tablero muestra 15 días y no 16". Cada fecha del
  // rango, con lo que pasó con sus despachos. Un día con despachos pero
  // sin municipales significa que el dato existe y algo lo filtra acá.
  // Un día en cero significa que no está en la hoja.
  var porFecha = {};
  var caliIdCal = idDeCali_(catalogs);

  facts.despachos.forEach(function (d) {
    if (!d.fecha) return;
    if (!porFecha[d.fecha]) {
      porFecha[d.fecha] = { total: 0, municipal: 0, cali: 0, otroTipo: 0, sinCoordenada: 0 };
    }
    var dia = porFecha[d.fecha];
    dia.total += 1;

    (d.destinos || []).forEach(function (rel) {
      var destino = catalogs.destinosById[rel.destinoId];
      if (!destino) return;

      if (destino.precision !== 'MUNICIPIO') {
        dia.sinCoordenada += 1;
        return;
      }
      if (destino.tipo !== 'municipio') {
        dia.otroTipo += 1;
        return;
      }
      if (caliIdCal !== null && rel.destinoId === caliIdCal) {
        dia.cali += 1;
        return;
      }
      dia.municipal += 1;
    });
  });

  var fechas = Object.keys(porFecha).sort();
  lineas.push('');
  lineas.push('CALENDARIO');

  if (fechas.length === 0) {
    lineas.push('  No hay despachos con fecha.');
  } else {
    var desde = fechas[0];
    var hasta = fechas[fechas.length - 1];
    var todosLosDias = rangoDeFechas_(desde, hasta);

    lineas.push('  Rango: ' + desde + ' a ' + hasta + ' (' + todosLosDias.length + ' días)');
    lineas.push('  Días con entrega municipal: ' + fechas.filter(function (f) {
      return porFecha[f].municipal > 0;
    }).length);
    lineas.push('');
    lineas.push('  fecha        total  municipal  cali  otro-tipo  sin-coord');

    todosLosDias.forEach(function (fecha) {
      var d = porFecha[fecha] || { total: 0, municipal: 0, cali: 0, otroTipo: 0, sinCoordenada: 0 };
      var marca = d.municipal === 0 ? '  <-- sin entrega municipal' : '';
      lineas.push('  ' + fecha + '  ' +
        pad_(d.total, 5) + '  ' +
        pad_(d.municipal, 9) + '  ' +
        pad_(d.cali, 4) + '  ' +
        pad_(d.otroTipo, 9) + '  ' +
        pad_(d.sinCoordenada, 9) + marca);
    });

    lineas.push('');
    lineas.push('  CÓMO LEERLO');
    lineas.push('  total 0: ese día no existe en la hoja DESPACHOS. El tablero está bien.');
    lineas.push('  total > 0 y municipal 0: el dato existe pero no llega al mapa. La');
    lineas.push('  columna que no esté en cero dice por qué: cali queda fuera del');
    lineas.push('  consolidado, otro-tipo son entidades, sin-coord son destinos que');
    lineas.push('  no están atados a un municipio.');
  }

  // --- filas que se descartaron en silencio -----------------------------
  lineas.push('');
  lineas.push('ADVERTENCIAS DE VALIDACIÓN: ' + facts.warnings.length);
  if (facts.warnings.length === 0) {
    lineas.push('  Ningún valor quedó fuera por no encontrar su catálogo.');
  } else {
    lineas.push('  Todas nacen de lo mismo: un texto de la hoja de hechos que no');
    lineas.push('  coincide con ningún renglón del catálogo. Una tilde, un espacio');
    lineas.push('  de más, o un valor nuevo que nadie agregó al CAT_ correspondiente.');
    lineas.push('  Lo que cuesta cada una es distinto, así que van agrupadas.');

    var porTipo = {};
    facts.warnings.forEach(function (w) {
      if (!porTipo[w.tipo]) porTipo[w.tipo] = [];
      porTipo[w.tipo].push(w);
    });

    Object.keys(porTipo).forEach(function (tipo) {
      var grupo = porTipo[tipo];
      lineas.push('');
      lineas.push('  ' + tipo + ': ' + grupo.length);
      lineas.push('  ' + impactoDe_(tipo));

      // Los valores distintos importan más que las filas: cinco filas con
      // el mismo texto mal escrito se arreglan con un solo renglón nuevo
      // en el catálogo.
      var valores = {};
      grupo.forEach(function (w) {
        var v = w.valor || '(sin valor)';
        if (!valores[v]) valores[v] = [];
        valores[v].push(w.fila || w.despachoId || w.envioId || '?');
      });

      Object.keys(valores).forEach(function (v) {
        lineas.push('    "' + v + '" en ' + valores[v].length +
          ' fila(s): ' + valores[v].slice(0, 12).join(', '));
      });
    });
  }

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/** Todas las fechas ISO entre dos, ambas incluidas. */
function rangoDeFechas_(desde, hasta) {
  var partesA = desde.split('-');
  var partesB = hasta.split('-');
  var inicio = new Date(Number(partesA[0]), Number(partesA[1]) - 1, Number(partesA[2]));
  var fin = new Date(Number(partesB[0]), Number(partesB[1]) - 1, Number(partesB[2]));

  var salida = [];
  var cursor = inicio;
  while (cursor <= fin) {
    salida.push(Utilities.formatDate(cursor, 'America/Bogota', 'yyyy-MM-dd'));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return salida;
}

function pad_(valor, ancho) {
  var texto = String(valor);
  while (texto.length < ancho) texto = ' ' + texto;
  return texto;
}

/** El destino de Cali, que queda fuera del consolidado municipal. */
function idDeCali_(catalogs) {
  var encontrado = null;
  Object.keys(catalogs.destinosById).forEach(function (id) {
    var destino = catalogs.destinosById[id];
    if (normalizeText_(destino.nombre) === normalizeText_('Santiago de Cali')) encontrado = id;
  });
  return encontrado;
}

/** Despachos que no aportaron ningún arco, por origen o destino sin coordenada. */
function contarDespachosSinArco_(facts, flujos) {
  var conArco = {};
  var sinArco = {};

  flujos.excluidos.forEach(function (e) { sinArco[e.despachoId] = true; });

  facts.despachos.forEach(function (d) {
    if (!d.destinos || d.destinos.length === 0) sinArco[d.id] = true;
  });

  // Un despacho puede tener un destino excluido y otro válido: en ese
  // caso sí aportó arco y no cuenta como perdido.
  facts.despachos.forEach(function (d) {
    (d.destinos || []).forEach(function (rel) {
      var yaExcluido = flujos.excluidos.some(function (e) {
        return e.despachoId === d.id && e.destinoId === rel.destinoId;
      });
      if (!yaExcluido) conArco[d.id] = true;
    });
  });

  var total = 0;
  Object.keys(sinArco).forEach(function (id) {
    if (!conArco[id]) total += 1;
  });
  return total;
}

/**
 * Qué se pierde exactamente con cada advertencia.
 *
 * Esto no es cosmético. La primera versión de este diagnóstico decía que
 * toda fila con advertencia quedaba fuera del tablero, y para las
 * poblaciones y las categorías es falso: el despacho se cuenta igual, lo
 * que se pierde es la etiqueta. Confundir las dos cosas lleva a buscar
 * entregas faltantes que nunca faltaron.
 */
function impactoDe_(tipo) {
  switch (tipo) {
    case 'POBLACION_FUERA_DE_CATALOGO':
      return 'El despacho SÍ se cuenta. Se pierde solo la etiqueta de población, ' +
        'así que esa ayuda no aparece en el listado de grupos atendidos.';
    case 'CATEGORIA_FUERA_DE_CATALOGO':
      return 'El despacho SÍ se cuenta. Queda sin categoría principal.';
    case 'DESTINO_FUERA_DE_CATALOGO':
      return 'El enlace a ese destino se descarta. Si era el único destino del ' +
        'despacho, ese despacho NO aparece en ninguna parte del tablero.';
    case 'DESPACHO_SIN_DESTINO':
      return 'El despacho NO aparece en el tablero: no hay a dónde asignarlo.';
    default:
      return 'Revisar Facts.gs para saber qué descarta este caso.';
  }
}

/**
 * Dice QUÉ ARCHIVO está leyendo el script y muestra las últimas filas de
 * DESPACHOS tal como están en la hoja.
 *
 * Sirve cuando diagnostico() reporta una fecha más vieja que la que uno
 * ve en el Excel. Ese caso NO es de caché: diagnostico lee las hojas
 * directamente. Casi siempre es una de estas dos:
 *
 *   · El script está enlazado a un archivo y el dato nuevo se cargó en
 *     otro. Pasa al subir un .xlsx actualizado como archivo aparte en
 *     vez de editar la hoja enlazada.
 *   · La fila existe pero le falta la fecha o el destino, así que no
 *     entra en ninguna cuenta.
 *
 * Comparar el nombre y la URL que imprime esto contra el archivo que
 * estás editando resuelve la duda en diez segundos.
 */
function dondeEstoyLeyendo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lineas = [];

  lineas.push('ARCHIVO ENLAZADO AL SCRIPT');
  lineas.push('  Nombre: ' + ss.getName());
  lineas.push('  Id: ' + ss.getId());
  lineas.push('  URL: ' + ss.getUrl());
  lineas.push('  Última modificación: ' + DriveApp.getFileById(ss.getId()).getLastUpdated());

  lineas.push('');
  lineas.push('HOJAS PRESENTES');
  ss.getSheets().forEach(function (hoja) {
    lineas.push('  ' + hoja.getName() + '  (' + hoja.getLastRow() + ' filas)');
  });

  resetSheetCache_();
  var despachos = getSheet_(CONFIG.SHEETS.DESPACHOS);

  lineas.push('');
  lineas.push('ÚLTIMAS 8 FILAS DE ' + CONFIG.SHEETS.DESPACHOS);
  lineas.push('  Total de filas leídas: ' + despachos.length);
  lineas.push('  fila | despacho_id | fecha | canal');

  despachos.slice(-8).forEach(function (d) {
    lineas.push('  ' + d.__row +
      ' | ' + (d.despacho_id || '(sin id)') +
      ' | ' + (toIsoDateOrNull_(d.fecha) || '(SIN FECHA)') +
      ' | ' + (d.canal || '(sin canal)'));
  });

  lineas.push('');
  lineas.push('Si la fecha que buscás no aparece acá, no está en esta hoja.');
  lineas.push('Compará el nombre y la URL de arriba con el archivo que estás editando.');

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/**
 * Busca una fecha en TODAS las hojas del archivo y dice en cuáles
 * aparece.
 *
 * Sirve para el caso "yo vi el 26 de agosto en el Excel pero el tablero
 * dice 25": muestra si esa fecha está en DESPACHOS, que es la única
 * hoja que alimenta el mapa y los gráficos, o si vive en TONELADAS, en
 * RESUMEN o en alguna hoja de trabajo que el tablero no lee.
 *
 * Compara texto, así que encuentra tanto una celda de fecha real como
 * una escrita a mano. Para buscar otro día, cambiar la constante.
 */
function buscarFecha() {
  var BUSCADA = '2026-08-26';

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lineas = [];
  lineas.push('BUSCANDO "' + BUSCADA + '" EN TODAS LAS HOJAS');

  var partes = BUSCADA.split('-');
  var anio = partes[0];
  var mes = String(Number(partes[1]));
  var dia = String(Number(partes[2]));

  // Formas en que la misma fecha puede estar escrita en una celda.
  var variantes = [
    BUSCADA,
    dia + '/' + mes + '/' + anio,
    mes + '/' + dia + '/' + anio,
    dia + '-' + mes + '-' + anio,
  ];

  var encontradaEnAlguna = false;

  ss.getSheets().forEach(function (hoja) {
    var ultimaFila = hoja.getLastRow();
    var ultimaCol = hoja.getLastColumn();
    if (ultimaFila < 1 || ultimaCol < 1) return;

    var valores = hoja.getRange(1, 1, ultimaFila, ultimaCol).getValues();
    var golpes = [];

    for (var f = 0; f < valores.length; f++) {
      for (var c = 0; c < valores[f].length; c++) {
        var celda = valores[f][c];
        if (celda === '' || celda === null) continue;

        var texto;
        if (Object.prototype.toString.call(celda) === '[object Date]') {
          texto = Utilities.formatDate(celda, 'America/Bogota', 'yyyy-MM-dd');
        } else {
          texto = String(celda).trim();
        }

        for (var v = 0; v < variantes.length; v++) {
          if (texto === variantes[v] || texto.indexOf(variantes[v]) !== -1) {
            golpes.push('fila ' + (f + 1) + ', columna ' + (c + 1) + ': "' + texto + '"');
            break;
          }
        }
      }
    }

    if (golpes.length > 0) {
      encontradaEnAlguna = true;
      lineas.push('');
      lineas.push('  ' + hoja.getName() + ': ' + golpes.length + ' celda(s)');
      golpes.slice(0, 10).forEach(function (g) { lineas.push('    ' + g); });
      if (golpes.length > 10) lineas.push('    y ' + (golpes.length - 10) + ' más');
    }
  });

  if (!encontradaEnAlguna) {
    lineas.push('');
    lineas.push('  No aparece en ninguna hoja de este archivo.');
  }

  lineas.push('');
  lineas.push('QUÉ HACER CON EL RESULTADO');
  lineas.push('  Si aparece SOLO en TONELADAS, RESUMEN u otra hoja de trabajo:');
  lineas.push('  el tablero está bien. El mapa y los gráficos leen DESPACHOS,');
  lineas.push('  y esa fecha todavía no tiene despachos cargados.');
  lineas.push('  Si aparece en DESPACHOS: revisar que esa fila tenga destino en');
  lineas.push('  DESPACHO_DESTINO, o va a quedar fuera igual.');

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/**
 * Muestra la zona de cada municipio según CAT_MUNICIPIOS.
 *
 * Es la fuente que usa el tablero para agrupar por zona. Si acá dice que
 * Dagua es Sur, el tablero va a decir Sur: no hay nada que corregir en el
 * código, hay que corregir la columna subregion de esa hoja.
 *
 * También avisa de las celdas vacías, que producen un grupo llamado
 * "Sin zona" en la página.
 */
function zonasDelCatalogo() {
  resetSheetCache_();

  var municipios = getSheet_(CONFIG.SHEETS.CAT_MUNICIPIOS);
  var porZona = {};
  var sinZona = [];
  var lineas = [];

  municipios.forEach(function (m) {
    var nombre = String(m.nombre || '(sin nombre)').trim();
    var zona = String(m.subregion || '').trim();

    if (!zona) {
      sinZona.push(nombre);
      return;
    }
    if (!porZona[zona]) porZona[zona] = [];
    porZona[zona].push(nombre);
  });

  lineas.push('ZONAS SEGÚN CAT_MUNICIPIOS');
  lineas.push('  Filas leídas: ' + municipios.length);

  Object.keys(porZona)
    .sort()
    .forEach(function (zona) {
      var lista = porZona[zona].sort();
      lineas.push('');
      lineas.push('  ' + zona + ': ' + lista.length + ' municipios');
      lineas.push('    ' + lista.join(', '));
    });

  if (sinZona.length > 0) {
    lineas.push('');
    lineas.push('  SIN ZONA: ' + sinZona.length);
    lineas.push('    ' + sinZona.join(', '));
    lineas.push('    Estos van a aparecer agrupados como "Sin zona" en la página.');
  }

  // Un municipio suele generar dudas, así que se resuelve de una.
  var dagua = municipios.filter(function (m) {
    return normalizeText_(m.nombre) === normalizeText_('Dagua');
  })[0];

  lineas.push('');
  lineas.push('  Dagua: ' + (dagua ? (dagua.subregion || '(vacío)') : 'no está en el catálogo'));

  lineas.push('');
  lineas.push('  Cali entra en el conteo de esta lista pero NO en el del tablero,');
  lineas.push('  que la excluye del consolidado. Por eso una zona puede mostrar');
  lineas.push('  un municipio menos que acá.');

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/**
 * Busca despachos que apuntan al MISMO archivo de Drive.
 *
 * Dos despachos con el mismo drive_id son el mismo formato contado dos
 * veces, y el tablero suma los dos. No los borra nadie automáticamente,
 * a propósito: decidir cuál se queda es criterio de quien conoce el
 * archivo, no del código.
 *
 * También reporta los que comparten nombre de documento pero tienen
 * drive_id distinto. Esos casi siempre son entregas reales y separadas,
 * dos formatos del mismo municipio el mismo día, así que aparecen en una
 * lista aparte para no confundirlos con los duplicados de verdad.
 */
function duplicados() {
  resetSheetCache_();

  var catalogs = loadCatalogs_();
  var facts = loadFacts_(catalogs);
  var despachos = getSheet_(CONFIG.SHEETS.DESPACHOS);

  var porDrive = {};
  var porNombre = {};

  despachos.forEach(function (d) {
    var drive = String(d.drive_id || '').trim();
    if (drive) {
      if (!porDrive[drive]) porDrive[drive] = [];
      porDrive[drive].push(d);
    }

    var nombre = normalizeText_(d.documento || d.nombre_documento || '');
    if (nombre) {
      if (!porNombre[nombre]) porNombre[nombre] = [];
      porNombre[nombre].push(d);
    }
  });

  var lineas = [];
  lineas.push('DUPLICADOS POR ID DE DRIVE');
  lineas.push('  Son el mismo archivo contado más de una vez.');

  var confirmados = 0;
  var entregasInfladas = 0;

  Object.keys(porDrive).forEach(function (drive) {
    var grupo = porDrive[drive];
    if (grupo.length < 2) return;

    confirmados += 1;

    // Cuántas entregas de más produce: cada repetición aporta sus
    // propios enlaces a destino.
    var extra = 0;
    grupo.slice(1).forEach(function (d) {
      var resuelto = facts.despachos.filter(function (f) { return f.id === d.despacho_id; })[0];
      extra += resuelto ? resuelto.destinos.length : 1;
    });
    entregasInfladas += extra;

    lineas.push('');
    lineas.push('  drive_id ' + drive);
    grupo.forEach(function (d) {
      lineas.push('    ' + d.despacho_id +
        ' | fila ' + d.__row +
        ' | ' + (toIsoDateOrNull_(d.fecha) || 'sin fecha') +
        ' | ' + (d.canal || 'sin canal'));
    });
    lineas.push('    Entregas de más que aporta este grupo: ' + extra);
  });

  if (confirmados === 0) {
    lineas.push('  Ninguno. Cada despacho apunta a un archivo distinto.');
  } else {
    lineas.push('');
    lineas.push('  Grupos duplicados: ' + confirmados);
    lineas.push('  Entregas de más en el tablero: ' + entregasInfladas);
    lineas.push('  Para corregirlo, borrar la fila sobrante en DESPACHOS y su');
    lineas.push('  fila en DESPACHO_DESTINO. El código no elige cuál se queda.');
  }

  lineas.push('');
  lineas.push('MISMO NOMBRE, ARCHIVO DISTINTO');
  lineas.push('  Casi siempre son entregas reales y separadas. Se listan para');
  lineas.push('  revisar, no para borrar.');

  var sospechosos = 0;
  Object.keys(porNombre).forEach(function (nombre) {
    var grupo = porNombre[nombre];
    if (grupo.length < 2) return;

    var drives = {};
    grupo.forEach(function (d) { drives[String(d.drive_id || '')] = true; });
    if (Object.keys(drives).length < 2) return; // ya salió como duplicado real

    sospechosos += 1;
    lineas.push('    ' + grupo.map(function (d) { return d.despacho_id; }).join(', ') +
      ' | ' + nombre);
  });

  if (sospechosos === 0) lineas.push('    Ninguno.');

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/**
 * Prueba buildToneladas_ contra la hoja, sin publicar nada.
 *
 * Sirve para saber si el problema está en la lectura de la hoja o en que
 * la ruta todavía no existe. Si acá el total sale bien y el tablero
 * sigue mostrando la cifra estimada, falta el `case 'toneladas'` en
 * Code.gs o falta republicar con Nueva versión.
 *
 * Recordar que esta serie es DEPARTAMENTAL: incluye Cali, el centro de
 * acopio de Cartago y las otras ayudas solidarias. Va a ser mayor que la
 * estimación sobre entregas municipales, y eso es correcto.
 */
function probarToneladas() {
  resetSheetCache_();

  var lineas = [];
  lineas.push('PRUEBA DE route=toneladas');

  if (!CONFIG.SHEETS.TONELADAS) {
    lineas.push('  CONFIG.SHEETS.TONELADAS no está definido.');
    lineas.push('  Agregar en Config.gs, dentro de SHEETS:');
    lineas.push("    TONELADAS: 'TONELADAS',");
    Logger.log(lineas.join('\n'));
    return lineas.join('\n');
  }

  var resultado;
  try {
    resultado = buildToneladas_();
  } catch (e) {
    lineas.push('  buildToneladas_ falló: ' + e);
    lineas.push('  Verificar que Toneladas.gs esté pegado en el proyecto.');
    Logger.log(lineas.join('\n'));
    return lineas.join('\n');
  }

  lineas.push('  Días leídos: ' + resultado.serie.length);
  lineas.push('  Total: ' + resultado.total + ' toneladas');
  lineas.push('');
  lineas.push('  día  toneladas  acumulado');
  resultado.serie.forEach(function (p) {
    lineas.push('  ' + p.dia + '   ' + pad_(p.toneladas, 8) + '  ' + pad_(p.acumulado, 9));
  });

  // Contraste contra la fila ACUMULADO de la hoja, si existe. Es la
  // forma más rápida de detectar una fila que el filtro se comió.
  var crudas = getSheet_(CONFIG.SHEETS.TONELADAS);
  var declarado = null;
  crudas.forEach(function (f) {
    var etiqueta = normalizeText_(String(f['DÍA'] || ''));
    if (etiqueta.indexOf('ACUMULADO') !== -1) {
      declarado = toNumberOrNull_(f['TONELADAS (t)']);
    }
  });

  lineas.push('');
  if (declarado === null) {
    lineas.push('  La hoja no trae fila ACUMULADO, no hay contra qué contrastar.');
  } else if (declarado === resultado.total) {
    lineas.push('  Coincide con el ACUMULADO de la hoja: ' + declarado + '.');
    lineas.push('  La lectura está bien. Si el tablero muestra otra cifra, falta');
    lineas.push('  publicar la ruta o republicar con Nueva versión.');
  } else {
    lineas.push('  NO COINCIDE. La hoja declara ' + declarado + ' y la suma da ' +
      resultado.total + '.');
    lineas.push('  Diferencia: ' + (declarado - resultado.total) + '. Buscar una fila');
    lineas.push('  con el día escrito como texto, que el filtro descarta.');
  }

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/**
 * Ejecuta cada constructor de ruta por separado y reporta cuál falla.
 *
 * Sirve cuando el navegador muestra un 404 en la URL de
 * script.googleusercontent.com. Ese 404 no significa que la ruta no
 * exista: significa que el script lanzó una excepción al armar la
 * respuesta, y Apps Script devolvió su propia página de error en vez del
 * JSON. El mensaje real solo se ve ejecutando desde el editor.
 *
 * Cada ruta va en su propio try, así que una que falle no oculta a las
 * demás.
 */
function probarRutas() {
  resetSheetCache_();

  var lineas = ['PRUEBA DE TODAS LAS RUTAS'];
  var catalogs = null;
  var facts = null;

  try {
    catalogs = loadCatalogs_();
    facts = loadFacts_(catalogs);
    lineas.push('  Catálogos y hechos: OK');
  } catch (e) {
    lineas.push('  FALLA AL CARGAR LOS DATOS: ' + e);
    lineas.push('  Ninguna ruta puede funcionar hasta resolver esto.');
    Logger.log(lineas.join('\n'));
    return lineas.join('\n');
  }

  var pruebas = [
    { nombre: 'meta', fn: function () { return buildMeta_(catalogs, facts); } },
    { nombre: 'origenes', fn: function () { return buildOrigenes_(); } },
    { nombre: 'municipios', fn: function () { return buildMunicipios_(catalogs); } },
    { nombre: 'categorias', fn: function () { return buildCategorias_(catalogs); } },
    { nombre: 'flujos', fn: function () { return buildFlujos_(catalogs, facts); } },
    // El nombre de esta puede variar según cómo se llame en
    // Transforms.gs. Se resuelve en tiempo de ejecución para no reportar
    // una falla que en realidad es un nombre mal escrito acá.
    {
      nombre: 'destinos',
      fn: function () {
        var fn = this.destinosFn;
        if (!fn) throw new Error('no se encontró la función que arma route=destinos');
        return fn(catalogs, facts);
      },
      destinosFn:
        typeof buildDestinos_ === 'function'
          ? buildDestinos_
          : typeof buildDestinosLista_ === 'function'
            ? buildDestinosLista_
            : null,
    },
    { nombre: 'toneladas', fn: function () { return buildToneladas_(); } },
    { nombre: 'ayuda', fn: function () { return buildAyuda_(catalogs, facts); } },
  ];

  lineas.push('');
  pruebas.forEach(function (p) {
    try {
      var r = p.fn();
      lineas.push('  ' + p.nombre + ': OK  ' + resumirRespuesta_(r));
    } catch (e) {
      lineas.push('  ' + p.nombre + ': FALLA');
      lineas.push('    ' + e);
      if (e && e.stack) {
        lineas.push('    ' + String(e.stack).split('\n').slice(0, 3).join(' | '));
      }
    }
  });

  lineas.push('');
  lineas.push('Si todas dicen OK y el navegador sigue dando 404, falta');
  lineas.push('republicar: Implementar, Gestionar implementaciones, editar,');
  lineas.push('Versión: Nueva versión. La URL /exec sirve la versión');
  lineas.push('desplegada, no el código del editor.');

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/** Una línea corta que describe la forma de una respuesta. */
function resumirRespuesta_(r) {
  if (r === null || r === undefined) return '(vacío)';
  if (Object.prototype.toString.call(r) === '[object Array]') return r.length + ' elementos';
  if (typeof r === 'object') {
    return Object.keys(r)
      .slice(0, 5)
      .map(function (k) {
        var v = r[k];
        if (Object.prototype.toString.call(v) === '[object Array]') return k + '[' + v.length + ']';
        if (typeof v === 'object') return k + '{}';
        return k + '=' + v;
      })
      .join(' ');
  }
  return String(r);
}

/**
 * Compara las cifras del backend contra la suma directa de las hojas.
 *
 * Sirve cuando una ruta responde OK pero con un número que no cuadra:
 * ahí el problema no es una excepción sino una fila que se está
 * descartando en silencio.
 */
function compararCifras() {
  resetSheetCache_();

  var catalogs = loadCatalogs_();
  var facts = loadFacts_(catalogs);
  var lineas = ['COMPARACIÓN CONTRA LAS HOJAS'];

  // --- unidades ---------------------------------------------------------
  var filas = getSheet_(CONFIG.SHEETS.ENVIOS_CATEGORIA);
  var sumaHoja = 0;
  var sinUnidades = 0;
  filas.forEach(function (f) {
    var u = toNumberOrNull_(f.unidades);
    if (u === null) sinUnidades += 1;
    else sumaHoja += u;
  });

  var enFacts = facts.enviosCategoria.reduce(function (acc, e) { return acc + e.unidades; }, 0);

  lineas.push('');
  lineas.push('UNIDADES');
  lineas.push('  Filas en la hoja: ' + filas.length);
  lineas.push('  Filas que llegan a facts: ' + facts.enviosCategoria.length);
  lineas.push('  Suma directa de la hoja: ' + sumaHoja);
  lineas.push('  Suma en facts: ' + enFacts);
  lineas.push('  Filas sin unidades legibles: ' + sinUnidades);

  if (filas.length !== facts.enviosCategoria.length) {
    lineas.push('  SE PIERDEN ' + (filas.length - facts.enviosCategoria.length) + ' fila(s) al cargar.');
    lineas.push('  Causa habitual: el destino o la categoría de esa fila no está');
    lineas.push('  en su catálogo, o está con activo en NO. Correr verificarIds().');
  }

  // --- flujos -----------------------------------------------------------
  var flujos = buildFlujos_(catalogs, facts);
  var porMotivo = {};
  var destinosExcluidos = {};

  flujos.excluidos.forEach(function (e) {
    porMotivo[e.motivo] = (porMotivo[e.motivo] || 0) + 1;
    var destino = catalogs.destinosById[e.destinoId];
    var nombre = destino ? destino.nombre + ' (' + destino.tipo + ', ' + destino.precision + ')'
                         : e.destinoId + ' (no está en el catálogo)';
    destinosExcluidos[nombre] = (destinosExcluidos[nombre] || 0) + 1;
  });

  lineas.push('');
  lineas.push('FLUJOS');
  lineas.push('  Pares origen-destino: ' + flujos.flujos.length);
  lineas.push('  Excluidos: ' + flujos.excluidos.length);
  Object.keys(porMotivo).forEach(function (m) {
    lineas.push('    ' + m + ': ' + porMotivo[m]);
  });

  lineas.push('');
  lineas.push('  Qué destinos quedan fuera:');
  Object.keys(destinosExcluidos)
    .sort(function (a, b) { return destinosExcluidos[b] - destinosExcluidos[a]; })
    .slice(0, 15)
    .forEach(function (n) {
      lineas.push('    ' + destinosExcluidos[n] + ' vez/veces  ' + n);
    });

  lineas.push('');
  lineas.push('  Un destino con precision distinta de MUNICIPIO no se dibuja.');
  lineas.push('  Si acá aparece un municipio normal, revisar su latitud y');
  lineas.push('  longitud en CAT_MUNICIPIOS.');

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/**
 * Lista los valores de DESPACHOS.canal y dice cuáles no tienen origen.
 *
 * Un canal que no está en CONFIG.ORIGENES manda sus despachos a un
 * origen no animable, y esos arcos desaparecen del mapa sin ningún
 * mensaje. Pasó al renombrar "Centro de acopio Cartago" a "Centro de
 * distribución Cartago" en el Excel: 39 entregas del norte dejaron de
 * dibujarse.
 */
function canalesSinOrigen() {
  resetSheetCache_();

  var despachos = getSheet_(CONFIG.SHEETS.DESPACHOS);
  var porCanal = {};

  despachos.forEach(function (d) {
    var canal = String(d.canal || '(sin canal)').trim();
    porCanal[canal] = (porCanal[canal] || 0) + 1;
  });

  var lineas = ['CANALES DE DESPACHOS'];
  var huerfanos = 0;

  Object.keys(porCanal)
    .sort(function (a, b) { return porCanal[b] - porCanal[a]; })
    .forEach(function (canal) {
      var origen = CONFIG.ORIGENES[canal];
      var marca = origen ? origen : 'SIN ORIGEN';
      if (!origen) huerfanos += porCanal[canal];
      lineas.push('  ' + pad_(porCanal[canal], 4) + '  "' + canal + '"  ->  ' + marca);
    });

  lineas.push('');
  if (huerfanos === 0) {
    lineas.push('Todos los canales tienen origen asignado.');
  } else {
    lineas.push(huerfanos + ' despacho(s) sin origen. Agregar esos nombres a');
    lineas.push('CONFIG.ORIGENES en Config.gs, copiando el texto EXACTO de');
    lineas.push('arriba, con sus tildes y mayúsculas.');
  }

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}

/**
 * Qué filas de ENVIOS_CATEGORIA no llegan al backend, y por qué.
 *
 * Se pierden cuando su destino o su categoría no está en el catálogo, o
 * está con activo en NO. Acá se ve cuál de las dos y con qué valor.
 */
function enviosPerdidos() {
  resetSheetCache_();

  var catalogs = loadCatalogs_();
  var filas = getSheet_(CONFIG.SHEETS.ENVIOS_CATEGORIA);

  var destinosFaltantes = {};
  var categoriasFaltantes = {};
  var unidadesPerdidas = 0;
  var perdidas = 0;

  filas.forEach(function (f) {
    var destinoId = String(f.destino_id || '').trim();
    var categoriaId = String(f.categoria_id || '').trim();

    var destino = destinoId ? catalogs.destinosById[destinoId] : null;
    var categoria = categoriaId ? catalogs.categoriasById[categoriaId] : null;

    if (destino && categoria) return;

    perdidas += 1;
    unidadesPerdidas += toNumberOrNull_(f.unidades) || 0;

    if (!destino) {
      var claveD = destinoId + '  (la fila dice "' + (f.destino || '') + '")';
      destinosFaltantes[claveD] = (destinosFaltantes[claveD] || 0) + 1;
    }
    if (!categoria) {
      var claveC = categoriaId + '  (la fila dice "' + (f.categoria || '') + '")';
      categoriasFaltantes[claveC] = (categoriasFaltantes[claveC] || 0) + 1;
    }
  });

  var lineas = ['FILAS DE ENVIOS_CATEGORIA QUE NO LLEGAN AL TABLERO'];
  lineas.push('  Filas perdidas: ' + perdidas + ' de ' + filas.length);
  lineas.push('  Unidades perdidas: ' + unidadesPerdidas);

  var kd = Object.keys(destinosFaltantes);
  if (kd.length > 0) {
    lineas.push('');
    lineas.push('  DESTINOS que no están en el catálogo activo:');
    kd.forEach(function (k) {
      lineas.push('    ' + destinosFaltantes[k] + ' fila(s)  ' + k);
    });
    lineas.push('    Revisar CAT_DESTINOS: que el id exista y que activo no sea NO.');
  }

  var kc = Object.keys(categoriasFaltantes);
  if (kc.length > 0) {
    lineas.push('');
    lineas.push('  CATEGORÍAS que no están en el catálogo activo:');
    kc.forEach(function (k) {
      lineas.push('    ' + categoriasFaltantes[k] + ' fila(s)  ' + k);
    });
    lineas.push('    Revisar CAT_CATEGORIAS.');
  }

  if (perdidas === 0) lineas.push('  Ninguna. Todas las filas llegan.');

  var texto = lineas.join('\n');
  Logger.log(texto);
  return texto;
}