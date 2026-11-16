/**
 * Catalogs.gs
 * -----------------------------------------------------------------------
 * Carga las hojas CAT_* y BD_DOCUMENTOS, y arma los índices que el resto
 * del sistema necesita para resolver joins por nombre (las columnas *_id
 * de las tablas de hecho vienen vacías en el Excel de origen).
 * -----------------------------------------------------------------------
 */

/**
 * @return {{
 *   municipiosById: Object,
 *   destinosById: Object,
 *   destinosByNombreNorm: Object,
 *   categoriasById: Object,
 *   categoriasByNombreNorm: Object,
 *   poblacionesById: Object,
 *   poblacionesByNombreNorm: Object,
 *   documentosByDriveId: Object,
 *   documentosByNombreNorm: Object,
 *   raw: { municipios, destinos, categorias, poblaciones, documentos }
 * }}
 */
function loadCatalogs_() {
  var municipiosRaw = getSheet_(CONFIG.SHEETS.CAT_MUNICIPIOS)
    .filter(function (m) { return normalizeText_(m.activo) !== 'NO'; });

  var destinosRaw = getSheet_(CONFIG.SHEETS.CAT_DESTINOS)
    .filter(function (d) { return normalizeText_(d.activo) !== 'NO'; });

  var categoriasRaw = getSheet_(CONFIG.SHEETS.CAT_CATEGORIAS)
    .filter(function (c) { return normalizeText_(c.activo) !== 'NO'; });

  var poblacionesRaw = getSheet_(CONFIG.SHEETS.CAT_POBLACIONES)
    .filter(function (p) { return normalizeText_(p.activo) !== 'NO'; });

  var documentosRaw = getSheet_(CONFIG.SHEETS.BD_DOCUMENTOS);

  var municipiosById = indexBy_(municipiosRaw, function (m) { return m.municipio_id; });

  var destinos = destinosRaw.map(function (d) {
    var municipio = d.municipio_id ? municipiosById[d.municipio_id] : null;
    return {
      id: d.destino_id,
      nombre: d.nombre,
      tipo: d.tipo_destino,
      municipioId: d.municipio_id || null,
      // Coordenada resuelta: solo existe si el destino está atado a un
      // municipio real (la mayoría) o es el centro de acopio de Cartago
      // (también atado a un municipio, ver CONFIG). Los tipos
      // "departamento_externo", "centro_proteccion", "entidad",
      // "especial" y "agregado_multiple" NO tienen municipio_id en el
      // catálogo de origen: quedan sin coordenada a propósito, en vez de
      // inventar una. El frontend debe tratarlos como "sin ubicar en
      // el mapa" y mostrarlos solo en listados.
      latitud: municipio ? municipio.latitud : null,
      longitud: municipio ? municipio.longitud : null,
      precision: municipio ? 'MUNICIPIO' : 'SIN_UBICAR',
      municipioNombre: municipio ? municipio.nombre : null,
    };
  });

  var categorias = categoriasRaw.map(function (c) {
    return { id: c.categoria_id, nombre: c.nombre };
  });

  var poblaciones = poblacionesRaw.map(function (p) {
    return { id: p.poblacion_id, nombre: p.nombre };
  });

  var documentos = documentosRaw.map(function (doc) {
    return {
      id: doc.documento_id,
      nombreOriginal: doc.nombre_original,
      nombreNormalizado: doc.nombre_normalizado,
      driveId: doc.drive_id,
      tipo: doc.tipo_documento,
      carpeta: doc.carpeta_drive,
      bytes: doc.bytes,
    };
  });

  return {
    municipiosById: municipiosById,

    destinosById: indexBy_(destinos, function (d) { return d.id; }),
    destinosByNombreNorm: indexBy_(destinos, function (d) { return normalizeText_(d.nombre); }),

    categoriasById: indexBy_(categorias, function (c) { return c.id; }),
    categoriasByNombreNorm: indexBy_(categorias, function (c) { return normalizeText_(c.nombre); }),

    poblacionesById: indexBy_(poblaciones, function (p) { return p.id; }),
    poblacionesByNombreNorm: indexBy_(poblaciones, function (p) { return normalizeText_(p.nombre); }),

    documentosByDriveId: indexBy_(documentos, function (d) { return d.driveId; }),
    documentosByNombreNorm: indexBy_(documentos, function (d) { return normalizeText_(d.nombreNormalizado); }),

    raw: {
      municipios: municipiosRaw,
      destinos: destinos,
      categorias: categorias,
      poblaciones: poblaciones,
      documentos: documentos,
    },
  };
}