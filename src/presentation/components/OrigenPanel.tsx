/**
 * OrigenPanel.tsx
 * -----------------------------------------------------------------------
 * Equivalente a DestinoPanel pero para el punto de ORIGEN: no necesita
 * su propio hook de red porque toda la data que necesita (despachos por
 * destino alcanzado desde este origen) ya vive en `flujos`, que
 * DashboardPage arma filtrando flujosParaMapa por origenId — es el mismo
 * array que ya se le pasa a MapCanvas para dibujar los arcos, así que no
 * hay una segunda fuente de verdad ni un fetch adicional.
 *
 * CADA FILA ABRE SU DESTINO
 *
 * Las cuarenta filas son destinos y todas tienen panel propio, así que
 * todas son navegables. Hacer clickeable solo a una —Cali, por ser la
 * primera— obligaría a explicar por qué las demás no lo son.
 *
 * La fila de Cali NO lleva ninguna glosa. Llegó a tener una que decía
 * "se quedó en la ciudad, sin salir a otro municipio", y era una
 * interpretación inventada: esos 59 son despachos que llegaron a Cali
 * como destino, igual que los 22 de Dagua. Que el origen esté en la
 * misma ciudad no dice nada sobre si la ayuda se entregó o se quedó
 * guardada, y el dato no distingue esas dos cosas.
 *
 * SOBRE EL TOTAL
 *
 * Los despachos de este panel son los que el MAPA puede dibujar, o sea
 * los que fueron a un destino con coordenada. Desde Cali salieron además
 * 23 hacia destinos sin ubicación —entidades, casos especiales, veredas
 * sin especificar—, que no aparecen acá. La cifra es consistente con lo
 * que se ve en el mapa, no con el total de la operación.
 *
 * SOBRE LA COMPOSICIÓN
 *
 * La barra dejó de ser un filete debajo del texto y pasó a ser el fondo
 * de la fila. Con cuarenta destinos, el filete sumaba cuarenta renglones
 * y en los destinos chicos dibujaba doce píxeles de color en un panel de
 * casi cuatrocientos: la proporción no se leía y la lista era el doble de
 * larga.
 *
 * Los cuerpos subieron de 10 y 12 px a 13 y 15. Diez píxeles es más chico
 * que cualquier texto del resto de la página.
 * -----------------------------------------------------------------------
 */
import { ChevronRight, Info } from "lucide-react";
import { ContextualPanel } from "./ContextualPanel";
import type { Flujo } from "@/domain/entities";

interface Props {
  origenId: string;
  origenNombre: string;
  /** Flujos SALIENTES de este origen, ya filtrados por DashboardPage (respeta la fecha del timeline si está activo). */
  flujos: Flujo[];
  isMobile: boolean;
  /** true si el timeline está en una fecha concreta. Cambia el texto del vacío. */
  enFechaSeleccionada?: boolean;
  /** Abre el panel de un destino. Lo maneja DashboardPage, igual que el clic en el mapa. */
  onSelectDestino?: ((id: string) => void) | undefined;
  onClose: () => void;
}

export function OrigenPanel({
  origenId,
  origenNombre,
  flujos,
  isMobile,
  enFechaSeleccionada = false,
  onSelectDestino,
  onClose,
}: Props) {
  const despachosTotal = flujos.reduce((sum, f) => sum + f.despachosCount, 0);

  /**
   * No hay toneladas por arco y no las va a haber: la hoja TONELADAS es
   * una serie DIARIA y DEPARTAMENTAL, sin desglose por origen ni por
   * destino. Repartirla proporcional a los despachos sería inventar un
   * número, porque un despacho de mercados y uno de tapabocas no pesan
   * igual. Por eso este panel cuenta despachos y no kilos.
   */
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
        {/* `min-h-[2.4em]` en los rótulos: "Destinos alcanzados" ocupa dos
            renglones y "Despachos" uno, así que sin reservar el mismo alto
            las dos cifras quedan a distinta altura y la pareja se ve
            desalineada. */}
        <section className="grid grid-cols-2 divide-x divide-border border-b border-border">
          <div className="p-4">
            <span className="label-caps block min-h-[2.4em] text-xs leading-tight">Despachos</span>
            <p className="font-display mt-1 text-3xl font-semibold tabular-nums text-foreground">
              {despachosTotal.toLocaleString("es-CO")}
            </p>
          </div>
          <div className="p-4">
            <span className="label-caps block min-h-[2.4em] text-xs leading-tight">
              Destinos alcanzados
            </span>
            <p className="font-display mt-1 text-3xl font-semibold tabular-nums text-foreground">
              {flujos.length.toLocaleString("es-CO")}
            </p>
          </div>
        </section>

        {flujos.length === 0 ? (
          <p className="p-4 text-[15px] text-muted-foreground">
            {/* El texto anterior siempre terminaba en "en la fecha
                seleccionada", porque su condición era `flujos.length === 0`
                dentro de la rama donde eso ya es cierto. Ahora depende de
                si el timeline está realmente en una fecha. */}
            No hay despachos registrados desde este origen
            {enFechaSeleccionada ? " en la fecha seleccionada" : ""}.
          </p>
        ) : (
          <section className="border-b border-border p-4">
            <span className="label-caps text-xs">Despachos por destino</span>
            <p className="mt-1 text-[15px] text-foreground">
              Selecciona un municipio para ver qué recibió.
            </p>

            {/* La aclaración va en su propia caja y no como un párrafo
                más. Son dos cosas distintas: arriba una acción, acá una
                advertencia sobre cómo leer una columna. Puestas seguidas
                en el mismo gris, las cinco líneas se leían como
                instrucciones y empujaban la lista fuera de la pantalla.

                El ícono y el fondo tenue la marcan como nota al margen,
                que es lo que permite saltarla en la primera lectura y
                encontrarla después, cuando el porcentaje genera la duda. */}
            <div className="mt-2 flex gap-2 rounded-md bg-surface-raised/60 px-3 py-2">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-[13px] leading-5 text-muted-foreground">
                Cada despacho corresponde a una ruta. El porcentaje muestra la proporción de rutas
                que llegó a cada municipio, no la cantidad de ayuda enviada. Un municipio puede
                recibir más ayuda en menos rutas.
              </p>
            </div>

            <ul className="mt-3 flex flex-col gap-1.5">
              {destinosOrdenados.map((f, i) => {
                const porcentaje = despachosTotal > 0 ? f.despachosCount / despachosTotal : 0;

                return (
                  <li key={f.destino.id}>
                    <button
                      type="button"
                      onClick={() => onSelectDestino?.(f.destino.id)}
                      disabled={!onSelectDestino}
                      className="group relative block w-full overflow-hidden rounded-md bg-surface-raised/60 text-left transition-colors hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default"
                    >
                      {/* El relleno crece de izquierda a derecha por
                          detrás del nombre. La escalera de retardos se
                          corta a los doce primeros: con cuarenta filas,
                          sesenta milisegundos cada una sumaban dos
                          segundos y medio hasta que la última se movía. */}
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 origin-left bg-primary/25"
                        style={{
                          width: `${Math.max(2, porcentaje * 100)}%`,
                          animation: "bar-grow 480ms cubic-bezier(0.16, 1, 0.3, 1) both",
                          animationDelay: `${Math.min(i, 12) * 40}ms`,
                        }}
                      />

                      <div className="relative flex items-center justify-between gap-3 px-3 py-2">
                        <span className="min-w-0 truncate text-[15px] text-foreground">
                          {f.destino.nombre}
                        </span>

                        <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                          <b className="text-[15px] font-semibold text-foreground">
                            {f.despachosCount.toLocaleString("es-CO")}
                          </b>
                          {/* El porcentaje va detrás y en gris: con el
                              punto medio del diseño anterior competía de
                              igual a igual con la cifra de despachos. */}
                          <span className="text-[13px] text-muted-foreground">
                            {Math.round(porcentaje * 100)}%
                          </span>
                          {onSelectDestino && (
                            <ChevronRight
                              aria-hidden
                              className="size-4 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                            />
                          )}
                        </span>
                      </div>
                    </button>
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