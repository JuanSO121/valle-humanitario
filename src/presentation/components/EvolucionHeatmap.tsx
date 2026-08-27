/**
 * EvolucionHeatmap.tsx
 * -----------------------------------------------------------------------
 * Una casilla por municipio y día. Todo sale de la API vía
 * OperacionContext: los días, las entregas y las zonas se recalculan
 * solos cuando cambia el Excel. Antes esta rejilla leía un catálogo
 * estático y quedaba vieja apenas se agregaba una entrega.
 */
import { useMemo } from "react";
import { useOperacion } from "@/presentation/state/OperacionContext";
import type { MunicipioOperacion } from "@/application/derivations/operacion";
import { SectionLabel } from "./storyPrimitives";

const ORDEN_ZONAS = ["Norte", "Centro", "Sur", "Pacífico"];

export function EvolucionHeatmap({
  onSelect,
}: {
  onSelect?: ((municipio: MunicipioOperacion) => void) | undefined;
}) {
  const { jornadas, municipios } = useOperacion();

  const dias = useMemo(() => jornadas.map((j) => j.dia), [jornadas]);

  /** Tope de la escala: la casilla más alta de toda la rejilla. */
  const maxDia = useMemo(
    () => Math.max(1, ...municipios.flatMap((m) => Object.values(m.dias))),
    [municipios],
  );

  const porZona = useMemo(() => {
    const zonas = [...ORDEN_ZONAS, "Sin zona"];
    return zonas
      .map((zona) => ({
        zona,
        filas: municipios.filter((m) => (m.zona ?? "Sin zona") === zona),
      }))
      .filter((g) => g.filas.length > 0);
  }, [municipios]);

  if (dias.length === 0) return null;

  const celdaColor = (value: number) => {
    if (value <= 0) return "rgba(255,255,255,0.055)";
    // Piso de 0.42 para que una sola entrega ya se lea contra el fondo.
    const alpha = 0.42 + (value / maxDia) * 0.58;
    return `rgba(129,200,236,${alpha.toFixed(2)})`;
  };

  return (
    <section>
      <SectionLabel>Qué municipio recibió cada día</SectionLabel>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-[#4E6B7C]">
        Cada casilla es un día. Más azul, más entregas ese día.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-white/12 bg-[#0B2233] p-4 sm:p-5">
        <div className="min-w-[660px] [--col-nombre:96px] sm:[--col-nombre:112px]">
          <Fila
            dias={dias}
            etiqueta=""
            celdas={dias.map((d) => (
              <span key={d} className="text-center text-sm text-[#7E9AAD]">
                {d}
              </span>
            ))}
            total={<span className="text-sm text-[#7E9AAD]">total</span>}
          />

          {porZona.map(({ zona, filas }) => (
            <div key={zona}>
              <p className="mt-3.5 mb-1.5 text-sm font-bold uppercase tracking-[0.1em] text-[#81C8EC]">
                {zona}
              </p>
              {filas.map((m) => (
                <button
                  key={m.destinoId}
                  type="button"
                  onClick={() => onSelect?.(m)}
                  className="block w-full rounded transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#81C8EC]"
                >
                  <Fila
                    dias={dias}
                    etiqueta={m.nombre}
                    celdas={dias.map((d) => {
                      const v = m.dias[d] ?? 0;
                      return (
                        <span
                          key={d}
                          title={`${m.nombre}, día ${d}: ${
                            v === 0 ? "sin entregas" : v === 1 ? "1 entrega" : `${v} entregas`
                          }`}
                          className="flex h-[22px] items-center justify-center rounded-sm text-[11px] font-bold text-[#06202F]"
                          style={{ background: celdaColor(v) }}
                        >
                          {v > 0 ? v : ""}
                        </span>
                      );
                    })}
                    total={
                      <span className="text-right font-serif text-base text-white">
                        {m.entregas}
                      </span>
                    }
                  />
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Fila({
  dias,
  etiqueta,
  celdas,
  total,
}: {
  dias: string[];
  etiqueta: string;
  celdas: React.ReactNode[];
  total: React.ReactNode;
}) {
  return (
    <div
      className="grid items-center gap-[2px] py-[1px]"
      style={{ gridTemplateColumns: `var(--col-nombre) repeat(${dias.length}, 1fr) 42px` }}
    >
      <span className="truncate pr-1.5 text-left text-[15px] text-[#A9C2D2]">{etiqueta}</span>
      {celdas}
      {total}
    </div>
  );
}