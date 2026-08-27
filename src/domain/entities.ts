/**
 * entities.ts
 * -----------------------------------------------------------------------
 * Refleja el contrato de API ya cerrado y probado contra el Excel real
 * (route=meta/origenes/municipios/categorias/flujos/destinos/destino/
 * destino-logistica/toneladas). No son las hojas del Excel, son la forma
 * que ya devuelve Transforms.gs. Si el backend cambia una forma de
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

/**
 * route=ayuda. Composición de lo entregado, grupos atendidos y canales.
 *
 * `destinos` cuenta destinos de cualquier tipo, incluidos acopios y
 * entidades. `municipios` cuenta solo municipios. Son distintos y por eso
 * van separados: decir que una categoría llegó a 44 municipios en un
 * departamento de 41 es lo que pasaba al usar el primero.
 */
export interface CategoriaAyudaApi {
  id: string;
  nombre: string;
  unidades: number;
  renglones: number;
  porcentaje: number;
  destinos: number;
  municipios: number;
}

export interface PoblacionAtendida {
  nombre: string;
  /** Despachos que declaran esta población. Un despacho puede declarar varias. */
  despachos: number;
}

export interface CanalApi {
  destinoId: string;
  nombre: string;
  tipo: string;
  entregas: number;
  unidades: number;
  renglones: number;
  categorias: Array<{ nombre: string; unidades: number }>;
}

export interface AyudaResponse {
  totalUnidades: number;
  categorias: CategoriaAyudaApi[];
  poblaciones: PoblacionAtendida[];
  canales: CanalApi[];
  fuente: "ENVIOS_CATEGORIA";
  disclaimer: string;
}

/** route=destinos, listado liviano para poblar el mapa. */
export interface DestinoResumenLista {
  id: string;
  nombre: string;
  tipo: string;
  latitud: number | null;
  longitud: number | null;
  totalUnidades: number;
  categoriasConEnvio: number;
}

/** route=destino&id=, vista PRINCIPAL, solo ENVIOS_CATEGORIA. */
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
    unidadesEntregadas: number;
    destinosConEnvio: number;
    categorias: number;
    municipios: number;
  };
  validacion: { advertencias: number; detalle: unknown[] };
}