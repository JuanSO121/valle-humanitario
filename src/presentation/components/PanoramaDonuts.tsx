/**
 * PanoramaDonuts.tsx
 * -----------------------------------------------------------------------
 * Los dos indicadores de cobertura del resumen. Ambos se calculan desde
 * la API: cuántos municipios recibieron y en cuántos días hubo entregas.
 * Antes venían de panoramaData.ts, así que decían "13 de 15, del 11 al
 * 25" aunque el Excel ya tuviera más jornadas.
 */
import { useOperacion } from "@/presentation/state/OperacionContext";

/** Radio 52, circunferencia 2 por pi por r. */
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

  // El denominador de días es el rango completo entre la primera y la
  // última entrega, así que los días sin movimiento se ven como faltante
  // y no desaparecen del conteo.
  const diasDelRango = rangoEnDias(op.primeraFecha, op.ultimaFecha);

  const donuts: Donut[] = [
    {
      id: "municipios",
      valor: op.municipiosAtendidos,
      total: op.municipiosTotales,
      label: "Municipios con ayudas entregadas",
      color: "#039A39",
    },
    {
      id: "dias",
      valor: op.diasConEntrega,
      total: diasDelRango,
      label: op.rangoLargo ? `Días con entregas, ${op.rangoLargo}` : "Días con entregas",
      color: "#81C8EC",
    },
  ];

  if (op.municipiosAtendidos === 0) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {donuts.map((d) => (
        <div key={d.id} className="flex flex-col items-center text-center">
          <svg viewBox="0 0 128 128" className="size-32" role="img" aria-label={`${d.valor} de ${d.total}`}>
            <circle cx="64" cy="64" r={RADIO} fill="none" stroke="#E4E7EA" strokeWidth="13" />
            <circle
              cx="64"
              cy="64"
              r={RADIO}
              fill="none"
              stroke={d.color}
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={`${(d.total > 0 ? d.valor / d.total : 0) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
              transform="rotate(-90 64 64)"
            />
            <text x="64" y="62" textAnchor="middle" className="fill-[#00578C] font-serif text-[28px]">
              {d.valor}
            </text>
            <text x="64" y="82" textAnchor="middle" className="fill-[#7E9AAD] text-[12px]">
              de {d.total}
            </text>
          </svg>
          <p className="mt-3 max-w-[18rem] text-base leading-6 text-[#4E6B7C]">{d.label}</p>
        </div>
      ))}
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