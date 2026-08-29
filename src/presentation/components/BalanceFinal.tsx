/**
 * BalanceFinal.tsx
 * -----------------------------------------------------------------------
 * El cierre del recorrido: cuánto se entregó, cuánto pesó y por qué
 * rutas.
 *
 * SOBRE LAS CUATRO RUTAS Y POR QUÉ NO SE SOLAPAN
 *
 * Cartago es un ORIGEN, no un destino: sus entregas llegan a municipios
 * del norte. Si se listara "municipios" con el total y "Cartago" aparte,
 * esas entregas se contarían dos veces y la suma daría más que el total
 * de la operación.
 *
 * Por eso la primera ruta es "municipios desde Cali", que es el total
 * municipal menos lo que salió de Cartago. Así las cuatro suman
 * exactamente las entregas del departamento.
 *
 * Todo se deriva de la API. La lista de canales viene de route=ayuda; el
 * catálogo estático solo aporta el color, que es diseño y no dato.
 *
 * SOBRE EL BLOQUE DE CIFRAS
 *
 * Las tres tarjetas tenían el relleno de un bloque protagonista, y no lo
 * son: son la entrada al balance, y abajo vienen las cuatro rutas, que
 * es donde está el detalle. Con el relleno apretado y la cifra un punto
 * más chica, el conjunto se lee como una sola unidad y no como tres
 * carteles.
 *
 * Debajo van las bandas de corte, en crema. Contrastan con el navy de
 * las tarjetas y con el fondo claro de la sección. Son dos y no una
 * porque las ayudas recibidas se consolidan en el centro de acopio unos
 * días antes que el registro de despachos: cada banda abarca las
 * columnas de las cifras que fecha, de modo que ningún número queda
 * fechado con un corte que no le corresponde.
 *
 * SOBRE LAS DOS MAQUETAS DE LAS RUTAS
 *
 * En escritorio la fila es una línea de tiempo: rótulo y óvalo a la
 * izquierda, círculo al centro sobre el hilo vertical, descripción a la
 * derecha. Esa composición necesita tres columnas y en un teléfono no
 * cabe: el óvalo quedaba con dos palabras por línea y la descripción,
 * arrinconada contra el margen.
 *
 * En celular cada ruta se cierra como una burbuja: una tarjeta con el
 * rótulo arriba, el óvalo de color con el icono adentro y la descripción
 * debajo. Se lee de arriba abajo, que es como se lee un teléfono, y cada
 * ruta queda separada de la siguiente sin depender del hilo, que ahí se
 * oculta.
 *
 * El cambio entre las dos maquetas lo hace `md:contents` en el envoltorio
 * de la burbuja: en escritorio ese div se disuelve y sus tres hijos pasan
 * a ser celdas de la rejilla del `li`. Así el HTML es uno solo y no hay
 * bloques duplicados que después se desincronicen.
 * -----------------------------------------------------------------------
 */
import { type CSSProperties } from "react";
import { Boxes, Building2, HeartHandshake, Warehouse } from "lucide-react";
import { useOperacion } from "@/presentation/state/OperacionContext";
import { useAyuda } from "@/application/hooks/useAyuda";
import { SectionTitle } from "./storyPrimitives";

const ORIGEN_CARTAGO = "ORI-CARTAGO";

interface Ruta {
  id: string;
  titulo: string;
  descripcion: string;
  entregas: number;
  /**
   * Unidades, para las rutas que no tienen entregas propias.
   *
   * Municipios múltiples no aparece en DESPACHO_DESTINO: un formato que
   * reparte a varios municipios se registra apuntando a cada uno, así
   * que sus enlaces ya están contados entre las entregas municipales. Lo
   * que queda bajo ese nombre son las unidades que no se pudieron
   * desagregar por municipio.
   */
  unidades: number;
  /** Color de identidad de la ruta: el óvalo y el círculo del icono. */
  color: string;
  /**
   * La versión del color que puede ir como texto sobre fondo claro.
   *
   * Va aparte y no se calcula porque los cuatro colores no se comportan
   * igual: el cyan #22ABE2 contrasta 2.4 a 1 contra el fondo de la
   * sección y el naranja #E2690E, 3.2 a 1, así que como rótulo se
   * volverían ilegibles. Estas variantes conservan el tono y pasan de 5
   * a 1. El óvalo y el círculo se quedan con el color vivo: ahí el color
   * es un fondo, no un soporte de lectura.
   */
  tinta: string;
  icono: typeof Building2;
}

export function BalanceFinal() {
  const op = useOperacion();
  const { data: ayuda } = useAyuda();

  const cartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO);
  const entregasCartago = cartago?.entregas ?? 0;

  // Los canales que la API conoce. Si la ruta no responde, se usa el
  // catálogo para no dejar la sección vacía.
  // Los grupos vienen con id estable desde el backend, así que no hay
  // que adivinar por el nombre.
  const canalesVivos = ayuda?.canales ?? [];

  const entregasDeGrupo = (id: string) =>
    canalesVivos.filter((c) => c.id === id).reduce((sum, c) => sum + c.entregas, 0);

  const multiples = entregasDeGrupo("multiples");
  const unidadesMultiples = canalesVivos
    .filter((c) => c.id === "multiples")
    .reduce((sum, c) => sum + c.unidades, 0);

  // Todo lo que no es municipio, ni Cartago, ni el agregado múltiple:
  // Cali, las entidades y lo que salió del departamento.
  // Cartago tiene su propia ruta y sale de los orígenes, así que no
  // entra acá: contarlo dos veces inflaría el total.
  const otras = canalesVivos
    .filter((c) => c.id !== "multiples" && c.id !== "cartago")
    .reduce((sum, c) => sum + c.entregas, 0);

  const rutas: Ruta[] = [
    {
      id: "municipios",
      titulo: "Municipios atendidos",
      descripcion:
        "Municipios donde fueron entregadas las ayudas a las comunidades afectadas.",
      entregas: Math.max(0, op.totalEntregas - entregasCartago),
      unidades: 0,
      color: "#0079C1",
      tinta: "#00639F",
      icono: Building2,
    },
    {
      id: "cartago",
      titulo: "Centro de distribución Cartago",
      descripcion:
        "Lugares fuera de Cali donde se recibieron y distribuyeron las ayudas.",
      entregas: entregasCartago,
      unidades: 0,
      color: "#E2690E",
      tinta: "#A34C00",
      icono: Warehouse,
    },
    {
      id: "multiples",
      titulo: "Municipios múltiples",
      descripcion: "Ruta de entrega que atendió a varios municipios.",
      entregas: multiples,
      unidades: unidadesMultiples,
      color: "#7F207F",
      tinta: "#7F207F",
      icono: Boxes,
    },
    {
      id: "otras",
      titulo: "Otras ayudas humanitarias",
      descripcion:
        "Ayudas entregadas a otros grupos de personas afectadas, sin estar asociadas a un municipio específico.",
      entregas: otras,
      unidades: 0,
      color: "#22ABE2",
      tinta: "#0F6E96",
      icono: HeartHandshake,
    },
    // Se muestra una ruta si movió entregas O unidades. Filtrar solo por
    // entregas dejaba fuera a Municipios múltiples, que no tiene enlaces
    // propios en DESPACHO_DESTINO pero sí 1.817 unidades.
  ].filter((r) => r.entregas > 0 || r.unidades > 0);

  const totalRutas = rutas.reduce((sum, r) => sum + r.entregas, 0);

  /**
   * Las ayudas recibidas van con su propia fecha porque no salen de la
   * misma fuente que las demás: es el consolidado del centro de acopio,
   * que se cierra unos días antes que el registro de despachos. Con una
   * sola banda de corte al pie, esta cifra quedaba fechada tres días
   * después de lo que realmente cubre.
   *
   * Las dos van juntas y a mano hasta que la API publique el dato; si se
   * separan, la próxima actualización cambia una y deja la otra quieta.
   */
  const RECIBIDAS = { valor: "562 t", corte: "24 de agosto de 2026" };

  const cifras = [
    { valor: RECIBIDAS.valor, label: "Ayudas recibidas", corte: RECIBIDAS.corte },
    {
      valor: `${op.totalToneladas.toLocaleString("es-CO")} t`,
      label: "Ayudas distribuidas",
      corte: op.fechaCorteLarga,
    },
    {
      valor: totalRutas.toLocaleString("es-CO"),
      label: "Despachos en total",
      corte: op.fechaCorteLarga,
    },
  ];

  /**
   * Una banda por cada grupo de cifras vecinas que comparten fecha.
   *
   * Se agrupa en vez de escribir las dos bandas a mano para que la
   * maqueta siga la fuente de los datos: el día que las recibidas pasen
   * a salir de la API con la misma fecha que el resto, las dos bandas se
   * vuelven una sola sin tocar el JSX.
   */
  const bandas = cifras.reduce<{ corte: string | null; columnas: number }[]>((acc, c) => {
    const ultima = acc[acc.length - 1];
    if (ultima && ultima.corte === c.corte) {
      ultima.columnas += 1;
      return acc;
    }
    acc.push({ corte: c.corte ?? null, columnas: 1 });
    return acc;
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <SectionTitle>Así se distribuyó la ayuda en el Valle del Cauca</SectionTitle>

      {/* Las tres cifras de cierre y, debajo, la fecha de corte. Van en
          el mismo contenedor y con una separación menor que la del resto
          de la sección: son un solo bloque, no dos. */}
      <div className="mt-9 space-y-2">
        <div className="grid gap-2 sm:grid-cols-3">
          {cifras.map((c, i) => (
            <div
              key={`cifra-${c.label}`}
              style={{ "--i": i } as CSSProperties}
              className="vc-aparece rounded-lg bg-[#123E5C] px-5 py-5 text-center sm:py-6"
            >
              <b className="block text-[clamp(1.75rem,4.5vw,2.75rem)] font-extrabold leading-none text-[#FBF8C6]">
                {c.valor}
              </b>
              <p className="mt-2 text-base font-bold text-white">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Las bandas de corte, en la misma rejilla que las tarjetas:
            cada una abarca las columnas de las cifras que fecha, así que
            se lee sin ambigüedad cuál corte aplica a cuál número. */}
        <div className="grid gap-2 sm:grid-cols-3">
          {bandas.map((b, i) =>
            b.corte ? (
              <div
                key={`corte-${b.corte}`}
                style={
                  {
                    "--i": cifras.length + i,
                    gridColumn: `span ${b.columnas}`,
                  } as CSSProperties
                }
                className="vc-aparece rounded-lg bg-[#FBF8C6] px-5 py-3.5 text-center"
              >
                <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[#00639F]">
                  Con corte al
                </span>
                <b className="mt-0.5 block text-base font-extrabold text-[#123E5C] sm:text-lg">
                  {b.corte}
                </b>
              </div>
            ) : (
              // Sin fecha no hay banda, pero el hueco se mantiene para
              // que las bandas vecinas no se corran de columna.
              <div key={`corte-vacio-${i}`} style={{ gridColumn: `span ${b.columnas}` }} />
            ),
          )}
        </div>
      </div>

      {/* Las rutas. En escritorio, una línea de tiempo: el círculo del
          centro las encadena y el hilo vertical hace leer las cuatro como
          una sola secuencia. En celular, cuatro burbujas apiladas. */}
      <ol className="relative mt-10 space-y-4 md:mt-12 md:space-y-0">
        {/* El hilo que une los círculos. Decorativo, así que se oculta a
            los lectores de pantalla. Y se oculta también en celular: ahí
            no hay círculos que unir y la línea cruzaría las burbujas por
            la mitad. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-[#0079C1]/25 md:block"
        />

        {rutas.map((r, i) => {
          const Icono = r.icono;
          const porcentaje = totalRutas > 0 ? Math.round((r.entregas / totalRutas) * 100) : 0;

          // El peso se reparte según la proporción de despachos. Una ruta
          // sin despachos propios, como Municipios múltiples, no puede
          // tener toneladas atribuidas sin inventarlas.
          const toneladas =
            op.entregasTodas > 0
              ? Math.round(r.entregas * (op.totalToneladas / op.entregasTodas))
              : 0;

          return (
            <li
              key={`ruta-${r.id}`}
              style={{ "--i": i } as CSSProperties}
              className="vc-aparece relative md:grid md:grid-cols-[1fr_4.5rem_1fr] md:items-center md:py-2.5"
            >
              {/* La burbuja. En escritorio se disuelve con `md:contents`
                  y sus tres hijos pasan a ser las celdas de la rejilla
                  de arriba, así que la tarjeta existe solo en celular
                  sin duplicar una línea de HTML. */}
              <div className="overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#123E5C]/10 md:contents">
                {/* Rótulo y óvalo. En celular se apilan; en escritorio
                    comparten línea y el `justify-between` separa el
                    rótulo, anclado a la izquierda, del óvalo, que queda
                    junto al círculo. Ese aire entre los dos es lo que
                    hace que los cuatro "Ruta n" caigan sobre el mismo
                    eje vertical: pegados al óvalo se moverían con el
                    largo de cada título. */}
                <div className="flex flex-col items-start gap-2.5 md:flex-row md:items-center md:justify-between md:gap-4 md:pr-6">
<span
  className="shrink-0 text-[clamp(1.5rem,4vw,2rem)] font-bold uppercase tracking-tight md:min-w-24"
  style={{ color: r.tinta }}
>
  Ruta {i + 1}
</span>



                  {/* En celular el óvalo ocupa todo el ancho de la
                      burbuja y se lleva el icono adentro, que es lo que
                      le da escala de burbuja.

                      En escritorio crece hasta un tope y se detiene ahí.
                      Con `flex-none` medía su contenido, y "Centro de
                      distribución Cartago" salía casi el doble de ancho
                      que "Municipios múltiples": cuatro píldoras de
                      largos distintos alineadas contra el mismo círculo
                      se leen como un error de maqueta. Como las cuatro
                      filas comparten ancho de columna, el tope las deja
                      exactamente iguales. */}
                  <div
                    className="flex w-full items-center gap-4 rounded-[1.5rem] px-5 py-4 text-white md:max-w-[24rem] md:flex-1 md:rounded-full md:px-6 md:text-right"
                    style={{ background: r.color }}
                  >
                    <span
                      aria-hidden
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20 md:hidden"
                    >
                      <Icono className="size-5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <b className="block text-lg leading-tight">{r.titulo}</b>

                      <span className="mt-2 flex flex-wrap gap-x-6 gap-y-1 md:justify-end">
                        {r.entregas > 0 ? (
                          <>
                            <span className="text-[15px] font-bold text-white/90">
                              <b className="text-base font-extrabold text-white">
                                {r.entregas.toLocaleString("es-CO")}
                              </b>{" "}
                              despachos · {porcentaje}%
                            </span>
                            <span className="text-[15px] font-bold text-white/90">
                              <b className="text-base font-extrabold text-white">
                                {toneladas.toLocaleString("es-CO")}
                              </b>{" "}
                              toneladas
                            </span>
                          </>
                        ) : (
                          <span className="text-[15px] font-bold text-white/90">
                            <b className="text-base font-extrabold text-white">
                              {r.unidades.toLocaleString("es-CO")}
                            </b>{" "}
                            unidades sin desagregar
                          </span>
                        )}
                      </span>
                    </span>
                  </div>
                </div>

                {/* El círculo del hilo. En celular no aparece: su copia
                    ya viaja dentro del óvalo. */}
                <div className="hidden justify-center md:flex">
                  <span
                    className="flex size-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white"
                    style={{ background: r.color }}
                  >
                    <Icono className="size-6" aria-hidden />
                  </span>
                </div>

                <p className="mt-3 text-[15px] leading-6 text-[#35708F] md:mt-0 md:pl-6 md:text-base">
                  {r.descripcion}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Si faltan rutas, es porque route=ayuda no respondió. Decirlo es
          mejor que mostrar un balance incompleto como si fuera completo. */}
      {canalesVivos.length === 0 && (
        <p className="mt-4 max-w-3xl rounded-md border-l-[3px] border-l-[#FFD400] bg-[#FFF8E5] p-4 text-base leading-7 text-[#6B5200]">
          Faltan las rutas de municipios múltiples y otras ayudas solidarias. Se muestran cuando el
          servicio de datos las devuelve.
        </p>
      )}
    </div>
  );
}