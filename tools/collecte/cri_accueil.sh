#!/bin/sh
# Le cri d'accueil en entier : « ce que je veux, c'est que vous, partout, vous alliez le faire gagner,
# parce que c'est notre projet ! Vive la République, vive la France ! » (Porte de Versailles,
# 10 décembre 2016). De 18,9 s à 37,9 s de l'extrait du Point, d'après ses sous-titres.
# YouTube refuse le téléchargement depuis un conteneur : à lancer sur la machine de l'utilisateur,
# depuis la racine du dépôt. Le jeu prend ce fichier dès qu'il est dans le manifeste.
set -e
mkdir -p assets/audio/sfx/cest_notre_projet
uvx --from "yt-dlp[default]==2026.10.26" yt-dlp -x --audio-format mp3 --download-sections "*18.9-37.9" \
  -o "assets/audio/sfx/cest_notre_projet/complet.%(ext)s" "https://www.youtube.com/watch?v=a1r8Ad6nFSA"
# yt-dlp coupe sur une image clé : le fichier (26 s) commence plus tôt, à « Et maintenant, votre
# responsabilité… ». WhisperX (3 novembre 2026) place « Ce que » à 8,84 s et la fin de « France » à 22,4 s :
# on garde de 8,6 s à 23,2 s, avec un fondu sur la foule. Même traitement que l'extrait court ensuite.
ffmpeg -y -loglevel error -i assets/audio/sfx/cest_notre_projet/complet.mp3 \
  -af "atrim=8.6:23.2,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=14.0:d=0.6,volume=8dB,alimiter=limit=0.89:attack=1:release=30:level=disabled" \
  assets/game/sons/citations/cest_notre_projet_complet.mp3
python3 -I - <<'PY'
import json
m = json.load(open("assets/game/manifest.json", encoding="utf-8"))
m["sons"]["citations"]["cest_notre_projet_complet"] = "sons/citations/cest_notre_projet_complet.mp3"
json.dump(m, open("assets/game/manifest.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
PY
echo "Écoutez assets/game/sons/citations/cest_notre_projet_complet.mp3, puis ajoutez son crédit dans assets/game/credits.json."
