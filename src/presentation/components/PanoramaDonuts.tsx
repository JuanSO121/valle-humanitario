/**
 * PanoramaDonuts.tsx
 * -----------------------------------------------------------------------
 * Los tres indicadores de cobertura del índice, calculados desde la API.
 *
 * Antes venían de panoramaData.ts, así que decían "13 de 15, del 11 al
 * 25" aunque el Excel ya tuviera más jornadas.
 *
 * SOBRE EL TAMAÑO
 *
 * La versión anterior fijaba el diámetro en 128 px con `size-32`. Sobre
 * una pieza a pantalla completa eso se ve diminuto, y en un monitor
 * grande queda perdido. Ahora el SVG ocupa el ancho de su columna con un
 * máximo, así que crece con la pantalla y el grosor del anillo se
 * mantiene proporcional porque está en unidades del viewBox.
 * -----------------------------------------------------------------------
 */
import { useOperacion } from "@/presentation/state/OperacionContext";

/** Radio dentro del viewBox de 128. La circunferencia sale de ahí. */
const RADIO = 52;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

interface Donut {
  id: string;
  valor: number;
  total: number;
  label: string;
  color: string;
}

export function PanoramaDonuts() {
  const op = useOperacion();

  if (op.municipiosAtendidos === 0) return null;

  // El denominador de días es el rango completo entre la primera y la
  // última entrega, así que los días sin movimiento se ven como faltante
  // y no desaparecen del conteo.
  const diasDelRango = rangoEnDias(op.primeraFecha, op.ultimaFecha);

  const zonasCompletas = op.zonas.filter((z) => z.total > 0 && z.atendidos === z.total).length;

  const donuts: Donut[] = [
    {
      id: "municipios",
      valor: op.municipiosAtendidos,
      total: op.municipiosTotales,
      label: "Municipios con ayudas entregadas",
      color: "#2E9E4F",
    },
    {
      id: "zonas",
      valor: zonasCompletas,
      total: op.zonas.length,
      label: "Zonas del Valle cubiertas por completo",
      color: "#FFD400",
    },
    {
      id: "dias",
      valor: op.diasConEntrega,
      total: diasDelRango,
      label: op.rangoLargo ? `Días con entregas, ${op.rangoLargo}` : "Días con entregas",
      color: "#22ABE2",
    },
  ];

  return (
    <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
      {donuts.map((d) => {
        const proporcion = d.total > 0 ? d.valor / d.total : 0;
        return (
          <div key={d.id} className="flex flex-col items-center text-center">
            <svg
              viewBox="0 0 128 128"
              className="h-auto w-full max-w-[13rem] sm:max-w-[15rem]"
              role="img"
              aria-label={`${d.valor} de ${d.total}. ${d.label}`}
            >
              <circle
                cx="64"
                cy="64"
                r={RADIO}
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="13"
              />
              <circle
                cx="64"
                cy="64"
                r={RADIO}
                fill="none"
                stroke={d.color}
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={`${proporcion * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
                transform="rotate(-90 64 64)"
              />
              <text
                x="64"
                y="62"
                textAnchor="middle"
                className="fill-white text-[30px] font-bold"
              >
                {d.valor}
              </text>
              <text x="64" y="84" textAnchor="middle" className="fill-white/70 text-[13px]">
                de {d.total}
              </text>
            </svg>

            <p className="mt-4 max-w-[18rem] text-base leading-6 text-white sm:text-lg sm:leading-7">
              {d.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** Días calendario entre dos fechas ISO, ambas incluidas. */
function rangoEnDias(desde: string | null, hasta: string | null): number {
  if (!desde || !hasta) return 0;
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  if (Number.isNaN(ms)) return 0;
  return Math.round(ms / 86_400_000) + 1;
}