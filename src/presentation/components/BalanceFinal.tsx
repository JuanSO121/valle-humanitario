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
 * -----------------------------------------------------------------------
 */
import { type CSSProperties } from "react";
import { Boxes, Building2, HeartHandshake, Warehouse } from "lucide-react";
import { useOperacion } from "@/presentation/state/OperacionContext";
import { useAyuda } from "@/application/hooks/useAyuda";
import { SectionLabel, SectionTitle } from "./storyPrimitives";

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
  color: string;
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
      icono: Building2,
    },
    {
      id: "cartago",
      titulo: "Centro de distribución Cartago",
      descripcion:
        "Lugares fuera de Cali donde se recibieron y distribuyeron las ayudas.",
      entregas: entregasCartago,
      unidades: 0,
      color: "#F0801E",
      icono: Warehouse,
    },
    {
      id: "multiples",
      titulo: "Municipios múltiples",
      descripcion: "Ruta de entrega que atendió a varios municipios.",
      entregas: multiples,
      unidades: unidadesMultiples,
      color: "#8375A9",
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
      icono: HeartHandshake,
    },
    // Se muestra una ruta si movió entregas O unidades. Filtrar solo por
    // entregas dejaba fuera a Municipios múltiples, que no tiene enlaces
    // propios en DESPACHO_DESTINO pero sí 1.817 unidades.
  ].filter((r) => r.entregas > 0 || r.unidades > 0);

  const totalRutas = rutas.reduce((sum, r) => sum + r.entregas, 0);

  const cifras = [
    { valor: totalRutas.toLocaleString("es-CO"), label: "despachos en total" },
    {
      valor: `${op.totalToneladas.toLocaleString("es-CO")} t`,
      label: "de ayuda distribuida",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <SectionLabel>Balance a la fecha</SectionLabel>
      <SectionTitle>Así se distribuyó la ayuda en el Valle del Cauca</SectionTitle>

      {/* Las tres cifras de cierre. */}
      <div className="mt-9 grid gap-4 sm:grid-cols-3">
        {cifras.map((c, i) => (
          <div
            key={`cifra-${c.label}`}
            style={{ "--i": i } as CSSProperties}
            className="vc-aparece rounded-lg bg-[#123E5C] p-7 text-center"
          >
            <b className="block text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-none text-[#FBF8C6]">
              {c.valor}
            </b>
            <p className="mt-3 text-base text-white sm:text-lg">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Las rutas, una por fila. El círculo del centro las encadena, como
          en la referencia de diseño: la línea vertical que lo atraviesa
          hace leer las cuatro como una sola secuencia. */}
      <ol className="relative mt-10">
        {/* La línea que une los círculos. Decorativa, así que se oculta a
            los lectores de pantalla. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-[2.25rem] w-px bg-[#0079C1]/25 md:left-1/2 md:-translate-x-1/2"
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
              className="vc-aparece relative grid grid-cols-[4.5rem_1fr] items-center gap-4 py-2.5 md:grid-cols-[1fr_4.5rem_1fr] md:gap-0"
            >
              {/* Bloque de color con el título. En escritorio va a la
                  izquierda del círculo; en celular pasa a la derecha,
                  debajo del anterior, porque dos columnas de texto en un
                  teléfono no se leen. */}
              <div className="order-2 md:order-1 md:pr-6">
                <div
                  className="rounded-full px-6 py-4 text-white md:text-right"
                  style={{ background: r.color }}
                >
                  <b className="block text-lg leading-tight">{r.titulo}</b>

                  <span className="mt-2 flex flex-wrap gap-x-6 gap-y-1 md:justify-end">
                    {r.entregas > 0 ? (
                      <>
                        <span className="text-[15px] text-white/85">
                          <b className="text-base font-extrabold text-white">
                            {r.entregas.toLocaleString("es-CO")}
                          </b>{" "}
                          despachos · {porcentaje}%
                        </span>
                        <span className="text-[15px] text-white/85">
                          <b className="text-base font-extrabold text-white">
                            {toneladas.toLocaleString("es-CO")}
                          </b>{" "}
                          toneladas
                        </span>
                      </>
                    ) : (
                      <span className="text-[15px] text-white/85">
                        <b className="text-base font-extrabold text-white">
                          {r.unidades.toLocaleString("es-CO")}
                        </b>{" "}
                        unidades sin desagregar
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* El círculo con el icono. */}
              <div className="order-1 flex justify-center md:order-2">
                <span
                  className="flex size-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white"
                  style={{ background: r.color }}
                >
                  <Icono className="size-6" aria-hidden />
                </span>
              </div>

              <p className="order-3 col-span-2 text-base leading-6 text-[#35708F] md:col-span-1 md:pl-6">
                {r.descripcion}
              </p>
            </li>
          );
        })}
      </ol>

      <p className="mt-8 max-w-3xl text-base leading-7 text-[#6B93AA]">
        Las rutas suman el total sin repetir despachos. Municipios múltiples se mide en unidades
        porque sus despachos ya están contados en cada municipio que recibió. Las toneladas son una
        estimación: el peso se registra por día y para todo el departamento, no por cada envío.
      </p>

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