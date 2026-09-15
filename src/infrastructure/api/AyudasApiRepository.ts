/**
 * AyudasApiRepository.ts
 * -----------------------------------------------------------------------
 * Única clase que conoce la URL del Web App de Apps Script y el contrato
 * `?route=...`. Nada fuera de este archivo debería construir esa URL a
 * mano.
 *
 * CAMBIO: las nueve rutas del tablero viajan en UNA petición.
 *
 * Con la cola en MAX_EN_VUELO = 1, las nueve consultas del arranque
 * salían en fila india, y cada una pagaba el arranque del Web App más la
 * redirección a googleusercontent. Ese costo fijo, multiplicado por
 * nueve, era la mayor parte de la espera.
 *
 * Ahora `getMeta()`, `getFlujos()`, etc. leen de `?route=bundle`. Las
 * nueve llamadas simultáneas de los hooks comparten la misma promesa en
 * vuelo, así que salen como una sola petición. Los hooks no cambian.
 *
 * RESPALDOS, en orden
 *
 *   · Si el Web App desplegado todavía no tiene `bundle` (responde "Ruta
 *     no reconocida"), se usan las rutas individuales por el resto de la
 *     sesión. Un deploy viejo sigue funcionando, solo más lento.
 *   · Si el bundle llega pero una parte viene en null (el backend no
 *     pudo armarla) o con forma inesperada, esa parte sola se pide por
 *     su ruta.
 *   · Si el bundle falla por red, el error sube tal cual y React Query
 *     reintenta. Los reintentos de las nueve consultas vuelven a
 *     compartir una sola petición.
 *
 * La validación de forma sigue existiendo por la misma razón de antes:
 * un deploy o una caché desincronizados pueden servir un contrato viejo
 * con HTTP 200, y es mejor fallar acá que en un `undefined.forEach`.
 * -----------------------------------------------------------------------
 */
import { enCola } from "@/infrastructure/api/colaDePeticiones";
import { guardarSnapshot } from "@/infrastructure/api/snapshotTablero";
import type {
  Meta,
  Origen,
  Municipio,
  Categoria,
  FlujosResponse,
  ToneladasResponse,
  AyudaResponse,
  NecesidadesResponse,
  DestinoResumenLista,
  DestinoResumen,
  DestinoLogistica,
  BundleResponse,
  ParteBundle,
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

/**
 * Cuánto se reutiliza un bundle ya recibido.
 *
 * Existe para que las nueve consultas que React Query revalida juntas
 * (al volver a la pestaña, por ejemplo) no disparen nueve peticiones si
 * llegan con unos milisegundos de diferencia. Tiene que ser bastante
 * menor que el staleTime de los hooks (5 min): si no, una revalidación
 * devolvería el mismo dato viejo.
 */
const REUSO_BUNDLE_MS = 20 * 1000;

// --- validación de forma ------------------------------------------------

type Validador = (payload: unknown) => string | null;

const esObjeto = (p: unknown): p is Record<string, unknown> =>
  !!p && typeof p === "object" && !Array.isArray(p);

const esArrayDe =
  (que: string): Validador =>
  (p) =>
    Array.isArray(p) ? null : `se esperaba un array de ${que}`;

let avisoPorFechaEmitido = false;

const validarFlujos: Validador = (p) => {
  if (!esObjeto(p)) return "se esperaba un objeto";
  if (!Array.isArray(p["flujos"])) return 'falta el campo "flujos" (array)';
  if (!Array.isArray(p["excluidos"])) return 'falta el campo "excluidos" (array)';

  // "porFecha" se valida como advertencia no bloqueante: sin ese campo el
  // mapa y los arcos siguen funcionando, y rechazar toda la respuesta
  // tumbaría el mapa entero. Ver historial de este archivo.
  const primerFlujo = p["flujos"][0];
  if (
    !avisoPorFechaEmitido &&
    esObjeto(primerFlujo) &&
    !Array.isArray(primerFlujo["porFecha"])
  ) {
    avisoPorFechaEmitido = true;
    // eslint-disable-next-line no-console
    console.warn(
      'route=flujos: los flujos no traen "porFecha" (array). Probablemente la ' +
        "implementación del Web App está desactualizada. El mapa y los arcos funcionan " +
        "igual; las secciones por fecha y el timeline quedan sin datos hasta que se " +
        're-implemente ("Nueva versión") y se corra precalentarAhora().',
    );
  }
  return null;
};

const VALIDADORES: Record<ParteBundle, Validador> = {
  meta: (p) => (esObjeto(p) && esObjeto(p["totales"]) ? null : 'falta el campo "totales"'),
  origenes: esArrayDe("orígenes"),
  municipios: esArrayDe("municipios"),
  categorias: esArrayDe("categorías"),
  flujos: validarFlujos,
  destinos: esArrayDe("destinos"),
  toneladas: (p) => {
    if (!esObjeto(p)) return "se esperaba un objeto";
    if (!Array.isArray(p["serie"])) return 'falta el campo "serie" (array)';
    if (typeof p["total"] !== "number") return 'falta el campo "total" (número)';
    return null;
  },
  ayuda: (p) => {
    if (!esObjeto(p)) return "se esperaba un objeto";
    if (!Array.isArray(p["categorias"])) return 'falta el campo "categorias" (array)';
    if (!Array.isArray(p["poblaciones"])) return 'falta el campo "poblaciones" (array)';
    if (!Array.isArray(p["canales"])) return 'falta el campo "canales" (array)';
    return null;
  },
  necesidades: (p) => {
    if (!esObjeto(p)) return "se esperaba un objeto";
    if (!Array.isArray(p["secciones"])) return 'falta el campo "secciones" (array)';
    return null;
  },
};

/**
 * Valida una parte del tablero. Exportada para que la copia guardada en
 * el navegador pase por la misma regla antes de mostrarse.
 */
export function validarParte(clave: ParteBundle, valor: unknown): string | null {
  return VALIDADORES[clave](valor);
}

const validarBundle: Validador = (p) =>
  esObjeto(p) && "meta" in p ? null : "se esperaba un objeto con las partes del tablero";

/** El backend responde así cuando el deploy no conoce la ruta. */
const esRutaNoReconocida = (error: unknown) =>
  error instanceof ApiError && error.status === 404 && /no reconocida/i.test(error.message);

// --- repositorio --------------------------------------------------------

export class AyudasApiRepository {
  private bundleEnVuelo: Promise<BundleResponse> | null = null;
  private bundleUltimo: BundleResponse | null = null;
  private bundleObtenidoEn = 0;
  private bundleNoDisponible = false;

  constructor(private readonly baseUrl: string) {}

  private async request<T>(
    route: string,
    params: Record<string, string> = {},
    validateShape?: Validador,
  ): Promise<T> {
    // La base puede ser relativa (/api/tablero, el proxy del mismo
    // dominio) o absoluta (el /exec directo). `new URL` exige una base
    // para las relativas; las consultas solo corren en el navegador, y el
    // respaldo existe solo para que un render del servidor no explote.
    const origen = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(this.baseUrl, origen);
    url.searchParams.set("route", route);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    // `no-store`: quién decide cuánto dura el dato es React Query, no el
    // HTTP cache del 302 a googleusercontent. La etiqueta hace que los
    // avisos de la cola nombren la ruta.
    const response = await enCola(
      () => fetch(url.toString(), { cache: "no-store" }),
      `route=${route}`,
    );

    if (!response.ok) {
      // Un 404 de HTTP no puede venir de Code.gs (ContentService siempre
      // responde 200). Ver colaDePeticiones.ts para las causas.
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error(
          `[API] route=${route} respondió HTTP ${response.status}. ` +
            "Si falla siempre, republicar con Nueva versión y correr probarRutas() desde el editor.",
        );
      }
      throw new ApiError(`Error de red en route=${route}: HTTP ${response.status}`, response.status);
    }

    const payload = await response.json();

    if (esObjeto(payload) && payload["error"]) {
      const p = payload as { message?: string; status?: number };
      throw new ApiError(p.message ?? `Error desconocido en route=${route}`, p.status ?? 500);
    }

    if (validateShape) {
      const problem = validateShape(payload);
      if (problem) {
        throw new ApiError(
          `Respuesta con forma inesperada en route=${route}: ${problem}. ` +
            `Es probable que la implementación del Web App esté desactualizada respecto ` +
            `al código fuente. Revisá "Implementar → Gestionar implementaciones" y ` +
            `corré precalentarAhora() si hace falta.`,
          502,
        );
      }
    }

    return payload as T;
  }

  /** Una sola petición compartida por todas las consultas que lleguen juntas. */
  private obtenerBundle(): Promise<BundleResponse> {
    if (this.bundleUltimo && Date.now() - this.bundleObtenidoEn < REUSO_BUNDLE_MS) {
      return Promise.resolve(this.bundleUltimo);
    }
    if (this.bundleEnVuelo) return this.bundleEnVuelo;

    this.bundleEnVuelo = this.request<BundleResponse>("bundle", {}, validarBundle)
      .then((bundle) => {
        this.bundleUltimo = bundle;
        this.bundleObtenidoEn = Date.now();
        guardarSnapshot(bundle);
        return bundle;
      })
      .finally(() => {
        this.bundleEnVuelo = null;
      });

    return this.bundleEnVuelo;
  }

  /**
   * Una parte del tablero: del bundle si se puede, de su ruta si no.
   */
  private async parte<K extends ParteBundle>(
    clave: K,
    individual: () => Promise<NonNullable<BundleResponse[K]>>,
  ): Promise<NonNullable<BundleResponse[K]>> {
    if (!this.bundleNoDisponible) {
      let bundle: BundleResponse;
      try {
        bundle = await this.obtenerBundle();
      } catch (error) {
        if (!esRutaNoReconocida(error)) throw error;
        // Deploy anterior a la ruta: rutas individuales por el resto de
        // la sesión.
        this.bundleNoDisponible = true;
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(
            "[API] El Web App desplegado no tiene route=bundle. Se usan las rutas " +
              "individuales, en serie y más lentas. Republicar con Nueva versión.",
          );
        }
        return individual();
      }

      const valor = bundle[clave];
      if (valor !== null && valor !== undefined) {
        const problema = validarParte(clave, valor);
        if (!problema) return valor as NonNullable<BundleResponse[K]>;
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(`[API] bundle.${clave} con forma inesperada (${problema}). Se pide sola.`);
        }
      }
      // Parte ausente o inválida: se pide por su ruta, que trae su propio
      // diagnóstico de error.
    }
    return individual();
  }

  getMeta(): Promise<Meta> {
    return this.parte("meta", () => this.request<Meta>("meta", {}, VALIDADORES.meta));
  }

  getOrigenes(): Promise<Origen[]> {
    return this.parte("origenes", () =>
      this.request<Origen[]>("origenes", {}, VALIDADORES.origenes),
    );
  }

  getMunicipios(): Promise<Municipio[]> {
    return this.parte("municipios", () =>
      this.request<Municipio[]>("municipios", {}, VALIDADORES.municipios),
    );
  }

  getCategorias(): Promise<Categoria[]> {
    return this.parte("categorias", () =>
      this.request<Categoria[]>("categorias", {}, VALIDADORES.categorias),
    );
  }

  getFlujos(): Promise<FlujosResponse> {
    return this.parte("flujos", () =>
      this.request<FlujosResponse>("flujos", {}, VALIDADORES.flujos),
    );
  }

  /**
   * Serie diaria de toneladas, de la hoja TONELADAS. Si falla, el tablero
   * cae al estimado por entregas (ver useToneladas y OperacionContext).
   */
  getToneladas(): Promise<ToneladasResponse> {
    return this.parte("toneladas", () =>
      this.request<ToneladasResponse>("toneladas", {}, VALIDADORES.toneladas),
    );
  }

  /**
   * Composición de lo entregado, grupos atendidos y canales. Las
   * unidades salen de DETALLE_PRODUCTO (`fuente: "DETALLE_PRODUCTO"`);
   * si llega "ENVIOS_CATEGORIA", el deploy es anterior al cambio de
   * fuente y las cifras son las viejas.
   */
  getAyuda(): Promise<AyudaResponse> {
    return this.parte("ayuda", () =>
      this.request<AyudaResponse>("ayuda", {}, VALIDADORES.ayuda),
    );
  }

  /**
   * Lo que falta hoy en el centro de acopio. Es la única parte que NO se
   * guarda en el navegador (ver usePrecargaDesdeSnapshot): una lista de
   * necesidades vieja manda a la gente a donar lo que ya sobra.
   */
  getNecesidades(): Promise<NecesidadesResponse> {
    return this.parte("necesidades", () =>
      this.request<NecesidadesResponse>("necesidades", {}, VALIDADORES.necesidades),
    );
  }

  getDestinos(): Promise<DestinoResumenLista[]> {
    return this.parte("destinos", () =>
      this.request<DestinoResumenLista[]>("destinos", {}, VALIDADORES.destinos),
    );
  }

  /** Vista PRINCIPAL de un destino. Va sola: depende del clic. */
  getDestino(id: string): Promise<DestinoResumen> {
    return this.request<DestinoResumen>("destino", { id });
  }

  /** Vista SECUNDARIA, solo DESPACHOS. Nunca sumar contra getDestino(). */
  getDestinoLogistica(id: string): Promise<DestinoLogistica> {
    return this.request<DestinoLogistica>("destino-logistica", { id });
  }
}