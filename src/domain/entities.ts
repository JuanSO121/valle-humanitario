/**
 * entities.ts
 * -----------------------------------------------------------------------
 * Refleja el contrato de API ya cerrado y probado contra el Excel real
 * (route=meta/origenes/municipios/categorias/flujos/destinos/destino/
 * destino-logistica/toneladas/ayuda/necesidades). No son las hojas del
 * Excel, son la forma que ya devuelve el backend. Si cambia una forma de
 * respuesta, este archivo es el único lugar que debería tocarse en el
 * dominio.
 * -----------------------------------------------------------------------
 */
export interface Origen {
  id: string; // "ORI-CALI" | "ORI-CARTAGO" | "ORI-EXTERNO"
  nombre: string;
  latitud: number | null;
  longitud: number | null;
  animable: boolean;
}
export interface Municipio {
  id: string;
  codigoDane: string;
  nombre: string;
  subregion: string;
  latitud: number;
  longitud: number;
}
export interface Categoria {
  id: string;
  nombre: string;
}
export interface DestinoRef {
  id: string;
  nombre: string;
  tipo: string;
  latitud: number | null;
  longitud: number | null;
}
/** Un punto por fecha dentro de un flujo, habilita el timeline. */
export interface FlujoFecha {
  fecha: string; // ISO yyyy-MM-dd
  despachosCount: number;
}
/**
 * Una fila de route=flujos: un par (origen, destino) con al menos un
 * despacho real. `despachosCount` es la única métrica que debe alimentar
 * grosor/intensidad del arco, nunca unidades de ENVIOS_CATEGORIA.
 */
export interface Flujo {
  origenId: string;
  destino: DestinoRef;
  despachosCount: number;
  primeraFecha: string | null;
  ultimaFecha: string | null;
  porFecha: FlujoFecha[];
}
export interface FlujoExcluido {
  despachoId: string;
  origenId: string;
  destinoId: string;
  motivo: "ORIGEN_SIN_COORDENADA" | "DESTINO_SIN_COORDENADA";
}
export interface FlujosResponse {
  flujos: Flujo[];
  excluidos: FlujoExcluido[];
}
/**
 * route=toneladas, hoja TONELADAS.
 *
 * Serie DEPARTAMENTAL: suma Cali, el centro de acopio de Cartago y las
 * otras ayudas solidarias, no solo lo municipal. No se puede dividir
 * contra el conteo de entregas por municipio que devuelve route=flujos.
 *
 * `dia` es el día del mes en dos dígitos, la misma llave que usa el
 * mapa. `acumulado` ya viene sumado desde el backend.
 */
export interface ToneladasPunto {
  dia: string;
  toneladas: number;
  acumulado: number;
}
export interface ToneladasResponse {
  serie: ToneladasPunto[];
  total: number;
  fuente: "TONELADAS";
  disclaimer: string;
}

/** Un artículo entregado, con su cantidad ya sumada. */
export interface ProductoEntregado {
  nombre: string;
  unidades: number;
}

/**
 * route=ayuda. Composición de lo entregado, grupos atendidos y canales.
 *
 * `destinos` cuenta destinos de cualquier tipo, incluidos acopios y
 * entidades. `municipios` cuenta solo municipios. Son distintos y por eso
 * van separados: decir que una categoría llegó a 44 municipios en un
 * departamento de 41 es lo que pasaba al usar el primero.
 *
 * DE DÓNDE SALEN LAS UNIDADES
 *
 * De DETALLE_PRODUCTO, una fila por artículo entregado. Antes salían de
 * ENVIOS_CATEGORIA.unidades, que está rota: en 242 de 553 pares
 * destino-categoría no coincidía con la suma real, y no por poco
 * —Sevilla / Aseo personal decía 10 donde el detalle suma 9.764—, así
 * que el tablero publicaba 96.360 unidades contra las 256.263 reales.
 *
 * ENVIOS_CATEGORIA sigue mandando en qué pares destino-categoría
 * existen y en `renglones`, pero la cantidad ya no.
 *
 * Once pares no tienen ninguna fila de detalle y conservan el valor de
 * la hoja: son 558 unidades, casi todas de Mascotas, y quedan
 * reportadas como UNIDADES_SIN_DETALLE en el diagnóstico.
 */
export interface CategoriaAyudaApi {
  id: string;
  nombre: string;
  unidades: number;
  renglones: number;
  porcentaje: number;
  destinos: number;
  municipios: number;
  /**
   * Nombres de los municipios que recibieron esta categoría. Permite que
   * al tocar una categoría el mapa resalte cuáles fueron, en vez de
   * mostrar solo un conteo.
   *
   * Opcional porque una implementación anterior del Web App puede no
   * traerlo, y eso no debe romper el tipado ni la sección.
   */
  municipiosNombres?: string[];
  /**
   * Los más entregados de esta categoría, de mayor a menor, recortados a
   * los doce primeros por el backend.
   *
   * Son la razón de existir de DETALLE_PRODUCTO. Antes esta lista vivía
   * escrita a mano en ayudaData.ts y contradecía al propio tablero en la
   * misma pantalla: "Tapabocas 17.100" al lado de "Protección y
   * seguridad: 11.167 unidades". Ahora los productos y las unidades
   * nacen del mismo sitio y no pueden volver a divergir.
   *
   * Opcional por la misma razón que `municipiosNombres`: un Web App
   * desplegado de antes no los trae.
   */
  productos?: ProductoEntregado[];
  /**
   * Cuántos artículos distintos tiene la categoría en total, ANTES del
   * recorte a doce.
   *
   * Sin este número, "12 de 12" y "12 de 102" se ven igual en la página,
   * y una lista parece completa cuando es la punta de otra mucho más
   * larga. Aseo personal tiene 102 productos distintos; Salud, tres.
   */
  productosDistintos?: number;
}
export interface PoblacionAtendida {
  nombre: string;
  /** Despachos que declaran esta población. Un despacho puede declarar varias. */
  despachos: number;
}
export interface CanalApi {
  /**
   * Id del GRUPO, no de un destino: "cali", "multiples" o
   * "otras-ayudas-solidarias". El agrupamiento lo decide el backend
   * según el tipo de destino, así que una entidad nueva en el Excel entra
   * sola sin tocar la página.
   */
  id: string;
  nombre: string;
  entregas: number;
  unidades: number;
  renglones: number;
  /** Cuántos destinos distintos cayeron en este grupo. */
  destinos: number;
  categorias: Array<{ nombre: string; unidades: number }>;
}
export interface AyudaResponse {
  totalUnidades: number;
  categorias: CategoriaAyudaApi[];
  /**
   * Los más entregados de toda la operación, para "Lo más entregado"
   * cuando no hay categoría elegida.
   *
   * Lo calcula el backend y NO se puede armar sumando las listas por
   * categoría: cada una viene recortada a sus doce primeros, así que el
   * resultado sería un ranking de los recortes.
   */
  productosDestacados?: ProductoEntregado[];
  poblaciones: PoblacionAtendida[];
  canales: CanalApi[];
  /**
   * La unión admite las dos porque el valor cambia con el despliegue:
   * "ENVIOS_CATEGORIA" es lo que devuelve un Web App anterior al cambio
   * de fuente, y sirve de señal de que las cifras que se están viendo
   * son las viejas.
   */
  fuente: "DETALLE_PRODUCTO" | "ENVIOS_CATEGORIA";
  disclaimer: string;
}
/** route=destinos, listado liviano para poblar el mapa. */
export interface DestinoResumenLista {
  id: string;
  nombre: string;
  tipo: string;
  latitud: number | null;
  longitud: number | null;
  /** Mismo origen que en route=ayuda: la suma de DETALLE_PRODUCTO. */
  totalUnidades: number;
  categoriasConEnvio: number;
}
/**
 * route=destino&id=, vista PRINCIPAL.
 *
 * Qué categorías tiene el destino lo dice ENVIOS_CATEGORIA; cuántas
 * unidades, DETALLE_PRODUCTO. Por eso `fuente` sigue diciendo
 * ENVIOS_CATEGORIA aunque las cantidades ya no salgan de ahí: nombra la
 * tabla que define las filas, no la que aporta los números.
 */
export interface CategoriaEntregada {
  id: string;
  nombre: string;
  unidades: number;
  porcentaje: number;
}
export interface DestinoResumen {
  destino: DestinoRef;
  resumen: {
    totalUnidades: number;
    categoriasConEnvio: number;
    fechaCorte: string | null;
  };
  categorias: CategoriaEntregada[];
  fuente: "ENVIOS_CATEGORIA";
  disclaimer: string;
}
/** route=destino-logistica&id=, vista SECUNDARIA, solo DESPACHOS. Nunca sumar contra DestinoResumen. */
export interface DespachoLogistico {
  id: string;
  fecha: string | null;
  origenId: string;
  canal: string | null;
  familias: number | null;
  unidades: number | null;
  categoriaPrincipal: string | null;
  detallePropio: boolean;
  esDestinoPrincipal: boolean | null;
  confianzaDestino: string | null;
  poblaciones: string[];
  documento: { id: string; nombre: string; driveUrl: string } | null;
  observaciones: string | null;
}
export interface DestinoLogistica {
  destinoId: string;
  despachos: DespachoLogistico[];
  fuente: "DESPACHOS";
  disclaimer: string;
}
export interface Meta {
  evento: string;
  entidad: string;
  fechaCorte: string | null;
  generadoEn: string;
  totales: {
    despachos: number;
    /**
     * Campos que agrega buildTotales_ (ver Toneladas.gs). Son opcionales
     * porque una implementación vieja del Web App todavía puede devolver
     * el bloque de totales anterior, y eso no debe romper el tipado.
     */
    despachosMunicipales?: number;
    municipiosAtendidos?: number;
    municipiosTotales?: number;
    ultimoDespacho?: string | null;
    /** Con el cambio de fuente pasa de 96.360 a 256.263. */
    unidadesEntregadas: number;
    destinosConEnvio: number;
    categorias: number;
    municipios: number;
  };
  validacion: { advertencias: number; detalle: unknown[] };
}
/**
 * route=necesidades, hoja NECESIDADES_ACOPIO.
 *
 * Es lo único del tablero que caduca en horas. Todo lo demás cuenta lo
 * que ya pasó; esto dice qué falta AHORA, y una lista vieja no es un dato
 * impreciso: es una lista que manda a la gente a donar lo que ya sobra.
 *
 * Por eso `fechaInventario` no es opcional en la práctica aunque el tipo
 * admita null: sin ella la página no puede decir de cuándo es lo que está
 * mostrando, y esa es justamente la información que decide si la lista
 * sirve o no.
 */
export interface ElementoNecesario {
  nombre: string;
  /** Lo que decía el papel, tal cual: NADA, POCO, POCAS, BASTANTE. */
  existencia: string | null;
  /**
   * Cuánto hay en bodega: 0 nada, 1 poco, 3 bastante.
   *
   * `null` cuando no se anotó. NO es cero: "no se revisó" y "no hay" son
   * cosas distintas, y confundirlas pondría como urgente algo que nadie
   * llegó a mirar. Por eso el orden de la lista trata el null como el
   * final de la escala y no como el principio.
   */
  nivel: number | null;
  /**
   * URGENTE · ALTA · CUBIERTO · SIN DATO.
   *
   * Es la misma escala que `nivel`, vista al revés: `nivel` dice cuánto
   * hay y `prioridad` dice qué tan urgente es reponerlo. Viajan las dos
   * porque una sirve para ordenar y la otra para etiquetar, y derivar una
   * de la otra en el frontend sería repetir una regla que ya vive en el
   * Excel.
   *
   * Va como `string` y no como unión cerrada a propósito: la escribe una
   * persona en una hoja de cálculo, así que un valor nuevo no debe
   * romper el tipado. El frontend cae a "SIN DATO" si no lo reconoce.
   */
  prioridad: string;
  /** La categoría de CAT_CATEGORIAS con la que se corresponde, si aplica. */
  categoriaBase: string | null;
  observacion: string | null;
}
export interface SeccionNecesidades {
  /**
   * El nombre tal como está en la hoja: "Alimentos y no perecederos",
   * "Aseo personal", "Dormir y abrigo", "Otros elementos".
   *
   * El frontend empareja su ilustración con este nombre normalizado,
   * porque el Excel no trae ningún id de sección. Si alguien renombra
   * una, la sección aparece igual pero sin ilustración: es preferible a
   * que desaparezca.
   */
  nombre: string;
  elementos: ElementoNecesario[];
  total: number;
  /** Elementos con nivel 0, para que la tarjeta avise sin abrirse. */
  urgentes: number;
}
export interface NecesidadesResponse {
  /** ISO yyyy-MM-dd del inventario más reciente entre las filas vigentes. */
  fechaInventario: string | null;
  secciones: SeccionNecesidades[];
  totalElementos: number;
  totalUrgentes: number;
  fuente: "NECESIDADES_ACOPIO";
  disclaimer: string;
}