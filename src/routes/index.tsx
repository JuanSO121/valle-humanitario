import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/presentation/pages/DashboardPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Criticidad Sísmica Escolar | Valle del Cauca" },
      {
        name: "description",
        content:
          "Mapa interactivo de criticidad sísmica de sedes educativas oficiales del Valle del Cauca: filtros, clustering y trazabilidad del ETL.",
      },
      { property: "og:title", content: "Criticidad Sísmica Escolar | Valle del Cauca" },
      {
        property: "og:description",
        content:
          "Visualización geográfica de diagnósticos de infraestructura educativa por municipio, institución y sede.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});
