# Hoja CONTRATACION — cómo se actualiza

Alimenta la sección **«La contratación de la reconstrucción»** del sitio
(`?route=contratacion`). Una fila = un contrato. Es una hoja propia: no toca
ni depende de las hojas de ayudas.

## Columnas (fila 1 = encabezados, con estos nombres exactos)

| Columna | Qué va | Si falta |
|---|---|---|
| `contratacion_id` | Código estable: `CTR0001`, `CTR0002`… Nunca se reutiliza ni se renumera. | **La fila no se publica** |
| `dependencia` | DEPENDENCIA CONTRATANTE del archivo recibido. | Se muestra sin dependencia |
| `objeto` | OBJETO, tal cual. | **La fila no se publica** |
| `valor_inicial` | VALOR INICIAL como **número** en pesos: `1300000000`. Sin `$`, sin puntos. | Queda sin valor (no se cuenta como cero) |
| `contratista` | CONTRATISTA. | Se muestra sin contratista |
| `enlace_secop` | URL completa de la publicación en SECOP (`https://…`), pegada como **texto**. | Sin enlace |

No hay columnas de fecha, estado ni modalidad porque el archivo de origen no
las trae. Si algún día las traen, se agregan acá y en `Contratacion.js` juntas.

## Cargar o actualizar

1. Pegar las filas nuevas al final de la hoja (el orden de la hoja es el orden
   del sitio). Corregir un contrato = editar su fila, conservando el id.
2. En el editor de Apps Script, ejecutar **`revisarContratacion`** y leer el
   registro: dice qué filas no se publican y por qué (id repetido, objeto
   vacío, valor que no es número, enlace que no es URL).
3. Ejecutar **`precalentarAhora`**, o esperar hasta ~6 minutos a que lo haga el
   disparador. El sitio puede tardar además hasta ~1 minuto por su caché.

## Reglas

- No inventar: si el archivo no trae un dato, la celda queda **vacía**. Vacío
  no es cero.
- Si el valor viene como texto («$1.300.000.000»), el sitio no lo interpreta
  (el punto puede ser miles o decimal): convertirlo a número antes.
- Si el enlace viene como hipervínculo con un texto («Ver»), pegar la URL
  misma en la celda.
- `valor_inicial` es el valor al firmar. No incluye adiciones; el sitio lo
  dice así.

## Texto para pegar en la hoja INICIO

> **CONTRATACION** — un contrato por fila. Encabezados fijos: contratacion_id,
> dependencia, objeto, valor_inicial (número en pesos), contratista,
> enlace_secop (URL completa). Celda vacía = dato no informado, nunca 0.
> Después de editar: Apps Script → revisarContratacion → precalentarAhora.
> Detalle en apps-script/CONTRATACION.md.
