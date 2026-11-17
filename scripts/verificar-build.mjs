/**
 * Falla si el build compilado lleva dentro algo que no debe ser público: la URL
 * del Apps Script o cualquier dirección de script.google.com/macros.
 *
 * Se corre después de compilar: `npm run build:publicar`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RAIZ = ".vercel/output";
const PROHIBIDO = [/AKfycb[\w-]{20,}/, /script\.google\.com\/macros\/s\//];

function* archivos(dir) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else if (/\.(m?js|json|html|css|map)$/.test(nombre)) yield ruta;
  }
}

const malos = [];
for (const ruta of archivos(RAIZ)) {
  const texto = readFileSync(ruta, "utf8");
  if (PROHIBIDO.some((re) => re.test(texto))) malos.push(ruta);
}

if (malos.length > 0) {
  console.error("\n✖ El build lleva dentro la URL del Apps Script. NO lo suba:");
  for (const m of malos) console.error("   " + m);
  console.error("\nCausa habitual: VITE_TABLERO_V2_API_URL definida en .env (debe estar en .env.development).");
  process.exit(1);
}
console.log("✔ Build limpio: no incluye la URL del Apps Script.");
