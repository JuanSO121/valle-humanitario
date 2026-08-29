/**
 * ayudaData.ts — Nivel 4, "¿Qué se está movilizando?"
 * -----------------------------------------------------------------------
 * FUENTE MIXTA, y conviene tenerlo claro:
 *   · Categorías (unidades / renglones / destinos) y poblaciones salen
 *     de BD_Entregas_Operativa_v2.xlsx, hojas ENVIOS_CATEGORIA y
 *     DESPACHO_POBLACION. Son cifras verificadas.
 *   · Las listas de PRODUCTOS no: el workbook guarda cuántos productos
 *     distintos tiene cada envío (`productos_distintos`), pero no sus
 *     nombres. Esas listas siguen viniendo del tablero HTML y son lo
 *     único de este archivo que no se puede reproducir desde el Excel.
 *     Si alguna vez se necesita regenerarlas, hay que ir a la
 *     transcripción renglón por renglón, no a este workbook.
 *
 * ATENCIÓN — cifras que NO cuadran con el resto de la app:
 *   · Las categorías que StoryPage tenía hardcodeadas (Aseo personal
 *     54.038, Alimentos 27.155, Protección 29.100) NO coinciden con
 *     ninguna fuente; ya se borraron de esa página. Ese hardcode hay que borrarlo de StoryPage.
 *   · `destinos` cuenta destinos de cualquier tipo (municipios, acopios,
 *     casos especiales), por eso llega a 46 y no a 41.
 *   · Cuatro categorías cambiaron contra el tablero HTML, por
 *     reclasificación de renglones: Líquidos 33.915→33.330, Menaje
 *     6.258→5.340, Mascotas 3.272→4.775 (y de 33 a 37 destinos). Las
 *     tres diferencias se compensan: el total sigue en 256.650.
 *
 * Los porcentajes se calculan, no se transcriben: el HTML los traía
 * redondeados y sumaban 99%.
 * -----------------------------------------------------------------------
 */

export interface CategoriaAyuda {
  nombre: string;
  unidades: number;
  destinos: number;
  color: string;
  /** Productos más repartidos DENTRO de esta categoría, de mayor a menor. */
  productos: Array<[nombre: string, unidades: number]>;
}

export const TOTAL_UNIDADES = 256650;
export const TOTAL_RENGLONES = 6111;

export const categoriasAyuda: CategoriaAyuda[] = [
  {
    nombre: "Aseo personal",
    unidades: 80361,
    destinos: 44,
    color: "#3E9BCB",
    productos: [
      ["Papel higiénico", 15980],
      ["Toallas higiénicas", 9528],
      ["Pañales de adulto", 5823],
      ["Jabón de baño", 5086],
      ["Cremas dentales", 4791],
      ["Pañitos húmedos", 4494],
      ["Pañales", 3139],
      ["Jabones", 3001],
      ["Rollos de papel higiénico", 2196],
      ["Cepillos de dientes", 1894],
    ],
  },
  {
    nombre: "Alimentos",
    unidades: 56237,
    destinos: 46,
    color: "#5CC46B",
    productos: [
      ["Mercados", 5989],
      ["Atún", 5484],
      ["Arroz", 3131],
      ["Panelas", 2826],
      ["Pasta", 2525],
      ["Sal", 1514],
      ["Azúcar", 1439],
      ["Arroz (libras)", 1303],
      ["Granos", 1175],
      ["Aceite", 1048],
    ],
  },
  {
    nombre: "Protección y seguridad",
    unidades: 36123,
    destinos: 44,
    color: "#F0801E",
    productos: [
      ["Tapabocas", 17100],
      ["Gafas", 2673],
      ["Guantes látex", 2027],
      ["Tapabocas industrial", 2007],
      ["Tapabocas sencillos", 2000],
      ["Caretas", 1742],
      ["Guantes", 1630],
      ["Cascos", 1245],
      ["Guantes de construcción", 718],
      ["Guantes quirúrgicos", 600],
    ],
  },
  {
    nombre: "Líquidos e hidratación",
    unidades: 33330,
    destinos: 43,
    color: "#00C4B0",
    productos: [
      ["Botella agua personal", 7814],
      ["Botellas agua", 4413],
      ["Agua", 4388],
      ["Pony malta", 1696],
      ["Jugos", 1408],
      ["Agua (unidades)", 1058],
      ["Agua en pacas (mililitros)", 1047],
      ["Agua persona", 550],
      ["Electrolit", 453],
      ["Agua 1 litro", 450],
    ],
  },
  {
    nombre: "Descanso y abrigo",
    unidades: 13560,
    destinos: 43,
    color: "#B57BB5",
    productos: [
      ["Cobijas", 5255],
      ["Almohadas", 2203],
      ["Colchonetas", 1978],
      ["Sábanas", 953],
      ["Carpas", 894],
      ["Cobijas china", 600],
      ["Mantas desechables", 200],
      ["Colchones", 173],
      ["Caja de carpas", 173],
      ["Colchonetas térmicas", 171],
    ],
  },
  {
    nombre: "Kits sin desagregar",
    unidades: 7519,
    destinos: 37,
    color: "#6E8B9E",
    productos: [
      ["Kit de aseo", 4281],
      ["Kit personal de aseo", 1864],
      ["Kits de aseo", 452],
      ["Kit adulto mayor", 167],
      ["Kits", 150],
      ["Kit de aseo turquía", 100],
      ["Kit niños", 82],
      ["Kits de comida", 50],
      ["Kit aseo adulto mayor", 46],
      ["Kit de cocina", 45],
    ],
  },
  {
    nombre: "Bebé",
    unidades: 6862,
    destinos: 41,
    color: "#81C8EC",
    productos: [
      ["Pañales de bebé", 3406],
      ["Pañales niños", 1143],
      ["Kit aseo · pañal bebé", 300],
      ["Camisa de bebé", 300],
      ["Crema antipañalitis", 181],
      ["Crema bebé", 136],
      ["Cobijas de bebé", 135],
      ["Kit de aseo de bebé", 132],
      ["Kit de pañales de bebé", 124],
      ["Teteros", 115],
    ],
  },
  {
    nombre: "Menaje y utensilios",
    unidades: 5340,
    destinos: 35,
    color: "#C9A0D0",
    productos: [
      ["Platos plásticos", 854],
      ["Vasos", 819],
      ["Platos desechables", 619],
      ["Platos", 521],
      ["Tarros", 514],
      ["Cucharones", 420],
      ["Vasos desechables", 343],
      ["Cuchillos", 302],
      ["Cucharas", 255],
      ["Vasos plásticos", 224],
    ],
  },
  {
    nombre: "Sin clasificar",
    unidades: 6210,
    destinos: 45,
    color: "#4F6B7C",
    productos: [
      ["Cajas de toallas", 400],
      ["Ley", 386],
      ["Bolsa", 294],
      ["Platanitos", 293],
      ["Fideos", 286],
      ["Rollos papel", 277],
      ["Papas y platanitos (paquetes)", 135],
      ["Powerade", 98],
      ["Ensure", 78],
      ["Bolsas plásticas", 73],
    ],
  },
  {
    nombre: "Mascotas",
    unidades: 4775,
    destinos: 37,
    color: "#89A32C",
    productos: [
      ["Alimento mascotas", 412],
      ["Comida perro", 377],
      ["Gatos", 200],
      ["Sábanas perros y fundas", 200],
      ["Comida para perros (kg)", 195],
      ["Comida gato", 179],
      ["Alimento perro", 172],
      ["Comida perro x kilo", 136],
      ["Comida para perro (kilos)", 132],
      ["Comida húmeda", 107],
    ],
  },
  {
    nombre: "Ropa y calzado",
    unidades: 2823,
    destinos: 35,
    color: "#8375A9",
    productos: [
      ["Gorras", 383],
      ["Faldillos", 323],
      ["Ropa dama en bolsas", 319],
      ["Ropa y zapatos", 301],
      ["Ropa", 255],
      ["Bolsa ropa de niño", 133],
      ["Cajas de ropa variada", 112],
      ["Bolsa ropa hombre", 104],
      ["Bolsas de ropa", 79],
      ["Bolsas con ropa de mujer", 75],
    ],
  },
  {
    nombre: "Aseo del hogar",
    unidades: 2595,
    destinos: 38,
    color: "#2378A8",
    productos: [
      ["Baldes", 344],
      ["Dettol", 300],
      ["Lavaloza", 288],
      ["Servilletas", 284],
      ["Bolsas de basura", 262],
      ["Desinfectante de baño", 216],
      ["Aroma de piso", 200],
      ["Desinfectante aire", 120],
      ["Tapetes", 112],
      ["Papel de cocina", 96],
    ],
  },
  {
    nombre: "Herramientas y materiales",
    unidades: 828,
    destinos: 34,
    color: "#F0B102",
    productos: [
      ["Palas", 208],
      ["Pilas AAA", 84],
      ["Pilas", 68],
      ["Pilas AA", 65],
      ["Lazo", 62],
      ["Plástico transparente", 50],
      ["Velas", 33],
      ["Plástico", 25],
      ["Bombillos", 24],
      ["Pilas doble A", 24],
    ],
  },
  {
    nombre: "Salud",
    unidades: 87,
    destinos: 4,
    color: "#5FD6E8",
    productos: [
      ["Acetaminofén", 80],
      ["Curas (caja)", 3],
      ["Acetaminofén 500mg x100", 2],
      ["Gasa estéril", 1],
      ["Tabletas de acetaminofén", 1],
    ],
  },
];

/** Los 14 productos más repartidos de toda la emergencia, sin importar categoría. */
export const productosMasRepartidos: Array<[nombre: string, unidades: number]> = [
  ["Tapabocas", 17100],
  ["Papel higiénico", 15980],
  ["Toallas higiénicas", 9528],
  ["Botella agua personal", 7814],
  ["Mercados", 5989],
  ["Pañales de adulto", 5823],
  ["Atún", 5484],
  ["Cobijas", 5255],
  ["Jabón de baño", 5086],
  ["Cremas dentales", 4791],
  ["Pañitos húmedos", 4494],
  ["Botellas agua", 4413],
  ["Agua", 4388],
  ["Kit de aseo", 4281],
];

/**
 * Despachos que declaran expresamente cada población en el formato.
 *
 * Corregido contra DESPACHO_POBLACION: el tablero HTML mostraba
 * "veredas 47" y "rural 47" como dos filas, y lo mismo con
 * "indígena 8" / "etnias 8". En la fuente son UNA sola etiqueta cada
 * par, así que verlas repetidas duplicaba visualmente su peso.
 *
 * Se omite "general" (197 despachos), que no es una focalización sino
 * la ausencia de ella.
 */
export const poblacionesFocalizadas: Array<[nombre: string, despachos: number]> = [
  ["Mascotas", 84],
  ["Veredas y rural", 47],
  ["Adulto mayor", 33],
  ["Discapacidad", 25],
  ["Donación China", 19],
  ["Indígena y etnias", 8],
  ["Juventudes", 6],
  ["Rescatistas", 5],
  ["Mujeres", 4],
  ["Primera infancia", 2],
];

/** Agrupación por necesidad. El color de cada categoría ya la codifica; esto la nombra. */
export const familiasDeAyuda: Array<{ nombre: string; categorias: string[] }> = [
  { nombre: "Subsistencia", categorias: ["Alimentos", "Líquidos e hidratación"] },
  { nombre: "Higiene y salud", categorias: ["Aseo personal", "Aseo del hogar", "Bebé", "Salud"] },
  {
    nombre: "Habitabilidad",
    categorias: ["Descanso y abrigo", "Ropa y calzado", "Menaje y utensilios"],
  },
  { nombre: "Protección", categorias: ["Protección y seguridad", "Herramientas y materiales"] },
  { nombre: "Mascotas", categorias: ["Mascotas"] },
  { nombre: "Sin desagregar", categorias: ["Kits sin desagregar", "Sin clasificar"] },
];