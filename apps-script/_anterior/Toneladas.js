/**
 * Toneladas.gs
 * -----------------------------------------------------------------------
 * Expone la hoja TONELADAS y la fecha del último envío registrado.
 *
 * Hoy el frontend tiene las toneladas escritas a mano en un archivo,
 * porque CONFIG.SHEETS nunca incluyó esa hoja y ninguna ruta la
 * devolvía. Mientras eso siga así, cada actualización del Excel obliga a
 * editar el código. Con esto, el tablero lee la cifra del día.
 *
 * PASOS PARA INSTALARLO
 *
 * 1. En Config.gs, dentro de CONFIG.SHEETS, agregar:
 *
 *        TONELADAS: 'TONELADAS',
 *
 * 2. Pegar este archivo como uno nuevo en el proyecto de Apps Script.
 *
 * 3. En Code.gs, dentro del switch de doGet, agregar antes de default:
 *
 *        case 'toneladas':
 *          return jsonResponse_(withCache_('toneladas', buildToneladas_));
 *
 * 4. En CacheLayer.gs, agregar 'toneladas' a la lista rutasConocidas de
 *    limpiarCache(). Esa lista está escrita a mano, así que una ruta que
 *    no figure ahí queda cacheada seis horas sin forma de invalidarla.
 *
 * 5. En Transforms.gs, dentro de buildMeta_, reemplazar el bloque de
 *    `totales` por el de buildTotales_ de este archivo, o llamar a
 *    ultimaFechaDespacho_(facts) y agregar el campo. Ver más abajo.
 * -----------------------------------------------------------------------
 */

/**
 * GET ?route=toneladas
 *
 * Devuelve la serie diaria y el acumulado ya calculado, para que el
 * frontend no tenga que sumar. Solo toma las filas cuyo DÍA es un
 * número: la hoja trae filas de encabezado y de total que romperían la
 * serie.
 *
 * IMPORTANTE: esta serie es DEPARTAMENTAL. Suma Cali, el centro de
 * acopio de Cartago y las otras ayudas solidarias, no solo lo municipal.
 * No se puede dividir contra el conteo de entregas por municipio.
 */
function buildToneladas_() {
  var filas = getSheet_(CONFIG.SHEETS.TONELADAS);
  var acumulado = 0;

  var serie = filas
    .map(function (fila) {
      var dia = String(fila['DÍA'] === null || fila['DÍA'] === undefined ? '' : fila['DÍA']).trim();
      if (!/^\d+$/.test(dia)) return null;
      return {
        dia: dia.length === 1 ? '0' + dia : dia,
        toneladas: toNumberOrNull_(fila['TONELADAS (t)']) || 0,
      };
    })
    .filter(Boolean)
    .sort(function (a, b) { return Number(a.dia) - Number(b.dia); })
    .map(function (punto) {
      acumulado += punto.toneladas;
      return { dia: punto.dia, toneladas: punto.toneladas, acumulado: acumulado };
    });

  return {
    serie: serie,
    total: acumulado,
    fuente: 'TONELADAS',
    disclaimer: 'Serie departamental. Incluye Cali, el centro de acopio de Cartago y las otras ayudas solidarias.',
  };
}

/**
 * Fecha del despacho más reciente con fecha registrada.
 *
 * El frontend la necesita para el pie de página y para saber hasta qué
 * día llega la línea de tiempo. Hoy esa fecha está escrita a mano como
 * "25 de agosto de 2026" en varios archivos, así que queda vieja apenas
 * alguien agrega una entrega al Excel.
 */
function ultimaFechaDespacho_(facts) {
  var maxima = null;
  facts.despachos.forEach(function (d) {
    if (!d.fecha) return;
    if (maxima === null || d.fecha > maxima) maxima = d.fecha;
  });
  return maxima;
}

/**
 * Reemplazo del bloque `totales` de buildMeta_ en Transforms.gs.
 *
 * Agrega tres cosas que el frontend hoy no puede saber:
 *   · despachosMunicipales: enlaces despacho a municipio, sin Cali. Es
 *     la cifra que muestra el tablero, distinta de facts.despachos.length
 *     que cuenta filas de la hoja DESPACHOS.
 *   · municipiosAtendidos y municipiosTotales.
 *   · ultimoDespacho: la fecha real del último envío.
 *
 * Para usarlo, en buildMeta_ cambiar:
 *     totales: { ... }
 * por:
 *     totales: buildTotales_(catalogs, facts),
 */
function buildTotales_(catalogs, facts) {
  var totalUnidades = facts.enviosCategoria.reduce(function (acc, e) { return acc + e.unidades; }, 0);

  var destinosConEnvio = {};
  facts.enviosCategoria.forEach(function (e) { destinosConEnvio[e.destinoId] = true; });

  // Cali queda fuera del consolidado municipal por instrucción expresa,
  // igual que en el tablero.
  var caliId = null;
  Object.keys(catalogs.destinosById).forEach(function (id) {
    var destino = catalogs.destinosById[id];
    if (normalizeText_(destino.nombre) === normalizeText_('Santiago de Cali')) caliId = id;
  });

  var municipiosConEntrega = {};
  var despachosMunicipales = 0;

  facts.despachos.forEach(function (d) {
    d.destinos.forEach(function (rel) {
      var destino = catalogs.destinosById[rel.destinoId];
      if (!destino || destino.tipo !== 'municipio') return;
      if (caliId !== null && rel.destinoId === caliId) return;
      despachosMunicipales += 1;
      municipiosConEntrega[rel.destinoId] = true;
    });
  });

  var municipiosTotales = Object.keys(catalogs.municipiosById).length;
  if (caliId !== null) municipiosTotales -= 1;

  return {
    despachos: facts.despachos.length,
    despachosMunicipales: despachosMunicipales,
    municipiosAtendidos: Object.keys(municipiosConEntrega).length,
    municipiosTotales: municipiosTotales,
    unidadesEntregadas: totalUnidades,
    destinosConEnvio: Object.keys(destinosConEnvio).length,
    categorias: Object.keys(catalogs.categoriasById).length,
    municipios: Object.keys(catalogs.municipiosById).length,
    ultimoDespacho: ultimaFechaDespacho_(facts),
  };
}