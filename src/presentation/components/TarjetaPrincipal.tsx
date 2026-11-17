/**
 * TarjetaPrincipal.tsx
 * -----------------------------------------------------------------------
 * La tarjeta azul marino con rótulo amarillo, cifras en crema y texto
 * claro: la que en el diseño original presentaba «Ruta principal · Cali» y
 * «Ruta principal · Centro de distribución Cartago». Se reutiliza para lo
 * que NO es un municipio (municipios múltiples, otras ayudas, traslados) y
 * para los puntos de distribución, de modo que todo lo que "se sale de la
 * lista de municipios" se vea igual que antes.
 *
 * Es de presentación pura: no sabe de dónde vienen las cifras.
 * -----------------------------------------------------------------------
 */
import type { CSSProperties, ReactNode } from "react";

interface Cifra {
  valor: string;
  etiqueta: string;
}

interface Props {
  /** Rótulo pequeño en amarillo y mayúsculas. Sin él, la tarjeta lleva solo el titular. */
  rotulo?: string;
  /** Titular en Agenda ExtraCondensed, color crema. */
  titulo: string;
  texto?: ReactNode;
  cifras?: Cifra[];
  /** Color de la franja fina bajo el rótulo, para distinguir tarjetas hermanas. */
  acento?: string | undefined;
  /** Contenido libre debajo (listas, avisos). */
  children?: ReactNode;
  /** Para la entrada escalonada `vc-aparece`. */
  indice?: number;
  /** Menos relleno: para tarjetas que solo llevan un nombre. */
  compacta?: boolean;
}

export function TarjetaPrincipal({
  rotulo,
  titulo,
  texto,
  cifras,
  acento,
  children,
  indice = 0,
  compacta = false,
}: Props) {
  return (
    <article
      style={{ "--i": indice } as CSSProperties}
      className={`vc-aparece rounded-lg bg-[#123E5C] ${compacta ? "p-5 sm:p-6" : "p-6 sm:p-8"}`}
    >
      {rotulo && (
        <p className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#FFD400]">
          {rotulo}
        </p>
      )}
      {acento && (
        <i
          aria-hidden
          className="mt-2 block h-1 w-10 rounded-full"
          style={{ background: acento }}
        />
      )}
      <h3
        className={`vc-titular text-[clamp(1.6rem,3.4vw,2.4rem)] leading-tight text-[#FBF8C6] ${rotulo || acento ? "mt-3" : ""}`}
      >
        {titulo}
      </h3>
      {texto && <p className="mt-2 text-base leading-7 text-[#CFEAF7]">{texto}</p>}

      {cifras && cifras.length > 0 && (
        <dl className="mt-6 flex flex-wrap gap-x-9 gap-y-4">
          {cifras.map((c) => (
            <div key={c.etiqueta}>
              <dd className="text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold leading-none tabular-nums text-[#FBF8C6]">
                {c.valor}
              </dd>
              <dt className="mt-1.5 text-base text-[#C9E4F2]">{c.etiqueta}</dt>
            </div>
          ))}
        </dl>
      )}

      {children}
    </article>
  );
}
