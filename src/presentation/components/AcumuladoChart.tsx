// src/presentation/components/AcumuladoChart.tsx
import { jornadas } from "@/presentation/data/movimientoData";

const WIDTH = 1000;
const HEIGHT = 300;
const PAD_LEFT = 58;
const PAD_RIGHT = 16;
const PAD_TOP = 26;
const PAD_BOTTOM = 34;

export function AcumuladoChart() {
  const maxAcum = Math.max(...jornadas.map((j) => j.acumuladoDespachos));
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) =>
    PAD_LEFT + (i / (jornadas.length - 1)) * plotW;
  const yFor = (value: number) =>
    PAD_TOP + plotH - (value / maxAcum) * plotH;

  const linePath = jornadas
    .map((j, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)} ${yFor(j.acumuladoDespachos).toFixed(1)}`)
    .join("");

  const areaPath = `${linePath} L${xFor(jornadas.length - 1).toFixed(1)} ${PAD_TOP + plotH} L${xFor(0).toFixed(1)} ${PAD_TOP + plotH} Z`;

  const gridValues = [0, Math.round(maxAcum / 2), maxAcum];

  return (
    <div className="rounded-lg border border-[#00578C]/12 bg-white p-6">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Despachos acumulados por jornada">
        <defs>
          <linearGradient id="acumulado-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#006BAC" stopOpacity="0.3" />
            <stop offset="1" stopColor="#006BAC" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="#00578C"
              strokeOpacity="0.08"
            />
            <text x={PAD_LEFT - 9} y={yFor(v) + 3.6} textAnchor="end" className="fill-[#7E9AAD] text-[11px]">
              {v}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#acumulado-fill)" />
        <path d={linePath} fill="none" stroke="#00578C" strokeWidth="2.6" strokeLinejoin="round" />

        {jornadas.map((j, i) => (
          <circle key={j.dia} cx={xFor(i)} cy={yFor(j.acumuladoDespachos)} r={i === jornadas.length - 1 ? 6.4 : 4.2}
            fill="#00578C" stroke="#F7FBFD" strokeWidth={i === jornadas.length - 1 ? 2.4 : 1.6}>
            <title>
              {`Al ${j.dia} de agosto · ${j.acumuladoDespachos} despachos acumulados · ${j.acumuladoToneladas} t`}
            </title>
          </circle>
        ))}

        {jornadas.map((j, i) => (
          <text key={j.dia} x={xFor(i)} y={HEIGHT - 10} textAnchor="middle" className="fill-[#7E9AAD] text-[11px]">
            {j.dia}
          </text>
        ))}
      </svg>
    </div>
  );
}