/**
 * routes/__root.tsx
 * -----------------------------------------------------------------------
 * Esta pieza faltaba y es la razón de que nada de lo generado antes
 * pudiera funcionar todavía: router.tsx crea el router con
 * `context: { queryClient }`, pero ningún componente montaba
 * QueryClientProvider con ese client — sin esto, cualquier hook de
 * useCatalogQueries/useDestinoResumen/etc. explota con "No QueryClient
 * set" apenas se renderiza.
 *
 * Es TanStack Start (SSR real sobre un worker, no una SPA con Vite
 * plano — se ve en server-entry.ts/router.tsx/routeTree.gen.ts) así que
 * el root route también es el dueño del documento HTML completo
 * (<html>/<head>/<body>), no solo un layout — <Scripts /> y <HeadContent />
 * son los que hidratan el bundle del cliente y vuelcan las `head.meta` de
 * cada ruta (como las que ya definiste en routes/index.tsx) al <head>.
 * -----------------------------------------------------------------------
 */
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
// Import del CSS global del repo (mismo archivo que ya usan otras
// pantallas — el tema oscuro de este dashboard vive con scope propio en
// `.theme-ayudas` dentro de ese archivo, no toca el `:root` institucional
// que otras rutas siguen usando).
import "@/styles.css";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
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
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <html lang="es">
        <head>
          <HeadContent />
        </head>
        {/* bg-background acá, no en DashboardPage: evita un flash de fondo
            blanco entre el HTML servido por SSR y el primer paint con
            estilos cargados. */}
        <body className="bg-background text-foreground antialiased">
          <Outlet />
          <Scripts />
        </body>
      </html>
    </QueryClientProvider>
  );
}