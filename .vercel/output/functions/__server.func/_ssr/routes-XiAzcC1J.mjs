import { r as __toESM } from "../_runtime.mjs";
import { a as require_react, i as require_jsx_runtime, r as useQueryClient, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { C as Boxes, S as Building2, _ as FileText, b as ChevronDown, c as Menu, d as List, f as Landmark, g as HandHeart, h as HeartHandshake, l as Map$1, m as House, n as Warehouse, o as Package, r as Truck, t as X, u as MapPin, x as CalendarDays, y as ChevronLeft } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-XiAzcC1J.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
/**
* colaDePeticiones.ts
* -----------------------------------------------------------------------
* Limita cuántas peticiones al Web App viajan al mismo tiempo, y
* reintenta las que se caen por concurrencia.
*
* EL PROBLEMA
*
* Un Web App de Apps Script serializa las ejecuciones por usuario. El
* tablero monta ocho consultas a la vez —meta, origenes, municipios,
* categorias, flujos, destinos, toneladas, ayuda— y las que se pisan
* reciben un 404 de la infraestructura de Google, no del script.
*
* Ese 404 despista, porque parece que la ruta no existiera. No puede
* serlo: `jsonResponse_` usa ContentService, que siempre responde 200.
* Hasta `errorResponse_(..., 404)` devuelve un 200 con el 404 adentro del
* JSON. Un 404 de HTTP significa que la petición no llegó a ejecutarse.
*
* TRES CAMBIOS EN ESTA VERSIÓN
*
* 1. UNA SOLA EN VUELO.
*
*    Estaba en dos con el argumento de que la carga se sentía lenta en
*    serie. Pero Apps Script YA las serializa por dentro: las dos no se
*    atienden en paralelo, se atropellan. El paralelismo era aparente y
*    el costo, un 404 intermitente en una ruta al azar.
*
*    La carga tarda algo más. A cambio, ninguna sección se cae.
*
* 2. EL SEMÁFORO DEJA DE PERMITIR MÁS DEL MÁXIMO.
*
*    El `if` de la versión anterior tenía una carrera. Al liberarse un
*    cupo, el contador baja y se despierta al que esperaba, pero ese
*    despertar es un microtask: no retoma en el acto. En esa rendija,
*    una petición nueva encuentra el contador por debajo del máximo, se
*    salta la cola entera y ocupa el cupo. Cuando el que esperaba
*    retoma, suma igual, sin volver a comprobar nada.
*
*    Resultado: con el máximo en 2 llegaba a haber 3 en vuelo, y era
*    justo bajo carga —las ocho del arranque— cuando pasaba. La cola
*    fallaba precisamente en el escenario para el que existe.
*
*    Con `while` en vez de `if`, el que despierta vuelve a comprobar y,
*    si le ganaron el cupo, se vuelve a formar.
*
* 3. LA COLA REINTENTA LOS 404 DE INFRAESTRUCTURA.
*
*    React Query ya reintenta, pero espera un tiempo fijo y no sabe nada
*    de la cola: puede volver a disparar justo cuando el Web App sigue
*    ocupado. La cola sí sabe cuándo hay hueco, así que reintentar acá
*    es más barato y más certero.
*
*    Las dos capas se complementan. Esta cubre el atropello entre rutas;
*    la de React Query cubre lo que la cola no puede ver, como un corte
*    de red del lado de la persona.
*
*    El cupo se SUELTA mientras se espera entre intentos. Retenerlo
*    convertiría la espera de un reintento en una pausa para todas las
*    demás rutas.
* -----------------------------------------------------------------------
*/
/**
* Peticiones simultáneas como máximo.
*
* Subirlo no acelera nada: el Web App atiende de a una de todos modos.
* Lo único que cambia es cuántas se pisan.
*/
var MAX_EN_VUELO = 1;
/** Intentos adicionales cuando la respuesta parece un atropello. */
var REINTENTOS = 3;
/** Espera antes de cada reintento: 400 ms, 800, 1600. */
var espera = (intento) => Math.min(400 * 2 ** intento, 4e3);
/**
* Códigos que valen la pena reintentar.
*
* El 404 está acá por el motivo de arriba, y es el caso importante. Los
* demás son los de un backend momentáneamente saturado. Un 404 legítimo
* —una URL de despliegue mal escrita— también se reintenta tres veces,
* que son dos segundos perdidos una sola vez: barato comparado con
* perder una sección entera de la página.
*/
var ESTADOS_REINTENTABLES = /* @__PURE__ */ new Set([
	404,
	408,
	429,
	500,
	502,
	503,
	504
]);
var enVuelo = 0;
var esperando = [];
function liberarCupo() {
	enVuelo -= 1;
	const siguiente = esperando.shift();
	if (siguiente) siguiente();
}
/** Espera turno. El `while` es lo que sostiene el máximo, ver arriba. */
async function tomarCupo() {
	while (enVuelo >= MAX_EN_VUELO) await new Promise((liberar) => esperando.push(liberar));
	enVuelo += 1;
}
var dormir = (ms) => new Promise((seguir) => setTimeout(seguir, ms));
/**
* `true` si el resultado es una respuesta HTTP que conviene repetir.
*
* Se comprueba en tiempo de ejecución y no por tipos porque `enCola` es
* genérica: hoy solo la usa el `fetch` del repositorio, pero nada impide
* que mañana encole otra cosa, y en ese caso el resultado simplemente no
* es un `Response` y se devuelve tal cual.
*/
function convieneReintentar(resultado) {
	return typeof Response !== "undefined" && resultado instanceof Response && ESTADOS_REINTENTABLES.has(resultado.status);
}
/**
* Ejecuta `tarea` cuando haya cupo, y la repite si se cae por
* concurrencia.
*
* El cupo se libera pase lo que pase. Si una petición falla y no se
* libera, las que esperan quedan colgadas para siempre y la página se
* congela a medio cargar; por eso cada camino de salida pasa por
* `liberarCupo`.
*
* Lo que la tarea devuelva —incluida una respuesta con error tras
* agotar los intentos— sale de acá sin tocar, para que el repositorio
* haga su propio diagnóstico y React Query decida si reintenta.
*
* `etiqueta` es solo para el registro, pero hace toda la diferencia al
* diagnosticar. La cola recibe una función, no una URL, así que sin este
* dato el aviso decía "HTTP 404 en el intento 1" sin nombrar la ruta, y
* un tropiezo aislado se lee igual que una ruta rota. Con el nombre, dos
* avisos seguidos de la misma ruta ya son un patrón y no una casualidad.
*/
async function enCola(tarea, etiqueta = "petición") {
	let ultimoError = null;
	for (let intento = 0; intento <= REINTENTOS; intento += 1) {
		await tomarCupo();
		try {
			const resultado = await tarea();
			if (intento < REINTENTOS && convieneReintentar(resultado)) {
				liberarCupo();
				await dormir(espera(intento));
				continue;
			}
			liberarCupo();
			return resultado;
		} catch (error) {
			ultimoError = error;
			liberarCupo();
			if (intento >= REINTENTOS) break;
			await dormir(espera(intento));
		}
	}
	throw ultimoError ?? /* @__PURE__ */ new Error(`La ${etiqueta} falló tras 4 intentos de la cola.`);
}
/**
* Subir el sufijo cuando cambie la forma del contrato: las copias con la
* clave anterior dejan de leerse.
*/
var CLAVE = "ayudas:bundle:v1";
/** Pasado esto, la copia no se muestra: mejor esperar que enseñar algo muy viejo. */
var EDAD_MAXIMA_MS = 6048e5;
function hayAlmacenamiento() {
	return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}
/**
* Se guarda en un momento ocioso: serializar varios cientos de KB en
* medio del primer render le quitaría fluidez a la animación del mapa.
*/
function guardarSnapshot(bundle) {
	if (!hayAlmacenamiento()) return;
	const guardar = () => {
		try {
			const snapshot = {
				guardadoEn: Date.now(),
				bundle
			};
			window.localStorage.setItem(CLAVE, JSON.stringify(snapshot));
		} catch {}
	};
	const ocioso = window.requestIdleCallback;
	if (ocioso) ocioso(guardar, { timeout: 5e3 });
	else setTimeout(guardar, 1e3);
}
function leerSnapshot() {
	if (!hayAlmacenamiento()) return null;
	try {
		const texto = window.localStorage.getItem(CLAVE);
		if (!texto) return null;
		const snapshot = JSON.parse(texto);
		if (typeof snapshot.guardadoEn !== "number" || !snapshot.bundle) return null;
		if (Date.now() - snapshot.guardadoEn > EDAD_MAXIMA_MS) return null;
		return snapshot;
	} catch {
		return null;
	}
}
/**
* AyudasApiRepository.ts
* -----------------------------------------------------------------------
* Única clase que conoce la URL del Web App de Apps Script y el contrato
* `?route=...`. Nada fuera de este archivo debería construir esa URL a
* mano.
*
* CAMBIO: las nueve rutas del tablero viajan en UNA petición.
*
* Con la cola en MAX_EN_VUELO = 1, las nueve consultas del arranque
* salían en fila india, y cada una pagaba el arranque del Web App más la
* redirección a googleusercontent. Ese costo fijo, multiplicado por
* nueve, era la mayor parte de la espera.
*
* Ahora `getMeta()`, `getFlujos()`, etc. leen de `?route=bundle`. Las
* nueve llamadas simultáneas de los hooks comparten la misma promesa en
* vuelo, así que salen como una sola petición. Los hooks no cambian.
*
* RESPALDOS, en orden
*
*   · Si el Web App desplegado todavía no tiene `bundle` (responde "Ruta
*     no reconocida"), se usan las rutas individuales por el resto de la
*     sesión. Un deploy viejo sigue funcionando, solo más lento.
*   · Si el bundle llega pero una parte viene en null (el backend no
*     pudo armarla) o con forma inesperada, esa parte sola se pide por
*     su ruta.
*   · Si el bundle falla por red, el error sube tal cual y React Query
*     reintenta. Los reintentos de las nueve consultas vuelven a
*     compartir una sola petición.
*
* La validación de forma sigue existiendo por la misma razón de antes:
* un deploy o una caché desincronizados pueden servir un contrato viejo
* con HTTP 200, y es mejor fallar acá que en un `undefined.forEach`.
* -----------------------------------------------------------------------
*/
var ApiError = class extends Error {
	status;
	constructor(message, status) {
		super(message);
		this.status = status;
		this.name = "ApiError";
	}
};
/**
* Cuánto se reutiliza un bundle ya recibido.
*
* Existe para que las nueve consultas que React Query revalida juntas
* (al volver a la pestaña, por ejemplo) no disparen nueve peticiones si
* llegan con unos milisegundos de diferencia. Tiene que ser bastante
* menor que el staleTime de los hooks (5 min): si no, una revalidación
* devolvería el mismo dato viejo.
*/
var REUSO_BUNDLE_MS = 2e4;
var esObjeto = (p) => !!p && typeof p === "object" && !Array.isArray(p);
var esArrayDe = (que) => (p) => Array.isArray(p) ? null : `se esperaba un array de ${que}`;
var avisoPorFechaEmitido = false;
var validarFlujos = (p) => {
	if (!esObjeto(p)) return "se esperaba un objeto";
	if (!Array.isArray(p["flujos"])) return "falta el campo \"flujos\" (array)";
	if (!Array.isArray(p["excluidos"])) return "falta el campo \"excluidos\" (array)";
	const primerFlujo = p["flujos"][0];
	if (!avisoPorFechaEmitido && esObjeto(primerFlujo) && !Array.isArray(primerFlujo["porFecha"])) {
		avisoPorFechaEmitido = true;
		console.warn("route=flujos: los flujos no traen \"porFecha\" (array). Probablemente la implementación del Web App está desactualizada. El mapa y los arcos funcionan igual; las secciones por fecha y el timeline quedan sin datos hasta que se re-implemente (\"Nueva versión\") y se corra precalentarAhora().");
	}
	return null;
};
var VALIDADORES = {
	meta: (p) => esObjeto(p) && esObjeto(p["totales"]) ? null : "falta el campo \"totales\"",
	origenes: esArrayDe("orígenes"),
	municipios: esArrayDe("municipios"),
	categorias: esArrayDe("categorías"),
	flujos: validarFlujos,
	destinos: esArrayDe("destinos"),
	toneladas: (p) => {
		if (!esObjeto(p)) return "se esperaba un objeto";
		if (!Array.isArray(p["serie"])) return "falta el campo \"serie\" (array)";
		if (typeof p["total"] !== "number") return "falta el campo \"total\" (número)";
		return null;
	},
	ayuda: (p) => {
		if (!esObjeto(p)) return "se esperaba un objeto";
		if (!Array.isArray(p["categorias"])) return "falta el campo \"categorias\" (array)";
		if (!Array.isArray(p["poblaciones"])) return "falta el campo \"poblaciones\" (array)";
		if (!Array.isArray(p["canales"])) return "falta el campo \"canales\" (array)";
		return null;
	},
	necesidades: (p) => {
		if (!esObjeto(p)) return "se esperaba un objeto";
		if (!Array.isArray(p["secciones"])) return "falta el campo \"secciones\" (array)";
		return null;
	}
};
/**
* Valida una parte del tablero. Exportada para que la copia guardada en
* el navegador pase por la misma regla antes de mostrarse.
*/
function validarParte(clave, valor) {
	return VALIDADORES[clave](valor);
}
var validarBundle = (p) => esObjeto(p) && "meta" in p ? null : "se esperaba un objeto con las partes del tablero";
/** El backend responde así cuando el deploy no conoce la ruta. */
var esRutaNoReconocida = (error) => error instanceof ApiError && error.status === 404 && /no reconocida/i.test(error.message);
var AyudasApiRepository = class {
	baseUrl;
	bundleEnVuelo = null;
	bundleUltimo = null;
	bundleObtenidoEn = 0;
	bundleNoDisponible = false;
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
	}
	async request(route, params = {}, validateShape) {
		const origen = typeof window !== "undefined" ? window.location.origin : "http://localhost";
		const url = new URL(this.baseUrl, origen);
		url.searchParams.set("route", route);
		for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
		const response = await enCola(() => fetch(url.toString(), { cache: "no-store" }), `route=${route}`);
		if (!response.ok) throw new ApiError(`Error de red en route=${route}: HTTP ${response.status}`, response.status);
		const payload = await response.json();
		if (esObjeto(payload) && payload["error"]) {
			const p = payload;
			throw new ApiError(p.message ?? `Error desconocido en route=${route}`, p.status ?? 500);
		}
		if (validateShape) {
			const problem = validateShape(payload);
			if (problem) throw new ApiError(`Respuesta con forma inesperada en route=${route}: ${problem}. Es probable que la implementación del Web App esté desactualizada respecto al código fuente. Revisá "Implementar → Gestionar implementaciones" y corré precalentarAhora() si hace falta.`, 502);
		}
		return payload;
	}
	/** Una sola petición compartida por todas las consultas que lleguen juntas. */
	obtenerBundle() {
		if (this.bundleUltimo && Date.now() - this.bundleObtenidoEn < REUSO_BUNDLE_MS) return Promise.resolve(this.bundleUltimo);
		if (this.bundleEnVuelo) return this.bundleEnVuelo;
		this.bundleEnVuelo = this.request("bundle", {}, validarBundle).then((bundle) => {
			this.bundleUltimo = bundle;
			this.bundleObtenidoEn = Date.now();
			guardarSnapshot(bundle);
			return bundle;
		}).finally(() => {
			this.bundleEnVuelo = null;
		});
		return this.bundleEnVuelo;
	}
	/**
	* Una parte del tablero: del bundle si se puede, de su ruta si no.
	*/
	async parte(clave, individual) {
		if (!this.bundleNoDisponible) {
			let bundle;
			try {
				bundle = await this.obtenerBundle();
			} catch (error) {
				if (!esRutaNoReconocida(error)) throw error;
				this.bundleNoDisponible = true;
				return individual();
			}
			const valor = bundle[clave];
			if (valor !== null && valor !== void 0) {
				if (!validarParte(clave, valor)) return valor;
			}
		}
		return individual();
	}
	getMeta() {
		return this.parte("meta", () => this.request("meta", {}, VALIDADORES.meta));
	}
	getOrigenes() {
		return this.parte("origenes", () => this.request("origenes", {}, VALIDADORES.origenes));
	}
	getMunicipios() {
		return this.parte("municipios", () => this.request("municipios", {}, VALIDADORES.municipios));
	}
	getCategorias() {
		return this.parte("categorias", () => this.request("categorias", {}, VALIDADORES.categorias));
	}
	getFlujos() {
		return this.parte("flujos", () => this.request("flujos", {}, VALIDADORES.flujos));
	}
	/**
	* Serie diaria de toneladas, de la hoja TONELADAS. Si falla, el tablero
	* cae al estimado por entregas (ver useToneladas y OperacionContext).
	*/
	getToneladas() {
		return this.parte("toneladas", () => this.request("toneladas", {}, VALIDADORES.toneladas));
	}
	/**
	* Composición de lo entregado, grupos atendidos y canales. Las
	* unidades salen de DETALLE_PRODUCTO (`fuente: "DETALLE_PRODUCTO"`);
	* si llega "ENVIOS_CATEGORIA", el deploy es anterior al cambio de
	* fuente y las cifras son las viejas.
	*/
	getAyuda() {
		return this.parte("ayuda", () => this.request("ayuda", {}, VALIDADORES.ayuda));
	}
	/**
	* Lo que falta hoy en el centro de acopio. Es la única parte que NO se
	* guarda en el navegador (ver usePrecargaDesdeSnapshot): una lista de
	* necesidades vieja manda a la gente a donar lo que ya sobra.
	*/
	getNecesidades() {
		return this.parte("necesidades", () => this.request("necesidades", {}, VALIDADORES.necesidades));
	}
	getDestinos() {
		return this.parte("destinos", () => this.request("destinos", {}, VALIDADORES.destinos));
	}
	/** Vista PRINCIPAL de un destino. Va sola: depende del clic. */
	getDestino(id) {
		return this.request("destino", { id });
	}
	/** Vista SECUNDARIA, solo DESPACHOS. Nunca sumar contra getDestino(). */
	getDestinoLogistica(id) {
		return this.request("destino-logistica", { id });
	}
};
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
var URL_PROXY = "/api/tablero";
var usarProxy = {
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
	"TSS_SERVER_FN_BASE": "/_serverFn/",
	"VITE_APPS_SCRIPT_DATASET_URL": "https://script.google.com/macros/s/AKfycbwhOldfRLhGJ5Cs__slx67sksp_SzShMwYP4dd_7F8xfiOPq_zpuhZqSQZeppbxi8U/exec",
	"VITE_AYUDAS_API_URL": "https://script.google.com/macros/s/AKfycbwhOldfRLhGJ5Cs__slx67sksp_SzShMwYP4dd_7F8xfiOPq_zpuhZqSQZeppbxi8U/exec"
}["VITE_AYUDAS_PROXY"] !== "0";
var urlDirecta = {
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
	"TSS_SERVER_FN_BASE": "/_serverFn/",
	"VITE_APPS_SCRIPT_DATASET_URL": "https://script.google.com/macros/s/AKfycbwhOldfRLhGJ5Cs__slx67sksp_SzShMwYP4dd_7F8xfiOPq_zpuhZqSQZeppbxi8U/exec",
	"VITE_AYUDAS_API_URL": "https://script.google.com/macros/s/AKfycbwhOldfRLhGJ5Cs__slx67sksp_SzShMwYP4dd_7F8xfiOPq_zpuhZqSQZeppbxi8U/exec"
}["VITE_AYUDAS_API_URL"];
if (!usarProxy && !urlDirecta) throw new Error("VITE_AYUDAS_PROXY=0 exige VITE_AYUDAS_API_URL: configurá la URL /exec del Web App en tu .env.");
var ayudasApiRepository = new AyudasApiRepository(usarProxy ? URL_PROXY : urlDirecta);
/**
* useCatalogQueries.ts
* -----------------------------------------------------------------------
* Los seis GET sin parámetros (meta, origenes, municipios, categorias,
* flujos, destinos) comparten exactamente la misma forma: una queryKey de
* un elemento, un queryFn que llama al repositorio, y el mismo staleTime.
* Consolidarlos en una fábrica evita que, con el tiempo, alguien le
* cambie el staleTime a uno solo y los seis queden desalineados sin que
* nadie lo note en review.
*
* SOBRE EL staleTime: antes eran 6 horas, igual al TTL de CacheLayer.gs.
* El razonamiento era que revalidar más seguido que el backend solo
* produce requests que devuelven lo mismo. Es cierto, pero tiene una
* consecuencia que costó caro: cuando se corrige el Excel y se invalida
* la caché del backend, una pestaña abierta sigue mostrando lo viejo
* durante 6 horas. Para un dataset que se actualiza a diario, 5 minutos
* es un intercambio mejor.
*
* Si esto se cambia, cambiar también CONFIG.CACHE.TTL_SECONDS en
* Config.gs: el frontend nunca puede ser más fresco que el backend.
*
* CAMBIO: los seis reintentan, igual que useAyuda y useToneladas.
*
* Apps Script serializa las ejecuciones por usuario y el tablero monta
* ocho consultas a la vez. Las que se pisan reciben un 404 de la
* infraestructura de Google, no del script, y sin reintento ese fallo de
* un segundo se vuelve permanente para toda la sesión.
*
* El síntoma es distinto en cada ruta y ninguno se parece a un error de
* red: sin `municipios` las zonas caen al catálogo estático, sin
* `toneladas` el peso cae al estimado, sin `ayuda` desaparecen las
* cuatro rutas del balance. Tres bugs de datos aparentes, una sola causa.
*
* La espera creciente importa: sin ella los tres reintentos salen casi
* juntos y se vuelven a pisar entre sí, que es justo lo que se quiere
* evitar.
* -----------------------------------------------------------------------
*/
var CATALOG_STALE_TIME_MS$1 = 3e5;
/** Espera creciente entre intentos: 1s, 2s, 4s, con tope de 8. */
var REINTENTO_ESCALONADO$1 = (intento) => Math.min(1e3 * 2 ** intento, 8e3);
function createCatalogQuery(key, fetcher) {
	return function useThisCatalogQuery() {
		return useQuery({
			queryKey: [key],
			queryFn: fetcher,
			staleTime: CATALOG_STALE_TIME_MS$1,
			refetchOnWindowFocus: true,
			retry: 3,
			retryDelay: REINTENTO_ESCALONADO$1
		});
	};
}
var useOrigenes = createCatalogQuery("origenes", () => ayudasApiRepository.getOrigenes());
var useMunicipios = createCatalogQuery("municipios", () => ayudasApiRepository.getMunicipios());
var useFlujos = createCatalogQuery("flujos", () => ayudasApiRepository.getFlujos());
var useDestinos = createCatalogQuery("destinos", () => ayudasApiRepository.getDestinos());
/**
* municipalityName.ts
* -----------------------------------------------------------------------
* Normalización de NOMBRES de municipio para comparar texto contra texto.
*
* Existe porque `normId` (@/lib/id) NO sirve para esto: solo recorta
* ceros a la izquierda de IDs numéricos, no hace case-fold ni saca
* tildes. Usarlo para comparar "Riofrío" contra "RIOFRIO" da falso
* negativo — ese era el bug que impedía que el polígono del municipio
* quedara resaltado al seleccionar su destino en el mapa.
*
* Para unir contra el GeoJSON de límites municipales seguí usando el
* código DANE (getTerritoryStatByCode). Esto es solo el fallback para
* cuando del otro lado no hay código (ej. DestinoResumenLista, que trae
* id/nombre/lat/lon/tipo y nada más).
* -----------------------------------------------------------------------
*/
/** Alias entre el nombre oficial DANE y el de uso corriente, en ambos sentidos. */
var NAME_ALIASES$1 = [["Guadalajara de Buga", "Buga"], ["Santiago de Cali", "Cali"]];
function normMunicipalityName$1(name) {
	return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
}
var ALIAS_MAP = /* @__PURE__ */ new Map();
for (const [a, b] of NAME_ALIASES$1) {
	ALIAS_MAP.set(normMunicipalityName$1(a), normMunicipalityName$1(b));
	ALIAS_MAP.set(normMunicipalityName$1(b), normMunicipalityName$1(a));
}
/** true si los dos nombres designan el mismo municipio, tildes y alias incluidos. */
function sameMunicipality(a, b) {
	if (!a || !b) return false;
	const na = normMunicipalityName$1(a);
	const nb = normMunicipalityName$1(b);
	return na === nb || ALIAS_MAP.get(na) === nb;
}
/** La escala del mapa, de menos a más volumen. Es diseño, no dato. */
var TERRITORY_BLUE_RAMP = [
	"#0F3149",
	"#175A80",
	"#2181B4",
	"#3FAEDC",
	"#86D3F0",
	"#C6ECFB"
];
/**
* Los 41 municipios con su zona, como respaldo de `route=municipios`.
*
* Santiago de Cali queda fuera a propósito: va por su propio canal y no
* entra en el consolidado municipal, por instrucción expresa.
*
* NO agregar cifras a esta lista. Todo lo cuantitativo viene de la API.
*/
var territoryMunicipalities = [
	{
		name: "Alcalá",
		codigoDane: "76020",
		zone: "Norte"
	},
	{
		name: "Andalucía",
		codigoDane: "76036",
		zone: "Centro"
	},
	{
		name: "Ansermanuevo",
		codigoDane: "76041",
		zone: "Norte"
	},
	{
		name: "Argelia",
		codigoDane: "76054",
		zone: "Norte"
	},
	{
		name: "Bolívar",
		codigoDane: "76100",
		zone: "Norte"
	},
	{
		name: "Buenaventura",
		codigoDane: "76109",
		zone: "Pacífico"
	},
	{
		name: "Bugalagrande",
		codigoDane: "76113",
		zone: "Centro"
	},
	{
		name: "Caicedonia",
		codigoDane: "76122",
		zone: "Norte"
	},
	{
		name: "Calima - El Darién",
		codigoDane: "76126",
		zone: "Centro"
	},
	{
		name: "Candelaria",
		codigoDane: "76130",
		zone: "Sur"
	},
	{
		name: "Cartago",
		codigoDane: "76147",
		zone: "Norte"
	},
	{
		name: "Dagua",
		codigoDane: "76233",
		zone: "Pacífico"
	},
	{
		name: "El Cairo",
		codigoDane: "76246",
		zone: "Norte"
	},
	{
		name: "El Cerrito",
		codigoDane: "76248",
		zone: "Centro"
	},
	{
		name: "El Dovio",
		codigoDane: "76250",
		zone: "Norte"
	},
	{
		name: "El Águila",
		codigoDane: "76243",
		zone: "Norte"
	},
	{
		name: "Florida",
		codigoDane: "76275",
		zone: "Sur"
	},
	{
		name: "Ginebra",
		codigoDane: "76306",
		zone: "Centro"
	},
	{
		name: "Guacarí",
		codigoDane: "76318",
		zone: "Centro"
	},
	{
		name: "Guadalajara de Buga",
		codigoDane: "76111",
		zone: "Centro"
	},
	{
		name: "Jamundí",
		codigoDane: "76364",
		zone: "Sur"
	},
	{
		name: "La Cumbre",
		codigoDane: "76377",
		zone: "Sur"
	},
	{
		name: "La Unión",
		codigoDane: "76400",
		zone: "Norte"
	},
	{
		name: "La Victoria",
		codigoDane: "76403",
		zone: "Norte"
	},
	{
		name: "Obando",
		codigoDane: "76497",
		zone: "Norte"
	},
	{
		name: "Palmira",
		codigoDane: "76520",
		zone: "Sur"
	},
	{
		name: "Pradera",
		codigoDane: "76563",
		zone: "Sur"
	},
	{
		name: "Restrepo",
		codigoDane: "76606",
		zone: "Centro"
	},
	{
		name: "Riofrío",
		codigoDane: "76616",
		zone: "Centro"
	},
	{
		name: "Roldanillo",
		codigoDane: "76622",
		zone: "Norte"
	},
	{
		name: "San Pedro",
		codigoDane: "76670",
		zone: "Centro"
	},
	{
		name: "Sevilla",
		codigoDane: "76736",
		zone: "Norte"
	},
	{
		name: "Toro",
		codigoDane: "76823",
		zone: "Norte"
	},
	{
		name: "Trujillo",
		codigoDane: "76828",
		zone: "Centro"
	},
	{
		name: "Tuluá",
		codigoDane: "76834",
		zone: "Centro"
	},
	{
		name: "Ulloa",
		codigoDane: "76845",
		zone: "Norte"
	},
	{
		name: "Versalles",
		codigoDane: "76863",
		zone: "Norte"
	},
	{
		name: "Vijes",
		codigoDane: "76869",
		zone: "Centro"
	},
	{
		name: "Yotoco",
		codigoDane: "76890",
		zone: "Centro"
	},
	{
		name: "Yumbo",
		codigoDane: "76892",
		zone: "Sur"
	},
	{
		name: "Zarzal",
		codigoDane: "76895",
		zone: "Norte"
	}
];
/**
* Normaliza un nombre de municipio para comparar TEXTO contra texto,
* cuando no hay código DANE a mano del otro lado. Nunca usar esto para
* unir contra el GeoJSON de límites: ahí va `getTerritoryStatByCode`, que
* no depende de mayúsculas ni tildes.
*/
function normMunicipalityName(name) {
	return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
}
/**
* Nombres que aparecen escritos de más de una forma en las fuentes.
*
* "Calima" es el que faltaba: DETALLE_PRODUCTO lo escribe corto y
* CAT_DESTINOS largo, así que cuando el respaldo entraba en juego ese
* municipio se quedaba sin zona y caía en el grupo "Sin zona" de la
* galería. El backend ya lo resuelve con CONFIG.DESTINO_ALIAS; acá hacía
* falta el equivalente.
*/
var NAME_ALIASES = /* @__PURE__ */ new Map([
	[normMunicipalityName("Guadalajara de Buga"), "Buga"],
	[normMunicipalityName("Buga"), "Guadalajara de Buga"],
	[normMunicipalityName("Cali"), "Santiago de Cali"],
	[normMunicipalityName("Calima"), "Calima - El Darién"],
	[normMunicipalityName("Calima - El Darién"), "Calima"],
	[normMunicipalityName("Calima El Darién"), "Calima - El Darién"]
]);
new Map(territoryMunicipalities.map((m) => [m.codigoDane, m]));
var territoryByName = new Map(territoryMunicipalities.map((m) => [normMunicipalityName(m.name), m]));
/** Respaldo por nombre, para cuando no hay código DANE del otro lado. */
function getTerritoryStat(name) {
	const key = normMunicipalityName(name);
	const directo = territoryByName.get(key);
	if (directo) return directo;
	const alias = NAME_ALIASES.get(key);
	return alias ? territoryByName.get(normMunicipalityName(alias)) : void 0;
}
var CALI = "Santiago de Cali";
var MESES = [
	"enero",
	"febrero",
	"marzo",
	"abril",
	"mayo",
	"junio",
	"julio",
	"agosto",
	"septiembre",
	"octubre",
	"noviembre",
	"diciembre"
];
/**
* Último recurso, solo si la hoja TONELADAS no responde en absoluto.
*
* Antes esto era la fuente normal del peso por municipio, importada de
* territoryTime. Ahora el factor se deriva de la serie medida y esta
* constante solo actúa cuando no hay serie: sin ella, un fallo de
* `route=toneladas` dejaría todas las toneladas en cero, que se lee como
* un dato real y no como un dato ausente.
*/
var PESO_DE_RESPALDO = 1.3;
var OPERACION_VACIA = {
	fechas: [],
	jornadas: [],
	municipios: [],
	totalEntregas: 0,
	entregasConFecha: 0,
	entregasSinFecha: 0,
	totalToneladas: 0,
	toneladasMunicipales: 0,
	entregasTodas: 0,
	entregasSinCoordenada: 0,
	entregasTotales: 0,
	pesoPorEntrega: 0,
	factorMunicipal: 1,
	diasSinPesoMedido: [],
	municipiosAtendidos: 0,
	municipiosTotales: territoryMunicipalities.length,
	diasConEntrega: 0,
	primeraFecha: null,
	ultimaFecha: null,
	fechaCorteLarga: "",
	rangoLargo: "",
	picoEntregas: null,
	picoCobertura: null,
	entregasPorOrigen: [],
	entregasCali: 0,
	catalogo: [],
	zonas: [],
	toneladasMedidas: false
};
/** Comparación de nombres sin tildes ni mayúsculas. */
function normalizar$1(nombre) {
	return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
/**
* "2026-09-03" a "3 de septiembre de 2026".
*
* Lee el MES de la fecha en vez de asumirlo. La versión anterior de las
* tarjetas escribía "de agosto" a mano, así que la primera entrega a
* Candelaria, del 3 de septiembre, se publicaba como "3 de agosto": una
* semana antes del terremoto que originó la operación.
*/
function fechaLarga(iso) {
	if (!iso) return "";
	const [anio, mes, dia] = iso.split("-");
	const nombreMes = MESES[Number(mes) - 1];
	if (!anio || !dia || !nombreMes) return iso;
	return `${Number(dia)} de ${nombreMes} de ${anio}`;
}
/** "3 de septiembre", sin el año. Para rótulos y notas cortas. */
function fechaCorta(iso) {
	if (!iso) return "";
	const [, mes, dia] = iso.split("-");
	const nombreMes = MESES[Number(mes) - 1];
	if (!dia || !nombreMes) return iso;
	return `${Number(dia)} de ${nombreMes}`;
}
function diaDe(iso) {
	return iso.slice(-2);
}
/** Solo los pares que llegan a un municipio del Valle. Cali va aparte. */
function esMunicipal(f) {
	if (f.destino.tipo !== "municipio") return false;
	return !sameMunicipality(f.destino.nombre, CALI);
}
function derivarOperacion(flujos, serieToneladas, municipiosApi, excluidos) {
	const medidas = new Map((serieToneladas ?? []).map((p) => [p.dia, p]));
	const hayMedidas = medidas.size > 0;
	const catalogo = (municipiosApi ?? []).filter((m) => !sameMunicipality(m.nombre, CALI)).map((m) => ({
		codigoDane: String(m.codigoDane),
		nombre: m.nombre,
		zona: m.subregion || "Sin zona"
	}));
	const catalogoFinal = catalogo.length > 0 ? catalogo : territoryMunicipalities.map((m) => ({
		codigoDane: m.codigoDane,
		nombre: m.name,
		zona: m.zone
	}));
	const zonaPorNombre = new Map(catalogoFinal.map((m) => [normalizar$1(m.nombre), m.zona]));
	const codigoPorNombre = new Map(catalogoFinal.map((m) => [normalizar$1(m.nombre), m.codigoDane]));
	if (!flujos || flujos.length === 0) return OPERACION_VACIA;
	const municipales = flujos.filter(esMunicipal);
	const porDestino = /* @__PURE__ */ new Map();
	for (const f of municipales) {
		const clave = normalizar$1(f.destino.nombre);
		const actual = porDestino.get(f.destino.id) ?? {
			destinoId: f.destino.id,
			nombre: f.destino.nombre,
			codigoDane: codigoPorNombre.get(clave) ?? getTerritoryStat(f.destino.nombre)?.codigoDane ?? null,
			zona: zonaPorNombre.get(clave) ?? getTerritoryStat(f.destino.nombre)?.zone ?? null,
			entregas: 0,
			toneladas: 0,
			dias: {},
			primeraFecha: null,
			ultimaFecha: null
		};
		actual.entregas += f.despachosCount;
		for (const punto of f.porFecha ?? []) {
			const dia = diaDe(punto.fecha);
			actual.dias[dia] = (actual.dias[dia] ?? 0) + punto.despachosCount;
			if (!actual.primeraFecha || punto.fecha < actual.primeraFecha) actual.primeraFecha = punto.fecha;
			if (!actual.ultimaFecha || punto.fecha > actual.ultimaFecha) actual.ultimaFecha = punto.fecha;
		}
		porDestino.set(f.destino.id, actual);
	}
	const porFecha = /* @__PURE__ */ new Map();
	for (const f of municipales) for (const punto of f.porFecha ?? []) {
		const acc = porFecha.get(punto.fecha) ?? {
			entregas: 0,
			destinos: /* @__PURE__ */ new Set()
		};
		acc.entregas += punto.despachosCount;
		acc.destinos.add(f.destino.id);
		porFecha.set(punto.fecha, acc);
	}
	const fechas = [...porFecha.keys()].sort();
	const vistos = /* @__PURE__ */ new Set();
	const diasSinPesoMedido = [];
	let acumuladoEntregas = 0;
	let acumuladoToneladas = 0;
	const nombrePorId = new Map([...porDestino.values()].map((m) => [m.destinoId, m.nombre]));
	const jornadas = fechas.map((fecha) => {
		const acc = porFecha.get(fecha);
		const nuevos = [...acc.destinos].filter((id) => !vistos.has(id));
		nuevos.forEach((id) => vistos.add(id));
		acumuladoEntregas += acc.entregas;
		const punto = medidas.get(diaDe(fecha));
		if (!punto) diasSinPesoMedido.push(fecha);
		const toneladas = punto ? punto.toneladas : 0;
		acumuladoToneladas += toneladas;
		return {
			fecha,
			dia: diaDe(fecha),
			fechaLarga: fechaLarga(fecha),
			entregas: acc.entregas,
			municipios: acc.destinos.size,
			nuevos: nuevos.length,
			nombresNuevos: nuevos.map((id) => nombrePorId.get(id) ?? id).sort((a, b) => a.localeCompare(b, "es")),
			acumuladoEntregas,
			toneladas,
			acumuladoToneladas,
			pesoMedido: Boolean(punto)
		};
	});
	const entregasTodas = flujos.reduce((sum, f) => sum + f.despachosCount, 0);
	const entregasSinCoordenada = excluidos?.length ?? 0;
	const entregasTotales = entregasTodas + entregasSinCoordenada;
	const pesoPorEntrega = hayMedidas && entregasTotales > 0 ? acumuladoToneladas / entregasTotales : PESO_DE_RESPALDO;
	const totalToneladas = hayMedidas ? acumuladoToneladas : Math.round(entregasTotales * PESO_DE_RESPALDO);
	const municipios = [...porDestino.values()].map((m) => ({
		...m,
		toneladas: Math.round(m.entregas * pesoPorEntrega)
	})).sort((a, b) => b.entregas - a.entregas || a.nombre.localeCompare(b.nombre, "es"));
	const porOrigen = /* @__PURE__ */ new Map();
	for (const f of municipales) {
		const acc = porOrigen.get(f.origenId) ?? {
			entregas: 0,
			destinos: /* @__PURE__ */ new Map()
		};
		acc.entregas += f.despachosCount;
		acc.destinos.set(f.destino.nombre, (acc.destinos.get(f.destino.nombre) ?? 0) + f.despachosCount);
		porOrigen.set(f.origenId, acc);
	}
	const entregasCali = flujos.filter((f) => f.destino.tipo === "municipio" && sameMunicipality(f.destino.nombre, CALI)).reduce((sum, f) => sum + f.despachosCount, 0);
	const totalEntregas = municipios.reduce((sum, m) => sum + m.entregas, 0);
	const porZona = /* @__PURE__ */ new Map();
	for (const m of catalogoFinal) {
		const acc = porZona.get(m.zona) ?? {
			total: 0,
			atendidos: 0,
			entregas: 0
		};
		acc.total += 1;
		porZona.set(m.zona, acc);
	}
	for (const m of municipios) {
		const zona = m.zona ?? "Sin zona";
		const acc = porZona.get(zona) ?? {
			total: 0,
			atendidos: 0,
			entregas: 0
		};
		acc.atendidos += 1;
		acc.entregas += m.entregas;
		porZona.set(zona, acc);
	}
	const zonas = [...porZona.entries()].map(([zona, acc]) => ({
		zona,
		...acc
	})).sort((a, b) => b.total - a.total || a.zona.localeCompare(b.zona, "es"));
	const factorMunicipal = entregasTotales > 0 ? totalEntregas / entregasTotales : 1;
	const toneladasMunicipales = Math.round(totalToneladas * factorMunicipal);
	const primeraFecha = fechas[0] ?? null;
	const ultimaFecha = fechas.at(-1) ?? null;
	const picoEntregas = jornadas.reduce((mejor, j) => mejor === null || j.entregas > mejor.entregas ? j : mejor, null);
	const picoCobertura = jornadas.reduce((mejor, j) => mejor === null || j.municipios > mejor.municipios ? j : mejor, null);
	return {
		fechas,
		jornadas,
		municipios,
		totalEntregas,
		entregasConFecha: acumuladoEntregas,
		entregasSinFecha: totalEntregas - acumuladoEntregas,
		totalToneladas,
		toneladasMunicipales,
		entregasTodas,
		entregasSinCoordenada,
		entregasTotales,
		pesoPorEntrega,
		factorMunicipal,
		diasSinPesoMedido,
		toneladasMedidas: hayMedidas,
		municipiosAtendidos: porDestino.size,
		municipiosTotales: catalogoFinal.length,
		diasConEntrega: fechas.length,
		primeraFecha,
		ultimaFecha,
		fechaCorteLarga: fechaLarga(ultimaFecha),
		rangoLargo: rangoLargoDe(primeraFecha, ultimaFecha),
		picoEntregas,
		picoCobertura,
		entregasCali,
		catalogo: catalogoFinal,
		zonas,
		entregasPorOrigen: [...porOrigen.entries()].map(([origenId, acc]) => ({
			origenId,
			entregas: acc.entregas,
			municipios: acc.destinos.size,
			destinos: [...acc.destinos.entries()].map(([nombre, entregas]) => ({
				nombre,
				entregas
			})).sort((a, b) => b.entregas - a.entregas || a.nombre.localeCompare(b.nombre, "es"))
		})).sort((a, b) => b.entregas - a.entregas)
	};
}
/** "del 11 al 25 de agosto". Si cambian de mes, nombra los dos. */
function rangoLargoDe(desde, hasta) {
	if (!desde || !hasta) return "";
	const [, mesA, diaA] = desde.split("-");
	const [, mesB, diaB] = hasta.split("-");
	const nombreA = MESES[Number(mesA) - 1];
	const nombreB = MESES[Number(mesB) - 1];
	if (!diaA || !diaB || !nombreA || !nombreB) return "";
	if (mesA === mesB) return `del ${Number(diaA)} al ${Number(diaB)} de ${nombreB}`;
	return `del ${Number(diaA)} de ${nombreA} al ${Number(diaB)} de ${nombreB}`;
}
/**
* useToneladas.ts
* -----------------------------------------------------------------------
* Serie diaria de toneladas, desde `route=toneladas`.
*
* CAMBIO: se quita `retry: false`, por la misma razón que en useAyuda.
*
* Estaba puesto cuando la ruta todavía no existía: reintentar un 404
* permanente no sirve de nada. Pero la ruta ya está publicada y responde,
* así que ahora ese flag hace daño.
*
* Un Web App de Apps Script serializa las ejecuciones por usuario. El
* tablero monta ocho consultas a la vez y las que se pisan reciben un 404
* de la infraestructura de Google, no del script. Con `retry: false`, ese
* fallo de un segundo se vuelve definitivo para toda la sesión: el peso
* cae al respaldo por entregas y ahí se queda, aunque el backend esté
* perfecto y la hoja tenga los datos.
*
* Es un fallo especialmente silencioso: no aparece ningún mensaje, solo
* una cifra de toneladas parecida a la buena pero distinta.
*/
function useToneladas() {
	return useQuery({
		queryKey: ["toneladas"],
		queryFn: () => ayudasApiRepository.getToneladas(),
		staleTime: CATALOG_STALE_TIME_MS$1,
		retry: 3,
		retryDelay: REINTENTO_ESCALONADO$1
	});
}
/**
* usePrecargaDesdeSnapshot.ts
* -----------------------------------------------------------------------
* Siembra la caché de React Query con la última copia guardada en el
* navegador, para que el tablero se dibuje al instante en las visitas
* siguientes.
*
* POR QUÉ EN UN EFECTO Y NO CON `initialData`
*
* La página también se dibuja en el servidor, donde no hay
* localStorage. Con `initialData`, el servidor renderizaría sin datos y
* el cliente con datos, y la hidratación no coincidiría. En un efecto,
* la copia entra después de hidratar y no hay desajuste.
*
* QUÉ SE SIEMBRA Y QUÉ NO
*
* Todo menos `necesidades`. Esa es la única parte que caduca en horas, y
* una lista vieja manda a la gente a donar lo que ya sobra: esa sección
* espera a la respuesta real.
*
* Cada parte se valida con la misma regla que las respuestas del
* backend, y se siembra con la fecha en que se guardó. React Query la ve
* vieja y la reemplaza apenas llega la consulta que ya está en vuelo.
* Nunca pisa un dato que ya esté en la caché.
* -----------------------------------------------------------------------
*/
/**
* Las claves coinciden con las queryKey de useCatalogQueries, useAyuda y
* useToneladas. Si una de esas cambia, cambia acá.
*/
var PARTES_SEMBRABLES = [
	"meta",
	"origenes",
	"municipios",
	"categorias",
	"flujos",
	"destinos",
	"toneladas",
	"ayuda"
];
function usePrecargaDesdeSnapshot() {
	const client = useQueryClient();
	(0, import_react.useEffect)(() => {
		const snapshot = leerSnapshot();
		if (!snapshot) return;
		for (const clave of PARTES_SEMBRABLES) {
			const valor = snapshot.bundle[clave];
			if (valor === null || valor === void 0) continue;
			if (client.getQueryData([clave]) !== void 0) continue;
			if (validarParte(clave, valor) !== null) continue;
			client.setQueryData([clave], valor, { updatedAt: snapshot.guardadoEn });
		}
	}, [client]);
}
/**
* OperacionContext.tsx
* -----------------------------------------------------------------------
* Una sola lectura de `route=flujos` alimenta todo el tablero. El
* contexto evita que cada sección repita el hook y que el árbol se llene
* de props que solo pasan de largo.
*
* CAMBIO: el proveedor siembra la caché con la última copia guardada.
*
* Es el punto más alto que envuelve a toda la página, así que es donde
* conviene hacerlo una sola vez. Ver usePrecargaDesdeSnapshot.
*
* Se conservan los dos cambios anteriores: los `excluidos` viajan a la
* derivación, y los huecos de la hoja TONELADAS se avisan por consola en
* desarrollo, no en pantalla.
* -----------------------------------------------------------------------
*/
/**
* `null` en vez de un valor por defecto a propósito: un componente usado
* fuera del proveedor avisa en desarrollo en vez de mostrar ceros.
*/
var OperacionContext = (0, import_react.createContext)(null);
function usarContexto() {
	const valor = (0, import_react.useContext)(OperacionContext);
	if (valor === null) return {
		operacion: OPERACION_VACIA,
		cargando: false,
		error: true
	};
	return valor;
}
function OperacionProvider({ children }) {
	usePrecargaDesdeSnapshot();
	const { data, isLoading, isError } = useFlujos();
	const { data: toneladas } = useToneladas();
	const { data: municipios } = useMunicipios();
	const value = (0, import_react.useMemo)(() => ({
		operacion: derivarOperacion(data?.flujos, toneladas?.serie, municipios, data?.excluidos),
		cargando: isLoading,
		error: isError
	}), [
		data,
		toneladas,
		municipios,
		isLoading,
		isError
	]);
	/** Días con entregas y sin peso en la hoja TONELADAS. Solo consola, solo en desarrollo. */
	const { diasSinPesoMedido, toneladasMedidas } = value.operacion;
	(0, import_react.useEffect)(() => {}, [diasSinPesoMedido, toneladasMedidas]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperacionContext.Provider, {
		value,
		children
	});
}
function useOperacion() {
	return usarContexto().operacion;
}
/**
* FocoContext.tsx
* -----------------------------------------------------------------------
* El puente entre el relato y el mapa.
*
* Varias secciones mandan al mapa: la galería de municipios, el podio, el
* calendario de evolución, las categorías de ayuda. Todas hacen lo mismo
* —bajar al mapa y seleccionar algo— pero el viaje era de ida sola: una
* vez abajo, para volver había que acordarse de en qué sección se estaba
* y buscarla a mano en una página de ocho secciones.
*
* CÓMO SE RESUELVE EL REGRESO
*
* Guardando la POSICIÓN DEL SCROLL justo antes de bajar al mapa.
*
* La alternativa era que cada llamada declarara de qué sección venía. Se
* probó y tiene un defecto de fondo: hay que tocar todos los puntos de
* entrada, y el que se olvide queda sin regreso sin que nadie lo note.
* Ya pasó: el botón estaba escrito y no aparecía nunca, porque ninguna
* sección declaraba su origen.
*
* Con la posición del scroll el regreso funciona para TODOS los enlaces
* sin tocar ninguno, incluidos los que se agreguen mañana. Y devuelve al
* punto exacto donde estaba la persona, no al comienzo de la sección: si
* venía del municipio número 30 de la galería, vuelve ahí.
*
* La etiqueta sigue siendo opcional. Sin ella el botón dice "Volver"; con
* ella, "Volver a los municipios". Es lo único que gana algo por
* declararse en el origen, y no declararlo no rompe nada.
* -----------------------------------------------------------------------
*/
/** Id de la sección del mapa en StoryPage. */
var MAPA_ID = "mapa-de-ayudas";
/**
* El contenedor que hace scroll. Es el <main> de StoryPage, no la
* ventana: la página entera vive dentro de un `h-dvh overflow-y-auto`,
* así que `window.scrollY` siempre vale 0 y no sirve para esto.
*/
var SCROLL_ROOT_ID$1 = "ruta-solidaridad-scroll";
var FocoContext = (0, import_react.createContext)(null);
function raizDeScroll() {
	if (typeof document === "undefined") return null;
	return document.getElementById(SCROLL_ROOT_ID$1);
}
function prefiereQuieto() {
	if (typeof window === "undefined") return true;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function FocoProvider({ children }) {
	const [municipio, setMunicipio] = (0, import_react.useState)(null);
	const [categoria, setCategoria] = (0, import_react.useState)(null);
	const [etiquetaRegreso, setEtiquetaRegreso] = (0, import_react.useState)(null);
	/**
	* `useState` y no `useRef` para el booleano: el botón del mapa tiene
	* que volver a dibujarse cuando aparece o desaparece el regreso, y una
	* ref no dispara render.
	*
	* La posición sí va en ref: cambia junto con el booleano y nadie la
	* lee para pintar, así que guardarla en estado provocaría un render de
	* más en cada viaje.
	*/
	const [puedeVolver, setPuedeVolver] = (0, import_react.useState)(false);
	const posicionPrevia = (0, import_react.useRef)(0);
	/**
	* Anota dónde estaba la persona y baja al mapa.
	*
	* El orden importa: primero se lee `scrollTop`, después se desplaza. Al
	* revés se guardaría la posición del mapa y el botón devolvería al
	* mismo lugar donde ya está.
	*/
	const irAlMapa = (0, import_react.useCallback)((etiqueta) => {
		const raiz = raizDeScroll();
		if (raiz) {
			posicionPrevia.current = raiz.scrollTop;
			setPuedeVolver(true);
		}
		setEtiquetaRegreso(etiqueta ?? null);
		const destino = document.getElementById(MAPA_ID);
		if (!destino) return;
		destino.scrollIntoView({
			behavior: prefiereQuieto() ? "auto" : "smooth",
			block: "start"
		});
	}, []);
	const enfocarMunicipio = (0, import_react.useCallback)((nombre, etiqueta) => {
		setMunicipio(nombre);
		setCategoria(null);
		irAlMapa(etiqueta);
	}, [irAlMapa]);
	const enfocarCategoria = (0, import_react.useCallback)((nombre, etiqueta) => {
		setCategoria(nombre);
		setMunicipio(null);
		irAlMapa(etiqueta);
	}, [irAlMapa]);
	/**
	* Solo quita el resaltado. El regreso sobrevive a propósito: la persona
	* sigue en el mapa habiendo llegado desde algún lado, y el botón tiene
	* que seguir ahí. Es lo que hace el "Ver todos" de la píldora amarilla.
	*/
	const limpiar = (0, import_react.useCallback)(() => {
		setMunicipio(null);
		setCategoria(null);
	}, []);
	const volver = (0, import_react.useCallback)(() => {
		const raiz = raizDeScroll();
		if (raiz) raiz.scrollTo({
			top: posicionPrevia.current,
			behavior: prefiereQuieto() ? "auto" : "smooth"
		});
		setMunicipio(null);
		setCategoria(null);
		setEtiquetaRegreso(null);
		setPuedeVolver(false);
	}, []);
	const value = (0, import_react.useMemo)(() => ({
		municipio,
		categoria,
		puedeVolver,
		etiquetaRegreso,
		enfocarMunicipio,
		enfocarCategoria,
		limpiar,
		volver
	}), [
		municipio,
		categoria,
		puedeVolver,
		etiquetaRegreso,
		enfocarMunicipio,
		enfocarCategoria,
		limpiar,
		volver
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FocoContext.Provider, {
		value,
		children
	});
}
function useFoco() {
	const valor = (0, import_react.useContext)(FocoContext);
	if (valor === null) throw new Error("useFoco se usó fuera de <FocoProvider>. Envolvé la página con el proveedor.");
	return valor;
}
/**
* useAyuda.ts
* -----------------------------------------------------------------------
* Composición de lo entregado, desde route=ayuda.
*
* CAMBIO: se quita `retry: false`.
*
* Estaba puesto con buen criterio: mientras la ruta no existía en el
* backend, el 404 era permanente y reintentar no servía de nada. Pero la
* ruta ya está publicada, y ahora ese flag hace daño.
*
* Un Web App de Apps Script serializa las ejecuciones por usuario. El
* tablero monta ocho consultas a la vez y las que se pisan reciben un 404
* de la infraestructura de Google, no del script. Con `retry: false`, ese
* fallo de un segundo se vuelve definitivo para toda la sesión: la
* sección cae al catálogo estático y ahí se queda, aunque el backend esté
* perfecto.
*
* Con tres reintentos y espera creciente, la consulta se recupera sola.
* El costo si la ruta de verdad no existiera son unos siete segundos
* antes de caer al respaldo, que es una espera aceptable a cambio de no
* mostrar datos viejos cuando los buenos estaban disponibles.
*
* La cola de `colaDePeticiones` es la que ataca la causa; esto es la red
* de seguridad. Conviene tener las dos: la cola no puede evitar un fallo
* de red del lado del usuario.
*/
/** Igual que en useCatalogQueries. Si cambia allá, cambia acá. */
var CATALOG_STALE_TIME_MS = 3e5;
/**
* Espera creciente entre intentos: 1s, 2s, 4s, con tope de 8.
*
* Sin la espera creciente, los tres reintentos salen casi juntos y se
* vuelven a pisar con las otras consultas, que es exactamente lo que se
* está tratando de evitar.
*/
var REINTENTO_ESCALONADO = (intento) => Math.min(1e3 * 2 ** intento, 8e3);
function useAyuda() {
	return useQuery({
		queryKey: ["ayuda"],
		queryFn: () => ayudasApiRepository.getAyuda(),
		staleTime: CATALOG_STALE_TIME_MS,
		retry: 3,
		retryDelay: REINTENTO_ESCALONADO
	});
}
/**
* MapaDiferido.tsx
* -----------------------------------------------------------------------
* Monta DashboardPage recién cuando la persona se acerca a la sección
* del mapa.
*
* POR QUÉ
*
* StoryPage importaba DashboardPage de forma directa, así que MapLibre GL
* —de las librerías más pesadas de todo el sitio— y el motor de arcos
* viajaban en el JavaScript inicial. El mapa es la ÚLTIMA sección del
* relato: la portada, el balance y "¿Qué hace falta hoy?" esperaban a
* que el teléfono descargara y compilara un mapa que todavía no se ve.
*
* DOS PASOS
*
*   1. En un momento ocioso, después de la primera pintura, se descarga
*      el código del mapa. No se ejecuta, solo queda listo.
*   2. Cuando la sección está a ~800 px de entrar en pantalla, se monta.
*      Para entonces el código casi siempre ya llegó, así que no se ve
*      espera.
*
* El observador usa como raíz el contenedor con scroll del relato, no la
* ventana: en esta página la ventana no se desplaza, se desplaza el
* <main>. Con la ventana como raíz, la sección nunca "entraría".
*
* Un enlace del relato que baja al mapa ("ver en el mapa") funciona
* igual: el desplazamiento dispara el montaje, y el municipio elegido
* vive en FocoContext, que DashboardPage lee al montarse.
*
* No hay desajuste de hidratación: el servidor y el primer render del
* cliente dibujan los dos el marcador de carga.
* -----------------------------------------------------------------------
*/
var cargarDashboard = () => import("./DashboardPage-fAk1e4ef.mjs");
var DashboardPage = (0, import_react.lazy)(() => cargarDashboard().then((modulo) => ({ default: modulo.DashboardPage })));
/** Cuánto antes de llegar se monta. Un poco más de una pantalla. */
var MARGEN_ANTICIPADO = "800px 0px";
function CargandoMapa() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 flex items-center justify-center text-sm text-white/70",
		children: "Cargando mapa…"
	});
}
function MapaDiferido({ scrollRootId }) {
	const ref = (0, import_react.useRef)(null);
	const [montar, setMontar] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const ventana = window;
		const precargar = () => {
			cargarDashboard();
		};
		if (ventana.requestIdleCallback) {
			const id = ventana.requestIdleCallback(precargar, { timeout: 4e3 });
			return () => ventana.cancelIdleCallback?.(id);
		}
		const temporizador = window.setTimeout(precargar, 2500);
		return () => window.clearTimeout(temporizador);
	}, []);
	(0, import_react.useEffect)(() => {
		if (montar) return;
		const elemento = ref.current;
		if (!elemento) return;
		if (typeof IntersectionObserver === "undefined") {
			setMontar(true);
			return;
		}
		const observador = new IntersectionObserver((entradas) => {
			if (entradas.some((e) => e.isIntersecting)) {
				setMontar(true);
				observador.disconnect();
			}
		}, {
			root: document.getElementById(scrollRootId),
			rootMargin: MARGEN_ANTICIPADO
		});
		observador.observe(elemento);
		return () => observador.disconnect();
	}, [montar, scrollRootId]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		className: "relative h-full w-full",
		children: montar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
			fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CargandoMapa, {}),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardPage, { embedded: true })
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CargandoMapa, {})
	});
}
/**
* JornadaBars.tsx
* -----------------------------------------------------------------------
* Entregas por día. Las barras y las etiquetas salen de la API, así que
* el gráfico crece solo cuando se agregan días al Excel.
*
* SOBRE EL COLOR
*
* Era una tarjeta azul con barras crema, dentro de una sección crema.
* Las barras quedaban del mismo tono que el fondo de la página: el borde
* entre el dato y el papel desaparecía y el bloque vibraba.
*
* Se invirtió. La tarjeta es blanca, que es el soporte neutro de la
* campaña, y el dato se queda con el azul institucional, que es el color
* más saturado de la paleta. El amarillo se reserva para lo excepcional:
* el día de mayor volumen y los municipios que estrenan ayuda. Un color
* que aparece en todas las barras no señala nada.
*
* SOBRE LOS EJES
*
* Antes las barras flotaban con la cifra encima de cada una. Se podían
* leer los valores uno por uno, pero no se podía estimar ninguno sin
* leerlo, que es justamente lo que un gráfico debería permitir.
*
* Ahora hay eje vertical con escala y líneas de referencia, y eje
* horizontal con los días. La escala no termina en el máximo real sino
* en un número redondo por encima: un eje que termina en 47 obliga a
* hacer cuentas, uno que termina en 50 se lee de un vistazo.
* -----------------------------------------------------------------------
*/
/** Divisiones del eje vertical. Cuatro dan cinco marcas contando el cero. */
var DIVISIONES = 4;
function JornadaBars() {
	const { jornadas } = useOperacion();
	if (jornadas.length === 0) return null;
	const max = Math.max(1, ...jornadas.map((j) => j.entregas));
	const tope = topeRedondo(max, DIVISIONES);
	const marcas = Array.from({ length: 5 }, (_, i) => tope / DIVISIONES * (DIVISIONES - i));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
		className: "rounded-lg bg-white p-5 shadow-sm ring-1 ring-[#123E5C]/10 sm:p-7",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-5 text-base text-[#35708F]",
			children: "Cada barra corresponde a una fecha; la barra amarilla representa el día con mayor número de entregas."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "-mx-1 overflow-x-auto px-1 pb-1",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-[34rem]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-[2.75rem_1fr]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "flex h-56 flex-col justify-between pr-3 text-right text-xs tabular-nums text-[#6B93AA]",
							children: marcas.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0",
								children: Math.round(m).toLocaleString("es-CO")
							}, `marca-${m}`))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative h-56 border-b-2 border-l-2 border-[#123E5C]/20",
							children: [marcas.slice(0, -1).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"aria-hidden": true,
								className: "absolute inset-x-0 h-px bg-[#123E5C]/8",
								style: { bottom: `${m / tope * 100}%` }
							}, `linea-${m}`)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "absolute inset-0 flex items-end gap-1.5 px-2 sm:gap-2",
								children: jornadas.map((j) => {
									const esPico = j.entregas === max;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "relative flex h-full min-w-0 flex-1 items-end",
										title: `${Number(j.dia)} de agosto: ${j.entregas} entregas hacia ${j.municipios} municipios`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "w-full rounded-t-sm transition-[height] duration-500 motion-reduce:transition-none",
											style: {
												height: `${Math.max(2, j.entregas / tope * 100)}%`,
												background: esPico ? "#FFD400" : "#0079C1"
											}
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "pointer-events-none absolute inset-x-0 text-center text-[11px] font-bold tabular-nums text-[#123E5C]",
											style: { bottom: `calc(${Math.max(2, j.entregas / tope * 100)}% + 4px)` },
											children: j.entregas
										})]
									}, j.fecha);
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex gap-1.5 px-2 pt-2 sm:gap-2",
							children: jornadas.map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1 text-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-xs font-semibold tabular-nums text-[#35708F]",
									children: Number(j.dia)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1 block h-5 text-[11px] font-bold text-[#8A6A00]",
									children: j.nuevos > 0 ? `+${j.nuevos}` : ""
								})]
							}, `dia-${j.fecha}`))
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-[#6B93AA]",
					children: "Los números en amarillo identifica el número de municipios que reciben ayuda por primera vez."
				})]
			})
		})]
	});
}
/**
* El techo del eje: el múltiplo redondo inmediatamente superior al
* máximo real.
*
* Un eje que termina exactamente en el dato más alto no deja aire arriba
* y obliga a leer cada cifra, porque las marcas caen en números como 47
* o 113. Redondeando el paso a 1, 2, 2.5 o 5 por la magnitud del dato,
* la escala siempre queda en números que se estiman de un vistazo.
*/
function topeRedondo(max, divisiones) {
	const bruto = max / divisiones;
	const magnitud = 10 ** Math.floor(Math.log10(bruto));
	return ([
		1,
		2,
		2.5,
		5,
		10
	].map((m) => m * magnitud).find((p) => p >= bruto) ?? magnitud * 10) * divisiones;
}
/**
* MovimientoExtras.tsx
* -----------------------------------------------------------------------
* Tarjetas de jornada y municipios nuevos.
*
* CORRECCIÓN: el mes deja de estar escrito a mano.
*
* Las tres notas decían "de agosto" fijo y componían la fecha con
* `Number(j.dia)`, que es solo el día del mes. Cuando la operación pasó a
* septiembre, la primera entrega a Candelaria —del 3 de septiembre— se
* publicó como "3 de agosto": una semana ANTES del terremoto que originó
* la operación. Y las dos tarjetas de arriba quedaban expuestas al mismo
* error apenas el pico cayera en el mes siguiente.
*
* Ahora se usa `j.fecha`, que es la ISO completa, formateada con
* `fechaCorta` de la derivación. El mes sale del dato.
*/
var ORIGEN_CARTAGO$2 = "ORI-CARTAGO";
/**
* Las dos versiones de la pieza "Así avanzó la ruta".
*
* REVISAR QUE LOS NOMBRES COINCIDAN CON LOS ARCHIVOS REALES de
* `public/marca/`. El de escritorio es una suposición.
*
* Se recomienda renombrar los dos sin tildes ni mayúsculas. Una eñe o una
* tilde en una URL obliga al navegador a codificarla, y hay servidores
* estáticos que sirven mal esas rutas al pasar de Windows a Linux en el
* despliegue: es un fallo que aparece solo en producción.
*/
var PIEZA_ESCRITORIO = "/marca/Así_avanzó_la_ruta.jpg";
var PIEZA_MOVIL = "/marca/Así_avanzó_la_ruta_celular.jpg";
/** Medidas reales del archivo de celular, ya verificadas. */
var MOVIL_ANCHO = 812;
var MOVIL_ALTO = 1738;
function MovimientoStatCards() {
	const op = useOperacion();
	const primeras48 = op.jornadas.slice(0, 2).reduce((sum, j) => sum + j.entregas, 0);
	const porcentaje48 = op.totalEntregas > 0 ? Math.round(primeras48 / op.totalEntregas * 100) : 0;
	const cartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO$2);
	const tarjetas = [
		op.picoEntregas && {
			valor: `${op.picoEntregas.entregas} entregas`,
			label: "Día con más entregas",
			nota: `El ${fechaCorta(op.picoEntregas.fecha)}, hacia ${op.picoEntregas.municipios} municipios.`,
			color: "#F0801E"
		},
		op.picoCobertura && {
			valor: `${op.picoCobertura.municipios} municipios`,
			label: "Día con más municipios atendidos",
			nota: `El ${fechaCorta(op.picoCobertura.fecha)}.`,
			color: "#5CC46B"
		},
		{
			valor: `${porcentaje48}%`,
			label: "Salió en las primeras 48 horas",
			nota: `${primeras48} entregas en los dos primeros días.`,
			color: "#FFD400"
		},
		cartago && {
			valor: String(cartago.entregas),
			label: "Entregas desde Cartago",
			nota: `Segundo centro de acopio, hacia ${cartago.municipios} municipios.`,
			color: "#B57BB5"
		}
	].filter(Boolean);
	if (tarjetas.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
		children: tarjetas.slice(0, 4).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-md border-l-4 bg-[#0079C1] p-5",
			style: { borderLeftColor: c.color },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-3xl font-extrabold leading-none text-[#FBF8C6]",
					children: c.valor
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-base font-bold uppercase tracking-[0.06em] text-white/85",
					children: c.label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1.5 text-base leading-6 text-white",
					children: c.nota
				})
			]
		}, c.label))
	});
}
/**
* "Así avanzó la ruta".
*
* ESCRITORIO: la pieza completa, con titular, camión y los bloques por
* jornada ya compuestos adentro. La lista en código desaparece de la
* vista, porque estaba diciendo dos veces lo mismo.
*
* CELULAR: la pieza de celular, que trae el titular y el camión pero no
* los bloques, más la lista en código debajo.
*
* LO QUE CUESTA ESTA DECISIÓN
*
* En escritorio los nombres de municipio dejan de venir de route=flujos y
* pasan a estar quemados en un JPG. Cada vez que cambien las jornadas hay
* que reexportar la pieza, y mientras no se haga, el celular muestra un
* municipio nuevo que el escritorio no.
*
* Por eso la lista NO se borra en escritorio: se vuelve `sr-only`. Sigue
* en el documento con los datos vivos, así que un lector de pantalla y un
* buscador leen lo correcto aunque el ojo vea la imagen. Y si algún día
* se vuelve al bloque en código, es quitar una clase.
*
* Las dos imágenes van con `alt` vacío por lo mismo: el contenido real ya
* está en el <h3> y en la lista, y repetirlo haría que se anuncie dos
* veces.
*/
function MunicipiosNuevosCallouts() {
	const { jornadas } = useOperacion();
	const conNuevos = jornadas.filter((j) => j.nuevos > 0);
	if (conNuevos.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "sr-only",
			children: "Así avanzó la ruta"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: PIEZA_ESCRITORIO,
			alt: "",
			"aria-hidden": true,
			loading: "lazy",
			decoding: "async",
			className: "hidden h-auto w-full lg:block"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: PIEZA_MOVIL,
			alt: "",
			"aria-hidden": true,
			width: MOVIL_ANCHO,
			height: MOVIL_ALTO,
			loading: "lazy",
			decoding: "async",
			className: "h-auto w-full lg:hidden"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "mt-6 flex flex-col gap-3 lg:sr-only",
			children: conNuevos.map((j, i) => {
				const enCrema = i % 2 === 1;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: `rounded-md p-5 ${enCrema ? "bg-[#ffffff] text-[#0079C1]" : "bg-[#0079C1] text-[#FBF8C6]"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-lg font-bold",
						children: [
							fechaCorta(j.fecha),
							" / +",
							j.nuevos,
							" ",
							j.nuevos === 1 ? "municipio" : "municipios"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1.5 text-lg font-medium leading-7",
						children: [j.nombresNuevos.join(", "), "."]
					})]
				}, j.fecha);
			})
		})
	] });
}
/**
* SidebarNav
* -----------------------------------------------------------------------
* CÓMO SE ABRE EN ESCRITORIO
*
* Haciendo clic en cualquier punto de la barra retraída. Antes había un
* botón de tres líneas dentro del riel, y el problema es que estaba
* compuesto exactamente igual que los ítems del menú: mismo tamaño de
* ícono, misma columna, apilado justo encima de ellos. Se leía como una
* sección más, no como un control.
*
* Ahora el riel entero es la zona de clic. Es más grande que cualquier
* botón, no compite con los íconos de sección y no hace falta apuntarle a
* nada. Los íconos de sección siguen navegando: cortan la propagación
* para que un clic sobre uno no haga las dos cosas a la vez.
*
* El clic sobre el `<nav>` es una comodidad para el mouse, no la única
* puerta. Quien navega con teclado llega al botón del logo, que retraído
* cambia su función y su etiqueta a "Abrir menú": un `div` con `onClick`
* no recibe foco y dejaría la barra inalcanzable sin mouse.
*
* En celular no cambia nada: el botón flotante de la esquina sigue
* siendo el que abre, y ahí sí tiene sentido, porque no está dentro de
* ninguna lista con la que confundirse.
* -----------------------------------------------------------------------
*/
function SidebarNav({ items, scrollRootId, homeId, fechaCorte, logo = "/marca/gobernacion-color.png" }) {
	const [abierto, setAbierto] = (0, import_react.useState)(false);
	const [activo, setActivo] = (0, import_react.useState)(items[0]?.id ?? "");
	const visiblesRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const navRef = (0, import_react.useRef)(null);
	const abrirRef = (0, import_react.useRef)(null);
	/**
	* Cerrar al tocar fuera y con Escape, en cualquier tamaño de pantalla.
	*
	* Antes el velo solo existía en celular, así que en escritorio la barra
	* abierta tapaba el contenido y la única forma de retraerla era acertar
	* al botón de la flecha. Un panel que se abre encima de algo debe poder
	* cerrarse tocando ese algo.
	*
	* Se escucha `pointerdown` y no `click`: si el elemento de abajo se
	* mueve o desaparece entre el press y el release, el click nunca llega.
	*
	* Al cerrar, el foco vuelve al botón que abrió. Sin eso, quien navega
	* con teclado queda al principio del documento después de cada cierre.
	*/
	(0, import_react.useEffect)(() => {
		if (!abierto) return;
		const alTocarFuera = (evento) => {
			const destino = evento.target;
			if (navRef.current?.contains(destino)) return;
			if (abrirRef.current?.contains(destino)) return;
			setAbierto(false);
		};
		const alPresionar = (evento) => {
			if (evento.key !== "Escape") return;
			setAbierto(false);
			abrirRef.current?.focus();
		};
		document.addEventListener("pointerdown", alTocarFuera);
		document.addEventListener("keydown", alPresionar);
		return () => {
			document.removeEventListener("pointerdown", alTocarFuera);
			document.removeEventListener("keydown", alPresionar);
		};
	}, [abierto]);
	(0, import_react.useEffect)(() => {
		const root = document.getElementById(scrollRootId);
		if (!root) return;
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) if (entry.isIntersecting) visiblesRef.current.add(entry.target.id);
			else visiblesRef.current.delete(entry.target.id);
			const actual = items.find((i) => visiblesRef.current.has(i.id));
			if (actual) setActivo(actual.id);
		}, {
			root,
			rootMargin: "-45% 0px -50% 0px",
			threshold: 0
		});
		items.forEach((item) => {
			const el = document.getElementById(item.id);
			if (el) observer.observe(el);
		});
		return () => {
			observer.disconnect();
			visiblesRef.current.clear();
		};
	}, [items, scrollRootId]);
	const inicioId = homeId ?? items[0]?.id ?? "";
	const irA = (id) => {
		document.getElementById(id)?.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
		setAbierto(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => setAbierto(true),
			"aria-label": "Abrir menú",
			"aria-expanded": abierto,
			ref: abrirRef,
			className: "fixed left-4 top-4 z-50 flex size-12 items-center justify-center rounded-full bg-white text-[#0079C1] shadow-lg ring-1 ring-[#0079C1]/15 transition hover:bg-[#EAF7FC] md:hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, {
				className: "size-6",
				"aria-hidden": true
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			"aria-hidden": true,
			className: `fixed inset-0 z-40 bg-[#123E5C]/45 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${abierto ? "opacity-100" : "pointer-events-none opacity-0"}`
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
			ref: navRef,
			"aria-label": "Secciones",
			onClick: abierto ? void 0 : () => setAbierto(true),
			className: `fixed left-0 top-0 z-50 flex h-dvh flex-col border-r border-[#0079C1]/12 bg-white py-5 shadow-xl transition-[width,transform] duration-300 ease-out md:shadow-none motion-reduce:transition-none ${abierto ? "w-72 translate-x-0 px-4" : "w-72 -translate-x-full px-4 md:w-20 md:translate-x-0 md:cursor-pointer md:px-3 md:hover:bg-[#FAFDFF]"}`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `mb-5 ${abierto ? "flex items-center gap-3 px-1" : "flex justify-center"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: (evento) => {
							evento.stopPropagation();
							if (abierto) irA(inicioId);
							else setAbierto(true);
						},
						"aria-label": abierto ? "Volver al inicio" : "Abrir menú",
						"aria-expanded": abierto ? void 0 : false,
						title: abierto ? "Volver al inicio" : "Abrir menú",
						className: `flex shrink-0 items-center justify-center rounded-xl transition hover:bg-[#EAF7FC] ${abierto ? "h-12 px-2" : "h-11 w-full px-1"}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: logo,
							alt: abierto ? "Gobernación del Valle del Cauca. Volver al inicio" : "",
							className: abierto ? "h-10 w-auto" : "h-8 w-full object-contain"
						})
					}), abierto && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: (evento) => {
							evento.stopPropagation();
							setAbierto(false);
						},
						"aria-label": "Cerrar menú",
						className: "ml-auto flex size-9 shrink-0 items-center justify-center rounded-full text-[#35708F] transition hover:bg-[#F2FAFD]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
							className: "size-5 md:hidden",
							"aria-hidden": true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {
							className: "hidden size-5 md:block",
							"aria-hidden": true
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-1 flex-col gap-1",
					children: items.map(({ id, label, icon: Icon }) => {
						const esActivo = activo === id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: (evento) => {
								evento.stopPropagation();
								irA(id);
							},
							"aria-current": esActivo ? "true" : void 0,
							title: abierto ? void 0 : label,
							className: `flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-base font-semibold transition ${esActivo ? "bg-[#EAF7FC] text-[#0079C1]" : "text-[#35708F] hover:bg-[#F2FAFD] hover:text-[#0079C1]"} ${abierto ? "" : "md:justify-center md:px-0"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								className: "size-6 shrink-0",
								"aria-hidden": true
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: abierto ? "truncate" : "truncate md:hidden",
								children: label
							})]
						}) }, id);
					})
				}),
				fechaCorte && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: `px-2 pt-4 text-sm text-[#6B93AA] ${abierto ? "" : "md:hidden"}`,
					children: ["Información al ", fechaCorte]
				})
			]
		})
	] });
}
/** Tonos sobre los que el texto va claro. Decide el color por defecto. */
var OSCURO = {
	cyan: true,
	azul: true,
	navy: true,
	crema: false,
	hueso: false,
	blanco: false
};
/**
* El rótulo de un bloque.
*
* En las piezas no es un eyebrow diminuto sino una línea de peso, en
* Agenda ExtraCondensed y con una palabra resaltada en amarillo. Usa
* `.vc-rotulo` y no `.vc-titular` porque este último fuerza mayúscula y
* los rótulos de la campaña van en caja mixta.
*
* El tamaño es mayor de lo que pediría en Poppins: Agenda es extra
* condensada y a igual cuerpo ocupa cerca de un tercio menos de ancho.
*/
function SectionLabel({ children, tono = "hueso" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
		className: `vc-rotulo text-[clamp(1.5rem,3.6vw,2.5rem)] ${OSCURO[tono] ? "text-white" : "text-[#0079C1]"}`,
		children
	});
}
/**
* El titular de una sección.
*
* Agenda ExtraCondensed en mayúscula, vía `.vc-titular`. El `clamp` lo
* dimensiona entre 28 y 52 px según el ancho, que es el mismo rango que
* usan las secciones escritas a mano: así un titular de primitiva y uno
* de sección se ven iguales.
*/
function SectionTitle({ children, tono = "hueso" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
		className: `vc-titular max-w-4xl text-[clamp(1.75rem,5.5vw,3.25rem)] ${OSCURO[tono] ? "text-[#FBF8C6]" : "text-[#0079C1]"}`,
		children
	});
}
/**
* Tarjeta blanca.
*
* El canto pasó de `border` a `ring`, que es lo que usan las fichas de
* Territorio: sobre el crema de la campaña, blanco contra #FBF8C6
* contrasta 1.1 a 1 y sin filete el borde de la tarjeta se difumina.
* `ring` además no ocupa espacio de maqueta, así que dos tarjetas
* vecinas no se descuadran por un píxel.
*/
function Card({ children, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `rounded-lg bg-white p-6 shadow-sm ring-1 ring-[#123E5C]/10 ${className}`,
		children
	});
}
/** Aviso metodológico. Amarillo, porque siempre dice qué NO se puede afirmar. */
function Aviso({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-lg border border-[#FFD400]/40 border-l-[3px] border-l-[#FFD400] bg-[#FFF8E5] p-5 text-base leading-7 text-[#6B5200]",
		children
	});
}
/**
* TerritorySections.tsx
* -----------------------------------------------------------------------
* Podio, cobertura por zona y galería de municipios. Todo se deriva de la
* API vía OperacionContext, así que las cifras se actualizan solas.
*
* SOBRE LA PRESENTACIÓN
*
* Antes eran tres listas del mismo peso visual, una debajo de otra. El
* resultado era informativo y plano: nada indicaba dónde mirar primero.
*
* Ahora hay jerarquía. El municipio que más recibió ocupa una ficha
* grande y oscura; los otros cinco van en fichas menores; las zonas son
* un bloque de progreso; y los 41 municipios cierran como galería
* filtrable. Cada nivel se lee más rápido que el anterior.
*
* SOBRE EL RÓTULO
*
* Los tres bloques traen su propio `SectionLabel`, que es lo correcto
* cuando se usan sueltos. Pero en la sección "¿Cuánta ayuda recibió cada
* municipio?" el rótulo vive en una banda azul a sangre, como en las
* piezas de la campaña, y ahí el bloque no debe repetirlo. De eso se
* encarga `conRotulo`, que por defecto queda en `true` para no alterar
* ningún uso existente.
*
* SOBRE EL COLOR DE LAS TARJETAS DE ZONA
*
* Eran azul #0079C1. Dentro de la banda azul de la sección quedaban azul
* sobre azul y el borde de la tarjeta desaparecía, así que pasan a
* blanco. El cambio arrastra los tres colores de adentro: la pista de la
* barra, que era blanco translúcido e invisible sobre blanco; y el verde
* y el amarillo de marca, que sobre azul contrastaban de sobra y sobre
* blanco caían a 1.6:1. Los sustituye una pareja más oscura que conserva
* la misma lectura —verde completo, ámbar pendiente— y pasa el 3:1 que
* pide un elemento gráfico.
*
* Las animaciones son de entrada, cortas y escalonadas. Se apagan solas
* con `prefers-reduced-motion`, que vive en marca.css.
* -----------------------------------------------------------------------
*/
var TODAS = "todas";
/** Verde y ámbar para barras sobre fondo claro. Ver la nota de arriba. */
var VERDE_COMPLETO = "#2E9E4F";
var AMBAR_PENDIENTE = "#E8A200";
var norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
function plural(n, uno, varios) {
	return `${n.toLocaleString("es-CO")} ${n === 1 ? uno : varios}`;
}
function PodioMunicipios({ onSelect, conRotulo = true }) {
	const { municipios } = useOperacion();
	const top = municipios.slice(0, 6);
	const primero = top[0];
	const resto = top.slice(1);
	const max = Math.max(1, ...municipios.map((m) => m.entregas));
	if (!primero) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [conRotulo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Municipios que más ayuda recibieron" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] ${conRotulo ? "mt-5" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => onSelect?.(primero),
			style: { "--i": 0 },
			className: "vc-aparece group relative overflow-hidden rounded-lg bg-[#123E5C] p-7 text-left transition duration-200 hover:-translate-y-1 hover:shadow-xl sm:p-9 motion-reduce:hover:translate-y-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm font-bold uppercase tracking-[0.16em] text-[#FFD400]",
					children: "El que más recibió"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "vc-titular mt-3 text-[clamp(2rem,6vw,3.5rem)] text-white",
					children: primero.nombre
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap gap-x-10 gap-y-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "block text-[clamp(2rem,5vw,3rem)] font-extrabold leading-none text-[#FBF8C6]",
						children: primero.entregas
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-1 block text-base text-[#A8CFE2]",
						children: "entregas"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "block text-[clamp(2rem,5vw,3rem)] font-extrabold leading-none text-[#FBF8C6]",
						children: primero.toneladas
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-1 block text-base text-[#A8CFE2]",
						children: "toneladas"
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-6 block h-2 overflow-hidden rounded-full bg-white/20",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
						className: "vc-crece block h-full rounded-full bg-[#FFD400]",
						style: { width: "100%" }
					})
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "grid gap-3 sm:grid-cols-2",
			children: resto.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => onSelect?.(m),
				style: { "--i": i + 1 },
				className: "vc-aparece flex h-full w-full items-start gap-4 rounded-lg bg-white p-5 text-left ring-1 ring-[#123E5C]/10 transition duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-0.5 text-3xl font-extrabold leading-none text-[#22ABE2]",
					children: i + 2
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "block truncate text-lg text-[#123E5C]",
							children: m.nombre
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "mt-0.5 mb-3 block text-[15px] text-[#6B93AA]",
							children: [
								plural(m.entregas, "entrega", "entregas"),
								" · ",
								m.toneladas,
								" toneladas"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block h-[6px] overflow-hidden rounded-full bg-[#DDF0FA]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
								className: "vc-crece block h-full rounded-full bg-[#0079C1]",
								style: {
									width: `${m.entregas / max * 100}%`,
									"--i": i + 1
								}
							})
						})
					]
				})]
			}) }, m.destinoId))
		})]
	})] });
}
function CoberturaPorZona({ conRotulo = true }) {
	const { zonas } = useOperacion();
	if (zonas.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [conRotulo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Ayudas por zona" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${conRotulo ? "mt-5" : ""}`,
		children: zonas.map((z, i) => {
			const ratio = z.total > 0 ? z.atendidos / z.total : 0;
			const completa = z.atendidos === z.total;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: { "--i": i },
				className: "vc-aparece rounded-lg bg-white p-6 shadow-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-bold uppercase tracking-[0.16em] text-[#6B93AA]",
						children: z.zona
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-[clamp(2.25rem,5vw,2.3rem)] font-extrabold leading-none text-[#123E5C]",
						children: [z.atendidos, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xl font-semibold text-[#8FAABC]",
							children: [
								" ",
								"de ",
								z.total,
								" - Municipios"
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 h-2 overflow-hidden rounded-full bg-[#DDF0FA]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
							className: "vc-crece block h-full rounded-full",
							style: {
								width: `${ratio * 100}%`,
								background: completa ? VERDE_COMPLETO : AMBAR_PENDIENTE,
								"--i": i
							}
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-base font-semibold text-[#0079C1]",
						children: completa ? "Todos recibieron ayudas" : `${z.total - z.atendidos} sin entregas`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-0.5 text-base text-[#6B93AA]",
						children: [plural(z.entregas, "entrega", "entregas"), " en total"]
					})
				]
			}, z.zona);
		})
	})] });
}
function MunicipiosGrid({ onSelect, conRotulo = true }) {
	const { municipios, catalogo, zonas } = useOperacion();
	const [zona, setZona] = (0, import_react.useState)(TODAS);
	const [texto, setTexto] = (0, import_react.useState)("");
	const max = Math.max(1, ...municipios.map((m) => m.entregas));
	/**
	* Se parte del catálogo para que aparezcan también los municipios que
	* todavía no registran entregas. La API solo devuelve los que sí.
	*/
	const todos = (0, import_react.useMemo)(() => {
		const porNombre = new Map(municipios.map((m) => [norm(m.nombre), m]));
		return catalogo.map((cat) => {
			return porNombre.get(norm(cat.nombre)) ?? {
				destinoId: cat.codigoDane,
				nombre: cat.nombre,
				codigoDane: cat.codigoDane,
				zona: cat.zona,
				entregas: 0,
				toneladas: 0,
				dias: {},
				primeraFecha: null,
				ultimaFecha: null
			};
		});
	}, [municipios, catalogo]);
	const visibles = (0, import_react.useMemo)(() => {
		const q = norm(texto);
		return todos.filter((m) => (zona === TODAS || m.zona === zona) && (!q || norm(m.nombre).includes(q))).sort((a, b) => b.entregas - a.entregas || a.nombre.localeCompare(b.nombre, "es"));
	}, [
		todos,
		zona,
		texto
	]);
	const filtros = [{
		valor: TODAS,
		etiqueta: "Todas las zonas",
		cantidad: todos.length
	}, ...zonas.map((z) => ({
		valor: z.zona,
		etiqueta: z.zona,
		cantidad: z.total
	}))];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
		conRotulo && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SectionLabel, { children: [
			"Los ",
			todos.length,
			" municipios"
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: `rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#123E5C]/10 sm:p-5 ${conRotulo ? "mt-5" : ""}`,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: filtros.map((f) => {
					const activo = zona === f.valor;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setZona(f.valor),
						"aria-pressed": activo,
						className: `inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold transition duration-200 ${activo ? "bg-[#0079C1] text-white shadow-md" : "bg-[#EAF7FC] text-[#35708F] hover:bg-[#DDF0FA] hover:text-[#0079C1]"}`,
						children: [f.etiqueta, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `rounded-full px-2 py-0.5 text-sm font-bold ${activo ? "bg-white/25 text-white" : "bg-white text-[#0079C1]"}`,
							children: f.cantidad
						})]
					}, f.valor);
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-col gap-3 sm:flex-row sm:items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "search",
					value: texto,
					onChange: (e) => setTexto(e.target.value),
					placeholder: "Buscar municipio…",
					"aria-label": "Buscar municipio",
					className: "min-w-0 flex-1 rounded-lg border-2 border-transparent bg-[#F2FAFD] px-4 py-3 text-base text-[#123E5C] outline-none transition placeholder:text-[#8FAABC] focus:border-[#0079C1] focus:bg-white"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "shrink-0 text-base font-semibold text-[#35708F] sm:text-right",
					"aria-live": "polite",
					children: visibles.length === todos.length ? plural(visibles.length, "municipio", "municipios") : `${visibles.length} de ${todos.length} municipios`
				})]
			})]
		}),
		visibles.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-6 rounded-lg border-2 border-dashed border-[#0079C1]/40 bg-white/60 p-10 text-center text-base text-[#35708F]",
			children: "Ningún municipio coincide. Pruebe con otro nombre o quite el filtro de zona."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))]",
			children: visibles.map((m, i) => {
				const sinEntregas = m.entregas === 0;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onSelect?.(m),
					style: { "--i": Math.min(i, 24) },
					className: `vc-aparece group relative overflow-hidden rounded-lg p-5 text-left ring-1 ring-[#123E5C]/10 transition duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0 ${sinEntregas ? "bg-[#EAF7FC]" : "bg-white"}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							"aria-hidden": true,
							className: "absolute inset-x-0 top-0 h-1 transition-all duration-200 group-hover:h-1.5",
							style: { background: sinEntregas ? "#A8CFE2" : "#0079C1" }
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
								className: "min-w-0 truncate text-lg text-[#123E5C]",
								children: m.nombre
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `text-3xl font-extrabold leading-none ${sinEntregas ? "text-[#A8CFE2]" : "text-[#0079C1]"}`,
								children: m.entregas
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "my-3 h-[6px] overflow-hidden rounded-full bg-[#DDF0FA]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
								className: "vc-crece block h-full rounded-full bg-[#22ABE2]",
								style: {
									width: `${m.entregas / max * 100}%`,
									"--i": Math.min(i, 24)
								}
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2 text-[15px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-[#EAF7FC] px-2.5 py-1 text-[13px] font-semibold text-[#35708F]",
								children: m.zona ?? "Sin zona"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: sinEntregas ? "text-[#8FAABC]" : "font-semibold text-[#35708F]",
								children: sinEntregas ? "Sin entregas" : `${m.toneladas} t`
							})]
						})
					]
				}, m.destinoId);
			})
		}, `${zona}-${texto}`)
	] });
}
/**
* ListaDeNombres.tsx
* -----------------------------------------------------------------------
* Una lista de nombres separados por coma, donde ningún nombre se parte
* entre dos líneas.
*
* EL PROBLEMA
*
* `nombres.join(", ")` produce una sola cadena, y el navegador no tiene
* cómo distinguir el espacio de "La Victoria" del que separa dos
* municipios: parte donde le convenga. En el listado de zonas se leía
*
*     ... Toro, Ulloa, La
*     Victoria, Versalles ...
*
* y "La" quedaba huérfana al final del renglón. Pasa con La Victoria, La
* Unión, La Cumbre, El Cerrito, El Águila, El Cairo, El Dovio, San
* Pedro, Guadalajara de Buga, Santiago de Cali y Calima - El Darién:
* once de los cuarenta y dos.
*
* POR QUÉ EL SEPARADOR VA AFUERA DEL SPAN
*
* Es lo que más se equivoca al resolver esto. Si el `, ` va adentro del
* `whitespace-nowrap`, ese espacio también queda sin poder partirse, y
* como es el único espacio entre un nombre y el siguiente, la lista
* entera se vuelve una línea indivisible que desborda a lo ancho.
*
* Con el separador afuera, el navegador tiene exactamente una
* oportunidad de corte entre nombre y nombre, que es lo que se quiere. Y
* la coma queda pegada al nombre que la precede, porque entre el cierre
* del span y la coma no hay ningún espacio.
*
* POR QUÉ NO SE USAN ESPACIOS DURos
*
* La alternativa corta era `nombre.replace(/ /g, "\u00A0")`. Funciona,
* pero cambia el TEXTO y no solo cómo se pinta: buscar "La Victoria" con
* Ctrl+F deja de encontrarlo, y al copiar la lista se pegan caracteres
* invisibles raros. Acá el texto queda intacto y el que no parte es el
* CSS.
* -----------------------------------------------------------------------
*/
function ListaDeNombres({ nombres, cierre = ".", className }) {
	if (nombres.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className,
		children: nombres.map((nombre, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "whitespace-nowrap",
			children: nombre
		}), i < nombres.length - 1 ? ", " : cierre] }, `${i}-${nombre}`))
	});
}
/**
* EvolucionHeatmap.tsx
* -----------------------------------------------------------------------
* Una casilla por municipio y día, agrupadas por zona.
*
* Todo sale de la API vía OperacionContext: los días, las entregas y las
* zonas se recalculan solos cuando cambia el Excel.
*
* SOBRE EL COLOR
*
* La pieza de diseño alterna crema, amarillo, naranja, azul y blanco.
* Ahí es decoración, porque todas las casillas dicen 1 y es una maqueta.
* Acá el color tiene que significar algo, así que se ordenan de menos a
* más: crema para una entrega, naranja para el día más intenso. Se usa la
* misma paleta de la pieza, solo que en secuencia.
*
* El cero no es el extremo bajo de la escala, es una categoría aparte:
* queda en azul apagado, para que un día sin entregas no se confunda con
* un día de poca actividad.
* -----------------------------------------------------------------------
*/
/** De menos a más entregas. Tomada de la pieza. */
var ESCALA = [
	"#FDFBE0",
	"#FBF8C6",
	"#FCE07A",
	"#F7B733",
	"#F0801E"
];
/** Día sin entregas. Categoría aparte, no el extremo de la escala. */
var SIN_ENTREGAS = "#0A5E97";
function EvolucionHeatmap({ onSelect }) {
	const { jornadas, municipios, zonas } = useOperacion();
	const dias = (0, import_react.useMemo)(() => jornadas.map((j) => j.dia), [jornadas]);
	/** Tope de la escala: la casilla más alta de toda la rejilla. */
	const maxDia = (0, import_react.useMemo)(() => Math.max(1, ...municipios.flatMap((m) => Object.values(m.dias))), [municipios]);
	const grupos = (0, import_react.useMemo)(() => zonas.map((z) => ({
		zona: z.zona,
		filas: municipios.filter((m) => (m.zona ?? "Sin zona") === z.zona).sort((a, b) => b.entregas - a.entregas || a.nombre.localeCompare(b.nombre, "es"))
	})).filter((g) => g.filas.length > 0), [zonas, municipios]);
	if (dias.length === 0) return null;
	const colorDe = (valor) => {
		if (valor <= 0) return SIN_ENTREGAS;
		return ESCALA[Math.min(ESCALA.length - 1, Math.round((valor - 1) / Math.max(1, maxDia - 1) * (ESCALA.length - 1)))] ?? ESCALA[0];
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "vc-titular text-[clamp(1.5rem,4.6vw,5.5rem)] text-[#0079C1]",
			children: "¿Cuánta ayuda se entregó cada día?"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 max-w-3xl text-lg leading-8 text-[#35708F]",
			children: "Cada casilla representa un día. Los colores más intensos indican los días en que se hicieron más entregas."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 space-y-5",
			children: grupos.map(({ zona, filas }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-md bg-[#123E5C] p-4 sm:p-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-5 lg:flex-row lg:gap-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "lg:w-52 lg:shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
							className: "vc-titular text-3xl text-white sm:text-4xl",
							children: zona
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListaDeNombres, {
							nombres: filas.map((m) => m.nombre),
							className: "mt-3 block text-base leading-6 text-white"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "min-w-0 flex-1 overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-160",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fila, {
								dias,
								etiqueta: "",
								celdas: dias.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-center text-sm font-bold text-white",
									children: d
								}, d)),
								total: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-bold text-white",
									children: "total"
								}),
								sobreOscuro: true
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2 rounded-sm bg-[#22ABE2] p-2.5",
								children: filas.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => onSelect?.(m),
									className: "block w-full rounded-sm transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fila, {
										dias,
										etiqueta: m.nombre,
										celdas: dias.map((d) => {
											const v = m.dias[d] ?? 0;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												title: `${m.nombre}, día ${d}: ${v === 0 ? "sin entregas" : v === 1 ? "1 entrega" : `${v} entregas`}`,
												className: "flex h-6 items-center justify-center rounded-[2px] text-[13px] font-bold text-[#0079C1]",
												style: { background: colorDe(v) },
												children: v > 0 ? v : ""
											}, d);
										}),
										total: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-right text-base font-extrabold text-[#ffffff]",
											children: m.entregas
										})
									})
								}, m.destinoId))
							})]
						})
					})]
				})
			}, zona))
		})
	] });
}
function Fila({ dias, etiqueta, celdas, total, sobreOscuro = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid items-center gap-[3px] py-[2px]",
		style: { gridTemplateColumns: `108px repeat(${dias.length}, 1fr) 44px` },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `truncate pr-2 text-left text-[13px] font-semibold ${sobreOscuro ? "text-white" : "text-[#fefefe]"}`,
				children: etiqueta
			}),
			celdas,
			total
		]
	});
}
var categoriasAyuda = [
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
			["Cepillos de dientes", 1894]
		]
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
			["Aceite", 1048]
		]
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
			["Tapabocas sencillos", 2e3],
			["Caretas", 1742],
			["Guantes", 1630],
			["Cascos", 1245],
			["Guantes de construcción", 718],
			["Guantes quirúrgicos", 600]
		]
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
			["Agua 1 litro", 450]
		]
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
			["Colchonetas térmicas", 171]
		]
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
			["Kit de cocina", 45]
		]
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
			["Teteros", 115]
		]
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
			["Vasos plásticos", 224]
		]
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
			["Bolsas plásticas", 73]
		]
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
			["Comida húmeda", 107]
		]
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
			["Bolsas con ropa de mujer", 75]
		]
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
			["Papel de cocina", 96]
		]
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
			["Pilas doble A", 24]
		]
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
			["Tabletas de acetaminofén", 1]
		]
	}
];
/** Agrupación por necesidad. El color de cada categoría ya la codifica; esto la nombra. */
var familiasDeAyuda = [
	{
		nombre: "Subsistencia",
		categorias: ["Alimentos", "Líquidos e hidratación"]
	},
	{
		nombre: "Higiene y salud",
		categorias: [
			"Aseo personal",
			"Aseo del hogar",
			"Bebé",
			"Salud"
		]
	},
	{
		nombre: "Habitabilidad",
		categorias: [
			"Descanso y abrigo",
			"Ropa y calzado",
			"Menaje y utensilios"
		]
	},
	{
		nombre: "Protección",
		categorias: ["Protección y seguridad", "Herramientas y materiales"]
	},
	{
		nombre: "Mascotas",
		categorias: ["Mascotas"]
	},
	{
		nombre: "Sin desagregar",
		categorias: ["Kits sin desagregar", "Sin clasificar"]
	}
];
/**
* AyudaSection.tsx
* -----------------------------------------------------------------------
* Composición de la ayuda entregada. Al elegir una categoría, la lista
* de la derecha cambia a los artículos que la componen.
*
* AHORA TODO VIENE DE LA BASE
*
* Los nombres de producto salían de `ayudaData.ts`, escritos a mano, y
* contradecían al propio tablero en la misma pantalla: decía "Tapabocas
* 17.100" al lado de "Protección y seguridad: 11.167 unidades", y la
* suma de los catorce artículos del listado general, 100.426, superaba
* el total de toda la operación, 96.360.
*
* La hoja DETALLE_PRODUCTO resolvió las dos cosas a la vez. De ahí salen
* ahora los productos Y las unidades, así que las dos cifras nacen del
* mismo sitio y no pueden volver a divergir.
*
* De paso quedó claro que `ayudaData.ts` NUNCA estuvo desactualizado:
* sus 256.650 unidades y sus diez productos más entregados coinciden con
* el detalle real. Lo que estaba mal era ENVIOS_CATEGORIA.unidades, que
* es de donde el tablero venía sacando sus 96.360.
*
* QUÉ QUEDA DEL CATÁLOGO ESTÁTICO
*
* Solo dos cosas, y las dos son decisiones editoriales, no datos: el
* COLOR de cada categoría y la agrupación en FAMILIAS. Ni una cifra.
*
* TRES COMPORTAMIENTOS QUE SIGUEN VIGENTES
*
* 1. El panel grande responde a la selección con datos reales. Las
*    toneladas NO se desagregan por categoría, y repartir el total
*    proporcional a las unidades sería inventarlas: esa columna mezcla
*    mercados, paquetes, kilos y pacas. Así que al elegir una categoría
*    la cifra grande pasa a ser sus unidades.
*
* 2. Al elegir una categoría, la vista baja hasta la lista de artículos.
*    `block: "nearest"` no mueve nada en escritorio, donde la tarjeta es
*    sticky y ya está a la vista.
*
* 3. Cerrar es una X en la esquina, no un botón de texto al final.
* -----------------------------------------------------------------------
*/
function AyudaSection() {
	const [activa, setActiva] = (0, import_react.useState)(null);
	const { totalToneladas, toneladasMedidas } = useOperacion();
	const { data: ayuda } = useAyuda();
	const { enfocarCategoria } = useFoco();
	const panelRef = (0, import_react.useRef)(null);
	/**
	* El color y nada más sale del archivo local. Todo lo demás —unidades,
	* municipios, productos— viene de la ruta.
	*/
	const categorias = (0, import_react.useMemo)(() => {
		if (!ayuda) return [];
		return ayuda.categorias.map((viva) => {
			const local = categoriasAyuda.find((c) => c.nombre === viva.nombre);
			return {
				nombre: viva.nombre,
				unidades: viva.unidades,
				municipios: viva.municipios,
				color: local?.color ?? "#6B93AA",
				productos: viva.productos ?? [],
				productosDistintos: viva.productosDistintos ?? viva.productos?.length ?? 0
			};
		});
	}, [ayuda]);
	const totalUnidades = ayuda?.totalUnidades ?? 0;
	const poblaciones = (0, import_react.useMemo)(() => (ayuda?.poblaciones ?? []).map((p) => [p.nombre, p.despachos]), [ayuda]);
	const pct = (unidades) => totalUnidades > 0 ? Math.round(unidades / totalUnidades * 100) : 0;
	/**
	* Porcentaje para mostrar.
	*
	* Salud son 87 unidades de 256.263, un 0,03 por ciento. Redondeado da
	* cero, y un cero se lee como que no se entregó nada. Sí se entregó,
	* solo que poco. "menos de 1" dice lo mismo sin mentir.
	*/
	const pctTexto = (unidades) => {
		if (unidades <= 0) return "0%";
		const redondeado = pct(unidades);
		return redondeado === 0 ? "<1%" : `${redondeado}%`;
	};
	const categoria = activa ? categorias.find((c) => c.nombre === activa) : void 0;
	const maxUnidades = Math.max(1, ...categorias.map((c) => c.unidades));
	(0, import_react.useEffect)(() => {
		if (!activa || !panelRef.current) return;
		const prefiereQuieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		panelRef.current.scrollIntoView({
			behavior: prefiereQuieto ? "auto" : "smooth",
			block: "nearest"
		});
	}, [activa]);
	const waffle = (0, import_react.useMemo)(() => categorias.flatMap((c) => Array.from({ length: Math.round(c.unidades / Math.max(1, totalUnidades) * 100) }, () => c)), [categorias, totalUnidades]);
	/**
	* Los artículos que se listan a la derecha.
	*
	* Con categoría elegida, los suyos y en su color. Sin categoría, el
	* ranking general que calcula el backend: no se puede armar sumando
	* las listas por categoría, porque cada una viene recortada a sus doce
	* primeros y el resultado sería un ranking de los recortes.
	*/
	const productos = categoria ? categoria.productos.map((p) => ({
		label: p.nombre,
		value: p.unidades,
		color: categoria.color
	})) : (ayuda?.productosDestacados ?? []).map((p) => ({
		label: p.nombre,
		value: p.unidades
	}));
	const sinDatos = categorias.length === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "bg-[#22ABE2] px-4 py-12 sm:px-6 sm:py-12 md:px-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-auto max-w-6xl",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				className: "vc-titular max-w-4xl text-[clamp(2rem,6.5vw,4.5rem)] text-white",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block",
					children: "La mayor parte de la ayuda es"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-2 block w-fit bg-[#FBF8C6] px-[0.3em] py-[0.06em] text-[#0079C1]",
					children: "aseo, comida y agua"
				})]
			})
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "px-4 py-12 pb-16 sm:px-6 sm:py-14 md:px-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-6xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "max-w-3xl text-lg leading-8 text-[#35708F]",
					children: "Las categorías de entrega muestran los diferentes tipos de ayudas entregadas a las comunidades afectadas, de acuerdo con las necesidades identificadas durante la atención de la emergencia."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 max-w-2xl text-lg leading-8 text-[#35708F]",
					children: "Seleccione una categoría para ver qué artículos incluyó."
				}),
				sinDatos ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-10",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Aviso, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "No se pudieron cargar las cifras." }), " La composición de la ayuda se calcula desde el registro de entregas y en este momento no está disponible. Vuelva a intentarlo en unos minutos."] })
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-10 grid gap-8 rounded-xl border border-[#0079C1]/12 bg-white p-5 sm:p-7 lg:grid-cols-[minmax(210px,0.7fr)_minmax(0,1.4fr)] lg:items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-center",
							children: categoria ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
									className: "vc-titular block text-[64px] tracking-[-0.02em] tabular-nums text-[#0079C1]",
									children: categoria.unidades.toLocaleString("es-CO")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "mt-3 block text-lg text-[#35708F]",
									children: ["Unidades de ", categoria.nombre.toLowerCase()]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "mt-2 block text-base leading-6 text-[#6B93AA]",
									children: [
										pctTexto(categoria.unidades),
										" de toda la ayuda",
										categoria.municipios !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
											" · ",
											categoria.municipios,
											" ",
											categoria.municipios === 1 ? "municipio" : "municipios"
										] })
									]
								})
							] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
									className: "vc-titular block text-[64px] tracking-[-0.02em] tabular-nums text-[#0079C1]",
									children: totalToneladas.toLocaleString("es-CO")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-3 block text-lg text-[#35708F]",
									children: "toneladas de ayuda"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-2 block text-base leading-6 text-[#6B93AA]",
									children: toneladasMedidas ? "entregadas en todo el departamento, por todas las rutas" : "estimadas a partir del número de entregas"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-xl font-semibold text-[#123E5C]",
								children: "¿De qué está hecha esa ayuda?"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-4 flex h-8 overflow-hidden rounded-md sm:h-9",
								children: categorias.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
									title: `${c.nombre}: ${c.unidades.toLocaleString("es-CO")} unidades, ${pctTexto(c.unidades)} de la ayuda`,
									className: "block transition-opacity",
									style: {
										flex: c.unidades,
										background: c.color,
										opacity: activa && activa !== c.nombre ? .28 : 1
									}
								}, c.nombre))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-4 flex flex-wrap gap-[3px] sm:gap-1",
								children: waffle.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
									title: c.nombre,
									className: "block size-[11px] rounded-[2px] sm:size-[15px] sm:rounded-[2.5px]",
									style: {
										background: c.color,
										opacity: activa && activa !== c.nombre ? .28 : 1
									}
								}, `${c.nombre}-${i}`))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-base text-[#6B93AA]",
								children: "Cada bloque es el 1 por ciento de la ayuda. El color indica a qué necesidad responde cada categoría."
							})
						] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-[15px] text-[#35708F]",
						children: familiasDeAyuda.map((f) => {
							const colores = f.categorias.map((n) => categorias.find((c) => c.nombre === n)?.color).filter((c) => typeof c === "string");
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
										className: "block h-2 w-6 rounded-sm",
										style: { background: colores.length > 1 ? `linear-gradient(90deg, ${colores.join(",")})` : colores[0] ?? "#6B93AA" }
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: "font-semibold text-[#123E5C]",
										children: f.nombre
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[#6B93AA]",
										children: ["· ", f.categorias.join(", ")]
									})
								]
							}, f.nombre);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)] lg:items-start",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-bold uppercase tracking-[0.16em] text-[#0079C1]",
							children: "Categorías"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 grid gap-2.5 sm:grid-cols-2",
							children: categorias.map((c, i) => {
								const seleccionada = activa === c.nombre;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-pressed": seleccionada,
									onClick: () => setActiva(seleccionada ? null : c.nombre),
									style: { "--i": i },
									className: `vc-aparece group relative overflow-hidden rounded-md p-4 text-left transition duration-200 ${seleccionada ? "-translate-y-0.5 text-white shadow-lg" : "bg-white hover:-translate-y-0.5 hover:shadow-md"} motion-reduce:hover:translate-y-0`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											"aria-hidden": true,
											className: "absolute inset-0 -z-10 transition-opacity duration-200",
											style: {
												background: c.color,
												opacity: seleccionada ? 1 : 0
											}
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											"aria-hidden": true,
											className: "absolute inset-y-0 left-0 w-1",
											style: { background: seleccionada ? "transparent" : c.color }
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-baseline justify-between gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `min-w-0 truncate text-base font-semibold ${seleccionada ? "text-white" : "text-[#123E5C]"}`,
												children: c.nombre
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `shrink-0 text-2xl font-extrabold ${seleccionada ? "text-white" : "text-[#0079C1]"}`,
												children: pctTexto(c.unidades)
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "mt-3 block h-[5px] overflow-hidden rounded-full bg-black/10",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
												className: "vc-crece block h-full rounded-full",
												style: {
													width: `${c.unidades / maxUnidades * 100}%`,
													background: seleccionada ? "#FFFFFF" : c.color,
													"--i": i
												}
											})
										}),
										c.municipios !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: `mt-2.5 block text-[15px] ${seleccionada ? "text-white/85" : "text-[#6B93AA]"}`,
											children: [
												"Llegó a ",
												c.municipios,
												" ",
												c.municipios === 1 ? "municipio" : "municipios"
											]
										})
									]
								}, c.nombre);
							})
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							ref: panelRef,
							className: "scroll-mt-6 lg:sticky lg:top-6",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
								className: "relative",
								children: [
									categoria && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setActiva(null),
										"aria-label": `Cerrar ${categoria.nombre} y volver a lo más entregado`,
										className: "absolute right-3 top-3 grid size-9 place-items-center rounded-full text-[#6B93AA] transition hover:bg-[#DDF0FA] hover:text-[#0079C1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1]",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
											className: "size-5",
											"aria-hidden": true
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "pr-10 text-sm font-bold uppercase tracking-[0.16em] text-[#0079C1]",
										children: categoria ? categoria.nombre : "Lo más entregado"
									}),
									categoria && categoria.productosDistintos > categoria.productos.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-[15px] text-[#6B93AA]",
										children: [
											"Los ",
											categoria.productos.length,
											" más entregados de",
											" ",
											categoria.productosDistintos,
											" artículos distintos."
										]
									}),
									productos.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "mt-4 flex flex-col gap-3",
										children: productos.map((prod, i) => {
											const maximo = Math.max(1, ...productos.map((x) => x.value));
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
												style: { "--i": i },
												className: "vc-aparece",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-baseline justify-between gap-3",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "min-w-0 truncate text-base text-[#35708F]",
														children: prod.label
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
														className: "shrink-0 tabular-nums text-[#123E5C]",
														children: prod.value.toLocaleString("es-CO")
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "mt-1.5 h-[5px] overflow-hidden rounded-full bg-[#DDF0FA]",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
														className: "vc-crece block h-full rounded-full",
														style: {
															width: `${prod.value / maximo * 100}%`,
															background: prod.color ?? "#0079C1",
															"--i": i
														}
													})
												})]
											}, prod.label);
										})
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-4 text-base text-[#6B93AA]",
										children: "No hay detalle de artículos para esta categoría."
									}),
									categoria && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-6 border-t border-[#0079C1]/12 pt-5",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => enfocarCategoria(categoria.nombre),
											className: "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0079C1] px-5 py-3 text-base font-bold text-white transition hover:bg-[#00639F]",
											children: "Conozca dónde llegó la ayuda"
										})
									})
								]
							}, categoria?.nombre ?? "general")
						})]
					})
				] }),
				poblaciones.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-14 rounded-md bg-[#0079C1] p-6 sm:p-10",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "vc-titular text-[clamp(1.5rem,4vw,2.5rem)] text-[#FBF8C6]",
							children: "¿A quién llegó la ayuda?"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 max-w-3xl text-base leading-7 text-white sm:text-lg",
							children: "Conozca los grupos a los que fue dirigida. Una misma entrega puede incluir varios grupos, por eso la suma puede ser mayor que el total de entregas."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3",
							children: poblaciones.map(([nombre, entregas]) => {
								const maximo = Math.max(1, ...poblaciones.map(([, v]) => v));
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-baseline justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "min-w-0 truncate text-base text-white sm:text-lg",
										children: nombre
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: "shrink-0 text-xl font-extrabold text-[#FBF8C6]",
										children: entregas
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-2 h-[6px] overflow-hidden rounded-full bg-white/25",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
										className: "block h-full rounded-full bg-[#FFD400]",
										style: { width: `${entregas / maximo * 100}%` }
									})
								})] }, nombre);
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Aviso, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Cómo leer estas cifras." }),
						" Los porcentajes comparan cuánta ayuda de cada tipo se entregó.",
						" ",
						toneladasMedidas ? "Las toneladas son el peso registrado en todo el departamento, incluidas las rutas que no llegan a un municipio. No están desagregadas por categoría." : "Las toneladas son una estimación a partir del número de entregas."
					] })
				})
			]
		})
	})] });
}
var canalesPresentacion = [
	{
		id: "cali",
		nombre: "Cali",
		glosa: "Capital del departamento. Va por su propio canal, fuera del conteo por municipio.",
		color: "#22ABE2"
	},
	{
		id: "cartago",
		nombre: "Centro de distribución Cartago",
		glosa: "Segunda bodega. Lo que salió de acá ya está contado en los municipios del norte que lo recibieron.",
		color: "#F7B733"
	},
	{
		id: "multiples",
		nombre: "Municipios múltiples",
		glosa: "Formatos que repartieron a varios municipios sin desagregar cuál recibió qué.",
		color: "#8375A9"
	},
	{
		id: "otras-ayudas-solidarias",
		nombre: "Otras ayudas humanitarias",
		glosa: "Ayudas entregadas a otros grupos de personas afectadas, sin estar asociadas a un municipio específico.",
		color: "#F0801E"
	}
];
/** Color y glosa de un grupo, por su id. */
function presentacionDe(id) {
	return canalesPresentacion.find((c) => c.id === id);
}
var ORIGEN_CARTAGO$1 = "ORI-CARTAGO";
/** Rutas con identidad propia. Van como tarjeta grande, en este orden. */
var RUTAS_PRINCIPALES = ["cali", "cartago"];
function CanalesSection() {
	const op = useOperacion();
	const { data: ayuda } = useAyuda();
	const cartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO$1);
	/**
	* Cartago ya viene como grupo desde route=ayuda, porque en el catálogo
	* es un destino de tipo centro_acopio: parte de la ayuda se registró a
	* nombre de la bodega antes de repartirse.
	*
	* Pero sus ENTREGAS reales son las que salieron de ahí hacia los
	* municipios, y eso solo lo sabe route=flujos agrupando por origen. Por
	* eso esa cifra se pisa, en vez de agregar una tarjeta aparte que
	* duplicaría la ruta.
	*/
	const rutas = (ayuda?.canales ?? []).map((c) => {
		const pres = presentacionDe(c.id);
		const esCartago = c.id === "cartago";
		return {
			id: c.id,
			nombre: pres?.nombre ?? c.nombre,
			glosa: esCartago && cartago ? `Segunda bodega. Abastece a ${cartago.municipios} municipios del norte por una ruta propia.` : pres?.glosa ?? "",
			color: pres?.color ?? "#22ABE2",
			entregas: esCartago && cartago ? cartago.entregas : c.entregas,
			unidades: c.unidades,
			categorias: c.categorias
		};
	});
	const sinDatos = rutas.length === 0;
	/**
	* Lo que el consolidado municipal realmente deja fuera. Cartago no
	* entra: sus entregas llegaron a municipios que ya están contados.
	*/
	const rutasFueraDelConteo = rutas.filter((r) => r.id !== "cartago");
	const entregasFuera = rutasFueraDelConteo.reduce((sum, r) => sum + r.entregas, 0);
	rutasFueraDelConteo.reduce((sum, r) => sum + r.unidades, 0);
	const toneladasDe = (entregas) => Math.round(entregas * op.pesoPorEntrega);
	const principales = RUTAS_PRINCIPALES.map((id) => rutas.find((r) => r.id === id)).filter((r) => r !== void 0);
	const secundarias = rutas.filter((r) => !RUTAS_PRINCIPALES.includes(r.id)).sort((a, b) => b.unidades - a.unidades);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "Además de los municipios, la ayuda salió por otras rutas" }),
			sinDatos ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-5 max-w-2xl text-lg leading-8 text-[#35708F]",
				children: "El conteo por municipio deja fuera estas rutas."
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-8 grid gap-3 sm:grid-cols-3",
				children: canalesPresentacion.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-lg bg-white p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block h-1 w-10 rounded-full",
							style: { background: c.color }
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mt-3 text-lg font-semibold text-[#123E5C]",
							children: c.nombre
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[15px] leading-6 text-[#6B93AA]",
							children: c.glosa
						})
					]
				}, c.id))
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-5 max-w-2xl text-lg leading-8 text-[#35708F]",
					children: [
						"El conteo por municipio deja fuera estas rutas. Suman",
						" ",
						entregasFuera.toLocaleString("es-CO"),
						" entregas y unas",
						" ",
						toneladasDe(entregasFuera).toLocaleString("es-CO"),
						" toneladas que también se movieron."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-9 grid gap-4 lg:grid-cols-2",
					children: principales.map((r, i) => {
						const maximo = Math.max(1, ...r.categorias.map((c) => c.unidades));
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							style: { "--i": i },
							className: "vc-aparece rounded-lg bg-[#123E5C] p-7 sm:p-9",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-bold uppercase tracking-[0.16em] text-[#FFD400]",
									children: "Ruta principal"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "vc-titular mt-3 text-[clamp(1.75rem,4.5vw,2.75rem)] text-white",
									children: r.nombre
								}),
								r.glosa && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-base leading-6 text-[#A8CFE2]",
									children: r.glosa
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-6 flex flex-wrap gap-x-10 gap-y-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: "block text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-none text-[#FBF8C6]",
										children: Math.round(r.unidades).toLocaleString("es-CO")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-1 block text-base text-[#A8CFE2]",
										children: "unidades"
									})] }), r.entregas > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: "block text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-none text-[#FBF8C6]",
										children: r.entregas.toLocaleString("es-CO")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-1 block text-base text-[#A8CFE2]",
										children: r.entregas === 1 ? "entrega" : "entregas"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: "block text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-none text-[#FBF8C6]",
										children: toneladasDe(r.entregas).toLocaleString("es-CO")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-1 block text-base text-[#A8CFE2]",
										children: "toneladas estimadas"
									})] })] })]
								}),
								r.categorias.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-7 flex flex-col gap-3 border-t border-white/15 pt-6",
									children: r.categorias.map((cat, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										style: { "--i": j },
										className: "vc-aparece",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-baseline justify-between gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "min-w-0 truncate text-base text-white",
												children: cat.nombre
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
												className: "shrink-0 tabular-nums text-[#FBF8C6]",
												children: cat.unidades.toLocaleString("es-CO")
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/20",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
												className: "vc-crece block h-full rounded-full",
												style: {
													width: `${cat.unidades / maximo * 100}%`,
													background: r.color,
													"--i": j
												}
											})
										})]
									}, cat.nombre))
								})
							]
						}, r.id);
					})
				}),
				secundarias.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
					children: secundarias.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						style: { "--i": i },
						className: "vc-aparece rounded-lg bg-white p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block h-1 w-10 rounded-full",
								style: { background: r.color }
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "mt-3 text-lg font-semibold text-[#123E5C]",
								children: r.nombre
							}),
							r.glosa && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-[15px] leading-6 text-[#6B93AA]",
								children: r.glosa
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-4 flex items-baseline gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
									className: "text-3xl font-extrabold leading-none text-[#0079C1]",
									children: Math.round(r.unidades).toLocaleString("es-CO")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-base text-[#6B93AA]",
									children: "unidades"
								})]
							}),
							r.entregas > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-[15px] text-[#6B93AA]",
								children: [
									r.entregas.toLocaleString("es-CO"),
									" ",
									r.entregas === 1 ? "entrega" : "entregas",
									" ·",
									" ",
									toneladasDe(r.entregas).toLocaleString("es-CO"),
									" toneladas estimadas"
								]
							})
						]
					}, r.id))
				})
			] }),
			cartago && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 rounded-lg bg-[#0079C1] p-7 sm:p-9",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "vc-titular text-[clamp(1.5rem,4vw,2.25rem)] text-[#FBF8C6]",
						children: "La red del centro de distribución de Cartago"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 max-w-2xl text-base leading-7 text-white sm:text-lg",
						children: [
							"Esta bodega registra a qué municipio salió cada entrega. Es la única ruta que no parte de Cali y explica cómo se abasteció el norte: ",
							cartago.entregas,
							" entregas hacia",
							" ",
							cartago.municipios,
							" municipios."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3",
						children: cartago.destinos.map((d, i) => {
							const maximo = Math.max(1, ...cartago.destinos.map((x) => x.entregas));
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								style: { "--i": i },
								className: "vc-aparece",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-baseline justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "min-w-0 truncate text-base text-white",
										children: d.nombre
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: "shrink-0 text-lg font-extrabold text-[#FBF8C6]",
										children: d.entregas
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/25",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
										className: "vc-crece block h-full rounded-full bg-[#FFD400]",
										style: {
											width: `${d.entregas / maximo * 100}%`,
											"--i": i
										}
									})
								})]
							}, d.nombre);
						})
					})
				]
			})
		]
	});
}
var ORIGEN_CARTAGO = "ORI-CARTAGO";
/**
* Ayudas recibidas en el centro de acopio.
*
* ES EL ÚLTIMO DATO ESCRITO A MANO DE ESTA SECCIÓN, y hay que sacarlo.
* Sale de la hoja AYUDAS RECIBIDAS del Excel, que ninguna ruta expone
* todavía. Mientras no exista `route=ayudas-recibidas`, cada corte
* obliga a editar este archivo.
*
* OJO CON LA FECHA: la hoja dice "03 Agosto de 2026" para este mismo
* 889. Una de las dos está mal y hay que confirmarlo antes de publicar
* otro corte. Agosto sería tres semanas antes del cierre del resto de
* las cifras, y el 3 de agosto es anterior al terremoto.
*
* El valor y el corte van juntos en un objeto a propósito: separados, la
* próxima actualización cambia uno y deja el otro quieto.
*/
var RECIBIDAS = {
	valor: "889 t",
	corte: "3 de septiembre de 2026"
};
function BalanceFinal() {
	const op = useOperacion();
	const { data: ayuda } = useAyuda();
	const entregasCartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO)?.entregas ?? 0;
	const canalesVivos = ayuda?.canales ?? [];
	const canal = (id) => canalesVivos.find((c) => c.id === id);
	const multiples = canal("multiples");
	const cali = canal("cali");
	const otras = canal("otras-ayudas-solidarias");
	const rutas = [
		{
			id: "municipios",
			titulo: "Municipios atendidos",
			descripcion: "Municipios donde fueron entregadas las ayudas a las comunidades afectadas.",
			entregas: Math.max(0, op.totalEntregas - entregasCartago),
			unidades: 0,
			color: "#0079C1",
			tinta: "#00639F",
			icono: Building2
		},
		{
			id: "cartago",
			titulo: "Centro de distribución Cartago",
			descripcion: "Segunda bodega. Lo que sale de aquí llega a municipios del norte por una ruta propia.",
			entregas: entregasCartago,
			unidades: 0,
			color: "#E2690E",
			tinta: "#A34C00",
			icono: Warehouse
		},
		{
			id: "cali",
			titulo: "Cali",
			descripcion: "La capital del departamento va por su propio canal y queda fuera del conteo por municipio.",
			entregas: cali?.entregas ?? 0,
			unidades: 0,
			color: "#7F207F",
			tinta: "#7F207F",
			icono: Landmark
		},
		{
			id: "multiples",
			titulo: "Municipios múltiples",
			descripcion: "Ruta de entrega que atendió a varios municipios sin desagregar cuál recibió qué.",
			entregas: multiples?.entregas ?? 0,
			unidades: multiples?.unidades ?? 0,
			color: "#5CC46B",
			tinta: "#2E7D3F",
			icono: Boxes
		},
		{
			id: "otras",
			titulo: "Otras ayudas humanitarias",
			descripcion: "Ayudas entregadas a entidades y a otros grupos de personas afectadas, sin estar asociadas a un municipio específico.",
			entregas: otras?.entregas ?? 0,
			unidades: otras?.unidades ?? 0,
			color: "#22ABE2",
			tinta: "#0F6E96",
			icono: HeartHandshake
		}
	].filter((r) => r.entregas > 0 || r.unidades > 0);
	const totalRutas = rutas.reduce((sum, r) => sum + r.entregas, 0);
	const cifras = [
		{
			valor: RECIBIDAS.valor,
			label: "Ayudas recibidas",
			corte: RECIBIDAS.corte
		},
		{
			valor: `${Math.round(op.totalToneladas).toLocaleString("es-CO")} t`,
			label: "Ayudas distribuidas",
			corte: op.fechaCorteLarga
		},
		{
			valor: totalRutas.toLocaleString("es-CO"),
			label: "Entregas en total",
			corte: op.fechaCorteLarga
		}
	];
	/**
	* Una banda por cada grupo de cifras vecinas que comparten fecha.
	*
	* Se agrupa en vez de escribir las dos bandas a mano para que la
	* maqueta siga la fuente de los datos: el día que las recibidas pasen
	* a salir de la API con la misma fecha que el resto, las dos bandas se
	* vuelven una sola sin tocar el JSX.
	*/
	const bandas = cifras.reduce((acc, c) => {
		const ultima = acc[acc.length - 1];
		if (ultima && ultima.corte === c.corte) {
			ultima.columnas += 1;
			return acc;
		}
		acc.push({
			corte: c.corte ?? null,
			columnas: 1
		});
		return acc;
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "Así se distribuyó la ayuda en el Valle del Cauca" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-9 space-y-2 sm:hidden",
				children: cifras.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: { "--i": i },
					className: "vc-aparece flex items-center gap-4 rounded-lg bg-[#123E5C] px-4 py-3.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "min-w-[5rem] shrink-0 text-[1.75rem] font-extrabold leading-none tabular-nums text-[#FBF8C6]",
						children: c.valor
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-[15px] font-bold leading-tight text-white",
							children: c.label
						}), c.corte && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "mt-1 block text-[13px] leading-tight text-[#A8CFE2]",
							children: ["Con corte al ", c.corte]
						})]
					})]
				}, `cifra-movil-${c.label}`))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-9 hidden space-y-2 sm:block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-2 sm:grid-cols-3",
					children: cifras.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: { "--i": i },
						className: "vc-aparece rounded-lg bg-[#123E5C] px-5 py-5 text-center sm:py-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "block text-[clamp(1.75rem,4.5vw,2.75rem)] font-extrabold leading-none text-[#FBF8C6]",
							children: c.valor
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-base font-bold text-white",
							children: c.label
						})]
					}, `cifra-${c.label}`))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-2 sm:grid-cols-3",
					children: bandas.map((b, i) => b.corte ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						style: {
							"--i": cifras.length + i,
							gridColumn: `span ${b.columnas}`
						},
						className: "vc-aparece rounded-lg bg-[#FBF8C6] px-5 py-3.5 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-xs font-bold uppercase tracking-[0.16em] text-[#00639F]",
							children: "Con corte al"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "mt-0.5 block text-base font-extrabold text-[#123E5C] sm:text-lg",
							children: b.corte
						})]
					}, `corte-${b.corte}`) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { gridColumn: `span ${b.columnas}` } }, `corte-vacio-${i}`))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
				className: "relative mt-10 space-y-4 md:mt-12 md:space-y-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					"aria-hidden": true,
					className: "absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-[#0079C1]/25 md:block"
				}), rutas.map((r, i) => {
					const Icono = r.icono;
					const porcentaje = totalRutas > 0 ? Math.round(r.entregas / totalRutas * 100) : 0;
					const toneladas = Math.round(r.entregas * op.pesoPorEntrega);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						style: { "--i": i },
						className: "vc-aparece relative md:grid md:grid-cols-[1fr_4.5rem_1fr] md:items-center md:py-2.5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#123E5C]/10 md:contents",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col items-start gap-2.5 md:flex-row md:items-center md:justify-between md:gap-4 md:pr-6",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "shrink-0 text-[clamp(1.5rem,4vw,2rem)] font-bold uppercase tracking-tight md:min-w-24",
										style: { color: r.tinta },
										children: ["Ruta ", i + 1]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex w-full items-center gap-4 rounded-[1.5rem] px-5 py-4 text-white md:max-w-[24rem] md:flex-1 md:rounded-full md:px-6 md:text-right",
										style: { background: r.color },
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											"aria-hidden": true,
											className: "flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20 md:hidden",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icono, { className: "size-5" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
												className: "block text-lg leading-tight",
												children: r.titulo
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "mt-2 flex flex-wrap gap-x-6 gap-y-1 md:justify-end",
												children: r.entregas > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[15px] font-bold text-white/90",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
															className: "text-base font-extrabold text-white",
															children: r.entregas.toLocaleString("es-CO")
														}),
														" ",
														"entregas · ",
														porcentaje,
														"%"
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[15px] font-bold text-white/90",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
															className: "text-base font-extrabold text-white",
															children: toneladas.toLocaleString("es-CO")
														}),
														" ",
														"toneladas"
													]
												})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[15px] font-bold text-white/90",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
															className: "text-base font-extrabold text-white",
															children: Math.round(r.unidades).toLocaleString("es-CO")
														}),
														" ",
														"unidades sin desagregar"
													]
												})
											})]
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "hidden justify-center md:flex",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "flex size-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white",
										style: { background: r.color },
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icono, {
											className: "size-6",
											"aria-hidden": true
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-[15px] leading-6 text-[#35708F] md:mt-0 md:pl-6 md:text-base",
									children: r.descripcion
								})
							]
						})
					}, `ruta-${r.id}`);
				})]
			}),
			canalesVivos.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 max-w-3xl rounded-md border-l-[3px] border-l-[#FFD400] bg-[#FFF8E5] p-4 text-base leading-7 text-[#6B5200]",
				children: "El detalle por ruta no está disponible en este momento. Aparece apenas el servicio de datos responde; si persiste, recargue la página."
			})
		]
	});
}
var VERSION = {
	azul: {
		gobernacion: "/marca/gobernacion-blanco.png",
		campana: "/marca/el-valle-blanco.png"
	},
	claro: {
		gobernacion: "/marca/gobernacion-color.png",
		campana: "/marca/el-valle-color.png"
	},
	mono: {
		gobernacion: "/marca/gobernacion-negro.png",
		campana: "/marca/el-valle-negro.png"
	}
};
/**
* Pie con las dos marcas. El pie va sobre navy, así que usa la versión
* blanca.
*/
function MarcaFooter() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center justify-between gap-6 border-t border-white/15 pt-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: VERSION.azul.campana,
			alt: "El Valle lo reconstruimos juntos",
			className: "h-12 w-auto"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: VERSION.azul.gobernacion,
			alt: "Gobernación del Valle del Cauca, Paraíso de todos",
			className: "h-12 w-auto"
		})]
	});
}
/** Azul de campaña. Rellena lo que la pieza no cubre. */
var AZUL_RELLENO = "#0076BC";
function PiezaGrafica({ escritorio, movil, alt, fondo = AZUL_RELLENO, prioritaria = false, cortePx = 768, id, children }) {
	if (children) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id,
		role: "img",
		"aria-label": alt,
		className: "vc-pieza-marco relative flex min-h-dvh items-center justify-center px-4 py-16 sm:px-6 md:px-10",
		style: {
			backgroundColor: fondo,
			"--pieza-escritorio": `url(${escritorio})`,
			"--pieza-movil": `url(${movil ?? escritorio})`,
			"--pieza-corte": `${cortePx}px`
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "relative z-10 w-full",
			children
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id,
		className: "relative h-dvh w-full overflow-hidden",
		style: { backgroundColor: fondo },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("picture", { children: [movil && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("source", {
			media: `(max-width: ${cortePx - 1}px)`,
			srcSet: movil
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: escritorio,
			alt,
			loading: prioritaria ? "eager" : "lazy",
			fetchPriority: prioritaria ? "high" : "auto",
			decoding: "async",
			className: "absolute inset-0 h-full w-full object-contain object-center"
		})] })
	});
}
/** Radio dentro del viewBox de 128. La circunferencia sale de ahí. */
var RADIO = 52;
var CIRCUNFERENCIA = 2 * Math.PI * RADIO;
/** Paleta de la campaña, del más cálido al más claro. */
var COLORES = [
	"#FFD400",
	"#FBF8C6",
	"#F0801E"
];
function PanoramaDonuts() {
	const op = useOperacion();
	if (op.municipiosAtendidos === 0) return null;
	const diasDelRango = rangoEnDias(op.primeraFecha, op.ultimaFecha);
	const donuts = [{
		id: "zonas",
		valor: op.zonas.filter((z) => z.total > 0 && z.atendidos === z.total).length,
		total: op.zonas.length,
		label: "Zonas del Valle cubiertas por completo"
	}, {
		id: "dias",
		valor: op.diasConEntrega,
		total: diasDelRango,
		label: op.rangoLargo ? `Días con entregas, ${op.rangoLargo}` : "Días con entregas"
	}];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-0 flex-wrap items-start justify-center gap-x-10 gap-y-6 sm:gap-x-14",
		children: donuts.map((d, i) => {
			const proporcion = d.total > 0 ? d.valor / d.total : 0;
			const color = COLORES[i % COLORES.length];
			const fin = CIRCUNFERENCIA * (1 - proporcion);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 max-w-[20rem] flex-1 basis-[15rem] flex-col items-center text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
					viewBox: "0 0 128 128",
					className: "h-auto w-full max-h-[min(15rem,26vh)] max-w-[15rem] shrink",
					role: "img",
					"aria-label": `${d.valor} de ${d.total}. ${d.label}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "64",
							cy: "64",
							r: RADIO,
							fill: "none",
							stroke: "rgba(255,255,255,0.22)",
							strokeWidth: "14"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "64",
							cy: "64",
							r: RADIO,
							fill: "none",
							stroke: color,
							strokeWidth: "14",
							strokeLinecap: "round",
							strokeDasharray: CIRCUNFERENCIA,
							transform: "rotate(-90 64 64)",
							className: "vc-arco",
							style: {
								"--arco-inicio": CIRCUNFERENCIA,
								"--arco-fin": fin,
								"--i": i
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
							x: "64",
							y: "62",
							textAnchor: "middle",
							className: "fill-white text-[32px] font-extrabold",
							children: d.valor
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
							x: "64",
							y: "84",
							textAnchor: "middle",
							className: "fill-white/70 text-[13px]",
							children: ["de ", d.total]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					style: { "--i": i },
					className: "vc-aparece mt-3 line-clamp-2 max-w-[18rem] text-[15px] leading-5 text-white sm:text-base sm:leading-6",
					children: d.label
				})]
			}, `dona-${d.id}`);
		})
	});
}
/** Días calendario entre dos fechas ISO, ambas incluidas. */
function rangoEnDias(desde, hasta) {
	if (!desde || !hasta) return 0;
	const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
	if (Number.isNaN(ms)) return 0;
	return Math.round(ms / 864e5) + 1;
}
/**
* El botón de Cali, como pieza gráfica.
*
* El archivo es de 512 por 512 con fondo transparente. Crece por pasos
* en vez de quedarse en una medida: a 28 px, que era lo que tenía en
* celular, el texto que trae dibujado adentro no se lee.
*/
var BOTON_CALI = "/marca/boton_cali_conozca.png";
function IndiceSection({ enlaceCali = "#mapa-de-ayudas" }) {
	const op = useOperacion();
	const indicadores = [
		{
			valor: `${op.municipiosAtendidos} de ${op.municipiosTotales}`,
			label: "Municipios recibieron ayudas"
		},
		{
			valor: op.totalEntregas.toLocaleString("es-CO"),
			label: "Entregas llegaron a los municipios"
		},
		{
			valor: `${op.toneladasMunicipales.toLocaleString("es-CO")} t`,
			label: "Llegaron a esos municipios"
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "indice",
		className: "flex min-h-dvh flex-col justify-center gap-5 bg-[#22ABE2] px-4 py-10 sm:gap-6 sm:px-8 sm:py-12 md:px-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto w-full max-w-[100rem]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-10",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "vc-titular text-[clamp(1.75rem,5vw,4rem)] text-white",
						children: [
							"Ruta ",
							op.municipiosTotales,
							" municipios",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"del ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "vc-resaltado",
								children: "Valle del Cauca"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: enlaceCali,
						className: "shrink-0 self-start md:self-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: BOTON_CALI,
							alt: "Cali: conozca la ruta",
							width: 512,
							height: 512,
							decoding: "async",
							className: "h-12 w-auto select-none transition duration-200 hover:scale-105 sm:h-16 md:h-[5.5rem] motion-reduce:transform-none"
						})
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto w-full max-w-[100rem]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-sm bg-[#0079C1] px-6 py-6 sm:px-10 sm:py-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid gap-y-7 text-center sm:grid-cols-3 sm:gap-y-0 sm:divide-x sm:divide-white/25",
						children: indicadores.map((i, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: { "--i": idx },
							className: "vc-aparece px-2 sm:px-6",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
								className: "block text-[clamp(2rem,4.6vw,3.75rem)] font-extrabold leading-none tabular-nums text-[#FBF8C6]",
								children: i.valor
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mx-auto mt-3 max-w-[16rem] text-base leading-6 text-white sm:text-lg sm:leading-7",
								children: i.label
							})]
						}, i.label))
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto w-full max-w-[100rem]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-sm bg-[#0079C1] px-6 py-6 sm:px-10 sm:py-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanoramaDonuts, {})
				})
			})
		]
	});
}
/**
* useNecesidades.ts
* -----------------------------------------------------------------------
* Lo que falta hoy en el centro de acopio, desde route=necesidades.
*
* `staleTime` mucho más corto que el resto del tablero: cinco minutos
* contra los treinta de los catálogos. Todo lo demás cuenta lo que ya
* pasó y no cambia; esto cambia con cada inventario, y una lista vieja no
* es un dato impreciso, es una lista que manda a la gente a donar lo que
* ya sobra.
*
* Reintentos como en useAyuda: el Web App de Apps Script serializa las
* ejecuciones por usuario, así que un 404 de concurrencia no debe darse
* por definitivo.
*/
var NECESIDADES_STALE_TIME_MS = 3e5;
function useNecesidades() {
	return useQuery({
		queryKey: ["necesidades"],
		queryFn: () => ayudasApiRepository.getNecesidades(),
		staleTime: NECESIDADES_STALE_TIME_MS,
		retry: 3,
		retryDelay: REINTENTO_ESCALONADO
	});
}
/**
* QueHaceFaltaSection.tsx
* -----------------------------------------------------------------------
* "¿Qué hace falta hoy?": las cuatro categorías del centro de acopio.
* Al tocar una, se abre un cajón con lo que se necesita, producto por
* producto y en orden de urgencia.
*
* CADA PRODUCTO LLEVA SU ESTADO
*
* Agotado, Escaso o Buena cantidad. Son las palabras del papel del
* acopio —NADA, POCO, BASTANTE— dichas en lenguaje corriente, y su
* significado se explica en la leyenda.
*
* Que aparezca el estado es lo que permite mostrar también lo que está
* en buena cantidad. Sin etiqueta, una lista solo puede leerse como
* "esto hace falta" y pedir algo que sobra desperdicia una donación; con
* ella, ese mismo renglón sirve al revés y dice qué NO hay que llevar.
*
* LO QUE NO SE REVISÓ NO SE MUESTRA
*
* La hoja trae dos renglones con la existencia sin anotar. No aparecen:
* sin estado no se pueden ordenar ni etiquetar, y ponerlos con una
* etiqueta inventada sería peor que omitirlos.
*
* Hoy son "Enlatados" y "Granos de todo tipo", los dos en Alimentos, y
* los dos son necesidades reales que quedan fuera de la página. Se
* arreglan anotando su existencia en NECESIDADES_ACOPIO: aparecen solas,
* sin tocar código.
*
* ESTA SECCIÓN LE HABLA A UN CIUDADANO, NO A UN OPERADOR
*
* Quien lee esto está decidiendo si sale a comprar algo. No aparecen
* «URGENTE», «nivel 0», «existencias en bodega» ni «inventario».
*
* POR QUÉ LAS CUATRO ILUSTRACIONES VAN EN UNA TARJETA
*
* Porque no comparten ninguna geometría. Cada PNG tiene su píldora en una
* esquina distinta, su dibujo desbordando hacia otro lado y proporciones
* que van de 1,97 a 2,84. Sueltas en la rejilla, con ancho fijo, la más
* apaisada medía 146 px de alto y la más cuadrada 213: las filas quedaban
* desparejas por 67 px, ninguna píldora coincidía con la de al lado y el
* ojo buscaba una cuadrícula que no existía. Eso era la desconexión.
*
* La tarjeta lo resuelve con dos cosas: un contenedor idéntico para las
* cuatro y una caja de imagen de ALTO FIJO con `object-contain`. Lo que
* cambia entre una y otra pasa a ser el dibujo, no el encuadre.
*
* POR QUÉ EL CAJÓN OCUPA LA FILA ENTERA
*
* Abrir la lista dentro de la media columna del botón se veía mal: la
* tarjeta de al lado quedaba flotando con un hueco debajo, la fila
* siguiente se iba hacia abajo sin explicación, y la lista se partía en
* cinco o seis renglones.
*
* Ahora el cajón abarca las dos columnas y se inserta debajo de la FILA
* del botón. Lo hacen legible una PUNTA alineada con la tarjeta abierta,
* la altura ANIMADA con `grid-template-rows` de 0fr a 1fr, y el cajón
* montado durante el cierre para que también se anime.
*
* POR QUÉ LAS ILUSTRACIONES SE EMPAREJAN POR PALABRA CLAVE
*
* Antes era un diccionario con el nombre exacto de la sección como
* llave, y cualquier diferencia dejaba la tarjeta sin dibujo sin ningún
* aviso: un `undefined` en un diccionario no se queja. Ya pasó tres veces
* en este proyecto con cruces por texto. Ahora basta con que una palabra
* clave aparezca en el nombre, y si ninguna calza queda un aviso en
* consola con el texto exacto que llegó.
* -----------------------------------------------------------------------
*/
/** Colores muestreados del JPG original, para reconstruir el fondo. */
var CYAN_CENTRO = "#40BBE5";
var CYAN_BORDE = "#0E8BB7";
/**
* Sombras que respetan la silueta del PNG.
*
* `drop-shadow` se calcula sobre el canal alfa, a diferencia de
* `box-shadow`, que dibuja la caja rectangular del elemento. Con
* ilustraciones recortadas es la diferencia entre una sombra que sigue el
* contorno y un rectángulo flotando detrás.
*/
var SOMBRA_REPOSO = "drop-shadow(0 6px 10px rgba(0,0,0,0.18))";
var SOMBRA_ACTIVA = "drop-shadow(0 14px 20px rgba(0,0,0,0.32))";
/**
* Los tres estados, en el orden en que se leen: de lo que falta a lo que
* sobra.
*
* Semáforo de tres pasos, pero con la PALABRA siempre visible además del
* color. El color solo no alcanza: una de cada doce personas no
* distingue el rojo del verde, y este es justamente el dato que decide
* si alguien compra algo o no.
*/
var ESTADOS = [
	{
		etiqueta: "Agotado",
		glosa: "En este momento no hay existencias.",
		barra: "#F26049",
		fondo: "#F26049",
		texto: "#FFFFFF"
	},
	{
		etiqueta: "Escaso",
		glosa: "Se necesita más.",
		barra: "#F7B733",
		fondo: "#FFD400",
		texto: "#123E5C"
	},
	{
		etiqueta: "Buena cantidad",
		glosa: "Hay existencias suficientes por ahora.",
		barra: "#5CC46B",
		fondo: "#5CC46B",
		texto: "#123E5C"
	}
];
/**
* El estado de un producto según el `nivel` de la hoja.
*
* Devuelve `null` cuando no se anotó, y ese elemento no se dibuja. Un
* `nivel` fuera de la escala conocida cae en "Buena cantidad" y no en
* "Agotado": si el dato es dudoso, más vale no mandar a nadie a comprar
* de más.
*/
function estadoDe(nivel) {
	if (nivel === null) return null;
	if (nivel === 0) return ESTADOS[0];
	if (nivel === 1) return ESTADOS[1];
	return ESTADOS[2];
}
/**
* OJO CON LOS NOMBRES DE ARCHIVO. Los originales vienen como
* `Otros_pelementos.png` y `alimentos_no_pere.png`. Acá se asumen
* renombrados a minúsculas y sin tildes en `public/marca/`. En Windows el
* servidor de desarrollo no distingue mayúsculas y en el Linux del
* despliegue sí: un nombre mal copiado funciona en tu máquina y da 404 en
* producción.
*/
var ILUSTRACIONES = [
	{
		claves: [
			"ALIMENTO",
			"PERECEDERO",
			"COMIDA",
			"MERCADO"
		],
		src: "/marca/que-hace-falta-alimentos.png",
		alt: "Alimentos no perecederos: arroz, pasta, lentejas, frijoles, harina, azúcar, sal, atún, sardinas, enlatados, aceite.",
		escala: .75
	},
	{
		claves: ["ASEO", "HIGIENE"],
		src: "/marca/que-hace-falta-aseo.png",
		alt: "Aseo personal: papel higiénico, kit de higiene, cepillos y pasta dental, jabón.",
		escala: .75
	},
	{
		claves: [
			"DORMIR",
			"ABRIGO",
			"COLCHON",
			"DESCANSO"
		],
		src: "/marca/que-hace-falta-dormir.png",
		alt: "Elementos para dormir y abrigo: colchonetas, almohadas, cobijas, sábanas y ropa de abrigo.",
		escala: .75
	},
	{
		claves: ["OTRO"],
		src: "/marca/que-hace-falta-otros.png",
		alt: "Otros elementos necesarios: agua potable, pañales, detergente, cloro, limpiador multiusos, botiquín, bolsas de basura, linterna, pilas y guantes.",
		escala: .75
	}
];
/**
* La caja de la ilustración.
*
* `flex-1` y no un alto fijo: la caja crece hasta llenar lo que le deja
* la tarjeta, y la tarjeta se estira a la altura de su vecina por el
* `stretch` de la rejilla. Así las dos de una fila terminan del mismo
* alto sin que haya que declarar ningún número.
*/
var CAJA_ILUSTRACION = "flex w-full flex-1 items-center justify-center";
function normalizar(texto) {
	return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}
/**
* La ilustración de una sección, o `undefined` si ninguna calza.
*
* El aviso en consola es la parte importante: sin él, una sección
* renombrada pierde su dibujo en silencio y hay que ir a leer el código
* para entender por qué apareció una caja de texto.
*/
function ilustracionDe(nombreSeccion) {
	const nombre = normalizar(nombreSeccion);
	return ILUSTRACIONES.find((i) => i.claves.some((c) => nombre.includes(c)));
}
/**
* Cuántas tarjetas caben por fila, según el mismo corte que usa la
* grilla (`sm`, 640 px).
*
* Hace falta en JavaScript y no solo en CSS porque el cajón se inserta
* DESPUÉS de la última tarjeta de su fila, y cuál es esa depende de si
* hay una o dos columnas.
*/
function useColumnas() {
	const [columnas, setColumnas] = (0, import_react.useState)(1);
	(0, import_react.useEffect)(() => {
		const mql = window.matchMedia("(min-width: 640px)");
		const actualizar = () => setColumnas(mql.matches ? 2 : 1);
		actualizar();
		mql.addEventListener("change", actualizar);
		return () => mql.removeEventListener("change", actualizar);
	}, []);
	return columnas;
}
function QueHaceFaltaSection() {
	const { data } = useNecesidades();
	const [abierta, setAbierta] = (0, import_react.useState)(null);
	const columnas = useColumnas();
	const secciones = (0, import_react.useMemo)(() => data?.secciones ?? [], [data]);
	const indiceAbierta = secciones.findIndex((s) => s.nombre === abierta);
	/**
	* Se recorre por FILAS y no por tarjetas para poder meter el cajón
	* justo después de la última de cada fila.
	*/
	const filas = [];
	for (let i = 0; i < secciones.length; i += columnas) filas.push(secciones.slice(i, i + columnas));
	/**
	* Al cerrar, devolver la vista a las cuatro tarjetas.
	*
	* El cajón puede medir varios cientos de píxeles. Al colapsarlo, todo
	* lo que estaba debajo sube de golpe y la persona se queda mirando la
	* sección siguiente sin haber pedido moverse. Recentrar las tarjetas
	* devuelve el punto de partida y deja claro que puede abrir otra.
	*
	* `anterior` distingue un cierre real de la carga inicial, donde
	* `abierta` ya vale null. Cambiar de una categoría a otra tampoco entra
	* acá, porque ahí `abierta` pasa de un nombre a otro, nunca por null.
	*/
	const tarjetasRef = (0, import_react.useRef)(null);
	const anterior = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const seCerro = anterior.current !== null && abierta === null;
		anterior.current = abierta;
		if (!seCerro) return;
		const prefiereQuieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const id = window.setTimeout(() => {
			tarjetasRef.current?.scrollIntoView({
				behavior: prefiereQuieto ? "auto" : "smooth",
				block: "center"
			});
		}, prefiereQuieto ? 0 : 320);
		return () => window.clearTimeout(id);
	}, [abierta]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "que-hace-falta",
		className: "vc-seccion px-4 py-12 sm:px-6 sm:py-16 md:px-10",
		style: { background: `radial-gradient(ellipse at center, ${CYAN_CENTRO} 0%, ${CYAN_BORDE} 80%)` },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-6xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "vc-titular mx-auto w-fit bg-[#FBF8C6] px-[0.3em] py-[0.1em] text-center text-[clamp(1.75rem,6vw,3.5rem)] leading-tight text-[#0079C1]",
					children: "¿Qué hace falta hoy?"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "vc-titular mx-auto w-fit px-[1em] py-[0.7em] text-center text-[clamp(1.75rem,2vw,3.5rem)] leading-tight text-[#FBF8C6]",
					children: "Toque una categoría para conocer qué se necesita en el centro de acopio y qué elementos están agotados, escasos o disponibles en buena cantidad."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Leyenda, {}),
				secciones.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: tarjetasRef,
					className: "mt-8 space-y-5",
					children: filas.map((fila, indiceFila) => {
						const enEstaFila = indiceAbierta >= 0 && Math.floor(indiceAbierta / columnas) === indiceFila ? secciones[indiceAbierta] : null;
						const columnaAbierta = enEstaFila ? indiceAbierta % columnas : 0;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "grid gap-5 sm:grid-cols-2",
							children: fila.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TarjetaCategoria, {
								seccion: s,
								abierta: abierta === s.nombre,
								onToggle: () => setAbierta(abierta === s.nombre ? null : s.nombre)
							}, s.nombre))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CajonDeFila, {
							seccion: enEstaFila,
							columnaAbierta,
							columnas,
							onCerrar: () => setAbierta(null)
						})] }, indiceFila);
					})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-8 grid gap-5 sm:grid-cols-2",
					children: ILUSTRACIONES.map((arte) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-full flex-col rounded-2xl bg-white/10 p-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: CAJA_ILUSTRACION,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: arte.src,
								alt: arte.alt,
								loading: "lazy",
								decoding: "async",
								style: {
									filter: SOMBRA_REPOSO,
									width: `${(arte.escala ?? 1) * 100}%`
								},
								className: "h-auto object-contain"
							})
						})
					}) }, arte.src))
				})
			]
		})
	});
}
/**
* El significado de los tres estados.
*
* Va sobre una tarjeta blanca y no directamente sobre el cyan: el
* degradado va de #40BBE5 en el centro a #0E8BB7 en los bordes, y no hay
* un solo color de texto que pase el 4,5 de contraste en los dos
* extremos. Sobre blanco, el azul profundo lo pasa de sobra.
*/
function Leyenda() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-xl bg-white px-5 py-4 sm:px-6 sm:py-5",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "grid gap-x-6 gap-y-4 sm:grid-cols-3",
			children: ESTADOS.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex flex-col items-center text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-full px-2.5 py-0.5 text-[13px] font-extrabold",
					style: {
						background: e.fondo,
						color: e.texto
					},
					children: e.etiqueta
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-2 text-[15px] leading-6 text-[#35708F]",
					children: e.glosa
				})]
			}, e.etiqueta))
		})
	});
}
function TarjetaCategoria({ seccion, abierta, onToggle }) {
	const arte = (0, import_react.useMemo)(() => ilustracionDe(seccion.nombre), [seccion.nombre]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		"aria-expanded": abierta,
		onClick: onToggle,
		className: `flex h-full w-full flex-col rounded-2xl px-4 pb-2.5 pt-4 transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FBF8C6] motion-reduce:transform-none ${abierta ? "-translate-y-1.5 bg-white/25" : "bg-white/10 hover:-translate-y-1.5 hover:bg-white/20"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: CAJA_ILUSTRACION,
			children: arte ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: arte.src,
				alt: arte.alt,
				loading: "lazy",
				decoding: "async",
				style: {
					filter: abierta ? SOMBRA_ACTIVA : SOMBRA_REPOSO,
					width: `${(arte.escala ?? 1) * 100}%`
				},
				className: "h-auto object-contain"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "rounded-xl bg-[#FBF8C6] px-6 py-4 text-xl font-bold text-[#0079C1]",
				children: seccion.nombre
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mt-3 flex w-full justify-center border-t border-white/25 pt-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
				"aria-hidden": true,
				className: `size-6 text-white transition-transform duration-200 motion-reduce:transform-none ${abierta ? "rotate-180" : ""}`
			})
		})]
	}) });
}
/**
* El cajón que se abre debajo de una fila de tarjetas.
*
* Recibe `null` cuando ninguna de su fila está abierta, pero NO se
* desmonta: conserva el contenido de la última que estuvo abierta
* mientras la altura vuelve a cero. Sin eso, cerrar sería un corte seco.
*/
function CajonDeFila({ seccion, columnaAbierta, columnas, onCerrar }) {
	const panelId = (0, import_react.useId)();
	const panelRef = (0, import_react.useRef)(null);
	const ultima = (0, import_react.useRef)(null);
	if (seccion) ultima.current = seccion;
	const contenido = seccion ?? ultima.current;
	const abierto = seccion !== null;
	/**
	* Al abrir, asegurarse de que el cajón quepa en pantalla.
	*
	* El `setTimeout` dura lo mismo que la transición: si se llama antes,
	* el navegador mide el cajón todavía colapsado y desplaza de menos.
	*/
	(0, import_react.useEffect)(() => {
		if (!abierto) return;
		const prefiereQuieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const id = window.setTimeout(() => {
			panelRef.current?.scrollIntoView({
				behavior: prefiereQuieto ? "auto" : "smooth",
				block: "nearest"
			});
		}, prefiereQuieto ? 0 : 320);
		return () => window.clearTimeout(id);
	}, [abierto]);
	if (!contenido) return null;
	const puntaIzquierda = columnas === 1 ? "50%" : `${(columnaAbierta + .5) * (100 / columnas)}%`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		"div",
		/**
		* El truco de `grid-template-rows` de 0fr a 1fr es lo que permite
		* animar una altura que no se conoce de antemano. `max-height` obliga
		* a inventar un número: si queda corto recorta la lista, y si queda
		* largo la animación arranca con un tramo muerto.
		*/
		{
			id: panelId,
			ref: panelRef,
			"aria-hidden": !abierto,
			className: `grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${abierto ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative rounded-2xl bg-white p-5 pt-6 sm:p-8 sm:pt-9",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							"aria-hidden": true,
							className: "absolute -top-2 size-4 -translate-x-1/2 rotate-45 rounded-[3px] bg-white",
							style: { left: puntaIzquierda }
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onCerrar,
							tabIndex: abierto ? 0 : -1,
							"aria-label": `Cerrar ${contenido.nombre}`,
							className: "absolute right-3 top-3 grid size-10 place-items-center rounded-full text-[#6B93AA] transition hover:bg-[#DDF0FA] hover:text-[#0079C1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1] sm:right-5 sm:top-5",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
								className: "size-6",
								"aria-hidden": true
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListaDeNecesidades, { seccion: contenido })
					]
				})
			})
		}
	);
}
function ListaDeNecesidades({ seccion }) {
	/**
	* Solo los que tienen estado. Los que la hoja dejó sin anotar no se
	* pueden ordenar ni etiquetar, y ponerlos con una etiqueta inventada
	* sería peor que omitirlos.
	*/
	const elementos = (0, import_react.useMemo)(() => (seccion.elementos ?? []).map((e) => ({
		elemento: e,
		estado: estadoDe(e.nivel)
	})).filter((x) => x.estado !== null), [seccion.elementos]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "vc-titular pr-12 text-[clamp(1.375rem,3.4vw,2.25rem)] text-[#0079C1]",
			children: seccion.nombre
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-base text-[#6B93AA]",
			children: "De lo que más falta a lo que ya hay."
		}),
		elementos.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-5 text-lg leading-8 text-[#35708F]",
			children: "Por ahora no hay nada anotado en esta categoría."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
			children: elementos.map(({ elemento, estado }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "rounded-xl border-l-[6px] bg-[#F2FAFD] px-4 py-3.5",
				style: { borderLeftColor: estado.barra },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block text-[clamp(1rem,1.6vw,1.1875rem)] font-bold leading-snug text-[#123E5C]",
					children: elemento.nombre
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-2 inline-block rounded-full px-3 py-1 text-sm font-extrabold",
					style: {
						background: estado.fondo,
						color: estado.texto
					},
					children: estado.etiqueta
				})]
			}, elemento.nombre))
		})
	] });
}
/**
* StoryPage.tsx
* -----------------------------------------------------------------------
* El relato completo de la Ruta de la Solidaridad, de la portada al mapa.
*
* SOBRE LA ESTRUCTURA POR BANDAS
*
* En las piezas de la campaña el color no es un fondo, es la estructura.
* Cada pieza avanza por franjas horizontales a sangre —cyan para el
* titular, azul para el rótulo del bloque, crema para el contenido— y el
* lector sabe en qué capítulo está por el color de la franja, no por la
* distancia entre párrafos.
*
* Las dos secciones de análisis, "¿Cuándo llegaron las ayudas?" y
* "¿Cuánta ayuda recibió cada municipio?", están armadas así. Las bandas
* van a sangre y el ancho máximo se controla adentro con `max-w-6xl`: al
* revés, con una caja de color centrada, la pieza deja de leerse como
* sistema y parece una tarjeta suelta en medio de la página.
*
* SOBRE EL ORDEN DE LAS SECCIONES
*
* "¿Qué hace falta hoy?" va tercera, apenas después del índice, y no al
* final. Es la única de la página que pide algo en vez de informar, y la
* única cuyo contenido caduca en horas: enterrarla debajo de ocho
* secciones de balance la volvería decorativa. Quien entra a ver cómo va
* la operación se encuentra primero con lo que puede hacer, y después con
* el recuento.
*
* SOBRE EL RELLENO DE LAS BANDAS
*
* Las tres constantes de abajo, BANDA_TITULAR, BANDA y BANDA_CIERRE,
* fijan el aire vertical. Están declaradas una sola vez porque el relleno
* repetido a mano en cada franja es justamente lo que hizo crecer la
* sección sin que nadie lo notara: son cuatro bandas y cada una sumaba
* lo suyo.
*
* Hoy solo las usa la sección "cuando". La de "municipios" sigue con sus
* valores escritos a mano; para igualarla, reemplazar sus clases por
* estas constantes.
*
* SOBRE LA TIPOGRAFÍA DE LAS BANDAS
*
* Titular y rótulo van los dos en Agenda ExtraCondensed, la tipografía
* de la campaña. El titular usa `.vc-titular`, que fuerza mayúscula; el
* rótulo usa `.vc-rotulo`, que es la misma familia en caja mixta, porque
* en las piezas los rótulos se leen "Municipios que más ayuda
* recibieron" y no en versales.
*
* Los dos cuerpos son mayores de lo que pedirían en Poppins: Agenda es
* extra condensada y a igual tamaño en píxeles ocupa cerca de un tercio
* menos de ancho, así que un rótulo que en Poppins se veía bien a 20 px
* acá se queda corto.
*
* SOBRE EL TITULAR DE "CUÁNDO"
*
* Era la frase del hallazgo del día, generada con los datos. Ahora es
* una pregunta fija y el hallazgo bajó al rótulo de la banda azul, con
* la fecha resaltada en amarillo.
*
* El cambio es de jerarquía, no de estética. Un titular que cambia con
* los datos no se puede componer: unos días es una línea, otros tres, la
* banda cyan crece y encoge en cada corte, y nunca se le puede aplicar
* el salto de línea a mano que hace respirar la pregunta. Un titular
* fijo compone siempre igual, y el dato variable queda en el renglón
* donde una línea de más no rompe nada.
* -----------------------------------------------------------------------
*/
var SCROLL_ROOT_ID = "ruta-solidaridad-scroll";
/**
* Relleno de la banda del titular. Lleva más aire que las demás porque
* es la única que tiene que sostener sola una tipografía de hasta 72 px:
* con el mismo relleno que el resto, la letra queda apretada contra el
* borde del color.
*/
var BANDA_TITULAR = "px-4 py-10 sm:px-6 sm:py-12 md:px-10";
/** Relleno de una banda de contenido. */
var BANDA = "px-4 py-8 sm:px-6 sm:py-10 md:px-10";
/**
* Igual que BANDA, con más aire abajo. Es la última franja de la
* sección, y sin ese remate el contenido queda pegado al titular de la
* sección siguiente.
*/
var BANDA_CIERRE = "px-4 py-8 pb-12 sm:px-6 sm:py-10 sm:pb-14 md:px-10";
var NAV = [
	{
		id: "inicio",
		label: "Inicio",
		icon: House
	},
	{
		id: "balance",
		label: "Balance a la fecha",
		icon: FileText
	},
	{
		id: "indice",
		label: "Índice",
		icon: List
	},
	{
		id: "que-hace-falta",
		label: "¿Qué hace falta hoy?",
		icon: HandHeart
	},
	{
		id: "cuando",
		label: "Momentos clave",
		icon: CalendarDays
	},
	{
		id: "municipios",
		label: "Municipios",
		icon: MapPin
	},
	{
		id: "que-se-entrego",
		label: "¿Qué se entregó?",
		icon: Package
	},
	{
		id: "de-donde-salio",
		label: "¿De dónde salió?",
		icon: Truck
	},
	{
		id: "mapa-de-ayudas",
		label: "Mapa de Ayudas",
		icon: Map$1
	}
];
function StoryPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperacionProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FocoProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Contenido, {}) }) });
}
function Contenido() {
	const op = useOperacion();
	const { enfocarMunicipio } = useFoco();
	/**
	* Antes esto solo hacía scroll: se llegaba al mapa sin nada
	* seleccionado y había que buscar a mano el municipio en el que se
	* venía de hacer clic. Ahora lo selecciona.
	*/
	const irAlMapa = (0, import_react.useCallback)((municipio) => enfocarMunicipio(municipio.nombre), [enfocarMunicipio]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarNav, {
		items: NAV,
		scrollRootId: SCROLL_ROOT_ID,
		homeId: "inicio",
		fechaCorte: op.fechaCorteLarga
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		id: SCROLL_ROOT_ID,
		className: "h-dvh overflow-y-auto scroll-smooth bg-[#F2FAFD] text-[#123E5C] md:pl-20",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PiezaGrafica, {
				id: "inicio",
				escritorio: "/marca/portada-escritorio.jpg",
				movil: "/marca/portada-movil.jpeg",
				fondo: "#0076BC",
				prioritaria: true,
				alt: "Ruta de la Solidaridad. Gobernación del Valle del Cauca. Después del terremoto del 10 de agosto de 2026, la Gobernación entregó ayudas humanitarias de emergencia en los municipios del Valle del Cauca. A continuación encontrará toda la información."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "balance",
				className: "bg-[#F2FAFD] px-4 py-14 sm:px-6 sm:py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BalanceFinal, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IndiceSection, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueHaceFaltaSection, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "cuando",
				className: "vc-seccion bg-[#FBF8C6]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `bg-[#22ABE2] ${BANDA_TITULAR}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mx-auto max-w-6xl",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
								className: "vc-titular max-w-4xl text-[clamp(2rem,6.5vw,4.5rem)] leading-[1.25] text-white",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "box-decoration-clone bg-[#FBF8C6] px-[0.3em] py-[0.1em] text-[#0079C1]",
										children: "Momentos"
									}),
									" ",
									"Clave"
								]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: BANDA,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mx-auto max-w-6xl",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MovimientoStatCards, {})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `bg-[#0079C1] ${BANDA}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mx-auto max-w-6xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "vc-rotulo text-[clamp(1.5rem,3.6vw,4.5rem)] uppercase text-[#FBF8C6]",
								children: "Entregas por día"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-6",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JornadaBars, {})
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: BANDA_CIERRE,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mx-auto max-w-6xl",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-10",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MunicipiosNuevosCallouts, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EvolucionHeatmap, { onSelect: irAlMapa })]
							})
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "municipios",
				className: "vc-seccion bg-[#FBF8C6]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "bg-[#22ABE2] px-4 py-12 sm:px-6 sm:py-14 md:px-10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mx-auto max-w-6xl",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
								className: "vc-titular max-w-4xl text-[clamp(2rem,6.5vw,4.5rem)] text-[#FBF8C6]",
								children: [
									"¿Cuánta ayuda recibió",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									"cada municipio?"
								]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BandaRotulo, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "vc-resaltado",
							children: "Municipios"
						}),
						" que más ayuda",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "vc-resaltado",
							children: "recibieron"
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-4 py-12 sm:px-6 sm:py-14 md:px-10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mx-auto max-w-6xl",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PodioMunicipios, {
								onSelect: irAlMapa,
								conRotulo: false
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "bg-[#0079C1] px-4 py-12 sm:px-6 sm:py-14 md:px-10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mx-auto max-w-6xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "vc-rotulo text-[clamp(1.5rem,3.6vw,2.5rem)] text-white",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "vc-resaltado",
									children: "Rutas"
								}), " por zona"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-8",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoberturaPorZona, { conRotulo: false })
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "bg-[#F2FAFD] px-4 py-12 pb-16 sm:px-6 sm:py-14 md:px-10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mx-auto max-w-6xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "vc-rotulo text-[clamp(1.5rem,3.6vw,2.5rem)] text-[#0079C1]",
								children: ["Los ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "vc-resaltado",
									children: [op.municipiosTotales, " municipios"]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-6",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MunicipiosGrid, {
									onSelect: irAlMapa,
									conRotulo: false
								})
							})]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "que-se-entrego",
				className: "vc-seccion bg-[#F2FAFD]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AyudaSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "de-donde-salio",
				className: "bg-white px-4 py-14 sm:px-6 sm:py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CanalesSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "mapa-de-ayudas",
				className: "relative h-dvh bg-[#123E5C]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapaDiferido, { scrollRootId: SCROLL_ROOT_ID })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "bg-[#0076BC] px-8 py-10 text-base leading-7 text-[#A8CFE2] sm:px-6 md:px-32",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "block font-serif text-xl text-[#fbf8c6]",
						children: "Ruta de la Solidaridad"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3",
						children: [
							"Ayudas entregadas a las comunidades afectadas por el terremoto del 10 de agosto de 2026",
							op.fechaCorteLarga ? `, con información al ${op.fechaCorteLarga}` : "",
							"."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4",
						children: "Fuente: registros oficiales de entrega de ayudas de la Gobernación del Valle del Cauca."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-8",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarcaFooter, {})
					})
				] })
			})
		]
	})] });
}
/**
* La banda azul con el rótulo de un bloque.
*
* Va como componente y no como una clase suelta porque el rótulo tiene
* tres cosas que se pierden al copiar y pegar: la clase `.vc-rotulo`,
* que trae Agenda ExtraCondensed y la interlínea alta que necesitan los
* recuadros de `.vc-resaltado` para no montarse entre líneas; el
* `max-w-6xl`, que lo alinea con el contenido de las demás bandas; y el
* `<h3>`, que es lo que hace que un lector de pantalla lo anuncie como
* encabezado y no como un párrafo decorativo.
*/
function BandaRotulo({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "bg-[#0079C1] px-4 py-7 sm:px-6 md:px-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "vc-rotulo mx-auto max-w-6xl text-[clamp(1.5rem,3.6vw,2.5rem)] text-white",
			children
		})
	});
}
/**
* routes/index.tsx
* -----------------------------------------------------------------------
* Iba a llamarse route.tsx (así lo pedía el doc de continuidad v1), pero
* el routeTree.gen.ts que compartiste importa expresamente
* `./routes/index` como IndexRouteImport — TanStack Router file-based
* routing resuelve el path '/' a partir del nombre de archivo `index`,
* no de un nombre `route` genérico. Se renombra para que coincida con lo
* que el generador ya espera; el contenido es el mismo que antes, salvo
* que `charSet`/`viewport` se sacaron de acá porque ahora viven una sola
* vez en __root.tsx (ponerlos también acá los hubiera duplicado en el
* <head> final).
* -----------------------------------------------------------------------
*/
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => SplitComponent });
var SplitComponent = StoryPage;
//#endregion
export { fechaCorta as a, sameMunicipality as c, useDestinos as d, useFlujos as f, useOperacion as i, CATALOG_STALE_TIME_MS$1 as l, ayudasApiRepository as m, useAyuda as n, TERRITORY_BLUE_RAMP as o, useOrigenes as p, useFoco as r, getTerritoryStat as s, routes_exports as t, REINTENTO_ESCALONADO$1 as u };
