#!/usr/bin/env node

/**
 * Démarrage Local du Bot Discord GLSL
 * Ce fichier est utilisé uniquement pour le développement local
 * Sur Vercel, seule l'API route est active
 */

require('dotenv').config();
const { RealWebGLBot } = require('./src/index');

async function startBot() {
    try {
        console.log('🚀 Démarrage local du GLSL Discord Bot...');
        
        const bot = new RealWebGLBot();
        await bot.initialize();
        
        console.log('✅ Bot Discord démarré avec succès !');
        console.log('🌐 L\'API Vercel est séparée et gère les requêtes HTTP');
        
    } catch (error) {
        console.error('❌ Erreur lors du démarrage du bot:', error);
        process.exit(1);
    }
}

// Démarrer le bot seulement si on n'est pas sur Vercel
if (process.env.VERCEL !== '1') {
    startBot();
} else {
    console.log('🌐 Environnement Vercel détecté - Bot Discord non démarré');
}
