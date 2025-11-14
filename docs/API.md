# API Documentation

Documentation complète de l'API REST du ShaderBot.

## Base URL

- **Production**: `https://glsl-discord-bot.onrender.com`
- **Local**: `http://localhost:8080`

## Endpoints

### Health & Status

#### `GET /health`
Vérifie l'état de santé du bot.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "bot": {
    "username": "ShaderBot",
    "id": "123456789",
    "status": "online"
  }
}
```

#### `GET /metrics`
Métriques de performance au format JSON.

**Response:**
```json
{
  "totalCompilations": 1000,
  "successCount": 950,
  "failureCount": 50,
  "successRate": "95.00%",
  "averageCompilationTime": 2500,
  "activeCompilations": 2,
  "browserPool": {
    "poolSize": 2,
    "activeInstances": 1,
    "maxInstances": 2
  },
  "shaderCache": {
    "fileCount": 50,
    "totalSizeMB": 25.5
  },
  "uptime": 3600,
  "memory": { ... }
}
```

#### `GET /metrics/prometheus`
Métriques au format Prometheus (compatible Grafana).

**Response:** Format texte Prometheus
```
# HELP glsl_bot_compilations_total Total number of shader compilations
# TYPE glsl_bot_compilations_total counter
glsl_bot_compilations_total 1000
...
```

### Bot Information

#### `GET /bot`
Informations sur le bot Discord.

**Response:**
```json
{
  "name": "ShaderBot",
  "id": "123456789",
  "tag": "ShaderBot#1234",
  "avatar": "https://...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "status": "online",
  "commands": ["shader", "shader-preset", "help"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Shader API

#### `GET /api/shaders`
Récupère les shaders d'un utilisateur.

**Headers:**
- `Authorization: Bearer <API_KEY>` (optionnel si BOT_API_KEY non configuré)

**Query Parameters:**
- `userId` (required): ID Discord de l'utilisateur

**Response:**
```json
[
  {
    "id": 1,
    "code": "void mainImage(...)",
    "user_id": "123456789",
    "user_name": "username",
    "gif_path": "/path/to/gif",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

#### `GET /api/shaders/:id/gif`
Récupère le GIF d'un shader.

**Headers:**
- `Authorization: Bearer <API_KEY>` (optionnel)

**Query Parameters:**
- `userId` (optional): Filtrer par utilisateur

**Response:** Fichier GIF

#### `GET /api/shaders/:id/image`
Récupère la première frame d'un shader.

**Response:** Fichier PNG

#### `GET /api/shaders/code/:name`
Récupère le code source d'un shader prédéfini.

**Response:**
```json
{
  "name": "rainbow",
  "code": "void mainImage(...)",
  "source": "bot" // ou "fallback"
}
```

### Discord Webhook

#### `POST /discord`
Endpoint webhook Discord (utilisé par Discord pour les interactions).

**Headers:**
- `X-Signature-Ed25519`: Signature Discord
- `X-Signature-Timestamp`: Timestamp Discord

**Body:** Interaction Discord (JSON)

**Response:** Interaction Response (JSON)

## Rate Limiting

- **Global**: 50 requêtes/minute
- **Par utilisateur**:
  - `/shader`: 3/minute
  - `/shader-preset`: 5/minute
  - `/shader-generate`: 2/minute
  - `/shader-code`: 10/minute
  - `/help`: 20/minute

## Authentication

Certains endpoints nécessitent une clé API si `BOT_API_KEY` est configuré dans les variables d'environnement :

```
Authorization: Bearer <BOT_API_KEY>
```

## Error Responses

Tous les endpoints retournent des erreurs au format JSON :

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Codes d'erreur:**
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `429`: Too Many Requests (Rate Limited)
- `500`: Internal Server Error
- `503`: Service Unavailable

## WebSocket (Optionnel)

Si Socket.IO est installé, un WebSocket est disponible pour la progression en temps réel :

**Connection:** `ws://localhost:8080`

**Events:**
- `active-jobs`: Liste des jobs actifs
- `get-progress <jobId>`: Demander la progression d'un job
- `progress`: Progression d'un job
- `progress-update`: Mise à jour de progression (broadcast)

## Examples

### cURL

```bash
# Health check
curl https://glsl-discord-bot.onrender.com/health

# Metrics
curl https://glsl-discord-bot.onrender.com/metrics

# Prometheus metrics
curl https://glsl-discord-bot.onrender.com/metrics/prometheus

# Get user shaders
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://glsl-discord-bot.onrender.com/api/shaders?userId=123456789"

# Get shader code
curl https://glsl-discord-bot.onrender.com/api/shaders/code/rainbow
```

### JavaScript

```javascript
// Fetch metrics
const response = await fetch('https://glsl-discord-bot.onrender.com/metrics');
const metrics = await response.json();
console.log(metrics);

// Get shader code
const codeResponse = await fetch('https://glsl-discord-bot.onrender.com/api/shaders/code/rainbow');
const shaderCode = await codeResponse.json();
console.log(shaderCode.code);
```

## Monitoring

### Prometheus

Scrapez l'endpoint `/metrics/prometheus` avec Prometheus :

```yaml
scrape_configs:
  - job_name: 'glsl-bot'
    scrape_interval: 15s
    static_configs:
      - targets: ['glsl-discord-bot.onrender.com']
    metrics_path: '/metrics/prometheus'
```

### Grafana

Importez les métriques Prometheus dans Grafana pour visualiser :
- Taux de succès des compilations
- Temps moyen de compilation
- Utilisation du browser pool
- Taux de cache hit/miss
- Longueur de la queue

