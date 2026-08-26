// src/presentation/data/movimientoData.ts

export interface JornadaStat {
  dia: string; // "11", "12", ... "24", "25"
  despachos: number;
  municipiosDelDia: number;
  toneladas: number;
  acumuladoDespachos: number;
  acumuladoMunicipios: number;
  acumuladoToneladas: number;
}

// Datos reales extraídos del HTML de referencia (serie + tooltips del área acumulada)
export const jornadas: JornadaStat[] = [
  { dia: "11", despachos: 5, municipiosDelDia: 5, toneladas: 14, acumuladoDespachos: 5, acumuladoMunicipios: 5, acumuladoToneladas: 14 },
  { dia: "12", despachos: 56, municipiosDelDia: 32, toneladas: 50, acumuladoDespachos: 61, acumuladoMunicipios: 33, acumuladoToneladas: 64 },
  { dia: "13", despachos: 38, municipiosDelDia: 24, toneladas: 70, acumuladoDespachos: 99, acumuladoMunicipios: 36, acumuladoToneladas: 134 },
  { dia: "14", despachos: 21, municipiosDelDia: 14, toneladas: 35, acumuladoDespachos: 120, acumuladoMunicipios: 36, acumuladoToneladas: 169 },
  { dia: "15", despachos: 23, municipiosDelDia: 17, toneladas: 60, acumuladoDespachos: 143, acumuladoMunicipios: 36, acumuladoToneladas: 229 },
  { dia: "16", despachos: 16, municipiosDelDia: 10, toneladas: 45, acumuladoDespachos: 159, acumuladoMunicipios: 36, acumuladoToneladas: 274 },
  { dia: "17", despachos: 45, municipiosDelDia: 23, toneladas: 80, acumuladoDespachos: 204, acumuladoMunicipios: 37, acumuladoToneladas: 354 },
  { dia: "18", despachos: 26, municipiosDelDia: 16, toneladas: 42, acumuladoDespachos: 230, acumuladoMunicipios: 38, acumuladoToneladas: 396 },
  { dia: "19", despachos: 11, municipiosDelDia: 10, toneladas: 19, acumuladoDespachos: 241, acumuladoMunicipios: 39, acumuladoToneladas: 415 },
  { dia: "20", despachos: 11, municipiosDelDia: 10, toneladas: 19, acumuladoDespachos: 252, acumuladoMunicipios: 39, acumuladoToneladas: 434 },
  { dia: "21", despachos: 21, municipiosDelDia: 16, toneladas: 37, acumuladoDespachos: 273, acumuladoMunicipios: 39, acumuladoToneladas: 471 },
  { dia: "22", despachos: 19, municipiosDelDia: 13, toneladas: 33, acumuladoDespachos: 292, acumuladoMunicipios: 39, acumuladoToneladas: 504 },
  { dia: "24", despachos: 13, municipiosDelDia: 12, toneladas: 23, acumuladoDespachos: 305, acumuladoMunicipios: 39, acumuladoToneladas: 527 },
  { dia: "25", despachos: 2, municipiosDelDia: 2, toneladas: 4, acumuladoDespachos: 307, acumuladoMunicipios: 39, acumuladoToneladas: 531 },
];

export interface MunicipiosNuevos {
  dia: string;
  cantidad: number;
  nombres: string[];
}

export const municipiosNuevosPorDia: MunicipiosNuevos[] = [
  {
    dia: "11 de agosto",
    cantidad: 5,
    nombres: ["El Cerrito", "El Águila", "La Unión", "Toro", "Versalles"],
  },
  {
    dia: "12 de agosto",
    cantidad: 28,
    nombres: [
      "Alcalá", "Andalucía", "Ansermanuevo", "Argelia", "Bolívar", "Buenaventura",
      "Bugalagrande", "Caicedonia", "Calima", "Dagua", "El Cairo", "El Dovio",
      "Ginebra", "Jamundí", "La Cumbre", "La Victoria", "Obando", "Palmira",
      "Restrepo", "Riofrío", "Roldanillo", "San Pedro", "Sevilla", "Ulloa",
      "Vijes", "Yotoco", "Yumbo", "Zarzal",
    ],
  },
  { dia: "13 de agosto", cantidad: 3, nombres: ["Buga", "Guacarí", "Trujillo"] },
  { dia: "17 de agosto", cantidad: 1, nombres: ["Tuluá"] },
  { dia: "18 de agosto", cantidad: 1, nombres: ["Pradera"] },
  { dia: "19 de agosto", cantidad: 1, nombres: ["Cartago"] },
];

export const movimientoStats = {
  pico: { valor: 56, nota: "El 12 de agosto, hacia 32 municipios." },
  promedioPorJornada: 21.9,
  porcentajePrimeras48h: 20, // 61 de 307
  despachosDesdeCartago: 35,
};
