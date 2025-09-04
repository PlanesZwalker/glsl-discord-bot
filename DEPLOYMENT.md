# 🚀 Guide de Déploiement Vercel - GLSL Discord Bot

## 📋 **Prérequis**

- ✅ Node.js 18+ installé
- ✅ Compte Discord Developer
- ✅ Compte Vercel
- ✅ Git installé

## 🔧 **Étape 1: Configuration Discord**

### 1.1 Créer l'Application Discord
1. Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez "New Application"
3. Donnez un nom à votre bot (ex: "GLSL Shader Bot")

### 1.2 Configurer le Bot
1. Dans le menu de gauche, cliquez "Bot"
2. Cliquez "Add Bot"
3. **IMPORTANT** : Activez ces intents :
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT

### 1.3 Récupérer les Tokens
1. **Bot Token** : Copiez le token (cliquez "Reset Token" si nécessaire)
2. **Client ID** : Notez le Client ID en haut de la page

### 1.4 Inviter le Bot
1. Allez dans "OAuth2" > "URL Generator"
2. Sélectionnez les scopes : `bot`, `applications.commands`
3. Sélectionnez les permissions :
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
4. Copiez l'URL générée et invitez le bot sur votre serveur

## 🌐 **Étape 2: Configuration Vercel**

### 2.1 Installer Vercel CLI
```bash
npm install -g vercel
```

### 2.2 Se connecter à Vercel
```bash
vercel login
```

## ⚙️ **Étape 3: Configuration du Projet**

### 3.1 Créer le fichier .env
```bash
# Copiez env.example vers .env
cp env.example .env
```

### 3.2 Éditer .env
```env
DISCORD_TOKEN=votre_vrai_token_discord
DISCORD_CLIENT_ID=votre_vrai_client_id
```

### 3.3 Installer les dépendances
```bash
npm install
```

## 🚀 **Étape 4: Déploiement**

### 4.1 Déploiement Automatique (Recommandé)
```bash
# Windows
.\deploy-vercel.ps1

# Linux/Mac
./deploy-vercel.sh
```

### 4.2 Déploiement Manuel
```bash
# Nettoyer
npm run clean

# Installer en production
npm install --production

# Déployer
vercel --prod
```

### 4.3 Configuration Vercel
Répondez aux questions :
- **Set up and deploy?** → `Y`
- **Which scope?** → Sélectionnez votre compte
- **Link to existing project?** → `N`
- **What's your project's name?** → `glsl-discord-bot`
- **In which directory is your code located?** → `./`
- **Want to override the settings?** → `N`

## 🔍 **Étape 5: Vérification**

### 5.1 Vérifier le Déploiement
1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Vérifiez que votre projet est déployé
3. Notez l'URL de production (ex: `https://glsl-discord-bot.vercel.app`)

### 5.2 Tester le Bot
1. Allez sur votre serveur Discord
2. Tapez `!shader help`
3. Le bot doit répondre avec l'aide

## 🛠️ **Étape 6: Configuration Avancée**

### 6.1 Variables d'Environnement Vercel
1. Dans Vercel Dashboard, allez dans votre projet
2. Cliquez "Settings" > "Environment Variables"
3. Ajoutez :
   - `DISCORD_TOKEN` = votre token Discord
   - `DISCORD_CLIENT_ID` = votre client ID

### 6.2 Domaine Personnalisé (Optionnel)
1. Dans "Settings" > "Domains"
2. Ajoutez votre domaine personnalisé

## 🔄 **Mises à Jour**

### Mise à Jour du Code
```bash
# Faire vos modifications
git add .
git commit -m "Update bot features"
git push

# Redéployer
vercel --prod
```

### Mise à Jour des Dépendances
```bash
npm update
vercel --prod
```

## 🚨 **Dépannage**

### Bot ne répond pas
- ✅ Vérifiez que le token Discord est correct
- ✅ Vérifiez que les intents sont activés
- ✅ Vérifiez que le bot est invité sur le serveur

### Erreur de déploiement
- ✅ Vérifiez que Node.js 18+ est installé
- ✅ Vérifiez que toutes les dépendances sont installées
- ✅ Vérifiez les logs Vercel

### Erreur WebGL
- ✅ Vercel supporte Puppeteer
- ✅ Vérifiez la configuration Puppeteer dans `production.config.js`

## 📊 **Monitoring**

### Logs Vercel
1. Dans Vercel Dashboard > votre projet
2. Cliquez "Functions" pour voir les logs

### Statistiques Discord
- Utilisez `!shader stats` pour voir les stats du bot
- Surveillez les erreurs dans Discord

## 🎯 **Prochaines Étapes**

- [ ] Configurer un domaine personnalisé
- [ ] Mettre en place un système de monitoring
- [ ] Ajouter des métriques de performance
- [ ] Configurer des alertes Discord

---

**🎉 Félicitations ! Votre bot GLSL Discord est maintenant en ligne sur Vercel !** 🚀
