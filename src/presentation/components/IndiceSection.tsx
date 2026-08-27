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
 * La composición sigue la pieza: fondo cyan, titular en dos líneas con la
 * segunda resaltada en amarillo, el enlace de Cali arriba a la derecha,
 * dos bloques en azul y la banda crema al pie.
 * -----------------------------------------------------------------------
 */
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
      valor: `${op.totalToneladas.toLocaleString("es-CO")} toneladas`,
      label: op.toneladasMedidas
        ? "de ayuda salieron del departamento"
        : "estimadas según el número de entregas",
    },
  ];

  return (
    <section id="indice" className="flex min-h-dvh flex-col bg-[#22ABE2]">
      <div className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-8 px-4 py-10 sm:px-8 sm:py-12 md:px-12">
        {/* Encabezado. En pantallas angostas el enlace baja debajo del
            titular en vez de comprimirlo. */}
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-10">
          <h2 className="vc-titular text-[clamp(2rem,6vw,4.5rem)] text-white">
            Ruta {op.municipiosTotales} municipios
            <br />
            del <span className="vc-resaltado">Valle del Cauca</span>
          </h2>

          <a
            href={enlaceCali}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#FBF8C6] px-5 py-2.5 text-base font-bold text-[#0079C1] transition hover:bg-white md:mt-3 md:text-lg"
          >
            <span aria-hidden>*</span>
            Cali: conoce su ruta
          </a>
        </div>

        {/* Bloque uno: los indicadores. */}
        <div className="rounded-sm bg-[#0079C1] px-6 py-8 sm:px-10 sm:py-10">
          <div className="grid gap-8 text-center sm:grid-cols-3">
            {indicadores.map((i) => (
              <div key={i.label}>
                <b className="block text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-none text-[#FBF8C6]">
                  {i.valor}
                </b>
                <p className="mt-3 text-base leading-6 text-white sm:text-lg sm:leading-7">
                  {i.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bloque dos: la cobertura. */}
        <div className="rounded-sm bg-[#0079C1] px-6 py-8 sm:px-10 sm:py-10">
          <PanoramaDonuts />
        </div>
      </div>

      {/* Banda crema al pie, como en la pieza. Lleva la fecha de corte,
          que es lo que más se pregunta al ver cifras de una emergencia. */}
      <div className="bg-[#FBF8C6] px-4 py-5 sm:px-8 md:px-12">
        <p className="mx-auto max-w-[100rem] text-center text-base font-bold text-[#0079C1] sm:text-lg">
          {op.fechaCorteLarga
            ? `Información con corte al ${op.fechaCorteLarga}.`
            : "Información de las entregas registradas por la Gobernación."}
        </p>
      </div>
    </section>
  );
}