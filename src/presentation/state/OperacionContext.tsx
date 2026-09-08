/**
 * OperacionContext.tsx
 * -----------------------------------------------------------------------
 * Una sola lectura de `route=flujos` alimenta todo el tablero. El
 * contexto evita que cada sección repita el hook y que el árbol se llene
 * de props que solo pasan de largo.
 *
 * DOS CAMBIOS EN ESTA VERSIÓN
 *
 * 1. SE LE PASAN LOS `excluidos` A LA DERIVACIÓN.
 *
 *    `route=flujos` devuelve dos listas: los pares que el mapa puede
 *    dibujar y los que no, porque su destino no tiene coordenada. Hasta
 *    ahora solo viajaba la primera, así que el reparto del peso usaba
 *    496 entregas cuando la operación tiene 536. Cada entrega visible
 *    cargaba con el peso de las 40 invisibles, y las toneladas por ruta
 *    sumaban más que el total del departamento.
 *
 * 2. LOS HUECOS DE LA HOJA TONELADAS SE AVISAN POR CONSOLA, NO EN
 *    PANTALLA.
 *
 *    La derivación detecta los días con entregas que no tienen peso
 *    registrado, y durante un momento eso se mostró como una nota al pie
 *    del balance. Fue un error: al lector de la página no le sirve
 *    saberlo y no puede hacer nada al respecto. Es un aviso para quien
 *    mantiene el Excel, y ese no entra por la página pública.
 *
 *    Sigue siendo importante que quede rastro: sin él, el total de
 *    toneladas cubre menos días que el de entregas y nadie se entera. Va
 *    a la consola y solo en desarrollo.
 * -----------------------------------------------------------------------
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useFlujos, useMunicipios } from "@/application/hooks/useCatalogQueries";
import { useToneladas } from "@/application/hooks/useToneladas";
import { derivarOperacion, OPERACION_VACIA, type Operacion } from "@/application/derivations/operacion";

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

  // Las toneladas son opcionales: si la consulta falla, el peso cae al
  // respaldo por entregas y `toneladasMedidas` queda en false. Su error
  // no cuenta como error del contexto.
  const { data: toneladas } = useToneladas();

  // El catálogo aporta la zona de cada municipio y el denominador de
  // cobertura. Sin él, la derivación cae al catálogo estático.
  const { data: municipios } = useMunicipios();

  const value = useMemo<OperacionContextValue>(
    () => ({
      operacion: derivarOperacion(data?.flujos, toneladas?.serie, municipios, data?.excluidos),
      cargando: isLoading,
      error: isError,
    }),
    [data, toneladas, municipios, isLoading, isError],
  );

  /**
   * Días con entregas y sin peso en la hoja TONELADAS.
   *
   * Es un dato de mantenimiento del Excel, no de la operación, así que
   * no se muestra en la página. Pero tampoco puede quedar en silencio:
   * mientras falten filas, el total de toneladas cubre menos días que el
   * de entregas y las dos cifras del balance no son comparables.
   */
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