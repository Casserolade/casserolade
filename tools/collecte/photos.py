"""Collecte une photo par personne via Wikidata (P18) et Wikimedia Commons, avec licence et auteur.

Usage : python3 -I photos.py personnes.json sortie.json dossier_photos
"""
import json, os, re, sys, time, urllib.parse, urllib.request

UA = {"User-Agent": "macron-game-collector/0.1 (private parody game asset list)"}
OK_WORDS = re.compile(r"politi|minist|député|sénat|maire|président|journalist|présent|animat|avocat|chanteur|militant|syndical|essayiste|polémiste|haut fonctionnaire|chroniqueu|enseignant|deput|mayor|member|presenter|host|lawyer|singer", re.I)

def get(url):
    req = urllib.request.Request(url, headers=UA)
    for attempt in range(7):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < 6:
                wait = int(e.headers.get("Retry-After") or 0) or 15 * (attempt + 1)
                time.sleep(min(wait, 180)); continue
            raise

def api(host, **params):
    params["format"] = "json"
    return json.loads(get(f"https://{host}/w/api.php?" + urllib.parse.urlencode(params)))

# Identités vérifiées à la main : la recherche par nom renvoie parfois un film ou un homonyme.
QIDS = {"macron": "Q3052772", "fillon": "Q101410", "chirac": "Q2105", "hollande": "Q157", "de_gaulle": "Q2042", "yann_bompard": "Q50384291",
        "lepers": "Q3189566", "braun_pivet": "Q30339422", "larcher": "Q784021", "fogiel": "Q3287706", "lescure": "Q3385949", "lapix": "Q2850938"}

def find_qid(name):
    for attempt in range(5):
        res = api("www.wikidata.org", action="wbsearchentities", search=name, language="fr", uselang="fr", type="item", limit=6)
        if "error" not in res:
            break
        time.sleep(20 * (attempt + 1))
    hits = res.get("search", [])
    for h in hits:
        if OK_WORDS.search(h.get("description", "") or ""):
            return h["id"], h.get("description", "")
    return (hits[0]["id"], hits[0].get("description", "") + " [À VÉRIFIER]") if hits else (None, None)

def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()

def main(src, dst, outdir):
    people = json.load(open(src, encoding="utf8"))
    done = {p["id"]: p for p in json.load(open(dst, encoding="utf8"))} if os.path.exists(dst) else {}
    out = []
    for p in people:
        if p["id"] in done and done[p["id"]].get("file"):
            out.append(done[p["id"]]); continue
        rec = dict(p, qid=None, description=None, file=None, licence=None, auteur=None, commons=None, statut="manquante")
        try:
            qid, desc = (QIDS[p["id"]], "identité fixée à la main") if p["id"] in QIDS else find_qid(p["name"])
            rec.update(qid=qid, description=desc)
            if qid:
                ent = api("www.wikidata.org", action="wbgetentities", ids=qid, props="claims")["entities"][qid]
                claims = ent.get("claims", {}).get("P18", [])
                rec["images_wikidata"] = len(claims)
                if claims:
                    fname = claims[0]["mainsnak"]["datavalue"]["value"]
                    info = api("commons.wikimedia.org", action="query", titles="File:" + fname, prop="imageinfo", iiprop="url|extmetadata|mime", iiurlwidth=800)
                    page = next(iter(info["query"]["pages"].values()))["imageinfo"][0]
                    meta = page.get("extmetadata", {})
                    rec["licence"] = strip_html(meta.get("LicenseShortName", {}).get("value"))
                    rec["auteur"] = strip_html(meta.get("Artist", {}).get("value"))[:160]
                    rec["commons"] = page.get("descriptionurl")
                    ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}.get(page.get("mime"), ".jpg")
                    path = os.path.join(outdir, p["id"] + ext)
                    with open(path, "wb") as f:
                        f.write(get(page.get("thumburl") or page["url"]))
                    rec["file"] = path
                    rec["statut"] = "ok"
        except Exception as e:
            rec["statut"] = f"erreur: {e}"
        out.append(rec)
        print(f'{p["id"]:18} {rec["statut"][:12]:12} {rec.get("licence") or "-":22} {(rec.get("description") or "-")[:60]}', flush=True)
        time.sleep(4)
        json.dump(out, open(dst, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    json.dump(out, open(dst, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("ok", sum(1 for r in out if r.get("file")), "/", len(out))

main(*sys.argv[1:4])
