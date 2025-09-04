#!/usr/bin/env node

/**
 * Serveur Express pour Google Cloud Run
 * Endpoint Discord ultra-rapide
 */

const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

// Middleware pour parser le JSON
app.use(express.json());

// Headers CORS pour Discord
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature-Ed25519, X-Signature-Timestamp');
  next();
});

// Endpoint Discord principal
app.post('/discord', (req, res) => {
  // Réponse PONG immédiate pour Discord
  res.status(200).json({ type: 1 });
});

// Endpoint Discord alternatif
app.post('/api/discord', (req, res) => {
  res.status(200).json({ type: 1 });
});

// OPTIONS pour CORS preflight
app.options('*', (req, res) => {
  res.status(200).end();
});

// GET pour test
app.get('/discord', (req, res) => {
  res.status(200).json({ 
    status: 'Discord Bot Ready',
    endpoint: '/discord',
    timestamp: new Date().toISOString()
  });
});

// Page d'accueil
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'GLSL Discord Bot - Cloud Run Ready',
    endpoints: {
      discord: '/discord',
      api: '/api/discord'
    },
    status: 'running'
  });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`🚀 GLSL Discord Bot démarré sur le port ${port}`);
  console.log(`🌐 Endpoint Discord: http://localhost:${port}/discord`);
});

module.exports = app;
