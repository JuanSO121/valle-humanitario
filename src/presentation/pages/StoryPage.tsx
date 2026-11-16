/**
 * StoryPage.tsx
 * -----------------------------------------------------------------------
 * El relato completo de la Ruta de la Solidaridad, de la portada a los
 * contratos.
 *
 * EL ORDEN
 *
 *   portada · balance · ¿qué hace falta hoy? · municipios · categorías ·
 *   mapa · lo que muestran los datos · otros puntos de distribución ·
 *   contratos
 *
 * «¿Qué hace falta hoy?» va tercera y no al final: es la única sección
 * que pide algo en vez de informar, y la única cuyo contenido caduca en
 * horas. Los puntos de distribución y los contratos cierran la página.
 *
 * TODO SALE DE LA API
 *
 * Esta página no calcula ni escribe ninguna cifra: cada sección pide la
 * suya a su ruta (ver application/hooks/useTablero.ts) y se omite si el
 * backend no la entrega. La fecha del pie es la de la última pestaña
 * diaria cargada.
 *
 * SOBRE LA ESTRUCTURA POR BANDAS
 *
 * En las piezas de la campaña el color no es un fondo, es la estructura:
 * franjas horizontales a sangre —cyan para el titular, crema o hueso para
 * el contenido— y el ancho máximo se controla adentro con `max-w-6xl`.
 * Cada sección emite su propia <section> con su `id`, así que acá no se
 * les pone relleno por fuera.
 * -----------------------------------------------------------------------
 */
import {
  FileSignature,
  FileText,
  HandHeart,
  Home,
  Map,
  MapPin,
  Package,
  Warehouse,
} from "lucide-react";
import { usePrecargaDesdeSnapshot } from "@/application/hooks/usePrecargaDesdeSnapshot";
import { useResumen } from "@/application/hooks/useTablero";
import { fechaLarga } from "@/lib/formato";
import { SidebarNav, type NavItem } from "../components/SidebarNav";
import { BalanceFinal } from "../components/BalanceFinal";
import { QueHaceFaltaSection } from "../components/QueHaceFaltaSection";
import { MunicipiosSection } from "../components/MunicipiosSection";
import { CategoriasSection } from "../components/CategoriasSection";
import { MapaDiferido } from "../components/MapaDiferido";
import { VolverArriba } from "../components/VolverArriba";
import { PuntosDistribucionSection } from "../components/PuntosDistribucionSection";
import { ContratacionSection } from "../components/ContratacionSection";
import { MarcaFooter } from "../components/MarcaHeader";
import { PiezaGrafica } from "../components/PiezaGrafica";

const SCROLL_ROOT_ID = "ruta-solidaridad-scroll";

const NAV: NavItem[] = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "balance", label: "Balance a la fecha", icon: FileText },
  { id: "que-hace-falta", label: "¿Qué hace falta hoy?", icon: HandHeart },
  { id: "municipios", label: "Municipios", icon: MapPin },
  { id: "categorias", label: "Categorías", icon: Package },
  { id: "mapa-de-ayudas", label: "Mapa de Ayudas", icon: Map },
  { id: "puntos", label: "Puntos de distribución", icon: Warehouse },
  { id: "contratacion", label: "Contratos", icon: FileSignature },
];

export function StoryPage() {
  // Siembra la caché con la última copia guardada: el tablero se dibuja al
  // instante en las visitas siguientes (ver el hook para lo que NO siembra).
  usePrecargaDesdeSnapshot();
  const { data: resumen } = useResumen();
  const corte = resumen && resumen.disponible ? fechaLarga(resumen.corte) : "";

  return (
    <>
      {/* Primer elemento enfocable: quien navega con teclado o lector de pantalla salta el menú. */}
      <a
        href="#balance"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-base focus:font-bold focus:text-[#0079C1] focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <SidebarNav items={NAV} scrollRootId={SCROLL_ROOT_ID} homeId="inicio" fechaCorte={corte} />
      <main
        id={SCROLL_ROOT_ID}
        // `relative`: sin él, los elementos `absolute` de adentro (los textos
        // `sr-only` de los lectores de pantalla, sobre todo) se posicionan
        // respecto a la ventana y no quedan recortados por este contenedor.
        // Como viven al final de la página, estiraban el scroll de la
        // VENTANA (miles de píxeles) y aparecía una segunda barra que, al
        // usarla, dejaba ver un fondo vacío.
        className="relative h-dvh overflow-y-auto scroll-smooth bg-[#F2FAFD] text-[#123E5C] md:pl-20"
      >
        <h1 className="sr-only">
          Ruta de la Solidaridad: ayudas humanitarias entregadas por la Gobernación del Valle del
          Cauca tras el terremoto del 10 de agosto de 2026
        </h1>
        {/* La portada es una pieza de diseño, no una maqueta. El texto del
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

        <section id="balance" className="bg-[#F2FAFD] px-4 pb-14 pt-20 sm:px-6 sm:py-20 md:px-10">
          <BalanceFinal />
        </section>

        <QueHaceFaltaSection />
        <MunicipiosSection />
        <CategoriasSection />

        <section id="mapa-de-ayudas" className="relative h-dvh bg-[#123E5C]">
          <MapaDiferido scrollRootId={SCROLL_ROOT_ID} />
        </section>

        <PuntosDistribucionSection />
        <ContratacionSection />

        <footer className="bg-[#0076BC] px-8 py-10 text-base leading-7 text-[#F2FAFD] sm:px-6 md:px-32">
          <div>
            <b className="block font-serif text-xl text-[#fbf8c6]">Ruta de la Solidaridad</b>
            <p className="mt-3">
              Ayudas entregadas a las comunidades afectadas por el terremoto del 10 de agosto de
              2026{corte ? `, con información al ${corte}` : ""}.
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
      <VolverArriba scrollRootId={SCROLL_ROOT_ID} mapaId="mapa-de-ayudas" />
    </>
  );
}
