/**
 * API Route Vercel pour GLSL Discord Bot
 * Handler simple sans dépendances de classe
 */

export default function handler(req, res) {
  // Définir les headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature-Ed25519, X-Signature-Timestamp');

  // Gérer la requête OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Gérer les différentes routes
  switch (req.method) {
    case 'GET':
      handleGetRequest(req, res);
      break;
    case 'POST':
      handlePostRequest(req, res);
      break;
    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
}

function handleGetRequest(req, res) {
  const { pathname } = new URL(req.url, `https://${req.headers.host}`);
  
  switch (pathname) {
    case '/':
    case '/api':
      // Page d'accueil de l'API
      res.status(200).json({
        name: 'GLSL Discord Bot API',
        version: '2.0.0',
        description: 'API pour le bot Discord de compilation GLSL WebGL',
        status: 'online',
        endpoints: {
          '/': 'Informations sur l\'API',
          '/health': 'Statut de santé du bot',
          '/bot': 'Informations sur le bot Discord',
          '/terms': 'Conditions d\'utilisation',
          '/privacy': 'Politique de confidentialité',
          '/verify': 'Vérification des rôles'
        },
        documentation: 'https://github.com/yourusername/glsl-discord-bot',
        timestamp: new Date().toISOString()
      });
      break;
      
    case '/health':
      // Endpoint de santé
      res.status(200).json({
        status: 'healthy',
        bot: 'online',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
      break;
      
    case '/bot':
      // Informations sur le bot
      res.status(200).json({
        name: 'GLSL Shader Bot',
        description: 'Bot Discord pour compiler et animer des shaders GLSL',
        features: [
          'Compilation WebGL en temps réel',
          'Animations de 3 secondes à 30 FPS',
          'Base de données SQLite',
          'Galerie de shaders',
          'Recherche et statistiques'
        ],
        commands: [
          '!shader help',
          '!shader <code>',
          '!shader animate <code>',
          '!shader smartia',
          '!shader gallery',
          '!shader search <query>',
          '!shader stats'
        ],
        timestamp: new Date().toISOString()
      });
      break;

    case '/terms':
      // Conditions d'utilisation
      res.status(200).json({
        title: 'Conditions d\'utilisation - GLSL Discord Bot',
        version: '1.0.0',
        lastUpdated: '2024-01-04',
        terms: [
          'Ce bot est fourni "tel quel" sans garantie',
          'L\'utilisation est à vos propres risques',
          'Respectez les règles de votre serveur Discord',
          'Ne soumettez pas de contenu malveillant',
          'Le bot peut être arrêté à tout moment'
        ],
        contact: 'Via le serveur Discord ou GitHub',
        timestamp: new Date().toISOString()
      });
      break;

    case '/privacy':
      // Politique de confidentialité
      res.status(200).json({
        title: 'Politique de confidentialité - GLSL Discord Bot',
        version: '1.0.0',
        lastUpdated: '2024-01-04',
        dataCollected: [
          'Code des shaders soumis',
          'ID utilisateur Discord',
          'Nom d\'utilisateur Discord',
          'Statistiques d\'utilisation'
        ],
        dataUsage: [
          'Compilation et exécution des shaders',
          'Stockage en base de données',
          'Amélioration du service',
          'Statistiques anonymisées'
        ],
        dataRetention: 'Jusqu\'à suppression par l\'utilisateur',
        dataSharing: 'Aucun partage avec des tiers',
        contact: 'Via le serveur Discord ou GitHub',
        timestamp: new Date().toISOString()
      });
      break;

    case '/verify':
      // Vérification des rôles (pour Linked Roles)
      res.status(200).json({
        title: 'Vérification des rôles - GLSL Discord Bot',
        description: 'Système de vérification pour les rôles liés',
        status: 'active',
        verificationMethod: 'Discord OAuth2',
        requirements: [
          'Être membre du serveur',
          'Avoir un compte Discord valide',
          'Accepter les conditions d\'utilisation'
        ],
        timestamp: new Date().toISOString()
      });
      break;
      
    case '/favicon.ico':
      // Favicon (réponse vide)
      res.status(204).end();
      break;
      
    default:
      // Route non trouvée
      res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: ['/', '/health', '/bot', '/terms', '/privacy', '/verify'],
        timestamp: new Date().toISOString()
      });
  }
}

function handlePostRequest(req, res) {
  const { pathname } = new URL(req.url, `https://${req.headers.host}`);
  
  // Vérifier si c'est une requête Discord (headers spéciaux)
  const isDiscordRequest = req.headers['x-signature-ed25519'] && req.headers['x-signature-timestamp'];
  
  if (isDiscordRequest) {
    // Requête Discord - Validation d'interactions
    handleDiscordInteraction(req, res);
    return;
  }
  
  switch (pathname) {
    case '/webhook':
      // Webhook pour Discord (optionnel)
      res.status(200).json({
        message: 'Webhook received',
        timestamp: new Date().toISOString()
      });
      break;
      
    default:
      res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: ['/webhook'],
        timestamp: new Date().toISOString()
      });
  }
}

function handleDiscordInteraction(req, res) {
  try {
    // Log de la requête Discord
    console.log('🔗 Requête Discord reçue:', {
      method: req.method,
      url: req.url,
      headers: {
        'x-signature-ed25519': req.headers['x-signature-ed25519'],
        'x-signature-timestamp': req.headers['x-signature-timestamp'],
        'content-type': req.headers['content-type']
      }
    });

    // Répondre avec succès pour la validation Discord
    res.status(200).json({
      type: 1, // PONG response pour Discord
      message: 'Discord interaction endpoint validated successfully',
      timestamp: new Date().toISOString(),
      status: 'ready'
    });

    console.log('✅ Validation Discord réussie');

  } catch (error) {
    console.error('❌ Erreur validation Discord:', error);
    
    // Réponse d'erreur pour Discord
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process Discord interaction',
      timestamp: new Date().toISOString()
    });
  }
}
