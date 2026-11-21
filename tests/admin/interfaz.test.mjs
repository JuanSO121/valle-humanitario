/**
 * Pruebas de la pantalla /admin en un navegador real (Chrome), contra el sitio de verdad y un Apps Script
 * de mentira. Se omiten solas si no están instaladas las herramientas:
 *     npm i --no-save puppeteer-core axe-core          (y Chrome en CHROME_PATH o /usr/bin/google-chrome)
 * Ejecutar:  node --test tests/admin/interfaz.test.mjs
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { iniciarAppsScript, iniciarSitio, ipNueva } from "./servidores.mjs";

let puppeteer = null;
let axeFuente = null;
try {
  puppeteer = (await import("puppeteer-core")).default;
  axeFuente = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
} catch { /* sin herramientas: se omite todo */ }
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const hay = puppeteer && fs.existsSync(CHROME);

const TOKEN = "token-de-prueba-muy-largo-1234567890abcdef";
const CLAVE = "clave-de-prueba-9876";
const opts = { skip: hay ? false : "falta puppeteer-core, axe-core o Chrome" };
let mock, sitio, navegador;
const dirTmp = fs.mkdtempSync(path.join(os.tmpdir(), "carga-ui-"));

before(async () => {
  if (!hay) return;
  mock = await iniciarAppsScript({ token: TOKEN });
  sitio = await iniciarSitio({ env: { TABLERO_V2_API_URL: mock.url, ADMIN_CLAVE: CLAVE, TABLERO_V2_ADMIN_TOKEN: TOKEN } });
  navegador = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
});
after(async () => {
  await navegador?.close();
  await Promise.allSettled([sitio?.cerrar(), mock?.cerrar()]);
  fs.rmSync(dirTmp, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------- ayudas
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function nuevaPagina({ ancho = 1280, idleMs = null } = {}) {
  const contexto = await navegador.createBrowserContext(); // almacenamiento limpio en cada prueba
  const page = await contexto.newPage();
  await page.setViewport({ width: ancho, height: 900 });
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ipNueva() });
  if (idleMs) await page.evaluateOnNewDocument((ms) => { window.__ADMIN_IDLE_MS__ = ms; }, idleMs);
  page.cerrar = () => contexto.close();
  return page;
}
async function abrir(page) { await page.goto(sitio.base + "/admin", { waitUntil: "networkidle0" }); }
async function entrar(page, clave = CLAVE) {
  await abrir(page);
  await page.type("input[type=password]", clave);
  await page.click("button[type=submit]");
}
async function iniciarSesion(page) {
  await entrar(page);
  await page.waitForSelector("input[type=file]", { timeout: 15000 });
}
const textoDe = (page, sel = "body") => page.$eval(sel, (e) => e.innerText);
const hayTexto = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t);
const clicTexto = (page, texto, sel = "button") =>
  page.evaluate((t, s) => { const b = [...document.querySelectorAll(s)].find((x) => x.textContent.trim().startsWith(t)); if (!b) throw new Error("no hay «" + t + "»"); b.click(); }, texto, sel);
const estaDeshabilitado = (page, texto) =>
  page.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith(t)); return b ? b.disabled : "no existe"; }, texto);
async function archivo(obj, nombre = "carga.json") {
  const ruta = path.join(dirTmp, Math.random().toString(36).slice(2) + "-" + nombre);
  fs.writeFileSync(ruta, typeof obj === "string" ? obj : JSON.stringify(obj));
  return ruta;
}
async function subir(page, obj) {
  const ruta = await archivo(obj);
  await (await page.$("input[type=file]")).uploadFile(ruta);
  await esperar(200);
}
async function revisar(page, obj) {
  await subir(page, obj);
  await clicTexto(page, "Revisar los datos");
  await page.waitForFunction(() => document.querySelector("[role=tab]") || document.querySelector("[role=alert]"), { timeout: 20000 });
}
async function marcarYCargar(page) {
  const cajas = await page.$$("input[type=checkbox]");
  await cajas[cajas.length - 1].click();
  await clicTexto(page, "Cargar al libro");
  await page.waitForFunction(() => document.body.innerText.includes("Listo, los datos se cargaron") || document.querySelector("[role=alert]"), { timeout: 30000 });
}
async function axe(page) {
  await page.evaluate(axeFuente);
  return page.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id + " x" + v.nodes.length));
}
const pestanas = (page) => page.$$eval("[role=tab]", (t) => t.map((x) => x.textContent.trim()));
const carga = (extra) => ({ formato: "ruta-solidaridad/carga", version: 1, fuente: "PLANTILLA_DADI.xlsx", ...extra });
const e = () => mock.entorno;
let n = 0;
const unica = () => carga({ informacionGeneral: { toneladasRecibidas: 5000 + ++n, toneladasInventario: 100 + n } });
const conPagina = (opciones, fn) => async () => {
  e().reiniciar();
  mock.modo = "normal";
  const page = await nuevaPagina(opciones);
  try { await fn(page); } finally { await page.cerrar(); }
};

// ----------------------------------------------------------------------------- la entrada
describe("Pantalla de entrada", opts, () => {
  it("muestra SOLO la entrada: nada de la carga hasta que la clave sea correcta", conPagina({}, async (page) => {
    await abrir(page);
    assert.match(await textoDe(page, "h1"), /Cargar datos al tablero/);
    assert.ok(await page.$("input[type=password]"));
    assert.equal(await page.$("input[type=file]"), null);
    assert.equal(await page.$("textarea"), null);
    assert.ok(!(await hayTexto(page, "Archivo de la carga")));
    assert.ok(!(await hayTexto(page, "Revisar los datos")));
    assert.equal(await page.$eval("a[href='/']", (a) => a.textContent.trim()), "Volver al tablero");
  }));
  it("«Entrar» está deshabilitado hasta que se escribe algo", conPagina({}, async (page) => {
    await abrir(page);
    assert.equal(await estaDeshabilitado(page, "Entrar"), true);
    await page.type("input[type=password]", "x");
    assert.equal(await estaDeshabilitado(page, "Entrar"), false);
  }));
  it("la clave se escribe oculta y el campo no pide guardarla", conPagina({}, async (page) => {
    await abrir(page);
    assert.equal(await page.$eval("input", (i) => i.type), "password");
    assert.equal(await page.$eval("input", (i) => i.autocomplete), "off");
  }));
  it("una clave incorrecta muestra el mensaje, vacía el campo y no muestra la carga", conPagina({}, async (page) => {
    await entrar(page, "clave-equivocada");
    await page.waitForSelector("[role=alert]");
    assert.match(await textoDe(page, "[role=alert]"), /La clave no es correcta/);
    assert.equal(await page.$eval("input", (i) => i.value), "");
    assert.equal(await page.$("input[type=file]"), null);
  }));
  it("tras varios errores se bloquea y avisa; ni la clave correcta entra en ese momento", conPagina({}, async (page) => {
    await abrir(page);
    for (let i = 0; i < 5; i++) {
      await page.type("input[type=password]", "mala" + i);
      await page.click("button[type=submit]");
      await page.waitForFunction((k) => document.querySelector("[role=alert]") && document.querySelector("input").value === "" && document.querySelector("[role=alert]").textContent.length > 0, {}, i);
      await esperar(300);
    }
    await page.type("input[type=password]", CLAVE);
    await page.click("button[type=submit]");
    await page.waitForFunction(() => /Demasiados intentos/.test(document.body.innerText), { timeout: 15000 });
    assert.equal(await page.$("input[type=file]"), null);
  }));
  it("Enter en el campo envía la clave", conPagina({}, async (page) => {
    await abrir(page);
    await page.type("input[type=password]", CLAVE);
    await page.keyboard.press("Enter");
    await page.waitForSelector("input[type=file]", { timeout: 15000 });
  }));
  it("con la clave correcta aparece la carga, sin campo de clave y con «Dejar de cargar»", conPagina({}, async (page) => {
    await iniciarSesion(page);
    assert.ok(await hayTexto(page, "Archivo de la carga"));
    assert.equal(await page.$("input[type=password]"), null);
    assert.ok(!(await hayTexto(page, "Ingrese la clave")));
    assert.equal(await estaDeshabilitado(page, "Dejar de cargar"), false);
    assert.ok(await hayTexto(page, "Revisar los datos"));
  }));
  it("la clave no queda guardada: ni almacenamiento, ni cookies, ni en la página", conPagina({}, async (page) => {
    await iniciarSesion(page);
    const rastro = await page.evaluate(async (clave) => ({
      local: Object.keys(localStorage).length, sesion: Object.keys(sessionStorage).length, cookies: document.cookie,
      html: document.documentElement.outerHTML.includes(clave), nombre: window.name.includes(clave),
      bases: (await indexedDB.databases?.())?.length ?? 0, url: location.href.includes(clave),
    }), CLAVE);
    assert.deepEqual(rastro, { local: 0, sesion: 0, cookies: "", html: false, nombre: false, bases: 0, url: false });
  }));
  it("«Dejar de cargar» lleva al tablero y la carga ya no está disponible", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), clicTexto(page, "Dejar de cargar")]);
    assert.equal(page.url(), sitio.base + "/");
    assert.equal(await page.$("input[type=file]"), null);
  }));
  it("«Dejar de cargar» no deja la carga en el historial: volver atrás no la reabre", conPagina({}, async (page) => {
    await abrir(page);
    await iniciarSesion(page);
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), clicTexto(page, "Dejar de cargar")]);
    await page.goBack().catch(() => {});
    await esperar(800);
    assert.equal(await page.$("input[type=file]"), null, "tras volver atrás no debe haber carga abierta");
  }));
  it("tras salir, volver a /admin pide la clave otra vez", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), clicTexto(page, "Dejar de cargar")]);
    await abrir(page);
    assert.ok(await page.$("input[type=password]"));
    assert.equal(await page.$("input[type=file]"), null);
  }));
  it("recargar la página cierra la sesión (la clave solo vive en la memoria)", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await page.reload({ waitUntil: "networkidle0" });
    assert.ok(await page.$("input[type=password]"));
    assert.equal(await page.$("input[type=file]"), null);
  }));
  it("«Volver al tablero» lleva a la página principal", conPagina({}, async (page) => {
    await abrir(page);
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click("a[href='/']")]);
    assert.equal(page.url(), sitio.base + "/");
  }));
});

describe("Sesión: inactividad y clave que deja de servir", opts, () => {
  it("sin actividad, la sesión se cierra, olvida la clave y lo explica", conPagina({ idleMs: 1500 }, async (page) => {
    await iniciarSesion(page);
    await page.waitForFunction(() => document.querySelector("input[type=password]"), { timeout: 8000 });
    assert.match(await textoDe(page), /inactividad/);
    assert.equal(await page.$eval("input[type=password]", (i) => i.value), "");
    assert.equal(await page.$("input[type=file]"), null);
  }));
  it("la actividad reinicia el reloj (no se cierra mientras se usa)", conPagina({ idleMs: 2500 }, async (page) => {
    await iniciarSesion(page);
    for (let i = 0; i < 3; i++) { await esperar(1200); await page.mouse.click(5, 5); }
    assert.ok(await page.$("input[type=file]"), "debe seguir abierta tras 3,6 s de uso");
    await page.waitForFunction(() => document.querySelector("input[type=password]"), { timeout: 9000 });
  }));
  it("no se cierra a mitad de una petición larga", conPagina({ idleMs: 1500 }, async (page) => {
    await iniciarSesion(page);
    await page.setRequestInterception(true);
    page.on("request", async (rq) => {
      if (rq.url().includes("/api/admin") && /"revisar"/.test(rq.postData() ?? "")) await esperar(3500);
      rq.continue().catch(() => {});
    });
    await subir(page, unica());
    await clicTexto(page, "Revisar los datos");
    await page.waitForSelector("[role=tab]", { timeout: 15000 });
    assert.ok(await hayTexto(page, "Información general"), "la revisión llegó y la sesión seguía abierta");
  }));
  it("si la clave deja de servir en plena sesión (401), vuelve a la entrada", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await page.setRequestInterception(true);
    page.on("request", (rq) => {
      if (rq.url().includes("/api/admin")) rq.respond({ status: 401, contentType: "application/json", body: JSON.stringify({ error: true, status: 401, message: "La clave no es correcta." }) });
      else rq.continue();
    });
    await subir(page, unica());
    await clicTexto(page, "Revisar los datos");
    await page.waitForSelector("input[type=password]", { timeout: 10000 });
    assert.match(await textoDe(page), /ya no es válida/);
  }));
});

// ----------------------------------------------------------------------------- el archivo
describe("Elegir el archivo", opts, () => {
  it("un JSON roto: mensaje claro y no se puede revisar", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await (await page.$("input[type=file]")).uploadFile(await archivo("{esto no es json"));
    await page.waitForSelector("[role=alert]");
    assert.match(await textoDe(page, "[role=alert]"), /no se pudo leer/);
    assert.equal(await estaDeshabilitado(page, "Revisar los datos"), true);
  }));
  it("un archivo vacío: mensaje claro", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await (await page.$("input[type=file]")).uploadFile(await archivo(""));
    await page.waitForSelector("[role=alert]");
    assert.equal(await estaDeshabilitado(page, "Revisar los datos"), true);
  }));
  it("un archivo de más de 2,4 MB se rechaza antes de mandarlo", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await (await page.$("input[type=file]")).uploadFile(await archivo(JSON.stringify(carga({ avisos: ["x".repeat(2_500_000)] }))));
    await page.waitForSelector("[role=alert]");
    assert.match(await textoDe(page, "[role=alert]"), /demasiado grande/);
    assert.equal(await estaDeshabilitado(page, "Revisar los datos"), true);
  }));
  it("un JSON válido de otro formato: lo explica el servidor y no deja cargar", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, { hola: "mundo" });
    assert.match(await textoDe(page), /no es una carga válida/);
    assert.equal(await page.$("input[type=checkbox]"), null, "sin casilla de confirmación");
    assert.ok(!(await hayTexto(page, "Cargar al libro")) || (await estaDeshabilitado(page, "Cargar al libro")) !== false);
  }));
  it("un archivo correcto después de uno malo limpia el mensaje", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await (await page.$("input[type=file]")).uploadFile(await archivo("{roto"));
    await page.waitForSelector("[role=alert]");
    await (await page.$("input[type=file]")).uploadFile(await archivo(unica()));
    await page.waitForFunction(() => !document.querySelector("[role=alert]"));
    assert.equal(await estaDeshabilitado(page, "Revisar los datos"), false);
  }));
  it("pegar el texto en lugar de elegir un archivo también funciona", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await clicTexto(page, "O pegue el texto", "summary");
    await page.$eval("textarea", (t, v) => {
      const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      set.call(t, v);
      t.dispatchEvent(new Event("input", { bubbles: true }));
    }, JSON.stringify(unica()));
    await esperar(200);
    assert.equal(await estaDeshabilitado(page, "Revisar los datos"), false);
    await clicTexto(page, "Revisar los datos");
    await page.waitForSelector("[role=tab]", { timeout: 15000 });
    assert.deepEqual(await pestanas(page), ["Información general"]);
  }));
  it("borrar el texto pegado vuelve a deshabilitar «Revisar»", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await clicTexto(page, "O pegue el texto", "summary");
    await page.type("textarea", "{");
    await page.waitForSelector("[role=alert]");
    await page.$eval("textarea", (t) => { const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set; set.call(t, ""); t.dispatchEvent(new Event("input", { bubbles: true })); });
    await esperar(200);
    assert.equal(await estaDeshabilitado(page, "Revisar los datos"), true);
  }));
});

// ----------------------------------------------------------------------------- cada sección
describe("Cargar cada tipo de dato", opts, () => {
  it("totales: se ve cómo está hoy y cómo quedaría, y se cargan", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, carga({ informacionGeneral: { toneladasRecibidas: 1234.5, toneladasInventario: 300.5 } }));
    assert.deepEqual(await pestanas(page), ["Información general"]);
    const t = await textoDe(page, "[role=tabpanel]");
    assert.match(t, /Sin dato/);
    assert.match(t, /1\.234,5/);
    assert.match(await textoDe(page), /Se cambiarán las cifras generales: toneladas recibidas 1\.234,5 y toneladas en inventario 300,5/);
    await marcarYCargar(page);
    assert.match(await textoDe(page), /Cifras generales cambiadas: 2/);
    assert.deepEqual(e().hojas.TOTALES[4].slice(0, 2), [1234.5, 300.5]);
  }));
  it("qué hace falta: muestra lo que desaparece y reemplaza la lista", conPagina({}, async (page) => {
    e().hojas.QUE_HACE_FALTA[4] = ["Kit de aseo", "Jabón", "Agotado", ""];
    await iniciarSesion(page);
    await revisar(page, carga({ queHaceFalta: [{ categoria: "Alimentos", elemento: "Arroz", estado: "Escaso" }, { categoria: "Cosas", elemento: "X", estado: "Escaso" }] }));
    assert.deepEqual(await pestanas(page), ["Qué hace falta"]);
    const t = await textoDe(page, "[role=tabpanel]");
    assert.match(t, /se quitarán/);
    assert.match(t, /Jabón/);
    assert.match(t, /La categoría no es una de las 7/);
    await marcarYCargar(page);
    assert.match(await textoDe(page), /Elementos de «Qué hace falta»: 1/);
    assert.equal(e().hojas.QUE_HACE_FALTA[4][1], "Arroz");
  }));
  it("contratos nuevos: se agregan con su estado", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, carga({ contratacion: [e().contrato(), e().contrato({ id: "CTR0003", estado: "Finalizado" })] }));
    assert.deepEqual(await pestanas(page), ["Contratos"]);
    assert.match(await textoDe(page, "[role=tabpanel]"), /Finalizado/);
    assert.match(await textoDe(page), /Se agregarán 2 contratos/);
    await marcarYCargar(page);
    assert.match(await textoDe(page), /Contratos nuevos: 2/);
    assert.equal(e().hojas.CONTRATACION[3][6], "Finalizado");
  }));
  it("destinos nuevos: se agregan, y los errores se explican", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, carga({ destinosNuevos: [{ destino: "Fundación Manos Unidas", tipo: "otra" }, { destino: "Cali Chiminangos", tipo: "municipio", municipio: "Cali" }, { destino: "Zarzal – El Prado", tipo: "municipio", municipio: "Zarzal" }] }));
    assert.deepEqual(await pestanas(page), ["Destinos nuevos"]);
    const t = await textoDe(page, "[role=tabpanel]");
    assert.match(t, /Se parece mucho a «Cali – Chiminangos»/);
    assert.match(await textoDe(page), /Se agregarán 2 destinos nuevos/);
    await marcarYCargar(page);
    assert.match(await textoDe(page), /Destinos nuevos: 2/);
    assert.equal(e().hojas.DESTINOS.at(-1)[2], "76895");
  }));
  it("despachos: filas con aviso, con error y ya cargadas se distinguen; el filtro y la paginación funcionan", conPagina({}, async (page) => {
    await iniciarSesion(page);
    const filas = [
      e().fila({ fecha: "2026-08-25", producto: "Mercado", cantidad: 50, kilosUnitario: 14, kilosTotal: 700 }), // ya está
      e().fila({ destino: "Lugar desconocido" }), // aviso
      e().fila({ familia: "Inventada" }), // error
      ...Array.from({ length: 30 }, (_, i) => e().fila({ fecha: "2026-11-05", producto: "P" + i, cantidad: null, kilosUnitario: null, kilosTotal: 10 + i })),
    ];
    await revisar(page, carga({ distribucion: filas }));
    assert.deepEqual(await pestanas(page), ["Distribución"]);
    const chips = await page.$$eval("[role=tabpanel] tbody td span.rounded-full", (s) => s.map((x) => x.textContent));
    assert.ok(chips.includes("Ya está, no se repite") && chips.includes("No se carga") && chips.includes("Se agrega"));
    assert.ok(await page.$("nav[aria-label='Páginas de la tabla']"), "más de 25 filas: hay paginación");
    await page.click("[role=tabpanel] input[type=checkbox]");
    await esperar(200);
    const visibles = await page.$$eval("[role=tabpanel] tbody tr", (r) => r.length);
    assert.equal(visibles, 2, "el filtro deja solo la fila con aviso y la que tiene error");
  }));
  it("despachos con conflicto: dos opciones se ven lado a lado; reemplazar cambia la fila del libro", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, carga({ distribucion: [e().fila({ fecha: "2026-08-25", producto: "Mercado", cantidad: null, kilosUnitario: null, kilosTotal: 999 })] }));
    assert.match((await pestanas(page))[0], /Conflictos \(1\)/);
    assert.equal(await page.$$eval("[role=tabpanel] input[type=radio]", (r) => r.length), 3);
    assert.match(await textoDe(page, "[role=tabpanel]"), /en el libro/i);
    assert.equal(await estaDeshabilitado(page, "Cargar al libro"), true);
    assert.match(await textoDe(page), /Falta 1 conflicto por decidir/);
    const radios = await page.$$("[role=tabpanel] input[type=radio]");
    await radios[1].click();
    await marcarYCargar(page);
    assert.equal(e().hojas.DESPACHOS[4][7], 999);
  }));
  it("contratos con conflicto: solo dejar o cambiar; marcar como Finalizado", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, carga({ contratacion: [{ ...e().contrato({ id: "CTR0001" }), dependencia: "Departamento Administrativo de Desarrollo Institucional", objeto: "Prestación de servicios logísticos de los centros de acopio", valorInicial: 1300000000, contratista: "Prensa y Entretenimiento SAS", enlaceSecop: "https://community.secop.gov.co/c1", estado: "Finalizado" }] }));
    assert.match((await pestanas(page))[0], /Conflictos \(1\)/);
    assert.equal(await page.$$eval("[role=tabpanel] input[type=radio]", (r) => r.length), 2);
    assert.match(await textoDe(page, "[role=tabpanel]"), /Finalizado/);
    await (await page.$$("[role=tabpanel] input[type=radio]"))[1].click();
    await marcarYCargar(page);
    assert.equal(e().hojas.CONTRATACION[1][6], "Finalizado");
  }));
  it("los botones «decidir todos» sirven, y «agregar todas» no toca los contratos", conPagina({}, async (page) => {
    await iniciarSesion(page);
    const c = carga({
      contratacion: [{ ...e().contrato({ id: "CTR0001" }), objeto: "Otro objeto" }],
      distribucion: [e().fila({ fecha: "2026-08-25", producto: "Mercado", cantidad: null, kilosUnitario: null, kilosTotal: 999 })],
    });
    await revisar(page, c);
    await clicTexto(page, "Son todos distintos");
    await esperar(200);
    assert.match(await textoDe(page), /Falta 1 conflicto por decidir/, "el contrato sigue sin decidir");
    await clicTexto(page, "Dejar todas las del libro");
    await esperar(200);
    assert.ok(!(await hayTexto(page, "por decidir. Vaya")), "ya no falta ninguno");
  }));
  it("todo junto en una sola carga: el resumen lo cuenta y todo se escribe", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, carga({
      informacionGeneral: { toneladasRecibidas: 900.5, toneladasInventario: 55 },
      queHaceFalta: [{ categoria: "Alimentos", elemento: "Arroz", estado: "Escaso" }],
      destinosNuevos: [{ destino: "Fundación Manos Unidas", tipo: "otra" }],
      contratacion: [e().contrato()],
      distribucion: [e().fila({ destino: "Fundación Manos Unidas" })],
    }));
    assert.deepEqual(await pestanas(page), ["Distribución", "Qué hace falta", "Información general", "Contratos", "Destinos nuevos"]);
    const t = await textoDe(page);
    assert.match(t, /Se cargarán 1 filas de distribución/);
    assert.match(t, /Se agregará 1 contrato/);
    assert.match(t, /Se agregará 1 destino nuevo/);
    await marcarYCargar(page);
    const f = await textoDe(page);
    for (const r of [/Filas nuevas de distribución: 1/, /Cifras generales cambiadas: 2/, /Contratos nuevos: 1/, /Destinos nuevos: 1/, /Elementos de «Qué hace falta»: 1/]) assert.match(f, r);
  }));
  it("si todo el archivo tiene problemas, dice que no hay nada que cargar", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, carga({ distribucion: [e().fila({ familia: "Inventada" })], contratacion: [{ id: "" }], destinosNuevos: [{ tipo: "raro" }] }));
    assert.match(await textoDe(page), /no hay nada que se pueda cargar/);
    assert.equal(await page.$("input[type=checkbox]:not([role])") && (await estaDeshabilitado(page, "Cargar al libro")) === false, false);
  }));
});

// ----------------------------------------------------------------------------- el momento de cargar
describe("El momento de cargar", opts, () => {
  it("«Cargar» no se activa hasta marcar la casilla de revisión", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, unica());
    assert.equal(await estaDeshabilitado(page, "Cargar al libro"), true);
    const cajas = await page.$$("input[type=checkbox]");
    await cajas.at(-1).click();
    assert.equal(await estaDeshabilitado(page, "Cargar al libro"), false);
    await cajas.at(-1).click();
    assert.equal(await estaDeshabilitado(page, "Cargar al libro"), true);
  }));
  it("la revisión NO escribe nada en el libro", conPagina({}, async (page) => {
    const antes = JSON.stringify(e().hojas);
    await iniciarSesion(page);
    await revisar(page, carga({ informacionGeneral: { toneladasRecibidas: 77 }, distribucion: [e().fila({})], contratacion: [e().contrato()] }));
    assert.equal(JSON.stringify(e().hojas), antes);
  }));
  it("pulsar «Cargar» varias veces seguidas manda UNA sola petición", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, unica());
    const cajas = await page.$$("input[type=checkbox]");
    await cajas.at(-1).click();
    let aplicar = 0;
    page.on("request", (rq) => { if (rq.url().includes("/api/admin") && /"aplicar"/.test(rq.postData() ?? "")) aplicar += 1; });
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Cargar al libro"); for (let i = 0; i < 4; i++) b.click(); });
    await page.waitForFunction(() => document.body.innerText.includes("Listo, los datos se cargaron"), { timeout: 20000 });
    assert.equal(aplicar, 1);
  }));
  it("mientras carga, los controles se bloquean", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, unica());
    await page.setRequestInterception(true);
    page.on("request", async (rq) => { if (/"aplicar"/.test(rq.postData() ?? "")) await esperar(1500); rq.continue().catch(() => {}); });
    await (await page.$$("input[type=checkbox]")).at(-1).click();
    await clicTexto(page, "Cargar al libro");
    await esperar(300);
    assert.match(await textoDe(page), /Cargando… no cierre esta página/);
    assert.equal(await estaDeshabilitado(page, "Cargando"), true);
    assert.equal(await page.$eval("input[type=file]", (i) => i.disabled), true);
  }));
  it("«Hacer otra carga» vuelve al principio, vacío", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, unica());
    await marcarYCargar(page);
    await clicTexto(page, "Hacer otra carga");
    await page.waitForSelector("input[type=file]");
    assert.equal(await estaDeshabilitado(page, "Revisar los datos"), true);
    assert.equal(await page.$("[role=tab]"), null);
  }));
  it("subir otra vez lo mismo dice que ya está y no deja volver a cargarlo", conPagina({}, async (page) => {
    await iniciarSesion(page);
    const c = carga({ distribucion: [e().fila({})] });
    await revisar(page, c);
    await marcarYCargar(page);
    await clicTexto(page, "Hacer otra carga");
    await page.waitForSelector("input[type=file]");
    await revisar(page, c);
    const chips = await page.$$eval("[role=tabpanel] tbody td span.rounded-full", (s) => s.map((x) => x.textContent));
    assert.deepEqual(chips, ["Ya está, no se repite"]);
    assert.match(await textoDe(page), /no hay nada que se pueda cargar/);
  }));
  it("si el script falla al revisar, lo dice con claridad y se puede reintentar", conPagina({}, async (page) => {
    await iniciarSesion(page);
    mock.modo = "html";
    await revisar(page, unica());
    assert.match(await textoDe(page, "[role=alert]"), /No se pudo comunicar con el libro/);
    mock.modo = "normal";
    await clicTexto(page, "Revisar los datos");
    await page.waitForSelector("[role=tab]", { timeout: 15000 });
  }));
  it("si falla al cargar, conserva la tabla y no pierde la revisión", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, unica());
    await (await page.$$("input[type=checkbox]")).at(-1).click();
    mock.modo = "error400";
    await clicTexto(page, "Cargar al libro");
    await page.waitForSelector("[role=alert]", { timeout: 20000 });
    mock.modo = "normal";
    assert.match(await textoDe(page, "[role=alert]"), /columnas esperadas/);
    assert.ok(await page.$("[role=tab]"), "la tabla sigue ahí");
  }));
  it("un libro que cambió mientras se cargaba muestra el aviso y no escribe", conPagina({}, async (page) => {
    await iniciarSesion(page);
    await revisar(page, carga({ distribucion: [e().fila({})] }));
    e().alVerificar((h) => { h.DESPACHOS.push(["2026-11-19", "Tuluá"]); });
    await (await page.$$("input[type=checkbox]")).at(-1).click();
    await clicTexto(page, "Cargar al libro");
    await page.waitForSelector("[role=alert]", { timeout: 20000 });
    assert.match(await textoDe(page, "[role=alert]"), /cambió mientras/);
  }));
});

// ----------------------------------------------------------------------------- accesibilidad y pantallas chicas
describe("Accesibilidad y celular", opts, () => {
  it("la entrada y la carga no tienen violaciones de accesibilidad (WCAG A y AA)", conPagina({}, async (page) => {
    await abrir(page);
    assert.deepEqual(await axe(page), []);
    await iniciarSesion(page);
    assert.deepEqual(await axe(page), []);
    await revisar(page, carga({ distribucion: [e().fila({ fecha: "2026-08-25", producto: "Mercado", cantidad: null, kilosUnitario: null, kilosTotal: 999 }), e().fila({})], contratacion: [e().contrato()], destinosNuevos: [{ destino: "X nuevo", tipo: "otra" }], informacionGeneral: { toneladasRecibidas: 1 }, queHaceFalta: [{ categoria: "Alimentos", elemento: "Arroz", estado: "Escaso" }] }));
    assert.deepEqual(await axe(page), [], "con los conflictos a la vista");
  }));
  it("en el celular la entrada y la carga no tienen desplazamiento horizontal", conPagina({ ancho: 390 }, async (page) => {
    await abrir(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await iniciarSesion(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await revisar(page, carga({ distribucion: [e().fila({})], contratacion: [e().contrato()] }));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "las tablas se desplazan dentro de su caja, no la página");
  }));
  it("el foco empieza en el campo de la clave y los botones se alcanzan con el teclado", conPagina({}, async (page) => {
    await abrir(page);
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), "INPUT");
    await page.keyboard.type(CLAVE);
    await page.keyboard.press("Enter");
    await page.waitForSelector("input[type=file]", { timeout: 15000 });
    await page.keyboard.press("Tab");
    assert.ok(await page.evaluate(() => document.activeElement && document.activeElement !== document.body));
  }));
});
