import type {
  Affectation,
  DatasetMeta,
  Diagnostic,
  DiagnosticFilters,
  EducationalSite,
  EntityMapping,
  Institution,
  Municipality,
} from "../entities";

/**
 * Main data-access contract (Dependency Inversion boundary).
 *
 * Presentation and application layers depend ONLY on this interface.
 * MVP implementation: LocalDataRepository (ETL output).
 * Future: PostGISDataRepository / ApiDataRepository — same contract, no
 * changes required in domain, application or presentation code.
 */
export interface EducationalDataRepository {
  getMeta(): Promise<DatasetMeta>;
  listMunicipalities(): Promise<Municipality[]>;
  listInstitutions(municipalityId?: string): Promise<Institution[]>;
  listSites(institutionId?: string): Promise<EducationalSite[]>;
  getSite(siteId: string): Promise<EducationalSite | null>;
  listDiagnostics(filters?: DiagnosticFilters): Promise<Diagnostic[]>;
  listAffectations(siteId?: string): Promise<Affectation[]>;
  listEntityMappings(): Promise<EntityMapping[]>;
}