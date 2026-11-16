/**
 * Reglas.gs  (MIGRACIÓN: no se pega en el proyecto de producción)
 * -----------------------------------------------------------------------
 * Cómo se clasifica un destino escrito a mano en el consolidado de
 * despachos. Estas reglas se aplicaron UNA vez para generar la hoja plana
 * DESPACHOS (columnas tipo_destino, municipio_dane, categoria) y son las
 * mismas que sigue la sesión de Claude que carga datos nuevos (ver
 * docs/03). El backend de producción NO las usa: lee el resultado ya
 * escrito en la hoja, donde cualquiera puede revisarlo y corregirlo en
 * DESTINOS.
 *
 * Se mantienen en el repositorio para poder regenerar el libro y para que
 * una regla nueva se pruebe contra los datos reales antes de aplicarla.
 *
 * LA REGLA DE DESTINOS, en orden
 *
 *   1. nombre completo o alias («Cali», «Calima-Darién», «Buga»)
 *   2. varios municipios en el mismo texto («Trujillo y Sevilla»,
 *      «Sevilla - Caicedonia»): tipo `multiple`, «municipios múltiples».
 *      La ayuda atendió a varios sin decir cuánto recibió cada uno:
 *      repartirla, o dársela al primero, sería inventar.
 *   3. traslado: puntos logísticos a donde se envía ayuda para repartirla
 *      después (centros de acopio, CAP, PMU). Cuentan en el total pero no
 *      son una entrega a la población ni «otras ayudas»: contarlos como
 *      una u otra puede duplicar lo que luego sale de ahí.
 *   4. «<Municipio> – <algo>»: cuenta al municipio, salvo que el algo sea
 *      una entidad (fundación, Ejército, Defensa Civil, colegio…).
 *      Alcaldías, corregimientos, veredas y barrios cuentan al municipio.
 *   5. todo lo demás va a Otras y se lista para corregirlo en el Excel.
 *      Nunca se adivina un municipio.
 * -----------------------------------------------------------------------
 */

var REGLAS = {
  // Escrituras de un municipio que el Excel usa y no son su nombre oficial.
  ALIAS_MUNICIPIO: {
    'CALI': 'Santiago de Cali',
    'CALIMA': 'Calima - El Darién',
    'CALIMA EL DARIEN': 'Calima - El Darién',
    'CALIMA DARIEN': 'Calima - El Darién',
    'CALIMA-DARIEN': 'Calima - El Darién',
    'BUGA': 'Guadalajara de Buga',
    'AGUILA': 'El Águila',
    // «Sevilla - Caicedoni»: el Excel corta el nombre y Caicedonia es el
    // único municipio que empieza así.
    'CAICEDONI': 'Caicedonia',
  },

  // Entidades: van a «Otras ayudas», aunque lleven el nombre de un municipio.
  ENTIDADES: [
    'FUNDACION', 'CORPORACION', 'ASOCIACION', 'FUNDAPROCES', 'FUNSOL', 'CORAVUNA',
    'DEFENSA CIVIL', 'EJERCITO', 'GOBERNACION', 'BOMBEROS',
    'BANCO DE ALIMENTOS', 'BENEFICENCIA', 'TELEPACIFICO', 'ARQUIDIOCESIS', 'ROTARY',
    'SECRETARIA', 'SUBSECRETARIA', 'ASUNTOS RELIGIOSOS', 'EVENTO', 'BIENESTAR',
    'PROTECCION', 'ANCIANATO', 'ANCIANOS', 'HOGAR', 'BIBLIOTECA', 'RIESGO',
    'COLEGIO', 'ESCUELA', 'INSTITUCION', 'I E',
    'SAN VICENTE DE PAUL', 'GOBERNADORA', 'AGE',
  ],

  // Puntos logísticos: ver la regla 3. PENDIENTE de la Gobernación: confirmar
  // que son puntos de reparto y si lo que sale de ellos ya está en el
  // consolidado como despacho a municipios (duplicación).
  TRASLADOS: ['CENTRO DE ACOPIO', 'CAP', 'PMU', 'ORIUAC'],

  // Familia del Excel oficial -> categoría (una de CONFIG.CATEGORIAS).
  FAMILIA_CATEGORIA: {
    'Mercados y kits de alimentos': 'Alimentos',
    'Alimentos y víveres': 'Alimentos',
    'Agua y bebidas': 'Alimentos',
    'Salud, medicamentos y bioseguridad': 'Protección y seguridad',
    // 19 t, la cuarta familia en peso: revisar que no traiga cosas ajenas
    // a la protección.
    'Logística, ferretería y herramientas': 'Protección y seguridad',
    'Kits de aseo e higiene (kits completos)': 'Kit de aseo',
    'Higiene personal y primera infancia': 'Kit de aseo',
    'Aseo del hogar y limpieza': 'Kit de aseo',
    'Papel higiénico, cocina y celulosa': 'Kit de aseo',
    'Carpas, toldos y lonas': 'Descanso y abrigo',
    'Colchonetas, cobijas y descanso': 'Descanso y abrigo',
    // El nombre engaña: es de mascotas, no de alimentos.
    'Alimentos y elementos para mascotas': 'Mascotas',
    'Ropa y calzado': 'Ropa y calzado',
    'Menaje y elementos de cocina': 'Menaje y utensilios',
    'Energía, iluminación y agua potable': 'Menaje y utensilios',
  },
  // Cuentan en el total pero no en las 7 categorías.
  FAMILIAS_FUERA_DE_CATEGORIA: ['Juguetería y recreación', 'Kits escolares y estudiantiles', 'Otros elementos'],
};

var _porNombreReglas_ = null;

function indiceMunicipiosPorNombre_() {
  if (_porNombreReglas_ !== null) return _porNombreReglas_;
  var idx = Object.create(null);
  catalogo42_().municipios.forEach(function (m) { idx[normalizeText_(m.nombre)] = m; });
  Object.keys(REGLAS.ALIAS_MUNICIPIO).forEach(function (k) {
    var m = idx[normalizeText_(REGLAS.ALIAS_MUNICIPIO[k])];
    if (m) idx[normalizeText_(k)] = m;
  });
  _porNombreReglas_ = idx;
  return idx;
}

function buscarMunicipio_(texto) {
  var k = normalizeText_(String(texto || '').replace(/\(.*$/, ''));
  return k ? indiceMunicipiosPorNombre_()[k] || null : null;
}

/** ¿El texto nombra una entidad y no un lugar? */
function esEntidad_(texto) {
  var k = ' ' + normalizeText_(texto).replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ';
  return REGLAS.ENTIDADES.some(function (palabra) {
    return k.indexOf(' ' + palabra + ' ') !== -1;
  });
}

function esTraslado_(texto) {
  var k = ' ' + normalizeText_(texto).replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ';
  return REGLAS.TRASLADOS.some(function (palabra) {
    return k.indexOf(' ' + palabra + ' ') !== -1;
  });
}

/**
 * @param {string} texto  «Municipio / destino» tal como está en el Excel
 * @return {{tipo: 'municipio'|'otra', municipio: Object|null,
 *           compartido: boolean, motivo: string}}
 */
function resolverDestino_(texto) {
  var t = String(texto || '').trim();
  var otra = function (motivo) { return { tipo: 'otra', municipio: null, compartido: false, motivo: motivo }; };
  var delMunicipio = function (m, compartido, motivo) {
    return { tipo: 'municipio', municipio: m, compartido: !!compartido, motivo: motivo };
  };
  if (!t) return otra('vacío');

  var completo = buscarMunicipio_(t);
  if (completo) return delMunicipio(completo, false, 'nombre');

  var partes = t.split(/\s+[–-]\s+/);

  // Varios municipios en un mismo texto.
  var trozos = t.split(/\s+[–-]\s+|\s*,\s*|\s+y\s+/i).map(function (p) { return buscarMunicipio_(p); });
  if (trozos.length >= 2 && trozos.every(Boolean)) {
    var ids = {};
    trozos.forEach(function (m) { ids[m.id] = true; });
    if (Object.keys(ids).length >= 2) {
      return { tipo: 'multiple', municipio: null, compartido: false, motivo: 'varios municipios' };
    }
  }

  // Puntos logísticos: ni municipio ni «otras ayudas». Ver la regla 3.
  if (esTraslado_(t)) return { tipo: 'traslado', municipio: null, compartido: false, motivo: 'punto logístico' };

  // «Fundación X – Buenaventura»: la entidad manda, no el lugar.
  if (esEntidad_(partes[0])) return otra('entidad');

  var base = buscarMunicipio_(partes[0]);
  if (base) {
    var resto = partes.slice(1).join(' ');
    if (resto && esEntidad_(resto)) return otra('entidad');
    return delMunicipio(base, false, partes.length > 1 ? 'prefijo' : 'nombre');
  }

  return otra(esEntidad_(t) ? 'entidad' : 'sin municipio');
}
