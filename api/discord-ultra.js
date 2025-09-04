/**
 * Endpoint Discord Ultra-Compatible
 * Répond exactement comme Discord l'attend pour la validation
 */

export default function handler(req, res) {
  // Headers CORS pour Discord
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature-Ed25519, X-Signature-Timestamp');

  // Gérer OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Gérer GET (route racine)
  if (req.method === 'GET') {
    res.status(200).json({
      name: 'GLSL Discord Bot API',
      version: '2.0.0',
      description: 'API pour le bot Discord de compilation GLSL WebGL',
      status: 'online',
      endpoint: '/discord',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Gérer POST (Discord)
  if (req.method === 'POST') {
    // Vérifier si c'est une requête Discord (headers spéciaux)
    const isDiscordRequest = req.headers['x-signature-ed25519'] && req.headers['x-signature-timestamp'];
    
    if (isDiscordRequest) {
      // Réponse PONG pour Discord (type 1) - Format exact attendu
      res.status(200).json({
        type: 1,
        message: 'Discord interaction endpoint validated successfully',
        timestamp: new Date().toISOString(),
        status: 'ready'
      });
      return;
    } else {
      // Requête POST normale
      res.status(200).json({
        message: 'POST request received',
        method: 'POST',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      return;
    }
  }

  // Méthode non autorisée
  res.status(405).json({
    error: 'Method not allowed',
    allowed: ['GET', 'POST', 'OPTIONS'],
    timestamp: new Date().toISOString()
  });
}
