/**
 * JornadaBars.tsx
 * -----------------------------------------------------------------------
 * Entregas por día. Las barras y las etiquetas salen de la API, así que
 * el gráfico crece solo cuando se agregan días al Excel.
 *
 * SOBRE EL COLOR
 *
 * Era una tarjeta azul con barras crema, dentro de una sección crema.
 * Las barras quedaban del mismo tono que el fondo de la página: el borde
 * entre el dato y el papel desaparecía y el bloque vibraba.
 *
 * Se invirtió. La tarjeta es blanca, que es el soporte neutro de la
 * campaña, y el dato se queda con el azul institucional, que es el color
 * más saturado de la paleta. El amarillo se reserva para lo excepcional:
 * el día de mayor volumen y los municipios que estrenan ayuda. Un color
 * que aparece en todas las barras no señala nada.
 *
 * SOBRE LOS EJES
 *
 * Antes las barras flotaban con la cifra encima de cada una. Se podían
 * leer los valores uno por uno, pero no se podía estimar ninguno sin
 * leerlo, que es justamente lo que un gráfico debería permitir.
 *
 * Ahora hay eje vertical con escala y líneas de referencia, y eje
 * horizontal con los días. La escala no termina en el máximo real sino
 * en un número redondo por encima: un eje que termina en 47 obliga a
 * hacer cuentas, uno que termina en 50 se lee de un vistazo.
 * -----------------------------------------------------------------------
 */
import { useOperacion } from "@/presentation/state/OperacionContext";

/** Divisiones del eje vertical. Cuatro dan cinco marcas contando el cero. */
const DIVISIONES = 4;

export function JornadaBars() {
  const { jornadas } = useOperacion();
  if (jornadas.length === 0) return null;

  const max = Math.max(1, ...jornadas.map((j) => j.entregas));
  const tope = topeRedondo(max, DIVISIONES);

  // Las marcas van de arriba hacia abajo, que es el orden en el que se
  // dibuja la columna del eje.
  const marcas = Array.from({ length: DIVISIONES + 1 }, (_, i) => (tope / DIVISIONES) * (DIVISIONES - i));

  return (
    
    <figure className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-[#123E5C]/10 sm:p-7">
      <p className="mb-5 text-base text-[#35708F]">
        Cada barra corresponde a una fecha; la barra amarilla representa el día con mayor número de entregas.
      </p>

      {/* Con muchos días, apretar las columnas hasta que las etiquetas se
          monten no hace el gráfico más chico, lo hace ilegible. Por eso
          el lienzo tiene un ancho mínimo y en pantallas angostas se
          desplaza en horizontal. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="min-w-[34rem]">
          <div className="grid grid-cols-[2.75rem_1fr]">
            {/* Eje vertical. `justify-between` reparte las marcas y el
                desplazamiento de media línea las sienta sobre su línea
                de referencia, no encima de ella. */}
            <ul className="flex h-56 flex-col justify-between pr-3 text-right text-xs tabular-nums text-[#6B93AA]">
              {marcas.map((m) => (
                <li key={`marca-${m}`} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
                  {Math.round(m).toLocaleString("es-CO")}
                </li>
              ))}
            </ul>

            {/* Área de trazado. El borde inferior es el eje horizontal;
                el izquierdo, el vertical. */}
            <div className="relative h-56 border-b-2 border-l-2 border-[#123E5C]/20">
              {/* Líneas de referencia. Decorativas: la escala ya está en
                  el eje, así que no se anuncian. */}
              {marcas.slice(0, -1).map((m) => (
                <span
                  key={`linea-${m}`}
                  aria-hidden
                  className="absolute inset-x-0 h-px bg-[#123E5C]/8"
                  style={{ bottom: `${(m / tope) * 100}%` }}
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-1.5 px-2 sm:gap-2">
                {jornadas.map((j) => {
                  const esPico = j.entregas === max;
                  return (
                    <div
                      key={j.fecha}
                      className="relative flex h-full min-w-0 flex-1 items-end"
                      title={`${Number(j.dia)} de agosto: ${j.entregas} entregas hacia ${j.municipios} municipios`}
                    >
                      <div
                        className="w-full rounded-t-sm transition-[height] duration-500 motion-reduce:transition-none"
                        style={{
                          // Un mínimo de 2 px para que un día de una sola
                          // entrega se vea como algo y no como nada.
                          height: `${Math.max(2, (j.entregas / tope) * 100)}%`,
                          background: esPico ? "#FFD400" : "#0079C1",
                        }}
                      />

                      {/* La cifra va absoluta sobre la barra y no dentro
                          de la columna: si ocupara alto propio, las
                          barras dejarían de medir su proporción exacta
                          contra el eje. */}
                      <span
                        className="pointer-events-none absolute inset-x-0 text-center text-[11px] font-bold tabular-nums text-[#123E5C]"
                        style={{
                          bottom: `calc(${Math.max(2, (j.entregas / tope) * 100)}% + 4px)`,
                        }}
                      >
                        {j.entregas}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Eje horizontal: los días, y debajo los municipios nuevos.
                El primer hueco de la rejilla mantiene la alineación con
                las columnas de arriba. */}
            <div />
            <div className="flex gap-1.5 px-2 pt-2 sm:gap-2">
              {jornadas.map((j) => (
                <div key={`dia-${j.fecha}`} className="min-w-0 flex-1 text-center">
                  <span className="block text-xs font-semibold tabular-nums text-[#35708F]">
                    {Number(j.dia)}
                  </span>
                  {/* El alto fijo reserva el renglón aunque el día no
                      estrene municipios, para que la fila de días no
                      quede dentada. */}
                  <span className="mt-1 block h-5 text-[11px] font-bold text-[#8A6A00]">
                    {j.nuevos > 0 ? `+${j.nuevos}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-1 text-xs text-[#6B93AA]">
            Los números en amarillo identifica el número de municipios que reciben ayuda por primera vez.
          </p>
        </div>
      </div>
    </figure>
  );
}

/**
 * El techo del eje: el múltiplo redondo inmediatamente superior al
 * máximo real.
 *
 * Un eje que termina exactamente en el dato más alto no deja aire arriba
 * y obliga a leer cada cifra, porque las marcas caen en números como 47
 * o 113. Redondeando el paso a 1, 2, 2.5 o 5 por la magnitud del dato,
 * la escala siempre queda en números que se estiman de un vistazo.
 */
function topeRedondo(max: number, divisiones: number): number {
  const bruto = max / divisiones;
  const magnitud = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * magnitud).find((p) => p >= bruto) ?? magnitud * 10;
  return paso * divisiones;
}