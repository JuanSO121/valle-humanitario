// SiteDetailPanel.tsx
import type { DiagnosedSiteView } from "@/domain/entities";
import { useSiteAffectations } from "@/presentation/hooks/useDiagnostics";
import { CRITICALITY_CLASS, CRITICALITY_LABEL, CRITICALITY_HEX } from "./criticality";
import { OpenInMapsLink } from "./OpenInMapsLink";

interface Props {
  view: DiagnosedSiteView;
}

export function SiteDetailPanel({ view }: Props) {
  const { diagnostic, site, institution, municipality, position } = view;
  const siteId = diagnostic.siteId ?? diagnostic.candidateSiteId;
  const { data: affectations = [] } = useSiteAffectations(siteId);
  const siteName = site?.name ?? diagnostic.sourceSite ?? "Sede sin nombre";

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border p-4">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${CRITICALITY_CLASS[diagnostic.criticality]}`}>
          {CRITICALITY_LABEL[diagnostic.criticality]}
        </span>
        <h2 className="mt-2 text-base leading-tight font-semibold">{siteName}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{institution?.name ?? diagnostic.sourceInstitution ?? "—"}</p>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <dl className="grid grid-cols-2 gap-3">
          <Field label="Municipio" value={municipality?.name ?? diagnostic.sourceMunicipality} />
          <Field label="Código sede" value={site?.officialSiteCode} mono />
          <Field label="Zona" value={site?.zone} />
          <Field label="Estado oficial" value={site?.officialStatus} />
          <Field label="Rector" value={institution?.rector ?? diagnostic.rector} />
          <Field label="Teléfono" value={institution?.phone ?? diagnostic.phone} mono />
        </dl>

        <div>
          <span className="label-caps">Zonas evaluadas</span>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
            {(["ROJO", "AMARILLO", "VERDE"] as const).map((c) => {
              const value =
                c === "ROJO" ? diagnostic.redZones : c === "AMARILLO" ? diagnostic.yellowZones : diagnostic.greenZones;
              const pct = diagnostic.totalZones ? (value / diagnostic.totalZones) * 100 : 0;
              return <span key={c} style={{ width: `${pct}%`, backgroundColor: CRITICALITY_HEX[c] }} />;
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {diagnostic.redZones} rojas · {diagnostic.yellowZones} amarillas · {diagnostic.greenZones} verdes
          </p>
        </div>

        {diagnostic.recommendedAction && (
          <div>
            <span className="label-caps">Acción recomendada</span>
            <p className="mt-1 leading-relaxed">{diagnostic.recommendedAction}</p>
          </div>
        )}

        {affectations.length > 0 && (
          <div>
            <span className="label-caps">Afectaciones ({affectations.length})</span>
            <ul className="mt-2 space-y-2">
              {affectations.map((a) => (
                <li key={a.id} className="rounded-md border border-border bg-surface-raised p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: CRITICALITY_HEX[a.criticality] }} />
                    <span className="text-xs font-medium">{a.zoneElement ?? "Elemento sin clasificar"}</span>
                  </div>
                  {a.description && <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-md border border-border bg-surface-raised p-3 text-xs text-muted-foreground">
          <span className="label-caps">Trazabilidad</span>
          <p className="mt-1.5">
            Resolución:{" "}
            <span className={diagnostic.resolution.status === "RESOLVED" ? "text-safe" : "text-primary"}>
              {diagnostic.resolution.status}
            </span>{" "}
            · {diagnostic.resolution.matchMethod} · confianza {diagnostic.resolution.confidence.toFixed(2)}
          </p>
          <p className="mt-1">
            Posición:{" "}
            {position
              ? `${position.source} (${position.precision === "EXACT" ? "exacta" : "aproximada, centroide municipal"})`
              : "sin coordenadas"}
          </p>
          {/* "Ver en Maps": vive justo debajo de la descripción de la
              posición, así queda contextualizado con el mismo dato del que
              habla (fuente + precisión) en vez de aparecer suelto en otra
              parte del panel. Si no hay coordenadas, OpenInMapsLink
              simplemente no renderiza nada. */}
          {position && (
            <div className="mt-2">
              <OpenInMapsLink position={position} siteName={siteName} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null | undefined; mono?: boolean | undefined }) {
  return (
    <div>
      <dt className="label-caps">{label}</dt>
      <dd className={`mt-0.5 text-xs ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}