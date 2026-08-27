/**
 * AcumuladoChart.tsx
 * -----------------------------------------------------------------------
 * Entregas acumuladas día a día. El eje, los puntos y las etiquetas se
 * arman desde la API, así que la curva se extiende sola cuando el Excel
 * suma jornadas.
 */
import { useOperacion } from "@/presentation/state/OperacionContext";

const WIDTH = 1000;
const HEIGHT = 300;
const PAD_LEFT = 58;
const PAD_RIGHT = 16;
const PAD_TOP = 26;
const PAD_BOTTOM = 34;

export function AcumuladoChart() {
  const { jornadas, entregasSinFecha } = useOperacion();
  if (jornadas.length < 2) return null;

  const maxAcum = Math.max(1, ...jornadas.map((j) => j.acumuladoEntregas));
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) => PAD_LEFT + (i / (jornadas.length - 1)) * plotW;
  const yFor = (value: number) => PAD_TOP + plotH - (value / maxAcum) * plotH;

  const linePath = jornadas
    .map((j, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)} ${yFor(j.acumuladoEntregas).toFixed(1)}`)
    .join("");

  const areaPath = `${linePath} L${xFor(jornadas.length - 1).toFixed(1)} ${PAD_TOP + plotH} L${xFor(0).toFixed(1)} ${PAD_TOP + plotH} Z`;

  const gridValues = [0, Math.round(maxAcum / 2), maxAcum];

  return (
    <div className="rounded-lg border border-[#0079C1]/12 bg-white p-5 sm:p-6">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Entregas acumuladas por día"
      >
        <defs>
          <linearGradient id="acumulado-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0079C1" stopOpacity="0.3" />
            <stop offset="1" stopColor="#0079C1" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="#0079C1"
              strokeOpacity="0.08"
            />
            <text x={PAD_LEFT - 9} y={yFor(v) + 4} textAnchor="end" className="fill-[#6B93AA] text-[13px]">
              {v}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#acumulado-fill)" />
        <path d={linePath} fill="none" stroke="#0079C1" strokeWidth="2.6" strokeLinejoin="round" />

        {jornadas.map((j, i) => (
          <circle
            key={j.fecha}
            cx={xFor(i)}
            cy={yFor(j.acumuladoEntregas)}
            r={i === jornadas.length - 1 ? 6.4 : 4.2}
            fill="#0079C1"
            stroke="#F2FAFD"
            strokeWidth={i === jornadas.length - 1 ? 2.4 : 1.6}
          >
            <title>
              {`Al ${Number(j.dia)} de agosto: ${j.acumuladoEntregas} entregas acumuladas, ${j.acumuladoToneladas} toneladas`}
            </title>
          </circle>
        ))}

        {jornadas.map((j, i) => (
          <text
            key={j.fecha}
            x={xFor(i)}
            y={HEIGHT - 10}
            textAnchor="middle"
            className="fill-[#6B93AA] text-[13px]"
          >
            {j.dia}
          </text>
        ))}
      </svg>

      {entregasSinFecha > 0 && (
        <p className="mt-3 text-[15px] text-[#6B93AA]">
          {entregasSinFecha === 1
            ? "Una entrega no tiene fecha registrada, por eso no aparece en esta curva."
            : `${entregasSinFecha} entregas no tienen fecha registrada, por eso no aparecen en esta curva.`}
        </p>
      )}
    </div>
  );
}