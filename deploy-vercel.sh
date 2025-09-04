#!/bin/bash

# Script de Déploiement Vercel pour GLSL Discord Bot
# Usage: ./deploy-vercel.sh

echo "🚀 Déploiement Vercel pour GLSL Discord Bot..."

# Vérifier que Vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI non trouvé. Installation..."
    npm install -g vercel
fi

# Vérifier que .env existe
if [ ! -f .env ]; then
    echo "❌ Fichier .env manquant !"
    echo "Créez un fichier .env avec :"
    echo "DISCORD_TOKEN=votre_token_discord"
    echo "DISCORD_CLIENT_ID=votre_client_id"
    exit 1
fi

# Nettoyer les dossiers non nécessaires
echo "🧹 Nettoyage des dossiers de développement..."
rm -rf logs/
rm -rf output/
rm -rf data/*.db

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install --production

# Déployer sur Vercel
echo "🚀 Déploiement sur Vercel..."
vercel --prod

echo "✅ Déploiement terminé !"
echo "🌐 Votre bot est maintenant en ligne sur Vercel !"
