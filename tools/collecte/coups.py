"""Scènes où les politiques s'en prennent une : vidéo courte, images extraites, planche de contrôle.

Usage : python3 -I coups.py coups.json sortie.json dossier dossier_travail
"""
import glob, json, os, subprocess, sys, time
from PIL import Image

YT = ["uvx", "--from", "yt-dlp[default]==2026.10.26", "yt-dlp"]
EXCLU = ("imitat", "parodi", "guignol", "sketch", "remix", "chanson")

def sheet(frames, dest, cols=8, w=200):
    frames = frames[:64]
    if not frames:
        return
    ims = [Image.open(f).convert("RGB") for f in frames]
    h = int(w * ims[0].height / ims[0].width)
    rows = (len(ims) + cols - 1) // cols
    out = Image.new("RGB", (cols * w, rows * h), "white")
    for i, im in enumerate(ims):
        out.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
    out.save(dest, quality=80)

scenes = json.load(open(sys.argv[1], encoding="utf8"))
results = json.load(open(sys.argv[2], encoding="utf8")) if os.path.exists(sys.argv[2]) else []
done = {r["id"] for r in results}
os.makedirs(sys.argv[4], exist_ok=True)
for s in scenes:
    if s["id"] in done:
        continue
    rec = dict(s, videos=[], images=0)
    r = subprocess.run([*YT, f"ytsearch8:{s['recherche']}", "--flat-playlist", "--print", "%(id)s\t%(duration)s\t%(channel)s\t%(title)s"], capture_output=True, text=True, timeout=200)
    for line in r.stdout.splitlines():
        if len(rec["videos"]) >= 2:
            break
        p = line.split("\t")
        if len(p) != 4 or not p[1].replace(".", "").isdigit() or float(p[1]) > 300 or any(x in p[3].lower() for x in EXCLU):
            continue
        tmp = os.path.join(sys.argv[4], p[0] + ".%(ext)s")
        subprocess.run([*YT, "https://www.youtube.com/watch?v=" + p[0], "-f", "bv*[height<=480]/b", "-o", tmp], capture_output=True, text=True, timeout=400)
        got = glob.glob(os.path.join(sys.argv[4], p[0] + ".*"))
        if not got:
            continue
        folder = os.path.join(sys.argv[3], s["id"], p[0])
        os.makedirs(folder, exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", got[0], "-vf", "fps=2", "-q:v", "3", os.path.join(folder, "%04d.jpg")], timeout=400)
        for f in got:
            os.remove(f)
        frames = sorted(glob.glob(os.path.join(folder, "*.jpg")))
        if not frames:
            continue
        sheet(frames[:: max(1, len(frames) // 64)], os.path.join(sys.argv[3], s["id"], p[0] + ".planche.jpg"))
        rec["videos"].append({"video": p[0], "titre": p[3], "chaine": p[2], "url": "https://www.youtube.com/watch?v=" + p[0], "images": len(frames)})
        rec["images"] += len(frames)
        time.sleep(2)
    results.append(rec)
    print(f'{s["id"]:18} {rec["images"]:4} images  ' + " ; ".join((v["chaine"] or "?") + " | " + v["titre"][:44] for v in rec["videos"]), flush=True)
    json.dump(results, open(sys.argv[2], "w", encoding="utf8"), ensure_ascii=False, indent=1)
    time.sleep(2)
