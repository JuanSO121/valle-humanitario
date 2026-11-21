/**
 * Libro simulado para probar la carga de /admin sin tocar Google.
 *
 * Carga los archivos REALES del script (apps-script/*.js) en un contexto aislado y les presta un «Google»
 * de mentira: hojas en memoria que SÍ guardan lo que se escribe, y que se pueden alterar a mitad de una
 * carga para simular que otra persona edita el libro.
 *
 * No necesita Excel ni ninguna dependencia: el libro de prueba se arma aquí.
 */
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../apps-script");
const ARCHIVOS = [
  "Config", "Utils", "Sheetservice", "Catalogo42", "Totales", "Faltantes",
  "Contratacion", "Despachos", "Precalentar", "Admin",
];

const col = (s) => s.split("").reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
function parseRango(r) {
  const m = /^'(.+)'!([A-Z]+)(\d+):([A-Z]+)(\d*)$/.exec(r);
  if (!m) throw new Error("Rango A1 no válido en la prueba: " + r);
  return { hoja: m[1], c1: col(m[2]), f1: +m[3], c2: col(m[4]), f2: m[5] ? +m[5] : 99999 };
}
const serialAIso = (n) => new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10);

/** Libro de prueba con lo mínimo de cada hoja, con las mismas columnas que el libro real. */
export function libroBase(ctx) {
  const muni = (n) => ctx.resolverMunicipio_(n);
  const dane = (n) => muni(n).codigoDane;
  const nombre = (n) => muni(n).nombre;
  const destino = (d, tipo, m) => [d, tipo, m ? dane(m) : "", m ? nombre(m) : "", "nombre", "", ""];
  return {
    DESPACHOS: [
      ["fecha", "destino", "familia", "producto", "presentacion", "cantidad", "peso_unitario_kg", "peso_total_kg", "por_verificar", "observaciones", "se_cuenta_en", "estado"],
      // Despachos pendientes del 11 al 24 de agosto: solo fecha y destino, con la nota del Excel anterior.
      ["2026-08-11", "El Cerrito", "", "", "", "", "", "", "", "Excel anterior (11-24 ago)", "", ""],
      ["2026-08-11", "El Cerrito", "", "", "", "", "", "", "", "Excel anterior (11-24 ago)", "", ""],
      ["2026-08-12", "Palmira", "", "", "", "", "", "", "", "Excel anterior (11-24 ago)", "", ""],
      // Despachos ya cargados.
      ["2026-08-25", "Cali", "Mercados y kits de alimentos", "Mercado", "kit", 50, 14, 700, "NO", "", "Santiago de Cali", "✔ Se publica"],
      ["2026-08-25", "Palmira", "Agua y bebidas", "Agua en bolsa", "paquete", 20, 10, 200, "NO", "", "Palmira", "✔ Se publica"],
      ["2026-08-26", "Cali – Chiminangos", "Colchonetas, cobijas y descanso", "Colchoneta", "unidad", 40, 2.5, 100, "NO", "", "Santiago de Cali", "✔ Se publica"],
    ],
    DESTINOS: [
      ["destino_original", "tipo_destino", "municipio_dane", "municipio", "regla", "registros", "toneladas"],
      destino("Cali", "municipio", "Cali"),
      destino("Cali – Chiminangos", "municipio", "Cali"),
      destino("Palmira", "municipio", "Palmira"),
      destino("El Cerrito", "municipio", "El Cerrito"),
      destino("Zarzal", "municipio", "Zarzal"),
      destino("Fundación Solidaria", "otra", null),
      destino("Buenaventura – Centro de Acopio", "traslado", null),
      destino("Sevilla - Caicedonia", "multiple", null),
    ],
    FAMILIAS: [
      ["familia", "categoria", "registros", "toneladas"],
      ["Mercados y kits de alimentos", "Alimentos", "", ""],
      ["Agua y bebidas", "Alimentos", "", ""],
      ["Colchonetas, cobijas y descanso", "Descanso y abrigo", "", ""],
      ["Kits de aseo e higiene (kits completos)", "Kit de aseo", "", ""],
      ["Alimentos y elementos para mascotas", "Mascotas", "", ""],
      ["Juguetería y recreación", "Fuera de categoría", "", ""],
    ],
    QUE_HACE_FALTA: [
      ["PLANTILLA ¿QUÉ HACE FALTA HOY?"],
      ["Escriba cada elemento…"],
      ["Agregue las filas que necesite…"],
      ["Categoría", "Elemento", "Estado", "Observaciones"],
      ["Alimentos"], ["Protección y seguridad"], ["Kit de aseo"], ["Descanso y abrigo"],
      ["Mascotas"], ["Ropa y calzado"], ["Menaje y utensilios"],
    ],
    TOTALES: [
      ["TOTALES DEL BALANCE"],
      ["Escriba, en la fila de abajo…"],
      [],
      ["Toneladas recibidas", "Toneladas en inventario", "Observaciones"],
      [],
    ],
    CONTRATACION: [
      ["contratacion_id", "dependencia", "objeto", "valor_inicial", "contratista", "enlace_secop", "estado"],
      ["CTR0001", "Departamento Administrativo de Desarrollo Institucional", "Prestación de servicios logísticos de los centros de acopio", 1300000000, "Prensa y Entretenimiento SAS", "https://community.secop.gov.co/c1", "Vigente"],
    ],
  };
}

/**
 * @param {object} [op]
 * @param {string|null} [op.token]    ADMIN_TOKEN del script (null = sin configurar)
 * @param {boolean} [op.lockOcupado]  simula que hay otra carga en curso
 * @param {object} [op.filasPorHoja]  filas que dice tener cada hoja (para probar que se agregan más)
 * @param {(hojas:object)=>void} [op.preparar] cambios al libro de prueba antes de empezar
 */
export function crearEntorno(op = {}) {
  const token = op.token === undefined ? "t".repeat(32) : op.token;
  const props = { LIBRO_OFICIAL_ID: "libro-oficial" };
  if (token) props.ADMIN_TOKEN = token;
  const cacheFallos = { n: 0 };
  const registros = {}; // lo que se agrega con appendRow (CARGAS, REEMPLAZOS, …)
  const triggers = [];
  const extensiones = [];
  const llamadas = { batchGet: 0, batchUpdate: 0, update: 0, clear: 0 };
  let hojas = {};
  let gancho = null; // se ejecuta justo antes de la próxima lectura de verificación
  let fallaEn = null; // { que: 'batchUpdate'|'update'|'clear', vez: n }
  const filasPorHoja = { DESPACHOS: 5000, QUE_HACE_FALTA: 800, CONTRATACION: 2000, DESTINOS: 600, ...(op.filasPorHoja || {}) };

  function escribir(rango, values) {
    const g = parseRango(rango);
    values.forEach((fila, i) => {
      const r = g.f1 - 1 + i;
      hojas[g.hoja][r] = hojas[g.hoja][r] || [];
      fila.forEach((v, j) => {
        // El libro devuelve las fechas de DESPACHOS como texto «aaaa-mm-dd».
        hojas[g.hoja][r][g.c1 + j] = g.hoja === "DESPACHOS" && g.c1 + j === 0 && typeof v === "number" ? serialAIso(v) : v;
      });
    });
  }
  function leer(rango) {
    const g = parseRango(rango);
    const out = [];
    for (let r = g.f1 - 1; r <= Math.min(g.f2 - 1, (hojas[g.hoja] || []).length - 1); r++) out.push((hojas[g.hoja][r] || []).slice(g.c1, g.c2 + 1));
    return out;
  }
  const contar = (que) => {
    llamadas[que] += 1;
    if (fallaEn && fallaEn.que === que && llamadas[que] === fallaEn.vez) throw new Error("falla simulada de Google en " + que);
  };

  const hojaFalsa = (n) => ({
    appendRow: (f) => { (registros[n] ||= []).push(f); },
    hideSheet() {},
    insertRowsAfter: (despues, cuantas) => { extensiones.push({ hoja: n, despues, cuantas }); filasPorHoja[n] += cuantas; },
    getMaxColumns: () => 26,
    getRange: () => ({ copyTo() {} }),
  });

  const ctx = vm.createContext({
    console, Math, JSON, Object, Date, Array, String, Number, isNaN, isFinite, RegExp,
    Logger: { log() {} },
    Utilities: { formatDate: (d) => d.toISOString().slice(0, 10) },
    Session: { getScriptTimeZone: () => "America/Bogota" },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: () => String(cacheFallos.n), put: (k, v) => { cacheFallos.n = Number(v); } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => !op.lockOcupado, releaseLock() {} }) },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger(t) { triggers.splice(triggers.indexOf(t), 1); },
      newTrigger: (f) => ({ timeBased: () => ({ after: () => ({ create: () => triggers.push({ getHandlerFunction: () => f, f }) }) }) }),
    },
    SpreadsheetApp: { openById: () => ({ getSheetByName: hojaFalsa, insertSheet: hojaFalsa }), getActiveSpreadsheet: () => null },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (t) => ({ texto: t, setMimeType() { return this; } }) },
    Sheets: {
      Spreadsheets: {
        get: () => ({ sheets: Object.keys(filasPorHoja).map((title) => ({ properties: { title, gridProperties: { rowCount: filasPorHoja[title] } } })) }),
        Values: {
          batchGet: (id, o) => {
            contar("batchGet");
            if (gancho) { const g = gancho; gancho = null; g(hojas); }
            return { valueRanges: o.ranges.map((r) => ({ values: leer(r) })) };
          },
          batchUpdate: (r) => { contar("batchUpdate"); r.data.forEach((d) => escribir(d.range, d.values)); },
          update: (r, id, rango) => { contar("update"); escribir(rango, r.values); },
          clear: (r, id, rango) => {
            contar("clear");
            const g = parseRango(rango);
            for (let i = g.f1 - 1; i < (hojas[g.hoja] || []).length && i < g.f2; i++) for (let j = g.c1; j <= g.c2; j++) if (hojas[g.hoja][i]) hojas[g.hoja][i][j] = "";
          },
        },
      },
    },
  });
  for (const f of ARCHIVOS) vm.runInContext(fs.readFileSync(path.join(RAIZ, f + ".js"), "utf8"), ctx, { filename: f + ".js" });
  ctx.idLibroOficial_ = () => "libro-oficial";
  ctx.idLibroFaltantes_ = () => "libro-oficial";
  ctx.idLibroContratacion_ = () => "libro-oficial";
  ctx.leerPestanasDeLibro_ = (id, quiere) => Object.keys(hojas).filter(quiere).map((n) => ({ nombre: n, matriz: hojas[n] }));
  vm.runInContext("hoyIso_ = function () { return '2026-11-20'; }", ctx);

  hojas = libroBase(ctx);
  if (op.preparar) op.preparar(hojas);

  const llamar = (js, datos) => { Object.assign(ctx, datos); return vm.runInContext(js, ctx); };
  const entorno = {
    ctx, props, registros, triggers, extensiones, llamadas,
    get hojas() { return hojas; },
    set hojas(v) { hojas = v; },
    /** Vuelve al libro de partida (para pruebas que comparten el mismo script). */
    reiniciar() {
      hojas = libroBase(ctx);
      if (op.preparar) op.preparar(hojas);
      for (const k of Object.keys(registros)) delete registros[k];
      triggers.length = 0;
      delete props.CACHE_PENDIENTE;
      cacheFallos.n = 0;
      gancho = null; fallaEn = null;
    },
    /** Cambia el libro justo antes de la próxima lectura de verificación (alguien edita mientras se carga). */
    alVerificar(fn) { gancho = fn; },
    /** Hace fallar una llamada a Google (la n-ésima de ese tipo). */
    fallarEn(que, vez = 1) { llamadas[que] = 0; fallaEn = { que, vez }; },
    sinFallas() { fallaEn = null; },
    /** Revisa (no escribe) y devuelve el plan como lo vería la página. */
    revisar(carga) { return JSON.parse(llamar("JSON.stringify(revisarCarga_(__c))", { __c: carga })); },
    /** Aplica; devuelve el resultado o { fallo: mensaje amistoso }. */
    aplicar(carga, decisiones) {
      try { return JSON.parse(llamar("JSON.stringify(aplicarCarga_(__c, __d))", { __c: carga, __d: decisiones })); }
      catch (e) { return { fallo: e && e.amistoso ? e.amistoso : "ERROR NO CONTROLADO: " + String(e && e.message ? e.message : e) }; }
    },
    /** Lo que llega por HTTP: el cuerpo tal cual, y la respuesta ya interpretada. */
    doPost(cuerpo) {
      const r = llamar("doPost(__e)", { __e: { postData: { contents: cuerpo } } });
      return JSON.parse(r.texto);
    },
    contratosPublicos() { return JSON.parse(llamar("JSON.stringify(buildContratacion_())", {})); },
    resumenPublico() { return JSON.parse(llamar("JSON.stringify(buildResumen_())", {})); },
    // atajos para armar cargas
    base: (extra) => ({ formato: "ruta-solidaridad/carga", version: 1, fuente: "prueba", ...extra }),
    fila: (o) => ({ fecha: "2026-11-02", destino: "Cali", familia: "Mercados y kits de alimentos", producto: "Mercado", presentacion: "kit", cantidad: 100, kilosUnitario: 14, kilosTotal: 1400, ...o }),
    contrato: (o) => ({ id: "CTR0002", dependencia: "Secretaría de Salud", objeto: "Compra de colchonetas para los albergues", valorInicial: 250000000, contratista: "Dotaciones SAS", enlaceSecop: "https://www.colombiacompra.gov.co/c2", estado: "Vigente", ...o }),
    ultimaFila(hoja, c = 0) { return hojas[hoja].reduce((a, f, i) => (f[c] !== "" && f[c] !== undefined ? i + 1 : a), 0); },
    filasConFecha() { return hojas.DESPACHOS.filter((f, i) => i > 0 && f[0] !== "" && f[0] !== undefined).length; },
  };
  return entorno;
}
