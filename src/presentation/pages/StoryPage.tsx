import { useCallback } from "react";
import {
  CalendarDays,
  FileText,
  Home,
  Lightbulb,
  Map,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import { DashboardPage } from "@/presentation/pages/DashboardPage";
import { OperacionProvider, useOperacion } from "@/presentation/state/OperacionContext";
import { PanoramaDonuts } from "@/presentation/components/PanoramaDonuts";
import { PanoramaPuente } from "@/presentation/components/PanoramaPuente";
import { AcumuladoChart } from "../components/AcumuladoChart";
import { JornadaBars } from "../components/JornadaBars";
import { MovimientoStatCards, MunicipiosNuevosCallouts } from "../components/MovimientoExtras";
import { SidebarNav, type NavItem } from "../components/SidebarNav";
import { CoberturaPorZona, MunicipiosGrid, PodioMunicipios } from "../components/TerritorySections";
import { EvolucionHeatmap } from "../components/EvolucionHeatmap";
import { AyudaSection } from "../components/AyudaSection";
import { CanalesSection } from "../components/CanalesSection";
import { HallazgosSection } from "../components/HallazgosSection";
import { SectionLabel } from "../components/storyPrimitives";

const SCROLL_ROOT_ID = "ruta-solidaridad-scroll";

const NAV: NavItem[] = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "resumen", label: "Resumen", icon: MapPin },
  { id: "cuando", label: "Cuándo se entregó", icon: CalendarDays },
  { id: "municipios", label: "Municipios", icon: MapPin },
  { id: "que-se-entrego", label: "Qué se entregó", icon: Package },
  { id: "de-donde-salio", label: "De dónde salió", icon: Truck },
  { id: "soportes", label: "Soportes documentales", icon: FileText },
  { id: "conclusiones", label: "Conclusiones", icon: Lightbulb },
  { id: "mapa-de-ayudas", label: "Mapa de Ayudas", icon: Map },
];

export function StoryPage() {
  return (
    <OperacionProvider>
      <Contenido />
    </OperacionProvider>
  );
}

function Contenido() {
  const op = useOperacion();

  const irAlMapa = useCallback(() => {
    document
      .getElementById("mapa-de-ayudas")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Todas las cifras salen de la API. Ninguna está escrita en el código.
  const kpis = [
    {
      value: `${op.municipiosAtendidos} de ${op.municipiosTotales}`,
      label: "municipios recibieron ayudas",
    },
    {
      value: op.totalEntregas.toLocaleString("es-CO"),
      label: "entregas llegaron a los municipios",
    },
    {
      value: `${op.totalToneladas.toLocaleString("es-CO")} toneladas`,
      label: op.toneladasMedidas
        ? "de ayuda salieron del departamento"
        : "estimadas según el número de entregas",
    },
    {
      value: `${op.diasConEntrega} días`,
      label: op.rangoLargo ? `con entregas, ${op.rangoLargo}` : "con entregas registradas",
    },
  ];

  return (
    <>
      <SidebarNav
        items={NAV}
        scrollRootId={SCROLL_ROOT_ID}
        homeId="inicio"
        fechaCorte={op.fechaCorteLarga}
      />

      <main
        id={SCROLL_ROOT_ID}
        className="h-dvh overflow-y-auto scroll-smooth bg-[#F4F9FC] text-[#0B2233] md:pl-20"
      >
        <section
          id="inicio"
          className="grid min-h-dvh place-items-center bg-[#EAF6FB] px-5 py-16 sm:px-6 md:px-10"
        >
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]">
              Gobernación del Valle del Cauca
            </p>

            <h1 className="mt-6 font-serif text-[clamp(2.75rem,11vw,7rem)] leading-[0.98] text-[#00578C]">
              Ruta de la Solidaridad
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#315A70] sm:text-xl sm:leading-9">
              Después del terremoto del 10 de agosto de 2026, la Gobernación entregó ayudas
              humanitarias de emergencia en los municipios del Valle del Cauca.
            </p>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#315A70] sm:text-xl sm:leading-9">
              A continuación encontrará toda la información.
            </p>
          </div>
        </section>

        <section id="resumen" className="bg-white px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-3xl font-serif text-[clamp(1.75rem,5.5vw,3rem)] leading-[1.15] text-[#0B2233]">
              {op.municipiosAtendidos} de los {op.municipiosTotales} municipios del Valle recibieron
              ayudas
            </h2>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-[#00578C]/12 bg-[#F7FBFD] p-5 sm:p-7"
                >
                  <b className="block font-serif text-[clamp(1.75rem,6vw,2.5rem)] leading-none text-[#00578C]">
                    {kpi.value}
                  </b>
                  <p className="mt-3 text-base leading-7 text-[#4E6B7C] sm:text-lg">{kpi.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-14">
              <PanoramaDonuts />
            </div>
          </div>
        </section>

        <section id="cuando" className="bg-[#F4F9FC] px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <div className="mx-auto max-w-6xl">
            <SectionLabel>Cuándo se entregó</SectionLabel>
            <h2 className="mt-4 max-w-3xl font-serif text-[clamp(1.75rem,5.5vw,3rem)] leading-[1.15]">
              {tituloCuando(op.picoEntregas?.dia, op.picoCobertura?.dia)}
            </h2>
            <div className="mt-12 space-y-14">
              <MovimientoStatCards />
              <JornadaBars />
              <MunicipiosNuevosCallouts />
              <EvolucionHeatmap onSelect={irAlMapa} />
            </div>
          </div>
        </section>

        <section id="municipios" className="bg-white px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <div className="mx-auto max-w-6xl space-y-16">
            <div>
              <SectionLabel>Municipios</SectionLabel>
              <h2 className="mt-4 max-w-3xl font-serif text-[clamp(1.75rem,5.5vw,3rem)] leading-[1.15]">
                Cuánta ayuda recibió cada municipio
              </h2>
            </div>
            <PodioMunicipios onSelect={irAlMapa} />
            <CoberturaPorZona />
            <MunicipiosGrid onSelect={irAlMapa} />
          </div>
        </section>

        <section id="que-se-entrego" className="bg-[#F4F9FC] px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <AyudaSection />
        </section>

        <section id="de-donde-salio" className="bg-white px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <CanalesSection />
        </section>

        <section id="soportes" className="bg-[#F4F9FC] px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <div className="mx-auto max-w-6xl">
            <SectionLabel>Soportes documentales</SectionLabel>
            <h2 className="mt-4 max-w-3xl font-serif text-[clamp(1.75rem,5.5vw,3rem)] leading-[1.15]">
              Cada entrega tiene un documento que la respalda
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#4E6B7C] sm:text-lg sm:leading-8">
              La información de este tablero corresponde a las entregas realizadas en los centros de
              acopio. Cada una cuenta con un formato físico de soporte. La cuenta va paso a paso,
              porque un formato conjunto reparte a varios municipios y un documento reescaneado no
              suma una entrega nueva.
            </p>
            <div className="mt-10">
              <PanoramaPuente />
            </div>
          </div>
        </section>

        <section
          id="conclusiones"
          className="bg-[#0B2233] px-4 py-14 text-white sm:px-6 sm:py-20 md:px-10"
        >
          <HallazgosSection />
        </section>

        <section id="mapa-de-ayudas" className="relative h-dvh bg-[#0B2233]">
          <DashboardPage embedded />
        </section>

        <footer className="bg-[#061621] px-4 py-10 text-base leading-7 text-[#9DB4C2] sm:px-6 md:px-10">
          <div className="mx-auto max-w-6xl">
            <b className="block font-serif text-xl text-[#CBE4F2]">Ruta de la Solidaridad</b>
            <p className="mt-3 max-w-2xl">
              Gobernación del Valle del Cauca. Ayudas entregadas tras el terremoto del 10 de agosto
              de 2026
              {op.fechaCorteLarga ? `, con información al ${op.fechaCorteLarga}` : ""}.
            </p>
            <p className="mt-4 max-w-2xl">
              Fuente de información: registros oficiales de entrega de ayudas de la Gobernación del
              Valle del Cauca.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}

/** El titular nombra los días reales, así que cambia con los datos. */
function tituloCuando(diaPico?: string, diaCobertura?: string): string {
  if (!diaPico || !diaCobertura) return "Cómo avanzaron las entregas día a día";
  if (diaPico === diaCobertura) {
    return `El ${Number(diaPico)} de agosto se entregó más que ningún otro día`;
  }
  return `El ${Number(diaCobertura)} de agosto se llegó a más municipios y el ${Number(diaPico)} se entregó más`;
}