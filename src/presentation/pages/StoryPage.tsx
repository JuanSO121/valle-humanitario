import { useCallback } from "react";
import { CalendarDays, ChevronDown, Home, Lightbulb, Map, MapPin, Package, Truck } from "lucide-react";
import { DashboardPage } from "@/presentation/pages/DashboardPage";
import { PanoramaDonuts } from "@/presentation/components/PanoramaDonuts";
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
import {
  MUNICIPIOS_ATENDIDOS,
  MUNICIPIOS_TOTALES,
  TOTAL_DESPACHOS_MUNICIPALES,
  TOTAL_TONELADAS,
} from "../data/movimientoData";

const SCROLL_ROOT_ID = "mapa-de-ayudas-scroll";

const NAV: NavItem[] = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "mapa-de-ayudas", label: "Mapa de Ayudas", icon: Map },
  { id: "resumen", label: "Resumen", icon: MapPin },
  { id: "cuando", label: "Cuándo se entregó", icon: CalendarDays },
  { id: "municipios", label: "Municipios", icon: MapPin },
  { id: "que-se-entrego", label: "Qué se entregó", icon: Package },
  { id: "de-donde-salio", label: "De dónde salió", icon: Truck },
  { id: "conclusiones", label: "Conclusiones", icon: Lightbulb },
];

const kpis = [
  {
    value: `${MUNICIPIOS_ATENDIDOS} de ${MUNICIPIOS_TOTALES}`,
    label: "municipios recibieron ayudas",
  },
  {
    value: TOTAL_DESPACHOS_MUNICIPALES.toLocaleString("es-CO"),
    label: "entregas llegaron a los municipios",
  },
  {
    value: `${TOTAL_TONELADAS} toneladas`,
    label: "de ayuda salieron del departamento",
  },
  {
    value: "14 días",
    label: "de entregas, del 11 al 25 de agosto",
  },
];

export function StoryPage() {
  const irAlMapa = useCallback(() => {
    document.getElementById("mapa-de-ayudas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <>
      <SidebarNav items={NAV} scrollRootId={SCROLL_ROOT_ID} homeId="inicio" />

      <main
        id={SCROLL_ROOT_ID}
        className="h-dvh overflow-y-auto scroll-smooth bg-[#F4F9FC] text-[#0B2233] md:pl-20"
      >
        <section
          id="inicio"
          className="grid min-h-dvh place-items-center bg-[#EAF6FB] px-5 py-20 md:px-10"
        >
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#006A87]">
              Gobernación del Valle del Cauca
            </p>

            <h1 className="mt-6 font-serif text-6xl leading-[0.98] text-[#00578C] md:text-8xl">
              Ruta de la Solidaridad
            </h1>

            <p className="mt-8 max-w-2xl text-xl leading-9 text-[#315A70]">
              Después del terremoto del 10 de agosto de 2026, la Gobernación entregó ayudas en el
              Valle del Cauca. Aquí ves adónde llegaron, cuántas fueron y en qué días.
            </p>

            <p className="mt-10 font-serif text-3xl text-[#00578C] md:text-4xl">
              {MUNICIPIOS_ATENDIDOS} de los {MUNICIPIOS_TOTALES} municipios recibieron ayudas
            </p>

            <a
              href="#mapa-de-ayudas"
              className="mt-12 inline-flex items-center gap-3 rounded-full bg-[#00578C] px-7 py-4 text-lg font-bold text-white transition hover:bg-[#00456F]"
            >
              Ver el mapa
              <ChevronDown className="size-5" aria-hidden />
            </a>
          </div>
        </section>

        <section id="mapa-de-ayudas" className="relative h-dvh bg-[#0B2233]">
          <DashboardPage embedded />
        </section>

        <section id="resumen" className="bg-white px-5 py-20 md:px-10">
          <div className="mx-auto max-w-6xl">
            <SectionLabel>Resumen</SectionLabel>
            <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.15] text-[#0B2233] md:text-5xl">
              {MUNICIPIOS_ATENDIDOS} de los {MUNICIPIOS_TOTALES} municipios del Valle recibieron
              ayudas
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#4E6B7C]">
              Entre el 11 y el 25 de agosto de 2026, la Gobernación entregó ayudas tras el
              terremoto. Aquí ves cuántas llegaron, adónde y cuándo.
            </p>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-[#00578C]/12 bg-[#F7FBFD] p-7"
                >
                  <b className="block font-serif text-4xl leading-none text-[#00578C]">
                    {kpi.value}
                  </b>
                  <p className="mt-3 text-lg leading-7 text-[#4E6B7C]">{kpi.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-14">
              <PanoramaDonuts />
            </div>
          </div>
        </section>

        <section id="cuando" className="bg-[#F4F9FC] px-5 py-20 md:px-10">
          <div className="mx-auto max-w-6xl">
            <SectionLabel>Cuándo se entregó</SectionLabel>
            <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.15] md:text-5xl">
              Las ayudas llegaron a casi todo el departamento en los primeros dos días
            </h2>
            <div className="mt-12 space-y-14">
              <AcumuladoChart />
              <MovimientoStatCards />
              <JornadaBars />
              <MunicipiosNuevosCallouts />
              <EvolucionHeatmap onSelect={irAlMapa} />
            </div>
          </div>
        </section>

        <section id="municipios" className="bg-white px-5 py-20 md:px-10">
          <div className="mx-auto max-w-6xl space-y-16">
            <div>
              <SectionLabel>Municipios</SectionLabel>
              <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.15] md:text-5xl">
                Cuánta ayuda recibió cada municipio
              </h2>
            </div>
            <PodioMunicipios onSelect={irAlMapa} />
            <CoberturaPorZona />
            <MunicipiosGrid onSelect={irAlMapa} />
          </div>
        </section>

        <section id="que-se-entrego" className="bg-[#F4F9FC] px-5 py-20 md:px-10">
          <AyudaSection />
        </section>

        <section id="de-donde-salio" className="bg-white px-5 py-20 md:px-10">
          <CanalesSection />
        </section>

        <section id="conclusiones" className="bg-[#0B2233] px-5 py-20 text-white md:px-10">
          <HallazgosSection />
        </section>

        <footer className="bg-[#061621] px-5 py-12 text-base leading-7 text-[#9DB4C2] md:px-10">
          <div className="mx-auto max-w-6xl">
            <b className="block font-serif text-xl text-[#CBE4F2]">Mapa de Ayudas</b>
            <p className="mt-3 max-w-2xl">
              Gobernación del Valle del Cauca. Ayudas entregadas tras el terremoto del 10 de agosto
              de 2026, con información al 25 de agosto.
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