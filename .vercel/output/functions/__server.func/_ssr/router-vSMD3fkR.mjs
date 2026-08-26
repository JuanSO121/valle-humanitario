import { n as __exportAll } from "../_runtime.mjs";
import { n as QueryClientProvider, r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { c as HeadContent, d as Outlet, f as lazyRouteComponent, m as createRootRouteWithContext, p as createFileRoute, s as Scripts, u as createRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-vSMD3fkR.js
var router_vSMD3fkR_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var import_jsx_runtime = require_jsx_runtime();
var Route$1 = createRootRouteWithContext()({
	head: () => ({ meta: [{ charSet: "utf-8" }, {
		name: "viewport",
		content: "width=device-width, initial-scale=1"
	}] }),
	component: RootComponent
});
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
var $$splitComponentImporter = () => import("./routes-Dq4D-5NL.mjs");
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
export { getRouter, router_vSMD3fkR_exports as t };
