// CriticalityStatsBar.tsx
import type { Criticality, DiagnosticFilters } from "@/domain/entities";
import { CRITICALITY_HEX } from "@/presentation/components/criticality";

interface Props {
  filters: DiagnosticFilters;
  onChange: (next: DiagnosticFilters) => void;
  total: number;
  red: number;
  yellow: number;
  green: number;
}

const ITEMS: Array<{ key: Criticality; label: string }> = [
  { key: "ROJO", label: "Rojo" },
  { key: "AMARILLO", label: "Amarillo" },
  { key: "VERDE", label: "Verde" },
];

/**
 * Reemplaza el antiguo <Stat> de solo-lectura. Cada pill de color ahora es
 * un botón que hace toggle sobre filters.criticality — el filtro queda
 * implícito en el mismo número que el usuario ya está mirando, en vez de
 * duplicar Rojo/Amarillo/Verde otra vez dentro del popover de Filtros.
 * "Sedes" (el total) no filtra nada: limpia la selección de criticidad.
 */
export function CriticalityStatsBar({ filters, onChange, total, red, yellow, green }: Props) {
  const selected = filters.criticality ?? [];
  const counts: Record<Criticality, number> = { ROJO: red, AMARILLO: yellow, VERDE: green, SIN_DETALLE: 0 };

  const toggle = (key: Criticality) => {
    const next = selected.includes(key) ? selected.filter((c) => c !== key) : [...selected, key];
    onChange({ ...filters, criticality: next.length ? next : undefined });
  };

  return (
    <div className="pointer-events-auto flex w-fit flex-wrap items-center gap-1 rounded-full border border-border bg-surface/95 p-1 text-xs shadow-sm backdrop-blur md:gap-1.5">
      <button
        type="button"
        onClick={() => onChange({ ...filters, criticality: undefined })}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition ${
          selected.length === 0 ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-pressed={selected.length === 0}
      >
        <span className="font-display font-semibold tabular-nums">{total}</span>
        <span className="label-caps">Sedes</span>
      </button>

      {ITEMS.map(({ key, label }) => {
        const active = selected.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition ${
              active ? "ring-1 ring-inset" : "opacity-70 hover:opacity-100"
            }`}
            style={
              active
                ? { backgroundColor: `color-mix(in oklch, ${CRITICALITY_HEX[key]} 16%, transparent)`, color: CRITICALITY_HEX[key] }
                : undefined
            }
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: CRITICALITY_HEX[key] }} />
            <span className="font-display font-semibold tabular-nums">{counts[key]}</span>
            <span className="label-caps">{label}</span>
          </button>
        );
      })}
    </div>
  );
}