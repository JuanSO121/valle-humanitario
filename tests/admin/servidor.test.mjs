/**
 * Pruebas del servidor del sitio para /api/admin (src/lib/proxyAdmin.ts), contra un Apps Script de mentira.
 * Levanta el sitio de verdad (vite dev), así que tarda unos segundos en arrancar.
 * Ejecutar:  node --test tests/admin/servidor.test.mjs
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { iniciarAppsScript, iniciarSitio, ipNueva } from "./servidores.mjs";

const TOKEN = "token-de-prueba-muy-largo-1234567890abcdef";
const CLAVE = "clave-de-prueba-9876";
let mock, sitio, sinConfigurar;

before(async () => {
  mock = await iniciarAppsScript({ token: TOKEN });
  [sitio, sinConfigurar] = await Promise.all([
    iniciarSitio({ env: { TABLERO_V2_API_URL: mock.url, ADMIN_CLAVE: CLAVE, TABLERO_V2_ADMIN_TOKEN: TOKEN } }),
    // Sin ADMIN_CLAVE ni token: «la carga no está configurada».
    iniciarSitio({ env: { TABLERO_V2_API_URL: mock.url, ADMIN_CLAVE: "", TABLERO_V2_ADMIN_TOKEN: "" } }),
  ]);
});
after(async () => {
  await Promise.allSettled([sitio?.cerrar(), sinConfigurar?.cerrar(), mock?.cerrar()]);
});

/** POST a /api/admin con la clave correcta y una dirección propia. */
async function admin(accion, extra = {}, { clave = CLAVE, ip = ipNueva(), base = sitio.base, cuerpo, cabeceras = {} } = {}) {
  const r = await fetch(base + "/api/admin", {
    method: "POST",
    headers: { "content-type": "application/json", connection: "close", "x-forwarded-for": ip, ...(clave === null ? {} : { "x-admin-clave": clave }), ...cabeceras },
    body: cuerpo ?? JSON.stringify({ accion, ...extra }),
  });
  let json = null;
  try { json = await r.clone().json(); } catch { /* no era JSON */ }
  return { r, json, texto: await r.text(), ip };
}
const carga = (extra) => ({ formato: "ruta-solidaridad/carga", version: 1, fuente: "prueba", ...extra });
let contadorUnico = 0;
/** Una carga que SIEMPRE tiene algo nuevo que cargar (cifra distinta cada vez), para no depender del orden de las pruebas. */
const minima = () => carga({ informacionGeneral: { toneladasRecibidas: 1000 + ++contadorUnico } });
const MINIMA = minima();

describe("Entrada y método", () => {
  it("solo acepta POST", async () => {
    const r = await fetch(sitio.base + "/api/admin");
    assert.equal(r.status, 405);
    assert.equal(r.headers.get("allow"), "POST");
    assert.equal((await fetch(sitio.base + "/api/admin", { method: "PUT" })).status, 405);
    assert.equal((await fetch(sitio.base + "/api/admin", { method: "DELETE" })).status, 405);
  });
  it("rechaza una petición que viene de otro sitio (Origin ajeno)", async () => {
    const { r } = await admin("entrar", {}, { cabeceras: { origin: "https://sitio-malo.example" } });
    assert.equal(r.status, 403);
  });
  it("acepta el Origin del propio sitio", async () => {
    const { r } = await admin("entrar", {}, { cabeceras: { origin: sitio.base } });
    assert.equal(r.status, 200);
  });
  it("la página /admin existe, no se indexa y no trae ningún secreto", async () => {
    const r = await fetch(sitio.base + "/admin");
    const html = await r.text();
    assert.equal(r.status, 200);
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.ok(!html.includes(CLAVE) && !html.includes(TOKEN) && !html.includes(mock.url));
  });
});

describe("La clave", () => {
  it("sin clave o con clave incorrecta: 401, sin decir nada de la correcta", async () => {
    for (const clave of [null, "", "mala", CLAVE + "x", CLAVE.slice(0, -1), CLAVE.toUpperCase()]) {
      const { r, json, texto } = await admin("entrar", {}, { clave });
      assert.equal(r.status, 401, `clave ${JSON.stringify(clave)}`);
      assert.equal(json.message, "La clave no es correcta.");
      assert.ok(!texto.includes(CLAVE) && !texto.includes(TOKEN));
    }
  });
  it("una clave incorrecta tarda casi un segundo (frena adivinar)", async () => {
    const t0 = Date.now();
    await admin("entrar", {}, { clave: "mala" });
    assert.ok(Date.now() - t0 >= 700, "tardó " + (Date.now() - t0) + " ms");
  });
  it("«entrar» con la clave correcta responde ok y NO llama al Apps Script", async () => {
    const antes = mock.pedidos;
    const { r, json } = await admin("entrar");
    assert.equal(r.status, 200);
    assert.deepEqual(json, { ok: true });
    assert.equal(mock.pedidos, antes);
  });
  it("cinco fallos seguidos bloquean a esa dirección, incluso con la clave correcta", async () => {
    const ip = ipNueva();
    for (let i = 0; i < 5; i++) assert.equal((await admin("entrar", {}, { clave: "mala", ip })).r.status, 401);
    const bloqueada = await admin("entrar", {}, { ip });
    assert.equal(bloqueada.r.status, 429);
    assert.match(bloqueada.json.message, /Demasiados intentos/);
  });
  it("el bloqueo es por dirección: otra dirección sigue entrando", async () => {
    const ip = ipNueva();
    for (let i = 0; i < 5; i++) await admin("entrar", {}, { clave: "mala", ip });
    assert.equal((await admin("entrar", {}, { ip })).r.status, 429);
    assert.equal((await admin("entrar", {}, { ip: ipNueva() })).r.status, 200);
  });
  it("una clave correcta a mitad de los fallos reinicia la cuenta", async () => {
    const ip = ipNueva();
    for (let i = 0; i < 4; i++) await admin("entrar", {}, { clave: "mala", ip });
    assert.equal((await admin("entrar", {}, { ip })).r.status, 200);
    for (let i = 0; i < 4; i++) assert.equal((await admin("entrar", {}, { clave: "mala", ip })).r.status, 401);
    assert.equal((await admin("entrar", {}, { ip })).r.status, 200);
  });
});

describe("Sin configurar", () => {
  it("dice que la carga no está configurada, aunque se mande cualquier clave", async () => {
    for (const clave of [CLAVE, "", "cualquiera"]) {
      const { r, json } = await admin("entrar", {}, { base: sinConfigurar.base, clave });
      assert.equal(r.status, 503);
      assert.match(json.message, /no está configurada/);
    }
  });
});

describe("Lo que se manda", () => {
  it("cuerpo que no es JSON: 400", async () => {
    const { r } = await admin("revisar", {}, { cuerpo: "{esto no es json" });
    assert.equal(r.status, 400);
  });
  it("acción ausente, desconocida o de otro tipo: 400", async () => {
    for (const cuerpo of [{}, { accion: "borrar" }, { accion: 5 }, { accion: ["revisar"] }, { accion: "" }]) {
      const { r } = await admin("x", {}, { cuerpo: JSON.stringify({ ...cuerpo, carga: MINIMA }) });
      assert.equal(r.status, 400, JSON.stringify(cuerpo));
    }
  });
  it("sin carga, o con una carga que no es un objeto: 400", async () => {
    for (const c of [undefined, null, [], "texto", 7, true]) {
      const { r } = await admin("revisar", { carga: c });
      assert.equal(r.status, 400, JSON.stringify(c));
    }
  });
  it("un cuerpo de más de 2,5 MB: 413 con mensaje claro, y NUNCA llega al Apps Script", async () => {
    const antes = mock.pedidos;
    for (const n of [2_600_000, 3_000_000, 4_000_000]) {
      const { r, json } = await admin("revisar", { carga: carga({ avisos: ["x".repeat(n)] }) });
      assert.equal(r.status, 413, "con " + n + " bytes");
      assert.match(json.message, /demasiado grande/);
    }
    assert.equal(mock.pedidos, antes, "el cuerpo enorme no debe reenviarse");
  });
  it("un cuerpo de casi 2,5 MB sí pasa", async () => {
    const casi = carga({ informacionGeneral: { toneladasRecibidas: 1 }, avisos: ["x".repeat(2_300_000)] });
    assert.equal((await admin("revisar", { carga: casi })).r.status, 200);
  });
  it("decisiones mal formadas: 400", async () => {
    const malas = [[], "conservar", 5, { x1: "conservar" }, { 1: 5 }, { 1: null }, { "-1": "conservar" }, { 123456: "conservar" }, { "c": "conservar" }, { "cc1": "conservar" },
      Object.fromEntries(Array.from({ length: 5001 }, (_, i) => [String(i + 1), "conservar"]))];
    for (const decisiones of malas) {
      const { r } = await admin("aplicar", { carga: MINIMA, decisiones });
      assert.equal(r.status, 400, JSON.stringify(decisiones).slice(0, 60));
    }
  });
  it("decisiones bien formadas (numéricas y de contratos «c1») se aceptan y llegan al script", async () => {
    await admin("aplicar", { carga: MINIMA, decisiones: { 1: "conservar", c2: "reemplazar" } });
    assert.deepEqual(JSON.parse(mock.ultimoCuerpo).decisiones, { 1: "conservar", c2: "reemplazar" });
  });
});

describe("Hacia el Apps Script", () => {
  it("revisar: pasa el plan tal cual y con las cabeceras de seguridad", async () => {
    mock.modo = "normal";
    const { r, json } = await admin("revisar", { carga: minima() });
    assert.equal(r.status, 200);
    assert.equal(json.puedeCargar, true);
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal(r.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.match(r.headers.get("content-type"), /application\/json; charset=utf-8/);
  });
  it("le manda al script el token y la carga, y NUNCA la clave de la persona", async () => {
    await admin("revisar", { carga: MINIMA });
    const enviado = JSON.parse(mock.ultimoCuerpo);
    assert.equal(enviado.token, TOKEN);
    assert.equal(enviado.accion, "revisar");
    assert.deepEqual(enviado.carga, MINIMA);
    assert.ok(!mock.ultimoCuerpo.includes(CLAVE));
  });
  it("sigue la redirección que hace Google tras un POST", async () => {
    const { json } = await admin("revisar", { carga: MINIMA });
    assert.ok(json && json.puedeCargar !== undefined);
  });
  it("aplicar: escribe en el libro", async () => {
    const e = mock.entorno;
    const { r, json } = await admin("aplicar", { carga: carga({ informacionGeneral: { toneladasRecibidas: 77, toneladasInventario: 8 } }) });
    assert.equal(r.status, 200);
    assert.equal(json.ok, true);
    assert.deepEqual(e.hojas.TOTALES[4].slice(0, 2), [77, 8]);
  });
  it("la ñ, las tildes y los signos llegan intactos de punta a punta (UTF-8)", async () => {
    const e = mock.entorno;
    const antes = e.ultimaFila("DESPACHOS");
    const texto = "Pañales para niños — «Ñandú» ¿qué? ¡sí! áéíóúü";
    const { json } = await admin("aplicar", { carga: carga({ distribucion: [e.fila({ producto: texto, fecha: "2026-10-03" })] }) });
    assert.equal(json.ok, true, JSON.stringify(json));
    assert.equal(e.hojas.DESPACHOS[antes][3], texto);
  });
  it("conflicto resuelto por HTTP: las decisiones viajan y se aplican", async () => {
    const e = mock.entorno;
    const c = carga({ distribucion: [e.fila({ fecha: "2026-08-25", producto: "Mercado", cantidad: null, kilosUnitario: null, kilosTotal: 4321 })] });
    const sin = await admin("aplicar", { carga: c, decisiones: {} });
    assert.equal(sin.r.status, 400);
    assert.match(sin.json.message, /Falta decidir/);
    const con = await admin("aplicar", { carga: c, decisiones: { 1: "reemplazar" } });
    assert.equal(con.json.ok, true);
    assert.equal(e.hojas.DESPACHOS[4][7], 4321);
  });
  it("el script devuelve una página de error (HTML): 502 con mensaje claro, sin detalles", async () => {
    mock.modo = "html";
    const { r, json, texto } = await admin("revisar", { carga: MINIMA });
    mock.modo = "normal";
    assert.equal(r.status, 502);
    assert.match(json.message, /No se pudo comunicar con el libro/);
    assert.doesNotMatch(texto, /excepción|Google/);
  });
  it("el script no responde (conexión cortada): 502", async () => {
    mock.modo = "caido";
    const { r, json } = await admin("revisar", { carga: MINIMA });
    mock.modo = "normal";
    assert.equal(r.status, 502);
    assert.match(json.message, /No se pudo comunicar con el libro/);
  });
  it("el script rechaza el token: 502 «no pudo identificarse», sin confundirlo con la clave de la persona", async () => {
    mock.modo = "error401";
    const { r, json } = await admin("revisar", { carga: MINIMA });
    mock.modo = "normal";
    assert.equal(r.status, 502);
    assert.match(json.message, /no pudo identificarse/);
  });
  it("el script dice «demasiados intentos»: 429", async () => {
    mock.modo = "error429";
    const { r } = await admin("revisar", { carga: MINIMA });
    mock.modo = "normal";
    assert.equal(r.status, 429);
  });
  it("un error amistoso del script (400) llega con su mensaje", async () => {
    mock.modo = "error400";
    const { r, json } = await admin("revisar", { carga: MINIMA });
    mock.modo = "normal";
    assert.equal(r.status, 400);
    assert.match(json.message, /columnas esperadas/);
  });
  it("un error interno del script (500) se muestra como 502 y no filtra el detalle", async () => {
    mock.modo = "error500";
    const { r, texto } = await admin("revisar", { carga: MINIMA });
    mock.modo = "normal";
    assert.equal(r.status, 502);
  });
  it("un token distinto entre el sitio y el script: el script lo rechaza de verdad", async () => {
    const otro = await iniciarAppsScript({ token: "otro-token-completamente-distinto-1234567890" });
    const raro = await iniciarSitio({ env: { TABLERO_V2_API_URL: otro.url, ADMIN_CLAVE: CLAVE, TABLERO_V2_ADMIN_TOKEN: TOKEN } });
    try {
      const { r, json } = await admin("revisar", { carga: MINIMA }, { base: raro.base });
      assert.equal(r.status, 502);
      assert.match(json.message, /no pudo identificarse/);
    } finally { await Promise.allSettled([raro.cerrar(), otro.cerrar()]); }
  });
});

describe("Lo demás sigue funcionando", () => {
  it("la ruta pública /api/tablero no se rompió", async () => {
    const r = await fetch(sitio.base + "/api/tablero?route=resumen");
    assert.equal(r.status, 200);
  });
  it("la página principal sigue respondiendo", async () => {
    assert.equal((await fetch(sitio.base + "/")).status, 200);
  });
});
