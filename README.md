# Ruta de la Solidaridad

Micrositio público de rendición de cuentas sobre la ayuda humanitaria entregada en los 41 municipios del Valle del Cauca tras el terremoto del 10 de agosto de 2026.

**[Ver el sitio](https://sigesi.valledelcauca.gov.co/valle-humanitario)** · Gobernación del Valle del Cauca — Secretaría General

---

## Qué es

No es un tablero de gestión: es un documento público que se lee de arriba abajo, como un reportaje, con las cifras conectadas en vivo al registro oficial de entregas.

Permite recorrer la operación día por día en un mapa interactivo, consultar qué recibió cada municipio y ver la composición de la ayuda por categoría y por producto.

| | |
|---|---|
| Municipios atendidos | 41 de 41 |
| Entregas registradas | 536 |
| Toneladas distribuidas | 697 |
| Días de operación | 11 de agosto – 7 de septiembre de 2026 |

## Stack

**Frontend** — React 19, TypeScript en modo estricto, TanStack Start con renderizado en servidor, TanStack Router, TanStack Query, Tailwind CSS, MapLibre GL. Desplegado en Vercel.

**Backend** — Google Apps Script como Web App, sobre la hoja de cálculo que la Secretaría ya usaba para registrar las entregas.

## Por qué el backend es una hoja de cálculo

Es la decisión de diseño que define el proyecto.

Los datos nacen en formatos de papel firmados en la puerta de un camión, que alguien transcribe a un Excel. Migrar ese registro a PostgreSQL habría obligado al equipo que hace la operación a cambiar de herramienta en medio de una emergencia.

En vez de eso, el sitio lee de la misma hoja donde ya trabajan. La complejidad se movió a la capa de servicios:

- **Caché con invalidación por disparador.** Cada edición del Excel invalida la caché y el dato nuevo aparece en la siguiente carga.
- **Cola de peticiones.** Apps Script serializa las ejecuciones por usuario; el tablero monta ocho consultas a la vez y las que se pisan reciben un 404 de infraestructura. La cola las envía de a una, con reintentos y espera creciente.
- **Validación de contrato.** Cada respuesta se valida contra la forma esperada antes de llegar a un componente, para detectar un despliegue desincronizado en vez de fallar río abajo con un `undefined`.

## Arquitectura

### Backend

Separación en capas. `SheetService` es lo único que toca `SpreadsheetApp`; ningún constructor de ruta lee hojas por su cuenta.

```
Config.gs          Nombres de hoja, catálogos de origen, TTL de caché
SheetService.gs    Única capa que llama a SpreadsheetApp
Catalogs.gs        Carga CAT_* y arma los índices de los joins
Facts.gs           DESPACHOS, ENVIOS_CATEGORIA, DETALLE_PRODUCTO
Transforms.gs      Convierte catálogos + hechos en el contrato de la API
CacheLayer.gs      Caché versionada, invalidable de golpe
Code.gs            Único punto de entrada HTTP
```

Las rutas se resuelven por query param, `?route=meta|flujos|destinos|ayuda|toneladas|...`, porque Apps Script no expone segmentos de ruta de forma confiable.

### Frontend

```
src/domain          Entidades y contratos de la API
src/application     Hooks de consulta y derivaciones puras
src/infrastructure  Repositorio HTTP y cola de peticiones
src/presentation    Componentes, estado de vista y el mapa
```

Las derivaciones viven fuera de React y sin dependencias de red, así que se pueden probar sin navegador.

## Decisiones sobre los datos

El principio de todo el proyecto: **no inventar ni un dato.**

- El peso se registra por día y para todo el departamento, no por envío. Cuando el sitio muestra toneladas por municipio o por ruta, lo declara como estimado y usa un único factor derivado, para que las partes siempre sumen el total.
- Los formatos que repartieron a varios municipios sin desagregar no muestran toneladas atribuidas: muestran las unidades que sí se contaron.
- Un día con entregas y sin peso registrado cuenta cero, en vez de rellenarse con un promedio. El hueco se reporta por consola a quien mantiene el Excel, no al lector.
- Los destinos que no corresponden a un municipio —agregados y entidades— no tienen coordenada inventada: quedan fuera del mapa y visibles en los listados.

También existe un **corte de publicación** configurable: el Excel se alimenta a diario, pero la orden de publicar no siempre va al mismo ritmo. Una constante en `Config.gs` define hasta qué fecha sale la información, sin borrar nada de la fuente.

## Accesibilidad y móvil

En celular los paneles se abren como hoja inferior con puntos de anclaje, de modo que el mapa sigue visible mientras se consulta un municipio, y el mapa desplaza su centro para que el municipio seleccionado no quede detrás de la hoja.

Los objetivos táctiles cumplen el mínimo de 44 px, se respetan las áreas seguras del dispositivo y `prefers-reduced-motion`.

## Ejecución local

```bash
npm install
npm run dev
```

El backend de Apps Script se despliega aparte, como Web App. La URL del despliegue se configura por variable de entorno:

```
VITE_API_URL=https://script.google.com/macros/s/<id-del-despliegue>/exec
```

## Diagnóstico

El proyecto de Apps Script incluye funciones ejecutables desde el editor para auditar los datos sin abrir el Excel:

| Función | Qué responde |
|---|---|
| `probarRutas()` | Corre cada constructor por separado y dice cuál falla |
| `diagnostico()` | Fechas, cobertura por día y advertencias de validación |
| `compararCifras()` | Contrasta las cifras publicadas contra la suma directa de las hojas |
| `duplicados()` | Despachos que apuntan al mismo archivo de Drive |
| `dondeEstoyLeyendo()` | Qué archivo está enlazado al script |

## Limitaciones conocidas

- `ENVIOS_CATEGORIA` es un acumulado con fecha de corte por fila, no una tabla transaccional: no admite carga incremental y se reemplaza completa.
- El detalle por producto depende de una exportación manual, así que puede ir por detrás del registro de despachos.
- Los destinos agregados no se pueden recortar por fecha, porque no tienen desglose diario.

---

Desarrollado para la Secretaría General de la Gobernación del Valle del Cauca.