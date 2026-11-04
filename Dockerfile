# Casserolade : le client construit par Vite, servi avec le WebSocket par un seul processus Node.

# 1. Construction du client.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts ./
COPY assets/game assets/game
COPY src src
RUN npm run build

# 2. Exécution : Node lit le TypeScript du serveur directement, et seul `ws` est requis.
FROM node:22-alpine
# Le commit déployé (tools/deploy.sh) : un incident se rejoue avec le moteur sur lequel il s'est produit.
ARG VERSION=inconnue
ENV CASSEROLADE_VERSION=$VERSION \
    NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    STATIC_DIR=/app/dist \
    MMR_FILE=/app/data/serveur/mmr.json \
    TRUST_PROXY=1 \
    ALLOWED_ORIGINS=https://casserolade.fr,https://www.casserolade.fr
WORKDIR /app
COPY --chown=root:root package.json ./
COPY --from=build --chown=root:root /app/node_modules/ws node_modules/ws
COPY --chown=root:root src src
COPY --from=build --chown=root:root /app/dist dist
# Le code appartient à root et reste en lecture seule ; seul le dossier du MMR est à l'utilisateur node.
RUN rm -rf src/client src/sim && mkdir -p data/serveur && chown node:node data/serveur
USER node
VOLUME /app/data/serveur
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "src/server/main.ts"]
