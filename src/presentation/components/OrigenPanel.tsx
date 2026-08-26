/**
 * OrigenPanel.tsx
 * -----------------------------------------------------------------------
 * Equivalente a DestinoPanel pero para el punto de ORIGEN: no necesita
 * su propio hook de red porque toda la data que necesita (despachos por
 * destino alcanzado desde este origen) ya vive en `flujos`, que
 * DashboardPage arma filtrando flujosParaMapa por origenId — es el mismo
 * array que ya se le pasa a MapCanvas para dibujar los arcos, así que no
 * hay una segunda fuente de verdad ni un fetch adicional.
 * -----------------------------------------------------------------------
 */
import { ContextualPanel } from "./ContextualPanel";
import type { Flujo } from "@/domain/entities";

interface Props {
  origenId: string;
  origenNombre: string;
  /** Flujos SALIENTES de este origen, ya filtrados por DashboardPage (respeta la fecha del timeline si está activo). */
  flujos: Flujo[];
  isMobile: boolean;
  onClose: () => void;
}

export function OrigenPanel({ origenId, origenNombre, flujos, isMobile, onClose }: Props) {
  const despachosTotal = flujos.reduce((sum, f) => sum + f.despachosCount, 0);

  // TODO: no encontré un campo de toneladas en el tipo `Flujo` que me
  // pasaste (solo vi origenId, destino, despachosCount, porFecha). Dejo
  // esto listo para sumarlo apenas confirmes el nombre del campo —
  // buscá la línea "toneladasTotal" más abajo.
  // const toneladasTotal = flujos.reduce((sum, f) => sum + (f.toneladas ?? 0), 0);

  const destinosOrdenados = [...flujos].sort((a, b) => b.despachosCount - a.despachosCount);

  return (
    <ContextualPanel
      isMobile={isMobile}
      title={origenNombre}
      subtitle="Punto de despacho"
      onClose={onClose}
      transitionKey={`origen-${origenId}`}
    >
      <div className="flex flex-col">
        <section className="grid grid-cols-2 divide-x divide-border border-b border-border">
          <div className="p-4">
            <span className="label-caps text-[10px]">Despachos</span>
            <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
              {despachosTotal.toLocaleString("es-CO")}
            </p>
          </div>
          <div className="p-4">
            <span className="label-caps text-[10px]">Destinos alcanzados</span>
            <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
              {flujos.length.toLocaleString("es-CO")}
            </p>
          </div>
        </section>

        {flujos.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No hay despachos registrados desde este origen{destinosOrdenados.length === 0 ? " en la fecha seleccionada" : ""}.
          </p>
        ) : (
          <section className="border-b border-border p-4">
            <span className="label-caps text-[10px]">Despachos por destino</span>
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {destinosOrdenados.map((f, i) => {
                const porcentaje = despachosTotal > 0 ? f.despachosCount / despachosTotal : 0;
                return (
                  <li
                    key={f.destino.id}
                    className="group -mx-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-surface-raised"
                  >
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-foreground">{f.destino.nombre}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {f.despachosCount.toLocaleString("es-CO")} · {Math.round(porcentaje * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                      <div
                        className="h-1.5 origin-left rounded-full bg-primary"
                        style={{
                          width: `${Math.max(2, porcentaje * 100)}%`,
                          animation: `bar-grow 480ms cubic-bezier(0.16, 1, 0.3, 1) both`,
                          animationDelay: `${i * 60}ms`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </ContextualPanel>
  );
}