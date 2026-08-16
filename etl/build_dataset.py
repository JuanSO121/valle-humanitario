"""ETL: three source workbooks -> canonical JSON dataset consumed by LocalDataRepository.

Run:  python3 etl/build_dataset.py <sources_dir> 
Outputs src/data/dataset.json and src/data/valle-municipios.json (bundled by Vite)
"""
import json, re, sys, unicodedata, difflib, warnings
from pathlib import Path
import pandas as pd

warnings.filterwarnings("ignore")

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-uploads")
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src/data/dataset.json"
GEO_IN = Path("/tmp/col.json")
GEO_OUT = ROOT / "src/data/valle-municipios.json"

FUZZY_THRESHOLD = 0.85
INSTITUTION_PREFIXES = [
    "INSTITUCION ETNOEDUCATIVA TECNICA", "INSTITUCION EDUCATIVA TECNICA",
    "INSTITUCION ETNOEDUCATIVA", "INSTITUCION EDUCATIVA", "CENTRO EDUCATIVO",
    "COLEGIO", "TECNICO", "TECNICA", "IE",
]


def norm(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    s = str(v).replace("_", " ").upper().strip()
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def strip_prefix(s: str) -> str:
    for p in INSTITUTION_PREFIXES:
        if s.startswith(p + " "):
            return s[len(p) + 1:]
    return s


def code(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, float):
        return str(int(v))
    return str(v).strip()


def txt(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    return s or None


def gagem(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    m = re.search(r"\d+", str(v))
    return int(m.group()) if m else None


def muni_code_from_ee(ee):
    """DANE EE codes embed the municipality code: <type><5-digit muni><serial>."""
    c = code(ee)
    return c[1:6] if c and len(c) >= 6 else None


def read(name, sheet):
    df = pd.read_excel(SRC / name, sheet_name=sheet)
    df.columns = [re.sub(r"\s+", " ", str(c)).strip() for c in df.columns]
    return df


# ---------------------------------------------------------------- sources
rect = read("BASE_DATOS_RECTORES_2026.xlsx", "Rectores2026")
secr = read("BASE_DATOS_RECTORES_2026.xlsx", "Secretarios de Educación Certif")
inv = read("IE_Y_SEDES_OFICIALES_SEDVALLE_EN_TODAS_LOS_ESTADOS.xlsx", "IE Y SEDES TODOS LOS ESTADOS")
DIAG = "Diagnostico_Criticidad_Infraestructura_Educativa_Sismo_ValleCauca.xlsx"
rank = read(DIAG, "Ranking Priorización")
det = read(DIAG, "Detalle Afectaciones")

# QUALITY RULE: drop trailing noise rows (legend text) - never dropna(how='all')
inv = inv[inv["Tipo"].notna() & inv["Código Sede"].notna()].copy()

warnings_log = []

# ---------------------------------------------------------- municipalities
# QUALITY RULE: "Nombre municipio" in the inventory is misaligned with the code
# column, so the DANE code is the only trustworthy municipal key. Names and
# geometry come from the official DANE municipal boundary layer.
municipalities = {}
for _, r in inv.iterrows():
    c = muni_code_from_ee(r["Código EE"])
    if c and c not in municipalities:
        municipalities[c] = {
            "id": c, "officialCode": c, "name": c, "normalizedName": c,
            "gagem": gagem(r.get("GAGEM")),
            "latitude": None, "longitude": None,
        }

features = []
if GEO_IN.exists():
    gj = json.load(open(GEO_IN))
    for f in gj["features"]:
        p = f["properties"]
        if p.get("DPTO_CCDGO") != "76":
            continue
        mcode = p["MPIO_CCNCT"]
        rings = f["geometry"]["coordinates"]
        polys = rings if f["geometry"]["type"] == "MultiPolygon" else [rings]
        simplified, pts = [], []
        for poly in polys:
            new_poly = []
            for ring in poly:
                step = max(1, len(ring) // 900)
                thin = ring[::step]
                if thin[0] != thin[-1]:
                    thin.append(thin[0])
                if len(thin) >= 4:
                    new_poly.append([[round(x, 5), round(y, 5)] for x, y in thin])
                    pts.extend(thin)
            if new_poly:
                simplified.append(new_poly)
        if not simplified:
            continue
        if mcode in municipalities:
            m = municipalities[mcode]
            m["name"] = txt(p["MPIO_CNMBR"])
            m["normalizedName"] = norm(p["MPIO_CNMBR"])
            if pts:
                m["latitude"] = round(sum(y for _, y in pts) / len(pts), 6)
                m["longitude"] = round(sum(x for x, _ in pts) / len(pts), 6)
        features.append({
            "type": "Feature",
            "properties": {"municipalityCode": mcode, "name": p["MPIO_CNMBR"]},
            "geometry": {"type": "MultiPolygon", "coordinates": simplified},
        })
    GEO_OUT.parent.mkdir(parents=True, exist_ok=True)
    json.dump({"type": "FeatureCollection", "features": features}, open(GEO_OUT, "w"))

for m in municipalities.values():
    if m["name"] == m["id"]:
        warnings_log.append(f"Municipality code {m['id']} has no official boundary/name record")

# --------------------------------------------------------- institutions
institutions = {}
for _, r in inv[inv["Tipo"] == "EE"].iterrows():
    c = code(r["Código EE"])
    institutions[c] = {
        "id": c, "officialCode": c, "municipalityId": muni_code_from_ee(r["Código EE"]),
        "name": txt(r["Nombre EE"]), "normalizedName": norm(r["Nombre EE"]),
        "rector": txt(r.get("RECTOR")), "email": txt(r.get("EMAIL")),
        "phone": None, "mobile": None, "alternateEmails": [],
        "nit": None, "gagem": gagem(r.get("GAGEM")),
        "sourceRefs": ["inventory"],
    }

# enrich by OFFICIAL_CODE join (confidence 1.0)
entity_mappings = []
matched_rect = 0
for _, r in rect.iterrows():
    c = code(r["CodDane"])
    inst = institutions.get(c)
    if not inst:
        warnings_log.append(f"Rector row CodDane {c} not present in official inventory")
        continue
    matched_rect += 1
    inst["rector"] = txt(r["RECTOR (A)"]) or inst["rector"]
    inst["phone"] = txt(r["TELEFONO FIJO"])
    inst["mobile"] = txt(r["CELULAR"])
    inst["nit"] = txt(r["NIT"])
    inst["email"] = txt(r["CORREOS INSTITUCIONALES"]) or inst["email"]
    alt = txt(r["CORREOS ALTERNOS"])
    inst["alternateEmails"] = [e.strip() for e in re.split(r"[;,]", alt) if e.strip()] if alt else []
    inst["sourceRefs"].append("rectors")
    entity_mappings.append({
        "source": "rectores.coddane", "sourceValue": c, "canonicalEntityType": "institution",
        "canonicalEntityId": c, "matchMethod": "OFFICIAL_CODE", "confidence": 1.0,
        "status": "RESOLVED", "reviewed": True,
    })

# ------------------------------------------------------------- sites
sites = {}
for _, r in inv[inv["Tipo"] == "SEDE"].iterrows():
    sc = code(r["Código Sede"])
    ic = code(r["Código EE"])
    if sc in sites:
        warnings_log.append(f"Duplicate site code {sc} - kept first occurrence")
        continue
    zona = (txt(r.get("Zona")) or "").upper()
    sites[sc] = {
        "id": sc, "officialSiteCode": sc, "institutionId": ic,
        "municipalityId": muni_code_from_ee(r["Código EE"]),
        "name": txt(r["Nombre Sede"]), "normalizedName": norm(r["Nombre Sede"]),
        "address": txt(r.get("Dirección")),
        "zone": "URBANA" if zona == "URBANA" else "RURAL" if zona == "RURAL" else "DESCONOCIDA",
        "officialStatus": txt(r.get("Estado Sede")),
        "isMainSite": sc == ic,
        "latitude": None, "longitude": None, "coordinateSource": None,
    }

# --------------------------------------------------- diagnostic resolution
inst_by_muni = {}
for i in institutions.values():
    inst_by_muni.setdefault(i["municipalityId"], []).append(i)
sites_by_inst = {}
for s in sites.values():
    sites_by_inst.setdefault(s["institutionId"], []).append(s)
muni_by_norm = {m["normalizedName"]: m for m in municipalities.values()}


def resolve_municipality(raw):
    n = norm(raw)
    m = muni_by_norm.get(n)
    if m:
        return m, "NORMALIZED_EXACT", 1.0
    contained = [c for c in municipalities.values()
                 if n and (n in c["normalizedName"] or c["normalizedName"] in n)]
    if len(contained) == 1:
        return contained[0], "TOKEN_CONTAINMENT", 0.95
    best, score = None, 0.0
    for cand in municipalities.values():
        s = difflib.SequenceMatcher(None, n, cand["normalizedName"]).ratio()
        if s > score:
            best, score = cand, s
    return best, "FUZZY", round(score, 3)


def resolve_institution(raw, muni):
    n = strip_prefix(norm(raw))
    cands = inst_by_muni.get(muni["id"], []) if muni else []
    if not cands:
        return None, "NONE", 0.0
    tokens = set(n.split())
    contained = [c for c in cands if tokens and tokens <= set(strip_prefix(c["normalizedName"]).split())]
    if len(contained) == 1:
        return contained[0], "TOKEN_CONTAINMENT", 0.95
    pool = contained or cands
    best, score = None, 0.0
    for c in pool:
        s = difflib.SequenceMatcher(None, n, strip_prefix(c["normalizedName"])).ratio()
        if s > score:
            best, score = c, s
    return best, "FUZZY", round(score, 3)


def resolve_site(raw, inst):
    if not inst:
        return None, "NONE", 0.0
    cands = sites_by_inst.get(inst["id"], [])
    if not cands:
        return None, "NONE", 0.0
    n = strip_prefix(norm(raw))
    n = re.sub(r"^SEDE ", "", n).strip()
    if n in ("PRINCIPAL", "SEDE PRINCIPAL", "") or n == strip_prefix(inst["normalizedName"]):
        main = [c for c in cands if c["isMainSite"]]
        if main:
            return main[0], "MAIN_SITE_RULE", 0.95
    exact = [c for c in cands if strip_prefix(c["normalizedName"]) == n]
    if len(exact) == 1:
        return exact[0], "NORMALIZED_EXACT", 1.0
    tokens = set(n.split())
    contained = [c for c in cands if tokens and tokens <= set(strip_prefix(c["normalizedName"]).split())]
    if len(contained) == 1:
        return contained[0], "TOKEN_CONTAINMENT", 0.92
    pool = contained or cands
    best, score = None, 0.0
    for c in pool:
        s = difflib.SequenceMatcher(None, n, strip_prefix(c["normalizedName"])).ratio()
        if s > score:
            best, score = c, s
    return best, "FUZZY", round(score, 3)


def crit(v):
    c = norm(v)
    return c if c in ("ROJO", "AMARILLO", "VERDE") else "SIN_DETALLE"


resolution_cache = {}


def resolve_row(muni_raw, inst_raw, site_raw):
    key = (str(muni_raw), str(inst_raw), str(site_raw))
    if key in resolution_cache:
        return resolution_cache[key]
    muni, mm, mc = resolve_municipality(muni_raw)
    inst, im, ic = resolve_institution(inst_raw, muni)
    site, sm, sc = resolve_site(site_raw, inst)
    conf = round(min(mc, ic if inst else 0.0, sc if site else 0.0), 3)
    status = "RESOLVED" if site and conf >= FUZZY_THRESHOLD else "MATCH_REVIEW_REQUIRED"
    res = {
        "municipality": muni, "institution": inst, "site": site,
        "confidence": conf, "status": status,
        "matchMethod": sm if site else (im if inst else mm),
        "municipalityMatch": {"method": mm, "confidence": mc},
        "institutionMatch": {"method": im, "confidence": ic},
        "siteMatch": {"method": sm, "confidence": sc},
    }
    resolution_cache[key] = res
    return res


diagnostics, affectations = [], []
for _, r in rank.iterrows():
    res = resolve_row(r["Municipio"], r["Institución Educativa"], r["Sede Afectada"])
    did = f"diag-{int(r['#'])}"
    diagnostics.append({
        "id": did, "rank": int(r["#"]), "criticality": crit(r["Criticidad"]),
        "sourceMunicipality": txt(r["Municipio"]), "sourceInstitution": txt(r["Institución Educativa"]),
        "sourceSite": txt(r["Sede Afectada"]),
        "municipalityId": res["municipality"]["id"] if res["municipality"] else None,
        "institutionId": res["institution"]["id"] if res["institution"] else None,
        "siteId": res["site"]["id"] if res["site"] and res["status"] == "RESOLVED" else None,
        "candidateSiteId": res["site"]["id"] if res["site"] else None,
        "redZones": int(r["N° Zonas ROJO"]), "yellowZones": int(r["N° Zonas AMARILLO"]),
        "greenZones": int(r["N° Zonas VERDE"]), "totalZones": int(r["Total Zonas Afectadas"]),
        "rector": txt(r["Rector"]), "phone": txt(r["Teléfono Contacto"]),
        "recommendedAction": txt(r["Acción Recomendada"]),
        "resolution": {
            "status": res["status"], "confidence": res["confidence"], "matchMethod": res["matchMethod"],
            "municipality": res["municipalityMatch"], "institution": res["institutionMatch"],
            "site": res["siteMatch"],
        },
    })
    entity_mappings.append({
        "source": "diagnostico.sede", "sourceValue": f"{txt(r['Municipio'])} / {txt(r['Institución Educativa'])} / {txt(r['Sede Afectada'])}",
        "canonicalEntityType": "site",
        "canonicalEntityId": res["site"]["id"] if res["site"] else None,
        "matchMethod": res["matchMethod"], "confidence": res["confidence"],
        "status": res["status"], "reviewed": False,
    })

for idx, r in det.iterrows():
    res = resolve_row(r["Municipio"], r["Institución Educativa"], r["Sede"])
    link = txt(r["Link Imagen"])
    affectations.append({
        "id": f"aff-{idx}", "criticality": crit(r["Criticidad"]),
        "zoneElement": txt(r["Zona/Elemento"]), "description": txt(r["Descripción Reportada"]),
        "sourceMunicipality": txt(r["Municipio"]), "sourceInstitution": txt(r["Institución Educativa"]),
        "sourceSite": txt(r["Sede"]),
        "municipalityId": res["municipality"]["id"] if res["municipality"] else None,
        "institutionId": res["institution"]["id"] if res["institution"] else None,
        "siteId": res["site"]["id"] if res["site"] and res["status"] == "RESOLVED" else None,
        "candidateSiteId": res["site"]["id"] if res["site"] else None,
        "rector": txt(r["Rector"]), "phone": txt(r["Teléfono"]),
        "evidenceUrl": link,
        "resolution": {
            "status": res["status"], "confidence": res["confidence"], "matchMethod": res["matchMethod"],
            "municipality": res["municipalityMatch"], "institution": res["institutionMatch"],
            "site": res["siteMatch"],
        },
    })

secretaries = [{
    "id": str(int(r["ID"])), "municipality": txt(r["MUNICIPIO"]), "name": txt(r["NOMBRE Y APELLIDOS"]),
    "role": txt(r["CARGO"]), "mobile": txt(r["CELULAR"]), "email": txt(r["CORREO"]),
} for _, r in secr.iterrows() if pd.notna(r.get("ID"))]

review = [d for d in diagnostics if d["resolution"]["status"] != "RESOLVED"]
dataset = {
    "meta": {
        "generatedAt": pd.Timestamp.utcnow().isoformat(),
        "sources": [
            "BASE_DATOS_RECTORES_2026.xlsx",
            "IE_Y_SEDES_OFICIALES_SEDVALLE_EN_TODAS_LOS_ESTADOS.xlsx",
            "Diagnostico_Criticidad_Infraestructura_Educativa_Sismo_ValleCauca.xlsx",
        ],
        "fuzzyThreshold": FUZZY_THRESHOLD,
        "counts": {
            "municipalities": len(municipalities), "institutions": len(institutions),
            "sites": len(sites), "diagnostics": len(diagnostics), "affectations": len(affectations),
            "rectorsJoined": matched_rect, "reviewRequired": len(review),
        },
        "warnings": warnings_log[:50],
    },
    "municipalities": list(municipalities.values()),
    "institutions": list(institutions.values()),
    "sites": list(sites.values()),
    "diagnostics": diagnostics,
    "affectations": affectations,
    "secretaries": secretaries,
    "entityMappings": entity_mappings,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
json.dump(dataset, open(OUT, "w"), ensure_ascii=False)
print(json.dumps(dataset["meta"]["counts"], indent=2))
print("review required:", len(review), "of", len(diagnostics))
print("affect review:", sum(1 for a in affectations if a["resolution"]["status"] != "RESOLVED"))
