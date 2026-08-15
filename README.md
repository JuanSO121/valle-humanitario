# ValleGeo Explorer

IMPORTANTE — ALCANCE DEL MVP Esta primera versión NO utilizará una base de datos ni un backend persistente. Los datos provendrán de los tres archivos Excel suministrados y deberán transformarse mediante un proceso ETL a un modelo de datos canónico consumible por la aplicación. La aplicación deberá funcionar completamente utilizando datos locales procesados. Sin embargo, la arquitectura debe diseñarse desde el principio bajo principios de Clean Architecture, separación de responsabilidades y Dependency Inversion, de manera que la fuente de datos pueda sustituirse posteriormente por una API conectada a PostgreSQL/PostGIS sin modificar los componentes de presentación, dominio ni lógica de negocio. Implementar una abstracción EducationalDataRepository como contrato principal de acceso a datos. Para el MVP implementar únicamente LocalDataRepository. NO implementar todavía PostgreSQL, PostGIS, Supabase, Firebase, migraciones, Docker de base de datos ni API backend. La futura implementación deberá poder incorporar un PostGISDataRepository o ApiDataRepository respetando el mismo contrato. Y agregaría algo todavía más importante: El mapa NO debe depender de Google Maps como fuente de datos. La visualización geográfica debe utilizar una solución moderna basada en mapas web, preferiblemente MapLibre GL JS + OpenStreetMap, permitiendo posteriormente cambiar el proveedor de tiles/geocodificación sin modificar el dominio de la aplicación. Las coordenadas de las sedes NO existen actualmente en las fuentes Excel. Por tanto, el MVP deberá contemplar latitude y longitude como campos opcionales del modelo, pero no inventar coordenadas ni realizar geocodificación automática en cada renderizado. La capa de georreferenciación debe quedar abstraída como GeocodingService, para que posteriormente pueda ejecutarse un proceso de geocodificación persistente y almacenar las coordenadas en PostGIS. Y hay otra decisión que recomiendo mucho Para el mapa actual, no intentaría conseguir un SVG gigante del Valle del Cauca. Haría: MapLibre + OpenStreetMap + límites administrativos GeoJSON. Visualmente puedes tener:

mapa limpio y minimalista;

límites del Valle del Cauca;

límites municipales;

sedes como puntos;

clustering cuando se aleja el zoom;

colores por criticidad;

filtros;

panel lateral;

hover;

selección de municipio;

selección de institución;

heatmap opcional;

vista de detalle.

Y más adelante, cuando tengan coordenadas definitivas y PostGIS:

PostGIS


│ ├── sedes ├── municipios ├── instituciones ├── diagnósticos ├── afectaciones └── geometrías │ ▼ API │ ▼ MapLibre Eso sí es una arquitectura escalable. Y con los hallazgos que acabas de proporcionar, Claude debe respetar especialmente que no existe actualmente una llave entre el diagnóstico sísmico y las sedes oficiales: esa resolución debe hacerse durante el ETL y los matches de baja confianza deben quedar como MATCH_REVIEW_REQUIRED, no inventarse silenciosamente.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/22ba8eff-2278-45bb-8673-703297161064).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
