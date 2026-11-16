/**
 * data/hallazgosData.ts
 * -----------------------------------------------------------------------
 * Las lecturas de «Lo que muestran los datos», CALCULADAS de las rutas del
 * backend. Ninguna cifra ni nombre está escrito acá: si mañana se carga
 * otro corte, las lecturas cambian solas y siguen diciendo la verdad.
 *
 * La versión anterior tenía las frases y los números en el código, y se
 * quedaban viejos apenas cambiaba un día de datos.
 *
 * LA REDACCIÓN
 *
 * Es la del tablero original: titulares cortos y afirmativos, una o dos
 * frases, «entregas» y no «registros», y el porcentaje con letras («el 8 por
 * ciento»). Sin términos de base de datos: quien lee es un ciudadano.
 *
 * Cada lectura se omite cuando no hay con qué calcularla (sin municipios,
 * sin categorías…). Mejor siete lecturas ciertas que ocho con una
 * inventada.
 * -----------------------------------------------------------------------
 */
import type {
  CategoriasResponse,
  Municipio,
  OtrasResponse,
  ResumenResponse,
} from "@/domain/entities";
import { diaMes, toneladas } from "@/lib/formato";

export type Eje = "volumen" | "territorio" | "categoria" | "calidad";

export interface Hallazgo {
  eje: Eje;
  /** La cifra grande: «294 t», «27 %», «42/42». */
  cifra: string;
  /** Lo que esa cifra es, en pocas palabras. */
  titulo: string;
  /** Una frase de apoyo. */
  texto: string;
  /** Qué parte del todo representa (0 a 1); dibuja la barrita. Sin ella, no hay barra. */
  parte?: number;
}

export const EJE_ETIQUETA: Record<Eje, string> = {
  volumen: "Movimiento",
  territorio: "Territorio",
  categoria: "Qué se mueve",
  calidad: "Tenga en cuenta",
};

export const EJE_COLOR: Record<Eje, string> = {
  volumen: "#22ABE2",
  territorio: "#FFD400",
  categoria: "#5CC46B",
  calidad: "#F26049",
};

const porcentaje = (parte: number, total: number): number =>
  total > 0 ? Math.round((parte / total) * 100) : 0;

/** «A, B y C». */
function enumerar(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

interface Fuentes {
  resumen: ResumenResponse;
  municipios: Municipio[];
  categorias: CategoriasResponse | null;
  otras: OtrasResponse | null;
}

export function hallazgosDe({ resumen, municipios, categorias, otras }: Fuentes): Hallazgo[] {
  const out: Hallazgo[] = [];
  const total = resumen.totales.toneladas;
  if (total <= 0) return out;
  const fraccion = (parte: number): number => Math.min(1, Math.max(0, parte / total));

  const atendidos = municipios.filter((m) => m.atendido);
  const ordenados = [...atendidos].sort((a, b) => b.toneladas - a.toneladas);

  // 1. Cuánto se movió y en cuánto tiempo.
  if (resumen.periodo.desde && resumen.periodo.hasta) {
    out.push({
      eje: "volumen",
      cifra: toneladas(total),
      titulo: `entregadas en ${resumen.periodo.diasConDespacho} días`,
      texto: `Del ${diaMes(resumen.periodo.desde)} al ${diaMes(resumen.periodo.hasta)}.`,
    });
  }

  // 2. Dónde llegó más.
  const primero = ordenados[0];
  if (primero) {
    out.push({
      eje: "territorio",
      cifra: toneladas(primero.toneladas),
      titulo: `en ${primero.nombre}, el municipio con más ayuda`,
      texto: `El ${porcentaje(primero.toneladas, total)} por ciento de lo entregado.`,
      parte: fraccion(primero.toneladas),
    });
  }

  // 3. Qué tan concentrado está.
  if (ordenados.length >= 5) {
    const cinco = ordenados.slice(0, 5);
    const suma = cinco.reduce((a, m) => a + m.toneladas, 0);
    out.push({
      eje: "territorio",
      cifra: `${porcentaje(suma, total)} %`,
      titulo: "se concentró en cinco municipios",
      texto: `${enumerar(cinco.map((m) => m.nombre))}.`,
      parte: fraccion(suma),
    });
  }

  // 4. Cobertura.
  const { municipiosAtendidos: n, municipiosTotales: t } = resumen.totales;
  out.push({
    eje: "territorio",
    cifra: `${n}/${t}`,
    titulo: "municipios recibieron ayuda",
    texto: n === t ? "Ninguno se quedó sin entregas." : `En ${t - n} no hay entregas registradas.`,
    ...(t > 0 ? { parte: n / t } : {}),
  });

  // 5. Qué fue lo más entregado.
  if (categorias && categorias.categorias.length > 0) {
    const masPesada = [...categorias.categorias].sort((a, b) => b.toneladas - a.toneladas)[0];
    if (masPesada && masPesada.toneladas > 0) {
      out.push({
        eje: "categoria",
        cifra: `${porcentaje(masPesada.toneladas, total)} %`,
        titulo: `fue ${masPesada.nombre}`,
        texto: `${toneladas(masPesada.toneladas)}: la categoría con más ayuda.`,
        parte: fraccion(masPesada.toneladas),
      });
    }
  }

  // 6. Lo que no fue a un municipio.
  if (otras && otras.toneladas > 0) {
    out.push({
      eje: "volumen",
      cifra: `${porcentaje(otras.toneladas, total)} %`,
      titulo: "fue a fundaciones y otras entidades",
      texto: `${toneladas(otras.toneladas)} a fundaciones, otros departamentos y entidades.`,
      parte: fraccion(otras.toneladas),
    });
  }

  // 7. Lo que el propio Excel marca con dudas. Solo `porVerificar`: el peso
  // sin soporte (`pesoSinSoporte`) es otra marca y no se suma acá.
  const dudoso = resumen.calidad.porVerificar;
  if (dudoso.registros > 0) {
    out.push({
      eje: "calidad",
      cifra: `${porcentaje(dudoso.toneladas, total)} %`,
      titulo: "aún se está confirmando",
      texto: `${toneladas(dudoso.toneladas)} marcadas «por verificar» pueden cambiar.`,
      parte: fraccion(dudoso.toneladas),
    });
  }

  // 8. Ayuda enviada a puntos de distribución: puede estar contada dos veces.
  const traslados = resumen.calidad.traslados;
  if (traslados.registros > 0) {
    out.push({
      eje: "calidad",
      cifra: toneladas(traslados.toneladas),
      titulo: "se enviaron a puntos de distribución",
      texto: "Se reparte después desde allí; puede estar contada también en los municipios.",
      parte: fraccion(traslados.toneladas),
    });
  }

  return out;
}
