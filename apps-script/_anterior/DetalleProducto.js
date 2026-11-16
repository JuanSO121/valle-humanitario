/**
 * DetalleProducto.gs
 * -----------------------------------------------------------------------
 * Lee DETALLE_PRODUCTO, la hoja que faltaba: una fila por producto
 * entregado, con su destino, su categoría y su cantidad. 6.110 filas y
 * 1.923 productos distintos.
 *
 * QUÉ ARREGLA
 *
 * Dos cosas que hoy están mal publicadas.
 *
 * 1. EL TOTAL. El tablero muestra 96.360 unidades porque suma
 *    ENVIOS_CATEGORIA.unidades, y esa columna está rota: en 242 de 553
 *    pares destino-categoría no coincide con la suma real, y no por
 *    poco. Sevilla / Aseo personal dice 10 donde el detalle suma 9.764;
 *    Cartago / Líquidos dice 10 contra 9.526. Parece haberse cargado el
 *    conteo de renglones en vez de las unidades.
 *
 *    El total real es 256.263. Todos los porcentajes por categoría del
 *    tablero salen de la cifra equivocada, así que cambian todos.
 *
 * 2. LOS NOMBRES DE PRODUCTO. La lista de "Lo más entregado" venía de
 *    ayudaData.ts, escrita a mano, y contradecía al propio tablero en la
 *    misma pantalla: decía "Tapabocas 17.100" al lado de "Protección y
 *    seguridad: 11.167 unidades". Con esta hoja los nombres salen de la
 *    base y las dos cifras vuelven a ser la misma.
 *
 *    Dicho sea de paso: ayudaData.ts NUNCA estuvo desactualizado. Sus
 *    256.650 unidades y sus diez productos más entregados coinciden con
 *    DETALLE_PRODUCTO. Se creyó viejo y no lo era.
 *
 * PASOS PARA INSTALARLO
 *
 * 1. En Config.gs, dentro de CONFIG.SHEETS:
 *
 *        DETALLE_PRODUCTO: 'DETALLE_PRODUCTO',
 *
 * 2. En Config.gs, al mismo nivel que SHEETS, el mapa de alias de abajo
 *    (ver DESTINO_ALIAS).
 *
 * 3. Pegar este archivo como uno nuevo en el proyecto.
 *
 * 4. Reemplazar Facts.gs y Ayuda.gs por sus versiones nuevas.
 *
 * 5. limpiarCache() y republicar con Nueva versión.
 *
 * LOS DOS NOMBRES QUE NO CRUZAN
 *
 * DETALLE_PRODUCTO escribe dos destinos distinto que el resto del
 * archivo:
 *
 *     "Calima"                → "Calima - El Darién"
 *     "Municipios multiples"  → "Municipios múltiples (sin desagregar)"
 *
 * Son 12.592 unidades, el 5% del total. Sin resolverlos, esos productos
 * desaparecen del tablero en silencio, que es exactamente lo que ya pasó
 * tres veces en este proyecto: con el acopio de Cartago, con las otras
 * ayudas solidarias, y con las ilustraciones de la sección de acopio.
 *
 * Lo correcto es corregirlos en el Excel para que DETALLE_PRODUCTO use
 * los mismos nombres que CAT_DESTINOS. Mientras tanto, CONFIG.DESTINO_ALIAS
 * los cubre, y como el alias solo se consulta cuando falla la búsqueda
 * directa, corregir la hoja lo desactiva solo.
 * -----------------------------------------------------------------------
 */

/**
 * Resuelve el nombre de un destino contra el catálogo, primero por
 * nombre exacto normalizado y después por CONFIG.DESTINO_ALIAS.
 *
 * El orden importa: si mañana alguien arregla el nombre en la hoja, la
 * búsqueda directa gana y el alias queda inerte sin que nadie tenga que
 * acordarse de borrarlo.
 *
 * @return {{ destino: Object|null, alias: string|null }}
 */
function resolverDestinoPorNombre_(catalogs, valor) {
  var clave = normalizeText_(valor);
  if (!clave) return { destino: null, alias: null };

  var directo = catalogs.destinosByNombreNorm[clave];
  if (directo) return { destino: directo, alias: null };

  var nombreCatalogo = CONFIG.DESTINO_ALIAS ? CONFIG.DESTINO_ALIAS[clave] : null;
  if (nombreCatalogo) {
    var porAlias = catalogs.destinosByNombreNorm[normalizeText_(nombreCatalogo)];
    if (porAlias) return { destino: porAlias, alias: nombreCatalogo };
  }

  return { destino: null, alias: null };
}

/**
 * Índice del detalle por par destino-categoría.
 *
 * @return {{
 *   porClave: Object,   // "D001::C001" -> { unidades, productos: [{nombre, cantidad}] }
 *   porProducto: Object,// nombre -> cantidad total, para el ranking general
 *   totalUnidades: number,
 *   warnings: Array
 * }}
 */
function loadDetalleProducto_(catalogs) {
  var warnings = [];
  var porClave = {};
  var porProducto = {};
  var totalUnidades = 0;

  var filas = getSheet_(CONFIG.SHEETS.DETALLE_PRODUCTO);

  filas.forEach(function (f) {
    var resuelto = resolverDestinoPorNombre_(catalogs, f.destino);
    if (!resuelto.destino) {
      warnings.push({
        tipo: 'DETALLE_DESTINO_FUERA_DE_CATALOGO',
        valor: f.destino,
        fila: f.__row,
      });
      return;
    }

    var categoria = catalogs.categoriasByNombreNorm[normalizeText_(f.categoria)];
    if (!categoria) {
      warnings.push({
        tipo: 'DETALLE_CATEGORIA_FUERA_DE_CATALOGO',
        valor: f.categoria,
        fila: f.__row,
      });
      return;
    }

    var cantidad = toNumberOrNull_(f.cantidad);
    if (cantidad === null) {
      warnings.push({ tipo: 'DETALLE_SIN_CANTIDAD', valor: f.producto, fila: f.__row });
      return;
    }

    // El nombre que se publica es `producto`, la versión normalizada, y
    // no `item_como_esta_en_el_papel`. Esa última conserva la
    // transcripción literal —"Ptes pasta", "Papas y platanillas"— y sirve
    // para auditar contra el formato, no para leer en una página.
    var nombre = String(f.producto || '').trim();
    if (!nombre) {
      warnings.push({ tipo: 'DETALLE_SIN_PRODUCTO', fila: f.__row });
      return;
    }

    var clave = resuelto.destino.id + '::' + categoria.id;
    if (!porClave[clave]) porClave[clave] = { unidades: 0, productos: {} };

    porClave[clave].unidades += cantidad;
    porClave[clave].productos[nombre] = (porClave[clave].productos[nombre] || 0) + cantidad;

    porProducto[nombre] = (porProducto[nombre] || 0) + cantidad;
    totalUnidades += cantidad;
  });

  // Los productos de cada par pasan de mapa a lista ordenada, de mayor a
  // menor. Se ordena acá y no en el frontend para que todas las vistas
  // que lo consuman muestren el mismo orden sin repetir la regla.
  Object.keys(porClave).forEach(function (clave) {
    var entrada = porClave[clave];
    entrada.productos = Object.keys(entrada.productos)
      .map(function (nombre) {
        return { nombre: nombre, cantidad: entrada.productos[nombre] };
      })
      .sort(function (a, b) {
        return b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es');
      });
  });

  return {
    porClave: porClave,
    porProducto: porProducto,
    totalUnidades: totalUnidades,
    warnings: warnings,
  };
}