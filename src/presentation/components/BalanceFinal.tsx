/**
 * BalanceFinal.tsx — "Así se distribuyó la ayuda en el Valle del Cauca"
 * -----------------------------------------------------------------------
 * Las cuatro cifras de cabecera del tablero:
 *
 *   Toneladas aproximadas recibidas · despachadas · en inventario
 *   Municipios atendidos (n/42)
 *
 * TODO SALE DE LA BASE, NADA ESTÁ ESCRITO AQUÍ
 *
 * La versión anterior tenía «807 t» y «778 t» escritas en el código y una
 * fecha de corte pegada a mano: ninguna salía de un archivo y no había
 * forma de comprobarlas. Ahora:
 *
 *   · Despachadas = suma de los pesos del Excel oficial.
 *   · Recibidas e inventario NO están en ese Excel. Mientras no haya una
 *     fuente, dicen «Sin dato». No se reutiliza ninguna cifra vieja ni se
 *     calcula una por diferencia contra un valor que no existe.
 *   · Inventario = recibidas − despachadas, solo cuando existen las dos
 *     y el backend lo entrega.
 *   · La fecha de corte es la de la última pestaña diaria cargada.
 *
 * El período dice «desde el 25 de agosto»: los pesos anteriores no se
 * pesaron, se estimaron, y mezclarlos sumaría cosas medidas distinto.
 * -----------------------------------------------------------------------
 */
import type { CSSProperties } from "react";
import { useResumen } from "@/application/hooks/useTablero";
import type { ResumenResponse } from "@/domain/entities";
import { fechaLarga, toneladas } from "@/lib/formato";
import { SectionTitle } from "./storyPrimitives";

interface Cifra {
  etiqueta: string;
  valor: string;
  /** Sin dato: se atenúa para que no parezca una cifra más. */
  vacio?: boolean;
}

function cifrasDe(r: ResumenResponse): Cifra[] {
  return [
    {
      etiqueta: "Toneladas aproximadas recibidas",
      valor: r.recibidas === null ? "Sin dato" : toneladas(r.recibidas),
      vacio: r.recibidas === null,
    },
    {
      etiqueta: "Toneladas aproximadas despachadas",
      valor: toneladas(r.totales.toneladas),
    },
    {
      etiqueta: "Toneladas aproximadas en inventario",
      valor: r.inventario === null ? "Sin dato" : toneladas(r.inventario),
      vacio: r.inventario === null,
    },
    {
      etiqueta: "Municipios atendidos",
      valor: `${r.totales.municipiosAtendidos}/${r.totales.municipiosTotales}`,
    },
  ];
}

export function BalanceFinal() {
  const { data } = useResumen();

  return (
    <div className="mx-auto max-w-6xl">
      <SectionTitle>Así se distribuyó la ayuda en el Valle del Cauca</SectionTitle>

      {data && data.disponible ? (
        <Contenido resumen={data} />
      ) : (
        <p className="mt-9 text-lg text-[#35708F]" role="status">
          {data ? "Las cifras no están disponibles en este momento." : "Cargando cifras…"}
        </p>
      )}
    </div>
  );
}

function Contenido({ resumen }: { resumen: ResumenResponse }) {
  const cifras = cifrasDe(resumen);
  const corte = fechaLarga(resumen.corte);

  return (
    <>
      {/* En celular, una fila por cifra (la etiqueta es larga); desde `sm`,
          cuatro columnas. */}
      <dl className="mt-9 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cifras.map((c, i) => (
          <div
            key={c.etiqueta}
            style={{ "--i": i } as CSSProperties}
            className="vc-aparece flex items-center gap-4 rounded-lg bg-[#123E5C] px-4 py-4 sm:block sm:px-5 sm:py-6 sm:text-center"
          >
            <dd
              className={`order-first min-w-[6.5rem] shrink-0 font-extrabold leading-none tabular-nums sm:block ${
                c.vacio
                  ? "text-[1.25rem] text-[#C9E4F2] sm:text-[1.5rem]"
                  : "text-[1.75rem] text-[#FBF8C6] sm:text-[clamp(1.75rem,3.2vw,2.5rem)]"
              }`}
            >
              {c.valor}
            </dd>
            <dt className="text-[15px] font-bold leading-tight text-white sm:mt-2 sm:text-base">
              {c.etiqueta}
            </dt>
          </div>
        ))}
      </dl>

      {/* Un solo recuadro de corte: todo el tablero está al día hasta esa
          fecha, no cada cifra con la suya. */}
      {corte && (
        <div
          className="vc-aparece mt-2 rounded-lg bg-[#FBF8C6] px-5 py-3.5 text-center"
          style={{ "--i": cifras.length } as CSSProperties}
        >
          <span className="block text-[13px] font-bold uppercase tracking-[0.16em] text-[#00639F]">
            Con corte al
          </span>
          <b className="mt-0.5 block text-base font-extrabold text-[#123E5C] sm:text-lg">{corte}</b>
        </div>
      )}
    </>
  );
}
