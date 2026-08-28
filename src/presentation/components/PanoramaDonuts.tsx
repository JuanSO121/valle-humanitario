/**
 * PanoramaDonuts.tsx
 * -----------------------------------------------------------------------
 * Los indicadores de cobertura del índice, calculados desde la API.
 *
 * SOBRE EL COLOR
 *
 * Van sobre el azul de campaña, así que los arcos usan la paleta cálida
 * de las piezas: amarillo, crema y naranja. La versión anterior usaba un
 * verde y un cyan que no están en la campaña, y el cyan encima quedaba
 * casi invisible contra el fondo azul.
 *
 * SOBRE LA MAQUETA
 *
 * Era una rejilla de tres columnas fijas. Cuando la lista bajó a dos
 * donas, la tercera columna siguió ahí: las donas se quedaban con un
 * tercio del ancho cada una, corridas hacia la izquierda, y el tercio
 * restante en blanco. Se veía como un error de datos y era un error de
 * maqueta.
 *
 * Ahora es un flex centrado. Sin número de columnas que declarar, la
 * fila se reparte entre las donas que existan —dos, tres o cuatro— y
 * siempre queda centrada dentro del bloque azul. Cada dona pide
 * `basis-[15rem]` y crece hasta su máximo, así que con menos donas cada
 * una es más grande en vez de dejar hueco.
 *
 * SOBRE EL TAMAÑO
 *
 * El diámetro se limita por ancho Y por alto. Con solo el ancho, en un
 * monitor panorámico las donas crecían hasta empujar la banda del pie
 * fuera de la pantalla.
 * -----------------------------------------------------------------------
 */
import { type CSSProperties } from "react";
import { useOperacion } from "@/presentation/state/OperacionContext";

/** Radio dentro del viewBox de 128. La circunferencia sale de ahí. */
const RADIO = 52;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/** Paleta de la campaña, del más cálido al más claro. */
const COLORES = ["#FFD400", "#FBF8C6", "#F0801E"];

interface Donut {
  id: string;
  valor: number;
  total: number;
  label: string;
}

export function PanoramaDonuts() {
  const op = useOperacion();

  if (op.municipiosAtendidos === 0) return null;

  // El denominador de días es el rango completo entre la primera y la
  // última entrega, así que los días sin movimiento se ven como faltante
  // y no desaparecen del conteo.
  const diasDelRango = rangoEnDias(op.primeraFecha, op.ultimaFecha);
  const zonasCompletas = op.zonas.filter((z) => z.total > 0 && z.atendidos === z.total).length;

  const donuts: Donut[] = [
    {
      id: "zonas",
      valor: zonasCompletas,
      total: op.zonas.length,
      label: "Zonas del Valle cubiertas por completo",
    },
    {
      id: "dias",
      valor: op.diasConEntrega,
      total: diasDelRango,
      label: op.rangoLargo ? `Días con entregas, ${op.rangoLargo}` : "Días con entregas",
    },
  ];

  return (
    // `min-h-0` en la fila y en cada celda: sin eso, un hijo de una fila
    // flexible reclama su alto natural en vez de encogerse, y el conjunto
    // de dona y etiqueta se sale del bloque azul.
    //
    // `items-start` y no `items-center`: las donas se alinean por arriba,
    // de modo que las etiquetas de una y dos líneas no descuelgan sus
    // círculos a distinta altura.
    <div className="flex min-h-0 flex-wrap items-start justify-center gap-x-10 gap-y-6 sm:gap-x-14">
      {donuts.map((d, i) => {
        const proporcion = d.total > 0 ? d.valor / d.total : 0;
        const color = COLORES[i % COLORES.length];
        const fin = CIRCUNFERENCIA * (1 - proporcion);

        return (
          <div
            key={`dona-${d.id}`}
            // `basis` fija el ancho de partida y `flex-1` reparte lo que
            // sobra: con dos donas cada una crece hasta su máximo en vez
            // de quedarse en un tercio del bloque. El `max-w` evita el
            // extremo contrario, una sola dona estirada a todo el ancho.
            className="flex min-h-0 max-w-[20rem] flex-1 basis-[15rem] flex-col items-center text-center"
          >
            <svg
              viewBox="0 0 128 128"
              // El SVG tiene viewBox, así que el navegador respeta
              // `max-height` conservando la proporción: se encoge solo
              // cuando la fila es baja, en vez de quedar recortado por el
              // contenedor. `max-w` cubre el caso contrario, una columna
              // angosta en un monitor alto.
              className="h-auto w-full max-h-[min(15rem,26vh)] max-w-[15rem] shrink"
              role="img"
              aria-label={`${d.valor} de ${d.total}. ${d.label}`}
            >
              <circle
                cx="64"
                cy="64"
                r={RADIO}
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="14"
              />
              <circle
                cx="64"
                cy="64"
                r={RADIO}
                fill="none"
                stroke={color}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={CIRCUNFERENCIA}
                transform="rotate(-90 64 64)"
                className="vc-arco"
                style={
                  {
                    "--arco-inicio": CIRCUNFERENCIA,
                    "--arco-fin": fin,
                    "--i": i,
                  } as CSSProperties
                }
              />
              <text
                x="64"
                y="62"
                textAnchor="middle"
                className="fill-white text-[32px] font-extrabold"
              >
                {d.valor}
              </text>
              <text x="64" y="84" textAnchor="middle" className="fill-white/70 text-[13px]">
                de {d.total}
              </text>
            </svg>

            <p
              style={{ "--i": i } as CSSProperties}
              // Dos líneas como máximo: la etiqueta de los días incluye
              // el rango de fechas y en una columna angosta se iba a
              // cuatro, empujando la dona fuera del bloque.
              className="vc-aparece mt-3 line-clamp-2 max-w-[18rem] text-[15px] leading-5 text-white sm:text-base sm:leading-6"
            >
              {d.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** Días calendario entre dos fechas ISO, ambas incluidas. */
function rangoEnDias(desde: string | null, hasta: string | null): number {
  if (!desde || !hasta) return 0;
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  if (Number.isNaN(ms)) return 0;
  return Math.round(ms / 86_400_000) + 1;
}