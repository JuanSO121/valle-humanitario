/**
 * LogisticaDrawer.tsx
 * -----------------------------------------------------------------------
 * Nivel SECUNDARIO del panel de destino: despachos individuales
 * (useDestinoLogistica, fuente DESPACHOS). Colapsado por defecto — el
 * fetch solo se dispara cuando `expanded` pasa a true (ver el `enabled`
 * dentro de useDestinoLogistica.ts). Nunca muestra ni suma un total de
 * unidades propio: el backend ya advierte que las unidades por despacho
 * son un subconjunto parcial (96 de 387) y sumarlas aquí invitaría a
 * compararlas visualmente contra el total de categorías del panel
 * principal, que es exactamente lo que el modelo de datos prohíbe.
 * -----------------------------------------------------------------------
 */
import { useDestinoLogistica } from "@/application/hooks/useDestinoLogistica";

interface Props {
  destinoId: string;
  expanded: boolean;
  onToggle: () => void;
}

export function LogisticaDrawer({ destinoId, expanded, onToggle }: Props) {
  const { data, isLoading, isError } = useDestinoLogistica(destinoId, expanded);

  return (
    <section className="border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="label-caps text-[10px]">Información logística</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={`shrink-0 text-muted-foreground transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {isLoading && (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-surface-raised" />
              ))}
            </div>
          )}

          {isError && (
            <p className="text-xs text-muted-foreground">No se pudo cargar el detalle logístico.</p>
          )}

          {data && data.despachos.length === 0 && (
            <p className="text-xs text-muted-foreground">Sin despachos individuales registrados.</p>
          )}

          {data && data.despachos.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {data.despachos.map((d) => (
                <li key={d.id} className="rounded-md border border-border bg-surface-raised/60 p-2.5 text-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] text-muted-foreground">{d.fecha ?? "sin fecha"}</span>
                    {d.unidades !== null && (
                      <span className="tabular-nums text-muted-foreground">{d.unidades.toLocaleString("es-CO")} u.</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-foreground">{d.categoriaPrincipal ?? "Sin categoría"}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {d.canal ?? "Canal desconocido"}
                    {d.familias !== null ? ` · ${d.familias} familias` : ""}
                  </p>
                  {d.documento && (
                    <a
                      href={d.documento.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-[11px] font-medium text-primary hover:underline"
                    >
                      Ver documento
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}

          {data && (
            <p className="mt-3 text-[10px] leading-snug text-muted-foreground">{data.disclaimer}</p>
          )}
        </div>
      )}
    </section>
  );
}