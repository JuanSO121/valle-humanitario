/**
 * HallazgosSection.tsx — Nivel 8, "¿Qué nos están diciendo los datos?"
 * -----------------------------------------------------------------------
 * Cierre del recorrido. El color del borde codifica de qué nivel viene
 * cada lectura, así que funciona como índice inverso: dice dónde volver
 * a verificarla.
 * -----------------------------------------------------------------------
 */
import { EJE_COLOR, EJE_ETIQUETA, hallazgos } from "@/presentation/data/hallazgosData";

export function HallazgosSection() {
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#81C8EC]">
        Lectura ejecutiva
      </p>
      <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.12] text-white md:text-5xl">
        Diez lecturas que no se ven en la cifra total
      </h2>
      <p className="mt-4 max-w-2xl text-[15.5px] leading-7 text-[#BBD6E6]">
        Cada una sale de un cruce concreto de las fuentes. Ninguna es una impresión.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hallazgos.map((h) => (
          <article
            key={h.titulo}
            className="rounded-lg border border-white/12 border-l-[3px] bg-white/[0.055] p-6"
            style={{ borderLeftColor: EJE_COLOR[h.eje] }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-[0.13em]"
              style={{ color: EJE_COLOR[h.eje] }}
            >
              {EJE_ETIQUETA[h.eje]}
            </span>
            <h3 className="mt-2.5 font-serif text-[19px] leading-[1.24] text-white">{h.titulo}</h3>
            <p className="mt-3 text-[13.6px] leading-[1.62] text-[#D7EDF8]">{h.texto}</p>
          </article>
        ))}
      </div>

      <p className="mt-12 max-w-3xl text-[13px] leading-7 text-[#9DB4C2]">
        Cuatro fuentes con cortes distintos alimentan este tablero: la matriz de despachos y el censo
        del Drive cierran el 25 de agosto, la base de ítems el 24 y los requerimientos del PMU el 21.
        No existe una línea base de necesidad por municipio, así que{" "}
        <b className="text-[#D7EDF8]">esto mide la respuesta, no su suficiencia</b>.
      </p>
    </div>
  );
}