#!/bin/sh
# Déploie le commit courant sur le serveur : seul ce qui est commité part, l'image se construit là-bas.
#   tools/deploy.sh                    vers debian@webgourou.fr, dans ~/casserolade
#   HOTE=moi@ailleurs tools/deploy.sh  vers un autre serveur
set -eu

HOTE=${HOTE:-debian@webgourou.fr}
DOSSIER=${DOSSIER:-casserolade}
FICHIERS="Dockerfile .dockerignore docker-compose.yml package.json package-lock.json tsconfig.json vite.config.ts src assets/game"

cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain -- $FICHIERS)" ]; then
  echo "Des fichiers déployés ne sont pas commités : seul le commit courant part." >&2
fi
COMMIT=$(git rev-parse --short HEAD)
echo "Déploiement de $COMMIT vers $HOTE:$DOSSIER"

# shellcheck disable=SC2086
git archive --format=tar HEAD $FICHIERS | ssh "$HOTE" "set -e
  rm -rf '$DOSSIER/app.new' && mkdir -p '$DOSSIER/app.new'
  tar -x -C '$DOSSIER/app.new'
  echo '$COMMIT' > '$DOSSIER/app.new/VERSION'
  rm -rf '$DOSSIER/app' && mv '$DOSSIER/app.new' '$DOSSIER/app'
  cd '$DOSSIER/app'
  DOCKER_BUILDKIT=1 docker build -q --build-arg VERSION='$COMMIT' -t casserolade:latest .
  # webgourou.fr n'a que docker-compose 1.29, pas le greffon docker compose. Celui-ci plante en recréant un
  # conteneur sous un Docker récent (KeyError: 'ContainerConfig') et laisse le site hors ligne : on retire
  # d'abord l'ancien conteneur (le MMR est dans un volume nommé, il reste).
  if docker compose version >/dev/null 2>&1; then docker compose -p casserolade up -d
  else docker-compose -p casserolade rm -f -s >/dev/null && docker-compose -p casserolade up -d; fi
  docker image prune -f >/dev/null"

echo "En ligne : https://casserolade.fr"
