# Pruebas de la carga de datos (`/admin`)

Cubren las tres capas, de adentro hacia afuera. Ninguna toca Google ni Vercel: usan un libro simulado en memoria y un
Apps Script de mentira que ejecuta el código **real** de `apps-script/Admin.js`.

| Archivo | Qué prueba | Necesita |
|---|---|---|
| `backend.test.mjs` | El script: acceso por token, forma del archivo, y cada sección (totales, qué hace falta, despachos, destinos nuevos, contratos) con sus validaciones, conflictos, decisiones, choques con otras personas, texto (ñ, tildes), idempotencia y fallos a la mitad. | Solo Node |
| `servidor.test.mjs` | El servidor del sitio (`/api/admin`): clave, bloqueo por intentos, tamaños, formato de lo que se manda, reenvío al script y cada tipo de falla del script. Levanta el sitio de verdad. | Solo Node |
| `interfaz.test.mjs` | La pantalla en Chrome: entrada con clave, salir sin dejar rastro, inactividad, cada tipo de carga, conflictos, botones, accesibilidad y celular. | `puppeteer-core`, `axe-core` y Chrome |

```
npm run test:admin                 # todo (la interfaz se omite sola si faltan las herramientas)
npm run test:admin:backend         # el script (segundos)
npm run test:admin:servidor        # el servidor (arranca el sitio: ~20 s)
npm run test:admin:interfaz        # la pantalla (varios minutos)
```

Para la interfaz, una vez: `npm i --no-save puppeteer-core axe-core` (no se agregan al proyecto). El navegador se toma
de `CHROME_PATH` o de `/usr/bin/google-chrome`.

`libro-simulado.mjs` arma el libro de prueba y puede **alterarlo a mitad de una carga** (`alVerificar`) o **hacer fallar a
Google** (`fallarEn`) para probar los choques y los fallos a la mitad. Lo único que estas pruebas no pueden comprobar es la
escritura real en Google Sheets: eso se prueba una vez en una copia del libro (ver `docs/07`).
