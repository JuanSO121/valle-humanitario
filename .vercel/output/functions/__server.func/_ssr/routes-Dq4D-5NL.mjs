import { r as __toESM } from "../_runtime.mjs";
import { i as require_react, r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { h as ClientOnly } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Dq4D-5NL.js
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
var useFlujos = createCatalogQuery("flujos", () => ayudasApiRepository.getFlujos());
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
* Mismo principio que MapCanvas/arcAnimationEngine: la lógica de tiempo
* vive en un solo lugar (el intervalo de abajo), el resto es traducción.
* -----------------------------------------------------------------------
*/
var PLAYBACK_STEP_MS = 650;
function Timeline({ dates, currentDate, onSeek, onAdvance, onActivate, onExit }) {
	const [playing, setPlaying] = (0, import_react.useState)(false);
	const intervalRef = (0, import_react.useRef)(null);
	const currentIndex = currentDate ? dates.indexOf(currentDate) : -1;
	const atEnd = currentIndex >= 0 && currentIndex === dates.length - 1;
	(0, import_react.useEffect)(() => {
		if (!playing) {
			if (intervalRef.current !== null) clearInterval(intervalRef.current);
			intervalRef.current = null;
			return;
		}
		intervalRef.current = setInterval(() => {
			const next = dates[(currentDate ? dates.indexOf(currentDate) : -1) + 1];
			if (next === void 0) {
				setPlaying(false);
				return;
			}
			onAdvance(next);
		}, PLAYBACK_STEP_MS);
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
/**
* Cierra el panel al hacer click/tap fuera de él — pero SOLO cuando el
* clic cae fuera del mapa también. El mapa ocupa toda la pantalla y ya
* tiene su propia lógica de clic (sede > cluster > municipio > reset, ver
* MapCanvas), así que un clic ahí para abrir OTRO municipio o sede no debe
* competir con este listener genérico — si lo hiciera, el "cerrar" y el
* "abrir lo nuevo" se disparan por el mismo clic y pelean entre sí. Este
* listener solo actúa sobre clics en zonas realmente ajenas a ambos (por
* ejemplo, la barra superior de filtros).
*/
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
				className: "mt-0.5 rounded-md p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground",
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
					className: "truncate text-sm font-semibold",
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
				className: "rounded-md p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground",
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
		className: "pointer-events-auto absolute right-4 top-[4.75rem] z-10 flex w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl transition-all duration-200 ease-out",
		style: {
			maxHeight: "calc(100% - 6rem)",
			opacity: entered ? 1 : 0,
			transform: entered ? "translateX(0)" : "translateX(12px)"
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: "pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out",
		style: {
			height: expanded ? "70vh" : "auto",
			transform: entered ? "translateY(0)" : "translateY(16px)",
			opacity: entered ? 1 : 0
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setExpanded((v) => !v),
				"aria-label": expanded ? "Contraer panel" : "Expandir panel",
				className: "flex w-full justify-center py-2",
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
	});
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
* DashboardPage.tsx
* -----------------------------------------------------------------------
* Junta todo: catálogos (useCatalogQueries), estado de navegación
* (viewState.ts), el mapa (MapCanvas), el timeline (Timeline) y el panel
* de destino (DestinoPanel). Es el único componente que conoce todas las
* piezas a la vez — cada hook/componente que ensambla ya es independiente
* y no sabe de los demás (MapCanvas no sabe de Timeline, Timeline no sabe
* de destinos, DestinoPanel no sabe del timeline). Mantener ese
* desacoplamiento es la razón de que este archivo exista en vez de que
* cada pieza se importe entre sí.
* -----------------------------------------------------------------------
*/
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
function DashboardPage() {
	const [viewState, setViewState] = (0, import_react.useState)(INITIAL_VIEW_STATE);
	const isMobile = useIsMobile();
	const { data: flujosResponse } = useFlujos();
	const timelineDates = (0, import_react.useMemo)(() => {
		if (!flujosResponse?.flujos) return [];
		const set = /* @__PURE__ */ new Set();
		flujosResponse.flujos.forEach((f) => (f.porFecha ?? []).forEach((p) => set.add(p.fecha)));
		return [...set].sort();
	}, [flujosResponse]);
	(0, import_react.useEffect)(() => {
		if (!viewState.timelineInstant) return;
		setViewState((prev) => viewTransitions.clearInstantFlag(prev));
	}, [viewState.timelineInstant, viewState.timelineDate]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "theme-ayudas relative h-dvh w-dvw overflow-hidden bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientOnly, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 flex items-center justify-center bg-[#0b0e14] text-xs text-muted-foreground",
				children: "Cargando mapa…"
			}) }),
			!viewState.destinoId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlujosLegend, { compact: isMobile }),
			viewState.level === "DESTINO" && viewState.destinoId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DestinoPanel, {
				destinoId: viewState.destinoId,
				isMobile,
				onClose: () => setViewState((prev) => viewTransitions.toAll(prev))
			}),
			!(isMobile && viewState.destinoId) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 flex justify-center px-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timeline, {
					dates: timelineDates,
					currentDate: viewState.timelineDate,
					onActivate: (first) => setViewState((prev) => viewTransitions.startTimeline(first, prev)),
					onSeek: (date) => setViewState((prev) => viewTransitions.seekTimeline(date, prev)),
					onAdvance: (date) => setViewState((prev) => viewTransitions.advanceTimeline(date, prev)),
					onExit: () => setViewState((prev) => viewTransitions.exitTimeline(prev))
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
var SplitComponent = DashboardPage;
//#endregion
export { SplitComponent as component };
