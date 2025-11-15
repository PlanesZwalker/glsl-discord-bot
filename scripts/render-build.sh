#!/bin/bash
# Script de build optimisé pour Render.com
# Évite la réinstallation de Chrome si déjà présent dans le cache

set -e

echo "🚀 Démarrage du build optimisé..."

# Créer le répertoire de cache Puppeteer
PUPPETEER_CACHE_DIR="${PUPPETEER_CACHE_DIR:-/opt/render/project/.cache/puppeteer}"
mkdir -p "$PUPPETEER_CACHE_DIR"

# Installer les dépendances npm (utilise le cache npm de Render)
echo "📦 Installation des dépendances npm..."
PUPPETEER_SKIP_DOWNLOAD=true npm ci --prefer-offline --no-audit

# Vérifier si Chrome est déjà installé dans le cache
CHROME_PATH="$PUPPETEER_CACHE_DIR/chrome/linux-*/chrome-linux/chrome"
if [ -f $CHROME_PATH ] 2>/dev/null; then
    echo "✅ Chrome trouvé dans le cache, pas besoin de réinstallation"
    echo "Chrome version: $(head -1 $PUPPETEER_CACHE_DIR/chrome/linux-*/chrome-linux/chrome 2>/dev/null || echo 'unknown')"
else
    echo "📥 Installation de Chrome (première fois ou cache expiré)..."
    export PUPPETEER_CACHE_DIR
    npx puppeteer browsers install chrome --path "$PUPPETEER_CACHE_DIR"
fi

echo "✅ Build terminé avec succès!"

