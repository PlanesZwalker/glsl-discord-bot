# TODO List - Objectifs et Fonctionnalités Manquantes

## 🎯 Objectifs Principaux
- ✅ Système de monétisation (Stripe, abonnements, plans)
- ✅ Système de sécurité (validation shaders, SSRF protection, audit logging)
- ✅ Page pricing sur le site web
- ✅ Watermark pour utilisateurs gratuits
- ✅ Export MP4 pour utilisateurs premium (Pro/Studio)
- ✅ Résolutions HD/4K selon plan (Free: 320x240, Pro: 1920x1080, Studio: 3840x2160)
- ✅ API pour développeurs (Studio plan) - Endpoints `/api/v1/compile`, `/api/v1/stats`, `/api/v1/presets`
- ⏳ Stockage cloud illimité (Pro/Studio) - Intégration S3
- ⏳ Collaboration en temps réel (Studio plan)
- ⏳ Export multi-format (Studio plan) - WebP, PNG séquence
- ✅ Priorité de compilation (Pro/Studio) - Système de queue avec priorité
- ✅ Durée GIF jusqu'à 10 secondes (Pro/Studio plan)
- ✅ Nettoyage automatique après 7 jours (Free plan) - CleanupManager avec cron job
- ⏳ Couverture de code à 90%
- ⏳ Tests complets pour toutes les nouvelles fonctionnalités
- ⏳ Optimisations de performances
- ⏳ Code propre et documenté

## 📋 Fonctionnalités Manquantes

### 1. API pour Développeurs (Studio Plan) ✅ IMPLÉMENTÉ
- **Statut**: ✅ Complètement implémenté
- **Description**: Endpoint `/api/v1/compile` avec authentification API key
- **Fonctionnalités**:
  - ✅ Génération d'API keys pour utilisateurs Studio (`src/utils/apiKeyManager.js`)
  - ✅ Rate limiting: 100 requêtes/jour pour Studio (`src/utils/apiRateLimiter.js`)
  - ✅ Endpoints: `/api/v1/compile`, `/api/v1/presets`, `/api/v1/stats` (dans `bot.js`)
  - ✅ Authentification via header `X-API-Key` ou `Authorization: Bearer <key>`
  - ⏳ Documentation API complète (à améliorer dans README.md)
- **Fichiers implémentés**:
  - ✅ `bot.js` - Routes API v1 (lignes 6490-6626)
  - ✅ `src/utils/apiKeyManager.js` - Gestion des API keys
  - ✅ `src/utils/apiRateLimiter.js` - Rate limiting spécifique API
  - ✅ `src/simple-database.js` - Table `api_keys` créée automatiquement

### 2. Stockage Cloud Illimité (Pro/Studio)
- **Priorité**: Haute
- **Description**: Intégration S3 ou équivalent pour sauvegarder les shaders compilés
- **Fonctionnalités**:
  - Upload automatique vers S3 pour Pro/Studio
  - Rétention illimitée pour Pro/Studio
  - Nettoyage automatique après 7 jours pour Free
  - Migration des shaders existants vers cloud
- **Fichiers à créer/modifier**:
  - `src/utils/cloudStorage.js` - Gestion S3
  - `src/simple-database.js` - Ajouter colonne `cloud_url`
  - `bot.js` - Intégrer upload cloud après compilation

### 3. Collaboration en Temps Réel (Studio Plan)
- **Priorité**: Moyenne
- **Description**: Système de partage et édition collaborative de shaders
- **Fonctionnalités**:
  - Partage de shaders avec liens privés
  - Édition collaborative (WebSocket)
  - Commentaires sur shaders
  - Historique des versions
- **Fichiers à créer/modifier**:
  - `src/utils/collaboration.js` - Gestion collaboration
  - `bot.js` - Routes API pour partage
  - `web/components/ShaderCollaboration.tsx` - Interface web

### 4. Export Multi-format (Studio Plan)
- **Priorité**: Moyenne
- **Description**: Support WebP, MP4, GIF, PNG en plus du format actuel
- **Fonctionnalités**:
  - Export WebP animé
  - Export MP4 (déjà implémenté, à tester)
  - Export PNG séquence
  - Choix du format à la compilation
- **Fichiers à créer/modifier**:
  - `src/utils/webpExporter.js` - Export WebP
  - `src/real-webgl-compiler.js` - Ajouter options de format
  - `commands/shader.js` - Ajouter option format

### 5. Priorité de Compilation (Pro/Studio) ✅ IMPLÉMENTÉ
- **Statut**: ✅ Complètement implémenté
- **Description**: Queue système avec priorité pour les utilisateurs premium
- **Fonctionnalités**:
  - ✅ Queue prioritaire pour Pro/Studio (priorité 'high' vs 'normal')
  - ✅ Intégration dans `bot.js` via méthode `compileShaderWithPriority()`
  - ✅ Utilisation de `src/shader-queue.js` existant avec système de priorité
  - ⏳ Estimation du temps d'attente (partiellement implémenté)
  - ⏳ Notification quand compilation prête (à améliorer)
- **Fichiers implémentés**:
  - ✅ `src/shader-queue.js` - Système de queue avec priorité (existant)
  - ✅ `bot.js` - Méthode `compileShaderWithPriority()` (lignes 238-285)

### 6. Durée GIF jusqu'à 10 secondes (Pro/Studio Plan) ✅ IMPLÉMENTÉ
- **Statut**: ✅ Complètement implémenté
- **Description**: Durée GIF ajustée selon le plan utilisateur
- **Fonctionnalités**:
  - ✅ Free: 2 secondes (défaut)
  - ✅ Pro: 10 secondes
  - ✅ Studio: 10 secondes
  - ✅ Résolution également ajustée selon plan
- **Fichiers modifiés**:
  - ✅ `src/real-webgl-compiler.js` - Variable `compilationDuration` selon plan (lignes 2532-2559)
  - ✅ Utilisation de `compilationDuration` dans la génération de frames (ligne 2626-2627)

### 7. Nettoyage Automatique après 7 jours (Free Plan) ✅ IMPLÉMENTÉ
- **Statut**: ✅ Complètement implémenté
- **Description**: Cron job pour supprimer les anciens shaders des utilisateurs gratuits
- **Fonctionnalités**:
  - ✅ Vérification périodique des shaders > 7 jours (configurable via `CLEANUP_INTERVAL_HOURS`)
  - ✅ Suppression des fichiers locaux (frames, GIFs, MP4s)
  - ✅ Suppression des entrées en base de données
  - ✅ Support nettoyage manuel par utilisateur
  - ⏳ Notification avant suppression (à améliorer)
- **Fichiers implémentés**:
  - ✅ `src/utils/cleanupManager.js` - Gestion complète du nettoyage
  - ✅ `bot.js` - Intégration et démarrage automatique (lignes 169-175)

## 🧪 Tests Manquants

### 1. Tests Watermark
- **Fichier**: `tests/utils/watermark.test.js` (existe mais à vérifier)
- **Cas à tester**:
  - Watermark ajouté correctement aux frames
  - Watermark non ajouté pour Pro/Studio
  - Gestion d'erreurs si sharp échoue

### 2. Tests MP4 Export
- **Fichier**: `tests/utils/mp4Exporter.test.js` (existe mais à vérifier)
- **Cas à tester**:
  - Export MP4 réussi pour Pro/Studio
  - Export MP4 non disponible pour Free
  - Gestion d'erreurs si ffmpeg non disponible

### 3. Tests Résolutions HD/4K
- **Fichier**: `tests/compiler-resolution.test.js` ✅ Existe
- **Cas à tester**:
  - ✅ Free: 320x240
  - ✅ Pro: 1920x1080
  - ✅ Studio: 3840x2160
  - ⏳ Vérifier que les frames sont générées à la bonne résolution (tests à exécuter)

### 4. Tests API Monétisation
- **Fichier**: `tests/api-monetization.test.js` (existe mais à compléter)
- **Cas à tester**:
  - Tous les endpoints API
  - Gestion erreurs Stripe
  - Webhooks Stripe

### 5. Tests Sécurité
- **Fichiers**: Tests existants mais à compléter
- **Cas à tester**:
  - Validation shaders dangereux
  - Protection SSRF
  - Rate limiting
  - Audit logging

## 📊 Couverture de Code

### Objectif: 90% de couverture

#### Fichiers à améliorer:
1. **bot.js** - Actuellement ~15%, objectif 90%
   - Tests pour `initialize()`
   - Tests pour `handleInteractionFromHTTP()`
   - Tests pour toutes les routes API
   - Tests pour gestion erreurs

2. **src/real-webgl-compiler.js** - Actuellement ~54%, objectif 90%
   - Tests pour résolutions selon plan
   - Tests pour watermark
   - Tests pour MP4 export
   - Tests pour toutes les méthodes

3. **src/utils/** - Actuellement ~81%, objectif 90%
   - Compléter tests manquants
   - Tests edge cases

## 🔧 Optimisations

### 1. Performances Compilation
- Réduire temps de compilation (actuellement ~30-60s)
- Optimiser génération GIFs
- Cache plus efficace

### 2. Base de Données
- Optimiser requêtes SQL
- Indexes manquants
- Requêtes préparées partout

### 3. Mémoire
- Réduire consommation mémoire
- Nettoyage automatique des buffers
- Pool de browsers optimisé

## 📝 Documentation et Code Propre

### 1. Documentation
- ✅ README.md (à mettre à jour avec nouvelles fonctionnalités)
- ❌ Supprimer toutes autres documentations du dépôt
- ✅ Variables d'environnement documentées dans .env.example

### 2. Code Propre
- Supprimer commentaires obsolètes
- Refactoriser fonctions trop longues
- Ajouter JSDoc pour toutes les fonctions publiques
- Uniformiser style de code

## 🚀 Prochaines Étapes Prioritaires

1. **Tester watermark et MP4 export** - Vérifier que les implémentations fonctionnent
2. **Implémenter API pour développeurs** - Priorité haute pour Studio plan
3. **Implémenter stockage cloud** - Priorité haute pour Pro/Studio
4. **Améliorer couverture de code** - Atteindre 90%
5. **Implémenter nettoyage automatique** - Priorité haute pour Free plan
6. **Optimiser performances** - Réduire temps de compilation
