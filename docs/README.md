# Documentation ShaderBot

Bienvenue dans la documentation complète de ShaderBot ! 🎨

## 📚 Structure de la Documentation

### 🏗️ Architecture
- **[Architecture des Fichiers](./architecture.md)** - Structure et organisation des fichiers du projet

### ⚙️ Configuration & Setup
- **[Configuration de la Monétisation](./setup/monetization.md)** - Guide complet pour configurer Stripe et les plans d'abonnement

### 🔒 Sécurité
- **[Implémentation de la Sécurité](./security.md)** - Mesures de sécurité, validation des shaders, protection SSRF

### 🛠️ Développement
- **[TODO List](./development/todo.md)** - Liste des tâches et fonctionnalités à implémenter
- **[Intégration Discord](./development/discord-integration.md)** - Détails sur l'intégration avec Discord et les tentatives d'upload de fichiers

### 📖 Projet
- **[Explication du Projet](./project-explanation.md)** - Vue d'ensemble du projet, objectifs et fonctionnalités

## 🎯 Documentation Externe

- **README Principal** : Voir [../README.md](../README.md) pour la documentation utilisateur
- **Application Web** : [https://glsl-discord-bot.vercel.app](https://glsl-discord-bot.vercel.app)

## 📝 Notes

Cette documentation est destinée aux développeurs et mainteneurs du projet. Elle contient des informations techniques détaillées sur l'architecture, la configuration et le développement.

---

**Dernière mise à jour** : 2025-01-15

## ✅ État Actuel

### Fonctionnalités Implémentées
- ✅ Système de monétisation complet (Stripe)
- ✅ API pour développeurs (Studio plan)
- ✅ Priorité de compilation (Pro/Studio)
- ✅ Durée GIF jusqu'à 10 secondes (Pro/Studio)
- ✅ Nettoyage automatique (Free plan)
- ✅ Architecture de fichiers réorganisée (`storage/`)
- ✅ Configuration centralisée des chemins (`src/config/paths.js`)

### En Développement
- ⏳ Stockage cloud illimité (S3)
- ⏳ Export multi-format (WebP, PNG séquence)
- ⏳ Collaboration en temps réel

