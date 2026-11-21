/**
 * AyudasApiRepository.ts
 * -----------------------------------------------------------------------
 * Única clase que conoce la URL del Web App de Apps Script y el contrato
 * `?route=...`. Nada fuera de este archivo debería construir esa URL a
 * mano.
 *
 * Las seis rutas del tablero viajan en UNA petición.
 *
 * Cada petición a un Web App de Apps Script paga un costo fijo: el
 * arranque más la redirección a googleusercontent. `getResumen()`,
 * `getMunicipios()`, etc. leen de `?route=bundle`; las llamadas
 * simultáneas de los hooks comparten la misma promesa en vuelo, así que
 * salen como una sola petición.
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
 *     reintenta. Los reintentos de las consultas vuelven a
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
  ResumenRespuesta,
  MunicipiosRespuesta,
  OtrasRespuesta,
  CategoriasRespuesta,
  FaltantesRespuesta,
  ContratacionResponse,
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

/**
 * «No disponible» es una respuesta válida de las rutas que leen un libro:
 * el libro puede no estar accesible y la sección simplemente no se
 * dibuja. Cualquier otra forma exige `disponible: true` y lo que pida
 * `validar`.
 */
const conDisponible =
  (validar: (p: Record<string, unknown>) => string | null): Validador =>
  (p) => {
    if (!esObjeto(p)) return "se esperaba un objeto";
    if (p["disponible"] === false) return null;
    if (p["disponible"] !== true) return 'falta el campo "disponible"';
    return validar(p);
  };

const exigirArray = (p: Record<string, unknown>, campo: string): string | null =>
  Array.isArray(p[campo]) ? null : `falta el campo "${campo}" (array)`;

const VALIDADORES: Record<ParteBundle, Validador> = {
  resumen: conDisponible((p) => {
    const totales = p["totales"];
    if (!esObjeto(totales) || typeof totales["toneladas"] !== "number") {
      return 'falta "totales.toneladas" (número)';
    }
    if (!esObjeto(p["calidad"])) return 'falta el campo "calidad"';
    for (const campo of ["recibidas", "inventario"]) {
      const v = p[campo];
      if (v !== null && typeof v !== "number") return `"${campo}" debe ser número o null`;
    }
    return null;
  }),
  municipios: conDisponible((p) => {
    const lista = p["municipios"];
    if (!Array.isArray(lista)) return 'falta el campo "municipios" (array)';
    for (const m of lista) {
      if (!esObjeto(m)) return "un municipio no es un objeto";
      if (typeof m["codigoDane"] !== "string" || typeof m["nombre"] !== "string") {
        return "un municipio sin codigoDane o nombre";
      }
      if (typeof m["toneladas"] !== "number") return `municipio ${m["nombre"]} sin toneladas`;
      if (!Array.isArray(m["categorias"])) return `municipio ${m["nombre"]} sin categorías`;
    }
    return null;
  }),
  otras: conDisponible((p) => {
    if (typeof p["toneladas"] !== "number") return 'falta "toneladas" (número)';
    return exigirArray(p, "destinos");
  }),
  categorias: conDisponible((p) => {
    const err = exigirArray(p, "categorias");
    if (err) return err;
    return esObjeto(p["fueraDeCategoria"]) ? null : 'falta el campo "fueraDeCategoria"';
  }),
  faltantes: conDisponible((p) => exigirArray(p, "categorias")),
  contratacion: (p) => {
    if (!esObjeto(p)) return "se esperaba un objeto";
    if (!Array.isArray(p["contratos"])) return 'falta el campo "contratos" (array)';
    if (typeof p["valorTotalInformado"] !== "number") {
      return 'falta el campo "valorTotalInformado" (número)';
    }
    // Se revisa cada contrato porque el componente pinta `objeto` y arma
    // un href con `enlaceSecop`: un contrato mal formado no debe llegar
    // hasta ahí. Un enlace que no sea http(s) se rechaza en vez de
    // arreglarse, porque nunca debería salir del backend.
    for (const c of p["contratos"]) {
      if (!esObjeto(c)) return "un contrato no es un objeto";
      if (typeof c["id"] !== "string" || !c["id"]) return "un contrato sin id";
      if (typeof c["objeto"] !== "string" || !c["objeto"]) return `contrato ${c["id"]} sin objeto`;
      const valor = c["valorInicial"];
      if (valor !== null && (typeof valor !== "number" || !Number.isFinite(valor))) {
        return `contrato ${c["id"]} con valorInicial que no es número ni null`;
      }
      const estado = c["estado"];
      if (estado !== undefined && estado !== "Vigente" && estado !== "Finalizado") {
        return `contrato ${c["id"]} con un estado que no se publica`;
      }
      const enlace = c["enlaceSecop"];
      if (enlace !== null && (typeof enlace !== "string" || !/^https?:\/\//i.test(enlace))) {
        return `contrato ${c["id"]} con enlaceSecop que no es una URL http(s)`;
      }
    }
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
  esObjeto(p) && "resumen" in p ? null : "se esperaba un objeto con las partes del tablero";

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
    baseUrl: string = this.baseUrl,
  ): Promise<T> {
    // La base puede ser relativa (/api/tablero, el proxy del mismo
    // dominio) o absoluta (el /exec directo). `new URL` exige una base
    // para las relativas; las consultas solo corren en el navegador, y el
    // respaldo existe solo para que un render del servidor no explote.
    const origen = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(baseUrl, origen);
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
      throw new ApiError(
        `Error de red en route=${route}: HTTP ${response.status}`,
        response.status,
      );
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
    // Solo en desarrollo: VITE_TABLERO_FIXTURE=1 sirve una copia de la
    // respuesta (src/data/tablero.fixture.ts: despachos y contratos
    // reales, y un ejemplo marcado para «qué hace falta») mientras el Web
    // App desplegado no tiene las rutas. `import.meta.env.DEV` es una
    // constante en el build, así que en producción esta rama y el JSON no
    // se incluyen.
    if (import.meta.env.DEV && import.meta.env["VITE_TABLERO_FIXTURE"] === "1") {
      return import("@/data/tablero.fixture").then((m) => m.default as unknown as BundleResponse);
    }
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

  /** Totales, fecha de corte y calidad de los despachos del Excel oficial. */
  getResumen(): Promise<ResumenRespuesta> {
    return this.parte("resumen", () =>
      this.request<ResumenRespuesta>("resumen", {}, VALIDADORES.resumen),
    );
  }

  /** Los 42 municipios, con sus toneladas aproximadas y categorías. */
  getMunicipios(): Promise<MunicipiosRespuesta> {
    return this.parte("municipios", () =>
      this.request<MunicipiosRespuesta>("municipios", {}, VALIDADORES.municipios),
    );
  }

  /** Ayudas a fundaciones, otros departamentos y otras entidades. */
  getOtras(): Promise<OtrasRespuesta> {
    return this.parte("otras", () => this.request<OtrasRespuesta>("otras", {}, VALIDADORES.otras));
  }

  /** Las 7 categorías del tablero y lo que quedó fuera de ellas. */
  getCategorias(): Promise<CategoriasRespuesta> {
    return this.parte("categorias", () =>
      this.request<CategoriasRespuesta>("categorias", {}, VALIDADORES.categorias),
    );
  }

  /**
   * Lo que falta hoy en el centro de acopio. Es la única parte que NO se
   * guarda en el navegador (ver usePrecargaDesdeSnapshot): una lista de
   * faltantes vieja manda a la gente a donar lo que ya sobra.
   */
  getFaltantes(): Promise<FaltantesRespuesta> {
    return this.parte("faltantes", () =>
      this.request<FaltantesRespuesta>("faltantes", {}, VALIDADORES.faltantes),
    );
  }

  /** Contratos de la reconstrucción, de la hoja CONTRATACION. */
  getContratacion(): Promise<ContratacionResponse> {
    // Solo en desarrollo: permite probar la hoja con un Apps Script aparte
    // (apps-script/prueba) mientras el Web App real no tiene la ruta. En
    // producción esta variable no se lee, así que no puede desviar el tráfico.
    const urlPrueba = import.meta.env.DEV
      ? import.meta.env["VITE_CONTRATACION_URL_PRUEBA"]
      : undefined;
    if (typeof urlPrueba === "string" && urlPrueba) {
      return this.request<ContratacionResponse>(
        "contratacion",
        {},
        VALIDADORES.contratacion,
        urlPrueba,
      );
    }
    return this.parte("contratacion", () =>
      this.request<ContratacionResponse>("contratacion", {}, VALIDADORES.contratacion),
    );
  }
}
