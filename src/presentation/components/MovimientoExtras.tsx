/**
 * MovimientoExtras.tsx
 * -----------------------------------------------------------------------
 * Tarjetas de jornada y municipios nuevos. Todo se calcula desde la API,
 * incluida la glosa de cada tarjeta. Antes la cifra venía de un archivo
 * y el texto estaba escrito en el JSX, así que al cambiar los datos las
 * tarjetas seguían nombrando el día equivocado.
 */
import { useOperacion } from "@/presentation/state/OperacionContext";

const ORIGEN_CARTAGO = "ORI-CARTAGO";

export function MovimientoStatCards() {
  const op = useOperacion();

  const primeras48 = op.jornadas.slice(0, 2).reduce((sum, j) => sum + j.entregas, 0);
  const porcentaje48 =
    op.totalEntregas > 0 ? Math.round((primeras48 / op.totalEntregas) * 100) : 0;

  const promedio =
    op.diasConEntrega > 0 ? (op.totalEntregas / op.diasConEntrega).toFixed(1) : "0";

  const cartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO);

  const tarjetas = [
    op.picoEntregas && {
      valor: String(op.picoEntregas.entregas),
      label: "Día con más entregas",
      nota: `El ${Number(op.picoEntregas.dia)} de agosto, hacia ${op.picoEntregas.municipios} municipios.`,
      color: "#F0801E",
    },
    op.picoCobertura && {
      valor: String(op.picoCobertura.municipios),
      label: "Día con más municipios",
      nota: `El ${Number(op.picoCobertura.dia)} de agosto.`,
      color: "#5CC46B",
    },
    {
      valor: `${porcentaje48}%`,
      label: "Salió en las primeras 48 horas",
      nota: `${primeras48} entregas en los dos primeros días.`,
      color: "#F0B102",
    },
    cartago && {
      valor: String(cartago.entregas),
      label: "Entregas desde Cartago",
      nota: `Segundo centro de acopio, hacia ${cartago.municipios} municipios.`,
      color: "#B57BB5",
    },
    {
      valor: promedio,
      label: "Entregas por día",
      nota: `Promedio de los ${op.diasConEntrega} días con entregas.`,
      color: "#3E9BCB",
    },
  ].filter(Boolean) as Array<{ valor: string; label: string; nota: string; color: string }>;

  if (tarjetas.length === 0) return null;

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tarjetas.slice(0, 4).map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-[#00578C]/12 border-l-[3px] bg-white p-5"
          style={{ borderLeftColor: c.color }}
        >
          <div className="font-serif text-3xl leading-none text-[#0B2233]">{c.valor}</div>
          <p className="mt-2 text-base font-bold uppercase tracking-[0.06em] text-[#4E6B7C]">
            {c.label}
          </p>
          <p className="mt-1.5 text-base leading-6 text-[#5E7789]">{c.nota}</p>
        </div>
      ))}
    </div>
  );
}

export function MunicipiosNuevosCallouts() {
  const { jornadas } = useOperacion();
  const conNuevos = jornadas.filter((j) => j.nuevos > 0);

  if (conNuevos.length === 0) return null;

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {conNuevos.map((j) => (
        <div key={j.fecha} className="rounded-lg border-l-4 border-[#5CC46B] bg-white p-5 shadow-sm">
          <p className="text-base font-bold uppercase tracking-[0.06em] text-[#4E6B7C]">
            {Number(j.dia)} de agosto
          </p>
          <p className="mt-1 font-serif text-2xl text-[#0B2233]">
            {j.nuevos === 1 ? "1 municipio nuevo" : `${j.nuevos} municipios nuevos`}
          </p>
          <p className="mt-2 text-base leading-6 text-[#5E7789]">{j.nombresNuevos.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}