/**
 * DestinoPanel.tsx
 * -----------------------------------------------------------------------
 * Nivel PRINCIPAL del panel de destino: categorías entregadas
 * (useDestinoResumen, fuente ENVIOS_CATEGORIA). La logística
 * (useDestinoLogistica, fuente DESPACHOS) vive en LogisticaDrawer.tsx y
 * SOLO se monta/dispara cuando la persona expande ese bloque — el
 * `enabled: expanded` ya vive en el hook, este componente solo controla
 * el booleano de UI.
 *
 * Reutiliza ContextualPanel del proyecto de criticidad sísmica tal cual:
 * es un chrome de panel completamente genérico (header con back/close,
 * scroll, transición de entrada, cierre en click-fuera respetando el
 * mapa) sin ningún concepto de sismos/sedes en su implementación —
 * reescribirlo hubiera sido duplicar código idéntico sin ninguna ganancia.
 * -----------------------------------------------------------------------
 */
import { useState } from "react";
import { ContextualPanel } from "./ContextualPanel";
import { LogisticaDrawer } from "./LogisticaDrawer";
import { useDestinoResumen } from "@/application/hooks/useDestinoResumen";

interface Props {
  destinoId: string;
  isMobile: boolean;
  onClose: () => void;
}

export function DestinoPanel({ destinoId, isMobile, onClose }: Props) {
  const { data, isLoading, isError } = useDestinoResumen(destinoId);
  const [logisticaExpanded, setLogisticaExpanded] = useState(false);

  // Cambiar de destino colapsa la logística del anterior — evita que se
  // quede expandida y dispare un fetch de useDestinoLogistica para el
  // destino nuevo antes de que la persona lo haya pedido explícitamente.
  const transitionKey = `destino-${destinoId}`;

  return (
    <ContextualPanel
      isMobile={isMobile}
      title={data?.destino.nombre ?? "Cargando destino…"}
      subtitle={data ? tipoLabel(data.destino.tipo) : undefined}
      onClose={onClose}
      transitionKey={transitionKey}
    >
      {isLoading && <PanelSkeleton />}

      {isError && (
        <div className="p-4 text-sm text-muted-foreground">
          No se pudo cargar la información de este destino.
        </div>
      )}

      {data && (
        <div className="flex flex-col">
          <section className="border-b border-border p-4">
            <span className="label-caps text-[10px]">Total recibido</span>
            <p className="font-display text-2xl font-semibold tabular-nums">
              {data.resumen.totalUnidades.toLocaleString("es-CO")}
              <span className="ml-1 text-sm font-normal text-muted-foreground">unidades</span>
            </p>
            {data.resumen.fechaCorte && (
              <p className="mt-1 text-[11px] text-muted-foreground">Corte al {data.resumen.fechaCorte}</p>
            )}
          </section>

          <section className="border-b border-border p-4">
            <span className="label-caps text-[10px]">Categorías entregadas</span>
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {data.categorias.map((c) => (
                <li key={c.id}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-foreground">{c.nombre}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {c.unidades.toLocaleString("es-CO")} · {Math.round(c.porcentaje * 100)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-raised">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${Math.max(2, c.porcentaje * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            {/* Disclaimer explícito del backend, mostrado tal cual — nunca
                se resume/parafrasea, es el texto de fuente de la API. */}
            <p className="mt-3 text-[10px] leading-snug text-muted-foreground">{data.disclaimer}</p>
          </section>

          <LogisticaDrawer
            destinoId={destinoId}
            expanded={logisticaExpanded}
            onToggle={() => setLogisticaExpanded((v) => !v)}
          />
        </div>
      )}
    </ContextualPanel>
  );
}

function tipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    municipio: "Municipio",
    centro_acopio: "Centro de acopio",
    centro_proteccion: "Centro de protección",
    entidad: "Entidad",
    especial: "Destino especial",
    departamento_externo: "Ayuda interdepartamental",
    agregado_multiple: "Destino agregado",
  };
  return labels[tipo] ?? tipo;
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-3 w-full animate-pulse rounded bg-surface-raised" />
      ))}
    </div>
  );
}