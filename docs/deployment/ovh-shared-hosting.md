# Déploiement sur Serveur Mutualisé OVH

## ✅ Compatibilité

Un serveur mutualisé OVH peut **parfaitement** héberger le bot Discord !

### Prérequis Minimum (Fonctionnel)

- ✅ **Node.js** (version 20.18.0 ou supérieure) - **NÉCESSAIRE**
- ✅ **Accès SSH** - **NÉCESSAIRE**
- ⚠️ **Processus long-running** - **Recommandé** (alternatives disponibles)
- ⚠️ **ffmpeg** - **Optionnel** (le bot fonctionne sans, mais sans export MP4/WebP)

### Si vous n'avez pas ces prérequis

**Pas de problème !** Le bot peut fonctionner en **mode dégradé** :
- ✅ Compilation de shaders (GIF) : **Fonctionne**
- ✅ Commandes Discord : **Fonctionnes**
- ✅ Base de données : **Fonctionne**
- ⚠️ Export MP4/WebP : **Désactivé** (si ffmpeg manquant)
- ⚠️ Processus long-running : **Alternatives disponibles** (voir ci-dessous)

## 🔍 Vérification et Installation des Prérequis

### 1. Node.js (NÉCESSAIRE)

#### Vérifier si Node.js est installé

```bash
node --version
# Doit afficher v20.18.0 ou supérieur
```

#### Si Node.js n'est PAS installé

**Option A : Demander au support OVH** (Recommandé)
- Ouvrir un ticket support OVH
- Demander l'installation de Node.js version 20.18.0 ou supérieure
- Généralement installé en 24-48h

**Option B : Installer via NodeSource** (Si vous avez les permissions)
```bash
# Pour Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier
node --version
npm --version
```

**Option C : Utiliser NVM (Node Version Manager)** (Si disponible)
```bash
# Installer NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Installer Node.js 20
nvm install 20
nvm use 20
```

#### Si la version est trop ancienne

```bash
# Mettre à jour via NodeSource (si permissions)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. npm (Généralement inclus avec Node.js)

```bash
npm --version
```

Si npm n'est pas installé :
```bash
# npm est généralement inclus avec Node.js
# Si manquant, réinstaller Node.js
```

### 3. Accès SSH (NÉCESSAIRE)

#### Vérifier l'accès SSH

```bash
# Depuis votre machine locale
ssh votre-utilisateur@votre-serveur.ovh.net
```

#### Si vous n'avez PAS d'accès SSH

**Option A : Activer SSH via le panel OVH**
1. Se connecter à votre espace client OVH
2. Aller dans "Hébergement" → Votre hébergement
3. Activer l'accès SSH (généralement disponible sur les offres mutualisées)

**Option B : Utiliser le File Manager OVH**
- Moins pratique, mais possible
- Upload des fichiers via FTP/SFTP
- Exécution via cron jobs

### 4. ffmpeg (OPTIONNEL - Mode dégradé disponible)

#### Vérifier ffmpeg

```bash
ffmpeg -version
```

#### Si ffmpeg n'est PAS installé

**Le bot fonctionnera quand même !** Mais :
- ✅ Compilation de shaders (GIF) : **Fonctionne**
- ✅ Commandes Discord : **Fonctionnent**
- ❌ Export MP4 : **Désactivé** (fonctionnalité Pro/Studio)
- ❌ Export WebP : **Désactivé** (fonctionnalité Studio)

**Pour installer ffmpeg** (si vous le souhaitez) :
```bash
# Demander au support OVH (recommandé)
# Ou si vous avez les permissions :
sudo apt-get update
sudo apt-get install -y ffmpeg
```

### 5. Processus Long-Running (OPTIONNEL - Alternatives disponibles)

Sur certains hébergements mutualisés, les processus long-running peuvent être limités.

**Alternatives** :
1. **PM2** (recommandé) - Gère automatiquement les redémarrages
2. **Cron jobs** - Redémarrer le bot toutes les heures
3. **Forever** - Alternative légère à PM2
4. **Supervisor** - Si disponible sur OVH

Voir la section "Démarrage Automatique" ci-dessous.

### 4. Vérifier l'espace disque

```bash
df -h
```

Le bot nécessite environ **500MB-1GB** d'espace pour :
- node_modules
- Chrome/Puppeteer
- Fichiers générés (GIFs, MP4s, frames)

## 📦 Installation

### 🚀 Installation Rapide (Script Automatique)

**Pour une installation rapide avec vérification automatique** :

```bash
# Se connecter en SSH
ssh votre-utilisateur@votre-serveur.ovh.net

# Cloner le repository
cd ~/www  # Ou le répertoire web de votre hébergement
git clone https://github.com/PlanesZwalker/glsl-discord-bot.git
cd glsl-discord-bot

# Exécuter le script d'installation minimal
chmod +x scripts/ovh-minimal-setup.sh
./scripts/ovh-minimal-setup.sh
```

Le script va :
- ✅ Vérifier Node.js (et vous dire comment l'installer si manquant)
- ✅ Vérifier npm
- ✅ Vérifier ffmpeg (optionnel)
- ✅ Créer les répertoires nécessaires
- ✅ Installer les dépendances
- ✅ Installer Chrome pour Puppeteer
- ✅ Créer le fichier `.env` si manquant

**Puis suivez les instructions affichées** pour configurer `.env` et démarrer le bot.

### 📋 Installation Manuelle (Étape par Étape)

### Étape 1 : Se connecter en SSH

```bash
ssh votre-utilisateur@votre-serveur.ovh.net
```

### Étape 2 : Cloner le repository

```bash
cd ~/www  # Ou le répertoire web de votre hébergement
git clone https://github.com/PlanesZwalker/glsl-discord-bot.git
cd glsl-discord-bot
```

### Étape 3 : Installer les dépendances

```bash
# Installer les dépendances npm
npm install --production

# Installer Chrome pour Puppeteer
PUPPETEER_SKIP_DOWNLOAD=true npm install
npx puppeteer browsers install chrome
```

### Étape 4 : Configurer les variables d'environnement

```bash
# Copier le fichier d'exemple
cp config/env.bot.example .env

# Éditer avec nano ou vim
nano .env
```

Configurer au minimum :
```env
DISCORD_TOKEN=votre_token_discord
DISCORD_CLIENT_ID=votre_client_id
DISCORD_PUBLIC_KEY=votre_public_key
NODE_ENV=production
PORT=8080
```

### Étape 5 : Tester le bot

```bash
node bot.js
```

Si tout fonctionne, vous verrez :
```
✅ Base de données initialisée
✅ Bot Discord connecté
```

Appuyez sur `Ctrl+C` pour arrêter.

## 🚀 Démarrage Automatique

### Option 1 : PM2 (Recommandé - Si processus long-running autorisé)

PM2 est **recommandé** pour gérer le processus en production.

#### Installation de PM2

```bash
npm install -g pm2
```

**Si l'installation globale échoue** (permissions insuffisantes) :
```bash
# Installer localement
npm install pm2 --save-dev

# Utiliser avec npx
npx pm2 start ecosystem.config.js
```

#### Si PM2 ne peut pas démarrer automatiquement

PM2 nécessite des permissions root pour `pm2 startup`. Sur un serveur mutualisé, vous pouvez :
1. Utiliser un cron job pour redémarrer PM2
2. Utiliser `forever` à la place
3. Utiliser un script de redémarrage manuel

### Configuration PM2

Créer `ecosystem.config.js` :

```javascript
module.exports = {
  apps: [{
    name: 'glsl-discord-bot',
    script: 'bot.js',
    cwd: '/chemin/vers/votre/projet',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### Démarrer avec PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Suivre les instructions pour le démarrage automatique
```

### Commandes PM2 utiles

```bash
pm2 status          # Voir le statut
pm2 logs            # Voir les logs
pm2 restart glsl-discord-bot  # Redémarrer
pm2 stop glsl-discord-bot      # Arrêter
pm2 delete glsl-discord-bot    # Supprimer
```

### Option 2 : Forever (Plus Léger - Si PM2 ne fonctionne pas)

Si PM2 n'est pas disponible ou ne peut pas démarrer automatiquement :

```bash
npm install -g forever
# Ou localement :
npm install forever --save-dev
npx forever start bot.js

forever list
forever stop 0
```

### Option 3 : Cron Job (Si processus long-running interdit)

Si les processus long-running sont interdits, utiliser un cron job pour redémarrer régulièrement :

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne pour redémarrer toutes les heures
0 * * * * cd /chemin/vers/votre/projet && node bot.js >> logs/cron.log 2>&1

# Ou toutes les 30 minutes
*/30 * * * * cd /chemin/vers/votre/projet && node bot.js >> logs/cron.log 2>&1
```

**Note** : Le bot redémarrera automatiquement à chaque exécution du cron. Assurez-vous que le bot peut démarrer rapidement.

### Option 4 : Script de Redémarrage Manuel

Créer un script `restart-bot.sh` :

```bash
#!/bin/bash
cd /chemin/vers/votre/projet
pkill -f "node bot.js" 2>/dev/null
sleep 2
node bot.js > logs/bot.log 2>&1 &
```

L'exécuter manuellement ou via cron.

## 📁 Structure des Répertoires Recommandée

```
~/www/
├── glsl-discord-bot/          # Votre projet
│   ├── bot.js
│   ├── package.json
│   ├── .env                    # Variables d'environnement
│   ├── storage/                # Fichiers générés
│   │   ├── frames/
│   │   ├── gifs/
│   │   ├── mp4s/
│   │   └── cache/
│   └── data/
│       └── shaders.db
└── logs/                       # Logs PM2 (optionnel)
```

## 🔧 Configuration OVH Spécifique

### Permissions des Répertoires

```bash
# Donner les permissions d'écriture
chmod -R 755 storage/
chmod -R 755 data/
mkdir -p logs
chmod -R 755 logs/
```

### Variables d'Environnement OVH

Sur OVH, vous pouvez définir des variables d'environnement dans `.ovhconfig` ou directement dans `.env`.

### Port et Health Check

Le bot écoute sur le port défini dans `PORT` (défaut: 8080).

Pour le health check, configurez dans OVH :
- **URL de health check** : `http://votre-domaine.com:8080/health`
- **Intervalle** : 30 secondes

## 🛠️ Dépannage

### Problème : "Cannot find module"

```bash
# Réinstaller les dépendances
rm -rf node_modules
npm install --production
```

### Problème : "Puppeteer Chrome not found"

```bash
# Réinstaller Chrome
npx puppeteer browsers install chrome

# Si ça échoue, vérifier l'espace disque
df -h
```

### Problème : "Permission denied"

```bash
# Vérifier les permissions
ls -la
chmod +x bot.js
chmod -R 755 storage/ data/ logs/
```

### Problème : Processus qui s'arrête

**Si processus long-running interdit** :
- Utiliser un cron job (voir Option 3 ci-dessus)
- Ou utiliser `forever` avec redémarrage automatique

**Vérifier les logs** :
```bash
pm2 logs glsl-discord-bot
# ou
tail -f logs/pm2-error.log
# ou
tail -f logs/bot.log
```

### Problème : Port déjà utilisé

Changer le port dans `.env` :
```env
PORT=8081
```

### Problème : "FFmpeg not found" (Export MP4/WebP)

**Ce n'est PAS une erreur bloquante !** Le bot fonctionne sans ffmpeg :
- ✅ Compilation GIF : **Fonctionne**
- ❌ Export MP4 : **Désactivé** (fonctionnalité Pro/Studio)
- ❌ Export WebP : **Désactivé** (fonctionnalité Studio)

Pour activer les exports MP4/WebP :
1. Contacter le support OVH pour installer ffmpeg
2. Ou installer localement si vous avez les permissions

### Problème : Node.js version trop ancienne

```bash
# Vérifier la version
node --version

# Si < 20.18.0, contacter le support OVH
# Ou utiliser NVM si disponible (voir section Installation)
```

### Problème : Pas d'accès SSH

**Alternatives** :
1. Activer SSH via le panel OVH
2. Utiliser FTP/SFTP pour uploader les fichiers
3. Utiliser le File Manager OVH
4. Exécuter via cron jobs (si disponible)

## 📊 Monitoring

### Vérifier l'utilisation des ressources

```bash
pm2 monit
# ou
top
```

### Vérifier les logs

```bash
# Logs PM2
pm2 logs glsl-discord-bot --lines 100

# Logs du bot
tail -f storage/logs/*.log
```

## 🔐 Sécurité

### 1. Protéger le fichier .env

```bash
chmod 600 .env
```

### 2. Ne pas versionner .env

Le fichier `.gitignore` exclut déjà `.env`.

### 3. Firewall OVH

Assurez-vous que le port utilisé (8080) est autorisé dans le firewall OVH.

## 🔄 Mise à Jour

```bash
# Arrêter le bot
pm2 stop glsl-discord-bot

# Mettre à jour le code
git pull origin master

# Réinstaller les dépendances si nécessaire
npm install --production

# Redémarrer
pm2 restart glsl-discord-bot
```

## 📝 Checklist de Déploiement

- [ ] Node.js 20.18.0+ installé
- [ ] npm installé
- [ ] ffmpeg installé
- [ ] Accès SSH configuré
- [ ] Repository cloné
- [ ] Dépendances installées (`npm install`)
- [ ] Chrome Puppeteer installé
- [ ] Variables d'environnement configurées (`.env`)
- [ ] Test de démarrage réussi (`node bot.js`)
- [ ] PM2 installé et configuré
- [ ] Bot démarré avec PM2
- [ ] Health check fonctionnel (`/health`)
- [ ] Test d'une commande Discord
- [ ] Logs vérifiés

## 🆘 Support OVH

Si vous rencontrez des problèmes spécifiques à OVH :

1. **Support OVH** : Vérifier la documentation OVH pour Node.js
2. **Limites** : Vérifier les limites de votre offre (CPU, RAM, processus)
3. **Logs OVH** : Consulter les logs système OVH

## 💡 Optimisations pour Serveur Mutualisé

### Réduire la consommation mémoire

Dans `.env` :
```env
MAX_BROWSER_INSTANCES=1
MAX_CONCURRENT_COMPILATIONS=1
```

### Limiter la taille des fichiers

```env
WEBGL_CANVAS_WIDTH=800
WEBGL_CANVAS_HEIGHT=600
```

### Nettoyage automatique

Le bot nettoie automatiquement les anciens shaders (configuré dans `CLEANUP_INTERVAL_HOURS`).

## ✅ Avantages d'OVH Mutualisé

- ✅ **Coût fixe** (pas de surprise)
- ✅ **Support technique** OVH
- ✅ **Sécurité** gérée par OVH
- ✅ **Backups** automatiques (selon offre)
- ✅ **SSL/HTTPS** inclus
- ✅ **Pas de limite de temps** d'exécution

## ⚠️ Limitations Potentielles

- ⚠️ **RAM limitée** (selon offre) - Optimiser avec les variables ci-dessus
- ⚠️ **CPU partagé** - Peut être plus lent pendant les pics
- ⚠️ **Pas de Docker** - Installation manuelle nécessaire
- ⚠️ **Pas de root** - Certaines installations peuvent nécessiter le support

---

**Votre serveur mutualisé OVH est parfaitement adapté pour héberger le bot Discord !** 🚀

