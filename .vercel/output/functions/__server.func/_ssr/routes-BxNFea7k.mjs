import { r as __toESM } from "../_runtime.mjs";
import { i as require_react, r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { h as ClientOnly } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Menu, c as Lightbulb, d as ChevronDown, f as CalendarDays, i as PackageCheck, l as House, n as Truck, o as Map$1, r as Package, s as MapPin, t as X, u as ChevronLeft } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BxNFea7k.js
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
function MarcadorHUD({ toneladas, despachos, day, lens, instant = false }) {
	const corte = day === null ? "Total del departamento" : lens === "jornada" ? `Solo el ${day} de agosto` : `Hasta el ${day} de agosto`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute right-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-10 select-none",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl border border-white/12 bg-[#0A1822]/85 px-6 py-5 shadow-lg backdrop-blur",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[13px] font-bold uppercase tracking-[0.14em] text-[#81C8EC]",
					children: "Ayuda entregada"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1.5 flex items-baseline gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rodillo, {
						value: toneladas,
						instant,
						className: "text-[52px]"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-serif text-2xl text-[#81C8EC]",
						children: "toneladas"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex items-baseline gap-2 border-t border-white/12 pt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rodillo, {
						value: despachos,
						instant,
						className: "text-[24px]"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-semibold text-[#9DB4C2]",
						children: "entregas a municipios"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-[#7E9AAD]",
					"aria-live": "polite",
					children: corte
				})
			]
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
		className: `inline-flex font-serif leading-none tabular-nums text-white ${className}`,
		"aria-label": texto,
		role: "text",
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
		className: "relative inline-block h-[1em] w-[0.58em] overflow-hidden",
		style: { verticalAlign: "baseline" },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: instant ? "absolute inset-x-0 top-0" : "absolute inset-x-0 top-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
			style: { transform: `translateY(${-digito * 100}%)` },
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
var TERRITORY_BLUE_RAMP = [
	"#0F3149",
	"#175A80",
	"#2181B4",
	"#3FAEDC",
	"#86D3F0",
	"#C6ECFB"
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
[...new Set(territoryMunicipalities.flatMap((m) => Object.keys(m.dias)))].sort((a, b) => Number(a) - Number(b));
/** "2026-08-14" → "14". Devuelve null si no hay fecha. */
function dayFromIsoDate(iso) {
	if (!iso) return null;
	const dd = iso.slice(-2);
	return /^\d{2}$/.test(dd) ? dd : null;
}
/** Acumulado del municipio hasta `day` inclusive. Con day null, el total. */
function territoryValueAsOf(stat, day) {
	if (!stat) return 0;
	if (day === null) return stat.despachos;
	const limite = Number(day);
	return Object.entries(stat.dias).reduce((sum, [d, v]) => Number(d) <= limite ? sum + v : sum, 0);
}
/** Lo que se movió exactamente ese día. Con day null, 0: una jornada sin día no existe. */
function territoryValueOnDay(stat, day) {
	if (!stat || day === null) return 0;
	return stat.dias[day] ?? 0;
}
/**
* Punto de entrada único del mapa. Reemplaza a `territoryValueFor`, que
* ignoraba el día cuando el modo era "acumulado" y por eso pintaba el
* total final mientras el timeline iba por la mitad.
*/
function territoryValue(stat, lens, day) {
	if (lens === "jornada" && day !== null) return territoryValueOnDay(stat, day);
	return territoryValueAsOf(stat, day);
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
/** Toneladas estimadas para una cantidad de despachos. */
function toneladasEstimadas(despachos) {
	return Math.round(despachos * TONELADAS_POR_DESPACHO);
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
	const flujosParaMapa = useFlujosPorLente(flujosResponse?.flujos, lens, isoDate);
	const totalDespachosAsOf = (0, import_react.useMemo)(() => flujosParaMapa.reduce((sum, f) => sum + f.despachosCount, 0), [flujosParaMapa]);
	/**
	* Toneladas estimadas sobre los despachos que el mapa está mostrando.
	* Se deriva, no se cruza contra la hoja TONELADAS, para que el
	* marcador y el mapa nunca digan cosas distintas. Ver
	* TONELADAS_POR_DESPACHO.
	*/
	const totalToneladasAsOf = (0, import_react.useMemo)(() => toneladasEstimadas(totalDespachosAsOf), [totalDespachosAsOf]);
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
		className: embedded ? "theme-ayudas relative h-full min-h-[720px] w-full overflow-hidden bg-background" : "theme-ayudas relative h-dvh w-dvw overflow-hidden bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientOnly, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 flex items-center justify-center bg-[#0b0e14] text-xs text-muted-foreground",
				children: "Cargando mapa…"
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarcadorHUD, {
				toneladas: totalToneladasAsOf,
				despachos: totalDespachosAsOf,
				day: territoryDay,
				lens,
				instant: viewState.timelineInstant
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
			!viewState.destinoId && !viewState.origenId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlujosLegend, { compact: isMobile }),
			!hayPanelAbiertoEnMobile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TerritoryControls, {
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
function TerritoryControls({ lens, day, zone, routesMode, onLensChange, onZoneChange, onRoutesModeChange }) {
	const visibleMunicipalities = zone === "todas" ? territoryMunicipalities : territoryMunicipalities.filter((m) => m.zone === zone);
	const totalDespachos = visibleMunicipalities.reduce((sum, m) => sum + territoryValue(m, lens, day), 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "pointer-events-auto absolute left-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-10 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-border bg-surface/95 p-3 shadow-sm backdrop-blur",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-start justify-between gap-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground",
						children: "Ayudas entregadas"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1.5 text-base font-semibold text-foreground",
						children: [
							plural$1(totalDespachos, "entrega", "entregas"),
							" en",
							" ",
							plural$1(visibleMunicipalities.length, "municipio", "municipios")
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: describeLens(lens, day)
					})
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid grid-cols-2 gap-1 rounded-md bg-background/70 p-1",
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
				className: "mt-2.5 text-sm leading-5 text-muted-foreground",
				children: "Mueve la línea de tiempo y ves cómo se entregaron las ayudas día por día."
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
		className: `rounded px-2.5 py-2 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"}`,
		children
	});
}
var CIRCUMFERENCE = 326.7;
/**
* Verificados contra el workbook:
*   · 39/41 → CAT_MUNICIPIOS menos Cali, cruzado con DESPACHO_DESTINO.
*     Faltan Candelaria y Florida.
*   · 38/41 → municipios con al menos un requerimiento en pmuData. Los
*     tres que no radicaron son Florida, Trujillo y Vijes.
*   · 72/199 → 37 atendidos + 35 parcialmente atendidos.
*   · 13/15 → días con al menos un despacho entre el 11 y el 25. Antes
*     decía 14: no hay despacho ni el 23 ni el 25. (La hoja TONELADAS sí
*     anota 4 t el 25, así que el workbook se contradice ahí; se cuenta
*     por DESPACHOS, que es la tabla de hechos.)
*/
var panoramaDonuts = [{
	id: "municipios",
	value: 39,
	total: 41,
	label: "Municipios con ayudas entregadas",
	color: "#039A39"
}, {
	id: "jornadas",
	value: 13,
	total: 15,
	label: "Días con entregas, del 11 al 25",
	color: "#81C8EC"
}];
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
var jornadas = [
	{
		dia: "11",
		despachos: 5,
		municipiosDelDia: 5,
		toneladas: 14,
		acumuladoDespachos: 5,
		acumuladoToneladas: 14
	},
	{
		dia: "12",
		despachos: 52,
		municipiosDelDia: 32,
		toneladas: 50,
		acumuladoDespachos: 57,
		acumuladoToneladas: 64
	},
	{
		dia: "13",
		despachos: 39,
		municipiosDelDia: 24,
		toneladas: 70,
		acumuladoDespachos: 96,
		acumuladoToneladas: 134
	},
	{
		dia: "14",
		despachos: 21,
		municipiosDelDia: 14,
		toneladas: 35,
		acumuladoDespachos: 117,
		acumuladoToneladas: 169
	},
	{
		dia: "15",
		despachos: 24,
		municipiosDelDia: 18,
		toneladas: 60,
		acumuladoDespachos: 141,
		acumuladoToneladas: 229
	},
	{
		dia: "16",
		despachos: 16,
		municipiosDelDia: 10,
		toneladas: 45,
		acumuladoDespachos: 157,
		acumuladoToneladas: 274
	},
	{
		dia: "17",
		despachos: 58,
		municipiosDelDia: 26,
		toneladas: 80,
		acumuladoDespachos: 215,
		acumuladoToneladas: 354
	},
	{
		dia: "18",
		despachos: 33,
		municipiosDelDia: 17,
		toneladas: 42,
		acumuladoDespachos: 248,
		acumuladoToneladas: 396
	},
	{
		dia: "19",
		despachos: 19,
		municipiosDelDia: 15,
		toneladas: 19,
		acumuladoDespachos: 267,
		acumuladoToneladas: 415
	},
	{
		dia: "20",
		despachos: 14,
		municipiosDelDia: 13,
		toneladas: 19,
		acumuladoDespachos: 281,
		acumuladoToneladas: 434
	},
	{
		dia: "21",
		despachos: 18,
		municipiosDelDia: 16,
		toneladas: 37,
		acumuladoDespachos: 299,
		acumuladoToneladas: 471
	},
	{
		dia: "22",
		despachos: 19,
		municipiosDelDia: 13,
		toneladas: 33,
		acumuladoDespachos: 318,
		acumuladoToneladas: 504
	},
	{
		dia: "24",
		despachos: 2,
		municipiosDelDia: 2,
		toneladas: 23,
		acumuladoDespachos: 320,
		acumuladoToneladas: 527
	},
	{
		dia: "25",
		despachos: 0,
		municipiosDelDia: 0,
		toneladas: 4,
		acumuladoDespachos: 320,
		acumuladoToneladas: 531
	}
];
/** Solo las jornadas que sumaron territorio nuevo. Suman 39. */
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
			"Guacarí",
			"Guadalajara de Buga",
			"Trujillo"
		]
	},
	{
		dia: "17 de agosto",
		cantidad: 2,
		nombres: ["Cartago", "Tuluá"]
	},
	{
		dia: "18 de agosto",
		cantidad: 1,
		nombres: ["Pradera"]
	}
];
/**
* Las cuatro lecturas de la jornada. Recalculadas sobre el v2:
*
*   · pico: 58 despachos el 17. El HTML decía 56 el 12 — el 12 sigue
*     siendo el día de mayor COBERTURA (32 municipios), pero no el de
*     mayor volumen. Son dos hechos distintos y ahora van separados.
*   · promedio: 320 despachos con fecha / 13 jornadas con despacho
*     municipal = 24,6. No se divide por 14: el 25 de agosto figura en
*     la serie con 0 despachos y metería un cero en el promedio.
*   · 48 h: 57 de 321 = 17,8%.
*/
var movimientoStats = [
	{
		valor: "58",
		label: "Pico de volumen",
		nota: "El 17 de agosto, hacia 26 municipios.",
		color: "#F0801E"
	},
	{
		valor: "32",
		label: "Pico de cobertura",
		nota: "El 12 de agosto: el día que más territorio alcanzó.",
		color: "#5CC46B"
	},
	{
		valor: "18%",
		label: "Salió en las primeras 48 h",
		nota: "57 despachos entre el 11 y el 12.",
		color: "#F0B102"
	},
	{
		valor: "35",
		label: "Despachos desde Cartago",
		nota: "Segundo origen: 13 municipios del norte.",
		color: "#B57BB5"
	}
];
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
/**
* Las tarjetas ya no se declaran acá. Antes la cifra venía de
* `movimientoStats` pero la glosa estaba escrita en el JSX, así que al
* regenerar la serie desde el Excel las tarjetas seguían diciendo "el 12
* de agosto, hacia 32 municipios" con la cifra del 17. Cifra y glosa
* viajan juntas o se separan sin que nadie se entere.
*/
function MovimientoStatCards() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
		children: movimientoStats.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-lg border border-[#00578C]/12 border-l-[3px] bg-white p-5",
			style: { borderLeftColor: c.color },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-serif text-3xl leading-none text-[#0B2233]",
					children: c.valor
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-xs font-bold uppercase tracking-[0.06em] text-[#4E6B7C]",
					children: c.label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1.5 text-sm leading-6 text-[#5E7789]",
					children: c.nota
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
						" ",
						m.cantidad === 1 ? "municipio" : "municipios"
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
function SidebarNav({ items, scrollRootId, homeId }) {
	const [abierto, setAbierto] = (0, import_react.useState)(false);
	const [activo, setActivo] = (0, import_react.useState)(items[0]?.id ?? "");
	const visiblesRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
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
			className: "fixed left-4 top-4 z-50 flex size-12 items-center justify-center rounded-full bg-white text-[#00578C] shadow-lg ring-1 ring-[#00578C]/15 transition hover:bg-[#E8F6FC] md:hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, {
				className: "size-6",
				"aria-hidden": true
			})
		}),
		abierto && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			"aria-label": "Cerrar menú",
			onClick: () => setAbierto(false),
			className: "fixed inset-0 z-40 bg-[#0B2233]/50 backdrop-blur-sm md:hidden"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
			"aria-label": "Secciones",
			className: `fixed left-0 top-0 z-50 flex h-dvh flex-col border-r border-[#00578C]/12 bg-white py-5 transition-[width,transform] duration-300 ease-out motion-reduce:transition-none ${abierto ? "w-72 translate-x-0 px-4" : "w-72 -translate-x-full px-4 md:w-20 md:translate-x-0 md:px-3"}`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-5 flex items-center gap-3 px-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => irA(inicioId),
						"aria-label": "Volver al inicio",
						title: "Volver al inicio",
						className: "flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#00578C] text-white transition hover:bg-[#00456F]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Map$1, {
							className: "size-6",
							"aria-hidden": true
						})
					}), abierto ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => irA(inicioId),
						className: "min-w-0 flex-1 text-left",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "block truncate font-serif text-lg leading-tight text-[#00578C]",
							children: "Mapa de Ayudas"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-sm text-[#5E7789]",
							children: "Valle del Cauca"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setAbierto(false),
						"aria-label": "Cerrar menú",
						className: "flex size-9 shrink-0 items-center justify-center rounded-full text-[#4E6B7C] transition hover:bg-[#F4F9FC]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
							className: "size-5 md:hidden",
							"aria-hidden": true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {
							className: "hidden size-5 md:block",
							"aria-hidden": true
						})]
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setAbierto(true),
						"aria-label": "Abrir menú",
						className: "hidden size-11 shrink-0 items-center justify-center rounded-xl text-[#4E6B7C] transition hover:bg-[#F4F9FC] md:flex",
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
							className: `flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-base font-semibold transition ${esActivo ? "bg-[#E8F6FC] text-[#00578C]" : "text-[#4E6B7C] hover:bg-[#F4F9FC] hover:text-[#00578C]"} ${abierto ? "" : "md:justify-center md:px-0"}`,
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
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `px-2 pt-4 text-sm text-[#6E8B9E] ${abierto ? "" : "md:hidden"}`,
					children: "Información al 25 de agosto de 2026"
				})
			]
		})
	] });
}
function SectionLabel({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]",
		children
	});
}
function SectionTitle({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
		className: "mt-3 max-w-3xl font-serif text-4xl leading-[1.12] text-[#0B2233] md:text-5xl",
		children
	});
}
/** Barra proporcional. */
function Bar({ ratio, color = "#00578C" }) {
	const pct = Math.max(0, Math.min(1, ratio)) * 100;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-[6px] overflow-hidden rounded-full bg-[#E6F0F7]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
			className: "block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
			style: {
				width: `${pct}%`,
				background: color
			}
		})
	});
}
/** Lista "etiqueta, barra, cifra". El máximo se calcula sobre la propia lista. */
function MiniList({ rows }) {
	const max = Math.max(1, ...rows.map((r) => r.value));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "flex flex-col gap-2",
		children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "flex items-center gap-3 text-base",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "min-w-0 flex-1 truncate text-[#4E6B7C]",
					children: r.label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "w-[38%] shrink-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
						ratio: r.value / max,
						color: r.color
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", {
					className: "w-20 shrink-0 text-right tabular-nums text-[#0B2233]",
					children: [r.value.toLocaleString("es-CO"), r.suffix ?? ""]
				})
			]
		}, r.label))
	});
}
function Card({ children, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `rounded-lg border border-[#00578C]/12 bg-white p-6 ${className}`,
		children
	});
}
/** Aviso metodológico. Amarillo, porque siempre dice qué NO se puede afirmar. */
function Aviso({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-lg border border-[#F0B102]/40 border-l-[3px] border-l-[#F0B102] bg-[#FFF8E5] p-5 text-base leading-7 text-[#6B5200]",
		children
	});
}
/**
* TerritorySections.tsx
* -----------------------------------------------------------------------
* Las tres piezas que van DEBAJO del mapa en el nivel Territorio:
* el podio, la cobertura por zona y la grilla de los 41 municipios.
*
* Todo se deriva de `territoryMunicipalities`, nada está escrito a mano.
* Importa porque el catálogo v2 movió Dagua de Pacífico a Sur: los
* totales por zona del tablero HTML (Pacífico 2/2) ya no aplican, y
* calcularlos evita que queden dos verdades circulando.
* -----------------------------------------------------------------------
*/
var ZONAS = [
	"todas",
	"Norte",
	"Centro",
	"Sur",
	"Pacífico"
];
var ORDEN_ZONAS$1 = [
	"Norte",
	"Centro",
	"Sur",
	"Pacífico"
];
var MAX_DESPACHOS = Math.max(1, ...territoryMunicipalities.map((m) => m.despachos));
/** Tono medio de la rampa territorial, para que la barra de la tarjeta
*  hable el mismo idioma de color que el mapa. El `??` es por
*  noUncheckedIndexedAccess: indexar la rampa devuelve `string | undefined`. */
var BARRA_COLOR = TERRITORY_BLUE_RAMP[2] ?? "#2181B4";
var norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
function PodioMunicipios({ onSelect }) {
	const top = (0, import_react.useMemo)(() => [...territoryMunicipalities].sort((a, b) => b.despachos - a.despachos || a.name.localeCompare(b.name, "es")).slice(0, 6), []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Municipios que más ayuda recibieron" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
		className: "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
		children: top.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => onSelect?.(m),
			className: "flex w-full items-center gap-3.5 rounded-lg border border-[#00578C]/12 bg-white p-4 text-left transition hover:border-[#00578C]/45 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00578C]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "min-w-7 text-center font-serif text-[27px] leading-none text-[#81C8EC]",
				children: i + 1
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 flex-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
						className: "block truncate text-[15px] text-[#0B2233]",
						children: m.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "mt-0.5 mb-2 block text-[15px] text-[#6E8B9E]",
						children: [
							m.despachos,
							" entregas · ",
							m.toneladas,
							" toneladas"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { ratio: m.despachos / MAX_DESPACHOS })
				]
			})]
		}) }, m.codigoDane))
	})] });
}
function CoberturaPorZona() {
	const zonas = (0, import_react.useMemo)(() => {
		const acc = /* @__PURE__ */ new Map();
		for (const m of territoryMunicipalities) {
			const z = acc.get(m.zone) ?? {
				total: 0,
				atendidos: 0,
				despachos: 0
			};
			z.total += 1;
			if (m.despachos > 0) z.atendidos += 1;
			z.despachos += m.despachos;
			acc.set(m.zone, z);
		}
		return ORDEN_ZONAS$1.filter((z) => acc.has(z)).map((z) => ({
			zone: z,
			...acc.get(z)
		}));
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Ayudas por zona" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
		children: zonas.map((z) => {
			const ratio = z.atendidos / z.total;
			const completa = z.atendidos === z.total;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-[#00578C]/12 bg-white p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-base font-bold uppercase tracking-[0.08em] text-[#6E8B9E]",
						children: z.zone
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 font-serif text-[38px] leading-none text-[#00578C]",
						children: [z.atendidos, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", {
							className: "text-base font-normal text-[#6E8B9E]",
							children: [" / ", z.total]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3.5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
							ratio,
							color: completa ? "#039A39" : "#F0B102"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-[13px] text-[#5E7789]",
						children: [
							z.atendidos === 1 ? "1 municipio" : `${z.atendidos} municipios`,
							" ·",
							" ",
							z.despachos,
							" entregas"
						]
					})
				]
			}, z.zone);
		})
	})] });
}
function MunicipiosGrid({ onSelect }) {
	const [zona, setZona] = (0, import_react.useState)("todas");
	const [texto, setTexto] = (0, import_react.useState)("");
	const visibles = (0, import_react.useMemo)(() => {
		const q = norm(texto);
		return territoryMunicipalities.filter((m) => (zona === "todas" || m.zone === zona) && (!q || norm(m.name).includes(q))).sort((a, b) => b.despachos - a.despachos || a.name.localeCompare(b.name, "es"));
	}, [zona, texto]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SectionLabel, { children: [
			"Los ",
			territoryMunicipalities.length,
			" municipios"
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4 flex flex-wrap gap-2",
			children: ZONAS.map((z) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setZona(z),
				"aria-pressed": zona === z,
				className: `rounded-full border px-3.5 py-1.5 text-base font-semibold transition ${zona === z ? "border-[#00578C] bg-[#00578C] text-white" : "border-[#00578C]/20 bg-white text-[#4E6B7C] hover:border-[#00578C]/50 hover:text-[#00578C]"}`,
				children: z === "todas" ? "Todas las zonas" : z
			}, z))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "search",
			value: texto,
			onChange: (e) => setTexto(e.target.value),
			placeholder: "Buscar municipio…",
			"aria-label": "Buscar municipio",
			className: "mt-3 w-full rounded-lg border border-[#00578C]/20 bg-white px-3.5 py-2.5 text-base text-[#0B2233] outline-none transition placeholder:text-[#8FAABC] focus:border-[#00578C]"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-base text-[#6E8B9E]",
			"aria-live": "polite",
			children: visibles.length === territoryMunicipalities.length ? `${visibles.length} municipios` : `${visibles.length} de ${territoryMunicipalities.length} municipios`
		}),
		visibles.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-6 rounded-lg border border-dashed border-[#00578C]/25 p-8 text-center text-sm text-[#6E8B9E]",
			children: "Ningún municipio coincide. Prueba con otro nombre o quita el filtro de zona."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(212px,1fr))]",
			children: visibles.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MunicipioCard, {
				m,
				onSelect
			}, m.codigoDane))
		})
	] });
}
function MunicipioCard({ m, onSelect }) {
	const sinDespacho = m.despachos === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: () => onSelect?.(m),
		className: "rounded-lg border border-[#00578C]/12 bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#00578C]/45 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00578C] motion-reduce:hover:translate-y-0",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
					className: "min-w-0 truncate text-lg text-[#0B2233]",
					children: m.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `font-serif text-2xl ${sinDespacho ? "text-[#F26049]" : "text-[#00578C]"}`,
					children: m.despachos
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "my-2.5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
					ratio: m.despachos / MAX_DESPACHOS,
					color: BARRA_COLOR
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-between text-[15px] text-[#6E8B9E]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [m.toneladas, " toneladas"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: plural(m.despachos, "entrega", "entregas") })]
			})
		]
	});
}
/** "1 entrega" y no "1 entregas". */
function plural(n, uno, varios) {
	return `${n.toLocaleString("es-CO")} ${n === 1 ? uno : varios}`;
}
/**
* EvolucionHeatmap.tsx, Nivel 5, "¿Cómo ha cambiado?"
* -----------------------------------------------------------------------
* Una casilla por municipio y jornada. Se deriva de
* `territoryMunicipalities[].dias`, así que no hay data nueva ni riesgo
* de que se desincronice del mapa: es literalmente la misma fuente que
* colorea los polígonos.
*
* La intensidad va por opacidad sobre un azul único, no por rampa
* discreta: acá interesa comparar dentro de la fila (¿qué día volvió a
* recibir?), no clasificar en cortes.
* -----------------------------------------------------------------------
*/
var ORDEN_ZONAS = [
	"Norte",
	"Centro",
	"Sur",
	"Pacífico"
];
/** Máximo de despachos en una sola casilla, fija el tope de opacidad. */
var MAX_DIA = Math.max(1, ...territoryMunicipalities.flatMap((m) => Object.values(m.dias)));
function celdaColor(value) {
	if (value <= 0) return "rgba(255,255,255,0.055)";
	return `rgba(129,200,236,${(.42 + value / MAX_DIA * .58).toFixed(2)})`;
}
function EvolucionHeatmap({ onSelect }) {
	const porZona = (0, import_react.useMemo)(() => ORDEN_ZONAS.map((zone) => ({
		zone,
		filas: territoryMunicipalities.filter((m) => m.zone === zone).sort((a, b) => b.despachos - a.despachos || a.name.localeCompare(b.name, "es"))
	})).filter((g) => g.filas.length > 0), []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Qué municipio recibió cada día" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 max-w-2xl text-lg leading-8 text-[#4E6B7C]",
			children: "Cada casilla es un día. Más azul, más entregas ese día."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 overflow-x-auto rounded-lg border border-white/12 bg-[#0B2233] p-5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-[680px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fila, {
					etiqueta: "",
					celdas: TERRITORY_DAYS.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-center text-sm text-[#7E9AAD]",
						children: d
					}, d)),
					total: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm text-[#7E9AAD]",
						children: "total"
					})
				}), porZona.map(({ zone, filas }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3.5 mb-1.5 text-sm font-bold uppercase tracking-[0.1em] text-[#81C8EC]",
					children: zone
				}), filas.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onSelect?.(m),
					className: "block w-full rounded transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#81C8EC]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fila, {
						etiqueta: m.name,
						celdas: TERRITORY_DAYS.map((d) => {
							const v = m.dias[d] ?? 0;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								title: `${m.name} · ${d} de agosto · ${v === 0 ? "sin entregas" : v === 1 ? "1 entrega" : `${v} entregas`}`,
								className: "flex h-[21px] items-center justify-center rounded-sm text-[9.6px] font-bold text-[#06202F]",
								style: { background: celdaColor(v) },
								children: v > 1 ? v : ""
							}, d);
						}),
						total: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-right font-serif text-base text-white",
							children: m.despachos
						})
					})
				}, m.codigoDane))] }, zone))]
			})
		})
	] });
}
function Fila({ etiqueta, celdas, total }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid items-center gap-[2px] py-[1px]",
		style: { gridTemplateColumns: `112px repeat(${TERRITORY_DAYS.length}, 1fr) 42px` },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "truncate pr-1.5 text-left text-[15px] text-[#A9C2D2]",
				children: etiqueta
			}),
			celdas,
			total
		]
	});
}
var TOTAL_UNIDADES = 256650;
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
* AyudaSection.tsx, Nivel 4, "¿Qué se está movilizando?"
* -----------------------------------------------------------------------
* La cinta es la composición real de la ayuda. Al elegir una categoría,
* la lista de la derecha cambia a los productos que la componen; al
* volver a tocarla, vuelve al top general. Es la misma interacción del
* tablero HTML, pero con estado de React en vez de innerHTML.
* -----------------------------------------------------------------------
*/
/** Cada bloque del waffle vale 1 por ciento del total entregado. */
var UNIDADES_POR_BLOQUE = Math.round(TOTAL_UNIDADES / 100);
function AyudaSection() {
	const [activa, setActiva] = (0, import_react.useState)(null);
	const categoria = activa ? categoriasAyuda.find((c) => c.nombre === activa) : void 0;
	const maxUnidades = Math.max(1, ...categoriasAyuda.map((c) => c.unidades));
	const waffle = (0, import_react.useMemo)(() => categoriasAyuda.flatMap((c) => Array.from({ length: Math.round(c.unidades / UNIDADES_POR_BLOQUE) }, () => c)), []);
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Qué se entregó" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "La mayor parte de la ayuda es aseo, comida y agua" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 max-w-2xl text-lg leading-8 text-[#4E6B7C]",
				children: "Toca una categoría y ves qué artículos incluyó."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-10 grid gap-8 rounded-xl border border-[#00578C]/12 bg-white p-7 lg:grid-cols-[minmax(210px,0.7fr)_minmax(0,1.4fr)] lg:items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "block font-serif text-[64px] leading-none tracking-[-0.02em] text-[#00578C]",
							children: 531
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-3 block text-lg text-[#4E6B7C]",
							children: "toneladas de ayuda"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-2 block text-base leading-6 text-[#6E8B9E]",
							children: "entregadas en todo el departamento"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-xl font-semibold text-[#0B2233]",
						children: "De qué está hecha esa ayuda"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 flex h-9 overflow-hidden rounded-md",
						children: categoriasAyuda.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
							title: `${c.nombre}: ${pct(c.unidades)} por ciento de la ayuda`,
							className: "block transition-opacity",
							style: {
								flex: c.unidades,
								background: c.color,
								opacity: activa && activa !== c.nombre ? .28 : 1
							}
						}, c.nombre))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 flex flex-wrap gap-[3px]",
						children: waffle.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
							title: c.nombre,
							className: "block size-[15px] rounded-[2.5px]",
							style: {
								background: c.color,
								opacity: activa && activa !== c.nombre ? .28 : 1
							}
						}, `${c.nombre}-${i}`))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-base text-[#6E8B9E]",
						children: "Cada bloque es el 1 por ciento de la ayuda. El color indica a qué necesidad responde cada categoría."
					})
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-[15px] text-[#4E6B7C]",
				children: familiasDeAyuda.map((f) => {
					const colores = f.categorias.map((n) => categoriasAyuda.find((c) => c.nombre === n)?.color).filter((c) => typeof c === "string");
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
								className: "block h-2 w-6 rounded-sm",
								style: { background: colores.length > 1 ? `linear-gradient(90deg, ${colores.join(",")})` : colores[0] ?? "#8FAABC" }
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
								className: "font-semibold text-[#0B2233]",
								children: f.nombre
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[#8FAABC]",
								children: ["· ", f.categorias.join(", ")]
							})
						]
					}, f.nombre);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)] lg:items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-6 pt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]",
						children: "Categorías"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3",
						children: categoriasAyuda.map((c) => {
							const seleccionada = activa === c.nombre;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								"aria-pressed": seleccionada,
								onClick: () => setActiva(seleccionada ? null : c.nombre),
								className: `w-full border-b border-[#00578C]/10 px-6 py-3 text-left transition ${seleccionada ? "bg-[#E8F6FC]" : "hover:bg-[#F7FBFD]"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex items-baseline justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex min-w-0 items-center gap-2 text-sm font-semibold text-[#0B2233]",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
												className: "block size-2.5 shrink-0 rounded-sm",
												style: { background: c.color }
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate",
												children: c.nombre
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "shrink-0 font-serif text-xl text-[#00578C]",
											children: [pct(c.unidades), "%"]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-2 block",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
											ratio: c.unidades / maxUnidades,
											color: c.color
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "mt-2 block text-[15px] text-[#6E8B9E]",
										children: [
											"Llegó a ",
											c.destinos,
											" municipios"
										]
									})
								]
							}) }, c.nombre);
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]",
						children: categoria ? `${categoria.nombre}` : "Lo más entregado"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniList, { rows: productos })
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]",
							children: "Grupos atendidos"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniList, { rows: poblacionesFocalizadas.map(([label, value]) => ({
								label,
								value,
								color: "#7F207F"
							})) })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-base text-[#6E8B9E]",
							children: "Entregas que incluyeron ayuda dirigida a cada grupo."
						})
					] })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Aviso, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Cómo leer estas cifras." }), " Los porcentajes comparan cuánta ayuda de cada tipo se entregó. Las toneladas son una estimación a partir del número de entregas."] })
			})
		]
	});
}
function pct(unidades) {
	return Math.round(unidades / TOTAL_UNIDADES * 100);
}
var canales = [
	{
		id: "cali",
		nombre: "Cali",
		glosa: "Capital del departamento.",
		despachos: 55,
		unidades: 27246,
		renglones: 614,
		color: "#81C8EC",
		categorias: [
			[
				"Alimentos",
				7460,
				"#5CC46B"
			],
			[
				"Protección y seguridad",
				7416,
				"#F0801E"
			],
			[
				"Aseo personal",
				6360,
				"#3E9BCB"
			],
			[
				"Líquidos e hidratación",
				1874,
				"#00C4B0"
			],
			[
				"Descanso y abrigo",
				1343,
				"#B57BB5"
			]
		]
	},
	{
		id: "acopio-cartago",
		nombre: "Centro de acopio Cartago",
		glosa: "Bodega del norte que despacha a varios municipios",
		despachos: 35,
		unidades: 17106,
		renglones: 280,
		color: "#F0801E",
		categorias: [
			[
				"Líquidos e hidratación",
				9526,
				"#00C4B0"
			],
			[
				"Alimentos",
				3305,
				"#5CC46B"
			],
			[
				"Kits sin desagregar",
				3037,
				"#6E8B9E"
			],
			[
				"Mascotas",
				419,
				"#89A32C"
			],
			[
				"Ropa y calzado",
				396,
				"#8375A9"
			]
		]
	},
	{
		id: "otras-ayudas-solidarias",
		nombre: "Otras Ayudas Solidarias",
		glosa: "Entregas a instituciones y casos puntuales.",
		despachos: 18,
		unidades: 9932,
		renglones: 200,
		color: "#B57BB5",
		categorias: [
			[
				"Alimentos",
				3505,
				"#5CC46B"
			],
			[
				"Líquidos e hidratación",
				2090,
				"#00C4B0"
			],
			[
				"Aseo personal",
				1860,
				"#3E9BCB"
			],
			[
				"Protección y seguridad",
				1233,
				"#F0801E"
			],
			[
				"Sin clasificar",
				716,
				"#4F6B7C"
			]
		]
	},
	{
		id: "multiples",
		nombre: "Municipios múltiples",
		glosa: "Un formato que reparte a varios municipios a la vez",
		despachos: 6,
		unidades: 7490,
		renglones: 54,
		color: "#8375A9",
		categorias: [
			[
				"Aseo personal",
				4181,
				"#3E9BCB"
			],
			[
				"Protección y seguridad",
				1498,
				"#F0801E"
			],
			[
				"Alimentos",
				535,
				"#5CC46B"
			],
			[
				"Kits sin desagregar",
				300,
				"#6E8B9E"
			],
			[
				"Mascotas",
				238,
				"#89A32C"
			]
		]
	},
	{
		id: "inciva",
		nombre: "Inciva",
		glosa: "Instituto para la Investigación y la Preservación del Patrimonio",
		despachos: 1,
		unidades: 198,
		renglones: 6,
		color: "#B57BB5",
		categorias: [
			[
				"Alimentos",
				100,
				"#5CC46B"
			],
			[
				"Sin clasificar",
				52,
				"#4F6B7C"
			],
			[
				"Protección y seguridad",
				40,
				"#F0801E"
			],
			[
				"Aseo del hogar",
				6,
				"#2378A8"
			]
		]
	},
	{
		id: "centro-proteccion",
		nombre: "Centro de Protección",
		glosa: "Centro de Protección Social",
		despachos: 1,
		unidades: 117,
		renglones: 4,
		color: "#B57BB5",
		categorias: [[
			"Alimentos",
			102,
			"#5CC46B"
		], [
			"Sin clasificar",
			15,
			"#4F6B7C"
		]]
	},
	{
		id: "choco",
		nombre: "Chocó · fuera del Valle",
		glosa: "Ayuda enviada fuera del Valle del Cauca",
		despachos: 1,
		unidades: 783,
		renglones: 25,
		color: "#00A494",
		categorias: [
			[
				"Líquidos e hidratación",
				266,
				"#00C4B0"
			],
			[
				"Aseo personal",
				205,
				"#3E9BCB"
			],
			[
				"Descanso y abrigo",
				199,
				"#B57BB5"
			],
			[
				"Alimentos",
				40,
				"#5CC46B"
			],
			[
				"Mascotas",
				26,
				"#89A32C"
			]
		]
	}
];
/**
* Municipios que declara cada formato del acopio de Cartago.
*
* OJO: suma 38 destinos sobre 35 documentos. No es un error de
* transcripción — un mismo formato puede nombrar más de un municipio, así
* que estas cifras cuentan MENCIONES, no documentos. Por eso no se
* pueden sumar contra `documentos` del canal.
*/
var redCartago = [
	["Cartago", 9],
	["Argelia", 5],
	["Ansermanuevo", 4],
	["Zarzal", 3],
	["Roldanillo", 3],
	["Alcalá", 2],
	["Toro", 2],
	["La Unión", 2],
	["La Victoria", 2],
	["Sevilla", 2],
	["Versalles", 1],
	["Obando", 1],
	["Bolívar", 1],
	["Ulloa", 1]
];
/**
* CanalesSection.tsx, Nivel 6, "Lo que no cabe en el mapa municipal"
* -----------------------------------------------------------------------
* Los canales que el consolidado deja fuera por regla. Se muestran
* juntos y con su total explícito porque el punto del nivel es que sin
* ellos la operación se ve más chica de lo que fue.
* -----------------------------------------------------------------------
*/
var TOTAL_DESPACHOS = canales.reduce((s, c) => s + c.despachos, 0);
function CanalesSection() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "De dónde salió" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "Además de los municipios, la ayuda salió por otras siete rutas" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 max-w-2xl text-lg leading-8 text-[#4E6B7C]",
				children: [
					"El conteo por municipio deja fuera estas rutas. Suman ",
					TOTAL_DESPACHOS,
					" entregas que también se movieron."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-9 grid gap-4 md:grid-cols-2",
				children: canales.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-lg border border-[#00578C]/12 border-t-[3px] bg-white p-5",
					style: { borderTopColor: c.color },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-xl font-semibold text-[#0B2233]",
							children: c.nombre
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 min-h-[34px] text-base leading-6 text-[#6E8B9E]",
							children: c.glosa
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
							className: "mt-3 flex gap-6",
							children: [["entregas", c.despachos]].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "font-serif text-[23px] leading-none text-[#00578C]",
								children: value.toLocaleString("es-CO")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "mt-1 text-sm text-[#6E8B9E]",
								children: label
							})] }, label))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniList, { rows: c.categorias.map(([label, value, color]) => ({
								label,
								value,
								color
							})) })
						})
					]
				}, c.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.85fr)] lg:items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]",
						children: "La red del acopio de Cartago"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-base leading-7 text-[#4E6B7C]",
						children: "Esta bodega registra a qué municipio salió cada entrega. Es la única ruta que no parte de Cali y explica cómo se abasteció el norte."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniList, { rows: redCartago.map(([label, value]) => ({
							label,
							value,
							color: "#E2690E"
						})) })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3.5 text-[15px] leading-6 text-[#6E8B9E]",
						children: "Una misma entrega llega a veces a más de un municipio, por eso la suma de esta lista es mayor que el total del centro de acopio."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "border-l-[3px] border-l-[#F0801E]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "block font-serif text-[33px] leading-none text-[#00578C]",
							children: "35"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1.5 text-base font-semibold text-[#6E8B9E]",
							children: "Entregas desde Cartago"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-base leading-7 text-[#4E6B7C]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
								className: "text-[#0B2233]",
								children: "No se cuentan como entrega municipal"
							}), " para no repetir la misma ayuda dos veces. Es la ayuda vista desde la bodega que la envía."]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-base leading-7 text-[#6E8B9E]",
							children: "La ayuda enviada al Chocó sí cuenta como entrega. No cuenta como municipio del Valle, porque no pertenece al departamento."
						})
					]
				})]
			})
		]
	});
}
var EJE_COLOR = {
	movimiento: "#F0801E",
	territorio: "#81C8EC",
	ayuda: "#00A494",
	evolucion: "#FFD103"
};
var EJE_ETIQUETA = {
	movimiento: "Movimiento",
	territorio: "Territorio",
	ayuda: "Qué se mueve",
	evolucion: "Evolución"
};
var hallazgos = [
	{
		eje: "movimiento",
		titulo: "Las ayudas llegaron a casi todo el departamento en dos días",
		texto: "Entre el 11 y el 12 de agosto las ayudas pasaron de 5 a 33 municipios. En esos dos días salió el 18 por ciento de las entregas, 57 de 321. Después la operación volvió una y otra vez sobre los mismos municipios."
	},
	{
		eje: "territorio",
		titulo: "Dagua recibió más veces, Sevilla recibió más cantidad",
		texto: "Dagua recibió ayudas más veces que ningún otro municipio. Sevilla recibió la mayor cantidad de artículos. Recibir más veces no significa recibir más cantidad."
	},
	{
		eje: "movimiento",
		titulo: "Las ayudas salen de dos centros de acopio",
		texto: "Además del acopio de Cali, la bodega de Cartago envió ayudas a 13 municipios del norte. El norte del Valle se abastece por una ruta propia."
	},
	{
		eje: "ayuda",
		titulo: "Más de la mitad de la ayuda es aseo y comida",
		texto: "El aseo personal y los alimentos suman el 53 por ciento de todo lo entregado. El artículo más repartido son los tapabocas, que llegaron a 31 municipios."
	},
	{
		eje: "ayuda",
		titulo: "Las mascotas aparecen en más entregas que el adulto mayor",
		texto: "84 entregas incluyeron ayuda para mascotas. El adulto mayor aparece en 33 y las personas con discapacidad en 25."
	},
	{
		eje: "movimiento",
		titulo: "La donación de China se repartió junto con el resto",
		texto: "19 entregas corresponden a la donación de la República China. Se repartieron junto con el resto de las ayudas, en los mismos municipios."
	},
	{
		eje: "territorio",
		titulo: "El norte, el centro y el Pacífico recibieron ayudas completas",
		texto: "Todos los municipios del norte, el centro y el Pacífico recibieron ayudas. En el sur, 7 de 9 municipios las recibieron."
	},
	{
		eje: "evolucion",
		titulo: "El día de más entregas y el de más municipios no fueron el mismo",
		texto: "El 17 de agosto salieron 58 entregas, la cifra más alta. El 12 de agosto llegaron ayudas a 32 municipios, la mayor cobertura en un día. La última entrega registrada es del 24."
	}
];
/**
* HallazgosSection.tsx, Nivel 8, "¿Qué nos están diciendo los datos?"
* -----------------------------------------------------------------------
* Cierre del recorrido. El color del borde codifica de qué nivel viene
* cada lectura, así que funciona como índice inverso: dice dónde volver
* a verificarla.
* -----------------------------------------------------------------------
*/
function HallazgosSection() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-bold uppercase tracking-[0.16em] text-[#81C8EC]",
				children: "Conclusiones"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-3 max-w-3xl font-serif text-4xl leading-[1.12] text-white md:text-5xl",
				children: "Lo que muestran los datos"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 max-w-2xl text-lg leading-8 text-[#BBD6E6]",
				children: "Ocho lecturas sobre cómo se movió la ayuda en el departamento."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3",
				children: hallazgos.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-lg border border-white/12 border-l-[3px] bg-white/[0.055] p-6",
					style: { borderLeftColor: EJE_COLOR[h.eje] },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[13px] font-bold uppercase tracking-[0.12em]",
							style: { color: EJE_COLOR[h.eje] },
							children: EJE_ETIQUETA[h.eje]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mt-2.5 font-serif text-2xl leading-[1.2] text-white",
							children: h.titulo
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-lg leading-[1.6] text-[#D7EDF8]",
							children: h.texto
						})
					]
				}, h.titulo))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-12 max-w-3xl text-base leading-7 text-[#9DB4C2]",
				children: "La información llega hasta el 25 de agosto de 2026. Estas cifras muestran las ayudas que se entregaron. No miden cuánta ayuda necesita cada municipio."
			})
		]
	});
}
var SCROLL_ROOT_ID = "mapa-de-ayudas-scroll";
var NAV = [
	{
		id: "inicio",
		label: "Inicio",
		icon: House
	},
	{
		id: "mapa-de-ayudas",
		label: "Mapa de Ayudas",
		icon: Map$1
	},
	{
		id: "resumen",
		label: "Resumen",
		icon: MapPin
	},
	{
		id: "cuando",
		label: "Cuándo se entregó",
		icon: CalendarDays
	},
	{
		id: "municipios",
		label: "Municipios",
		icon: MapPin
	},
	{
		id: "que-se-entrego",
		label: "Qué se entregó",
		icon: Package
	},
	{
		id: "de-donde-salio",
		label: "De dónde salió",
		icon: Truck
	},
	{
		id: "conclusiones",
		label: "Conclusiones",
		icon: Lightbulb
	}
];
var kpis = [
	{
		value: `39 de 41`,
		label: "municipios recibieron ayudas"
	},
	{
		value: 321 .toLocaleString("es-CO"),
		label: "entregas llegaron a los municipios"
	},
	{
		value: `531 toneladas`,
		label: "de ayuda salieron del departamento"
	},
	{
		value: "14 días",
		label: "de entregas, del 11 al 25 de agosto"
	}
];
function StoryPage() {
	const irAlMapa = (0, import_react.useCallback)(() => {
		document.getElementById("mapa-de-ayudas")?.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarNav, {
		items: NAV,
		scrollRootId: SCROLL_ROOT_ID,
		homeId: "inicio"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		id: SCROLL_ROOT_ID,
		className: "h-dvh overflow-y-auto scroll-smooth bg-[#F4F9FC] text-[#0B2233] md:pl-20",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "inicio",
				className: "grid min-h-dvh place-items-center bg-[#EAF6FB] px-5 py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-4xl flex-col items-center text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]",
							children: "Gobernación del Valle del Cauca"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-6 font-serif text-6xl leading-[0.98] text-[#00578C] md:text-8xl",
							children: "Ruta de la Solidaridad"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-8 max-w-2xl text-xl leading-9 text-[#315A70]",
							children: "Después del terremoto del 10 de agosto de 2026, la Gobernación entregó ayudas humanitarias de emergencia en los municipios en el Valle del Cauca."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-8 max-w-2xl text-xl leading-9 text-[#315A70]",
							children: "A continuación encontrará toda la información."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-10 font-serif text-3xl text-[#00578C] md:text-4xl",
							children: [
								39,
								" de los ",
								41,
								" municipios recibieron ayudas"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: "#mapa-de-ayudas",
							className: "mt-12 inline-flex items-center gap-3 rounded-full bg-[#00578C] px-7 py-4 text-lg font-bold text-white transition hover:bg-[#00456F]",
							children: ["Ver el mapa", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
								className: "size-5",
								"aria-hidden": true
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "mapa-de-ayudas",
				className: "relative h-dvh bg-[#0B2233]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardPage, { embedded: true })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "resumen",
				className: "bg-white px-5 py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Resumen" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "mt-4 max-w-3xl font-serif text-4xl leading-[1.15] text-[#0B2233] md:text-5xl",
							children: [
								39,
								" de los ",
								41,
								" municipios del Valle recibieron ayudas"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 max-w-2xl text-lg leading-8 text-[#4E6B7C]",
							children: "Entre el 11 y el 25 de agosto de 2026, la Gobernación entregó ayudas tras el terremoto. Aquí ves cuántas llegaron, adónde y cuándo."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4",
							children: kpis.map((kpi) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl border border-[#00578C]/12 bg-[#F7FBFD] p-7",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
									className: "block font-serif text-4xl leading-none text-[#00578C]",
									children: kpi.value
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-lg leading-7 text-[#4E6B7C]",
									children: kpi.label
								})]
							}, kpi.label))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-14",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanoramaDonuts, {})
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "cuando",
				className: "bg-[#F4F9FC] px-5 py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Cuándo se entregó" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-4 max-w-3xl font-serif text-4xl leading-[1.15] md:text-5xl",
							children: "Las ayudas llegaron a casi todo el departamento en los primeros dos días"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-12 space-y-14",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AcumuladoChart, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MovimientoStatCards, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JornadaBars, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MunicipiosNuevosCallouts, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EvolucionHeatmap, { onSelect: irAlMapa })
							]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "municipios",
				className: "bg-white px-5 py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl space-y-16",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Municipios" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-4 max-w-3xl font-serif text-4xl leading-[1.15] md:text-5xl",
							children: "Cuánta ayuda recibió cada municipio"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PodioMunicipios, { onSelect: irAlMapa }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoberturaPorZona, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MunicipiosGrid, { onSelect: irAlMapa })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "que-se-entrego",
				className: "bg-[#F4F9FC] px-5 py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AyudaSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "de-donde-salio",
				className: "bg-white px-5 py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CanalesSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "conclusiones",
				className: "bg-[#0B2233] px-5 py-20 text-white md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HallazgosSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "bg-[#061621] px-5 py-12 text-base leading-7 text-[#9DB4C2] md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "block font-serif text-xl text-[#CBE4F2]",
							children: "Mapa de Ayudas"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 max-w-2xl",
							children: "Gobernación del Valle del Cauca. Ayudas entregadas tras el terremoto del 10 de agosto de 2026, con información al 25 de agosto."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 max-w-2xl",
							children: "Fuente de información: registros oficiales de entrega de ayudas de la Gobernación del Valle del Cauca."
						})
					]
				})
			})
		]
	})] });
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
