/**
 * QueHaceFaltaSection.tsx — "¿Qué hace falta hoy?"
 * -----------------------------------------------------------------------
 * Siete categorías en tarjetas pequeñas. Al tocar una, se despliega lo
 * que el centro de acopio necesita en ella, elemento por elemento.
 *
 * DE DÓNDE SALE
 *
 * De la plantilla QUE_HACE_FALTA, que llena el equipo del acopio: por
 * cada elemento, Agotado, Escaso o Buena cantidad. El backend (Faltantes.js)
 * descarta lo que no cuadra —categoría desconocida, estado que no es uno
 * de los tres— en vez de corregirlo, así que lo que llega acá es lo que
 * alguien escribió, no lo que alguien supuso.
 *
 * QUÉ SE VE
 *
 * · Cada tarjeta avisa sin abrirse: cuántos elementos están agotados y
 *   cuántos escasos. Es lo que decide si vale la pena abrirla.
 * · Cada elemento lleva su estado con la PALABRA además del color: una de
 *   cada doce personas no distingue el rojo del verde, y este es el dato
 *   que decide si alguien compra algo.
 * · Que aparezca también lo que está en buena cantidad permite leer la
 *   lista al revés: qué NO hay que llevar.
 *
 * ACCESIBLE: cada tarjeta es un botón con aria-expanded y aria-controls;
 * el panel se anuncia como región.
 *
 * Sin elementos cargados, la tarjeta lo dice. Con la plantilla
 * inaccesible, la sección no se dibuja: una lista vieja o vacía manda a
 * donar a ciegas.
 * -----------------------------------------------------------------------
 */
import { useCentrarAlAbrir } from "@/hooks/use-centrar";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useFaltantes } from "@/application/hooks/useTablero";
import type { CategoriaFaltantes, EstadoFaltante } from "@/domain/entities";
import { colorDeGrupo, iconoDeCategoria } from "@/presentation/data/categorias";

const CYAN_CENTRO = "#40BBE5";
const CYAN_BORDE = "#0E8BB7";

interface Estado {
  etiqueta: EstadoFaltante;
  glosa: string;
  fondo: string;
  texto: string;
}

/** De lo que falta a lo que sobra. */
const ESTADOS: Estado[] = [
  {
    etiqueta: "Agotado",
    glosa: "En este momento no hay existencias.",
    fondo: "#C93520",
    texto: "#FFFFFF",
  },
  { etiqueta: "Escaso", glosa: "Se necesita más.", fondo: "#FFD400", texto: "#123E5C" },
  {
    etiqueta: "Buena cantidad",
    glosa: "Hay existencias suficientes por ahora.",
    fondo: "#5CC46B",
    texto: "#123E5C",
  },
];

const estadoDe = (e: EstadoFaltante): Estado =>
  ESTADOS.find((x) => x.etiqueta === e) ?? ESTADOS[2]!;

export function QueHaceFaltaSection() {
  const { data } = useFaltantes();
  const [abierta, setAbierta] = useState<string | null>(null);
  const panelId = useId();

  // Cuántas columnas tiene la rejilla ahora: el detalle se abre al final de la
  // FILA de la tarjeta tocada. Se deduce del ancho de la ventana (los mismos
  // cortes de las clases `sm:` y `lg:` de abajo) y NO leyendo el estilo de la
  // rejilla: la última tarjeta se estira con `grid-column: span N`, y si N es
  // mayor que las columnas reales el navegador crea columnas implícitas que
  // la lectura contaba como reales. Al achicar la ventana el número quedaba
  // mal, la tarjeta seguía estirada y la rejilla se desbordaba.
  const columnas = useColumnas();

  // Sin plantilla no hay sección: ver la nota de cabecera.
  if (!data || !data.disponible) return null;

  const categorias = data.categorias;
  const idx = categorias.findIndex((c) => c.nombre === abierta);
  const finDeFila =
    idx < 0 ? -1 : Math.min(categorias.length - 1, (Math.floor(idx / columnas) + 1) * columnas - 1);
  const seleccionada = idx < 0 ? null : (categorias[idx] ?? null);

  return (
    <section
      id="que-hace-falta"
      className="vc-seccion flex min-h-dvh flex-col justify-center px-4 pb-12 pt-20 sm:px-6 sm:py-16 md:px-10"
      style={{
        background: `radial-gradient(ellipse at center, ${CYAN_CENTRO} 0%, ${CYAN_BORDE} 80%)`,
      }}
    >
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="vc-titular mx-auto w-fit bg-[#FBF8C6] px-[0.3em] py-[0.1em] text-center text-[clamp(1.75rem,6vw,3.5rem)] leading-tight text-[#0079C1]">
          ¿Qué hace falta hoy?
        </h2>
        <p className="vc-titular mx-auto max-w-3xl px-2 py-6 text-center text-[clamp(1.1rem,2vw,1.75rem)] leading-snug text-[#FBF8C6]">
          Toque una categoría para conocer qué se necesita en el centro de acopio y qué elementos
          están agotados, escasos o disponibles en buena cantidad.
        </p>

        <Leyenda />

        <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {categorias.flatMap((c, i) => {
            const fila = [
              <Tarjeta
                key={c.nombre}
                categoria={c}
                span={
                  i === categorias.length - 1 && columnas > 1 && categorias.length % columnas
                    ? columnas - (categorias.length % columnas) + 1
                    : 1
                }
                abierta={c.nombre === abierta}
                controla={panelId}
                onToggle={() => setAbierta((a) => (a === c.nombre ? null : c.nombre))}
              />,
            ];
            if (i === finDeFila && seleccionada) {
              fila.push(
                <li
                  key={`detalle-${seleccionada.nombre}`}
                  id={panelId}
                  role="region"
                  aria-label={`Detalle de ${seleccionada.nombre}`}
                  className="col-span-full"
                >
                  <Detalle categoria={seleccionada} />
                </li>,
              );
            }
            return fila;
          })}
        </ul>
      </div>
    </section>
  );
}

/** Columnas de la rejilla según el ancho: 1, 2 (desde 640 px) o 4 (desde 1024 px). */
function useColumnas(): number {
  const [n, setN] = useState(1);
  useEffect(() => {
    const dos = window.matchMedia("(min-width: 640px)");
    const cuatro = window.matchMedia("(min-width: 1024px)");
    const medir = () => setN(cuatro.matches ? 4 : dos.matches ? 2 : 1);
    medir();
    dos.addEventListener("change", medir);
    cuatro.addEventListener("change", medir);
    return () => {
      dos.removeEventListener("change", medir);
      cuatro.removeEventListener("change", medir);
    };
  }, []);
  return n;
}

function Leyenda() {
  return (
    <div className="rounded-xl bg-white px-4 py-3.5 sm:px-6 sm:py-5">
      <ul className="grid gap-y-3 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-4">
        {ESTADOS.map((e) => (
          <li
            key={e.etiqueta}
            className="grid grid-cols-[8.75rem_1fr] items-center gap-x-3 sm:flex sm:flex-col sm:items-center sm:text-center"
          >
            <span
              className="justify-self-start whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-extrabold sm:justify-self-auto"
              style={{ background: e.fondo, color: e.texto }}
            >
              {e.etiqueta}
            </span>
            <span className="text-[15px] leading-5 text-[#35708F] sm:mt-2 sm:leading-6">
              {e.glosa}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tarjeta({
  categoria: c,
  abierta,
  controla,
  span,
  onToggle,
}: {
  categoria: CategoriaFaltantes;
  abierta: boolean;
  controla: string;
  span: number;
  onToggle: () => void;
}) {
  const Icono = iconoDeCategoria(c.nombre);
  const color = colorDeGrupo(c.nombre);
  return (
    // La última tarjeta ocupa lo que le queda de la fila: sin huecos a un lado.
    <li style={span > 1 ? { gridColumn: `span ${span}` } : undefined}>
      {/* Una fila limpia: el ícono con el color de su grupo, el nombre como
          texto y el estado en una línea con su punto de semáforo. Sin
          rótulos pintados dentro de la tarjeta. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierta}
        aria-controls={controla}
        className={`flex h-full min-h-[4.5rem] w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left shadow-sm transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
          abierta ? "bg-[#FBF8C6]" : "bg-white hover:bg-[#F2FAFD]"
        }`}
      >
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${color}26` }}
        >
          <Icono className="size-6" style={{ color }} strokeWidth={1.9} />
        </span>

        <span className="min-w-0 flex-1">
          <b className="block text-base leading-tight text-[#123E5C]">{c.nombre}</b>
          <Estado categoria={c} />
        </span>

        <ChevronDown
          aria-hidden
          className={`size-5 shrink-0 text-[#0079C1] transition-transform motion-reduce:transition-none ${
            abierta ? "rotate-180" : ""
          }`}
        />
      </button>
    </li>
  );
}

/** El estado de una categoría de un vistazo: «1 agotado · 2 escasos». */
function Estado({ categoria: c }: { categoria: CategoriaFaltantes }) {
  if (c.total === 0)
    return <span className="mt-0.5 block text-[13px] text-[#587890]">Sin información</span>;

  const partes: { color: string; texto: string }[] = [];
  if (c.agotados > 0) {
    partes.push({
      color: "#C93520",
      texto: `${c.agotados} ${c.agotados === 1 ? "agotado" : "agotados"}`,
    });
  }
  if (c.escasos > 0) {
    partes.push({
      color: "#F2B705",
      texto: `${c.escasos} ${c.escasos === 1 ? "escaso" : "escasos"}`,
    });
  }
  if (partes.length === 0) partes.push({ color: "#5CC46B", texto: "Todo en buena cantidad" });

  return (
    <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] font-semibold text-[#35708F]">
      {partes.map((p) => (
        <span key={p.texto} className="inline-flex items-center gap-1.5">
          <i aria-hidden className="block size-2 rounded-full" style={{ background: p.color }} />
          {p.texto}
        </span>
      ))}
    </span>
  );
}

function Detalle({ categoria: c }: { categoria: CategoriaFaltantes }) {
  const ref = useRef<HTMLDivElement>(null);
  // Al abrir una categoría, su lista se trae a la vista, centrada y suave.
  useCentrarAlAbrir(ref, c.nombre);
  return (
    <div ref={ref} className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-xl font-extrabold text-[#0079C1]">{c.nombre}</h3>
      {c.elementos.length === 0 ? (
        <p className="mt-3 text-base text-[#35708F]">Aún no hay información de esta categoría.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#123E5C]/10">
          {c.elementos.map((e) => {
            const est = estadoDe(e.estado);
            return (
              <li key={e.nombre} className="flex items-start justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="block text-base font-bold text-[#123E5C]">{e.nombre}</span>
                  {e.observacion && (
                    <span className="mt-0.5 block text-[14px] leading-5 text-[#35708F]">
                      {e.observacion}
                    </span>
                  )}
                </span>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-extrabold"
                  style={{ background: est.fondo, color: est.texto }}
                >
                  {est.etiqueta}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
