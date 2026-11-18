# Notas del tablero v2

Dos bases: **Excel oficial de despachos** y **hoja CONTRATACION** (más la plantilla QUE_HACE_FALTA).
Plan completo y reglas de datos: `apps-script/Config.js` (todas las reglas viven ahí) y `docs/`.

## Pendiente del cliente (el tablero funciona con valores por defecto)
1. Pesos del 11 al 24 de agosto. **Respuesta del cliente (15-nov): «toca rellenar con el viejo hasta el 24».**
   El Excel viejo trae 398 despachos (fecha + destino, del 11 al 24 ago; 13 días, no hay el 23) SIN producto ni
   peso, y una serie ESTIMADA de 549 t por día para todo el departamento. Esos
   398 despachos van prellenados al comienzo de la hoja única `DESPACHOS` del libro oficial (fecha, destino, familia, producto, cantidad, peso) para que el cliente complete producto/cantidad/peso
   (instrucciones en `docs/04-instruccion-cliente-11-24-agosto.md`). Mientras no lo devuelvan, el tablero muestra la cifra
   ESTIMADA por día del Excel anterior (hoja `ESTIMADO_ANTERIOR`, 549 t), repartida por igual entre los despachos de cada
   día. El sitio público NO lo avisa (decisión del cliente: el aviso es solo para ellos); la marca vive en los datos
   (`calidad.estimado`, `municipio.estimado`) y en el manual del cliente. Cada despacho completado reemplaza su parte por el peso real.
   Interruptor: `CONFIG.MOSTRAR_ESTIMADO_PROVISIONAL` en Config.js. OJO: el reparto por municipio es una aproximación.
2. **Recibidas e inventario: lo escribe el equipo** en una fila (hoja `TOTALES` del libro oficial; ya
   implementado en `Totales.js`, `revisarTotales()` para probar). Vacío = «Sin dato».
3. La plantilla «Qué hace falta» la rellena el equipo de la Gobernación; qué elementos van en cada categoría sigue abierto.
4. Dónde vive el listado definitivo de contratos.
5. Redacción de «Otras ayudas humanitarias» y «Otros puntos de distribución».
6. **Traslados** (Buenaventura – Centro de Acopio 1,9 t, Cartago – CAP 4,5 t, Oriuac – PMU 6,0 t; 12,4 t):
   ¿son puntos a donde se envió ayuda para repartirla después? Si es así, ¿lo que salió de ahí también está en
   el consolidado como despacho a municipios? Si sí, esas toneladas se cuentan dos veces. Mientras tanto
   cuentan en el total, pero separadas: no son «otras ayudas» y se avisan en el tablero.

## Libros generados (`docs/excel/`, no se suben a git)
- `OFICIAL_despachos_consolidado.xlsx` — base plana `DESPACHOS` (1.906 filas) + reglas `DESTINOS`/`FAMILIAS`.
- `CONTRATACION_contratos.xlsx` — hoja `CONTRATACION`.
- `QUE_HACE_FALTA` y `TOTALES` viven DENTRO de `OFICIAL_despachos_consolidado.xlsx` (decisión del cliente: un solo libro
  de datos; contratos aparte). Riesgo: quien edita la plantilla podría tocar `DESPACHOS`; se protegen las demás hojas.
  No volver a generar el archivo entero al recargar: se agregan filas. La plantilla suelta quedó en `docs/excel/otros/`.
- `ANTERIOR_excel_viejo_hasta_24ago.xlsx` — solo consulta, advertencia en rojo en cada hoja; no suma al total.

## Decisiones que conviene revisar
- `Logística, ferretería y herramientas` (19 t) está en «Protección y seguridad»: revisar que no traiga
  cosas ajenas a la protección.
- **Municipios múltiples** (4,4 t): destinos que nombran varios municipios a la vez («Trujillo y Sevilla», «Sevilla - Caicedonia»)
  van aparte, como categoría propia. No se reparten ni se asignan al primero: eso inventaría un peso. Cuentan en el total
  y el sitio los muestra junto a «Otras ayudas». «Otras ayudas» queda para fundaciones, entidades y otros departamentos.
- Entidades (Defensa Civil, Ejército, CAP, fundaciones, colegios, obras de caridad, programas de la Gobernación
  como «Agenda Gobernadora») van a «Otras ayudas», aunque lleven el nombre de un municipio. «Buenaventura – Centro
  de Acopio» (1,9 t) va a Otras porque es un punto de distribución: contarlo como municipio duplicaría lo que luego
  se entrega. «Palmira – Olla Comunitaria» y «Cali – Discapacidad Comuna 14» cuentan al municipio. Confirmar estos
  dos criterios con la Gobernación.
- «Por verificar»: el tablero avisa solo el peso de los registros con observación «POR VERIFICAR» (212 registros,
  54,6 t, 18,6 %, que se muestra como 19 %). El peso sin soporte (16 registros, 1,0 t) se cuenta aparte y NO se suma.
- **Mapa:** conserva la identidad del original (tema oscuro `theme-ayudas`, píldoras, marcador con dígitos rodantes, panel
  de filtros, línea de tiempo con reproducción, «¿Cómo leer este mapa?»), pero con el consolidado nuevo: línea de tiempo
  por día (25 ago – 30 oct), acumulado o «solo ese día», pulsos de llegada y detalle por municipio. **No hay arcos** de
  bodega a municipio: el consolidado no registra el origen de cada despacho. Si la Gobernación lo entrega (qué punto —Cali,
  Cartago, Buenaventura— despachó a qué municipio), los arcos se pueden volver a dibujar con los motores originales
  (`main:src/presentation/components/arcAnimationEngine.ts`).
- **Ilustraciones de «Qué hace falta»:** los PNG originales traen el texto pintado («Aseo Personal»…), así que no sirven con
  los nombres nuevos de las categorías. Las píldoras se dibujan en código con los mismos colores y borde. Si el diseño
  entrega ilustraciones nuevas, basta pasarlas a `data/categorias.ts`.

## Estructura de `apps-script/`
- Raíz: solo lo que se pega en Apps Script (`Config`, `Utils`, `Sheetservice`, `Catalogo42`, `Despachos`,
  `Faltantes`, `Totales`, `Contratacion`; y para producción `Code`, `Cachelayer`, `Precalentar`).
- `migracion/`: reglas de clasificación y parser de las pestañas diarias. NO se pega: sirven para regenerar el
  libro y las sigue la sesión que carga datos.
- `_anterior/`: el backend anterior, aparte para que no choque por nombres. Se puede borrar.
- `prueba/`: el proyecto de prueba.

## Limpieza pendiente
Borrar `apps-script/_anterior/` cuando se confirme que nada lo necesita (son 14 archivos del backend anterior).

## Despliegue de esta rama junto a la versión publicada
El sitio de esta rama lee su backend de `TABLERO_V2_API_URL` (servidor) / `VITE_TABLERO_V2_API_URL` (modo directo), NO de
`AYUDAS_API_URL`: esa sigue apuntando al backend de la versión publicada (main). Con nombres distintos pueden convivir en
el mismo proyecto de despliegue sin pisarse. Al desplegar la rama (otro proyecto o un despliegue de vista previa), definir
`TABLERO_V2_API_URL` con la URL `/exec` del nuevo Apps Script. Sin ella, el proxy responde error en vez de llamar al backend viejo.

## Categorías de lo estimado (11–24 ago)
El Excel viejo no trae familia, pero sí los productos (cantidades) que recibió cada destino. La hoja `MEZCLA_ANTERIOR`
(libro oficial) reparte por categoría la parte estimada: cada producto se pesa con el kilo por unidad del producto
parecido del consolidado real (misma categoría); si no hay parecido, con la mediana de la categoría. Se descartan
«Sin clasificar» (5.824 u) y «Kits sin desagregar» (7.519 u). Resultado: las categorías suman el total (843 t) y las
categorías de cada municipio suman lo suyo. Es una APROXIMACIÓN: cuando se completen los pesos reales, deja de influir.
Un primer intento con el kilo medio por categoría sobreestimaba «Protección y seguridad» (estibas de 25 kg frente a
tapabocas de 0,04 kg); por eso se pesa producto a producto.

## Ayuda distribuida por categorías: desglose
La sección ya no son pestañas cerradas: cada categoría dice cuánto se distribuyó (toneladas) y, al tocarla, qué productos
incluye con sus toneladas (los 10 de más peso; el resto en «Otros productos», `CONFIG.PRODUCTOS_POR_CATEGORIA`). Sale de la
ruta `categorias`. La parte estimada (11–24 ago) también se reparte por producto con `MEZCLA_ANTERIOR`, que ahora trae una
fila por destino, categoría y producto (los 6 de más peso por destino y categoría; el resto como «Otros productos»).
