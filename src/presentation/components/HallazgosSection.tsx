/**
 * HallazgosSection.tsx, Nivel 8, "¿Qué nos están diciendo los datos?"
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
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#81C8EC]">
        Conclusiones
      </p>
      <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.12] text-white md:text-5xl">
        Lo que muestran los datos
      </h2>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[#BBD6E6]">
        Ocho lecturas sobre cómo se movió la ayuda en el departamento.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hallazgos.map((h) => (
          <article
            key={h.titulo}
            className="rounded-lg border border-white/12 border-l-[3px] bg-white/[0.055] p-6"
            style={{ borderLeftColor: EJE_COLOR[h.eje] }}
          >
            <span
              className="text-[13px] font-bold uppercase tracking-[0.12em]"
              style={{ color: EJE_COLOR[h.eje] }}
            >
              {EJE_ETIQUETA[h.eje]}
            </span>
            <h3 className="mt-2.5 font-serif text-2xl leading-[1.2] text-white">{h.titulo}</h3>
            <p className="mt-3 text-lg leading-[1.6] text-[#D7EDF8]">{h.texto}</p>
          </article>
        ))}
      </div>

      <p className="mt-12 max-w-3xl text-base leading-7 text-[#9DB4C2]">
        La información llega hasta el 25 de agosto de 2026. Estas cifras muestran las ayudas que se
        entregaron. No miden cuánta ayuda necesita cada municipio.
      </p>
    </div>
  );
}