# 💰 Guide de Configuration de la Monétisation

Ce guide explique comment configurer et utiliser le système de monétisation pour ShaderBot.

## 📋 Prérequis

1. Un compte Stripe (https://stripe.com)
2. Les clés API Stripe (disponibles dans le Dashboard Stripe)

## 🔧 Configuration Stripe

### 1. Créer les Produits et Prix dans Stripe

1. Connectez-vous à votre [Dashboard Stripe](https://dashboard.stripe.com)
2. Allez dans **Products** → **Add product**

#### Plan Pro (4,99€/mois)
- **Nom**: ShaderBot Pro
- **Prix**: 4,99€
- **Billing**: Recurring (monthly)
- **Copiez le Price ID** (commence par `price_...`)

#### Plan Studio (14,99€/mois)
- **Nom**: ShaderBot Studio
- **Prix**: 14,99€
- **Billing**: Recurring (monthly)
- **Copiez le Price ID** (commence par `price_...`)

### 2. Configurer les Variables d'Environnement

Ajoutez ces variables dans votre fichier `.env` ou dans les variables d'environnement de votre hébergeur (Render.com, Vercel, etc.):

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Clé secrète Stripe (commence par sk_test_ ou sk_live_)
STRIPE_WEBHOOK_SECRET=whsec_... # Secret du webhook (obtenu après configuration du webhook)
STRIPE_PRICE_ID_PRO=price_... # Price ID du plan Pro
STRIPE_PRICE_ID_STUDIO=price_... # Price ID du plan Studio

# URL de votre application (pour les redirections Stripe)
WEB_URL=https://glsl-discord-bot.onrender.com
```

### 3. Configurer le Webhook Stripe

1. Dans le Dashboard Stripe, allez dans **Developers** → **Webhooks**
2. Cliquez sur **Add endpoint**
3. **Endpoint URL**: `https://votre-domaine.com/api/webhooks/stripe`
4. **Events to send**: Sélectionnez ces événements:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Copiez le Signing secret** (commence par `whsec_...`) et ajoutez-le à `STRIPE_WEBHOOK_SECRET`

## 📊 Structure de la Base de Données

Le système crée automatiquement ces tables:

### Table `users` (mise à jour)
- `plan` (TEXT): Plan de l'utilisateur ('free', 'pro', 'studio')
- `stripe_customer_id` (TEXT): ID du customer Stripe
- `email` (TEXT): Email de l'utilisateur

### Table `subscriptions`
- `user_id` (TEXT): ID Discord de l'utilisateur
- `plan` (TEXT): Plan de l'abonnement
- `status` (TEXT): Statut ('active', 'canceled', 'past_due')
- `stripe_subscription_id` (TEXT): ID de l'abonnement Stripe
- `stripe_price_id` (TEXT): ID du prix Stripe
- `current_period_start` (DATETIME): Début de la période
- `current_period_end` (DATETIME): Fin de la période
- `cancel_at_period_end` (INTEGER): 1 si annulé à la fin de la période

### Table `usage_stats`
- `user_id` (TEXT): ID Discord de l'utilisateur
- `date` (TEXT): Date au format YYYY-MM-DD
- `compilations_count` (INTEGER): Nombre de compilations aujourd'hui
- `presets_count` (INTEGER): Nombre de presets utilisés aujourd'hui

## 🎯 Limites par Plan

### Plan Free
- ✅ 5 compilations personnalisées par jour
- ✅ 10 presets par jour
- ✅ Résolution 320x240
- ✅ GIF 2 secondes, 30 FPS
- ❌ Watermark sur les GIFs
- ❌ Stockage limité à 7 jours (nettoyage automatique)

### Plan Pro (4,99€/mois)
- ✅ Compilations illimitées
- ✅ Presets illimités
- ✅ Résolution HD (1920x1080)
- ✅ GIF jusqu'à 10 secondes
- ✅ Pas de watermark
- ✅ Stockage cloud illimité
- ✅ Export MP4
- ✅ Priorité de compilation

### Plan Studio (14,99€/mois)
- ✅ Tout du plan Pro
- ✅ Résolution 4K (3840x2160)
- ✅ Export multi-format
- ✅ API access (100 requêtes/jour)
- ✅ Collaboration en temps réel
- ✅ Support prioritaire

## 🔌 API Endpoints

### GET `/api/plans`
Récupère tous les plans disponibles.

### POST `/api/subscribe`
Crée une session de checkout Stripe.

### GET `/api/user/plan?userId=123456789`
Récupère le plan et les statistiques d'un utilisateur.

### POST `/api/subscription/cancel`
Annule un abonnement (à la fin de la période).

### POST `/api/webhooks/stripe`
Webhook Stripe (ne pas appeler manuellement).

## ✅ État Actuel du Système

Le système de paiement est **entièrement implémenté** et fonctionnel :
- ✅ **SubscriptionManager** : Gestion complète des abonnements Stripe
- ✅ **Routes API** : Tous les endpoints nécessaires
- ✅ **Base de données** : Tables créées automatiquement
- ✅ **Intégration Discord** : Les commandes vérifient les limites
- ✅ **Webhooks Stripe** : Gestion des événements
- ✅ **Gestion d'erreurs** : Stripe est conditionnel (le bot fonctionne même sans Stripe configuré)

