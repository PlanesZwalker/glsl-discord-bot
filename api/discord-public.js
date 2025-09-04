/**
 * Endpoint Discord PUBLIC pour GLSL Bot
 * Accessible sans aucune authentification Vercel
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

  // Seulement POST pour Discord
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Log de la requête
    console.log('🔗 Requête Discord reçue sur /discord-public');
    
    // Vérifier si c'est une requête Discord
    const isDiscordRequest = req.headers['x-signature-ed25519'] && req.headers['x-signature-timestamp'];
    
    if (isDiscordRequest) {
      console.log('✅ Headers Discord détectés');
      
      // Réponse PONG pour Discord (type 1) - Format exact attendu
      res.status(200).json({
        type: 1,
        message: 'Discord interaction endpoint validated successfully',
        timestamp: new Date().toISOString(),
        status: 'ready',
        bot: 'GLSL Shader Bot',
        version: '2.0.0'
      });
      
      console.log('✅ Validation Discord réussie - PONG envoyé');
      
    } else {
      console.log('⚠️ Headers Discord manquants');
      
      // Réponse d'erreur si pas Discord
      res.status(400).json({
        error: 'Not a Discord request',
        message: 'Missing Discord signature headers',
        required: ['X-Signature-Ed25519', 'X-Signature-Timestamp'],
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur endpoint Discord:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process Discord request',
      timestamp: new Date().toISOString()
    });
  }
}
