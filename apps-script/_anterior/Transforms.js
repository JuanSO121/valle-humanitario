/**
 * Transforms.gs
 * -----------------------------------------------------------------------
 * Convierte catálogos + hechos ya resueltos (Catalogs.gs, Facts.gs) en las
 * formas exactas que el contrato de API expone. Ningún handler de Code.gs
 * debería tener que iterar hojas o resolver joins directamente — eso ya
 * pasó acá.
 * -----------------------------------------------------------------------
 */

/**
 * GET /meta
 * Incluye totales + warnings de validación, para que el frontend (o un
 * panel de auditoría) pueda mostrar la salud del dataset sin tener que
 * abrir el Excel.
 */
function buildMeta_(catalogs, facts) {
  var totalUnidadesEnvios = facts.enviosCategoria.reduce(function (acc, e) { return acc + e.unidades; }, 0);
  var destinosConEnvio = {};
  facts.enviosCategoria.forEach(function (e) { destinosConEnvio[e.destinoId] = true; });

  var fechaCorte = facts.enviosCategoria.length
    ? facts.enviosCategoria.reduce(function (max, e) { return e.fechaCorte > max ? e.fechaCorte : max; }, facts.enviosCategoria[0].fechaCorte)
    : null;

  return {
    evento: CONFIG.EVENTO.nombre,
    entidad: CONFIG.EVENTO.entidad,
    fechaCorte: fechaCorte,
    generadoEn: new Date().toISOString(),
    totales: {
      despachos: facts.despachos.length,
      unidadesEntregadas: totalUnidadesEnvios,
      destinosConEnvio: Object.keys(destinosConEnvio).length,
      categorias: Object.keys(catalogs.categoriasById).length,
      municipios: Object.keys(catalogs.municipiosById).length,
    },
    validacion: {
      advertencias: facts.warnings.length,
      detalle: facts.warnings,
    },
  };
}

/** GET /origenes */
function buildOrigenes_() {
  return getOrigenCatalogo_();
}

/** GET /municipios — catálogo de referencia para límites/labels del mapa. */
function buildMunicipios_(catalogs) {
  return catalogs.raw.municipios.map(function (m) {
    return {
      id: m.municipio_id,
      codigoDane: m.codigo_dane,
      nombre: m.nombre,
      subregion: m.subregion,
      latitud: m.latitud,
      longitud: m.longitud,
    };
  });
}

/** GET /categorias */
function buildCategorias_(catalogs) {
  return catalogs.raw.categorias;
}

/**
 * GET /flujos
 * Una fila por par (origen, destino) con al menos un despacho real.
 * `despachosCount` es la ÚNICA métrica que debe alimentar el grosor o la
 * intensidad del arco animado en el frontend — nunca las unidades de
 * ENVIOS_CATEGORIA, que no están desagregadas por origen (ver nota en
 * Config.gs / diagnóstico). Los destinos sin coordenada (precision
 * "SIN_UBICAR") o el origen no animable (ORI-EXTERNO) se excluyen del
 * layer de arcos pero quedan trazables vía `excluidos`.
 *
 * Shape de retorno (contrato con domain/entities.ts → FlujosResponse):
 *   { flujos: Flujo[], excluidos: FlujoExcluido[] }
 */

/**
 * GET /destinos — listado liviano para poblar el mapa (un punto por
 * destino con su total de unidades, sin el detalle de categorías).
 */
function buildDestinosResumenLista_(catalogs, facts) {
  var unidadesPorDestino = {};
  var categoriasPorDestino = {};
  facts.enviosCategoria.forEach(function (e) {
    unidadesPorDestino[e.destinoId] = (unidadesPorDestino[e.destinoId] || 0) + e.unidades;
    categoriasPorDestino[e.destinoId] = (categoriasPorDestino[e.destinoId] || 0) + 1;
  });

  return Object.keys(unidadesPorDestino).map(function (destinoId) {
    var destino = catalogs.destinosById[destinoId];
    return {
      id: destinoId,
      nombre: destino ? destino.nombre : destinoId,
      tipo: destino ? destino.tipo : null,
      latitud: destino ? destino.latitud : null,
      longitud: destino ? destino.longitud : null,
      totalUnidades: unidadesPorDestino[destinoId],
      categoriasConEnvio: categoriasPorDestino[destinoId],
    };
  });
}

/**
 * GET /destinos/{id}
 * Vista PRINCIPAL — la historia. Solo ENVIOS_CATEGORIA.
 */
function buildDestinoResumen_(catalogs, facts, destinoId) {
  var destino = catalogs.destinosById[destinoId];
  if (!destino) return null;

  var envios = facts.enviosCategoria.filter(function (e) { return e.destinoId === destinoId; });
  var totalUnidades = envios.reduce(function (acc, e) { return acc + e.unidades; }, 0);

  var categorias = envios
    .map(function (e) {
      return {
        id: e.categoriaId,
        nombre: e.categoriaNombre,
        unidades: e.unidades,
        porcentaje: totalUnidades > 0 ? round2_(e.unidades / totalUnidades) : 0,
      };
    })
    .sort(function (a, b) { return b.unidades - a.unidades; });

  var fechaCorte = envios.length ? envios[0].fechaCorte : null;

  return {
    destino: {
      id: destino.id,
      nombre: destino.nombre,
      tipo: destino.tipo,
      latitud: destino.latitud,
      longitud: destino.longitud,
    },
    resumen: {
      totalUnidades: totalUnidades,
      categoriasConEnvio: categorias.length,
      fechaCorte: fechaCorte,
    },
    categorias: categorias,
    fuente: 'ENVIOS_CATEGORIA',
    disclaimer: 'Unidades agregadas por destino y categoría. No representan despachos individuales.',
  };
}

/**
 * GET /destinos/{id}/logistica
 * Vista SECUNDARIA — el detalle de "cómo llegó". Solo DESPACHOS.
 */
function buildDestinoLogistica_(catalogs, facts, destinoId) {
  var destino = catalogs.destinosById[destinoId];
  if (!destino) return null;

  var despachos = facts.despachos
    .filter(function (d) {
      return d.destinos.some(function (x) { return x.destinoId === destinoId; });
    })
    .map(function (d) {
      var relacion = d.destinos.filter(function (x) { return x.destinoId === destinoId; })[0];
      return {
        id: d.id,
        fecha: d.fecha,
        origenId: d.origenId,
        canal: d.canal,
        familias: d.familias,
        unidades: d.unidades,
        categoriaPrincipal: d.categoriaNombre,
        detallePropio: d.detallePropio,
        esDestinoPrincipal: relacion ? relacion.esPrincipal : null,
        confianzaDestino: relacion ? relacion.confianza : null,
        poblaciones: d.poblaciones.map(function (p) { return p.nombre; }),
        documento: d.documento,
        observaciones: d.observaciones,
      };
    })
    .sort(function (a, b) { return (a.fecha || '').localeCompare(b.fecha || ''); });

  return {
    destinoId: destinoId,
    despachos: despachos,
    fuente: 'DESPACHOS',
    disclaimer: 'Registro logístico por despacho. Las unidades aquí (cuando existen) son un subconjunto y no deben sumarse contra el resumen por categoría.',
  };
}