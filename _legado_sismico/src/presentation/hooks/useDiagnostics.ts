import { useQuery } from "@tanstack/react-query";
import type { DiagnosticFilters } from "@/domain/entities";
import { getContainer } from "@/infrastructure/container";

export function useMapView(filters: DiagnosticFilters) {
  const { useCases } = getContainer();
  return useQuery({
    queryKey: ["map-view", filters],
    queryFn: () => useCases.buildMapView(filters),
    staleTime: Infinity,
  });
}

export function useDatasetMeta() {
  const { repository } = getContainer();
  return useQuery({
    queryKey: ["dataset-meta"],
    queryFn: () => repository.getMeta(),
    staleTime: Infinity,
  });
}

export function useMunicipalities() {
  const { repository } = getContainer();
  return useQuery({
    queryKey: ["municipalities"],
    queryFn: () => repository.listMunicipalities(),
    staleTime: Infinity,
  });
}

export function useSiteAffectations(siteId: string | null) {
  const { useCases } = getContainer();
  return useQuery({
    queryKey: ["affectations", siteId],
    queryFn: () => (siteId ? useCases.getSiteAffectations(siteId) : Promise.resolve([])),
    enabled: Boolean(siteId),
    staleTime: Infinity,
  });
}