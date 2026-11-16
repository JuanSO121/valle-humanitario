/**
 * CacheLayer.gs
 * -----------------------------------------------------------------------
 * Caché por ruta, versionada en ScriptProperties.
 *
 * OPTIMIZACIONES
 *
 * 1. Sin límite de 100 KB. Antes, cache.put fallaba en silencio para
 *    las respuestas grandes (meta con todas sus advertencias, flujos,
 *    ayuda) y esas rutas se recalculaban en CADA petición. Ahora el
 *    texto se comprime con gzip (el JSON baja típicamente a una décima
 *    parte) y, si aún no cabe, se parte en trozos.
 *
 * 2. Se devuelve TEXTO. Nada de JSON.parse para volver a hacer
 *    JSON.stringify en jsonResponse_.
 *
 * 3. Sin estampida. Si la caché está vacía y llegan seis peticiones a la
 *    vez, antes eran seis ejecuciones leyendo el Excel completo. Ahora la
 *    primera toma un lock y arma TODAS las rutas de una sola lectura; las
 *    demás esperan y leen de la caché.
 *
 * Invalidar sigue siendo subir el número de versión (limpiarCache), pero
 * lo normal ya no es eso: ver Precalentar.gs, que construye la versión
 * nueva completa ANTES de publicarla.
 * -----------------------------------------------------------------------
 */

var CACHE_VERSION_PROP = 'CACHE_VERSION';
var CACHE_TROZO = 90000; // caracteres por entrada, bajo el tope de 100 KB
var CACHE_MARCA_COMPLETA = '__completa';

var _cacheVersion_ = null;
var _tengoLock_ = false;

function cacheVersion_() {
  if (_cacheVersion_ !== null) return _cacheVersion_;

  var props = PropertiesService.getScriptProperties();
  var valor = props.getProperty(CACHE_VERSION_PROP);
  if (!valor) {
    valor = '1';
    props.setProperty(CACHE_VERSION_PROP, valor);
  }
  _cacheVersion_ = valor;
  return valor;
}

function claveConVersion_(version, routeKey) {
  return CONFIG.CACHE.NAMESPACE + '::v' + version + '::' + routeKey;
}

function cacheKey_(routeKey) {
  return claveConVersion_(cacheVersion_(), routeKey);
}

// --- compresión ---------------------------------------------------------

function comprimir_(texto) {
  var blob = Utilities.newBlob(texto, 'application/json', 'r.json');
  return Utilities.base64Encode(Utilities.gzip(blob).getBytes());
}

function descomprimir_(b64) {
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'application/x-gzip', 'r.gz');
  return Utilities.ungzip(blob).getDataAsString('UTF-8');
}

/**
 * Agrega a `destino` las entradas de caché de un texto.
 *
 *   "gz0:<datos>"  cabe en una entrada: se lee con un solo get.
 *   "gzN:<n>"      partido en n trozos, en clave#0 ... clave#n-1.
 *
 * Los trozos se agregan ANTES que la cabecera: putAll respeta el orden,
 * así que nadie ve una cabecera que apunte a trozos que no existen aún.
 */
function agregarEntradas_(destino, clave, texto) {
  var z = comprimir_(texto);

  if (z.length <= CACHE_TROZO) {
    destino[clave] = 'gz0:' + z;
    return;
  }

  var n = Math.ceil(z.length / CACHE_TROZO);
  for (var i = 0; i < n; i++) {
    destino[clave + '#' + i] = z.substring(i * CACHE_TROZO, (i + 1) * CACHE_TROZO);
  }
  destino[clave] = 'gzN:' + n;
}

/** putAll en lotes, para no mandar un solo request gigante. */
function guardarEntradas_(cache, entradas) {
  var lote = {};
  var tam = 0;
  var cuenta = 0;
  var ttl = CONFIG.CACHE.TTL_SECONDS;

  Object.keys(entradas).forEach(function (k) {
    lote[k] = entradas[k];
    tam += entradas[k].length;
    cuenta += 1;
    if (cuenta >= 200 || tam >= 2000000) {
      cache.putAll(lote, ttl);
      lote = {};
      tam = 0;
      cuenta = 0;
    }
  });

  if (cuenta > 0) cache.putAll(lote, ttl);
}

function guardarTexto_(cache, clave, texto) {
  try {
    var entradas = {};
    agregarEntradas_(entradas, clave, texto);
    guardarEntradas_(cache, entradas);
  } catch (e) {
    Logger.log('No se pudo cachear ' + clave + ': ' + e);
  }
}

/** Devuelve el texto guardado, o null si falta cualquier parte. */
function leerTexto_(cache, clave) {
  var cabecera = cache.get(clave);
  if (cabecera === null) return null;

  try {
    if (cabecera.indexOf('gz0:') === 0) {
      return descomprimir_(cabecera.substring(4));
    }

    if (cabecera.indexOf('gzN:') === 0) {
      var n = Number(cabecera.substring(4));
      var claves = [];
      for (var i = 0; i < n; i++) claves.push(clave + '#' + i);

      var trozos = cache.getAll(claves);
      var partes = [];
      for (var j = 0; j < n; j++) {
        var t = trozos[claves[j]];
        if (t === undefined || t === null) return null;
        partes.push(t);
      }
      return descomprimir_(partes.join(''));
    }
  } catch (e) {
    Logger.log('Entrada de caché ilegible en ' + clave + ': ' + e);
  }

  // Formato viejo o corrupto: se trata como ausente.
  return null;
}

// --- API pública --------------------------------------------------------

/**
 * Devuelve el JSON de una ruta como TEXTO.
 *
 * computeFn puede devolver un objeto, un texto ya serializado o null
 * (destino inexistente). El null también se cachea, como "null", para
 * que un id inválido repetido no vuelva a cargar el Excel.
 */
function withCacheTexto_(routeKey, computeFn) {
  var cache = CacheService.getScriptCache();
  var clave = cacheKey_(routeKey);

  var texto = leerTexto_(cache, clave);
  if (texto !== null) return texto;

  var lock = null;
  if (!_tengoLock_) {
    lock = LockService.getScriptLock();
    try {
      _tengoLock_ = lock.tryLock(30000);
    } catch (e) {
      _tengoLock_ = false;
    }
    if (!_tengoLock_) lock = null;
  }

  try {
    if (lock) {
      // Otra ejecución pudo haberla llenado mientras se esperaba el lock.
      texto = leerTexto_(cache, clave);
      if (texto !== null) return texto;

      // Si la versión entera está vacía, se arma todo de una lectura.
      // Si ya estaba completa (por ejemplo, un id nuevo de destino), se
      // calcula solo lo pedido.
      if (cache.get(cacheKey_(CACHE_MARCA_COMPLETA)) === null) {
        try {
          var todas = llenarVersion_(cacheVersion_());
          if (Object.prototype.hasOwnProperty.call(todas, routeKey)) return todas[routeKey];
        } catch (err) {
          Logger.log('Llenado completo falló, se calcula solo ' + routeKey + ': ' + err);
        }
      }
    }

    var valor = computeFn();
    texto = valor === null || valor === undefined
      ? 'null'
      : (typeof valor === 'string' ? valor : JSON.stringify(valor));

    guardarTexto_(cache, clave, texto);
    return texto;
  } finally {
    if (lock) {
      lock.releaseLock();
      _tengoLock_ = false;
    }
  }
}

/** Compatibilidad con código que espera un objeto. */
function withCache_(routeKey, computeFn) {
  return JSON.parse(withCacheTexto_(routeKey, computeFn));
}

/**
 * Invalida todo AL INSTANTE. La siguiente visita arma la caché de cero.
 * Para actualizar sin ese costo, usar precalentarAhora().
 */
function limpiarCache() {
  var props = PropertiesService.getScriptProperties();
  var actual = Number(props.getProperty(CACHE_VERSION_PROP) || '1');
  var nueva = String(actual + 1);

  props.setProperty(CACHE_VERSION_PROP, nueva);
  _cacheVersion_ = nueva;

  Logger.log('Cache invalidada. Versión nueva: v' + nueva);
  return nueva;
}