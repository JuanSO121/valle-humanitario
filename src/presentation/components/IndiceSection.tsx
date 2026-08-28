/**
 * IndiceSection.tsx
 * -----------------------------------------------------------------------
 * La pieza "Ruta 41 municipios del Valle del Cauca", reconstruida en
 * código.
 *
 * Se hace acá y no como imagen por dos razones. La primera es que el
 * número del título es un dato: si el catálogo cambia, una imagen dice
 * 41 para siempre. La segunda es que los dos bloques azules de la pieza
 * son contenedores vacíos, pensados justamente para que adentro vayan las
 * cifras, y una imagen no puede contener nada.
 *
 * SOBRE EL ALTO
 *
 * En escritorio es una rejilla de cuatro filas: encabezado,
 * indicadores, cobertura y banda del pie. Solo las dos del medio son
 * flexibles y se reparten el espacio sobrante, así que en un monitor
 * alto no queda un hueco abajo.
 *
 * El alto es `min-h-dvh` y no `h-dvh` con recorte. Recortar era peor que
 * el problema que resolvía: cuando el contenido no cabía, las donas
 * quedaban cortadas por la mitad. Ahora se encogen solas por su propio
 * `max-height`, y si aun así no caben, la sección crece unos píxeles en
 * vez de mutilar el contenido.
 * -----------------------------------------------------------------------
 */
import { type CSSProperties } from "react";
import { useOperacion } from "@/presentation/state/OperacionContext";
import { PanoramaDonuts } from "./PanoramaDonuts";

interface Props {
  /**
   * A dónde lleva "Cali: conoce su ruta".
   *
   * Cali queda fuera del consolidado municipal, así que tiene su propia
   * ruta. Mientras esa página no exista, apunta al mapa.
   */
  enlaceCali?: string | undefined;
}

export function IndiceSection({ enlaceCali = "#mapa-de-ayudas" }: Props) {
  const op = useOperacion();

  const indicadores = [
    {
      valor: `${op.municipiosAtendidos} de ${op.municipiosTotales}`,
      label: "municipios recibieron ayudas",
    },
    {
      valor: op.totalEntregas.toLocaleString("es-CO"),
      label: "entregas llegaron a los municipios",
    },
    {
      // La tonelada municipal, no la departamental. Al lado de "39 de 41
      // municipios", las 557 toneladas de toda la operación incluían
      // Cali y las rutas institucionales y no correspondían.
      valor: `${op.toneladasMunicipales.toLocaleString("es-CO")} toneladas`,
      label: "llegaron a esos municipios",
    },
  ];

  return (
    <section
      id="indice"
      className="flex min-h-dvh flex-col bg-[#22ABE2] lg:grid lg:min-h-dvh lg:grid-rows-[auto_1fr_1fr_auto]"
    >
      <div className="mx-auto w-full max-w-[100rem] px-4 pt-8 sm:px-8 md:px-12 lg:pt-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-10">
          <h2 className="vc-titular text-[clamp(1.75rem,5vw,4rem)] text-white">
            Ruta {op.municipiosTotales} municipios
            <br />
            del <span className="vc-resaltado">Valle del Cauca</span>
          </h2>

          <a
            href={enlaceCali}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#FBF8C6] px-5 py-2.5 text-base font-bold text-[#0079C1] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg md:mt-3 md:text-lg motion-reduce:hover:translate-y-0"
          >
            <span aria-hidden>*</span>
            Cali: conoce su ruta
          </a>
        </div>
      </div>

      {/* Bloque uno: los indicadores. */}
      <div className="mx-auto w-full max-w-[100rem] px-4 pt-6 sm:px-8 md:px-12 lg:min-h-0 lg:pt-8">
        <div className="flex h-full min-h-0 items-center rounded-sm bg-[#0079C1] px-6 py-6 sm:px-10 sm:py-8">
          <div className="grid min-h-0 w-full gap-8 text-center sm:grid-cols-3">
            {indicadores.map((i, idx) => (
              <div key={i.label} style={{ "--i": idx } as CSSProperties} className="vc-aparece">
                <b className="block text-[clamp(1.75rem,4vw,3.25rem)] font-extrabold leading-none text-[#FBF8C6]">
                  {i.valor}
                </b>
                <p className="mt-3 text-base leading-6 text-white sm:text-lg sm:leading-7">
                  {i.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bloque dos: la cobertura. */}
      <div className="mx-auto w-full max-w-[100rem] px-4 pt-4 pb-8 sm:px-8 md:px-12 lg:min-h-0 lg:pb-10">
        {/* Sin `overflow-hidden`: recortar era el problema, no la
            solución. Las donas se limitan por su propio `max-height`, así
            que se encogen antes de tocar el borde del bloque. */}
        <div className="flex h-full min-h-0 items-center rounded-sm bg-[#0079C1] px-6 py-6 sm:px-10 sm:py-8">
          <div className="min-h-0 w-full">
            <PanoramaDonuts />
          </div>
        </div>
      </div>
    </section>
  );
}