/**
 * StoryPage.tsx
 * -----------------------------------------------------------------------
 * El relato completo de la Ruta de la Solidaridad, de la portada al mapa.
 *
 * SOBRE LA ESTRUCTURA POR BANDAS
 *
 * En las piezas de la campaña el color no es un fondo, es la estructura.
 * Cada pieza avanza por franjas horizontales a sangre —cyan para el
 * titular, azul para el rótulo del bloque, crema para el contenido— y el
 * lector sabe en qué capítulo está por el color de la franja, no por la
 * distancia entre párrafos.
 *
 * Las dos secciones de análisis, "¿Cuándo llegaron las ayudas?" y
 * "¿Cuánta ayuda recibió cada municipio?", están armadas así. Las bandas
 * van a sangre y el ancho máximo se controla adentro con `max-w-6xl`: al
 * revés, con una caja de color centrada, la pieza deja de leerse como
 * sistema y parece una tarjeta suelta en medio de la página.
 *
 * SOBRE LA TIPOGRAFÍA DE LAS BANDAS
 *
 * Titular y rótulo van los dos en Agenda ExtraCondensed, la tipografía
 * de la campaña. El titular usa `.vc-titular`, que fuerza mayúscula; el
 * rótulo usa `.vc-rotulo`, que es la misma familia en caja mixta, porque
 * en las piezas los rótulos se leen "Municipios que más ayuda
 * recibieron" y no en versales.
 *
 * Los dos cuerpos son mayores de lo que pedirían en Poppins: Agenda es
 * extra condensada y a igual tamaño en píxeles ocupa cerca de un tercio
 * menos de ancho, así que un rótulo que en Poppins se veía bien a 20 px
 * acá se queda corto.
 *
 * SOBRE EL TITULAR DE "CUÁNDO"
 *
 * Era la frase del hallazgo del día, generada con los datos. Ahora es
 * una pregunta fija y el hallazgo bajó al rótulo de la banda azul, con
 * la fecha resaltada en amarillo.
 *
 * El cambio es de jerarquía, no de estética. Un titular que cambia con
 * los datos no se puede componer: unos días es una línea, otros tres, la
 * banda cyan crece y encoge en cada corte, y nunca se le puede aplicar
 * el salto de línea a mano que hace respirar la pregunta. Un titular
 * fijo compone siempre igual, y el dato variable queda en el renglón
 * donde una línea de más no rompe nada.
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
        {/* ── ¿Cuándo llegaron las ayudas? ──────────────────────────────
            Cinco bandas: titular sobre cyan, hallazgo del día sobre azul,
            cifras de movimiento sobre crema, el gráfico diario dentro de
            una banda azul, y el cierre de nuevo en crema.
            El gráfico va sobre azul y no sobre el crema de la sección por
            contraste: es una tarjeta blanca, y blanco sobre #FBF8C6
            contrasta 1.1 a 1, así que su canto desaparecía. Sobre el azul
            se recorta solo, y la sección gana un respiro oscuro en el
            medio en vez de tres bloques crema seguidos. */}
        <section id="cuando" className="vc-seccion bg-[#FBF8C6]">
          <div className="bg-[#22ABE2] px-4 py-12 sm:px-6 sm:py-14 md:px-10">
            <div className="mx-auto max-w-6xl">
              {/* Compuesto como el banner de la campaña: la primera
                  palabra dentro de una caja crema en azul, la segunda
                  suelta en blanco sobre el cyan.

                  El relleno va en `em` y no en píxeles para que la caja
                  crezca con el `clamp` del titular. En píxeles, a 2rem
                  ahogaría la palabra y a 4.5rem quedaría como un filete
                  suelto alrededor.

                  `box-decoration-clone` es lo que sostiene la pieza si el
                  titular parte en dos líneas: sin él, el relleno lateral
                  se aplica solo al comienzo del primer fragmento y al
                  final del último, y la caja aparece abierta por un lado.

                  El `leading` sube a 1.25 porque la caja crece hacia
                  arriba y hacia abajo desde la línea base: con la
                  interlínea cerrada del titular se saldría de la banda. */}
              <h2 className="vc-titular max-w-4xl text-[clamp(2rem,6.5vw,4.5rem)] leading-[1.25] text-white">
                <span className="box-decoration-clone bg-[#FBF8C6] px-[0.3em] py-[0.1em] text-[#0079C1]">
                  Momentos
                </span>{" "}
                Clave
              </h2>
            </div>
          </div>
          <div className="px-4 py-12 sm:px-6 sm:py-14 md:px-10">
            <div className="mx-auto max-w-6xl">
              <MovimientoStatCards />
            </div>
          </div>
          <div className="bg-[#0079C1] px-4 py-12 sm:px-6 sm:py-14 md:px-10">
            <div className="mx-auto max-w-6xl">
              <div className="mt-8">
                <JornadaBars />
              </div>
            </div>
          </div>
          <div className="px-4 py-12 pb-16 sm:px-6 sm:py-14 md:px-10">
            <div className="mx-auto max-w-6xl">
              <div className="mt-8 space-y-14">
                <MunicipiosNuevosCallouts />
                <EvolucionHeatmap onSelect={irAlMapa} />
              </div>
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
              <h3 className="vc-rotulo text-[clamp(1.5rem,3.6vw,2.5rem)] text-white">
                <span className="vc-resaltado">Rutas</span> por zona
              </h3>
              <div className="mt-8">
                <CoberturaPorZona conRotulo={false} />
              </div>
            </div>
          </div>
          {/* La galería cierra sobre hueso y no sobre el crema de la
              sección. Son 41 fichas blancas: sobre crema, blanco
              contrasta 1.1 a 1 y la rejilla se veía como una mancha
              única. Sobre #F2FAFD cada ficha recorta su canto, y de paso
              la sección alterna cinco fondos distintos en vez de repetir
              el crema dos veces. */}
          <div className="bg-[#F2FAFD] px-4 py-12 pb-16 sm:px-6 sm:py-14 md:px-10">
            <div className="mx-auto max-w-6xl">
              {/* El número sale del contexto y no de `catalogo.length`
                  porque acá no tenemos la lista, solo el total. Son la
                  misma cifra: `municipiosTotales` se deriva del mismo
                  catálogo que recorre la galería.
                  El resaltado va en amarillo y no en crema: crema sobre
                  crema no se veía, y quedaba un hueco sin explicación
                  entre el número y la palabra. */}
              <h3 className="vc-rotulo text-[clamp(1.5rem,3.6vw,2.5rem)] text-[#0079C1]">
                Los <span className="vc-resaltado">{op.municipiosTotales} municipios</span>
              </h3>
              <div className="mt-6">
                <MunicipiosGrid onSelect={irAlMapa} conRotulo={false} />
              </div>
            </div>
          </div>
        </section>
        {/* Sin `px-*` ni `py-*`: AyudaSection emite sus propias bandas a
            sangre y cada una pone su relleno. Un padding acá afuera
            metería la sección en una caja y las franjas dejarían de tocar
            los bordes. */}
        <section id="que-se-entrego" className="vc-seccion bg-[#F2FAFD]">
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
            <b className="block font-serif text-xl text-[#fbf8c6]">Ruta de la Solidaridad</b>
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
 * tres cosas que se pierden al copiar y pegar: la clase `.vc-rotulo`,
 * que trae Agenda ExtraCondensed y la interlínea alta que necesitan los
 * recuadros de `.vc-resaltado` para no montarse entre líneas; el
 * `max-w-6xl`, que lo alinea con el contenido de las demás bandas; y el
 * `<h3>`, que es lo que hace que un lector de pantalla lo anuncie como
 * encabezado y no como un párrafo decorativo.
 */
function BandaRotulo({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#0079C1] px-4 py-7 sm:px-6 md:px-10">
      <h3 className="vc-rotulo mx-auto max-w-6xl text-[clamp(1.5rem,3.6vw,2.5rem)] text-white">
        {children}
      </h3>
    </div>
  );
}
/**
 * El hallazgo del calendario, para el rótulo de la banda azul.
 *
 * Devuelve nodos y no una cadena porque el día va dentro de un recuadro
 * amarillo: es el único dato variable del rótulo y es lo que el lector
 * tiene que retener.
 *
 * Los dos casos son distintos de verdad. Cuando el día de más entregas
 * es también el de más municipios nuevos, hubo un solo pico y decirlo en
 * una frase es más claro. Cuando son días distintos, el dato es
 * justamente que el volumen y la cobertura no se movieron juntos.
 */
function momentoClave(diaPico?: string, diaCobertura?: string): ReactNode {
  if (!diaPico || !diaCobertura) {
    return (
      <>
        <span className="vc-resaltado">Día a día</span> de la operación
      </>
    );
  }
  if (diaPico === diaCobertura) {
    return (
      <>
        El <span className="vc-resaltado">{Number(diaPico)} de agosto</span> se entregó más que
        ningún otro día
      </>
    );
  }
  return (
    <>
      El <span className="vc-resaltado">{Number(diaCobertura)} de agosto</span> se llegó a más
      municipios y el <span className="vc-resaltado">{Number(diaPico)}</span> se entregó más
    </>
  );
}