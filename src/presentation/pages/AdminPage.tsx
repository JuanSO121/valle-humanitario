/**
 * AdminPage.tsx — /admin, «Cargar datos al tablero»
 * -----------------------------------------------------------------------
 * Página protegida por clave, sin enlaces desde el resto del sitio. La
 * persona sube el archivo de carga (lo prepara una IA a partir de la
 * plantilla del DADI), ve los datos como tabla, y solo si están bien los
 * carga al libro.
 *
 *   1. Clave        la comprueba el servidor (lib/proxyAdmin.ts).
 *   2. Archivo      un .json, o el texto pegado.
 *   3. Revisar      NO escribe nada: devuelve lo que pasaría, fila por fila.
 *   4. Cargar       escribe en el libro, tras marcar que se revisó la tabla.
 *
 * La clave solo vive en esta pantalla: no se guarda en el navegador.
 * Los textos están escritos para quien no sabe de bases de datos.
 * -----------------------------------------------------------------------
 */
import { useId, useMemo, useRef, useState } from "react";

type EstadoFila = "nueva" | "completa" | "duplicada" | "error" | "conflicto";
type Decision = "conservar" | "reemplazar" | "agregar";
type Decisiones = Record<number, Decision>;

interface ExistenteConflicto {
  fila: number;
  fecha: string;
  destino: string;
  familia: string;
  producto: string | null;
  presentacion: string | null;
  cantidad: number | null;
  kilosUnitario: number | null;
  kilosTotal: number;
}

interface FilaDistribucion {
  n: number;
  fecha: string | null;
  destino: string | null;
  familia: string | null;
  producto: string | null;
  cantidad: number | null;
  kilosUnitario?: number | null;
  kilosTotal: number | null;
  dudas: boolean;
  observaciones: string | null;
  estado: EstadoFila;
  conflicto?: { tipo: "peso" | "nombre"; existentes: ExistenteConflicto[]; total: number };
  filaLibro: number | null;
  avisos: string[];
  errores: string[];
}
interface FilaFaltante {
  n: number;
  categoria: string | null;
  elemento: string | null;
  estado: string | null;
  observaciones: string | null;
  estadoFila: "ok" | "error";
  errores: string[];
}
interface Cifra {
  antes: number | null;
  despues: number | null;
  cambia: boolean;
}
interface Plan {
  errores: string[];
  avisos: string[];
  avisosDeLaIA?: string[];
  puedeCargar: boolean;
  fuente?: string | null;
  informacionGeneral: { errores: string[]; recibidas: Cifra; inventario: Cifra } | null;
  queHaceFalta: {
    antes: number | null;
    despues: number;
    reemplaza: boolean;
    filas: FilaFaltante[];
    seQuitan?: { categoria: string; elemento: string; estado: string }[];
    seQuitanTotal?: number;
  } | null;
  distribucion: {
    filas: FilaDistribucion[];
    resumen: {
      nuevas: number;
      completan: number;
      duplicadas: number;
      conProblema: number;
      conAviso: number;
      posiblesRepetidas?: number;
      conflictos?: number;
    };
  } | null;
}
interface Resultado {
  ok: boolean;
  cargado: {
    nuevas: number;
    completadas: number;
    repetidas: number;
    conProblema: number;
    faltantes: number;
    totales: number;
  };
}

const MAX_BYTES = 2_500_000;
const POR_PAGINA = 25;
const ETIQUETA_ESTADO: Record<EstadoFila, string> = {
  nueva: "Se agrega",
  conflicto: "Conflicto: decida",
  completa: "Completa una fila pendiente",
  duplicada: "Ya está, no se repite",
  error: "No se carga",
};
const COLOR_ESTADO: Record<EstadoFila, string> = {
  nueva: "bg-[#E4F4E4] text-[#1D6B2E]",
  conflicto: "bg-[#FFE9CC] text-[#8A4B00]",
  completa: "bg-[#E7F1FB] text-[#0A5A99]",
  duplicada: "bg-[#EEF0F2] text-[#4A5A66]",
  error: "bg-[#FBEBEB] text-[#A3261F]",
};

const numero = (n: number | null) =>
  n === null || n === undefined ? "—" : n.toLocaleString("es-CO", { maximumFractionDigits: 3 });

async function llamar(
  accion: "revisar" | "aplicar",
  clave: string,
  carga: unknown,
  decisiones?: Decisiones,
) {
  const respuesta = await fetch("/api/admin", {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-clave": clave },
    body: JSON.stringify({ accion, carga, decisiones }),
  });
  let datos: { error?: boolean; message?: string } | null = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }
  if (!respuesta.ok || datos?.error) {
    throw new Error(datos?.message ?? "No se pudo completar la solicitud. Intente de nuevo.");
  }
  return datos;
}

export function AdminPage() {
  const idClave = useId();
  const idTexto = useId();
  const [clave, setClave] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [carga, setCarga] = useState<unknown>(null);
  const [fase, setFase] = useState<"inicio" | "revisando" | "revisado" | "cargando" | "listo">(
    "inicio",
  );
  const [problema, setProblema] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [decisiones, setDecisiones] = useState<Decisiones>({});
  const entradaArchivo = useRef<HTMLInputElement>(null);

  const ocupado = fase === "revisando" || fase === "cargando";

  function reiniciar() {
    setCarga(null);
    setNombreArchivo(null);
    setTexto("");
    setPlan(null);
    setResultado(null);
    setConfirmado(false);
    setDecisiones({});
    setProblema(null);
    setFase("inicio");
    if (entradaArchivo.current) entradaArchivo.current.value = "";
  }

  function leerJson(contenido: string): boolean {
    if (new TextEncoder().encode(contenido).length > MAX_BYTES) {
      setProblema("El archivo es demasiado grande. Divídalo en partes más pequeñas.");
      return false;
    }
    try {
      setCarga(JSON.parse(contenido));
      setProblema(null);
      setPlan(null);
      setConfirmado(false);
      setFase("inicio");
      return true;
    } catch {
      setCarga(null);
      setProblema("El archivo no se pudo leer. Revise que sea el archivo de carga completo.");
      return false;
    }
  }

  async function alElegirArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    setTexto("");
    leerJson(await archivo.text());
  }

  function alPegarTexto(valor: string) {
    setTexto(valor);
    setNombreArchivo(null);
    if (valor.trim() === "") {
      setCarga(null);
      setProblema(null);
      return;
    }
    leerJson(valor);
  }

  async function revisar() {
    if (!carga) return;
    setProblema(null);
    setFase("revisando");
    try {
      const datos = (await llamar("revisar", clave, carga)) as unknown as Plan;
      setPlan(datos);
      setConfirmado(false);
      setDecisiones({});
      setFase("revisado");
    } catch (e) {
      setProblema(e instanceof Error ? e.message : "No se pudo revisar el archivo.");
      setFase("inicio");
    }
  }

  async function cargar() {
    if (!carga || !plan?.puedeCargar || !confirmado) return;
    setProblema(null);
    setFase("cargando");
    try {
      const datos = (await llamar("aplicar", clave, carga, decisiones)) as unknown as Resultado;
      setResultado(datos);
      setFase("listo");
    } catch (e) {
      setProblema(e instanceof Error ? e.message : "No se pudo cargar. No se cambió nada.");
      setFase("revisado");
    }
  }

  const puedeRevisar = !!carga && clave.length > 0 && !ocupado;

  return (
    <main className="min-h-dvh bg-[#F2FAFD] px-4 py-8 text-[#123E5C] sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <header>
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#35708F]">
            Ruta de la Solidaridad · Solo para quien administra
          </p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight text-[#0079C1] sm:text-4xl">
            Cargar datos al tablero
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-6">
            Suba el archivo de la carga, revise la tabla y, si todo está bien, cárguela. Antes de
            que usted confirme, no se escribe nada en el libro.
          </p>
        </header>

        {fase === "listo" && resultado ? (
          <Listo resultado={resultado} alNuevo={reiniciar} />
        ) : (
          <>
            <section
              aria-labelledby="paso1"
              className="mt-8 rounded-xl bg-white p-5 shadow-sm sm:p-6"
            >
              <h2 id="paso1" className="text-xl font-extrabold text-[#0079C1]">
                1. Clave
              </h2>
              <label htmlFor={idClave} className="mt-3 block text-base font-semibold">
                Escriba la clave de administración
              </label>
              <input
                id={idClave}
                type="password"
                autoComplete="current-password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                disabled={ocupado}
                className="mt-1.5 block w-full max-w-sm rounded-lg border border-[#123E5C]/30 bg-white px-3 py-2.5 text-base focus:border-[#0079C1] focus:outline-none focus:ring-2 focus:ring-[#0079C1]/30"
              />
            </section>

            <section
              aria-labelledby="paso2"
              className="mt-4 rounded-xl bg-white p-5 shadow-sm sm:p-6"
            >
              <h2 id="paso2" className="text-xl font-extrabold text-[#0079C1]">
                2. Archivo de la carga
              </h2>
              <p className="mt-2 text-base leading-6">
                Es el archivo que preparó la IA con la información de la plantilla. Termina en{" "}
                <b>.json</b>.
              </p>
              <input
                ref={entradaArchivo}
                type="file"
                accept=".json,application/json"
                onChange={alElegirArchivo}
                disabled={ocupado}
                aria-label="Elegir el archivo de la carga"
                className="mt-3 block w-full text-base file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#0079C1] file:px-4 file:py-2.5 file:font-bold file:text-white hover:file:bg-[#0A5A99]"
              />
              {nombreArchivo && carga !== null && (
                <p className="mt-2 text-[15px] text-[#1D6B2E]">Archivo leído: {nombreArchivo}</p>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer text-base font-semibold text-[#0079C1]">
                  O pegue el texto de la carga aquí
                </summary>
                <label htmlFor={idTexto} className="sr-only">
                  Texto de la carga
                </label>
                <textarea
                  id={idTexto}
                  value={texto}
                  onChange={(e) => alPegarTexto(e.target.value)}
                  disabled={ocupado}
                  rows={6}
                  spellCheck={false}
                  className="mt-2 block w-full rounded-lg border border-[#123E5C]/30 bg-white p-3 font-mono text-[13px] focus:border-[#0079C1] focus:outline-none focus:ring-2 focus:ring-[#0079C1]/30"
                />
              </details>

              <button
                type="button"
                onClick={revisar}
                disabled={!puedeRevisar}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0079C1] px-6 py-2.5 text-base font-bold text-white transition-colors hover:bg-[#0A5A99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {fase === "revisando" ? "Revisando…" : "Revisar los datos"}
              </button>
            </section>

            <div aria-live="polite" className="mt-4">
              {problema && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#FBEBEB] px-4 py-3 text-base font-semibold text-[#A3261F]"
                >
                  {problema}
                </p>
              )}
            </div>

            {plan && (
              <Revision
                plan={plan}
                confirmado={confirmado}
                alConfirmar={setConfirmado}
                cargando={fase === "cargando"}
                alCargar={cargar}
                decisiones={decisiones}
                alDecidir={setDecisiones}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

// --- revisión ----------------------------------------------------------------

function Revision({
  plan,
  confirmado,
  alConfirmar,
  cargando,
  alCargar,
  decisiones,
  alDecidir,
}: {
  plan: Plan;
  confirmado: boolean;
  alConfirmar: (v: boolean) => void;
  cargando: boolean;
  alCargar: () => void;
  decisiones: Decisiones;
  alDecidir: (d: Decisiones) => void;
}) {
  const secciones = useMemo(
    () =>
      [
        (plan.distribucion?.resumen.conflictos ?? 0) > 0 && {
          id: "conflictos",
          nombre: `Conflictos (${plan.distribucion?.resumen.conflictos})`,
        },
        plan.distribucion && { id: "distribucion", nombre: "Distribución" },
        plan.queHaceFalta && { id: "faltante", nombre: "Qué hace falta" },
        plan.informacionGeneral && { id: "general", nombre: "Información general" },
      ].filter(Boolean) as { id: string; nombre: string }[],
    [plan],
  );
  const [activa, setActiva] = useState<string>(secciones[0]?.id ?? "");
  const idConfirmar = useId();

  const d = plan.distribucion?.resumen;
  const conflictos = useMemo(
    () => plan.distribucion?.filas.filter((f) => f.estado === "conflicto") ?? [],
    [plan.distribucion],
  );
  const sinDecidir = conflictos.filter((f) => !decisiones[f.n]).length;
  const aAgregar = conflictos.filter((f) => decisiones[f.n] === "agregar").length;
  const aReemplazar = conflictos.filter((f) => decisiones[f.n] === "reemplazar").length;
  const aDejar = conflictos.filter((f) => decisiones[f.n] === "conservar").length;
  const cuantas = (d?.nuevas ?? 0) + (d?.completan ?? 0) + aAgregar;
  const general = plan.informacionGeneral;
  const cifrasQueCambian =
    general && general.errores.length === 0
      ? [
          general.recibidas.cambia && general.recibidas.despues !== null
            ? `toneladas recibidas ${numero(general.recibidas.despues)}`
            : null,
          general.inventario.cambia && general.inventario.despues !== null
            ? `toneladas en inventario ${numero(general.inventario.despues)}`
            : null,
        ].filter((x): x is string => x !== null)
      : [];

  return (
    <section aria-labelledby="paso3" className="mt-4 rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <h2 id="paso3" className="text-xl font-extrabold text-[#0079C1]">
        3. Revise la tabla
      </h2>

      {plan.errores.length > 0 && (
        <ul
          role="alert"
          className="mt-3 space-y-1 rounded-xl bg-[#FBEBEB] px-4 py-3 text-base font-semibold text-[#A3261F]"
        >
          {plan.errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {plan.avisos.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-[#FFF6DA] px-4 py-3 text-base text-[#7A5A00]">
          {plan.avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      {plan.avisosDeLaIA && plan.avisosDeLaIA.length > 0 && (
        <div className="mt-3 rounded-xl bg-[#FFF6DA] px-4 py-3 text-base text-[#7A5A00]">
          <p className="font-bold">La IA que preparó el archivo dejó estas dudas:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {plan.avisosDeLaIA.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {secciones.length > 0 && (
        <>
          <div role="tablist" aria-label="Partes del archivo" className="mt-4 flex flex-wrap gap-2">
            {secciones.map((s) => (
              <button
                key={s.id}
                role="tab"
                id={`pestana-${s.id}`}
                aria-selected={activa === s.id}
                aria-controls={`panel-${s.id}`}
                type="button"
                onClick={() => setActiva(s.id)}
                className={`min-h-11 rounded-lg px-4 py-2 text-base font-bold transition-colors ${
                  activa === s.id
                    ? "bg-[#0079C1] text-white"
                    : "bg-[#E7F1FB] text-[#0A5A99] hover:bg-[#D3E7F8]"
                }`}
              >
                {s.nombre}
              </button>
            ))}
          </div>

          {plan.distribucion && activa === "conflictos" && (
            <div id="panel-conflictos" role="tabpanel" aria-labelledby="pestana-conflictos">
              <PanelConflictos filas={conflictos} decisiones={decisiones} alDecidir={alDecidir} />
            </div>
          )}
          {plan.distribucion && activa === "distribucion" && (
            <div id="panel-distribucion" role="tabpanel" aria-labelledby="pestana-distribucion">
              <TablaDistribucion datos={plan.distribucion} decisiones={decisiones} />
            </div>
          )}
          {plan.queHaceFalta && activa === "faltante" && (
            <div id="panel-faltante" role="tabpanel" aria-labelledby="pestana-faltante">
              <TablaFaltante datos={plan.queHaceFalta} />
            </div>
          )}
          {plan.informacionGeneral && activa === "general" && (
            <div id="panel-general" role="tabpanel" aria-labelledby="pestana-general">
              <TablaGeneral datos={plan.informacionGeneral} />
            </div>
          )}
        </>
      )}

      <div className="mt-6 border-t border-[#123E5C]/10 pt-5">
        <h2 className="text-xl font-extrabold text-[#0079C1]">4. Cargar al libro</h2>
        {plan.puedeCargar ? (
          <>
            <p className="mt-2 text-base leading-6">
              {cuantas > 0 && (
                <>
                  Se cargarán <b>{cuantas}</b> filas de distribución.{" "}
                </>
              )}
              {aReemplazar > 0 && (
                <>
                  Se <b>reemplazarán {aReemplazar}</b> filas que ya estaban en el libro (la anterior
                  queda guardada).{" "}
                </>
              )}
              {aDejar > 0 && <>{aDejar} conflictos se dejan como están en el libro. </>}
              {d && d.duplicadas > 0 && <>{d.duplicadas} ya estaban y no se repetirán. </>}
              {d && d.conProblema > 0 && (
                <b className="text-[#A3261F]">
                  {d.conProblema} tienen un problema y NO se cargarán.{" "}
                </b>
              )}
              {plan.queHaceFalta?.reemplaza && (
                <>La lista de «Qué hace falta» se reemplazará por la nueva. </>
              )}
              {cifrasQueCambian.length > 0 && (
                <>Se cambiarán las cifras generales: {cifrasQueCambian.join(" y ")}. </>
              )}
            </p>
            {sinDecidir > 0 && (
              <p role="alert" className="mt-3 font-bold text-[#8A4B00]">
                Faltan {sinDecidir} conflictos por decidir. Vaya a la pestaña «Conflictos» y elija
                qué hacer en cada uno.
              </p>
            )}
            <div className="mt-3 flex items-start gap-3">
              <input
                id={idConfirmar}
                type="checkbox"
                checked={confirmado}
                onChange={(e) => alConfirmar(e.target.checked)}
                disabled={cargando || sinDecidir > 0}
                className="mt-1 size-5 shrink-0 accent-[#0079C1]"
              />
              <label htmlFor={idConfirmar} className="text-base leading-6">
                Revisé la tabla y quiero cargar estos datos al libro.
              </label>
            </div>
            <button
              type="button"
              onClick={alCargar}
              disabled={!confirmado || cargando || sinDecidir > 0}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#2E9E5B] px-6 py-2.5 text-base font-bold text-white transition-colors hover:bg-[#237A46] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando ? "Cargando… no cierre esta página" : "Cargar al libro"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-base leading-6 text-[#A3261F]">
            Con este archivo no hay nada que se pueda cargar. Corrija los problemas, vuelva a
            preparar el archivo y revíselo otra vez.
          </p>
        )}
      </div>
    </section>
  );
}

// --- tablas ------------------------------------------------------------------

function Chip({ estado }: { estado: EstadoFila }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-bold ${COLOR_ESTADO[estado]}`}
    >
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

function Contenedor({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div
      // Se puede desplazar con el teclado; en el celular, hacia los lados.
      tabIndex={0}
      role="region"
      aria-label={titulo}
      className="mt-4 overflow-x-auto rounded-lg border border-[#123E5C]/10"
    >
      {children}
    </div>
  );
}

const celda = "border-b border-[#123E5C]/10 px-3 py-2.5 text-left align-top text-[15px]";
const cabecera =
  "bg-[#0079C1] px-3 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide text-white";

const TEXTO_DECISION: Record<Decision, string> = {
  conservar: "Se deja la del libro",
  reemplazar: "Se cambia por la del archivo",
  agregar: "Se agrega también",
};

function TablaDistribucion({
  datos,
  decisiones,
}: {
  datos: NonNullable<Plan["distribucion"]>;
  decisiones: Decisiones;
}) {
  const [soloAtencion, setSoloAtencion] = useState(false);
  const [pagina, setPagina] = useState(0);
  const idFiltro = useId();
  const filas = useMemo(
    () =>
      soloAtencion
        ? datos.filas.filter(
            (f) => f.estado === "error" || f.estado === "conflicto" || f.avisos.length > 0,
          )
        : datos.filas,
    [datos.filas, soloAtencion],
  );
  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas - 1);
  const visibles = filas.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA);
  const r = datos.resumen;

  return (
    <div>
      {(r.posiblesRepetidas ?? 0) > 0 && (
        <p className="mt-4 rounded-xl bg-[#FFF6DA] px-4 py-3 text-base leading-6 text-[#7A5A00]">
          <b>Cuidado: {r.posiblesRepetidas} filas pueden estar repetidas.</b> Son de días que ya
          tienen envíos en el libro, o se parecen a una fila que ya está. Si ya estaban cargadas con
          otros datos, quedarían dos veces. Búsquelas en la tabla (las que dicen «Ya hay en el
          libro…» o «Ese día ya tiene…») antes de cargar.
        </p>
      )}
      <ul className="mt-4 grid gap-2 text-base sm:grid-cols-2 lg:grid-cols-4">
        <Resumen cifra={r.nuevas} texto="se agregan" color="text-[#1D6B2E]" />
        <Resumen cifra={r.completan} texto="completan una fila pendiente" color="text-[#0A5A99]" />
        {(r.conflictos ?? 0) > 0 && (
          <Resumen
            cifra={r.conflictos ?? 0}
            texto="en conflicto, hay que decidir"
            color="text-[#8A4B00]"
          />
        )}
        <Resumen cifra={r.duplicadas} texto="ya estaban" color="text-[#4A5A66]" />
        <Resumen cifra={r.conProblema} texto="con problema, no se cargan" color="text-[#A3261F]" />
      </ul>
      <div className="mt-3 flex items-center gap-2">
        <input
          id={idFiltro}
          type="checkbox"
          checked={soloAtencion}
          onChange={(e) => {
            setSoloAtencion(e.target.checked);
            setPagina(0);
          }}
          className="size-5 accent-[#0079C1]"
        />
        <label htmlFor={idFiltro} className="text-base">
          Mostrar solo las filas con problema o aviso ({r.conProblema + r.conAviso})
        </label>
      </div>

      <Contenedor titulo="Tabla de distribución">
        <table className="w-full min-w-[820px] border-collapse">
          <caption className="sr-only">
            Filas de distribución del archivo y qué pasará con cada una
          </caption>
          <thead>
            <tr>
              {[
                "N.º",
                "Qué pasa",
                "Fecha",
                "A dónde",
                "Tipo de ayuda",
                "Producto",
                "Kilos",
                "Notas",
              ].map((t) => (
                <th key={t} scope="col" className={cabecera}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={8} className={celda}>
                  No hay filas para mostrar.
                </td>
              </tr>
            )}
            {visibles.map((f) => (
              <tr
                key={f.n}
                className={
                  f.estado === "error" ? "bg-[#FFF5F5]" : f.avisos.length ? "bg-[#FFFBEF]" : ""
                }
              >
                <td className={celda}>{f.n}</td>
                <td className={celda}>
                  <Chip estado={f.estado} />
                  {f.estado === "conflicto" && (
                    <div className="mt-1 text-[13px] font-semibold text-[#8A4B00]">
                      {decisiones[f.n] ? TEXTO_DECISION[decisiones[f.n]!] : "Sin decidir"}
                    </div>
                  )}
                  {f.filaLibro && (
                    <div className="mt-1 text-[13px] text-[#35708F]">
                      fila {f.filaLibro} del libro
                    </div>
                  )}
                </td>
                <td className={`${celda} whitespace-nowrap`}>{f.fecha ?? "—"}</td>
                <td className={celda}>{f.destino ?? "—"}</td>
                <td className={celda}>{f.familia ?? "—"}</td>
                <td className={celda}>
                  {f.producto ?? "—"}
                  {f.cantidad !== null && (
                    <div className="text-[13px] text-[#35708F]">cantidad: {numero(f.cantidad)}</div>
                  )}
                </td>
                <td className={`${celda} tabular-nums`}>{numero(f.kilosTotal)}</td>
                <td className={celda}>
                  {f.errores.map((e) => (
                    <div key={e} className="font-semibold text-[#A3261F]">
                      {e}
                    </div>
                  ))}
                  {f.avisos.map((a) => (
                    <div key={a} className="text-[#7A5A00]">
                      {a}
                    </div>
                  ))}
                  {f.dudas && <div className="text-[#7A5A00]">Marcada con dudas.</div>}
                  {f.observaciones && <div className="text-[#35708F]">{f.observaciones}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Contenedor>

      {paginas > 1 && (
        <nav
          aria-label="Páginas de la tabla"
          className="mt-3 flex items-center justify-between gap-3 text-base"
        >
          <button
            type="button"
            onClick={() => setPagina(Math.max(0, actual - 1))}
            disabled={actual === 0}
            className="min-h-11 rounded-lg bg-[#E7F1FB] px-4 font-bold text-[#0A5A99] disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            Página {actual + 1} de {paginas}
          </span>
          <button
            type="button"
            onClick={() => setPagina(Math.min(paginas - 1, actual + 1))}
            disabled={actual >= paginas - 1}
            className="min-h-11 rounded-lg bg-[#E7F1FB] px-4 font-bold text-[#0A5A99] disabled:opacity-40"
          >
            Siguiente
          </button>
        </nav>
      )}
    </div>
  );
}

// --- conflictos ----------------------------------------------------------------

const EXPLICACION_CONFLICTO = {
  peso: "Mismo día, destino, tipo de ayuda y producto, pero con otro peso.",
  nombre: "Mismo día, destino y peso, pero el producto o el tipo de ayuda está escrito distinto.",
} as const;

function PanelConflictos({
  filas,
  decisiones,
  alDecidir,
}: {
  filas: FilaDistribucion[];
  decisiones: Decisiones;
  alDecidir: (d: Decisiones) => void;
}) {
  const [pagina, setPagina] = useState(0);
  const POR = 10;
  const paginas = Math.max(1, Math.ceil(filas.length / POR));
  const actual = Math.min(pagina, paginas - 1);
  const visibles = filas.slice(actual * POR, (actual + 1) * POR);
  const sinDecidir = filas.filter((f) => !decisiones[f.n]).length;

  const decidirTodas = (d: Decision) => {
    const siguiente: Decisiones = { ...decisiones };
    for (const f of filas) {
      if (d === "reemplazar" && f.conflicto?.total !== 1) continue;
      siguiente[f.n] = d;
    }
    alDecidir(siguiente);
  };

  return (
    <div>
      <p className="mt-4 rounded-xl bg-[#FFF1DC] px-4 py-3 text-base leading-6 text-[#6B3A00]">
        <b>
          {filas.length} envíos del archivo se parecen a uno que ya está en el libro, pero no son
          iguales.
        </b>{" "}
        El sistema no puede saber si son el mismo envío o dos distintos. Decida qué hacer con cada
        uno: no se carga ninguno sin su decisión.
        {sinDecidir > 0 ? ` Faltan ${sinDecidir} por decidir.` : " Ya decidió todos."}
      </p>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Decidir todos a la vez">
        <button type="button" onClick={() => decidirTodas("conservar")} className={botonSuave}>
          Dejar todas las del libro
        </button>
        <button type="button" onClick={() => decidirTodas("reemplazar")} className={botonSuave}>
          Cambiar todas por las del archivo
        </button>
        <button type="button" onClick={() => decidirTodas("agregar")} className={botonSuave}>
          Son todos distintos: agregar todas
        </button>
      </div>

      <ul className="mt-4 space-y-4">
        {visibles.map((f) => (
          <TarjetaConflicto
            key={f.n}
            fila={f}
            decision={decisiones[f.n]}
            alElegir={(d) => alDecidir({ ...decisiones, [f.n]: d })}
          />
        ))}
      </ul>

      {paginas > 1 && (
        <nav
          aria-label="Páginas de conflictos"
          className="mt-3 flex items-center justify-between gap-3 text-base"
        >
          <button
            type="button"
            onClick={() => setPagina(Math.max(0, actual - 1))}
            disabled={actual === 0}
            className={botonSuave}
          >
            Anterior
          </button>
          <span>
            Página {actual + 1} de {paginas}
          </span>
          <button
            type="button"
            onClick={() => setPagina(Math.min(paginas - 1, actual + 1))}
            disabled={actual >= paginas - 1}
            className={botonSuave}
          >
            Siguiente
          </button>
        </nav>
      )}
    </div>
  );
}

const botonSuave =
  "min-h-11 rounded-lg bg-[#E7F1FB] px-4 text-[15px] font-bold text-[#0A5A99] transition-colors hover:bg-[#D3E7F8] disabled:opacity-40";

function TarjetaConflicto({
  fila: f,
  decision,
  alElegir,
}: {
  fila: FilaDistribucion;
  decision: Decision | undefined;
  alElegir: (d: Decision) => void;
}) {
  const nombre = useId();
  const c = f.conflicto;
  if (!c) return null;
  const e = c.existentes[0];
  const unica = c.total === 1;
  const opciones: { valor: Decision; texto: string; permitida: boolean }[] = [
    { valor: "conservar", texto: "Dejar la del libro (no cargar la del archivo)", permitida: true },
    {
      valor: "reemplazar",
      texto: unica
        ? "Cambiar la del libro por la del archivo (la anterior queda guardada)"
        : "Cambiar la del libro por la del archivo (no disponible: se parece a varias filas)",
      permitida: unica,
    },
    {
      valor: "agregar",
      texto: "Son dos envíos distintos: agregar también la del archivo",
      permitida: true,
    },
  ];

  const filasComparacion: { campo: string; libro: string; archivo: string }[] = e
    ? [
        { campo: "Fecha", libro: e.fecha, archivo: f.fecha ?? "—" },
        { campo: "A dónde", libro: e.destino, archivo: f.destino ?? "—" },
        { campo: "Tipo de ayuda", libro: e.familia, archivo: f.familia ?? "—" },
        { campo: "Producto", libro: e.producto ?? "—", archivo: f.producto ?? "—" },
        { campo: "Cantidad", libro: numero(e.cantidad), archivo: numero(f.cantidad) },
        {
          campo: "Kilos de cada uno",
          libro: numero(e.kilosUnitario),
          archivo: numero(f.kilosUnitario ?? null),
        },
        { campo: "Kilos en total", libro: numero(e.kilosTotal), archivo: numero(f.kilosTotal) },
      ]
    : [];

  return (
    <li
      className={`rounded-xl border-2 p-4 ${decision ? "border-[#2E9E5B]/40 bg-white" : "border-[#E08A1E]/60 bg-[#FFFBF3]"}`}
    >
      <p className="text-base font-bold">
        Fila {f.n} del archivo{e ? ` · fila ${e.fila} del libro` : ""}
        {!unica && ` (y ${c.total - 1} más parecidas)`}
      </p>
      <p className="mt-0.5 text-[15px] text-[#6B3A00]">{EXPLICACION_CONFLICTO[c.tipo]}</p>

      <Contenedor titulo={`Comparación de la fila ${f.n}`}>
        <table className="w-full min-w-[420px] border-collapse">
          <caption className="sr-only">
            Lo que está en el libro frente a lo que trae el archivo
          </caption>
          <thead>
            <tr>
              <th scope="col" className={cabecera}></th>
              <th scope="col" className={cabecera}>
                En el libro
              </th>
              <th scope="col" className={cabecera}>
                En el archivo
              </th>
            </tr>
          </thead>
          <tbody>
            {filasComparacion.map((x) => {
              const distinto = x.libro !== x.archivo;
              return (
                <tr key={x.campo}>
                  <th scope="row" className={`${celda} font-semibold`}>
                    {x.campo}
                  </th>
                  <td className={`${celda} ${distinto ? "bg-[#FFE9CC] font-bold" : ""}`}>
                    {x.libro}
                  </td>
                  <td className={`${celda} ${distinto ? "bg-[#FFE9CC] font-bold" : ""}`}>
                    {x.archivo}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Contenedor>

      <fieldset className="mt-3">
        <legend className="text-base font-bold">¿Qué hacer con esta fila?</legend>
        <div className="mt-1 space-y-1.5">
          {opciones.map((o) => (
            <label
              key={o.valor}
              className={`flex items-start gap-3 text-base leading-6 ${o.permitida ? "" : "opacity-50"}`}
            >
              <input
                type="radio"
                name={nombre}
                checked={decision === o.valor}
                disabled={!o.permitida}
                onChange={() => alElegir(o.valor)}
                className="mt-1 size-5 shrink-0 accent-[#0079C1]"
              />
              <span>{o.texto}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </li>
  );
}

function Resumen({ cifra, texto, color }: { cifra: number; texto: string; color: string }) {
  return (
    <li className="rounded-lg bg-[#F2FAFD] px-3 py-2.5">
      <b className={`text-2xl tabular-nums ${color}`}>{cifra}</b> <span>{texto}</span>
    </li>
  );
}

function TablaFaltante({ datos }: { datos: NonNullable<Plan["queHaceFalta"]> }) {
  return (
    <div>
      <p className="mt-4 text-base leading-6">
        {datos.reemplaza ? (
          <>
            La lista de «Qué hace falta» se <b>reemplazará</b>: hoy tiene {datos.antes ?? "—"}{" "}
            elementos y quedará con {datos.despues}.
          </>
        ) : (
          <b className="text-[#A3261F]">
            No hay ninguna fila válida: la lista actual no se cambia.
          </b>
        )}
      </p>
      {datos.reemplaza && (datos.seQuitan?.length ?? 0) > 0 && (
        <div className="mt-3 rounded-xl bg-[#FFF6DA] px-4 py-3 text-base leading-6 text-[#7A5A00]">
          <p className="font-bold">
            Estos {datos.seQuitanTotal} elementos están hoy en la lista y NO vienen en el archivo,
            así que se quitarán:
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {datos.seQuitan?.map((q) => (
              <li key={`${q.categoria}|${q.elemento}`}>
                {q.elemento} ({q.categoria}, {q.estado})
              </li>
            ))}
          </ul>
        </div>
      )}
      <Contenedor titulo="Tabla de qué hace falta">
        <table className="w-full min-w-[640px] border-collapse">
          <caption className="sr-only">Elementos de «Qué hace falta» del archivo</caption>
          <thead>
            <tr>
              {["N.º", "Categoría", "Qué es", "¿Cómo está?", "Notas"].map((t) => (
                <th key={t} scope="col" className={cabecera}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.filas.map((f) => (
              <tr key={f.n} className={f.estadoFila === "error" ? "bg-[#FFF5F5]" : ""}>
                <td className={celda}>{f.n}</td>
                <td className={celda}>{f.categoria ?? "—"}</td>
                <td className={celda}>{f.elemento ?? "—"}</td>
                <td className={celda}>{f.estado ?? "—"}</td>
                <td className={celda}>
                  {f.errores.map((e) => (
                    <div key={e} className="font-semibold text-[#A3261F]">
                      {e}
                    </div>
                  ))}
                  {f.observaciones && <div className="text-[#35708F]">{f.observaciones}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Contenedor>
    </div>
  );
}

function TablaGeneral({ datos }: { datos: NonNullable<Plan["informacionGeneral"]> }) {
  const filas = [
    { nombre: "Toneladas aproximadas recibidas", c: datos.recibidas },
    { nombre: "Toneladas aproximadas en inventario", c: datos.inventario },
  ];
  return (
    <div>
      {datos.errores.map((e) => (
        <p key={e} role="alert" className="mt-4 font-semibold text-[#A3261F]">
          {e}
        </p>
      ))}
      <Contenedor titulo="Tabla de información general">
        <table className="w-full min-w-[520px] border-collapse">
          <caption className="sr-only">Cifras generales: cómo están hoy y cómo quedarían</caption>
          <thead>
            <tr>
              {["Dato", "Hoy", "Quedaría en", ""].map((t, i) => (
                <th key={i} scope="col" className={cabecera}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ nombre, c }) => (
              <tr key={nombre}>
                <td className={celda}>{nombre}</td>
                <td className={`${celda} tabular-nums`}>
                  {c.antes === null ? "Sin dato" : numero(c.antes)}
                </td>
                <td className={`${celda} font-bold tabular-nums`}>
                  {c.despues === null ? "No cambia" : numero(c.despues)}
                </td>
                <td className={celda}>{c.cambia ? "Se cambia" : "Igual que hoy"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Contenedor>
      <p className="mt-3 text-[15px] text-[#35708F]">Lo que el archivo no trae no se toca.</p>
    </div>
  );
}

// --- resultado ---------------------------------------------------------------

function Listo({ resultado, alNuevo }: { resultado: Resultado; alNuevo: () => void }) {
  const c = resultado.cargado;
  return (
    <section aria-live="polite" className="mt-8 rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-2xl font-extrabold text-[#1D6B2E]">Listo, los datos se cargaron</h2>
      <ul className="mt-3 space-y-1 text-base leading-6">
        {c.nuevas > 0 && (
          <li>
            Filas nuevas de distribución: <b>{c.nuevas}</b>
          </li>
        )}
        {c.completadas > 0 && (
          <li>
            Filas pendientes que se completaron: <b>{c.completadas}</b>
          </li>
        )}
        {c.repetidas > 0 && (
          <li>
            Filas que ya estaban y no se repitieron: <b>{c.repetidas}</b>
          </li>
        )}
        {c.conProblema > 0 && (
          <li>
            Filas con problema que no se cargaron: <b>{c.conProblema}</b>
          </li>
        )}
        {c.faltantes > 0 && (
          <li>
            Elementos de «Qué hace falta»: <b>{c.faltantes}</b>
          </li>
        )}
        {c.totales > 0 && (
          <li>
            Cifras generales cambiadas: <b>{c.totales}</b>
          </li>
        )}
      </ul>
      <p className="mt-4 text-base leading-6">
        El tablero se actualiza en uno o dos minutos. Recargue la página del tablero para verlo.
      </p>
      <button
        type="button"
        onClick={alNuevo}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0079C1] px-6 py-2.5 text-base font-bold text-white hover:bg-[#0A5A99]"
      >
        Hacer otra carga
      </button>
    </section>
  );
}
