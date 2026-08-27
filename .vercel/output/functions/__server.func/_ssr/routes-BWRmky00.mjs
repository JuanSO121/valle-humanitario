import { r as __toESM } from "../_runtime.mjs";
import { i as require_react, r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { h as ClientOnly } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Menu, c as Lightbulb, d as ChevronLeft, f as CalendarDays, i as PackageCheck, l as House, n as Truck, o as Map$1, r as Package, s as MapPin, t as X, u as FileText } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BWRmky00.js
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
	nombre: "Centro de Acopio Antigua Licorera del Valle",
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
/** Toneladas estimadas para una cantidad de despachos. */
function toneladasEstimadas(despachos) {
	return Math.round(despachos * TONELADAS_POR_DESPACHO);
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
	/**
	* Entregas por municipio, indexadas por código DANE, para que el mapa
	* pinte con los datos de la API. El catálogo estático solo aporta la
	* zona y el código de los municipios que todavía no registran
	* entregas, para que aparezcan en gris y no desaparezcan del mapa.
	*/
	const operacion = useOperacion();
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
		className: embedded ? "theme-ayudas relative h-full min-h-[26rem] w-full overflow-hidden bg-background" : "theme-ayudas relative h-dvh w-dvw overflow-hidden bg-background",
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
		className: "pointer-events-auto absolute inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 max-h-[45dvh] overflow-y-auto rounded-lg border border-border bg-surface/95 p-4 shadow-sm backdrop-blur md:inset-x-auto md:bottom-auto md:left-4 md:top-[calc(1rem+env(safe-area-inset-top))] md:max-h-[calc(100dvh-9rem)] md:w-[22rem]",
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
							plural$1(conEntregas, "municipio", "municipios")
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
				children: "Mueva la línea de tiempo para ver cómo se entregaron las ayudas día por día."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: [TODAS$1, ...zonasDisponibles].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleButton, {
					active: zone === item,
					onClick: () => onZoneChange(item),
					children: item === TODAS$1 ? "Todas" : item
				}, item))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid grid-cols-1 gap-1 rounded-md bg-background/70 p-1 sm:grid-cols-3",
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
/**
* PanoramaDonuts.tsx
* -----------------------------------------------------------------------
* Los dos indicadores de cobertura del resumen. Ambos se calculan desde
* la API: cuántos municipios recibieron y en cuántos días hubo entregas.
* Antes venían de panoramaData.ts, así que decían "13 de 15, del 11 al
* 25" aunque el Excel ya tuviera más jornadas.
*/
/** Radio 52, circunferencia 2 por pi por r. */
var RADIO = 52;
var CIRCUNFERENCIA = 2 * Math.PI * RADIO;
function PanoramaDonuts() {
	const op = useOperacion();
	const diasDelRango = rangoEnDias(op.primeraFecha, op.ultimaFecha);
	const donuts = [{
		id: "municipios",
		valor: op.municipiosAtendidos,
		total: op.municipiosTotales,
		label: "Municipios con ayudas entregadas",
		color: "#039A39"
	}, {
		id: "dias",
		valor: op.diasConEntrega,
		total: diasDelRango,
		label: op.rangoLargo ? `Días con entregas, ${op.rangoLargo}` : "Días con entregas",
		color: "#81C8EC"
	}];
	if (op.municipiosAtendidos === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-6 sm:grid-cols-2 lg:grid-cols-4",
		children: donuts.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col items-center text-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 128 128",
				className: "size-32",
				role: "img",
				"aria-label": `${d.valor} de ${d.total}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: "64",
						cy: "64",
						r: RADIO,
						fill: "none",
						stroke: "#E4E7EA",
						strokeWidth: "13"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: "64",
						cy: "64",
						r: RADIO,
						fill: "none",
						stroke: d.color,
						strokeWidth: "13",
						strokeLinecap: "round",
						strokeDasharray: `${(d.total > 0 ? d.valor / d.total : 0) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`,
						transform: "rotate(-90 64 64)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: "64",
						y: "62",
						textAnchor: "middle",
						className: "fill-[#00578C] font-serif text-[28px]",
						children: d.valor
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
						x: "64",
						y: "82",
						textAnchor: "middle",
						className: "fill-[#7E9AAD] text-[12px]",
						children: ["de ", d.total]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-[18rem] text-base leading-6 text-[#4E6B7C]",
				children: d.label
			})]
		}, d.id))
	});
}
/** Días calendario entre dos fechas ISO, ambas incluidas. */
function rangoEnDias(desde, hasta) {
	if (!desde || !hasta) return 0;
	const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
	if (Number.isNaN(ms)) return 0;
	return Math.round(ms / 864e5) + 1;
}
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
				label: "Otras Ayudas Solidarias",
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
/**
* PanoramaPuente.tsx
* -----------------------------------------------------------------------
* El paso a paso que va del censo de documentos al total de entregas.
*
* Sin párrafo introductorio propio: la sección de Soportes documentales
* ya lo trae, y tener los dos seguidos repetía la misma idea dos veces
* con palabras distintas.
*
* Estas cifras salen del censo del Drive, que no está expuesto por
* ninguna ruta de la API. Es lo único del tablero que sigue siendo
* manual. Ver panoramaData.ts.
*/
function PanoramaPuente() {
	const { totalEntregas } = useOperacion();
	const totalPuente = puenteSteps.find((f) => f.kind === "total")?.delta ?? 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-xl border border-[#00578C]/12 bg-white px-5 py-3 sm:px-7 sm:py-4",
		children: puenteSteps.map((fila) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fila$1, { fila }, fila.id))
	}), totalEntregas > 0 && totalEntregas !== totalPuente && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "mt-4 max-w-2xl text-base leading-7 text-[#6E8B9E]",
		children: [
			"Este conteo llega a ",
			totalPuente.toLocaleString("es-CO"),
			" y el resto del tablero muestra",
			" ",
			totalEntregas.toLocaleString("es-CO"),
			". No es una diferencia de datos, son dos formas de contar. Aquí se cuentan documentos del archivo. En el resto del tablero se cuenta una entrega por cada municipio que recibió, así que un formato que reparte a varios municipios suma varias veces."
		]
	})] });
}
function Fila$1({ fila }) {
	const esTotal = fila.kind === "total";
	const esSubtotal = fila.kind === "subtotal";
	const signo = fila.kind === "resta" ? "-" : fila.kind === "suma" ? "+" : "";
	const valor = Math.abs(fila.delta).toLocaleString("es-CO");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: [
			"grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 border-b border-[#00578C]/10 py-3",
			esTotal ? "border-b-0 border-t-2 border-t-[#00578C] pt-4" : "",
			esSubtotal ? "-mx-3 rounded bg-[#F7FBFD] px-3" : ""
		].join(" "),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: esTotal ? "text-sm font-bold uppercase tracking-[0.12em] text-[#00578C]" : esSubtotal ? "text-base font-semibold text-[#0B2233]" : "text-base text-[#4E6B7C]",
				children: fila.label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: [
					"font-serif tabular-nums",
					esTotal ? "text-3xl text-[#00578C]" : "text-xl",
					fila.kind === "resta" ? "text-[#C43A20]" : "",
					fila.kind === "suma" ? "text-[#0B6B2B]" : "",
					esSubtotal || esTotal ? "text-[#0B2233]" : ""
				].join(" "),
				children: [signo, valor]
			}),
			fila.detail && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "col-span-2 mt-1 flex flex-wrap gap-x-3 gap-y-1.5",
				children: fila.detail.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-full bg-[#F4F9FC] px-3 py-1 text-sm text-[#5E7789]",
					title: d.note,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "text-[#0B2233]",
							children: d.value
						}),
						" ",
						d.label
					]
				}, d.label))
			})
		]
	});
}
/**
* JornadaBars.tsx
* -----------------------------------------------------------------------
* Entregas por día, con los municipios nuevos en verde. Las barras y las
* etiquetas salen de la API, así que el gráfico crece solo cuando se
* agregan días al Excel.
*/
function JornadaBars() {
	const { jornadas } = useOperacion();
	if (jornadas.length === 0) return null;
	const max = Math.max(1, ...jornadas.map((j) => j.entregas));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 rounded-lg border border-[#00578C]/12 bg-white p-5 sm:p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-4 text-sm font-bold uppercase tracking-[0.1em] text-[#006A87]",
			children: "Entregas por día. En verde, los municipios que reciben por primera vez"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex h-56 items-end gap-1.5 sm:gap-2",
			children: jornadas.map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 flex-1 flex-col items-center gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-semibold text-[#315A70]",
						children: j.entregas
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-full rounded-t bg-[#00578C]",
						style: { height: `${Math.max(6, j.entregas / max * 170)}px` },
						title: `${Number(j.dia)} de agosto: ${j.entregas} entregas hacia ${j.municipios} municipios`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm text-[#6E8B9E]",
						children: j.dia
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "h-4 text-xs font-bold text-[#039A39]",
						children: j.nuevos > 0 ? `+${j.nuevos}` : ""
					})
				]
			}, j.fecha))
		})]
	});
}
/**
* MovimientoExtras.tsx
* -----------------------------------------------------------------------
* Tarjetas de jornada y municipios nuevos. Todo se calcula desde la API,
* incluida la glosa de cada tarjeta. Antes la cifra venía de un archivo
* y el texto estaba escrito en el JSX, así que al cambiar los datos las
* tarjetas seguían nombrando el día equivocado.
*/
var ORIGEN_CARTAGO$1 = "ORI-CARTAGO";
function MovimientoStatCards() {
	const op = useOperacion();
	const primeras48 = op.jornadas.slice(0, 2).reduce((sum, j) => sum + j.entregas, 0);
	const porcentaje48 = op.totalEntregas > 0 ? Math.round(primeras48 / op.totalEntregas * 100) : 0;
	const promedio = op.diasConEntrega > 0 ? (op.totalEntregas / op.diasConEntrega).toFixed(1) : "0";
	const cartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO$1);
	const tarjetas = [
		op.picoEntregas && {
			valor: String(op.picoEntregas.entregas),
			label: "Día con más entregas",
			nota: `El ${Number(op.picoEntregas.dia)} de agosto, hacia ${op.picoEntregas.municipios} municipios.`,
			color: "#F0801E"
		},
		op.picoCobertura && {
			valor: String(op.picoCobertura.municipios),
			label: "Día con más municipios",
			nota: `El ${Number(op.picoCobertura.dia)} de agosto.`,
			color: "#5CC46B"
		},
		{
			valor: `${porcentaje48}%`,
			label: "Salió en las primeras 48 horas",
			nota: `${primeras48} entregas en los dos primeros días.`,
			color: "#F0B102"
		},
		cartago && {
			valor: String(cartago.entregas),
			label: "Entregas desde Cartago",
			nota: `Segundo centro de acopio, hacia ${cartago.municipios} municipios.`,
			color: "#B57BB5"
		},
		{
			valor: promedio,
			label: "Entregas por día",
			nota: `Promedio de los ${op.diasConEntrega} días con entregas.`,
			color: "#3E9BCB"
		}
	].filter(Boolean);
	if (tarjetas.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
		children: tarjetas.slice(0, 4).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-lg border border-[#00578C]/12 border-l-[3px] bg-white p-5",
			style: { borderLeftColor: c.color },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-serif text-3xl leading-none text-[#0B2233]",
					children: c.valor
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-base font-bold uppercase tracking-[0.06em] text-[#4E6B7C]",
					children: c.label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1.5 text-base leading-6 text-[#5E7789]",
					children: c.nota
				})
			]
		}, c.label))
	});
}
function MunicipiosNuevosCallouts() {
	const { jornadas } = useOperacion();
	const conNuevos = jornadas.filter((j) => j.nuevos > 0);
	if (conNuevos.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-6 grid gap-4 md:grid-cols-3",
		children: conNuevos.map((j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-lg border-l-4 border-[#5CC46B] bg-white p-5 shadow-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-base font-bold uppercase tracking-[0.06em] text-[#4E6B7C]",
					children: [Number(j.dia), " de agosto"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 font-serif text-2xl text-[#0B2233]",
					children: j.nuevos === 1 ? "1 municipio nuevo" : `${j.nuevos} municipios nuevos`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-base leading-6 text-[#5E7789]",
					children: j.nombresNuevos.join(", ")
				})
			]
		}, j.fecha))
	});
}
function SidebarNav({ items, scrollRootId, homeId, fechaCorte }) {
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
							className: "block font-serif text-lg leading-tight text-[#00578C]",
							children: "Ruta de la Solidaridad"
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
				fechaCorte && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: `px-2 pt-4 text-sm text-[#6E8B9E] ${abierto ? "" : "md:hidden"}`,
					children: ["Información al ", fechaCorte]
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
* Podio, cobertura por zona y grilla de municipios. Todo se deriva de la
* API vía OperacionContext, así que las cifras se actualizan solas.
*
* La zona de cada municipio sigue viniendo del catálogo estático, porque
* no cambia con las entregas. El total de municipios también, para poder
* decir cuántos hay en el departamento aunque alguno todavía no aparezca
* en los flujos.
*/
var TODAS = "todas";
var BARRA_COLOR = TERRITORY_BLUE_RAMP[2] ?? "#2181B4";
var norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
function plural(n, uno, varios) {
	return `${n.toLocaleString("es-CO")} ${n === 1 ? uno : varios}`;
}
function PodioMunicipios({ onSelect }) {
	const { municipios } = useOperacion();
	const top = municipios.slice(0, 6);
	const max = Math.max(1, ...municipios.map((m) => m.entregas));
	if (top.length === 0) return null;
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
						className: "block truncate text-lg text-[#0B2233]",
						children: m.nombre
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "mt-0.5 mb-2 block text-[15px] text-[#6E8B9E]",
						children: [
							plural(m.entregas, "entrega", "entregas"),
							" · ",
							m.toneladas,
							" toneladas"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, { ratio: m.entregas / max })
				]
			})]
		}) }, m.destinoId))
	})] });
}
function CoberturaPorZona() {
	const { zonas } = useOperacion();
	if (zonas.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Ayudas por zona" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
		children: zonas.map((z) => {
			const ratio = z.total > 0 ? z.atendidos / z.total : 0;
			const completa = z.atendidos === z.total;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-[#00578C]/12 bg-white p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-base font-bold uppercase tracking-[0.08em] text-[#6E8B9E]",
						children: z.zona
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 font-serif text-[38px] leading-none text-[#00578C]",
						children: [z.atendidos, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", {
							className: "text-base font-normal text-[#6E8B9E]",
							children: [" de ", z.total]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3.5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
							ratio,
							color: completa ? "#039A39" : "#F0B102"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-base text-[#5E7789]",
						children: completa ? "Todos recibieron ayudas" : `${z.total - z.atendidos} sin entregas todavía`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-base text-[#6E8B9E]",
						children: [plural(z.entregas, "entrega", "entregas"), " en total"]
					})
				]
			}, z.zona);
		})
	})] });
}
function MunicipiosGrid({ onSelect }) {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SectionLabel, { children: [
			"Los ",
			todos.length,
			" municipios"
		] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4 flex flex-wrap gap-2",
			children: [TODAS, ...zonas.map((z) => z.zona)].map((z) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setZona(z),
				"aria-pressed": zona === z,
				className: `rounded-full border px-3.5 py-1.5 text-base font-semibold transition ${zona === z ? "border-[#00578C] bg-[#00578C] text-white" : "border-[#00578C]/20 bg-white text-[#4E6B7C] hover:border-[#00578C]/50 hover:text-[#00578C]"}`,
				children: z === TODAS ? "Todas las zonas" : z
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
			children: visibles.length === todos.length ? plural(visibles.length, "municipio", "municipios") : `${visibles.length} de ${todos.length} municipios`
		}),
		visibles.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-6 rounded-lg border border-dashed border-[#00578C]/25 p-8 text-center text-base text-[#6E8B9E]",
			children: "Ningún municipio coincide. Prueba con otro nombre o quita el filtro de zona."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,212px),1fr))]",
			children: visibles.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => onSelect?.(m),
				className: "rounded-lg border border-[#00578C]/12 bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#00578C]/45 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00578C] motion-reduce:hover:translate-y-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "min-w-0 truncate text-lg text-[#0B2233]",
							children: m.nombre
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `font-serif text-2xl ${m.entregas === 0 ? "text-[#6E8B9E]" : "text-[#00578C]"}`,
							children: m.entregas
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "my-2.5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
							ratio: m.entregas / max,
							color: BARRA_COLOR
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-between text-[15px] text-[#6E8B9E]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [m.toneladas, " toneladas"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: plural(m.entregas, "entrega", "entregas") })]
					})
				]
			}, m.destinoId))
		})
	] });
}
/**
* EvolucionHeatmap.tsx
* -----------------------------------------------------------------------
* Una casilla por municipio y día. Todo sale de la API vía
* OperacionContext: los días, las entregas y las zonas se recalculan
* solos cuando cambia el Excel. Antes esta rejilla leía un catálogo
* estático y quedaba vieja apenas se agregaba una entrega.
*/
var ORDEN_ZONAS = [
	"Norte",
	"Centro",
	"Sur",
	"Pacífico"
];
function EvolucionHeatmap({ onSelect }) {
	const { jornadas, municipios } = useOperacion();
	const dias = (0, import_react.useMemo)(() => jornadas.map((j) => j.dia), [jornadas]);
	/** Tope de la escala: la casilla más alta de toda la rejilla. */
	const maxDia = (0, import_react.useMemo)(() => Math.max(1, ...municipios.flatMap((m) => Object.values(m.dias))), [municipios]);
	const porZona = (0, import_react.useMemo)(() => {
		return [...ORDEN_ZONAS, "Sin zona"].map((zona) => ({
			zona,
			filas: municipios.filter((m) => (m.zona ?? "Sin zona") === zona)
		})).filter((g) => g.filas.length > 0);
	}, [municipios]);
	if (dias.length === 0) return null;
	const celdaColor = (value) => {
		if (value <= 0) return "rgba(255,255,255,0.055)";
		return `rgba(129,200,236,${(.42 + value / maxDia * .58).toFixed(2)})`;
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Qué municipio recibió cada día" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 max-w-2xl text-lg leading-8 text-[#4E6B7C]",
			children: "Cada casilla es un día. Más azul, más entregas ese día."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 overflow-x-auto rounded-lg border border-white/12 bg-[#0B2233] p-4 sm:p-5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-[660px] [--col-nombre:96px] sm:[--col-nombre:112px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fila, {
					dias,
					etiqueta: "",
					celdas: dias.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-center text-sm text-[#7E9AAD]",
						children: d
					}, d)),
					total: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm text-[#7E9AAD]",
						children: "total"
					})
				}), porZona.map(({ zona, filas }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3.5 mb-1.5 text-sm font-bold uppercase tracking-[0.1em] text-[#81C8EC]",
					children: zona
				}), filas.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onSelect?.(m),
					className: "block w-full rounded transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#81C8EC]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fila, {
						dias,
						etiqueta: m.nombre,
						celdas: dias.map((d) => {
							const v = m.dias[d] ?? 0;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								title: `${m.nombre}, día ${d}: ${v === 0 ? "sin entregas" : v === 1 ? "1 entrega" : `${v} entregas`}`,
								className: "flex h-[22px] items-center justify-center rounded-sm text-[11px] font-bold text-[#06202F]",
								style: { background: celdaColor(v) },
								children: v > 0 ? v : ""
							}, d);
						}),
						total: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-right font-serif text-base text-white",
							children: m.entregas
						})
					})
				}, m.destinoId))] }, zona))]
			})
		})
	] });
}
function Fila({ dias, etiqueta, celdas, total }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid items-center gap-[2px] py-[1px]",
		style: { gridTemplateColumns: `var(--col-nombre) repeat(${dias.length}, 1fr) 42px` },
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
	/**
	* Antes esta lista decía "llegó a 44 municipios" en un departamento de
	* 41, porque el catálogo cuenta destinos de cualquier tipo. La ruta
	* separa las dos cuentas y acá se usa la de municipios.
	*/
	const categorias = (0, import_react.useMemo)(() => {
		if (!ayuda) return categoriasAyuda.map((c) => ({
			nombre: c.nombre,
			unidades: c.unidades,
			municipios: c.destinos,
			color: c.color,
			productos: c.productos
		}));
		return ayuda.categorias.map((viva) => {
			const local = categoriasAyuda.find((c) => c.nombre === viva.nombre);
			return {
				nombre: viva.nombre,
				unidades: viva.unidades,
				municipios: viva.municipios,
				color: local?.color ?? "#6E8B9E",
				productos: local?.productos ?? []
			};
		});
	}, [ayuda]);
	const totalUnidades = ayuda?.totalUnidades ?? 256650;
	const poblaciones = ayuda ? ayuda.poblaciones.map((p) => [p.nombre, p.despachos]) : poblacionesFocalizadas.map(([nombre, despachos]) => [nombre, despachos]);
	const pct = (unidades) => totalUnidades > 0 ? Math.round(unidades / totalUnidades * 100) : 0;
	const categoria = activa ? categorias.find((c) => c.nombre === activa) : void 0;
	const maxUnidades = Math.max(1, ...categorias.map((c) => c.unidades));
	const waffle = (0, import_react.useMemo)(() => categorias.flatMap((c) => Array.from({ length: Math.round(c.unidades / Math.max(1, totalUnidades) * 100) }, () => c)), [categorias, totalUnidades]);
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
				children: "Seleccione una categoría para ver qué artículos incluyó."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-10 grid gap-8 rounded-xl border border-[#00578C]/12 bg-white p-5 sm:p-7 lg:grid-cols-[minmax(210px,0.7fr)_minmax(0,1.4fr)] lg:items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "block font-serif text-[64px] leading-none tracking-[-0.02em] text-[#00578C]",
							children: totalToneladas.toLocaleString("es-CO")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-3 block text-lg text-[#4E6B7C]",
							children: "toneladas de ayuda"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-2 block text-base leading-6 text-[#6E8B9E]",
							children: toneladasMedidas ? "entregadas en todo el departamento" : "estimadas a partir del número de entregas"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-xl font-semibold text-[#0B2233]",
						children: "De qué está hecha esa ayuda"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 flex h-8 overflow-hidden rounded-md sm:h-9",
						children: categorias.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
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
						className: "mt-3 text-base text-[#6E8B9E]",
						children: "Cada bloque es el 1 por ciento de la ayuda. El color indica a qué necesidad responde cada categoría."
					})
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-[15px] text-[#4E6B7C]",
				children: familiasDeAyuda.map((f) => {
					const colores = f.categorias.map((n) => categorias.find((c) => c.nombre === n)?.color).filter((c) => typeof c === "string");
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
						className: "px-6 pt-6 text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]",
						children: "Categorías"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3",
						children: categorias.map((c) => {
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
											className: "flex min-w-0 items-center gap-2 text-base font-semibold text-[#0B2233]",
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
											c.municipios,
											" ",
											c.municipios === 1 ? "municipio" : "municipios"
										]
									})
								]
							}) }, c.nombre);
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]",
						children: categoria ? categoria.nombre : "Lo más entregado"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: productos.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniList, { rows: productos }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-base text-[#6E8B9E]",
							children: "No hay detalle de artículos para esta categoría."
						})
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]",
							children: "Grupos atendidos"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniList, { rows: poblaciones.map(([label, value]) => ({
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
* CanalesSection.tsx
* -----------------------------------------------------------------------
* Las rutas que el conteo por municipio deja fuera.
*
* Cali y el centro de acopio de Cartago se calculan desde la API. Los
* otros cinco canales no pueden: sus destinos no están atados a un
* municipio, así que quedan fuera de route=flujos por diseño (ver
* Catalogs.gs, precision SIN_UBICAR). Esos siguen con cifras del
* catálogo y van marcados.
*
* Las unidades por categoría vienen de ENVIOS_CATEGORIA, que ninguna
* ruta expone todavía. Son las mismas para todos los canales.
*/
var ORIGEN_CARTAGO = "ORI-CARTAGO";
var ID_CALI = "cali";
var ID_CARTAGO = "acopio-cartago";
function CanalesSection() {
	const op = useOperacion();
	const { data: ayuda } = useAyuda();
	const cartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO);
	/**
	* Las categorías de cada canal salen de route=ayuda cuando existe. El
	* catálogo queda de respaldo y como fuente del color, que es una
	* decisión de diseño y no un dato.
	*/
	const categoriasDe = (nombre, respaldo) => {
		const vivo = ayuda?.canales.find((c) => sameMunicipality(c.nombre, nombre) || c.nombre === nombre);
		if (!vivo) return respaldo.map(([label, value, color]) => ({
			label,
			value,
			color
		}));
		return vivo.categorias.map((cat) => ({
			label: cat.nombre,
			value: cat.unidades,
			color: respaldo.find(([n]) => n === cat.nombre)?.[2] ?? "#6E8B9E"
		}));
	};
	const entregasDe = (id, respaldo) => {
		if (id === ID_CALI && op.entregasCali > 0) return op.entregasCali;
		if (id === ID_CARTAGO && cartago) return cartago.entregas;
		return respaldo;
	};
	const total = canales.reduce((sum, c) => sum + entregasDe(c.id, c.despachos), 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "De dónde salió" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionTitle, { children: "Además de los municipios, la ayuda salió por otras siete rutas" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-5 max-w-2xl text-lg leading-8 text-[#4E6B7C]",
				children: [
					"El conteo por municipio deja fuera estas rutas. Suman ",
					total,
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
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "mt-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "font-serif text-[23px] leading-none text-[#00578C]",
								children: entregasDe(c.id, c.despachos).toLocaleString("es-CO")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "mt-1 text-sm text-[#6E8B9E]",
								children: "entregas"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniList, { rows: categoriasDe(c.nombre, c.categorias) })
						})
					]
				}, c.id))
			}),
			cartago && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.85fr)] lg:items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]",
						children: "La red del acopio de Cartago"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-base leading-7 text-[#4E6B7C]",
						children: "Esta bodega registra a qué municipio salió cada entrega. Es la única ruta que no parte de Cali y explica cómo se abasteció el norte."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniList, { rows: cartago.destinos.map((d) => ({
							label: d.nombre,
							value: d.entregas,
							color: "#E2690E"
						})) })
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "border-l-[3px] border-l-[#F0801E]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "block font-serif text-[33px] leading-none text-[#00578C]",
							children: cartago.entregas
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1.5 text-base font-semibold text-[#6E8B9E]",
							children: "Entregas desde Cartago"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-base leading-7 text-[#4E6B7C]",
							children: [
								"Llegaron a ",
								cartago.municipios,
								" municipios del norte del Valle. Se cuentan como entrega municipal, igual que las que salen de Cali."
							]
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
/**
* Los hallazgos se arman con las cifras del momento. Antes eran texto
* fijo y quedaban desfasados: decían 321 entregas cuando la página ya
* mostraba 339, y nombraban como último día uno que la operación había
* dejado atrás.
*
* Los que hablan de artículos y de grupos atendidos siguen con cifras
* fijas porque salen de la base de ítems, que no está expuesta por la
* API. Están marcados con una nota.
*/
function hallazgosDe(op, ayuda) {
	const lista = [];
	const arranque = op.jornadas.slice(0, 2);
	if (arranque.length === 2) {
		const entregas = arranque.reduce((sum, j) => sum + j.entregas, 0);
		const municipios = arranque.reduce((sum, j) => sum + j.nuevos, 0);
		const porcentaje = op.totalEntregas > 0 ? Math.round(entregas / op.totalEntregas * 100) : 0;
		lista.push({
			eje: "movimiento",
			titulo: "Las ayudas llegaron a casi todo el departamento en dos días",
			texto: `En los dos primeros días las ayudas llegaron a ${municipios} municipios. En esas dos jornadas salió el ${porcentaje} por ciento de las entregas, ${entregas} de ${op.totalEntregas}. Después la operación volvió una y otra vez sobre los mismos municipios.`
		});
	}
	const primero = op.municipios[0];
	if (primero) lista.push({
		eje: "territorio",
		titulo: `${primero.nombre} es el municipio que más veces recibió ayudas`,
		texto: `${primero.nombre} registra ${primero.entregas} entregas, más que ningún otro municipio del Valle. Recibir más veces no significa recibir más cantidad: el volumen depende de lo que traía cada envío.`
	});
	const cartago = op.entregasPorOrigen.find((o) => o.origenId === "ORI-CARTAGO");
	if (cartago) lista.push({
		eje: "movimiento",
		titulo: "Las ayudas salen de dos centros de acopio",
		texto: `Además del acopio de Cali, la bodega de Cartago envió ${cartago.entregas} entregas a ${cartago.municipios} municipios del norte. El norte del Valle se abastece por una ruta propia.`
	});
	const dosPrimeras = (ayuda?.categorias ?? []).slice(0, 2);
	if (dosPrimeras.length === 2 && ayuda) {
		const suma = dosPrimeras.reduce((s, c) => s + c.unidades, 0);
		const porcentaje = ayuda.totalUnidades > 0 ? Math.round(suma / ayuda.totalUnidades * 100) : 0;
		lista.push({
			eje: "ayuda",
			titulo: `Más de la mitad de la ayuda es ${dosPrimeras[0].nombre.toLowerCase()} y ${dosPrimeras[1].nombre.toLowerCase()}`,
			texto: `${dosPrimeras[0].nombre} y ${dosPrimeras[1].nombre} suman el ${porcentaje} por ciento de todo lo entregado.`
		});
	} else lista.push({
		eje: "ayuda",
		titulo: "Más de la mitad de la ayuda es aseo y comida",
		texto: "El aseo personal y los alimentos suman la mayor parte de todo lo entregado. El artículo más repartido son los tapabocas."
	});
	const grupos = ayuda?.poblaciones ?? [];
	const primerGrupo = grupos[0];
	if (primerGrupo && grupos.length > 2) lista.push({
		eje: "ayuda",
		titulo: `${primerGrupo.nombre} es el grupo que más aparece en las entregas`,
		texto: `${primerGrupo.despachos} entregas declaran ayuda dirigida a ${primerGrupo.nombre.toLowerCase()}. Le siguen ${grupos[1].nombre.toLowerCase()} con ${grupos[1].despachos} y ${grupos[2].nombre.toLowerCase()} con ${grupos[2].despachos}.`
	});
	const china = grupos.find((g) => g.nombre.toLowerCase().indexOf("china") !== -1);
	if (china) lista.push({
		eje: "movimiento",
		titulo: "La donación de China se repartió junto con el resto",
		texto: `${china.despachos} entregas corresponden a la donación de la República China. Se repartieron dentro de la operación municipal, en los mismos municipios que el resto de las ayudas.`
	});
	const faltan = op.municipiosTotales - op.municipiosAtendidos;
	lista.push({
		eje: "territorio",
		titulo: faltan === 0 ? "Todos los municipios del Valle recibieron ayudas" : "La cobertura llega a casi todo el departamento",
		texto: faltan === 0 ? `Los ${op.municipiosTotales} municipios del Valle registran al menos una entrega.` : `${op.municipiosAtendidos} de los ${op.municipiosTotales} municipios del Valle registran al menos una entrega.`
	});
	if (op.picoEntregas && op.picoCobertura) {
		const mismoDia = op.picoEntregas.dia === op.picoCobertura.dia;
		lista.push({
			eje: "evolucion",
			titulo: mismoDia ? "El día más intenso de toda la operación" : "El día de más entregas y el de más municipios no fueron el mismo",
			texto: mismoDia ? `El ${Number(op.picoEntregas.dia)} de agosto salieron ${op.picoEntregas.entregas} entregas hacia ${op.picoEntregas.municipios} municipios.` : `El ${Number(op.picoEntregas.dia)} de agosto salieron ${op.picoEntregas.entregas} entregas, la cifra más alta. El ${Number(op.picoCobertura.dia)} llegaron ayudas a ${op.picoCobertura.municipios} municipios, la mayor cobertura en un día.`
		});
	}
	return lista;
}
/**
* HallazgosSection.tsx, Nivel 8, "¿Qué nos están diciendo los datos?"
* -----------------------------------------------------------------------
* Cierre del recorrido. El color del borde codifica de qué nivel viene
* cada lectura, así que funciona como índice inverso: dice dónde volver
* a verificarla.
* -----------------------------------------------------------------------
*/
function HallazgosSection() {
	const op = useOperacion();
	const { data: ayuda } = useAyuda();
	const hallazgos = hallazgosDe(op, ayuda);
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 max-w-2xl text-lg leading-8 text-[#BBD6E6]",
				children: [hallazgos.length, " lecturas sobre cómo se movió la ayuda en el departamento."]
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-12 max-w-3xl text-base leading-7 text-[#9DB4C2]",
				children: [op.fechaCorteLarga ? `La información llega hasta el ${op.fechaCorteLarga}. ` : "", "Estas cifras muestran las ayudas que se entregaron. No miden cuánta ayuda necesita cada municipio."]
			})
		]
	});
}
var SCROLL_ROOT_ID = "ruta-solidaridad-scroll";
var NAV = [
	{
		id: "inicio",
		label: "Inicio",
		icon: House
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
		id: "soportes",
		label: "Soportes documentales",
		icon: FileText
	},
	{
		id: "conclusiones",
		label: "Conclusiones",
		icon: Lightbulb
	},
	{
		id: "mapa-de-ayudas",
		label: "Mapa de Ayudas",
		icon: Map$1
	}
];
function StoryPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperacionProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Contenido, {}) });
}
function Contenido() {
	const op = useOperacion();
	const irAlMapa = (0, import_react.useCallback)(() => {
		document.getElementById("mapa-de-ayudas")?.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
	}, []);
	const kpis = [
		{
			value: `${op.municipiosAtendidos} de ${op.municipiosTotales}`,
			label: "municipios recibieron ayudas"
		},
		{
			value: op.totalEntregas.toLocaleString("es-CO"),
			label: "entregas llegaron a los municipios"
		},
		{
			value: `${op.totalToneladas.toLocaleString("es-CO")} toneladas`,
			label: op.toneladasMedidas ? "de ayuda salieron del departamento" : "estimadas según el número de entregas"
		},
		{
			value: `${op.diasConEntrega} días`,
			label: op.rangoLargo ? `con entregas, ${op.rangoLargo}` : "con entregas registradas"
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarNav, {
		items: NAV,
		scrollRootId: SCROLL_ROOT_ID,
		homeId: "inicio",
		fechaCorte: op.fechaCorteLarga
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		id: SCROLL_ROOT_ID,
		className: "h-dvh overflow-y-auto scroll-smooth bg-[#F4F9FC] text-[#0B2233] md:pl-20",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "inicio",
				className: "grid min-h-dvh place-items-center bg-[#EAF6FB] px-5 py-16 sm:px-6 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-4xl flex-col items-center text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]",
							children: "Gobernación del Valle del Cauca"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-6 font-serif text-[clamp(2.75rem,11vw,7rem)] leading-[0.98] text-[#00578C]",
							children: "Ruta de la Solidaridad"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-7 max-w-2xl text-lg leading-8 text-[#315A70] sm:text-xl sm:leading-9",
							children: "Después del terremoto del 10 de agosto de 2026, la Gobernación entregó ayudas humanitarias de emergencia en los municipios del Valle del Cauca."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 max-w-2xl text-lg leading-8 text-[#315A70] sm:text-xl sm:leading-9",
							children: "A continuación encontrará toda la información."
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "resumen",
				className: "bg-white px-4 py-14 sm:px-6 sm:py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "max-w-3xl font-serif text-[clamp(1.75rem,5.5vw,3rem)] leading-[1.15] text-[#0B2233]",
							children: [
								op.municipiosAtendidos,
								" de los ",
								op.municipiosTotales,
								" municipios del Valle recibieron ayudas"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4",
							children: kpis.map((kpi) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl border border-[#00578C]/12 bg-[#F7FBFD] p-5 sm:p-7",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
									className: "block font-serif text-[clamp(1.75rem,6vw,2.5rem)] leading-none text-[#00578C]",
									children: kpi.value
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-base leading-7 text-[#4E6B7C] sm:text-lg",
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
				className: "bg-[#F4F9FC] px-4 py-14 sm:px-6 sm:py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Cuándo se entregó" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-4 max-w-3xl font-serif text-[clamp(1.75rem,5.5vw,3rem)] leading-[1.15]",
							children: tituloCuando(op.picoEntregas?.dia, op.picoCobertura?.dia)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-12 space-y-14",
							children: [
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
				className: "bg-white px-4 py-14 sm:px-6 sm:py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl space-y-16",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Municipios" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-4 max-w-3xl font-serif text-[clamp(1.75rem,5.5vw,3rem)] leading-[1.15]",
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
				className: "bg-[#F4F9FC] px-4 py-14 sm:px-6 sm:py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AyudaSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "de-donde-salio",
				className: "bg-white px-4 py-14 sm:px-6 sm:py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CanalesSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "soportes",
				className: "bg-[#F4F9FC] px-4 py-14 sm:px-6 sm:py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Soportes documentales" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-4 max-w-3xl font-serif text-[clamp(1.75rem,5.5vw,3rem)] leading-[1.15]",
							children: "Cada entrega tiene un documento que la respalda"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 max-w-2xl text-base leading-7 text-[#4E6B7C] sm:text-lg sm:leading-8",
							children: "La información de este tablero corresponde a las entregas realizadas en los centros de acopio. Cada una cuenta con un formato físico de soporte. La cuenta va paso a paso, porque un formato conjunto reparte a varios municipios y un documento reescaneado no suma una entrega nueva."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-10",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanoramaPuente, {})
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "conclusiones",
				className: "bg-[#0B2233] px-4 py-14 text-white sm:px-6 sm:py-20 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HallazgosSection, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				id: "mapa-de-ayudas",
				className: "relative h-dvh bg-[#0B2233]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardPage, { embedded: true })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "bg-[#061621] px-4 py-10 text-base leading-7 text-[#9DB4C2] sm:px-6 md:px-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
							className: "block font-serif text-xl text-[#CBE4F2]",
							children: "Ruta de la Solidaridad"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 max-w-2xl",
							children: [
								"Gobernación del Valle del Cauca. Ayudas entregadas tras el terremoto del 10 de agosto de 2026",
								op.fechaCorteLarga ? `, con información al ${op.fechaCorteLarga}` : "",
								"."
							]
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
/** El titular nombra los días reales, así que cambia con los datos. */
function tituloCuando(diaPico, diaCobertura) {
	if (!diaPico || !diaCobertura) return "Cómo avanzaron las entregas día a día";
	if (diaPico === diaCobertura) return `El ${Number(diaPico)} de agosto se entregó más que ningún otro día`;
	return `El ${Number(diaCobertura)} de agosto se llegó a más municipios y el ${Number(diaPico)} se entregó más`;
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
