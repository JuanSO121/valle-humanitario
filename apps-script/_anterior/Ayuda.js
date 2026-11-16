/**
 * Ayuda.gs
 * -----------------------------------------------------------------------
 * GET ?route=ayuda
 *
 * Qué se entregó, a qué grupos y por qué canales.
 *
 * CAMBIO: cada categoría trae ahora sus PRODUCTOS.
 *
 * Salen de DETALLE_PRODUCTO vía Facts.gs, así que la sección "¿Qué se
 * entregó?" deja de leer la lista escrita a mano de ayudaData.ts. Eso
 * corrige una contradicción que estaba a la vista: la página decía
 * "Tapabocas 17.100" al lado de "Protección y seguridad: 11.167
 * unidades", y la suma de los catorce artículos del listado general
 * (100.426) superaba el total de toda la operación (96.360).
 *
 * Con las unidades saliendo del mismo detalle que los productos, las dos
 * cifras vuelven a ser la misma y ya no pueden divergir.
 *
 * `productosDestacados` es el ranking general, para "Lo más entregado"
 * cuando no hay categoría elegida. Va calculado acá y no sumando las
 * listas por categoría en el frontend, porque un producto puede aparecer
 * en varias y sumarlo mal es fácil.
 *
 * QUÉ RESUELVE, DE ANTES
 *
 * La sección decía "Aseo personal llegó a 44 municipios" en un
 * departamento de 41. ENVIOS_CATEGORIA cuenta destinos de todo tipo,
 * incluidos acopios y entidades. Acá se separan las dos cuentas,
 * `destinos` y `municipios`, y esta última excluye a Cali igual que el
 * resto del tablero.
 * -----------------------------------------------------------------------
 */

/** Cuántos productos viajan por categoría y en el ranking general. */
var TOPE_PRODUCTOS_POR_CATEGORIA = 12;
var TOPE_PRODUCTOS_DESTACADOS = 14;

function buildAyuda_(catalogs, facts) {
  var totalUnidades = 0;

  // Cali es un destino de tipo municipio pero queda fuera del
  // consolidado por instrucción expresa. Se resuelve acá arriba porque
  // lo necesitan tanto las categorías como los canales.
  var caliId = null;
  Object.keys(catalogs.destinosById).forEach(function (id) {
    var destino = catalogs.destinosById[id];
    if (normalizeText_(destino.nombre) === normalizeText_('Santiago de Cali')) caliId = id;
  });

  // --- categorías -------------------------------------------------------
  var porCategoria = {};

  facts.enviosCategoria.forEach(function (e) {
    var destino = catalogs.destinosById[e.destinoId];
    var esMunicipio = !!destino && destino.tipo === 'municipio' && e.destinoId !== caliId;

    if (!porCategoria[e.categoriaId]) {
      porCategoria[e.categoriaId] = {
        id: e.categoriaId,
        nombre: e.categoriaNombre,
        unidades: 0,
        renglones: 0,
        destinos: {},
        municipios: {},
        productos: {},
      };
    }

    var cat = porCategoria[e.categoriaId];
    cat.unidades += e.unidades;
    cat.renglones += e.renglones || 0;
    cat.destinos[e.destinoId] = true;

    // Se guarda el NOMBRE además del id: el frontend cruza contra el
    // catálogo de municipios por nombre, porque ENVIOS_CATEGORIA apunta a
    // destinos y no a municipios, y no todo destino tiene código DANE.
    if (esMunicipio) cat.municipios[destino.nombre] = true;

    // Los productos de este par se suman a los de la categoría: un mismo
    // producto llega a muchos destinos y en la página interesa el total,
    // no el desglose por municipio.
    (e.productos || []).forEach(function (p) {
      cat.productos[p.nombre] = (cat.productos[p.nombre] || 0) + p.cantidad;
    });

    totalUnidades += e.unidades;
  });

  var categorias = Object.keys(porCategoria)
    .map(function (id) {
      var c = porCategoria[id];
      var nombresMunicipios = Object.keys(c.municipios).sort();

      var productos = Object.keys(c.productos)
        .map(function (nombre) {
          return { nombre: nombre, unidades: c.productos[nombre] };
        })
        .sort(function (a, b) {
          return b.unidades - a.unidades || a.nombre.localeCompare(b.nombre, 'es');
        });

      return {
        id: c.id,
        nombre: c.nombre,
        unidades: c.unidades,
        renglones: c.renglones,
        porcentaje: totalUnidades > 0 ? round2_(c.unidades / totalUnidades) : 0,
        destinos: Object.keys(c.destinos).length,
        municipios: nombresMunicipios.length,
        // Qué municipios, no solo cuántos. Es lo que permite que al tocar
        // una categoría el mapa resalte los que la recibieron.
        municipiosNombres: nombresMunicipios,
        // Cuántos productos distintos tiene la categoría en total, antes
        // de recortar: sin esto, "12 productos" y "102 productos" se ven
        // igual en la página.
        productosDistintos: productos.length,
        productos: productos.slice(0, TOPE_PRODUCTOS_POR_CATEGORIA),
      };
    })
    .sort(function (a, b) { return b.unidades - a.unidades; });

  // --- los más entregados de toda la operación --------------------------
  var porProducto = facts.detalle ? facts.detalle.porProducto : {};
  var productosDestacados = Object.keys(porProducto)
    .map(function (nombre) {
      return { nombre: nombre, unidades: porProducto[nombre] };
    })
    .sort(function (a, b) {
      return b.unidades - a.unidades || a.nombre.localeCompare(b.nombre, 'es');
    })
    .slice(0, TOPE_PRODUCTOS_DESTACADOS);

  // --- poblaciones ------------------------------------------------------
  // Cuenta DESPACHOS que declaran cada población, no unidades. Un
  // despacho puede declarar varias, así que la suma de esta lista es
  // mayor que el número de despachos y eso es correcto.
  var porPoblacion = {};
  facts.despachos.forEach(function (d) {
    (d.poblaciones || []).forEach(function (p) {
      if (!porPoblacion[p.nombre]) porPoblacion[p.nombre] = 0;
      porPoblacion[p.nombre] += 1;
    });
  });

  var poblaciones = Object.keys(porPoblacion)
    .map(function (nombre) {
      return { nombre: nombre, despachos: porPoblacion[nombre] };
    })
    .sort(function (a, b) { return b.despachos - a.despachos; });

  // --- canales ----------------------------------------------------------
  //
  // Se agrupan por TIPO DE DESTINO, no destino por destino, para que
  // agregar una entidad nueva al Excel no cree una tarjeta suelta ni
  // obligue a tocar el frontend.
  var entregasPorDestino = {};
  facts.despachos.forEach(function (d) {
    (d.destinos || []).forEach(function (rel) {
      entregasPorDestino[rel.destinoId] = (entregasPorDestino[rel.destinoId] || 0) + 1;
    });
  });

  var porCanal = {};

  /**
   * Devuelve el canal de un destino, creándolo si hace falta, y suma sus
   * entregas UNA sola vez.
   *
   * Las entregas se cuentan acá y no en el bucle de envíos porque
   * ENVIOS_CATEGORIA trae una fila por categoría: sumarlas ahí
   * multiplicaba la misma entrega por cada categoría del destino.
   */
  function canalDe_(destinoId) {
    var destino = catalogs.destinosById[destinoId];
    if (!destino) return null;

    var grupo = grupoDeCanal_(destino, destinoId, caliId);
    if (grupo === null) return null;

    if (!porCanal[grupo.id]) {
      porCanal[grupo.id] = {
        id: grupo.id,
        nombre: grupo.nombre,
        entregas: 0,
        unidades: 0,
        renglones: 0,
        destinos: {},
        categorias: {},
      };
    }

    var canal = porCanal[grupo.id];
    if (!canal.destinos[destinoId]) {
      canal.destinos[destinoId] = true;
      canal.entregas += entregasPorDestino[destinoId] || 0;
    }
    return canal;
  }

  // Paso 1: todo destino con al menos un despacho, tenga o no filas en
  // ENVIOS_CATEGORIA.
  Object.keys(entregasPorDestino).forEach(function (destinoId) {
    canalDe_(destinoId);
  });

  // Paso 2: unidades y composición, desde los envíos.
  facts.enviosCategoria.forEach(function (e) {
    var canal = canalDe_(e.destinoId);
    if (canal === null) return; // es un municipio del consolidado

    canal.unidades += e.unidades;
    canal.renglones += e.renglones || 0;
    canal.categorias[e.categoriaNombre] =
      (canal.categorias[e.categoriaNombre] || 0) + e.unidades;
  });

  var canales = Object.keys(porCanal)
    .map(function (id) {
      var c = porCanal[id];
      var categoriasCanal = Object.keys(c.categorias)
        .map(function (nombre) {
          return { nombre: nombre, unidades: c.categorias[nombre] };
        })
        .sort(function (a, b) { return b.unidades - a.unidades; })
        .slice(0, 5);

      return {
        id: c.id,
        nombre: c.nombre,
        entregas: c.entregas,
        unidades: c.unidades,
        renglones: c.renglones,
        destinos: Object.keys(c.destinos).length,
        categorias: categoriasCanal,
      };
    })
    .sort(function (a, b) { return b.unidades - a.unidades || b.entregas - a.entregas; });

  return {
    totalUnidades: totalUnidades,
    categorias: categorias,
    productosDestacados: productosDestacados,
    poblaciones: poblaciones,
    canales: canales,
    fuente: 'DETALLE_PRODUCTO',
    disclaimer:
      'Unidades sumadas del detalle por producto. La columna mezcla mercados, paquetes, ' +
      'kilos y pacas tal como quedaron escritos en el formato, así que sirve para comparar ' +
      'composición, no como peso ni como conteo de personas.',
  };
}

/**
 * En qué grupo cae un destino que no es municipio del consolidado.
 *
 * Devuelve null para los municipios normales, que se cuentan aparte.
 *
 * La regla vive acá y no en el frontend a propósito: si mañana el Excel
 * suma una entidad nueva, entra sola en Otras Ayudas Solidarias sin que
 * nadie toque código de la página.
 */
function grupoDeCanal_(destino, destinoId, caliId) {
  if (caliId !== null && destinoId === caliId) {
    return { id: 'cali', nombre: 'Cali' };
  }

  if (destino.tipo === 'municipio') return null;

  if (destino.tipo === 'agregado_multiple') {
    return { id: 'multiples', nombre: 'Municipios múltiples' };
  }

  // El centro de acopio es una ruta propia, no una entrega puntual.
  // Aparece como destino porque parte de la ayuda se registró a nombre
  // de la bodega antes de repartirse.
  if (destino.tipo === 'centro_acopio') {
    return { id: 'cartago', nombre: destino.nombre };
  }

  // Entidades, casos especiales, centros de protección y lo que salió
  // del departamento. Se leen mejor juntos que como siete tarjetas de
  // una entrega cada una.
  return { id: 'otras-ayudas-solidarias', nombre: 'Otras Ayudas Solidarias' };
}