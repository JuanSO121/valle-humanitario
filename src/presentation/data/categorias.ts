/**
 * data/categorias.ts
 * -----------------------------------------------------------------------
 * Cómo se DIBUJA cada una de las 7 categorías: su ícono y sus colores. Los
 * NOMBRES y su orden vienen del backend (CONFIG.CATEGORIAS en Config.js).
 *
 * Una categoría que el backend agregue y que no esté acá se dibuja con el
 * ícono y los colores genéricos: aparece igual, solo sin su estilo propio.
 *
 * COLOR DE GRUPO: el color con que «¿Qué se entregó?» identificaba cada familia de
 * ayuda (subsistencia en verde, higiene en azul, habitabilidad en morado,
 * protección en naranja, mascotas en oliva). Es el del ícono de cada categoría.
 * -----------------------------------------------------------------------
 */
import {
  Apple,
  BedDouble,
  CookingPot,
  Droplets,
  PawPrint,
  Shirt,
  ShieldCheck,
  Package,
  type LucideIcon,
} from "lucide-react";

const ICONOS: Record<string, LucideIcon> = {
  Alimentos: Apple,
  "Protección y seguridad": ShieldCheck,
  "Kit de aseo": Droplets,
  "Descanso y abrigo": BedDouble,
  Mascotas: PawPrint,
  "Ropa y calzado": Shirt,
  "Menaje y utensilios": CookingPot,
};

export const iconoDeCategoria = (nombre: string): LucideIcon => ICONOS[nombre] ?? Package;

/** Color de grupo (el de «¿Qué se entregó?»): subsistencia, higiene, habitabilidad… */
const GRUPOS: Record<string, string> = {
  Alimentos: "#5CC46B",
  "Kit de aseo": "#4399CF",
  "Descanso y abrigo": "#B07BB8",
  "Ropa y calzado": "#B07BB8",
  "Menaje y utensilios": "#B07BB8",
  "Protección y seguridad": "#F08A1C",
  Mascotas: "#8DA32E",
};

export const colorDeGrupo = (nombre: string): string => GRUPOS[nombre] ?? "#0079C1";
