/**
 * AyudasApiRepository.ts
 * -----------------------------------------------------------------------
 * Única clase que conoce la URL del Web App de Apps Script y el contrato
 * `?route=...`. Nada fuera de este archivo debería construir esa URL a
 * mano, así, si el día de mañana el backend deja de ser Apps Script,
 * solo se reemplaza este archivo.
 *
 * Cada método corresponde 1:1 a una ruta ya cerrada y probada. No hay
 * traducción de forma de datos acá, eso ya lo hace Transforms.gs; este
 * archivo tipa la respuesta contra domain/entities.ts, valida errores de
 * red/HTTP, y valida el SHAPE mínimo esperado de cada respuesta.
 *
 * La validación de shape existe porque Apps Script cachea respuestas ya
 * armadas (CacheLayer.gs, TTL 6h) y las implementaciones Web App no se
 * actualizan solas al editar el código fuente. Si el contrato cambia
 * (ej. route=flujos pasa de array plano a {flujos, excluidos}) y el
 * deploy o la caché quedan desincronizados con Transforms.gs, un objeto
 * con forma vieja pasaría como 200 OK válido y rompería río abajo con un
 * `undefined.forEach` sin contexto. Mejor fallar acá, con un mensaje que
 * apunta directo a la causa.
 *
 * CAMBIO: todas las peticiones pasan por una cola.
 *
 * Un Web App de Apps Script serializa las ejecuciones por usuario. El
 * tablero monta ocho consultas en el mismo instante y las que se pisan
 * reciben un 404 de la infraestructura de Google, sin llegar a ejecutar
 * el script. Con la cola viajan de a dos y ninguna se cae.
 *
 * Va acá y no en cada hook porque este es el único `fetch` del archivo:
 * un solo punto cubre las diez rutas.
 * -----------------------------------------------------------------------
 */
import { enCola } from "@/infrastructure/api/colaDePeticiones";
import type {
  Meta,
  Origen,
  Municipio,
  Categoria,
  FlujosResponse,
  ToneladasResponse,
  AyudaResponse,
  DestinoResumenLista,
  DestinoResumen,
  DestinoLogistica,
} from "@/domain/entities";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class AyudasApiRepository {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(
    route: string,
    params: Record<string, string> = {},
    validateShape?: (payload: unknown) => string | null,
  ): Promise<T> {
    const url = new URL(this.baseUrl);
    url.searchParams.set("route", route);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    // `no-store` a propósito. Apps Script responde /exec con un 302 a
    // googleusercontent.com y esa respuesta sí se puede cachear en el
    // navegador. El síntoma es corregir el Excel, invalidar la caché del
    // backend, recargar y seguir viendo lo viejo. Quién decide cuánto
    // dura el dato es React Query con su staleTime, no el HTTP cache.
    //
    // La cola limita cuántas de estas viajan a la vez. Sin ella, las ocho
    // consultas del arranque se pisan entre sí en el Web App.
    const response = await enCola(() => fetch(url.toString(), { cache: "no-store" }));

    if (!response.ok) {
      /**
       * El nombre de la ruta se registra acá porque en la consola del
       * navegador se pierde: /exec responde con un 302 a
       * script.googleusercontent.com, y ese error aparece sin el
       * `?route=`, así que "404 en googleusercontent" no dice cuál falló.
       *
       * UN 404 ACÁ NO PUEDE VENIR DE Code.gs. `jsonResponse_` usa
       * ContentService, que siempre responde HTTP 200: hasta
       * `errorResponse_(..., 404)` devuelve un 200 con el 404 adentro del
       * JSON, y lo atrapa el chequeo de `payload.error` de más abajo. Un
       * 404 de HTTP significa que la petición no llegó a ejecutarse, o
       * que Apps Script sirvió su propia página de error.
       *
       * Las causas, en el orden en que conviene descartarlas:
       *
       *   1. CONCURRENCIA. Si las demás rutas responden bien y esta falla
       *      de forma intermitente, es esto. Debería estar cubierto por
       *      la cola; si vuelve a pasar, bajar MAX_EN_VUELO a 1.
       *   2. No se republicó con Nueva versión. /exec sirve la versión
       *      desplegada, no el código del editor. Si la ruta es nueva,
       *      esta es la causa y falla SIEMPRE, no a veces.
       *   3. El constructor lanzó una excepción y Apps Script devolvió su
       *      página de error en vez del JSON. Se ve con probarRutas()
       *      desde el editor, que corre cada ruta en su propio try.
       *
       * La prueba que separa 1 de 2 y 3: abrir la URL a mano en el
       * navegador. Si ahí devuelve JSON, es concurrencia.
       */
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error(
          `[API] route=${route} respondió HTTP ${response.status}. ` +
            "Si las otras rutas cargaron bien, es concurrencia del Web App: " +
            "bajar MAX_EN_VUELO en colaDePeticiones.ts. Si falla siempre, " +
            "republicar con Nueva versión y correr probarRutas() desde el editor.",
        );
      }
      throw new ApiError(`Error de red en route=${route}: HTTP ${response.status}`, response.status);
    }

    const payload = await response.json();

    // Code.gs responde `{ error: true, status, message }` con HTTP 200
    // en varios casos (ContentService no permite fijar el status code de
    // la respuesta), el chequeo real de error está en el payload, no
    // solo en response.ok.
    if (payload && typeof payload === "object" && "error" in payload && (payload as any).error) {
      const p = payload as { message?: string; status?: number };
      throw new ApiError(p.message ?? `Error desconocido en route=${route}`, p.status ?? 500);
    }

    // Chequeo de forma: detecta un contrato desactualizado (deploy viejo
    // de Apps Script, o respuesta cacheada de una versión anterior de
    // Transforms.gs) ANTES de que llegue a un componente de React que
    // asuma la forma nueva sin validarla.
    if (validateShape) {
      const problem = validateShape(payload);
      if (problem) {
        throw new ApiError(
          `Respuesta con forma inesperada en route=${route}: ${problem}. ` +
            `Es probable que la implementación (deployment) del Web App de Apps Script ` +
            `esté desactualizada respecto al código fuente, o que la caché de CacheLayer.gs ` +
            `tenga una respuesta vieja. Revisa "Implementar → Gestionar implementaciones" ` +
            `y corré limpiarCache() si hace falta.`,
          502,
        );
      }
    }

    return payload as T;
  }

  getMeta(): Promise<Meta> {
    return this.request<Meta>("meta");
  }

  getOrigenes(): Promise<Origen[]> {
    return this.request<Origen[]>("origenes", {}, (p) =>
      Array.isArray(p) ? null : "se esperaba un array de orígenes",
    );
  }

  getMunicipios(): Promise<Municipio[]> {
    return this.request<Municipio[]>("municipios", {}, (p) =>
      Array.isArray(p) ? null : "se esperaba un array de municipios",
    );
  }

  getCategorias(): Promise<Categoria[]> {
    return this.request<Categoria[]>("categorias", {}, (p) =>
      Array.isArray(p) ? null : "se esperaba un array de categorías",
    );
  }

  getFlujos(): Promise<FlujosResponse> {
    return this.request<FlujosResponse>("flujos", {}, (p) => {
      if (!p || typeof p !== "object") return "se esperaba un objeto";
      const obj = p as Record<string, unknown>;
      if (!Array.isArray(obj["flujos"])) return 'falta el campo "flujos" (array)';
      if (!Array.isArray(obj["excluidos"])) return 'falta el campo "excluidos" (array)';

      // "porFecha" SÍ es parte del contrato (Transforms.gs.buildFlujos_ ya
      // lo arma), pero se valida como advertencia no bloqueante en vez de
      // rechazar toda la respuesta con un 502. Motivo: ya pasó en
      // producción que la implementación del Web App o la caché de 6h de
      // CacheLayer.gs quedaron desincronizadas del código fuente y
      // sirvieron flujos SIN porFecha. Con el chequeo estricto anterior,
      // eso tumbaba la query de flujos COMPLETA (React Query queda en
      // error, flujosResponse === undefined) y con ella el mapa base
      // entero, incluidos los arcos y su animación, que no dependen en
      // absoluto de porFecha.
      //
      // OJO: hoy porFecha pesa más que antes. Además del timeline,
      // alimenta toda la derivación de la operación (jornadas, días con
      // entrega, fecha de corte, cobertura por día). Sin ese campo el
      // tablero sigue mostrando el mapa y los totales por municipio,
      // pero las secciones de "Cuándo se entregó" y los KPI de días
      // quedan vacíos. El console.warn es el rastro para diagnosticarlo.
      const primerFlujo = obj["flujos"][0];
      if (primerFlujo && !Array.isArray((primerFlujo as Record<string, unknown>)["porFecha"])) {
        // eslint-disable-next-line no-console
        console.warn(
          'route=flujos: los flujos no traen "porFecha" (array). Probablemente la ' +
            "implementación del Web App de Apps Script está desactualizada respecto a " +
            "Transforms.gs, o CacheLayer.gs sirvió una respuesta vieja (TTL 6h). El mapa " +
            "y los arcos funcionan igual. Las secciones por fecha y el timeline quedan " +
            'sin datos hasta que se re-implemente ("Nueva versión") y se corra limpiarCache().',
        );
      }

      return null;
    });
  }

  /**
   * Serie diaria de toneladas, de la hoja TONELADAS.
   *
   * Ya está publicada y verificada: devuelve 561 toneladas repartidas en
   * 16 días. Si falla, el tablero cae al estimado por entregas, pero hoy
   * ese respaldo debería ser una red de seguridad y no el caso normal.
   * Ver useToneladas y OperacionContext.
   */
  getToneladas(): Promise<ToneladasResponse> {
    return this.request<ToneladasResponse>("toneladas", {}, (p) => {
      if (!p || typeof p !== "object") return "se esperaba un objeto";
      const obj = p as Record<string, unknown>;
      if (!Array.isArray(obj["serie"])) return 'falta el campo "serie" (array)';
      if (typeof obj["total"] !== "number") return 'falta el campo "total" (número)';
      return null;
    });
  }

  /**
   * Composición de lo entregado, grupos atendidos y canales.
   *
   * Ya está publicada y verificada. Si falla, el tablero cae a las cifras
   * del catálogo estático, que están viejas: ayudaData.ts declara 256.650
   * unidades y el Excel tiene 96.360. Por eso conviene que ese respaldo
   * no se use nunca, y que un fallo acá se reintente en vez de darse por
   * definitivo.
   */
  getAyuda(): Promise<AyudaResponse> {
    return this.request<AyudaResponse>("ayuda", {}, (p) => {
      if (!p || typeof p !== "object") return "se esperaba un objeto";
      const obj = p as Record<string, unknown>;
      if (!Array.isArray(obj["categorias"])) return 'falta el campo "categorias" (array)';
      if (!Array.isArray(obj["poblaciones"])) return 'falta el campo "poblaciones" (array)';
      if (!Array.isArray(obj["canales"])) return 'falta el campo "canales" (array)';
      return null;
    });
  }

  getDestinos(): Promise<DestinoResumenLista[]> {
    return this.request<DestinoResumenLista[]>("destinos", {}, (p) =>
      Array.isArray(p) ? null : "se esperaba un array de destinos",
    );
  }

  /** Vista PRINCIPAL de un destino, solo ENVIOS_CATEGORIA. */
  getDestino(id: string): Promise<DestinoResumen> {
    return this.request<DestinoResumen>("destino", { id });
  }

  /** Vista SECUNDARIA, solo DESPACHOS. Nunca sumar contra getDestino(). */
  getDestinoLogistica(id: string): Promise<DestinoLogistica> {
    return this.request<DestinoLogistica>("destino-logistica", { id });
  }
}