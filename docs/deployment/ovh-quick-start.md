# Guide de Déploiement Rapide - OVH Pro

## ✅ Votre Configuration Actuelle

D'après votre espace client OVH, vous avez :
- ✅ **Plan Pro** (parfait pour le bot)
- ✅ **250 Go d'espace** (37.68 Go utilisés, largement suffisant)
- ✅ **FTP - SSH** activé
- ✅ **Service actif** jusqu'en février 2026
- ✅ **Datacentre** : eu-west-gra (Gravelines, France)

## 🚀 Installation Rapide

### Étape 1 : Se connecter en SSH

```bash
ssh votre-utilisateur@combox.space
# ou
ssh votre-utilisateur@cluster129.gra.hosting.ovh.net
```

**Si vous ne connaissez pas vos identifiants SSH** :
1. Aller dans votre espace client OVH
2. Hébergement → Votre hébergement → FTP - SSH
3. Voir les identifiants SSH

### Étape 2 : Vérifier Node.js

```bash
node --version
```

**Si Node.js n'est PAS installé** :
1. Ouvrir un ticket support OVH
2. Demander l'installation de Node.js version 20.18.0 ou supérieure
3. Mentionner que c'est pour un bot Discord
4. Généralement installé en 24-48h

**Si Node.js est installé mais version < 20.18.0** :
- Demander la mise à jour via ticket support

### Étape 3 : Cloner le Repository

```bash
cd ~/www  # Ou le répertoire web de votre hébergement
git clone https://github.com/PlanesZwalker/glsl-discord-bot.git
cd glsl-discord-bot
```

### Étape 4 : Installation Automatique

```bash
# Rendre le script exécutable
chmod +x scripts/ovh-minimal-setup.sh

# Exécuter l'installation
./scripts/ovh-minimal-setup.sh
```

Le script va :
- ✅ Vérifier Node.js
- ✅ Vérifier npm
- ✅ Vérifier ffmpeg (optionnel)
- ✅ Créer les répertoires
- ✅ Installer les dépendances
- ✅ Installer Chrome pour Puppeteer
- ✅ Créer le fichier `.env`

### Étape 5 : Configurer le Bot

```bash
# Éditer le fichier .env
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

**Où trouver ces valeurs** :
- [Discord Developer Portal](https://discord.com/developers/applications)
- Application → Bot → Token
- Application → General Information → Application ID et Public Key

### Étape 6 : Tester le Bot

```bash
node bot.js
```

Vous devriez voir :
```
✅ Base de données initialisée
✅ Bot Discord connecté
```

Appuyez sur `Ctrl+C` pour arrêter.

### Étape 7 : Démarrer en Production

#### Option A : PM2 (Recommandé)

```bash
# Installer PM2
npm install -g pm2

# Démarrer le bot
pm2 start ecosystem.config.js

# Sauvegarder la configuration
pm2 save

# Voir les logs
pm2 logs glsl-discord-bot
```

#### Option B : Forever

```bash
npm install -g forever
forever start bot.js
forever list
```

#### Option C : Cron Job (Si processus long-running interdit)

```bash
crontab -e
```

Ajouter :
```
*/30 * * * * cd /chemin/vers/glsl-discord-bot && node bot.js >> logs/cron.log 2>&1
```

## 🔍 Vérification Rapide

Exécuter le script de vérification :

```bash
chmod +x scripts/ovh-check.sh
./scripts/ovh-check.sh
```

## 📊 Espace Disque

Vous avez **37.68 Go / 250 Go utilisés**.

Le bot nécessite environ **500MB-1GB** :
- node_modules : ~200MB
- Chrome/Puppeteer : ~300MB
- Fichiers générés : variable (nettoyage automatique pour free users)

**Vous avez largement assez d'espace !** ✅

## 🆘 Support

Si vous rencontrez des problèmes :

1. **Node.js non installé** : Ticket support OVH
2. **ffmpeg non installé** : Ticket support OVH (optionnel)
3. **Problèmes d'installation** : Voir [ovh-shared-hosting.md](ovh-shared-hosting.md)
4. **Erreurs du bot** : Vérifier les logs (`pm2 logs` ou `logs/bot.log`)

## 📝 Checklist

- [ ] Connexion SSH réussie
- [ ] Node.js installé (version 20.18.0+)
- [ ] Repository cloné
- [ ] Script d'installation exécuté
- [ ] Fichier `.env` configuré
- [ ] Test de démarrage réussi
- [ ] Bot démarré en production (PM2/Forever/Cron)
- [ ] Bot répond aux commandes Discord

---

**Vous êtes prêt !** 🚀

