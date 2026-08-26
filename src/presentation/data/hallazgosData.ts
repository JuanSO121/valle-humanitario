/**
 * hallazgosData.ts — Nivel 8, "¿Qué nos están diciendo los datos?"
 * -----------------------------------------------------------------------
 * Cada hallazgo sale de un cruce concreto de las fuentes; ninguno es una
 * impresión. `eje` clasifica de qué nivel viene la lectura y decide el
 * color del borde, así que no es decoración: dice dónde ir a verificarlo.
 *
 * Cifras alineadas con BD_Entregas_Operativa_v2.xlsx: 321 despachos
 * municipales, 531 toneladas departamentales, 39 de 41 municipios.
 * -----------------------------------------------------------------------
 */

export type EjeHallazgo = "movimiento" | "territorio" | "ayuda" | "brecha" | "evolucion";

export interface Hallazgo {
  eje: EjeHallazgo;
  titulo: string;
  texto: string;
}

export const EJE_COLOR: Record<EjeHallazgo, string> = {
  movimiento: "#F0801E",
  territorio: "#81C8EC",
  ayuda: "#00A494",
  brecha: "#F26049",
  evolucion: "#FFD103",
};

export const EJE_ETIQUETA: Record<EjeHallazgo, string> = {
  movimiento: "Movimiento",
  territorio: "Territorio",
  ayuda: "Qué se mueve",
  brecha: "Brecha",
  evolucion: "Evolución",
};

export const hallazgos: Hallazgo[] = [
  {
    eje: "movimiento",
    titulo: "La cobertura se resolvió en 48 horas; el volumen, no",
    texto:
      "Entre el 11 y el 12 de agosto la operación pasó de 5 a 33 municipios: cuatro de cada cinco de los que llegarían a atenderse. Pero en esas dos jornadas salió apenas el 18% de los despachos, 57 de 321. Lo que vino después no fue llegar más lejos, sino volver una y otra vez sobre el mismo territorio.",
  },
  {
    eje: "territorio",
    titulo: "Dagua concentra la operación, pero no por volumen de ayuda",
    texto:
      "Dagua encabeza en número de despachos. El mayor volumen de ítems registrados, en cambio, es de Sevilla: 24.982 unidades en 817 renglones. Más despachos significa más veces, no necesariamente más carga.",
  },
  {
    eje: "movimiento",
    titulo: "La operación tiene dos orígenes, no uno",
    texto:
      "Además del acopio de Cali, la bodega de Cartago despachó por su cuenta 35 formatos hacia 13 municipios del norte y movió 17.106 unidades. El norte del Valle se abastece por una ruta propia.",
  },
  {
    eje: "ayuda",
    titulo: "La ayuda es, ante todo, higiene y comida",
    texto:
      "Aseo personal y Alimentos suman 136.598 de las 256.650 unidades registradas: el 53%. El producto más repartido de toda la emergencia son los tapabocas, con 17.100 unidades en 31 destinos.",
  },
  {
    eje: "brecha",
    titulo: "Lo que queda abierto casi nunca se arregla con un despacho",
    texto:
      "De los 199 requerimientos del PMU, solo 52 son de ayuda humanitaria. Los que más pesan son infraestructura, 75, y vivienda, 22: obras, no entregas. Por eso los 95 casos marcados «no atendido» al corte del 21 de agosto no se cierran despachando más mercados.",
  },
  {
    eje: "brecha",
    titulo: "Candelaria pide y no recibe",
    texto:
      "Candelaria tiene 6 requerimientos radicados y cero despachos en toda la emergencia. Es el único municipio del departamento en esa situación. Florida tampoco registra despacho, pero tampoco ha radicado requerimientos.",
  },
  {
    eje: "ayuda",
    titulo: "Las mascotas son una población focalizada de primer orden",
    texto:
      "84 despachos declaran mascotas como población focalizada: más que adulto mayor, 33, o discapacidad, 25. La ayuda animal dejó de ser marginal en esta emergencia.",
  },
  {
    eje: "movimiento",
    titulo: "La donación de China es una línea propia dentro de lo municipal",
    texto:
      "19 despachos vienen marcados como donación de la República China. No van aparte: se reparten dentro de la operación municipal, y se distinguen porque el formato de papel trae su propio encabezado.",
  },
  {
    eje: "territorio",
    titulo: "La cobertura está completa salvo en el sur",
    texto:
      "Norte, Centro y Pacífico están al 100%. El Sur no: faltan Candelaria y Florida, los dos únicos municipios del Valle sin un solo despacho documentado.",
  },
  {
    eje: "evolucion",
    titulo: "El pico de volumen y el de cobertura no coinciden",
    texto:
      "El 17 de agosto salieron 58 despachos, y el 12 llegaron a 32 municipios en una sola jornada: el pico de volumen y el de cobertura no cayeron el mismo día. La última entrega municipal se documentó el 24.",
  },
];