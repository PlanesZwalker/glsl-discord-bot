# 🚀 Déploiement Google Cloud Run - GLSL Discord Bot

## 📋 Prérequis

### 1. Compte Google Cloud
- Créer un compte sur [Google Cloud Console](https://console.cloud.google.com/)
- Activer la facturation (carte de crédit requise pour vérification)
- **⚠️ IMPORTANT :** Tu ne seras PAS débité, c'est juste pour vérification

### 2. Google Cloud CLI
- Installer [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
- Ou utiliser le terminal intégré de Google Cloud Console

## 🎯 Déploiement Automatique

### Option 1 : Déploiement via GitHub (Recommandé)

#### 1. Pousser le code sur GitHub
```bash
git add .
git commit -m "🚀 Préparation Cloud Run"
git push origin main
```

#### 2. Dans Google Cloud Console
- Aller sur [Cloud Run](https://console.cloud.google.com/run)
- Cliquer "CREATE SERVICE"
- Choisir "Continuously deploy from a repository"
- Connecter ton repository GitHub
- Sélectionner la branche `main`
- Cliquer "CREATE"

### Option 2 : Déploiement Manuel via CLI

#### 1. Installer les dépendances
```bash
npm install
```

#### 2. Se connecter à Google Cloud
```bash
gcloud auth login
gcloud config set project [TON_PROJECT_ID]
```

#### 3. Déployer sur Cloud Run
```bash
npm run deploy:cloudrun
```

## 🌐 Configuration Discord

### 1. Obtenir l'URL Cloud Run
Après le déploiement, tu auras une URL comme :
```
https://glsl-discord-bot-xxxxx-uc.a.run.app
```

### 2. Configurer Discord Developer Portal
- **Interactions Endpoint URL :**
```
https://glsl-discord-bot-xxxxx-uc.a.run.app/discord
```

## ✅ Avantages Cloud Run

- **💰 100% gratuit** pour ton usage
- **🌐 Endpoints publics** (pas d'authentification)
- **⚡ Déploiement automatique** depuis GitHub
- ** Très stable** et professionnel
- **📊 Monitoring gratuit** inclus

## 🔧 Test de l'Endpoint

### Test GET
```bash
curl https://glsl-discord-bot-xxxxx-uc.a.run.app/discord
```

### Test POST (Discord)
```bash
curl -X POST https://glsl-discord-bot-xxxxx-uc.a.run.app/discord \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Réponse attendue :** `{"type": 1}`

## 🎉 Résultat Final

- **✅ Endpoint Discord public** et accessible
- **✅ Pas d'authentification** forcée
- **✅ Validation Discord** réussie
- **✅ Bot fonctionnel** en production

## 🆘 Support

Si tu rencontres des problèmes :
1. Vérifier les logs dans Google Cloud Console
2. Tester l'endpoint localement avec `npm run dev`
3. Vérifier que le port 8080 est libre

---

**🚀 Ton bot Discord sera bientôt en ligne sur Google Cloud Run !**
