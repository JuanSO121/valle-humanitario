/**
 * routes/admin.tsx
 * -----------------------------------------------------------------------
 * /admin — carga de datos protegida por clave. No tiene enlaces desde el
 * resto del sitio y pide a los buscadores que no la indexen.
 * -----------------------------------------------------------------------
 */
import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/presentation/pages/AdminPage";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Cargar datos · Ruta de la Solidaridad" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
