/**
 * MovimientoExtras.tsx
 * -----------------------------------------------------------------------
 * Tarjetas de jornada y municipios nuevos. Las tarjetas se calculan desde
 * la API, incluida la glosa de cada una. Antes la cifra venía de un
 * archivo y el texto estaba escrito en el JSX, así que al cambiar los
 * datos las tarjetas seguían nombrando el día equivocado.
 */
import { useOperacion } from "@/presentation/state/OperacionContext";

const ORIGEN_CARTAGO = "ORI-CARTAGO";

/**
 * Las dos versiones de la pieza "Así avanzó la ruta".
 *
 * REVISAR QUE LOS NOMBRES COINCIDAN CON LOS ARCHIVOS REALES de
 * `public/marca/`. El de escritorio es una suposición: en la conversación
 * solo quedó nombrado el de celular.
 *
 * Se recomienda renombrar los dos sin tildes ni mayúsculas. Una eñe o una
 * tilde en una URL obliga al navegador a codificarla, y hay servidores
 * estáticos que sirven mal esas rutas al pasar de Windows a Linux en el
 * despliegue: es un fallo que aparece solo en producción.
 */
const PIEZA_ESCRITORIO = "/marca/Así_avanzó_la_ruta.jpg";
const PIEZA_MOVIL = "/marca/Así_avanzó_la_ruta_celular.jpg";

/** Medidas reales del archivo de celular, ya verificadas. */
const MOVIL_ANCHO = 812;
const MOVIL_ALTO = 1738;

export function MovimientoStatCards() {
  const op = useOperacion();
  const primeras48 = op.jornadas.slice(0, 2).reduce((sum, j) => sum + j.entregas, 0);
  const porcentaje48 =
    op.totalEntregas > 0 ? Math.round((primeras48 / op.totalEntregas) * 100) : 0;
  const promedio =
    op.diasConEntrega > 0 ? (op.totalEntregas / op.diasConEntrega).toFixed(1) : "0";
  const cartago = op.entregasPorOrigen.find((o) => o.origenId === ORIGEN_CARTAGO);

  const tarjetas = [
    op.picoEntregas && {
      valor: String(op.picoEntregas.entregas) + " - Entregas",
      //subtitulo: ` - Entregas.`, debe ser pequeño es mas una alclaracion y toca ver como acomodarlo para no ser redundante
      label: "Día con más entregas",
      nota: `El ${Number(op.picoEntregas.dia)} de agosto, hacia ${op.picoEntregas.municipios} municipios.`,
      color: "#F0801E",
    },
    op.picoCobertura && {
      valor: String(op.picoCobertura.municipios) + " - Municipios",
      label: "Día con más municipios atendidos",
      nota: `El ${Number(op.picoCobertura.dia)} de agosto.`,
      color: "#5CC46B",
    },
    {
      valor: `${porcentaje48}%`,
      label: "Salió en las primeras 48 horas",
      nota: `${primeras48} entregas en los dos primeros días.`,
      color: "#FFD400",
    },
    cartago && {
      valor: String(cartago.entregas),
      label: "Entregas desde Cartago",
      nota: `Segundo centro de acopio, hacia ${cartago.municipios} municipios.`,
      color: "#B57BB5",
    },
  ].filter(Boolean) as Array<{ valor: string; label: string; nota: string; color: string }>;
  if (tarjetas.length === 0) return null;
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tarjetas.slice(0, 4).map((c) => (
        <div
          key={c.label}
          className="rounded-md border-l-4 bg-[#0079C1] p-5"
          style={{ borderLeftColor: c.color }}
        >
          <div className="text-3xl font-extrabold leading-none text-[#FBF8C6]">{c.valor}</div>
          <p className="mt-2 text-base font-bold uppercase tracking-[0.06em] text-white/85">
            {c.label}
          </p>
          <p className="mt-1.5 text-base leading-6 text-white">{c.nota}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * "Así avanzó la ruta".
 *
 * ESCRITORIO: la pieza completa, con titular, camión y los bloques por
 * jornada ya compuestos adentro. La lista en código desaparece de la
 * vista, porque estaba diciendo dos veces lo mismo: la captura del
 * problema mostraba los municipios dentro de la imagen y otra vez al
 * lado.
 *
 * CELULAR: la pieza de celular, que trae el titular y el camión pero no
 * los bloques, más la lista en código debajo.
 *
 * LO QUE CUESTA ESTA DECISIÓN
 *
 * En escritorio los nombres de municipio dejan de venir de route=flujos y
 * pasan a estar quemados en un JPG. Hoy van 39 de 41 municipios: si la
 * ruta llega a los dos que faltan y alguien los carga al Excel, el
 * celular va a mostrar el municipio nuevo y el escritorio no. Cada vez
 * que cambien las jornadas hay que reexportar la pieza.
 *
 * Por eso la lista NO se borra en escritorio: se vuelve `sr-only`. Sigue
 * en el documento con los datos vivos, así que un lector de pantalla y un
 * buscador leen lo correcto aunque el ojo vea la imagen. Y si algún día
 * se vuelve al bloque en código, es quitar una clase.
 *
 * Las dos imágenes van con `alt` vacío por lo mismo: el contenido real ya
 * está en el <h3> y en la lista, y repetirlo haría que se anuncie dos
 * veces.
 */
export function MunicipiosNuevosCallouts() {
  const { jornadas } = useOperacion();
  const conNuevos = jornadas.filter((j) => j.nuevos > 0);
  if (conNuevos.length === 0) return null;

  return (
    <div>
      {/* El titular vive en las dos imágenes, así que acá va solo para el
          árbol del documento. Sin él, la sección no tiene encabezado: un
          lector de pantalla saltaría de "Momentos Clave" directo a la
          lista de fechas, y el buscador tampoco vería el título. */}
      <h3 className="sr-only">Así avanzó la ruta</h3>

      {/* TODO: agregar `width` y `height` con las medidas reales de este
          archivo, como tiene la versión de celular. Sin ellas el
          navegador no conoce la proporción hasta que la imagen baja, y la
          sección salta cuando aparece. */}
      <img
        src={PIEZA_ESCRITORIO}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="hidden h-auto w-full lg:block"
      />

      <img
        src={PIEZA_MOVIL}
        alt=""
        aria-hidden
        width={MOVIL_ANCHO}
        height={MOVIL_ALTO}
        loading="lazy"
        decoding="async"
        className="h-auto w-full lg:hidden"
      />

      {/* `lg:sr-only` y no `lg:hidden`: en escritorio la lista sale de la
          vista pero se queda en el documento, con los nombres que
          devuelve la API. `mt-6` no molesta cuando está oculta, porque
          `sr-only` la saca del flujo. */}
      <ol className="mt-6 flex flex-col gap-3 lg:sr-only">
        {conNuevos.map((j, i) => {
          const enCrema = i % 2 === 1;
          return (
            <li
              key={j.fecha}
              className={`rounded-md p-5 ${
                enCrema ? "bg-[#ffffff] text-[#0079C1]" : "bg-[#0079C1] text-[#FBF8C6]"
              }`}
            >
              <p className="text-lg font-bold">
                {Number(j.dia)} de agosto / +{j.nuevos}{" "}
                {j.nuevos === 1 ? "municipio" : "municipios"}
              </p>
              <p className="mt-1.5 text-lg leading-7 font-medium">
                {j.nombresNuevos.join(", ")}.
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}