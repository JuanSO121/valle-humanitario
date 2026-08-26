// src/presentation/components/MovimientoExtras.tsx
import { movimientoStats, municipiosNuevosPorDia } from "@/presentation/data/movimientoData";

const statCards = [
  { big: movimientoStats.pico, label: "Pico de la operación", note: "El 12 de agosto, hacia 32 municipios.", color: "#F0801E" },
  { big: `${movimientoStats.promedioPorJornada}`, label: "Despachos por jornada", note: "Promedio de las 14 jornadas.", color: "#5CC46B" },
  { big: `${movimientoStats.porcentajePrimeras48h}%`, label: "Salió en las primeras 48 h", note: "61 despachos entre el 11 y el 12.", color: "#F0B102" },
  { big: movimientoStats.despachosDesdeCartago, label: "Despachos desde Cartago", note: "Segundo origen: 13 municipios del norte.", color: "#B57BB5" },
] as const;

export function MovimientoStatCards() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-[#00578C]/12 bg-white p-5"
          style={{ borderLeft: `3px solid ${c.color}` }}
        >
          <div className="font-serif text-3xl text-[#0B2233]">
            {typeof c.big === "object" ? c.big.valor : c.big}
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.06em] text-[#4E6B7C]">
            {c.label}
          </p>
          <p className="mt-1.5 text-sm text-[#5E7789]">
            {typeof c.big === "object" ? c.big.nota : c.note}
          </p>
        </div>
      ))}
    </div>
  );
}

export function MunicipiosNuevosCallouts() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {municipiosNuevosPorDia.map((m) => (
        <div key={m.dia} className="rounded-lg border-l-4 border-[#5CC46B] bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4E6B7C]">{m.dia}</p>
          <p className="mt-1 font-serif text-2xl text-[#0B2233]">+{m.cantidad} municipios</p>
          <p className="mt-2 text-sm leading-6 text-[#5E7789]">{m.nombres.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}