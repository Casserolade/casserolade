"""Cherche les extraits audio des citations : recherche YouTube, sous-titres pour situer la phrase, découpe.

Le résultat reste à écouter : les sous-titres automatiques donnent une piste, pas une preuve.
Usage : python3 -I audio.py citations.json sortie.json dossier_audio dossier_travail
"""
import glob, json, os, re, shutil, subprocess, sys, time, unicodedata

EXCLUS = re.compile(r"imitat|parodi|guignol|canteloup|gerra|sketch|remix|clip offic|chanson|humour|humoriste|bigard|blague|faites l'amour|les goguettes|nicolas canteloup|tanguy pastureau|parody", re.I)
FIABLES = re.compile(r"\bina\b|lcp|public s[ée]nat|france ?info|france ?2|france ?3|france ?5|tf1|bfm|lci|cnews|le monde|lib[ée]ration|mediapart|huffpost|euronews|europe ?1|rtl|france inter|quotidien|c à vous|c a vous|konbini|brut|le figaro|le parisien|l'obs|ouest-france|t[ée]l[ée]rama|le média", re.I)
# Version figée et lancée à part : la version installée sur la machine se fait refuser par YouTube.
YT = ["uvx", "--from", "yt-dlp[default]==2026.10.26", "yt-dlp"]
MAX_CANDIDATS = 8
MAX_DECOUPES = 2

def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-z0-9]+", s.replace("’", " ").replace("'", " "))

def run(args, timeout=150):
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None

def search(query):
    r = run([*YT, f"ytsearch{MAX_CANDIDATS}:{query}", "--flat-playlist", "--print", "%(id)s\t%(duration)s\t%(channel)s\t%(title)s"])
    out = []
    if not r:
        return out
    for line in r.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) == 4:
            out.append({"video": parts[0], "duree": parts[1], "chaine": parts[2], "titre": parts[3], "url": f"https://www.youtube.com/watch?v={parts[0]}"})
    return out

def subtitles(video, work):
    for f in glob.glob(os.path.join(work, video + "*")):
        os.remove(f)
    run([*YT, f"https://www.youtube.com/watch?v={video}", "--skip-download", "--write-subs", "--write-auto-subs", "--sub-langs", "fr,fr-orig", "--sub-format", "json3", "-o", os.path.join(work, "%(id)s")], 90)
    files = sorted(glob.glob(os.path.join(work, video + "*.json3")))
    if not files:
        return None
    words = []
    data = json.load(open(files[0], encoding="utf8"))
    for ev in data.get("events", []):
        start = ev.get("tStartMs", 0)
        for seg in ev.get("segs", []) or []:
            at = (start + seg.get("tOffsetMs", 0)) / 1000
            for w in norm(seg.get("utf8", "")):
                words.append((w, at))
    return words

def locate(words, phrase):
    """Cherche la fenêtre de mots la plus proche de la phrase. Retourne (score, début, fin, texte)."""
    target = norm(phrase)
    n = len(target)
    best = (0, None, None, "")
    wanted = set(target)
    for i in range(0, max(1, len(words) - n + 1)):
        window = words[i:i + n + 2]
        got = {w for w, _ in window}
        score = len(wanted & got) / len(wanted)
        if score > best[0]:
            best = (score, window[0][1], window[-1][1], " ".join(w for w, _ in window))
    return best

def cut(video, start, end, dest, work):
    """Télécharge l'audio de la vidéo puis découpe en local : YouTube refuse la lecture partielle par ffmpeg."""
    a, b = max(0, start - 3), end + 4
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    full = glob.glob(os.path.join(work, video + ".full.*"))
    if not full:
        run([*YT, f"https://www.youtube.com/watch?v={video}", "-f", "bestaudio/best", "-o", os.path.join(work, video + ".full.%(ext)s")], 400)
        full = glob.glob(os.path.join(work, video + ".full.*"))
    if not full:
        return None
    path = dest + ".mp3"
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{a:.1f}", "-to", f"{b:.1f}", "-i", full[0], "-vn", "-acodec", "libmp3lame", "-q:a", "3", path], 120)
    for f in full:
        os.remove(f)
    return path if os.path.exists(path) and os.path.getsize(path) > 1000 else None

def main(src, dst, audio_dir, work):
    os.makedirs(work, exist_ok=True)
    quotes = json.load(open(src, encoding="utf8"))
    done = {q["id"]: q for q in json.load(open(dst, encoding="utf8"))} if os.path.exists(dst) else {}
    results = []
    for q in quotes:
        if q["id"] in done and done[q["id"]].get("traite"):
            results.append(done[q["id"]])
            continue
        rec = dict(q, candidats=[], extraits=[], traite=False)
        seen = set()
        for query in q["recherches"]:
            for c in search(query):
                if c["video"] in seen or EXCLUS.search(c["titre"] + " " + c["chaine"]):
                    continue
                seen.add(c["video"])
                c["chaine_connue"] = bool(FIABLES.search(c["chaine"] or ""))
                rec["candidats"].append(c)
            time.sleep(1.5)
        rec["candidats"].sort(key=lambda c: not c["chaine_connue"])
        for c in rec["candidats"]:
            if len(rec["extraits"]) >= MAX_DECOUPES:
                break
            words = subtitles(c["video"], work)
            time.sleep(1.5)
            if not words:
                c["sous_titres"] = False
                continue
            c["sous_titres"] = True
            score, start, end, text = locate(words, q["phrase"])
            c["score"] = round(score, 2)
            if score < 0.75 or start is None:
                continue
            c["debut"], c["fin"], c["texte"] = round(start, 1), round(end, 1), text
            path = cut(c["video"], start, end, os.path.join(audio_dir, q["id"], c["video"]), work)
            time.sleep(1.5)
            if path:
                rec["extraits"].append({"fichier": path, "video": c["video"], "url": f'{c["url"]}&t={int(start)}s', "chaine": c["chaine"], "titre": c["titre"], "chaine_connue": c["chaine_connue"], "score": c["score"], "texte": text, "ecoute": None})
        rec["traite"] = True
        results.append(rec)
        print(f'{q["id"]:26} {len(rec["candidats"]):2} candidats, {len(rec["extraits"])} extrait(s)', flush=True)
        json.dump(results + [done[x["id"]] for x in quotes if x["id"] in done and x["id"] not in {r["id"] for r in results}], open(dst, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    json.dump(results, open(dst, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    shutil.rmtree(work, ignore_errors=True)
    print("fini :", sum(1 for r in results if r["extraits"]), "/", len(results), "citations avec extrait")

main(*sys.argv[1:5])
