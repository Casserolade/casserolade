"""Collecte plusieurs photos par personne depuis sa catégorie Wikimedia Commons, pour varier les expressions.

Usage : python3 -I galerie.py photos.json sortie.json dossier [max_par_personne]
"""
import json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

UA = {"User-Agent": "macron-game-collector/0.1 (private parody game asset list)"}
SKIP = re.compile(r"signature|logo|affiche|poster|tract|blason|coat|map|carte|graph|tombe|grave|statue|buste|plaque|livre|book|caricature|dessin|drawing", re.I)

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

def category(qid, name):
    if qid:
        ent = api("www.wikidata.org", action="wbgetentities", ids=qid, props="claims")["entities"][qid]
        claims = ent.get("claims", {}).get("P373", [])
        if claims:
            return claims[0]["mainsnak"]["datavalue"]["value"]
    return name

def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()

def main(src, dst, outdir, limit="8"):
    limit = int(limit)
    people = json.load(open(src, encoding="utf8"))
    out = json.load(open(dst, encoding="utf8")) if os.path.exists(dst) else {}
    for p in people:
        if p["id"] in out:
            continue
        items = []
        try:
            cat = category(p.get("qid"), p["name"])
            res = api("commons.wikimedia.org", action="query", generator="categorymembers", gcmtitle="Category:" + cat, gcmtype="file", gcmlimit=40,
                      prop="imageinfo", iiprop="url|extmetadata|mime|size", iiurlwidth=640)
            pages = list(res.get("query", {}).get("pages", {}).values())
            pages.sort(key=lambda x: x.get("title", ""))
            step = max(1, len(pages) // (limit * 2))
            for page in pages[::step]:
                if len(items) >= limit:
                    break
                info = (page.get("imageinfo") or [{}])[0]
                if info.get("mime") != "image/jpeg" or info.get("width", 0) < 500 or SKIP.search(page.get("title", "")):
                    continue
                meta = info.get("extmetadata", {})
                folder = os.path.join(outdir, p["id"])
                os.makedirs(folder, exist_ok=True)
                path = os.path.join(folder, f"{len(items) + 1:02d}.jpg")
                with open(path, "wb") as f:
                    f.write(get(info.get("thumburl") or info["url"]))
                items.append({"fichier": path, "commons": info.get("descriptionurl"), "licence": strip_html(meta.get("LicenseShortName", {}).get("value")), "auteur": strip_html(meta.get("Artist", {}).get("value"))[:160]})
                time.sleep(1.5)
        except Exception as e:
            print(p["id"], "erreur", e, flush=True)
        out[p["id"]] = items
        print(f'{p["id"]:18} {len(items)} photos', flush=True)
        json.dump(out, open(dst, "w", encoding="utf8"), ensure_ascii=False, indent=1)
        time.sleep(1.5)
    print("fini :", sum(len(v) for v in out.values()), "photos")

main(*sys.argv[1:])
