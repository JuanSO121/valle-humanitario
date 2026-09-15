import type {
  Affectation,
  Criticality,
  CriticalityTotals,
  DiagnosedSiteView,
  DiagnosticFilters,
  MunicipalitySummary,
} from "@/domain/entities";
import type { EducationalDataRepository } from "@/domain/repositories/EducationalDataRepository";
import type { GeocodingService } from "@/domain/services/GeocodingService";

const CRITICALITY_ORDER: Criticality[] = ["ROJO", "AMARILLO", "VERDE", "SIN_DETALLE"];

export interface MapViewModel {
  sites: DiagnosedSiteView[];
  municipalities: MunicipalitySummary[];
  totals: CriticalityTotals;
  reviewRequired: number;
  approximatePositions: number;
}

/** Application layer: orchestrates repository + geocoding, no UI knowledge. */
export class DiagnosticsUseCases {
  constructor(
    private readonly repository: EducationalDataRepository,
    private readonly geocoder: GeocodingService,
  ) {}

  async buildMapView(filters: DiagnosticFilters = {}): Promise<MapViewModel> {
    const [diagnostics, municipalities, institutions, sites, affectations] = await Promise.all([
      this.repository.listDiagnostics(filters),
      this.repository.listMunicipalities(),
      this.repository.listInstitutions(),
      this.repository.listSites(),
      this.repository.listAffectations(),
    ]);

    const municipalityById = new Map(municipalities.map((m) => [m.id, m]));
    const institutionById = new Map(institutions.map((i) => [i.id, i]));
    const siteById = new Map(sites.map((s) => [s.id, s]));

    const affectationsBySite = new Map<string, number>();
    for (const a of affectations) {
      const key = a.siteId ?? a.candidateSiteId;
      if (key) affectationsBySite.set(key, (affectationsBySite.get(key) ?? 0) + 1);
    }

    const views: DiagnosedSiteView[] = diagnostics.map((diagnostic) => {
      const siteId = diagnostic.siteId ?? diagnostic.candidateSiteId;
      const site = siteId ? (siteById.get(siteId) ?? null) : null;
      const municipality = diagnostic.municipalityId
        ? (municipalityById.get(diagnostic.municipalityId) ?? null)
        : null;
      const institution = diagnostic.institutionId
        ? (institutionById.get(diagnostic.institutionId) ?? null)
        : null;
      return {
        diagnostic,
        site,
        institution,
        municipality,
        position: site ? this.geocoder.resolve(site, municipality) : null,
        affectationCount: siteId ? (affectationsBySite.get(siteId) ?? 0) : 0,
      };
    });

const totals: CriticalityTotals = {
  red: 0,
  yellow: 0,
  green: 0,
  noDetail: 0,
  total: views.length,
};

const byMunicipality = new Map<string, MunicipalitySummary>();

    // Incluir todos los municipios del dataset, incluso aquellos
    // que actualmente no tienen sedes diagnosticadas.
    for (const municipality of municipalities) {
      byMunicipality.set(municipality.id, {
        municipality,
        affectedSites: 0,
        red: 0,
        yellow: 0,
        green: 0,
        noDetail: 0,
        criticality: "SIN_DETALLE",
        redShare: 0,
      });
    }

    for (const view of views) {
      const c = view.diagnostic.criticality;
      if (c === "ROJO") totals.red += 1;
      else if (c === "AMARILLO") totals.yellow += 1;
      else if (c === "VERDE") totals.green += 1;
      else totals.noDetail += 1;

      const municipality = view.municipality;
      if (!municipality) continue;
      let summary = byMunicipality.get(municipality.id);
      if (!summary) {
        summary = {
          municipality,
          affectedSites: 0,
          red: 0,
          yellow: 0,
          green: 0,
          noDetail: 0,
          criticality: "SIN_DETALLE",
          redShare: 0,
        };
        byMunicipality.set(municipality.id, summary);
      }
      summary.affectedSites += 1;
      if (c === "ROJO") summary.red += 1;
      else if (c === "AMARILLO") summary.yellow += 1;
      else if (c === "VERDE") summary.green += 1;
      else summary.noDetail += 1;
    }

    for (const summary of byMunicipality.values()) {
      summary.redShare = summary.affectedSites ? summary.red / summary.affectedSites : 0;
      summary.criticality = summary.red
        ? "ROJO"
        : summary.yellow
          ? "AMARILLO"
          : summary.green
            ? "VERDE"
            : "SIN_DETALLE";
    }

    return {
      sites: views.sort(
        (a, b) =>
          CRITICALITY_ORDER.indexOf(a.diagnostic.criticality) -
            CRITICALITY_ORDER.indexOf(b.diagnostic.criticality) || a.diagnostic.rank - b.diagnostic.rank,
      ),
      municipalities: [...byMunicipality.values()].sort((a, b) => b.red - a.red || b.affectedSites - a.affectedSites),
      totals,
      reviewRequired: views.filter((v) => v.diagnostic.resolution.status !== "RESOLVED").length,
      approximatePositions: views.filter((v) => v.position?.precision === "APPROXIMATE").length,
    };
  }

  async getSiteAffectations(siteId: string): Promise<Affectation[]> {
    return this.repository.listAffectations(siteId);
  }
}