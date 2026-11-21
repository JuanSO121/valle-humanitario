/**
 * lib/proxyAdmin.ts
 * -----------------------------------------------------------------------
 * POST /api/admin  —  la carga de datos desde la página protegida /admin.
 *
 * El navegador manda un archivo de carga (JSON) y una clave. Este servidor
 * comprueba la clave y reenvía la carga al Apps Script con un token que
 * solo vive acá: ni la clave verdadera, ni el token, ni la URL del Apps
 * Script llegan jamás al navegador ni al build público.
 *
 * DOS SECRETOS, DOS CAPAS
 *
 *   ADMIN_CLAVE               la clave que escribe la persona en /admin.
 *   TABLERO_V2_ADMIN_TOKEN    el token que acepta el Apps Script (propiedad
 *                             ADMIN_TOKEN del script). Solo lo usa este servidor.
 *
 * Ambas se leen del entorno del servidor, sin el prefijo VITE_: así Vite no
 * las incrusta en el build (scripts/verificar-build.mjs lo comprueba).
 *
 * LO QUE PROTEGE
 *
 *   · Sin clave correcta no se llega al Apps Script.
 *   · Cinco claves incorrectas seguidas bloquean 15 minutos a esa dirección
 *     (en memoria de la instancia: frena adivinar, no es un muro).
 *   · Una clave incorrecta tarda casi un segundo en responder.
 *   · La clave se compara sin revelar en qué carácter falla.
 *   · Solo POST, solo del mismo sitio, con tope de tamaño. Nada se guarda en
 *     caché y nada se registra: ni la carga ni la clave.
 *
 * El Apps Script vuelve a validar todo y es quien escribe en el libro.
 * -----------------------------------------------------------------------
 */
import { urlDelWebApp } from "./proxyTablero";

const RUTA = "/api/admin";
const MAX_BYTES = 2_500_000;
const TIEMPO_LIMITE_MS = 55_000;
const MAX_FALLOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;
const ACCIONES = new Set(["revisar", "aplicar"]);

const intentos = new Map<string, { fallos: number; desde: number; hasta: number }>();

export function esRutaAdmin(url: URL): boolean {
  return url.pathname === RUTA;
}

function secreto(env: unknown, nombre: string): string | null {
  if (env && typeof env === "object") {
    const v = (env as Record<string, unknown>)[nombre];
    if (typeof v === "string" && v) return v;
  }
  const proceso = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;
  return proceso?.env?.[nombre] || null;
}

function responder(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      "x-content-type-options": "nosniff",
    },
  });
}

const error = (message: string, status: number) =>
  responder({ error: true, status, message }, status);

async function huella(texto: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(texto);
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
}

/** Compara dos textos sin que el tiempo dependa de dónde difieren. */
async function iguales(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([huella(a), huella(b)]);
  let diferencia = 0;
  for (let i = 0; i < x.length; i++) diferencia |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diferencia === 0;
}

function direccionDe(request: Request): string {
  const reenviada = request.headers.get("x-forwarded-for");
  return (reenviada?.split(",")[0] ?? "").trim() || "desconocida";
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

async function leerCuerpo(request: Request): Promise<string | null> {
  const declarado = Number(request.headers.get("content-length") ?? 0);
  if (declarado > MAX_BYTES) return null;
  const texto = await request.text();
  return new TextEncoder().encode(texto).length > MAX_BYTES ? null : texto;
}

export async function manejarAdmin(request: Request, env: unknown): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { allow: "POST" } });
  }

  const url = new URL(request.url);
  const origen = request.headers.get("origin");
  if (origen && origen !== url.origin) return error("Petición no permitida.", 403);

  const clave = secreto(env, "ADMIN_CLAVE");
  const token = secreto(env, "TABLERO_V2_ADMIN_TOKEN");
  const base = urlDelWebApp(env);
  if (!clave || clave.length < 12 || !token || token.length < 24 || !base) {
    console.error(
      "[admin] Falta configurar ADMIN_CLAVE, TABLERO_V2_ADMIN_TOKEN o la URL del Web App.",
    );
    return error("La carga de datos no está configurada.", 503);
  }

  const direccion = direccionDe(request);
  const estado = intentos.get(direccion);
  if (estado && estado.hasta > Date.now()) {
    return error("Demasiados intentos. Espere unos minutos e intente de nuevo.", 429);
  }

  const recibida = request.headers.get("x-admin-clave") ?? "";
  if (!(await iguales(recibida, clave))) {
    // Los fallos viejos (más de 15 minutos) ya no cuentan.
    const vigente = estado && Date.now() - estado.desde < BLOQUEO_MS;
    const fallos = (vigente ? estado.fallos : 0) + 1;
    intentos.set(direccion, {
      fallos,
      desde: vigente ? estado.desde : Date.now(),
      hasta: fallos >= MAX_FALLOS ? Date.now() + BLOQUEO_MS : 0,
    });
    await esperar(800);
    return error("La clave no es correcta.", 401);
  }
  intentos.delete(direccion);

  const texto = await leerCuerpo(request);
  if (texto === null) return error("El archivo es demasiado grande.", 413);

  let pedido: { accion?: unknown; carga?: unknown };
  try {
    pedido = JSON.parse(texto);
  } catch {
    return error("La petición no se pudo leer.", 400);
  }
  if (typeof pedido.accion !== "string" || !ACCIONES.has(pedido.accion)) {
    return error("Acción no permitida.", 400);
  }
  if (!pedido.carga || typeof pedido.carga !== "object" || Array.isArray(pedido.carga)) {
    return error("El archivo no tiene el formato esperado.", 400);
  }

  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);
  try {
    const respuesta = await fetch(base, {
      method: "POST",
      redirect: "follow",
      signal: controlador.signal,
      // text/plain: Apps Script lee el cuerpo tal cual y no hace falta preflight.
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token, accion: pedido.accion, carga: pedido.carga }),
    });
    const crudo = await respuesta.text();
    let datos: { error?: boolean; status?: number; message?: string } & Record<string, unknown>;
    try {
      datos = JSON.parse(crudo);
    } catch {
      console.error("[admin] El Apps Script no devolvió JSON (HTTP " + respuesta.status + ").");
      return error("No se pudo comunicar con el libro. Intente de nuevo en un momento.", 502);
    }
    if (datos.error === true) {
      if (datos.status === 401) {
        console.error("[admin] El Apps Script rechazó el token.");
        return error("El servidor no pudo identificarse ante el libro. Avise al encargado.", 502);
      }
      const estadoHttp =
        datos.status === 429 ? 429 : datos.status && datos.status < 500 ? 400 : 502;
      return error(String(datos.message ?? "No se pudo procesar la carga."), estadoHttp);
    }
    return responder(datos);
  } catch (e) {
    console.error(
      "[admin] Falló la llamada al Apps Script:",
      e instanceof Error ? e.name : "error",
    );
    return error("No se pudo comunicar con el libro. Intente de nuevo en un momento.", 502);
  } finally {
    clearTimeout(limite);
  }
}
