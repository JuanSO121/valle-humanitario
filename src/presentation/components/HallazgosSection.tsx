/**
 * HallazgosSection.tsx — "Lo que muestran los datos"
 * -----------------------------------------------------------------------
 * Cierre del recorrido. Cada lectura se CALCULA de las rutas del backend
 * (ver data/hallazgosData.ts): nada de lo que dice está escrito a mano.
 * El color del borde indica de qué trata cada lectura.
 *
 * Incluye, sin esconderla, la lectura sobre el peso «por verificar»: una
 * parte de las cifras del tablero depende de registros que el propio
 * Excel marca con dudas, y quien lee tiene que saberlo.
 * -----------------------------------------------------------------------
 */
import type { CSSProperties } from "react";
import { useCategorias, useMunicipios, useOtras, useResumen } from "@/application/hooks/useTablero";
import { fechaLarga } from "@/lib/formato";
import { EJE_COLOR, EJE_ETIQUETA, hallazgosDe } from "@/presentation/data/hallazgosData";

export function HallazgosSection() {
  const { data: resumen } = useResumen();
  const { data: municipios } = useMunicipios();
  const { data: categorias } = useCategorias();
  const { data: otras } = useOtras();

  if (!resumen || !resumen.disponible || !municipios || !municipios.disponible) return null;

  const hallazgos = hallazgosDe({
    resumen,
    municipios: municipios.municipios,
    categorias: categorias && categorias.disponible ? categorias : null,
    otras: otras && otras.disponible ? otras : null,
  });
  if (hallazgos.length === 0) return null;

  return (
    <section
      id="hallazgos"
      className="vc-seccion flex min-h-dvh flex-col justify-center bg-[#123E5C] px-4 py-14 sm:px-6 sm:py-16 md:px-10"
    >
      <div className="mx-auto w-full max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#22ABE2]">Conclusiones</p>
        <h2 className="vc-titular mt-3 max-w-3xl text-[clamp(1.75rem,5.5vw,3.25rem)] text-[#FBF8C6]">
          Lo que muestran los datos
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#CFEAF7]">
          {hallazgos.length} datos clave de cómo se movió la ayuda.
        </p>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {hallazgos.map((h, i) => (
            <li
              key={h.titulo}
              style={{ "--i": i } as CSSProperties}
              className="vc-aparece flex flex-col rounded-xl bg-white/[0.06] p-5 ring-1 ring-white/10"
            >
              <span
                className="text-[12px] font-bold uppercase tracking-[0.14em]"
                style={{ color: EJE_COLOR[h.eje] }}
              >
                {EJE_ETIQUETA[h.eje]}
              </span>
              <b className="vc-titular mt-2 block normal-case text-[clamp(2.5rem,4.2vw,3.5rem)] leading-none text-[#FBF8C6]">
                {h.cifra}
              </b>
              {h.parte !== undefined && (
                <span
                  aria-hidden
                  className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/12"
                >
                  <i
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(3, Math.round(h.parte * 100))}%`,
                      background: EJE_COLOR[h.eje],
                    }}
                  />
                </span>
              )}
              <h3 className="mt-3 text-lg font-bold leading-snug text-white">{h.titulo}</h3>
              <p className="mt-1.5 text-[15px] leading-6 text-[#B9DDEE]">{h.texto}</p>
            </li>
          ))}
        </ul>

        <p className="mt-8 max-w-3xl text-base leading-7 text-[#C9E4F2]">
          {resumen.corte ? `La información llega hasta el ${fechaLarga(resumen.corte)}. ` : ""}
          Estas cifras muestran las ayudas que se entregaron. No miden cuánta ayuda necesita cada
          municipio.
        </p>
      </div>
    </section>
  );
}
