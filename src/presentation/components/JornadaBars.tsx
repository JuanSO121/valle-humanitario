// src/presentation/components/JornadaBars.tsx
import { jornadas, municipiosNuevosPorDia } from "@/presentation/data/movimientoData";

function nuevosPara(dia: string) {
  const match = municipiosNuevosPorDia.find((m) => m.dia.startsWith(dia + " "));
  return match?.cantidad ?? null;
}

export function JornadaBars() {
  const maxDespachos = Math.max(...jornadas.map((j) => j.despachos));

  return (
    <div className="mt-6 rounded-lg border border-[#00578C]/12 bg-white p-6">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-[#006A87]">
        Despachos por jornada · en verde, municipios nuevos
      </p>
      <div className="flex h-56 items-end gap-2">
        {jornadas.map((j) => {
          const nuevos = nuevosPara(j.dia);
          return (
            <div key={j.dia} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-xs font-semibold text-[#315A70]">{j.despachos}</span>
              <div
                className="w-full rounded-t bg-[#00578C]"
                style={{ height: `${Math.max(6, (j.despachos / maxDespachos) * 170)}px` }}
                title={`${j.dia} de agosto · ${j.despachos} despachos · ${j.municipiosDelDia} municipios · ${j.toneladas} t`}
              />
              <span className="text-xs text-[#6E8B9E]">{j.dia}</span>
              <span className="h-4 text-[10.5px] font-bold text-[#039A39]">
                {nuevos ? `+${nuevos}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}