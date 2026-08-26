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
import { createFileRoute } from "@tanstack/react-router";
import { StoryPage } from "@/presentation/pages/StoryPage";

export const Route = createFileRoute("/")({
  component: StoryPage,
  head: () => ({
    meta: [
      { title: "Ayudas Humanitarias — Terremoto Valle del Cauca | Gobernación del Valle" },
      {
        name: "description",
        content:
          "Mapa de distribución de ayudas humanitarias entregadas por la Gobernación del Valle del Cauca tras el terremoto del 10 de agosto de 2026, por municipio y categoría.",
      },
      { property: "og:title", content: "Ayudas Humanitarias — Terremoto Valle del Cauca" },
      {
        property: "og:description",
        content:
          "Distribución de ayudas por municipio y categoría, actualizada al corte de datos vigente.",
      },
      { property: "og:type", content: "website" },
      { name: "theme-color", content: "#0b0e14" },
    ],
  }),
});
