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
 *
 * SOBRE LA LISTA DE CATEGORÍAS
 *
 * La barra dejó de ser un filete debajo del texto y pasó a ser el FONDO
 * de la fila. El filete tenía dos problemas: sumaba un renglón por
 * categoría, y en las chicas dibujaba doce píxeles de color en un panel
 * de casi cuatrocientos, así que la proporción no se leía. Como relleno
 * de fondo, la misma información ocupa la mitad del alto y se compara de
 * un vistazo.
 *
 * Los cuerpos subieron de 10 y 11 px a 13 y 15. Diez píxeles es más
 * chico que cualquier texto del resto de la página, y esto lo lee gente
 * en un teléfono, no un operador frente a un monitor.
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
            <span className="label-caps text-xs">Total recibido</span>
            <p className="font-display mt-1 text-3xl font-semibold tabular-nums">
              {data.resumen.totalUnidades.toLocaleString("es-CO")}
              <span className="ml-1.5 text-base font-normal text-muted-foreground">unidades</span>
            </p>
            {data.resumen.fechaCorte && (
              <p className="mt-1 text-[13px] text-muted-foreground">
                Corte al {data.resumen.fechaCorte}
              </p>
            )}
          </section>

          <section className="border-b border-border p-4">
            <span className="label-caps text-xs">Categorías entregadas</span>

            {/* Cada fila es su propia barra: el relleno crece de izquierda
                a derecha por detrás del nombre. Sin filete aparte, sin un
                renglón extra por categoría. */}
            <ul className="mt-3 flex flex-col gap-1.5">
              {data.categorias.map((c) => {
                const porcentaje = Math.round(c.porcentaje * 100);
                return (
                  <li
                    key={c.id}
                    className="relative overflow-hidden rounded-md bg-surface-raised/60"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-primary/25"
                      style={{ width: `${Math.max(2, c.porcentaje * 100)}%` }}
                    />
                    <div className="relative flex items-baseline justify-between gap-3 px-3 py-2">
                      <span className="min-w-0 truncate text-[15px] text-foreground">
                        {c.nombre}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        <b className="text-[15px] font-semibold text-foreground">
                          {c.unidades.toLocaleString("es-CO")}
                        </b>
                        {/* El porcentaje va detrás y en gris: es la
                            lectura secundaria, y con el punto medio del
                            diseño anterior competía de igual a igual con
                            la cifra de unidades. */}
                        <span className="ml-2 text-[13px] text-muted-foreground">
                          {porcentaje}%
                        </span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Disclaimer explícito del backend, mostrado tal cual — nunca
                se resume/parafrasea, es el texto de fuente de la API. */}
            <p className="mt-3 text-[13px] leading-snug text-muted-foreground">{data.disclaimer}</p>
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