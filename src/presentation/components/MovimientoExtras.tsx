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
      color: "#FFD400",
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
          className="rounded-md border-l-4 bg-[#0079C1] p-5"
          style={{ borderLeftColor: c.color }}
        >
          <div className="text-3xl font-extrabold leading-none text-[#FBF8C6]">{c.valor}</div>
          <p className="mt-2 text-base font-bold uppercase tracking-[0.06em] text-white/85">
            {c.label}
          </p>
          <p className="mt-1.5 text-base leading-6 text-white">{c.nota}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * "Así avanzó la ruta". Reproduce la pieza de diseño con datos vivos:
 * bloques alternados en azul y crema, uno por jornada que sumó
 * municipios. Se hace por código y no como imagen porque los nombres
 * cambian cada vez que la ruta llega a un municipio nuevo.
 *
 * El camión va como imagen de fondo, decorativo, y desaparece en
 * pantallas angostas para no robarle ancho a los nombres.
 */
export function MunicipiosNuevosCallouts() {
  const { jornadas } = useOperacion();
  const conNuevos = jornadas.filter((j) => j.nuevos > 0);

  if (conNuevos.length === 0) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
      <div className="relative">
        <h3 className="vc-titular text-[clamp(2.25rem,7vw,4.5rem)] text-[#0079C1]">
          Así <span className="vc-resaltado-crema">avanzó</span>
          <br />
          la ruta
        </h3>

        <img
          src="/marca/camion-ruta-solidaridad.png"
          alt=""
          aria-hidden
          className="mt-8 hidden w-full max-w-md lg:block"
        />
      </div>

      <ol className="flex flex-col gap-3">
        {conNuevos.map((j, i) => {
          const enCrema = i % 2 === 1;
          return (
            <li
              key={j.fecha}
              className={`rounded-md p-5 ${
                enCrema ? "bg-[#FBF8C6] text-[#0079C1]" : "bg-[#0079C1] text-[#FBF8C6]"
              }`}
            >
              <p className="text-lg font-bold">
                {Number(j.dia)} de agosto / +{j.nuevos}{" "}
                {j.nuevos === 1 ? "municipio" : "municipios"}
              </p>
              <p className="mt-1.5 text-lg leading-7 font-medium">
                {j.nombresNuevos.join(", ")}.
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}