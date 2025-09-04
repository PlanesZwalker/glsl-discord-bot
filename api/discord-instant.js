/**
 * Endpoint Discord Ultra-Rapide
 * Réponse instantanée pour validation Discord
 */

export default function handler(req, res) {
  // Réponse immédiate - Pas de log, pas de délai
  if (req.method === 'POST') {
    res.status(200).json({ type: 1 });
    return;
  }
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET') {
    res.status(200).json({ status: 'Discord Ready' });
    return;
  }
  
  res.status(405).end();
}
