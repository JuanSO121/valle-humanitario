import { r as __toESM } from "../_runtime.mjs";
import { a as require_react, i as require_jsx_runtime, r as useQueryClient, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { C as ArrowUp, S as BedDouble, _ as Droplets, a as Search, b as ChevronLeft, c as Package, d as MapPin, f as House, g as ExternalLink, h as FilePenLine, i as ShieldCheck, l as Menu, m as FileText, n as Warehouse, p as HandHeart, r as Shirt, s as PawPrint, t as X, u as Map$1, v as CookingPot, w as Apple, x as ChevronDown } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-B6-C6fM5.js
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
var CLAVE = "ayudas:bundle:v2";
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
* Las seis rutas del tablero viajan en UNA petición.
*
* Cada petición a un Web App de Apps Script paga un costo fijo: el
* arranque más la redirección a googleusercontent. `getResumen()`,
* `getMunicipios()`, etc. leen de `?route=bundle`; las llamadas
* simultáneas de los hooks comparten la misma promesa en vuelo, así que
* salen como una sola petición.
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
*     reintenta. Los reintentos de las consultas vuelven a
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
/**
* «No disponible» es una respuesta válida de las rutas que leen un libro:
* el libro puede no estar accesible y la sección simplemente no se
* dibuja. Cualquier otra forma exige `disponible: true` y lo que pida
* `validar`.
*/
var conDisponible = (validar) => (p) => {
	if (!esObjeto(p)) return "se esperaba un objeto";
	if (p["disponible"] === false) return null;
	if (p["disponible"] !== true) return "falta el campo \"disponible\"";
	return validar(p);
};
var exigirArray = (p, campo) => Array.isArray(p[campo]) ? null : `falta el campo "${campo}" (array)`;
var VALIDADORES = {
	resumen: conDisponible((p) => {
		const totales = p["totales"];
		if (!esObjeto(totales) || typeof totales["toneladas"] !== "number") return "falta \"totales.toneladas\" (número)";
		if (!esObjeto(p["calidad"])) return "falta el campo \"calidad\"";
		for (const campo of ["recibidas", "inventario"]) {
			const v = p[campo];
			if (v !== null && typeof v !== "number") return `"${campo}" debe ser número o null`;
		}
		return null;
	}),
	municipios: conDisponible((p) => {
		const lista = p["municipios"];
		if (!Array.isArray(lista)) return "falta el campo \"municipios\" (array)";
		for (const m of lista) {
			if (!esObjeto(m)) return "un municipio no es un objeto";
			if (typeof m["codigoDane"] !== "string" || typeof m["nombre"] !== "string") return "un municipio sin codigoDane o nombre";
			if (typeof m["toneladas"] !== "number") return `municipio ${m["nombre"]} sin toneladas`;
			if (!Array.isArray(m["categorias"])) return `municipio ${m["nombre"]} sin categorías`;
		}
		return null;
	}),
	otras: conDisponible((p) => {
		if (typeof p["toneladas"] !== "number") return "falta \"toneladas\" (número)";
		return exigirArray(p, "destinos");
	}),
	categorias: conDisponible((p) => {
		const err = exigirArray(p, "categorias");
		if (err) return err;
		return esObjeto(p["fueraDeCategoria"]) ? null : "falta el campo \"fueraDeCategoria\"";
	}),
	faltantes: conDisponible((p) => exigirArray(p, "categorias")),
	contratacion: (p) => {
		if (!esObjeto(p)) return "se esperaba un objeto";
		if (!Array.isArray(p["contratos"])) return "falta el campo \"contratos\" (array)";
		if (typeof p["valorTotalInformado"] !== "number") return "falta el campo \"valorTotalInformado\" (número)";
		for (const c of p["contratos"]) {
			if (!esObjeto(c)) return "un contrato no es un objeto";
			if (typeof c["id"] !== "string" || !c["id"]) return "un contrato sin id";
			if (typeof c["objeto"] !== "string" || !c["objeto"]) return `contrato ${c["id"]} sin objeto`;
			const valor = c["valorInicial"];
			if (valor !== null && (typeof valor !== "number" || !Number.isFinite(valor))) return `contrato ${c["id"]} con valorInicial que no es número ni null`;
			const enlace = c["enlaceSecop"];
			if (enlace !== null && (typeof enlace !== "string" || !/^https?:\/\//i.test(enlace))) return `contrato ${c["id"]} con enlaceSecop que no es una URL http(s)`;
		}
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
var validarBundle = (p) => esObjeto(p) && "resumen" in p ? null : "se esperaba un objeto con las partes del tablero";
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
	async request(route, params = {}, validateShape, baseUrl = this.baseUrl) {
		const origen = typeof window !== "undefined" ? window.location.origin : "http://localhost";
		const url = new URL(baseUrl, origen);
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
	/** Totales, fecha de corte y calidad de los despachos del Excel oficial. */
	getResumen() {
		return this.parte("resumen", () => this.request("resumen", {}, VALIDADORES.resumen));
	}
	/** Los 42 municipios, con sus toneladas aproximadas y categorías. */
	getMunicipios() {
		return this.parte("municipios", () => this.request("municipios", {}, VALIDADORES.municipios));
	}
	/** Ayudas a fundaciones, otros departamentos y otras entidades. */
	getOtras() {
		return this.parte("otras", () => this.request("otras", {}, VALIDADORES.otras));
	}
	/** Las 7 categorías del tablero y lo que quedó fuera de ellas. */
	getCategorias() {
		return this.parte("categorias", () => this.request("categorias", {}, VALIDADORES.categorias));
	}
	/**
	* Lo que falta hoy en el centro de acopio. Es la única parte que NO se
	* guarda en el navegador (ver usePrecargaDesdeSnapshot): una lista de
	* faltantes vieja manda a la gente a donar lo que ya sobra.
	*/
	getFaltantes() {
		return this.parte("faltantes", () => this.request("faltantes", {}, VALIDADORES.faltantes));
	}
	/** Contratos de la reconstrucción, de la hoja CONTRATACION. */
	getContratacion() {
		return this.parte("contratacion", () => this.request("contratacion", {}, VALIDADORES.contratacion));
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
* cuadra. En ese modo VITE_TABLERO_V2_API_URL es obligatoria.
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
	"TSS_SERVER_FN_BASE": "/_serverFn/"
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
	"TSS_SERVER_FN_BASE": "/_serverFn/"
}["VITE_TABLERO_V2_API_URL"];
if (!usarProxy && !urlDirecta) throw new Error("VITE_AYUDAS_PROXY=0 exige VITE_TABLERO_V2_API_URL: configurá la URL /exec del Web App en tu .env.");
var ayudasApiRepository = new AyudasApiRepository(usarProxy ? URL_PROXY : urlDirecta);
/**
* useTablero.ts
* -----------------------------------------------------------------------
* Las consultas del tablero, una por ruta del backend. Comparten forma
* (una queryKey de un elemento, un queryFn del repositorio, el mismo
* reintento), así que viven en una fábrica: nadie le cambia el staleTime
* a una sola y las demás quedan desalineadas sin que se note.
*
* REINTENTOS
*
* Un Web App de Apps Script serializa las ejecuciones por usuario. Si
* varias consultas se pisan, las que llegan tarde reciben un 404 de la
* infraestructura de Google, no del script. Con tres reintentos y espera
* creciente la consulta se recupera sola; sin ellos, ese fallo de un
* segundo se vuelve permanente para toda la sesión.
*
* FRESCURA
*
* Los despachos y los contratos cambian cuando alguien carga una pestaña
* o una fila, no en horas: cinco minutos de staleTime. «Qué hace falta»
* sí caduca en horas (una lista vieja manda a donar lo que ya sobra) y
* por eso tiene el suyo, más corto, y no se siembra desde el navegador.
*/
/** Espera creciente entre intentos: 1s, 2s, 4s, con tope de 8. */
var REINTENTO_ESCALONADO = (intento) => Math.min(1e3 * 2 ** intento, 8e3);
var STALE_TIME_MS = 3e5;
var STALE_TIME_FALTANTES_MS = 12e4;
function consulta(clave, leer, staleTime = STALE_TIME_MS) {
	return () => useQuery({
		queryKey: [clave],
		queryFn: leer,
		staleTime,
		retry: 3,
		retryDelay: REINTENTO_ESCALONADO
	});
}
var useResumen = consulta("resumen", () => ayudasApiRepository.getResumen());
var useMunicipios = consulta("municipios", () => ayudasApiRepository.getMunicipios());
var useOtras = consulta("otras", () => ayudasApiRepository.getOtras());
var useCategorias = consulta("categorias", () => ayudasApiRepository.getCategorias());
var useFaltantes = consulta("faltantes", () => ayudasApiRepository.getFaltantes(), STALE_TIME_FALTANTES_MS);
/**
* lib/formato.ts
* -----------------------------------------------------------------------
* Formato de cifras y fechas del tablero, en un solo lugar para que una
* misma cantidad se lea igual en el balance, en el mapa y en la lista.
*
* Todas las toneladas del tablero son APROXIMADAS (vienen de pesos
* estimados en el Excel de despachos). Los decimales se ajustan al
* tamaño: 294 t se lee mejor que 294,034 t, pero un municipio con 45 kg
* no puede quedar en «0 t».
* -----------------------------------------------------------------------
*/
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
/** «294 t», «23,4 t», «0,05 t». Sin sufijo si `sufijo` es false. */
function toneladas(n, sufijo = true) {
	const decimales = n >= 100 ? 0 : n >= 10 ? 1 : 2;
	const texto = new Intl.NumberFormat("es-CO", { maximumFractionDigits: decimales }).format(n);
	return sufijo ? `${texto} t` : texto;
}
/** «$1.300.000.000». Es un dato público: no se redondea. */
function pesos(n) {
	return new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: "COP",
		maximumFractionDigits: 0
	}).format(n);
}
/** «2026-10-30» -> «30 de octubre de 2026». Vacío si no hay fecha válida. */
function fechaLarga(iso) {
	if (!iso) return "";
	const [anio, mes, dia] = iso.split("-");
	const nombre = MESES[Number(mes) - 1];
	if (!anio || !dia || !nombre) return "";
	return `${Number(dia)} de ${nombre} de ${anio}`;
}
/** «2026-08-25» -> «25 de agosto». */
function diaMes(iso) {
	if (!iso) return "";
	const [, mes, dia] = iso.split("-");
	const nombre = MESES[Number(mes) - 1];
	return nombre && dia ? `${Number(dia)} de ${nombre}` : "";
}
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
var NAME_ALIASES = [["Guadalajara de Buga", "Buga"], ["Santiago de Cali", "Cali"]];
function normMunicipalityName(name) {
	return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
}
var ALIAS_MAP = /* @__PURE__ */ new Map();
for (const [a, b] of NAME_ALIASES) {
	ALIAS_MAP.set(normMunicipalityName(a), normMunicipalityName(b));
	ALIAS_MAP.set(normMunicipalityName(b), normMunicipalityName(a));
}
/** true si los dos nombres designan el mismo municipio, tildes y alias incluidos. */
function sameMunicipality(a, b) {
	if (!a || !b) return false;
	const na = normMunicipalityName(a);
	const nb = normMunicipalityName(b);
	return na === nb || ALIAS_MAP.get(na) === nb;
}
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
var ICONOS = {
	Alimentos: Apple,
	"Protección y seguridad": ShieldCheck,
	"Kit de aseo": Droplets,
	"Descanso y abrigo": BedDouble,
	Mascotas: PawPrint,
	"Ropa y calzado": Shirt,
	"Menaje y utensilios": CookingPot
};
var iconoDeCategoria = (nombre) => ICONOS[nombre] ?? Package;
/** Color de grupo (el de «¿Qué se entregó?»): subsistencia, higiene, habitabilidad… */
var GRUPOS = {
	Alimentos: "#5CC46B",
	"Kit de aseo": "#4399CF",
	"Descanso y abrigo": "#B07BB8",
	"Ropa y calzado": "#B07BB8",
	"Menaje y utensilios": "#B07BB8",
	"Protección y seguridad": "#F08A1C",
	Mascotas: "#8DA32E"
};
var colorDeGrupo = (nombre) => GRUPOS[nombre] ?? "#0079C1";
/**
* Qué incluye cada categoría, con las palabras de la Gobernación, para la
* descripción de «¿Qué hace falta hoy?». Una categoría que no esté acá usa la
* lista que arma el backend con los grupos de producto de la hoja FAMILIAS.
*/
var INCLUYE = {
	"Protección y seguridad": [
		"Tapabocas",
		"Gafas",
		"Guantes",
		"Palas",
		"Pilas",
		"Herramientas y materiales"
	],
	"Kit de aseo": [
		"Kits de aseo e higiene",
		"Higiene personal y primera infancia",
		"Aseo del hogar y limpieza",
		"Papel higiénico",
		"Jabón",
		"Shampoo",
		"Pañitos",
		"Pañales"
	],
	"Descanso y abrigo": [
		"Carpas",
		"Colchonetas",
		"Cobijas",
		"Colchones",
		"Almohadas",
		"Sábanas",
		"Tendidos",
		"Kits de cama"
	]
};
var incluyeDeCategoria = (nombre) => INCLUYE[nombre];
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
* Todo menos `faltantes`. Esa es la única parte que caduca en horas, y una
* lista vieja manda a la gente a donar lo que ya sobra: esa sección espera
* a la respuesta real.
*
* Cada parte se valida con la misma regla que las respuestas del
* backend, y se siembra con la fecha en que se guardó. React Query la ve
* vieja y la reemplaza apenas llega la consulta que ya está en vuelo.
* Nunca pisa un dato que ya esté en la caché.
* -----------------------------------------------------------------------
*/
/**
* Las claves coinciden con las queryKey de useTablero y useContratacion. Si
* una de esas cambia, cambia acá.
*/
var PARTES_SEMBRABLES = [
	"resumen",
	"municipios",
	"otras",
	"categorias",
	"contratacion"
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
			className: "vc-menu-movil fixed left-4 top-4 z-50 flex size-12 items-center justify-center rounded-full bg-white text-[#0079C1] shadow-lg ring-1 ring-[#0079C1]/15 transition hover:bg-[#EAF7FC] md:hidden",
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
var FONDO = {
	cyan: "bg-[#0B7DB1]",
	azul: "bg-[#0079C1]",
	navy: "bg-[#123E5C]",
	crema: "bg-[#FBF8C6]",
	hueso: "bg-[#F2FAFD]",
	blanco: "bg-white"
};
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
* La franja de color a sangre.
*
* El color toca los dos bordes de la ventana y el ancho del contenido se
* controla adentro con `max-w-6xl`. Al revés —una caja de color centrada
* dentro de la sección— la pieza deja de leerse como sistema y parece
* una tarjeta suelta en medio de la página.
*/
function Banda({ tono = "hueso", className = "", primera = false, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `${FONDO[tono]} px-4 py-12 sm:px-6 sm:py-14 md:px-10 ${primera ? "max-md:pt-20" : ""} ${className}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-auto max-w-6xl",
			children
		})
	});
}
/**
* El recuadro amarillo detrás de una palabra del rótulo o del titular.
*
* `crema` para cuando el fondo ya es amarillo o cuando el recuadro cae
* sobre una banda cyan, donde el amarillo compite con el fondo.
*/
function Resaltado({ children, variante = "amarillo" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: variante === "crema" ? "vc-resaltado-crema" : "vc-resaltado",
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
function SectionIntro({ children, tono = "hueso" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: `mt-5 max-w-2xl text-lg leading-8 ${OSCURO[tono] ? "text-white" : "text-[#35708F]"}`,
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
* El lugar de una sección mientras llegan sus datos. Sin esto la sección
* no existe, y al llegar los datos empuja todo lo de abajo de golpe (salto
* de diseño). Solo se usa mientras carga: si los datos no están disponibles,
* la sección no se dibuja.
*/
function Cargando({ id, className, texto }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id,
		className: `vc-seccion ${className}`,
		"aria-busy": "true",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			role: "status",
			className: "px-4 py-24 text-center text-lg font-semibold text-[#35708F]",
			children: texto
		})
	});
}
function cifrasDe(r) {
	return [
		{
			etiqueta: "Toneladas aproximadas recibidas",
			valor: r.recibidas === null ? "Sin dato" : toneladas(r.recibidas),
			vacio: r.recibidas === null
		},
		{
			etiqueta: "Toneladas aproximadas despachadas",
			valor: toneladas(r.totales.toneladas)
		},
		{
			etiqueta: "Toneladas aproximadas en inventario",
			valor: r.inventario === null ? "Sin dato" : toneladas(r.inventario),
			vacio: r.inventario === null
		},
		{
			etiqueta: "Municipios atendidos",
			valor: `${r.totales.municipiosAtendidos}/${r.totales.municipiosTotales}`
		}
	];
}
function BalanceFinal() {
	const { data } = useResumen();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "Así se distribuyó la ayuda en el Valle del Cauca" }), data && data.disponible ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Contenido$1, { resumen: data }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-9 text-lg text-[#35708F]",
			role: "status",
			children: data ? "Las cifras no están disponibles en este momento." : "Cargando cifras…"
		})]
	});
}
function Contenido$1({ resumen }) {
	const cifras = cifrasDe(resumen);
	const corte = fechaLarga(resumen.corte);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
		className: "mt-9 grid gap-2 sm:grid-cols-2 lg:grid-cols-4",
		children: cifras.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: { "--i": i },
			className: "vc-aparece flex items-center gap-4 rounded-lg bg-[#123E5C] px-4 py-4 sm:block sm:px-5 sm:py-6 sm:text-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
				className: `order-first min-w-[6.5rem] shrink-0 font-extrabold leading-none tabular-nums sm:block ${c.vacio ? "text-[1.25rem] text-[#C9E4F2] sm:text-[1.5rem]" : "text-[1.75rem] text-[#FBF8C6] sm:text-[clamp(1.75rem,3.2vw,2.5rem)]"}`,
				children: c.valor
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
				className: "text-[15px] font-bold leading-tight text-white sm:mt-2 sm:text-base",
				children: c.etiqueta
			})]
		}, c.etiqueta))
	}), corte && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "vc-aparece mt-2 rounded-lg bg-[#FBF8C6] px-5 py-3.5 text-center",
		style: { "--i": cifras.length },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "block text-[13px] font-bold uppercase tracking-[0.16em] text-[#00639F]",
			children: "Con corte al"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
			className: "mt-0.5 block text-base font-extrabold text-[#123E5C] sm:text-lg",
			children: corte
		})]
	})] });
}
/**
* Cuando algo se despliega (el detalle de un municipio, la lista de una
* categoría), lo lleva a la vista con un desplazamiento suave: centrado si
* cabe en la pantalla, y si es más alto que ella, con su borde superior
* justo debajo del botón del menú.
*
* Se espera un instante antes de medir: el elemento acaba de insertarse y
* su altura final (con la animación de entrada) todavía no es la real.
* Con «reducir movimiento» activado, el salto es directo.
*/
function useCentrarAlAbrir(ref, clave) {
	(0, import_react.useEffect)(() => {
		const el = ref.current;
		if (!el) return;
		const t = window.setTimeout(() => {
			const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			const cabe = el.getBoundingClientRect().height <= window.innerHeight * .85;
			el.scrollIntoView({
				block: cabe ? "center" : "start",
				behavior: quieto ? "auto" : "smooth"
			});
		}, 80);
		return () => window.clearTimeout(t);
	}, [ref, clave]);
}
/**
* QueHaceFaltaSection.tsx — "¿Qué hace falta hoy?"
* -----------------------------------------------------------------------
* Siete categorías en tarjetas pequeñas. Al tocar una, se despliega lo
* que el centro de acopio necesita en ella, elemento por elemento.
*
* DE DÓNDE SALE
*
* De la plantilla QUE_HACE_FALTA, que llena el equipo del acopio: por
* cada elemento, Agotado, Escaso o Buena cantidad. El backend (Faltantes.js)
* descarta lo que no cuadra —categoría desconocida, estado que no es uno
* de los tres— en vez de corregirlo, así que lo que llega acá es lo que
* alguien escribió, no lo que alguien supuso.
*
* QUÉ SE VE
*
* · Cada tarjeta avisa sin abrirse: cuántos elementos están agotados y
*   cuántos escasos. Es lo que decide si vale la pena abrirla.
* · Cada elemento lleva su estado con la PALABRA además del color: una de
*   cada doce personas no distingue el rojo del verde, y este es el dato
*   que decide si alguien compra algo.
* · Que aparezca también lo que está en buena cantidad permite leer la
*   lista al revés: qué NO hay que llevar.
*
* ACCESIBLE: cada tarjeta es un botón con aria-expanded y aria-controls;
* el panel se anuncia como región.
*
* Sin elementos cargados, la tarjeta lo dice. Con la plantilla
* inaccesible, la sección no se dibuja: una lista vieja o vacía manda a
* donar a ciegas.
* -----------------------------------------------------------------------
*/
var CYAN_CENTRO = "#40BBE5";
var CYAN_BORDE = "#0E8BB7";
/** De lo que falta a lo que sobra. */
var ESTADOS = [
	{
		etiqueta: "Agotado",
		glosa: "En este momento no hay existencias.",
		fondo: "#C93520",
		texto: "#FFFFFF"
	},
	{
		etiqueta: "Escaso",
		glosa: "Se necesita más.",
		fondo: "#FFD400",
		texto: "#123E5C"
	},
	{
		etiqueta: "Buena cantidad",
		glosa: "Hay existencias suficientes por ahora.",
		fondo: "#5CC46B",
		texto: "#123E5C"
	}
];
var estadoDe = (e) => ESTADOS.find((x) => x.etiqueta === e) ?? ESTADOS[2];
function QueHaceFaltaSection() {
	const { data } = useFaltantes();
	const [abierta, setAbierta] = (0, import_react.useState)(null);
	const panelId = (0, import_react.useId)();
	const columnas = useColumnas();
	if (!data || !data.disponible) return null;
	const categorias = data.categorias;
	const idx = categorias.findIndex((c) => c.nombre === abierta);
	const finDeFila = idx < 0 ? -1 : Math.min(categorias.length - 1, (Math.floor(idx / columnas) + 1) * columnas - 1);
	const seleccionada = idx < 0 ? null : categorias[idx] ?? null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "que-hace-falta",
		className: "vc-seccion px-4 pb-12 pt-20 sm:px-6 sm:py-16 md:px-10",
		style: { background: `radial-gradient(ellipse at center, ${CYAN_CENTRO} 0%, ${CYAN_BORDE} 80%)` },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-6xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "vc-titular mx-auto w-fit bg-[#FBF8C6] px-[0.3em] py-[0.1em] text-center text-[clamp(1.75rem,6vw,3.5rem)] leading-tight text-[#0079C1]",
					children: "¿Qué hace falta hoy?"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "vc-titular mx-auto max-w-3xl px-2 py-6 text-center text-[clamp(1.1rem,2vw,1.75rem)] leading-snug text-[#FBF8C6]",
					children: "Toque una categoría para conocer qué se necesita en el centro de acopio y qué elementos están agotados, escasos o disponibles en buena cantidad."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Leyenda, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4",
					children: categorias.flatMap((c, i) => {
						const fila = [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tarjeta, {
							categoria: c,
							span: i === categorias.length - 1 && columnas > 1 && categorias.length % columnas ? columnas - categorias.length % columnas + 1 : 1,
							abierta: c.nombre === abierta,
							controla: panelId,
							onToggle: () => setAbierta((a) => a === c.nombre ? null : c.nombre)
						}, c.nombre)];
						if (i === finDeFila && seleccionada) fila.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							id: panelId,
							role: "region",
							"aria-label": `Detalle de ${seleccionada.nombre}`,
							className: "col-span-full",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Detalle$1, { categoria: seleccionada })
						}, `detalle-${seleccionada.nombre}`));
						return fila;
					})
				})
			]
		})
	});
}
/** Columnas de la rejilla según el ancho: 1, 2 (desde 640 px) o 4 (desde 1024 px). */
function useColumnas() {
	const [n, setN] = (0, import_react.useState)(1);
	(0, import_react.useEffect)(() => {
		const dos = window.matchMedia("(min-width: 640px)");
		const cuatro = window.matchMedia("(min-width: 1024px)");
		const medir = () => setN(cuatro.matches ? 4 : dos.matches ? 2 : 1);
		medir();
		dos.addEventListener("change", medir);
		cuatro.addEventListener("change", medir);
		return () => {
			dos.removeEventListener("change", medir);
			cuatro.removeEventListener("change", medir);
		};
	}, []);
	return n;
}
function Leyenda() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-xl bg-white px-4 py-3.5 sm:px-6 sm:py-5",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "grid gap-y-3 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-4",
			children: ESTADOS.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "grid grid-cols-[8.75rem_1fr] items-center gap-x-3 sm:flex sm:flex-col sm:items-center sm:text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "justify-self-start whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-extrabold sm:justify-self-auto",
					style: {
						background: e.fondo,
						color: e.texto
					},
					children: e.etiqueta
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[15px] leading-5 text-[#35708F] sm:mt-2 sm:leading-6",
					children: e.glosa
				})]
			}, e.etiqueta))
		})
	});
}
function Tarjeta({ categoria: c, abierta, controla, span, onToggle }) {
	const Icono = iconoDeCategoria(c.nombre);
	const color = colorDeGrupo(c.nombre);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
		style: span > 1 ? { gridColumn: `span ${span}` } : void 0,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: onToggle,
			"aria-expanded": abierta,
			"aria-controls": controla,
			className: `flex h-full min-h-[4.5rem] w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left shadow-sm transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${abierta ? "bg-[#FBF8C6]" : "bg-white hover:bg-[#F2FAFD]"}`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					"aria-hidden": true,
					className: "flex size-11 shrink-0 items-center justify-center rounded-full",
					style: { background: `${color}26` },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icono, {
						className: "size-6",
						style: { color },
						strokeWidth: 1.9
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "block text-base leading-tight text-[#123E5C]",
						children: c.nombre
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Estado, { categoria: c })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
					"aria-hidden": true,
					className: `size-5 shrink-0 text-[#0079C1] transition-transform motion-reduce:transition-none ${abierta ? "rotate-180" : ""}`
				})
			]
		})
	});
}
/** El estado de una categoría de un vistazo: «1 agotado · 2 escasos». */
function Estado({ categoria: c }) {
	if (c.total === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "mt-0.5 block text-[13px] text-[#587890]",
		children: "Sin información"
	});
	const partes = [];
	if (c.agotados > 0) partes.push({
		color: "#C93520",
		texto: `${c.agotados} ${c.agotados === 1 ? "agotado" : "agotados"}`
	});
	if (c.escasos > 0) partes.push({
		color: "#F2B705",
		texto: `${c.escasos} ${c.escasos === 1 ? "escaso" : "escasos"}`
	});
	if (partes.length === 0) partes.push({
		color: "#5CC46B",
		texto: "Todo en buena cantidad"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] font-semibold text-[#35708F]",
		children: partes.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "inline-flex items-center gap-1.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
				"aria-hidden": true,
				className: "block size-2 rounded-full",
				style: { background: p.color }
			}), p.texto]
		}, p.texto))
	});
}
function Detalle$1({ categoria: c }) {
	const ref = (0, import_react.useRef)(null);
	useCentrarAlAbrir(ref, c.nombre);
	const incluye = incluyeDeCategoria(c.nombre) ?? c.incluye;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: "rounded-xl bg-white p-5 shadow-sm sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-xl font-extrabold text-[#0079C1]",
				children: c.nombre
			}),
			incluye && incluye.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1.5 text-[14px] leading-5 text-[#35708F]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "font-bold text-[#123E5C]",
						children: "Incluye:"
					}),
					" ",
					incluye.join(" · ")
				]
			}),
			c.elementos.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-base text-[#35708F]",
				children: "Aún no hay información de esta categoría."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 divide-y divide-[#123E5C]/10",
				children: c.elementos.map((e) => {
					const est = estadoDe(e.estado);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-start justify-between gap-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-base font-bold text-[#123E5C]",
								children: e.nombre
							}), e.observacion && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-0.5 block text-[14px] leading-5 text-[#35708F]",
								children: e.observacion
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-extrabold",
							style: {
								background: est.fondo,
								color: est.texto
							},
							children: est.etiqueta
						})]
					}, e.nombre);
				})
			})
		]
	});
}
/**
* MunicipiosSection.tsx — "¿Cuánta ayuda recibió cada municipio?"
* -----------------------------------------------------------------------
* Tres bandas, como el resto de las piezas de la campaña: el titular sobre
* cyan, el rótulo sobre azul y el selector de los 42 municipios sobre crema,
* con su buscador y sus filtros por zona; al final, la mini sección «Otras
* ayudas humanitarias».
*
* POR QUÉ UN SELECTOR Y NO UNA GALERÍA DE FICHAS
*
* De cada municipio solo hay que mostrar el nombre, la zona y, al elegirlo,
* sus toneladas. Una ficha grande por municipio gastaba 110 px de alto para
* decir eso: 42 fichas eran más de 4.600 px en un teléfono, y quien buscaba
* uno tenía que recorrerlas todas. Ahora cada municipio es un botón de una
* línea (unos 1.100 px en el teléfono, a dos columnas, y menos de 500 px en escritorio) y el
* detalle es UNO solo, que se abre justo debajo de la fila del botón tocado,
* sin mandar a la persona a otra parte de la página.
*
* La zona se lee por el punto de color (el mismo de los filtros), así no
* hace falta repetir «Zona Norte» 18 veces. El orden es alfabético y sin
* posiciones: el ranking de «los que más recibieron» se fue.
*
* Un municipio sin despachos registrados lo dice, no muestra «0 t»: «el
* Excel no registra» y «no recibió» no son la misma afirmación.
*
* LO QUE NO ES UN MUNICIPIO
*
* Municipios múltiples, otras ayudas y traslados, más los 42 municipios,
* son el total despachado. Por eso van acá y no en secciones aparte: la
* cuenta se cierra a la vista.
* -----------------------------------------------------------------------
*/
var ZONAS = [
	"Norte",
	"Centro",
	"Sur",
	"Pacífico"
];
/** El color de cada zona: el mismo en el filtro y en el punto de cada botón. */
var COLOR_ZONA = {
	Norte: "#22ABE2",
	Centro: "#F2B705",
	Sur: "#5CC46B",
	Pacífico: "#B07BB8"
};
/** La franja azul con el rótulo de un bloque. */
function BandaRotulo({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "bg-[#0079C1] px-4 py-7 sm:px-6 md:px-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "vc-rotulo mx-auto max-w-6xl text-[clamp(1.5rem,3.6vw,2.5rem)] text-white",
			children
		})
	});
}
function MunicipiosSection() {
	const { data, isPending } = useMunicipios();
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cargando, {
		id: "municipios",
		className: "min-h-dvh bg-[#FBF8C6]",
		texto: "Cargando los municipios…"
	});
	if (!data || !data.disponible || data.municipios.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Contenido, { municipios: data.municipios });
}
function Contenido({ municipios }) {
	const [busqueda, setBusqueda] = (0, import_react.useState)("");
	const [zona, setZona] = (0, import_react.useState)(null);
	const [abierto, setAbierto] = (0, import_react.useState)(null);
	const ordenados = (0, import_react.useMemo)(() => [...municipios].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")), [municipios]);
	const porZona = (0, import_react.useMemo)(() => {
		const cuenta = /* @__PURE__ */ new Map();
		for (const m of municipios) cuenta.set(m.zona, (cuenta.get(m.zona) ?? 0) + 1);
		return cuenta;
	}, [municipios]);
	const visibles = (0, import_react.useMemo)(() => {
		const q = normMunicipalityName(busqueda);
		return ordenados.filter((m) => (zona === null || m.zona === zona) && (q === "" || normMunicipalityName(m.nombre).includes(q)));
	}, [
		ordenados,
		busqueda,
		zona
	]);
	const sinResultados = visibles.length === 0;
	const rejilla = (0, import_react.useRef)(null);
	const [columnas, setColumnas] = (0, import_react.useState)(1);
	(0, import_react.useEffect)(() => {
		const el = rejilla.current;
		if (!el) return;
		const medir = () => {
			const n = getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length;
			setColumnas(Math.max(1, n));
		};
		medir();
		const ro = new ResizeObserver(medir);
		ro.observe(el);
		return () => ro.disconnect();
	}, [sinResultados]);
	(0, import_react.useEffect)(() => {
		if (abierto !== null && !visibles.some((m) => m.id === abierto)) setAbierto(null);
	}, [visibles, abierto]);
	const filtros = [{
		valor: null,
		etiqueta: "Todas las zonas",
		cantidad: municipios.length
	}, ...ZONAS.map((z) => ({
		valor: z,
		etiqueta: z,
		cantidad: porZona.get(z) ?? 0
	}))];
	const idxAbierto = abierto === null ? -1 : visibles.findIndex((m) => m.id === abierto);
	const finDeFila = idxAbierto < 0 ? -1 : Math.min(visibles.length - 1, (Math.floor(idxAbierto / columnas) + 1) * columnas - 1);
	const seleccionado = idxAbierto < 0 ? null : visibles[idxAbierto] ?? null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "municipios",
		className: "vc-seccion bg-[#FBF8C6]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banda, {
				tono: "cyan",
				primera: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, {
					tono: "cyan",
					children: "¿Cuánta ayuda recibió cada municipio?"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BandaRotulo, { children: ["Los ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "vc-resaltado",
				children: [municipios.length, " municipios"]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Banda, {
				tono: "crema",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#123E5C]/10 sm:p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						role: "group",
						"aria-label": "Filtrar por zona",
						className: "-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden",
						children: filtros.map((f) => {
							const activo = zona === f.valor;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setZona(activo ? null : f.valor),
								"aria-pressed": activo,
								className: `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-base font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1] ${activo ? "bg-[#0079C1] text-white shadow-md" : "bg-[#EAF7FC] text-[#35708F] hover:bg-[#DDF0FA] hover:text-[#0079C1]"}`,
								children: [
									f.valor && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
										"aria-hidden": true,
										className: "block size-2.5 rounded-full ring-2 ring-white/70",
										style: { background: COLOR_ZONA[f.valor] }
									}),
									f.etiqueta,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `rounded-full px-2 py-0.5 text-sm font-bold ${activo ? "bg-[#005F99] text-white" : "bg-white text-[#0079C1]"}`,
										children: f.cantidad
									})
								]
							}, f.etiqueta);
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-col gap-3 sm:flex-row sm:items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "relative block min-w-0 flex-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "sr-only",
									children: "Buscar municipio"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
									"aria-hidden": true,
									className: "pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#8FAABC]"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "search",
									value: busqueda,
									onChange: (e) => setBusqueda(e.target.value),
									placeholder: "Buscar municipio…",
									className: "min-h-11 w-full rounded-lg border-2 border-transparent bg-[#F2FAFD] py-3 pl-11 pr-4 text-base text-[#123E5C] outline-none transition placeholder:text-[#587890] focus:border-[#0079C1]"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "shrink-0 text-base font-semibold text-[#35708F] sm:text-right",
							"aria-live": "polite",
							children: visibles.length === municipios.length ? "" : `${visibles.length} de ${municipios.length} municipios`
						})]
					})]
				}), visibles.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 rounded-lg border-2 border-dashed border-[#0079C1]/40 bg-white/60 p-10 text-center text-base text-[#35708F]",
					children: "Ningún municipio coincide. Pruebe con otro nombre o quite el filtro de zona."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					ref: rejilla,
					className: "mt-4 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,9.75rem),1fr))]",
					children: visibles.flatMap((m, i) => {
						const fila = [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boton, {
							municipio: m,
							activo: abierto === m.id,
							onToggle: setAbierto
						}, m.id)];
						if (i === finDeFila && seleccionado) fila.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Detalle, {
							municipio: seleccionado,
							onCerrar: () => setAbierto(null)
						}, `detalle-${seleccionado.id}`));
						return fila;
					})
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OtrasAyudas, {})]
			})
		]
	});
}
/**
* El botón de un municipio: una línea, el punto de su zona y el nombre.
* `memo` y un `onToggle` estable: al abrir uno, los otros 41 no se vuelven
* a dibujar.
*/
var Boton = (0, import_react.memo)(function Boton({ municipio: m, activo, onToggle }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: () => onToggle((a) => a === m.id ? null : m.id),
		"aria-pressed": activo,
		"aria-label": `${m.nombre}, zona ${m.zona}`,
		className: `flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold ring-1 transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1] ${activo ? "bg-[#0079C1] text-white ring-[#0079C1]" : m.atendido ? "bg-white text-[#123E5C] ring-[#123E5C]/10 hover:bg-[#EAF7FC] hover:ring-[#0079C1]/40" : "bg-[#EAF7FC] text-[#587890] ring-[#123E5C]/10 hover:ring-[#0079C1]/40"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
			"aria-hidden": true,
			className: "block size-2.5 shrink-0 rounded-full ring-2 ring-white/70",
			style: { background: COLOR_ZONA[m.zona] }
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "line-clamp-2 min-w-0 break-words leading-tight",
			children: m.nombre
		})]
	}) });
});
/** El detalle del municipio elegido, a todo el ancho, bajo su fila (escritorio). */
function Detalle({ municipio: m, onCerrar }) {
	const ref = (0, import_react.useRef)(null);
	useCentrarAlAbrir(ref, m.id);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
		ref,
		className: "vc-aparece col-span-full",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TarjetaDetalle, {
			municipio: m,
			onCerrar
		})
	});
}
function TarjetaDetalle({ municipio: m, onCerrar }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative rounded-lg bg-[#123E5C] px-5 py-5 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onCerrar,
				"aria-label": "Cerrar detalle",
				className: "absolute right-2 top-2 flex size-11 items-center justify-center rounded-full text-[#C9E4F2] hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
					"aria-hidden": true,
					className: "size-5"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#FFD400]",
				children: ["Zona ", m.zona]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
				className: "vc-titular mt-1 pr-10 text-[clamp(1.5rem,3.4vw,2.2rem)] leading-tight text-[#FBF8C6]",
				children: m.nombre
			}),
			m.atendido ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
					className: "text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold leading-none tabular-nums text-[#FBF8C6]",
					children: toneladas(m.toneladas)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-base text-[#C9E4F2]",
					children: "toneladas aproximadas"
				})]
			}) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-base text-[#C9E4F2]",
				children: "No hay entregas registradas en este municipio."
			})
		]
	}) });
}
/**
* La mini sección «Otras ayudas humanitarias»: lo entregado a fundaciones,
* otros departamentos y otras entidades, que no es de ningún municipio. Las
* demás rutas (municipios múltiples, puntos de distribución) están en el
* balance, con el diseño de las rutas.
*/
function OtrasAyudas() {
	const { data } = useOtras();
	if (!data || !data.disponible) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "vc-aparece mt-10 flex flex-col gap-5 rounded-lg bg-[#123E5C] p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:p-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "vc-titular text-[clamp(1.6rem,3.4vw,2.4rem)] leading-tight text-[#FBF8C6]",
				children: "Otras ayudas humanitarias"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-xl text-base leading-7 text-[#CFEAF7]",
				children: "Ayudas entregadas a fundaciones, otros departamentos y otras entidades."
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "shrink-0 sm:text-right",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
				className: "block text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold leading-none tabular-nums text-[#FBF8C6]",
				children: toneladas(data.toneladas)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-1.5 block text-base text-[#C9E4F2]",
				children: "toneladas aproximadas"
			})]
		})]
	});
}
/**
* CategoriasSection.tsx — "Ayuda distribuida por categorías"
* -----------------------------------------------------------------------
* Las siete categorías del tablero. Cada una dice cuánto se distribuyó y, al
* tocarla, se abre y muestra qué productos incluye, con sus toneladas.
*
* Antes eran siete pestañas cerradas que no hacían nada: no decían cuánto ni
* qué, así que no servían para nada. Ahora la sección es el desglose de lo que
* se ve en el mapa, por categoría y por producto.
*
* Las cifras salen de la ruta `categorias` del backend: toneladas por
* categoría y sus productos de más peso; lo demás se junta en «otros
* productos». Si el backend es de una versión anterior y no trae productos,
* la categoría se muestra sin desplegar.
*
* Las categorías y su orden vienen del backend; si la ruta no está
* disponible, la sección no se dibuja.
* -----------------------------------------------------------------------
*/
function CategoriasSection() {
	const { data, isPending } = useCategorias();
	const panelId = (0, import_react.useId)();
	const [abierta, setAbierta] = (0, import_react.useState)(null);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cargando, {
		id: "categorias",
		className: "min-h-[34rem] bg-[#0B7DB1] [&_p]:text-white",
		texto: "Cargando las categorías…"
	});
	if (!data || !data.disponible || data.categorias.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "categorias",
		className: "vc-seccion bg-[#0B7DB1] px-4 pb-12 pt-20 sm:px-6 sm:py-14 md:px-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-3xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				className: "vc-titular mx-auto w-fit text-center text-[clamp(1.75rem,5.5vw,3.25rem)] text-[#FBF8C6]",
				children: [
					"Ayuda distribuida por",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-1 inline-block bg-[#FBF8C6] px-[0.3em] py-[0.05em] text-[#0079C1]",
						children: "categorías"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-8 space-y-2.5",
				"aria-label": "Categorías de ayuda",
				children: data.categorias.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fila, {
					categoria: c,
					indice: i,
					abierta: abierta === c.nombre,
					controla: `${panelId}-${i}`,
					onToggle: () => setAbierta((a) => a === c.nombre ? null : c.nombre)
				}, c.nombre))
			})]
		})
	});
}
function Fila({ categoria: c, indice, abierta, controla, onToggle }) {
	const Icono = iconoDeCategoria(c.nombre);
	const color = colorDeGrupo(c.nombre);
	const productos = c.productos ?? [];
	const desplegable = productos.length > 0;
	const ref = (0, import_react.useRef)(null);
	useCentrarAlAbrir(abierta ? ref : { current: null }, abierta ? c.nombre : "");
	const contenido = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			"aria-hidden": true,
			className: "flex size-10 shrink-0 items-center justify-center rounded-full",
			style: { background: `${color}22` },
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icono, {
				className: "size-5",
				style: { color },
				strokeWidth: 2
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "min-w-0 flex-1 text-lg font-bold leading-tight text-[#123E5C]",
			children: c.nombre
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "shrink-0 text-lg font-extrabold tabular-nums text-[#0079C1]",
			children: toneladas(c.toneladas)
		}),
		desplegable && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
			"aria-hidden": true,
			className: `size-5 shrink-0 text-[#0079C1] transition-transform duration-200 motion-reduce:transition-none ${abierta ? "rotate-180" : ""}`
		})
	] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		ref,
		style: {
			"--i": indice,
			borderLeftColor: color
		},
		className: "vc-aparece overflow-hidden rounded-lg border-l-[4px] bg-white shadow-sm ring-1 ring-[#123E5C]/10",
		children: [desplegable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: onToggle,
			"aria-expanded": abierta,
			"aria-controls": controla,
			className: `flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ${abierta ? "bg-[#FBF8C6]" : "hover:bg-[#F2FAFD]"}`,
			children: contenido
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex min-h-16 w-full items-center gap-3 px-4 py-3",
			children: contenido
		}), desplegable && abierta && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			id: controla,
			role: "region",
			"aria-label": `Productos de ${c.nombre}`,
			className: "px-4 pb-4 pt-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[13px] font-bold uppercase tracking-[0.12em] text-[#35708F]",
				children: "Qué incluye"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-2 divide-y divide-[#123E5C]/10",
				children: [productos.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between gap-4 text-base",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "min-w-0 font-semibold text-[#123E5C]",
							children: p.nombre
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "shrink-0 tabular-nums text-[#123E5C]",
							children: toneladas(p.toneladas)
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#123E5C]/10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
							className: "block h-full rounded-full",
							style: {
								width: `${Math.max(2, Math.round(p.toneladas / Math.max(c.toneladas, .001) * 100))}%`,
								background: color
							}
						})
					})]
				}, p.nombre)), c.otros !== void 0 && c.otros > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-baseline justify-between gap-4 py-2 text-base",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[#35708F]",
						children: "Otros productos"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "shrink-0 tabular-nums text-[#35708F]",
						children: toneladas(c.otros)
					})]
				})]
			})]
		})]
	});
}
/**
* MapaDiferido.tsx
* -----------------------------------------------------------------------
* Monta el mapa recién cuando la persona se acerca a la sección
* del mapa.
*
* POR QUÉ
*
* Sin esto, MapLibre GL —de las librerías más pesadas de todo el sitio—
* viajaría en el JavaScript inicial. El mapa es la ÚLTIMA sección del
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
* No hay desajuste de hidratación: el servidor y el primer render del
* cliente dibujan los dos el marcador de carga.
* -----------------------------------------------------------------------
*/
var cargarMapa = () => import("./MapaToneladas-DXhh6MyD.mjs");
var Mapa = (0, import_react.lazy)(() => cargarMapa().then((modulo) => ({ default: modulo.MapaToneladas })));
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
			cargarMapa();
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
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mapa, {})
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CargandoMapa, {})
	});
}
/**
* VolverArriba.tsx
* -----------------------------------------------------------------------
* Un botón flotante, solo en el celular, para volver al inicio sin tener
* que arrastrar el dedo por toda la página (la lista de municipios sola
* mide dos pantallas y media).
*
* Aparece cuando se bajó más de una pantalla y se esconde sobre el mapa,
* donde el dedo está moviendo el mapa y el botón estorbaría a la línea de
* tiempo.
* -----------------------------------------------------------------------
*/
function VolverArriba({ scrollRootId, mapaId }) {
	const [lejos, setLejos] = (0, import_react.useState)(false);
	const [enMapa, setEnMapa] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const raiz = document.getElementById(scrollRootId);
		if (!raiz) return;
		const alMover = () => setLejos(raiz.scrollTop > window.innerHeight);
		alMover();
		raiz.addEventListener("scroll", alMover, { passive: true });
		const mapa = document.getElementById(mapaId);
		const obs = mapa ? new IntersectionObserver(([e]) => setEnMapa(!!e && e.isIntersecting), {
			root: raiz,
			threshold: .3
		}) : null;
		if (mapa) obs?.observe(mapa);
		return () => {
			raiz.removeEventListener("scroll", alMover);
			obs?.disconnect();
		};
	}, [scrollRootId, mapaId]);
	const visible = lejos && !enMapa;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		tabIndex: visible ? 0 : -1,
		"aria-hidden": !visible,
		"aria-label": "Volver al inicio",
		onClick: () => {
			const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			document.getElementById(scrollRootId)?.scrollTo({
				top: 0,
				behavior: quieto ? "auto" : "smooth"
			});
		},
		className: `fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-12 items-center justify-center rounded-full bg-[#0079C1] text-white shadow-lg ring-2 ring-white transition duration-200 active:scale-95 md:hidden motion-reduce:transition-none ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, {
			className: "size-6",
			"aria-hidden": true
		})
	});
}
function TarjetaPrincipal({ rotulo, titulo, texto, cifras, acento, children, indice = 0, compacta = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		style: { "--i": indice },
		className: `vc-aparece rounded-lg bg-[#123E5C] ${compacta ? "p-5 sm:p-6" : "p-6 sm:p-8"}`,
		children: [
			rotulo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#FFD400]",
				children: rotulo
			}),
			acento && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
				"aria-hidden": true,
				className: "mt-2 block h-1 w-10 rounded-full",
				style: { background: acento }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: `vc-titular text-[clamp(1.6rem,3.4vw,2.4rem)] leading-tight text-[#FBF8C6] ${rotulo || acento ? "mt-3" : ""}`,
				children: titulo
			}),
			texto && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-base leading-7 text-[#CFEAF7]",
				children: texto
			}),
			cifras && cifras.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
				className: "mt-6 flex flex-wrap gap-x-9 gap-y-4",
				children: cifras.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
					className: "text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold leading-none tabular-nums text-[#FBF8C6]",
					children: c.valor
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
					className: "mt-1.5 text-base text-[#C9E4F2]",
					children: c.etiqueta
				})] }, c.etiqueta))
			}),
			children
		]
	});
}
/**
* PuntosDistribucionSection.tsx — "Otros puntos de distribución"
* -----------------------------------------------------------------------
* Cierra el relato con los otros dos puntos de distribución de la
* Gobernación: Cartago y Buenaventura, sin texto de introducción. Usa las mismas tarjetas azul marino con rótulo amarillo que
* presentaban las rutas principales, para que se lea como continuación de
* lo que ya se conocía.
*
* Sustituye a «¿De dónde salió?», que dibujaba rutas y porcentajes por
* origen. El Excel oficial de despachos no registra de dónde salió cada
* despacho, así que no hay cifra honesta que poner acá: la sección dice
* dónde están los puntos y nada más. Las toneladas por punto se agregan el
* día que haya fuente.
*
* LOS NOMBRES ESTÁN EN EL CÓDIGO, NO EN UNA BASE
*
* Son dos puntos fijos, definidos por la Gobernación. Una base para dos
* nombres sería una hoja que alguien puede dañar sin ganar nada.
* -----------------------------------------------------------------------
*/
var PUNTOS = [{
	nombre: "Punto de distribución Cartago",
	acento: "#E36B0F"
}, {
	nombre: "Punto de distribución Buenaventura",
	acento: "#22ABE2"
}];
function PuntosDistribucionSection() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "puntos",
		className: "vc-seccion bg-white",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Banda, {
			tono: "blanco",
			primera: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SectionTitle, { children: ["Otros puntos de ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Resaltado, { children: "distribución" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 grid gap-3 md:grid-cols-2 md:gap-4",
				children: PUNTOS.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TarjetaPrincipal, {
					indice: i,
					compacta: true,
					rotulo: "Punto de distribución",
					acento: p.acento,
					titulo: p.nombre.replace("Punto de distribución ", "")
				}, p.nombre))
			})]
		})
	});
}
/**
* useContratacion.ts
* -----------------------------------------------------------------------
* Contratos de la reconstrucción, desde route=contratacion.
*
* La lista cambia cuando alguien carga la hoja, no en horas (a diferencia
* de necesidades), así que sí se siembra desde el snapshot del navegador
* (ver usePrecargaDesdeSnapshot). Reintentos escalonados por la misma
* razón que en useAyuda.
*/
var CONTRATACION_STALE_TIME_MS = 3e5;
function useContratacion() {
	return useQuery({
		queryKey: ["contratacion"],
		queryFn: () => ayudasApiRepository.getContratacion(),
		staleTime: CONTRATACION_STALE_TIME_MS,
		retry: 3,
		retryDelay: REINTENTO_ESCALONADO
	});
}
/**
* ContratacionSection.tsx — "La contratación de la reconstrucción"
* -----------------------------------------------------------------------
* Última sección del tablero: los contratos celebrados para atender la
* emergencia, en una tabla de cinco columnas, en este orden:
*
*   Dependencia contratante · Objeto · Valor inicial · Contratista ·
*   Enlace de publicación en SECOP
*
* Se alimenta de una base distinta a la del resto del tablero (hoja
* CONTRATACION). El enlace abre en otra pestaña y el valor se muestra en
* pesos.
*
* TABLA EN ESCRITORIO, FICHAS EN CELULAR
*
* Una tabla de cinco columnas con objetos de cinco líneas no cabe a
* 360 px sin scroll horizontal. Desde `md` es una <table> real; debajo,
* cada contrato es una ficha con los mismos cinco datos y las mismas
* etiquetas.
*
* LO QUE NO SE MUESTRA, A PROPÓSITO
*
* · Un valor sin informar no aparece como $0: dice «No informado». Cero
*   sería una afirmación.
* · El total suma solo lo informado y, si hay contratos sin valor, lo
*   dice al lado. Un total que parece completo y no lo es engaña.
* · No hay fecha: la hoja no la trae y `actualizadoEn` es la hora en que
*   el backend armó la respuesta, no la de los contratos.
*
* Sin contratos (hoja vacía o aún no creada) o con la consulta caída, la
* sección NO desaparece: dice «Próximamente». El menú lleva a esta sección, y
* una sección que aparece y desaparece según los datos deja un enlace roto.
* Mientras llegan los datos, ocupa su lugar para que nada salte.
* -----------------------------------------------------------------------
*/
/** Cuántos contratos se ven antes de pedir «Ver todos». */
var VISIBLES = 8;
var NO_INFORMADO = "No informado";
/** Lo que se ve mientras no haya contratos publicados: la sección sigue ahí, con su lugar en el menú. */
function ContratosProximamente() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "contratacion",
		className: "vc-seccion bg-[#F2FAFD]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Banda, {
			tono: "cyan",
			primera: true,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SectionTitle, {
					tono: "cyan",
					children: ["Contratos de la ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Resaltado, {
						variante: "crema",
						children: "emergencia"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 inline-block rounded-full bg-[#FBF8C6] px-5 py-2 text-lg font-extrabold uppercase tracking-[0.08em] text-[#0079C1]",
					children: "Próximamente"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionIntro, {
					tono: "cyan",
					children: "Aquí se publicarán los contratos celebrados para atender la emergencia, cada uno con su enlace a SECOP."
				})
			]
		})
	});
}
function ContratacionSection() {
	const { data, isPending } = useContratacion();
	const [verTodos, setVerTodos] = (0, import_react.useState)(false);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cargando, {
		id: "contratacion",
		className: "min-h-[24rem] bg-[#F2FAFD]",
		texto: "Cargando los contratos…"
	});
	if (!data || data.contratos.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContratosProximamente, {});
	const { contratos, totalContratos, valorTotalInformado, sinValorInformado } = data;
	const visibles = verTodos ? contratos : contratos.slice(0, VISIBLES);
	const conValor = totalContratos - sinValorInformado;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "contratacion",
		className: "vc-seccion bg-[#F2FAFD]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Banda, {
			tono: "cyan",
			primera: true,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SectionTitle, {
				tono: "cyan",
				children: ["Contratos de la ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Resaltado, {
					variante: "crema",
					children: "emergencia"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SectionIntro, {
				tono: "cyan",
				children: [
					totalContratos === 1 ? "Un contrato celebrado" : `${totalContratos} contratos celebrados`,
					conValor > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						" ",
						"por ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "text-white",
							children: pesos(valorTotalInformado)
						}),
						sinValorInformado > 0 && `, sin contar ${sinValorInformado === 1 ? "un contrato sin valor informado" : `${sinValorInformado} contratos sin valor informado`}`
					] }),
					". Cada uno enlaza a su publicación en SECOP."
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Banda, {
			tono: "hueso",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "hidden overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-[#123E5C]/10 md:block",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full table-fixed border-collapse text-left",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("caption", {
								className: "sr-only",
								children: "Contratos celebrados para la atención de la emergencia"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "bg-[#0079C1] text-white",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "text-[13px] font-bold uppercase tracking-[0.08em]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											scope: "col",
											className: "w-[17%] px-4 py-3",
											children: "Dependencia contratante"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											scope: "col",
											className: "w-[34%] px-4 py-3",
											children: "Objeto"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											scope: "col",
											className: "w-[14%] px-4 py-3",
											children: "Valor inicial"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											scope: "col",
											className: "w-[17%] px-4 py-3",
											children: "Contratista"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											scope: "col",
											className: "w-[18%] px-4 py-3",
											children: "Enlace de publicación en SECOP"
										})
									]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
								className: "divide-y divide-[#123E5C]/10 align-top text-[15px] leading-6 text-[#123E5C]",
								children: visibles.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "break-words px-4 py-4",
										children: c.dependencia ?? NO_INFORMADO
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "break-words px-4 py-4",
										children: c.objeto
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-4 font-bold tabular-nums",
										children: c.valorInicial !== null ? pesos(c.valorInicial) : NO_INFORMADO
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "break-words px-4 py-4",
										children: c.contratista ?? NO_INFORMADO
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-4",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EnlaceSecop, { contrato: c })
									})
								] }, c.id))
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-3 md:hidden",
					"aria-label": "Contratos celebrados",
					children: visibles.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: "rounded-lg bg-white p-4 shadow-sm ring-1 ring-[#123E5C]/10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "space-y-3 text-[15px] leading-6 text-[#123E5C]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dato, {
									etiqueta: "Dependencia contratante",
									children: c.dependencia ?? NO_INFORMADO
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dato, {
									etiqueta: "Objeto",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ObjetoCorto, { texto: c.objeto })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dato, {
									etiqueta: "Valor inicial",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: "tabular-nums",
										children: c.valorInicial !== null ? pesos(c.valorInicial) : NO_INFORMADO
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dato, {
									etiqueta: "Contratista",
									children: c.contratista ?? NO_INFORMADO
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dato, {
									etiqueta: "Enlace de publicación en SECOP",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EnlaceSecop, { contrato: c })
								})
							]
						})
					}, c.id))
				}),
				contratos.length > VISIBLES && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setVerTodos((v) => !v),
					"aria-expanded": verTodos,
					className: "mt-6 inline-flex min-h-11 items-center rounded-full bg-[#0079C1] px-6 text-base font-bold text-white hover:bg-[#123E5C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1]",
					children: verTodos ? "Ver menos" : `Ver los ${contratos.length} contratos`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Aviso, { children: "Valor inicial de cada contrato, sin adiciones ni modificaciones posteriores. Para ver su estado actual, consulte la publicación en SECOP." })
				})
			]
		})]
	});
}
/** En el celular el objeto puede tener diez líneas: se muestra recortado y se abre con un toque. */
function ObjetoCorto({ texto }) {
	const [abierto, setAbierto] = (0, import_react.useState)(false);
	const largo = texto.length > 220;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: largo && !abierto ? "line-clamp-4" : void 0,
		children: texto
	}), largo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick: () => setAbierto((v) => !v),
		"aria-expanded": abierto,
		className: "mt-1 flex min-h-11 items-center text-[15px] font-semibold text-[#0079C1] underline underline-offset-4",
		children: abierto ? "Ver menos" : "Ver completo"
	})] });
}
function Dato({ etiqueta, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
		className: "text-[13px] font-bold uppercase tracking-[0.08em] text-[#35708F]",
		children: etiqueta
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
		className: "break-words",
		children
	})] });
}
function EnlaceSecop({ contrato: c }) {
	if (!c.enlaceSecop) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-[#35708F]",
		children: NO_INFORMADO
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
		href: c.enlaceSecop,
		target: "_blank",
		rel: "noopener noreferrer",
		className: "inline-flex min-h-11 items-center gap-1.5 font-bold text-[#0079C1] underline underline-offset-4 hover:text-[#123E5C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1]",
		children: [
			"Ver en SECOP",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, {
				"aria-hidden": true,
				className: "size-4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: " (se abre en otra pestaña)"
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
/**
* StoryPage.tsx
* -----------------------------------------------------------------------
* El relato completo de la Ruta de la Solidaridad, de la portada a los
* contratos.
*
* EL ORDEN
*
*   portada · balance · ¿qué hace falta hoy? · municipios · categorías ·
*   mapa · lo que muestran los datos · otros puntos de distribución ·
*   contratos
*
* «¿Qué hace falta hoy?» va tercera y no al final: es la única sección
* que pide algo en vez de informar, y la única cuyo contenido caduca en
* horas. Los puntos de distribución y los contratos cierran la página.
*
* TODO SALE DE LA API
*
* Esta página no calcula ni escribe ninguna cifra: cada sección pide la
* suya a su ruta (ver application/hooks/useTablero.ts) y se omite si el
* backend no la entrega. La fecha del pie es la de la última pestaña
* diaria cargada.
*
* SOBRE LA ESTRUCTURA POR BANDAS
*
* En las piezas de la campaña el color no es un fondo, es la estructura:
* franjas horizontales a sangre —cyan para el titular, crema o hueso para
* el contenido— y el ancho máximo se controla adentro con `max-w-6xl`.
* Cada sección emite su propia <section> con su `id`, así que acá no se
* les pone relleno por fuera.
* -----------------------------------------------------------------------
*/
var SCROLL_ROOT_ID = "ruta-solidaridad-scroll";
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
		id: "que-hace-falta",
		label: "¿Qué hace falta hoy?",
		icon: HandHeart
	},
	{
		id: "municipios",
		label: "Municipios",
		icon: MapPin
	},
	{
		id: "categorias",
		label: "Categorías",
		icon: Package
	},
	{
		id: "mapa-de-ayudas",
		label: "Mapa de Ayudas",
		icon: Map$1
	},
	{
		id: "puntos",
		label: "Puntos de distribución",
		icon: Warehouse
	},
	{
		id: "contratacion",
		label: "Contratos",
		icon: FilePenLine
	}
];
function StoryPage() {
	usePrecargaDesdeSnapshot();
	const { data: resumen } = useResumen();
	const corte = resumen && resumen.disponible ? fechaLarga(resumen.corte) : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
			href: "#balance",
			className: "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-base focus:font-bold focus:text-[#0079C1] focus:shadow-lg",
			children: "Saltar al contenido"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarNav, {
			items: NAV,
			scrollRootId: SCROLL_ROOT_ID,
			homeId: "inicio",
			fechaCorte: corte
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			id: SCROLL_ROOT_ID,
			className: "relative h-dvh overflow-y-auto scroll-smooth bg-[#F2FAFD] text-[#123E5C] md:pl-20",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "sr-only",
					children: "Ruta de la Solidaridad: ayudas humanitarias entregadas por la Gobernación del Valle del Cauca tras el terremoto del 10 de agosto de 2026"
				}),
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
					className: "bg-[#F2FAFD] px-4 pb-14 pt-20 sm:px-6 sm:py-20 md:px-10",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BalanceFinal, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueHaceFaltaSection, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MunicipiosSection, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CategoriasSection, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
					id: "mapa-de-ayudas",
					className: "relative h-dvh bg-[#123E5C]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapaDiferido, { scrollRootId: SCROLL_ROOT_ID })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PuntosDistribucionSection, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContratacionSection, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
					className: "bg-[#0076BC] px-8 py-10 text-base leading-7 text-[#F2FAFD] sm:px-6 md:px-32",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "block font-serif text-xl text-[#fbf8c6]",
							children: "Ruta de la Solidaridad"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3",
							children: [
								"Ayudas entregadas a las comunidades afectadas por el terremoto del 10 de agosto de 2026",
								corte ? `, con información al ${corte}` : "",
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
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolverArriba, {
			scrollRootId: SCROLL_ROOT_ID,
			mapaId: "mapa-de-ayudas"
		})
	] });
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
export { toneladas as a, diaMes as i, colorDeGrupo as n, useMunicipios as o, sameMunicipality as r, useResumen as s, routes_exports as t };
