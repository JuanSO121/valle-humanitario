import type { EducationalSite, GeoPoint, Municipality } from "@/domain/entities";
import type { GeocodingService } from "@/domain/services/GeocodingService";

/** Stable hash so a site always lands on the same approximate spot. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * MVP geocoder: deterministic municipal-centroid placement with a small,
 * clearly-labelled offset so overlapping sites remain distinguishable.
 * Always reports precision APPROXIMATE for centroid fallback — no invented
 * street-level accuracy.
 *
 * `address` (the official "Dirección" from the source Excel) rides along on
 * every returned point when the site has one, EXACT or APPROXIMATE alike,
 * so consumers like "Ver en Maps" can search the real address instead of
 * an approximate lat/long — without changing where the pin sits on the map.
 */
export class MunicipalCentroidGeocodingService implements GeocodingService {
  readonly id = "municipal-centroid";

  constructor(private readonly radiusDegrees = 0.028) {}

  resolve(site: EducationalSite, municipality: Municipality | null): GeoPoint | null {
    if (site.latitude != null && site.longitude != null) {
      return {
        latitude: site.latitude,
        longitude: site.longitude,
        address: site.address,
        source: site.coordinateSource ?? "OFFICIAL",
        precision: "EXACT",
      };
    }
    if (!municipality || municipality.latitude == null || municipality.longitude == null) {
      return null;
    }
    const angle = hash(site.id) * Math.PI * 2;
    const distance = Math.sqrt(hash(`${site.id}#r`)) * this.radiusDegrees;
    return {
      latitude: municipality.latitude + Math.sin(angle) * distance,
      longitude: municipality.longitude + Math.cos(angle) * distance,
      address: site.address,
      source: "MUNICIPAL_CENTROID",
      precision: "APPROXIMATE",
    };
  }
}

/** Used when no approximation at all is acceptable. */
export class NullGeocodingService implements GeocodingService {
  readonly id = "null";
  resolve(site: EducationalSite): GeoPoint | null {
    if (site.latitude == null || site.longitude == null) return null;
    return {
      latitude: site.latitude,
      longitude: site.longitude,
      address: site.address,
      source: site.coordinateSource ?? "OFFICIAL",
      precision: "EXACT",
    };
  }
}