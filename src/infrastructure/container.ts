import { DiagnosticsUseCases } from "@/application/useCases";
import type { EducationalDataRepository } from "@/domain/repositories/EducationalDataRepository";
import type { GeocodingService } from "@/domain/services/GeocodingService";
import { MunicipalCentroidGeocodingService } from "./geocoding/MunicipalCentroidGeocodingService";
import { LocalDataRepository, bundledDatasetLoader } from "./local/LocalDataRepository";

/**
 * Composition root — the ONLY place that knows which implementation is used.
 * Replacing LocalDataRepository with ApiDataRepository / PostGISDataRepository
 * happens here and nowhere else.
 */
export interface Container {
  repository: EducationalDataRepository;
  geocoder: GeocodingService;
  useCases: DiagnosticsUseCases;
}

let container: Container | null = null;

export function getContainer(): Container {
  if (!container) {
    const repository = new LocalDataRepository(bundledDatasetLoader());
    const geocoder = new MunicipalCentroidGeocodingService();
    container = { repository, geocoder, useCases: new DiagnosticsUseCases(repository, geocoder) };
  }
  return container;
}

/** Test / future-swap seam. */
export function setContainer(next: Container): void {
  container = next;
}