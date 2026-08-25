/**
 * arcGeometry.ts
 * -----------------------------------------------------------------------
 * Matemática pura para los arcos de flujo del mapa. Deliberadamente sin
 * ninguna dependencia de MapLibre ni de React: son funciones puras que se
 * pueden testear con un simple `expect(...)`, y que MapCanvas.tsx solo
 * consume.
 *
 * (Sin cambios respecto a la versión ya compartida — se incluye acá para
 * que la carpeta quede completa y ubicable junto a arcAnimationEngine.ts
 * y MapCanvas.tsx, que la importan.)
 * -----------------------------------------------------------------------
 */

export type LngLat = [number, number];

const ARC_BEND_RATIO = 0.16;
const ARC_SAMPLES = 48;

function controlPoint(origin: LngLat, destino: LngLat): LngLat {
  const mid: LngLat = [(origin[0] + destino[0]) / 2, (origin[1] + destino[1]) / 2];
  const dx = destino[0] - origin[0];
  const dy = destino[1] - origin[1];
  const dist = Math.hypot(dx, dy) || 1e-9;
  const nx = -dy / dist;
  const ny = dx / dist;
  return [mid[0] + nx * dist * ARC_BEND_RATIO, mid[1] + ny * dist * ARC_BEND_RATIO];
}

export function buildArcCoordinates(origin: LngLat, destino: LngLat): LngLat[] {
  const control = controlPoint(origin, destino);
  const points: LngLat[] = [];
  for (let i = 0; i <= ARC_SAMPLES; i += 1) {
    const t = i / ARC_SAMPLES;
    const mt = 1 - t;
    const x = mt * mt * origin[0] + 2 * mt * t * control[0] + t * t * destino[0];
    const y = mt * mt * origin[1] + 2 * mt * t * control[1] + t * t * destino[1];
    points.push([x, y]);
  }
  return points;
}

export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

type GradientStop = [number, string];

function toGradientExpression(stops: GradientStop[]): unknown[] {
  const sorted = [...stops].sort((a, b) => a[0] - b[0]);
  const cleaned: GradientStop[] = [];
  const MIN_GAP = 0.0005;
  for (const stop of sorted) {
    const prev = cleaned[cleaned.length - 1];
    if (prev && stop[0] - prev[0] < MIN_GAP) {
      cleaned[cleaned.length - 1] = stop;
    } else {
      cleaned.push(stop);
    }
  }
  // cleaned siempre tiene al menos un elemento acá: viene de `stops`, que
  // en las dos funciones que llaman a esta (buildGrowthGradient,
  // buildPulseGradient) nunca se invoca con un array vacío. Se capturan
  // `first`/`last` en variables propias (en vez de re-indexar `cleaned[0]`
  // dos veces) para que TS pueda angostar el tipo de `undefined` a
  // `GradientStop` dentro del `if`, igual que ya hace con `prev` arriba.
  const first = cleaned[0];
  if (first && first[0] > 0) cleaned.unshift([0, first[1]]);
  const last = cleaned[cleaned.length - 1];
  if (last && last[0] < 1) cleaned.push([1, last[1]]);

  var expr: unknown[] = ['interpolate', ['linear'], ['line-progress']];
  cleaned.forEach((s) => {
    expr.push(s[0], s[1]);
  });
  return expr;
}

export function buildGrowthGradient(progress: number, solidColor: string): unknown[] {
  const p = Math.min(0.999, Math.max(0.001, progress));
  return toGradientExpression([
    [0, solidColor],
    [p, solidColor],
    [Math.min(1, p + 0.001), 'rgba(0,0,0,0)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
}

export function buildPulseGradient(
  loopT: number,
  dimColor: string,
  brightColor: string,
  bandWidth: number,
): unknown[] {
  const center = Math.min(1, Math.max(0, loopT));
  const start = center - bandWidth;
  const end = center + bandWidth;
  return toGradientExpression([
    [0, dimColor],
    [start, dimColor],
    [center, brightColor],
    [end, dimColor],
    [1, dimColor],
  ]);
}