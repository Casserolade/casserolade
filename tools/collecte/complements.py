"""Pour les citations sans extrait : garde l'audio entier d'une vidéo courte, à écouter. Usage : python3 -I complements.py audio.json dossier_audio dossier_travail"""
import glob, json, os, re, subprocess, sys, time

YT = ["uvx", "--from", "yt-dlp[default]==2026.10.26", "yt-dlp"]
data = json.load(open(sys.argv[1], encoding="utf8"))
for r in data:
    if r["extraits"]:
        continue
    picks = [c for c in r["candidats"] if str(c.get("duree", "")).replace(".", "").isdigit() and float(c["duree"]) <= 240]
    picks.sort(key=lambda c: (not c.get("chaine_connue"), -(c.get("score") or 0)))
    for c in picks[:2]:
        folder = os.path.join(sys.argv[2], r["id"])
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, c["video"] + ".entier.mp3")
        tmp = os.path.join(sys.argv[3], c["video"] + ".%(ext)s")
        os.makedirs(sys.argv[3], exist_ok=True)
        subprocess.run([*YT, c["url"], "-f", "bestaudio/best", "-o", tmp], capture_output=True, text=True, timeout=400)
        got = glob.glob(os.path.join(sys.argv[3], c["video"] + ".*"))
        if got:
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", got[0], "-vn", "-acodec", "libmp3lame", "-q:a", "4", path], timeout=200)
            for f in got:
                os.remove(f)
        if os.path.exists(path):
            r["extraits"].append({"fichier": path, "video": c["video"], "url": c["url"], "chaine": c["chaine"], "titre": c["titre"], "chaine_connue": c.get("chaine_connue"), "score": c.get("score"), "texte": "(vidéo entière : phrase non repérée)", "entier": True, "ecoute": None})
        time.sleep(2)
    print(f'{r["id"]:24} {len(r["extraits"])}', flush=True)
json.dump(data, open(sys.argv[1], "w", encoding="utf8"), ensure_ascii=False, indent=1)
