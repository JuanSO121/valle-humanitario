/**
 * TerritorySections.tsx
 * -----------------------------------------------------------------------
 * Podio, cobertura por zona y galería de municipios. Todo se deriva de la
 * API vía OperacionContext, así que las cifras se actualizan solas.
 *
 * SOBRE LA PRESENTACIÓN
 *
 * Antes eran tres listas del mismo peso visual, una debajo de otra. El
 * resultado era informativo y plano: nada indicaba dónde mirar primero.
 *
 * Ahora hay jerarquía. El municipio que más recibió ocupa una ficha
 * grande y oscura; los otros cinco van en fichas menores; las zonas son
 * un bloque de progreso; y los 41 municipios cierran como galería
 * filtrable. Cada nivel se lee más rápido que el anterior.
 *
 * Las animaciones son de entrada, cortas y escalonadas. Se apagan solas
 * con `prefers-reduced-motion`, que vive en marca.css.
 * -----------------------------------------------------------------------
 */
import { useMemo, useState, type CSSProperties } from "react";
import { useOperacion } from "@/presentation/state/OperacionContext";
import type { MunicipioOperacion } from "@/application/derivations/operacion";
import { SectionLabel } from "./storyPrimitives";

const TODAS = "todas";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function plural(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString("es-CO")} ${n === 1 ? uno : varios}`;
}

interface SelectableProps {
  onSelect?: ((municipio: MunicipioOperacion) => void) | undefined;
}

/* ── Podio ──────────────────────────────────────────────────────────── */

export function PodioMunicipios({ onSelect }: SelectableProps) {
  const { municipios } = useOperacion();

  const top = municipios.slice(0, 6);
  const primero = top[0];
  const resto = top.slice(1);
  const max = Math.max(1, ...municipios.map((m) => m.entregas));

  if (!primero) return null;

  return (
    <section>
      <SectionLabel>Municipios que más ayuda recibieron</SectionLabel>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        {/* El primer puesto ocupa su propia ficha, en navy y a otra
            escala. Un ranking donde todos los puestos se ven igual no es
            un ranking, es una lista. */}
        <button
          type="button"
          onClick={() => onSelect?.(primero)}
          style={{ "--i": 0 } as CSSProperties}
          className="vc-aparece group relative overflow-hidden rounded-lg bg-[#123E5C] p-7 text-left transition duration-200 hover:-translate-y-1 hover:shadow-xl sm:p-9 motion-reduce:hover:translate-y-0"
        >
          <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#FFD400]">
            El que más recibió
          </span>

          <h3 className="vc-titular mt-3 text-[clamp(2rem,6vw,3.5rem)] text-white">
            {primero.nombre}
          </h3>

          <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <b className="block text-[clamp(2rem,5vw,3rem)] font-extrabold leading-none text-[#FBF8C6]">
                {primero.entregas}
              </b>
              <span className="mt-1 block text-base text-[#A8CFE2]">entregas</span>
            </div>
            <div>
              <b className="block text-[clamp(2rem,5vw,3rem)] font-extrabold leading-none text-[#FBF8C6]">
                {primero.toneladas}
              </b>
              <span className="mt-1 block text-base text-[#A8CFE2]">toneladas</span>
            </div>
          </div>

          <span className="mt-6 block h-2 overflow-hidden rounded-full bg-white/20">
            <i className="vc-crece block h-full rounded-full bg-[#FFD400]" style={{ width: "100%" }} />
          </span>
        </button>

        <ol className="grid gap-3 sm:grid-cols-2">
          {resto.map((m, i) => (
            <li key={m.destinoId}>
              <button
                type="button"
                onClick={() => onSelect?.(m)}
                style={{ "--i": i + 1 } as CSSProperties}
                className="vc-aparece flex h-full w-full items-start gap-4 rounded-lg bg-white p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0"
              >
                <span className="mt-0.5 text-3xl font-extrabold leading-none text-[#22ABE2]">
                  {i + 2}
                </span>

                <span className="min-w-0 flex-1">
                  <b className="block truncate text-lg text-[#123E5C]">{m.nombre}</b>
                  <span className="mt-0.5 mb-3 block text-[15px] text-[#6B93AA]">
                    {plural(m.entregas, "entrega", "entregas")} · {m.toneladas} toneladas
                  </span>
                  <span className="block h-[6px] overflow-hidden rounded-full bg-[#DDF0FA]">
                    <i
                      className="vc-crece block h-full rounded-full bg-[#0079C1]"
                      style={
                        { width: `${(m.entregas / max) * 100}%`, "--i": i + 1 } as CSSProperties
                      }
                    />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Cobertura por zona ─────────────────────────────────────────────── */

export function CoberturaPorZona() {
  const { zonas } = useOperacion();

  if (zonas.length === 0) return null;

  return (
    <section>
      <SectionLabel>Ayudas por zona</SectionLabel>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {zonas.map((z, i) => {
          const ratio = z.total > 0 ? z.atendidos / z.total : 0;
          const completa = z.atendidos === z.total;

          return (
            <div
              key={z.zona}
              style={{ "--i": i } as CSSProperties}
              className="vc-aparece rounded-lg bg-[#0079C1] p-6"
            >
              <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#FFD400]">
                {z.zona}
              </span>

              <p className="mt-2 text-[clamp(2.25rem,5vw,3rem)] font-extrabold leading-none text-white">
                {z.atendidos}
                <span className="text-xl font-semibold text-[#A8CFE2]"> de {z.total}</span>
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/25">
                <i
                  className="vc-crece block h-full rounded-full"
                  style={
                    {
                      width: `${ratio * 100}%`,
                      background: completa ? "#7BE08F" : "#FFD400",
                      "--i": i,
                    } as CSSProperties
                  }
                />
              </div>

              <p className="mt-3 text-base text-[#FBF8C6]">
                {completa ? "Todos recibieron ayudas" : `${z.total - z.atendidos} sin entregas`}
              </p>
              <p className="mt-0.5 text-base text-[#A8CFE2]">
                {plural(z.entregas, "entrega", "entregas")} en total
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Galería de municipios ──────────────────────────────────────────── */

export function MunicipiosGrid({ onSelect }: SelectableProps) {
  const { municipios, catalogo, zonas } = useOperacion();
  const [zona, setZona] = useState<string>(TODAS);
  const [texto, setTexto] = useState("");

  const max = Math.max(1, ...municipios.map((m) => m.entregas));

  /**
   * Se parte del catálogo para que aparezcan también los municipios que
   * todavía no registran entregas. La API solo devuelve los que sí.
   */
  const todos = useMemo(() => {
    const porNombre = new Map(municipios.map((m) => [norm(m.nombre), m]));
    return catalogo.map((cat) => {
      const vivo = porNombre.get(norm(cat.nombre));
      return (
        vivo ?? {
          destinoId: cat.codigoDane,
          nombre: cat.nombre,
          codigoDane: cat.codigoDane,
          zona: cat.zona,
          entregas: 0,
          toneladas: 0,
          dias: {},
          primeraFecha: null,
          ultimaFecha: null,
        }
      );
    });
  }, [municipios, catalogo]);

  const visibles = useMemo(() => {
    const q = norm(texto);
    return todos
      .filter((m) => (zona === TODAS || m.zona === zona) && (!q || norm(m.nombre).includes(q)))
      .sort((a, b) => b.entregas - a.entregas || a.nombre.localeCompare(b.nombre, "es"));
  }, [todos, zona, texto]);

  const filtros = [
    { valor: TODAS, etiqueta: "Todas las zonas", cantidad: todos.length },
    ...zonas.map((z) => ({ valor: z.zona, etiqueta: z.zona, cantidad: z.total })),
  ];

  return (
    <section>
      <SectionLabel>Los {todos.length} municipios</SectionLabel>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {filtros.map((f) => {
          const activo = zona === f.valor;
          return (
            <button
              key={f.valor}
              type="button"
              onClick={() => setZona(f.valor)}
              aria-pressed={activo}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold transition duration-200 ${
                activo
                  ? "bg-[#0079C1] text-white shadow-md"
                  : "bg-white text-[#35708F] hover:bg-[#EAF7FC] hover:text-[#0079C1]"
              }`}
            >
              {f.etiqueta}
              <span
                className={`rounded-full px-2 py-0.5 text-sm font-bold ${
                  activo ? "bg-white/25 text-white" : "bg-[#DDF0FA] text-[#0079C1]"
                }`}
              >
                {f.cantidad}
              </span>
            </button>
          );
        })}
      </div>

      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar municipio…"
        aria-label="Buscar municipio"
        className="mt-3 w-full rounded-lg border-2 border-transparent bg-white px-4 py-3 text-base text-[#123E5C] outline-none transition placeholder:text-[#8FAABC] focus:border-[#22ABE2]"
      />

      <p className="mt-3 text-base text-[#6B93AA]" aria-live="polite">
        {visibles.length === todos.length
          ? plural(visibles.length, "municipio", "municipios")
          : `${visibles.length} de ${todos.length} municipios`}
      </p>

      {visibles.length === 0 ? (
        <p className="mt-6 rounded-lg border-2 border-dashed border-[#22ABE2]/40 p-10 text-center text-base text-[#6B93AA]">
          Ningún municipio coincide. Prueba con otro nombre o quita el filtro de zona.
        </p>
      ) : (
        /* El `key` remonta la galería al cambiar de filtro, y con eso la
           entrada escalonada se vuelve a disparar. Sin él, las fichas se
           reemplazarían de golpe y el cambio pasaría desapercibido. */
        <div
          key={`${zona}-${texto}`}
          className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))]"
        >
          {visibles.map((m, i) => {
            const sinEntregas = m.entregas === 0;
            return (
              <button
                key={m.destinoId}
                type="button"
                onClick={() => onSelect?.(m)}
                // El escalón se corta a los 24 elementos: con 41 fichas,
                // seguir sumando retraso haría esperar casi dos segundos
                // a las últimas.
                style={{ "--i": Math.min(i, 24) } as CSSProperties}
                className={`vc-aparece group relative overflow-hidden rounded-lg p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0 ${
                  sinEntregas ? "bg-[#EAF7FC]" : "bg-white"
                }`}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1 transition-all duration-200 group-hover:h-1.5"
                  style={{ background: sinEntregas ? "#A8CFE2" : "#0079C1" }}
                />

                <div className="flex items-baseline justify-between gap-2">
                  <b className="min-w-0 truncate text-lg text-[#123E5C]">{m.nombre}</b>
                  <span
                    className={`text-3xl font-extrabold leading-none ${
                      sinEntregas ? "text-[#A8CFE2]" : "text-[#0079C1]"
                    }`}
                  >
                    {m.entregas}
                  </span>
                </div>

                <div className="my-3 h-[6px] overflow-hidden rounded-full bg-[#DDF0FA]">
                  <i
                    className="vc-crece block h-full rounded-full bg-[#22ABE2]"
                    style={
                      {
                        width: `${(m.entregas / max) * 100}%`,
                        "--i": Math.min(i, 24),
                      } as CSSProperties
                    }
                  />
                </div>

                <div className="flex justify-between text-[15px] text-[#6B93AA]">
                  <span>{m.zona ?? "Sin zona"}</span>
                  <span>{sinEntregas ? "Sin entregas" : `${m.toneladas} t`}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}