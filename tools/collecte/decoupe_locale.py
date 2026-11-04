"""Affine avec WhisperX les extraits déjà téléchargés : garde ceux validés à l'écoute et les vidéos entières.

Ne télécharge rien. La voix n'est pas vérifiée : tout reste à écouter. Lancer avec :
uv run --no-project --python 3.11 --with whisperx python tools/collecte/decoupe_locale.py audio.json sortie.json dossier_sfx
"""
import json, os, re, subprocess, sys, unicodedata
import torch, whisperx

MAX_EXTRAIT = 6.0

def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-z0-9]+", s.replace("’", " ").replace("'", " "))

def locate(aligned, phrase):
    target = norm(phrase)
    wanted = set(target)
    best = None
    for seg in aligned["segments"]:
        flat = [(t, w) for w in seg.get("words", []) if "start" in w and "end" in w for t in norm(w["word"])]
        for i in range(0, max(1, len(flat) - len(target) + 1)):
            win = flat[i:i + len(target) + 2]
            if not win:
                continue
            score = len(wanted & {t for t, _ in win}) / len(wanted)
            if best is None or score > best["score"]:
                core = [w for t, w in win if t in wanted] or [win[0][1]]
                best = {"score": score, "debut": core[0]["start"], "fin": core[-1]["end"], "seg_debut": seg["start"], "seg_fin": seg["end"], "texte": seg["text"].strip()}
    return best

def duration(path):
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(p.stdout.strip() or 0)

def cut(src, start, end, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    dur = end - start
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", src, "-vn",
                    "-af", f"afade=t=in:d=0.02,afade=t=out:st={max(0, dur - 0.05):.3f}:d=0.05,loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1", "-q:a", "3", dest], timeout=120)
    return os.path.exists(dest) and os.path.getsize(dest) > 500

data = json.load(open(sys.argv[1], encoding="utf8"))
device = "cuda" if torch.cuda.is_available() else "cpu"
model = whisperx.load_model("large-v3", device, compute_type="float16" if device == "cuda" else "int8", language="fr", vad_options={"vad_onset": 0.2, "vad_offset": 0.15})
aligner, meta = whisperx.load_align_model(language_code="fr", device=device)
out = []
for r in data:
    for e in r["extraits"]:
        if not (e.get("ecoute") == "bon" or (e.get("entier") and e.get("ecoute") != "autre")):
            continue
        rec = {"id": r["id"], "qui": r["qui"], "phrase": r["phrase"], "video": e["video"], "url": e["url"], "chaine": e["chaine"], "titre": e["titre"], "ecoute_avant": e.get("ecoute"), "chaine_connue": e.get("chaine_connue"), "fichier": None}
        src = e["fichier"]
        total = duration(src)
        hit = None
        try:
            audio = whisperx.load_audio(src)
            res = model.transcribe(audio, batch_size=8, language="fr")
            if res["segments"]:
                al = whisperx.align(res["segments"], aligner, meta, audio, device, return_char_alignments=False)
                hit = locate(al, r["phrase"])
                rec["transcription"] = " ".join(s["text"].strip() for s in al["segments"])[:300]
        except Exception as ex:
            rec["erreur"] = str(ex)[:120]
        dest = os.path.join(sys.argv[3], r["id"], e["video"] + ".mp3")
        if hit and hit["score"] >= 0.75:
            whole = hit["seg_fin"] - hit["seg_debut"] <= MAX_EXTRAIT
            a, b = (hit["seg_debut"], hit["seg_fin"]) if whole else (hit["debut"], hit["fin"])
            ok = cut(src, max(0, a - 0.12), min(total, b + 0.2), dest)
            rec.update(ajuste=True, duree=round(b - a, 2), texte=hit["texte"])
        elif e.get("ecoute") == "bon":
            ok = cut(src, 0, total, dest)  # Validé à l'oreille, mais WhisperX n'y retrouve pas la phrase : on garde tel quel.
            rec.update(ajuste=False, duree=round(total, 2), texte=rec.get("transcription", ""))
        else:
            ok = False
            rec["statut"] = "phrase non trouvée dans la vidéo entière"
        if ok:
            rec["fichier"] = dest
        out.append(rec)
        print(f'{r["id"]:24} {e["video"]:12} {"ajusté" if rec.get("ajuste") else "tel quel" if rec["fichier"] else "rien":9} {rec.get("duree", 0):5} | {(rec.get("texte") or "")[:70]}', flush=True)
        torch.cuda.empty_cache()
json.dump(out, open(sys.argv[2], "w", encoding="utf8"), ensure_ascii=False, indent=1)
print("fini :", sum(1 for x in out if x.get("ajuste") and x["fichier"]), "ajustés,", sum(1 for x in out if not x.get("ajuste") and x["fichier"]), "tels quels, sur", len(out))
