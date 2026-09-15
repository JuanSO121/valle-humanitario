/**
 * snapshotTablero.ts
 * -----------------------------------------------------------------------
 * Guarda en el navegador el último bundle recibido, para que quien
 * vuelve a entrar vea el tablero al instante mientras llega el nuevo.
 *
 * Es una copia de cortesía, no una fuente: React Query la marca con la
 * fecha en que se guardó, así que la considera vieja y la reemplaza en
 * cuanto responde el backend.
 *
 * Todo va en try/catch: el almacenamiento puede estar lleno, bloqueado
 * en incógnito o no existir (render en el servidor). En cualquiera de
 * esos casos la página simplemente carga como antes.
 * -----------------------------------------------------------------------
 */
import type { BundleResponse } from "@/domain/entities";

/**
 * Subir el sufijo cuando cambie la forma del contrato: las copias con la
 * clave anterior dejan de leerse.
 */
const CLAVE = "ayudas:bundle:v1";

/** Pasado esto, la copia no se muestra: mejor esperar que enseñar algo muy viejo. */
const EDAD_MAXIMA_MS = 7 * 24 * 60 * 60 * 1000;

export interface SnapshotTablero {
  guardadoEn: number;
  bundle: BundleResponse;
}

function hayAlmacenamiento(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Se guarda en un momento ocioso: serializar varios cientos de KB en
 * medio del primer render le quitaría fluidez a la animación del mapa.
 */
export function guardarSnapshot(bundle: BundleResponse): void {
  if (!hayAlmacenamiento()) return;

  const guardar = () => {
    try {
      const snapshot: SnapshotTablero = { guardadoEn: Date.now(), bundle };
      window.localStorage.setItem(CLAVE, JSON.stringify(snapshot));
    } catch {
      // Cuota llena o almacenamiento bloqueado: no pasa nada.
    }
  };

  const ocioso = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;

  if (ocioso) ocioso(guardar, { timeout: 5000 });
  else setTimeout(guardar, 1000);
}

export function leerSnapshot(): SnapshotTablero | null {
  if (!hayAlmacenamiento()) return null;
  try {
    const texto = window.localStorage.getItem(CLAVE);
    if (!texto) return null;

    const snapshot = JSON.parse(texto) as Partial<SnapshotTablero>;
    if (typeof snapshot.guardadoEn !== "number" || !snapshot.bundle) return null;
    if (Date.now() - snapshot.guardadoEn > EDAD_MAXIMA_MS) return null;

    return snapshot as SnapshotTablero;
  } catch {
    return null;
  }
}