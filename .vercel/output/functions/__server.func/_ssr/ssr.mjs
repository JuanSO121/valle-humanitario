//#region node_modules/.nitro/vite/services/ssr/index.js
var lastCapturedError;
var TTL_MS = 5e3;
function record(error) {
	lastCapturedError = {
		error,
		at: Date.now()
	};
}
var CAUSE_DEPTH_LIMIT = 5;
var DESCRIPTION_LENGTH_LIMIT = 8e3;
function describeError(error) {
	const parts = [];
	let current = error;
	for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
		if (!(current instanceof Error)) {
			parts.push(typeof current === "string" ? current : safeStringify(current));
			break;
		}
		const label = depth === 0 ? "" : "caused by: ";
		const status = describeStatus(current);
		parts.push(`${label}${current.stack ?? `${current.name}: ${current.message}`}${status}`);
		current = current.cause;
	}
	return parts.join("\n").slice(0, DESCRIPTION_LENGTH_LIMIT);
}
function describeStatus(error) {
	const { status, statusCode } = error;
	const value = status ?? statusCode;
	return typeof value === "number" ? ` (status ${value})` : "";
}
function safeStringify(value) {
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}
function isErrorLike(value) {
	return value instanceof Error;
}
var originalConsoleError = console.error.bind(console);
console.error = (...args) => {
	originalConsoleError(...args.map((arg) => {
		if (!isErrorLike(arg)) return arg;
		record(arg);
		return describeError(arg);
	}));
};
if (typeof globalThis.addEventListener === "function") {
	globalThis.addEventListener("error", (event) => record(event.error ?? event));
	globalThis.addEventListener("unhandledrejection", (event) => record(event.reason));
}
function consumeLastCapturedError() {
	if (!lastCapturedError) return void 0;
	if (Date.now() - lastCapturedError.at > TTL_MS) {
		lastCapturedError = void 0;
		return;
	}
	const { error } = lastCapturedError;
	lastCapturedError = void 0;
	return error;
}
function renderErrorPage() {
	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
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
* La URL /exec sale de la variable de entorno TABLERO_V2_API_URL (en `env` o
* en process.env) o, si no existe, de VITE_TABLERO_V2_API_URL, que Vite
* incrusta al compilar.
*
* El nombre lleva «V2» A PROPÓSITO: esta versión del sitio lee un backend
* distinto (el libro oficial nuevo) del que usa la versión publicada
* (AYUDAS_API_URL). Con nombres distintos, las dos pueden vivir en el mismo
* proyecto de despliegue sin pisarse, y esta rama nunca llama por error al
* backend viejo, cuyo formato de respuesta no entiende.
* -----------------------------------------------------------------------
*/
var RUTA_PUBLICA = "/api/tablero";
/** Solo lo que existe en Code.gs. Cualquier otra cosa no llega a Google. */
var RUTAS_PERMITIDAS = /* @__PURE__ */ new Set([
	"bundle",
	"resumen",
	"municipios",
	"otras",
	"categorias",
	"faltantes",
	"contratacion"
]);
var FRESCO_MS = 6e4;
var VIGENCIA_MAXIMA_MS = 864e5;
var TIEMPO_LIMITE_MS$1 = 25e3;
var MAX_EN_MEMORIA = 200;
/** Lo que lee la CDN de Vercel. El navegador no lo recibe. */
var CACHE_CDN = `public, s-maxage=${FRESCO_MS / 1e3}, stale-while-revalidate=${VIGENCIA_MAXIMA_MS / 1e3}`;
var memoria = /* @__PURE__ */ new Map();
var enVuelo = /* @__PURE__ */ new Map();
function esRutaDelTablero(url) {
	return url.pathname === RUTA_PUBLICA;
}
function urlDelWebApp(env) {
	if (env && typeof env === "object") {
		const valor = env["TABLERO_V2_API_URL"];
		if (typeof valor === "string" && valor) return valor;
	}
	const desdeProceso = globalThis.process?.env?.["TABLERO_V2_API_URL"];
	if (desdeProceso) return desdeProceso;
	const vite = {
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/"
	}["VITE_TABLERO_V2_API_URL"];
	return typeof vite === "string" && vite ? vite : null;
}
/**
* Busca `waitUntil` donde cada runtime lo deja: el tercer argumento del
* fetch de Workers, la propia petición (srvx), o el contexto de
* Cloudflare que Nitro cuelga de la petición. Si no aparece, no se
* asume.
*/
function buscarWaitUntil(request, ctx) {
	const peticion = request;
	const candidatos = [
		ctx,
		peticion,
		peticion.runtime?.cloudflare?.context,
		peticion.context
	];
	for (const candidato of candidatos) {
		const fn = candidato?.waitUntil;
		if (typeof fn === "function") return (tarea) => fn.call(candidato, tarea);
	}
	return null;
}
function responder$1(texto, estado, edadMs, opciones = {}) {
	const headers = {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
		"x-tablero-cache": estado,
		"x-tablero-edad": String(Math.round(edadMs / 1e3))
	};
	if (opciones.cachearEnCdn) {
		headers["vercel-cdn-cache-control"] = CACHE_CDN;
		headers["cdn-cache-control"] = CACHE_CDN;
	}
	return new Response(texto, {
		status: opciones.status ?? 200,
		headers
	});
}
/**
* Mismo formato que errorResponse_ de Code.gs. Los errores de parámetros
* van con HTTP 200, como allá. Nunca se cachean.
*/
function responderError(message, status, httpStatus = 200) {
	return responder$1(JSON.stringify({
		error: true,
		status,
		message
	}), "ERROR", 0, { status: httpStatus });
}
var esErrorDelScript = (texto) => /^\s*\{\s*"error"\s*:\s*true/.test(texto);
function cacheDelBorde() {
	return globalThis.caches?.default ?? null;
}
async function leerDelBorde(clave) {
	const cache = cacheDelBorde();
	if (!cache) return null;
	try {
		const respuesta = await cache.match(new Request(clave));
		if (!respuesta) return null;
		const guardadoEn = Number(respuesta.headers.get("x-guardado-en") ?? 0);
		if (!guardadoEn) return null;
		return {
			texto: await respuesta.text(),
			guardadoEn
		};
	} catch {
		return null;
	}
}
async function escribirEnBorde(clave, entrada) {
	const cache = cacheDelBorde();
	if (!cache) return;
	try {
		await cache.put(new Request(clave), new Response(entrada.texto, { headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": `public, max-age=${VIGENCIA_MAXIMA_MS / 1e3}`,
			"x-guardado-en": String(entrada.guardadoEn)
		} }));
	} catch (error) {
		console.error("[tablero] No se pudo escribir en la caché del borde:", error);
	}
}
function recordar(clave, entrada) {
	memoria.delete(clave);
	memoria.set(clave, entrada);
	if (memoria.size > MAX_EN_MEMORIA) {
		const masVieja = memoria.keys().next().value;
		if (masVieja !== void 0) memoria.delete(masVieja);
	}
}
async function consultarWebApp(base, params) {
	const url = new URL(base);
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	const controlador = new AbortController();
	const limite = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS$1);
	try {
		const respuesta = await fetch(url.toString(), {
			redirect: "follow",
			signal: controlador.signal
		});
		if (!respuesta.ok) throw new Error(`Apps Script respondió HTTP ${respuesta.status}`);
		const texto = await respuesta.text();
		const inicio = texto.trimStart();
		if (!inicio.startsWith("{") && !inicio.startsWith("[")) throw new Error("Apps Script no devolvió JSON (probablemente una página de error)");
		return {
			texto,
			guardadoEn: Date.now()
		};
	} finally {
		clearTimeout(limite);
	}
}
/** Una sola consulta a Google por clave, aunque lleguen muchas visitas juntas. */
function refrescar(clave, base, params) {
	const existente = enVuelo.get(clave);
	if (existente) return existente;
	const tarea = consultarWebApp(base, params).then(async (entrada) => {
		if (!esErrorDelScript(entrada.texto)) {
			recordar(clave, entrada);
			await escribirEnBorde(clave, entrada);
		}
		return entrada;
	}).finally(() => {
		enVuelo.delete(clave);
	});
	enVuelo.set(clave, tarea);
	return tarea;
}
async function manejarTablero(request, env, ctx) {
	if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, {
		status: 405,
		headers: { allow: "GET, HEAD" }
	});
	const base = urlDelWebApp(env);
	if (!base) {
		console.error("[tablero] Falta TABLERO_V2_API_URL / VITE_TABLERO_V2_API_URL en el servidor.");
		return responderError("El servidor no tiene configurada la URL del Web App.", 500, 500);
	}
	const url = new URL(request.url);
	const route = url.searchParams.get("route") ?? "";
	if (!RUTAS_PERMITIDAS.has(route)) return responderError(`Ruta "${route}" no reconocida.`, 404);
	const params = { route };
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
		if (edad < FRESCO_MS) return responder$1(entrada.texto, "HIT", edad, { cachearEnCdn: true });
		if (esperarTarea) {
			esperarTarea(refrescar(clave, base, params).catch((error) => console.error(`[tablero] Refresco en segundo plano de ${route} falló:`, error)));
			return responder$1(entrada.texto, "STALE", edad);
		}
	}
	try {
		const nueva = await refrescar(clave, base, params);
		const valida = !esErrorDelScript(nueva.texto);
		return responder$1(nueva.texto, entrada ? "REFRESH" : "MISS", 0, { cachearEnCdn: valida });
	} catch (error) {
		console.error(`[tablero] Consulta a Apps Script de ${route} falló:`, error);
		if (entrada) return responder$1(entrada.texto, "STALE-ERROR", ahora - entrada.guardadoEn);
		return responderError("No se pudo consultar el Web App.", 502, 502);
	}
}
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
var RUTA = "/api/admin";
var MAX_BYTES = 25e5;
var TIEMPO_LIMITE_MS = 55e3;
var MAX_FALLOS = 5;
var BLOQUEO_MS = 9e5;
var ACCIONES = /* @__PURE__ */ new Set(["revisar", "aplicar"]);
var intentos = /* @__PURE__ */ new Map();
function esRutaAdmin(url) {
	return url.pathname === RUTA;
}
function secreto(env, nombre) {
	if (env && typeof env === "object") {
		const v = env[nombre];
		if (typeof v === "string" && v) return v;
	}
	return globalThis.process?.env?.[nombre] || null;
}
function responder(cuerpo, status = 200) {
	return new Response(JSON.stringify(cuerpo), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
			"x-robots-tag": "noindex, nofollow",
			"x-content-type-options": "nosniff"
		}
	});
}
var error = (message, status) => responder({
	error: true,
	status,
	message
}, status);
async function huella(texto) {
	const bytes = new TextEncoder().encode(texto);
	return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
}
/** Compara dos textos sin que el tiempo dependa de dónde difieren. */
async function iguales(a, b) {
	const [x, y] = await Promise.all([huella(a), huella(b)]);
	let diferencia = 0;
	for (let i = 0; i < x.length; i++) diferencia |= (x[i] ?? 0) ^ (y[i] ?? 0);
	return diferencia === 0;
}
function direccionDe(request) {
	return (request.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "desconocida";
}
var esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
async function leerCuerpo(request) {
	if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return null;
	const texto = await request.text();
	return new TextEncoder().encode(texto).length > MAX_BYTES ? null : texto;
}
async function manejarAdmin(request, env) {
	if (request.method !== "POST") return new Response(null, {
		status: 405,
		headers: { allow: "POST" }
	});
	const url = new URL(request.url);
	const origen = request.headers.get("origin");
	if (origen && origen !== url.origin) return error("Petición no permitida.", 403);
	const clave = secreto(env, "ADMIN_CLAVE");
	const token = secreto(env, "TABLERO_V2_ADMIN_TOKEN");
	const base = urlDelWebApp(env);
	if (!clave || clave.length < 12 || !token || token.length < 24 || !base) {
		console.error("[admin] Falta configurar ADMIN_CLAVE, TABLERO_V2_ADMIN_TOKEN o la URL del Web App.");
		return error("La carga de datos no está configurada.", 503);
	}
	const direccion = direccionDe(request);
	const estado = intentos.get(direccion);
	if (estado && estado.hasta > Date.now()) return error("Demasiados intentos. Espere unos minutos e intente de nuevo.", 429);
	if (!await iguales(request.headers.get("x-admin-clave") ?? "", clave)) {
		const vigente = estado && Date.now() - estado.desde < BLOQUEO_MS;
		const fallos = (vigente ? estado.fallos : 0) + 1;
		intentos.set(direccion, {
			fallos,
			desde: vigente ? estado.desde : Date.now(),
			hasta: fallos >= MAX_FALLOS ? Date.now() + BLOQUEO_MS : 0
		});
		await esperar(800);
		return error("La clave no es correcta.", 401);
	}
	intentos.delete(direccion);
	const texto = await leerCuerpo(request);
	if (texto === null) return error("El archivo es demasiado grande.", 413);
	let pedido;
	try {
		pedido = JSON.parse(texto);
	} catch {
		return error("La petición no se pudo leer.", 400);
	}
	if (typeof pedido.accion !== "string" || !ACCIONES.has(pedido.accion)) return error("Acción no permitida.", 400);
	if (!pedido.carga || typeof pedido.carga !== "object" || Array.isArray(pedido.carga)) return error("El archivo no tiene el formato esperado.", 400);
	let decisiones = {};
	if (pedido.decisiones !== void 0 && pedido.decisiones !== null) {
		const d = pedido.decisiones;
		if (typeof d !== "object" || Array.isArray(d)) return error("Las decisiones no tienen el formato esperado.", 400);
		const entradas = Object.entries(d);
		if (entradas.length > 5e3 || entradas.some(([k, v]) => !/^\d{1,5}$/.test(k) || typeof v !== "string")) return error("Las decisiones no tienen el formato esperado.", 400);
		decisiones = Object.fromEntries(entradas);
	}
	const controlador = new AbortController();
	const limite = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);
	try {
		const respuesta = await fetch(base, {
			method: "POST",
			redirect: "follow",
			signal: controlador.signal,
			headers: { "content-type": "text/plain;charset=utf-8" },
			body: JSON.stringify({
				token,
				accion: pedido.accion,
				carga: pedido.carga,
				decisiones
			})
		});
		const crudo = await respuesta.text();
		let datos;
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
			const estadoHttp = datos.status === 429 ? 429 : datos.status && datos.status < 500 ? 400 : 502;
			return error(String(datos.message ?? "No se pudo procesar la carga."), estadoHttp);
		}
		return responder(datos);
	} catch (e) {
		console.error("[admin] Falló la llamada al Apps Script:", e instanceof Error ? e.name : "error");
		return error("No se pudo comunicar con el libro. Intente de nuevo en un momento.", 502);
	} finally {
		clearTimeout(limite);
	}
}
var serverEntryPromise;
async function getServerEntry() {
	if (!serverEntryPromise) serverEntryPromise = import("./server-D_aB8D0E.mjs").then((n) => n.t).then((m) => m.default ?? m);
	return serverEntryPromise;
}
async function normalizeCatastrophicSsrResponse(response) {
	if (response.status < 500) return response;
	if (!(response.headers.get("content-type") ?? "").includes("application/json")) return response;
	const body = await response.clone().text();
	if (!isH3SwallowedErrorBody(body)) return response;
	console.error(consumeLastCapturedError() ?? /* @__PURE__ */ new Error(`h3 swallowed SSR error: ${body}`));
	return new Response(renderErrorPage(), {
		status: 500,
		headers: { "content-type": "text/html; charset=utf-8" }
	});
}
function isH3SwallowedErrorBody(body) {
	try {
		const payload = JSON.parse(body);
		return payload.unhandled === true && payload.message === "HTTPError";
	} catch {
		return false;
	}
}
var server_default = { async fetch(request, env, ctx) {
	/**
	* Los datos del tablero se atienden ANTES de cargar TanStack Start.
	*
	* No pasan por el render ni por los middlewares, y su error se
	* responde como JSON: la página de error HTML de abajo es para
	* personas, y el repositorio del frontend no sabría leerla.
	*/
	const url = new URL(request.url);
	if (esRutaAdmin(url)) try {
		return await manejarAdmin(request, env);
	} catch (error) {
		console.error("[admin] Error inesperado:", error instanceof Error ? error.name : "error");
		return new Response(JSON.stringify({
			error: true,
			status: 500,
			message: "Error interno."
		}), {
			status: 500,
			headers: {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			}
		});
	}
	if (esRutaDelTablero(url)) try {
		return await manejarTablero(request, env, ctx);
	} catch (error) {
		console.error("[tablero] Error inesperado:", error);
		return new Response(JSON.stringify({
			error: true,
			status: 500,
			message: "Error interno del proxy."
		}), {
			status: 500,
			headers: {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			}
		});
	}
	try {
		return await normalizeCatastrophicSsrResponse(await (await getServerEntry()).fetch(request, env, ctx));
	} catch (error) {
		console.error(error);
		return new Response(renderErrorPage(), {
			status: 500,
			headers: { "content-type": "text/html; charset=utf-8" }
		});
	}
} };
//#endregion
export { server_default as default, renderErrorPage as t };
