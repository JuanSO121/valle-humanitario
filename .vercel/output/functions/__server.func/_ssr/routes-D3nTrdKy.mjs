import { r as __toESM } from "../_runtime.mjs";
import { i as require_react, r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { h as ClientOnly } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as PackageCheck, c as MapPin, d as HeartHandshake, f as FileText, g as Boxes, h as Building2, i as Package, l as List, m as CalendarDays, n as Warehouse, o as Menu, p as ChevronLeft, r as Truck, s as Map$1, t as X, u as House } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D3nTrdKy.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ApiError = class extends Error {
	status;
	constructor(message, status) {
		super(message);
		this.status = status;
		this.name = "ApiError";
	}
};
var AyudasApiRepository = class {
	baseUrl;
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
	}
	async request(route, params = {}, validateShape) {
		const url = new URL(this.baseUrl);
		url.searchParams.set("route", route);
		for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
		const response = await fetch(url.toString(), { cache: "no-store" });
		if (!response.ok) throw new ApiError(`Error de red en route=${route}: HTTP ${response.status}`, response.status);
		const payload = await response.json();
		if (payload && typeof payload === "object" && "error" in payload && payload.error) {
			const p = payload;
			throw new ApiError(p.message ?? `Error desconocido en route=${route}`, p.status ?? 500);
		}
		if (validateShape) {
			const problem = validateShape(payload);
			if (problem) throw new ApiError(`Respuesta con forma inesperada en route=${route}: ${problem}. Es probable que la implementación (deployment) del Web App de Apps Script esté desactualizada respecto al código fuente, o que la caché de CacheLayer.gs tenga una respuesta vieja. Revisa "Implementar → Gestionar implementaciones" y corré limpiarCache() si hace falta.`, 502);
		}
		return payload;
	}
	getMeta() {
		return this.request("meta");
	}
	getOrigenes() {
		return this.request("origenes", {}, (p) => Array.isArray(p) ? null : "se esperaba un array de orígenes");
	}
	getMunicipios() {
		return this.request("municipios", {}, (p) => Array.isArray(p) ? null : "se esperaba un array de municipios");
	}
	getCategorias() {
		return this.request("categorias", {}, (p) => Array.isArray(p) ? null : "se esperaba un array de categorías");
	}
	getFlujos() {
		return this.request("flujos", {}, (p) => {
			if (!p || typeof p !== "object") return "se esperaba un objeto";
			const obj = p;
			if (!Array.isArray(obj["flujos"])) return "falta el campo \"flujos\" (array)";
			if (!Array.isArray(obj["excluidos"])) return "falta el campo \"excluidos\" (array)";
			const primerFlujo = obj["flujos"][0];
			if (primerFlujo && !Array.isArray(primerFlujo["porFecha"])) console.warn("route=flujos: los flujos no traen \"porFecha\" (array). Probablemente la implementación del Web App de Apps Script está desactualizada respecto a Transforms.gs, o CacheLayer.gs sirvió una respuesta vieja (TTL 6h). El mapa y los arcos funcionan igual. Las secciones por fecha y el timeline quedan sin datos hasta que se re-implemente (\"Nueva versión\") y se corra limpiarCache().");
			return null;
		});
	}
	/**
	* Serie diaria de toneladas, de la hoja TONELADAS.
	*
	* Puede no existir todavía: si la implementación del Web App no tiene
	* la ruta, Code.gs responde `{ error: true, status: 404 }` con HTTP
	* 200 y `request` lo convierte en ApiError. El tablero trata ese fallo
	* como "sin serie medida" y cae al estimado por entregas, así que no
	* hace falta protegerlo acá. Ver useToneladas y OperacionContext.
	*/
	getToneladas() {
		return this.request("toneladas", {}, (p) => {
			if (!p || typeof p !== "object") return "se esperaba un objeto";
			const obj = p;
			if (!Array.isArray(obj["serie"])) return "falta el campo \"serie\" (array)";
			if (typeof obj["total"] !== "number") return "falta el campo \"total\" (número)";
			return null;
		});
	}
	/**
	* Composición de lo entregado, grupos atendidos y canales.
	*
	* Igual que getToneladas, puede no existir todavía. El tablero cae a
	* las cifras del catálogo si falla.
	*/
	getAyuda() {
		return this.request("ayuda", {}, (p) => {
			if (!p || typeof p !== "object") return "se esperaba un objeto";
			const obj = p;
			if (!Array.isArray(obj["categorias"])) return "falta el campo \"categorias\" (array)";
			if (!Array.isArray(obj["poblaciones"])) return "falta el campo \"poblaciones\" (array)";
			if (!Array.isArray(obj["canales"])) return "falta el campo \"canales\" (array)";
			return null;
		});
	}
	getDestinos() {
		return this.request("destinos", {}, (p) => Array.isArray(p) ? null : "se esperaba un array de destinos");
	}
	/** Vista PRINCIPAL de un destino, solo ENVIOS_CATEGORIA. */
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
* Punto único de instanciación de AyudasApiRepository. La razón de que
* esto sea un archivo aparte y no `new AyudasApiRepository(...)` disperso
* donde se necesite: la URL del Web App de Apps Script cambia entre
* entornos (local, preview, producción) y es fácil de teclear mal a mano
* cada vez. Un solo punto de lectura de la env var, un solo lugar donde
* fallar fuerte si falta, y un solo lugar que reemplazar si algún día se
* inyecta un repositorio mock en tests de integración de componentes.
* -----------------------------------------------------------------------
*/
var baseUrl = {
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
if (!baseUrl) throw new Error("Falta VITE_AYUDAS_API_URL — configurá la URL /exec del Web App de Apps Script en tu archivo .env.");
var ayudasApiRepository = new AyudasApiRepository(baseUrl);
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
* es un intercambio mejor. El costo de un request de más es despreciable
* frente a mostrar cifras equivocadas.
*
* Si esto se cambia, cambiar también CONFIG.CACHE.TTL_SECONDS en
* Config.gs: el frontend nunca puede ser más fresco que el backend.
* -----------------------------------------------------------------------
*/
var CATALOG_STALE_TIME_MS$2 = 3e5;
function createCatalogQuery(key, fetcher) {
	return function useThisCatalogQuery() {
		return useQuery({
			queryKey: [key],
			queryFn: fetcher,
			staleTime: CATALOG_STALE_TIME_MS$2,
			refetchOnWindowFocus: true
		});
	};
}
var useOrigenes = createCatalogQuery("origenes", () => ayudasApiRepository.getOrigenes());
var useMunicipios = createCatalogQuery("municipios", () => ayudasApiRepository.getMunicipios());
var useFlujos = createCatalogQuery("flujos", () => ayudasApiRepository.getFlujos());
var useDestinos = createCatalogQuery("destinos", () => ayudasApiRepository.getDestinos());
/**
* useFlujosPorLente.ts
* -----------------------------------------------------------------------
* El equivalente de territoryTime pero para los ARCOS. Los polígonos y
* las líneas tienen que responder a la misma pregunta temporal: si el
* mapa dice "acumulado al 14", los arcos no pueden mostrar el total.
*
* Reemplaza a useFlujosAsOf, que solo cubría el caso acumulado. Ese hook
* queda sin uso; se puede borrar cuando nadie más lo importe.
*
* Devuelve Flujo[] con `despachosCount` recalculado y `porFecha` intacto
* — el motor de arcos solo lee despachosCount, y conservar porFecha
* permite que quien reciba estos flujos (ej. OrigenPanel) siga viendo el
* detalle por fecha si lo necesita.
* -----------------------------------------------------------------------
*/
function useFlujosPorLente(flujos, lens, isoDate) {
	return (0, import_react.useMemo)(() => {
		if (!flujos) return [];
		if (isoDate === null) return flujos;
		if (lens === "jornada") return flujos.flatMap((f) => {
			const delDia = (f.porFecha ?? []).find((p) => p.fecha === isoDate);
			if (!delDia || delDia.despachosCount <= 0) return [];
			return [{
				...f,
				despachosCount: delDia.despachosCount
			}];
		});
		return flujos.flatMap((f) => {
			const total = (f.porFecha ?? []).reduce((sum, p) => p.fecha <= isoDate ? sum + p.despachosCount : sum, 0);
			if (total <= 0) return [];
			return [{
				...f,
				despachosCount: total
			}];
		});
	}, [
		flujos,
		lens,
		isoDate
	]);
}
var INITIAL_VIEW_STATE = {
	level: "ALL",
	destinoId: null,
	origenId: null,
	timelineDate: null,
	timelineInstant: false
};
var viewTransitions = {
	/** Click en un destino — muestra sus flujos entrantes (de dónde vino lo que llegó ahí). */
	toDestino(destinoId, prev) {
		return {
			...prev,
			level: "DESTINO",
			destinoId,
			origenId: null
		};
	},
	/** Click en un origen — muestra sus flujos salientes (a dónde se distribuyó desde ahí). */
	toOrigen(origenId, prev) {
		return {
			...prev,
			level: "ORIGEN",
			origenId,
			destinoId: null
		};
	},
	/** Click en vacío / reset — sin selección, sin arcos (ver MapCanvas: flujos=[] no dibuja nada). */
	toAll(prev) {
		return {
			...prev,
			level: "ALL",
			destinoId: null,
			origenId: null
		};
	},
	/** Arrancar o reanudar la reproducción — primer frame, se trata como salto instantáneo a esa fecha. */
	startTimeline(fromDate, prev) {
		return {
			...prev,
			timelineDate: fromDate,
			timelineInstant: true
		};
	},
	/** Avance automático (play) — nunca instantáneo, MapCanvas debe animar la entrada de arcos nuevos. */
	advanceTimeline(toDate, prev) {
		return {
			...prev,
			timelineDate: toDate,
			timelineInstant: false
		};
	},
	/** Arrastrar el handle o tocar un tick — siempre instantáneo (ver conversación: nunca se anima un seek). */
	seekTimeline(toDate, prev) {
		return {
			...prev,
			timelineDate: toDate,
			timelineInstant: true
		};
	},
	/** Salir del modo timeline y volver al estado estático (todos los flujos completos, sin fecha). */
	exitTimeline(prev) {
		return {
			...prev,
			timelineDate: null,
			timelineInstant: false
		};
	},
	/** Llamar después de que MapCanvas ya consumió un frame instantáneo, para que el siguiente avance sí anime. */
	clearInstantFlag(prev) {
		return prev.timelineInstant ? {
			...prev,
			timelineInstant: false
		} : prev;
	}
};
/**
* Ventana de una jornada: lo que la ola de arcos de un día tiene para
* salir y llegar completa.
*
* Ya no hay reproducción automática (ver Timeline.tsx), así que esto no
* dispara nada por sí solo, sigue siendo el presupuesto del que se
* deriva la cascada, y es lo que tarda una jornada en resolverse
* visualmente cuando alguien toca "siguiente".
*/
var TIMELINE_STEP_MS = 2800;
/**
* Techo de una reproducción completa, como red de seguridad. Con las 13
* fechas del dataset real no hace nada. Si algún día llegan muchas más,
* comprime el paso para que la reproducción no dure diez minutos.
*/
var TIMELINE_MAX_PLAYBACK_MS = 12e4;
/** Paso real entre jornadas según cuántas fechas haya. */
function computeTimelineStepMs(dateCount) {
	if (dateCount <= 1) return TIMELINE_STEP_MS;
	const comprimido = TIMELINE_MAX_PLAYBACK_MS / (dateCount - 1);
	return Math.min(TIMELINE_STEP_MS, Math.max(450, comprimido));
}
/**
* Timeline.tsx
* -----------------------------------------------------------------------
* Control de jornadas del mapa. Componente de presentación puro: recibe
* las fechas disponibles y la actual, y avisa hacia arriba qué pasó.
*
* La reproducción NUNCA arranca sola. El mapa carga con las rutas ya
* dibujadas y solo se anima si la persona toca reproducir.
*
* El paso entre jornadas sale de animationTiming.ts, el mismo módulo del
* que sale el presupuesto de la cascada de arcos. Una jornada dura lo
* que tarda su último arco en salir y llegar, así que las líneas siempre
* alcanzan a completarse antes de que cambie el día.
*
* Seek contra advance, la distinción que ya vive en viewState.ts:
*   · Reproducir o avanzar un día llama a onAdvance, que anima.
*   · Arrastrar varios días llama a onSeek, que salta sin animar.
*     Animar un salto de seis días se lee como un error visual.
*
* El efecto del intervalo depende solo de [playing]. Eso deja la función
* del tick con las props del momento en que arrancó, así que dates y
* currentDate se leen desde refs que se actualizan en cada render. Sin
* eso, cada tick recalcula el siguiente de la misma fecha inicial y la
* reproducción avanza una vez y se traba.
* -----------------------------------------------------------------------
*/
function Timeline({ dates, currentDate, onSeek, onAdvance, onActivate, onExit }) {
	const [playing, setPlaying] = (0, import_react.useState)(false);
	const intervalRef = (0, import_react.useRef)(null);
	const datesRef = (0, import_react.useRef)(dates);
	datesRef.current = dates;
	const currentDateRef = (0, import_react.useRef)(currentDate);
	currentDateRef.current = currentDate;
	const currentIndex = currentDate ? dates.indexOf(currentDate) : -1;
	const activo = currentIndex >= 0;
	const alFinal = activo && currentIndex === dates.length - 1;
	(0, import_react.useEffect)(() => {
		if (currentDate === null) setPlaying(false);
	}, [currentDate]);
	(0, import_react.useEffect)(() => {
		if (!playing) {
			if (intervalRef.current !== null) clearInterval(intervalRef.current);
			intervalRef.current = null;
			return;
		}
		const stepMs = computeTimelineStepMs(datesRef.current.length);
		intervalRef.current = setInterval(() => {
			const freshDates = datesRef.current;
			const freshCurrent = currentDateRef.current;
			const next = freshDates[(freshCurrent ? freshDates.indexOf(freshCurrent) : -1) + 1];
			if (next === void 0) {
				setPlaying(false);
				return;
			}
			onAdvance(next);
		}, stepMs);
		return () => {
			if (intervalRef.current !== null) clearInterval(intervalRef.current);
		};
	}, [playing]);
	const alternarReproduccion = () => {
		if (!activo && dates.length > 0) {
			const primera = dates[0];
			if (primera !== void 0) onActivate(primera);
		} else if (alFinal) {
			const primera = dates[0];
			if (primera !== void 0) onSeek(primera);
		}
		setPlaying((v) => !v);
	};
	const handleScrub = (event) => {
		setPlaying(false);
		const index = Number(event.target.value);
		const date = dates[index];
		if (date === void 0) return;
		if (!activo) onActivate(date);
		else if (index === currentIndex + 1) onAdvance(date);
		else onSeek(date);
	};
	if (dates.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-surface/95 px-4 py-2.5 shadow-sm backdrop-blur",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: alternarReproduccion,
				"aria-label": playing ? "Pausar" : "Reproducir día por día",
				className: "flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-90",
				children: playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
					width: "14",
					height: "14",
					viewBox: "0 0 24 24",
					fill: "currentColor",
					"aria-hidden": true,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "5",
						y: "4",
						width: "5",
						height: "16",
						rx: "1"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "14",
						y: "4",
						width: "5",
						height: "16",
						rx: "1"
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
					width: "14",
					height: "14",
					viewBox: "0 0 24 24",
					fill: "currentColor",
					"aria-hidden": true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 4l14 8-14 8V4z" })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "range",
				min: 0,
				max: dates.length - 1,
				step: 1,
				value: currentIndex >= 0 ? currentIndex : 0,
				onChange: handleScrub,
				"aria-label": "Día",
				className: "h-1.5 w-44 shrink-0 accent-foreground md:w-72"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "min-w-[6rem] shrink-0 text-center text-sm font-semibold tabular-nums text-foreground",
				"aria-live": "polite",
				children: currentDate ?? dates[0]
			}),
			activo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					setPlaying(false);
					onExit();
				},
				className: "ml-1 shrink-0 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
				children: "Ver todo"
			})
		]
	});
}
/**
* useToneladas.ts
* -----------------------------------------------------------------------
* Serie diaria de toneladas, desde `route=toneladas`.
*
* Sigue el mismo patrón que useCatalogQueries: una queryKey de un
* elemento y el mismo staleTime.
*
* Una diferencia a propósito: `retry: false`. Mientras la ruta no esté
* publicada, el backend responde 404 y no tiene sentido reintentar tres
* veces en cada carga. El tablero cae al estimado por entregas y sigue
* funcionando. Ver OperacionContext.
*
* ANTES DE USARLO hay que agregar el método al repositorio, junto a los
* otros seis GET sin parámetros:
*
*     getToneladas(): Promise<ToneladasResponse> {
*       return this.get<ToneladasResponse>("toneladas");
*     }
*
* Y el tipo en domain/entities.ts:
*
*     export interface ToneladasPunto {
*       dia: string;
*       toneladas: number;
*       acumulado: number;
*     }
*
*     export interface ToneladasResponse {
*       serie: ToneladasPunto[];
*       total: number;
*       fuente: "TONELADAS";
*       disclaimer: string;
*     }
*/
/** Igual que en useCatalogQueries. Si cambia allá, cambia acá. */
var CATALOG_STALE_TIME_MS$1 = 3e5;
function useToneladas() {
	return useQuery({
		queryKey: ["toneladas"],
		queryFn: () => ayudasApiRepository.getToneladas(),
		staleTime: CATALOG_STALE_TIME_MS$1,
		retry: false
	});
}
/**
* Datos reales extraídos de BD_Entregas_Operativa_v2.xlsx (hojas
* RESUMEN + ENVIOS_CATEGORIA + DESPACHOS + DESPACHO_DESTINO +
* CAT_MUNICIPIOS), corte del 24 de agosto de 2026. Reemplaza al set
* anterior extraído a mano del HTML de referencia, que tenía nombres sin
* tilde/en mayúsculas (rompía el matching con el GeoJSON) y al menos una
* zona mal asignada (Dagua figuraba como "Pacífico"; el catálogo real
* dice "Sur").
*
* `despachos`/`unidades` vienen directo de RESUMEN (fórmulas vivas del
* workbook). `renglones` es la suma por destino de ENVIOS_CATEGORIA.
* `dias` sale de unir DESPACHOS.fecha con DESPACHO_DESTINO por
* despacho_id — validado 1:1 contra RESUMEN.despachos para los 41
* municipios (0 discrepancias).
*
* `toneladas` NO tiene fuente real por municipio (la hoja TONELADAS solo
* trae el total por día, no desagregado). Se estima con la razón global
* toneladas/despacho de toda la operación: 531 t acumuladas / 397
* despachos totales (todos los tipos de destino, ver fila TOTAL de
* RESUMEN) ≈ 1.34 t por despacho. Es un estimado, igual que el `* 1.75`
* que ya usaba MapCanvas.municipalityPopupHtml para el modo "jornada" —
* no un valor medido por municipio.
*
* Santiago de Cali queda excluida a propósito (igual que antes): ver
* panoramaData.ts, "Cali: Excluida del consolidado por instrucción
* expresa".
*
* IMPORTANTE — descuadre conocido con el resto de la narrativa: esta
* base (v2) es más reciente/completa que la que generó los totales
* "307 despachos" / "553 t" de movimientoData.ts y panoramaData.ts
* (StoryPage). El total real de despachos en estos 41 municipios es 321,
* no 307. Las `unidades` sí cuadran exactamente (256.650 en ambas
* fuentes). No se tocó movimientoData.ts/panoramaData.ts en este cambio
* porque afecta a toda la narrativa del Story y no era lo pedido — pero
* si se quiere que TODA la app hable del mismo número, esos dos archivos
* también necesitan regenerarse desde este Excel.
*/
var territoryMunicipalities = [
	{
		name: "Alcalá",
		codigoDane: "76020",
		zone: "Norte",
		despachos: 6,
		toneladas: 8,
		unidades: 3279,
		renglones: 82,
		dias: {
			"12": 1,
			"13": 1,
			"16": 1,
			"17": 1,
			"20": 1,
			"22": 1
		}
	},
	{
		name: "Andalucía",
		codigoDane: "76036",
		zone: "Centro",
		despachos: 5,
		toneladas: 7,
		unidades: 5691,
		renglones: 85,
		dias: {
			"12": 1,
			"14": 1,
			"18": 1,
			"19": 1,
			"21": 1
		}
	},
	{
		name: "Ansermanuevo",
		codigoDane: "76041",
		zone: "Norte",
		despachos: 9,
		toneladas: 12,
		unidades: 1561,
		renglones: 64,
		dias: {
			"12": 1,
			"13": 1,
			"17": 4,
			"19": 1,
			"22": 2
		}
	},
	{
		name: "Argelia",
		codigoDane: "76054",
		zone: "Norte",
		despachos: 12,
		toneladas: 16,
		unidades: 4379,
		renglones: 167,
		dias: {
			"12": 2,
			"13": 2,
			"15": 1,
			"17": 4,
			"19": 1,
			"20": 1,
			"21": 1
		}
	},
	{
		name: "Bolívar",
		codigoDane: "76100",
		zone: "Norte",
		despachos: 12,
		toneladas: 16,
		unidades: 6564,
		renglones: 236,
		dias: {
			"12": 1,
			"13": 3,
			"14": 2,
			"15": 2,
			"17": 2,
			"19": 1,
			"20": 1
		}
	},
	{
		name: "Buenaventura",
		codigoDane: "76109",
		zone: "Pacífico",
		despachos: 10,
		toneladas: 13,
		unidades: 11558,
		renglones: 77,
		dias: {
			"12": 1,
			"13": 1,
			"16": 1,
			"19": 1,
			"20": 1,
			"21": 1,
			"22": 3,
			"24": 1
		}
	},
	{
		name: "Bugalagrande",
		codigoDane: "76113",
		zone: "Centro",
		despachos: 7,
		toneladas: 9,
		unidades: 2464,
		renglones: 30,
		dias: {
			"12": 2,
			"17": 2,
			"19": 1,
			"20": 1,
			"21": 1
		}
	},
	{
		name: "Caicedonia",
		codigoDane: "76122",
		zone: "Centro",
		despachos: 7,
		toneladas: 9,
		unidades: 9715,
		renglones: 223,
		dias: {
			"12": 2,
			"13": 1,
			"15": 1,
			"17": 1,
			"18": 1,
			"22": 1
		}
	},
	{
		name: "Calima",
		codigoDane: "76126",
		zone: "Centro",
		despachos: 12,
		toneladas: 16,
		unidades: 5102,
		renglones: 142,
		dias: {
			"12": 1,
			"13": 1,
			"14": 1,
			"15": 2,
			"16": 1,
			"20": 1,
			"21": 3,
			"22": 2
		}
	},
	{
		name: "Candelaria",
		codigoDane: "76130",
		zone: "Sur",
		despachos: 0,
		toneladas: 0,
		unidades: 0,
		renglones: 0,
		dias: {}
	},
	{
		name: "Cartago",
		codigoDane: "76147",
		zone: "Norte",
		despachos: 12,
		toneladas: 16,
		unidades: 1400,
		renglones: 25,
		dias: {
			"17": 1,
			"18": 5,
			"19": 4,
			"20": 1,
			"22": 1
		}
	},
	{
		name: "Dagua",
		codigoDane: "76233",
		zone: "Sur",
		despachos: 21,
		toneladas: 28,
		unidades: 12123,
		renglones: 266,
		dias: {
			"12": 3,
			"13": 3,
			"14": 3,
			"15": 2,
			"16": 2,
			"17": 3,
			"18": 3,
			"21": 1,
			"22": 1
		}
	},
	{
		name: "El Cairo",
		codigoDane: "76246",
		zone: "Norte",
		despachos: 5,
		toneladas: 7,
		unidades: 3626,
		renglones: 133,
		dias: {
			"12": 2,
			"14": 1,
			"17": 2
		}
	},
	{
		name: "El Cerrito",
		codigoDane: "76248",
		zone: "Sur",
		despachos: 3,
		toneladas: 4,
		unidades: 1511,
		renglones: 63,
		dias: {
			"11": 1,
			"12": 1,
			"21": 1
		}
	},
	{
		name: "El Dovio",
		codigoDane: "76250",
		zone: "Norte",
		despachos: 4,
		toneladas: 5,
		unidades: 3579,
		renglones: 58,
		dias: {
			"12": 1,
			"17": 2,
			"24": 1
		}
	},
	{
		name: "El Águila",
		codigoDane: "76243",
		zone: "Norte",
		despachos: 11,
		toneladas: 15,
		unidades: 3676,
		renglones: 96,
		dias: {
			"11": 1,
			"12": 1,
			"13": 1,
			"15": 1,
			"16": 4,
			"22": 3
		}
	},
	{
		name: "Florida",
		codigoDane: "76275",
		zone: "Sur",
		despachos: 0,
		toneladas: 0,
		unidades: 0,
		renglones: 0,
		dias: {}
	},
	{
		name: "Ginebra",
		codigoDane: "76306",
		zone: "Sur",
		despachos: 1,
		toneladas: 1,
		unidades: 562,
		renglones: 26,
		dias: { "12": 1 }
	},
	{
		name: "Guacarí",
		codigoDane: "76318",
		zone: "Centro",
		despachos: 3,
		toneladas: 4,
		unidades: 2933,
		renglones: 81,
		dias: {
			"13": 1,
			"15": 1,
			"21": 1
		}
	},
	{
		name: "Guadalajara de Buga",
		codigoDane: "76111",
		zone: "Centro",
		despachos: 5,
		toneladas: 7,
		unidades: 3638,
		renglones: 92,
		dias: {
			"13": 1,
			"15": 1,
			"17": 2,
			"21": 1
		}
	},
	{
		name: "Jamundí",
		codigoDane: "76364",
		zone: "Sur",
		despachos: 5,
		toneladas: 7,
		unidades: 1913,
		renglones: 55,
		dias: {
			"12": 3,
			"18": 1,
			"22": 1
		}
	},
	{
		name: "La Cumbre",
		codigoDane: "76377",
		zone: "Sur",
		despachos: 11,
		toneladas: 15,
		unidades: 6020,
		renglones: 178,
		dias: {
			"12": 3,
			"13": 2,
			"15": 2,
			"17": 3,
			"19": 1
		}
	},
	{
		name: "La Unión",
		codigoDane: "76400",
		zone: "Norte",
		despachos: 10,
		toneladas: 13,
		unidades: 6758,
		renglones: 99,
		dias: {
			"11": 1,
			"12": 2,
			"15": 1,
			"17": 4,
			"20": 1,
			"21": 1
		}
	},
	{
		name: "La Victoria",
		codigoDane: "76403",
		zone: "Norte",
		despachos: 7,
		toneladas: 9,
		unidades: 2487,
		renglones: 72,
		dias: {
			"12": 1,
			"14": 1,
			"17": 3,
			"18": 1,
			"19": 1
		}
	},
	{
		name: "Obando",
		codigoDane: "76497",
		zone: "Norte",
		despachos: 6,
		toneladas: 8,
		unidades: 2544,
		renglones: 134,
		dias: {
			"12": 1,
			"13": 1,
			"15": 2,
			"17": 1,
			"18": 1
		}
	},
	{
		name: "Palmira",
		codigoDane: "76520",
		zone: "Sur",
		despachos: 7,
		toneladas: 9,
		unidades: 3596,
		renglones: 84,
		dias: {
			"12": 1,
			"13": 1,
			"14": 1,
			"16": 1,
			"17": 2,
			"21": 1
		}
	},
	{
		name: "Pradera",
		codigoDane: "76563",
		zone: "Sur",
		despachos: 2,
		toneladas: 3,
		unidades: 4013,
		renglones: 61,
		dias: {
			"18": 1,
			"19": 1
		}
	},
	{
		name: "Restrepo",
		codigoDane: "76606",
		zone: "Centro",
		despachos: 12,
		toneladas: 16,
		unidades: 5885,
		renglones: 223,
		dias: {
			"12": 1,
			"13": 3,
			"14": 3,
			"17": 2,
			"18": 2,
			"19": 1
		}
	},
	{
		name: "Riofrío",
		codigoDane: "76616",
		zone: "Centro",
		despachos: 11,
		toneladas: 15,
		unidades: 7241,
		renglones: 178,
		dias: {
			"12": 3,
			"13": 2,
			"14": 2,
			"15": 1,
			"16": 1,
			"18": 1,
			"20": 1
		}
	},
	{
		name: "Roldanillo",
		codigoDane: "76622",
		zone: "Norte",
		despachos: 12,
		toneladas: 16,
		unidades: 3984,
		renglones: 53,
		dias: {
			"12": 3,
			"17": 3,
			"18": 2,
			"19": 2,
			"21": 1,
			"22": 1
		}
	},
	{
		name: "San Pedro",
		codigoDane: "76670",
		zone: "Centro",
		despachos: 3,
		toneladas: 4,
		unidades: 3732,
		renglones: 98,
		dias: {
			"12": 1,
			"13": 1,
			"14": 1
		}
	},
	{
		name: "Sevilla",
		codigoDane: "76736",
		zone: "Centro",
		despachos: 20,
		toneladas: 27,
		unidades: 24982,
		renglones: 817,
		dias: {
			"12": 3,
			"13": 3,
			"14": 1,
			"15": 2,
			"16": 3,
			"17": 2,
			"18": 3,
			"19": 1,
			"20": 1,
			"22": 1
		}
	},
	{
		name: "Toro",
		codigoDane: "76823",
		zone: "Norte",
		despachos: 5,
		toneladas: 7,
		unidades: 4218,
		renglones: 73,
		dias: {
			"11": 1,
			"13": 1,
			"14": 1,
			"17": 2
		}
	},
	{
		name: "Trujillo",
		codigoDane: "76828",
		zone: "Centro",
		despachos: 12,
		toneladas: 16,
		unidades: 6539,
		renglones: 209,
		dias: {
			"13": 1,
			"14": 2,
			"15": 1,
			"17": 3,
			"18": 4,
			"21": 1
		}
	},
	{
		name: "Tuluá",
		codigoDane: "76834",
		zone: "Centro",
		despachos: 4,
		toneladas: 5,
		unidades: 1172,
		renglones: 28,
		dias: {
			"17": 1,
			"18": 2,
			"21": 1
		}
	},
	{
		name: "Ulloa",
		codigoDane: "76845",
		zone: "Norte",
		despachos: 5,
		toneladas: 7,
		unidades: 2267,
		renglones: 58,
		dias: {
			"12": 1,
			"13": 1,
			"16": 1,
			"20": 1,
			"22": 1
		}
	},
	{
		name: "Versalles",
		codigoDane: "76863",
		zone: "Norte",
		despachos: 10,
		toneladas: 13,
		unidades: 3152,
		renglones: 101,
		dias: {
			"11": 1,
			"12": 1,
			"13": 2,
			"14": 1,
			"16": 1,
			"17": 3,
			"18": 1
		}
	},
	{
		name: "Vijes",
		codigoDane: "76869",
		zone: "Sur",
		despachos: 6,
		toneladas: 8,
		unidades: 1612,
		renglones: 75,
		dias: {
			"12": 1,
			"13": 1,
			"15": 1,
			"17": 1,
			"20": 2
		}
	},
	{
		name: "Yotoco",
		codigoDane: "76890",
		zone: "Centro",
		despachos: 16,
		toneladas: 21,
		unidades: 10140,
		renglones: 237,
		dias: {
			"12": 4,
			"13": 4,
			"15": 1,
			"17": 1,
			"18": 2,
			"19": 1,
			"21": 1,
			"22": 1
		}
	},
	{
		name: "Yumbo",
		codigoDane: "76892",
		zone: "Sur",
		despachos: 5,
		toneladas: 7,
		unidades: 2423,
		renglones: 110,
		dias: {
			"12": 1,
			"15": 1,
			"18": 2,
			"21": 1
		}
	},
	{
		name: "Zarzal",
		codigoDane: "76895",
		zone: "Norte",
		despachos: 7,
		toneladas: 9,
		unidades: 5739,
		renglones: 39,
		dias: {
			"12": 1,
			"15": 1,
			"17": 3,
			"19": 1,
			"20": 1
		}
	}
];
/**
* Normaliza un nombre de municipio para comparar TEXTO contra texto
* (ej. el nombre de un destino seleccionado vs. este catálogo) cuando no
* hay código DANE a mano en el otro lado. Nunca usar esto para unir
* contra el GeoJSON de límites — ahí usar codigoDane vía
* getTerritoryStatByCode, que no depende de mayúsculas/tildes en
* absoluto. `normId` (@/lib/id) NO sirve para esto: solo recorta ceros a
* la izquierda de IDs numéricos, no hace case-fold ni saca tildes.
*/
function normMunicipalityName$1(name) {
	return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
}
var NAME_ALIASES$1 = /* @__PURE__ */ new Map([
	[normMunicipalityName$1("Guadalajara de Buga"), "Buga"],
	[normMunicipalityName$1("Buga"), "Guadalajara de Buga"],
	[normMunicipalityName$1("Cali"), "Santiago de Cali"]
]);
new Map(territoryMunicipalities.map((m) => [m.codigoDane, m]));
var territoryByName = new Map(territoryMunicipalities.map((m) => [normMunicipalityName$1(m.name), m]));
/** Fallback por nombre, para cuando no hay código DANE disponible del otro lado (ej. DestinoResumenLista). */
function getTerritoryStat(name) {
	const key = normMunicipalityName$1(name);
	return territoryByName.get(key) ?? territoryByName.get(normMunicipalityName$1(NAME_ALIASES$1.get(key) ?? ""));
}
[...new Set(territoryMunicipalities.flatMap((m) => Object.keys(m.dias)))].sort((a, b) => Number(a) - Number(b));
/** "2026-08-14" → "14". Devuelve null si no hay fecha. */
function dayFromIsoDate(iso) {
	if (!iso) return null;
	const dd = iso.slice(-2);
	return /^\d{2}$/.test(dd) ? dd : null;
}
function valorTemporal(stat, lens, day) {
	if (!stat) return 0;
	if (day === null) return stat.entregas;
	if (lens === "jornada") return stat.dias[day] ?? 0;
	const limite = Number(day);
	return Object.entries(stat.dias).reduce((sum, [d, v]) => Number(d) <= limite ? sum + v : sum, 0);
}
/** Etiqueta del estado temporal, para el HUD y los popups. */
function describeLens(lens, day) {
	if (day === null) return "Total del departamento";
	return lens === "jornada" ? `Solo el ${day} de agosto` : `Hasta el ${day} de agosto`;
}
/**
* Toneladas por despacho.
*
* La hoja TONELADAS del workbook trae el dato medido por día, pero es
* DEPARTAMENTAL y no es proporcional a los despachos: la razón va de 0,68
* t/despacho el día 19 a 11,5 el día 24, porque la tonelada se siguió
* reportando cuando los formatos de esos días todavía no estaban
* transcritos. Cruzar las dos series deja el marcador diciendo cosas que
* el mapa no muestra.
*
* Por eso acá la tonelada se ESTIMA sobre los despachos visibles: 531 t
* medidas / 384 despachos con fecha = 1,38 t por despacho. Es un
* estimado declarado, no una medición, y tiene la ventaja de moverse
* siempre junto con el mapa.
*
* Consecuencia a tener presente: aplicado a los 321 despachos
* municipales da ~444 t, no las 531 t del total departamental. La
* diferencia es Cali, el acopio de Cartago y las otras ayudas
* solidarias, que no se dibujan en el mapa.
*/
var TONELADAS_POR_DESPACHO = 1.38;
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
	factorMunicipal: 1,
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
function normalizar(nombre) {
	return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
/** "2026-08-25" a "25 de agosto de 2026". */
function fechaLarga(iso) {
	if (!iso) return "";
	const [anio, mes, dia] = iso.split("-");
	const nombreMes = MESES[Number(mes) - 1];
	if (!anio || !dia || !nombreMes) return iso;
	return `${Number(dia)} de ${nombreMes} de ${anio}`;
}
function diaDe(iso) {
	return iso.slice(-2);
}
/** Solo los pares que llegan a un municipio del Valle. Cali va aparte. */
function esMunicipal(f) {
	if (f.destino.tipo !== "municipio") return false;
	return !sameMunicipality(f.destino.nombre, CALI);
}
function derivarOperacion(flujos, serieToneladas, municipiosApi) {
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
	const zonaPorNombre = new Map(catalogoFinal.map((m) => [normalizar(m.nombre), m.zona]));
	const codigoPorNombre = new Map(catalogoFinal.map((m) => [normalizar(m.nombre), m.codigoDane]));
	if (!flujos || flujos.length === 0) return OPERACION_VACIA;
	const municipales = flujos.filter(esMunicipal);
	const porDestino = /* @__PURE__ */ new Map();
	for (const f of municipales) {
		const clave = normalizar(f.destino.nombre);
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
	const municipios = [...porDestino.values()].map((m) => ({
		...m,
		toneladas: Math.round(m.entregas * TONELADAS_POR_DESPACHO)
	})).sort((a, b) => b.entregas - a.entregas || a.nombre.localeCompare(b.nombre, "es"));
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
	let acumuladoEntregas = 0;
	let acumuladoToneladas = 0;
	const nombrePorId = new Map(municipios.map((m) => [m.destinoId, m.nombre]));
	const jornadas = fechas.map((fecha) => {
		const acc = porFecha.get(fecha);
		const nuevos = [...acc.destinos].filter((id) => !vistos.has(id));
		nuevos.forEach((id) => vistos.add(id));
		acumuladoEntregas += acc.entregas;
		const punto = medidas.get(diaDe(fecha));
		const toneladas = punto ? punto.toneladas : Math.round(acc.entregas * TONELADAS_POR_DESPACHO);
		acumuladoToneladas += toneladas;
		return {
			fecha,
			dia: diaDe(fecha),
			entregas: acc.entregas,
			municipios: acc.destinos.size,
			nuevos: nuevos.length,
			nombresNuevos: nuevos.map((id) => nombrePorId.get(id) ?? id).sort((a, b) => a.localeCompare(b, "es")),
			acumuladoEntregas,
			toneladas,
			acumuladoToneladas
		};
	});
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
	const entregasTodas = flujos.reduce((sum, f) => sum + f.despachosCount, 0);
	const factorMunicipal = entregasTodas > 0 ? totalEntregas / entregasTodas : 1;
	const toneladasMunicipales = Math.round(acumuladoToneladas * factorMunicipal);
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
		totalToneladas: acumuladoToneladas,
		toneladasMunicipales,
		entregasTodas,
		factorMunicipal,
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
* OperacionContext.tsx
* -----------------------------------------------------------------------
* Una sola lectura de `route=flujos` alimenta todo el tablero. El
* contexto evita que cada sección repita el hook y que el árbol se llene
* de props que solo pasan de largo.
*
* Las secciones que consumen esto dejan de depender de movimientoData.ts
* y por lo tanto se actualizan solas cuando cambia el Excel.
*/
/**
* `null` en vez de un valor por defecto a propósito. Con un valor por
* defecto, un componente usado fuera del proveedor mostraba ceros en
* silencio y parecía un problema de datos. Ahora avisa en desarrollo.
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
	const { data, isLoading, isError } = useFlujos();
	const { data: toneladas } = useToneladas();
	const { data: municipios } = useMunicipios();
	const value = (0, import_react.useMemo)(() => ({
		operacion: derivarOperacion(data?.flujos, toneladas?.serie, municipios),
		cargando: isLoading,
		error: isError
	}), [
		data,
		toneladas,
		municipios,
		isLoading,
		isError
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperacionContext.Provider, {
		value,
		children
	});
}
function useOperacion() {
	return usarContexto().operacion;
}
/**
* MarcadorHUD.tsx
* -----------------------------------------------------------------------
* El contador del mapa, en clave de tablero de estadio: la cifra que
* importa es cuánta ayuda se movilizó, y tiene que VERSE subir mientras
* corre el timeline. Por eso los dígitos ruedan en vez de reemplazarse
* de golpe, el movimiento es el dato.
*
* La unidad es la TONELADA. Las unidades sueltas (mercados, paquetes,
* kilos y pacas mezclados en la misma columna del formato) no se
* muestran acá: no son comparables entre sí y no dicen nada a esta
* escala.
*
* Advertencia sobre las dos cifras, que no son divisibles entre sí:
* Las dos cifras son municipales, para que se puedan leer juntas. La
* hoja TONELADAS registra el peso por día y para todo el departamento,
* así que la parte municipal se estima repartiéndolo según qué
* proporción de las entregas llegó a un municipio.
* -----------------------------------------------------------------------
*/
function MarcadorHUD({ despachos, day, lens, instant = false }) {
	/**
	* Las toneladas se leen acá, del mismo contexto que alimenta al resto
	* de la página, en vez de recibirse por prop.
	*
	* Antes las calculaba DashboardPage y se las pasaba. Eso permitía que
	* el marcador y la página mostraran cifras distintas si una de las dos
	* quedaba con una versión vieja del cálculo, que fue exactamente lo que
	* pasó: el mapa seguía estimando cuando la ruta de toneladas ya
	* respondía el dato medido.
	*/
	const { jornadas, toneladasMunicipales, factorMunicipal } = useOperacion();
	/**
	* El mapa dibuja entregas municipales, así que muestra la tonelada
	* municipal. La serie de jornadas trae el peso departamental, que
	* incluye Cali y las rutas institucionales, y se reparte con el mismo
	* factor que usa el resto del tablero.
	*/
	const toneladas = (() => {
		if (!day) return toneladasMunicipales;
		const jornada = jornadas.find((j) => j.dia === day);
		if (!jornada) return toneladasMunicipales;
		const departamental = lens === "jornada" ? jornada.toneladas : jornada.acumuladoToneladas;
		return Math.round(departamental * factorMunicipal);
	})();
	const corte = day === null ? "Total del departamento" : lens === "jornada" ? `Solo el ${day} de agosto` : `Hasta el ${day} de agosto`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-10 select-none md:inset-x-auto md:right-4 md:top-[calc(1rem+env(safe-area-inset-top))]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-4 rounded-xl border border-white/12 bg-[#0B3049]/85 px-4 py-3 shadow-lg backdrop-blur md:block md:px-6 md:py-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1 md:flex-none",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-bold uppercase tracking-[0.14em] text-[#22ABE2] md:text-[13px]",
						children: "Ayuda entregada"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 flex items-baseline gap-1.5 md:mt-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rodillo, {
							value: toneladas,
							instant,
							className: "text-[34px] sm:text-[42px] md:text-[52px]"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-lg font-bold text-[#22ABE2] md:text-2xl",
							children: "toneladas"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-xs text-[#6B93AA] md:mt-3 md:text-sm",
						"aria-live": "polite",
						children: corte
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 items-baseline gap-2 border-l border-white/12 pl-4 md:mt-3 md:border-l-0 md:border-t md:pl-0 md:pt-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rodillo, {
					value: despachos,
					instant,
					className: "text-lg md:text-[24px]"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-semibold text-[#A8CFE2] md:text-sm",
					children: "entregas"
				})]
			})]
		})
	});
}
/**
* Un número cuyos dígitos ruedan. Cada dígito es una columna con el 0-9
* apilado y desplazada con translateY, que es lo que hace un tablero
* mecánico. Los separadores de miles se renderizan como texto fijo: no
* ruedan, solo aparecen cuando el número cruza el millar.
*
* `instant` corta la transición en los saltos del timeline: rodar cuatro
* dígitos a la vez cuando alguien arrastra el control es ruido, no
* información.
*/
function Rodillo({ value, instant, className = "" }) {
	const texto = Math.max(0, Math.round(value)).toLocaleString("es-CO");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `inline-flex font-extrabold leading-none tabular-nums text-white ${className}`,
		role: "img",
		"aria-label": texto,
		children: texto.split("").map((char, i) => /\d/.test(char) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Digito, {
			digito: Number(char),
			instant
		}, i) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			"aria-hidden": true,
			className: "px-[0.02em]",
			children: char
		}, i))
	});
}
var DIGITOS = [
	0,
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9
];
function Digito({ digito, instant }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		"aria-hidden": true,
		className: "relative inline-block h-[1em] w-[0.58em] overflow-hidden align-baseline",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: instant ? "absolute inset-x-0 top-0" : "absolute inset-x-0 top-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
			style: { transform: `translateY(${-digito * 10}%)` },
			children: DIGITOS.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block h-[1em] text-center leading-[1em]",
				children: n
			}, n))
		})
	});
}
var VISIBLE_MS = 3200;
/**
* Aviso breve de entrega, al estilo de una historia: aparece, se lee en
* dos segundos y se va. Nunca se acumula en pantalla.
*/
function AvisoEntrega({ frame }) {
	const [visible, setVisible] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!frame) {
			setVisible(null);
			return;
		}
		setVisible(frame);
		const t = setTimeout(() => setVisible(null), VISIBLE_MS);
		return () => clearTimeout(t);
	}, [frame]);
	if (!visible) return null;
	const municipio = leerNombre(visible);
	const entregas = leerCantidad(visible);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center px-4",
		"aria-live": "polite",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3 rounded-full border border-white/15 bg-[#0A1822]/90 py-3 pl-4 pr-5 shadow-lg backdrop-blur",
			style: { animation: "toast-pop 260ms cubic-bezier(0.16,1,0.3,1) both" },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-9 shrink-0 items-center justify-center rounded-full bg-[#81C8EC]/20 text-[#81C8EC]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageCheck, {
					className: "size-5",
					"aria-hidden": true
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
				className: "block text-base leading-tight text-white",
				children: municipio
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block text-sm text-[#9DB4C2]",
				children: entregas === 1 ? "Recibió una entrega" : `Recibió ${entregas} entregas`
			})] })]
		}, `${municipio}-${entregas}`)
	});
}
/**
* `ActivityFrame` lo produce dispatchActivityEngine.spawn(destinoId,
* nombre, cantidad, now). Los nombres exactos de sus campos no están a la
* vista desde acá, así que se leen de forma tolerante en vez de asumir
* una forma que rompería en silencio si cambia.
*/
function leerNombre(frame) {
	const f = frame;
	const encontrado = [
		f["nombre"],
		f["destinoNombre"],
		f["label"]
	].find((v) => typeof v === "string" && v.trim() !== "");
	return typeof encontrado === "string" ? encontrado : "Nueva entrega";
}
function leerCantidad(frame) {
	const f = frame;
	const encontrado = [
		f["cantidad"],
		f["weight"],
		f["despachos"],
		f["delta"]
	].find((v) => typeof v === "number" && v > 0);
	return typeof encontrado === "number" ? encontrado : 1;
}
/**
* FlujosLegend.tsx
* -----------------------------------------------------------------------
* Leyenda fija de colores por origen. Deliberadamente NO se calcula a
* partir de `origenes` (route=origenes) en tiempo real: solo hay dos
* orígenes animables (Cali/Cartago, ver MapCanvas.ORIGEN_COLOR) y son
* estables — derivar la leyenda del catálogo agregaría una dependencia de
* red a un componente que es puro texto+color, y arriesgaría desincronía
* de color si algún día MapCanvas cambia su paleta sin tocar este
* archivo. Los colores están duplicados a propósito en las dos
* constantes de abajo; si se tocan, se tocan juntas (mismo criterio que
* ya se usó para ORIGEN_COLOR en MapCanvas.tsx).
*
* `compact`: variante mobile. NO es un MobileMenu-style drawer como el
* del proyecto viejo — ese consolidaba 3 paneles de FILTRADO (buscar,
* criticidad, mapa de calor) detrás de un botón, porque eran controles de
* configuración que no hacía falta ver todo el tiempo. Acá el contenido
* es 2 líneas de texto puramente informativas y no hay nada que
* "configurar" — un drawer de pantalla completa sería sobre-ingeniería
* para el tamaño real del contenido (ver frontend-design: "match
* complexity to content"). Se resuelve con un botón redondo + popover,
* del tamaño que el contenido realmente necesita.
* -----------------------------------------------------------------------
*/
var ORIGENES_LEGEND = [{
	id: "ORI-CALI",
	nombre: "Centro de Acopio Antigua Licorera del Valle",
	color: "#2f6fed"
}, {
	id: "ORI-CARTAGO",
	nombre: "Centro de distribución Cartago",
	color: "#e6883c"
}];
function LegendContent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "label-caps text-[10px] text-muted-foreground",
			children: "Origen del envío"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-2 flex flex-col gap-1.5",
			children: ORIGENES_LEGEND.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "h-0.5 w-5 shrink-0 rounded-full",
					style: { backgroundColor: o.color },
					"aria-hidden": true
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-foreground",
					children: o.nombre
				})]
			}, o.id))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 max-w-[13rem] text-[10px] leading-snug text-muted-foreground",
			children: "El grosor de cada arco refleja el número de despachos, no las unidades entregadas."
		})
	] });
}
function FlujosLegend({ compact = false }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	if (!compact) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col gap-2 rounded-lg border border-border bg-surface/90 px-3.5 py-3 text-xs shadow-sm backdrop-blur",
		"aria-label": "Leyenda de orígenes de ayuda",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendContent, {})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-auto absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-10",
		children: [open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "absolute bottom-11 left-0 w-52 rounded-lg border border-border bg-surface/95 px-3.5 py-3 text-xs shadow-lg backdrop-blur",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendContent, {})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => setOpen((v) => !v),
			"aria-expanded": open,
			"aria-label": open ? "Cerrar leyenda" : "Ver leyenda de orígenes",
			className: "flex size-9 items-center justify-center rounded-full border border-border bg-surface/95 text-muted-foreground shadow-sm backdrop-blur",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				width: "15",
				height: "15",
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "12",
						r: "9",
						stroke: "currentColor",
						strokeWidth: "2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M12 11v5",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "8",
						r: "1",
						fill: "currentColor"
					})
				]
			})
		})]
	});
}
function ContextualPanel({ isMobile, title, subtitle, onBack, onClose, children, transitionKey }) {
	return isMobile ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobileSheet, {
		title,
		subtitle,
		onBack,
		onClose,
		transitionKey,
		children
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DesktopCard, {
		title,
		subtitle,
		onBack,
		onClose,
		transitionKey,
		children
	});
}
function useEnterTransition(transitionKey) {
	const [entered, setEntered] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setEntered(false);
		const id = requestAnimationFrame(() => setEntered(true));
		return () => cancelAnimationFrame(id);
	}, [transitionKey]);
	return entered;
}
function useCloseOnOutsideClick(onClose) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const handler = (e) => {
			const target = e.target;
			if (ref.current?.contains(target)) return;
			if (target?.closest?.("[data-map-root]")) return;
			onClose();
		};
		document.addEventListener("mousedown", handler);
		document.addEventListener("touchstart", handler);
		return () => {
			document.removeEventListener("mousedown", handler);
			document.removeEventListener("touchstart", handler);
		};
	}, [onClose]);
	return ref;
}
function PanelHeader({ title, subtitle, onBack, onClose }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-start gap-2 border-b border-border p-3.5",
		children: [
			onBack && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onBack,
				"aria-label": "Volver",
				className: "tap-target mt-0.5 rounded-md p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
					width: "16",
					height: "16",
					viewBox: "0 0 24 24",
					fill: "none",
					"aria-hidden": true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M15 18l-6-6 6-6",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "truncate text-sm font-semibold text-foreground",
					children: title
				}), subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate text-xs text-muted-foreground",
					children: subtitle
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onClose,
				"aria-label": "Volver a Valle del Cauca",
				className: "tap-target rounded-md p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
					width: "16",
					height: "16",
					viewBox: "0 0 24 24",
					fill: "none",
					"aria-hidden": true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M6 6l12 12M18 6L6 18",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round"
					})
				})
			})
		]
	});
}
function DesktopCard({ title, subtitle, onBack, onClose, children, transitionKey }) {
	const entered = useEnterTransition(transitionKey);
	const ref = useCloseOnOutsideClick(onClose);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: "pointer-events-auto absolute right-4 top-[4.75rem] z-10 flex w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl transition-all duration-300",
		style: {
			maxHeight: "calc(100% - 6rem)",
			opacity: entered ? 1 : 0,
			transform: entered ? "translateX(0) scale(1)" : "translateX(12px) scale(0.97)",
			transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)"
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelHeader, {
			title,
			subtitle,
			onBack,
			onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-h-0 flex-1 overflow-y-auto",
			children
		})]
	});
}
function MobileSheet({ title, subtitle, onBack, onClose, children, transitionKey }) {
	const [expanded, setExpanded] = (0, import_react.useState)(true);
	const entered = useEnterTransition(transitionKey);
	const ref = useCloseOnOutsideClick(onClose);
	(0, import_react.useEffect)(() => setExpanded(true), [transitionKey]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute inset-0 z-[9] bg-black/40",
		style: { animation: "scrim-in 200ms ease-out" },
		"aria-hidden": true
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: "pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.35)] transition-all duration-300",
		style: {
			height: expanded ? "70vh" : "auto",
			transform: entered ? "translateY(0)" : "translateY(16px)",
			opacity: entered ? 1 : 0,
			transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)"
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setExpanded((v) => !v),
				"aria-label": expanded ? "Contraer panel" : "Expandir panel",
				className: "tap-target flex w-full justify-center py-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-1 w-9 rounded-full bg-border" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelHeader, {
				title,
				subtitle,
				onBack,
				onClose
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `min-h-0 flex-1 ${expanded ? "overflow-y-auto" : "hidden"}`,
				children
			})
		]
	})] });
}
/**
* useDestinoLogistica.ts
* -----------------------------------------------------------------------
* Vista SECUNDARIA de un destino (route=destino-logistica&id=), solo
* DESPACHOS. A diferencia de useDestinoResumen, acepta un segundo
* parámetro `expanded`: el panel de destino abre primero mostrando solo
* categorías (useDestinoResumen), y este request recién se dispara si la
* persona expande explícitamente el bloque de logística — igual que ya
* decidimos en la sección de arquitectura ("SOLO se dispara al expandir
* el nivel secundario, lazy, no junto con el resumen"). Evita un request
* innecesario contra la cuota de ejecuciones de Apps Script para quien
* nunca abre ese detalle.
* -----------------------------------------------------------------------
*/
function useDestinoLogistica(destinoId, expanded) {
	return useQuery({
		queryKey: ["destino-logistica", destinoId],
		queryFn: () => ayudasApiRepository.getDestinoLogistica(destinoId),
		enabled: destinoId !== null && expanded
	});
}
/**
* LogisticaDrawer.tsx
* -----------------------------------------------------------------------
* Nivel SECUNDARIO del panel de destino: despachos individuales
* (useDestinoLogistica, fuente DESPACHOS). Colapsado por defecto — el
* fetch solo se dispara cuando `expanded` pasa a true (ver el `enabled`
* dentro de useDestinoLogistica.ts). Nunca muestra ni suma un total de
* unidades propio: el backend ya advierte que las unidades por despacho
* son un subconjunto parcial (96 de 387) y sumarlas aquí invitaría a
* compararlas visualmente contra el total de categorías del panel
* principal, que es exactamente lo que el modelo de datos prohíbe.
* -----------------------------------------------------------------------
*/
function LogisticaDrawer({ destinoId, expanded, onToggle }) {
	const { data, isLoading, isError } = useDestinoLogistica(destinoId, expanded);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "border-b border-border",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: onToggle,
			"aria-expanded": expanded,
			className: "flex w-full items-center justify-between p-4 text-left",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "label-caps text-[10px]",
				children: "Información logística"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
				width: "14",
				height: "14",
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": true,
				className: `shrink-0 text-muted-foreground transition-transform duration-150 ${expanded ? "rotate-180" : ""}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M6 9l6 6 6-6",
					stroke: "currentColor",
					strokeWidth: "2",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			})]
		}), expanded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "px-4 pb-4",
			children: [
				isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-col gap-2",
					children: [
						0,
						1,
						2
					].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 w-full animate-pulse rounded bg-surface-raised" }, i))
				}),
				isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: "No se pudo cargar el detalle logístico."
				}),
				data && data.despachos.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: "Sin despachos individuales registrados."
				}),
				data && data.despachos.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-col gap-2.5",
					children: data.despachos.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-md border border-border bg-surface-raised/60 p-2.5 text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-[11px] text-muted-foreground",
									children: d.fecha ?? "sin fecha"
								}), d.unidades !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tabular-nums text-muted-foreground",
									children: [d.unidades.toLocaleString("es-CO"), " u."]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-0.5 text-foreground",
								children: d.categoriaPrincipal ?? "Sin categoría"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-0.5 text-[11px] text-muted-foreground",
								children: [d.canal ?? "Canal desconocido", d.familias !== null ? ` · ${d.familias} familias` : ""]
							}),
							d.documento && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: d.documento.driveUrl,
								target: "_blank",
								rel: "noreferrer",
								className: "mt-1 inline-block text-[11px] font-medium text-primary hover:underline",
								children: "Ver documento"
							})
						]
					}, d.id))
				}),
				data && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-[10px] leading-snug text-muted-foreground",
					children: data.disclaimer
				})
			]
		})]
	});
}
/**
* useDestinoResumen.ts
* -----------------------------------------------------------------------
* Vista PRINCIPAL de un destino (route=destino&id=), solo ENVIOS_CATEGORIA.
* Separado de useDestinoLogistica.ts a propósito: son dos requests
* independientes porque son dos fuentes que el backend nunca mezcla (ver
* disclaimer de cada respuesta) — tenerlos en el mismo hook facilitaría
* combinarlos sin darse cuenta en un total que no corresponde sumar.
* -----------------------------------------------------------------------
*/
function useDestinoResumen(destinoId) {
	return useQuery({
		queryKey: ["destino", destinoId],
		queryFn: () => ayudasApiRepository.getDestino(destinoId),
		enabled: destinoId !== null
	});
}
/**
* DestinoPanel.tsx
* -----------------------------------------------------------------------
* Nivel PRINCIPAL del panel de destino: categorías entregadas
* (useDestinoResumen, fuente ENVIOS_CATEGORIA). La logística
* (useDestinoLogistica, fuente DESPACHOS) vive en LogisticaDrawer.tsx y
* SOLO se monta/dispara cuando la persona expande ese bloque — el
* `enabled: expanded` ya vive en el hook, este componente solo controla
* el booleano de UI.
*
* Reutiliza ContextualPanel del proyecto de criticidad sísmica tal cual:
* es un chrome de panel completamente genérico (header con back/close,
* scroll, transición de entrada, cierre en click-fuera respetando el
* mapa) sin ningún concepto de sismos/sedes en su implementación —
* reescribirlo hubiera sido duplicar código idéntico sin ninguna ganancia.
* -----------------------------------------------------------------------
*/
function DestinoPanel({ destinoId, isMobile, onClose }) {
	const { data, isLoading, isError } = useDestinoResumen(destinoId);
	const [logisticaExpanded, setLogisticaExpanded] = (0, import_react.useState)(false);
	const transitionKey = `destino-${destinoId}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ContextualPanel, {
		isMobile,
		title: data?.destino.nombre ?? "Cargando destino…",
		subtitle: data ? tipoLabel(data.destino.tipo) : void 0,
		onClose,
		transitionKey,
		children: [
			isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelSkeleton, {}),
			isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-4 text-sm text-muted-foreground",
				children: "No se pudo cargar la información de este destino."
			}),
			data && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "border-b border-border p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "label-caps text-[10px]",
								children: "Total recibido"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-display text-2xl font-semibold tabular-nums",
								children: [data.resumen.totalUnidades.toLocaleString("es-CO"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-1 text-sm font-normal text-muted-foreground",
									children: "unidades"
								})]
							}),
							data.resumen.fechaCorte && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-[11px] text-muted-foreground",
								children: ["Corte al ", data.resumen.fechaCorte]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "border-b border-border p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "label-caps text-[10px]",
								children: "Categorías entregadas"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-2.5 flex flex-col gap-2.5",
								children: data.categorias.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-baseline justify-between text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-foreground",
										children: c.nombre
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tabular-nums text-muted-foreground",
										children: [
											c.unidades.toLocaleString("es-CO"),
											" · ",
											Math.round(c.porcentaje * 100),
											"%"
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 h-1.5 rounded-full bg-surface-raised",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "h-1.5 rounded-full bg-primary",
										style: { width: `${Math.max(2, c.porcentaje * 100)}%` }
									})
								})] }, c.id))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-[10px] leading-snug text-muted-foreground",
								children: data.disclaimer
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogisticaDrawer, {
						destinoId,
						expanded: logisticaExpanded,
						onToggle: () => setLogisticaExpanded((v) => !v)
					})
				]
			})
		]
	});
}
function tipoLabel(tipo) {
	return {
		municipio: "Municipio",
		centro_acopio: "Centro de acopio",
		centro_proteccion: "Centro de protección",
		entidad: "Entidad",
		especial: "Destino especial",
		departamento_externo: "Ayuda interdepartamental",
		agregado_multiple: "Destino agregado"
	}[tipo] ?? tipo;
}
function PanelSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-col gap-3 p-4",
		children: [
			0,
			1,
			2,
			3
		].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-full animate-pulse rounded bg-surface-raised" }, i))
	});
}
/**
* OrigenPanel.tsx
* -----------------------------------------------------------------------
* Equivalente a DestinoPanel pero para el punto de ORIGEN: no necesita
* su propio hook de red porque toda la data que necesita (despachos por
* destino alcanzado desde este origen) ya vive en `flujos`, que
* DashboardPage arma filtrando flujosParaMapa por origenId — es el mismo
* array que ya se le pasa a MapCanvas para dibujar los arcos, así que no
* hay una segunda fuente de verdad ni un fetch adicional.
* -----------------------------------------------------------------------
*/
function OrigenPanel({ origenId, origenNombre, flujos, isMobile, onClose }) {
	const despachosTotal = flujos.reduce((sum, f) => sum + f.despachosCount, 0);
	const destinosOrdenados = [...flujos].sort((a, b) => b.despachosCount - a.despachosCount);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContextualPanel, {
		isMobile,
		title: origenNombre,
		subtitle: "Punto de despacho",
		onClose,
		transitionKey: `origen-${origenId}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid grid-cols-2 divide-x divide-border border-b border-border",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "label-caps text-[10px]",
						children: "Despachos"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-2xl font-semibold tabular-nums text-foreground",
						children: despachosTotal.toLocaleString("es-CO")
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "label-caps text-[10px]",
						children: "Destinos alcanzados"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-2xl font-semibold tabular-nums text-foreground",
						children: flujos.length.toLocaleString("es-CO")
					})]
				})]
			}), flujos.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "p-4 text-sm text-muted-foreground",
				children: [
					"No hay despachos registrados desde este origen",
					destinosOrdenados.length === 0 ? " en la fecha seleccionada" : "",
					"."
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "border-b border-border p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "label-caps text-[10px]",
					children: "Despachos por destino"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2.5 flex flex-col gap-2.5",
					children: destinosOrdenados.map((f, i) => {
						const porcentaje = despachosTotal > 0 ? f.despachosCount / despachosTotal : 0;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "group -mx-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-surface-raised",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-foreground",
									children: f.destino.nombre
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tabular-nums text-muted-foreground",
									children: [
										f.despachosCount.toLocaleString("es-CO"),
										" · ",
										Math.round(porcentaje * 100),
										"%"
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1 h-1.5 overflow-hidden rounded-full bg-surface-raised",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-1.5 origin-left rounded-full bg-primary",
									style: {
										width: `${Math.max(2, porcentaje * 100)}%`,
										animation: `bar-grow 480ms cubic-bezier(0.16, 1, 0.3, 1) both`,
										animationDelay: `${i * 60}ms`
									}
								})
							})]
						}, f.destino.id);
					})
				})]
			})]
		})
	});
}
function Breadcrumb({ viewState, seleccionNombre, onGoToAll }) {
	const enAll = viewState.level === "ALL";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
		"aria-label": "Ubicación actual",
		className: "pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crumb, {
			label: "Valle del Cauca",
			active: enAll,
			onClick: enAll ? void 0 : onGoToAll
		}), seleccionNombre && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sep, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "max-w-[10rem] truncate text-foreground/90",
			children: seleccionNombre
		})] })]
	});
}
function Crumb({ label, active, onClick }) {
	const clickable = Boolean(onClick);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		disabled: !clickable,
		className: `tap-target max-w-[10rem] truncate rounded-full px-1.5 py-0.5 transition-colors ${active ? "text-primary" : clickable ? "text-muted-foreground hover:text-foreground" : "text-foreground/90"} ${clickable ? "cursor-pointer" : "cursor-default"}`,
		children: label
	});
}
function Sep() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-muted-foreground/60",
		"aria-hidden": true,
		children: "/"
	});
}
function TopBar({ viewState, seleccionNombre, onGoToAll }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-x-0 top-[calc(1rem+env(safe-area-inset-top))] z-10 flex items-center gap-2 px-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pointer-events-auto flex max-w-[55vw] items-center rounded-full border border-border bg-surface/95 px-3.5 py-1.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur sm:max-w-none",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "truncate",
				children: "Ayudas Humanitarias"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Breadcrumb, {
			viewState,
			seleccionNombre,
			onGoToAll
		})]
	});
}
/**
* FocoContext.tsx
* -----------------------------------------------------------------------
* Qué está mirando la persona, compartido entre las secciones y el mapa.
*
* Las secciones de arriba llevan al mapa, pero hasta ahora solo hacían
* scroll: se llegaba al mapa sin nada seleccionado y había que buscar a
* mano el municipio en el que se venía de hacer clic.
*
* Este contexto guarda esa intención. Al tocar un municipio se enfoca ese
* municipio; al tocar una categoría se enfocan todos los que la
* recibieron. El mapa lee el foco y responde.
*
* Vive aparte de OperacionContext a propósito: uno son los datos, que
* cambian cuando cambia el Excel, y el otro es la navegación, que cambia
* con cada clic. Mezclarlos haría que todo el árbol se vuelva a dibujar
* cada vez que alguien toca una ficha.
* -----------------------------------------------------------------------
*/
var FocoContext = (0, import_react.createContext)({
	municipio: null,
	categoria: null,
	enfocarMunicipio: () => {},
	enfocarCategoria: () => {},
	limpiar: () => {}
});
/** Lleva la vista al mapa. Se usa siempre junto con enfocar. */
function irAlMapa() {
	document.getElementById("mapa-de-ayudas")?.scrollIntoView({
		behavior: "smooth",
		block: "start"
	});
}
function FocoProvider({ children }) {
	const [municipio, setMunicipio] = (0, import_react.useState)(null);
	const [categoria, setCategoria] = (0, import_react.useState)(null);
	const enfocarMunicipio = (0, import_react.useCallback)((nombre) => {
		setCategoria(null);
		setMunicipio(nombre);
		irAlMapa();
	}, []);
	const enfocarCategoria = (0, import_react.useCallback)((nombre) => {
		setMunicipio(null);
		setCategoria(nombre);
		if (nombre) irAlMapa();
	}, []);
	const limpiar = (0, import_react.useCallback)(() => {
		setMunicipio(null);
		setCategoria(null);
	}, []);
	const value = (0, import_react.useMemo)(() => ({
		municipio,
		categoria,
		enfocarMunicipio,
		enfocarCategoria,
		limpiar
	}), [
		municipio,
		categoria,
		enfocarMunicipio,
		enfocarCategoria,
		limpiar
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FocoContext.Provider, {
		value,
		children
	});
}
function useFoco() {
	return (0, import_react.useContext)(FocoContext);
}
/**
* useAyuda.ts
* -----------------------------------------------------------------------
* Composición de lo entregado, desde route=ayuda.
*
* Mismo patrón y mismo staleTime que useCatalogQueries, y `retry: false`
* como useToneladas: mientras la ruta no esté publicada, el backend
* responde 404 y no tiene sentido reintentar. La sección cae a las
* cifras del catálogo y sigue funcionando.
*/
/** Igual que en useCatalogQueries. Si cambia allá, cambia acá. */
var CATALOG_STALE_TIME_MS = 3e5;
function useAyuda() {
	return useQuery({
		queryKey: ["ayuda"],
		queryFn: () => ayudasApiRepository.getAyuda(),
		staleTime: CATALOG_STALE_TIME_MS,
		retry: false
	});
}
function useIsMobile(breakpointPx = 768) {
	const [isMobile, setIsMobile] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
		const onChange = () => setIsMobile(mql.matches);
		onChange();
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [breakpointPx]);
	return isMobile;
}
function DashboardPage({ embedded = false }) {
	const [viewState, setViewState] = (0, import_react.useState)(INITIAL_VIEW_STATE);
	const [linesDismissed, setLinesDismissed] = (0, import_react.useState)(false);
	/**
	* `lens` es CÓMO se lee el día que marca el timeline, no un segundo
	* reloj. Antes esto era `territoryMode` y venía con su propio slider de
	* jornada, independiente del timeline: se podía tener los arcos en el
	* día 14 y los polígonos pintados con el total final de la operación.
	* Ahora hay un solo control temporal, el Timeline, y este toggle solo
	* decide si ese día se lee como acumulado o como jornada suelta.
	*
	* Por defecto acumulado: mover una línea de tiempo normalmente
	* significa "mostrame cómo iba", no "mostrame solo ese día".
	*/
	const [lens, setLens] = (0, import_react.useState)("acumulado");
	const [territoryZone, setTerritoryZone] = (0, import_react.useState)("todas");
	const [routesMode, setRoutesMode] = (0, import_react.useState)("visibles");
	const [visibleActivity, ,] = (0, import_react.useState)(null);
	const isMobile = useIsMobile();
	const { data: origenes } = useOrigenes();
	const { data: destinos } = useDestinos();
	const { data: flujosResponse } = useFlujos();
	const timelineDates = (0, import_react.useMemo)(() => {
		if (!flujosResponse?.flujos) return [];
		const set = /* @__PURE__ */ new Set();
		flujosResponse.flujos.forEach((f) => (f.porFecha ?? []).forEach((p) => set.add(p.fecha)));
		return [...set].sort();
	}, [flujosResponse]);
	/** El único reloj. Todo lo temporal del mapa se deriva de acá. */
	const isoDate = viewState.timelineDate;
	const territoryDay = (0, import_react.useMemo)(() => dayFromIsoDate(isoDate), [isoDate]);
	const operacion = useOperacion();
	const foco = useFoco();
	const { data: ayuda } = useAyuda();
	const flujosParaMapa = useFlujosPorLente(flujosResponse?.flujos, lens, isoDate);
	/**
	* Entregas por municipio, indexadas por código DANE, para que el mapa
	* pinte con los datos de la API. El catálogo estático solo aporta la
	* zona y el código de los municipios que todavía no registran
	* entregas, para que aparezcan en gris y no desaparezcan del mapa.
	*/
	const municipiosMapa = (0, import_react.useMemo)(() => {
		const mapa = /* @__PURE__ */ new Map();
		for (const cat of operacion.catalogo) mapa.set(cat.codigoDane, {
			nombre: cat.nombre,
			entregas: 0,
			dias: {},
			toneladas: 0,
			zona: cat.zona
		});
		for (const m of operacion.municipios) {
			const codigo = m.codigoDane ?? getTerritoryStat(m.nombre)?.codigoDane;
			if (!codigo) continue;
			mapa.set(codigo, {
				nombre: m.nombre,
				entregas: m.entregas,
				dias: m.dias,
				toneladas: m.toneladas,
				zona: m.zona ?? getTerritoryStat(m.nombre)?.zone ?? null
			});
		}
		return mapa;
	}, [operacion.catalogo, operacion.municipios]);
	/**
	* Municipios a resaltar cuando se llega desde una categoría.
	*
	* La ruta devuelve los NOMBRES, no los códigos, porque
	* ENVIOS_CATEGORIA apunta a destinos y no todo destino tiene DANE. Se
	* cruzan contra el catálogo con el comparador que ignora tildes y
	* alias, el mismo que usa el mapa para la selección.
	*/
	const resaltados = (0, import_react.useMemo)(() => {
		if (!foco.categoria) return null;
		const nombres = (ayuda?.categorias.find((c) => c.nombre === foco.categoria))?.municipiosNombres;
		if (!nombres || nombres.length === 0) return null;
		const codigos = /* @__PURE__ */ new Set();
		for (const cat of operacion.catalogo) if (nombres.some((n) => sameMunicipality(n, cat.nombre))) codigos.add(cat.codigoDane);
		return codigos;
	}, [
		foco.categoria,
		ayuda,
		operacion.catalogo
	]);
	/**
	* Al llegar desde una ficha de municipio, se selecciona solo. Antes
	* había que buscarlo a mano en el mapa después del scroll.
	*/
	(0, import_react.useEffect)(() => {
		if (!foco.municipio || !destinos) return;
		const destino = destinos.find((d) => sameMunicipality(d.nombre, foco.municipio));
		if (destino) setViewState((prev) => viewTransitions.toDestino(destino.id, prev));
	}, [foco.municipio, destinos]);
	const totalDespachosAsOf = (0, import_react.useMemo)(() => flujosParaMapa.reduce((sum, f) => sum + f.despachosCount, 0), [flujosParaMapa]);
	const flujosFiltrados = (0, import_react.useMemo)(() => {
		if (linesDismissed && !viewState.origenId && !viewState.destinoId) return [];
		if (viewState.origenId) return flujosParaMapa.filter((f) => f.origenId === viewState.origenId);
		if (viewState.destinoId) return flujosParaMapa.filter((f) => f.destino.id === viewState.destinoId);
		return flujosParaMapa;
	}, [
		flujosParaMapa,
		linesDismissed,
		viewState.origenId,
		viewState.destinoId
	]);
	const origenSeleccionado = (0, import_react.useMemo)(() => origenes?.find((o) => o.id === viewState.origenId) ?? null, [origenes, viewState.origenId]);
	const destinoSeleccionado = (0, import_react.useMemo)(() => destinos?.find((d) => d.id === viewState.destinoId) ?? null, [destinos, viewState.destinoId]);
	const seleccionNombre = origenSeleccionado?.nombre ?? destinoSeleccionado?.nombre ?? null;
	/**
	* Control de aparición de las notificaciones. El engine puede producir
	* varios frames mientras siguen llegando despachos; si una tarjeta
	* acaba de aparecer, no la reemplazamos durante 1200 ms.
	*/
	(0, import_react.useEffect)(() => {
		if (!viewState.timelineInstant) return;
		setViewState((prev) => viewTransitions.clearInstantFlag(prev));
	}, [viewState.timelineInstant, viewState.timelineDate]);
	const hayPanelAbiertoEnMobile = isMobile && (viewState.destinoId || viewState.origenId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: embedded ? "theme-ayudas relative h-full min-h-[26rem] w-full overflow-hidden bg-background" : "theme-ayudas relative h-dvh w-dvw overflow-hidden bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientOnly, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 flex items-center justify-center bg-[#0b0e14] text-xs text-muted-foreground",
				children: "Cargando mapa…"
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarcadorHUD, {
				despachos: totalDespachosAsOf,
				day: territoryDay,
				lens,
				instant: viewState.timelineInstant
			}),
			foco.categoria && resaltados && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-auto absolute inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-20 flex justify-center md:inset-x-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 rounded-full bg-[#FFD400] py-2 pl-5 pr-2 shadow-lg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-base font-bold text-[#123E5C]",
						children: [
							resaltados.size,
							" municipios recibieron ",
							foco.categoria.toLowerCase()
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: foco.limpiar,
						className: "rounded-full bg-[#123E5C] px-3 py-1 text-sm font-bold text-white transition hover:bg-[#0079C1]",
						children: "Ver todos"
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvisoEntrega, { frame: visibleActivity }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopBar, {
				viewState,
				seleccionNombre,
				onGoToAll: () => {
					setLinesDismissed(false);
					setViewState((prev) => viewTransitions.toAll(prev));
				}
			}),
			!viewState.destinoId && !viewState.origenId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-10 md:left-4 md:top-[calc(1rem+env(safe-area-inset-top))]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlujosLegend, { compact: isMobile })
			}),
			!hayPanelAbiertoEnMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TerritoryControls, {
				municipios: municipiosMapa,
				lens,
				day: territoryDay,
				zone: territoryZone,
				routesMode,
				onLensChange: setLens,
				onZoneChange: setTerritoryZone,
				onRoutesModeChange: setRoutesMode
			}),
			viewState.level === "DESTINO" && viewState.destinoId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DestinoPanel, {
				destinoId: viewState.destinoId,
				isMobile,
				onClose: () => setViewState((prev) => viewTransitions.toAll(prev))
			}),
			viewState.level === "ORIGEN" && viewState.origenId && origenSeleccionado && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrigenPanel, {
				origenId: viewState.origenId,
				origenNombre: origenSeleccionado.nombre,
				flujos: flujosFiltrados,
				isMobile,
				onClose: () => setViewState((prev) => viewTransitions.toAll(prev))
			}),
			!hayPanelAbiertoEnMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 flex justify-center px-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timeline, {
					dates: timelineDates,
					currentDate: viewState.timelineDate,
					onActivate: (first) => {
						setLinesDismissed(false);
						setViewState((prev) => viewTransitions.startTimeline(first, prev));
					},
					onSeek: (date) => {
						setLinesDismissed(false);
						setViewState((prev) => viewTransitions.seekTimeline(date, prev));
					},
					onAdvance: (date) => {
						setLinesDismissed(false);
						setViewState((prev) => viewTransitions.advanceTimeline(date, prev));
					},
					onExit: () => {
						setLinesDismissed(false);
						setViewState((prev) => viewTransitions.exitTimeline(prev));
					}
				})
			})
		]
	});
}
var TODAS$1 = "todas";
function TerritoryControls({ municipios, lens, day, zone, routesMode, onLensChange, onZoneChange, onRoutesModeChange }) {
	const zonasDisponibles = [...new Set([...municipios.values()].map((m) => m.zona).filter((z) => typeof z === "string" && z.length > 0))].sort((a, b) => a.localeCompare(b, "es"));
	const visibleMunicipalities = [...municipios.values()].filter((m) => zone === "todas" || m.zona === zone);
	const totalDespachos = visibleMunicipalities.reduce((sum, m) => sum + valorTemporal(m, lens, day), 0);
	const conEntregas = visibleMunicipalities.filter((m) => valorTemporal(m, lens, day) > 0).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "pointer-events-auto absolute inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 max-h-[45dvh] overflow-y-auto rounded-lg border border-border bg-surface/95 p-3 shadow-lg backdrop-blur md:inset-x-auto md:left-4 md:max-h-[52dvh] md:w-[20rem]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-[15px] leading-tight text-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "font-semibold",
						children: plural$1(totalDespachos, "despacho", "despachos")
					}),
					" ",
					"en ",
					plural$1(conEntregas, "municipio", "municipios"),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted-foreground",
						children: [" · ", describeLens(lens, day)]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 grid grid-cols-2 gap-1 rounded-md bg-background/70 p-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
					active: lens === "acumulado",
					onClick: () => onLensChange("acumulado"),
					children: "Todo lo entregado"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
					active: lens === "jornada",
					onClick: () => onLensChange("jornada"),
					disabled: day === null,
					title: day === null ? "Elige una jornada en la línea de tiempo" : void 0,
					children: "Solo ese día"
				})]
			}),
			day === null && lens === "acumulado" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm leading-5 text-muted-foreground",
				children: "Mueva la línea de tiempo para ver cómo se entregaron las ayudas día por día."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 flex flex-wrap gap-1.5",
				children: [TODAS$1, ...zonasDisponibles].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
					active: zone === item,
					onClick: () => onZoneChange(item),
					children: item === TODAS$1 ? "Todas" : item
				}, item))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 grid grid-cols-3 gap-1 rounded-md bg-background/70 p-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
						active: routesMode === "visibles",
						onClick: () => onRoutesModeChange("visibles"),
						children: "Ver rutas"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
						active: routesMode === "solo",
						onClick: () => onRoutesModeChange("solo"),
						children: "Solo lo elegido"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
						active: routesMode === "color",
						onClick: () => onRoutesModeChange("color"),
						children: "Sin rutas"
					})
				]
			})
		]
	});
}
/** "1 municipio" y no "1 municipios". */
function plural$1(n, uno, varios) {
	return `${n.toLocaleString("es-CO")} ${n === 1 ? uno : varios}`;
}
function ToggleButton({ active, onClick, children, disabled = false, title }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		disabled,
		title,
		"aria-pressed": active,
		className: `rounded px-2 py-1.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"}`,
		children
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
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", {
				className: "mb-1 text-sm font-bold uppercase tracking-widest text-[#00639F]",
				children: "Entregas por día"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-5 text-base text-[#35708F]",
				children: "Cada barra corresponde a una fecha; la barra amarilla representa el día con mayor número de entregas."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
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
			})
		]
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
* Tarjetas de jornada y municipios nuevos. Todo se calcula desde la API,
* incluida la glosa de cada tarjeta. Antes la cifra venía de un archivo
* y el texto estaba escrito en el JSX, así que al cambiar los datos las
* tarjetas seguían nombrando el día equivocado.
*/
var ORIGEN_CARTAGO$2 = "ORI-CARTAGO";
function MovimientoStatCards() {
	const op = useOperacion();
	const primeras48 = op.jornadas.slice(0, 2).reduce((sum, j) => sum + j.entregas, 0);
	const porcentaje48 = op.totalEntregas > 0 ? Math.round(primeras48 / op.totalEntregas * 100) : 0;
	op.diasConEntrega > 0 && (op.totalEntregas / op.diasConEntrega).toFixed(1);
	const cartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO$2);
	const tarjetas = [
		op.picoEntregas && {
			valor: String(op.picoEntregas.entregas) + " - Entregas",
			label: "Día con más entregas",
			nota: `El ${Number(op.picoEntregas.dia)} de agosto, hacia ${op.picoEntregas.municipios} municipios.`,
			color: "#F0801E"
		},
		op.picoCobertura && {
			valor: String(op.picoCobertura.municipios) + " - Municipios",
			label: "Día con más municipios atendidos",
			nota: `El ${Number(op.picoCobertura.dia)} de agosto.`,
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
* "Así avanzó la ruta". Reproduce la pieza de diseño con datos vivos:
* bloques alternados en azul y crema, uno por jornada que sumó
* municipios. Se hace por código y no como imagen porque los nombres
* cambian cada vez que la ruta llega a un municipio nuevo.
*
* El camión va como imagen de fondo, decorativo, y desaparece en
* pantallas angostas para no robarle ancho a los nombres.
*/
function MunicipiosNuevosCallouts() {
	const { jornadas } = useOperacion();
	const conNuevos = jornadas.filter((j) => j.nuevos > 0);
	if (conNuevos.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
				className: "vc-titular text-[clamp(2.25rem,7vw,4.5rem)] text-[#0079C1]",
				children: [
					"Así ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "vc-resaltado-crema",
						children: "avanzó"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					"la ruta"
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: "/marca/camion-ruta-solidaridad.png",
				alt: "",
				"aria-hidden": true,
				className: "mt-8 hidden w-full max-w-md lg:block"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "flex flex-col gap-3",
			children: conNuevos.map((j, i) => {
				const enCrema = i % 2 === 1;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: `rounded-md p-5 ${enCrema ? "bg-[#ffffff] text-[#0079C1]" : "bg-[#0079C1] text-[#FBF8C6]"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-lg font-bold",
						children: [
							Number(j.dia),
							" de agosto / +",
							j.nuevos,
							" ",
							j.nuevos === 1 ? "municipio" : "municipios"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1.5 text-lg leading-7 font-medium",
						children: [j.nombresNuevos.join(", "), "."]
					})]
				}, j.fecha);
			})
		})]
	});
}
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
			className: `fixed left-0 top-0 z-50 shadow-xl md:shadow-none flex h-dvh flex-col border-r border-[#0079C1]/12 bg-white py-5 transition-[width,transform] duration-300 ease-out motion-reduce:transition-none ${abierto ? "w-72 translate-x-0 px-4" : "w-72 -translate-x-full px-4 md:w-20 md:translate-x-0 md:px-3"}`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `mb-5 ${abierto ? "flex items-center gap-3 px-1" : "flex flex-col items-center gap-2"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => irA(inicioId),
						"aria-label": "Volver al inicio",
						title: "Volver al inicio",
						className: `flex shrink-0 items-center justify-center rounded-xl transition hover:bg-[#EAF7FC] ${abierto ? "h-12 px-2" : "h-11 w-full px-1"}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: logo,
							alt: "Gobernación del Valle del Cauca. Volver al inicio",
							className: abierto ? "h-10 w-auto" : "h-8 w-full object-contain"
						})
					}), abierto ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setAbierto(false),
						"aria-label": "Cerrar menú",
						className: "ml-auto flex size-9 shrink-0 items-center justify-center rounded-full text-[#35708F] transition hover:bg-[#F2FAFD]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
							className: "size-5 md:hidden",
							"aria-hidden": true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {
							className: "hidden size-5 md:block",
							"aria-hidden": true
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setAbierto(true),
						"aria-label": "Abrir menú",
						className: "hidden size-11 shrink-0 items-center justify-center rounded-xl text-[#35708F] transition hover:bg-[#F2FAFD] md:flex",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, {
							className: "size-6",
							"aria-hidden": true
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-1 flex-col gap-1",
					children: items.map(({ id, label, icon: Icon }) => {
						const esActivo = activo === id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => irA(id),
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
function SectionLabel({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm font-bold uppercase tracking-[0.16em] text-[#00639F]",
		children
	});
}
function SectionTitle({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
		className: "mt-3 max-w-3xl font-serif text-4xl leading-[1.12] text-[#123E5C] md:text-5xl",
		children
	});
}
function Card({ children, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `rounded-lg border border-[#0079C1]/12 bg-white p-6 ${className}`,
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
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `flex flex-wrap items-center gap-2 ${conRotulo ? "mt-5" : ""}`,
			children: filtros.map((f) => {
				const activo = zona === f.valor;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setZona(f.valor),
					"aria-pressed": activo,
					className: `inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold transition duration-200 ${activo ? "bg-[#0079C1] text-white shadow-md" : "bg-white text-[#35708F] ring-1 ring-[#123E5C]/10 hover:bg-[#EAF7FC] hover:text-[#0079C1]"}`,
					children: [f.etiqueta, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `rounded-full px-2 py-0.5 text-sm font-bold ${activo ? "bg-white/25 text-white" : "bg-[#DDF0FA] text-[#0079C1]"}`,
						children: f.cantidad
					})]
				}, f.valor);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "search",
			value: texto,
			onChange: (e) => setTexto(e.target.value),
			placeholder: "Buscar municipio…",
			"aria-label": "Buscar municipio",
			className: "mt-3 w-full rounded-lg border-2 border-[#123E5C]/10 bg-white px-4 py-3 text-base text-[#123E5C] outline-none transition placeholder:text-[#8FAABC] focus:border-[#0079C1]"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-base text-[#35708F]",
			"aria-live": "polite",
			children: visibles.length === todos.length ? plural(visibles.length, "municipio", "municipios") : `${visibles.length} de ${todos.length} municipios`
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
							className: "flex justify-between text-[15px] text-[#6B93AA]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: m.zona ?? "Sin zona" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: sinEntregas ? "Sin entregas" : `${m.toneladas} t` })]
						})
					]
				}, m.destinoId);
			})
		}, `${zona}-${texto}`)
	] });
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
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Cada casilla es un día. Cuanto más cálido el color, más entregas ese día." }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "mt-3 max-w-2xl text-lg leading-8 text-[#0079C1]" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 space-y-5",
			children: grupos.map(({ zona, filas }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-md bg-[#123E5C] p-4 sm:p-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-5 lg:flex-row lg:gap-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "lg:w-52 lg:shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "vc-titular text-3xl text-white sm:text-4xl",
							children: zona
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-base leading-6 text-[#ffffff]",
							children: [filas.map((m) => m.nombre).join(", "), "."]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "min-w-0 flex-1 overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-[640px]",
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
			["Agua en pacas (mlitros)", 1047],
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
			["Papas y platanillas (paquetes)", 135],
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
/** Los 14 productos más repartidos de toda la emergencia, sin importar categoría. */
var productosMasRepartidos = [
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
	["Kit de aseo", 4281]
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
var poblacionesFocalizadas = [
	["Mascotas", 84],
	["Veredas y rural", 47],
	["Adulto mayor", 33],
	["Discapacidad", 25],
	["Donación China", 19],
	["Indígena y etnias", 8],
	["Juventudes", 6],
	["Rescatistas", 5],
	["Mujeres", 4],
	["Primera infancia", 2]
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
* Las cifras vienen de route=ayuda. El catálogo estático queda como
* respaldo mientras esa ruta no exista, y como fuente de dos cosas que
* el workbook no tiene: el color de cada categoría y los nombres de
* producto. ENVIOS_CATEGORIA guarda cuántos productos distintos trae
* cada envío, no cuáles.
* -----------------------------------------------------------------------
*/
function AyudaSection() {
	const [activa, setActiva] = (0, import_react.useState)(null);
	const { totalToneladas, toneladasMedidas } = useOperacion();
	const { data: ayuda } = useAyuda();
	const { enfocarCategoria } = useFoco();
	/**
	* Antes esta lista decía "llegó a 44 municipios" en un departamento de
	* 41, porque el catálogo cuenta destinos de cualquier tipo. La ruta
	* separa las dos cuentas y acá se usa la de municipios.
	*/
	const categorias = (0, import_react.useMemo)(() => {
		if (!ayuda) return categoriasAyuda.map((c) => ({
			nombre: c.nombre,
			unidades: c.unidades,
			municipios: null,
			color: c.color,
			productos: c.productos
		}));
		return ayuda.categorias.map((viva) => {
			const local = categoriasAyuda.find((c) => c.nombre === viva.nombre);
			return {
				nombre: viva.nombre,
				unidades: viva.unidades,
				municipios: viva.municipios,
				color: local?.color ?? "#6B93AA",
				productos: local?.productos ?? []
			};
		});
	}, [ayuda]);
	const totalUnidades = ayuda?.totalUnidades ?? 256650;
	const poblaciones = ayuda ? ayuda.poblaciones.map((p) => [p.nombre, p.despachos]) : poblacionesFocalizadas.map(([nombre, despachos]) => [nombre, despachos]);
	const pct = (unidades) => totalUnidades > 0 ? Math.round(unidades / totalUnidades * 100) : 0;
	/**
	* Porcentaje para mostrar.
	*
	* Herramientas y materiales son 828 unidades de 256.650, un 0,32 por
	* ciento, y Salud son 87, un 0,03. Redondeados dan cero, y un cero se
	* lee como que no se entregó nada. Sí se entregó, solo que poco.
	*
	* "menos de 1" dice lo mismo sin mentir. Cero se reserva para cuando
	* de verdad no hay nada.
	*/
	const pctTexto = (unidades) => {
		if (unidades <= 0) return "0%";
		const redondeado = pct(unidades);
		return redondeado === 0 ? "<1%" : `${redondeado}%`;
	};
	const categoria = activa ? categorias.find((c) => c.nombre === activa) : void 0;
	const maxUnidades = Math.max(1, ...categorias.map((c) => c.unidades));
	const waffle = (0, import_react.useMemo)(() => categorias.flatMap((c) => Array.from({ length: Math.round(c.unidades / Math.max(1, totalUnidades) * 100) }, () => c)), [categorias, totalUnidades]);
	/**
	* Tipo explícito, con `color` opcional.
	*
	* Sin él, TypeScript infiere una unión de dos formas distintas, una con
	* color y otra sin, y solo deja leer lo que existe en las dos. El
	* color solo aplica cuando hay categoría seleccionada: en la lista
	* general los artículos vienen de categorías distintas y pintarlos
	* todos igual sería mentir sobre a cuál pertenecen.
	*/
	const productos = categoria ? categoria.productos.map(([label, value]) => ({
		label,
		value,
		color: categoria.color
	})) : productosMasRepartidos.map(([label, value]) => ({
		label,
		value
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "La mayor parte de la ayuda es aseo, comida y agua" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 max-w-3xl text-lg leading-8 text-[#35708F]",
				children: "Las categorías de entrega muestran los diferentes tipos de ayudas entregadas a las comunidades afectadas, de acuerdo con las necesidades identificadas durante la atención de la emergencia."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-2xl text-lg leading-8 text-[#35708F]",
				children: "Seleccione una categoría para ver qué artículos incluyó."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-10 grid gap-8 rounded-xl border border-[#0079C1]/12 bg-white p-5 sm:p-7 lg:grid-cols-[minmax(210px,0.7fr)_minmax(0,1.4fr)] lg:items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "block font-serif text-[64px] leading-none tracking-[-0.02em] text-[#0079C1]",
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
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-xl font-semibold text-[#123E5C]",
						children: "De qué está hecha esa ayuda"
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
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "lg:sticky lg:top-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-bold uppercase tracking-[0.16em] text-[#0079C1]",
							children: categoria ? categoria.nombre : "Lo más entregado"
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
						categoria && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 flex flex-col gap-3 border-t border-[#0079C1]/12 pt-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => enfocarCategoria(categoria.nombre),
								className: "inline-flex items-center justify-center gap-2 rounded-full bg-[#0079C1] px-5 py-3 text-base font-bold text-white transition hover:bg-[#00639F]",
								children: "Ver en el mapa dónde llegó"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setActiva(null),
								className: "text-base font-semibold text-[#0079C1] underline-offset-4 hover:underline",
								children: "Ver las ayudas mas entregadas"
							})]
						})
					]
				}, categoria?.nombre ?? "general")]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-14 rounded-md bg-[#0079C1] p-6 sm:p-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "vc-titular text-[clamp(1.5rem,4vw,2.5rem)] text-[#FBF8C6]",
						children: "A quién se dirigió la ayuda"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-2xl text-base leading-7 text-white sm:text-lg",
						children: "Entregas que declararon ayuda dirigida a un grupo. Una misma entrega puede nombrar varios, así que la suma es mayor que el total de entregas."
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
					toneladasMedidas ? "Las toneladas son el peso registrado en todo el departamento, incluidas las rutas que no llegan a un municipio." : "Las toneladas son una estimación a partir del número de entregas."
				] })
			})
		]
	});
}
var canalesPresentacion = [
	{
		id: "cali",
		nombre: "Cali",
		glosa: "Capital del departamento. Va por su propio canal, fuera del conteo por municipio.",
		color: "#22ABE2"
	},
	{
		id: "multiples",
		nombre: "Municipios múltiples",
		glosa: "Ruta de entrega que atendió a varios municipios.",
		color: "#8375A9"
	},
	{
		id: "cartago",
		nombre: "Centro de distribución Cartago",
		glosa: "Lugares fuera de Cali donde se recibieron y distribuyeron las ayudas.",
		color: "#F7B733"
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
	}).sort((a, b) => b.unidades - a.unidades);
	const sinDatos = rutas.length === 0;
	const totalRutas = rutas.reduce((sum, r) => sum + r.entregas, 0);
	/**
	* Toneladas por ruta, estimadas. El peso se registra por día y para
	* todo el departamento, no por envío, así que el total se reparte
	* entre todas las entregas conocidas.
	*/
	const toneladasDe = (entregas) => op.entregasTodas > 0 ? Math.round(entregas * (op.totalToneladas / op.entregasTodas)) : 0;
	const principales = rutas.slice(0, 2);
	const secundarias = rutas.slice(2);
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
						"El conteo por municipio deja fuera estas rutas. Suman ",
						totalRutas,
						" entregas y unas",
						" ",
						toneladasDe(totalRutas).toLocaleString("es-CO"),
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
										children: (r.entregas > 0 ? r.entregas : r.unidades).toLocaleString("es-CO")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-1 block text-base text-[#A8CFE2]",
										children: r.entregas > 0 ? "entregas" : "unidades"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: "block text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-none text-[#FBF8C6]",
										children: toneladasDe(r.entregas).toLocaleString("es-CO")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-1 block text-base text-[#A8CFE2]",
										children: "toneladas estimadas"
									})] })]
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
									children: (r.entregas > 0 ? r.entregas : r.unidades).toLocaleString("es-CO")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-base text-[#6B93AA]",
									children: r.entregas > 0 ? r.entregas === 1 ? "entrega" : "entregas" : "unidades"
								})]
							}),
							r.entregas > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-[15px] text-[#6B93AA]",
								children: [toneladasDe(r.entregas).toLocaleString("es-CO"), " toneladas estimadas"]
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
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 max-w-3xl text-base leading-7 text-[#6B93AA]",
				children: "Las toneladas por ruta son una estimación. El peso se registra por día y para todo el departamento, no por cada envío, así que el total se reparte entre las entregas. La ayuda enviada al Chocó cuenta como entrega, pero no como municipio del Valle."
			})
		]
	});
}
var ORIGEN_CARTAGO = "ORI-CARTAGO";
function BalanceFinal() {
	const op = useOperacion();
	const { data: ayuda } = useAyuda();
	const entregasCartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO)?.entregas ?? 0;
	const canalesVivos = ayuda?.canales ?? [];
	const entregasDeGrupo = (id) => canalesVivos.filter((c) => c.id === id).reduce((sum, c) => sum + c.entregas, 0);
	const multiples = entregasDeGrupo("multiples");
	const unidadesMultiples = canalesVivos.filter((c) => c.id === "multiples").reduce((sum, c) => sum + c.unidades, 0);
	const otras = canalesVivos.filter((c) => c.id !== "multiples" && c.id !== "cartago").reduce((sum, c) => sum + c.entregas, 0);
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
			descripcion: "Lugares fuera de Cali donde se recibieron y distribuyeron las ayudas.",
			entregas: entregasCartago,
			unidades: 0,
			color: "#E2690E",
			tinta: "#A34C00",
			icono: Warehouse
		},
		{
			id: "multiples",
			titulo: "Municipios múltiples",
			descripcion: "Ruta de entrega que atendió a varios municipios.",
			entregas: multiples,
			unidades: unidadesMultiples,
			color: "#7F207F",
			tinta: "#7F207F",
			icono: Boxes
		},
		{
			id: "otras",
			titulo: "Otras ayudas humanitarias",
			descripcion: "Ayudas entregadas a otros grupos de personas afectadas, sin estar asociadas a un municipio específico.",
			entregas: otras,
			unidades: 0,
			color: "#22ABE2",
			tinta: "#0F6E96",
			icono: HeartHandshake
		}
	].filter((r) => r.entregas > 0 || r.unidades > 0);
	const totalRutas = rutas.reduce((sum, r) => sum + r.entregas, 0);
	/**
	* Las ayudas recibidas van con su propia fecha porque no salen de la
	* misma fuente que las demás: es el consolidado del centro de acopio,
	* que se cierra unos días antes que el registro de despachos. Con una
	* sola banda de corte al pie, esta cifra quedaba fechada tres días
	* después de lo que realmente cubre.
	*
	* Las dos van juntas y a mano hasta que la API publique el dato; si se
	* separan, la próxima actualización cambia una y deja la otra quieta.
	*/
	const RECIBIDAS = {
		valor: "562 t",
		corte: "24 de agosto de 2026"
	};
	const cifras = [
		{
			valor: RECIBIDAS.valor,
			label: "Ayudas recibidas",
			corte: RECIBIDAS.corte
		},
		{
			valor: `${op.totalToneladas.toLocaleString("es-CO")} t`,
			label: "Ayudas distribuidas",
			corte: op.fechaCorteLarga
		},
		{
			valor: totalRutas.toLocaleString("es-CO"),
			label: "Despachos en total",
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-9 space-y-2",
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
					const toneladas = op.entregasTodas > 0 ? Math.round(r.entregas * (op.totalToneladas / op.entregasTodas)) : 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						style: { "--i": i },
						className: "vc-aparece relative md:grid md:grid-cols-[1fr_4.5rem_1fr] md:items-center md:py-2.5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#123E5C]/10 md:contents",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col items-start gap-2.5 md:flex-row md:items-center md:justify-between md:gap-4 md:pr-6",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "shrink-0 text-[clamp(1.5rem,4vw,2rem)] font-bold uppercase tracking-widest md:min-w-24",
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
														"despachos · ",
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
															children: r.unidades.toLocaleString("es-CO")
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
				children: "Faltan las rutas de municipios múltiples y otras ayudas solidarias. Se muestran cuando el servicio de datos las devuelve."
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
function IndiceSection({ enlaceCali = "#mapa-de-ayudas" }) {
	const op = useOperacion();
	const indicadores = [
		{
			valor: `${op.municipiosAtendidos} de ${op.municipiosTotales}`,
			label: "municipios recibieron ayudas"
		},
		{
			valor: op.totalEntregas.toLocaleString("es-CO"),
			label: "entregas llegaron a los municipios"
		},
		{
			valor: `${op.toneladasMunicipales.toLocaleString("es-CO")} toneladas`,
			label: "llegaron a esos municipios"
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "indice",
		className: "flex min-h-dvh flex-col bg-[#22ABE2] lg:grid lg:min-h-dvh lg:grid-rows-[auto_1fr_1fr_auto]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto w-full max-w-[100rem] px-4 pt-8 sm:px-8 md:px-12 lg:pt-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-10",
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
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: enlaceCali,
						className: "inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#FBF8C6] px-5 py-2.5 text-base font-bold text-[#0079C1] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg md:mt-3 md:text-lg motion-reduce:hover:translate-y-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							"aria-hidden": true,
							children: "*"
						}), "Cali: conozca la ruta"]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto w-full max-w-[100rem] px-4 pt-6 sm:px-8 md:px-12 lg:min-h-0 lg:pt-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex h-full min-h-0 items-center rounded-sm bg-[#0079C1] px-6 py-6 sm:px-10 sm:py-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid min-h-0 w-full gap-8 text-center sm:grid-cols-3",
						children: indicadores.map((i, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							style: { "--i": idx },
							className: "vc-aparece",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
								className: "block text-[clamp(1.75rem,4vw,3.25rem)] font-extrabold leading-none text-[#FBF8C6]",
								children: i.valor
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-base leading-6 text-white sm:text-lg sm:leading-7",
								children: i.label
							})]
						}, i.label))
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto w-full max-w-[100rem] px-4 pt-4 pb-8 sm:px-8 md:px-12 lg:min-h-0 lg:pb-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex h-full min-h-0 items-center rounded-sm bg-[#0079C1] px-6 py-6 sm:px-10 sm:py-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "min-h-0 w-full",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanoramaDonuts, {})
					})
				})
			})
		]
	});
}
/**
* StoryPage.tsx
* -----------------------------------------------------------------------
* El relato completo de la Ruta de la Solidaridad, de la portada al mapa.
*
* SOBRE LA SECCIÓN DE MUNICIPIOS
*
* Estaba en blanco, con el titular en azul y los tres bloques uno debajo
* de otro. Era legible, pero no se parecía a las piezas de la campaña:
* ahí el color no es un fondo, es la estructura. Cada pieza avanza por
* bandas horizontales a sangre —cyan para el titular, azul para el
* rótulo del bloque, crema para el contenido— y el lector sabe en qué
* capítulo está por el color de la franja, no por la distancia entre
* párrafos.
*
* Así quedó armada esta sección. Las bandas van a sangre y el ancho
* máximo se controla adentro con `max-w-6xl`: al revés, con una caja de
* color centrada, la pieza deja de leerse como sistema y parece una
* tarjeta suelta en medio de la página.
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
		id: "indice",
		label: "Índice",
		icon: List
	},
	{
		id: "cuando",
		label: "Analisis de entrega",
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "cuando",
				className: "bg-[#FBF8C6] px-4 py-14 sm:px-6 sm:py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "vc-titular mt-4 max-w-4xl text-[clamp(1.75rem,5.5vw,3.25rem)] text-[#0079C1]",
						children: tituloCuando(op.picoEntregas?.dia, op.picoCobertura?.dia)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-12 space-y-14",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MovimientoStatCards, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JornadaBars, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MunicipiosNuevosCallouts, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EvolucionHeatmap, { onSelect: irAlMapa })
						]
					})]
				})
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
								className: "text-[clamp(1.25rem,3vw,2rem)] font-bold leading-[1.7] text-white",
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
						className: "px-4 py-12 pb-16 sm:px-6 sm:py-14 md:px-10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mx-auto max-w-6xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-[clamp(1.25rem,3vw,2rem)] font-bold leading-[1.7] text-[#0079C1]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "vc-resaltado-crema bg-white",
										children: ["Los ", op.municipiosTotales]
									}),
									" ",
									"municipios"
								]
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
				className: "bg-[#F2FAFD] px-4 py-14 sm:px-6 sm:py-20 md:px-10",
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
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardPage, { embedded: true })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "bg-[#0076BC] px-8 py-10 text-base leading-7 text-[#A8CFE2] sm:px-6 md:px-33",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "block font-serif text-xl text-[#FBF8C6]",
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
* tres cosas que se pierden al copiar y pegar: el `leading-[1.7]`, sin
* el cual los recuadros amarillos de `.vc-resaltado` —que crecen con su
* propio padding— se montan entre líneas cuando el rótulo parte en dos;
* el `max-w-6xl`, que lo alinea con el contenido de las demás bandas; y
* el `<h3>`, que es lo que hace que un lector de pantalla lo anuncie
* como encabezado y no como un párrafo decorativo.
*/
function BandaRotulo({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "bg-[#0079C1] px-4 py-7 sm:px-6 md:px-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "mx-auto max-w-6xl text-[clamp(1.25rem,3vw,2rem)] font-bold leading-[1.7] text-white",
			children
		})
	});
}
/** El titular nombra los días reales, así que cambia con los datos. */
function tituloCuando(diaPico, diaCobertura) {
	if (!diaPico || !diaCobertura) return "Cómo avanzaron las entregas día a día";
	if (diaPico === diaCobertura) return `El ${Number(diaPico)} de agosto se entregó más que ningún otro día`;
	return `Momentos Clave`;
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
var SplitComponent = StoryPage;
//#endregion
export { SplitComponent as component };
