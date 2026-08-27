/**
 * hallazgosData.ts, Nivel 8, "¿Qué nos están diciendo los datos?"
 * -----------------------------------------------------------------------
 * Cada hallazgo sale de un cruce concreto de las fuentes; ninguno es una
 * impresión. `eje` clasifica de qué nivel viene la lectura y decide el
 * color del borde, así que no es decoración: dice dónde ir a verificarlo.
 *
 * Cifras alineadas con BD_Entregas_Operativa_v2.xlsx: 321 despachos
 * municipales, 531 toneladas departamentales, 39 de 41 municipios.
 * -----------------------------------------------------------------------
 */

import type { Operacion } from "@/application/derivations/operacion";
import type { AyudaResponse } from "@/domain/entities";
export type EjeHallazgo = "movimiento" | "territorio" | "ayuda" | "evolucion";

export interface Hallazgo {
  eje: EjeHallazgo;
  titulo: string;
  texto: string;
}

export const EJE_COLOR: Record<EjeHallazgo, string> = {
  movimiento: "#F0801E",
  territorio: "#81C8EC",
  ayuda: "#00A494",
  evolucion: "#FFD103",
};

export const EJE_ETIQUETA: Record<EjeHallazgo, string> = {
  movimiento: "Movimiento",
  territorio: "Territorio",
  ayuda: "Qué se mueve",
  evolucion: "Evolución",
};

/**
 * Los hallazgos se arman con las cifras del momento. Antes eran texto
 * fijo y quedaban desfasados: decían 321 entregas cuando la página ya
 * mostraba 339, y nombraban como último día uno que la operación había
 * dejado atrás.
 *
 * Los que hablan de artículos y de grupos atendidos siguen con cifras
 * fijas porque salen de la base de ítems, que no está expuesta por la
 * API. Están marcados con una nota.
 */
export function hallazgosDe(op: Operacion, ayuda?: AyudaResponse | undefined): Hallazgo[] {
  const lista: Hallazgo[] = [];

  const arranque = op.jornadas.slice(0, 2);
  if (arranque.length === 2) {
    const entregas = arranque.reduce((sum, j) => sum + j.entregas, 0);
    // Municipios distintos alcanzados, no la suma de los dos días: casi
    // todos los del primer día vuelven a recibir el segundo.
    const municipios = arranque.reduce((sum, j) => sum + j.nuevos, 0);
    const porcentaje = op.totalEntregas > 0 ? Math.round((entregas / op.totalEntregas) * 100) : 0;
    lista.push({
      eje: "movimiento",
      titulo: "Las ayudas llegaron a casi todo el departamento en dos días",
      texto: `En los dos primeros días las ayudas llegaron a ${municipios} municipios. En esas dos jornadas salió el ${porcentaje} por ciento de las entregas, ${entregas} de ${op.totalEntregas}. Después la operación volvió una y otra vez sobre los mismos municipios.`,
    });
  }

  const primero = op.municipios[0];
  if (primero) {
    lista.push({
      eje: "territorio",
      titulo: `${primero.nombre} es el municipio que más veces recibió ayudas`,
      texto: `${primero.nombre} registra ${primero.entregas} entregas, más que ningún otro municipio del Valle. Recibir más veces no significa recibir más cantidad: el volumen depende de lo que traía cada envío.`,
    });
  }

  const cartago = op.entregasPorOrigen.find((o) => o.origenId === "ORI-CARTAGO");
  if (cartago) {
    lista.push({
      eje: "movimiento",
      titulo: "Las ayudas salen de dos centros de acopio",
      texto: `Además del acopio de Cali, la bodega de Cartago envió ${cartago.entregas} entregas a ${cartago.municipios} municipios del norte. El norte del Valle se abastece por una ruta propia.`,
    });
  }

  // Las dos categorías más grandes, con su peso real. Antes decía 53 por
  // ciento fijo y quedaba viejo cada vez que cambiaba el Excel.
  const dosPrimeras = (ayuda?.categorias ?? []).slice(0, 2);
  if (dosPrimeras.length === 2 && ayuda) {
    const suma = dosPrimeras.reduce((s, c) => s + c.unidades, 0);
    const porcentaje =
      ayuda.totalUnidades > 0 ? Math.round((suma / ayuda.totalUnidades) * 100) : 0;
    lista.push({
      eje: "ayuda",
      titulo: `Más de la mitad de la ayuda es ${dosPrimeras[0]!.nombre.toLowerCase()} y ${dosPrimeras[1]!.nombre.toLowerCase()}`,
      texto: `${dosPrimeras[0]!.nombre} y ${dosPrimeras[1]!.nombre} suman el ${porcentaje} por ciento de todo lo entregado.`,
    });
  } else {
    lista.push({
      eje: "ayuda",
      titulo: "Más de la mitad de la ayuda es aseo y comida",
      texto:
        "El aseo personal y los alimentos suman la mayor parte de todo lo entregado. El artículo más repartido son los tapabocas.",
    });
  }

  const grupos = ayuda?.poblaciones ?? [];
  const primerGrupo = grupos[0];
  if (primerGrupo && grupos.length > 2) {
    lista.push({
      eje: "ayuda",
      titulo: `${primerGrupo.nombre} es el grupo que más aparece en las entregas`,
      texto: `${primerGrupo.despachos} entregas declaran ayuda dirigida a ${primerGrupo.nombre.toLowerCase()}. Le siguen ${grupos[1]!.nombre.toLowerCase()} con ${grupos[1]!.despachos} y ${grupos[2]!.nombre.toLowerCase()} con ${grupos[2]!.despachos}.`,
    });
  }

  const china = grupos.find((g) => g.nombre.toLowerCase().indexOf("china") !== -1);
  if (china) {
    lista.push({
      eje: "movimiento",
      titulo: "La donación de China se repartió junto con el resto",
      texto: `${china.despachos} entregas corresponden a la donación de la República China. Se repartieron dentro de la operación municipal, en los mismos municipios que el resto de las ayudas.`,
    });
  }

  const faltan = op.municipiosTotales - op.municipiosAtendidos;
  lista.push({
    eje: "territorio",
    titulo:
      faltan === 0
        ? "Todos los municipios del Valle recibieron ayudas"
        : "La cobertura llega a casi todo el departamento",
    texto:
      faltan === 0
        ? `Los ${op.municipiosTotales} municipios del Valle registran al menos una entrega.`
        : `${op.municipiosAtendidos} de los ${op.municipiosTotales} municipios del Valle registran al menos una entrega.`,
  });

  if (op.picoEntregas && op.picoCobertura) {
    const mismoDia = op.picoEntregas.dia === op.picoCobertura.dia;
    lista.push({
      eje: "evolucion",
      titulo: mismoDia
        ? "El día más intenso de toda la operación"
        : "El día de más entregas y el de más municipios no fueron el mismo",
      texto: mismoDia
        ? `El ${Number(op.picoEntregas.dia)} de agosto salieron ${op.picoEntregas.entregas} entregas hacia ${op.picoEntregas.municipios} municipios.`
        : `El ${Number(op.picoEntregas.dia)} de agosto salieron ${op.picoEntregas.entregas} entregas, la cifra más alta. El ${Number(op.picoCobertura.dia)} llegaron ayudas a ${op.picoCobertura.municipios} municipios, la mayor cobertura en un día.`,
    });
  }

  return lista;
}