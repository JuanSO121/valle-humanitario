export type ViewLevel = "ALL" | "MUNICIPALITY" | "SITE";

export interface ViewState {
  level: ViewLevel;
  municipalityId: string | null;
  siteId: string | null;
}

export const INITIAL_VIEW_STATE: ViewState = {
  level: "ALL",
  municipalityId: null,
  siteId: null,
};

/**
 * All valid transitions live here so DashboardPage/MapCanvas never construct
 * an inconsistent state (e.g. SITE level with no municipalityId).
 */
export const viewTransitions = {
  toAll(): ViewState {
    return { level: "ALL", municipalityId: null, siteId: null };
  },
  /** Clicking an already-focused municipality toggles back to ALL — this is
   *  the "elimina una selección" behavior called out in the brief. */
  toMunicipality(municipalityId: string, current: ViewState): ViewState {
    if (current.level === "MUNICIPALITY" && current.municipalityId === municipalityId) {
      return viewTransitions.toAll();
    }
    return { level: "MUNICIPALITY", municipalityId, siteId: null };
  },
  toSite(siteId: string, municipalityId: string | null, current: ViewState): ViewState {
    return { level: "SITE", municipalityId: municipalityId ?? current.municipalityId, siteId };
  },
  /** Site -> back to its municipality (not to ALL) — keeps geographic context. */
  toMunicipalityFromSite(current: ViewState): ViewState {
    return { level: "MUNICIPALITY", municipalityId: current.municipalityId, siteId: null };
  },
};