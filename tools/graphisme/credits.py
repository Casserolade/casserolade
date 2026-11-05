"""Écrit assets/game/credits.json : l'auteur et la licence de chaque photo utilisée, des logos des chaînes, plus les polices.

Usage : python3 tools/graphisme/credits.py
`partage_identique` signale les licences qui, en principe, s'étendent aux images dérivées : à trancher par l'utilisateur.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHARE_ALIKE_MARKS = ("SA", "GFDL", "FAL")
FONTS = [{"nom": "Bangers", "licence": "SIL OFL 1.1"}, {"nom": "Luckiest Guy (les chiffres)", "licence": "Apache 2.0"}, {"nom": "Alegreya Sans et Alegreya Sans SC", "licence": "SIL OFL 1.1"},
         {"nom": "Dela Gothic One", "licence": "SIL OFL 1.1"}]


def main():
    with open(os.path.join(ROOT, "assets/game/manifest.json"), encoding="utf8") as handle:
        manifest = json.load(handle)
    with open(os.path.join(ROOT, "data/collecte/portraits.json"), encoding="utf8") as handle:
        portraits = json.load(handle)
    photos = []
    for character_id, character in sorted(manifest["personnages"].items()):
        credit = character["credits"]
        licence = credit.get("licence") or "inconnue"
        photos.append({"id": character_id, "nom": portraits[character_id].get("name", character_id), "auteur": credit.get("auteur"),
                       "licence": licence, "source": credit.get("source"),
                       "partage_identique": any(mark in licence for mark in SHARE_ALIKE_MARKS)})
    # The channel logos on the TV sets (tools/graphisme/studios_3d.py), from Commons.
    with open(os.path.join(ROOT, "tools/graphisme/logos/sources.json"), encoding="utf8") as handle:
        logos = [{"id": logo_id, **source} for logo_id, source in sorted(json.load(handle).items())]
    # The other faces of a character: it laughs when it celebrates, it winces when hit (tools/graphisme/visages.py).
    for character_id, character in sorted(manifest["personnages"].items()):
        for face, art in sorted(character.get("visages", {}).items()):
            credit = art["credits"]
            licence = credit.get("licence") or "inconnue"
            photos.append({"id": f"{character_id}.{face}", "nom": portraits[character_id].get("name", character_id), "auteur": credit.get("auteur"),
                           "licence": licence, "source": credit.get("source"),
                           "partage_identique": any(mark in licence for mark in SHARE_ALIKE_MARKS)})
    # The real photos cut out for casserole cards (tools/graphisme/illustration_casserole.py).
    with open(os.path.join(ROOT, "data/collecte/illustrations_casseroles.json"), encoding="utf8") as handle:
        illustrations = [{"id": illustration_id, "source": spec["source"], "auteur": spec.get("auteur"), "licence": spec.get("licence")}
                         for illustration_id, spec in sorted(json.load(handle).items()) if illustration_id in manifest.get("casseroles", {})]
    path = os.path.join(ROOT, "assets/game/credits.json")
    # The other sections (the voices' `sons`, written by tools/collecte/voix_jeu.py) are kept as they are.
    previous = {}
    if os.path.exists(path):
        with open(path, encoding="utf8") as handle:
            previous = json.load(handle)
    with open(path, "w", encoding="utf8") as handle:
        json.dump({**previous, "photos": photos, "illustrations": illustrations, "logos": logos, "polices": FONTS}, handle, ensure_ascii=False, indent=1)
    shared = sum(photo["partage_identique"] for photo in photos)
    missing = [photo["id"] for photo in photos if not photo["auteur"] or not photo["source"]]
    print(f"{len(photos)} photos, {len(logos)} logos, {shared} photos à partage à l'identique, sans auteur ou source : {missing}")


if __name__ == "__main__":
    main()
