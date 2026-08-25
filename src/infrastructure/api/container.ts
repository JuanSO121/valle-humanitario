/**
 * container.ts
 * -----------------------------------------------------------------------
 * Punto único de instanciación de AyudasApiRepository. La razón de que
 * esto sea un archivo aparte y no `new AyudasApiRepository(...)` disperso
 * donde se necesite: la URL del Web App de Apps Script cambia entre
 * entornos (local, preview, producción) y es fácil de teclear mal a mano
 * cada vez. Un solo punto de lectura de la env var, un solo lugar donde
 * fallar fuerte si falta, y un solo lugar que reemplazar si algún día se
 * inyecta un repositorio mock en tests de integración de componentes.
 * -----------------------------------------------------------------------
 */
import { AyudasApiRepository } from "./AyudasApiRepository";

const baseUrl = import.meta.env["VITE_AYUDAS_API_URL"];

if (!baseUrl) {
  // Falla en el arranque, no en el primer click del usuario: es preferible
  // un error de build/dev-server claro a un fetch silencioso a "undefined"
  // que confunde con un problema de CORS o de datos.
  throw new Error(
    "Falta VITE_AYUDAS_API_URL — configurá la URL /exec del Web App de Apps Script en tu archivo .env.",
  );
}

export const ayudasApiRepository = new AyudasApiRepository(baseUrl);