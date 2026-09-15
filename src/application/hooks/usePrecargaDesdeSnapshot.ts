/**
 * usePrecargaDesdeSnapshot.ts
 * -----------------------------------------------------------------------
 * Siembra la caché de React Query con la última copia guardada en el
 * navegador, para que el tablero se dibuje al instante en las visitas
 * siguientes.
 *
 * POR QUÉ EN UN EFECTO Y NO CON `initialData`
 *
 * La página también se dibuja en el servidor, donde no hay
 * localStorage. Con `initialData`, el servidor renderizaría sin datos y
 * el cliente con datos, y la hidratación no coincidiría. En un efecto,
 * la copia entra después de hidratar y no hay desajuste.
 *
 * QUÉ SE SIEMBRA Y QUÉ NO
 *
 * Todo menos `necesidades`. Esa es la única parte que caduca en horas, y
 * una lista vieja manda a la gente a donar lo que ya sobra: esa sección
 * espera a la respuesta real.
 *
 * Cada parte se valida con la misma regla que las respuestas del
 * backend, y se siembra con la fecha en que se guardó. React Query la ve
 * vieja y la reemplaza apenas llega la consulta que ya está en vuelo.
 * Nunca pisa un dato que ya esté en la caché.
 * -----------------------------------------------------------------------
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { leerSnapshot } from "@/infrastructure/api/snapshotTablero";
import { validarParte } from "@/infrastructure/api/AyudasApiRepository";
import type { ParteBundle } from "@/domain/entities";

/**
 * Las claves coinciden con las queryKey de useCatalogQueries, useAyuda y
 * useToneladas. Si una de esas cambia, cambia acá.
 */
const PARTES_SEMBRABLES: readonly ParteBundle[] = [
  "meta",
  "origenes",
  "municipios",
  "categorias",
  "flujos",
  "destinos",
  "toneladas",
  "ayuda",
];

export function usePrecargaDesdeSnapshot(): void {
  const client = useQueryClient();

  useEffect(() => {
    const snapshot = leerSnapshot();
    if (!snapshot) return;

    for (const clave of PARTES_SEMBRABLES) {
      const valor = snapshot.bundle[clave];
      if (valor === null || valor === undefined) continue;
      if (client.getQueryData([clave]) !== undefined) continue;
      if (validarParte(clave, valor) !== null) continue;

      client.setQueryData([clave], valor, { updatedAt: snapshot.guardadoEn });
    }
  }, [client]);
}