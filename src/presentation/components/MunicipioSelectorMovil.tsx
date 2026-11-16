/**
 * MunicipioSelectorMovil.tsx
 * -----------------------------------------------------------------------
 * El selector de municipios para el celular.
 *
 * Una lista de 42 botones en la pantalla de un teléfono son dos pantallas y
 * media de desplazamiento, y quien busca un municipio tiene que recorrerlos.
 * Aquí la lista vive en una hoja que ocupa toda la pantalla, con lo que se
 * hace en el celular con una lista larga:
 *
 *   · un botón grande «Toque para elegir un municipio» en la página;
 *   · la hoja: buscador, zonas en UNA fila que se desliza y la lista, con las
 *     toneladas de cada municipio a la derecha;
 *   · al elegir, la hoja se cierra y el detalle queda justo debajo del botón.
 *
 * La hoja es un <dialog> nativo: el teclado y los lectores de pantalla ya
 * saben qué hacer con él (foco atrapado, Esc cierra, el fondo no se toca).
 * En escritorio no se usa: allí cabe la rejilla completa.
 * -----------------------------------------------------------------------
 */
import { useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { Municipio, Zona } from "@/domain/entities";
import { toneladas } from "@/lib/formato";
import { normMunicipalityName } from "@/lib/municipalityName";

interface Props {
  municipios: Municipio[];
  zonas: { valor: Zona; color: string }[];
  elegido: Municipio | null;
  colorDeZona: Record<Zona, string>;
  onElegir: (id: string | null) => void;
}

export function MunicipioSelectorMovil({
  municipios,
  zonas,
  elegido,
  colorDeZona,
  onElegir,
}: Props) {
  const hoja = useRef<HTMLDialogElement>(null);
  const [busqueda, setBusqueda] = useState("");
  const [zona, setZona] = useState<Zona | null>(null);

  const visibles = useMemo(() => {
    const q = normMunicipalityName(busqueda);
    return municipios.filter(
      (m) =>
        (zona === null || m.zona === zona) &&
        (q === "" || normMunicipalityName(m.nombre).includes(q)),
    );
  }, [municipios, busqueda, zona]);

  const abrir = () => hoja.current?.showModal();
  const cerrar = () => hoja.current?.close();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={abrir}
        aria-haspopup="dialog"
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white px-4 text-left shadow-sm ring-1 ring-[#123E5C]/10 active:bg-[#EAF7FC]"
      >
        <Search aria-hidden className="size-5 shrink-0 text-[#0079C1]" />
        <span className="min-w-0 flex-1">
          {elegido ? (
            <>
              <span className="block text-[13px] font-semibold text-[#35708F]">
                Municipio elegido
              </span>
              <b className="block truncate text-base text-[#123E5C]">{elegido.nombre}</b>
            </>
          ) : (
            <b className="block text-base text-[#123E5C]">Toque para elegir un municipio</b>
          )}
        </span>
        <ChevronDown aria-hidden className="size-5 shrink-0 text-[#0079C1]" />
      </button>

      <dialog
        ref={hoja}
        aria-label="Elegir un municipio"
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-[#F2FAFD] p-0 text-[#123E5C] backdrop:bg-transparent open:flex open:flex-col"
      >
        <div className="shrink-0 border-b border-[#123E5C]/10 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="vc-rotulo text-2xl text-[#0079C1]">Elija un municipio</h3>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-[#0079C1] active:bg-[#EAF7FC]"
            >
              <X aria-hidden className="size-6" />
            </button>
          </div>

          <label className="relative mt-2 block">
            <span className="sr-only">Buscar municipio</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#587890]"
            />
            {/* 16 px: por debajo, iOS hace zoom al enfocar el campo. */}
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar municipio…"
              enterKeyHint="search"
              autoComplete="off"
              className="min-h-12 w-full rounded-xl border-2 border-transparent bg-[#F2FAFD] py-3 pl-11 pr-4 text-base text-[#123E5C] outline-none placeholder:text-[#587890] focus:border-[#0079C1]"
            />
          </label>

          {/* Las zonas, en una sola fila que se desliza: no se come tres filas de pantalla. */}
          <div
            role="group"
            aria-label="Filtrar por zona"
            className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {[{ valor: null as Zona | null, color: "" }, ...zonas].map((z) => {
              const activo = zona === z.valor;
              return (
                <button
                  key={z.valor ?? "todas"}
                  type="button"
                  onClick={() => setZona(activo ? null : z.valor)}
                  aria-pressed={activo}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-base font-semibold ${
                    activo ? "bg-[#0079C1] text-white" : "bg-[#EAF7FC] text-[#35708F]"
                  }`}
                >
                  {z.valor && (
                    <i
                      aria-hidden
                      className="block size-2.5 rounded-full ring-2 ring-white/70"
                      style={{ background: z.color }}
                    />
                  )}
                  {z.valor ?? "Todas"}
                </button>
              );
            })}
          </div>
        </div>

        <p
          className="shrink-0 px-4 pb-1 pt-3 text-[15px] font-semibold text-[#35708F]"
          aria-live="polite"
        >
          {visibles.length === municipios.length
            ? `${municipios.length} municipios`
            : `${visibles.length} de ${municipios.length} municipios`}
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {visibles.length === 0 ? (
            <p className="mt-4 rounded-xl border-2 border-dashed border-[#0079C1]/40 p-8 text-center text-base text-[#35708F]">
              Ningún municipio coincide. Pruebe con otro nombre o quite el filtro de zona.
            </p>
          ) : (
            <ul className="divide-y divide-[#123E5C]/10 overflow-hidden rounded-xl bg-white ring-1 ring-[#123E5C]/10">
              {visibles.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onElegir(m.id);
                      cerrar();
                    }}
                    aria-label={`${m.nombre}, zona ${m.zona}`}
                    aria-current={elegido?.id === m.id}
                    className={`flex min-h-14 w-full items-center gap-3 px-4 text-left active:bg-[#EAF7FC] ${
                      elegido?.id === m.id ? "bg-[#EAF7FC]" : ""
                    }`}
                  >
                    <i
                      aria-hidden
                      className="block size-2.5 shrink-0 rounded-full"
                      style={{ background: colorDeZona[m.zona] }}
                    />
                    <span className="min-w-0 flex-1 text-base font-semibold leading-tight">
                      {m.nombre}
                    </span>
                    <span
                      className={`shrink-0 text-[15px] tabular-nums ${
                        m.atendido ? "font-bold text-[#0079C1]" : "text-[#587890]"
                      }`}
                    >
                      {m.atendido ? toneladas(m.toneladas) : "Sin entregas"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </div>
  );
}
