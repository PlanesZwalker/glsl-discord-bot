# TODO List - Problèmes à Résoudre dans le Projet

## 🔴 Priorité Haute - Bloquants

### 1. ✅ RÉSOLU - Déploiement Vercel - Taille du bundle serverless
- **Problème** : La fonction serverless `api/shaders/[id]/image.js` dépasse 250 MB (286.13 MB)
- **Cause** : Les GIFs dans `docs/gifs/` (286 MB) sont inclus dans le bundle
- **Impact** : Déploiement Vercel échoue
- **Solutions implémentées** :
  - [x] Créé `.vercelignore` à la racine pour exclure `docs/gifs/` (100 fichiers ignorés)
  - [x] Ajouté `outputFileTracingExcludes` dans `next.config.js`
  - [x] Modifié les routes API pour rediriger vers GitHub raw au lieu de lire depuis `docs/gifs/`
  - [x] **RÉSOLU** : Déploiement Vercel réussi (18:36:45) - Build cache: 132.55 MB
- **Note** : `docs/gifs/` est UNIQUEMENT pour GitHub documentation, PAS utilisé par le bot (Render.com)
- **Fichiers concernés** : `.vercelignore`, `web/next.config.js`, `web/app/api/shaders/[id]/image/route.ts`, `web/app/api/shaders/[id]/gif/route.ts`

### 2. GIF non visible dans Discord - Bug Discord identifié
- **Problème** : Le GIF n'apparaît pas dans Discord malgré un succès API
- **Cause identifiée** : Bug connu Discord (#6572) - Les images dans les embeds envoyés via webhooks ne s'affichent pas la moitié du temps
- **Impact** : Fonctionnalité principale du bot ne fonctionne pas
- **Solutions implémentées** :
  - [x] Identifié le bug Discord connu (#6572) sur les images dans embeds via webhooks
  - [x] Implémenté `rest.patch_double_edit_workaround` : Double édition avec 500ms de délai (workaround du bug Discord)
  - [x] Implémenté `rest.patch_with_attachments_payload` : Utilise `attachments` dans payload_json (format Discord API)
  - [x] Réorganisé les stratégies par priorité : Double édition en premier, puis attachments payload
  - [x] Priorité 1 : `rest.patch_double_edit_workaround` (double édition - workaround bug Discord)
  - [x] Priorité 2 : `rest.patch_with_attachments_payload` (attachments dans payload_json)
  - [x] Priorité 3 : `rest.patch_AttachmentBuilder_minimal_embed` (AttachmentBuilder originaux)
  - [x] Priorité 4 : `rest.patch_buffer_minimal_embed` (fichiers en Buffer)
  - [x] Priorité 5 : `rest.patch_AttachmentBuilder_full_embed` (AttachmentBuilder avec embed complet)
  - [ ] **À tester** : Vérifier sur Render.com que le GIF s'affiche avec `rest.patch_double_edit_workaround`
- **Fichiers concernés** : `bot.js` (méthode `editReply`), `DISCORD_FILE_UPLOAD_ATTEMPTS.md`

### 3. Boucle de redirection entre `/` et `/dashboard` + Erreur OAuth/NextAuth
- **Problème** : Boucle de redirection infinie entre `/` et `/dashboard` quand l'utilisateur est connecté
- **Erreur associée** : `CLIENT_FETCH_ERROR` avec `NetworkError when attempting to fetch resource` lors de `/api/auth/session`
- **Cause** : 
  - Le callback `redirect` dans `auth.ts` redirigeait automatiquement `/` vers `/dashboard` même sans callbackUrl
  - Cela créait une boucle : `/` → `/dashboard` → `/` → `/dashboard`...
  - Les requêtes multiples causaient des erreurs réseau lors de la récupération de la session
- **Solutions implémentées** :
  - [x] Corrigé `auth.ts` pour ne pas rediriger automatiquement `/` vers `/dashboard` sans callbackUrl
  - [x] Modifié le Hero component pour nettoyer le `callbackUrl` de l'URL après redirection
  - [x] Utilisé `router.replace` au lieu de `router.push` dans le dashboard pour éviter l'historique
  - [ ] **À tester** : Vérifier que la boucle est résolue et que l'erreur OAuth ne se produit plus
- **Fichiers concernés** : `web/lib/auth.ts`, `web/components/Hero.tsx`, `web/app/dashboard/page.tsx`

## 🟡 Priorité Moyenne - Améliorations Importantes

### 4. Couverture de code insuffisante
- **Problème** : Couverture actuelle très faible (bot.js: 14.97%, global: 49.97%)
- **Objectif** : Atteindre 90% de couverture
- **Actions** :
  - [ ] Améliorer la couverture de `bot.js` (actuellement 14.97%)
    - [ ] Tests pour `initialize()` avec différents scénarios
    - [ ] Tests pour `handleInteractionFromHTTP()` avec tous les cas d'erreur
    - [ ] Tests pour `setupEvents()` et gestion des événements
    - [ ] Tests pour `registerSlashCommands()` avec erreurs
  - [ ] Améliorer la couverture des commandes (actuellement 88.8%)
  - [ ] Améliorer la couverture de `src/utils/` (actuellement 81.09%)
  - [ ] Améliorer la couverture de `src/` (actuellement 54.45%)
- **Fichiers concernés** : `tests/bot.test.js`, tous les fichiers de test

### 5. Tests en échec
- **Problème** : Certains tests échouent ou ne sont pas stables
- **Actions** :
  - [ ] Corriger les tests de `bot.test.js` pour `initialize()` (process.exit mock)
  - [ ] Vérifier et corriger tous les tests qui échouent
  - [ ] Améliorer la stabilité des tests (éviter les dépendances temporelles)
- **Fichiers concernés** : `tests/bot.test.js`

### 6. Gestion des erreurs dans les routes API
- **Problème** : Les routes API peuvent échouer silencieusement
- **Actions** :
  - [ ] Ajouter une gestion d'erreur robuste dans toutes les routes API
  - [ ] Ajouter des logs structurés pour le debugging
  - [ ] Gérer les cas où les fichiers n'existent pas (docs/gifs/)
- **Fichiers concernés** : `web/app/api/**/*.ts`

## 🟢 Priorité Basse - Améliorations Futures

### 7. Optimisation des performances
- **Problème** : Certaines opérations peuvent être optimisées
- **Actions** :
  - [ ] Optimiser la génération de GIFs (actuellement ~60s pour 60 frames)
  - [ ] Mettre en cache les shaders compilés plus efficacement
  - [ ] Optimiser les requêtes à la base de données
- **Fichiers concernés** : `src/real-webgl-compiler.js`, `src/shader-cache.js`

### 8. Documentation
- **Problème** : Certaines parties du code ne sont pas documentées
- **Actions** :
  - [ ] Documenter les stratégies d'envoi de fichiers dans `DISCORD_FILE_UPLOAD_ATTEMPTS.md`
  - [ ] Ajouter des commentaires JSDoc pour les méthodes complexes
  - [ ] Mettre à jour le README avec les dernières modifications
- **Fichiers concernés** : `bot.js`, `README.md`, `DISCORD_FILE_UPLOAD_ATTEMPTS.md`

### 9. Sécurité
- **Problème** : Vérifications de sécurité à améliorer
- **Actions** :
  - [ ] Vérifier que toutes les routes API valident correctement les entrées
  - [ ] S'assurer que les fichiers servis ne peuvent pas être accédés sans autorisation
  - [ ] Vérifier les permissions Discord
- **Fichiers concernés** : `web/app/api/**/*.ts`, `bot.js`

### 10. Configuration et variables d'environnement
- **Problème** : Certaines configurations peuvent être améliorées
- **Actions** :
  - [ ] Centraliser la gestion des variables d'environnement
  - [ ] Ajouter des validations pour les variables d'environnement requises
  - [ ] Documenter toutes les variables d'environnement nécessaires
- **Fichiers concernés** : `config/`, `.env.example`

### 11. Gestion des dépendances
- **Problème** : 1 vulnérabilité critique détectée par npm audit
- **Actions** :
  - [ ] Exécuter `npm audit fix` et vérifier les changements
  - [ ] Mettre à jour les dépendances obsolètes
  - [ ] Vérifier la compatibilité après les mises à jour
- **Fichiers concernés** : `package.json`, `web/package.json`

## 📋 Notes Techniques

### ✅ Problème Vercel - RÉSOLU
- Les GIFs dans `docs/gifs/` totalisent ~286 MB
- **Solution appliquée** : `.vercelignore` exclut `docs/gifs/` (100 fichiers ignorés)
- Les routes API redirigent vers GitHub raw au lieu de lire depuis le système de fichiers
- **Résultat** : Déploiement Vercel réussi - Build cache: 132.55 MB (< 250 MB limite)
- Les GIFs sont servis depuis GitHub raw dans `ShaderGallery.tsx` et les routes API

### Problème OAuth/NextAuth - Détails
- **Erreur** : `CLIENT_FETCH_ERROR` avec `NetworkError when attempting to fetch resource` lors de `/api/auth/session`
- **Cause** : Probablement liée à la boucle de redirection qui causait des requêtes multiples simultanées
- **Solution appliquée** : 
  - Corrigé la boucle de redirection dans `auth.ts` et `Hero.tsx`
  - Amélioré le logging pour mieux détecter les erreurs OAuth dans le POST body
  - Le logging détecte maintenant les erreurs même si elles sont sérialisées comme `[object Object]`
- **Statut** : ⏳ En attente de test après correction de la boucle de redirection

### Problème Discord - Détails
- **Bug Discord identifié** : Issue #6572 - Les images dans les embeds envoyés via webhooks ne s'affichent pas la moitié du temps
- **Cause** : Le message semble être édité deux fois en une fraction de seconde et l'image ne s'affiche pas
- **Solution de contournement testée** : Éditer le message deux fois avec le même contenu force Discord à afficher l'image
- **Stratégies implémentées** (par ordre de priorité) :
  1. `rest.patch_double_edit_workaround` - Double édition avec 500ms de délai (workaround bug Discord) - ❌ **ÉCHEC**
  2. `rest.patch_with_attachments_payload` - Utilise `attachments` dans payload_json (format Discord API) - ⏳ **À TESTER**
  3. `rest.patch_AttachmentBuilder_minimal_embed` - Utilise AttachmentBuilder originaux avec embed minimal - ❌ **ÉCHEC**
  4. `rest.patch_buffer_minimal_embed` - Lit fichiers en Buffer avec embed minimal (fallback) - ⏳ **NON TESTÉ**
  5. `rest.patch_AttachmentBuilder_full_embed` - Utilise AttachmentBuilder originaux avec embed complet - ⏳ **NON TESTÉ**
- **Statut** : ❌ **PROBLÈME PERSISTANT** - Même la stratégie de double édition ne fonctionne pas
- **Dernier test** : 2025-11-14 19:09 - GIF généré (2318.63 KB), stratégie `rest.patch_double_edit_workaround` réussit, mais GIF non visible dans Discord

## 🎯 Objectifs à Court Terme

1. ✅ **Résoudre le déploiement Vercel** (bloquant) - **RÉSOLU**
2. ✅ **Corriger la boucle de redirection `/` ↔ `/dashboard`** (bloquant) - **RÉSOLU**
3. **Vérifier que le GIF s'affiche dans Discord** (bloquant)
4. **Vérifier que l'erreur OAuth/NextAuth est résolue** (bloquant)
5. **Améliorer la couverture de code à 90%** (important)
6. **Corriger tous les tests en échec** (important)

## 📊 Métriques Actuelles

- **Couverture globale** : 49.97% (objectif: 90%)
- **Couverture bot.js** : 14.97% (objectif: 90%)
- **Couverture branches** : 46.41% (objectif: 90%)
- **Couverture fonctions** : 46.58% (objectif: 90%)
- **Couverture lignes** : 50.09% (objectif: 90%)
- **Taille bundle Vercel** : 132.55 MB (limite: 250 MB) ✅
- **Tests passants** : 647/657 (98.5%)
- **Vulnérabilités** : 1 critique

