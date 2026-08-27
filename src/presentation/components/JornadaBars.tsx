/**
 * JornadaBars.tsx
 * -----------------------------------------------------------------------
 * Entregas por día, con los municipios nuevos en verde. Las barras y las
 * etiquetas salen de la API, así que el gráfico crece solo cuando se
 * agregan días al Excel.
 */
import { useOperacion } from "@/presentation/state/OperacionContext";

export function JornadaBars() {
  const { jornadas } = useOperacion();
  if (jornadas.length === 0) return null;

  const max = Math.max(1, ...jornadas.map((j) => j.entregas));

  return (
    <div className="mt-6 rounded-md bg-[#0079C1] p-5 sm:p-6">
      <p className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-[#FBF8C6]">
        Entregas por día. En verde, los municipios que reciben por primera vez
      </p>
      <div className="flex h-56 items-end gap-1.5 sm:gap-2">
        {jornadas.map((j) => (
          <div key={j.fecha} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-sm font-semibold text-white">{j.entregas}</span>
            <div
              className="w-full rounded-t bg-[#FBF8C6]"
              style={{ height: `${Math.max(6, (j.entregas / max) * 170)}px` }}
              title={`${Number(j.dia)} de agosto: ${j.entregas} entregas hacia ${j.municipios} municipios`}
            />
            <span className="text-sm text-white/75">{j.dia}</span>
            <span className="h-4 text-xs font-bold text-[#FFD400]">
              {j.nuevos > 0 ? `+${j.nuevos}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}