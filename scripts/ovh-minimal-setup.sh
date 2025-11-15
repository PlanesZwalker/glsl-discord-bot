#!/bin/bash
# Script d'installation MINIMALE pour serveur OVH mutualisé
# Fonctionne même sans tous les prérequis (mode dégradé)

set -e

echo "🚀 Configuration MINIMALE du bot Discord sur serveur OVH..."
echo "⚠️  Mode dégradé : certaines fonctionnalités peuvent être désactivées"
echo ""

# Vérifier Node.js (NÉCESSAIRE)
echo "📦 Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est PAS installé."
    echo ""
    echo "🔧 Solutions :"
    echo "   1. Contacter le support OVH pour installer Node.js 20.18.0+"
    echo "   2. Installer via NodeSource (si permissions) :"
    echo "      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "      sudo apt-get install -y nodejs"
    echo "   3. Utiliser NVM (Node Version Manager) :"
    echo "      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo ""
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js trouvé: $NODE_VERSION"

# Vérifier npm
echo ""
echo "📦 Vérification de npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Réinstallez Node.js."
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ npm trouvé: $NPM_VERSION"

# Vérifier ffmpeg (OPTIONNEL)
echo ""
echo "📦 Vérification de ffmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg n'est PAS installé."
    echo "   Le bot fonctionnera, mais :"
    echo "   ✅ Compilation GIF : Fonctionne"
    echo "   ❌ Export MP4 : Désactivé"
    echo "   ❌ Export WebP : Désactivé"
    echo ""
    echo "   Pour installer ffmpeg :"
    echo "   1. Contacter le support OVH"
    echo "   2. Ou : sudo apt-get install -y ffmpeg (si permissions)"
else
    echo "✅ ffmpeg trouvé"
fi

# Créer les répertoires nécessaires
echo ""
echo "📁 Création des répertoires..."
mkdir -p storage/frames storage/gifs storage/mp4s storage/cache data logs
chmod -R 755 storage/ data/ logs/ 2>/dev/null || echo "⚠️  Impossible de changer les permissions (normal sur mutualisé)"
echo "✅ Répertoires créés"

# Installer les dépendances
echo ""
echo "📦 Installation des dépendances npm..."
PUPPETEER_SKIP_DOWNLOAD=true npm install --production || {
    echo "⚠️  Erreur lors de l'installation, tentative avec npm install..."
    npm install --production
}

# Installer Chrome pour Puppeteer
echo ""
echo "🌐 Installation de Chrome pour Puppeteer..."
PUPPETEER_CACHE_DIR=$(pwd)/.cache/puppeteer
mkdir -p $PUPPETEER_CACHE_DIR
npx puppeteer browsers install chrome --path $PUPPETEER_CACHE_DIR || {
    echo "⚠️  Erreur lors de l'installation de Chrome"
    echo "   Le bot peut quand même fonctionner, mais les compilations peuvent échouer"
}

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

# Vérifier PM2 (optionnel)
echo ""
echo "📦 Vérification de PM2..."
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 trouvé"
    echo ""
    echo "📝 Pour démarrer avec PM2:"
    echo "   pm2 start ecosystem.config.js"
    echo "   pm2 save"
elif npm list -g pm2 &> /dev/null || npm list pm2 &> /dev/null; then
    echo "✅ PM2 installé localement"
    echo ""
    echo "📝 Pour démarrer avec PM2:"
    echo "   npx pm2 start ecosystem.config.js"
else
    echo "⚠️  PM2 non installé (optionnel)"
    echo ""
    echo "📝 Alternatives :"
    echo "   1. Installer PM2 : npm install -g pm2"
    echo "   2. Utiliser forever : npm install -g forever"
    echo "   3. Utiliser un cron job (voir docs/deployment/ovh-shared-hosting.md)"
    echo "   4. Démarrer manuellement : node bot.js"
fi

echo ""
echo "✅ Installation MINIMALE terminée !"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Éditez .env avec vos clés Discord: nano .env"
echo "   2. Testez le bot: node bot.js"
echo "   3. Si ça fonctionne, configurez le démarrage automatique"
echo ""
echo "📚 Documentation complète: docs/deployment/ovh-shared-hosting.md"
echo ""

