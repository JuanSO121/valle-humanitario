/**
 * OperacionContext.tsx
 * -----------------------------------------------------------------------
 * Una sola lectura de `route=flujos` alimenta todo el tablero. El
 * contexto evita que cada sección repita el hook y que el árbol se llene
 * de props que solo pasan de largo.
 *
 * CAMBIO: el proveedor siembra la caché con la última copia guardada.
 *
 * Es el punto más alto que envuelve a toda la página, así que es donde
 * conviene hacerlo una sola vez. Ver usePrecargaDesdeSnapshot.
 *
 * Se conservan los dos cambios anteriores: los `excluidos` viajan a la
 * derivación, y los huecos de la hoja TONELADAS se avisan por consola en
 * desarrollo, no en pantalla.
 * -----------------------------------------------------------------------
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useFlujos, useMunicipios } from "@/application/hooks/useCatalogQueries";
import { useToneladas } from "@/application/hooks/useToneladas";
import { usePrecargaDesdeSnapshot } from "@/application/hooks/usePrecargaDesdeSnapshot";
import { derivarOperacion, OPERACION_VACIA, type Operacion } from "@/application/derivations/operacion";

interface OperacionContextValue {
  operacion: Operacion;
  cargando: boolean;
  error: boolean;
}

/**
 * `null` en vez de un valor por defecto a propósito: un componente usado
 * fuera del proveedor avisa en desarrollo en vez de mostrar ceros.
 */
const OperacionContext = createContext<OperacionContextValue | null>(null);

function usarContexto(): OperacionContextValue {
  const valor = useContext(OperacionContext);
  if (valor === null) {
    if (import.meta.env.DEV) {
      console.error(
        "[OperacionContext] Un componente pidió los datos de la operación fuera de " +
          "<OperacionProvider>. Va a mostrar ceros. Envolvé la página con el proveedor.",
      );
    }
    return { operacion: OPERACION_VACIA, cargando: false, error: true };
  }
  return valor;
}

export function OperacionProvider({ children }: { children: ReactNode }) {
  usePrecargaDesdeSnapshot();

  const { data, isLoading, isError } = useFlujos();

  // Opcionales: si fallan, el peso cae al respaldo por entregas y las
  // zonas al catálogo estático. Su error no cuenta como error del contexto.
  const { data: toneladas } = useToneladas();
  const { data: municipios } = useMunicipios();

  const value = useMemo<OperacionContextValue>(
    () => ({
      operacion: derivarOperacion(data?.flujos, toneladas?.serie, municipios, data?.excluidos),
      cargando: isLoading,
      error: isError,
    }),
    [data, toneladas, municipios, isLoading, isError],
  );

  /** Días con entregas y sin peso en la hoja TONELADAS. Solo consola, solo en desarrollo. */
  const { diasSinPesoMedido, toneladasMedidas } = value.operacion;
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!toneladasMedidas || diasSinPesoMedido.length === 0) return;
    console.warn(
      `[Operación] ${diasSinPesoMedido.length} día(s) con entregas no tienen peso en la hoja ` +
        `TONELADAS: ${diasSinPesoMedido.join(", ")}. El total de toneladas los cuenta como cero. ` +
        "Se corrige agregando esas filas al Excel, no tocando código.",
    );
  }, [diasSinPesoMedido, toneladasMedidas]);

  return <OperacionContext.Provider value={value}>{children}</OperacionContext.Provider>;
}

export function useOperacion(): Operacion {
  return usarContexto().operacion;
}

export function useOperacionEstado(): { cargando: boolean; error: boolean } {
  const { cargando, error } = usarContexto();
  return { cargando, error };
}