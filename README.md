# GLSL Discord Bot 🎨

Bot Discord professionnel pour compiler et animer des shaders GLSL en temps réel avec WebGL.

## ✨ Fonctionnalités

- **Compilation WebGL Réelle** : Utilise Puppeteer pour une vraie compilation GLSL
- **Animations de 3 secondes** : Création d'animations à 30 FPS
- **Base de données SQLite** : Stockage des shaders et statistiques
- **Galerie de shaders** : Partage et découverte de shaders
- **Recherche avancée** : Trouvez des shaders par mots-clés
- **API REST complète** : Endpoints pour intégration externe

## 🚀 Commandes Discord

- `!shader help` - Afficher l'aide
- `!shader <code>` - Compiler un shader GLSL
- `!shader animate <code>` - Créer une animation
- `!shader smartia` - Afficher le shader SMARTIA prédéfini
- `!shader gallery` - Voir les shaders populaires
- `!shader search <query>` - Rechercher des shaders
- `!shader stats` - Statistiques du bot

## 🛠️ Technologies

- **Node.js** - Runtime JavaScript
- **Discord.js** - API Discord
- **Puppeteer** - Compilation WebGL headless
- **SQLite3** - Base de données
- **Vercel** - Déploiement serverless

## 📦 Installation

```bash
# Cloner le repository
git clone https://github.com/yourusername/glsl-discord-bot.git
cd glsl-discord-bot

# Installer les dépendances
npm install

# Configurer l'environnement
cp env.example .env
# Éditer .env avec vos tokens Discord

# Démarrer le bot
npm start
```

## 🔧 Configuration

### Variables d'environnement (.env)

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
WEBGL_CANVAS_WIDTH=800
WEBGL_CANVAS_HEIGHT=600
WEBGL_FRAME_RATE=30
WEBGL_DURATION=3
```

### Discord Developer Portal

1. Créez une application Discord
2. Activez les intents : `MESSAGE CONTENT INTENT`, `SERVER MEMBERS INTENT`
3. **Interactions Endpoint URL** : `https://your-vercel-url.vercel.app/discord`

## 🚀 Déploiement

### Vercel (Recommandé)

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel --prod
```

### Manuel

```bash
# Build
npm run build

# Démarrage
npm start
```

## 📁 Structure du Projet

```
GLSL_DISCORD/
├── api/                 # Endpoints Vercel
│   ├── discord.js      # Endpoint Discord principal
│   └── test.js         # Endpoint de test
├── src/                 # Code source du bot
│   ├── index.js        # Bot principal
│   ├── real-webgl-compiler.js  # Compilateur WebGL
│   └── simple-database.js      # Base de données
├── public/              # Fichiers statiques
│   ├── robots.txt      # Protection robots
│   └── security.txt    # Politique de sécurité
├── vercel.json         # Configuration Vercel
└── package.json        # Dépendances
```

## 🎯 Utilisation

### Compilation de Shader

```glsl
// Exemple de shader simple
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord/iResolution.xy;
    float t = iTime;
    
    vec3 col = 0.5 + 0.5*cos(t+uv.xyx+vec3(0,2,4));
    fragColor = vec4(col, 1.0);
}
```

### Animation

```bash
!shader animate <code_glsl>
```

## 🔒 Sécurité

- **Rate limiting** intégré
- **Validation GLSL** stricte
- **Sandboxing** WebGL
- **Protection robots.txt**
- **Headers CORS** configurés

## 📊 API Endpoints

- `GET /` - Informations sur l'API
- `GET /health` - Statut de santé
- `GET /bot` - Informations du bot
- `POST /discord` - Endpoint Discord
- `GET /terms` - Conditions d'utilisation
- `GET /privacy` - Politique de confidentialité

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

- **Issues GitHub** : [Créer une issue](https://github.com/yourusername/glsl-discord-bot/issues)
- **Discord** : Rejoignez notre serveur de support
- **Documentation** : [Wiki du projet](https://github.com/yourusername/glsl-discord-bot/wiki)

## 🙏 Remerciements

- **Discord.js** pour l'API Discord
- **Puppeteer** pour la compilation WebGL
- **Vercel** pour l'hébergement serverless
- **La communauté GLSL** pour l'inspiration

---

**Développé avec ❤️ pour la communauté des shaders GLSL !** 🎨✨
