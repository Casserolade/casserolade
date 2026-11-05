"""Assemble assets/game/manifest.json (contrat 1) à partir de ce qui existe réellement dans assets/game/.

Usage : python3 tools/graphisme/manifest.py
Un élément absent n'apparaît pas : le client doit tolérer les manques.
"""
import glob
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GAME = os.path.join(ROOT, "assets/game")

CAMPS = {
    "insoumis": {"nom": "Insoumis", "couleur": "#c8102e"},
    "socialistes": {"nom": "Socialistes", "couleur": "#e0457b"},
    "ecologistes": {"nom": "Écologistes", "couleur": "#5da832"},
    "macronie": {"nom": "Macronie", "couleur": "#e8b417"},
    "republicains": {"nom": "Républicains", "couleur": "#2c74c9"},
    "rn": {"nom": "RN", "couleur": "#17295e"},
    "reconquete": {"nom": "Reconquête", "couleur": "#6b4bb8"},
    "societe_civile": {"nom": "Société civile", "couleur": "#8c8574"},
}


def files_by_stem(directory, pattern):
    paths = sorted(glob.glob(os.path.join(GAME, directory, pattern)))
    return {os.path.splitext(os.path.basename(path))[0]: os.path.relpath(path, GAME) for path in paths}


def read_json(path):
    with open(path, encoding="utf8") as handle:
        return json.load(handle)


def characters():
    portraits = read_json(os.path.join(ROOT, "data/collecte/portraits.json"))
    result = {}
    for path in sorted(glob.glob(os.path.join(GAME, "personnages/*.json"))):
        character_id = os.path.splitext(os.path.basename(path))[0]
        if "." in character_id:
            continue  # another face of a character (tools/graphisme/visages.py), filed under its owner below
        description = read_json(path)
        portrait = portraits.get(character_id, {})
        description["credits"] = {"auteur": portrait.get("auteur"), "licence": portrait.get("licence"),
                                  "source": portrait.get("commons")}
        result[character_id] = description
    faces = read_json(os.path.join(ROOT, "data/collecte/visages.json"))
    for path in sorted(glob.glob(os.path.join(GAME, "personnages/*.*.json"))):
        character_id, face = os.path.splitext(os.path.basename(path))[0].split(".", 1)
        spec = faces.get(character_id, {}).get(face)
        if character_id in result and spec:
            description = read_json(path)
            description["credits"] = {"auteur": spec.get("auteur"), "licence": spec.get("licence"), "source": spec.get("source")}
            result[character_id].setdefault("visages", {})[face] = description
    return result


def effects():
    result = {os.path.splitext(os.path.basename(path))[0]: read_json(path)
              for path in sorted(glob.glob(os.path.join(GAME, "effets/*.json")))}
    result["etoile"] = {"image": "effets/etoile.webp"}
    result["pansement"] = {"image": "effets/pansement.webp"}
    return result


def card_parts():
    parts = files_by_stem("carte", "*.webp")
    frames = {stem.removeprefix("cadre_"): path for stem, path in parts.items() if stem.startswith("cadre_")}
    others = {stem: path for stem, path in parts.items() if not stem.startswith("cadre_")}
    return {"cadres": frames, **others, "fontes": files_by_stem("fontes", "*.woff2")}


def main():
    manifest = {
        "version": 1,
        "camps": CAMPS,
        "personnages": characters(),
        "corps": files_by_stem("corps", "*.webp"),
        "yeux": files_by_stem("yeux", "*.webp"),
        "bouches": files_by_stem("bouches", "*.webp"),
        "effets": effects(),
        "plateaux": {stem: {"decor": path} for stem, path in files_by_stem("plateaux", "*.webp").items()},
        "sons": {"citations": files_by_stem("sons/citations", "*.mp3"),
                 "bruitages": files_by_stem("sons/bruitages", "*.mp3"),
                 # The welcome shout, kept apart: the clean-up of the quotes' voices never touches it.
                 "accueil": files_by_stem("sons/accueil", "*.mp3")},
        "casseroles": files_by_stem("casseroles", "*.webp"),
        "carte": card_parts(),
    }
    with open(os.path.join(GAME, "manifest.json"), "w", encoding="utf8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=1)
    total = sum(os.path.getsize(path) for path in glob.glob(os.path.join(GAME, "**/*"), recursive=True)
                if os.path.isfile(path))
    print(f"manifest.json : {len(manifest['personnages'])} personnages, assets/game : {total / 1024 / 1024:.2f} Mo")


if __name__ == "__main__":
    main()
