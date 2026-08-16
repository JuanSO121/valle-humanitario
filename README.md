# ValleGeo Explorer

ValleGeo Explorer es una aplicación web para visualizar y analizar el estado de afectación de las Instituciones Educativas (IE) y sus sedes oficiales del departamento del Valle del Cauca mediante mapas interactivos y herramientas de análisis geográfico.

## Estado del proyecto

Actualmente el proyecto se encuentra en fase **MVP**.

En esta primera versión:

- No se utiliza una base de datos.
- No existe un backend persistente.
- Toda la información proviene de archivos Excel suministrados por el cliente.
- Los datos son transformados mediante un proceso ETL hacia un modelo de datos canónico consumido por la aplicación.

La arquitectura está diseñada para que en el futuro pueda reemplazarse la fuente de datos por una API conectada a PostgreSQL/PostGIS sin modificar la lógica de negocio ni la interfaz.

## Arquitectura

El proyecto sigue principios de:

- Clean Architecture
- Separation of Concerns
- Dependency Inversion

El acceso a datos se realiza mediante el contrato:

```
EducationalDataRepository
```

Implementación actual:

- `LocalDataRepository`

Implementaciones futuras previstas:

- `ApiDataRepository`
- `PostGISDataRepository`

## Visualización geográfica

La aplicación utiliza una arquitectura desacoplada del proveedor de mapas.

Tecnologías previstas:

- MapLibre GL JS
- OpenStreetMap
- GeoJSON para límites administrativos

Las coordenadas geográficas (`latitude` y `longitude`) son opcionales en el modelo de datos, ya que actualmente no existen en las fuentes originales.

La georreferenciación queda abstraída mediante un servicio:

```
GeocodingService
```

permitiendo incorporar posteriormente un proceso de geocodificación persistente sin modificar el resto de la aplicación.

## ETL

Durante la transformación de datos:

- Se construye un modelo de datos unificado.
- No se inventan relaciones inexistentes.
- Los emparejamientos de baja confianza se marcan como:

```
MATCH_REVIEW_REQUIRED
```

para su validación manual.

## Tecnologías

- React
- TypeScript
- Vite
- MapLibre GL JS
- OpenStreetMap

## Instalación

```bash
git clone <repository-url>
cd ValleGeo-Explorer
npm install
```

## Desarrollo

```bash
npm run dev
```

## Construcción

```bash
npm run build
```

## Licencia

Pendiente.