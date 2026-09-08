/**
 * BrechasSection.tsx — "¿Qué más están pidiendo los municipios?"
 * -----------------------------------------------------------------------
 * La tabla de brecha se CALCULA cruzando pmuData con las entregas vivas
 * en vez de transcribirse: así, si mañana cambia cualquiera de las dos
 * fuentes, la tabla sigue diciendo la verdad y no hay que acordarse de
 * actualizar una lista paralela.
 *
 * CAMBIO: los despachos ya no salen del catálogo estático.
 *
 * La columna leía `getTerritoryStatByCode(codigoDane)?.despachos`, un
 * campo que vivía en territoryData.ts con corte del 24 de agosto. Dos
 * problemas, y el segundo es el grave:
 *
 * 1. Las cifras estaban congeladas. Candelaria y Florida figuraban con
 *    cero despachos porque en esa fecha no habían recibido nada; hoy
 *    Candelaria tiene 1 y Florida 2.
 *
 * 2. Ese campo ya no existe. Al sacarlo del catálogo, la expresión
 *    devolvía `undefined` y el `?? 0` la convertía en cero SIN error: los
 *    41 municipios aparecían con cero despachos y la tabla los marcaba a
 *    todos en rojo como "sin un solo despacho". Un fallo silencioso que
 *    se lee como un dato alarmante.
 *
 * Ahora la columna sale de `useOperacion()`, que es la misma fuente que
 * alimenta el mapa y el podio. La tarjeta de Candelaria pasa a
 * calcularse en vez de estar escrita, por lo mismo.
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
import { useOperacion } from "@/presentation/state/OperacionContext";
import { Aviso, Card, MiniList, SectionLabel, SectionTitle } from "./storyPrimitives";

const AYUDA_HUMANITARIA = sectoresRequerimientos.find(([s]) => s === "Ayuda humanitaria")?.[1] ?? 0;

export function BrechasSection() {
  const { municipios } = useOperacion();

  /** Entregas por código DANE. Es el cruce con la matriz del PMU. */
  const entregasPorDane = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const m of municipios) {
      if (m.codigoDane) mapa.set(String(m.codigoDane), m.entregas);
    }
    return mapa;
  }, [municipios]);

  const filas = useMemo(
    () =>
      pmuPorMunicipio
        .map((r) => ({ ...r, despachos: entregasPorDane.get(String(r.codigoDane)) ?? 0 }))
        .filter((r) => r.abiertos > 0 || (r.total > 0 && r.despachos === 0))
        .sort((a, b) => b.abiertos - a.abiertos || b.total - a.total)
        .slice(0, 14),
    [entregasPorDane],
  );

  /**
   * Municipios que radicaron requerimientos y todavía no reciben nada.
   *
   * Antes la tarjeta de abajo decía "Candelaria: 6 requerimientos y cero
   * despachos, el único municipio del Valle en esa situación", escrito a
   * mano. Candelaria ya recibió, así que la tarjeta pasó a ser falsa sin
   * que nadie lo notara. Calculado, el bloque se apaga solo cuando deja
   * de haber casos.
   */
  const sinDespacho = useMemo(
    () =>
      pmuPorMunicipio
        .filter((r) => r.total > 0 && (entregasPorDane.get(String(r.codigoDane)) ?? 0) === 0)
        .sort((a, b) => b.total - a.total),
    [entregasPorDane],
  );

  const caso = sinDespacho[0];

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
          los despachos van varias jornadas por delante de ese archivo,{" "}
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
                  {["Municipio", "Req.", "Atend.", "Parcial", "Abiertos", "Entregas"].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={`border-b-2 border-[#00578C]/15 px-2 py-2 text-[10.6px] font-bold uppercase tracking-[0.07em] text-[#6E8B9E] ${
                        i === 0 ? "text-left" : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
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
              requerimientos todavía abiertos al corte, o municipios sin una sola entrega.
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

          {/* Se apaga solo cuando ya no queda ningún municipio con
              requerimientos y sin entregas, que es hacia donde debería ir
              la operación. Escrito a mano, este bloque seguiría señalando
              a Candelaria mucho después de que dejara de aplicar. */}
          {caso && (
            <Card className="border-l-[3px] border-l-[#F26049]">
              <b className="block font-serif text-[30px] leading-none text-[#00578C]">
                {caso.municipio}
              </b>
              <p className="mt-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#6E8B9E]">
                El caso que hay que mirar
              </p>
              <p className="mt-3 text-[13.4px] leading-6 text-[#4E6B7C]">
                <b className="text-[#0B2233]">
                  {caso.total} {caso.total === 1 ? "requerimiento radicado" : "requerimientos radicados"}{" "}
                  y ninguna entrega
                </b>{" "}
                en toda la emergencia.
                {sinDespacho.length === 1
                  ? " Es el único municipio del Valle en esa situación."
                  : ` Son ${sinDespacho.length} municipios en esa situación.`}
              </p>
            </Card>
          )}
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