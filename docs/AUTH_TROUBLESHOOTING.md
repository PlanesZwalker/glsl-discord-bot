# 🔐 Guide de Dépannage : Authentification Discord

## Erreurs Courantes et Solutions

### 1. Erreur "Configuration"

**Symptômes** :
- Message : "NextAuth configuration error"
- L'authentification ne démarre pas

**Causes possibles** :
- Variables d'environnement manquantes
- Variables mal configurées dans Vercel

**Solution** :
1. Vérifiez que toutes ces variables sont définies dans Vercel :
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`

2. Générez `NEXTAUTH_SECRET` :
   ```bash
   openssl rand -base64 32
   ```

3. Redéployez l'application après avoir ajouté les variables

---

### 2. Erreur "OAuthCallback" ou "OAuthSignin"

**Symptômes** :
- L'authentification démarre mais échoue au callback
- Redirection vers la page d'erreur après avoir autorisé Discord

**Causes possibles** :
- URL de callback incorrecte dans Discord Developer Portal
- `NEXTAUTH_URL` ne correspond pas au domaine Vercel

**Solution** :

1. **Vérifiez l'URL de callback dans Discord** :
   - Allez sur https://discord.com/developers/applications
   - Sélectionnez votre application
   - OAuth2 → General
   - Vérifiez que l'URL de callback est exactement :
     ```
     https://glsl-discord-bot.vercel.app/api/auth/callback/discord
     ```
   - ⚠️ **Important** : L'URL doit commencer par `https://` (pas `http://`)
   - ⚠️ **Important** : L'URL doit correspondre exactement à votre domaine Vercel
   - ⚠️ **Important** : Ne mettez PAS de slash à la fin de l'URL

2. **Vérifiez `NEXTAUTH_URL` dans Vercel** :
   - Doit être exactement : `https://glsl-discord-bot.vercel.app`
   - Pas de slash à la fin
   - Pas de `http://` (seulement `https://`)

3. **Pour le développement local** :
   - URL de callback : `http://localhost:3000/api/auth/callback/discord`
   - `NEXTAUTH_URL` : `http://localhost:3000`

---

### 3. Erreur "AccessDenied"

**Symptômes** :
- L'utilisateur refuse l'autorisation Discord
- Message : "Access denied"

**Solution** :
- L'utilisateur doit cliquer sur "Autoriser" dans la fenêtre Discord
- Vérifiez que les permissions demandées sont correctes (identify, email)

---

### 4. Erreur "Verification"

**Symptômes** :
- Le token Discord est invalide ou expiré
- L'authentification échoue après le callback

**Causes possibles** :
- `DISCORD_CLIENT_SECRET` incorrect
- Token expiré (rare)

**Solution** :
1. Vérifiez que `DISCORD_CLIENT_SECRET` est correct dans Vercel
2. Régénérez le Client Secret dans Discord Developer Portal si nécessaire
3. Redéployez l'application

---

### 5. Erreur "Unknown authentication error" (Application Discord non vérifiée)

**Symptômes** :
- Message : "Unknown authentication error"
- L'authentification échoue sans message d'erreur spécifique
- Toutes les variables d'environnement sont correctement configurées

**Causes possibles** :
- **Application Discord non vérifiée** : Les applications Discord non vérifiées ont des restrictions OAuth
- Discord peut limiter OAuth à 25 utilisateurs pour les applications non vérifiées
- Certains scopes peuvent être restreints pour les applications non vérifiées

**Solution** :

1. **Vérifier le statut de vérification de votre application Discord** :
   - Allez sur https://discord.com/developers/applications
   - Sélectionnez votre application
   - Allez dans "General"
   - Vérifiez la section "Verification Status"
   - Si l'application n'est pas vérifiée, vous verrez un message indiquant le statut

2. **Pour les applications non vérifiées** :
   - OAuth fonctionne généralement pour les 25 premiers utilisateurs
   - Pour un usage en production, vous devrez peut-être vérifier l'application
   - La vérification nécessite de remplir un formulaire Discord avec des informations sur votre application

3. **Vérifier les restrictions** :
   - Les applications non vérifiées peuvent avoir des limitations sur certains scopes OAuth
   - Vérifiez que les scopes demandés (`identify`, `email`) sont autorisés pour les applications non vérifiées

4. **Alternative pour le développement** :
   - Pour le développement et les tests, une application non vérifiée devrait fonctionner
   - Si vous avez plus de 25 utilisateurs, vous devrez vérifier l'application

**Comment vérifier votre application Discord** :
1. Allez sur https://discord.com/developers/applications
2. Sélectionnez votre application
3. Allez dans "General"
4. Si l'application n'est pas vérifiée, vous verrez un bouton "Start Verification" ou un lien vers le processus de vérification
5. Suivez le processus de vérification Discord (peut prendre quelques jours)

---

## Configuration Complète Step-by-Step

### Étape 1 : Créer une Application Discord OAuth2

1. Allez sur https://discord.com/developers/applications
2. Cliquez sur "New Application"
3. Donnez un nom à votre application
4. Allez dans "OAuth2" → "General"

### Étape 2 : Configurer les Redirect URIs

Dans "Redirects", ajoutez :

**Pour la production (Vercel)** :
```
https://glsl-discord-bot.vercel.app/api/auth/callback/discord
```

**Pour le développement local** :
```
http://localhost:3000/api/auth/callback/discord
```

⚠️ **Important** :
- Utilisez `https://` pour la production
- Utilisez `http://` pour le développement local uniquement
- L'URL doit correspondre exactement (pas de slash à la fin)

### Étape 3 : Obtenir les Credentials

1. Dans "OAuth2" → "General" :
   - **Client ID** : Copiez cette valeur
   - **Client Secret** : Cliquez sur "Reset Secret" si nécessaire, puis copiez

2. Notez ces valeurs (vous en aurez besoin pour Vercel)

### Étape 4 : Configurer Vercel

1. Allez dans votre projet Vercel
2. Settings → Environment Variables
3. Ajoutez ces variables :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `NEXTAUTH_URL` | `https://glsl-discord-bot.vercel.app` | URL de votre application Vercel |
| `NEXTAUTH_SECRET` | `[généré avec openssl]` | Secret pour NextAuth (générez avec `openssl rand -base64 32`) |
| `DISCORD_CLIENT_ID` | `[depuis Discord]` | Client ID de votre application Discord |
| `DISCORD_CLIENT_SECRET` | `[depuis Discord]` | Client Secret de votre application Discord |

4. **Important** : Sélectionnez "Production", "Preview", et "Development" pour chaque variable

5. Redéployez l'application

### Étape 5 : Vérifier la Configuration

1. Allez sur votre application Vercel
2. Essayez de vous connecter avec Discord
3. Si ça ne fonctionne pas, vérifiez les logs Vercel :
   - Vercel Dashboard → Deployments → [votre déploiement] → Functions → Logs

---

## Vérification de la Configuration

### Checklist

- [ ] Application Discord créée
- [ ] Redirect URI configuré dans Discord (exactement comme votre domaine Vercel)
- [ ] Client ID copié
- [ ] Client Secret copié
- [ ] `NEXTAUTH_URL` = votre domaine Vercel (avec https://)
- [ ] `NEXTAUTH_SECRET` généré et ajouté
- [ ] `DISCORD_CLIENT_ID` ajouté dans Vercel
- [ ] `DISCORD_CLIENT_SECRET` ajouté dans Vercel
- [ ] Application redéployée après avoir ajouté les variables

### Test Local

Pour tester localement :

1. Créez un fichier `web/.env.local` :
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=votre_secret_ici
   DISCORD_CLIENT_ID=votre_client_id
   DISCORD_CLIENT_SECRET=votre_client_secret
   ```

2. Ajoutez `http://localhost:3000/api/auth/callback/discord` dans Discord Redirect URIs

3. Lancez l'application :
   ```bash
   cd web
   npm run dev
   ```

---

## Debugging

### Activer les Logs de Debug

Dans `web/lib/auth.ts`, `debug` est déjà activé en développement.

### Vérifier les Logs Vercel

1. Allez dans Vercel Dashboard
2. Sélectionnez votre projet
3. Deployments → [dernier déploiement]
4. Functions → Logs
5. Cherchez les erreurs liées à NextAuth ou Discord

### Erreurs Communes dans les Logs

**"Missing required environment variables"** :
- Une ou plusieurs variables d'environnement sont manquantes
- Vérifiez que toutes les variables sont définies dans Vercel

**"Invalid redirect_uri"** :
- L'URL de callback dans Discord ne correspond pas
- Vérifiez que l'URL est exactement la même dans Discord et Vercel

**"Invalid client secret"** :
- Le Client Secret est incorrect
- Régénérez-le dans Discord et mettez à jour dans Vercel

---

## Support

Si le problème persiste :

1. Vérifiez les logs Vercel pour plus de détails
2. Vérifiez que toutes les variables sont correctement configurées
3. Vérifiez que l'URL de callback correspond exactement
4. Redéployez l'application après chaque modification

---

*Dernière mise à jour : 2025*

