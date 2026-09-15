// OpenInMapsLink.tsx
import type { GeoPoint } from "@/domain/entities";

interface Props {
  position: GeoPoint | null | undefined;
  siteName: string;
}

export function OpenInMapsLink({ position, siteName }: Props) {
  if (!position) return null;

  // Prefiere la dirección oficial del Excel sobre lat/long: resuelve al
  // sitio real en vez del centroide municipal aproximado. El pin del mapa
  // no cambia — esto solo afecta a dónde apunta el link externo.
  const query = position.address ?? `${position.latitude},${position.longitude}`;
  const usingAddress = position.address != null;
  const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
  const approximate = !usingAddress && position.precision === "APPROXIMATE";
  const label = "Ver " + siteName + " en Google Maps";

  return (
    <div className="flex flex-col gap-1">
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-raised">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        Ver en Maps
      </a>
      {approximate ? (
        <span className="text-[11px] text-muted-foreground">Ubicación aproximada (centroide municipal)</span>
      ) : null}
    </div>
  );
}