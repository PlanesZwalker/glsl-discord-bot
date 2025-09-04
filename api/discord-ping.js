/**
 * Endpoint Discord PING/PONG
 * Réponse immédiate pour la validation Discord
 */

export default function handler(req, res) {
  // Headers CORS Discord
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature-Ed25519, X-Signature-Timestamp');

  // OPTIONS - Preflight CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POST - Réponse PONG immédiate
  if (req.method === 'POST') {
    res.status(200).json({ type: 1 });
    return;
  }

  // GET - Page d'accueil simple
  if (req.method === 'GET') {
    res.status(200).json({ status: 'Discord Bot Ready' });
    return;
  }

  // Autres méthodes
  res.status(405).end();
}
