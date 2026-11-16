/**
 * Catalogo42.gs
 * -----------------------------------------------------------------------
 * Los 42 municipios del Valle del Cauca, Cali incluida: nombre, código
 * DANE, zona y coordenadas.
 *
 * POR QUÉ ES UN ARCHIVO DE CÓDIGO Y NO UNA HOJA
 *
 * Los municipios no cambian entre cortes, y una hoja editable es una
 * hoja que alguien puede dañar. Zonas: Norte 18, Centro 14, Sur 8 (con
 * Cali) y Pacífico 2.
 *
 * El tablero identifica cada municipio por su código DANE: la hoja
 * DESPACHOS lo trae en la columna `municipio_dane`. Las reglas con las que
 * se decide a qué municipio pertenece un destino escrito a mano viven en
 * migracion/Reglas.js y se aplican al cargar datos, no al publicarlos.
 * -----------------------------------------------------------------------
 */

var MUNICIPIOS_ = [
  { id: 'M001', codigoDane: '76020', nombre: 'Alcalá', zona: 'Norte', latitud: 4.67835, longitud: -75.78241 },
  { id: 'M002', codigoDane: '76036', nombre: 'Andalucía', zona: 'Centro', latitud: 4.14491, longitud: -76.16447 },
  { id: 'M003', codigoDane: '76041', nombre: 'Ansermanuevo', zona: 'Norte', latitud: 4.79617, longitud: -76.0299 },
  { id: 'M004', codigoDane: '76054', nombre: 'Argelia', zona: 'Norte', latitud: 4.70453, longitud: -76.14191 },
  { id: 'M005', codigoDane: '76100', nombre: 'Bolívar', zona: 'Norte', latitud: 4.3636, longitud: -76.36518 },
  { id: 'M006', codigoDane: '76109', nombre: 'Buenaventura', zona: 'Pacífico', latitud: 3.61076, longitud: -77.08581 },
  { id: 'M007', codigoDane: '76113', nombre: 'Bugalagrande', zona: 'Centro', latitud: 4.19709, longitud: -76.08982 },
  { id: 'M008', codigoDane: '76122', nombre: 'Caicedonia', zona: 'Norte', latitud: 4.30867, longitud: -75.83685 },
  { id: 'M009', codigoDane: '76126', nombre: 'Calima - El Darién', zona: 'Centro', latitud: 3.94451, longitud: -76.62836 },
  { id: 'M010', codigoDane: '76130', nombre: 'Candelaria', zona: 'Sur', latitud: 3.38237, longitud: -76.38347 },
  { id: 'M011', codigoDane: '76147', nombre: 'Cartago', zona: 'Norte', latitud: 4.70655, longitud: -75.91799 },
  { id: 'M012', codigoDane: '76233', nombre: 'Dagua', zona: 'Pacífico', latitud: 3.65017, longitud: -76.72059 },
  { id: 'M013', codigoDane: '76246', nombre: 'El Cairo', zona: 'Norte', latitud: 4.75661, longitud: -76.21465 },
  { id: 'M014', codigoDane: '76248', nombre: 'El Cerrito', zona: 'Centro', latitud: 3.67605, longitud: -76.20953 },
  { id: 'M015', codigoDane: '76250', nombre: 'El Dovio', zona: 'Norte', latitud: 4.53169, longitud: -76.28522 },
  { id: 'M016', codigoDane: '76243', nombre: 'El Águila', zona: 'Norte', latitud: 4.91737, longitud: -76.06616 },
  { id: 'M017', codigoDane: '76275', nombre: 'Florida', zona: 'Sur', latitud: 3.30397, longitud: -76.16574 },
  { id: 'M018', codigoDane: '76306', nombre: 'Ginebra', zona: 'Centro', latitud: 3.74405, longitud: -76.19106 },
  { id: 'M019', codigoDane: '76318', nombre: 'Guacarí', zona: 'Centro', latitud: 3.78388, longitud: -76.29459 },
  { id: 'M020', codigoDane: '76111', nombre: 'Guadalajara de Buga', zona: 'Centro', latitud: 3.85481, longitud: -76.10567 },
  { id: 'M021', codigoDane: '76364', nombre: 'Jamundí', zona: 'Sur', latitud: 3.2132, longitud: -76.62855 },
  { id: 'M022', codigoDane: '76377', nombre: 'La Cumbre', zona: 'Sur', latitud: 3.69431, longitud: -76.59018 },
  { id: 'M023', codigoDane: '76400', nombre: 'La Unión', zona: 'Norte', latitud: 4.53778, longitud: -76.1035 },
  { id: 'M024', codigoDane: '76403', nombre: 'La Victoria', zona: 'Norte', latitud: 4.48356, longitud: -75.9671 },
  { id: 'M025', codigoDane: '76497', nombre: 'Obando', zona: 'Norte', latitud: 4.59769, longitud: -75.94967 },
  { id: 'M026', codigoDane: '76520', nombre: 'Palmira', zona: 'Sur', latitud: 3.55857, longitud: -76.22771 },
  { id: 'M027', codigoDane: '76563', nombre: 'Pradera', zona: 'Sur', latitud: 3.42075, longitud: -76.17851 },
  { id: 'M028', codigoDane: '76606', nombre: 'Restrepo', zona: 'Centro', latitud: 3.80598, longitud: -76.53528 },
  { id: 'M029', codigoDane: '76616', nombre: 'Riofrío', zona: 'Centro', latitud: 4.10968, longitud: -76.37085 },
  { id: 'M030', codigoDane: '76622', nombre: 'Roldanillo', zona: 'Norte', latitud: 4.44332, longitud: -76.16853 },
  { id: 'M031', codigoDane: '76670', nombre: 'San Pedro', zona: 'Centro', latitud: 3.9817, longitud: -76.20694 },
  { id: 'M032', codigoDane: '76001', nombre: 'Santiago de Cali', zona: 'Sur', latitud: 3.39774, longitud: -76.57554 },
  { id: 'M033', codigoDane: '76736', nombre: 'Sevilla', zona: 'Norte', latitud: 4.19258, longitud: -75.88803 },
  { id: 'M034', codigoDane: '76823', nombre: 'Toro', zona: 'Norte', latitud: 4.63835, longitud: -76.08153 },
  { id: 'M035', codigoDane: '76828', nombre: 'Trujillo', zona: 'Centro', latitud: 4.2333, longitud: -76.34299 },
  { id: 'M036', codigoDane: '76834', nombre: 'Tuluá', zona: 'Centro', latitud: 4.02843, longitud: -76.03177 },
  { id: 'M037', codigoDane: '76845', nombre: 'Ulloa', zona: 'Norte', latitud: 4.70724, longitud: -75.77769 },
  { id: 'M038', codigoDane: '76863', nombre: 'Versalles', zona: 'Norte', latitud: 4.61983, longitud: -76.22962 },
  { id: 'M039', codigoDane: '76869', nombre: 'Vijes', zona: 'Centro', latitud: 3.74373, longitud: -76.47102 },
  { id: 'M040', codigoDane: '76890', nombre: 'Yotoco', zona: 'Centro', latitud: 3.90457, longitud: -76.39083 },
  { id: 'M041', codigoDane: '76892', nombre: 'Yumbo', zona: 'Sur', latitud: 3.59607, longitud: -76.51081 },
  { id: 'M042', codigoDane: '76895', nombre: 'Zarzal', zona: 'Norte', latitud: 4.35363, longitud: -76.05078 },
];

var _catalogo42_ = null;

/** Índices por id y por código DANE. Se arma una vez por ejecución. */
function catalogo42_() {
  if (_catalogo42_ !== null) return _catalogo42_;

  var porDane = Object.create(null);
  MUNICIPIOS_.forEach(function (m) { porDane[m.codigoDane] = m; });

  _catalogo42_ = { municipios: MUNICIPIOS_, porDane: porDane };
  return _catalogo42_;
}
