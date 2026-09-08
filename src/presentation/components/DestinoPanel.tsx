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
 * DOS CHROMES, UN CONTENIDO
 *
 * En escritorio sigue siendo ContextualPanel, el panel lateral de
 * siempre, sin ningún cambio. En celular el mismo contenido va dentro de
 * una HojaInferior.
 *
 * El motivo es que un panel a pantalla completa no es la versión móvil
 * de un panel lateral. En escritorio el panel ocupa un tercio y el mapa
 * sigue ahí: se ve qué municipio se tocó, dónde queda, qué hay al lado.
 * En celular ese mismo panel tapaba todo, y la única salida era cerrar.
 * Comparar dos municipios exigía abrir, memorizar, cerrar y volver a
 * abrir.
 *
 * El contenido no se duplica: se arma una vez y cambia el envoltorio.
 *
 * EL TOTAL SE MUEVE AL ENCABEZADO EN CELULAR
 *
 * En la hoja, el resumen del encabezado es lo ÚNICO que se lee sin
 * arrastrar, así que ahí va la cifra que responde la pregunta que motivó
 * el toque: cuántas unidades recibió. Y por eso mismo el bloque "Total
 * recibido" no se repite en el cuerpo: mostrar el mismo número dos veces
 * a diez píxeles de distancia gasta el primer golpe de vista, que en una
 * hoja es lo más caro que hay.
 *
 * En escritorio ese bloque se queda donde estaba: ahí el encabezado solo
 * lleva el nombre y el tipo, y el total necesita su sitio.
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
import { HojaInferior } from "./HojaInferior";
import { LogisticaDrawer } from "./LogisticaDrawer";
import { useDestinoResumen } from "@/application/hooks/useDestinoResumen";

interface Props {
  destinoId: string;
  isMobile: boolean;
  /**
   * Alto que ocupa la hoja en celular, en píxeles.
   *
   * Lo consume DashboardPage para correr el centro del mapa hacia arriba
   * y subir el timeline y los controles. En escritorio no se llama nunca.
   */
  onAlturaChange?: ((px: number) => void) | undefined;
  onClose: () => void;
}

export function DestinoPanel({ destinoId, isMobile, onAlturaChange, onClose }: Props) {
  const { data, isLoading, isError } = useDestinoResumen(destinoId);
  const [logisticaExpanded, setLogisticaExpanded] = useState(false);

  // Cambiar de destino colapsa la logística del anterior — evita que se
  // quede expandida y dispare un fetch de useDestinoLogistica para el
  // destino nuevo antes de que la persona lo haya pedido explícitamente.
  const transitionKey = `destino-${destinoId}`;

  const titulo = data?.destino.nombre ?? "Cargando destino…";
  const tipo = data ? tipoLabel(data.destino.tipo) : undefined;

  const contenido = (
    <>
      {isLoading && <PanelSkeleton />}

      {isError && (
        <div className="p-4 text-sm text-muted-foreground">
          No se pudo cargar la información de este destino.
        </div>
      )}

      {data && (
        <div className="flex flex-col">
          {/* En celular esta cifra ya está en el encabezado de la hoja,
              donde se lee sin arrastrar. Repetirla acá dejaría el primer
              golpe de vista gastado en un número que la persona acaba de
              leer. */}
          {!isMobile && (
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
          )}

          <section className={`border-b border-border ${isMobile ? "pb-4" : "p-4"}`}>
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
                          {Math.round(c.unidades).toLocaleString("es-CO")}
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
    </>
  );

  if (isMobile) {
    return (
      <HojaInferior
        abierta
        onCerrar={onClose}
        titulo={titulo}
        onAlturaChange={onAlturaChange}
        resumen={
          data ? (
            <>
              <b className="font-semibold text-[#123E5C]">
                {Math.round(data.resumen.totalUnidades).toLocaleString("es-CO")}
              </b>{" "}
              unidades
              {/* El tipo va detrás de la cifra y no como subtítulo
                  aparte: en el anclaje bajo hay una línea, y gastarla en
                  "Municipio" cuando el nombre ya lo dice sería perder la
                  única oportunidad de responder cuánto recibió. */}
              {tipo ? ` · ${tipo}` : ""}
            </>
          ) : (
            tipo
          )
        }
      >
        {contenido}
      </HojaInferior>
    );
  }

  return (
    <ContextualPanel
      isMobile={false}
      title={titulo}
      subtitle={tipo}
      onClose={onClose}
      transitionKey={transitionKey}
    >
      {contenido}
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