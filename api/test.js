/**
 * Endpoint de Test pour Discord
 * Répond à toutes les méthodes pour diagnostiquer
 */

export default function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // Gérer OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Log de la requête
  console.log('🔍 Test endpoint appelé:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  // Répondre selon la méthode
  switch (req.method) {
    case 'GET':
      res.status(200).json({
        message: 'Test endpoint GET - OK',
        method: 'GET',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      break;
      
    case 'POST':
      res.status(200).json({
        message: 'Test endpoint POST - OK',
        method: 'POST',
        timestamp: new Date().toISOString(),
        status: 'success',
        type: 1 // PONG pour Discord
      });
      break;
      
    default:
      res.status(200).json({
        message: `Test endpoint ${req.method} - OK`,
        method: req.method,
        timestamp: new Date().toISOString(),
        status: 'success'
      });
  }
}
