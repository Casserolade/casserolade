"""Les saillies jugées « bonnes » à l'écoute entrent dans le jeu. Appelé par voix_jeu.py.

Pour chaque saillie dont un extrait a le verdict « bon » (data/collecte/ecoute_saillies.json) :
l'extrait, déjà normalisé par saillies_audio.py, va dans assets/game/sons/citations/, avec son entrée
au manifeste et aux crédits. La voix se rattache à la casserole de son auteur qui cite les mêmes mots.
Jamais de voix synthétisée : une saillie sans extrait validé reste en texte.
"""
import glob, json, os, shutil, subprocess

SAILLIES = "data/collecte/saillies"
RESULTATS = "data/collecte/saillies_audio.json"
VERDICTS = "data/collecte/ecoute_saillies.json"
DEST = "assets/game/sons/citations"
RESSEMBLANCE_CASSEROLE = 0.7


def charger(chemin, defaut):
    if not os.path.exists(chemin):
        return defaut
    with open(chemin, encoding="utf-8") as f:
        return json.load(f)


def jetons(texte):
    import re, unicodedata
    texte = unicodedata.normalize("NFD", texte.lower().replace("’", "'"))
    return re.findall(r"[a-z0-9]+", "".join(c for c in texte if unicodedata.category(c) != "Mn"))


def citations_des_casseroles():
    """(propriétaire, identifiant, citation) de chaque casserole qui cite quelqu'un."""
    script = ("const {CASSEROLES}=await import('./src/data/casseroles.ts');"
              "console.log(JSON.stringify(CASSEROLES.filter(c=>c.citation).map(c=>[c.owner,c.id,c.citation])))")
    sortie = subprocess.run(["node", "--input-type=module", "-e", script], capture_output=True, text=True, check=True).stdout
    return json.loads(sortie)


def casserole_de(personne, texte, casseroles):
    """La casserole de cette personne dont la citation dit les mêmes mots que la saillie, ou None."""
    mots = set(jetons(texte))
    for proprietaire, identifiant, citation in casseroles:
        cites = set(jetons(citation))
        if proprietaire == personne and cites and len(mots & cites) / len(cites | mots) >= RESSEMBLANCE_CASSEROLE:
            return identifiant
    return None


def saillies_par_cle():
    toutes = {}
    for fichier in glob.glob(os.path.join(SAILLIES, "*.json")):
        for personne in charger(fichier, []):
            for saillie in personne.get("saillies", []):
                toutes[f"{personne['id']}/{saillie['cle']}"] = (personne, saillie)
    return toutes


def texte_affiche(saillie):
    """Les vrais mots de la saillie, ceux que la bulle affiche ; None tant qu'un texte venu de la transcription
    n'a pas été confirmé (par une source, ou à l'écoute), ou quand la saillie est virée ou
    à trancher. Jamais les mots de l'ASR tels quels."""
    if saillie.get("vire") or saillie.get("a_trancher"):
        return None  # virée à la relecture, ou en attente de décision
    if saillie.get("texte_exact"):
        return saillie["texte_exact"]
    if saillie.get("texte_origine") == "transcription":
        return None
    return saillie["texte"]


def extrait_valide(cle, resultat, verdicts):
    return next((c for c in resultat.get("candidats", []) if verdicts.get(f"{cle}/{os.path.basename(c['fichier'])}", {}).get("verdict") == "bon"), None)


def voix_des_saillies(manifeste, credits):
    """Copie les extraits validés, complète manifeste et crédits, et rend les voix à écrire dans voix.ts."""
    verdicts, resultats, saillies = charger(VERDICTS, {}), charger(RESULTATS, {}), saillies_par_cle()
    casseroles = citations_des_casseroles()
    credits.setdefault("sons", [])
    voix = []
    for cle, resultat in sorted(resultats.items()):
        extrait = extrait_valide(cle, resultat, verdicts)
        if not extrait or cle not in saillies:
            continue
        personne, saillie = saillies[cle]
        phrase = texte_affiche(saillie)
        if phrase is None:
            continue  # des mots que seul Whisper a entendus : ils attendent leur vrai texte
        fichier = f"{personne['id']}_{saillie['cle']}"
        os.makedirs(DEST, exist_ok=True)
        shutil.copyfile(extrait["fichier"], f"{DEST}/{fichier}.mp3")
        manifeste.setdefault("sons", {}).setdefault("citations", {})[fichier] = f"sons/citations/{fichier}.mp3"
        credits["sons"] = [s for s in credits["sons"] if s["id"] != fichier] + [{
            "id": fichier,
            "nom": f"{personne['nom']}, « {phrase} »",  # the true words, as the bubble shows them
            "auteur": ", ".join(x for x in [extrait.get("chaine") or extrait.get("site"), f"« {extrait['titre']} »" if extrait.get("titre") else ""] if x),
            "source": extrait["url"],
            "date": saillie.get("date", ""),
            "note": f"Extrait de {extrait['debut']} à {extrait['fin']} s, calé sur la phrase avec WhisperX, volume normalisé. Jugé « bon » à l'écoute (data/collecte/ecoute_saillies.json).",
        }]
        casserole = saillie.get("casserole") or casserole_de(personne["id"], saillie["texte"], casseroles)
        voix.append({"id": fichier, "personne": personne["id"], "phrase": phrase, **({"casserole": casserole} if casserole else {})})
    retirer_les_invalidees({v["id"] for v in voix}, saillies, manifeste, credits)
    return voix


def retirer_les_invalidees(valides, saillies, manifeste, credits):
    """Un extrait repassé de « bon » à un autre verdict sort du jeu : fichier, manifeste et crédits."""
    for personne, saillie in saillies.values():
        fichier = f"{personne['id']}_{saillie['cle']}"
        if fichier in valides or not os.path.exists(f"{DEST}/{fichier}.mp3"):
            continue
        os.remove(f"{DEST}/{fichier}.mp3")
        manifeste.get("sons", {}).get("citations", {}).pop(fichier, None)
        credits["sons"] = [son for son in credits["sons"] if son["id"] != fichier]
