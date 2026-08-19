import { DiagnosticsUseCases } from "@/application/useCases";
import type { EducationalDataRepository } from "@/domain/repositories/EducationalDataRepository";
import type { GeocodingService } from "@/domain/services/GeocodingService";
import { MunicipalCentroidGeocodingService } from "./geocoding/MunicipalCentroidGeocodingService";
import { LocalDataRepository, fetchDatasetLoader } from "./local/LocalDataRepository";

/**
 * Composition root — la ÚNICA pieza que sabe qué implementación se usa.
 *
 * Fuente de datos: Google Apps Script (Web App) leyendo un Google Sheet.
 * LocalDataRepository se reutiliza tal cual: solo cambia el DatasetLoader
 * que le inyectamos (fetchDatasetLoader en vez de bundledDatasetLoader).
 * Reemplazarlo por PostGISDataRepository/ApiDataRepository más adelante
 * sigue sin tocar dominio ni presentación.
 */
export interface Container {
  repository: EducationalDataRepository;
  geocoder: GeocodingService;
  useCases: DiagnosticsUseCases;
}

/**
 * URL de despliegue del Web App de Apps Script (Implementar > Nueva
 * implementación > Aplicación web). Debe terminar en /exec.
 *
 * Se toma de una variable de entorno de Vite para no *hardcodear* la URL
 * ni tener que tocar este archivo cuando cambie el despliegue. Defínela en
 * `.env` (o `.env.local`):
 *   VITE_APPS_SCRIPT_DATASET_URL=https://script.google.com/macros/s/XXX/exec
 */
const APPS_SCRIPT_DATASET_URL = import.meta.env["VITE_APPS_SCRIPT_DATASET_URL"] as string | undefined;

let container: Container | null = null;

export function getContainer(): Container {
  if (!container) {
    if (!APPS_SCRIPT_DATASET_URL) {
      throw new Error(
        "Falta VITE_APPS_SCRIPT_DATASET_URL en el entorno: define la URL /exec del Web App de Apps Script.",
      );
    }
    const repository = new LocalDataRepository(fetchDatasetLoader(APPS_SCRIPT_DATASET_URL));
    const geocoder = new MunicipalCentroidGeocodingService();
    container = { repository, geocoder, useCases: new DiagnosticsUseCases(repository, geocoder) };
  }
  return container;
}

/** Test / future-swap seam. */
export function setContainer(next: Container): void {
  container = next;
}