#!/bin/bash
# Commandes à exécuter après connexion SSH à OVH
# Copiez-collez ces commandes une par une dans votre terminal SSH

echo "🚀 Commandes d'installation pour OVH Pro"
echo ""

# 1. Vérifier Node.js
echo "📦 1. Vérification de Node.js..."
node --version || echo "❌ Node.js non installé - Ouvrir un ticket support OVH"
npm --version || echo "❌ npm non installé"

echo ""
echo "📦 2. Vérification de l'espace disque..."
df -h ~

echo ""
echo "📦 3. Aller dans le répertoire web..."
cd ~/www || cd ~/public_html || cd ~

echo ""
echo "📦 4. Cloner le repository..."
echo "Exécutez: git clone https://github.com/PlanesZwalker/glsl-discord-bot.git"
echo "Puis: cd glsl-discord-bot"

echo ""
echo "📦 5. Installation automatique..."
echo "Exécutez: chmod +x scripts/ovh-minimal-setup.sh"
echo "Puis: ./scripts/ovh-minimal-setup.sh"

echo ""
echo "✅ Suivez les instructions affichées ensuite !"

