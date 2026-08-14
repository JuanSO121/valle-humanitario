import type { EducationalSite, GeoPoint, Municipality } from "../entities";

/**
 * Georeferencing abstraction.
 *
 * The source workbooks carry no coordinates, so the MVP resolves an
 * approximate municipal position. A later persistent geocoding process can
 * implement this contract (Nominatim, Google, in-house) and store the result
 * in PostGIS without touching domain or presentation code.
 */
export interface GeocodingService {
  readonly id: string;
  /** Resolve a position for a site. Must never fabricate exact coordinates. */
  resolve(site: EducationalSite, municipality: Municipality | null): GeoPoint | null;
}