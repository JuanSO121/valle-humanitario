// src/presentation/components/MovimientoExtras.tsx
import { movimientoStats, municipiosNuevosPorDia } from "@/presentation/data/movimientoData";

/**
 * Las tarjetas ya no se declaran acá. Antes la cifra venía de
 * `movimientoStats` pero la glosa estaba escrita en el JSX, así que al
 * regenerar la serie desde el Excel las tarjetas seguían diciendo "el 12
 * de agosto, hacia 32 municipios" con la cifra del 17. Cifra y glosa
 * viajan juntas o se separan sin que nadie se entere.
 */
export function MovimientoStatCards() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {movimientoStats.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-[#00578C]/12 border-l-[3px] bg-white p-5"
          style={{ borderLeftColor: c.color }}
        >
          <div className="font-serif text-3xl leading-none text-[#0B2233]">{c.valor}</div>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.06em] text-[#4E6B7C]">
            {c.label}
          </p>
          <p className="mt-1.5 text-sm leading-6 text-[#5E7789]">{c.nota}</p>
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
          <p className="mt-1 font-serif text-2xl text-[#0B2233]">
            +{m.cantidad} {m.cantidad === 1 ? "municipio" : "municipios"}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#5E7789]">{m.nombres.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}