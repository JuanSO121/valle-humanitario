/**
 * routes/__root.tsx
 * -----------------------------------------------------------------------
 * Documento HTML completo (TanStack Start con SSR) y QueryClientProvider
 * para toda la app. router.tsx crea el router con `context: {
 * queryClient }`; este componente es el que monta el proveedor con ese
 * client. Sin él, cualquier hook de React Query falla con "No
 * QueryClient set".
 *
 * <HeadContent /> vuelca las `head` de cada ruta al <head>, y
 * <Scripts /> hidrata el bundle del cliente.
 * -----------------------------------------------------------------------
 */
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
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
     * Poppins se carga acá y NO con un @import dentro de marca.css: al
     * empaquetar, ese @import queda después de las reglas de Tailwind y
     * lightningcss falla el build con "@import rules must precede all
     * rules". Cargarla en la cabecera además evita el parpadeo de
     * fuente en el primer render.
     *
     * No hay preconexión a Apps Script: el navegador le pide los datos a
     * /api/tablero en este mismo dominio (ver lib/proxyTablero.ts), así
     * que no abre ninguna conexión con Google para eso.
     */
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap",
      },
      // Sin el archivo en public/, cada carga deja un 404 en consola que
      // tapa los errores reales.
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  component: RootComponent,

  /**
   * Una ruta equivocada tiene que devolver a la persona a algún lado, no
   * dejarla con el `<p>Not Found</p>` por defecto.
   */
  notFoundComponent: PaginaNoEncontrada,
});

function PaginaNoEncontrada() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#0079C1] px-6 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#FFD400]">
        Página no encontrada
      </p>

      <h1 className="vc-titular mt-4 text-[clamp(2rem,8vw,4.5rem)] text-[#FBF8C6]">
        Esta dirección no existe
      </h1>

      <p className="mt-6 max-w-lg text-lg leading-8 text-white">
        Revise el enlace o vuelva al inicio para ver la información de las ayudas entregadas en el
        Valle del Cauca.
      </p>

      <a
        href="/"
        className="mt-9 inline-flex items-center rounded-full bg-[#FBF8C6] px-7 py-3.5 text-lg font-bold text-[#0079C1] transition hover:bg-white"
      >
        Ir al inicio
      </a>
    </main>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <html lang="es">
        <head>
          <HeadContent />
        </head>
        {/* bg-background acá evita un destello blanco entre el HTML del
            servidor y el primer paint con estilos. */}
        <body className="bg-background text-foreground antialiased">
          <Outlet />
          <Scripts />
        </body>
      </html>
    </QueryClientProvider>
  );
}