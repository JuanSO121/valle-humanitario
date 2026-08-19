// SiteDetailPanel.tsx
import type { Criticality, DiagnosedSiteView } from "@/domain/entities";
import { useSiteAffectations } from "@/presentation/hooks/useDiagnostics";
import { CRITICALITY_HEX } from "./criticality";

import { OpenInMapsLink } from "./OpenInMapsLink";
import { CRITICALITY_DESCRIPTION, CRITICALITY_SHORT_LABEL } from "./criticalityDescriptions";

interface Props {
  view: DiagnosedSiteView;
}

const ZONE_LABEL: Record<string, string> = {
  URBANA: "Zona urbana",
  RURAL: "Zona rural",
  DESCONOCIDA: "Zona sin especificar",
};

export function SiteDetailPanel({ view }: Props) {
  const { diagnostic, site, institution, municipality, position } = view;
  const siteId = diagnostic.siteId ?? diagnostic.candidateSiteId;
  const { data: affectations = [] } = useSiteAffectations(siteId);
  const siteName = site?.name ?? diagnostic.sourceSite ?? "Sede sin nombre";
  const color = CRITICALITY_HEX[diagnostic.criticality];

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 pb-0">
        <RiskBanner criticality={diagnostic.criticality} color={color} />
      </div>

      <header className="p-4 pt-3">
        <h2 className="text-base leading-tight font-semibold">{siteName}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{institution?.name ?? diagnostic.sourceInstitution ?? "—"}</p>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4 text-sm">
        <Section title="Dónde queda">
          <p>
            {municipality?.name ?? diagnostic.sourceMunicipality ?? "Municipio sin identificar"}
            {site?.zone && <> · {ZONE_LABEL[site.zone] ?? site.zone}</>}
          </p>
          {site?.address && <p className="mt-1 text-muted-foreground">{site.address}</p>}
          {position && (
            <div className="mt-2">
              <OpenInMapsLink position={position} siteName={siteName} />
            </div>
          )}
        </Section>

        {diagnostic.recommendedAction && (
          <Section title="Qué se recomienda hacer">
            <div
              className="rounded-md border p-3 leading-relaxed"
              style={{ borderColor: `${color}55`, backgroundColor: `${color}0f` }}
            >
              {diagnostic.recommendedAction}
            </div>
          </Section>
        )}

        {affectations.length > 0 && (
          <Section title={`Qué se encontró (${affectations.length})`}>
            <ul className="space-y-2">
              {affectations.map((a) => (
                <li key={a.id} className="rounded-md border border-border bg-surface-raised p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: CRITICALITY_HEX[a.criticality] }} />
                    <span className="text-xs font-medium">{a.zoneElement ?? "Elemento sin clasificar"}</span>
                  </div>
                  {a.description && <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Resultado de la revisión">
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            {(["ROJO", "AMARILLO", "VERDE"] as const).map((c) => {
              const value =
                c === "ROJO" ? diagnostic.redZones : c === "AMARILLO" ? diagnostic.yellowZones : diagnostic.greenZones;
              const pct = diagnostic.totalZones ? (value / diagnostic.totalZones) * 100 : 0;
              return <span key={c} style={{ width: `${pct}%`, backgroundColor: CRITICALITY_HEX[c] }} />;
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            De las zonas revisadas: {diagnostic.redZones} con daño grave, {diagnostic.yellowZones} necesitan seguimiento,{" "}
            {diagnostic.greenZones} sin problemas.
          </p>
        </Section>

        {(() => {
          const rector = institution?.rector ?? diagnostic.rector;
          // Celular primero: es el número que trae el ranking/afectaciones
          // como contacto del reporte, más confiable para una llamada
          // urgente que el fijo institucional.
          const primaryPhone = institution?.mobile ?? diagnostic.phone ?? institution?.phone ?? null;
          const landline = institution?.phone && institution.phone !== primaryPhone ? institution.phone : null;
          if (!rector && !primaryPhone) return null;
          return (
            <Section title="Contacto">
              <p>{rector ?? "Rector no registrado"}</p>
              {primaryPhone && <p className="mt-0.5 text-muted-foreground">{primaryPhone}</p>}
              {landline && <p className="mt-0.5 text-xs text-muted-foreground">Fijo: {landline}</p>}
            </Section>
          );
        })()}

        {/* Metadatos e información de auditoría: no aportan nada a alguien
            que solo quiere saber el estado de la sede, así que quedan
            colapsados y aparte de las secciones anteriores. */}
        <details className="rounded-md border border-border bg-surface-raised p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer label-caps">Más información</summary>
          <dl className="mt-2 grid grid-cols-2 gap-2.5">
            <Field label="Código sede" value={site?.officialSiteCode} mono />
            <Field label="Estado oficial" value={site?.officialStatus} />
          </dl>
          <p className="mt-2.5">
            Coincidencia de datos:{" "}
            <span className={diagnostic.resolution.status === "RESOLVED" ? "text-safe" : "text-primary"}>
              {diagnostic.resolution.status === "RESOLVED" ? "confirmada" : "requiere revisión"}
            </span>{" "}
            (método: {diagnostic.resolution.matchMethod}, confianza {diagnostic.resolution.confidence.toFixed(2)})
          </p>
          <p className="mt-1">
            Precisión de la posición en el mapa:{" "}
            {position
              ? position.precision === "EXACT"
                ? "coordenadas oficiales"
                : "aproximada (centroide del municipio)"
              : "sin coordenadas"}
          </p>
        </details>
      </div>
    </div>
  );
}

function RiskBanner({ criticality, color }: { criticality: Criticality; color: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border p-3" style={{ borderColor: `${color}55`, backgroundColor: `${color}14` }}>
      <RiskIcon criticality={criticality} color={color} />
      <div>
        <p className="text-sm font-semibold" style={{ color }}>
          {CRITICALITY_SHORT_LABEL[criticality]}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground">{CRITICALITY_DESCRIPTION[criticality]}</p>
      </div>
    </div>
  );
}

function RiskIcon({ criticality, color }: { criticality: Criticality; color: string }) {
  if (criticality === "VERDE") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden>
        <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (criticality === "SIN_DETALLE") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
        <path d="M12 16v.01M12 8a2.5 2.5 0 012.5 2.5c0 1.5-2.5 1.5-2.5 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden>
      <path d="M12 3.5L22 20.5H2L12 3.5z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 10v4.5M12 17.5v.01" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="label-caps">{title}</span>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null | undefined; mono?: boolean | undefined }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? "font-mono" : ""}>{value || "—"}</dd>
    </div>
  );
}