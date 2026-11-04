"""Analyse les visages sans identifier personne : taille, nombre, bouche, yeux. Trie par expression.

Lancer avec : uv run --no-project --python 3.11 --with mediapipe==0.10.14 --with pillow --with numpy python tools/collecte/tri_visages.py <dossier_sources> <sortie.json> <dossier_tri>
Chaque sous-dossier de <dossier_sources> correspond à une personne.
"""
import glob, json, os, shutil, sys
import numpy as np
from PIL import Image, ImageOps
import mediapipe as mp

MIN_RATIO = 0.08  # hauteur du visage / hauteur de l'image

def dist(a, b):
    return float(np.linalg.norm(np.array(a) - np.array(b)))

def analyse(path, mesh, detect):
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    im.thumbnail((1000, 1000))
    arr = np.array(im)
    h, w, _ = arr.shape
    found = detect.process(arr).detections or []
    faces = len(found)
    res = mesh.process(arr)
    if not res.multi_face_landmarks:
        return {"visages": faces, "exploitable": False}
    lm = res.multi_face_landmarks[0].landmark
    P = lambda i: (lm[i].x * w, lm[i].y * h)
    face_h = dist(P(10), P(152))
    face_w = dist(P(234), P(454))
    if face_h <= 0 or face_w <= 0:
        return {"visages": faces, "exploitable": False}
    mouth_open = dist(P(13), P(14)) / face_h
    mouth_w = dist(P(61), P(291)) / face_w
    corners_up = ((P(13)[1] + P(14)[1]) / 2 - (P(61)[1] + P(291)[1]) / 2) / face_h
    eye_l = dist(P(159), P(145)) / max(dist(P(33), P(133)), 1)
    eye_r = dist(P(386), P(374)) / max(dist(P(362), P(263)), 1)
    eyes = (eye_l + eye_r) / 2
    brow = (dist(P(105), P(159)) + dist(P(334), P(386))) / 2 / face_h
    yaw = abs(dist(P(1), P(234)) - dist(P(1), P(454))) / face_w
    return {
        "visages": max(faces, 1), "exploitable": True, "ratio": round(face_h / h, 3), "bouche": round(mouth_open, 3), "largeur": round(mouth_w, 3),
        "coins": round(corners_up, 3), "yeux": round(eyes, 3), "sourcils": round(brow, 3), "profil": round(yaw, 3), "taille": im.size,
    }

def tags(a):
    t = []
    if a["bouche"] > 0.09 and a["coins"] > 0.01 and a["largeur"] > 0.42:
        t.append("rire")
    elif a["coins"] > 0.012 and a["largeur"] > 0.40:
        t.append("sourire")
    if a["bouche"] > 0.11 and a["coins"] <= 0.01:
        t.append("cri")
    elif a["bouche"] > 0.05 and "rire" not in t:
        t.append("parle")
    if a["yeux"] < 0.14:
        t.append("yeux_fermes")
    if a["sourcils"] > 0.095 and a["yeux"] > 0.34:
        t.append("surpris")
    if a["sourcils"] < 0.062 and a["coins"] <= 0.008 and a["bouche"] < 0.05:
        t.append("colere")
    if a["bouche"] < 0.025 and a["coins"] <= 0.012 and 0.14 <= a["yeux"]:
        t.append("neutre")
    return t

def score(a):
    # Un grand visage, seul, de face.
    return a["ratio"] * 2 - a["profil"] - (a["visages"] - 1) * 0.5

def main(src, out, tri):
    results = {}
    with mp.solutions.face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, min_detection_confidence=0.5) as mesh, \
         mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as detect:
        for person in sorted(os.listdir(src)):
            folder = os.path.join(src, person)
            if not os.path.isdir(folder):
                continue
            files = sorted(glob.glob(os.path.join(folder, "**", "*.jpg"), recursive=True))
            rows = []
            for f in files:
                try:
                    a = analyse(f, mesh, detect)
                except Exception as e:
                    a = {"exploitable": False, "erreur": str(e)[:60]}
                a["fichier"] = f
                if a.get("exploitable") and a["ratio"] >= MIN_RATIO and a["visages"] == 1:
                    a["tags"] = tags(a)
                    a["garde"] = True
                else:
                    a["garde"] = False
                rows.append(a)
            results[person] = rows
            best = {}
            for a in rows:
                if not a["garde"]:
                    continue
                for t in a["tags"]:
                    if t not in best or score(a) > score(best[t]):
                        best[t] = a
            dest = os.path.join(tri, person)
            os.makedirs(dest, exist_ok=True)
            for t, a in best.items():
                shutil.copy(a["fichier"], os.path.join(dest, t + ".jpg"))
            print(f"{person:18} {len(files):4} images, {sum(1 for r in rows if r['garde']):3} gardées : {', '.join(sorted(best))}", flush=True)
    json.dump(results, open(out, "w", encoding="utf8"), ensure_ascii=False, indent=0, default=str)

main(*sys.argv[1:4])
