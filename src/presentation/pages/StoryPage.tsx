import { useCallback } from "react";
import { ChevronDown, MapPinned } from "lucide-react";
import { DashboardPage } from "@/presentation/pages/DashboardPage";
import { ValleGlyph } from "@/presentation/components/ValleGlyph";
import { PanoramaDonuts } from "@/presentation/components/PanoramaDonuts";
import { PanoramaPuente } from "@/presentation/components/PanoramaPuente";
import { AcumuladoChart } from "../components/AcumuladoChart";
import { JornadaBars } from "../components/JornadaBars";
import { MovimientoStatCards, MunicipiosNuevosCallouts } from "../components/MovimientoExtras";
import {
  CoberturaPorZona,
  MunicipiosGrid,
  PodioMunicipios,
} from "../components/TerritorySections";
import { EvolucionHeatmap } from "../components/EvolucionHeatmap";
import { AyudaSection } from "../components/AyudaSection";
import { CanalesSection } from "../components/CanalesSection";
import { BrechasSection } from "../components/BrechasSection";
import { HallazgosSection } from "../components/HallazgosSection";
import { SectionLabel } from "../components/storyPrimitives";
import {
  MUNICIPIOS_ATENDIDOS,
  MUNICIPIOS_TOTALES,
  TOTAL_DESPACHOS_MUNICIPALES,
  TOTAL_TONELADAS,
} from "../data/movimientoData";
import { TOTAL_RENGLONES, TOTAL_UNIDADES } from "../data/ayudaData";

// Derivados de movimientoData/ayudaData, no escritos a mano: el hero era
// el punto donde se colaba el "307 despachos / 553 t" del tablero viejo.
const kpis = [
  {
    value: TOTAL_DESPACHOS_MUNICIPALES.toLocaleString("es-CO"),
    label: "Despachos municipales",
    note: "Sin Cali, excluida del consolidado",
  },
  {
    value: `${MUNICIPIOS_ATENDIDOS} / ${MUNICIPIOS_TOTALES}`,
    label: "Municipios atendidos",
    note: `Cobertura del ${Math.round((MUNICIPIOS_ATENDIDOS / MUNICIPIOS_TOTALES) * 100)}%`,
  },
  {
    value: `${TOTAL_TONELADAS} t`,
    label: "Ayuda movilizada",
    note: "Total departamental, todos los canales",
  },
  {
    value: TOTAL_UNIDADES.toLocaleString("es-CO"),
    label: "Unidades registradas",
    note: `${TOTAL_RENGLONES.toLocaleString("es-CO")} renglones transcritos`,
  },
];

const NAV = [
  ["#panorama", "Panorama"],
  ["#movimiento", "Movimiento"],
  ["#portal-mapa", "Territorio"],
  ["#mapa-vivo", "Mapa vivo"],
  ["#ayuda", "Qué se mueve"],
  ["#evolucion", "Evolución"],
  ["#canales", "Canales"],
  ["#brechas", "Brechas"],
  ["#hallazgos", "Hallazgos"],
] as const;

function DownLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex size-10 items-center justify-center rounded-full border border-[#00578C]/20 bg-white text-[#00578C] shadow-sm transition hover:bg-[#E8F6FC]"
    >
      <ChevronDown className="size-5" aria-hidden />
    </a>
  );
}

export function StoryPage() {
  /**
   * Las tarjetas, el podio y el heatmap llevan de vuelta al mapa. Hoy
   * solo hacen scroll: seleccionar el municipio dentro del DashboardPage
   * embebido requiere subirle un prop de selección controlada, que hoy
   * no tiene (su viewState es interno). Cuando exista, este handler es
   * el único punto a tocar.
   */
  const irAlMapa = useCallback(() => {
    document.getElementById("mapa-vivo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    // scroll-snap en `proximity`, no `mandatory`: las secciones nuevas
    // (grilla de 41 municipios, heatmap de 14 jornadas) miden más que un
    // viewport, y con snap obligatorio quedaban tramos inalcanzables.
    <main className="h-dvh overflow-y-auto scroll-smooth bg-[#F4F9FC] text-[#0B2233] [scroll-snap-type:y_proximity]">
      <nav className="sticky top-0 z-50 border-b border-[#00578C]/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 overflow-x-auto px-5 text-xs font-semibold text-[#4E6B7C]">
          <b className="shrink-0 font-serif text-sm text-[#00578C]">SOR Valle del Cauca</b>
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className="shrink-0 hover:text-[#00578C]">
              {label}
            </a>
          ))}
          <span className="ml-auto shrink-0 text-[#6E8B9E]">Corte 25 de agosto de 2026</span>
        </div>
      </nav>

      <section
        id="inicio"
        className="grid min-h-dvh snap-start place-items-center bg-[#EAF6FB] px-5 py-16"
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <SectionLabel>Sistema Operativo Regional</SectionLabel>

          <h1 className="mt-6 font-serif text-6xl leading-[0.95] text-[#00578C] md:text-8xl">
            Ayudas humanitarias
            <br />
            en el Valle del Cauca
          </h1>

          <p className="mt-8 max-w-3xl text-xl leading-9 text-[#315A70]">
            Una visualización interactiva que muestra cómo se movilizaron las ayudas humanitarias
            durante la emergencia, desde los centros de acopio hasta los municipios atendidos.
          </p>

          <div className="mt-14">
            <DownLink href="#panorama" label="Explorar" />
          </div>
        </div>
      </section>

      <section id="panorama" className="min-h-dvh snap-start bg-white px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>Panorama</SectionLabel>
          <h2 className="mt-3 max-w-3xl font-serif text-4xl text-[#0B2233] md:text-5xl">
            Catorce jornadas, {TOTAL_DESPACHOS_MUNICIPALES} despachos y un departamento casi cubierto
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-[#00578C]/12 bg-[#00578C]/12 md:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-[#F7FBFD] p-6">
                <b className="block font-serif text-4xl text-[#00578C]">{kpi.value}</b>
                <span className="mt-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#4E6B7C]">
                  {kpi.label}
                </span>
                <p className="mt-2 text-sm text-[#5E7789]">{kpi.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 space-y-12">
            <PanoramaDonuts />
            <PanoramaPuente />
          </div>

          {/* Antes había dos DownLink idénticos seguidos acá. */}
          <div className="mt-10">
            <DownLink href="#movimiento" label="Bajar al movimiento" />
          </div>
        </div>
      </section>

      <section id="movimiento" className="min-h-dvh snap-start bg-[#F4F9FC] px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>Movimiento</SectionLabel>
          <h2 className="mt-3 max-w-3xl font-serif text-4xl md:text-5xl">
            La operación tuvo un pico temprano y luego se estabilizó
          </h2>
          <div className="mt-10 space-y-12">
            <AcumuladoChart />
            <MovimientoStatCards />
            <JornadaBars />
            <MunicipiosNuevosCallouts />
          </div>
          <div className="mt-10">
            <DownLink href="#portal-mapa" label="Bajar al territorio" />
          </div>
        </div>
      </section>

      <section
        id="portal-mapa"
        className="grid min-h-dvh snap-start place-items-center bg-[#0B2233] px-5 py-16 text-white"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.85fr_1fr]">
          <a href="#mapa-vivo" className="group block" aria-label="Abrir mapa interactivo">
            <ValleGlyph className="aspect-square w-full rounded-lg ring-1 ring-white/15 transition duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
          </a>
          <div>
            <SectionLabel>Territorio</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl leading-none text-white md:text-6xl">
              El mapa entra como pieza central
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#BBD6E6]">
              Este símbolo usa los mismos límites municipales del mapa real. Al tocarlo o seguir
              bajando aparece el mapa interactivo con rutas, línea de tiempo, paneles y selección por
              municipio.
            </p>
            <a
              href="#mapa-vivo"
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#81C8EC] px-4 py-2 text-sm font-bold text-[#06202F] transition hover:bg-white"
            >
              <MapPinned className="size-4" aria-hidden />
              Entrar al mapa
            </a>
          </div>
        </div>
      </section>

      <section id="mapa-vivo" className="min-h-[120dvh] snap-start bg-[#0B2233]">
        <div className="sticky top-0 h-dvh">
          <DashboardPage embedded />
        </div>
      </section>

      {/* Nivel 3b — lo que va debajo del mapa */}
      <section id="territorio-detalle" className="bg-[#F4F9FC] px-5 py-20">
        <div className="mx-auto max-w-6xl space-y-14">
          <PodioMunicipios onSelect={irAlMapa} />
          <CoberturaPorZona />
          <MunicipiosGrid onSelect={irAlMapa} />
          <p className="text-[12.4px] leading-5 text-[#6E8B9E]">
            El mapa muestra dónde se documentó la respuesta.{" "}
            <b className="text-[#0B2233]">No expresa el nivel de necesidad del territorio</b>: para
            eso está el nivel de brechas.
          </p>
        </div>
      </section>

      {/* Nivel 4 */}
      <section id="ayuda" className="bg-white px-5 py-20">
        <AyudaSection />
      </section>

      {/* Nivel 5 */}
      <section id="evolucion" className="bg-[#F4F9FC] px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <EvolucionHeatmap onSelect={irAlMapa} />
        </div>
      </section>

      {/* Nivel 6 */}
      <section id="canales" className="bg-white px-5 py-20">
        <CanalesSection />
      </section>

      {/* Nivel 7 */}
      <section id="brechas" className="bg-[#F4F9FC] px-5 py-20">
        <BrechasSection />
      </section>

      {/* Nivel 8 */}
      <section id="hallazgos" className="snap-start bg-[#0B2233] px-5 py-20 text-white">
        <HallazgosSection />
      </section>

      <footer className="bg-[#061621] px-5 py-9 text-[12.4px] leading-6 text-[#7E9AAD]">
        <div className="mx-auto max-w-6xl">
          <b className="font-serif text-sm text-[#CBE4F2]">Sistema Operativo de la Respuesta</b>
          <br />
          Gobernación del Valle del Cauca · Departamento Administrativo de Desarrollo Institucional
          <br />
          Emergencia por el terremoto del 10 de agosto de 2026 · Corte 25 de agosto de 2026
          <br />
          Construido a partir de los formatos de entrega manuscritos radicados en el Drive
          institucional.
        </div>
      </footer>
    </main>
  );
}