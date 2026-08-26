import { useEffect, useState } from "react";
import { PackageCheck } from "lucide-react";
import type { ActivityFrame } from "./dispatchActivityEngine";

interface Props {
  frame: ActivityFrame | null;
}

const VISIBLE_MS = 3200;

/**
 * Aviso breve de entrega, al estilo de una historia: aparece, se lee en
 * dos segundos y se va. Nunca se acumula en pantalla.
 */
export function AvisoEntrega({ frame }: Props) {
  const [visible, setVisible] = useState<ActivityFrame | null>(null);

  useEffect(() => {
    if (!frame) {
      setVisible(null);
      return;
    }
    setVisible(frame);
    const t = setTimeout(() => setVisible(null), VISIBLE_MS);
    return () => clearTimeout(t);
  }, [frame]);

  if (!visible) return null;

  const municipio = leerNombre(visible);
  const entregas = leerCantidad(visible);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center px-4"
      aria-live="polite"
    >
      <div
        key={`${municipio}-${entregas}`}
        className="flex items-center gap-3 rounded-full border border-white/15 bg-[#0A1822]/90 py-3 pl-4 pr-5 shadow-lg backdrop-blur"
        style={{ animation: "toast-pop 260ms cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#81C8EC]/20 text-[#81C8EC]">
          <PackageCheck className="size-5" aria-hidden />
        </span>
        <span>
          <b className="block text-base leading-tight text-white">{municipio}</b>
          <span className="block text-sm text-[#9DB4C2]">
            {entregas === 1 ? "Recibió una entrega" : `Recibió ${entregas} entregas`}
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * `ActivityFrame` lo produce dispatchActivityEngine.spawn(destinoId,
 * nombre, cantidad, now). Los nombres exactos de sus campos no están a la
 * vista desde acá, así que se leen de forma tolerante en vez de asumir
 * una forma que rompería en silencio si cambia.
 */
function leerNombre(frame: ActivityFrame): string {
  const f = frame as unknown as Record<string, unknown>;
  const candidatos = [f["nombre"], f["destinoNombre"], f["label"]];
  const encontrado = candidatos.find((v) => typeof v === "string" && v.trim() !== "");
  return typeof encontrado === "string" ? encontrado : "Nueva entrega";
}

function leerCantidad(frame: ActivityFrame): number {
  const f = frame as unknown as Record<string, unknown>;
  const candidatos = [f["cantidad"], f["weight"], f["despachos"], f["delta"]];
  const encontrado = candidatos.find((v) => typeof v === "number" && v > 0);
  return typeof encontrado === "number" ? encontrado : 1;
}