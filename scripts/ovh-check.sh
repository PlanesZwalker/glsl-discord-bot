#!/bin/bash
# Script de vérification pour serveur OVH
# Usage: chmod +x scripts/ovh-check.sh && ./scripts/ovh-check.sh

echo "🔍 Vérification de l'environnement OVH..."
echo ""

# Vérifier Node.js
echo "📦 Node.js:"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ $NODE_VERSION"
    
    # Vérifier la version minimale (20.18.0)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -ge 20 ]; then
        echo "   ✅ Version compatible (>= 20.x)"
    else
        echo "   ⚠️  Version trop ancienne (minimum: 20.18.0)"
    fi
else
    echo "   ❌ Node.js non installé"
fi

# Vérifier npm
echo ""
echo "📦 npm:"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "   ✅ $NPM_VERSION"
else
    echo "   ❌ npm non installé"
fi

# Vérifier ffmpeg
echo ""
echo "📦 ffmpeg:"
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n1)
    echo "   ✅ $FFMPEG_VERSION"
else
    echo "   ⚠️  ffmpeg non installé (export MP4/WebP ne fonctionnera pas)"
fi

# Vérifier l'espace disque
echo ""
echo "💾 Espace disque:"
df -h . | tail -n1 | awk '{print "   Disponible: " $4 " / " $2 " (Utilisé: " $5 ")"}'

# Vérifier les répertoires
echo ""
echo "📁 Répertoires:"
for dir in storage/frames storage/gifs storage/mp4s storage/cache data logs; do
    if [ -d "$dir" ]; then
        echo "   ✅ $dir"
    else
        echo "   ⚠️  $dir (manquant)"
    fi
done

# Vérifier .env
echo ""
echo "🔐 Configuration:"
if [ -f .env ]; then
    echo "   ✅ .env trouvé"
    
    # Vérifier les variables essentielles
    if grep -q "DISCORD_TOKEN=" .env && ! grep -q "DISCORD_TOKEN=your_" .env; then
        echo "   ✅ DISCORD_TOKEN configuré"
    else
        echo "   ⚠️  DISCORD_TOKEN non configuré"
    fi
    
    if grep -q "DISCORD_CLIENT_ID=" .env && ! grep -q "DISCORD_CLIENT_ID=your_" .env; then
        echo "   ✅ DISCORD_CLIENT_ID configuré"
    else
        echo "   ⚠️  DISCORD_CLIENT_ID non configuré"
    fi
else
    echo "   ⚠️  .env non trouvé (copiez config/env.bot.example vers .env)"
fi

# Vérifier node_modules
echo ""
echo "📦 Dépendances:"
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules trouvé"
    
    # Vérifier Puppeteer
    if [ -d "node_modules/puppeteer" ]; then
        echo "   ✅ puppeteer installé"
    else
        echo "   ⚠️  puppeteer manquant (exécutez: npm install)"
    fi
else
    echo "   ⚠️  node_modules manquant (exécutez: npm install)"
fi

# Vérifier Chrome Puppeteer
echo ""
echo "🌐 Chrome Puppeteer:"
if [ -d ".cache/puppeteer" ] || [ -d "node_modules/.cache/puppeteer" ]; then
    echo "   ✅ Chrome installé"
else
    echo "   ⚠️  Chrome non installé (exécutez: npx puppeteer browsers install chrome)"
fi

# Vérifier PM2
echo ""
echo "🔄 PM2:"
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    echo "   ✅ PM2 installé ($PM2_VERSION)"
    
    # Vérifier si le bot tourne
    if pm2 list | grep -q "glsl-discord-bot"; then
        echo "   ✅ Bot en cours d'exécution"
        pm2 list | grep "glsl-discord-bot"
    else
        echo "   ⚠️  Bot non démarré (exécutez: pm2 start ecosystem.config.js)"
    fi
else
    echo "   ⚠️  PM2 non installé (optionnel, recommandé pour production)"
fi

echo ""
echo "✅ Vérification terminée !"

