# PROJECT_EXPLANATION.md

## Vue d'ensemble du projet

**ShaderBot** est un bot Discord professionnel qui compile des shaders GLSL/WGSL en temps réel et génère des animations GIF. Le projet comprend également une application web Next.js pour visualiser les shaders et apprendre le GLSL/WGSL.

### Architecture générale

Le projet est divisé en deux parties principales :
1. **Bot Discord** (Node.js/Express) - Compilation de shaders, gestion des commandes Discord
2. **Application Web** (Next.js/TypeScript) - Interface utilisateur, dashboard, guide des shaders

---

## Structure des fichiers

### Fichiers racine

```
GLSL_DISCORD/
├── bot.js                    # Point d'entrée principal du bot Discord
├── package.json              # Dépendances et scripts Node.js
├── production.config.js      # Configuration de production
├── render.yaml               # Configuration Render.com
├── jest.config.js            # Configuration Jest pour les tests
├── README.md                 # Documentation utilisateur
└── PROJECT_EXPLANATION.md   # Ce fichier (documentation technique)
```

### Répertoires principaux

#### `/commands/` - Commandes Discord Slash
Contient toutes les commandes slash Discord :
- `shader.js` - Compile un shader GLSL/WGSL personnalisé
- `shader-preset.js` - Compile un shader prédéfini (100 disponibles)
- `shader-generate.js` - Génère un shader via paramètres (forme, couleur, animation)
- `shader-code.js` - Affiche le code source d'un shader prédéfini
- `help.js` - Affiche l'aide complète
- `admin.js` - Commandes administrateur (stats, cleanup, etc.)

**Pattern** : Chaque commande exporte un objet avec `data` (SlashCommandBuilder) et `execute` (fonction async).

#### `/src/` - Code source principal

**Fichiers principaux :**
- `real-webgl-compiler.js` - **CŒUR DU PROJET** : Compilateur WebGL/WebGPU utilisant Puppeteer
  - Crée des pages headless Chrome
  - Compile les shaders GLSL/WGSL
  - Génère des frames PNG
  - Crée des GIFs animés
  - Gère la détection de format (GLSL vs WGSL)
  - Implémente la récupération en cas de perte de contexte WebGL (retry logic)
  
- `simple-database.js` - Base de données SQLite
  - Stocke les shaders compilés
  - Gère les statistiques utilisateur
  - Index optimisés pour les requêtes
  - Nettoyage automatique des vieux shaders
  
- `browser-pool.js` - Pool de browsers Puppeteer réutilisables
  - Réduit le temps de compilation de 70-80%
  - Gère la création/destruction de browsers
  - Limite le nombre d'instances simultanées
  
- `shader-cache.js` - Cache intelligent des shaders
  - Cache les shaders prédéfinis
  - Réponse quasi-instantanée pour les shaders populaires
  
- `shader-queue.js` - Système de queue pour gérer les pics de charge
  - Priorités et retry automatique
  
- `metrics.js` - Système de métriques et monitoring
  - Suivi des performances
  - Statistiques par type de shader
  
- `progress-tracker.js` - Suivi de progression des compilations
  - Tracking des jobs de compilation
  
- `webgl-security.js` - Protections WebGL et limites de sécurité
  - Limites de taille de textures
  - Protection contre les abus

**Sous-répertoire `/src/utils/` - Utilitaires :**
- `logger.js` - Système de logging structuré
- `errorHandler.js` - Gestion centralisée des erreurs
- `shaderValidator.js` - Validation robuste des shaders (boucles infinies, etc.)
- `rateLimiter.js` - Rate limiting par utilisateur et globale
- `embedBuilder.js` - Création d'embeds Discord cohérents
- `cacheManager.js` - Cache distribué (Redis/Memory)
- `circuitBreaker.js` - Protection contre les cascades de pannes
- `gracefulShutdown.js` - Arrêt propre du serveur
- `telemetry.js` - Telemetry & APM (spans, métriques)
- `featureFlags.js` - Feature Flags avec rollout progressif
- `webhookManager.js` - Gestion des webhooks Discord
- `abTesting.js` - Framework A/B Testing
- `backupManager.js` - Sauvegardes automatiques (DB + métriques, S3)
- `gifOptimizer.js` - Optimisation GIF adaptative
- `healthCheck.js` - Health Check avancé
- `prometheus.js` - Métriques Prometheus pour Grafana

#### `/routes/` - Routes Express
- `admin.js` - Routes admin (feature flags, A/B tests, cache, backups)

#### `/tests/` - Tests automatisés
Structure de tests Jest complète :
- `compiler.test.js` - Tests du compilateur WebGL
- `simple-database.test.js` - Tests de la base de données
- `commands/*.test.js` - Tests de chaque commande
- `utils/*.test.js` - Tests des utilitaires
- Scripts de test locaux : `test-local.js`, `test-all-commands.js`, etc.

#### `/web/` - Application Web Next.js
Application web complète avec :
- `app/` - Pages et routes API Next.js (App Router)
- `components/` - Composants React (Hero, Features, DashboardContent, ShaderGuide, ShaderGallery)
- `lib/` - Utilitaires et i18n (auth.ts, i18n.ts)
- `hooks/` - Hooks React personnalisés (useLocale, useTheme)
- `middleware.ts` - Middleware Next.js pour l'authentification
- `package.json` - Dépendances Next.js séparées

#### `/scripts/` - Scripts utilitaires
- `check-deployments.js` - Vérifie le statut des déploiements
- `get-coverage.js` - Affiche le pourcentage de couverture de code
- `verify-project.js` - Vérification du projet

#### `/data/` - Données
- `shaders.db` - Base de données SQLite (générée automatiquement)

#### `/cache/` - Cache
- `shaders/` - Cache des shaders compilés

#### `/output/` - Sortie
- Répertoire pour les GIFs et frames générés

#### `/docs/` - Documentation
- `gifs/` - GIFs des shaders prédéfinis (100 GIFs)

---

## Architecture et flux de données

### Initialisation du bot (`bot.js`)

1. **Création de l'instance** : `new GLSLDiscordBot()`
   - Initialise le client Discord.js
   - Crée les instances : `RealWebGLCompiler`, `SimpleDatabase`
   - Configure les collections (commands, cooldowns, etc.)

2. **Méthode `initialize()`** :
   - Initialise la base de données
   - Initialise le compilateur WebGL (Puppeteer)
   - Charge les commandes depuis `/commands/`
   - Enregistre les commandes slash auprès de Discord
   - Configure les événements Discord
   - Démarre le serveur Express
   - Se connecte au bot Discord

3. **Serveur Express** :
   - `POST /discord` - Endpoint pour les interactions Discord (webhook)
   - `GET /health` - Health check
   - `GET /metrics` - Métriques de performance
   - Routes admin pour la gestion

### Flux d'une compilation de shader

1. **Utilisateur envoie une commande** → Discord envoie une interaction HTTP
2. **Bot reçoit l'interaction** → Vérifie la signature Discord (Ed25519)
3. **Traitement de la commande** :
   - `/shader` → Extrait le code, valide, compile
   - `/shader-preset` → Récupère le code prédéfini, compile
   - `/shader-generate` → Génère le code, compile
4. **Compilation WebGL** (`real-webgl-compiler.js`) :
   - Obtient un browser du pool
   - Crée une page de compilation isolée
   - Injecte le code shader dans la page
   - Capture les frames (30 FPS × 3 secondes = 90 frames)
   - Génère le GIF
5. **Sauvegarde** :
   - Sauvegarde dans la base de données
   - Met à jour les statistiques utilisateur
   - Cache le shader si prédéfini
6. **Réponse Discord** :
   - Envoie le GIF en embed
   - Affiche les métadonnées (ID, frames, durée, résolution)

### Gestion des erreurs

- **ErrorHandler** : Gestion centralisée avec messages utilisateur conviviaux
- **Retry logic** : Récupération automatique en cas de perte de contexte WebGL
- **Circuit Breaker** : Protection contre les cascades de pannes
- **Rate Limiting** : Protection contre les abus

---

## Technologies utilisées

### Bot Discord
- **Node.js** >= 20.18.0
- **discord.js** v14 - API Discord
- **Puppeteer** v24 - Compilation WebGL headless
- **SQLite3** - Base de données
- **Express** - Serveur HTTP pour webhooks
- **tweetnacl** - Vérification de signature Discord (Ed25519)
- **gif-encoder-2** - Génération de GIFs
- **sharp** - Traitement d'images
- **ioredis** - Cache Redis (optionnel)
- **node-cron** - Tâches planifiées (backups, cleanup)

### Application Web
- **Next.js** 14+ (App Router)
- **TypeScript**
- **Tailwind CSS**
- **NextAuth.js** - Authentification Discord OAuth2
- **React** 18+

### Tests
- **Jest** v29 - Framework de tests
- **Coverage** : Objectif 90% (statements, branches, functions, lines)

---

## Configuration

### Variables d'environnement

**Obligatoires :**
- `DISCORD_TOKEN` - Token du bot Discord
- `DISCORD_CLIENT_ID` - Client ID Discord
- `DISCORD_PUBLIC_KEY` - Public Key Discord (pour vérification signature)

**Optionnelles :**
- `MAX_BROWSER_INSTANCES` - Nombre max de browsers (défaut: 2)
- `REDIS_URL` - URL Redis pour cache distribué
- `ADMIN_IDS` - IDs Discord des administrateurs (séparés par virgules)
- `AWS_*` - Configuration S3 pour backups
- Variables de configuration WebGL (canvas size, frame rate, duration)

### Fichiers de configuration

- `production.config.js` - Configuration de production
- `render.yaml` - Configuration Render.com
- `jest.config.js` - Configuration Jest
- `web/next.config.js` - Configuration Next.js
- `web/vercel.json` - Configuration Vercel

---

## Déploiement

### Render.com (Bot Discord)
- **Service** : Web Service
- **Build Command** : `npm install`
- **Start Command** : `npm run bot`
- **Plan** : Free (750h/mois)
- **Auto-deploy** : Sur push vers `master`
- **Health Check** : `/health` endpoint

### Vercel (Application Web)
- **Framework** : Next.js
- **Root Directory** : `web/`
- **Auto-deploy** : Sur push vers `master`
- **Environment Variables** : Discord OAuth credentials

---

## Patterns et conventions

### Commandes Discord
```javascript
module.exports = {
    data: new SlashCommandBuilder()...,
    async execute(interaction, { bot }) {
        // Logique de la commande
    }
}
```

### Gestion des erreurs
- Utiliser `ErrorHandler.handle()` pour les erreurs
- Messages utilisateur conviviaux
- Logging structuré avec `logger.js`

### Base de données
- Utiliser `SimpleDatabase` pour toutes les opérations DB
- Les index sont créés automatiquement
- Nettoyage automatique des vieux shaders (30 jours)

### Compilation WebGL
- Toujours utiliser le `Browser Pool` (ne pas créer de nouveaux browsers)
- Gérer les erreurs de contexte WebGL avec retry
- Utiliser le cache pour les shaders prédéfinis

### Tests
- Tests unitaires pour chaque module
- Tests d'intégration pour les commandes
- Coverage minimum : 90%
- Utiliser mocks pour Puppeteer et Discord.js

---

## Points d'attention pour l'analyse IA

### Fichiers critiques à comprendre
1. **`bot.js`** - Point d'entrée, gestion des interactions Discord
2. **`src/real-webgl-compiler.js`** - Cœur de la compilation (3000+ lignes)
3. **`src/simple-database.js`** - Gestion de la base de données
4. **`src/browser-pool.js`** - Gestion du pool de browsers
5. **`commands/shader.js`** - Commande principale de compilation
6. **`web/app/page.tsx`** - Page d'accueil de l'application web
7. **`web/lib/auth.ts`** - Configuration NextAuth.js

### Flux importants
1. **Signature Discord** : Vérification Ed25519 dans `bot.js`
2. **Compilation** : Pipeline complet dans `real-webgl-compiler.js`
3. **Cache** : Système de cache multi-niveaux (memory, Redis, filesystem)
4. **Authentification Web** : NextAuth.js avec Discord OAuth2

### Dépendances entre modules
- `bot.js` → `RealWebGLCompiler`, `SimpleDatabase`
- `RealWebGLCompiler` → `BrowserPool`, `ShaderCache`
- Commandes → `bot.compiler`, `bot.database`
- Utils → Utilisés par tous les modules

### Gestion de l'état
- **Bot** : Collections Discord.js (commands, cooldowns)
- **Database** : SQLite avec index optimisés
- **Cache** : Redis (optionnel) + Memory fallback
- **Web** : NextAuth.js sessions, React state

---

## Structure de la base de données

**Table `shaders`** :
- `id` (INTEGER PRIMARY KEY)
- `code` (TEXT) - Code du shader
- `user_id` (TEXT) - ID Discord de l'utilisateur
- `user_name` (TEXT) - Nom d'utilisateur Discord
- `preset_name` (TEXT) - Nom du preset (si prédéfini)
- `image_path` (TEXT) - Chemin vers les frames
- `gif_path` (TEXT) - Chemin vers le GIF
- `created_at` (DATETIME) - Date de création
- `views` (INTEGER) - Nombre de vues
- `format` (TEXT) - Format du shader (glsl/wgsl)

**Index** :
- `idx_user_id` sur `user_id`
- `idx_created_at` sur `created_at`
- `idx_preset_name` sur `preset_name`

---

## Scripts npm importants

- `npm start` / `npm run bot` - Démarrer le bot
- `npm test` - Lancer les tests
- `npm run test:coverage` - Tests avec couverture
- `npm run coverage` - Afficher le pourcentage de couverture
- `npm run check-deployments` - Vérifier le statut des déploiements
- `npm run dev` - Mode développement (nodemon)

---

## Notes importantes

1. **WebGL Context Loss** : Le compilateur implémente une logique de retry automatique en cas de perte de contexte WebGL (problème courant sur Render.com)

2. **Browser Pool** : Réutilisation des instances Puppeteer pour améliorer les performances (70-80% de réduction du temps)

3. **Cache** : Système de cache multi-niveaux pour optimiser les performances

4. **Rate Limiting** : Protection contre les abus avec limites par utilisateur et globale

5. **Graceful Shutdown** : Arrêt propre du serveur avec sauvegarde des données en cours

6. **Health Checks** : Endpoints de santé pour monitoring (Render.com, Vercel)

7. **Tests** : Suite de tests complète avec objectif de 90% de couverture

---

## Pour analyser le code

1. **Commencer par** : `bot.js` pour comprendre l'architecture globale
2. **Ensuite** : `src/real-webgl-compiler.js` pour la compilation
3. **Puis** : Les commandes dans `/commands/` pour les fonctionnalités
4. **Enfin** : Les utils pour comprendre les helpers

**Contexte important** : Le projet est en production sur Render.com (bot) et Vercel (web). Tous les changements doivent être testés et ne pas casser les déploiements existants.

---

**Dernière mise à jour** : Basé sur la structure du projet au commit `ad3c4a8`

