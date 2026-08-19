/**
 * Domain layer — pure, framework-free entities.
 * No imports from React, MapLibre, fetch or any data source.
 */

export type Criticality = "ROJO" | "AMARILLO" | "VERDE" | "SIN_DETALLE";

export type SiteZone = "URBANA" | "RURAL" | "DESCONOCIDA";

export type MatchMethod =
  | "OFFICIAL_CODE"
  | "NORMALIZED_EXACT"
  | "TOKEN_CONTAINMENT"
  | "MAIN_SITE_RULE"
  | "FUZZY"
  | "NONE";

export type ResolutionStatus = "RESOLVED" | "MATCH_REVIEW_REQUIRED";

export interface MatchStep {
  method: MatchMethod;
  confidence: number;
}

export interface EntityResolution {
  status: ResolutionStatus;
  confidence: number;
  matchMethod: MatchMethod;
  municipality: MatchStep;
  institution: MatchStep;
  site: MatchStep;
}

/**
 * Optional geographic position. Never invented at render time.
 *
 * `latitude`/`longitude` always describe where the pin sits on the map
 * (exact if official, otherwise a deterministic municipal-centroid
 * approximation) — MapCanvas depends on this always being a real point.
 *
 * `address` is a separate, optional passenger: the official "Dirección"
 * text from the source Excel (IE_Y_SEDES). When present, external links
 * (e.g. "Ver en Maps") should prefer it over lat/long, since it resolves
 * to the real site instead of an approximate centroid — but it never
 * replaces latitude/longitude for map rendering.
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
  address: string | null;
  /** Provenance so the UI can label approximate positions honestly. */
  source: "OFFICIAL" | "GEOCODED" | "MUNICIPAL_CENTROID";
  precision: "EXACT" | "APPROXIMATE";
}

export interface Municipality {
  id: string;
  officialCode: string;
  name: string;
  normalizedName: string;
  gagem: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Institution {
  id: string;
  officialCode: string;
  municipalityId: string | null;
  name: string | null;
  normalizedName: string;
  rector: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  alternateEmails: string[];
  nit: string | null;
  gagem: number | null;
  sourceRefs: string[];
}

export interface EducationalSite {
  id: string;
  officialSiteCode: string;
  institutionId: string | null;
  municipalityId: string | null;
  name: string | null;
  normalizedName: string;
  address: string | null;
  zone: SiteZone;
  officialStatus: string | null;
  isMainSite: boolean;
  /** Optional by design: the source workbooks carry no coordinates. */
  latitude: number | null;
  longitude: number | null;
  coordinateSource: GeoPoint["source"] | null;
}

export interface Diagnostic {
  id: string;
  rank: number;
  criticality: Criticality;
  sourceMunicipality: string | null;
  sourceInstitution: string | null;
  sourceSite: string | null;
  municipalityId: string | null;
  institutionId: string | null;
  /** Only set when resolution is RESOLVED. */
  siteId: string | null;
  /** Best candidate even when confidence is below threshold. */
  candidateSiteId: string | null;
  redZones: number;
  yellowZones: number;
  greenZones: number;
  totalZones: number;
  rector: string | null;
  phone: string | null;
  recommendedAction: string | null;
  resolution: EntityResolution;
}

export interface Affectation {
  id: string;
  criticality: Criticality;
  zoneElement: string | null;
  description: string | null;
  sourceMunicipality: string | null;
  sourceInstitution: string | null;
  sourceSite: string | null;
  municipalityId: string | null;
  institutionId: string | null;
  siteId: string | null;
  candidateSiteId: string | null;
  rector: string | null;
  phone: string | null;
  evidenceUrl: string | null;
  resolution: EntityResolution;
}

export interface EntityMapping {
  source: string;
  sourceValue: string;
  canonicalEntityType: string;
  canonicalEntityId: string | null;
  matchMethod: MatchMethod;
  confidence: number;
  status: ResolutionStatus;
  reviewed: boolean;
}

export interface DatasetMeta {
  generatedAt: string;
  sources: string[];
  fuzzyThreshold: number;
  counts: Record<string, number>;
  warnings: string[];
}

/** A diagnosed site enriched with its institution / municipality context. */
export interface DiagnosedSiteView {
  diagnostic: Diagnostic;
  site: EducationalSite | null;
  institution: Institution | null;
  municipality: Municipality | null;
  position: GeoPoint | null;
  affectationCount: number;
}

export interface MunicipalitySummary {
  municipality: Municipality;
  affectedSites: number;
  red: number;
  yellow: number;
  green: number;
  noDetail: number;
  criticality: Criticality;
  redShare: number;
}

export interface CriticalityTotals {
  red: number;
  yellow: number;
  green: number;
  noDetail: number;
  total: number;
}

export interface DiagnosticFilters {
  criticality?: Criticality[] | undefined;
  municipalityIds?: string[] | undefined;
  institutionIds?: string[] | undefined;
  zones?: SiteZone[] | undefined;
  search?: string | undefined;
  onlyReviewRequired?: boolean | undefined;
}