/**
 * Necesidades.gs
 * -----------------------------------------------------------------------
 * GET ?route=necesidades
 *
 * Alimenta la sección "¿Qué hace falta hoy?" desde la hoja
 * NECESIDADES_ACOPIO, que es el inventario del centro de acopio pasado a
 * limpio desde el papel «Elementos que necesitamos».
 *
 * PASOS PARA INSTALARLO
 *
 * 1. En Config.gs, dentro de CONFIG.SHEETS, agregar:
 *
 *        NECESIDADES_ACOPIO: 'NECESIDADES_ACOPIO',
 *
 * 2. Pegar este archivo como uno nuevo en el proyecto de Apps Script.
 *
 * 3. En Code.gs, dentro del switch de doGet, antes de default:
 *
 *        case 'necesidades':
 *          return jsonResponse_(withCache_('necesidades', buildNecesidades_));
 *
 * 4. Republicar con Nueva versión. La URL /exec sirve la versión
 *    desplegada, no el código del editor.
 *
 * POR QUÉ ESTO NO PUEDE QUEDAR ESCRITO A MANO EN EL FRONTEND
 *
 * Es lo único del tablero que caduca en horas. Todo lo demás cuenta lo
 * que ya pasó; esto dice qué falta AHORA, y una lista vieja no es un dato
 * impreciso: es una lista que manda a la gente a donar lo que ya sobra.
 * Por eso viaja con su `fechaInventario`, para que la página pueda decir
 * de cuándo es lo que está mostrando.
 *
 * SOBRE EL NIVEL Y LA PRIORIDAD
 *
 * La hoja trae las dos, y son la misma escala vista al derecho y al
 * revés: `nivel` es cuánto hay en bodega (0 nada, 1 poco, 3 bastante) y
 * `prioridad` es qué tan urgente es reponerlo. Se exponen las dos porque
 * `nivel` sirve para ordenar y `prioridad` para etiquetar, y derivar una
 * de la otra en el frontend sería repetir una regla que ya está en el
 * Excel.
 *
 * Las filas sin anotación quedan en prioridad SIN DATO y nivel null. No
 * se convierten en cero: "no se anotó" y "no hay nada" son cosas
 * distintas, y confundirlas pondría como urgente algo que nadie revisó.
 * -----------------------------------------------------------------------
 */

/**
 * Orden de lectura de las secciones. Las que no figuren acá van después,
 * alfabéticamente, así que agregar una sección nueva en el Excel no
 * rompe nada: aparece igual, solo que al final.
 */
var ORDEN_SECCIONES = [
  'ALIMENTOS Y NO PERECEDEROS',
  'ASEO PERSONAL',
  'DORMIR Y ABRIGO',
  'OTROS ELEMENTOS',
];

function buildNecesidades_() {
  var filas = getSheet_(CONFIG.SHEETS.NECESIDADES_ACOPIO).filter(function (f) {
    // Solo lo vigente. La hoja conserva el histórico de inventarios, y
    // publicar una necesidad de la semana pasada es peor que no publicar
    // ninguna.
    return normalizeText_(f.vigente) === 'SI';
  });

  var fechaInventario = null;
  var porSeccion = {};

  filas.forEach(function (f) {
    var seccion = String(f.seccion || '').trim();
    if (!seccion) return;

    var fecha = toIsoDateOrNull_(f.fecha_inventario);
    if (fecha && (fechaInventario === null || fecha > fechaInventario)) {
      fechaInventario = fecha;
    }

    if (!porSeccion[seccion]) {
      porSeccion[seccion] = { nombre: seccion, elementos: [] };
    }

    porSeccion[seccion].elementos.push({
      nombre: String(f.elemento || '').trim(),
      // Lo que decía el papel, tal cual: NADA, POCO, POCAS, BASTANTE.
      existencia: f.existencia_en_bodega ? String(f.existencia_en_bodega).trim() : null,
      // null y no 0 cuando no se anotó: "no se revisó" no es "no hay".
      nivel: toNumberOrNull_(f.nivel),
      prioridad: String(f.prioridad || 'SIN DATO').trim(),
      categoriaBase: f.categoria_base ? String(f.categoria_base).trim() : null,
      observacion: f.observacion ? String(f.observacion).trim() : null,
    });
  });

  var secciones = Object.keys(porSeccion)
    .map(function (nombre) {
      var s = porSeccion[nombre];

      // Primero lo que no hay, después lo escaso, al final lo cubierto.
      // Dentro de cada nivel, alfabético, para que la lista no se
      // reordene sola entre dos cargas con los mismos datos.
      s.elementos.sort(function (a, b) {
        var na = a.nivel === null ? 99 : a.nivel;
        var nb = b.nivel === null ? 99 : b.nivel;
        if (na !== nb) return na - nb;
        return a.nombre.localeCompare(b.nombre, 'es');
      });

      var urgentes = 0;
      s.elementos.forEach(function (e) {
        if (e.nivel === 0) urgentes += 1;
      });

      return {
        nombre: s.nombre,
        elementos: s.elementos,
        total: s.elementos.length,
        // Lo que la tarjeta necesita para avisar sin abrirse.
        urgentes: urgentes,
      };
    })
    .sort(function (a, b) {
      var ia = ORDEN_SECCIONES.indexOf(normalizeText_(a.nombre));
      var ib = ORDEN_SECCIONES.indexOf(normalizeText_(b.nombre));
      if (ia === -1 && ib === -1) return a.nombre.localeCompare(b.nombre, 'es');
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

  var totalUrgentes = 0;
  secciones.forEach(function (s) { totalUrgentes += s.urgentes; });

  return {
    fechaInventario: fechaInventario,
    secciones: secciones,
    totalElementos: filas.length,
    totalUrgentes: totalUrgentes,
    fuente: 'NECESIDADES_ACOPIO',
    disclaimer:
      'Inventario del centro de acopio en la fecha indicada. Es lo único del ' +
      'tablero que cambia día a día: conviene confirmarlo antes de organizar una donación.',
  };
}