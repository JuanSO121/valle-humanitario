import type {
  Affectation,
  DatasetMeta,
  Diagnostic,
  DiagnosticFilters,
  EducationalSite,
  EntityMapping,
  Institution,
  Municipality,
} from "@/domain/entities";
import type { EducationalDataRepository } from "@/domain/repositories/EducationalDataRepository";

export interface CanonicalDataset {
  meta: DatasetMeta;
  municipalities: Municipality[];
  institutions: Institution[];
  sites: EducationalSite[];
  diagnostics: Diagnostic[];
  affectations: Affectation[];
  entityMappings: EntityMapping[];
}

/** Loads the ETL output. Swappable for an HTTP/PostGIS source later. */
export type DatasetLoader = () => Promise<CanonicalDataset>;

export const fetchDatasetLoader =
  (url = "/data/dataset.json"): DatasetLoader =>
  async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudo cargar el dataset (${response.status})`);
    return (await response.json()) as CanonicalDataset;
  };

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

/**
 * MVP implementation of the repository contract, backed by the local
 * ETL-generated canonical dataset. Async on purpose so the API/PostGIS
 * implementations are drop-in replacements.
 */
export class LocalDataRepository implements EducationalDataRepository {
  private cache: Promise<CanonicalDataset> | null = null;

  constructor(private readonly loader: DatasetLoader) {}

  private load(): Promise<CanonicalDataset> {
    if (!this.cache) this.cache = this.loader();
    return this.cache;
  }

  async getMeta(): Promise<DatasetMeta> {
    return (await this.load()).meta;
  }

  async listMunicipalities(): Promise<Municipality[]> {
    const data = await this.load();
    return [...data.municipalities].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  async listInstitutions(municipalityId?: string): Promise<Institution[]> {
    const data = await this.load();
    const list = municipalityId
      ? data.institutions.filter((i) => i.municipalityId === municipalityId)
      : data.institutions;
    return [...list].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es"));
  }

  async listSites(institutionId?: string): Promise<EducationalSite[]> {
    const data = await this.load();
    return institutionId ? data.sites.filter((s) => s.institutionId === institutionId) : data.sites;
  }

  async getSite(siteId: string): Promise<EducationalSite | null> {
    const data = await this.load();
    return data.sites.find((s) => s.id === siteId) ?? null;
  }

  async listDiagnostics(filters: DiagnosticFilters = {}): Promise<Diagnostic[]> {
    const data = await this.load();
    const sitesById = new Map(data.sites.map((s) => [s.id, s]));
    const term = filters.search ? normalize(filters.search) : null;

    return data.diagnostics.filter((d) => {
      if (filters.criticality?.length && !filters.criticality.includes(d.criticality)) return false;
      if (filters.municipalityIds?.length && !filters.municipalityIds.includes(d.municipalityId ?? ""))
        return false;
      if (filters.institutionIds?.length && !filters.institutionIds.includes(d.institutionId ?? ""))
        return false;
      if (filters.onlyReviewRequired && d.resolution.status === "RESOLVED") return false;
      if (filters.zones?.length) {
        const site = d.siteId ? sitesById.get(d.siteId) : undefined;
        if (!site || !filters.zones.includes(site.zone)) return false;
      }
      if (term) {
        const haystack = normalize(
          [d.sourceSite, d.sourceInstitution, d.sourceMunicipality, d.rector].filter(Boolean).join(" "),
        );
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }

  async listAffectations(siteId?: string): Promise<Affectation[]> {
    const data = await this.load();
    if (!siteId) return data.affectations;
    return data.affectations.filter((a) => a.siteId === siteId || a.candidateSiteId === siteId);
  }

  async listEntityMappings(): Promise<EntityMapping[]> {
    return (await this.load()).entityMappings;
  }
}