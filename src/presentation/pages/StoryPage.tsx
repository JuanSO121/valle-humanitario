import { ChevronDown, MapPinned } from "lucide-react";
import { DashboardPage } from "@/presentation/pages/DashboardPage";
import { ValleGlyph } from "@/presentation/components/ValleGlyph";
import { PanoramaDonuts } from "@/presentation/components/PanoramaDonuts";
import { PanoramaPuente } from "@/presentation/components/PanoramaPuente";
import { AcumuladoChart } from "../components/AcumuladoChart";
import { JornadaBars } from "../components/JornadaBars";
import { MovimientoStatCards, MunicipiosNuevosCallouts } from "../components/MovimientoExtras";


const kpis = [
  { value: "307", label: "Despachos documentados", note: "306 municipales, 1 fuera del Valle" },
  { value: "39 / 41", label: "Municipios atendidos", note: "Cobertura territorial del 95%" },
  { value: "553 t", label: "Ayuda movilizada", note: "Estimado, 1,75 t por despacho" },
  { value: "256.650", label: "Unidades registradas", note: "6.111 renglones transcritos" },
];

const dailyDispatches = [
  ["11", 5],
  ["12", 56],
  ["13", 38],
  ["14", 21],
  ["15", 23],
  ["16", 16],
  ["17", 45],
  ["18", 26],
  ["19", 11],
  ["20", 11],
  ["21", 21],
  ["22", 19],
  ["24", 13],
  ["25", 2],
] as const;

const categories = [
  ["Protección y seguridad", 29100, "#F0801E"],
  ["Aseo personal", 54038, "#3E9BCB"],
  ["Alimentos", 27155, "#65AC56"],
  ["Descanso y abrigo", 12800, "#B57BB5"],
  ["Líquidos e hidratación", 23500, "#00A494"],
] as const;

const channels = [
  { name: "Cali", subtitle: "Centro principal de acopio", value: 271, color: "#F0801E" },
  { name: "Cartago", subtitle: "Segundo origen para el norte", value: 35, color: "#B57BB5" },
  { name: "Externo", subtitle: "Entrega fuera del Valle", value: 1, color: "#00A494" },
];

const findings = [
  "El 20% de los despachos salió durante las primeras 48 horas.",
  "Dagua, Sevilla, Yotoco, Calima y Restrepo concentran los mayores volúmenes documentados.",
  "La lectura territorial combina entregas, municipios nuevos y requerimientos PMU.",
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]">{children}</p>;
}

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
  const maxDispatches = Math.max(...dailyDispatches.map(([, value]) => value));
  const maxCategory = Math.max(...categories.map(([, value]) => value));

  return (
    <main className="h-dvh overflow-y-auto scroll-smooth bg-[#F4F9FC] text-[#0B2233] [scroll-snap-type:y_mandatory]">
      <nav className="sticky top-0 z-50 border-b border-[#00578C]/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 overflow-x-auto px-5 text-xs font-semibold text-[#4E6B7C]">
          <b className="shrink-0 font-serif text-sm text-[#00578C]">SOR Valle del Cauca</b>
          <a href="#panorama" className="hover:text-[#00578C]">
            Panorama
          </a>
          <a href="#portal-mapa" className="hover:text-[#00578C]">
            Territorio
          </a>
          <a href="#mapa-vivo" className="hover:text-[#00578C]">
            Mapa vivo
          </a>
          <a href="#datos" className="hover:text-[#00578C]">
            Datos
          </a>
          <span className="ml-auto shrink-0 text-[#6E8B9E]">Corte 25 de agosto de 2026</span>
        </div>
      </nav>

      <section
        id="inicio"
        className="grid min-h-dvh snap-start place-items-center bg-[#EAF6FB] px-5 py-16"
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <SectionLabel>
              Sistema Operativo Regional
          </SectionLabel>

          <h1 className="mt-6 font-serif text-6xl leading-[0.95] text-[#00578C] md:text-8xl">
              Ayudas humanitarias
              <br />
              en el Valle del Cauca
          </h1>

          <p className="mt-8 max-w-3xl text-xl leading-9 text-[#315A70]">
              Una visualización interactiva que muestra cómo se movilizaron las ayudas
              humanitarias durante la emergencia, desde los centros de acopio hasta los
              municipios atendidos.
          </p>

          <div className="mt-14">
              <DownLink
                  href="#panorama"
                  label="Explorar"
              />
          </div>
      </div>
      </section>

      <section id="panorama" className="min-h-dvh snap-start bg-white px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>Panorama</SectionLabel>
          <h2 className="mt-3 max-w-3xl font-serif text-4xl text-[#0B2233] md:text-5xl">
            Catorce jornadas, 307 despachos y un departamento casi cubierto
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-[#00578C]/12 bg-[#00578C]/12 md:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-[#F7FBFD] p-6">
                <b className="block font-serif text-4xl text-[#00578C]">
                  {kpi.value}
                </b>

                <span className="mt-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#4E6B7C]">
                  {kpi.label}
                </span>

                <p className="mt-2 text-sm text-[#5E7789]">
                  {kpi.note}
                </p>
              </div>
            ))}
          </div>

          {/* Visualización analítica */}
          <div className="mt-14 space-y-12">
            <PanoramaDonuts />
            <PanoramaPuente />
          </div>

          <div className="mt-10">
            <DownLink
              href="#movimiento"
              label="Bajar al movimiento"
            />
          </div>
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
            <ValleGlyph className="aspect-square w-full rounded-lg ring-1 ring-white/15 transition duration-300 group-hover:scale-[1.02]" />
          </a>
          <div>
            <SectionLabel>Territorio</SectionLabel>
            <h2 className="mt-4 font-serif text-5xl leading-none text-white md:text-6xl">
              El mapa entra como pieza central
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#BBD6E6]">
              Este símbolo usa los mismos límites municipales del mapa real. Al tocarlo o seguir
              bajando aparece el `MapCanvas` interactivo con rutas, timeline, paneles y selección
              por municipio.
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

      <section id="datos" className="min-h-dvh snap-start bg-white px-5 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <SectionLabel>Ayuda entregada</SectionLabel>
            <h2 className="mt-3 font-serif text-4xl md:text-5xl">
              Composición por categorías principales
            </h2>
            <div className="mt-8 space-y-4">
              {categories.map(([name, value, color]) => (
                <div key={name}>
                  <div className="flex justify-between gap-4 text-sm">
                    <b>{name}</b>
                    <span className="font-serif text-lg">{value.toLocaleString("es-CO")}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#E6F0F7]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(value / maxCategory) * 100}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[#00578C]/12 bg-[#F7FBFD] p-6">
            <SectionLabel>Canales</SectionLabel>
            <div className="mt-6 grid gap-4">
              {channels.map((channel) => (
                <div
                  key={channel.name}
                  className="border-l-4 bg-white p-4 shadow-sm"
                  style={{ borderColor: channel.color }}
                >
                  <b className="font-serif text-3xl text-[#00578C]">{channel.value}</b>
                  <p className="mt-1 font-bold">{channel.name}</p>
                  <p className="text-sm text-[#5E7789]">{channel.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="hallazgos" className="min-h-dvh snap-start bg-[#0B2233] px-5 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>Lectura ejecutiva</SectionLabel>
          <h2 className="mt-3 max-w-3xl font-serif text-4xl md:text-5xl">
            Hallazgos para orientar la conversación
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {findings.map((finding, index) => (
              <article key={finding} className="rounded-lg border border-white/12 bg-white/6 p-6">
                <span className="font-serif text-4xl text-[#81C8EC]">0{index + 1}</span>
                <p className="mt-4 leading-7 text-[#D7EDF8]">{finding}</p>
              </article>
            ))}
          </div>
          <p className="mt-12 max-w-3xl text-sm leading-7 text-[#9DB4C2]">
            Fuentes integradas desde el tablero HTML de referencia y el contrato vivo del API de
            ayudas humanitarias. El mapa central conserva los datos operativos actuales del
            proyecto.
          </p>
        </div>
      </section>
    </main>
  );
}
