#!/bin/bash
# Script d'installation pour serveur mutualisé OVH
# Usage: chmod +x scripts/ovh-setup.sh && ./scripts/ovh-setup.sh

set -e

echo "🚀 Configuration du bot Discord sur serveur OVH..."
echo ""

# Vérifier Node.js
echo "📦 Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Contactez le support OVH."
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js trouvé: $NODE_VERSION"

# Vérifier npm
echo "📦 Vérification de npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Contactez le support OVH."
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ npm trouvé: $NPM_VERSION"

# Vérifier ffmpeg
echo "📦 Vérification de ffmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg n'est pas installé. L'export MP4/WebP ne fonctionnera pas."
    echo "   Contactez le support OVH pour l'installation."
else
    echo "✅ ffmpeg trouvé"
fi

# Créer les répertoires nécessaires
echo ""
echo "📁 Création des répertoires..."
mkdir -p storage/frames storage/gifs storage/mp4s storage/cache data logs
chmod -R 755 storage/ data/ logs/
echo "✅ Répertoires créés"

# Installer les dépendances
echo ""
echo "📦 Installation des dépendances npm..."
PUPPETEER_SKIP_DOWNLOAD=true npm install --production

# Installer Chrome pour Puppeteer
echo ""
echo "🌐 Installation de Chrome pour Puppeteer..."
PUPPETEER_CACHE_DIR=$(pwd)/.cache/puppeteer
mkdir -p $PUPPETEER_CACHE_DIR
npx puppeteer browsers install chrome --path $PUPPETEER_CACHE_DIR
echo "✅ Chrome installé"

# Vérifier le fichier .env
echo ""
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env non trouvé"
    echo "📝 Création du fichier .env depuis l'exemple..."
    cp config/env.bot.example .env
    echo "✅ Fichier .env créé"
    echo ""
    echo "⚠️  IMPORTANT: Éditez le fichier .env et configurez:"
    echo "   - DISCORD_TOKEN"
    echo "   - DISCORD_CLIENT_ID"
    echo "   - DISCORD_PUBLIC_KEY"
    echo ""
    echo "   Commande: nano .env"
else
    echo "✅ Fichier .env trouvé"
fi

# Installer PM2 globalement (si possible)
echo ""
echo "📦 Installation de PM2..."
if npm install -g pm2 2>/dev/null; then
    echo "✅ PM2 installé"
    echo ""
    echo "📝 Pour démarrer le bot avec PM2:"
    echo "   pm2 start ecosystem.config.js"
    echo "   pm2 save"
    echo "   pm2 startup  # Suivre les instructions"
else
    echo "⚠️  Impossible d'installer PM2 globalement (permissions insuffisantes)"
    echo "   Vous pouvez utiliser 'forever' ou 'node bot.js' directement"
fi

echo ""
echo "✅ Installation terminée !"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Éditez .env avec vos clés Discord: nano .env"
echo "   2. Testez le bot: node bot.js"
echo "   3. Si ça fonctionne, démarrez avec PM2: pm2 start ecosystem.config.js"
echo ""

