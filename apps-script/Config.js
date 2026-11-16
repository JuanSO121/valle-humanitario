/**
 * Config.gs
 * -----------------------------------------------------------------------
 * Única fuente de verdad para nombres de hojas, reglas de clasificación y
 * constantes del dominio. Si alguien renombra una hoja o una regla
 * cambia, este es el único archivo que debería tocarse.
 * -----------------------------------------------------------------------
 */

var CONFIG = {
  SHEETS: {
    // Una hoja por fuente: los despachos (libro oficial), los contratos y
    // la plantilla «Qué hace falta» (cada una en su libro, con su equipo).
    DESPACHOS: 'DESPACHOS',
    // Reglas de clasificación, en el mismo libro que DESPACHOS.
    DESTINOS: 'DESTINOS',
    FAMILIAS: 'FAMILIAS',
    CONTRATACION: 'CONTRATACION',
    FALTANTES: 'QUE_HACE_FALTA',
    TOTALES: 'TOTALES',
    NUEVOS: 'NUEVOS_DESPACHOS',
    ESTIMADO: 'ESTIMADO_ANTERIOR',
  },

  // Los días del 11 al 24 de agosto vienen del Excel anterior solo con fecha y
  // destino. Mientras se completan sus pesos reales, el tablero muestra la cifra
  // ESTIMADA por día que ese Excel calculó (hoja ESTIMADO_ANTERIOR), marcada como
  // estimada. A medida que un despacho recibe su peso real, la parte estimada se
  // cambia por el peso real. Poner en false para no mostrar nada estimado.
  MOSTRAR_ESTIMADO_PROVISIONAL: true,

  // Libro de despachos. El id se configura en la propiedad del script
  // LIBRO_OFICIAL_ID (ver Sheetservice.js): es el libro que se sube a
  // Google Drive. No hay id por defecto a propósito: un id escrito acá
  // apuntaría a un libro que ya no es el vigente.

  // Las 7 categorías del tablero, en el orden en que se muestran. La hoja
  // FAMILIAS asigna cada familia a una de estas, o a «Fuera de categoría»
  // (juguetería, kits escolares, otros: cuentan en el total pero no en las
  // 7). Una familia que no esté en FAMILIAS queda «sin categoría» y se avisa.
  CATEGORIAS: [
    'Alimentos',
    'Protección y seguridad',
    'Kit de aseo',
    'Descanso y abrigo',
    'Mascotas',
    'Ropa y calzado',
    'Menaje y utensilios',
  ],
  FUERA_DE_CATEGORIA: 'Fuera de categoría',

  CACHE: {
    // CacheService tiene un tope duro de 6h (21600s) por entrada.
    TTL_SECONDS: 21600,
    NAMESPACE: 'tablero_v2',
  },
};
