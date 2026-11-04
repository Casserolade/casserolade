"""Récupère des images d'interviews en bonne définition pour varier les expressions.

Attention : une vidéo montre aussi le journaliste et les invités. Le tri par forme de visage ne dit pas QUI est à l'image :
le contrôle se fait à l'œil sur les planches. Usage : python3 -I expressions_video.py personnes.json dossier dossier_travail id1 id2 ...
"""
import glob, json, os, subprocess, sys, time

YT = ["uvx", "--from", "yt-dlp[default]==2026.10.26", "yt-dlp"]
EXCLU = ("imitat", "parodi", "guignol", "sketch", "remix", "chanson", "canteloup", "ia ", "deepfake")
MAX_DUREE = 1200

people = {p["id"]: p for p in json.load(open(sys.argv[1], encoding="utf8"))}
outdir, work = sys.argv[2], sys.argv[3]
os.makedirs(work, exist_ok=True)
for pid in sys.argv[4:]:
    p = people[pid]
    folder = os.path.join(outdir, pid)
    if glob.glob(os.path.join(folder, "*", "*.jpg")):
        continue
    kept = 0
    for query in (f"{p['name']} interview en face caméra", f"{p['name']} s'énerve colère débat plateau"):
        r = subprocess.run([*YT, f"ytsearch6:{query}", "--flat-playlist", "--print", "%(id)s\t%(duration)s\t%(channel)s\t%(title)s"], capture_output=True, text=True, timeout=200)
        for line in r.stdout.splitlines():
            f = line.split("\t")
            if len(f) != 4 or not f[1].replace(".", "").isdigit() or float(f[1]) > MAX_DUREE or float(f[1]) < 30:
                continue
            last = p["name"].split()[-1].lower()
            if last not in f[3].lower() or any(x in f[3].lower() for x in EXCLU):
                continue
            tmp = os.path.join(work, f[0] + ".%(ext)s")
            subprocess.run([*YT, "https://www.youtube.com/watch?v=" + f[0], "-f", "bv*[height<=720]/b", "-o", tmp], capture_output=True, text=True, timeout=500)
            got = glob.glob(os.path.join(work, f[0] + ".*"))
            if not got:
                continue
            dest = os.path.join(folder, f[0])
            os.makedirs(dest, exist_ok=True)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", got[0], "-vf", "fps=1/2", "-q:v", "3", os.path.join(dest, "%04d.jpg")], timeout=600)
            for g in got:
                os.remove(g)
            json.dump({"video": f[0], "titre": f[3], "chaine": f[2], "url": "https://www.youtube.com/watch?v=" + f[0]}, open(os.path.join(dest, "source.json"), "w", encoding="utf8"), ensure_ascii=False)
            kept += 1
            time.sleep(2)
            break
    print(f"{pid:18} {kept} vidéos", flush=True)
