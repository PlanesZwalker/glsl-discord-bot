# Image de base Node.js 18
FROM node:18-alpine

# Répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Exposer le port 8080 (Cloud Run standard)
EXPOSE 8080

# Variable d'environnement pour Cloud Run
ENV PORT=8080
ENV NODE_ENV=production

# Commande de démarrage
CMD ["node", "server.js"]
