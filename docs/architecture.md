# Architecture des Fichiers

Ce document décrit l'architecture des fichiers du projet ShaderBot.

## Structure des Dossiers

### 📁 `storage/` - Fichiers Générés en Production
Tous les fichiers générés par le bot sont stockés dans ce dossier.

- **`storage/frames/`** - Frames PNG temporaires par shader
  - Structure: `shader_{id}_{timestamp}/frame_0001.png`
  - Nettoyage: Automatique après compilation (frames supprimées après création du GIF)

- **`storage/gifs/`** - GIFs animés compilés
  - Structure: `shader_{id}_{timestamp}.gif`
  - Conservés selon le plan utilisateur (Free: 7 jours, Pro/Studio: illimité)

- **`storage/mp4s/`** - Exports MP4 (Pro/Studio uniquement)
  - Structure: `shader_{id}_{timestamp}.mp4`
  - Conservés selon le plan utilisateur

- **`storage/cache/`** - Cache des shaders prédéfinis
  - Structure: `{hash}.gif` et `{hash}.json`
  - Durée: 24 heures par défaut

### 📁 `data/` - Base de Données
- **`data/shaders.db`** - Base de données SQLite
  - Contient: utilisateurs, shaders, abonnements, API keys

### 📁 `tests/artifacts/` - Fichiers de Test
- Fichiers générés lors des tests
- Non versionnés (dans `.gitignore`)

### 📁 `docs/assets/` - Assets de Documentation
- Images, GIFs pour la documentation
- Versionnés pour GitHub

### 📁 `logs/` - Logs
- Fichiers de logs d'audit et d'erreurs
- Non versionnés

## Configuration Centralisée

Tous les chemins sont gérés par **`src/config/paths.js`** qui :
- Définit tous les chemins de manière centralisée
- Crée automatiquement les dossiers nécessaires
- Fournit des méthodes utilitaires pour générer des chemins

## Migration depuis l'Ancienne Architecture

### Anciens Dossiers (à nettoyer)
- `output/` → Maintenant `storage/frames/` et `storage/gifs/`
- `cache/shaders/` → Maintenant `storage/cache/`
- `data/frames/` → Maintenant `storage/frames/`

### Migration Automatique
Le système crée automatiquement les nouveaux dossiers. Les anciens dossiers peuvent être supprimés manuellement après vérification.

## Nettoyage Automatique

### Plan Free
- Shaders > 7 jours: Suppression automatique (fichiers + DB)
- Exécution: Toutes les 24h (configurable via `CLEANUP_INTERVAL_HOURS`)

### Plan Pro/Studio
- Stockage illimité (pas de nettoyage automatique)
- Fichiers conservés indéfiniment

## Fichiers Versionnés vs Non Versionnés

### Versionnés (Git)
- ✅ Code source
- ✅ Configuration (`config/`)
- ✅ Documentation (`README.md`, `docs/assets/`)
- ✅ Structure des dossiers (`.gitkeep`)

### Non Versionnés (`.gitignore`)
- ❌ `storage/` - Tous les fichiers générés
- ❌ `data/shaders.db` - Base de données
- ❌ `logs/` - Logs
- ❌ `tests/artifacts/` - Artifacts de test
- ❌ `node_modules/` - Dépendances
- ❌ `.env` - Variables d'environnement

## Utilisation dans le Code

```javascript
// Importer la configuration
const pathConfig = require('./config/paths');

// Obtenir un chemin pour un shader
const frameDir = pathConfig.getShaderPath('shader123', 'frames');
const gifPath = pathConfig.getShaderPath('shader123', 'gif');
const mp4Path = pathConfig.getShaderPath('shader123', 'mp4');

// Obtenir un chemin de cache
const cachePath = pathConfig.getCachePath('abc123', '.gif');

// Nettoyer un dossier
await pathConfig.cleanDirectory(pathConfig.framesDir, 7 * 24 * 60 * 60 * 1000);
```

