/**
 * container.ts
 * -----------------------------------------------------------------------
 * Punto único de instanciación de AyudasApiRepository.
 *
 * CAMBIO: por defecto el tablero le pide los datos a /api/tablero, en el
 * mismo dominio del sitio, y no directo a Apps Script. Ese endpoint lo
 * atiende el worker con caché en el borde (ver lib/proxyTablero.ts).
 *
 * VITE_AYUDAS_PROXY=0 vuelve a la conexión directa con el Web App. Sirve
 * para desarrollo local sin worker, o para descartar el proxy si algo no
 * cuadra. En ese modo VITE_AYUDAS_API_URL es obligatoria.
 * -----------------------------------------------------------------------
 */
import { AyudasApiRepository } from "./AyudasApiRepository";

const URL_PROXY = "/api/tablero";

const usarProxy = import.meta.env["VITE_AYUDAS_PROXY"] !== "0";
const urlDirecta = import.meta.env["VITE_AYUDAS_API_URL"];

if (!usarProxy && !urlDirecta) {
  // Falla en el arranque, no en el primer clic: es preferible un error
  // claro a un fetch silencioso a "undefined".
  throw new Error(
    "VITE_AYUDAS_PROXY=0 exige VITE_AYUDAS_API_URL: configurá la URL /exec del Web App en tu .env.",
  );
}

export const ayudasApiRepository = new AyudasApiRepository(usarProxy ? URL_PROXY : urlDirecta);