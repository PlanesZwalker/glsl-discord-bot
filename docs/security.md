# 🔒 Guide de Sécurité - ShaderBot

Ce document décrit toutes les mesures de sécurité implémentées dans ShaderBot.

## ✅ Mesures de Sécurité Implémentées

### 1. Validation des Shaders (ShaderSecurityValidator)
- **Détection de code injection** : Vérification des patterns dangereux
- **Limite de longueur** : MAX_CODE_LENGTH pour éviter les shaders trop longs
- **Détection de boucles infinies** : MAX_NESTED_LOOPS et MAX_FUNCTION_CALLS
- **Complexité algorithmique** : Détection des shaders trop complexes
- **Sanitization** : Nettoyage du code avant compilation

### 2. Protection SSRF (URLSecurityValidator)
- **Protocoles autorisés** : Seulement HTTP/HTTPS
- **Domaines autorisés** : Liste blanche de domaines
- **Blocage IPs privées** : Prévention des attaques SSRF
- **Validation du type de contenu** : Vérification que c'est bien une image
- **Limite de taille** : MAX_FILE_SIZE pour éviter les fichiers trop volumineux

### 3. Audit Logging (AuditLogger)
- **Logs de sécurité** : Tous les événements de sécurité sont loggés
- **Logs de compilation** : Traçabilité des compilations
- **Logs de paiement** : Traçabilité des transactions
- **Webhooks de sécurité** : Alertes pour les violations critiques
- **Rotation des logs** : Logs quotidiens avec rotation automatique

### 4. Validation des Variables d'Environnement (EnvValidator)
- **Variables requises** : Vérification au démarrage
- **Force des secrets** : Vérification de la complexité des secrets
- **Détection de valeurs par défaut** : Alerte si valeurs par défaut utilisées
- **Masquage des valeurs sensibles** : Protection dans les logs

### 5. Rate Limiting Avancé (AdvancedRateLimiter)
- **Rate limiting par utilisateur** : Limites selon le plan
- **Détection d'abus** : Identification des patterns suspects
- **Banning automatique** : Bannissement temporaire ou permanent
- **Support Redis** : Rate limiting distribué avec Redis

### 6. Helmet.js - Headers de Sécurité
- **Content Security Policy (CSP)** : Protection contre XSS
- **HSTS** : Force HTTPS
- **X-Frame-Options** : Protection contre clickjacking
- **X-Content-Type-Options** : Protection contre MIME sniffing
- **X-XSS-Protection** : Protection XSS supplémentaire
- **Referrer-Policy** : Contrôle des informations de référent

### 7. DDoS Protection
- **Rate limiting global** : 100 requêtes/15 min par IP
- **Slow down** : Délai progressif après 3 requêtes sur endpoints de compilation
- **Intégration audit logging** : Logs des tentatives de DDoS

### 8. Isolation Puppeteer
- **Timeout strict** : 10 secondes pour navigation, 25 secondes pour compilation
- **Blocage des requêtes externes** : Seulement `data:` et `about:`
- **Content Security Policy** : CSP strict injecté dans les pages
- **Isolation des pages** : Chaque compilation dans une page isolée

### 9. Validation des Signatures Discord
- **Signature Ed25519** : Validation cryptographique des interactions
- **Raw body capture** : Capture du body brut pour validation
- **Rejet des requêtes invalides** : 401 Unauthorized si signature invalide

### 10. Base de Données Sécurisée
- **Requêtes préparées** : Protection contre SQL injection
- **Validation des entrées** : Validation avant insertion
- **Indexes** : Optimisation et sécurité des requêtes

## 📊 Tables de Sécurité

### Table `user_bans`
- Bannissements temporaires et permanents
- Raison du ban
- IP address tracking

### Table `audit_logs`
- Logs de tous les événements de sécurité
- Timestamp et détails

### Table `security_violations`
- Violations de sécurité détectées
- Niveau de sévérité
- Action prise

## 🚨 Réponse aux Incidents

1. **Détection automatique** : Système détecte les violations
2. **Logging** : Tous les incidents sont loggés
3. **Action automatique** : Banning, rate limiting, etc.
4. **Alerte webhook** : Notification pour incidents critiques

## 📝 Bonnes Pratiques

- ✅ Toujours valider les entrées utilisateur
- ✅ Utiliser des requêtes préparées pour la base de données
- ✅ Logger tous les événements de sécurité
- ✅ Mettre à jour régulièrement les dépendances
- ✅ Utiliser HTTPS partout
- ✅ Limiter les permissions au strict nécessaire

