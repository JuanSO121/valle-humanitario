import { n as __exportAll } from "../_runtime.mjs";
import { n as QueryClientProvider, r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { c as HeadContent, d as Outlet, f as lazyRouteComponent, m as createRootRouteWithContext, p as createFileRoute, s as Scripts, u as createRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-CHeJAXrE.js
var router_CHeJAXrE_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var import_jsx_runtime = require_jsx_runtime();
var Route$1 = createRootRouteWithContext()({
	head: () => ({
		meta: [{ charSet: "utf-8" }, {
			name: "viewport",
			content: "width=device-width, initial-scale=1"
		}],
		/**
		* Poppins se carga acá y NO con un @import dentro de marca.css.
		*
		* Al empaquetar, un @import de fuente dentro de una hoja de estilos
		* queda después de las reglas de Tailwind, y CSS exige que todos los
		* @import precedan a cualquier regla: lightningcss falla el build con
		* "@import rules must precede all rules".
		*
		* Cargarla en la cabecera además la pide antes de que el navegador
		* termine de leer el CSS, así que el texto no parpadea con la fuente
		* por defecto durante el primer render.
		*
		* Los preconnect abren la conexión con los dos dominios de Google
		* Fonts mientras todavía se está parseando el HTML. El de gstatic
		* necesita crossOrigin porque de ahí salen los archivos de fuente,
		* que se piden en modo anónimo.
		*/
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
			},
			{
				rel: "icon",
				href: "/favicon.ico"
			}
		]
	}),
	component: RootComponent,
	/**
	* Sin esto, TanStack Router muestra un `<p>Not Found</p>` suelto y
	* avisa por consola en cada arranque. En un sitio público de una
	* entidad territorial, una ruta equivocada tiene que devolver a la
	* persona a algún lado, no dejarla en una página en blanco.
	*/
	notFoundComponent: PaginaNoEncontrada
});
function PaginaNoEncontrada() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-dvh flex-col items-center justify-center bg-[#0079C1] px-6 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-bold uppercase tracking-[0.16em] text-[#FFD400]",
				children: "Página no encontrada"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "vc-titular mt-4 text-[clamp(2rem,8vw,4.5rem)] text-[#FBF8C6]",
				children: "Esta dirección no existe"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 max-w-lg text-lg leading-8 text-white",
				children: "Revise el enlace o vuelva al inicio para ver la información de las ayudas entregadas en el Valle del Cauca."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "/",
				className: "mt-9 inline-flex items-center rounded-full bg-[#FBF8C6] px-7 py-3.5 text-lg font-bold text-[#0079C1] transition hover:bg-white",
				children: "Ir al inicio"
			})
		]
	});
}
function RootComponent() {
	const { queryClient } = Route$1.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
			lang: "es",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
				className: "bg-background text-foreground antialiased",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})]
			})]
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
var $$splitComponentImporter = () => import("./routes-c20eMMLm.mjs");
var rootRouteChildren = { IndexRoute: createFileRoute("/")({
	component: lazyRouteComponent($$splitComponentImporter, "component"),
	head: () => ({ meta: [
		{ title: "Ayudas Humanitarias — Terremoto Valle del Cauca | Gobernación del Valle" },
		{
			name: "description",
			content: "Mapa de distribución de ayudas humanitarias entregadas por la Gobernación del Valle del Cauca tras el terremoto del 10 de agosto de 2026, por municipio y categoría."
		},
		{
			property: "og:title",
			content: "Ayudas Humanitarias — Terremoto Valle del Cauca"
		},
		{
			property: "og:description",
			content: "Distribución de ayudas por municipio y categoría, actualizada al corte de datos vigente."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "theme-color",
			content: "#0b0e14"
		}
	] })
}).update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$1
}) };
var routeTree = Route$1._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter, router_CHeJAXrE_exports as t };
