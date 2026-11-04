"""Choisit pour chaque personne le meilleur portrait à découper : un seul visage, grand, de face, bouche fermée.

Lancer avec uv et mediapipe. Usage : python tools/collecte/portraits_base.py photos.json galerie.json fournies_dir sortie.json dossier_base dossier_planches
"""
import glob, json, os, shutil, sys
import numpy as np
from PIL import Image, ImageDraw, ImageOps
import mediapipe as mp

def dist(a, b):
    return float(np.linalg.norm(np.array(a) - np.array(b)))

def analyse(path, mesh, detect):
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    full = max(im.size)
    im.thumbnail((1000, 1000))
    arr = np.array(im)
    h, w, _ = arr.shape
    faces = len(detect.process(arr).detections or [])
    res = mesh.process(arr)
    if not res.multi_face_landmarks or faces != 1:
        return None
    lm = res.multi_face_landmarks[0].landmark
    P = lambda i: (lm[i].x * w, lm[i].y * h)
    fh, fw = dist(P(10), P(152)), dist(P(234), P(454))
    if fh <= 0 or fw <= 0:
        return None
    px = fh * full / max(w, h)
    return {"ratio": fh / h, "pixels": px, "profil": abs(dist(P(1), P(234)) - dist(P(1), P(454))) / fw, "bouche": dist(P(13), P(14)) / fh,
            "penche": abs(P(33)[1] - P(263)[1]) / fw, "yeux": (dist(P(159), P(145)) / max(dist(P(33), P(133)), 1) + dist(P(386), P(374)) / max(dist(P(362), P(263)), 1)) / 2}

def score(a):
    return min(a["pixels"], 220) / 220 * 2 + min(a["ratio"], .35) - a["profil"] * 2.5 - a["bouche"] * 3 - a["penche"] - (0.6 if a["yeux"] < .16 else 0)

photos, galerie, fournies, out, base, planches = sys.argv[1:7]
main = {p["id"]: p for p in json.load(open(photos, encoding="utf8"))}
gal = json.load(open(galerie, encoding="utf8"))
os.makedirs(base, exist_ok=True)
os.makedirs(planches, exist_ok=True)
results = {}
with mp.solutions.face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, min_detection_confidence=0.5) as mesh, \
     mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as detect:
    for pid, p in main.items():
        cands = []
        if p.get("file"):
            cands.append({"fichier": p["file"], "commons": p.get("commons"), "licence": p.get("licence"), "auteur": p.get("auteur")})
        cands += gal.get(pid, [])
        cands += [{"fichier": f, "commons": None, "licence": "fournie", "auteur": None} for f in glob.glob(os.path.join(fournies, pid, "*.jpg"))]
        best, best_s = None, -9
        for c in cands:
            try:
                a = analyse(c["fichier"], mesh, detect)
            except Exception:
                a = None
            if a and score(a) > best_s:
                best, best_s = dict(c, **{k: round(v, 3) for k, v in a.items()}), score(a)
        if best:
            dest = os.path.join(base, pid + ".jpg")
            shutil.copy(best["fichier"], dest)
            best.update(portrait=dest, score=round(best_s, 2), name=p["name"])
        results[pid] = best or {"name": p["name"], "portrait": None}
        print(f'{pid:18} {len(cands):2} photos  {"-" if not best else str(int(best["pixels"])) + " px, score " + str(best["score"])}', flush=True)
json.dump(results, open(out, "w", encoding="utf8"), ensure_ascii=False, indent=1)
ids = list(results)
COLS, CELL, LAB = 10, 130, 18
for n in range(0, len(ids), 60):
    chunk = ids[n:n + 60]
    rows = (len(chunk) + COLS - 1) // COLS
    sh = Image.new("RGB", (COLS * CELL, rows * (CELL + LAB)), "white")
    d = ImageDraw.Draw(sh)
    for i, pid in enumerate(chunk):
        x, y = (i % COLS) * CELL, (i // COLS) * (CELL + LAB)
        r = results[pid]
        d.text((x + 3, y + 3), pid + ("" if r.get("portrait") else " MANQUE"), fill="black" if r.get("portrait") else "red")
        if r.get("portrait"):
            im = ImageOps.exif_transpose(Image.open(r["portrait"])).convert("RGB")
            im.thumbnail((CELL - 4, CELL - 4))
            sh.paste(im, (x + 2, y + LAB))
    sh.save(os.path.join(planches, f"base_{n // 60 + 1}.jpg"), quality=85)
