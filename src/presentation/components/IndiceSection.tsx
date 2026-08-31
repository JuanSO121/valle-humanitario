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
 * SOBRE EL ALTO: POR QUÉ SE FUE LA REJILLA
 *
 * Antes era `lg:grid-rows-[auto_1fr_1fr_auto]`, y esos dos `1fr` eran el
 * problema entero de la sección. Le decían a los dos bloques azules que
 * se repartieran TODO el espacio sobrante de la pantalla, así que en un
 * monitor alto tres cifras y unas donas quedaban flotando en dos cajas de
 * cuatrocientos píxeles. No era que faltara contenido: era que el
 * contenedor estaba inflado, y un bloque de color vacío no comunica nada,
 * solo ocupa.
 *
 * De paso, la cuarta fila `auto` nunca existió: la sección tiene tres
 * hijos, no cuatro.
 *
 * Ahora es un `flex-col` con `justify-center`. Cada bloque mide lo que
 * mide su contenido y el conjunto se centra en la pantalla. Si sobra
 * espacio queda como aire arriba y abajo, que es lo que hace respirar
 * una lámina; si falta, la sección crece en vez de recortar.
 *
 * También desaparecieron los `h-full`, `min-h-0` e `items-center` que
 * existían solo para sobrevivir dentro de aquellos `1fr`.
 * -----------------------------------------------------------------------
 */
import { type CSSProperties } from "react";
import { useOperacion } from "@/presentation/state/OperacionContext";
import { PanoramaDonuts } from "./PanoramaDonuts";

/**
 * El botón de Cali, como pieza gráfica.
 *
 * El archivo es de 512 por 512 con fondo transparente. Crece por pasos
 * en vez de quedarse en una medida: a 28 px, que era lo que tenía en
 * celular, el texto que trae dibujado adentro no se lee.
 */
const BOTON_CALI = "/marca/boton_cali_conozca.png";

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
      label: "Municipios recibieron ayudas",
    },
    {
      valor: op.totalEntregas.toLocaleString("es-CO"),
      label: "Entregas llegaron a los municipios",
    },
    {
      // La tonelada municipal, no la departamental. Al lado de "39 de 41
      // municipios", las 557 toneladas de toda la operación incluían
      // Cali y las rutas institucionales y no correspondían.
      valor: `${op.toneladasMunicipales.toLocaleString("es-CO")} t`,
      label: "Llegaron a esos municipios",
    },
  ];

  return (
    <section
      id="indice"
      className="flex min-h-dvh flex-col justify-center gap-5 bg-[#22ABE2] px-4 py-10 sm:gap-6 sm:px-8 sm:py-12 md:px-12"
    >
      {/* Encabezado: el titular y el botón de Cali, enfrentados. */}
      <div className="mx-auto w-full max-w-[100rem]">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-10">
          <h2 className="vc-titular text-[clamp(1.75rem,5vw,4rem)] text-white">
            Ruta {op.municipiosTotales} municipios
            <br />
            del <span className="vc-resaltado">Valle del Cauca</span>
          </h2>

          {/* `shrink-0` para que el botón no se aplaste cuando el titular
              ocupa dos líneas largas. Los pasos de alto son 48, 64 y 88
              px: en celular tiene que competir con un titular de 28 px,
              y en escritorio con uno de 64. */}
          <a href={enlaceCali} className="shrink-0 self-start md:self-center">
            <img
              src={BOTON_CALI}
              alt="Cali: conozca la ruta"
              width={512}
              height={512}
              decoding="async"
              className="h-12 w-auto select-none transition duration-200 hover:scale-105 sm:h-16 md:h-[5.5rem] motion-reduce:transform-none"
            />
          </a>
        </div>
      </div>

      {/* Bloque uno: los indicadores.
          Es la cifra de cabecera de toda la sección, así que va primero y
          con el cuerpo más grande de la lámina. Antes competía de igual a
          igual con las donas, y dos bloques del mismo peso no establecen
          ninguna jerarquía: el ojo no sabe por dónde empezar. */}
      <div className="mx-auto w-full max-w-[100rem]">
        <div className="rounded-sm bg-[#0079C1] px-6 py-6 sm:px-10 sm:py-8">
          {/* `divide-x` separa las tres cifras con una línea en vez de
              dejarlas sueltas en el ancho. Es lo que las hace leer como
              una unidad de tres partes y no como tres cosas que
              coincidieron en la misma caja.

              La línea solo aparece de `sm` para arriba, que es cuando
              están en columnas; apiladas, un `divide-y` cortaría el
              bloque en tres franjas y sería peor. */}
          <div className="grid gap-y-7 text-center sm:grid-cols-3 sm:gap-y-0 sm:divide-x sm:divide-white/25">
            {indicadores.map((i, idx) => (
              <div
                key={i.label}
                style={{ "--i": idx } as CSSProperties}
                className="vc-aparece px-2 sm:px-6"
              >
                <b className="block text-[clamp(2rem,4.6vw,3.75rem)] font-extrabold leading-none tabular-nums text-[#FBF8C6]">
                  {i.valor}
                </b>
                {/* `max-w-[16rem] mx-auto` para que las etiquetas de tres
                    y de cinco palabras ocupen un ancho parecido y las
                    tres columnas queden ópticamente alineadas. Sin tope,
                    "Entregas llegaron a los municipios" se estira a todo
                    el tercio y rompe la simetría. */}
                <p className="mx-auto mt-3 max-w-[16rem] text-base leading-6 text-white sm:text-lg sm:leading-7">
                  {i.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bloque dos: la cobertura.
          Sin `overflow-hidden`: recortar era el problema, no la solución.
          Las donas se limitan por su propio `max-height`, así que se
          encogen antes de tocar el borde del bloque. */}
      <div className="mx-auto w-full max-w-[100rem]">
        <div className="rounded-sm bg-[#0079C1] px-6 py-6 sm:px-10 sm:py-8">
          <PanoramaDonuts />
        </div>
      </div>
    </section>
  );
}