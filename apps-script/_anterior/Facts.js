/**
 * Facts.gs
 * -----------------------------------------------------------------------
 * Lee DESPACHOS, DESPACHO_DESTINO, DESPACHO_POBLACION y ENVIOS_CATEGORIA,
 * y resuelve sus referencias por nombre contra los catálogos (ver
 * Catalogs.gs). Cualquier fila que no matchee un catálogo se reporta en
 * `warnings` en vez de fallar silenciosamente.
 *
 * CAMBIO: las UNIDADES ya no salen de ENVIOS_CATEGORIA.
 *
 * Esa columna está rota. En 242 de 553 pares destino-categoría no
 * coincide con la suma de DETALLE_PRODUCTO, y la diferencia es de
 * órdenes de magnitud: Sevilla / Aseo personal dice 10 donde el detalle
 * suma 9.764, Cartago / Líquidos dice 10 contra 9.526. Parece haberse
 * cargado el conteo de renglones en lugar de las unidades.
 *
 * El total pasa de 96.360 a 256.263, que es 2,7 veces más. Como todos
 * los porcentajes por categoría del tablero salen de ahí, TODOS cambian.
 *
 * Se toca acá y no en cada ruta a propósito: `facts.enviosCategoria` es
 * lo que consumen buildAyuda_, buildDestinoResumen_,
 * buildDestinosResumenLista_ y buildMeta_. Cambiando el origen de
 * `unidades` en un solo punto, las cuatro quedan bien de una vez, y
 * ninguna puede quedarse atrás.
 *
 * ENVIOS_CATEGORIA sigue siendo la que manda para saber QUÉ pares
 * destino-categoría existen y para `renglones`, `productosDistintos` y
 * `fechaCorte`. Lo único que se reemplaza es la cantidad.
 *
 * QUÉ PASA CON LOS PARES SIN DETALLE
 *
 * Once pares de ENVIOS_CATEGORIA no tienen ninguna fila en
 * DETALLE_PRODUCTO, y suman 558 unidades. Esos conservan el valor de la
 * hoja y quedan reportados como UNIDADES_SIN_DETALLE. Es un compromiso
 * consciente: la cifra de esos once es dudosa, pero borrarla sería peor
 * que dejarla, porque son entregas que existieron.
 * -----------------------------------------------------------------------
 */

/**
 * @param {ReturnType<typeof loadCatalogs_>} catalogs
 * @return {{ despachos: Array, enviosCategoria: Array, detalle: Object, warnings: Array }}
 */
function loadFacts_(catalogs) {
  var warnings = [];

  // El detalle por producto se carga primero: alimenta las unidades de
  // ENVIOS_CATEGORIA más abajo.
  var detalle = loadDetalleProducto_(catalogs);
  detalle.warnings.forEach(function (w) { warnings.push(w); });

  // --- DESPACHO_DESTINO: puente N:N despacho -> destino(s) ---------------
  var despachoDestinoRaw = getSheet_(CONFIG.SHEETS.DESPACHO_DESTINO);
  var destinosPorDespacho = groupBy_(despachoDestinoRaw, function (r) { return r.despacho_id; });

  // --- DESPACHO_POBLACION: puente N:N despacho -> población(es) ----------
  var despachoPoblacionRaw = getSheet_(CONFIG.SHEETS.DESPACHO_POBLACION);
  var poblacionesPorDespacho = groupBy_(despachoPoblacionRaw, function (r) { return r.despacho_id; });

  function resolverDestinosDe(despachoId) {
    var filas = destinosPorDespacho[despachoId] || [];
    return filas
      .sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); })
      .map(function (f) {
        var resuelto = resolverDestinoPorNombre_(catalogs, f.destino);
        if (!resuelto.destino) {
          warnings.push({
            tipo: 'DESTINO_FUERA_DE_CATALOGO',
            despachoId: despachoId,
            valor: f.destino,
            fila: f.__row,
          });
          return null;
        }
        var destino = resuelto.destino;
        return {
          destinoId: destino.id,
          orden: f.orden || null,
          esPrincipal: (f.orden || 1) === 1,
          tipoRelacion: f.tipo_relacion || null,
          confianza: f.confianza || null,
          familiasDelDespacho: toNumberOrNull_(f.familias_del_despacho),
          unidadesDelDespacho: toNumberOrNull_(f.unidades_del_despacho),
        };
      })
      .filter(Boolean);
  }

  function resolverPoblacionesDe(despachoId) {
    var filas = poblacionesPorDespacho[despachoId] || [];
    return filas
      .map(function (f) {
        var poblacion = catalogs.poblacionesByNombreNorm[normalizeText_(f.poblacion)];
        if (!poblacion) {
          warnings.push({
            tipo: 'POBLACION_FUERA_DE_CATALOGO',
            despachoId: despachoId,
            valor: f.poblacion,
            fila: f.__row,
          });
          return null;
        }
        return { id: poblacion.id, nombre: poblacion.nombre };
      })
      .filter(Boolean);
  }

  // --- DESPACHOS ------------------------------------------------------
  var despachosRaw = getSheet_(CONFIG.SHEETS.DESPACHOS);
  var despachos = despachosRaw.map(function (d) {
    var categoria = d.categoria_principal
      ? catalogs.categoriasByNombreNorm[normalizeText_(d.categoria_principal)]
      : null;
    if (d.categoria_principal && !categoria) {
      warnings.push({
        tipo: 'CATEGORIA_FUERA_DE_CATALOGO',
        despachoId: d.despacho_id,
        valor: d.categoria_principal,
        fila: d.__row,
      });
    }

    var documento = d.drive_id ? catalogs.documentosByDriveId[d.drive_id] : null;

    var destinosResueltos = resolverDestinosDe(d.despacho_id);
    if (destinosResueltos.length === 0) {
      warnings.push({ tipo: 'DESPACHO_SIN_DESTINO', despachoId: d.despacho_id, fila: d.__row });
    }

    return {
      id: d.despacho_id,
      fecha: toIsoDateOrNull_(d.fecha),
      canal: d.canal || null,
      origenId: resolveOrigenId_(d.canal),
      familias: toNumberOrNull_(d.familias),
      unidades: toNumberOrNull_(d.unidades),
      categoriaId: categoria ? categoria.id : null,
      categoriaNombre: categoria ? categoria.nombre : (d.categoria_principal || null),
      detallePropio: normalizeText_(d.detalle_propio) === 'SI',
      observaciones: d.observaciones || null,
      documento: documento
        ? {
            id: documento.id,
            nombre: documento.nombreOriginal,
            driveUrl: CONFIG.DRIVE_FILE_URL_PREFIX + documento.driveId + CONFIG.DRIVE_FILE_URL_SUFFIX,
          }
        : null,
      destinos: destinosResueltos,
      poblaciones: resolverPoblacionesDe(d.despacho_id),
    };
  });

  // --- ENVIOS_CATEGORIA -------------------------------------------------
  var enviosRaw = getSheet_(CONFIG.SHEETS.ENVIOS_CATEGORIA);
  var enviosCategoria = enviosRaw
    .map(function (e) {
      var resuelto = resolverDestinoPorNombre_(catalogs, e.destino);
      var categoria = catalogs.categoriasByNombreNorm[normalizeText_(e.categoria)];

      if (!resuelto.destino) {
        warnings.push({ tipo: 'DESTINO_FUERA_DE_CATALOGO', envioId: e.envio_id, valor: e.destino, fila: e.__row });
        return null;
      }
      if (!categoria) {
        warnings.push({ tipo: 'CATEGORIA_FUERA_DE_CATALOGO', envioId: e.envio_id, valor: e.categoria, fila: e.__row });
        return null;
      }

      var destinoId = resuelto.destino.id;
      var delDetalle = detalle.porClave[destinoId + '::' + categoria.id];

      // Acá está el cambio. La cantidad sale del detalle por producto; la
      // columna `unidades` de la hoja solo se usa cuando ese par no tiene
      // ninguna fila de detalle, y en ese caso queda anotado.
      var unidades;
      if (delDetalle) {
        unidades = delDetalle.unidades;
      } else {
        unidades = toNumberOrNull_(e.unidades) || 0;
        warnings.push({
          tipo: 'UNIDADES_SIN_DETALLE',
          envioId: e.envio_id,
          valor: resuelto.destino.nombre + ' / ' + categoria.nombre,
          fila: e.__row,
        });
      }

      return {
        id: e.envio_id,
        destinoId: destinoId,
        categoriaId: categoria.id,
        categoriaNombre: categoria.nombre,
        unidades: unidades,
        // Los productos de este par, de mayor a menor. Es lo que permite
        // que la página deje de mostrar una lista escrita a mano.
        productos: delDetalle ? delDetalle.productos : [],
        renglones: toNumberOrNull_(e.renglones),
        productosDistintos: toNumberOrNull_(e.productos_distintos),
        porcentajeReportado: toNumberOrNull_(e.porcentaje_reportado),
        fechaCorte: toIsoDateOrNull_(e.fecha_corte),
      };
    })
    .filter(Boolean);

  return {
    despachos: despachos,
    enviosCategoria: enviosCategoria,
    detalle: detalle,
    warnings: warnings,
  };
}