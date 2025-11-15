# 📖 Explication du Projet - ShaderBot

## 🎯 Vue d'Ensemble

ShaderBot est un bot Discord professionnel qui compile et anime des shaders GLSL/WGSL en temps réel. Il génère des GIFs animés magnifiques à partir de code shader personnalisé ou de 100+ shaders prédéfinis.

## 🏗️ Architecture

### Backend (Node.js)
- **bot.js**: Bot Discord principal avec Express server
- **src/real-webgl-compiler.js**: Compilateur WebGL avec Puppeteer
- **src/simple-database.js**: Gestion SQLite
- **src/subscription-manager.js**: Gestion Stripe
- **commands/**: Commandes Discord slash

### Frontend (Next.js)
- **web/app/**: Pages Next.js (dashboard, pricing, etc.)
- **web/components/**: Composants React
- **web/lib/**: Utilitaires (auth, i18n, etc.)

### Tests
- **tests/**: Tests Jest pour toutes les fonctionnalités
- Objectif: 90% de couverture de code

## 🔑 Fonctionnalités Principales

1. **Compilation de Shaders**: WebGL/WebGPU réel avec Puppeteer
2. **Animations GIF**: Génération de GIFs animés à partir de shaders
3. **100+ Shaders Prédéfinis**: Effets, fractales, 3D, etc.
4. **Monétisation**: Plans Free, Pro, Studio avec Stripe
5. **Sécurité**: Validation shaders, SSRF protection, audit logging
6. **API REST**: Endpoints pour compilation, stats, etc.

## 💰 Système de Monétisation

- **Free**: 5 compilations/jour, watermark, résolution 320x240
- **Pro** (4,99€/mois): Illimité, HD, pas de watermark, MP4
- **Studio** (14,99€/mois): 4K, API, collaboration

## 🔒 Sécurité

- Validation des shaders (code injection, boucles infinies)
- Protection SSRF (URLs textures)
- Rate limiting avancé
- Audit logging complet
- Helmet.js pour headers de sécurité

## 🚀 Déploiement

- **Bot**: Render.com (Express server)
- **Web**: Vercel (Next.js)
- **Base de données**: SQLite (local) ou cloud (futur)

## 📊 Métriques

- Couverture de code: ~50% (objectif 90%)
- Tests: 647/657 passants (98.5%)
- Temps de compilation: ~30-60s par shader

