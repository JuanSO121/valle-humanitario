import { useCallback } from "react";
import {
  List,
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
import { FocoProvider, useFoco } from "@/presentation/state/FocoContext";
import { JornadaBars } from "../components/JornadaBars";
import { MovimientoStatCards, MunicipiosNuevosCallouts } from "../components/MovimientoExtras";
import { SidebarNav, type NavItem } from "../components/SidebarNav";
import { CoberturaPorZona, MunicipiosGrid, PodioMunicipios } from "../components/TerritorySections";
import { EvolucionHeatmap } from "../components/EvolucionHeatmap";
import { AyudaSection } from "../components/AyudaSection";
import { CanalesSection } from "../components/CanalesSection";
import { HallazgosSection } from "../components/HallazgosSection";
import { BalanceFinal } from "../components/BalanceFinal";
import { SectionLabel } from "../components/storyPrimitives";
import { MarcaFooter } from "../components/MarcaHeader";
import { PiezaGrafica } from "../components/PiezaGrafica";
import { IndiceSection } from "../components/IndiceSection";
 
const SCROLL_ROOT_ID = "ruta-solidaridad-scroll";
 
const NAV: NavItem[] = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "indice", label: "Índice", icon: List },
  { id: "cuando", label: "¿Cuándo se entregó?", icon: CalendarDays },
  { id: "municipios", label: "Municipios", icon: MapPin },
  { id: "que-se-entrego", label: "¿Qué se entregó?", icon: Package },
  { id: "de-donde-salio", label: "¿De dónde salió?", icon: Truck },
  { id: "balance", label: "Balance a la fecha", icon: FileText },
  { id: "mapa-de-ayudas", label: "Mapa de Ayudas", icon: Map },
];

export function StoryPage() {
  return (
    <OperacionProvider>
      <FocoProvider>
        <Contenido />
      </FocoProvider>
    </OperacionProvider>
  );
}

function Contenido() {
  const op = useOperacion();

  const { enfocarMunicipio } = useFoco();

  /**
   * Antes esto solo hacía scroll: se llegaba al mapa sin nada
   * seleccionado y había que buscar a mano el municipio en el que se
   * venía de hacer clic. Ahora lo selecciona.
   */
  const irAlMapa = useCallback(
    (municipio: { nombre: string }) => enfocarMunicipio(municipio.nombre),
    [enfocarMunicipio],
  );

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
        className="h-dvh overflow-y-auto scroll-smooth bg-[#F2FAFD] text-[#123E5C] md:pl-20"
      >
        {/* La portada es una pieza de diseño, no una maqueta. Ocupa una
            pantalla completa igual que los demás slides, y el texto del
            alt reproduce lo que dice la imagen: sin eso, la primera
            pantalla del sitio es invisible para un lector de pantalla y
            para un buscador. */}
        <PiezaGrafica
          id="inicio"
          escritorio="/marca/portada-escritorio.jpg"
          movil="/marca/portada-movil.jpeg"
          fondo="#0076BC"
          prioritaria
          alt={
            "Ruta de la Solidaridad. Gobernación del Valle del Cauca. " +
            "Después del terremoto del 10 de agosto de 2026, la Gobernación entregó ayudas " +
            "humanitarias de emergencia en los municipios del Valle del Cauca. " +
            "A continuación encontrará toda la información."
          }
        />

        <IndiceSection />

        {/* Fondo crema con bloques azules y texto blanco, como la pieza.
            No lleva imagen de fondo: los bloques de esta sección son
            datos y tienen que dibujarse encima del color, no de un
            arte. */}
        <section
          id="cuando"
          className="bg-[#FBF8C6] px-4 py-14 sm:px-6 sm:py-20 md:px-10"
        >
          <div className="mx-auto max-w-6xl">
            <SectionLabel>¿Cuándo se entregó?</SectionLabel>
            <h2 className="vc-titular mt-4 max-w-4xl text-[clamp(1.75rem,5.5vw,3.25rem)] text-[#0079C1]">
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
              <h2 className="vc-titular mt-4 max-w-4xl text-[clamp(1.75rem,5.5vw,3.25rem)] text-[#0079C1]">
                ¿Cuánta ayuda recibió cada municipio?
              </h2>
            </div>
            <PodioMunicipios onSelect={irAlMapa} />
            <CoberturaPorZona />
            <MunicipiosGrid onSelect={irAlMapa} />
          </div>
        </section>

        <section id="que-se-entrego" className="bg-[#F2FAFD] px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <AyudaSection />
        </section>

        <section id="de-donde-salio" className="bg-white px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <CanalesSection />
        </section>

        <section id="balance" className="bg-[#F2FAFD] px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <BalanceFinal />
        </section>

        <section id="mapa-de-ayudas" className="relative h-dvh bg-[#123E5C]">
          <DashboardPage embedded />
        </section>

<footer className="bg-[#0076BC] px-8 py-10 text-base leading-7 text-[#A8CFE2] sm:px-6 md:px-33">
  <div>
    <b className="block font-serif text-xl text-[#FBF8C6]">Ruta de la Solidaridad</b>
    <p className="mt-3">
      Ayudas entregadas a las comunidades afectadas por el terremoto del 10 de agosto de 2026
      {op.fechaCorteLarga ? `, con información al ${op.fechaCorteLarga}` : ""}.
    </p>
    <p className="mt-4">
      Fuente: registros oficiales de entrega de ayudas de la Gobernación del Valle del Cauca.
    </p>
    <div className="mt-8">
      <MarcaFooter />
    </div>
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