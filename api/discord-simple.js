/**
 * Endpoint Discord Ultra-Simple
 * Répond exactement comme Discord l'attend
 */

export default function handler(req, res) {
  // Headers CORS essentiels
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // Gérer OPTIONS
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
    // Réponse PONG immédiate pour Discord (type 1)
    res.status(200).json({
      type: 1,
      message: 'Discord interaction endpoint validated successfully',
      timestamp: new Date().toISOString(),
      status: 'ready'
    });
    return;
  }

  // Méthode non autorisée
  res.status(405).json({
    error: 'Method not allowed',
    allowed: ['GET', 'POST', 'OPTIONS'],
    timestamp: new Date().toISOString()
  });
}
