/**
 * Script pour créer un shader via l'API Discord
 * Usage: node scripts/create-shader-via-api.js [shader-code] [userId]
 */

const fetch = require('node-fetch');

const BOT_API_URL = process.env.BOT_API_URL || 'https://glsl-discord-bot.onrender.com';
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const APPLICATION_ID = process.env.DISCORD_CLIENT_ID;

// Shader de test simple (plasma effect)
const DEFAULT_SHADER_CODE = `
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord / iResolution.xy;
    float time = iTime;
    
    // Effet plasma simple
    float c = sin(uv.x * 10.0 + time) * sin(uv.y * 10.0 + time) * 0.5 + 0.5;
    fragColor = vec4(c, c * 0.5, c * 0.8, 1.0);
}
`.trim();

async function createShader(shaderCode, userId) {
    console.log('🎨 Création d\'un shader via l\'API Discord...');
    console.log(`📡 URL: ${BOT_API_URL}/discord`);
    console.log(`👤 User ID: ${userId || 'test-user'}`);
    
    // Simuler une interaction Discord de type APPLICATION_COMMAND
    const interaction = {
        type: 2, // APPLICATION_COMMAND
        application_id: APPLICATION_ID,
        data: {
            id: `test-${Date.now()}`,
            name: 'shader',
            type: 1, // CHAT_INPUT
            options: [
                {
                    name: 'code',
                    type: 3, // STRING
                    value: shaderCode
                },
                {
                    name: 'name',
                    type: 3, // STRING
                    value: `Test Shader ${new Date().toISOString()}`
                }
            ]
        },
        member: {
            user: {
                id: userId || '123456789012345678',
                username: 'test-user',
                discriminator: '0000',
                avatar: null
            }
        },
        token: `test-token-${Date.now()}`,
        version: 1
    };
    
    try {
        const response = await fetch(`${BOT_API_URL}/discord`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Signature-Ed25519': 'test-signature',
                'X-Signature-Timestamp': Date.now().toString()
            },
            body: JSON.stringify(interaction)
        });
        
        const responseText = await response.text();
        console.log(`📥 Réponse (${response.status}):`, responseText.substring(0, 500));
        
        if (response.ok) {
            console.log('✅ Shader créé avec succès!');
            return true;
        } else {
            console.error('❌ Erreur lors de la création du shader');
            return false;
        }
    } catch (error) {
        console.error('❌ Erreur réseau:', error.message);
        return false;
    }
}

// Main
const shaderCode = process.argv[2] || DEFAULT_SHADER_CODE;
const userId = process.argv[3] || process.env.DISCORD_USER_ID || '123456789012345678';

createShader(shaderCode, userId)
    .then(success => {
        if (success) {
            console.log('\n✅ Le shader devrait apparaître dans votre dashboard!');
            console.log('💡 Rafraîchissez votre dashboard pour voir le nouveau shader.');
        } else {
            console.log('\n❌ Échec de la création du shader.');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });

