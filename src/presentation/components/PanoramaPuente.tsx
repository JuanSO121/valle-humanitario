// src/presentation/components/PanoramaPuente.tsx
import { puenteSteps, type PuenteRow } from "@/presentation/data/panoramaData";

function signedLabel(row: PuenteRow) {
  if (row.kind === "resta") return row.delta.toString(); // ya viene negativo
  if (row.kind === "suma") return `+${row.delta}`;
  return row.delta.toLocaleString("es-CO");
}

function rowStyles(kind: PuenteRow["kind"]) {
  switch (kind) {
    case "resta":
      return "text-[#DC3514]";
    case "suma":
      return "text-[#039A39]";
    case "subtotal":
      return "bg-[#00578C]/5 rounded font-semibold";
    case "total":
      return "border-t-2 border-[#00578C] pt-3 mt-1 font-bold text-2xl text-[#00578C]";
    default:
      return "";
  }
}

export function PanoramaPuente() {
  return (
    <div className="mt-10 rounded-lg border border-[#00578C]/12 bg-white p-6">
      <p className="mb-4 max-w-3xl text-sm leading-6 text-[#4E6B7C]">
        Cada despacho de este tablero tiene un documento detrás. No es una relación de uno a uno
        —un formato conjunto es varias entregas y un reescaneo no es ninguna— así que la cuenta va
        paso a paso.{" "}
        <b className="text-[#0B2233]">Si esta suma no cuadra, el tablero no se genera.</b>
      </p>

      <div className="divide-y divide-[#00578C]/10">
        {puenteSteps.map((row) => (
          <div key={row.id} className={`px-2 py-2.5 ${rowStyles(row.kind)}`}>
            <div className="flex items-baseline justify-between gap-4">
              <span
                className={
                  row.kind === "total"
                    ? "text-xs font-bold uppercase tracking-[0.12em] text-[#00578C]"
                    : "text-sm text-[#315A70]"
                }
              >
                {row.label}
              </span>
              <span className="shrink-0 font-serif tabular-nums">{signedLabel(row)}</span>
            </div>

            {row.detail && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {row.detail.map((d) => (
                  <span
                    key={d.label}
                    className="rounded-full bg-[#00578C]/5 px-2.5 py-1 text-[11px] text-[#5E7789]"
                    title={d.note}
                  >
                    <b className="text-[#315A70]">{d.value}</b> {d.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}