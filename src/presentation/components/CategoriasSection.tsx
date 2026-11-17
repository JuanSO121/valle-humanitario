/**
 * CategoriasSection.tsx — "Ayuda distribuida por categorías"
 * -----------------------------------------------------------------------
 * Las siete categorías del tablero. Cada una dice cuánto se distribuyó y, al
 * tocarla, se abre y muestra qué productos incluye, con sus toneladas.
 *
 * Antes eran siete pestañas cerradas que no hacían nada: no decían cuánto ni
 * qué, así que no servían para nada. Ahora la sección es el desglose de lo que
 * se ve en el mapa, por categoría y por producto.
 *
 * Las cifras salen de la ruta `categorias` del backend: toneladas por
 * categoría y sus productos de más peso; lo demás se junta en «otros
 * productos». Si el backend es de una versión anterior y no trae productos,
 * la categoría se muestra sin desplegar.
 *
 * Las categorías y su orden vienen del backend; si la ruta no está
 * disponible, la sección no se dibuja.
 * -----------------------------------------------------------------------
 */
import { useId, useRef, useState, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { useCategorias } from "@/application/hooks/useTablero";
import { useCentrarAlAbrir } from "@/hooks/use-centrar";
import { toneladas } from "@/lib/formato";
import { colorDeGrupo, iconoDeCategoria } from "@/presentation/data/categorias";
import { Cargando } from "./storyPrimitives";

interface Producto {
  nombre: string;
  toneladas: number;
}
interface Categoria {
  nombre: string;
  toneladas: number;
  productos?: Producto[] | undefined;
  otros?: number | undefined;
}

export function CategoriasSection() {
  const { data, isPending } = useCategorias();
  const panelId = useId();
  const [abierta, setAbierta] = useState<string | null>(null);

  if (isPending)
    return (
      <Cargando
        id="categorias"
        className="min-h-[34rem] bg-[#0B7DB1] [&_p]:text-white"
        texto="Cargando las categorías…"
      />
    );
  if (!data || !data.disponible || data.categorias.length === 0) return null;

  return (
    <section
      id="categorias"
      className="vc-seccion bg-[#0B7DB1] px-4 pb-12 pt-20 sm:px-6 sm:py-14 md:px-10"
    >
      <div className="mx-auto w-full max-w-3xl">
        <h2 className="vc-titular mx-auto w-fit text-center text-[clamp(1.75rem,5.5vw,3.25rem)] text-[#FBF8C6]">
          Ayuda distribuida por
          <br />
          <span className="mt-1 inline-block bg-[#FBF8C6] px-[0.3em] py-[0.05em] text-[#0079C1]">
            categorías
          </span>
        </h2>

        <ul className="mt-8 space-y-2.5" aria-label="Categorías de ayuda">
          {data.categorias.map((c, i) => (
            <Fila
              key={c.nombre}
              categoria={c}
              indice={i}
              abierta={abierta === c.nombre}
              controla={`${panelId}-${i}`}
              onToggle={() => setAbierta((a) => (a === c.nombre ? null : c.nombre))}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Fila({
  categoria: c,
  indice,
  abierta,
  controla,
  onToggle,
}: {
  categoria: Categoria;
  indice: number;
  abierta: boolean;
  controla: string;
  onToggle: () => void;
}) {
  const Icono = iconoDeCategoria(c.nombre);
  const color = colorDeGrupo(c.nombre);
  const productos = c.productos ?? [];
  const desplegable = productos.length > 0;
  const ref = useRef<HTMLLIElement>(null);
  // Al abrirla, la categoría se trae a la vista, centrada y con desplazamiento suave.
  useCentrarAlAbrir(abierta ? ref : { current: null }, abierta ? c.nombre : "");

  const contenido = (
    <>
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: `${color}22` }}
      >
        <Icono className="size-5" style={{ color }} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 text-lg font-bold leading-tight text-[#123E5C]">
        {c.nombre}
      </span>
      <span className="shrink-0 text-lg font-extrabold tabular-nums text-[#0079C1]">
        {toneladas(c.toneladas)}
      </span>
      {desplegable && (
        <ChevronDown
          aria-hidden
          className={`size-5 shrink-0 text-[#0079C1] transition-transform duration-200 motion-reduce:transition-none ${
            abierta ? "rotate-180" : ""
          }`}
        />
      )}
    </>
  );

  return (
    <li
      ref={ref}
      // La franja del color de la categoría, como las fichas del original.
      style={{ "--i": indice, borderLeftColor: color } as CSSProperties}
      className="vc-aparece overflow-hidden rounded-lg border-l-[4px] bg-white shadow-sm ring-1 ring-[#123E5C]/10"
    >
      {desplegable ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={abierta}
          aria-controls={controla}
          className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ${
            abierta ? "bg-[#FBF8C6]" : "hover:bg-[#F2FAFD]"
          }`}
        >
          {contenido}
        </button>
      ) : (
        <div className="flex min-h-16 w-full items-center gap-3 px-4 py-3">{contenido}</div>
      )}

      {desplegable && abierta && (
        <div
          id={controla}
          role="region"
          aria-label={`Productos de ${c.nombre}`}
          className="px-4 pb-4 pt-3"
        >
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#35708F]">
            Qué incluye
          </p>
          <ul className="mt-2 divide-y divide-[#123E5C]/10">
            {productos.map((p) => (
              <li key={p.nombre} className="py-2">
                <div className="flex items-baseline justify-between gap-4 text-base">
                  <span className="min-w-0 font-semibold text-[#123E5C]">{p.nombre}</span>
                  <b className="shrink-0 tabular-nums text-[#123E5C]">{toneladas(p.toneladas)}</b>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#123E5C]/10">
                  <i
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(2, Math.round((p.toneladas / Math.max(c.toneladas, 0.001)) * 100))}%`,
                      background: color,
                    }}
                  />
                </div>
              </li>
            ))}
            {c.otros !== undefined && c.otros > 0 && (
              <li className="flex items-baseline justify-between gap-4 py-2 text-base">
                <span className="text-[#35708F]">Otros productos</span>
                <b className="shrink-0 tabular-nums text-[#35708F]">{toneladas(c.otros)}</b>
              </li>
            )}
          </ul>
        </div>
      )}
    </li>
  );
}
