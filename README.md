# ShaderBot 🎨

**Compilateur de Shaders GLSL/WGSL pour Discord** - Bot professionnel pour compiler et animer des shaders en temps réel avec WebGL/WebGPU, génération de GIFs animés, 100 shaders prédéfinis et application web complète.

## ✨ Fonctionnalités

### Bot Discord
- **Compilation WebGL/WebGPU Réelle** : Utilise Puppeteer pour une vraie compilation GLSL/WGSL
- **Animations GIF** : Création d'animations de 3 secondes à 30 FPS, exportées en GIF
- **100 Shaders Prédéfinis** : Effets animés, fractales, 3D, naturels, géométriques, spatiaux et visuels avancés (dont 3 variations de Mandelbulb)
- **Support Textures** : Utilisation de `iChannel0-3` comme sur Shadertoy
- **Base de données SQLite** : Stockage des shaders, GIFs et statistiques avec index optimisés
- **Génération via paramètres** : Créez des shaders sans coder en choisissant forme, couleur et animation
- **API REST complète** : Endpoints pour intégration externe
- **⚡ Performance & Scalabilité** :
  - **Browser Pool** : Réutilisation des instances Puppeteer (réduction de 70-80% du temps de compilation)
  - **Shader Cache** : Cache intelligent des shaders prédéfinis (réponse quasi-instantanée)
  - **Queue System** : Gestion des pics de charge avec priorités et retry automatique
  - **Database Indexes** : Requêtes optimisées (10-100x plus rapides)
- **📊 Monitoring & Analytics** :
  - **Metrics System** : Suivi des performances en temps réel (`GET /metrics`)
  - **Progress Tracker** : Suivi de la progression des compilations
  - **WebSocket Support** : Notifications en temps réel (optionnel, nécessite socket.io)
- **🔒 Sécurité Renforcée** :
  - **WebGL Security** : Limites de sécurité (textures, viewport, draw calls)
  - **Timeouts Stricts** : Protection contre les boucles infinies et les opérations longues
  - **Resource Limits** : Protection contre l'utilisation excessive de ressources
  - **Validation Robuste** : Détection de boucles infinies, instructions dangereuses, caractères suspects
  - **Rate Limiting** : Limites par utilisateur et globale pour protéger contre les abus
- **🧪 Tests Automatisés** : Suite de tests Jest complète (compilateur, commandes, cache, browser pool)
- **🛠️ Utilitaires Professionnels** :
  - **Logger** : Système de logging structuré avec timestamps ISO
  - **ErrorHandler** : Gestion centralisée des erreurs avec messages utilisateur conviviaux
  - **ShaderValidator** : Validation robuste des shaders (boucles infinies, instructions dangereuses, caractères suspects)
  - **RateLimiter** : Rate limiting amélioré par utilisateur et globale (limites configurables par commande)
  - **CustomEmbedBuilder** : Embeds Discord cohérents et professionnels (success, error, info, warning, shaderCompiled, progress, stats)
  - **Commandes Admin** : `/admin` pour gérer le bot (stats, cleanup, restart pool, reset rate limits)
- **🚀 Fonctionnalités Avancées Professionnelles** :
  - **Circuit Breaker** : Protection contre les cascades de pannes (Puppeteer, services externes)
  - **Graceful Shutdown** : Arrêt propre du serveur avec sauvegarde des données en cours
  - **Telemetry & APM** : Monitoring avancé avec spans, métriques, détection d'opérations lentes
  - **Feature Flags** : Activation/désactivation de fonctionnalités sans redéploiement, rollout progressif
  - **Webhook Manager** : Notifications Discord pour erreurs, stats, analytics
  - **Cache Manager** : Cache intelligent avec Redis (fallback mémoire), TTL, invalidation par pattern
  - **A/B Testing** : Framework de tests A/B avec variants, weights, tracking de conversions
  - **Backup Manager** : Sauvegardes automatiques quotidiennes (DB + métriques), support S3
  - **GIF Optimizer** : Compression adaptative des GIFs selon la complexité des frames
  - **Health Check Avancé** : Vérifications complètes (DB, Browser Pool, Disk, Memory, Cache, Bot)
  - **Routes Admin** : API REST pour gérer feature flags, A/B tests, cache, backups, télémetry

### Application Web
- **🌐 Landing Page Professionnelle** : Interface moderne avec support bilingue (FR/EN)
- **📊 Dashboard Utilisateur** : Visualisez tous vos shaders avec authentification Discord
- **📚 Guide Complet des Shaders** : Guide professionnel exhaustif GLSL/WGSL avec convertisseur intégré
- **🖼️ Galerie Interactive** : Explorez les 100 shaders prédéfinis avec aperçus et code source
- **🌓 Thème Clair/Sombre** : Basculez entre les thèmes avec persistance

### 📖 Documentation
- **[Guide Professionnel Complet : Codage de Shaders GLSL](docs/SHADER_GUIDE.md)** : Guide exhaustif avec techniques avancées, exemples pratiques et optimisations
- **[Documentation API](docs/API.md)** : Documentation complète de l'API REST
- **[Guide de Dépannage : Authentification Discord](docs/AUTH_TROUBLESHOOTING.md)** : Solutions aux erreurs d'authentification courantes

## 🚀 Commandes Discord

### Commandes Slash

- `/help` - Afficher l'aide complète
- `/shader <code> [texture0] [texture1] [texture2] [texture3]` - Compiler un shader GLSL ou WGSL personnalisé (génère un GIF animé, textures optionnelles)
- `/shader-preset <preset>` - Compiler un shader prédéfini parmi les 100 disponibles (autocomplete disponible)
- `/shader-generate` - Générer un shader via paramètres (forme, couleur, animation)
- `/shader-code <name>` - Afficher le code source d'un shader prédéfini
- `/admin` - **Commandes administrateur** (nécessite ADMIN_IDS dans .env) :
  - `stats` - Statistiques détaillées du bot
  - `cleanup` - Nettoyer les vieux shaders et le cache
  - `restart-pool` - Redémarrer le pool de browsers
  - `reset-rate-limit` - Réinitialiser les rate limits d'un utilisateur
  - `cache-stats` - Statistiques du cache

### Shaders Prédéfinis (100 disponibles)

> ✨ **Nouvelles améliorations** : Les shaders `mandelbulb`, `tree`, `maze`, `heart`, `moon`, `planet` et `asteroid` ont été améliorés pour être plus réalistes et détaillés. De plus, 3 nouvelles variations de Mandelbulb sont disponibles : `mandelbulb2`, `mandelbulb3`, `mandelbulb4`.

Utilisez `/shader-preset <nom>` pour compiler un shader prédéfini (ex: `/shader-preset rainbow`) :

#### 🎨 Effets Animés

| Shader | Description | Aperçu |
|--------|-------------|--------|
| `/shader-preset rainbow` | Arc-en-ciel animé rotatif | <img src="docs/gifs/rainbow.gif" width="200" alt="rainbow"> |
| `/shader-preset spiral` | Spirale multicolore animée | <img src="docs/gifs/spiral.gif" width="200" alt="spiral"> |
| `/shader-preset plasma` | Effet plasma coloré animé | <img src="docs/gifs/plasma.gif" width="200" alt="plasma"> |
| `/shader-preset tunnel` | Effet tunnel rotatif | <img src="docs/gifs/tunnel.gif" width="200" alt="tunnel"> |
| `/shader-preset starfield` | Champ d'étoiles animé | <img src="docs/gifs/starfield.gif" width="200" alt="starfield"> |
| `/shader-preset gradient` | Dégradé animé | <img src="docs/gifs/gradient.gif" width="200" alt="gradient"> |
| `/shader-preset sine` | Ondes sinusoïdales | <img src="docs/gifs/sine.gif" width="200" alt="sine"> |
| `/shader-preset waves` | Vagues animées | <img src="docs/gifs/waves.gif" width="200" alt="waves"> |
| `/shader-preset spiral2` | Spirale alternative | <img src="docs/gifs/spiral2.gif" width="200" alt="spiral2"> |
| `/shader-preset rings` | Anneaux concentriques | <img src="docs/gifs/rings.gif" width="200" alt="rings"> |

#### 🌊 Effets Naturels

| Shader | Description | Aperçu |
|--------|-------------|--------|
| `/shader-preset water` | Ondes aquatiques avec reflets | <img src="docs/gifs/water.gif" width="200" alt="water"> |
| `/shader-preset fire` | Effet de feu animé | <img src="docs/gifs/fire.gif" width="200" alt="fire"> |
| `/shader-preset smoke` | Fumée montante | <img src="docs/gifs/smoke.gif" width="200" alt="smoke"> |
| `/shader-preset snow` | Neige | <img src="docs/gifs/snow.gif" width="200" alt="snow"> |
| `/shader-preset clouds` | Nuages | <img src="docs/gifs/clouds.gif" width="200" alt="clouds"> |
| `/shader-preset lava` | Lampe à lave | <img src="docs/gifs/lava.gif" width="200" alt="lava"> |
| `/shader-preset lavaflow` | Coulée de lave | <img src="docs/gifs/lavaflow.gif" width="200" alt="lavaflow"> |
| `/shader-preset aurora` | Aurore boréale | <img src="docs/gifs/aurora.gif" width="200" alt="aurora"> |
| `/shader-preset rain` | Pluie | <img src="docs/gifs/rain.gif" width="200" alt="rain"> |
| `/shader-preset thunder` | Tonnerre | <img src="docs/gifs/thunder.gif" width="200" alt="thunder"> |
| `/shader-preset wind` | Vent | <img src="docs/gifs/wind.gif" width="200" alt="wind"> |
| `/shader-preset fog` | Brouillard | <img src="docs/gifs/fog.gif" width="200" alt="fog"> |
| `/shader-preset mist` | Brume | <img src="docs/gifs/mist.gif" width="200" alt="mist"> |
| `/shader-preset haze` | Brume légère | <img src="docs/gifs/haze.gif" width="200" alt="haze"> |
| `/shader-preset storm` | Tempête | <img src="docs/gifs/storm.gif" width="200" alt="storm"> |

#### 🌀 Fractales

| Shader | Description | Aperçu |
|--------|-------------|--------|
| `/shader-preset mandelbrot` | Fractale Mandelbrot avec zoom | <img src="docs/gifs/mandelbrot.gif" width="200" alt="mandelbrot"> |
| `/shader-preset mandelbulb` | Fractale 3D Mandelbulb améliorée (raymarching, éclairage réaliste) | <img src="docs/gifs/mandelbulb.gif" width="200" alt="mandelbulb"> |
| `/shader-preset mandelbulb2` | Mandelbulb variation power 6.0 avec palette colorée | <img src="docs/gifs/mandelbulb.gif" width="200" alt="mandelbulb2"> |
| `/shader-preset mandelbulb3` | Mandelbulb variation power 10.0 avec éclairage dramatique | <img src="docs/gifs/mandelbulb.gif" width="200" alt="mandelbulb3"> |
| `/shader-preset mandelbulb4` | Mandelbulb variation power 4.0 style minimaliste | <img src="docs/gifs/mandelbulb.gif" width="200" alt="mandelbulb4"> |
| `/shader-preset julia` | Fractale Julia Set | <img src="docs/gifs/julia.gif" width="200" alt="julia"> |
| `/shader-preset fractal` | Fractale animée | <img src="docs/gifs/fractal.gif" width="200" alt="fractal"> |
| `/shader-preset tree` | Arbre réaliste avec feuilles détaillées, branches naturelles et éclairage | <img src="docs/gifs/tree.gif" width="200" alt="tree"> |

#### 🎯 Effets 3D

| Shader | Description | Aperçu |
|--------|-------------|--------|
| `/shader-preset raymarching` | Sphère 3D avec raymarching | <img src="docs/gifs/raymarching.gif" width="200" alt="raymarching"> |
| `/shader-preset metaballs` | Sphères qui fusionnent | <img src="docs/gifs/metaballs.gif" width="200" alt="metaballs"> |
| `/shader-preset crystal` | Cristal | <img src="docs/gifs/crystal.gif" width="200" alt="crystal"> |
| `/shader-preset bubbles` | Bulles | <img src="docs/gifs/bubbles.gif" width="200" alt="bubbles"> |

#### 🔷 Effets Géométriques

| Shader | Description | Aperçu |
|--------|-------------|--------|
| `/shader-preset voronoi` | Diagramme de Voronoi animé | <img src="docs/gifs/voronoi.gif" width="200" alt="voronoi"> |
| `/shader-preset hexagon` | Motif hexagonal animé | <img src="docs/gifs/hexagon.gif" width="200" alt="hexagon"> |
| `/shader-preset grid` | Grille animée | <img src="docs/gifs/grid.gif" width="200" alt="grid"> |
| `/shader-preset geometric` | Formes géométriques | <img src="docs/gifs/geometric.gif" width="200" alt="geometric"> |
| `/shader-preset maze` | Labyrinthe généré avec algorithme réaliste et éclairage dramatique | <img src="docs/gifs/maze.gif" width="200" alt="maze"> |
| `/shader-preset moire` | Motif de Moiré | <img src="docs/gifs/moire.gif" width="200" alt="moire"> |
| `/shader-preset dots` | Points animés | <img src="docs/gifs/dots.gif" width="200" alt="dots"> |
| `/shader-preset lines` | Lignes animées | <img src="docs/gifs/lines.gif" width="200" alt="lines"> |
| `/shader-preset checkerboard` | Damier | <img src="docs/gifs/checkerboard.gif" width="200" alt="checkerboard"> |
| `/shader-preset stripes` | Rayures | <img src="docs/gifs/stripes.gif" width="200" alt="stripes"> |
| `/shader-preset zebra` | Motif zèbre | <img src="docs/gifs/zebra.gif" width="200" alt="zebra"> |
| `/shader-preset diamond` | Diamant | <img src="docs/gifs/diamond.gif" width="200" alt="diamond"> |
| `/shader-preset triangle` | Triangle | <img src="docs/gifs/triangle.gif" width="200" alt="triangle"> |
| `/shader-preset circle` | Cercle | <img src="docs/gifs/circle.gif" width="200" alt="circle"> |
| `/shader-preset square` | Carré | <img src="docs/gifs/square.gif" width="200" alt="square"> |
| `/shader-preset star` | Étoile | <img src="docs/gifs/star.gif" width="200" alt="star"> |
| `/shader-preset heart` | Cœur réaliste avec pulsation, lueur et particules d'amour | <img src="docs/gifs/heart.gif" width="200" alt="heart"> |
| `/shader-preset flower` | Fleur | <img src="docs/gifs/flower.gif" width="200" alt="flower"> |

#### 🌌 Effets Spatiaux

| Shader | Description | Aperçu |
|--------|-------------|--------|
| `/shader-preset galaxy` | Galaxie spirale | <img src="docs/gifs/galaxy.gif" width="200" alt="galaxy"> |
| `/shader-preset spiralgalaxy` | Galaxie spirale détaillée | <img src="docs/gifs/spiralgalaxy.gif" width="200" alt="spiralgalaxy"> |
| `/shader-preset nebula` | Nébuleuse | <img src="docs/gifs/nebula.gif" width="200" alt="nebula"> |
| `/shader-preset cosmic` | Effet cosmique | <img src="docs/gifs/cosmic.gif" width="200" alt="cosmic"> |
| `/shader-preset sun` | Soleil | <img src="docs/gifs/sun.gif" width="200" alt="sun"> |
| `/shader-preset moon` | Lune réaliste avec cratères détaillés, phases animées et éclairage | <img src="docs/gifs/moon.gif" width="200" alt="moon"> |
| `/shader-preset planet` | Planète réaliste avec continents, océans, nuages animés et atmosphère | <img src="docs/gifs/planet.gif" width="200" alt="planet"> |
| `/shader-preset comet` | Comète | <img src="docs/gifs/comet.gif" width="200" alt="comet"> |
| `/shader-preset asteroid` | Astéroïdes 3D réalistes avec rotation, cratères et éclairage | <img src="docs/gifs/asteroid.gif" width="200" alt="asteroid"> |
| `/shader-preset nebula2` | Nébuleuse 2 | <img src="docs/gifs/nebula2.gif" width="200" alt="nebula2"> |
| `/shader-preset supernova` | Supernova | <img src="docs/gifs/supernova.gif" width="200" alt="supernova"> |
| `/shader-preset blackhole` | Trou Noir | <img src="docs/gifs/blackhole.gif" width="200" alt="blackhole"> |
| `/shader-preset wormhole` | Trou de Ver | <img src="docs/gifs/wormhole.gif" width="200" alt="wormhole"> |

#### ⚡ Effets Visuels Avancés

| Shader | Description | Aperçu |
|--------|-------------|--------|
| `/shader-preset noise` | Noise/Perlin noise multi-octave | <img src="docs/gifs/noise.gif" width="200" alt="noise"> |
| `/shader-preset kaleidoscope` | Kaléidoscope rotatif | <img src="docs/gifs/kaleidoscope.gif" width="200" alt="kaleidoscope"> |
| `/shader-preset ripple` | Ondes concentriques | <img src="docs/gifs/ripple.gif" width="200" alt="ripple"> |
| `/shader-preset particles` | Système de particules | <img src="docs/gifs/particles.gif" width="200" alt="particles"> |
| `/shader-preset matrix` | Pluie de code Matrix | <img src="docs/gifs/matrix.gif" width="200" alt="matrix"> |
| `/shader-preset electric` | Éclairs/orage | <img src="docs/gifs/electric.gif" width="200" alt="electric"> |
| `/shader-preset dna` | Double hélice d'ADN | <img src="docs/gifs/dna.gif" width="200" alt="dna"> |
| `/shader-preset circuit` | Circuit électronique | <img src="docs/gifs/circuit.gif" width="200" alt="circuit"> |
| `/shader-preset lightrays` | Rayons de lumière | <img src="docs/gifs/lightrays.gif" width="200" alt="lightrays"> |
| `/shader-preset turbulence` | Turbulence | <img src="docs/gifs/turbulence.gif" width="200" alt="turbulence"> |
| `/shader-preset morphing` | Morphing de formes | <img src="docs/gifs/morphing.gif" width="200" alt="morphing"> |
| `/shader-preset swirl` | Tourbillon | <img src="docs/gifs/swirl.gif" width="200" alt="swirl"> |
| `/shader-preset energy` | Énergie | <img src="docs/gifs/energy.gif" width="200" alt="energy"> |
| `/shader-preset lens` | Effet de lentille | <img src="docs/gifs/lens.gif" width="200" alt="lens"> |
| `/shader-preset kaleidoscope2` | Kaléidoscope 2 | <img src="docs/gifs/kaleidoscope2.gif" width="200" alt="kaleidoscope2"> |
| `/shader-preset distortion` | Distorsion | <img src="docs/gifs/distortion.gif" width="200" alt="distortion"> |
| `/shader-preset mirror` | Miroir | <img src="docs/gifs/mirror.gif" width="200" alt="mirror"> |
| `/shader-preset reflection` | Réflexion | <img src="docs/gifs/reflection.gif" width="200" alt="reflection"> |
| `/shader-preset glitch` | Effet Glitch | <img src="docs/gifs/glitch.gif" width="200" alt="glitch"> |
| `/shader-preset pixelate` | Pixelisation | <img src="docs/gifs/pixelate.gif" width="200" alt="pixelate"> |
| `/shader-preset chromatic` | Aberration chromatique | <img src="docs/gifs/chromatic.gif" width="200" alt="chromatic"> |
| `/shader-preset bloom` | Effet Bloom | <img src="docs/gifs/bloom.gif" width="200" alt="bloom"> |
| `/shader-preset vignette` | Vignettage | <img src="docs/gifs/vignette.gif" width="200" alt="vignette"> |
| `/shader-preset scanlines` | Lignes de balayage | <img src="docs/gifs/scanlines.gif" width="200" alt="scanlines"> |
| `/shader-preset noise2` | Noise 2 | <img src="docs/gifs/noise2.gif" width="200" alt="noise2"> |
| `/shader-preset cells` | Cellules | <img src="docs/gifs/cells.gif" width="200" alt="cells"> |
| `/shader-preset warp` | Warp | <img src="docs/gifs/warp.gif" width="200" alt="warp"> |
| `/shader-preset radial` | Motif radial | <img src="docs/gifs/radial.gif" width="200" alt="radial"> |
| `/shader-preset lightning2` | Éclair 2 | <img src="docs/gifs/lightning2.gif" width="200" alt="lightning2"> |
| `/shader-preset tornado` | Tornade | <img src="docs/gifs/tornado.gif" width="200" alt="tornado"> |
| `/shader-preset cyclone` | Cyclone | <img src="docs/gifs/cyclone.gif" width="200" alt="cyclone"> |

📖 **Utilisez `/shader-preset` et tapez le nom du shader pour voir l'autocomplete avec tous les 100 shaders disponibles !**

## 🌐 Application Web

Le projet inclut également une **application web complète** (Next.js) déployée sur Vercel avec de nombreuses fonctionnalités :

### ✨ Fonctionnalités Web

- **🎨 Landing Page Professionnelle** : Interface moderne et responsive avec support bilingue (Français/Anglais)
- **📊 Dashboard Utilisateur** : Visualisez tous vos shaders compilés avec authentification Discord OAuth2
- **📚 Guide Complet des Shaders** : Guide professionnel exhaustif pour apprendre GLSL et WGSL avec :
  - Introduction à GLSL/WGSL
  - Fondamentaux (types, variables, manipulation de vecteurs)
  - Techniques 2D (formes géométriques, motifs, distorsions, Voronoi)
  - Techniques 3D (raymarching, éclairage, CSG, transformations)
  - Textures & Sampling (sampling, mélange, distorsion, génération procédurale)
  - Animations Avancées (easing, animations multiples, systèmes de particules)
  - Gradients & Couleurs (gradients linéaires, espaces de couleurs RGB/HSV, palettes)
  - Fonctions Complètes (liste exhaustive de toutes les fonctions GLSL/WGSL)
  - WGSL Spécifique (différences avec GLSL, syntaxe, types, uniforms)
  - **🔄 Convertisseur GLSL→WGSL** : Outil interactif pour convertir automatiquement du code GLSL en WGSL
  - Tips Professionnels (performance, qualité visuelle, debugging, bonnes pratiques)
  - Techniques Avancées (fractales complexes, raymarching avancé, post-processing)
- **🖼️ Galerie de Shaders** : Explorez tous les 100 shaders prédéfinis avec aperçus GIF et code source
- **🌓 Thème Clair/Sombre** : Basculez entre les thèmes clair et sombre avec persistance
- **🌍 Support Bilingue** : Interface complète en Français et Anglais
- **📱 Design Responsive** : Optimisé pour mobile, tablette et desktop

### 🚀 Accès à l'Application Web

- **URL de Production** : [https://glsl-discord-bot.vercel.app](https://glsl-discord-bot.vercel.app)
- **Dashboard** : Connectez-vous avec Discord pour voir vos shaders
- **Guide des Shaders** : Accessible directement sur la landing page

### 📦 Déploiement de l'Application Web

L'application web est déployée sur **Vercel** (gratuit) et se met à jour automatiquement à chaque push sur GitHub.

Pour déployer localement :

```bash
cd web
npm install
cp config/env.local.example .env.local
# Configurer les variables d'environnement (voir web/README.md)
npm run dev
```

Voir `web/README.md` pour plus de détails sur la configuration et le déploiement.

## 🛠️ Technologies

### Bot Discord
- **Node.js** - Runtime JavaScript
- **Discord.js** - API Discord
- **Puppeteer** - Compilation WebGL/WebGPU headless (avec Browser Pool)
- **SQLite3** - Base de données avec index optimisés
- **GIFEncoder** - Génération d'animations GIF
- **Jest** - Tests automatisés
- **Socket.IO** - WebSocket pour progression en temps réel (optionnel)
- **Render.com** - Déploiement cloud (750h/mois gratuites)

### Application Web
- **Next.js** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utilitaire
- **NextAuth.js** - Authentification Discord OAuth2
- **Vercel** - Déploiement cloud (gratuit)

## 📦 Installation

```bash
# Cloner le repository
git clone https://github.com/PlanesZwalker/glsl-discord-bot.git
cd glsl-discord-bot

# Installer les dépendances
npm install

# Configurer l'environnement
cp env.example .env
# Éditer .env avec vos tokens Discord

# Optionnel : Installer Socket.IO pour WebSocket
npm install socket.io

# Lancer les tests
npm test

# Démarrer le bot
npm run bot
```

### Variables d'environnement optionnelles

```env
# Performance
MAX_BROWSER_INSTANCES=2              # Nombre max de browsers dans le pool
MAX_CONCURRENT_COMPILATIONS=2        # Nombre max de compilations simultanées
COMPILATION_TIMEOUT=30000            # Timeout de compilation (ms)

# Cache
SHADER_CACHE_DIR=./cache/shaders     # Répertoire du cache
SHADER_CACHE_MAX_AGE=86400000        # Durée de vie du cache (24h par défaut)
REDIS_URL=redis://localhost:6379     # URL Redis pour cache distribué (optionnel, fallback mémoire)

# Admin
ADMIN_IDS=123456789012345678,987654321098765432  # IDs Discord des administrateurs (séparés par virgules)

# API
BOT_API_KEY=your_secret_api_key_here  # Clé API pour protéger les endpoints (optionnel)

# Webhooks (optionnel)
WEBHOOK_ERROR_URL=https://discord.com/api/webhooks/...      # Webhook pour erreurs
WEBHOOK_COMPILATIONS_URL=https://discord.com/api/webhooks/... # Webhook pour stats compilations
WEBHOOK_ANALYTICS_URL=https://discord.com/api/webhooks/...   # Webhook pour analytics

# Backups (optionnel)
DB_PATH=./data/shaders.db            # Chemin de la base de données
AWS_ACCESS_KEY_ID=your_key           # AWS S3 pour backups cloud (optionnel)
AWS_SECRET_ACCESS_KEY=your_secret    # AWS S3 secret
AWS_REGION=us-east-1                 # Région AWS S3
S3_BUCKET=your-bucket-name           # Nom du bucket S3
```

## 🔧 Configuration

### 1. Créer un bot Discord

1. Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez sur "New Application" et donnez un nom
3. Allez dans l'onglet "Bot" et cliquez sur "Add Bot"
4. **Copiez le token du bot** (vous en aurez besoin)
5. Activez les **Privileged Gateway Intents** :
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT
6. Dans "General Information", copiez l'**Application ID** (Client ID)

### 2. Configurer les variables d'environnement

Créez un fichier `.env` à partir de `env.example` :

```env
DISCORD_TOKEN=votre_token_discord_ici
DISCORD_CLIENT_ID=votre_client_id_ici
DISCORD_PUBLIC_KEY=votre_public_key_ici
WEBGL_CANVAS_WIDTH=800
WEBGL_CANVAS_HEIGHT=600
WEBGL_FRAME_RATE=30
WEBGL_DURATION=3
```

### 3. Inviter le bot sur votre serveur

1. Dans Discord Developer Portal, allez dans "OAuth2" > "URL Generator"
2. Sélectionnez les scopes : `bot`, `applications.commands`
3. Sélectionnez les permissions : Send Messages, Read Message History, Attach Files, Embed Links, Use Slash Commands
4. Copiez l'URL générée et ouvrez-la dans votre navigateur pour inviter le bot

## 🚀 Déploiement sur Render.com

**Render.com est GRATUIT** avec 750 heures/mois - largement suffisant pour un bot Discord !

### ⚠️ Important : Gestion des heures Render.com

**Limites du plan gratuit Render.com** :
- 📊 **750 heures d'instance gratuites par mois** (par espace de travail)
- ⏸️ **Mise en veille automatique** après 15 minutes d'inactivité
- ⏱️ **Délai de réveil** : jusqu'à 1 minute lors du premier réveil
- ⚠️ **Suspension** : Si vous dépassez 750h/mois, tous vos services gratuits sont suspendus jusqu'au mois suivant

**Ne configurez PAS de ping automatique** (comme UptimeRobot toutes les 5 minutes) - cela consommerait toutes vos heures disponibles :
- Ping toutes les 5 minutes = service actif 24/7 = **720h/mois** (96% de votre quota !)

**Le bot se réveille automatiquement** :
- ✅ Lorsqu'une commande Discord est envoyée (le service se réveille automatiquement)
- ✅ Le premier réveil peut prendre jusqu'à 1 minute (normal sur Render.com free tier)
- ✅ Après le réveil, le bot reste actif pendant 15 minutes d'inactivité avant de se remettre en veille

**Endpoints disponibles** (pour réveil manuel si nécessaire) :
- `GET /` - Endpoint racine
- `GET /wake` - Réveiller le serveur manuellement
- `GET /health` - Health check (utilisé par Render.com)
- `GET /ping` - Ping simple

### Étapes de déploiement

1. **Créer un compte Render** : https://render.com (connectez-vous avec GitHub)

2. **Créer un nouveau Web Service** :
   - Cliquez sur "New +" > "Web Service"
   - Connectez votre repository GitHub
   - Sélectionnez le repository `glsl-discord-bot`

3. **Configurer le service** :
   - **Name** : `glsl-discord-bot`
   - **Environment** : `Node` (pas Docker !)
   - **Build Command** : `npm install`
   - **Start Command** : `npm run bot`
   - **Plan** : **Free** ✅

4. **Ajouter les variables d'environnement** :
   - `DISCORD_TOKEN` : Votre token Discord
   - `DISCORD_CLIENT_ID` : Votre Client ID
   - `DISCORD_PUBLIC_KEY` : Votre Public Key (optionnel)

5. **Déployer** : Cliquez sur "Create Web Service"

Le bot sera automatiquement déployé à chaque push sur GitHub !

### Déploiement Local

```bash
# Installer les dépendances
npm install

# Configurer .env (voir env.example)
cp env.example .env
# Éditer .env avec vos tokens Discord

# Démarrer le bot
npm run bot
```


## 📁 Structure du Projet

```
GLSL_DISCORD/
├── commands/            # Commandes slash Discord
│   ├── shader.js        # Commande /shader
│   ├── reuse.js         # Commande /reuse
│   ├── gallery.js       # Commande /gallery
│   ├── stats.js         # Commande /stats
│   └── help.js          # Commande /help
├── docs/                # Documentation complète
│   ├── gifs/            # GIFs des shaders prédéfinis (100 GIFs)
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── SHADER_SUGGESTIONS.md
│   └── ...              # Autres guides
├── tests/               # Tests automatisés (Jest) et scripts de test locaux
│   ├── compiler.test.js         # Tests du compilateur WebGL
│   ├── commands.test.js         # Tests des commandes Discord
│   ├── browser-pool.test.js     # Tests du browser pool
│   ├── shader-cache.test.js     # Tests du cache de shaders
│   ├── utils/                   # Tests des utilitaires
│   │   ├── shaderValidator.test.js  # Tests du validateur de shaders
│   │   ├── rateLimiter.test.js     # Tests du rate limiter
│   │   └── embedBuilder.test.js    # Tests de l'embed builder
│   ├── test-local.js            # Scripts de test locaux
│   ├── test-all-commands.js
│   ├── test-compilation-complete.js
│   └── ...                      # Autres tests
├── docs/                # Documentation
│   ├── API.md                   # Documentation complète de l'API REST
│   └── ...                      # Autres docs
├── src/                 # Code source du bot
│   ├── real-webgl-compiler.js  # Compilateur WebGL/WebGPU
│   ├── simple-database.js      # Base de données avec index optimisés
│   ├── browser-pool.js         # Pool de browsers Puppeteer réutilisables
│   ├── shader-cache.js          # Cache intelligent des shaders
│   ├── metrics.js               # Système de métriques et monitoring
│   ├── webgl-security.js        # Protections WebGL et limites de sécurité
│   ├── shader-queue.js          # Système de queue pour gérer les pics de charge
│   ├── progress-tracker.js      # Suivi de progression des compilations
│   └── utils/                   # Utilitaires professionnels
│       ├── logger.js            # Système de logging structuré
│       ├── errorHandler.js      # Gestion centralisée des erreurs
│       ├── shaderValidator.js    # Validation robuste des shaders
│       ├── rateLimiter.js       # Rate limiting amélioré
│       ├── embedBuilder.js       # Création d'embeds Discord cohérents
│       ├── prometheus.js         # Métriques Prometheus pour Grafana
│       ├── circuitBreaker.js     # Circuit Breaker pour protection contre pannes
│       ├── gracefulShutdown.js   # Arrêt propre du serveur
│       ├── telemetry.js          # Telemetry & APM (spans, métriques)
│       ├── featureFlags.js       # Feature Flags avec rollout progressif
│       ├── webhookManager.js     # Gestion des webhooks Discord
│       ├── cacheManager.js       # Cache intelligent (Redis/Memory)
│       ├── abTesting.js          # Framework A/B Testing
│       ├── backupManager.js      # Sauvegardes automatiques
│       ├── gifOptimizer.js       # Optimisation GIF adaptative
│       └── healthCheck.js        # Health Check avancé
├── routes/               # Routes Express
│   └── admin.js         # Routes admin (feature flags, A/B tests, cache, backups)
├── web/                 # Application web Next.js
│   ├── app/             # Pages et routes API Next.js
│   ├── components/      # Composants React
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── ShaderGuide.tsx    # Guide complet des shaders
│   │   ├── ShaderGallery.tsx  # Galerie de shaders
│   │   ├── DashboardContent.tsx
│   │   └── ...
│   ├── lib/             # Utilitaires et i18n
│   ├── hooks/           # Hooks React personnalisés
│   └── package.json
├── bot.js               # Bot Discord principal (avec serveur Express intégré)
├── render.yaml          # Configuration Render.com
└── package.json         # Dépendances
```

## 🎯 Utilisation

### Compilation de Shader

```glsl
// Exemple de shader simple (GLSL)
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord/iResolution.xy;
    fragColor = vec4(uv, 0.5, 1.0);
}
```

### Shader avec Textures (comme Shadertoy)

```glsl
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord/iResolution.xy;
    vec4 tex0 = texture(iChannel0, uv);
    vec4 tex1 = texture(iChannel1, uv);
    fragColor = mix(tex0, tex1, 0.5);
}
```

Utilisez `/shader` avec les options `texture0`, `texture1`, `texture2`, `texture3` pour spécifier les URLs des textures (optionnel).

### Shaders Prédéfinis

```bash
/shader-preset rainbow          # Arc-en-ciel animé
/shader-preset mandelbrot       # Fractale Mandelbrot
/shader-preset plasma           # Effet plasma
/shader-preset raymarching      # Sphère 3D raymarching
/shader-preset tornado          # Tornade animée
```

💡 **Astuce:** Tapez `/shader-preset` et commencez à taper le nom du shader pour voir l'autocomplete avec tous les 100 shaders disponibles !

### Réutiliser un Shader

```bash
/reuse <id>              # Réutilise un shader par son ID ou son nom
```

Les IDs sont affichés dans la galerie et après chaque compilation. Vous pouvez aussi rechercher par nom avec `/reuse <nom>`.

## 🔒 Sécurité

- **Rate limiting** intégré
- **Validation GLSL/WGSL** stricte
- **Sandboxing** WebGL/WebGPU via Puppeteer
- **Headers CORS** configurés
- **Signature Discord** vérifiée (Ed25519)
- **WebGL Security Limits** : Limites de taille de textures (2048x2048 max), viewport, renderbuffer
- **Draw Call Limits** : Maximum 1000 draw calls par frame
- **Timeouts Stricts** : Protection contre les boucles infinies (30s par défaut)
- **Resource Protection** : Low-power mode forcé, limitations mémoire WebGL

## 📊 API Endpoints

### Endpoints Publics
- `GET /` - Informations sur l'API (réveille le serveur)
- `GET /health` - **Health Check Avancé** (vérifications complètes : DB, Browser Pool, Disk, Memory, Cache, Bot)
- `GET /metrics` - **Métriques de performance JSON** (temps de compilation, taux de succès, statistiques par type de shader, browser pool, cache)
- `GET /metrics/prometheus` - **Métriques Prometheus** (format compatible Grafana)
- `GET /wake` - Réveiller le serveur manuellement (si nécessaire)
- `GET /ping` - Ping simple
- `GET /bot` - Informations du bot
- `POST /discord` - Endpoint Discord (webhook)
- `GET /api/shaders` - Liste des shaders d'un utilisateur (nécessite API key)
- `GET /api/shaders/:id/gif` - GIF d'un shader
- `GET /api/shaders/:id/image` - Première frame d'un shader
- `GET /api/shaders/code/:name` - Code source d'un shader prédéfini
- `GET /terms` - Conditions d'utilisation
- `GET /privacy` - Politique de confidentialité
- `GET /verify` - Vérification de la signature Discord
- `WS /` - **WebSocket** pour progression en temps réel (optionnel, nécessite socket.io)

### Routes Admin (nécessite `ADMIN_IDS` dans headers)
- `GET /admin/feature-flags` - Liste tous les feature flags
- `POST /admin/feature-flags/:flagName` - Modifier un feature flag (enabled, rollout)
- `GET /admin/ab-tests` - Liste tous les tests A/B
- `GET /admin/ab-tests/:experimentName/results` - Résultats d'un test A/B
- `POST /admin/ab-tests/:experimentName/track` - Tracker une conversion A/B
- `GET /admin/telemetry` - Rapport de télémetry détaillé
- `GET /admin/cache/stats` - Statistiques du cache
- `POST /admin/cache/invalidate` - Invalider le cache (pattern)
- `POST /admin/backup` - Créer un backup manuel

📖 **Documentation API complète**: Voir `docs/API.md`

## 📈 Performance & Optimisations

Le bot inclut plusieurs optimisations de performance :

- **⚡ Browser Pool** : Réduction de 70-80% du temps de compilation grâce à la réutilisation des instances Puppeteer
- **💾 Shader Cache** : Réponse quasi-instantanée pour les shaders populaires (cache 24h)
- **📊 Database Indexes** : Requêtes 10-100x plus rapides avec index sur user_id, created_at, preset_name
- **🔄 Queue System** : Gestion intelligente des pics de charge avec priorités et retry automatique
- **📈 Metrics** : Monitoring en temps réel via `GET /metrics` (temps moyen, taux de succès, statistiques par type)
- **📊 Prometheus** : Métriques au format Prometheus (`GET /metrics/prometheus`) pour intégration Grafana
- **🧹 Cleanup Automatique** : Nettoyage automatique des vieux shaders (30 jours) et optimisation DB (VACUUM)
- **💾 WAL Mode** : Write-Ahead Logging activé pour meilleures performances SQLite
- **🎨 GIF Optimizer** : Compression adaptative des GIFs selon la complexité (réduction de 30-50% de la taille)
- **🔌 Cache Manager** : Cache distribué avec Redis (fallback mémoire), TTL intelligent, invalidation par pattern
- **🛡️ Circuit Breaker** : Protection contre les cascades de pannes, retry automatique
- **📦 Backup Automatique** : Sauvegardes quotidiennes (DB + métriques), support S3 pour stockage cloud

## 🧪 Tests

Le projet inclut une suite de tests Jest complète :

```bash
npm test              # Tous les tests
npm run test:watch    # Mode watch
npm run test:coverage # Avec couverture de code (génère rapport HTML)
npm run coverage      # Affiche rapidement le pourcentage de couverture
```

Tests disponibles :
- Tests du compilateur WebGL (détection format, validation, cache)
- Tests des commandes Discord
- Tests du Browser Pool
- Tests du Shader Cache
- Tests des utilitaires (ShaderValidator, RateLimiter, EmbedBuilder)

**Couverture de code** : 
- Utilisez `npm run test:coverage` pour générer un rapport HTML détaillé dans `coverage/index.html`
- Utilisez `npm run coverage` pour afficher rapidement le pourcentage de couverture
- Voir `COVERAGE.md` pour un suivi détaillé de la couverture de code

**Objectif de couverture** : 90% pour toutes les métriques (statements, branches, functions, lines)

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

- **Repository GitHub** : [https://github.com/PlanesZwalker/glsl-discord-bot](https://github.com/PlanesZwalker/glsl-discord-bot)
- **Déploiement Render** : [https://glsl-discord-bot.onrender.com/](https://glsl-discord-bot.onrender.com/)
- **Issues GitHub** : [Créer une issue](https://github.com/PlanesZwalker/glsl-discord-bot/issues)

## 🙏 Remerciements

- **Discord.js** pour l'API Discord
- **Puppeteer** pour la compilation WebGL
- **Render.com** pour l'hébergement cloud gratuit
- **La communauté GLSL** pour l'inspiration

---

**Développé avec ❤️ pour la communauté des shaders GLSL !** 🎨✨
