#!/bin/sh
# Rapatrie les parties en ligne que le serveur garde pour l'équilibrage (une ligne JSON par partie allée au bout, un
# fichier par jour) dans data/serveur/parties, puis les résume : node src/sim/bilan_salons.ts.
#   tools/parties.sh                    depuis debian@webgourou.fr
#   HOTE=moi@ailleurs tools/parties.sh  depuis un autre serveur
set -eu

HOTE=${HOTE:-debian@webgourou.fr}
cd "$(git rev-parse --show-toplevel)"
if ! ssh "$HOTE" "docker exec casserolade test -d /app/data/serveur/parties"; then
  echo "Le serveur n'a encore archivé aucune partie."
  exit 0
fi
mkdir -p data/serveur
ssh "$HOTE" "docker cp casserolade:/app/data/serveur/parties -" | tar -x -C data/serveur
echo "$(cat data/serveur/parties/*.jsonl | wc -l) parties dans data/serveur/parties"
node src/sim/bilan_salons.ts
