/**
 * Endpoint Discord Ultra-Simple
 * Répond exactement comme Discord l'attend
 */

export default function handler(req, res) {
  // Headers CORS essentiels
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // Gérer OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Seulement POST
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  // Réponse PONG immédiate pour Discord (type 1)
  res.status(200).json({
    type: 1
  });
}
