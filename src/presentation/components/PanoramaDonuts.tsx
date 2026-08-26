// src/presentation/components/PanoramaDonuts.tsx
import { panoramaDonuts, CIRCUMFERENCE } from "@/presentation/data/panoramaData";

function Donut({
  value,
  total,
  label,
  color,
}: {
  value: number;
  total: number;
  label: string;
  color: string;
}) {
  const fraction = total > 0 ? value / total : 0;
  const dash = fraction * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center text-center">
      <svg viewBox="0 0 128 128" className="h-28 w-28">
        <circle cx="64" cy="64" r="52" fill="none" stroke="#E4E7EA" strokeWidth="13" />
        <circle
          cx="64"
          cy="64"
          r="52"
          fill="none"
          stroke={color}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${dash.toFixed(1)} ${CIRCUMFERENCE}`}
          transform="rotate(-90 64 64)"
        />
        <text x="64" y="60" textAnchor="middle" className="fill-[#0B2233] font-serif text-[27px]">
          {value}
        </text>
        <text x="64" y="80" textAnchor="middle" className="fill-[#7E9AAD] text-[10.5px]">
          de {total}
        </text>
      </svg>
      <span className="mt-1 max-w-[10rem] text-xs text-[#4E6B7C]">{label}</span>
    </div>
  );
}

export function PanoramaDonuts() {
  return (
    <div className="mt-10 grid grid-cols-2 gap-6 rounded-lg border border-[#00578C]/12 bg-white p-6 md:grid-cols-4">
      {panoramaDonuts.map((d) => (
        <Donut key={d.id} value={d.value} total={d.total} label={d.label} color={d.color} />
      ))}
    </div>
  );
}