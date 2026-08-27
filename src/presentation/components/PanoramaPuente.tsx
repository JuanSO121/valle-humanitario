/**
 * PanoramaPuente.tsx
 * -----------------------------------------------------------------------
 * El paso a paso que va del censo de documentos al total de entregas.
 *
 * Sin párrafo introductorio propio: la sección de Soportes documentales
 * ya lo trae, y tener los dos seguidos repetía la misma idea dos veces
 * con palabras distintas.
 *
 * Estas cifras salen del censo del Drive, que no está expuesto por
 * ninguna ruta de la API. Es lo único del tablero que sigue siendo
 * manual. Ver panoramaData.ts.
 */
import { useOperacion } from "@/presentation/state/OperacionContext";
import { puenteSteps, type PuenteRow } from "@/presentation/data/panoramaData";

export function PanoramaPuente() {
  const { totalEntregas } = useOperacion();
  const totalPuente = puenteSteps.find((f) => f.kind === "total")?.delta ?? 0;

  return (
    <>
      <div className="rounded-xl border border-[#0079C1]/12 bg-white px-5 py-3 sm:px-7 sm:py-4">
        {puenteSteps.map((fila) => (
          <Fila key={fila.id} fila={fila} />
        ))}
      </div>

      {/* Sin esta nota, alguien compara los dos totales de la misma
          página y concluye que uno está mal. */}
      {totalEntregas > 0 && totalEntregas !== totalPuente && (
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#6B93AA]">
          Este conteo llega a {totalPuente.toLocaleString("es-CO")} y el resto del tablero muestra{" "}
          {totalEntregas.toLocaleString("es-CO")}. No es una diferencia de datos, son dos formas de
          contar. Aquí se cuentan documentos del archivo. En el resto del tablero se cuenta una
          entrega por cada municipio que recibió, así que un formato que reparte a varios municipios
          suma varias veces.
        </p>
      )}
    </>
  );
}

function Fila({ fila }: { fila: PuenteRow }) {
  const esTotal = fila.kind === "total";
  const esSubtotal = fila.kind === "subtotal";
  const signo = fila.kind === "resta" ? "-" : fila.kind === "suma" ? "+" : "";
  const valor = Math.abs(fila.delta).toLocaleString("es-CO");

  return (
    <div
      className={[
        "grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 border-b border-[#0079C1]/10 py-3",
        esTotal ? "border-b-0 border-t-2 border-t-[#0079C1] pt-4" : "",
        esSubtotal ? "-mx-3 rounded bg-[#F2FAFD] px-3" : "",
      ].join(" ")}
    >
      <span
        className={
          esTotal
            ? "text-sm font-bold uppercase tracking-[0.12em] text-[#0079C1]"
            : esSubtotal
              ? "text-base font-semibold text-[#123E5C]"
              : "text-base text-[#35708F]"
        }
      >
        {fila.label}
      </span>

      <span
        className={[
          "font-bold tabular-nums",
          esTotal ? "text-3xl text-[#0079C1]" : "text-xl",
          fila.kind === "resta" ? "text-[#D4462A]" : "",
          fila.kind === "suma" ? "text-[#2E9E4F]" : "",
          esSubtotal || esTotal ? "text-[#123E5C]" : "",
        ].join(" ")}
      >
        {signo}
        {valor}
      </span>

      {fila.detail && (
        <ul className="col-span-2 mt-1 flex flex-wrap gap-x-3 gap-y-1.5">
          {fila.detail.map((d) => (
            <li
              key={d.label}
              className="rounded-full bg-[#F2FAFD] px-3 py-1 text-sm text-[#35708F]"
              title={d.note}
            >
              <b className="text-[#123E5C]">{d.value}</b> {d.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}