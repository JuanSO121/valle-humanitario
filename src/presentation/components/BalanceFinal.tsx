/**
 * BalanceFinal.tsx
 * -----------------------------------------------------------------------
 * El cierre del recorrido: cuánto se entregó, cuánto pesó y por qué
 * rutas.
 *
 * TRES CORRECCIONES EN ESTA VERSIÓN
 *
 * 1. LAS TONELADAS DE LAS RUTAS YA NO SUMAN MÁS QUE EL TOTAL.
 *
 *    Decía 582 + 56 + 146 = 784 t debajo de un titular que decía 725. El
 *    reparto dividía entre `op.entregasTodas`, que son solo las entregas
 *    con coordenada (496), mientras repartía sobre las 536 reales. Cada
 *    ruta cargaba con el peso de las que el mapa no dibuja.
 *
 *    Ahora se multiplica por `op.pesoPorEntrega`, que sale de la misma
 *    derivación que usan el podio, las zonas y la sección de canales. Un
 *    solo factor para toda la página, y las partes suman el entero.
 *
 * 2. CALI DEJA DE ESCONDERSE DENTRO DE "OTRAS AYUDAS HUMANITARIAS".
 *
 *    El filtro excluía `multiples` y `cartago` pero no `cali`, así que la
 *    capital entraba en la Ruta 4 y esa ruta declaraba 100 despachos
 *    mientras su propia tarjeta, unas secciones más abajo, decía 40. El
 *    mismo nombre con dos cifras en la misma página. Y la descripción
 *    —"sin estar asociadas a un municipio específico"— era falsa
 *    justamente para Cali.
 *
 *    Cali pasa a ser su quinta ruta, con nombre propio, igual que en la
 *    sección de canales. Las cinco siguen sin solaparse y siguen sumando
 *    exactamente las entregas del departamento.
 *
 * 3. LA CIFRA DE ARRIBA DICE QUÉ CUENTA.
 *
 *    Decía "Despachos en total" sobre un número que son enlaces
 *    despacho-destino: un formato que reparte a tres municipios aporta
 *    tres. La hoja DESPACHOS tiene 524 filas y el mapa muestra 436, así
 *    que había tres números distintos con la misma etiqueta.
 *
 * SOBRE LAS CINCO RUTAS Y POR QUÉ NO SE SOLAPAN
 *
 * Cartago es un ORIGEN, no un destino: sus entregas llegan a municipios
 * del norte. Si se listara "municipios" con el total y "Cartago" aparte,
 * esas entregas se contarían dos veces. Por eso la primera ruta es el
 * total municipal menos lo que salió de Cartago.
 *
 * Todo se deriva de la API. La lista de canales viene de route=ayuda; el
 * catálogo estático solo aporta el color, que es diseño y no dato.
 *
 * SOBRE LOS DÍAS SIN PESO REGISTRADO
 *
 * La hoja TONELADAS no siempre cubre todos los días con entregas, y
 * cuando faltan filas el total de toneladas cuenta esos días como cero.
 * La derivación los detecta y los expone en `diasSinPesoMedido`.
 *
 * Eso NO se muestra acá. Durante un momento estuvo como una nota al pie
 * del balance y fue un error: al lector de la página no le sirve saber
 * que a una hoja de cálculo le faltan filas, y no puede hacer nada al
 * respecto. Es un aviso para quien mantiene el Excel, y ese no entra por
 * la página pública. Vive en la consola, desde OperacionContext.
 *
 * SOBRE EL BLOQUE DE CIFRAS
 *
 * Las tres tarjetas son la entrada al balance, no el protagonista: abajo
 * vienen las rutas, que es donde está el detalle. Con el relleno apretado
 * y la cifra un punto más chica, el conjunto se lee como una unidad y no
 * como tres carteles.
 *
 * EN ESCRITORIO, debajo van las bandas de corte, en crema. Son dos y no
 * una porque las ayudas recibidas se consolidan en el centro de acopio
 * unos días antes que el registro de despachos: cada banda abarca las
 * columnas de las cifras que fecha, de modo que ningún número queda
 * fechado con un corte que no le corresponde.
 *
 * EN CELULAR ESE SISTEMA NO PUEDE EXISTIR, y por eso la maqueta es otra.
 *
 * Una banda fecha por posición: se entiende porque está debajo de las
 * columnas a las que pertenece. En una sola columna no hay columnas a
 * las que pertenecer, así que las dos bandas caían apiladas al final y
 * "Con corte al 3 de septiembre" parecía fechar a la última tarjeta, que
 * es justamente la que va al 7. No era que se viera apretado: la maqueta
 * decía algo falso.
 *
 * En celular cada cifra lleva su fecha adentro. Se pierde la elegancia
 * de la banda compartida y se gana que cada número diga a qué día
 * corresponde sin depender de dónde quedó en la pantalla.
 *
 * De paso la tarjeta pasa a ser horizontal: la cifra a la izquierda y el
 * rótulo a la derecha. Apiladas en vertical, tres tarjetas centradas
 * ocupaban casi dos pantallas para decir tres números, y quien llegaba
 * al final de la tercera ya no tenía a la vista la primera, que es
 * exactamente lo que un bloque de cifras comparables no puede permitirse.
 *
 * SOBRE LAS DOS MAQUETAS DE LAS RUTAS
 *
 * En escritorio la fila es una línea de tiempo: rótulo y óvalo a la
 * izquierda, círculo al centro sobre el hilo vertical, descripción a la
 * derecha. Esa composición necesita tres columnas y en un teléfono no
 * cabe. En celular cada ruta se cierra como una burbuja y se lee de
 * arriba abajo. El cambio lo hace `md:contents` en el envoltorio: en
 * escritorio ese div se disuelve y sus tres hijos pasan a ser celdas de
 * la rejilla del `li`, así que el HTML es uno solo.
 * -----------------------------------------------------------------------
 */
import { type CSSProperties } from "react";
import { Boxes, Building2, HeartHandshake, Landmark, Warehouse } from "lucide-react";
import { useOperacion } from "@/presentation/state/OperacionContext";
import { useAyuda } from "@/application/hooks/useAyuda";
import { SectionTitle } from "./storyPrimitives";

const ORIGEN_CARTAGO = "ORI-CARTAGO";

/**
 * Ayudas recibidas en el centro de acopio.
 *
 * ES EL ÚLTIMO DATO ESCRITO A MANO DE ESTA SECCIÓN, y hay que sacarlo.
 * Sale de la hoja AYUDAS RECIBIDAS del Excel, que ninguna ruta expone
 * todavía. Mientras no exista `route=ayudas-recibidas`, cada corte
 * obliga a editar este archivo.
 *
 * OJO CON LA FECHA: la hoja dice "03 Agosto de 2026" para este mismo
 * 889. Una de las dos está mal y hay que confirmarlo antes de publicar
 * otro corte. Agosto sería tres semanas antes del cierre del resto de
 * las cifras, y el 3 de agosto es anterior al terremoto.
 *
 * El valor y el corte van juntos en un objeto a propósito: separados, la
 * próxima actualización cambia uno y deja el otro quieto.
 */
const RECIBIDAS = { valor: "889 t", corte: "3 de septiembre de 2026" };

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
   * Va aparte y no se calcula porque los colores no se comportan igual:
   * el cyan #22ABE2 contrasta 2.4 a 1 contra el fondo de la sección y el
   * naranja #E2690E, 3.2 a 1, así que como rótulo se volverían
   * ilegibles. Estas variantes conservan el tono y pasan de 5 a 1. El
   * óvalo y el círculo se quedan con el color vivo: ahí el color es un
   * fondo, no un soporte de lectura.
   */
  tinta: string;
  icono: typeof Building2;
}

export function BalanceFinal() {
  const op = useOperacion();
  const { data: ayuda } = useAyuda();

  const cartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO);
  const entregasCartago = cartago?.entregas ?? 0;

  // Los canales que la API conoce. Los grupos vienen con id estable desde
  // el backend, así que no hay que adivinar por el nombre.
  const canalesVivos = ayuda?.canales ?? [];

  const canal = (id: string) => canalesVivos.find((c) => c.id === id);

  const multiples = canal("multiples");
  const cali = canal("cali");
  const otras = canal("otras-ayudas-solidarias");

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
        "Segunda bodega. Lo que sale de aquí llega a municipios del norte por una ruta propia.",
      entregas: entregasCartago,
      unidades: 0,
      color: "#E2690E",
      tinta: "#A34C00",
      icono: Warehouse,
    },
    {
      // Cali va como ruta propia y no dentro de "otras": es un municipio,
      // y meterla ahí hacía que esta sección y la de canales publicaran
      // dos cifras distintas para el mismo nombre.
      id: "cali",
      titulo: "Cali",
      descripcion:
        "La capital del departamento va por su propio canal y queda fuera del conteo por municipio.",
      entregas: cali?.entregas ?? 0,
      unidades: 0,
      color: "#7F207F",
      tinta: "#7F207F",
      icono: Landmark,
    },
    {
      id: "multiples",
      titulo: "Municipios múltiples",
      descripcion: "Ruta de entrega que atendió a varios municipios sin desagregar cuál recibió qué.",
      entregas: multiples?.entregas ?? 0,
      unidades: multiples?.unidades ?? 0,
      color: "#5CC46B",
      tinta: "#2E7D3F",
      icono: Boxes,
    },
    {
      id: "otras",
      titulo: "Otras ayudas humanitarias",
      descripcion:
        "Ayudas entregadas a entidades y a otros grupos de personas afectadas, sin estar asociadas a un municipio específico.",
      entregas: otras?.entregas ?? 0,
      unidades: otras?.unidades ?? 0,
      color: "#22ABE2",
      tinta: "#0F6E96",
      icono: HeartHandshake,
    },
    // Se muestra una ruta si movió entregas O unidades. Filtrar solo por
    // entregas dejaba fuera a Municipios múltiples, que no tiene enlaces
    // propios en DESPACHO_DESTINO pero sí sus unidades.
  ].filter((r) => r.entregas > 0 || r.unidades > 0);

  const totalRutas = rutas.reduce((sum, r) => sum + r.entregas, 0);

  const cifras = [
    { valor: RECIBIDAS.valor, label: "Ayudas recibidas", corte: RECIBIDAS.corte },
    {
      valor: `${Math.round(op.totalToneladas).toLocaleString("es-CO")} t`,
      label: "Ayudas distribuidas",
      corte: op.fechaCorteLarga,
    },
    {
      // "Entregas" y no "despachos": cada formato que reparte a varios
      // municipios aporta una entrega por cada uno. La hoja DESPACHOS
      // tiene menos filas que este número y las dos cosas son correctas.
      valor: totalRutas.toLocaleString("es-CO"),
      label: "Entregas en total",
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

      {/* CELULAR: una fila por cifra, con su fecha adentro.
          Ver la nota de cabecera sobre por qué acá no hay bandas. */}
      <div className="mt-9 space-y-2 sm:hidden">
        {cifras.map((c, i) => (
          <div
            key={`cifra-movil-${c.label}`}
            style={{ "--i": i } as CSSProperties}
            className="vc-aparece flex items-center gap-4 rounded-lg bg-[#123E5C] px-4 py-3.5"
          >
            {/* Ancho mínimo para que los tres rótulos arranquen en el
                mismo eje. Sin él, "536" deja el suyo cuarenta píxeles a
                la izquierda del de "889 t" y las tres filas se leen como
                tres tarjetas sueltas en vez de como una tabla. */}
            <b className="min-w-[5rem] shrink-0 text-[1.75rem] font-extrabold leading-none tabular-nums text-[#FBF8C6]">
              {c.valor}
            </b>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold leading-tight text-white">
                {c.label}
              </span>
              {c.corte && (
                <span className="mt-1 block text-[13px] leading-tight text-[#A8CFE2]">
                  Con corte al {c.corte}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* ESCRITORIO: la rejilla de tres y, debajo, las bandas de corte.
          Van en el mismo contenedor y con una separación menor que la del
          resto de la sección: son un solo bloque, no dos. */}
      <div className="mt-9 hidden space-y-2 sm:block">
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

        <div className="grid gap-2 sm:grid-cols-3">
          {bandas.map((b, i) =>
            b.corte ? (
              <div
                key={`corte-${b.corte}`}
                style={
                  { "--i": cifras.length + i, gridColumn: `span ${b.columnas}` } as CSSProperties
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
              <div key={`corte-vacio-${i}`} style={{ gridColumn: `span ${b.columnas}` }} />
            ),
          )}
        </div>
      </div>

      {/* Las rutas. En escritorio, una línea de tiempo: el círculo del
          centro las encadena y el hilo vertical hace leer todas como una
          sola secuencia. En celular, burbujas apiladas. */}
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

          // El mismo factor que usan el podio, las zonas y la sección de
          // canales. Una ruta sin entregas propias, como Municipios
          // múltiples, no puede tener toneladas atribuidas sin
          // inventarlas, y por eso muestra sus unidades en su lugar.
          const toneladas = Math.round(r.entregas * op.pesoPorEntrega);

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
                    junto al círculo. Ese aire es lo que hace que todos
                    los "Ruta n" caigan sobre el mismo eje vertical:
                    pegados al óvalo se moverían con el largo de cada
                    título. */}
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
                      que "Cali": píldoras de largos distintos alineadas
                      contra el mismo círculo se leen como un error de
                      maqueta. Como todas las filas comparten ancho de
                      columna, el tope las deja exactamente iguales. */}
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
                              entregas · {porcentaje}%
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
                              {Math.round(r.unidades).toLocaleString("es-CO")}
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
          mejor que mostrar un balance incompleto como si fuera completo.
          El texto no nombra rutas concretas: la condición se cumple
          cuando faltan TODAS, y nombrar dos hacía buscar un problema de
          catálogo donde había un fallo de red. */}
      {canalesVivos.length === 0 && (
        <p className="mt-4 max-w-3xl rounded-md border-l-[3px] border-l-[#FFD400] bg-[#FFF8E5] p-4 text-base leading-7 text-[#6B5200]">
          El detalle por ruta no está disponible en este momento. Aparece apenas el servicio de
          datos responde; si persiste, recargue la página.
        </p>
      )}
    </div>
  );
}