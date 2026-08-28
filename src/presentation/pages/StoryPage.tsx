/**
 * StoryPage.tsx
 * -----------------------------------------------------------------------
 * El relato completo de la Ruta de la Solidaridad, de la portada al mapa.
 *
 * SOBRE LA SECCIÓN DE MUNICIPIOS
 *
 * Estaba en blanco, con el titular en azul y los tres bloques uno debajo
 * de otro. Era legible, pero no se parecía a las piezas de la campaña:
 * ahí el color no es un fondo, es la estructura. Cada pieza avanza por
 * bandas horizontales a sangre —cyan para el titular, azul para el
 * rótulo del bloque, crema para el contenido— y el lector sabe en qué
 * capítulo está por el color de la franja, no por la distancia entre
 * párrafos.
 *
 * Así quedó armada esta sección. Las bandas van a sangre y el ancho
 * máximo se controla adentro con `max-w-6xl`: al revés, con una caja de
 * color centrada, la pieza deja de leerse como sistema y parece una
 * tarjeta suelta en medio de la página.
 * -----------------------------------------------------------------------
 */
import { useCallback, type ReactNode } from "react";
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
  { id: "balance", label: "Balance a la fecha", icon: FileText },
  { id: "indice", label: "Índice", icon: List },
  { id: "cuando", label: "Analisis de entrega", icon: CalendarDays },
  { id: "municipios", label: "Municipios", icon: MapPin },
  { id: "que-se-entrego", label: "¿Qué se entregó?", icon: Package },
  { id: "de-donde-salio", label: "¿De dónde salió?", icon: Truck },
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

        <section id="balance" className="bg-[#F2FAFD] px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <BalanceFinal />
        </section>

        <IndiceSection />

        {/* Fondo crema con bloques azules y texto blanco, como la pieza.
            No lleva imagen de fondo: los bloques de esta sección son
            datos y tienen que dibujarse encima del color, no de un
            arte. */}
        <section id="cuando" className="bg-[#FBF8C6] px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <div className="mx-auto max-w-6xl">
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

        {/* ── ¿Cuánta ayuda recibió cada municipio? ─────────────────────
            Cinco bandas, en el orden de la pieza: titular sobre cyan,
            rótulo sobre azul, podio sobre crema, zonas dentro del azul,
            galería de vuelta en crema.

            El crema es el fondo de la sección y no de cada banda: las
            que llevan color propio lo tapan, y las que no, lo heredan.
            Así no hay dos declaraciones de fondo peleando por el mismo
            espacio ni una costura visible entre bloques contiguos. */}
        <section id="municipios" className="vc-seccion bg-[#FBF8C6]">
          <div className="bg-[#22ABE2] px-4 py-12 sm:px-6 sm:py-14 md:px-10">
            <div className="mx-auto max-w-6xl">
              {/* El salto de línea es a mano y no automático: la pieza
                  parte el titular después de "recibió" y ahí es donde
                  respira la pregunta. En pantallas angostas el `clamp`
                  lo achica y `overflow-wrap` de .vc-titular se encarga
                  del resto. */}
              <h2 className="vc-titular max-w-4xl text-[clamp(2rem,6.5vw,4.5rem)] text-[#FBF8C6]">
                ¿Cuánta ayuda recibió
                <br />
                cada municipio?
              </h2>
            </div>
          </div>

          <BandaRotulo>
            <span className="vc-resaltado">Municipios</span> que más ayuda{" "}
            <span className="vc-resaltado">recibieron</span>
          </BandaRotulo>

          <div className="px-4 py-12 sm:px-6 sm:py-14 md:px-10">
            <div className="mx-auto max-w-6xl">
              <PodioMunicipios onSelect={irAlMapa} conRotulo={false} />
            </div>
          </div>

          {/* Las zonas viven dentro de la banda azul, rótulo incluido:
              en la pieza el bloque de rutas es una sola unidad de color
              y separarlo en dos franjas lo partiría en la mitad. */}
          <div className="bg-[#0079C1] px-4 py-12 sm:px-6 sm:py-14 md:px-10">
            <div className="mx-auto max-w-6xl">
              <h3 className="text-[clamp(1.25rem,3vw,2rem)] font-bold leading-[1.7] text-white">
                <span className="vc-resaltado">Rutas</span> por zona
              </h3>
              <div className="mt-8">
                <CoberturaPorZona conRotulo={false} />
              </div>
            </div>
          </div>

          <div className="px-4 py-12 pb-16 sm:px-6 sm:py-14 md:px-10">
            <div className="mx-auto max-w-6xl">
              {/* El número sale del contexto y no de `catalogo.length`
                  porque acá no tenemos la lista, solo el total. Son la
                  misma cifra: `municipiosTotales` se deriva del mismo
                  catálogo que recorre la galería. */}
              <h3 className="text-[clamp(1.25rem,3vw,2rem)] font-bold leading-[1.7] text-[#0079C1]">
                <span className="vc-resaltado-crema bg-white">Los {op.municipiosTotales}</span>{" "}
                municipios
              </h3>
              <div className="mt-6">
                <MunicipiosGrid onSelect={irAlMapa} conRotulo={false} />
              </div>
            </div>
          </div>
        </section>

        <section id="que-se-entrego" className="bg-[#F2FAFD] px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <AyudaSection />
        </section>

        <section id="de-donde-salio" className="bg-white px-4 py-14 sm:px-6 sm:py-20 md:px-10">
          <CanalesSection />
        </section>

        <section id="mapa-de-ayudas" className="relative h-dvh bg-[#123E5C]">
          <DashboardPage embedded />
        </section>

        <footer className="bg-[#0076BC] px-8 py-10 text-base leading-7 text-[#A8CFE2] sm:px-6 md:px-33">
          <div>
            <b className="block font-serif text-xl text-[#FBF8C6]">Ruta de la Solidaridad</b>
            <p className="mt-3">
              Ayudas entregadas a las comunidades afectadas por el terremoto del 10 de agosto de
              2026
              {op.fechaCorteLarga ? `, con información al ${op.fechaCorteLarga}` : ""}.
            </p>
            <p className="mt-4">
              Fuente: registros oficiales de entrega de ayudas de la Gobernación del Valle del
              Cauca.
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

/**
 * La banda azul con el rótulo de un bloque.
 *
 * Va como componente y no como una clase suelta porque el rótulo tiene
 * tres cosas que se pierden al copiar y pegar: el `leading-[1.7]`, sin
 * el cual los recuadros amarillos de `.vc-resaltado` —que crecen con su
 * propio padding— se montan entre líneas cuando el rótulo parte en dos;
 * el `max-w-6xl`, que lo alinea con el contenido de las demás bandas; y
 * el `<h3>`, que es lo que hace que un lector de pantalla lo anuncie
 * como encabezado y no como un párrafo decorativo.
 */
function BandaRotulo({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#0079C1] px-4 py-7 sm:px-6 md:px-10">
      <h3 className="mx-auto max-w-6xl text-[clamp(1.25rem,3vw,2rem)] font-bold leading-[1.7] text-white">
        {children}
      </h3>
    </div>
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