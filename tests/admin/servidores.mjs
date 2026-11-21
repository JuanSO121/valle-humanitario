/**
 * Levanta, para las pruebas de integración:
 *   · un Apps Script de mentira (HTTP) que ejecuta el código REAL de la carga contra el libro simulado, y
 *   · el servidor del sitio (vite dev) apuntando a él.
 * Nada de esto toca Google ni Vercel.
 */
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crearEntorno } from "./libro-simulado.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const puertoLibre = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on("error", reject);
  });

/**
 * Apps Script de mentira. `modo` cambia cómo responde:
 *   normal | html | error401 | error429 | error400 | error500 | caido (corta la conexión)
 */
export async function iniciarAppsScript({ token } = {}) {
  const entorno = crearEntorno({ token });
  const resultados = new Map();
  const mock = { entorno, modo: "normal", pedidos: 0, ultimoCuerpo: null, puerto: 0, cerrar: async () => {} };
  const servidor = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (req.method === "POST" && u.pathname === "/exec") {
      let cuerpo = "";
      req.setEncoding("utf8");
      req.on("data", (c) => (cuerpo += c));
      req.on("end", () => {
        mock.pedidos += 1;
        mock.ultimoCuerpo = cuerpo;
        if (mock.modo === "caido") { req.socket.destroy(); return; }
        let texto;
        if (mock.modo === "html") texto = "<html><body>Error de Google: el script lanzó una excepción</body></html>";
        else if (mock.modo === "error401") texto = JSON.stringify({ error: true, status: 401, message: "No autorizado." });
        else if (mock.modo === "error429") texto = JSON.stringify({ error: true, status: 429, message: "Demasiados intentos. Espere unos minutos." });
        else if (mock.modo === "error400") texto = JSON.stringify({ error: true, status: 400, message: "La hoja DESPACHOS no tiene las columnas esperadas." });
        else if (mock.modo === "error500") texto = JSON.stringify({ error: true, status: 500, message: "detalle interno que no debe verse" });
        else texto = JSON.stringify(entorno.doPost(cuerpo));
        const id = Math.random().toString(36).slice(2);
        resultados.set(id, texto);
        // Google responde a un POST con una redirección; el servidor del sitio tiene que seguirla.
        res.writeHead(302, { location: "/resultado/" + id });
        res.end();
      });
    } else if (req.method === "GET" && u.pathname.startsWith("/resultado/")) {
      res.writeHead(200, { "content-type": mock.modo === "html" ? "text/html" : "application/json; charset=utf-8" });
      res.end(resultados.get(u.pathname.split("/").pop()) ?? "");
    } else if (req.method === "GET" && u.pathname === "/exec") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ disponible: true, ruta: u.searchParams.get("route") }));
    } else { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
  mock.puerto = servidor.address().port;
  mock.url = `http://127.0.0.1:${mock.puerto}/exec`;
  mock.cerrar = () => new Promise((r) => { servidor.closeAllConnections?.(); servidor.close(() => r()); });
  return mock;
}

/** El servidor del sitio (vite dev). Espera hasta que responde. */
export async function iniciarSitio({ env = {}, espera = 120000 } = {}) {
  const puerto = await puertoLibre();
  const hijo = spawn("npx", ["vite", "dev", "--port", String(puerto), "--host", "127.0.0.1", "--strictPort"], {
    cwd: RAIZ,
    env: { ...process.env, ...env, FORCE_COLOR: "0" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let salida = "";
  hijo.stdout.on("data", (d) => (salida += d));
  hijo.stderr.on("data", (d) => (salida += d));
  const base = `http://127.0.0.1:${puerto}`;
  const hasta = Date.now() + espera;
  for (;;) {
    try { const r = await fetch(base + "/admin"); if (r.status === 200) break; } catch { /* aún no */ }
    if (Date.now() > hasta) { try { process.kill(-hijo.pid); } catch { /* ya terminó */ } throw new Error("El sitio no arrancó:\n" + salida.slice(-1500)); }
    await new Promise((r) => setTimeout(r, 500));
  }
  return {
    base, puerto,
    cerrar: () => new Promise((r) => { try { process.kill(-hijo.pid); } catch { /* ya terminó */ } setTimeout(r, 300); }),
  };
}

let contadorIp = 10;
/** Una «dirección» distinta por prueba: el bloqueo por intentos fallidos es por dirección. */
export const ipNueva = () => `10.${Math.floor(++contadorIp / 250) % 250}.${contadorIp % 250}.${Math.floor(Math.random() * 250)}`;
