import { r as __toESM } from "../_runtime.mjs";
import { i as require_react, r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { h as ClientOnly } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as ChevronDown, t as MapPinned } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CMjef2vf.js
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
		const response = await fetch(url.toString());
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
			if (primerFlujo && !Array.isArray(primerFlujo["porFecha"])) console.warn("route=flujos: los flujos no traen \"porFecha\" (array) — probablemente la implementación del Web App de Apps Script está desactualizada respecto a Transforms.gs, o CacheLayer.gs sirvió una respuesta vieja (TTL 6h). El mapa y los arcos funcionan igual; el timeline no va a tener fechas para reproducir hasta que se re-implemente (\"Nueva versión\") y/o se corra limpiarCache().");
			return null;
		});
	}
	getDestinos() {
		return this.request("destinos", {}, (p) => Array.isArray(p) ? null : "se esperaba un array de destinos");
	}
	/** Vista PRINCIPAL de un destino — solo ENVIOS_CATEGORIA. */
	getDestino(id) {
		return this.request("destino", { id });
	}
	/** Vista SECUNDARIA — solo DESPACHOS. Nunca sumar contra getDestino(). */
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
* un elemento, un queryFn que llama al repositorio, y el mismo staleTime
* (estos catálogos ya están cacheados 6h del lado del backend en
* CacheLayer.gs — no tiene sentido que el cliente los revalide más
* seguido que eso). Consolidarlos en una fábrica evita que, con el
* tiempo, alguien le cambie el staleTime a uno solo y los seis queden
* desalineados sin que nadie lo note en review.
* -----------------------------------------------------------------------
*/
var CATALOG_STALE_TIME_MS = 216e5;
function createCatalogQuery(key, fetcher) {
	return function useThisCatalogQuery() {
		return useQuery({
			queryKey: [key],
			queryFn: fetcher,
			staleTime: CATALOG_STALE_TIME_MS
		});
	};
}
var useOrigenes = createCatalogQuery("origenes", () => ayudasApiRepository.getOrigenes());
var useFlujos = createCatalogQuery("flujos", () => ayudasApiRepository.getFlujos());
var useDestinos = createCatalogQuery("destinos", () => ayudasApiRepository.getDestinos());
/**
* useFlujosAsOf.ts
* -----------------------------------------------------------------------
* Deriva, en el cliente y sin red, el estado acumulado de los flujos a
* una fecha dada del timeline. useFlujos() ya trae todo el `porFecha` de
* cada par en memoria desde el primer fetch — recalcular "cuánto se había
* entregado al día X" es sumar un array corto, no vale la pena un fetch
* por cada tick del scrub (arrastrar el slider generaría decenas de
* requests por segundo contra un backend con cuota de ejecuciones).
*
* NOTA: depende de que `Transforms.gs` incluya `porFecha` en la respuesta
* de route=flujos (cambio propuesto, ver conversación — un campo más en
* la misma ruta, no una ruta nueva, para no desincronizar el TTL de
* CacheLayer.gs entre dos vistas del mismo dataset).
* -----------------------------------------------------------------------
*/
/**
* @param flujos           salida completa de useFlujos().data.flujos
* @param timelineDate     fecha ISO del playhead, o null para modo estático
*                          (en cuyo caso se devuelven los flujos tal cual,
*                          sin filtrar — mismo comportamiento que ya
*                          existía antes de que existiera el timeline)
*/
function useFlujosAsOf(flujos, timelineDate) {
	return (0, import_react.useMemo)(() => {
		if (!Array.isArray(flujos)) return [];
		if (timelineDate === null) return flujos;
		return flujos.map((flujo) => {
			const acumulado = (flujo.porFecha ?? []).filter((p) => p.fecha <= timelineDate).reduce((sum, p) => sum + p.despachosCount, 0);
			return acumulado > 0 ? {
				...flujo,
				despachosCount: acumulado
			} : null;
		}).filter((f) => f !== null);
	}, [flujos, timelineDate]);
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
* Timeline.tsx
* -----------------------------------------------------------------------
* Componente de presentación puro: no decide fases ni construye fechas —
* solo recibe la lista de fechas disponibles y el valor actual, y avisa
* hacia arriba (onSeek/onAdvance/onTogglePlay) qué pasó. La distinción
* seek-vs-advance que ya está en viewState.ts (seekTimeline nunca anima,
* advanceTimeline sí) se preserva acá: arrastrar el handle llama
* onSeek(), el intervalo de reproducción automática llama onAdvance().
*
* VELOCIDAD (fix "va demasiado rápido"): antes el paso era un valor fijo
* (650ms) sin importar cuántas fechas hubiera — con datasets de muchas
* fechas la reproducción completa terminaba en un parpadeo. Ahora el paso
* se calcula repartiendo una duración TOTAL objetivo entre el número de
* saltos que hay entre la primera y la última fecha (dates.length - 1),
* con un piso y un techo para no volverse absurdo en los extremos (un
* dataset de 2 fechas no debería tardar 20s en dar un solo paso, y uno de
* 200 fechas no debería tardar 3 minutos completos).
*
* FIX (bug "el timeline se queda pegado en la segunda fecha"): el efecto
* que arma el `setInterval` depende solo de `[playing]` a propósito —
* cada play/pause reinicia el conteo desde cero, en vez de reiniciar el
* intervalo (y por lo tanto el conteo del paso) en CADA cambio de fecha,
* lo que se vería entrecortado. Pero eso significa que la función que
* corre en el intervalo se crea UNA sola vez por cada play, y JavaScript
* la deja con el `dates`/`currentDate` de ESE momento capturados por
* closure — no se actualizan solos aunque lleguen props nuevas en cada
* render. El código anterior leía `dates`/`currentDate` directo de los
* props dentro del callback del intervalo, así que en cada tick seguía
* viendo la fecha con la que arrancó la reproducción, nunca la fecha a
* la que ya se había avanzado — el resultado observable era "avanza una
* vez y después se traba", porque cada tick volvía a calcular el mismo
* "siguiente" de la fecha original. La solución estándar de React para
* esto es leer los valores desde un `ref` que se actualiza en cada
* render (sin pasar por el ciclo de efectos): el intervalo sigue
* viviendo el mismo tiempo total, pero en cada tick lee el valor de
* verdad más reciente, no el que tenía al nacer.
*
* NOTA aparte (no es un bug de este archivo): si en desarrollo el
* timeline solo avanza limpiando la caché del navegador, es casi seguro
* Fast Refresh de Vite — agregar/quitar refs cambia la forma de los
* hooks del componente, y Fast Refresh no siempre remonta con eso limpio;
* puede quedar vivo un closure viejo hasta un reload completo
* (Ctrl+Shift+R). En producción, revisar que el documento HTML raíz no
* se sirva con cache-control largo (los assets con hash sí pueden).
* -----------------------------------------------------------------------
*/
/** Duración total objetivo de una reproducción completa, de la primera a la última fecha. */
var TOTAL_PLAYBACK_DURATION_MS = 2e4;
/** Piso: ningún paso individual debería sentirse más rápido que esto, sin importar cuántas fechas haya. */
var MIN_STEP_MS = 450;
/** Techo: ningún paso individual debería sentirse tan lento que parezca trabado, sin importar cuán pocas fechas haya. */
var MAX_STEP_MS = 2200;
function computeStepMs(dateCount) {
	if (dateCount <= 1) return MIN_STEP_MS;
	const raw = TOTAL_PLAYBACK_DURATION_MS / (dateCount - 1);
	return Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, raw));
}
function Timeline({ dates, currentDate, onSeek, onAdvance, onActivate, onExit }) {
	const [playing, setPlaying] = (0, import_react.useState)(false);
	const intervalRef = (0, import_react.useRef)(null);
	const datesRef = (0, import_react.useRef)(dates);
	datesRef.current = dates;
	const currentDateRef = (0, import_react.useRef)(currentDate);
	currentDateRef.current = currentDate;
	const currentIndex = currentDate ? dates.indexOf(currentDate) : -1;
	const atEnd = currentIndex >= 0 && currentIndex === dates.length - 1;
	(0, import_react.useEffect)(() => {
		if (currentDate === null) setPlaying(false);
	}, [currentDate]);
	(0, import_react.useEffect)(() => {
		if (!playing) {
			if (intervalRef.current !== null) clearInterval(intervalRef.current);
			intervalRef.current = null;
			return;
		}
		const stepMs = computeStepMs(datesRef.current.length);
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
	const handleTogglePlay = () => {
		if (!currentDate && dates.length > 0) {
			const first = dates[0];
			if (first !== void 0) onActivate(first);
		}
		if (atEnd) {
			const first = dates[0];
			if (first !== void 0) onSeek(first);
		}
		setPlaying((v) => !v);
	};
	const handleScrub = (event) => {
		setPlaying(false);
		const date = dates[Number(event.target.value)];
		if (date !== void 0) onSeek(date);
	};
	if (dates.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-surface/95 px-4 py-2 shadow-sm backdrop-blur",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: handleTogglePlay,
				"aria-label": playing ? "Pausar reproducción" : "Reproducir por fecha",
				className: "flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background",
				children: playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
					width: "12",
					height: "12",
					viewBox: "0 0 24 24",
					fill: "currentColor",
					"aria-hidden": true,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "5",
						y: "4",
						width: "5",
						height: "16"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "14",
						y: "4",
						width: "5",
						height: "16"
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
					width: "12",
					height: "12",
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
				"aria-label": "Fecha del timeline",
				className: "h-1 w-40 shrink-0 accent-foreground md:w-64"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "min-w-[5.5rem] shrink-0 font-mono text-xs text-muted-foreground",
				children: currentDate ?? dates[0]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					setPlaying(false);
					onExit();
				},
				"aria-label": "Salir del modo timeline",
				className: "ml-1 shrink-0 text-xs text-muted-foreground hover:text-foreground",
				children: "Ver todo"
			})
		]
	});
}
/**
* TimelineStatsHUD.tsx
* -----------------------------------------------------------------------
* El número "primera plana" del timeline: total acumulado de despachos a
* la fecha actual, con un "+N" que aparece un instante cuando avanza. El
* delta NO se muestra en un seek/salto (prop `instant`) — mismo criterio
* que ya usa viewState.timelineInstant y que usan las notificaciones por
* destino en MapCanvas: un salto no es un evento nuevo que anunciar.
*
* Las burbujas de MapCanvas (dispatchToastEngine) cubren el "a dónde
* llegó"; este HUD cubre el "cuánto en total", que no tiene una ubicación
* geográfica natural para anclar en el mapa.
* -----------------------------------------------------------------------
*/
var DELTA_VISIBLE_MS = 1800;
function TimelineStatsHUD({ totalDespachos, totalToneladas, currentDate, instant }) {
	const prevTotalRef = (0, import_react.useRef)(null);
	const [delta, setDelta] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		const prev = prevTotalRef.current;
		prevTotalRef.current = totalToneladas;
		if (prev === null || instant) {
			setDelta(0);
			return;
		}
		const diff = totalToneladas - prev;
		if (diff <= 0) {
			setDelta(0);
			return;
		}
		setDelta(diff);
		const timeout = setTimeout(() => setDelta(0), DELTA_VISIBLE_MS);
		return () => clearTimeout(timeout);
	}, [totalToneladas]);
	(0, import_react.useEffect)(() => {
		if (currentDate === null) {
			prevTotalRef.current = null;
			setDelta(0);
		}
	}, [currentDate]);
	if (!currentDate) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute inset-x-0 top-[calc(1rem+env(safe-area-inset-top))] z-10 flex justify-center px-4",
		"aria-live": "polite",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-baseline gap-2 rounded-full border border-border bg-surface/95 px-4 py-1.5 shadow-sm backdrop-blur",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-display text-xl font-semibold tabular-nums text-foreground",
					children: totalToneladas.toLocaleString("es-CO")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "label-caps text-[10px]",
					children: ["toneladas est. al ", currentDate]
				}),
				delta > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary",
					style: { animation: "toast-pop 260ms cubic-bezier(0.16,1,0.3,1) both" },
					children: [
						"+",
						delta.toLocaleString("es-CO"),
						" t"
					]
				}, `${currentDate}-${delta}`),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "hidden text-[11px] tabular-nums text-muted-foreground sm:inline",
					children: [totalDespachos.toLocaleString("es-CO"), " despachos"]
				})
			]
		})
	});
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
	nombre: "Cali (bodega central)",
	color: "#2f6fed"
}, {
	id: "ORI-CARTAGO",
	nombre: "Centro de acopio Cartago",
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
var TERRITORY_DAYS = [
	"11",
	"12",
	"13",
	"14",
	"15",
	"16",
	"17",
	"18",
	"19",
	"20",
	"21",
	"22",
	"24",
	"25"
];
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
function normMunicipalityName(name) {
	return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
}
normMunicipalityName("Guadalajara de Buga"), normMunicipalityName("Buga"), normMunicipalityName("Cali");
new Map(territoryMunicipalities.map((m) => [m.codigoDane, m]));
new Map(territoryMunicipalities.map((m) => [normMunicipalityName(m.name), m]));
var jornadas = [
	{
		dia: "11",
		despachos: 5,
		municipiosDelDia: 5,
		toneladas: 14,
		acumuladoDespachos: 5,
		acumuladoMunicipios: 5,
		acumuladoToneladas: 14
	},
	{
		dia: "12",
		despachos: 56,
		municipiosDelDia: 32,
		toneladas: 50,
		acumuladoDespachos: 61,
		acumuladoMunicipios: 33,
		acumuladoToneladas: 64
	},
	{
		dia: "13",
		despachos: 38,
		municipiosDelDia: 24,
		toneladas: 70,
		acumuladoDespachos: 99,
		acumuladoMunicipios: 36,
		acumuladoToneladas: 134
	},
	{
		dia: "14",
		despachos: 21,
		municipiosDelDia: 14,
		toneladas: 35,
		acumuladoDespachos: 120,
		acumuladoMunicipios: 36,
		acumuladoToneladas: 169
	},
	{
		dia: "15",
		despachos: 23,
		municipiosDelDia: 17,
		toneladas: 60,
		acumuladoDespachos: 143,
		acumuladoMunicipios: 36,
		acumuladoToneladas: 229
	},
	{
		dia: "16",
		despachos: 16,
		municipiosDelDia: 10,
		toneladas: 45,
		acumuladoDespachos: 159,
		acumuladoMunicipios: 36,
		acumuladoToneladas: 274
	},
	{
		dia: "17",
		despachos: 45,
		municipiosDelDia: 23,
		toneladas: 80,
		acumuladoDespachos: 204,
		acumuladoMunicipios: 37,
		acumuladoToneladas: 354
	},
	{
		dia: "18",
		despachos: 26,
		municipiosDelDia: 16,
		toneladas: 42,
		acumuladoDespachos: 230,
		acumuladoMunicipios: 38,
		acumuladoToneladas: 396
	},
	{
		dia: "19",
		despachos: 11,
		municipiosDelDia: 10,
		toneladas: 19,
		acumuladoDespachos: 241,
		acumuladoMunicipios: 39,
		acumuladoToneladas: 415
	},
	{
		dia: "20",
		despachos: 11,
		municipiosDelDia: 10,
		toneladas: 19,
		acumuladoDespachos: 252,
		acumuladoMunicipios: 39,
		acumuladoToneladas: 434
	},
	{
		dia: "21",
		despachos: 21,
		municipiosDelDia: 16,
		toneladas: 37,
		acumuladoDespachos: 273,
		acumuladoMunicipios: 39,
		acumuladoToneladas: 471
	},
	{
		dia: "22",
		despachos: 19,
		municipiosDelDia: 13,
		toneladas: 33,
		acumuladoDespachos: 292,
		acumuladoMunicipios: 39,
		acumuladoToneladas: 504
	},
	{
		dia: "24",
		despachos: 13,
		municipiosDelDia: 12,
		toneladas: 23,
		acumuladoDespachos: 305,
		acumuladoMunicipios: 39,
		acumuladoToneladas: 527
	},
	{
		dia: "25",
		despachos: 2,
		municipiosDelDia: 2,
		toneladas: 4,
		acumuladoDespachos: 307,
		acumuladoMunicipios: 39,
		acumuladoToneladas: 531
	}
];
var municipiosNuevosPorDia = [
	{
		dia: "11 de agosto",
		cantidad: 5,
		nombres: [
			"El Cerrito",
			"El Águila",
			"La Unión",
			"Toro",
			"Versalles"
		]
	},
	{
		dia: "12 de agosto",
		cantidad: 28,
		nombres: [
			"Alcalá",
			"Andalucía",
			"Ansermanuevo",
			"Argelia",
			"Bolívar",
			"Buenaventura",
			"Bugalagrande",
			"Caicedonia",
			"Calima",
			"Dagua",
			"El Cairo",
			"El Dovio",
			"Ginebra",
			"Jamundí",
			"La Cumbre",
			"La Victoria",
			"Obando",
			"Palmira",
			"Restrepo",
			"Riofrío",
			"Roldanillo",
			"San Pedro",
			"Sevilla",
			"Ulloa",
			"Vijes",
			"Yotoco",
			"Yumbo",
			"Zarzal"
		]
	},
	{
		dia: "13 de agosto",
		cantidad: 3,
		nombres: [
			"Buga",
			"Guacarí",
			"Trujillo"
		]
	},
	{
		dia: "17 de agosto",
		cantidad: 1,
		nombres: ["Tuluá"]
	},
	{
		dia: "18 de agosto",
		cantidad: 1,
		nombres: ["Pradera"]
	},
	{
		dia: "19 de agosto",
		cantidad: 1,
		nombres: ["Cartago"]
	}
];
var movimientoStats = {
	pico: {
		valor: 56,
		nota: "El 12 de agosto, hacia 32 municipios."
	},
	promedioPorJornada: 21.9,
	porcentajePrimeras48h: 20,
	despachosDesdeCartago: 35
};
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
	const [territoryMode, setTerritoryMode] = (0, import_react.useState)("acumulado");
	const [territoryDay, setTerritoryDay] = (0, import_react.useState)(TERRITORY_DAYS[0] ?? "11");
	const [territoryZone, setTerritoryZone] = (0, import_react.useState)("todas");
	const [routesMode, setRoutesMode] = (0, import_react.useState)("visibles");
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
	const flujosParaMapa = useFlujosAsOf(flujosResponse?.flujos, viewState.timelineDate);
	const totalDespachosAsOf = (0, import_react.useMemo)(() => flujosParaMapa.reduce((sum, f) => sum + f.despachosCount, 0), [flujosParaMapa]);
	const totalToneladasAsOf = (0, import_react.useMemo)(() => {
		if (!viewState.timelineDate) return jornadas.at(-1)?.acumuladoToneladas ?? 0;
		const day = viewState.timelineDate.slice(-2);
		return jornadas.find((j) => j.dia === day)?.acumuladoToneladas ?? 0;
	}, [viewState.timelineDate]);
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
	* Control de aparición de las notificaciones.
	*
	* El engine puede producir varios frames mientras siguen llegando despachos.
	* Si una tarjeta acaba de aparecer, no la reemplazamos durante 1200 ms.
	* Esto evita el parpadeo y hace que la notificación se sienta más efímera,
	* tipo Instagram Story.
	*/
	(0, import_react.useEffect)(() => {
		if (!viewState.timelineInstant) return;
		setViewState((prev) => viewTransitions.clearInstantFlag(prev));
	}, [viewState.timelineInstant, viewState.timelineDate]);
	const hayPanelAbiertoEnMobile = isMobile && (viewState.destinoId || viewState.origenId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: embedded ? "theme-ayudas relative h-full min-h-[720px] w-full overflow-hidden bg-background" : "theme-ayudas relative h-dvh w-dvw overflow-hidden bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientOnly, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 flex items-center justify-center bg-[#0b0e14] text-xs text-muted-foreground",
				children: "Cargando mapa…"
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelineStatsHUD, {
				totalDespachos: totalDespachosAsOf,
				totalToneladas: totalToneladasAsOf,
				currentDate: viewState.timelineDate,
				instant: viewState.timelineInstant
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopBar, {
				viewState,
				seleccionNombre,
				onGoToAll: () => {
					setLinesDismissed(false);
					setViewState((prev) => viewTransitions.toAll(prev));
				}
			}),
			!viewState.destinoId && !viewState.origenId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlujosLegend, { compact: isMobile }),
			!hayPanelAbiertoEnMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TerritoryControls, {
				mode: territoryMode,
				day: territoryDay,
				zone: territoryZone,
				routesMode,
				onModeChange: setTerritoryMode,
				onDayChange: setTerritoryDay,
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
				className: "pointer-events-none absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 flex justify-center px-4",
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
var ZONES = [
	"todas",
	"Norte",
	"Centro",
	"Sur",
	"Pacífico"
];
function TerritoryControls({ mode, day, zone, routesMode, onModeChange, onDayChange, onZoneChange, onRoutesModeChange }) {
	const dayIndex = Math.max(0, TERRITORY_DAYS.indexOf(day));
	const activeDayStat = jornadas.find((j) => j.dia === day);
	const visibleMunicipalities = zone === "todas" ? territoryMunicipalities : territoryMunicipalities.filter((m) => m.zone === zone);
	const totalDespachos = visibleMunicipalities.reduce((sum, m) => sum + (mode === "acumulado" ? m.despachos : m.dias[day] ?? 0), 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "pointer-events-auto absolute left-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-10 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-border bg-surface/95 p-3 shadow-sm backdrop-blur",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "label-caps text-[10px]",
					children: "Territorio"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm font-semibold text-foreground",
					children: [
						totalDespachos.toLocaleString("es-CO"),
						" despachos · ",
						visibleMunicipalities.length,
						" municipios"
					]
				})] }), activeDayStat && mode === "jornada" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-right",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "label-caps text-[10px]",
						children: "Toneladas"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-lg font-semibold tabular-nums text-foreground",
						children: [activeDayStat.toneladas, " t"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid grid-cols-2 gap-1 rounded-md bg-background/70 p-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
					active: mode === "acumulado",
					onClick: () => onModeChange("acumulado"),
					children: "Acumulado"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
					active: mode === "jornada",
					onClick: () => onModeChange("jornada"),
					children: "Por jornada"
				})]
			}),
			mode === "jornada" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-1.5 flex justify-between text-[11px] text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						"Día ",
						day,
						" de agosto"
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [activeDayStat?.despachos ?? 0, " despachos"] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "range",
					min: 0,
					max: TERRITORY_DAYS.length - 1,
					step: 1,
					value: dayIndex,
					onChange: (event) => onDayChange(TERRITORY_DAYS[Number(event.target.value)] ?? day),
					"aria-label": "Día de jornada para colorear municipios",
					className: "h-1 w-full accent-primary"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-wrap gap-1.5",
				children: ZONES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
					active: zone === item,
					onClick: () => onZoneChange(item),
					children: item === "todas" ? "Todas" : item
				}, item))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid grid-cols-3 gap-1 rounded-md bg-background/70 p-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
						active: routesMode === "visibles",
						onClick: () => onRoutesModeChange("visibles"),
						children: "Rutas visibles"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
						active: routesMode === "solo",
						onClick: () => onRoutesModeChange("solo"),
						children: "Solo selección"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
						active: routesMode === "color",
						onClick: () => onRoutesModeChange("color"),
						children: "Solo color"
					})
				]
			})
		]
	});
}
function ToggleButton({ active, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: `rounded px-2 py-1.5 text-[11px] font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"}`,
		children
	});
}
var features = {
	type: "FeatureCollection",
	features: [
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76001",
				"name": "CALI"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.49136, 3.50601],
					[-76.47544, 3.45147],
					[-76.46075, 3.32876],
					[-76.49258, 3.2891],
					[-76.55868, 3.2829],
					[-76.60765, 3.31389],
					[-76.69579, 3.31141],
					[-76.70191, 3.35603],
					[-76.70681, 3.42792],
					[-76.6505, 3.46635],
					[-76.59541, 3.54815],
					[-76.59174, 3.54691],
					[-76.54767, 3.49981],
					[-76.49136, 3.50601]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76036",
				"name": "ANDALUCÍA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.07147, 4.08856],
					[-76.17185, 4.11955],
					[-76.2453, 4.16789],
					[-76.24897, 4.184],
					[-76.23551, 4.21375],
					[-76.15104, 4.18276],
					[-76.07147, 4.08856]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76041",
				"name": "ANSERMANUEVO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.98945, 4.88058],
					[-75.91478, 4.87314],
					[-75.93559, 4.80745],
					[-75.96375, 4.80125],
					[-76.01639, 4.69218],
					[-76.08861, 4.73556],
					[-76.14737, 4.78514],
					[-76.1388, 4.84092],
					[-76.13758, 4.8434],
					[-76.07147, 4.8372],
					[-75.98945, 4.88058]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76054",
				"name": "ARGELIA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.08861, 4.73556],
					[-76.12289, 4.65128],
					[-76.19389, 4.68227],
					[-76.14737, 4.78514],
					[-76.08861, 4.73556]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76111",
				"name": "GUADALAJARA DE BUGA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.31263, 3.99312],
					[-76.22694, 3.93239],
					[-76.14125, 3.90388],
					[-76.10085, 3.95718],
					[-76.08371, 3.90636],
					[-75.99802, 3.89396],
					[-75.87316, 3.92619],
					[-75.8499, 3.889],
					[-75.91723, 3.74894],
					[-75.95518, 3.71424],
					[-75.99925, 3.75638],
					[-76.08249, 3.77002],
					[-76.10452, 3.81959],
					[-76.17797, 3.80472],
					[-76.27713, 3.83819],
					[-76.37261, 3.81216],
					[-76.31263, 3.99312]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76113",
				"name": "BUGALAGRANDE"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.0372, 4.25589],
					[-75.95395, 4.17656],
					[-76.0017, 4.10219],
					[-76.07147, 4.08856],
					[-76.15104, 4.18276],
					[-76.23551, 4.21375],
					[-76.21225, 4.25961],
					[-76.17185, 4.31786],
					[-76.08371, 4.24349],
					[-76.0372, 4.25589]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76122",
				"name": "CAICEDONIA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.80338, 4.39595],
					[-75.79237, 4.33769],
					[-75.79481, 4.31042],
					[-75.82542, 4.21499],
					[-75.89275, 4.29927],
					[-75.8548, 4.36372],
					[-75.86704, 4.41082],
					[-75.80338, 4.39595]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76126",
				"name": "CALIMA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.4987, 4.06377],
					[-76.41546, 4.00923],
					[-76.42403, 3.9423],
					[-76.47789, 3.86546],
					[-76.56113, 3.8481],
					[-76.59296, 3.86298],
					[-76.71415, 3.84191],
					[-76.81453, 3.87537],
					[-76.88798, 3.99312],
					[-76.85983, 4.0303],
					[-76.6811, 3.96461],
					[-76.62479, 4.01543],
					[-76.58929, 3.99312],
					[-76.4987, 4.06377]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76130",
				"name": "CANDELARIA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.2906, 3.4713],
					[-76.32977, 3.3833],
					[-76.30039, 3.36595],
					[-76.34323, 3.28166],
					[-76.3518, 3.28662],
					[-76.46075, 3.32876],
					[-76.47544, 3.45147],
					[-76.37506, 3.45023],
					[-76.2906, 3.4713]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76147",
				"name": "CARTAGO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.93559, 4.80745],
					[-75.85602, 4.72813],
					[-75.85602, 4.71325],
					[-75.82787, 4.65995],
					[-75.86581, 4.61286],
					[-75.97232, 4.66739],
					[-76.01639, 4.66615],
					[-76.01639, 4.69218],
					[-75.96375, 4.80125],
					[-75.93559, 4.80745]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76243",
				"name": "EL ÁGUILA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.99068, 4.91281],
					[-75.98945, 4.88058],
					[-76.07147, 4.8372],
					[-76.13758, 4.8434],
					[-76.08861, 4.94627],
					[-76.07759, 5.04667],
					[-76.0274, 4.93884],
					[-75.99068, 4.91281]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76246",
				"name": "EL CAIRO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.14737, 4.78514],
					[-76.19389, 4.68227],
					[-76.29794, 4.69838],
					[-76.31263, 4.75044],
					[-76.21103, 4.82976],
					[-76.1388, 4.84092],
					[-76.14737, 4.78514]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76248",
				"name": "EL CERRITO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.95518, 3.71424],
					[-75.96007, 3.70432],
					[-76.00659, 3.71672],
					[-76.08983, 3.62128],
					[-76.24163, 3.62128],
					[-76.29304, 3.60269],
					[-76.36772, 3.62748],
					[-76.42648, 3.69441],
					[-76.40077, 3.74027],
					[-76.3971, 3.76258],
					[-76.3212, 3.7068],
					[-76.20123, 3.66218],
					[-76.12411, 3.68821],
					[-76.08249, 3.77002],
					[-75.99925, 3.75638],
					[-75.95518, 3.71424]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76250",
				"name": "EL DOVIO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.18532, 4.54592],
					[-76.16573, 4.51246],
					[-76.26856, 4.48147],
					[-76.36527, 4.49263],
					[-76.30039, 4.65376],
					[-76.28325, 4.59426],
					[-76.22204, 4.60294],
					[-76.18532, 4.54592]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76275",
				"name": "FLORIDA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.06168, 3.35479],
					[-76.03842, 3.3015],
					[-76.05556, 3.22341],
					[-76.19144, 3.22713],
					[-76.22939, 3.27671],
					[-76.34323, 3.28166],
					[-76.30039, 3.36595],
					[-76.18165, 3.35727],
					[-76.08861, 3.38826],
					[-76.06168, 3.35479]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76306",
				"name": "GINEBRA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.08249, 3.77002],
					[-76.12411, 3.68821],
					[-76.20123, 3.66218],
					[-76.3212, 3.7068],
					[-76.30284, 3.7601],
					[-76.22082, 3.76878],
					[-76.17797, 3.80472],
					[-76.10452, 3.81959],
					[-76.08249, 3.77002]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76318",
				"name": "GUACARÍ"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.17797, 3.80472],
					[-76.22082, 3.76878],
					[-76.30284, 3.7601],
					[-76.3212, 3.7068],
					[-76.3971, 3.76258],
					[-76.37261, 3.81216],
					[-76.27713, 3.83819],
					[-76.17797, 3.80472]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76020",
				"name": "ALCALÁ"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.70912, 4.67979],
					[-75.74095, 4.655],
					[-75.82787, 4.65995],
					[-75.85602, 4.71325],
					[-75.70912, 4.67979]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76497",
				"name": "OBANDO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.86581, 4.61286],
					[-75.86704, 4.57567],
					[-75.8805, 4.53105],
					[-75.96375, 4.53105],
					[-76.03108, 4.56947],
					[-76.03842, 4.58311],
					[-76.01639, 4.66615],
					[-75.97232, 4.66739],
					[-75.86581, 4.61286]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76520",
				"name": "PALMIRA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.96007, 3.70432],
					[-75.99313, 3.60888],
					[-75.98456, 3.55931],
					[-76.0372, 3.45271],
					[-76.12166, 3.47626],
					[-76.2906, 3.4713],
					[-76.37506, 3.45023],
					[-76.47544, 3.45147],
					[-76.49136, 3.50601],
					[-76.42648, 3.68077],
					[-76.42648, 3.69441],
					[-76.36772, 3.62748],
					[-76.29304, 3.60269],
					[-76.24163, 3.62128],
					[-76.08983, 3.62128],
					[-76.00659, 3.71672],
					[-75.96007, 3.70432]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76563",
				"name": "PRADERA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.0372, 3.45271],
					[-76.06168, 3.35479],
					[-76.08861, 3.38826],
					[-76.18165, 3.35727],
					[-76.30039, 3.36595],
					[-76.32977, 3.3833],
					[-76.2906, 3.4713],
					[-76.12166, 3.47626],
					[-76.0372, 3.45271]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76606",
				"name": "RESTREPO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.47789, 3.86546],
					[-76.4681, 3.83075],
					[-76.53665, 3.74894],
					[-76.60275, 3.75142],
					[-76.56113, 3.8481],
					[-76.47789, 3.86546]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76616",
				"name": "RIOFRÍO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.24897, 4.184],
					[-76.2453, 4.16789],
					[-76.30284, 4.06749],
					[-76.41546, 4.00923],
					[-76.4987, 4.06377],
					[-76.44851, 4.16169],
					[-76.34813, 4.15921],
					[-76.3261, 4.19515],
					[-76.24897, 4.184]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76622",
				"name": "ROLDANILLO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.16573, 4.51246],
					[-76.06535, 4.49263],
					[-76.06902, 4.45544],
					[-76.14859, 4.3724],
					[-76.25632, 4.40215],
					[-76.26856, 4.48147],
					[-76.16573, 4.51246]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76670",
				"name": "SAN PEDRO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.10085, 3.95718],
					[-76.14125, 3.90388],
					[-76.22694, 3.93239],
					[-76.31263, 3.99312],
					[-76.30039, 4.0489],
					[-76.16206, 4.02287],
					[-76.10085, 3.95718]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76736",
				"name": "SEVILLA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.86704, 4.41082],
					[-75.8548, 4.36372],
					[-75.89275, 4.29927],
					[-75.82542, 4.21499],
					[-75.84011, 4.10095],
					[-75.75197, 4.0774],
					[-75.74585, 4.0427],
					[-75.82297, 3.90512],
					[-75.8548, 4.05014],
					[-75.90132, 4.08484],
					[-75.91356, 4.17532],
					[-75.95395, 4.17656],
					[-76.0372, 4.25589],
					[-76.02128, 4.30175],
					[-75.95395, 4.3253],
					[-75.95151, 4.3724],
					[-75.87806, 4.40958],
					[-75.86704, 4.41082]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76823",
				"name": "TORO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.01639, 4.69218],
					[-76.01639, 4.66615],
					[-76.03842, 4.58311],
					[-76.15104, 4.57567],
					[-76.12289, 4.65128],
					[-76.08861, 4.73556],
					[-76.01639, 4.69218]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76828",
				"name": "TRUJILLO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.21225, 4.25961],
					[-76.23551, 4.21375],
					[-76.24897, 4.184],
					[-76.3261, 4.19515],
					[-76.34813, 4.15921],
					[-76.44851, 4.16169],
					[-76.45463, 4.22986],
					[-76.40689, 4.29927],
					[-76.29672, 4.29431],
					[-76.21225, 4.25961]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76834",
				"name": "TULUÁ"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.82297, 3.90512],
					[-75.8499, 3.889],
					[-75.87316, 3.92619],
					[-75.99802, 3.89396],
					[-76.08371, 3.90636],
					[-76.10085, 3.95718],
					[-76.16206, 4.02287],
					[-76.30039, 4.0489],
					[-76.30284, 4.06749],
					[-76.2453, 4.16789],
					[-76.17185, 4.11955],
					[-76.07147, 4.08856],
					[-76.0017, 4.10219],
					[-75.95395, 4.17656],
					[-75.91356, 4.17532],
					[-75.90132, 4.08484],
					[-75.8548, 4.05014],
					[-75.82297, 3.90512]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76845",
				"name": "ULLOA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.71402, 4.71325],
					[-75.70912, 4.67979],
					[-75.85602, 4.71325],
					[-75.85602, 4.72813],
					[-75.71402, 4.71325]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76863",
				"name": "VERSALLES"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.19389, 4.68227],
					[-76.12289, 4.65128],
					[-76.15104, 4.57567],
					[-76.18532, 4.54592],
					[-76.22204, 4.60294],
					[-76.28325, 4.59426],
					[-76.30039, 4.65376],
					[-76.29794, 4.69838],
					[-76.19389, 4.68227]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76869",
				"name": "VIJES"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.40077, 3.74027],
					[-76.42648, 3.69441],
					[-76.42648, 3.68077],
					[-76.50605, 3.69937],
					[-76.53665, 3.74894],
					[-76.4681, 3.83075],
					[-76.44484, 3.74647],
					[-76.40077, 3.74027]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76890",
				"name": "YOTOCO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.30039, 4.0489],
					[-76.31263, 3.99312],
					[-76.37261, 3.81216],
					[-76.3971, 3.76258],
					[-76.40077, 3.74027],
					[-76.44484, 3.74647],
					[-76.4681, 3.83075],
					[-76.47789, 3.86546],
					[-76.42403, 3.9423],
					[-76.41546, 4.00923],
					[-76.30284, 4.06749],
					[-76.30039, 4.0489]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76892",
				"name": "YUMBO"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.42648, 3.68077],
					[-76.49136, 3.50601],
					[-76.54767, 3.49981],
					[-76.59174, 3.54691],
					[-76.50605, 3.69937],
					[-76.42648, 3.68077]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76895",
				"name": "ZARZAL"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.89519, 4.4257],
					[-75.87806, 4.40958],
					[-75.95151, 4.3724],
					[-75.95395, 4.3253],
					[-76.02128, 4.30175],
					[-76.0372, 4.25589],
					[-76.08371, 4.24349],
					[-76.17185, 4.31786],
					[-76.14859, 4.3724],
					[-76.06902, 4.45544],
					[-76.03842, 4.46536],
					[-75.95763, 4.40215],
					[-75.89519, 4.4257]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76403",
				"name": "LA VICTORIA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-75.8805, 4.53105],
					[-75.86949, 4.4542],
					[-75.89519, 4.4257],
					[-75.95763, 4.40215],
					[-76.03842, 4.46536],
					[-76.06902, 4.45544],
					[-76.06535, 4.49263],
					[-76.03108, 4.56947],
					[-75.96375, 4.53105],
					[-75.8805, 4.53105]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76400",
				"name": "LA UNIÓN"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.03842, 4.58311],
					[-76.03108, 4.56947],
					[-76.06535, 4.49263],
					[-76.16573, 4.51246],
					[-76.18532, 4.54592],
					[-76.15104, 4.57567],
					[-76.03842, 4.58311]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76377",
				"name": "LA CUMBRE"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.56113, 3.8481],
					[-76.60275, 3.75142],
					[-76.53665, 3.74894],
					[-76.50605, 3.69937],
					[-76.59174, 3.54691],
					[-76.59541, 3.54815],
					[-76.64927, 3.63243],
					[-76.64437, 3.78489],
					[-76.59296, 3.86298],
					[-76.56113, 3.8481]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76364",
				"name": "JAMUNDÍ"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.49258, 3.2891],
					[-76.46075, 3.25935],
					[-76.5036, 3.14408],
					[-76.55746, 3.10194],
					[-76.67743, 3.09946],
					[-76.74965, 3.14656],
					[-76.7827, 3.23085],
					[-76.70191, 3.35603],
					[-76.69579, 3.31141],
					[-76.60765, 3.31389],
					[-76.55868, 3.2829],
					[-76.49258, 3.2891]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76100",
				"name": "BOLÍVAR"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.26856, 4.48147],
					[-76.25632, 4.40215],
					[-76.14859, 4.3724],
					[-76.17185, 4.31786],
					[-76.21225, 4.25961],
					[-76.29672, 4.29431],
					[-76.40689, 4.29927],
					[-76.45463, 4.22986],
					[-76.48768, 4.23606],
					[-76.54889, 4.33769],
					[-76.5391, 4.39595],
					[-76.48156, 4.41454],
					[-76.36527, 4.49263],
					[-76.26856, 4.48147]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76233",
				"name": "DAGUA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.59296, 3.86298],
					[-76.64437, 3.78489],
					[-76.64927, 3.63243],
					[-76.59541, 3.54815],
					[-76.6505, 3.46635],
					[-76.70681, 3.42792],
					[-76.74843, 3.43412],
					[-76.85493, 3.56426],
					[-76.79372, 3.66466],
					[-76.82188, 3.70556],
					[-76.77536, 3.76258],
					[-76.81453, 3.87537],
					[-76.71415, 3.84191],
					[-76.59296, 3.86298]
				]]]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"municipalityCode": "76109",
				"name": "BUENAVENTURA"
			},
			"geometry": {
				"type": "MultiPolygon",
				"coordinates": [[[
					[-76.85983, 4.0303],
					[-76.88798, 3.99312],
					[-76.81453, 3.87537],
					[-76.77536, 3.76258],
					[-76.82188, 3.70556],
					[-76.79372, 3.66466],
					[-76.85493, 3.56426],
					[-76.74843, 3.43412],
					[-76.70681, 3.42792],
					[-76.70191, 3.35603],
					[-76.7827, 3.23085],
					[-76.78882, 3.21845],
					[-76.90879, 3.2011],
					[-76.93817, 3.11434],
					[-76.99815, 3.15524],
					[-77.10098, 3.18499],
					[-77.1781, 3.15648],
					[-77.23442, 3.10814],
					[-77.31643, 3.17383],
					[-77.34704, 3.14037],
					[-77.43028, 3.2544],
					[-77.49761, 3.21597],
					[-77.55025, 3.23085],
					[-77.48047, 3.32257],
					[-77.33724, 3.44775],
					[-77.36662, 3.4837],
					[-77.30052, 3.57046],
					[-77.2283, 3.58286],
					[-77.18423, 3.65475],
					[-77.19769, 3.74647],
					[-77.18055, 3.83199],
					[-77.28338, 3.84191],
					[-77.31766, 3.94974],
					[-77.21238, 4.00923],
					[-77.24298, 4.0836],
					[-77.31399, 4.02907],
					[-77.35928, 3.92619],
					[-77.44987, 4.03898],
					[-77.35316, 4.19763],
					[-77.30664, 4.16541],
					[-77.15852, 4.18276],
					[-77.04957, 4.09476],
					[-76.99448, 4.12079],
					[-76.91491, 4.096],
					[-76.85983, 4.0303]
				]]]
			}
		}
	]
}.features ?? [];
function getRings(feature) {
	if (!feature.geometry) return [];
	if (feature.geometry.type === "Polygon") return feature.geometry.coordinates;
	return feature.geometry.coordinates.flat();
}
var allPoints = features.flatMap((feature) => getRings(feature).flat());
var lngs = allPoints.map(([lng]) => lng);
var lats = allPoints.map(([, lat]) => lat);
var minLng = Math.min(...lngs);
var maxLng = Math.max(...lngs);
var minLat = Math.min(...lats);
var maxLat = Math.max(...lats);
function project([lng, lat]) {
	const x = (lng - minLng) / (maxLng - minLng) * 86 + 7;
	const y = (maxLat - lat) / (maxLat - minLat) * 92 + 4;
	return `${x.toFixed(2)},${y.toFixed(2)}`;
}
function ValleGlyph({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		className,
		viewBox: "0 0 100 100",
		role: "img",
		"aria-label": "Silueta del Valle del Cauca",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
				id: "valle-glyph-fill",
				x1: "0",
				x2: "1",
				y1: "0",
				y2: "1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "0",
						stopColor: "#C6ECFB"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "0.52",
						stopColor: "#3E9BCB"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "1",
						stopColor: "#00578C"
					})
				]
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				width: "100",
				height: "100",
				rx: "8",
				fill: "#0B2233"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", { children: features.flatMap((feature) => getRings(feature).map((ring, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
				points: ring.map(project).join(" "),
				fill: "url(#valle-glyph-fill)",
				fillOpacity: feature.properties?.name === "CALI" ? .34 : .82,
				stroke: "#0B2233",
				strokeWidth: "0.38",
				strokeLinejoin: "round"
			}, `${feature.properties?.municipalityCode ?? feature.properties?.name ?? "mun"}-${index}`))) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M17 79 C35 65, 38 46, 52 33 S72 19, 83 8",
				fill: "none",
				stroke: "#FFD103",
				strokeWidth: "1.8",
				strokeLinecap: "round",
				opacity: "0.82"
			})
		]
	});
}
var CIRCUMFERENCE = 326.7;
var panoramaDonuts = [
	{
		id: "municipios",
		value: 39,
		total: 41,
		label: "Municipios atendidos",
		color: "#039A39"
	},
	{
		id: "requerimientos-radicados",
		value: 38,
		total: 41,
		label: "Con requerimientos radicados",
		color: "#7F207F"
	},
	{
		id: "requerimientos-accion",
		value: 72,
		total: 199,
		label: "Requerimientos con acción registrada",
		color: "#F0B102"
	},
	{
		id: "jornadas",
		value: 14,
		total: 15,
		label: "Días con despacho, del 11 al 25",
		color: "#81C8EC"
	}
];
var puenteSteps = [
	{
		id: "base",
		kind: "base",
		label: "Documentos catalogados en el Drive",
		delta: 414
	},
	{
		id: "propio-canal",
		kind: "resta",
		label: "Carpetas que van por su propio canal",
		delta: -113,
		detail: [
			{
				label: "Cali",
				value: 56,
				note: "Excluida del consolidado por instrucción expresa"
			},
			{
				label: "Centro de acopio Cartago",
				value: 35,
				note: "Bodega: es la misma ayuda vista desde el origen"
			},
			{
				label: "Casos especiales",
				value: 19,
				note: "Entregas a instituciones, no a un municipio"
			},
			{
				label: "Inciva",
				value: 1,
				note: "Entrega institucional"
			},
			{
				label: "Centro de Protección",
				value: 1,
				note: "Entrega institucional"
			},
			{
				label: "CHOCO",
				value: 1,
				note: "Fuera del Valle: suma como despacho, no como municipio"
			}
		]
	},
	{
		id: "formatos-conjuntos",
		kind: "resta",
		label: "Formatos conjuntos, contados por municipio",
		delta: -7,
		detail: [{
			label: "Municipios múltiples",
			value: 6,
			note: "Un formato que reparte a varios municipios"
		}, {
			label: "_RAIZ",
			value: 1,
			note: "Formato conjunto suelto en la raíz del Drive"
		}]
	},
	{
		id: "subtotal-1",
		kind: "subtotal",
		label: "Archivos en carpetas de municipio",
		delta: 294
	},
	{
		id: "reescaneos",
		kind: "resta",
		label: "Reescaneos del mismo despacho",
		delta: -3,
		detail: [
			{
				label: "Argelia",
				value: 1,
				note: "12_08_2026_ARGELIA"
			},
			{
				label: "Zarzal",
				value: 1,
				note: "12_08_2026_Zarzal"
			},
			{
				label: "Yotoco",
				value: 1,
				note: "13_08_2026_YOTOCO PDF.pdf"
			}
		]
	},
	{
		id: "subtotal-2",
		kind: "subtotal",
		label: "Despachos con documento propio",
		delta: 291
	},
	{
		id: "reparto-conjuntos",
		kind: "suma",
		label: "Entregas que reparten los 7 formatos conjuntos",
		delta: 15
	},
	{
		id: "subtotal-3",
		kind: "subtotal",
		label: "Despachos municipales",
		delta: 306
	},
	{
		id: "choco",
		kind: "suma",
		label: "Despacho fuera del Valle (Chocó)",
		delta: 1
	},
	{
		id: "total",
		kind: "total",
		label: "DESPACHOS DOCUMENTADOS",
		delta: 307
	}
];
function Donut({ value, total, label, color }) {
	const dash = (total > 0 ? value / total : 0) * CIRCUMFERENCE;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col items-center text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 128 128",
			className: "h-28 w-28",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "64",
					cy: "64",
					r: "52",
					fill: "none",
					stroke: "#E4E7EA",
					strokeWidth: "13"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "64",
					cy: "64",
					r: "52",
					fill: "none",
					stroke: color,
					strokeWidth: "13",
					strokeLinecap: "round",
					strokeDasharray: `${dash.toFixed(1)} ${CIRCUMFERENCE}`,
					transform: "rotate(-90 64 64)"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: "64",
					y: "60",
					textAnchor: "middle",
					className: "fill-[#0B2233] font-serif text-[27px]",
					children: value
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
					x: "64",
					y: "80",
					textAnchor: "middle",
					className: "fill-[#7E9AAD] text-[10.5px]",
					children: ["de ", total]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mt-1 max-w-[10rem] text-xs text-[#4E6B7C]",
			children: label
		})]
	});
}
function PanoramaDonuts() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-10 grid grid-cols-2 gap-6 rounded-lg border border-[#00578C]/12 bg-white p-6 md:grid-cols-4",
		children: panoramaDonuts.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Donut, {
			value: d.value,
			total: d.total,
			label: d.label,
			color: d.color
		}, d.id))
	});
}
function signedLabel(row) {
	if (row.kind === "resta") return row.delta.toString();
	if (row.kind === "suma") return `+${row.delta}`;
	return row.delta.toLocaleString("es-CO");
}
function rowStyles(kind) {
	switch (kind) {
		case "resta": return "text-[#DC3514]";
		case "suma": return "text-[#039A39]";
		case "subtotal": return "bg-[#00578C]/5 rounded font-semibold";
		case "total": return "border-t-2 border-[#00578C] pt-3 mt-1 font-bold text-2xl text-[#00578C]";
		default: return "";
	}
}
function PanoramaPuente() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-10 rounded-lg border border-[#00578C]/12 bg-white p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mb-4 max-w-3xl text-sm leading-6 text-[#4E6B7C]",
			children: [
				"Cada despacho de este tablero tiene un documento detrás. No es una relación de uno a uno —un formato conjunto es varias entregas y un reescaneo no es ninguna— así que la cuenta va paso a paso.",
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
					className: "text-[#0B2233]",
					children: "Si esta suma no cuadra, el tablero no se genera."
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "divide-y divide-[#00578C]/10",
			children: puenteSteps.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `px-2 py-2.5 ${rowStyles(row.kind)}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-baseline justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: row.kind === "total" ? "text-xs font-bold uppercase tracking-[0.12em] text-[#00578C]" : "text-sm text-[#315A70]",
						children: row.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "shrink-0 font-serif tabular-nums",
						children: signedLabel(row)
					})]
				}), row.detail && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-1.5 flex flex-wrap gap-1.5",
					children: row.detail.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "rounded-full bg-[#00578C]/5 px-2.5 py-1 text-[11px] text-[#5E7789]",
						title: d.note,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
								className: "text-[#315A70]",
								children: d.value
							}),
							" ",
							d.label
						]
					}, d.label))
				})]
			}, row.id))
		})]
	});
}
var WIDTH = 1e3;
var HEIGHT = 300;
var PAD_LEFT = 58;
function AcumuladoChart() {
	const maxAcum = Math.max(...jornadas.map((j) => j.acumuladoDespachos));
	const plotW = 926;
	const plotH = 240;
	const xFor = (i) => PAD_LEFT + i / (jornadas.length - 1) * plotW;
	const yFor = (value) => 266 - value / maxAcum * plotH;
	const linePath = jornadas.map((j, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)} ${yFor(j.acumuladoDespachos).toFixed(1)}`).join("");
	const areaPath = `${linePath} L${xFor(jornadas.length - 1).toFixed(1)} 266 L${xFor(0).toFixed(1)} 266 Z`;
	const gridValues = [
		0,
		Math.round(maxAcum / 2),
		maxAcum
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-lg border border-[#00578C]/12 bg-white p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
			className: "w-full",
			role: "img",
			"aria-label": "Despachos acumulados por jornada",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
					id: "acumulado-fill",
					x1: "0",
					y1: "0",
					x2: "0",
					y2: "1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "0",
						stopColor: "#006BAC",
						stopOpacity: "0.3"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "1",
						stopColor: "#006BAC",
						stopOpacity: "0.02"
					})]
				}) }),
				gridValues.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: PAD_LEFT,
					x2: 984,
					y1: yFor(v),
					y2: yFor(v),
					stroke: "#00578C",
					strokeOpacity: "0.08"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: 49,
					y: yFor(v) + 3.6,
					textAnchor: "end",
					className: "fill-[#7E9AAD] text-[11px]",
					children: v
				})] }, v)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: areaPath,
					fill: "url(#acumulado-fill)"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: linePath,
					fill: "none",
					stroke: "#00578C",
					strokeWidth: "2.6",
					strokeLinejoin: "round"
				}),
				jornadas.map((j, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: xFor(i),
					cy: yFor(j.acumuladoDespachos),
					r: i === jornadas.length - 1 ? 6.4 : 4.2,
					fill: "#00578C",
					stroke: "#F7FBFD",
					strokeWidth: i === jornadas.length - 1 ? 2.4 : 1.6,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("title", { children: `Al ${j.dia} de agosto · ${j.acumuladoDespachos} despachos acumulados · ${j.acumuladoToneladas} t` })
				}, j.dia)),
				jornadas.map((j, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: xFor(i),
					y: 290,
					textAnchor: "middle",
					className: "fill-[#7E9AAD] text-[11px]",
					children: j.dia
				}, j.dia))
			]
		})
	});
}
function nuevosPara(dia) {
	return municipiosNuevosPorDia.find((m) => m.dia.startsWith(dia + " "))?.cantidad ?? null;
}
function JornadaBars() {
	const maxDespachos = Math.max(...jornadas.map((j) => j.despachos));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 rounded-lg border border-[#00578C]/12 bg-white p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-4 text-xs font-bold uppercase tracking-[0.1em] text-[#006A87]",
			children: "Despachos por jornada · en verde, municipios nuevos"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex h-56 items-end gap-2",
			children: jornadas.map((j) => {
				const nuevos = nuevosPara(j.dia);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-w-0 flex-1 flex-col items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-semibold text-[#315A70]",
							children: j.despachos
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-full rounded-t bg-[#00578C]",
							style: { height: `${Math.max(6, j.despachos / maxDespachos * 170)}px` },
							title: `${j.dia} de agosto · ${j.despachos} despachos · ${j.municipiosDelDia} municipios · ${j.toneladas} t`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-[#6E8B9E]",
							children: j.dia
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "h-4 text-[10.5px] font-bold text-[#039A39]",
							children: nuevos ? `+${nuevos}` : ""
						})
					]
				}, j.dia);
			})
		})]
	});
}
var statCards = [
	{
		big: movimientoStats.pico,
		label: "Pico de la operación",
		note: "El 12 de agosto, hacia 32 municipios.",
		color: "#F0801E"
	},
	{
		big: `${movimientoStats.promedioPorJornada}`,
		label: "Despachos por jornada",
		note: "Promedio de las 14 jornadas.",
		color: "#5CC46B"
	},
	{
		big: `${movimientoStats.porcentajePrimeras48h}%`,
		label: "Salió en las primeras 48 h",
		note: "61 despachos entre el 11 y el 12.",
		color: "#F0B102"
	},
	{
		big: movimientoStats.despachosDesdeCartago,
		label: "Despachos desde Cartago",
		note: "Segundo origen: 13 municipios del norte.",
		color: "#B57BB5"
	}
];
function MovimientoStatCards() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
		children: statCards.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-lg border border-[#00578C]/12 bg-white p-5",
			style: { borderLeft: `3px solid ${c.color}` },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-serif text-3xl text-[#0B2233]",
					children: typeof c.big === "object" ? c.big.valor : c.big
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs font-bold uppercase tracking-[0.06em] text-[#4E6B7C]",
					children: c.label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1.5 text-sm text-[#5E7789]",
					children: typeof c.big === "object" ? c.big.nota : c.note
				})
			]
		}, c.label))
	});
}
function MunicipiosNuevosCallouts() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-6 grid gap-4 md:grid-cols-3",
		children: municipiosNuevosPorDia.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-lg border-l-4 border-[#5CC46B] bg-white p-5 shadow-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-bold uppercase tracking-[0.06em] text-[#4E6B7C]",
					children: m.dia
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 font-serif text-2xl text-[#0B2233]",
					children: [
						"+",
						m.cantidad,
						" municipios"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm leading-6 text-[#5E7789]",
					children: m.nombres.join(", ")
				})
			]
		}, m.dia))
	});
}
var kpis = [
	{
		value: "307",
		label: "Despachos documentados",
		note: "306 municipales, 1 fuera del Valle"
	},
	{
		value: "39 / 41",
		label: "Municipios atendidos",
		note: "Cobertura territorial del 95%"
	},
	{
		value: "553 t",
		label: "Ayuda movilizada",
		note: "Estimado, 1,75 t por despacho"
	},
	{
		value: "256.650",
		label: "Unidades registradas",
		note: "6.111 renglones transcritos"
	}
];
var dailyDispatches = [
	["11", 5],
	["12", 56],
	["13", 38],
	["14", 21],
	["15", 23],
	["16", 16],
	["17", 45],
	["18", 26],
	["19", 11],
	["20", 11],
	["21", 21],
	["22", 19],
	["24", 13],
	["25", 2]
];
var categories = [
	[
		"Protección y seguridad",
		29100,
		"#F0801E"
	],
	[
		"Aseo personal",
		54038,
		"#3E9BCB"
	],
	[
		"Alimentos",
		27155,
		"#65AC56"
	],
	[
		"Descanso y abrigo",
		12800,
		"#B57BB5"
	],
	[
		"Líquidos e hidratación",
		23500,
		"#00A494"
	]
];
var channels = [
	{
		name: "Cali",
		subtitle: "Centro principal de acopio",
		value: 271,
		color: "#F0801E"
	},
	{
		name: "Cartago",
		subtitle: "Segundo origen para el norte",
		value: 35,
		color: "#B57BB5"
	},
	{
		name: "Externo",
		subtitle: "Entrega fuera del Valle",
		value: 1,
		color: "#00A494"
	}
];
var findings = [
	"El 20% de los despachos salió durante las primeras 48 horas.",
	"Dagua, Sevilla, Yotoco, Calima y Restrepo concentran los mayores volúmenes documentados.",
	"La lectura territorial combina entregas, municipios nuevos y requerimientos PMU."
];
function SectionLabel({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]",
		children
	});
}
function DownLink({ href, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
		href,
		"aria-label": label,
		className: "inline-flex size-10 items-center justify-center rounded-full border border-[#00578C]/20 bg-white text-[#00578C] shadow-sm transition hover:bg-[#E8F6FC]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
			className: "size-5",
			"aria-hidden": true
		})
	});
}
function StoryPage() {
	Math.max(...dailyDispatches.map(([, value]) => value));
	const maxCategory = Math.max(...categories.map(([, value]) => value));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "h-dvh overflow-y-auto scroll-smooth bg-[#F4F9FC] text-[#0B2233] [scroll-snap-type:y_mandatory]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "sticky top-0 z-50 border-b border-[#00578C]/10 bg-white/90 backdrop-blur",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex h-14 max-w-6xl items-center gap-4 overflow-x-auto px-5 text-xs font-semibold text-[#4E6B7C]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "shrink-0 font-serif text-sm text-[#00578C]",
							children: "SOR Valle del Cauca"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#panorama",
							className: "hover:text-[#00578C]",
							children: "Panorama"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#portal-mapa",
							className: "hover:text-[#00578C]",
							children: "Territorio"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#mapa-vivo",
							className: "hover:text-[#00578C]",
							children: "Mapa vivo"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#datos",
							className: "hover:text-[#00578C]",
							children: "Datos"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-auto shrink-0 text-[#6E8B9E]",
							children: "Corte 25 de agosto de 2026"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "inicio",
				className: "grid min-h-dvh snap-start place-items-center bg-[#EAF6FB] px-5 py-16",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-5xl flex-col items-center text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Sistema Operativo Regional" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "mt-6 font-serif text-6xl leading-[0.95] text-[#00578C] md:text-8xl",
							children: [
								"Ayudas humanitarias",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								"en el Valle del Cauca"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-8 max-w-3xl text-xl leading-9 text-[#315A70]",
							children: "Una visualización interactiva que muestra cómo se movilizaron las ayudas humanitarias durante la emergencia, desde los centros de acopio hasta los municipios atendidos."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-14",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DownLink, {
								href: "#panorama",
								label: "Explorar"
							})
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "panorama",
				className: "min-h-dvh snap-start bg-white px-5 py-20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Panorama" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-3 max-w-3xl font-serif text-4xl text-[#0B2233] md:text-5xl",
							children: "Catorce jornadas, 307 despachos y un departamento casi cubierto"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-10 grid gap-px overflow-hidden rounded-lg border border-[#00578C]/12 bg-[#00578C]/12 md:grid-cols-4",
							children: kpis.map((kpi) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-[#F7FBFD] p-6",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: "block font-serif text-4xl text-[#00578C]",
										children: kpi.value
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#4E6B7C]",
										children: kpi.label
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2 text-sm text-[#5E7789]",
										children: kpi.note
									})
								]
							}, kpi.label))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-14 space-y-12",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanoramaDonuts, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanoramaPuente, {})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-10",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DownLink, {
								href: "#movimiento",
								label: "Bajar al movimiento"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-10",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DownLink, {
								href: "#movimiento",
								label: "Bajar al movimiento"
							})
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "movimiento",
				className: "min-h-dvh snap-start bg-[#F4F9FC] px-5 py-20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Movimiento" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-3 max-w-3xl font-serif text-4xl md:text-5xl",
							children: "La operación tuvo un pico temprano y luego se estabilizó"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-10 space-y-12",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AcumuladoChart, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MovimientoStatCards, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JornadaBars, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MunicipiosNuevosCallouts, {})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-10",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DownLink, {
								href: "#portal-mapa",
								label: "Bajar al territorio"
							})
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "portal-mapa",
				className: "grid min-h-dvh snap-start place-items-center bg-[#0B2233] px-5 py-16 text-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.85fr_1fr]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "#mapa-vivo",
						className: "group block",
						"aria-label": "Abrir mapa interactivo",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ValleGlyph, { className: "aspect-square w-full rounded-lg ring-1 ring-white/15 transition duration-300 group-hover:scale-[1.02]" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Territorio" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-4 font-serif text-5xl leading-none text-white md:text-6xl",
							children: "El mapa entra como pieza central"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-6 max-w-xl text-lg leading-8 text-[#BBD6E6]",
							children: "Este símbolo usa los mismos límites municipales del mapa real. Al tocarlo o seguir bajando aparece el `MapCanvas` interactivo con rutas, timeline, paneles y selección por municipio."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: "#mapa-vivo",
							className: "mt-8 inline-flex items-center gap-2 rounded-md bg-[#81C8EC] px-4 py-2 text-sm font-bold text-[#06202F] transition hover:bg-white",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPinned, {
								className: "size-4",
								"aria-hidden": true
							}), "Entrar al mapa"]
						})
					] })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "mapa-vivo",
				className: "min-h-[120dvh] snap-start bg-[#0B2233]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "sticky top-0 h-dvh",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardPage, { embedded: true })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "datos",
				className: "min-h-dvh snap-start bg-white px-5 py-20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.9fr]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Ayuda entregada" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-3 font-serif text-4xl md:text-5xl",
							children: "Composición por categorías principales"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-8 space-y-4",
							children: categories.map(([name, value, color]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between gap-4 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-serif text-lg",
									children: value.toLocaleString("es-CO")
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2 h-2 rounded-full bg-[#E6F0F7]",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-full rounded-full",
									style: {
										width: `${value / maxCategory * 100}%`,
										background: color
									}
								})
							})] }, name))
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-[#00578C]/12 bg-[#F7FBFD] p-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Canales" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-6 grid gap-4",
							children: channels.map((channel) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "border-l-4 bg-white p-4 shadow-sm",
								style: { borderColor: channel.color },
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
										className: "font-serif text-3xl text-[#00578C]",
										children: channel.value
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 font-bold",
										children: channel.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-[#5E7789]",
										children: channel.subtitle
									})
								]
							}, channel.name))
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "hallazgos",
				className: "min-h-dvh snap-start bg-[#0B2233] px-5 py-20 text-white",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Lectura ejecutiva" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-3 max-w-3xl font-serif text-4xl md:text-5xl",
							children: "Hallazgos para orientar la conversación"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-10 grid gap-4 md:grid-cols-3",
							children: findings.map((finding, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "rounded-lg border border-white/12 bg-white/6 p-6",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-serif text-4xl text-[#81C8EC]",
									children: ["0", index + 1]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-4 leading-7 text-[#D7EDF8]",
									children: finding
								})]
							}, finding))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-12 max-w-3xl text-sm leading-7 text-[#9DB4C2]",
							children: "Fuentes integradas desde el tablero HTML de referencia y el contrato vivo del API de ayudas humanitarias. El mapa central conserva los datos operativos actuales del proyecto."
						})
					]
				})
			})
		]
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
var SplitComponent = StoryPage;
//#endregion
export { SplitComponent as component };
