/**
 * Endpoint Discord Minimal
 * Réponse ultra-simple pour la validation Discord
 */

export default function handler(req, res) {
  // Headers CORS basiques
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // Gérer OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Gérer GET
  if (req.method === 'GET') {
    res.status(200).json({
      status: 'ok',
      message: 'GLSL Discord Bot API'
    });
    return;
  }

  // Gérer POST - Réponse PONG immédiate pour Discord
  if (req.method === 'POST') {
    res.status(200).json({
      type: 1
    });
    return;
  }

  // Autres méthodes
  res.status(405).end();
}
