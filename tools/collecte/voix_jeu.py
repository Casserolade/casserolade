"""Fait entrer dans le jeu les extraits de vraie voix jugés « bons » à l'écoute.

Pour chaque citation de data/collecte/ecoute.json au verdict « bon » (le premier extrait gardé) :
le volume est normalisé, le fichier va dans assets/game/sons/citations/, le manifeste et les
crédits sont mis à jour, et src/data/voix.ts est régénéré. Une voix ne se joue que là où elle dit
exactement ce qu'on lit : sur sa casserole quand celle-ci raconte la même chose, ou dans une bulle
qui contient sa phrase. Jamais de voix synthétisée : sans extrait, la citation reste en texte.
Les saillies validées dans data/collecte/ecoute_saillies.json s'y ajoutent (voix_saillies.py), et
remplacent l'ancienne découpe de la même phrase.
Usage : python3 -I tools/collecte/voix_jeu.py   (depuis la racine du dépôt)
"""
import json, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voix_saillies import jetons, voix_des_saillies  # noqa: E402

RACINE = os.getcwd()
ECOUTE = "data/collecte/ecoute.json"
CITATIONS = "data/collecte/citations.json"
AUDIO = "data/collecte/audio.json"
SOURCE = "assets/audio/sfx"
DEST = "assets/game/sons/citations"
MANIFESTE = "assets/game/manifest.json"
CREDITS = "assets/game/credits.json"
SORTIE = "src/data/voix.ts"

# Qui parle, par citation : l'identifiant de sa carte ou de son héros.
PERSONNE = {
    "republique_cest_moi": "melenchon", "personne_sacree": "melenchon", "accent_toulouse": "melenchon",
    "hologrammes": "melenchon", "racaille": "sarkozy", "amie_tchadienne": "morano", "pisse_dessus": "glucksmann",
    "probite_intacte": "schiappa", "siege_ciotti": "ciotti", "traverse_la_rue": "macron",
    "pognon_de_dingue": "macron", "gaulois_refractaires": "macron", "cest_notre_projet": "macron",
    "arbre_mort": "hurmic", "bravitude": "royal", "blancos": "valls", "moi_president": "hollande",
    "courbe_chomage": "hollande", "paquets_heures": "oudea", "attaque_hopital": "castaner",
    "faux_billets": "darmanin", "conditions_lecornu": "lecornu", "quand_il_y_en_a_un": "hortefeux",
    "farine_francaise": "fillon", "debat_2017_dossiers": "lepen", "immunite_ouvriere": "poutou",
    "se_canto": "lassalle", "minable": "cohn_bendit",
}
# La casserole dont l'extrait dit bien ce qu'elle raconte. Pas de lien quand la casserole cite autre
# chose (« courbe » cite le discours du Bourget, l'extrait dit « inverser la courbe »).
CASSEROLE = {
    "republique_cest_moi": "la_republique_cest_moi", "accent_toulouse": "accent", "hologrammes": "hologramme",
    "amie_tchadienne": "amie_tchadienne", "pisse_dessus": "on_leur_pisse_dessus", "siege_ciotti": "siege_ciotti",
    "traverse_la_rue": "traverser_la_rue", "pognon_de_dingue": "pognon", "arbre_mort": "arbre_mort",
    "bravitude": "bravitude", "blancos": "blancos", "paquets_heures": "paquets_heures",
    "attaque_hopital": "salpetriere", "faux_billets": "faux_billets", "quand_il_y_en_a_un": "quand_il_y_en_a_un",
    "farine_francaise": "farine_francaise", "debat_2017_dossiers": "confusion_dossiers",
    "immunite_ouvriere": "immunite_ouvriere", "se_canto": "se_canto", "minable": "minable",
}

def charger(chemin):
    with open(chemin, encoding="utf-8") as f:
        return json.load(f)

def charger_si(chemin):
    return charger(chemin) if os.path.exists(chemin) else {}

def remplacee(ancienne, nouvelles):
    """Une ancienne découpe cède la place à une saillie validée qui dit la même chose, ou porte la même casserole."""
    mots = " ".join(jetons(ancienne["phrase"]))
    return any(n["personne"] == ancienne["personne"] and (f" {mots} " in f" {' '.join(jetons(n['phrase']))} " or
               (ancienne.get("casserole") and n.get("casserole") == ancienne["casserole"])) for n in nouvelles)

def main():
    ecoute = charger(ECOUTE)
    citations = {c["id"]: c for c in charger(CITATIONS)}
    candidats = {}
    for entree in charger(AUDIO):
        for c in entree.get("candidats", []):
            candidats[(entree["id"], c["video"])] = c
    gardes = {}
    for cle, verdict in ecoute.items():
        cid, video = cle.split("/")
        if verdict == "bon" and cid not in gardes and cid in PERSONNE and os.path.exists(f"{SOURCE}/{cid}/{video}.mp3"):
            gardes[cid] = video
    os.makedirs(DEST, exist_ok=True)
    manifeste = charger(MANIFESTE)
    credits = charger(CREDITS)
    deja = {s["id"] for s in credits.get("sons", [])}
    voix = []
    for cid, video in sorted(gardes.items()):
        dest = f"{DEST}/{cid}.mp3"
        if not os.path.exists(dest):
            # Toutes les voix au même niveau, sous le cri d'accueil ; un limiteur contre les crêtes.
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{SOURCE}/{cid}/{video}.mp3",
                            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-b:a", "96k", dest], check=True)
        manifeste.setdefault("sons", {}).setdefault("citations", {})[cid] = f"sons/citations/{cid}.mp3"
        c = candidats.get((cid, video), {})
        if cid not in deja:
            credits.setdefault("sons", []).append({
                "id": cid,
                "nom": f"{citations[cid]['qui']}, « {citations[cid]['phrase']} »",
                "auteur": f"{c.get('chaine', '')}, « {c.get('titre', '')} »",
                "source": c.get("url", f"https://www.youtube.com/watch?v={video}"),
                "note": f"Extrait de {c.get('debut')} à {c.get('fin')} s, volume normalisé. Jugé « bon » à l'écoute (data/collecte/ecoute.json).",
            })
        voix.append({"id": cid, "personne": PERSONNE[cid], "phrase": citations[cid]["phrase"], **({"casserole": CASSEROLE[cid]} if cid in CASSEROLE else {})})
    nouvelles = voix_des_saillies(manifeste, credits)
    # Une voix retirée à l'écoute ne joue plus, même sans remplaçante : mieux vaut une bulle muette qu'un son faux.
    retirees = {cle[4:] for cle, v in charger_si("data/collecte/ecoute_saillies.json").items() if cle.startswith("jeu/") and v.get("verdict") == "retirer"}
    voix = [v for v in voix if v["id"] not in retirees and not remplacee(v, nouvelles)] + [v for v in nouvelles if v["id"] not in retirees]
    # Un son qui ne joue plus ne pèse plus dans le jeu : fichier, manifeste et crédits.
    jouees = {v["id"] for v in voix}
    for fichier in os.listdir(DEST):
        nom = fichier.removesuffix(".mp3")
        if fichier.endswith(".mp3") and nom not in jouees:
            os.remove(f"{DEST}/{fichier}")
            manifeste.get("sons", {}).get("citations", {}).pop(nom, None)
            credits["sons"] = [son for son in credits.get("sons", []) if son["id"] != nom]
    with open(MANIFESTE, "w", encoding="utf-8") as f:
        json.dump(manifeste, f, ensure_ascii=False, indent=1)
    with open(CREDITS, "w", encoding="utf-8") as f:
        json.dump(credits, f, ensure_ascii=False, indent=1)
    lignes = [
        "/**",
        " * Les vraies voix du jeu : un extrait par citation, jugé « bon » à l'écoute. Généré par",
        " * tools/collecte/voix_jeu.py, ne pas modifier à la main. `fichier` est la clé de",
        " * manifest.sons.citations. Jamais de voix synthétisée : sans extrait, la citation reste en texte.",
        " */",
        "export interface Voix {",
        "  fichier: string;",
        "  /** La carte ou le héros qui parle. */",
        "  personne: string;",
        "  /** Les mots de l'extrait, tels que les sous-titres les situent. */",
        "  phrase: string;",
        "  /** La casserole qui raconte exactement ce que dit l'extrait. */",
        "  casserole?: string;",
        "}",
        "",
        "export const VOIX: Voix[] = [",
    ]
    for v in voix:
        cas = f", casserole: '{v['casserole']}'" if "casserole" in v else ""
        phrase = v["phrase"].replace("\\", "\\\\").replace("'", "\\'")
        lignes.append(f"  {{ fichier: '{v['id']}', personne: '{v['personne']}', phrase: '{phrase}'{cas} }},")
    lignes.append("];")
    with open(SORTIE, "w", encoding="utf-8") as f:
        f.write("\n".join(lignes) + "\n")
    print(len(voix), "voix dans le jeu")

if __name__ == "__main__":
    main()
