// CriticalityLegend.tsx
// Insertar en el panel de criticidad para que Rojo/Amarillo/Verde queden
// explicados en lenguaje simple, no solo como color. Incluye también la
// agrupación de sedes (círculos azules del mapa) para que no se confunda
// con un cuarto nivel de riesgo — CLUSTER_COLOR es deliberadamente ajeno
// a la escala de criticidad (ver criticality.ts).
import { CRITICALITY_HEX, CRITICALITY_ORDER, CLUSTER_COLOR, CLUSTER_LABEL } from "./criticality";
import { CRITICALITY_DESCRIPTION, CRITICALITY_SHORT_LABEL } from "./criticalityDescriptions";


export function CriticalityLegend() {
  return (
    <div className="rounded-md border border-border bg-surface-raised p-3">
      <span className="label-caps">¿Qué significa cada color?</span>
      <ul className="mt-2 space-y-2">
        {CRITICALITY_ORDER.map((level) => (
          <li key={level} className="flex items-start gap-2.5">
            <span
              className="mt-1 size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CRITICALITY_HEX[level] }}
              aria-hidden
            />
            <span>
              <span className="block text-xs font-semibold">{CRITICALITY_SHORT_LABEL[level]}</span>
              <span className="block text-xs text-muted-foreground">{CRITICALITY_DESCRIPTION[level]}</span>
            </span>
          </li>
        ))}
        <li className="flex items-start gap-2.5 border-t border-border pt-2">
          <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CLUSTER_COLOR }} aria-hidden />
          <span>
            <span className="block text-xs font-semibold">{CLUSTER_LABEL}</span>
            <span className="block text-xs text-muted-foreground">
              Varias sedes cercanas agrupadas en el mapa — no indica un nivel de riesgo. Acércate (zoom) para separarlas.
            </span>
          </span>
        </li>
      </ul>
    </div>
  );
}