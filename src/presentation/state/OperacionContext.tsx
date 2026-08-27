/**
 * OperacionContext.tsx
 * -----------------------------------------------------------------------
 * Una sola lectura de `route=flujos` alimenta todo el tablero. El
 * contexto evita que cada sección repita el hook y que el árbol se llene
 * de props que solo pasan de largo.
 *
 * Las secciones que consumen esto dejan de depender de movimientoData.ts
 * y por lo tanto se actualizan solas cuando cambia el Excel.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useFlujos, useMunicipios } from "@/application/hooks/useCatalogQueries";
import { useToneladas } from "@/application/hooks/useToneladas";
import {
  derivarOperacion,
  OPERACION_VACIA,
  type Operacion,
} from "@/application/derivations/operacion";

interface OperacionContextValue {
  operacion: Operacion;
  cargando: boolean;
  error: boolean;
}

/**
 * `null` en vez de un valor por defecto a propósito. Con un valor por
 * defecto, un componente usado fuera del proveedor mostraba ceros en
 * silencio y parecía un problema de datos. Ahora avisa en desarrollo.
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
  const { data, isLoading, isError } = useFlujos();

  // Las toneladas son opcionales: si la ruta todavía no está publicada,
  // la consulta falla y el tablero sigue con el estimado por entregas.
  // Por eso su error no cuenta como error del contexto.
  const { data: toneladas } = useToneladas();

  // El catálogo aporta la zona de cada municipio y el denominador de
  // cobertura. Sin él, la derivación cae al catálogo estático, que tenía
  // zonas desactualizadas.
  const { data: municipios } = useMunicipios();

  const value = useMemo<OperacionContextValue>(
    () => ({
      operacion: derivarOperacion(data?.flujos, toneladas?.serie, municipios),
      cargando: isLoading,
      error: isError,
    }),
    [data, toneladas, municipios, isLoading, isError],
  );

  return <OperacionContext.Provider value={value}>{children}</OperacionContext.Provider>;
}

export function useOperacion(): Operacion {
  return usarContexto().operacion;
}

export function useOperacionEstado(): { cargando: boolean; error: boolean } {
  const { cargando, error } = usarContexto();
  return { cargando, error };
}