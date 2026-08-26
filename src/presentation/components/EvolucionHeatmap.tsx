/**
 * EvolucionHeatmap.tsx — Nivel 5, "¿Cómo ha cambiado?"
 * -----------------------------------------------------------------------
 * Una casilla por municipio y jornada. Se deriva de
 * `territoryMunicipalities[].dias`, así que no hay data nueva ni riesgo
 * de que se desincronice del mapa: es literalmente la misma fuente que
 * colorea los polígonos.
 *
 * La intensidad va por opacidad sobre un azul único, no por rampa
 * discreta: acá interesa comparar dentro de la fila (¿qué día volvió a
 * recibir?), no clasificar en cortes.
 * -----------------------------------------------------------------------
 */
import { useMemo } from "react";
import {
  TERRITORY_DAYS,
  territoryMunicipalities,
  type TerritoryMunicipalityStat,
  type TerritoryZone,
} from "@/presentation/data/territoryData";
import { SectionLabel } from "./storyPrimitives";

const ORDEN_ZONAS: TerritoryZone[] = ["Norte", "Centro", "Sur", "Pacífico"];

/** Máximo de despachos en una sola casilla — fija el tope de opacidad. */
const MAX_DIA = Math.max(
  1,
  ...territoryMunicipalities.flatMap((m) => Object.values(m.dias)),
);

function celdaColor(value: number): string {
  if (value <= 0) return "rgba(255,255,255,0.055)";
  // Piso de 0.42 para que un solo despacho ya se lea contra el fondo.
  const alpha = 0.42 + (value / MAX_DIA) * 0.58;
  return `rgba(129,200,236,${alpha.toFixed(2)})`;
}

export function EvolucionHeatmap({
  onSelect,
}: {
  // `| undefined` explícito por exactOptionalPropertyTypes (ver storyPrimitives).
  onSelect?: ((municipio: TerritoryMunicipalityStat) => void) | undefined;
}) {
  const porZona = useMemo(
    () =>
      ORDEN_ZONAS.map((zone) => ({
        zone,
        filas: territoryMunicipalities
          .filter((m) => m.zone === zone)
          .sort((a, b) => b.despachos - a.despachos || a.name.localeCompare(b.name, "es")),
      })).filter((g) => g.filas.length > 0),
    [],
  );

  return (
    <section>
      <SectionLabel>Quién recibió, qué día</SectionLabel>
      <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#4E6B7C]">
        Cada casilla es una jornada de un municipio. Cuanto más intenso el azul, más despachos ese
        día. Las filas vacías del sur son las dos ausencias del departamento.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-white/12 bg-[#0B2233] p-5">
        <div className="min-w-[680px]">
          <Fila
            etiqueta=""
            celdas={TERRITORY_DAYS.map((d) => (
              <span key={d} className="text-center text-[10.6px] text-[#7E9AAD]">
                {d}
              </span>
            ))}
            total={<span className="text-[10.6px] text-[#7E9AAD]">total</span>}
          />

          {porZona.map(({ zone, filas }) => (
            <div key={zone}>
              <p className="mt-3.5 mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#81C8EC]">
                {zone}
              </p>
              {filas.map((m) => (
                <button
                  key={m.codigoDane}
                  type="button"
                  onClick={() => onSelect?.(m)}
                  className="block w-full rounded transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#81C8EC]"
                >
                  <Fila
                    etiqueta={m.name}
                    celdas={TERRITORY_DAYS.map((d) => {
                      const v = m.dias[d] ?? 0;
                      return (
                        <span
                          key={d}
                          title={`${m.name} · ${d} de agosto · ${v === 0 ? "sin despacho" : v === 1 ? "1 despacho" : `${v} despachos`}`}
                          className="flex h-[21px] items-center justify-center rounded-sm text-[9.6px] font-bold text-[#06202F]"
                          style={{ background: celdaColor(v) }}
                        >
                          {v > 1 ? v : ""}
                        </span>
                      );
                    })}
                    total={
                      <span className="text-right font-serif text-[13px] text-white">
                        {m.despachos}
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
  etiqueta,
  celdas,
  total,
}: {
  etiqueta: string;
  celdas: React.ReactNode[];
  total: React.ReactNode;
}) {
  return (
    <div
      className="grid items-center gap-[2px] py-[1px]"
      style={{ gridTemplateColumns: `112px repeat(${TERRITORY_DAYS.length}, 1fr) 42px` }}
    >
      <span className="truncate pr-1.5 text-left text-[11.6px] text-[#A9C2D2]">{etiqueta}</span>
      {celdas}
      {total}
    </div>
  );
}