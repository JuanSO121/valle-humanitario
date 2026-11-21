import { r as __toESM } from "../_runtime.mjs";
import { a as require_react, i as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-B5uEBjej.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* AdminPage.tsx — /admin, «Cargar datos al tablero»
* -----------------------------------------------------------------------
* Página protegida por clave, sin enlaces desde el resto del sitio. La
* persona sube el archivo de carga (lo prepara una IA a partir de la
* plantilla del DADI), ve los datos como tabla, y solo si están bien los
* carga al libro.
*
*   1. Clave        la comprueba el servidor (lib/proxyAdmin.ts).
*   2. Archivo      un .json, o el texto pegado.
*   3. Revisar      NO escribe nada: devuelve lo que pasaría, fila por fila.
*   4. Cargar       escribe en el libro, tras marcar que se revisó la tabla.
*
* La clave solo vive en esta pantalla: no se guarda en el navegador.
* Los textos están escritos para quien no sabe de bases de datos.
* -----------------------------------------------------------------------
*/
var MAX_BYTES = 25e5;
var POR_PAGINA = 25;
var ETIQUETA_ESTADO = {
	nueva: "Se agrega",
	completa: "Completa una fila pendiente",
	duplicada: "Ya está, no se repite",
	error: "No se carga"
};
var COLOR_ESTADO = {
	nueva: "bg-[#E4F4E4] text-[#1D6B2E]",
	completa: "bg-[#E7F1FB] text-[#0A5A99]",
	duplicada: "bg-[#EEF0F2] text-[#4A5A66]",
	error: "bg-[#FBEBEB] text-[#A3261F]"
};
var numero = (n) => n === null || n === void 0 ? "—" : n.toLocaleString("es-CO", { maximumFractionDigits: 3 });
async function llamar(accion, clave, carga) {
	const respuesta = await fetch("/api/admin", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-admin-clave": clave
		},
		body: JSON.stringify({
			accion,
			carga
		})
	});
	let datos = null;
	try {
		datos = await respuesta.json();
	} catch {
		datos = null;
	}
	if (!respuesta.ok || datos?.error) throw new Error(datos?.message ?? "No se pudo completar la solicitud. Intente de nuevo.");
	return datos;
}
function AdminPage() {
	const idClave = (0, import_react.useId)();
	const idTexto = (0, import_react.useId)();
	const [clave, setClave] = (0, import_react.useState)("");
	const [nombreArchivo, setNombreArchivo] = (0, import_react.useState)(null);
	const [texto, setTexto] = (0, import_react.useState)("");
	const [carga, setCarga] = (0, import_react.useState)(null);
	const [fase, setFase] = (0, import_react.useState)("inicio");
	const [problema, setProblema] = (0, import_react.useState)(null);
	const [plan, setPlan] = (0, import_react.useState)(null);
	const [resultado, setResultado] = (0, import_react.useState)(null);
	const [confirmado, setConfirmado] = (0, import_react.useState)(false);
	const entradaArchivo = (0, import_react.useRef)(null);
	const ocupado = fase === "revisando" || fase === "cargando";
	function reiniciar() {
		setCarga(null);
		setNombreArchivo(null);
		setTexto("");
		setPlan(null);
		setResultado(null);
		setConfirmado(false);
		setProblema(null);
		setFase("inicio");
		if (entradaArchivo.current) entradaArchivo.current.value = "";
	}
	function leerJson(contenido) {
		if (new TextEncoder().encode(contenido).length > MAX_BYTES) {
			setProblema("El archivo es demasiado grande. Divídalo en partes más pequeñas.");
			return false;
		}
		try {
			setCarga(JSON.parse(contenido));
			setProblema(null);
			setPlan(null);
			setConfirmado(false);
			setFase("inicio");
			return true;
		} catch {
			setCarga(null);
			setProblema("El archivo no se pudo leer. Revise que sea el archivo de carga completo.");
			return false;
		}
	}
	async function alElegirArchivo(evento) {
		const archivo = evento.target.files?.[0];
		if (!archivo) return;
		setNombreArchivo(archivo.name);
		setTexto("");
		leerJson(await archivo.text());
	}
	function alPegarTexto(valor) {
		setTexto(valor);
		setNombreArchivo(null);
		if (valor.trim() === "") {
			setCarga(null);
			setProblema(null);
			return;
		}
		leerJson(valor);
	}
	async function revisar() {
		if (!carga) return;
		setProblema(null);
		setFase("revisando");
		try {
			const datos = await llamar("revisar", clave, carga);
			setPlan(datos);
			setConfirmado(false);
			setFase("revisado");
		} catch (e) {
			setProblema(e instanceof Error ? e.message : "No se pudo revisar el archivo.");
			setFase("inicio");
		}
	}
	async function cargar() {
		if (!carga || !plan?.puedeCargar || !confirmado) return;
		setProblema(null);
		setFase("cargando");
		try {
			const datos = await llamar("aplicar", clave, carga);
			setResultado(datos);
			setFase("listo");
		} catch (e) {
			setProblema(e instanceof Error ? e.message : "No se pudo cargar. No se cambió nada.");
			setFase("revisado");
		}
	}
	const puedeRevisar = !!carga && clave.length > 0 && !ocupado;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-dvh bg-[#F2FAFD] px-4 py-8 text-[#123E5C] sm:px-6 sm:py-12",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-5xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[13px] font-bold uppercase tracking-[0.12em] text-[#35708F]",
					children: "Ruta de la Solidaridad · Solo para quien administra"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-1 text-3xl font-extrabold leading-tight text-[#0079C1] sm:text-4xl",
					children: "Cargar datos al tablero"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-2xl text-base leading-6",
					children: "Suba el archivo de la carga, revise la tabla y, si todo está bien, cárguela. Antes de que usted confirme, no se escribe nada en el libro."
				})
			] }), fase === "listo" && resultado ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Listo, {
				resultado,
				alNuevo: reiniciar
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					"aria-labelledby": "paso1",
					className: "mt-8 rounded-xl bg-white p-5 shadow-sm sm:p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: "paso1",
							className: "text-xl font-extrabold text-[#0079C1]",
							children: "1. Clave"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: idClave,
							className: "mt-3 block text-base font-semibold",
							children: "Escriba la clave de administración"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: idClave,
							type: "password",
							autoComplete: "current-password",
							value: clave,
							onChange: (e) => setClave(e.target.value),
							disabled: ocupado,
							className: "mt-1.5 block w-full max-w-sm rounded-lg border border-[#123E5C]/30 bg-white px-3 py-2.5 text-base focus:border-[#0079C1] focus:outline-none focus:ring-2 focus:ring-[#0079C1]/30"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					"aria-labelledby": "paso2",
					className: "mt-4 rounded-xl bg-white p-5 shadow-sm sm:p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: "paso2",
							className: "text-xl font-extrabold text-[#0079C1]",
							children: "2. Archivo de la carga"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-base leading-6",
							children: [
								"Es el archivo que preparó la IA con la información de la plantilla. Termina en",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: ".json" }),
								"."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							ref: entradaArchivo,
							type: "file",
							accept: ".json,application/json",
							onChange: alElegirArchivo,
							disabled: ocupado,
							"aria-label": "Elegir el archivo de la carga",
							className: "mt-3 block w-full text-base file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#0079C1] file:px-4 file:py-2.5 file:font-bold file:text-white hover:file:bg-[#0A5A99]"
						}),
						nombreArchivo && carga !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-[15px] text-[#1D6B2E]",
							children: ["Archivo leído: ", nombreArchivo]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
							className: "mt-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
									className: "cursor-pointer text-base font-semibold text-[#0079C1]",
									children: "O pegue el texto de la carga aquí"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									htmlFor: idTexto,
									className: "sr-only",
									children: "Texto de la carga"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									id: idTexto,
									value: texto,
									onChange: (e) => alPegarTexto(e.target.value),
									disabled: ocupado,
									rows: 6,
									spellCheck: false,
									className: "mt-2 block w-full rounded-lg border border-[#123E5C]/30 bg-white p-3 font-mono text-[13px] focus:border-[#0079C1] focus:outline-none focus:ring-2 focus:ring-[#0079C1]/30"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: revisar,
							disabled: !puedeRevisar,
							className: "mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0079C1] px-6 py-2.5 text-base font-bold text-white transition-colors hover:bg-[#0A5A99] disabled:cursor-not-allowed disabled:opacity-50",
							children: fase === "revisando" ? "Revisando…" : "Revisar los datos"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					"aria-live": "polite",
					className: "mt-4",
					children: problema && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						role: "alert",
						className: "rounded-xl bg-[#FBEBEB] px-4 py-3 text-base font-semibold text-[#A3261F]",
						children: problema
					})
				}),
				plan && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Revision, {
					plan,
					confirmado,
					alConfirmar: setConfirmado,
					cargando: fase === "cargando",
					alCargar: cargar
				})
			] })]
		})
	});
}
function Revision({ plan, confirmado, alConfirmar, cargando, alCargar }) {
	const secciones = (0, import_react.useMemo)(() => [
		plan.distribucion && {
			id: "distribucion",
			nombre: "Distribución"
		},
		plan.queHaceFalta && {
			id: "faltante",
			nombre: "Qué hace falta"
		},
		plan.informacionGeneral && {
			id: "general",
			nombre: "Información general"
		}
	].filter(Boolean), [plan]);
	const [activa, setActiva] = (0, import_react.useState)(secciones[0]?.id ?? "");
	const idConfirmar = (0, import_react.useId)();
	const d = plan.distribucion?.resumen;
	const cuantas = (d?.nuevas ?? 0) + (d?.completan ?? 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		"aria-labelledby": "paso3",
		className: "mt-4 rounded-xl bg-white p-5 shadow-sm sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				id: "paso3",
				className: "text-xl font-extrabold text-[#0079C1]",
				children: "3. Revise la tabla"
			}),
			plan.errores.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				role: "alert",
				className: "mt-3 space-y-1 rounded-xl bg-[#FBEBEB] px-4 py-3 text-base font-semibold text-[#A3261F]",
				children: plan.errores.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: e }, e))
			}),
			plan.avisos.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 space-y-1 rounded-xl bg-[#FFF6DA] px-4 py-3 text-base text-[#7A5A00]",
				children: plan.avisos.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: a }, a))
			}),
			plan.avisosDeLaIA && plan.avisosDeLaIA.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 rounded-xl bg-[#FFF6DA] px-4 py-3 text-base text-[#7A5A00]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-bold",
					children: "La IA que preparó el archivo dejó estas dudas:"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-1 list-disc space-y-1 pl-5",
					children: plan.avisosDeLaIA.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: a }, a))
				})]
			}),
			secciones.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					role: "tablist",
					"aria-label": "Partes del archivo",
					className: "mt-4 flex flex-wrap gap-2",
					children: secciones.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						role: "tab",
						id: `pestana-${s.id}`,
						"aria-selected": activa === s.id,
						"aria-controls": `panel-${s.id}`,
						type: "button",
						onClick: () => setActiva(s.id),
						className: `min-h-11 rounded-lg px-4 py-2 text-base font-bold transition-colors ${activa === s.id ? "bg-[#0079C1] text-white" : "bg-[#E7F1FB] text-[#0A5A99] hover:bg-[#D3E7F8]"}`,
						children: s.nombre
					}, s.id))
				}),
				plan.distribucion && activa === "distribucion" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					id: "panel-distribucion",
					role: "tabpanel",
					"aria-labelledby": "pestana-distribucion",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TablaDistribucion, { datos: plan.distribucion })
				}),
				plan.queHaceFalta && activa === "faltante" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					id: "panel-faltante",
					role: "tabpanel",
					"aria-labelledby": "pestana-faltante",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TablaFaltante, { datos: plan.queHaceFalta })
				}),
				plan.informacionGeneral && activa === "general" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					id: "panel-general",
					role: "tabpanel",
					"aria-labelledby": "pestana-general",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TablaGeneral, { datos: plan.informacionGeneral })
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 border-t border-[#123E5C]/10 pt-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-xl font-extrabold text-[#0079C1]",
					children: "4. Cargar al libro"
				}), plan.puedeCargar ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-base leading-6",
						children: [
							cuantas > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								"Se cargarán ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: cuantas }),
								" filas de distribución.",
								" "
							] }),
							d && d.duplicadas > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [d.duplicadas, " ya estaban y no se repetirán. "] }),
							d && d.conProblema > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", {
								className: "text-[#A3261F]",
								children: [
									d.conProblema,
									" tienen un problema y NO se cargarán.",
									" "
								]
							}),
							plan.queHaceFalta?.reemplaza && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: "La lista de «Qué hace falta» se reemplazará por la nueva. " })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex items-start gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: idConfirmar,
							type: "checkbox",
							checked: confirmado,
							onChange: (e) => alConfirmar(e.target.checked),
							disabled: cargando,
							className: "mt-1 size-5 shrink-0 accent-[#0079C1]"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: idConfirmar,
							className: "text-base leading-6",
							children: "Revisé la tabla y quiero cargar estos datos al libro."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: alCargar,
						disabled: !confirmado || cargando,
						className: "mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#2E9E5B] px-6 py-2.5 text-base font-bold text-white transition-colors hover:bg-[#237A46] disabled:cursor-not-allowed disabled:opacity-50",
						children: cargando ? "Cargando… no cierre esta página" : "Cargar al libro"
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-base leading-6 text-[#A3261F]",
					children: "Con este archivo no hay nada que se pueda cargar. Corrija los problemas, vuelva a preparar el archivo y revíselo otra vez."
				})]
			})
		]
	});
}
function Chip({ estado }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-bold ${COLOR_ESTADO[estado]}`,
		children: ETIQUETA_ESTADO[estado]
	});
}
function Contenedor({ titulo, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		tabIndex: 0,
		role: "region",
		"aria-label": titulo,
		className: "mt-4 overflow-x-auto rounded-lg border border-[#123E5C]/10",
		children
	});
}
var celda = "border-b border-[#123E5C]/10 px-3 py-2.5 text-left align-top text-[15px]";
var cabecera = "bg-[#0079C1] px-3 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide text-white";
function TablaDistribucion({ datos }) {
	const [soloAtencion, setSoloAtencion] = (0, import_react.useState)(false);
	const [pagina, setPagina] = (0, import_react.useState)(0);
	const idFiltro = (0, import_react.useId)();
	const filas = (0, import_react.useMemo)(() => soloAtencion ? datos.filas.filter((f) => f.estado === "error" || f.avisos.length > 0) : datos.filas, [datos.filas, soloAtencion]);
	const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
	const actual = Math.min(pagina, paginas - 1);
	const visibles = filas.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA);
	const r = datos.resumen;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
			className: "mt-4 grid gap-2 text-base sm:grid-cols-2 lg:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Resumen, {
					cifra: r.nuevas,
					texto: "se agregan",
					color: "text-[#1D6B2E]"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Resumen, {
					cifra: r.completan,
					texto: "completan una fila pendiente",
					color: "text-[#0A5A99]"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Resumen, {
					cifra: r.duplicadas,
					texto: "ya estaban",
					color: "text-[#4A5A66]"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Resumen, {
					cifra: r.conProblema,
					texto: "con problema, no se cargan",
					color: "text-[#A3261F]"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3 flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: idFiltro,
				type: "checkbox",
				checked: soloAtencion,
				onChange: (e) => {
					setSoloAtencion(e.target.checked);
					setPagina(0);
				},
				className: "size-5 accent-[#0079C1]"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				htmlFor: idFiltro,
				className: "text-base",
				children: [
					"Mostrar solo las filas con problema o aviso (",
					r.conProblema + r.conAviso,
					")"
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Contenedor, {
			titulo: "Tabla de distribución",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full min-w-[820px] border-collapse",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("caption", {
						className: "sr-only",
						children: "Filas de distribución del archivo y qué pasará con cada una"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: [
						"N.º",
						"Qué pasa",
						"Fecha",
						"A dónde",
						"Tipo de ayuda",
						"Producto",
						"Kilos",
						"Notas"
					].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						scope: "col",
						className: cabecera,
						children: t
					}, t)) }) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [visibles.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						colSpan: 8,
						className: celda,
						children: "No hay filas para mostrar."
					}) }), visibles.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: f.estado === "error" ? "bg-[#FFF5F5]" : f.avisos.length ? "bg-[#FFFBEF]" : "",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: celda,
								children: f.n
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: celda,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, { estado: f.estado }), f.filaLibro && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 text-[13px] text-[#35708F]",
									children: [
										"fila ",
										f.filaLibro,
										" del libro"
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: `${celda} whitespace-nowrap`,
								children: f.fecha ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: celda,
								children: f.destino ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: celda,
								children: f.familia ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: celda,
								children: [f.producto ?? "—", f.cantidad !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[13px] text-[#35708F]",
									children: ["cantidad: ", numero(f.cantidad)]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: `${celda} tabular-nums`,
								children: numero(f.kilosTotal)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: celda,
								children: [
									f.errores.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-semibold text-[#A3261F]",
										children: e
									}, e)),
									f.avisos.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[#7A5A00]",
										children: a
									}, a)),
									f.dudas && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[#7A5A00]",
										children: "Marcada con dudas."
									}),
									f.observaciones && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[#35708F]",
										children: f.observaciones
									})
								]
							})
						]
					}, f.n))] })
				]
			})
		}),
		paginas > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
			"aria-label": "Páginas de la tabla",
			className: "mt-3 flex items-center justify-between gap-3 text-base",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setPagina(Math.max(0, actual - 1)),
					disabled: actual === 0,
					className: "min-h-11 rounded-lg bg-[#E7F1FB] px-4 font-bold text-[#0A5A99] disabled:opacity-40",
					children: "Anterior"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					"Página ",
					actual + 1,
					" de ",
					paginas
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setPagina(Math.min(paginas - 1, actual + 1)),
					disabled: actual >= paginas - 1,
					className: "min-h-11 rounded-lg bg-[#E7F1FB] px-4 font-bold text-[#0A5A99] disabled:opacity-40",
					children: "Siguiente"
				})
			]
		})
	] });
}
function Resumen({ cifra, texto, color }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "rounded-lg bg-[#F2FAFD] px-3 py-2.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
				className: `text-2xl tabular-nums ${color}`,
				children: cifra
			}),
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: texto })
		]
	});
}
function TablaFaltante({ datos }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-4 text-base leading-6",
		children: datos.reemplaza ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			"La lista de «Qué hace falta» se ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "reemplazará" }),
			": hoy tiene ",
			datos.antes ?? "—",
			" ",
			"elementos y quedará con ",
			datos.despues,
			"."
		] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
			className: "text-[#A3261F]",
			children: "No hay ninguna fila válida: la lista actual no se cambia."
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Contenedor, {
		titulo: "Tabla de qué hace falta",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full min-w-[640px] border-collapse",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("caption", {
					className: "sr-only",
					children: "Elementos de «Qué hace falta» del archivo"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: [
					"N.º",
					"Categoría",
					"Qué es",
					"¿Cómo está?",
					"Notas"
				].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					scope: "col",
					className: cabecera,
					children: t
				}, t)) }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: datos.filas.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: f.estadoFila === "error" ? "bg-[#FFF5F5]" : "",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: celda,
							children: f.n
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: celda,
							children: f.categoria ?? "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: celda,
							children: f.elemento ?? "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: celda,
							children: f.estado ?? "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: celda,
							children: [f.errores.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-semibold text-[#A3261F]",
								children: e
							}, e)), f.observaciones && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[#35708F]",
								children: f.observaciones
							})]
						})
					]
				}, f.n)) })
			]
		})
	})] });
}
function TablaGeneral({ datos }) {
	const filas = [{
		nombre: "Toneladas aproximadas recibidas",
		c: datos.recibidas
	}, {
		nombre: "Toneladas aproximadas en inventario",
		c: datos.inventario
	}];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		datos.errores.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			role: "alert",
			className: "mt-4 font-semibold text-[#A3261F]",
			children: e
		}, e)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Contenedor, {
			titulo: "Tabla de información general",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full min-w-[520px] border-collapse",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("caption", {
						className: "sr-only",
						children: "Cifras generales: cómo están hoy y cómo quedarían"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: [
						"Dato",
						"Hoy",
						"Quedaría en",
						""
					].map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						scope: "col",
						className: cabecera,
						children: t
					}, i)) }) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: filas.map(({ nombre, c }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: celda,
							children: nombre
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `${celda} tabular-nums`,
							children: c.antes === null ? "Sin dato" : numero(c.antes)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `${celda} font-bold tabular-nums`,
							children: c.despues === null ? "No cambia" : numero(c.despues)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: celda,
							children: c.cambia ? "Se cambia" : "Igual que hoy"
						})
					] }, nombre)) })
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-[15px] text-[#35708F]",
			children: "Lo que el archivo no trae no se toca."
		})
	] });
}
function Listo({ resultado, alNuevo }) {
	const c = resultado.cargado;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		"aria-live": "polite",
		className: "mt-8 rounded-xl bg-white p-5 shadow-sm sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-2xl font-extrabold text-[#1D6B2E]",
				children: "Listo, los datos se cargaron"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-3 space-y-1 text-base leading-6",
				children: [
					c.nuevas > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Filas nuevas de distribución: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: c.nuevas })] }),
					c.completadas > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Filas pendientes que se completaron: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: c.completadas })] }),
					c.repetidas > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Filas que ya estaban y no se repitieron: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: c.repetidas })] }),
					c.conProblema > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Filas con problema que no se cargaron: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: c.conProblema })] }),
					c.faltantes > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Elementos de «Qué hace falta»: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: c.faltantes })] }),
					c.totales > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Cifras generales cambiadas: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: c.totales })] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-base leading-6",
				children: "El tablero se actualiza en uno o dos minutos. Recargue la página del tablero para verlo."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: alNuevo,
				className: "mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0079C1] px-6 py-2.5 text-base font-bold text-white hover:bg-[#0A5A99]",
				children: "Hacer otra carga"
			})
		]
	});
}
/**
* routes/admin.tsx
* -----------------------------------------------------------------------
* /admin — carga de datos protegida por clave. No tiene enlaces desde el
* resto del sitio y pide a los buscadores que no la indexen.
* -----------------------------------------------------------------------
*/
var SplitComponent = AdminPage;
//#endregion
export { SplitComponent as component };
