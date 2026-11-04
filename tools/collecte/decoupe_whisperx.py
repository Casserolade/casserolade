"""Refait les extraits audio avec WhisperX : transcription et alignement mot à mot sur l'audio de la vidéo.

Reprend les extraits jugés bons ou ratés à l'écoute, écarte ceux où parle quelqu'un d'autre, et cherche de nouvelles vidéos pour les citations sans bon extrait.
La voix n'est pas vérifiée : tout reste à écouter. Lancer avec :
uv run --no-project --python 3.11 --with whisperx python tools/collecte/decoupe_whisperx.py audio.json recherches.json sortie.json dossier_sfx dossier_travail
"""
import glob, json, os, re, subprocess, sys, time, unicodedata
import torch, whisperx

YT = ["uvx", "--from", "yt-dlp[default]==2026.10.26", "yt-dlp"]
EXCLU = re.compile(r"imitat|parodi|guignol|canteloup|gerra|sketch|remix|humour|humoriste|bigard|tanguy pastureau|parody|deepfake|\bia\b", re.I)
MAX_DUREE = 1500
MAX_EXTRAIT = 6.0

def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-z0-9]+", s.replace("’", " ").replace("'", " "))

def get_audio(video, work):
    for f in glob.glob(os.path.join(work, video + ".*")):
        return f
    subprocess.run([*YT, "https://www.youtube.com/watch?v=" + video, "-f", "bestaudio/best", "-o", os.path.join(work, video + ".%(ext)s")], capture_output=True, text=True, timeout=600)
    found = glob.glob(os.path.join(work, video + ".*"))
    return found[0] if found else None

def search(query):
    r = subprocess.run([*YT, f"ytsearch10:{query}", "--flat-playlist", "--print", "%(id)s\t%(duration)s\t%(channel)s\t%(title)s"], capture_output=True, text=True, timeout=200)
    out = []
    for line in r.stdout.splitlines():
        p = line.split("\t")
        if len(p) == 4 and p[1].replace(".", "").isdigit():
            out.append({"video": p[0], "duree": float(p[1]), "chaine": p[2], "titre": p[3], "url": "https://www.youtube.com/watch?v=" + p[0]})
    return out

def transcribe(path, model, aligners, device):
    audio = whisperx.load_audio(path)
    result = model.transcribe(audio, batch_size=8, language="fr")
    a, meta = aligners
    aligned = whisperx.align(result["segments"], a, meta, audio, device, return_char_alignments=False)
    return aligned

def locate(aligned, phrase):
    target = norm(phrase)
    wanted = set(target)
    best = None
    for seg in aligned["segments"]:
        words = [w for w in seg.get("words", []) if "start" in w and "end" in w]
        toks = [(norm(w["word"]), w) for w in words]
        flat = [(t, w) for ts, w in toks for t in ts]
        n = len(target)
        for i in range(0, max(1, len(flat) - n + 1)):
            win = flat[i:i + n + 2]
            if not win:
                continue
            score = len(wanted & {t for t, _ in win}) / len(wanted)
            ordered = [t for t, _ in win if t in wanted]
            if best is None or score > best["score"]:
                core = [w for t, w in win if t in wanted] or [win[0][1]]
                best = {"score": score, "debut": core[0]["start"], "fin": core[-1]["end"], "seg_debut": seg["start"], "seg_fin": seg["end"], "texte": seg["text"].strip(), "confiance": sum(w.get("score", 0) for w in core) / len(core)}
    return best

def cut(src, start, end, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    dur = end - start
    fade_out = max(0, dur - 0.05)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", src, "-vn",
                    "-af", f"afade=t=in:d=0.02,afade=t=out:st={fade_out:.3f}:d=0.05,loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1", "-q:a", "3", dest], timeout=120)
    return os.path.exists(dest) and os.path.getsize(dest) > 500

def main(audio_json, searches_json, out_json, sfx_dir, work):
    os.makedirs(work, exist_ok=True)
    data = json.load(open(audio_json, encoding="utf8"))
    extra = json.load(open(searches_json, encoding="utf8"))
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = whisperx.load_model("large-v3", device, compute_type="float16" if device == "cuda" else "int8", language="fr")
    aligners = whisperx.load_align_model(language_code="fr", device=device)
    results = json.load(open(out_json, encoding="utf8")) if os.path.exists(out_json) else {}
    jobs = []
    rejected = {}
    for r in data:
        rejected[r["id"]] = {e["video"] for e in r["extraits"] if e.get("ecoute") == "autre"}
        for e in r["extraits"]:
            if e.get("ecoute") in ("bon", "rate"):
                jobs.append((r["id"], r["qui"], r["phrase"], {"video": e["video"], "url": e["url"].split("&t=")[0], "chaine": e["chaine"], "titre": e["titre"], "duree": 0, "avant": e["ecoute"]}))
    for qid, spec in extra.items():
        seen = set(rejected.get(qid, set()))
        cands = []
        for q in spec["recherches"]:
            try:
                for c in search(q):
                    if c["video"] in seen or EXCLU.search(c["titre"] + " " + (c["chaine"] or "")) or c["duree"] > MAX_DUREE or c["duree"] < 3:
                        continue
                    seen.add(c["video"])
                    if spec["qui"] in (c["titre"] or "").lower() or "ina" in (c["chaine"] or "").lower():
                        cands.append(c)
            except Exception as ex:
                print("recherche", qid, ex, flush=True)
            time.sleep(1.5)
        cands.sort(key=lambda c: (not re.search(r"\bINA\b", c["chaine"] or ""), c["duree"]))
        for c in cands[:3]:
            jobs.append((qid, spec["qui"], spec["phrase"], dict(c, avant="nouveau")))
    print(len(jobs), "vidéos à traiter", flush=True)
    for qid, qui, phrase, c in jobs:
        key = qid + "/" + c["video"]
        if key in results:
            continue
        rec = {"id": qid, "qui": qui, "phrase": phrase, **c, "fichier": None}
        try:
            src = get_audio(c["video"], work)
            if not src:
                rec["statut"] = "téléchargement impossible"
            else:
                probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src], capture_output=True, text=True)
                if float(probe.stdout.strip() or 0) > MAX_DUREE:
                    rec["statut"] = "vidéo trop longue"
                else:
                    aligned = transcribe(src, model, aligners, device)
                    hit = locate(aligned, phrase)
                    if not hit or hit["score"] < 0.75:
                        rec["statut"] = "phrase non trouvée"
                        rec["meilleur_score"] = hit["score"] if hit else 0
                    else:
                        whole = hit["seg_fin"] - hit["seg_debut"] <= MAX_EXTRAIT
                        a, b = (hit["seg_debut"], hit["seg_fin"]) if whole else (hit["debut"], hit["fin"])
                        dest = os.path.join(sfx_dir, qid, c["video"] + ".mp3")
                        if cut(src, max(0, a - 0.12), b + 0.2, dest):
                            rec.update(fichier=dest, statut="ok", texte=hit["texte"], score=round(hit["score"], 2), confiance=round(hit["confiance"], 2), debut=round(a, 2), fin=round(b, 2), duree_extrait=round(b - a, 2), phrase_entiere=whole)
                        else:
                            rec["statut"] = "découpe impossible"
                for f in glob.glob(os.path.join(work, c["video"] + ".*")):
                    os.remove(f)
        except Exception as ex:
            rec["statut"] = f"erreur: {str(ex)[:120]}"
        results[key] = rec
        print(f'{key:44} {rec["statut"][:24]:24} {(rec.get("texte") or "")[:70]}', flush=True)
        json.dump(results, open(out_json, "w", encoding="utf8"), ensure_ascii=False, indent=1)
        torch.cuda.empty_cache()
    print("fini", sum(1 for r in results.values() if r.get("fichier")), "/", len(results), flush=True)

main(*sys.argv[1:6])
