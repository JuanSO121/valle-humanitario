/**
 * lib/proxyTablero.ts
 * -----------------------------------------------------------------------
 * GET /api/tablero?route=...  —  el tablero le pide los datos al mismo
 * dominio del sitio, y el servidor se los sirve desde caché.
 *
 * POR QUÉ
 *
 * Cada consulta directa al Web App paga lo mismo aunque la caché de Apps
 * Script esté caliente: arranque de una ejecución, redirección 302 a
 * script.googleusercontent.com y dos conexiones TLS con Google. Eso no se
 * puede optimizar desde Code.gs. Acá la respuesta sale de una caché
 * cercana a la persona y Apps Script solo recibe una consulta cuando la
 * copia envejece.
 *
 * FUNCIONA EN LOS DOS DESTINOS DEL BUILD
 *
 * El proyecto se compila para Vercel (Node) y para Cloudflare Workers, y
 * cada uno cachea distinto:
 *
 *   Vercel      La CDN de Vercel guarda la respuesta según
 *               `Vercel-CDN-Cache-Control`: la sirve fresca 1 minuto y
 *               después la sigue sirviendo mientras revalida por detrás,
 *               hasta 24 h. Es la CDN la que hace el "servir viejo y
 *               refrescar", así que la función casi nunca se ejecuta.
 *
 *   Cloudflare  Los Workers corren ANTES de la caché, así que ese
 *               encabezado no aplica. Ahí se usa la Cache API
 *               (caches.default) y `waitUntil` para refrescar.
 *
 * En ambos hay además un Map en memoria de la instancia.
 *
 * LA REGLA QUE EVITA DATOS ETERNAMENTE VIEJOS
 *
 * Servir la copia vieja y refrescar "por detrás" solo es seguro si el
 * runtime garantiza que ese refresco termina (`waitUntil`). Sin esa
 * garantía, el refresco se corta al responder, la copia nunca se renueva
 * y, peor, la CDN la vuelve a guardar como fresca. Por eso, sin
 * `waitUntil`, una copia vencida NO se sirve: se espera a Apps Script.
 * En Vercel esa espera la hace la revalidación de la CDN, no la persona.
 *
 *   edad < 1 min                  copia (HIT)
 *   edad < 24 h y hay waitUntil   copia + refresco por detrás (STALE)
 *   edad < 24 h sin waitUntil     consulta y espera (REFRESH)
 *   sin copia                     consulta y espera (MISS)
 *   Apps Script cae               la última copia que haya (STALE-ERROR)
 *
 * El encabezado `x-tablero-cache` dice cuál pasó. En Vercel, además,
 * `x-vercel-cache` dice si respondió la CDN (HIT / STALE) o la función
 * (MISS).
 *
 * Las respuestas de error nunca se guardan en ningún nivel.
 *
 * CONFIGURACIÓN
 *
 * La URL /exec sale de la variable de entorno AYUDAS_API_URL (en `env` o
 * en process.env) o, si no existe, de VITE_AYUDAS_API_URL, que Vite
 * incrusta al compilar.
 * -----------------------------------------------------------------------
 */

const RUTA_PUBLICA = "/api/tablero";

/** Solo lo que existe en Code.gs. Cualquier otra cosa no llega a Google. */
const RUTAS_PERMITIDAS = new Set([
  "bundle",
  "meta",
  "origenes",
  "municipios",
  "categorias",
  "flujos",
  "destinos",
  "toneladas",
  "ayuda",
  "necesidades",
  "destino",
  "destino-logistica",
]);
const RUTAS_CON_ID = new Set(["destino", "destino-logistica"]);

const FRESCO_MS = 60 * 1000;
const VIGENCIA_MAXIMA_MS = 24 * 60 * 60 * 1000;
const TIEMPO_LIMITE_MS = 25 * 1000;
const MAX_EN_MEMORIA = 200;

/** Lo que lee la CDN de Vercel. El navegador no lo recibe. */
const CACHE_CDN = `public, s-maxage=${FRESCO_MS / 1000}, stale-while-revalidate=${
  VIGENCIA_MAXIMA_MS / 1000
}`;

interface Entrada {
  texto: string;
  guardadoEn: number;
}

type EsperarTarea = (tarea: Promise<unknown>) => void;

const memoria = new Map<string, Entrada>();
const enVuelo = new Map<string, Promise<Entrada>>();

export function esRutaDelTablero(url: URL): boolean {
  return url.pathname === RUTA_PUBLICA;
}

function urlDelWebApp(env: unknown): string | null {
  if (env && typeof env === "object") {
    const valor = (env as Record<string, unknown>)["AYUDAS_API_URL"];
    if (typeof valor === "string" && valor) return valor;
  }
  const proceso = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;
  const desdeProceso = proceso?.env?.["AYUDAS_API_URL"];
  if (desdeProceso) return desdeProceso;

  const vite = import.meta.env["VITE_AYUDAS_API_URL"];
  return typeof vite === "string" && vite ? vite : null;
}

/**
 * Busca `waitUntil` donde cada runtime lo deja: el tercer argumento del
 * fetch de Workers, la propia petición (srvx), o el contexto de
 * Cloudflare que Nitro cuelga de la petición. Si no aparece, no se
 * asume.
 */
function buscarWaitUntil(request: Request, ctx: unknown): EsperarTarea | null {
  const peticion = request as unknown as {
    waitUntil?: unknown;
    runtime?: { cloudflare?: { context?: unknown } };
    context?: unknown;
  };
  const candidatos: unknown[] = [
    ctx,
    peticion,
    peticion.runtime?.cloudflare?.context,
    peticion.context,
  ];
  for (const candidato of candidatos) {
    const fn = (candidato as { waitUntil?: unknown } | null | undefined)?.waitUntil;
    if (typeof fn === "function") {
      return (tarea) => (fn as EsperarTarea).call(candidato, tarea);
    }
  }
  return null;
}

// --- respuestas ---------------------------------------------------------

function responder(
  texto: string,
  estado: string,
  edadMs: number,
  opciones: { status?: number; cachearEnCdn?: boolean } = {},
): Response {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    // El navegador no guarda nada: la frescura la deciden la CDN, este
    // servidor y React Query.
    "cache-control": "no-store",
    "x-tablero-cache": estado,
    "x-tablero-edad": String(Math.round(edadMs / 1000)),
  };
  if (opciones.cachearEnCdn) {
    headers["vercel-cdn-cache-control"] = CACHE_CDN;
    headers["cdn-cache-control"] = CACHE_CDN;
  }
  return new Response(texto, { status: opciones.status ?? 200, headers });
}

/**
 * Mismo formato que errorResponse_ de Code.gs. Los errores de parámetros
 * van con HTTP 200, como allá. Nunca se cachean.
 */
function responderError(message: string, status: number, httpStatus = 200): Response {
  return responder(JSON.stringify({ error: true, status, message }), "ERROR", 0, {
    status: httpStatus,
  });
}

const esErrorDelScript = (texto: string) => /^\s*\{\s*"error"\s*:\s*true/.test(texto);

// --- caché del borde (solo Cloudflare) ----------------------------------

function cacheDelBorde(): Cache | null {
  const global = globalThis as unknown as { caches?: { default?: Cache } };
  return global.caches?.default ?? null;
}

async function leerDelBorde(clave: string): Promise<Entrada | null> {
  const cache = cacheDelBorde();
  if (!cache) return null;
  try {
    const respuesta = await cache.match(new Request(clave));
    if (!respuesta) return null;
    const guardadoEn = Number(respuesta.headers.get("x-guardado-en") ?? 0);
    if (!guardadoEn) return null;
    return { texto: await respuesta.text(), guardadoEn };
  } catch {
    return null;
  }
}

async function escribirEnBorde(clave: string, entrada: Entrada): Promise<void> {
  const cache = cacheDelBorde();
  if (!cache) return;
  try {
    await cache.put(
      new Request(clave),
      new Response(entrada.texto, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": `public, max-age=${VIGENCIA_MAXIMA_MS / 1000}`,
          "x-guardado-en": String(entrada.guardadoEn),
        },
      }),
    );
  } catch (error) {
    console.error("[tablero] No se pudo escribir en la caché del borde:", error);
  }
}

// --- memoria de la instancia --------------------------------------------

function recordar(clave: string, entrada: Entrada): void {
  memoria.delete(clave);
  memoria.set(clave, entrada);
  if (memoria.size > MAX_EN_MEMORIA) {
    const masVieja = memoria.keys().next().value;
    if (masVieja !== undefined) memoria.delete(masVieja);
  }
}

// --- Apps Script --------------------------------------------------------

async function consultarWebApp(base: string, params: Record<string, string>): Promise<Entrada> {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);
  try {
    const respuesta = await fetch(url.toString(), {
      redirect: "follow",
      signal: controlador.signal,
    });
    if (!respuesta.ok) throw new Error(`Apps Script respondió HTTP ${respuesta.status}`);

    const texto = await respuesta.text();
    const inicio = texto.trimStart();
    // Apps Script devuelve una página HTML cuando el script lanza una
    // excepción. Eso no es un dato y no se guarda.
    if (!inicio.startsWith("{") && !inicio.startsWith("[")) {
      throw new Error("Apps Script no devolvió JSON (probablemente una página de error)");
    }
    return { texto, guardadoEn: Date.now() };
  } finally {
    clearTimeout(limite);
  }
}

/** Una sola consulta a Google por clave, aunque lleguen muchas visitas juntas. */
function refrescar(clave: string, base: string, params: Record<string, string>): Promise<Entrada> {
  const existente = enVuelo.get(clave);
  if (existente) return existente;

  const tarea = consultarWebApp(base, params)
    .then(async (entrada) => {
      if (!esErrorDelScript(entrada.texto)) {
        recordar(clave, entrada);
        await escribirEnBorde(clave, entrada);
      }
      return entrada;
    })
    .finally(() => {
      enVuelo.delete(clave);
    });

  enVuelo.set(clave, tarea);
  return tarea;
}

// --- handler ------------------------------------------------------------

export async function manejarTablero(
  request: Request,
  env: unknown,
  ctx: unknown,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { allow: "GET, HEAD" } });
  }

  const base = urlDelWebApp(env);
  if (!base) {
    console.error("[tablero] Falta AYUDAS_API_URL / VITE_AYUDAS_API_URL en el servidor.");
    return responderError("El servidor no tiene configurada la URL del Web App.", 500, 500);
  }

  const url = new URL(request.url);
  const route = url.searchParams.get("route") ?? "";
  if (!RUTAS_PERMITIDAS.has(route)) {
    return responderError(`Ruta "${route}" no reconocida.`, 404);
  }

  const params: Record<string, string> = { route };
  if (RUTAS_CON_ID.has(route)) {
    const id = (url.searchParams.get("id") ?? "").trim();
    if (!id || id.length > 40 || !/^[\w-]+$/.test(id)) {
      return responderError('Falta el parámetro "id" o no es válido.', 400);
    }
    params["id"] = id;
  }

  // La clave se arma solo con los parámetros permitidos: un `?x=123`
  // agregado a mano no crea una entrada nueva en la memoria ni en el
  // borde.
  const clave = `${url.origin}${RUTA_PUBLICA}?${new URLSearchParams(params).toString()}`;
  const ahora = Date.now();
  const esperarTarea = buscarWaitUntil(request, ctx);

  let entrada = memoria.get(clave) ?? null;
  if (!entrada) {
    entrada = await leerDelBorde(clave);
    if (entrada) recordar(clave, entrada);
  }

  const vigente = entrada !== null && ahora - entrada.guardadoEn < VIGENCIA_MAXIMA_MS;

  if (entrada && vigente) {
    const edad = ahora - entrada.guardadoEn;

    if (edad < FRESCO_MS) {
      return responder(entrada.texto, "HIT", edad, { cachearEnCdn: true });
    }

    if (esperarTarea) {
      esperarTarea(
        refrescar(clave, base, params).catch((error) =>
          console.error(`[tablero] Refresco en segundo plano de ${route} falló:`, error),
        ),
      );
      // Vieja: no se le dice a la CDN que la guarde como fresca.
      return responder(entrada.texto, "STALE", edad);
    }
    // Sin waitUntil, se sigue al bloque de abajo y se espera.
  }

  try {
    const nueva = await refrescar(clave, base, params);
    const valida = !esErrorDelScript(nueva.texto);
    return responder(nueva.texto, entrada ? "REFRESH" : "MISS", 0, { cachearEnCdn: valida });
  } catch (error) {
    console.error(`[tablero] Consulta a Apps Script de ${route} falló:`, error);
    // Una copia vieja es mejor que una sección vacía, pero no se cachea.
    if (entrada) return responder(entrada.texto, "STALE-ERROR", ahora - entrada.guardadoEn);
    // HTTP 502 a propósito: la cola del frontend lo reintenta.
    return responderError("No se pudo consultar el Web App.", 502, 502);
  }
}