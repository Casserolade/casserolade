#!/bin/sh
# Suit en direct l'activité du serveur de jeu : une ligne par connexion ou déconnexion,
# et dès que les salons changent (vérifié toutes les 30 s).
#   tools/en-ligne.sh       les 20 dernières lignes, puis la suite en direct
#   tools/en-ligne.sh 200   les 200 dernières
exec ssh "${HOTE:-debian@webgourou.fr}" "docker logs -f --tail ${1:-20} casserolade 2>&1"
