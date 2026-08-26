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

export const hallazgos: Hallazgo[] = [
  {
    eje: "movimiento",
    titulo: "Las ayudas llegaron a casi todo el departamento en dos días",
    texto:
      "Entre el 11 y el 12 de agosto las ayudas pasaron de 5 a 33 municipios. En esos dos días salió el 18 por ciento de las entregas, 57 de 321. Después la operación volvió una y otra vez sobre los mismos municipios.",
  },
  {
    eje: "territorio",
    titulo: "Dagua recibió más veces, Sevilla recibió más cantidad",
    texto:
      "Dagua recibió ayudas más veces que ningún otro municipio. Sevilla recibió la mayor cantidad de artículos. Recibir más veces no significa recibir más cantidad.",
  },
  {
    eje: "movimiento",
    titulo: "Las ayudas salen de dos centros de acopio",
    texto:
      "Además del acopio de Cali, la bodega de Cartago envió ayudas a 13 municipios del norte. El norte del Valle se abastece por una ruta propia.",
  },
  {
    eje: "ayuda",
    titulo: "Más de la mitad de la ayuda es aseo y comida",
    texto:
      "El aseo personal y los alimentos suman el 53 por ciento de todo lo entregado. El artículo más repartido son los tapabocas, que llegaron a 31 municipios.",
  },
  {
    eje: "ayuda",
    titulo: "Las mascotas aparecen en más entregas que el adulto mayor",
    texto:
      "84 entregas incluyeron ayuda para mascotas. El adulto mayor aparece en 33 y las personas con discapacidad en 25.",
  },
  {
    eje: "movimiento",
    titulo: "La donación de China se repartió junto con el resto",
    texto:
      "19 entregas corresponden a la donación de la República China. Se repartieron junto con el resto de las ayudas, en los mismos municipios.",
  },
  {
    eje: "territorio",
    titulo: "El norte, el centro y el Pacífico recibieron ayudas completas",
    texto:
      "Todos los municipios del norte, el centro y el Pacífico recibieron ayudas. En el sur, 7 de 9 municipios las recibieron.",
  },
  {
    eje: "evolucion",
    titulo: "El día de más entregas y el de más municipios no fueron el mismo",
    texto:
      "El 17 de agosto salieron 58 entregas, la cifra más alta. El 12 de agosto llegaron ayudas a 32 municipios, la mayor cobertura en un día. La última entrega registrada es del 24.",
  },
];