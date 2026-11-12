#!/bin/sh
# Dépose sur le serveur l'accès de l'application Twitch qui dit à l'accueil si la chaîne est en direct : son
# identifiant client et son secret (console https://dev.twitch.tv/console/apps). Le secret ne s'affiche pas et
# n'entre pas dans l'historique du terminal ; il est vérifié auprès de Twitch, puis écrit sur le volume privé du
# conteneur (data/serveur/twitch.json), lisible par lui seul. Le serveur le lit dans la minute, sans redémarrer.
#   tools/twitch-acces.sh                    vers debian@webgourou.fr
#   HOTE=moi@ailleurs tools/twitch-acces.sh  vers un autre serveur
set -eu

HOTE=${HOTE:-debian@webgourou.fr}

printf 'Identifiant client (Client ID) : '
read -r ID
trap 'stty echo' EXIT INT TERM
printf 'Secret client (Client Secret, il ne s'\''affiche pas) : '
stty -echo
read -r SECRET
stty echo
printf '\n'

for valeur in "$ID" "$SECRET"; do
  case "$valeur" in
    '' | *[!a-z0-9]*)
      echo "Un identifiant ou un secret Twitch ne contient que des minuscules et des chiffres : vérifiez le copier-coller." >&2
      exit 1
      ;;
  esac
done

# Le secret passe par l'entrée de curl, jamais par ses arguments (visibles de tous dans la liste des processus).
CODE=$(printf 'client_id=%s&client_secret=%s&grant_type=client_credentials' "$ID" "$SECRET" |
  curl -s -o /dev/null -w '%{http_code}' -X POST --data @- https://id.twitch.tv/oauth2/token)
if [ "$CODE" != 200 ]; then
  echo "Twitch refuse cet accès (HTTP $CODE) : l'application doit être de type « Confidentiel », et le secret le dernier généré." >&2
  exit 1
fi

printf '{"clientId":"%s","clientSecret":"%s"}\n' "$ID" "$SECRET" |
  ssh "$HOTE" "docker exec -i casserolade sh -c 'umask 077 && cat > /app/data/serveur/twitch.json'"
echo "Accès déposé. D'ici une minute, https://casserolade.fr/en-direct dit \"twitch\":true pendant un direct."
