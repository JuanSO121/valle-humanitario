import municipalBoundariesRaw from "@/data/valle-municipios.json";

type Ring = Array<[number, number]>;
type Feature = {
  properties?: { municipalityCode?: string; name?: string };
  geometry?: { type: "Polygon" | "MultiPolygon"; coordinates: Ring[] | Ring[][] };
};

const features = (municipalBoundariesRaw as unknown as { features?: Feature[] }).features ?? [];

function getRings(feature: Feature): Ring[] {
  if (!feature.geometry) return [];
  if (feature.geometry.type === "Polygon") return feature.geometry.coordinates as Ring[];
  return (feature.geometry.coordinates as Ring[][]).flat();
}

const allPoints = features.flatMap((feature) => getRings(feature).flat());
const lngs = allPoints.map(([lng]) => lng);
const lats = allPoints.map(([, lat]) => lat);
const minLng = Math.min(...lngs);
const maxLng = Math.max(...lngs);
const minLat = Math.min(...lats);
const maxLat = Math.max(...lats);

function project([lng, lat]: [number, number]): string {
  const x = ((lng - minLng) / (maxLng - minLng)) * 86 + 7;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 92 + 4;
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

interface Props {
  className?: string;
}

export function ValleGlyph({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Silueta del Valle del Cauca"
    >
      <defs>
        <linearGradient id="valle-glyph-fill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#C6ECFB" />
          <stop offset="0.52" stopColor="#3E9BCB" />
          <stop offset="1" stopColor="#00578C" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="8" fill="#0B2233" />
      <g>
        {features.flatMap((feature) =>
          getRings(feature).map((ring, index) => (
            <polygon
              key={`${feature.properties?.municipalityCode ?? feature.properties?.name ?? "mun"}-${index}`}
              points={ring.map(project).join(" ")}
              fill="url(#valle-glyph-fill)"
              fillOpacity={feature.properties?.name === "CALI" ? 0.34 : 0.82}
              stroke="#0B2233"
              strokeWidth="0.38"
              strokeLinejoin="round"
            />
          )),
        )}
      </g>
      <path
        d="M17 79 C35 65, 38 46, 52 33 S72 19, 83 8"
        fill="none"
        stroke="#FFD103"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.82"
      />
    </svg>
  );
}
