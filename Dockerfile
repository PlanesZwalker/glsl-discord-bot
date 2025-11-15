# Dockerfile optimisé pour Render.com
# Chrome est pré-installé dans l'image, évitant l'installation à chaque build

FROM node:20.18.0-slim

# Installer les dépendances système nécessaires pour Chrome et ffmpeg
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances npm (sans Puppeteer Chrome)
RUN PUPPETEER_SKIP_DOWNLOAD=true npm ci --only=production --prefer-offline --no-audit

# Installer Chrome dans un répertoire persistant
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
RUN mkdir -p $PUPPETEER_CACHE_DIR && \
    npx puppeteer browsers install chrome --path $PUPPETEER_CACHE_DIR

# Copier le reste du code
COPY . .

# Créer les répertoires nécessaires
RUN mkdir -p storage/frames storage/gifs storage/mp4s storage/cache data

# Exposer le port (si nécessaire pour health check)
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "run", "bot"]

