/**
 * BrechasSection.tsx — Nivel 7, "¿Qué más están pidiendo los municipios?"
 * -----------------------------------------------------------------------
 * La tabla de brecha se CALCULA cruzando pmuData con territoryData en
 * vez de transcribirse: así, si mañana se regenera cualquiera de las dos
 * fuentes, la tabla sigue diciendo la verdad y no hay que acordarse de
 * actualizar una lista paralela.
 * -----------------------------------------------------------------------
 */
import { useMemo } from "react";
import {
  estadosRequerimientos,
  PMU_FECHA_CORTE,
  PMU_TOTAL_REQUERIMIENTOS,
  pmuPorMunicipio,
  sectoresRequerimientos,
  UMBRAL_ALERTA_ABIERTOS,
} from "@/presentation/data/pmuData";
import { getTerritoryStatByCode } from "@/presentation/data/territoryData";
import { Aviso, Card, MiniList, SectionLabel, SectionTitle } from "./storyPrimitives";

const AYUDA_HUMANITARIA = sectoresRequerimientos.find(([s]) => s === "Ayuda humanitaria")?.[1] ?? 0;

export function BrechasSection() {
  const filas = useMemo(
    () =>
      pmuPorMunicipio
        .map((r) => ({ ...r, despachos: getTerritoryStatByCode(r.codigoDane)?.despachos ?? 0 }))
        .filter((r) => r.abiertos > 0 || (r.total > 0 && r.despachos === 0))
        .sort((a, b) => b.abiertos - a.abiertos || b.total - a.total)
        .slice(0, 14),
    [],
  );

  return (
    <div className="mx-auto max-w-6xl">
      <SectionLabel>Brechas</SectionLabel>
      <SectionTitle>
        {PMU_TOTAL_REQUERIMIENTOS} requerimientos radicados, y solo uno de cada cuatro es ayuda
        humanitaria
      </SectionTitle>
      <p className="mt-4 max-w-2xl text-[15.5px] leading-7 text-[#4E6B7C]">
        Esta es la otra cara de la respuesta: lo que los municipios le pidieron al Puesto de Mando
        Unificado. La mayoría no son entregas —son puentes, vías, viviendas, acueductos— y por eso no
        se resuelven con un despacho.
      </p>

      <div className="mt-8">
        <Aviso>
          <b>Qué significa acá «no atendido».</b> Es el estado que el propio PMU escribió en su
          matriz de seguimiento, con corte al <b>{PMU_FECHA_CORTE}</b>. Marca que en esa fecha el
          requerimiento todavía no tenía acción registrada, no que se haya negado ni abandonado. Como
          los despachos van cuatro jornadas por delante de ese archivo,{" "}
          <b>una parte de estos casos ya puede estar resuelta</b> y aún no reflejada. La lectura útil
          no es el porcentaje: es <b>dónde se concentran</b> las peticiones abiertas.
        </Aviso>
      </div>

      {/* Estados */}
      <div className="mt-8 flex h-11 overflow-hidden rounded-md">
        {estadosRequerimientos.map((e) => (
          <i
            key={e.estado}
            title={`${e.estado}: ${e.cantidad} requerimientos`}
            className="flex items-center justify-center text-xs font-bold text-[#06202F]"
            style={{ flex: e.cantidad, background: e.color }}
          >
            {e.cantidad >= 20 ? e.cantidad : ""}
          </i>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11.6px] text-[#4E6B7C]">
        {estadosRequerimientos.map((e) => (
          <li key={e.estado} className="flex items-center gap-1.5">
            <i className="block size-2.5 rounded-sm" style={{ background: e.color }} />
            {sentenceCase(e.estado)} ({e.cantidad})
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.85fr)] lg:items-start">
        <Card className="p-0">
          <p className="px-6 pt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]">
            Dónde está la brecha
          </p>
          <div className="mt-4 overflow-x-auto px-6 pb-6">
            <table className="w-full min-w-[520px] border-collapse text-[13.2px]">
              <thead>
                <tr>
                  {["Municipio", "Req.", "Atend.", "Parcial", "Abiertos", "Despachos"].map(
                    (h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className={`border-b-2 border-[#00578C]/15 px-2 py-2 text-[10.6px] font-bold uppercase tracking-[0.07em] text-[#6E8B9E] ${
                          i === 0 ? "text-left" : "text-right"
                        }`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filas.map((r) => {
                  const alerta = r.abiertos >= UMBRAL_ALERTA_ABIERTOS || r.despachos === 0;
                  return (
                    <tr key={r.codigoDane} className={alerta ? "bg-[#FDEBE7]" : undefined}>
                      <td className="border-b border-[#00578C]/10 px-2 py-2.5 font-semibold text-[#0B2233]">
                        {r.municipio}
                      </td>
                      <Num>{r.total}</Num>
                      <Num>{r.atendido}</Num>
                      <Num>{r.parcial}</Num>
                      <Num>{r.abiertos}</Num>
                      <td
                        className={`border-b border-[#00578C]/10 px-2 py-2.5 text-right tabular-nums ${
                          r.despachos === 0 ? "font-bold text-[#C43A20]" : "text-[#4E6B7C]"
                        }`}
                      >
                        {r.despachos}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-[12.2px] leading-5 text-[#6E8B9E]">
              Resaltadas, las filas que piden una mirada: {UMBRAL_ALERTA_ABIERTOS} o más
              requerimientos todavía abiertos al corte, o municipios sin un solo despacho.
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#006A87]">Por sector</p>
            <div className="mt-4">
              <MiniList
                rows={sectoresRequerimientos.map(([label, value]) => ({
                  label,
                  value,
                  color: "#8375A9",
                }))}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#6E8B9E]">
              La mayoría de lo pendiente no es ayuda humanitaria —solo {AYUDA_HUMANITARIA} de{" "}
              {PMU_TOTAL_REQUERIMIENTOS}—: es infraestructura y vivienda.
            </p>
          </Card>

          <Card className="border-l-[3px] border-l-[#F26049]">
            <b className="block font-serif text-[30px] leading-none text-[#00578C]">Candelaria</b>
            <p className="mt-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#6E8B9E]">
              El caso que hay que mirar
            </p>
            <p className="mt-3 text-[13.4px] leading-6 text-[#4E6B7C]">
              <b className="text-[#0B2233]">6 requerimientos radicados y cero despachos</b> en toda la
              emergencia. Es el único municipio del Valle en esa situación.
            </p>
            <p className="mt-3 text-[13px] leading-6 text-[#6E8B9E]">
              Florida tampoco registra despacho, pero tampoco ha radicado requerimientos ante el PMU.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Num({ children }: { children: number }) {
  return (
    <td className="border-b border-[#00578C]/10 px-2 py-2.5 text-right tabular-nums text-[#4E6B7C]">
      {children}
    </td>
  );
}

function sentenceCase(s: string): string {
  const lower = s.toLocaleLowerCase("es-CO");
  return lower.charAt(0).toLocaleUpperCase("es-CO") + lower.slice(1);
}