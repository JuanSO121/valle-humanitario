/**
 * PanoramaDonuts.tsx
 * -----------------------------------------------------------------------
 * Los tres indicadores de cobertura del índice, calculados desde la API.
 *
 * SOBRE EL COLOR
 *
 * Van sobre el azul de campaña, así que los arcos usan la paleta cálida
 * de las piezas: amarillo, crema y naranja. La versión anterior usaba un
 * verde y un cyan que no están en la campaña, y el cyan encima quedaba
 * casi invisible contra el fondo azul.
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
      id: "municipios",
      valor: op.municipiosAtendidos,
      total: op.municipiosTotales,
      label: "Municipios con ayudas entregadas",
    },
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
    // `min-h-0` en la rejilla y en cada celda: sin eso, un hijo de una
    // fila flexible reclama su alto natural en vez de encogerse, y el
    // conjunto de dona y etiqueta se sale del bloque azul.
    <div className="grid min-h-0 place-items-center gap-5 sm:grid-cols-3">
      {donuts.map((d, i) => {
        const proporcion = d.total > 0 ? d.valor / d.total : 0;
        const color = COLORES[i % COLORES.length];
        const fin = CIRCUNFERENCIA * (1 - proporcion);

        return (
          <div key={`dona-${d.id}`} className="flex min-h-0 w-full flex-col items-center text-center">
            <svg
              viewBox="0 0 128 128"
              // El SVG tiene viewBox, así que el navegador respeta
              // `max-height` conservando la proporción: se encoge solo
              // cuando la fila es baja, en vez de quedar recortado por el
              // contenedor. `max-w` cubre el caso contrario, una columna
              // angosta en un monitor alto.
              className="h-auto w-full max-w-[13rem] max-h-[min(13rem,20vh)] shrink"
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