/**
 * ContratacionSection.tsx — "La contratación de la reconstrucción"
 * -----------------------------------------------------------------------
 * Última sección del tablero: los contratos celebrados para atender la
 * emergencia, en una tabla de cinco columnas, en este orden:
 *
 *   Dependencia contratante · Objeto · Valor inicial · Contratista ·
 *   Enlace de publicación en SECOP
 *
 * Se alimenta de una base distinta a la del resto del tablero (hoja
 * CONTRATACION). El enlace abre en otra pestaña y el valor se muestra en
 * pesos.
 *
 * TABLA EN ESCRITORIO, FICHAS EN CELULAR
 *
 * Una tabla de cinco columnas con objetos de cinco líneas no cabe a
 * 360 px sin scroll horizontal. Desde `md` es una <table> real; debajo,
 * cada contrato es una ficha con los mismos cinco datos y las mismas
 * etiquetas.
 *
 * LO QUE NO SE MUESTRA, A PROPÓSITO
 *
 * · Un valor sin informar no aparece como $0: dice «No informado». Cero
 *   sería una afirmación.
 * · El total suma solo lo informado y, si hay contratos sin valor, lo
 *   dice al lado. Un total que parece completo y no lo es engaña.
 * · No hay fecha: la hoja no la trae y `actualizadoEn` es la hora en que
 *   el backend armó la respuesta, no la de los contratos.
 *
 * Sin contratos (hoja vacía o aún no creada) o con la consulta caída, la
 * sección no se dibuja.
 * -----------------------------------------------------------------------
 */
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { useContratacion } from "@/application/hooks/useContratacion";
import type { Contrato } from "@/domain/entities";
import { pesos } from "@/lib/formato";
import { Aviso, Banda, Resaltado, SectionIntro, SectionTitle } from "./storyPrimitives";

/** Cuántos contratos se ven antes de pedir «Ver todos». */
const VISIBLES = 8;

const NO_INFORMADO = "No informado";

export function ContratacionSection() {
  const { data } = useContratacion();
  const [verTodos, setVerTodos] = useState(false);

  if (!data || data.contratos.length === 0) return null;

  const { contratos, totalContratos, valorTotalInformado, sinValorInformado } = data;
  const visibles = verTodos ? contratos : contratos.slice(0, VISIBLES);
  const conValor = totalContratos - sinValorInformado;

  return (
    <section id="contratacion" className="vc-seccion bg-[#F2FAFD]">
      <Banda tono="cyan" primera>
        <SectionTitle tono="cyan">
          Contratos de la <Resaltado variante="crema">emergencia</Resaltado>
        </SectionTitle>
        <SectionIntro tono="cyan">
          {totalContratos === 1
            ? "Un contrato celebrado"
            : `${totalContratos} contratos celebrados`}
          {conValor > 0 && (
            <>
              {" "}
              por <b className="text-white">{pesos(valorTotalInformado)}</b>
              {sinValorInformado > 0 &&
                `, sin contar ${
                  sinValorInformado === 1
                    ? "un contrato sin valor informado"
                    : `${sinValorInformado} contratos sin valor informado`
                }`}
            </>
          )}
          . Cada uno enlaza a su publicación en SECOP.
        </SectionIntro>
      </Banda>

      <Banda tono="hueso">
        {/* Escritorio: tabla. */}
        <div className="hidden overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-[#123E5C]/10 md:block">
          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">
              Contratos celebrados para la atención de la emergencia
            </caption>
            <thead className="bg-[#0079C1] text-white">
              <tr className="text-[13px] font-bold uppercase tracking-[0.08em]">
                <th scope="col" className="w-[17%] px-4 py-3">
                  Dependencia contratante
                </th>
                <th scope="col" className="w-[34%] px-4 py-3">
                  Objeto
                </th>
                <th scope="col" className="w-[14%] px-4 py-3">
                  Valor inicial
                </th>
                <th scope="col" className="w-[17%] px-4 py-3">
                  Contratista
                </th>
                <th scope="col" className="w-[18%] px-4 py-3">
                  Enlace de publicación en SECOP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#123E5C]/10 align-top text-[15px] leading-6 text-[#123E5C]">
              {visibles.map((c) => (
                <tr key={c.id}>
                  <td className="break-words px-4 py-4">{c.dependencia ?? NO_INFORMADO}</td>
                  <td className="break-words px-4 py-4">{c.objeto}</td>
                  <td className="px-4 py-4 font-bold tabular-nums">
                    {c.valorInicial !== null ? pesos(c.valorInicial) : NO_INFORMADO}
                  </td>
                  <td className="break-words px-4 py-4">{c.contratista ?? NO_INFORMADO}</td>
                  <td className="px-4 py-4">
                    <EnlaceSecop contrato={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Celular: una ficha por contrato, con las mismas cinco etiquetas. */}
        <ul className="space-y-3 md:hidden" aria-label="Contratos celebrados">
          {visibles.map((c) => (
            <li key={c.id} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-[#123E5C]/10">
              <dl className="space-y-3 text-[15px] leading-6 text-[#123E5C]">
                <Dato etiqueta="Dependencia contratante">{c.dependencia ?? NO_INFORMADO}</Dato>
                <Dato etiqueta="Objeto">
                  <ObjetoCorto texto={c.objeto} />
                </Dato>
                <Dato etiqueta="Valor inicial">
                  <b className="tabular-nums">
                    {c.valorInicial !== null ? pesos(c.valorInicial) : NO_INFORMADO}
                  </b>
                </Dato>
                <Dato etiqueta="Contratista">{c.contratista ?? NO_INFORMADO}</Dato>
                <Dato etiqueta="Enlace de publicación en SECOP">
                  <EnlaceSecop contrato={c} />
                </Dato>
              </dl>
            </li>
          ))}
        </ul>

        {contratos.length > VISIBLES && (
          <button
            type="button"
            onClick={() => setVerTodos((v) => !v)}
            aria-expanded={verTodos}
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#0079C1] px-6 text-base font-bold text-white hover:bg-[#123E5C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1]"
          >
            {verTodos ? "Ver menos" : `Ver los ${contratos.length} contratos`}
          </button>
        )}

        <div className="mt-8">
          <Aviso>
            Valor inicial de cada contrato, sin adiciones ni modificaciones posteriores. Para ver su
            estado actual, consulte la publicación en SECOP.
          </Aviso>
        </div>
      </Banda>
    </section>
  );
}

/** En el celular el objeto puede tener diez líneas: se muestra recortado y se abre con un toque. */
function ObjetoCorto({ texto }: { texto: string }) {
  const [abierto, setAbierto] = useState(false);
  const largo = texto.length > 220;
  return (
    <>
      <span className={largo && !abierto ? "line-clamp-4" : undefined}>{texto}</span>
      {largo && (
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="mt-1 flex min-h-11 items-center text-[15px] font-semibold text-[#0079C1] underline underline-offset-4"
        >
          {abierto ? "Ver menos" : "Ver completo"}
        </button>
      )}
    </>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#35708F]">
        {etiqueta}
      </dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

function EnlaceSecop({ contrato: c }: { contrato: Contrato }) {
  if (!c.enlaceSecop) return <span className="text-[#35708F]">{NO_INFORMADO}</span>;
  return (
    <a
      href={c.enlaceSecop}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 font-bold text-[#0079C1] underline underline-offset-4 hover:text-[#123E5C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0079C1]"
    >
      Ver en SECOP
      <ExternalLink aria-hidden className="size-4" />
      <span className="sr-only"> (se abre en otra pestaña)</span>
    </a>
  );
}
