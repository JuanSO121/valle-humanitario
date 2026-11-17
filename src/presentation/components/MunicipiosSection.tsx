/**
 * MunicipiosSection.tsx — "¿Cuánta ayuda recibió cada municipio?"
 * -----------------------------------------------------------------------
 * Tres bandas, como el resto de las piezas de la campaña: el titular sobre
 * cyan, el rótulo sobre azul y el selector de los 42 municipios sobre crema,
 * con su buscador y sus filtros por zona; al final, la mini sección «Otras
 * ayudas humanitarias».
 *
 * POR QUÉ UN SELECTOR Y NO UNA GALERÍA DE FICHAS
 *
 * De cada municipio solo hay que mostrar el nombre, la zona y, al elegirlo,
 * sus toneladas. Una ficha grande por municipio gastaba 110 px de alto para
 * decir eso: 42 fichas eran más de 4.600 px en un teléfono, y quien buscaba
 * uno tenía que recorrerlas todas. Ahora cada municipio es un botón de una
 * línea (unos 1.100 px en el teléfono, a dos columnas, y menos de 500 px en escritorio) y el
 * detalle es UNO solo, que se abre justo debajo de la fila del botón tocado,
 * sin mandar a la persona a otra parte de la página.
 *
 * La zona se lee por el punto de color (el mismo de los filtros), así no
 * hace falta repetir «Zona Norte» 18 veces. El orden es alfabético y sin
 * posiciones: el ranking de «los que más recibieron» se fue.
 *
 * Un municipio sin despachos registrados lo dice, no muestra «0 t»: «el
 * Excel no registra» y «no recibió» no son la misma afirmación.
 *
 * LO QUE NO ES UN MUNICIPIO
 *
 * Municipios múltiples, otras ayudas y traslados, más los 42 municipios,
 * son el total despachado. Por eso van acá y no en secciones aparte: la
 * cuenta se cierra a la vista.
 * -----------------------------------------------------------------------
 */
import { useCentrarAlAbrir } from "@/hooks/use-centrar";
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { useMunicipios, useOtras } from "@/application/hooks/useTablero";
import type { Municipio, Zona } from "@/domain/entities";
import { entero, toneladas } from "@/lib/formato";
import { normMunicipalityName } from "@/lib/municipalityName";
import { Banda, Cargando, SectionTitle } from "./storyPrimitives";

const ZONAS: Zona[] = ["Norte", "Centro", "Sur", "Pacífico"];

/** El color de cada zona: el mismo en el filtro y en el punto de cada botón. */
const COLOR_ZONA: Record<Zona, string> = {
  Norte: "#22ABE2",
  Centro: "#F2B705",
  Sur: "#5CC46B",
  Pacífico: "#B07BB8",
};

/** La franja azul con el rótulo de un bloque. */
function BandaRotulo({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#0079C1] px-4 py-7 sm:px-6 md:px-10">
      <h3 className="vc-rotulo mx-auto max-w-6xl text-[clamp(1.5rem,3.6vw,2.5rem)] text-white">
        {children}
      </h3>
    </div>
  );
}

export function MunicipiosSection() {
  const { data, isPending } = useMunicipios();
  if (isPending)
    return (
      <Cargando
        id="municipios"
        className="min-h-dvh bg-[#FBF8C6]"
        texto="Cargando los municipios…"
      />
    );
  if (!data || !data.disponible || data.municipios.length === 0) return null;
  return <Contenido municipios={data.municipios} />;
}

function Contenido({ municipios }: { municipios: Municipio[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [zona, setZona] = useState<Zona | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  const ordenados = useMemo(
    () => [...municipios].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [municipios],
  );

  const porZona = useMemo(() => {
    const cuenta = new Map<Zona, number>();
    for (const m of municipios) cuenta.set(m.zona, (cuenta.get(m.zona) ?? 0) + 1);
    return cuenta;
  }, [municipios]);

  const visibles = useMemo(() => {
    const q = normMunicipalityName(busqueda);
    return ordenados.filter(
      (m) =>
        (zona === null || m.zona === zona) &&
        (q === "" || normMunicipalityName(m.nombre).includes(q)),
    );
  }, [ordenados, busqueda, zona]);

  // Cuántas columnas tiene la rejilla ahora mismo: el detalle se inserta al
  // final de la FILA del botón tocado, y esa fila depende del ancho.
  const sinResultados = visibles.length === 0;
  const rejilla = useRef<HTMLUListElement>(null);
  const [columnas, setColumnas] = useState(1);
  useEffect(() => {
    const el = rejilla.current;
    if (!el) return;
    const medir = () => {
      const n = getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length;
      setColumnas(Math.max(1, n));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
    // La rejilla se desmonta cuando no hay resultados: hay que volver a medirla.
  }, [sinResultados]);

  // Si el filtro esconde el municipio abierto, el detalle se cierra solo.
  useEffect(() => {
    if (abierto !== null && !visibles.some((m) => m.id === abierto)) setAbierto(null);
  }, [visibles, abierto]);

  const filtros: { valor: Zona | null; etiqueta: string; cantidad: number }[] = [
    { valor: null, etiqueta: "Todas las zonas", cantidad: municipios.length },
    ...ZONAS.map((z) => ({ valor: z, etiqueta: z, cantidad: porZona.get(z) ?? 0 })),
  ];

  const idxAbierto = abierto === null ? -1 : visibles.findIndex((m) => m.id === abierto);
  const finDeFila =
    idxAbierto < 0
      ? -1
      : Math.min(visibles.length - 1, (Math.floor(idxAbierto / columnas) + 1) * columnas - 1);
  const seleccionado = idxAbierto < 0 ? null : (visibles[idxAbierto] ?? null);

  return (
    <section id="municipios" className="vc-seccion bg-[#FBF8C6]">
      <Banda tono="cyan" primera>
        <SectionTitle tono="cyan">¿Cuánta ayuda recibió cada municipio?</SectionTitle>
      </Banda>

      <BandaRotulo>
        Los <span className="vc-resaltado">{municipios.length} municipios</span>
      </BandaRotulo>

      <Banda tono="crema">
        {/* Filtros, buscador y contador en un mismo panel: flotando sobre el
            fondo se leían como tres elementos sin relación. */}
        <div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#123E5C]/10 sm:p-5">
            <div
              role="group"
              aria-label="Filtrar por zona"
              className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden"
            >
              {filtros.map((f) => {
                const activo = zona === f.valor;
                return (
                  <button
                    key={f.etiqueta}
                    type="button"
                    onClick={() => setZona(activo ? null : f.valor)}
                    aria-pressed={activo}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-base font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1] ${
                      activo
                        ? "bg-[#0079C1] text-white shadow-md"
                        : "bg-[#EAF7FC] text-[#35708F] hover:bg-[#DDF0FA] hover:text-[#0079C1]"
                    }`}
                  >
                    {f.valor && (
                      <i
                        aria-hidden
                        className="block size-2.5 rounded-full ring-2 ring-white/70"
                        style={{ background: COLOR_ZONA[f.valor] }}
                      />
                    )}
                    {f.etiqueta}
                    <span
                      className={`rounded-full px-2 py-0.5 text-sm font-bold ${
                        activo ? "bg-[#005F99] text-white" : "bg-white text-[#0079C1]"
                      }`}
                    >
                      {f.cantidad}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block min-w-0 flex-1">
                <span className="sr-only">Buscar municipio</span>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#8FAABC]"
                />
                {/* 16 px o más: por debajo, iOS hace zoom al enfocar el campo. */}
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar municipio…"
                  className="min-h-11 w-full rounded-lg border-2 border-transparent bg-[#F2FAFD] py-3 pl-11 pr-4 text-base text-[#123E5C] outline-none transition placeholder:text-[#587890] focus:border-[#0079C1]"
                />
              </label>
              <p
                className="shrink-0 text-base font-semibold text-[#35708F] sm:text-right"
                aria-live="polite"
              >
                {visibles.length === municipios.length
                  ? ""
                  : `${visibles.length} de ${municipios.length} municipios`}
              </p>
            </div>
          </div>

          {visibles.length === 0 ? (
            <p className="mt-6 rounded-lg border-2 border-dashed border-[#0079C1]/40 bg-white/60 p-10 text-center text-base text-[#35708F]">
              Ningún municipio coincide. Pruebe con otro nombre o quite el filtro de zona.
            </p>
          ) : (
            <ul
              ref={rejilla}
              className="mt-4 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,9.75rem),1fr))]"
            >
              {visibles.flatMap((m, i) => {
                const fila = [
                  <Boton
                    key={m.id}
                    municipio={m}
                    activo={abierto === m.id}
                    onToggle={setAbierto}
                  />,
                ];
                if (i === finDeFila && seleccionado) {
                  fila.push(
                    <Detalle
                      key={`detalle-${seleccionado.id}`}
                      municipio={seleccionado}
                      onCerrar={() => setAbierto(null)}
                    />,
                  );
                }
                return fila;
              })}
            </ul>
          )}
        </div>

        <OtrasAyudas />
      </Banda>
    </section>
  );
}

/**
 * El botón de un municipio: una línea, el punto de su zona y el nombre.
 * `memo` y un `onToggle` estable: al abrir uno, los otros 41 no se vuelven
 * a dibujar.
 */
const Boton = memo(function Boton({
  municipio: m,
  activo,
  onToggle,
}: {
  municipio: Municipio;
  activo: boolean;
  onToggle: (updater: (actual: string | null) => string | null) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle((a) => (a === m.id ? null : m.id))}
        aria-pressed={activo}
        aria-label={`${m.nombre}, zona ${m.zona}`}
        className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold ring-1 transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1] ${
          activo
            ? "bg-[#0079C1] text-white ring-[#0079C1]"
            : m.atendido
              ? "bg-white text-[#123E5C] ring-[#123E5C]/10 hover:bg-[#EAF7FC] hover:ring-[#0079C1]/40"
              : "bg-[#EAF7FC] text-[#587890] ring-[#123E5C]/10 hover:ring-[#0079C1]/40"
        }`}
      >
        <i
          aria-hidden
          className="block size-2.5 shrink-0 rounded-full ring-2 ring-white/70"
          style={{ background: COLOR_ZONA[m.zona] }}
        />
        <span className="line-clamp-2 min-w-0 break-words leading-tight">{m.nombre}</span>
      </button>
    </li>
  );
});

/** El detalle del municipio elegido, a todo el ancho, bajo su fila (escritorio). */
function Detalle({ municipio: m, onCerrar }: { municipio: Municipio; onCerrar: () => void }) {
  const ref = useRef<HTMLLIElement>(null);

  // El detalle se trae a la vista, centrado y con desplazamiento suave.
  useCentrarAlAbrir(ref, m.id);

  return (
    <li ref={ref} className="vc-aparece col-span-full">
      <TarjetaDetalle municipio={m} onCerrar={onCerrar} />
    </li>
  );
}

function TarjetaDetalle({
  municipio: m,
  onCerrar,
}: {
  municipio: Municipio;
  onCerrar: () => void;
}) {
  return (
    <>
      <div className="relative rounded-lg bg-[#123E5C] px-5 py-5 sm:px-6">
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar detalle"
          className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full text-[#C9E4F2] hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          <X aria-hidden className="size-5" />
        </button>
        <p className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#FFD400]">
          Zona {m.zona}
        </p>
        <h4 className="vc-titular mt-1 pr-10 text-[clamp(1.5rem,3.4vw,2.2rem)] leading-tight text-[#FBF8C6]">
          {m.nombre}
        </h4>
        {m.atendido ? (
          <>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <b className="text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold leading-none tabular-nums text-[#FBF8C6]">
                {toneladas(m.toneladas)}
              </b>
              <span className="text-base text-[#C9E4F2]">toneladas aproximadas</span>
            </div>
          </>
        ) : (
          <p className="mt-3 text-base text-[#C9E4F2]">
            No hay entregas registradas en este municipio.
          </p>
        )}
      </div>
    </>
  );
}

/**
 * La mini sección «Otras ayudas humanitarias»: lo entregado a fundaciones,
 * otros departamentos y otras entidades, que no es de ningún municipio. Las
 * demás rutas (municipios múltiples, puntos de distribución) están en el
 * balance, con el diseño de las rutas.
 */
function OtrasAyudas() {
  const { data } = useOtras();
  if (!data || !data.disponible) return null;
  return (
    <article className="vc-aparece mt-10 flex flex-col gap-5 rounded-lg bg-[#123E5C] p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:p-8">
      <div className="min-w-0">
        <h3 className="vc-titular text-[clamp(1.6rem,3.4vw,2.4rem)] leading-tight text-[#FBF8C6]">
          Otras ayudas humanitarias
        </h3>
        <p className="mt-2 max-w-xl text-base leading-7 text-[#CFEAF7]">
          Ayudas entregadas a fundaciones, otros departamentos y otras entidades.
        </p>
      </div>
      <div className="shrink-0 sm:text-right">
        <b className="block text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold leading-none tabular-nums text-[#FBF8C6]">
          {toneladas(data.toneladas)}
        </b>
        <span className="mt-1.5 block text-base text-[#C9E4F2]">toneladas aproximadas</span>
      </div>
    </article>
  );
}
