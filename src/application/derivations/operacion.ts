/**
 * operacion.ts
 * -----------------------------------------------------------------------
 * Convierte `Flujo[]` de la API en todo lo que el tablero necesita
 * contar. Sin React ni fetch, para poder probarlo sin navegador.
 *
 * Antes las jornadas, los totales y los días con entrega vivían escritos
 * a mano en movimientoData.ts. Cada vez que alguien agregaba una entrega
 * al Excel había que editar el código. Acá todo se recalcula solo,
 * porque `route=flujos` ya devuelve `porFecha` por cada par de origen y
 * destino.
 *
 * La zona de cada municipio sale de CAT_MUNICIPIOS vía route=municipios,
 * que es donde la Gobernación la mantiene. El catálogo estático quedó
 * como respaldo mientras esa consulta no responde, pero no manda: tenía
 * a Dagua en Sur cuando el Excel dice Pacífico, y los totales por zona
 * quedaban corridos.
 *
 * Las toneladas admiten dos fuentes. Si `route=toneladas` responde, se
 * usa la serie medida de la hoja TONELADAS. Si no, se estiman sobre las
 * entregas. `toneladasMedidas` dice cuál de las dos está en pantalla,
 * para poder etiquetarlo sin adivinar.
 *
 * La serie medida es DEPARTAMENTAL: incluye Cali, el centro de acopio de
 * Cartago y las otras ayudas solidarias. El conteo de entregas es solo
 * municipal. Las dos cifras conviven en el tablero pero no son
 * divisibles entre sí.
 */
import type { Flujo, Municipio } from "@/domain/entities";
import { getTerritoryStat, territoryMunicipalities } from "@/presentation/data/territoryData";
import { TONELADAS_POR_DESPACHO } from "@/presentation/data/territoryTime";
import { sameMunicipality } from "@/lib/municipalityName";

const CALI = "Santiago de Cali";
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export interface MunicipioOperacion {
  destinoId: string;
  nombre: string;
  codigoDane: string | null;
  zona: string | null;
  entregas: number;
  toneladas: number;
  /** Entregas por día de mes en dos dígitos. */
  dias: Record<string, number>;
  primeraFecha: string | null;
  ultimaFecha: string | null;
}

export interface JornadaOperacion {
  /** Fecha ISO completa. */
  fecha: string;
  /** Día del mes en dos dígitos, la llave que usa el mapa. */
  dia: string;
  entregas: number;
  municipios: number;
  /** Municipios que reciben por primera vez ese día. */
  nuevos: number;
  nombresNuevos: string[];
  acumuladoEntregas: number;
  toneladas: number;
  acumuladoToneladas: number;
}

export interface ToneladasPunto {
  dia: string;
  toneladas: number;
  acumulado: number;
}

/** Un municipio del catálogo, con o sin entregas. */
export interface MunicipioCatalogo {
  codigoDane: string;
  nombre: string;
  zona: string;
}

export interface ZonaOperacion {
  zona: string;
  /** Municipios de la zona según el catálogo. */
  total: number;
  atendidos: number;
  entregas: number;
}

export interface Operacion {
  fechas: string[];
  jornadas: JornadaOperacion[];
  municipios: MunicipioOperacion[];
  /** Todas las entregas municipales, tengan fecha o no. */
  totalEntregas: number;
  /**
   * Las que sí tienen fecha, que son las que aparecen en la curva, en la
   * rejilla por día y en la línea de tiempo. Si el Excel trae entregas
   * sin fecha, este número es menor que totalEntregas y esa diferencia
   * explica por qué el mapa y los gráficos pueden discrepar en uno o dos.
   */
  entregasConFecha: number;
  entregasSinFecha: number;
  totalToneladas: number;
  municipiosAtendidos: number;
  municipiosTotales: number;
  diasConEntrega: number;
  primeraFecha: string | null;
  ultimaFecha: string | null;
  /** "25 de agosto de 2026", listo para mostrar. */
  fechaCorteLarga: string;
  /** "del 11 al 25 de agosto", listo para mostrar. */
  rangoLargo: string;
  /** Jornada con más entregas. */
  picoEntregas: JornadaOperacion | null;
  /** Jornada que alcanzó más municipios. */
  picoCobertura: JornadaOperacion | null;
  /**
   * Entregas por centro de acopio, con el detalle de a qué municipios
   * llegó cada uno. La sección "De dónde salió" lo usa para no volver a
   * mostrar una cifra escrita a mano al lado de una calculada.
   */
  entregasPorOrigen: Array<{
    origenId: string;
    entregas: number;
    municipios: number;
    destinos: Array<{ nombre: string; entregas: number }>;
  }>;
  /** Entregas a Cali, que queda fuera del consolidado municipal. */
  entregasCali: number;
  /** Los municipios del departamento, incluidos los que no recibieron. */
  catalogo: MunicipioCatalogo[];
  /** Cobertura y volumen por zona, con la zona que dice el Excel. */
  zonas: ZonaOperacion[];
  /** true si las toneladas salen de la hoja TONELADAS y no del estimado. */
  toneladasMedidas: boolean;
}

export const OPERACION_VACIA: Operacion = {
  fechas: [],
  jornadas: [],
  municipios: [],
  totalEntregas: 0,
  entregasConFecha: 0,
  entregasSinFecha: 0,
  totalToneladas: 0,
  municipiosAtendidos: 0,
  municipiosTotales: territoryMunicipalities.length,
  diasConEntrega: 0,
  primeraFecha: null,
  ultimaFecha: null,
  fechaCorteLarga: "",
  rangoLargo: "",
  picoEntregas: null,
  picoCobertura: null,
  entregasPorOrigen: [],
  entregasCali: 0,
  catalogo: [],
  zonas: [],
  toneladasMedidas: false,
};

/** Comparación de nombres sin tildes ni mayúsculas. */
function normalizar(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** "2026-08-25" a "25 de agosto de 2026". */
export function fechaLarga(iso: string | null): string {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("-");
  const nombreMes = MESES[Number(mes) - 1];
  if (!anio || !dia || !nombreMes) return iso;
  return `${Number(dia)} de ${nombreMes} de ${anio}`;
}

function diaDe(iso: string): string {
  return iso.slice(-2);
}

/** Solo los pares que llegan a un municipio del Valle. Cali va aparte. */
function esMunicipal(f: Flujo): boolean {
  if (f.destino.tipo !== "municipio") return false;
  return !sameMunicipality(f.destino.nombre, CALI);
}

export function derivarOperacion(
  flujos: Flujo[] | undefined,
  /** Serie de `route=toneladas`. Si falta, las toneladas se estiman. */
  serieToneladas?: ToneladasPunto[] | undefined,
  /** Catálogo de `route=municipios`. Si falta, se usa el estático. */
  municipiosApi?: Municipio[] | undefined,
): Operacion {
  const medidas = new Map((serieToneladas ?? []).map((p) => [p.dia, p]));
  const hayMedidas = medidas.size > 0;

  // El catálogo manda para la zona y para el denominador de cobertura.
  // Cali se excluye acá y no más abajo, para que no infle ninguna zona.
  const catalogo: MunicipioCatalogo[] = (municipiosApi ?? [])
    .filter((m) => !sameMunicipality(m.nombre, CALI))
    .map((m) => ({
      codigoDane: String(m.codigoDane),
      nombre: m.nombre,
      zona: m.subregion || "Sin zona",
    }));

  const catalogoFinal: MunicipioCatalogo[] =
    catalogo.length > 0
      ? catalogo
      : territoryMunicipalities.map((m) => ({
          codigoDane: m.codigoDane,
          nombre: m.name,
          zona: m.zone,
        }));

  const zonaPorNombre = new Map(
    catalogoFinal.map((m) => [normalizar(m.nombre), m.zona]),
  );
  const codigoPorNombre = new Map(
    catalogoFinal.map((m) => [normalizar(m.nombre), m.codigoDane]),
  );
  if (!flujos || flujos.length === 0) return OPERACION_VACIA;

  const municipales = flujos.filter(esMunicipal);

  // --- municipios ---------------------------------------------------------
  const porDestino = new Map<string, MunicipioOperacion>();
  for (const f of municipales) {
    const clave = normalizar(f.destino.nombre);
    const actual =
      porDestino.get(f.destino.id) ??
      ({
        destinoId: f.destino.id,
        nombre: f.destino.nombre,
        codigoDane: codigoPorNombre.get(clave) ?? getTerritoryStat(f.destino.nombre)?.codigoDane ?? null,
        zona: zonaPorNombre.get(clave) ?? getTerritoryStat(f.destino.nombre)?.zone ?? null,
        entregas: 0,
        toneladas: 0,
        dias: {},
        primeraFecha: null,
        ultimaFecha: null,
      } satisfies MunicipioOperacion);

    actual.entregas += f.despachosCount;
    for (const punto of f.porFecha ?? []) {
      const dia = diaDe(punto.fecha);
      actual.dias[dia] = (actual.dias[dia] ?? 0) + punto.despachosCount;
      if (!actual.primeraFecha || punto.fecha < actual.primeraFecha) actual.primeraFecha = punto.fecha;
      if (!actual.ultimaFecha || punto.fecha > actual.ultimaFecha) actual.ultimaFecha = punto.fecha;
    }
    porDestino.set(f.destino.id, actual);
  }

  const municipios = [...porDestino.values()]
    .map((m) => ({ ...m, toneladas: Math.round(m.entregas * TONELADAS_POR_DESPACHO) }))
    .sort((a, b) => b.entregas - a.entregas || a.nombre.localeCompare(b.nombre, "es"));

  // --- jornadas -----------------------------------------------------------
  const porFecha = new Map<string, { entregas: number; destinos: Set<string> }>();
  for (const f of municipales) {
    for (const punto of f.porFecha ?? []) {
      const acc = porFecha.get(punto.fecha) ?? { entregas: 0, destinos: new Set<string>() };
      acc.entregas += punto.despachosCount;
      acc.destinos.add(f.destino.id);
      porFecha.set(punto.fecha, acc);
    }
  }

  const fechas = [...porFecha.keys()].sort();
  const vistos = new Set<string>();
  let acumuladoEntregas = 0;
  let acumuladoToneladas = 0;

  const nombrePorId = new Map(municipios.map((m) => [m.destinoId, m.nombre]));

  const jornadas: JornadaOperacion[] = fechas.map((fecha) => {
    const acc = porFecha.get(fecha)!;
    const nuevos = [...acc.destinos].filter((id) => !vistos.has(id));
    nuevos.forEach((id) => vistos.add(id));

    acumuladoEntregas += acc.entregas;

    // La serie medida manda cuando existe. Un día sin fila propia en la
    // hoja no significa cero toneladas, así que se cae al estimado en vez
    // de cortar la curva.
    const punto = medidas.get(diaDe(fecha));
    const toneladas = punto ? punto.toneladas : Math.round(acc.entregas * TONELADAS_POR_DESPACHO);
    acumuladoToneladas += toneladas;

    return {
      fecha,
      dia: diaDe(fecha),
      entregas: acc.entregas,
      municipios: acc.destinos.size,
      nuevos: nuevos.length,
      nombresNuevos: nuevos
        .map((id) => nombrePorId.get(id) ?? id)
        .sort((a, b) => a.localeCompare(b, "es")),
      acumuladoEntregas,
      toneladas,
      acumuladoToneladas,
    };
  });

  // --- orígenes -----------------------------------------------------------
  const porOrigen = new Map<string, { entregas: number; destinos: Map<string, number> }>();
  for (const f of municipales) {
    const acc = porOrigen.get(f.origenId) ?? { entregas: 0, destinos: new Map<string, number>() };
    acc.entregas += f.despachosCount;
    acc.destinos.set(f.destino.nombre, (acc.destinos.get(f.destino.nombre) ?? 0) + f.despachosCount);
    porOrigen.set(f.origenId, acc);
  }

  // Cali no entra en el consolidado municipal pero sí existe, y la
  // sección de canales necesita su cifra.
  const entregasCali = flujos
    .filter((f) => f.destino.tipo === "municipio" && sameMunicipality(f.destino.nombre, CALI))
    .reduce((sum, f) => sum + f.despachosCount, 0);

  // El total sale de los municipios, no de las jornadas: una entrega sin
  // fecha no aparece en ninguna jornada pero existe igual. Antes se
  // calculaba sumando jornadas y el panel del mapa mostraba un número
  // distinto al del resumen.
  const totalEntregas = municipios.reduce((sum, m) => sum + m.entregas, 0);

  // --- zonas --------------------------------------------------------------
  const porZona = new Map<string, { total: number; atendidos: number; entregas: number }>();

  for (const m of catalogoFinal) {
    const acc = porZona.get(m.zona) ?? { total: 0, atendidos: 0, entregas: 0 };
    acc.total += 1;
    porZona.set(m.zona, acc);
  }

  for (const m of municipios) {
    const zona = m.zona ?? "Sin zona";
    const acc = porZona.get(zona) ?? { total: 0, atendidos: 0, entregas: 0 };
    acc.atendidos += 1;
    acc.entregas += m.entregas;
    porZona.set(zona, acc);
  }

  const zonas: ZonaOperacion[] = [...porZona.entries()]
    .map(([zona, acc]) => ({ zona, ...acc }))
    .sort((a, b) => b.total - a.total || a.zona.localeCompare(b.zona, "es"));

  const primeraFecha = fechas[0] ?? null;
  const ultimaFecha = fechas.at(-1) ?? null;

  const picoEntregas = jornadas.reduce<JornadaOperacion | null>(
    (mejor, j) => (mejor === null || j.entregas > mejor.entregas ? j : mejor),
    null,
  );
  const picoCobertura = jornadas.reduce<JornadaOperacion | null>(
    (mejor, j) => (mejor === null || j.municipios > mejor.municipios ? j : mejor),
    null,
  );

  return {
    fechas,
    jornadas,
    municipios,
    totalEntregas,
    entregasConFecha: acumuladoEntregas,
    entregasSinFecha: totalEntregas - acumuladoEntregas,
    totalToneladas: acumuladoToneladas,
    toneladasMedidas: hayMedidas,
    municipiosAtendidos: porDestino.size,
    municipiosTotales: catalogoFinal.length,
    diasConEntrega: fechas.length,
    primeraFecha,
    ultimaFecha,
    fechaCorteLarga: fechaLarga(ultimaFecha),
    rangoLargo: rangoLargoDe(primeraFecha, ultimaFecha),
    picoEntregas,
    picoCobertura,
    entregasCali,
    catalogo: catalogoFinal,
    zonas,
    entregasPorOrigen: [...porOrigen.entries()]
      .map(([origenId, acc]) => ({
        origenId,
        entregas: acc.entregas,
        municipios: acc.destinos.size,
        destinos: [...acc.destinos.entries()]
          .map(([nombre, entregas]) => ({ nombre, entregas }))
          .sort((a, b) => b.entregas - a.entregas || a.nombre.localeCompare(b.nombre, "es")),
      }))
      .sort((a, b) => b.entregas - a.entregas),
  };
}

/** "del 11 al 25 de agosto". Si cambian de mes, nombra los dos. */
function rangoLargoDe(desde: string | null, hasta: string | null): string {
  if (!desde || !hasta) return "";
  const [, mesA, diaA] = desde.split("-");
  const [, mesB, diaB] = hasta.split("-");
  const nombreA = MESES[Number(mesA) - 1];
  const nombreB = MESES[Number(mesB) - 1];
  if (!diaA || !diaB || !nombreA || !nombreB) return "";
  if (mesA === mesB) return `del ${Number(diaA)} al ${Number(diaB)} de ${nombreB}`;
  return `del ${Number(diaA)} de ${nombreA} al ${Number(diaB)} de ${nombreB}`;
}