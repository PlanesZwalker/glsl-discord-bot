# ShaderBot 🎨

**Compilateur de Shaders GLSL/WGSL pour Discord** - Bot professionnel pour compiler et animer des shaders en temps réel avec WebGL/WebGPU, génération de GIFs animés, 100 shaders prédéfinis et application web complète.

## ✨ Fonctionnalités

### Bot Discord
- **Compilation WebGL/WebGPU Réelle** : Compile vos shaders GLSL/WGSL personnalisés
- **Animations GIF** : Création d'animations de 2-10 secondes à 30 FPS selon votre plan
- **100 Shaders Prédéfinis** : Effets animés, fractales, 3D, naturels, géométriques, spatiaux et visuels avancés
- **Support Textures** : Utilisation de `iChannel0-3` comme sur Shadertoy
- **Génération via paramètres** : Créez des shaders sans coder en choisissant forme, couleur et animation
- **Base de données** : Tous vos shaders sont sauvegardés et réutilisables
- **Système de Plans** : Free, Pro et Studio avec fonctionnalités différenciées
- **Priorité de Compilation** : Les utilisateurs Pro/Studio bénéficient d'une priorité dans la queue
- **Export MP4** : Export vidéo MP4 pour les utilisateurs premium (Pro/Studio)
- **API pour Développeurs** : API REST complète pour les utilisateurs Studio

### Application Web
- **🌐 Landing Page Professionnelle** : Interface moderne avec support bilingue (FR/EN)
- **📊 Dashboard Utilisateur** : Visualisez tous vos shaders avec authentification Discord
- **📚 Guide Complet des Shaders** : Guide professionnel exhaustif GLSL/WGSL avec convertisseur intégré
- **🖼️ Galerie Interactive** : Explorez les 100 shaders prédéfinis avec aperçus et code source
- **🌓 Thème Clair/Sombre** : Basculez entre les thèmes avec persistance

**URL de l'application web** : [https://glsl-discord-bot.vercel.app](https://glsl-discord-bot.vercel.app)

## 🚀 Commandes Discord

### Commandes Slash

- `/help` - Afficher l'aide complète
- `/shader <code> [texture0] [texture1] [texture2] [texture3]` - Compiler un shader GLSL ou WGSL personnalisé (génère un GIF animé, textures optionnelles)
- `/shader-preset <preset>` - Compiler un shader prédéfini parmi les 100 disponibles (autocomplete disponible). Les utilisateurs free reçoivent directement les GIFs précompilés pour une réponse instantanée !
- `/shader-generate` - Générer un shader via paramètres (forme, couleur, animation)
- `/shader-code <name>` - Afficher le code source d'un shader prédéfini

### Shaders Prédéfinis (100 disponibles)

Utilisez `/shader-preset <nom>` pour compiler un shader prédéfini (ex: `/shader-preset rainbow`) :

#### 🎨 Effets Animés
- `rainbow` - Arc-en-ciel animé rotatif
- `spiral` - Spirale multicolore animée
- `plasma` - Effet plasma coloré animé
- `tunnel` - Effet tunnel rotatif
- `starfield` - Champ d'étoiles animé
- `gradient` - Dégradé animé
- `sine` - Ondes sinusoïdales
- `waves` - Vagues animées
- `rings` - Anneaux concentriques

#### 🌊 Effets Naturels
- `water` - Ondes aquatiques avec reflets
- `fire` - Effet de feu animé
- `smoke` - Fumée montante
- `snow` - Neige
- `clouds` - Nuages
- `lava` - Lampe à lave
- `aurora` - Aurore boréale
- `rain` - Pluie
- `thunder` - Tonnerre
- `storm` - Tempête

#### 🌀 Fractales
- `mandelbrot` - Fractale Mandelbrot avec zoom
- `mandelbulb` - Fractale 3D Mandelbulb (4 variations disponibles)
- `julia` - Fractale Julia Set
- `fractal` - Fractale animée
- `tree` - Arbre réaliste avec feuilles détaillées

#### 🎯 Effets 3D
- `raymarching` - Sphère 3D avec raymarching
- `metaballs` - Sphères qui fusionnent
- `crystal` - Cristal
- `bubbles` - Bulles

#### 🔷 Effets Géométriques
- `voronoi` - Diagramme de Voronoi animé
- `hexagon` - Motif hexagonal animé
- `grid` - Grille animée
- `maze` - Labyrinthe généré
- `heart` - Cœur réaliste avec pulsation
- `diamond` - Diamant
- `star` - Étoile
- Et bien plus...

#### 🌌 Effets Spatiaux
- `galaxy` - Galaxie spirale
- `nebula` - Nébuleuse
- `sun` - Soleil
- `moon` - Lune réaliste avec cratères
- `planet` - Planète réaliste avec continents
- `asteroid` - Astéroïdes 3D réalistes
- `blackhole` - Trou Noir
- `wormhole` - Trou de Ver

#### ⚡ Effets Visuels Avancés
- `noise` - Noise/Perlin noise multi-octave
- `kaleidoscope` - Kaléidoscope rotatif
- `particles` - Système de particules
- `matrix` - Pluie de code Matrix
- `electric` - Éclairs/orage
- `glitch` - Effet Glitch
- `bloom` - Effet Bloom
- Et bien plus...

💡 **Astuce:** Tapez `/shader-preset` et commencez à taper le nom du shader pour voir l'autocomplete avec tous les 100 shaders disponibles !

## 🎯 Utilisation

### Compilation de Shader Personnalisé

```glsl
// Exemple de shader simple (GLSL)
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord/iResolution.xy;
    fragColor = vec4(uv, 0.5, 1.0);
}
```

Utilisez la commande `/shader` avec votre code :

```
/shader void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord/iResolution.xy;
    fragColor = vec4(uv, 0.5, 1.0);
}
```

**Note** : La résolution et la durée de l'animation dépendent de votre plan :
- **Free** : 320x240, 2 secondes, avec watermark
- **Pro** : 1920x1080, jusqu'à 10 secondes, sans watermark, export MP4
- **Studio** : 3840x2160, jusqu'à 10 secondes, sans watermark, export MP4 + multi-format

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

### Génération de Shader sans Coder

Utilisez `/shader-generate` pour créer un shader en choisissant :
- **Shape** : Circle, Square, Triangle, Star, Heart, Hexagon, Diamond, Line, Grid, Voronoi
- **Color** : Red, Green, Blue, Yellow, Purple, Orange, Pink, Cyan, White, Black, Rainbow gradient, Warm gradient, Cool gradient
- **Animation** : Rotation, Pulse, Wave, Zoom, Translate, Color shift, Twinkle, None
- **Speed** : Slow, Normal, Fast (optionnel)
- **Size** : 1-10 (optionnel, défaut: 5)

### Réutiliser un Shader

Après avoir compilé un shader, vous recevrez un ID. Utilisez cet ID pour réutiliser le shader plus tard. Les IDs sont également affichés dans la galerie et sur le dashboard web.

## 🌐 Application Web

### Accès
- **URL** : [https://glsl-discord-bot.vercel.app](https://glsl-discord-bot.vercel.app)
- **Dashboard** : Connectez-vous avec Discord pour voir tous vos shaders
- **Guide des Shaders** : Accessible directement sur la landing page
- **Galerie** : Explorez tous les 100 shaders prédéfinis

### Fonctionnalités Web
- **Dashboard Personnel** : Visualisez tous vos shaders compilés avec authentification Discord OAuth2
- **Guide Complet** : Apprenez GLSL/WGSL avec un guide professionnel exhaustif incluant :
  - Introduction à GLSL/WGSL
  - Fondamentaux (types, variables, manipulation de vecteurs)
  - Techniques 2D et 3D
  - Textures & Sampling
  - Animations Avancées
  - Gradients & Couleurs
  - Fonctions Complètes
  - **Convertisseur GLSL→WGSL** : Outil interactif pour convertir automatiquement du code GLSL en WGSL
  - Tips Professionnels
- **Galerie Interactive** : Explorez les 100 shaders prédéfinis avec aperçus GIF et code source
- **Support Bilingue** : Interface complète en Français et Anglais
- **Thème Clair/Sombre** : Basculez entre les thèmes avec persistance

## 💎 Plans et Tarification

ShaderBot propose trois plans pour répondre à tous les besoins :

### 🆓 Plan Free
- **5 compilations/jour**
- **10 presets/jour** (GIFs précompilés pour performance optimale)
- **Résolution** : 320x240
- **Durée GIF** : 2 secondes
- **Watermark** : Oui
- **Stockage** : 7 jours (nettoyage automatique)
- **Prix** : Gratuit

### ⚡ Plan Pro (4,99€/mois)
- **Compilations illimitées**
- **Presets illimités**
- **Résolution** : HD (1920x1080)
- **Durée GIF** : Jusqu'à 10 secondes
- **Watermark** : Non
- **Stockage** : Cloud illimité
- **Export MP4** : Oui
- **Priorité de compilation** : Oui

### 🚀 Plan Studio (14,99€/mois)
- **Tout du plan Pro** +
- **Résolution** : 4K (3840x2160)
- **API pour développeurs** : 100 requêtes/jour
- **Export multi-format** : GIF, MP4, WebP, PNG
- **Support prioritaire**

Visitez la [page de tarification](https://glsl-discord-bot.vercel.app/pricing) pour plus de détails.

## 🔌 API pour Développeurs (Studio Plan)

Les utilisateurs avec le plan Studio ont accès à une API REST complète pour intégrer ShaderBot dans leurs applications.

### Authentification
Utilisez votre clé API dans le header :
```
X-API-Key: glsl_votre_cle_api
```
ou
```
Authorization: Bearer glsl_votre_cle_api
```

### Endpoints Disponibles

#### POST `/api/v1/compile`
Compile un shader via l'API.

**Requête :**
```json
{
  "code": "void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(1.0, 0.0, 0.0, 1.0); }",
  "name": "Mon Shader",
  "format": "gif"
}
```

**Réponse :**
```json
{
  "success": true,
  "shaderId": 123,
  "gifUrl": "/path/to/animation.gif",
  "metadata": {
    "frames": 60,
    "duration": 2.0,
    "resolution": "1920x1080"
  }
}
```

#### GET `/api/v1/stats`
Obtenir les statistiques de votre clé API (rate limit, etc.)

#### GET `/api/v1/presets`
Liste tous les presets disponibles

### Rate Limiting
- **Limite** : 100 requêtes/jour
- **Réinitialisation** : Tous les jours à minuit UTC

## 📖 Documentation

### Guide des Shaders
Le guide complet est disponible sur l'application web : [Guide GLSL/WGSL](https://glsl-discord-bot.vercel.app)

### Support
- **Repository GitHub** : [https://github.com/PlanesZwalker/glsl-discord-bot](https://github.com/PlanesZwalker/glsl-discord-bot)
- **Issues GitHub** : [Créer une issue](https://github.com/PlanesZwalker/glsl-discord-bot/issues)

## 🙏 Remerciements

- **Discord.js** pour l'API Discord
- **Puppeteer** pour la compilation WebGL
- **La communauté GLSL** pour l'inspiration

---

**Développé avec ❤️ pour la communauté des shaders GLSL !** 🎨✨
