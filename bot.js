#!/usr/bin/env node

/**
 * Bot Discord Principal pour GLSL Shader Compiler
 * Utilise discord.js pour se connecter et gérer les interactions
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const { RealWebGLCompiler } = require('./src/real-webgl-compiler');
const { SimpleDatabase } = require('./src/simple-database');
const express = require('express');
const fs = require('fs');
const path = require('path');
const nacl = require('tweetnacl');
const crypto = require('crypto');

// Configuration
const config = require('./production.config.js');

// Clé publique Discord (Public Key depuis Discord Developer Portal)
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '342edad4bf8b7107f3f5c2077857f057090582e9841973afe23b05977d36e54a';

// Fonction pour vérifier la signature Discord avec body brut
function verifyDiscordSignatureWithRawBody(signature, timestamp, rawBody) {
    try {
        if (!signature || !timestamp || !rawBody) {
            console.log('⚠️ Paramètres manquants pour vérification:', {
                hasSignature: !!signature,
                hasTimestamp: !!timestamp,
                hasRawBody: !!rawBody,
                rawBodyType: typeof rawBody,
                isBuffer: Buffer.isBuffer(rawBody)
            });
            return false;
        }
        
        // S'assurer que rawBody est un Buffer
        let bodyBuffer = rawBody;
        if (!Buffer.isBuffer(bodyBuffer)) {
            if (typeof bodyBuffer === 'string') {
                bodyBuffer = Buffer.from(bodyBuffer, 'utf-8');
            } else {
                bodyBuffer = Buffer.from(JSON.stringify(bodyBuffer), 'utf-8');
            }
        }
        
        // Convertir la clé publique hex en Uint8Array
        const publicKey = Buffer.from(DISCORD_PUBLIC_KEY, 'hex');
        
        if (publicKey.length !== 32) {
            console.error('❌ Clé publique invalide, longueur:', publicKey.length, 'attendu: 32');
            return false;
        }
        
        // Créer le message à vérifier: timestamp + body brut
        const timestampBuffer = Buffer.from(timestamp, 'utf-8');
        const message = Buffer.concat([timestampBuffer, bodyBuffer]);
        
        // Convertir la signature hex en Buffer
        const sig = Buffer.from(signature, 'hex');
        
        if (sig.length !== 64) {
            console.error('❌ Signature invalide, longueur:', sig.length, 'attendu: 64');
            return false;
        }
        
        // Vérifier la signature
        const isValid = nacl.sign.detached.verify(
            new Uint8Array(message),
            new Uint8Array(sig),
            new Uint8Array(publicKey)
        );
        
        if (!isValid) {
            console.log('⚠️ Détails vérification signature:', {
                timestampLength: timestampBuffer.length,
                bodyLength: bodyBuffer.length,
                messageLength: message.length,
                signatureLength: sig.length,
                publicKeyLength: publicKey.length,
                bodyPreview: bodyBuffer.toString('utf-8').substring(0, 100)
            });
        }
        
        return isValid;
    } catch (error) {
        console.error('❌ Erreur vérification signature:', error.message, error.stack);
        return false;
    }
}

class GLSLDiscordBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers
            ]
        });
        
        this.commands = new Collection();
        this.compiler = new RealWebGLCompiler();
        this.database = new SimpleDatabase();
        this.cooldowns = new Collection();
        this.activeCompilations = new Set(); // Suivre les compilations en cours
        this.isShuttingDown = false; // Flag pour empêcher de nouvelles compilations pendant l'arrêt
        this.processedInteractions = new Set(); // Déduplication des interactions (ID + timestamp)
        this.activeCommands = new Map(); // Verrou pour empêcher l'exécution simultanée de la même commande (userId + commandName)
        
        // Cleanup automatique de la DB (tous les jours)
        if (this.database && typeof this.database.startAutoCleanup === 'function') {
            // Démarrer après initialisation
            setTimeout(() => {
                this.database.startAutoCleanup(24);
            }, 60000); // Attendre 1 minute après le démarrage
        }
    }

    async initialize() {
        try {
            console.log('🚀 Initialisation du bot Discord GLSL...');
            
            // Vérifier les variables d'environnement
            if (!process.env.DISCORD_TOKEN) {
                throw new Error('DISCORD_TOKEN manquant dans .env');
            }
            if (!process.env.DISCORD_CLIENT_ID) {
                throw new Error('DISCORD_CLIENT_ID manquant dans .env');
            }
            if (!process.env.DISCORD_PUBLIC_KEY) {
                console.warn('⚠️ DISCORD_PUBLIC_KEY non définie dans .env - la validation des signatures Discord peut échouer');
                console.warn('⚠️ Obtenez votre Public Key depuis: Discord Developer Portal > General Information > Public Key');
            }

            // Initialiser la base de données
            await this.database.initialize();
            console.log('✅ Base de données initialisée');

            // Initialiser le compilateur WebGL (peut échouer si Chrome n'est pas disponible)
            try {
                await this.compiler.initialize();
                console.log('✅ Compilateur WebGL initialisé');
            } catch (compilerError) {
                // Si c'est Chrome ou WebGL qui n'est pas disponible, continuer sans
                if (compilerError.message && (
                    compilerError.message.includes('Could not find Chrome') ||
                    compilerError.message.includes('Target closed') ||
                    compilerError.message.includes('Protocol error') ||
                    compilerError.message.includes('updateShader n\'est pas disponible') ||
                    compilerError.message.includes('WebGL')
                )) {
                    console.warn('⚠️ WebGL non disponible au démarrage - les shaders ne pourront pas être compilés');
                    console.warn('⚠️ Le bot va continuer à fonctionner, mais les shaders ne pourront pas être compilés');
                } else {
                    // Si c'est une autre erreur, la propager
                    throw compilerError;
                }
            }

            // Charger les commandes
            await this.loadCommands();
            console.log('✅ Commandes chargées');

            // Enregistrer les commandes slash
            await this.registerSlashCommands();
            console.log('✅ Commandes slash enregistrées');

            // Configurer les événements
            this.setupEvents();

            // Démarrer le serveur Express pour les endpoints HTTP
            this.startExpressServer();

            // Se connecter au bot
            await this.client.login(process.env.DISCORD_TOKEN);
            console.log('✅ Bot Discord connecté avec succès!');

        } catch (error) {
            console.error('❌ Erreur initialisation bot:', error);
            console.error('❌ Stack:', error.stack);
            // Si c'est juste Chrome qui n'est pas trouvé, ne pas quitter - l'installation runtime va le résoudre
            if (error.message && error.message.includes('Could not find Chrome')) {
                console.log('⚠️ Chrome non trouvé, mais l\'installation runtime devrait le résoudre au prochain redémarrage');
                console.log('⚠️ Le bot va continuer à fonctionner, mais les shaders ne pourront pas être compilés jusqu\'à ce que Chrome soit installé');
                // Ne pas quitter - laisser le bot démarrer quand même
                return;
            }
            // Attendre un peu avant de quitter pour voir les logs
            await new Promise(resolve => setTimeout(resolve, 2000));
            process.exit(1);
        }
    }

    async loadCommands() {
        const commandsPath = path.join(__dirname, 'commands');
        
        // Créer le dossier commands s'il n'existe pas
        if (!fs.existsSync(commandsPath)) {
            fs.mkdirSync(commandsPath, { recursive: true });
            console.log('📁 Dossier commands créé');
        }

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                this.commands.set(command.data.name, command);
                console.log(`✅ Commande chargée: ${command.data.name}`);
            } else {
                console.log(`⚠️ Commande invalide: ${file}`);
            }
        }
    }

    async registerSlashCommands() {
        const rest = new REST().setToken(process.env.DISCORD_TOKEN);
        const commands = [];

        for (const [name, command] of this.commands) {
            commands.push(command.data.toJSON());
        }

        try {
            console.log(`🔄 Enregistrement de ${commands.length} commandes slash...`);

            const data = await rest.put(
                Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                { body: commands }
            );

            console.log(`✅ ${data.length} commandes slash enregistrées avec succès`);
        } catch (error) {
            console.error('❌ Erreur enregistrement commandes:', error);
        }
    }

    setupEvents() {
        // Événement: Bot prêt
        this.client.once(Events.ClientReady, (readyClient) => {
            console.log(`✅ Bot prêt! Connecté en tant que ${readyClient.user.tag}`);
            this.client.user.setActivity('!shader help', { type: 'PLAYING' });
        });

        // Événement: Interactions (commandes slash)
        this.client.on(Events.InteractionCreate, async (interaction) => {
            // Déduplication : ignorer les interactions déjà traitées via HTTP
            const interactionKey = `${interaction.id}_${interaction.createdTimestamp}`;
            if (this.processedInteractions.has(interactionKey)) {
                console.log(`⏭️ Interaction ${interaction.id} déjà traitée (déduplication), ignorée`);
                return;
            }
            
            // Gérer l'autocomplete
            if (interaction.isAutocomplete()) {
                const command = this.commands.get(interaction.commandName);
                if (command && command.autocomplete) {
                    try {
                        await command.autocomplete(interaction);
                    } catch (error) {
                        console.error(`❌ Erreur autocomplete commande ${interaction.commandName}:`, error);
                    }
                }
                return;
            }

            if (!interaction.isChatInputCommand()) return;

            const command = this.commands.get(interaction.commandName);
            
            console.log(`🔍 Commande WebSocket reçue: ${interaction.commandName} (user: ${interaction.user.tag})`);

            if (!command) {
                console.error(`⚠️ Commande non trouvée: ${interaction.commandName}`);
                // Répondre immédiatement pour éviter le timeout
                if (!interaction.replied && !interaction.deferred) {
                    try {
                        await interaction.reply({
                            content: '❌ Commande non trouvée.',
                            ephemeral: true
                        });
                    } catch (e) {
                        console.error('Erreur réponse commande non trouvée:', e);
                    }
                }
                return;
            }

            // Vérifier le cooldown
            if (!this.checkCooldown(interaction.user.id, command)) {
                await interaction.reply({
                    content: '⏳ Vous devez attendre avant d\'utiliser cette commande à nouveau.',
                    ephemeral: true
                });
                return;
            }

            // Marquer l'interaction comme traitée
            this.processedInteractions.add(interactionKey);
            // Nettoyer les anciennes interactions après 5 minutes
            setTimeout(() => {
                this.processedInteractions.delete(interactionKey);
            }, 5 * 60 * 1000);

            // Verrou intelligent : pour /shader, permettre plusieurs générations différentes en parallèle
            // Pour les autres commandes, empêcher l'exécution simultanée de la même commande
            let commandLockKey;
            if (interaction.commandName === 'shader') {
                // Pour /shader, créer un hash du code shader pour permettre plusieurs générations différentes
                const shaderCode = interaction.options?.getString('code') || '';
                const shaderHash = crypto.createHash('md5').update(shaderCode).digest('hex').substring(0, 8);
                commandLockKey = `${interaction.user.id}_${interaction.commandName}_${shaderHash}`;
            } else {
                // Pour les autres commandes, utiliser juste userId + commandName
                commandLockKey = `${interaction.user.id}_${interaction.commandName}`;
            }
            
            if (this.activeCommands.has(commandLockKey)) {
                console.log(`⏭️ Commande ${interaction.commandName} déjà en cours d'exécution pour l'utilisateur ${interaction.user.id}, ignorée`);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '⏳ Cette commande est déjà en cours d\'exécution, veuillez patienter.',
                        ephemeral: true
                    });
                }
                return;
            }

            // Ajouter le verrou
            this.activeCommands.set(commandLockKey, Date.now());

            try {
                console.log(`▶️ Exécution commande WebSocket: ${interaction.commandName}`);
                await command.execute(interaction, {
                    compiler: this.compiler,
                    database: this.database,
                    bot: this
                });
                console.log(`✅ Commande ${interaction.commandName} exécutée avec succès`);
            } catch (error) {
                console.error(`❌ Erreur exécution commande ${interaction.commandName}:`, error);
                
                const errorMessage = {
                    content: '❌ Une erreur s\'est produite lors de l\'exécution de cette commande.'
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply(errorMessage).catch(() => {
                        interaction.followUp({ ...errorMessage, ephemeral: true }).catch(console.error);
                    });
                } else {
                    await interaction.reply({ ...errorMessage, ephemeral: true }).catch(console.error);
                }
            } finally {
                // Retirer le verrou après l'exécution (avec un délai pour éviter les doubles exécutions rapides)
                setTimeout(() => {
                    this.activeCommands.delete(commandLockKey);
                }, 2000); // 2 secondes de délai
            }
        });

        // Prefix commands (!shader) are deprecated - all commands are now slash commands (/)

        // Événement: Erreurs
        this.client.on(Events.Error, (error) => {
            console.error('❌ Erreur Discord:', error);
        });
    }

    // Generate a GLSL shader from natural language parameters (used by /shader-generate slash command)
    generateShaderFromParams(params) {
        const { forme, couleur, animation, vitesse, taille } = params;
        
        // Vitesse d'animation
        const speedMultiplier = vitesse === 'slow' ? 0.5 : vitesse === 'fast' ? 2.0 : 1.0;
        const animSpeed = 0.5 * speedMultiplier;
        
        // Taille normalisée (1-10 -> 0.1-1.0)
        const size = 0.1 + (taille - 1) * 0.1;
        
        // Fonction pour obtenir une couleur RGB
        const getColor = (colorName) => {
            const colors = {
                'red': 'vec3(1.0, 0.0, 0.0)',
                'green': 'vec3(0.0, 1.0, 0.0)',
                'blue': 'vec3(0.0, 0.4, 1.0)',
                'yellow': 'vec3(1.0, 1.0, 0.0)',
                'purple': 'vec3(0.8, 0.0, 1.0)',
                'orange': 'vec3(1.0, 0.5, 0.0)',
                'pink': 'vec3(1.0, 0.4, 0.8)',
                'cyan': 'vec3(0.0, 1.0, 1.0)',
                'white': 'vec3(1.0, 1.0, 1.0)',
                'black': 'vec3(0.0, 0.0, 0.0)',
                'rainbow': null, // Géré séparément
                'warm': null, // Géré séparément
                'cool': null // Géré séparément
            };
            return colors[colorName] || 'vec3(0.5, 0.5, 0.5)';
        };
        
        // Générer le code du shader
        let shaderCode = `// Shader généré: ${forme} ${couleur} ${animation}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    float animT = t * ${animSpeed.toFixed(2)};
    
    // Calcul de la distance à la forme
    float dist = 0.0;
    `;
        
        // Code pour calculer la distance selon la forme
        if (forme === 'circle') {
            shaderCode += `
    dist = length(uv);
    `;
        } else if (forme === 'square') {
            shaderCode += `
    dist = max(abs(uv.x), abs(uv.y));
    `;
        } else if (forme === 'triangle') {
            shaderCode += `
    float angle = atan(uv.y, uv.x);
    float dist2 = length(uv);
    dist = dist2 * cos(angle - 3.14159 / 3.0);
    `;
        } else if (forme === 'star') {
            shaderCode += `
    float angle = atan(uv.y, uv.x);
    float dist2 = length(uv);
    float star = abs(cos(angle * 2.5)) * 0.5 + 0.5;
    dist = dist2 / star;
    `;
        } else if (forme === 'heart') {
            shaderCode += `
    vec2 p = uv * vec2(1.2, 1.0);
    float x = p.x;
    float y = p.y;
    float heart = sqrt(x*x + y*y - abs(x)*y);
    dist = heart;
    `;
        } else if (forme === 'hexagon') {
            shaderCode += `
    vec2 p = abs(uv);
    dist = max(p.x * 0.866025 + p.y * 0.5, p.y);
    `;
        } else if (forme === 'diamond') {
            shaderCode += `
    dist = abs(uv.x) + abs(uv.y);
    `;
        } else if (forme === 'line') {
            shaderCode += `
    dist = abs(uv.x);
    `;
        } else if (forme === 'grid') {
            shaderCode += `
    vec2 grid = abs(fract(uv * 5.0) - 0.5);
    dist = min(grid.x, grid.y);
    `;
        } else if (forme === 'voronoi') {
            shaderCode += `
    vec2 id = floor(uv * 5.0);
    vec2 gv = fract(uv * 5.0) - 0.5;
    float minDist = 1.0;
    for(float y = -1.0; y <= 1.0; y++) {
        for(float x = -1.0; x <= 1.0; x++) {
            vec2 neighbor = vec2(x, y);
            vec2 point = neighbor + sin(id + neighbor) * 0.5;
            float distToPoint = length(gv - point);
            minDist = min(minDist, distToPoint);
        }
    }
    dist = minDist;
    `;
        }
        
        // Appliquer la taille
        shaderCode += `
    dist = dist / ${size.toFixed(2)};
    `;
        
        // Code pour la couleur
        if (couleur === 'rainbow') {
            shaderCode += `
    float hue = dist * 2.0 + animT * 0.5;
    vec3 col = 0.5 + 0.5 * cos(hue * 6.28318 + vec3(0.0, 2.094, 4.189));
    `;
        } else if (couleur === 'warm') {
            shaderCode += `
    vec3 col = vec3(1.0, 0.5 + dist * 0.5, dist * 0.3);
    `;
        } else if (couleur === 'cool') {
            shaderCode += `
    vec3 col = vec3(dist * 0.3, 0.5 + dist * 0.5, 1.0);
    `;
        } else {
            const colorCode = getColor(couleur);
            shaderCode += `
    vec3 col = ${colorCode};
    `;
        }
        
        // Code pour l'animation
        if (animation === 'rotation') {
            shaderCode += `
    float angle = atan(uv.y, uv.x) + animT;
    uv = vec2(cos(angle), sin(angle)) * length(uv);
    dist = length(uv);
    `;
        } else if (animation === 'pulse') {
            shaderCode += `
    dist *= 0.5 + 0.5 * sin(animT * 2.0);
    `;
        } else if (animation === 'wave') {
            shaderCode += `
    dist += sin(uv.x * 5.0 + animT) * 0.1;
    `;
        } else if (animation === 'zoom') {
            shaderCode += `
    uv *= 1.0 + sin(animT) * 0.3;
    dist = length(uv);
    `;
        } else if (animation === 'translate') {
            shaderCode += `
    uv += vec2(sin(animT), cos(animT)) * 0.2;
    dist = length(uv);
    `;
        } else if (animation === 'color_shift') {
            shaderCode += `
    col = 0.5 + 0.5 * cos(dist * 3.0 + animT + vec3(0.0, 2.094, 4.189));
    `;
        } else if (animation === 'twinkle') {
            shaderCode += `
    col *= 0.7 + 0.3 * sin(animT * 5.0 + dist * 10.0);
    `;
        }
        
        // Finaliser le shader
        shaderCode += `
    float alpha = 1.0 - smoothstep(0.0, 0.1, dist);
    fragColor = vec4(col * alpha, alpha);
}
`;
        
        return shaderCode;
    }

    getRainbowShader() {
        return `// Arc-en-ciel animé - Optimisé pour GIF (couleurs vibrantes, palette réduite)
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float angle = atan(uv.y, uv.x) + t * 0.5;
    float dist = length(uv);
    
    // Animation fluide à 30 FPS (vitesse adaptée)
    float hue = angle / 6.28318 + dist * 0.5 + t * 0.2;
    
    // Couleurs vibrantes optimisées pour GIF (saturation élevée)
    vec3 col = 0.5 + 0.5 * cos(hue * 6.28318 + vec3(0.0, 2.094, 4.189));
    
    // Quantification des couleurs pour meilleure compression GIF
    // Arrondir à 8 niveaux par canal (8^3 = 512 couleurs max)
    col = floor(col * 7.99) / 7.99;
    
    // Fade radial pour un rendu plus net
    float brightness = 1.0 - smoothstep(0.3, 0.7, dist);
    col *= brightness;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getMandelbrotShader() {
        return `// Mandelbrot fractal avec zoom animé
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Centre et zoom animés
    vec2 center = vec2(-0.5, 0.0);
    float zoom = 1.0 + sin(t * 0.3) * 0.5;
    
    vec2 c = center + uv / zoom;
    
    vec2 z = vec2(0.0);
    int iterations = 0;
    int maxIter = 100;
    
    for (int i = 0; i < 100; i++) {
        if (i >= maxIter) break;
        if (dot(z, z) > 4.0) break;
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        iterations = i;
    }
    
    float smoothIter = float(iterations) + 1.0 - log2(log2(max(dot(z, z), 1.0)));
    smoothIter /= float(maxIter);
    
    vec3 col = vec3(0.0);
    if (iterations < maxIter) {
        col = 0.5 + 0.5 * cos(vec3(0.0, 0.1, 0.2) + smoothIter * 6.28318);
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getPlasmaShader() {
        return `// Plasma effect animé
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float v = 0.0;
    v += sin((uv.x + t) * 5.0);
    v += sin((uv.y + t) * 5.0);
    v += sin((uv.x + uv.y + t) * 3.0);
    v += sin(length(uv) * 5.0 + t);
    v *= 0.25;
    
    vec3 col = 0.5 + 0.5 * cos(v + vec3(0.0, 2.0, 4.0));
    fragColor = vec4(col, 1.0);
}`;
    }

    getNoiseShader() {
        return `// Noise animé
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Noise simple
    vec2 p = uv * 10.0;
    float n = sin(p.x) * sin(p.y) * sin(t);
    n += sin(p.x * 2.0 + t) * sin(p.y * 2.0) * 0.5;
    n += sin(p.x * 4.0) * sin(p.y * 4.0 + t) * 0.25;
    n = n * 0.5 + 0.5;
    
    vec3 col = vec3(n);
    fragColor = vec4(col, 1.0);
}`;
    }

    getRainbowShader() {
        return `// Arc-en-ciel animé - Optimisé pour GIF (couleurs vibrantes, palette réduite)
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float angle = atan(uv.y, uv.x) + t * 0.5;
    float dist = length(uv);
    
    // Animation fluide à 30 FPS (vitesse adaptée)
    float hue = angle / 6.28318 + dist * 0.5 + t * 0.2;
    
    // Couleurs vibrantes optimisées pour GIF (saturation élevée)
    vec3 col = 0.5 + 0.5 * cos(hue * 6.28318 + vec3(0.0, 2.094, 4.189));
    
    // Quantification des couleurs pour meilleure compression GIF
    // Arrondir à 8 niveaux par canal (8^3 = 512 couleurs max)
    col = floor(col * 7.99) / 7.99;
    
    // Fade radial pour un rendu plus net
    float brightness = 1.0 - smoothstep(0.3, 0.7, dist);
    col *= brightness;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getRaymarchingShader() {
        return `// Raymarching avec sphère animée
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float map(vec3 p) {
    float t = iTime;
    vec3 pos = p;
    pos.y += sin(t * 0.5) * 0.3;
    pos.x += cos(t * 0.3) * 0.2;
    return sdSphere(pos, 0.3);
}

vec3 calcNormal(vec3 p) {
    float eps = 0.001;
    vec2 h = vec2(eps, 0.0);
    return normalize(vec3(
        map(p + h.xyy) - map(p - h.xyy),
        map(p + h.yxy) - map(p - h.yxy),
        map(p + h.yyx) - map(p - h.yyx)
    ));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Camera
    vec3 ro = vec3(0.0, 0.0, -2.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    
    // Rotation de la caméra
    float angle = t * 0.3;
    float c = cos(angle);
    float s = sin(angle);
    mat2 rot = mat2(c, -s, s, c);
    rd.xz = rot * rd.xz;
    ro.xz = rot * ro.xz;
    
    // Raymarching
    float d = 0.0;
    vec3 p = ro;
    bool hit = false;
    
    for (int i = 0; i < 64; i++) {
        p = ro + rd * d;
        float dist = map(p);
        if (dist < 0.001) {
            hit = true;
            break;
        }
        d += dist;
        if (d > 10.0) break;
    }
    
    vec3 col = vec3(0.0);
    
    if (hit) {
        vec3 n = calcNormal(p);
        vec3 light = normalize(vec3(1.0, 2.0, -1.0));
        float diff = max(dot(n, light), 0.0);
        
        // Couleur basée sur la position
        vec3 baseColor = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + t + p * 2.0);
        col = baseColor * (0.3 + diff * 0.7);
        
        // Réflexion spéculaire
        vec3 refl = reflect(-light, n);
        float spec = pow(max(dot(refl, -rd), 0.0), 32.0);
        col += vec3(1.0) * spec * 0.5;
    } else {
        // Fond dégradé
        col = vec3(0.1, 0.1, 0.15) + vec3(0.05) * uv.y;
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getMandelbrotShader() {
        return `// Mandelbrot Set avec zoom animé
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Zoom animé
    float zoom = 0.5 + 0.3 * sin(t * 0.2);
    vec2 c = uv * 3.0 * zoom - vec2(0.5, 0.0);
    
    vec2 z = vec2(0.0);
    float iterations = 0.0;
    const float maxIter = 100.0;
    
    for (float i = 0.0; i < maxIter; i++) {
        if (dot(z, z) > 4.0) break;
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        iterations = i;
    }
    
    float smoothIter = iterations + 1.0 - log(log(length(z))) / log(2.0);
    float col = smoothIter / maxIter;
    
    // Palette de couleurs
    vec3 color = 0.5 + 0.5 * cos(vec3(0.0, 0.1, 0.2) + col * 10.0 + t);
    fragColor = vec4(color, 1.0);
}`;
    }

    getPlasmaShader() {
        return `// Effet Plasma animé - Optimisé pour GIF (couleurs vibrantes, palette réduite)
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Animation fluide à 30 FPS
    float v = 0.0;
    v += sin((uv.x + t) * 10.0);
    v += sin((uv.y + t) * 10.0);
    v += sin((uv.x + uv.y + t) * 10.0);
    v += sin(length(uv - 0.5) * 20.0 - t * 2.0);
    v *= 0.25;
    
    // Palette de couleurs plasma vibrantes
    vec3 col = 0.5 + 0.5 * cos(v * 6.28318 + vec3(0.0, 2.094, 4.189) + t * 0.3);
    
    // Quantification des couleurs pour meilleure compression GIF (8 niveaux)
    col = floor(col * 7.99) / 7.99;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getNoiseShader() {
        return `// Noise/Perlin Noise animé
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Multi-octave noise
    float n = 0.0;
    n += noise(uv * 4.0 + t * 0.1) * 0.5;
    n += noise(uv * 8.0 + t * 0.15) * 0.25;
    n += noise(uv * 16.0 + t * 0.2) * 0.125;
    
    vec3 col = vec3(n);
    fragColor = vec4(col, 1.0);
}`;
    }

    getVoronoiShader() {
        return `// Voronoi Diagram animé
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec2 random2(vec2 st) {
    st = vec2(dot(st, vec2(127.1, 311.7)), dot(st, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(st) * 43758.5453123);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    uv *= 10.0;
    
    vec2 i_st = floor(uv);
    vec2 f_st = fract(uv);
    
    float min_dist = 1.0;
    vec3 color = vec3(0.0);
    
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = random2(i_st + neighbor);
            point = 0.5 + 0.5 * sin(t + 6.2831 * point);
            vec2 diff = neighbor + point - f_st;
            float dist = length(diff);
            if (dist < min_dist) {
                min_dist = dist;
                color = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + point.x * 10.0);
            }
        }
    }
    
    // Contours
    color *= smoothstep(0.0, 0.1, min_dist);
    fragColor = vec4(color, 1.0);
}`;
    }

    getTunnelShader() {
        return `// Tunnel effect animé
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Coordonnées polaires
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    // Créer le tunnel - Protection contre division par zéro
    // Utiliser max() pour éviter radius = 0 qui causerait une division par zéro
    float tunnel = 1.0 / max(radius, 0.001);
    tunnel += t * 0.5;
    
    // Pattern
    float pattern = sin(tunnel * 3.0 + angle * 5.0);
    pattern *= sin(tunnel * 2.0 - angle * 3.0);
    
    // Couleurs
    vec3 col = 0.5 + 0.5 * cos(pattern * 6.28318 + vec3(0.0, 2.0, 4.0) + t);
    col *= smoothstep(0.0, 0.3, radius);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getStarfieldShader() {
        return `// Champ d'étoiles animé amélioré
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Fond spatial profond
    vec3 col = vec3(0.01, 0.01, 0.05);
    
    // Créer des étoiles avec différentes couleurs et tailles
    for (float i = 0.0; i < 100.0; i++) {
        vec2 starPos = vec2(
            random(vec2(i, 0.0)),
            random(vec2(i, 1.0))
        );
        
        // Vitesse variable
        float starSpeed = random(vec2(i, 2.0)) * 0.8 + 0.2;
        starPos.y = fract(starPos.y - t * starSpeed * 0.3);
        
        vec2 starUV = uv - starPos;
        float dist = length(starUV);
        
        // Taille et luminosité variables
        float brightness = random(vec2(i, 3.0));
        float size = 0.003 + brightness * 0.008;
        float star = exp(-dist / size) * brightness;
        
        // Couleurs d'étoiles variées (blanc, bleu, jaune, rouge)
        vec3 starColor = vec3(1.0);
        float colorType = random(vec2(i, 4.0));
        if (colorType > 0.7) {
            starColor = vec3(0.7, 0.8, 1.0); // Bleu
        } else if (colorType > 0.4) {
            starColor = vec3(1.0, 0.9, 0.7); // Jaune
        } else if (colorType > 0.1) {
            starColor = vec3(1.0, 0.7, 0.6); // Rouge
        }
        
        // Scintillement
        float twinkle = sin(t * 3.0 + i * 10.0) * 0.3 + 0.7;
        star *= twinkle;
        
        col += starColor * star;
    }
    
    // Nébuleuse en arrière-plan
    float nebula = sin(uv.x * 5.0 + t * 0.2) * sin(uv.y * 3.0 + t * 0.15) * 0.1;
    col += vec3(0.3, 0.2, 0.5) * nebula;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getSpiralShader() {
        return `// Spirale multicolore animée - Optimisé pour GIF (bandes nettes, couleurs vibrantes)
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Calcul de la spirale avec animation fluide à 30 FPS
    float angle = atan(uv.y, uv.x);
    float dist = length(uv);
    float spiral = angle / 6.28318 + dist * 2.0 + t * 0.5;
    
    // Bandes nettes pour meilleure compression GIF (moins de dégradés fins)
    float bands = floor(sin(spiral * 6.28318 * 3.0) * 4.0 + 4.0) / 4.0;
    
    // Couleurs vibrantes basées sur la position dans la spirale
    float hue = spiral * 0.3 + t * 0.2;
    vec3 col = 0.5 + 0.5 * cos(hue * 6.28318 + vec3(0.0, 2.094, 4.189));
    
    // Quantification des couleurs pour palette réduite (8 niveaux)
    col = floor(col * 7.99) / 7.99;
    
    // Appliquer les bandes et un fade radial
    col *= bands;
    float fade = 1.0 - smoothstep(0.3, 1.2, dist);
    col *= fade;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getWaterShader() {
        return `// Ondes aquatiques - Optimisé pour GIF (couleurs nettes, palette réduite)
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Ondes multiples avec animation fluide à 30 FPS
    float wave1 = sin((uv.x + uv.y) * 10.0 + t * 2.0) * 0.5 + 0.5;
    float wave2 = sin((uv.x - uv.y) * 8.0 + t * 1.5) * 0.5 + 0.5;
    float wave3 = sin(length(uv - 0.5) * 15.0 - t * 3.0) * 0.5 + 0.5;
    
    // Combiner les ondes
    float waves = (wave1 + wave2 + wave3) / 3.0;
    
    // Quantifier les ondes pour bandes plus nettes (meilleure compression)
    waves = floor(waves * 8.0) / 8.0;
    
    // Couleurs aquatiques vibrantes
    vec3 col = mix(
        vec3(0.1, 0.3, 0.5),
        vec3(0.2, 0.6, 0.9),
        waves
    );
    
    // Reflets
    float reflection = pow(waves, 2.0);
    col += vec3(0.3, 0.5, 0.7) * reflection * 0.5;
    
    // Quantification finale des couleurs (8 niveaux)
    col = floor(col * 7.99) / 7.99;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getFireShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Position du feu (bas de l'écran)
    vec2 firePos = vec2(uv.x, 1.0 - uv.y);
    
    // Noise pour le feu
    float noise = sin(firePos.x * 10.0 + t * 2.0) * 
                  sin(firePos.y * 8.0 + t * 3.0) * 
                  sin((firePos.x + firePos.y) * 5.0 + t * 1.5);
    noise = noise * 0.5 + 0.5;
    
    // Forme du feu
    float fireShape = 1.0 - firePos.y;
    fireShape *= sin(firePos.x * 3.14159) * 0.5 + 0.5;
    fireShape = pow(fireShape, 0.5);
    
    // Combiner
    float fire = noise * fireShape;
    
    // Couleurs du feu (rouge, orange, jaune)
    vec3 col = vec3(0.0);
    if (fire > 0.6) {
        col = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 1.0, 0.0), (fire - 0.6) / 0.4);
    } else if (fire > 0.3) {
        col = mix(vec3(1.0, 0.1, 0.0), vec3(1.0, 0.3, 0.0), (fire - 0.3) / 0.3);
    } else {
        col = vec3(0.2, 0.0, 0.0) * fire / 0.3;
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getMatrixShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Colonnes de code
    float col = floor(uv.x * 40.0);
    float speed = sin(col * 0.1) * 0.5 + 1.5;
    float y = fract(uv.y - t * speed);
    
    // Caractères aléatoires
    float char = fract(sin(col * 43758.5453 + floor((uv.y - t * speed) * 20.0)) * 43758.5453);
    
    // Intensité (plus brillant en haut)
    float intensity = 1.0 - y;
    intensity = pow(intensity, 2.0);
    
    // Couleur verte Matrix
    vec3 colMatrix = vec3(0.0, char * intensity, 0.0);
    
    // Traînée
    float trail = smoothstep(0.0, 0.1, y) * smoothstep(0.3, 0.1, y);
    colMatrix += vec3(0.0, trail * 0.3, 0.0);
    
    fragColor = vec4(colMatrix, 1.0);
}`;
    }

    getMetaballsShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Plusieurs métaballs
    vec2 ball1 = vec2(0.3 + sin(t * 0.5) * 0.2, 0.4 + cos(t * 0.3) * 0.2);
    vec2 ball2 = vec2(0.7 + cos(t * 0.4) * 0.2, 0.6 + sin(t * 0.6) * 0.2);
    vec2 ball3 = vec2(0.5 + sin(t * 0.7) * 0.15, 0.3 + cos(t * 0.5) * 0.15);
    
    // Distance aux métaballs
    float d1 = length(uv - ball1);
    float d2 = length(uv - ball2);
    float d3 = length(uv - ball3);
    
    // Effet métaball (inverse de la distance)
    float metaball = 0.05 / d1 + 0.05 / d2 + 0.05 / d3;
    
    // Seuil pour créer l'effet de fusion
    float threshold = 0.8;
    float edge = smoothstep(threshold - 0.1, threshold + 0.1, metaball);
    
    // Couleurs dégradées
    vec3 col1 = vec3(0.2, 0.4, 1.0);
    vec3 col2 = vec3(1.0, 0.3, 0.5);
    vec3 col3 = vec3(0.3, 1.0, 0.4);
    
    vec3 col = mix(
        mix(col1, col2, sin(t) * 0.5 + 0.5),
        col3,
        cos(t * 0.7) * 0.5 + 0.5
    );
    
    fragColor = vec4(col * edge, 1.0);
}`;
    }

    getKaleidoscopeShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Coordonnées polaires
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    // Symétrie (6 segments)
    float segments = 6.0;
    angle = mod(angle + t * 0.2, 6.28318 / segments) * segments;
    
    // Convertir en coordonnées cartésiennes
    vec2 symUv = vec2(cos(angle), sin(angle)) * radius;
    
    // Pattern coloré
    float pattern = sin(symUv.x * 10.0 + t) * sin(symUv.y * 10.0 + t);
    pattern = pattern * 0.5 + 0.5;
    
    // Couleurs vives
    vec3 col = 0.5 + 0.5 * cos(pattern * 6.28318 + vec3(0, 2, 4) + t);
    
    // Fade radial
    float fade = 1.0 - smoothstep(0.5, 1.0, radius);
    col *= fade;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getAuroraShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Vagues d'aurore
    float wave1 = sin(uv.x * 3.0 + t * 0.5) * 0.5 + 0.5;
    float wave2 = sin(uv.x * 5.0 - t * 0.3) * 0.5 + 0.5;
    float wave3 = sin(uv.x * 7.0 + t * 0.7) * 0.5 + 0.5;
    
    // Position verticale de l'aurore
    float auroraY = wave1 * 0.3 + wave2 * 0.2 + wave3 * 0.1;
    float dist = abs(uv.y - auroraY);
    
    // Intensité
    float intensity = exp(-dist * 10.0) * (wave1 + wave2 + wave3) / 3.0;
    
    // Couleurs aurore (vert, bleu, pourpre)
    vec3 col = vec3(0.0);
    col += vec3(0.2, 1.0, 0.3) * intensity * wave1;
    col += vec3(0.1, 0.5, 1.0) * intensity * wave2;
    col += vec3(0.8, 0.2, 1.0) * intensity * wave3 * 0.5;
    
    // Étoiles
    float stars = step(0.998, sin(uv.x * 100.0) * sin(uv.y * 100.0));
    col += vec3(1.0) * stars * 0.5;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getMandelbulbShader() {
        return `// Mandelbulb 3D fractal amélioré avec raymarching et éclairage réaliste
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

vec3 mandelbulb(vec3 pos, float power) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    
    for (int i = 0; i < 12; i++) {
        r = length(z);
        if (r > 2.0) break;
        
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        
        float zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;
        
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        z += pos;
    }
    
    return vec3(0.5 * log(r) * r / dr);
}

vec3 calculateNormal(vec3 p, float power) {
    float eps = 0.001;
    vec3 n = vec3(
        mandelbulb(p + vec3(eps, 0.0, 0.0), power).x - mandelbulb(p - vec3(eps, 0.0, 0.0), power).x,
        mandelbulb(p + vec3(0.0, eps, 0.0), power).x - mandelbulb(p - vec3(0.0, eps, 0.0), power).x,
        mandelbulb(p + vec3(0.0, 0.0, eps), power).x - mandelbulb(p - vec3(0.0, 0.0, eps), power).x
    );
    return normalize(n);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Camera avec orbite
    float camAngle = t * 0.3;
    float camDist = 3.5;
    vec3 ro = vec3(sin(camAngle) * camDist, sin(t * 0.2) * 0.5, cos(camAngle) * camDist);
    vec3 target = vec3(0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);
    
    // Raymarching amélioré
    float d = 0.0;
    vec3 p = ro;
    float dist = 0.0;
    float power = 8.0;
    
    for (int i = 0; i < 80; i++) {
        p = ro + rd * d;
        vec3 res = mandelbulb(p, power);
        dist = res.x;
        if (dist < 0.0001) break;
        d += dist * 0.8;
        if (d > 15.0) break;
    }
    
    // Couleur avec éclairage réaliste
    vec3 col = vec3(0.0);
    if (dist < 0.001) {
        // Calcul de la normale pour l'éclairage
        vec3 n = calculateNormal(p, power);
        
        // Éclairage directionnel
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        float diff = max(dot(n, lightDir), 0.0);
        float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0);
        
        // Couleur basée sur la position et l'itération
        vec3 baseCol = 0.5 + 0.5 * cos(vec3(0.5, 1.0, 1.5) + p * 0.5 + t * 0.5);
        baseCol = mix(baseCol, vec3(0.2, 0.4, 0.8), 0.3);
        
        // Éclairage avec ombres douces
        col = baseCol * (0.3 + diff * 0.7) + vec3(1.0) * spec * 0.5;
        
        // Fog pour la profondeur
        float fog = exp(-d * 0.1);
        col = mix(vec3(0.05, 0.05, 0.1), col, fog);
    } else {
        col = vec3(0.02, 0.02, 0.05);
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getMandelbulb2Shader() {
        return `// Mandelbulb variation avec power 6.0 et palette colorée
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

vec3 mandelbulb(vec3 pos, float power) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    
    for (int i = 0; i < 10; i++) {
        r = length(z);
        if (r > 2.0) break;
        
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        
        float zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;
        
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        z += pos;
    }
    
    return vec3(0.5 * log(r) * r / dr);
}

vec3 calculateNormal(vec3 p, float power) {
    float eps = 0.001;
    vec3 n = vec3(
        mandelbulb(p + vec3(eps, 0.0, 0.0), power).x - mandelbulb(p - vec3(eps, 0.0, 0.0), power).x,
        mandelbulb(p + vec3(0.0, eps, 0.0), power).x - mandelbulb(p - vec3(0.0, eps, 0.0), power).x,
        mandelbulb(p + vec3(0.0, 0.0, eps), power).x - mandelbulb(p - vec3(0.0, 0.0, eps), power).x
    );
    return normalize(n);
}

vec3 palette(float t) {
    // Palette colorée vibrante pour mandelbulb2
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.8, 0.5, 0.4); // Palette chaude et colorée
    return a + b * cos(6.28318 * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float camAngle = t * 0.25;
    float camDist = 3.0;
    vec3 ro = vec3(sin(camAngle) * camDist, cos(t * 0.15) * 0.3, cos(camAngle) * camDist);
    vec3 target = vec3(0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);
    
    float d = 0.0;
    vec3 p = ro;
    float dist = 0.0;
    float power = 6.0;
    
    for (int i = 0; i < 70; i++) {
        p = ro + rd * d;
        vec3 res = mandelbulb(p, power);
        dist = res.x;
        if (dist < 0.0001) break;
        d += dist * 0.8;
        if (d > 12.0) break;
    }
    
    vec3 col = vec3(0.0);
    if (dist < 0.001) {
        vec3 n = calculateNormal(p, power);
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        float diff = max(dot(n, lightDir), 0.0);
        
        // Palette colorée vibrante basée sur la profondeur et le temps
        float colorT = length(p) * 0.4 + t * 0.3 + p.y * 0.2;
        vec3 baseCol = palette(colorT);
        // Ajouter plus de saturation pour power 6.0
        baseCol = pow(baseCol, vec3(0.8)); // Augmenter la saturation
        
        col = baseCol * (0.5 + diff * 0.7);
        float fog = exp(-d * 0.1);
        col = mix(vec3(0.05, 0.05, 0.1), col, fog);
    } else {
        col = vec3(0.02, 0.02, 0.05);
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getMandelbulb3Shader() {
        return `// Mandelbulb variation avec power 10.0 et éclairage dramatique
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

vec3 mandelbulb(vec3 pos, float power) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    
    for (int i = 0; i < 14; i++) {
        r = length(z);
        if (r > 2.0) break;
        
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        
        float zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;
        
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        z += pos;
    }
    
    return vec3(0.5 * log(r) * r / dr);
}

vec3 calculateNormal(vec3 p, float power) {
    float eps = 0.001;
    vec3 n = vec3(
        mandelbulb(p + vec3(eps, 0.0, 0.0), power).x - mandelbulb(p - vec3(eps, 0.0, 0.0), power).x,
        mandelbulb(p + vec3(0.0, eps, 0.0), power).x - mandelbulb(p - vec3(0.0, eps, 0.0), power).x,
        mandelbulb(p + vec3(0.0, 0.0, eps), power).x - mandelbulb(p - vec3(0.0, 0.0, eps), power).x
    );
    return normalize(n);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float camAngle = t * 0.35;
    float camDist = 4.0;
    vec3 ro = vec3(sin(camAngle) * camDist, sin(t * 0.25) * 0.6, cos(camAngle) * camDist);
    vec3 target = vec3(0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);
    
    float d = 0.0;
    vec3 p = ro;
    float dist = 0.0;
    float power = 10.0;
    
    for (int i = 0; i < 90; i++) {
        p = ro + rd * d;
        vec3 res = mandelbulb(p, power);
        dist = res.x;
        if (dist < 0.0001) break;
        d += dist * 0.8;
        if (d > 18.0) break;
    }
    
    vec3 col = vec3(0.0);
    if (dist < 0.001) {
        vec3 n = calculateNormal(p, power);
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
        float diff = max(dot(n, lightDir), 0.0);
        float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 64.0);
        
        // Éclairage dramatique pour power 10.0 - couleurs chaudes et contrastées
        vec3 baseCol = vec3(0.9, 0.4, 0.15) + vec3(0.3, 0.6, 1.0) * (p.y * 0.6 + 0.4);
        baseCol = pow(baseCol, vec3(0.9)); // Contraste élevé
        col = baseCol * (0.15 + diff * 0.85) + vec3(1.0, 0.95, 0.8) * spec * 1.0;
        
        // Fog plus sombre pour plus de drame
        float fog = exp(-d * 0.06);
        col = mix(vec3(0.0, 0.0, 0.02), col, fog);
    } else {
        col = vec3(0.0, 0.0, 0.05);
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getMandelbulb4Shader() {
        return `// Mandelbulb variation avec power 4.0 et style minimaliste
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

vec3 mandelbulb(vec3 pos, float power) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    
    for (int i = 0; i < 8; i++) {
        r = length(z);
        if (r > 2.0) break;
        
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        
        float zr = pow(r, power);
        theta = theta * power;
        phi = phi * power;
        
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        z += pos;
    }
    
    return vec3(0.5 * log(r) * r / dr);
}

vec3 calculateNormal(vec3 p, float power) {
    float eps = 0.001;
    vec3 n = vec3(
        mandelbulb(p + vec3(eps, 0.0, 0.0), power).x - mandelbulb(p - vec3(eps, 0.0, 0.0), power).x,
        mandelbulb(p + vec3(0.0, eps, 0.0), power).x - mandelbulb(p - vec3(0.0, eps, 0.0), power).x,
        mandelbulb(p + vec3(0.0, 0.0, eps), power).x - mandelbulb(p - vec3(0.0, 0.0, eps), power).x
    );
    return normalize(n);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float camAngle = t * 0.2;
    float camDist = 2.8;
    vec3 ro = vec3(sin(camAngle) * camDist, 0.0, cos(camAngle) * camDist);
    vec3 target = vec3(0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);
    
    float d = 0.0;
    vec3 p = ro;
    float dist = 0.0;
    float power = 4.0;
    
    for (int i = 0; i < 60; i++) {
        p = ro + rd * d;
        vec3 res = mandelbulb(p, power);
        dist = res.x;
        if (dist < 0.0001) break;
        d += dist * 0.8;
        if (d > 10.0) break;
    }
    
    // Style minimaliste pour power 4.0 - tons de gris élégants
    vec3 col = vec3(0.98);
    if (dist < 0.001) {
        vec3 n = calculateNormal(p, power);
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        float diff = max(dot(n, lightDir), 0.0);
        float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 16.0);
        
        // Tons de gris minimalistes avec subtiles variations
        vec3 baseCol = vec3(0.85) + vec3(0.1) * (p.y * 0.3 + 0.7);
        col = baseCol * (0.6 + diff * 0.4) + vec3(1.0) * spec * 0.3;
        
        // Fog très léger pour style épuré
        float fog = exp(-d * 0.2);
        col = mix(vec3(0.98), col, fog);
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getRippleShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Centre de l'écran
    vec2 center = vec2(0.5);
    
    // Distance du centre
    float dist = length(uv - center);
    
    // Ondes concentriques
    float ripple1 = sin(dist * 20.0 - t * 5.0) * 0.5 + 0.5;
    float ripple2 = sin(dist * 25.0 - t * 6.0) * 0.5 + 0.5;
    float ripple3 = sin(dist * 30.0 - t * 7.0) * 0.5 + 0.5;
    
    // Combiner les ondes
    float ripple = (ripple1 + ripple2 + ripple3) / 3.0;
    
    // Atténuation avec la distance
    float fade = 1.0 - smoothstep(0.0, 0.5, dist);
    ripple *= fade;
    
    // Couleurs aquatiques
    vec3 col = mix(
        vec3(0.1, 0.2, 0.4),
        vec3(0.3, 0.6, 0.9),
        ripple
    );
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getParticlesShader() {
        return `// Système de particules amélioré
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Fond sombre
    vec3 col = vec3(0.02, 0.02, 0.05);
    
    // Plusieurs particules avec comportements variés
    for (int i = 0; i < 30; i++) {
        float id = float(i);
        
        // Position animée avec trajectoire circulaire/elliptique
        float angle = id * 0.5 + t * (0.3 + fract(id * 0.1) * 0.2);
        float radius = 0.2 + fract(id * 0.07) * 0.3;
        vec2 center = vec2(0.5 + sin(id) * 0.2, 0.5 + cos(id * 1.3) * 0.2);
        
        vec2 pos = center + vec2(sin(angle), cos(angle)) * radius;
        pos = fract(pos);
        
        // Distance à la particule
        float dist = length(uv - pos);
        
        // Taille variable
        float size = 0.008 + fract(id * 0.13) * 0.015;
        float intensity = exp(-dist / size) * (0.7 + 0.3 * sin(t * 2.0 + id));
        
        // Couleur par particule (spectre complet)
        vec3 pcol = 0.5 + 0.5 * cos(vec3(0, 2, 4) + id * 0.5 + t * 0.3);
        
        // Traînée de mouvement
        vec2 vel = vec2(sin(angle), cos(angle)) * 0.02;
        for (int j = 1; j <= 5; j++) {
            vec2 trailPos = pos - vel * float(j);
            float trailDist = length(uv - trailPos);
            float trailFade = 1.0 - (float(j) / 5.0);
            intensity += exp(-trailDist / (size * 0.5)) * trailFade * 0.2;
        }
        
        // Lueur autour des particules
        float glow = exp(-dist * 30.0) * 0.3;
        
        col += pcol * (intensity + glow);
    }
    
    // Effet de bloom (lueur globale)
    col = pow(col, vec3(0.8));
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getHexagonShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Grille hexagonale
    uv *= 10.0;
    vec2 id = floor(uv);
    vec2 gv = fract(uv) - 0.5;
    
    // Coordonnées hexagonales
    float x = gv.x;
    float y = gv.y;
    float hex = abs(x) + abs(y + x * 0.5);
    
    // Pattern
    float pattern = sin(hex * 3.14159 * 2.0 + t + id.x * 0.5 + id.y * 0.3);
    pattern = pattern * 0.5 + 0.5;
    
    // Couleurs
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + id.x * 0.1 + id.y * 0.1 + t);
    col *= pattern;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getJuliaShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Paramètre Julia animé
    vec2 c = vec2(0.7885 * cos(t * 0.1), 0.7885 * sin(t * 0.1));
    
    // Itération
    vec2 z = uv * 2.0;
    float iterations = 0.0;
    const float maxIter = 100.0;
    
    for (float i = 0.0; i < maxIter; i++) {
        if (dot(z, z) > 4.0) break;
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        iterations = i;
    }
    
    // Couleur basée sur les itérations
    float col = iterations / maxIter;
    vec3 color = 0.5 + 0.5 * cos(vec3(0, 2, 4) + col * 10.0 + t);
    
    fragColor = vec4(color, 1.0);
}`;
    }

    getLavaShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Bulles de lave
    vec3 col = vec3(0.1, 0.0, 0.0);
    
    for (int i = 0; i < 5; i++) {
        float id = float(i);
        vec2 pos = vec2(0.2 + id * 0.15, 0.3 + sin(t * 0.3 + id) * 0.2);
        
        // Mouvement vertical
        pos.y += fract(t * 0.2 + id * 0.3) * 0.6;
        
        float dist = length(uv - pos);
        float bubble = 1.0 - smoothstep(0.05, 0.15, dist);
        
        // Couleur chaude
        vec3 bubbleCol = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.8, 0.2), bubble);
        col = mix(col, bubbleCol, bubble * 0.8);
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getElectricShader() {
        return `// Éclairs/orage amélioré
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Fond orageux
    vec3 col = vec3(0.05, 0.05, 0.1);
    
    // Nuages orageux animés
    for (int i = 0; i < 5; i++) {
        float id = float(i);
        vec2 cloudPos = vec2(
            fract(id * 0.3 + t * 0.05),
            0.7 + sin(id) * 0.1
        );
        float cloudDist = length(uv - cloudPos);
        float cloud = exp(-cloudDist * 3.0) * 0.3;
        col += vec3(0.2, 0.2, 0.25) * cloud;
    }
    
    // Éclairs multiples avec branches
    for (int i = 0; i < 3; i++) {
        float id = float(i);
        float x = 0.2 + id * 0.3 + sin(t * 0.5 + id) * 0.1;
        float y = 0.9;
        
        // Éclair principal (zigzag)
        float lightning = 0.0;
        float currentY = y;
        float currentX = x;
        float prevX = x;
        
        for (int j = 0; j < 20; j++) {
            float segY = currentY - float(j) * 0.05;
            if (segY < 0.0) break;
            
            // Zigzag aléatoire mais cohérent
            float zigzag = sin(segY * 20.0 + id * 10.0 + t * 2.0) * 0.05;
            currentX = prevX + zigzag;
            
            // Segment d'éclair
            vec2 segPos = vec2(currentX, segY);
            float segDist = length(uv - segPos);
            float segWidth = 0.01 + float(j) * 0.001;
            lightning += exp(-segDist / segWidth) * (1.0 - float(j) / 20.0);
            
            // Branches secondaires
            if (mod(float(j), 3.0) < 0.5) {
                float branchAngle = sin(segY * 30.0 + id * 5.0) * 0.3;
                vec2 branchDir = vec2(sin(branchAngle), cos(branchAngle));
                for (int k = 1; k <= 3; k++) {
                    vec2 branchPos = segPos + branchDir * float(k) * 0.03;
                    float branchDist = length(uv - branchPos);
                    lightning += exp(-branchDist / 0.005) * 0.3 / float(k);
                }
            }
            
            prevX = currentX;
        }
        
        // Flash aléatoire
        float flash = step(0.95, random(vec2(id, floor(t * 2.0))));
        lightning *= 0.3 + flash * 0.7;
        
        // Couleur éclair (bleu/blanc)
        vec3 boltColor = mix(vec3(0.3, 0.5, 1.0), vec3(1.0, 1.0, 1.0), flash);
        col += boltColor * lightning;
        
        // Lueur autour de l'éclair
        col += boltColor * lightning * 0.2;
    }
    
    // Pluie
    for (int i = 0; i < 50; i++) {
        float id = float(i);
        vec2 dropPos = vec2(
            fract(id * 0.1 + t * 0.3),
            fract(id * 0.07 - t * 0.5)
        );
        float dropDist = abs(uv.x - dropPos.x);
        float drop = smoothstep(0.0, 0.002, dropDist) * 
                     smoothstep(0.01, 0.0, dropDist) *
                     step(dropPos.y, uv.y) * step(uv.y, dropPos.y + 0.05);
        col += vec3(0.5, 0.6, 0.8) * drop * 0.3;
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getSmokeShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Fumée qui monte
    vec2 smokePos = vec2(uv.x, 1.0 - uv.y);
    
    // Noise pour la fumée
    float noise = sin(smokePos.x * 5.0 + t) * 
                  sin(smokePos.y * 3.0 + t * 0.5) * 
                  sin((smokePos.x + smokePos.y) * 4.0 + t * 0.7);
    noise = noise * 0.5 + 0.5;
    
    // Forme de la fumée
    float smokeShape = 1.0 - smokePos.y;
    smokeShape *= exp(-abs(smokePos.x - 0.5) * 3.0);
    smokeShape = pow(smokeShape, 0.3);
    
    // Combiner
    float smoke = noise * smokeShape;
    
    // Couleurs grises/blanches
    vec3 col = mix(vec3(0.1), vec3(0.8), smoke);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getDNAShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Double hélice
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    // Hélice 1
    float helix1 = sin(angle * 3.0 + uv.y * 5.0 + t);
    float dist1 = abs(radius - 0.3 - helix1 * 0.1);
    
    // Hélice 2
    float helix2 = sin(angle * 3.0 + uv.y * 5.0 + t + 3.14159);
    float dist2 = abs(radius - 0.3 - helix2 * 0.1);
    
    // Barres de connexion
    float connections = step(0.02, abs(radius - 0.3)) * step(abs(uv.y * 10.0 - floor(uv.y * 10.0)) - 0.1, 0.05);
    
    // Couleur
    vec3 col = vec3(0.0);
    col += vec3(0.2, 0.8, 0.2) * exp(-dist1 * 50.0);
    col += vec3(0.8, 0.2, 0.2) * exp(-dist2 * 50.0);
    col += vec3(0.5, 0.5, 0.5) * connections;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getMoireShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Motifs de Moiré
    float pattern1 = sin(uv.x * 20.0 + t) * 0.5 + 0.5;
    float pattern2 = sin(uv.y * 20.0 + t * 0.7) * 0.5 + 0.5;
    float pattern3 = sin((uv.x + uv.y) * 15.0 - t * 0.5) * 0.5 + 0.5;
    
    // Interférence
    float moire = pattern1 * pattern2 * pattern3;
    
    // Couleurs contrastées
    vec3 col = vec3(moire);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getTreeShader() {
        return `// Arbre fractal amélioré avec animation et détails
void drawBranchLevel(int level, vec2 start, vec2 dir, float width, float len, float t, vec2 pos, float sway, inout vec3 col) {
        float scale = pow(0.7, float(level));
        float branchWidth = width * scale;
        float branchLength = len * scale;
        vec2 branchStart = start + dir * len * (1.0 - pow(0.7, float(level)));
        
        // Dessiner les branches selon le niveau (utiliser des constantes)
        if (level == 0) {
            for (int b = 0; b < 1; b++) {
                float branchId = float(b);
                float angleOffset = (branchId - 0.5) * 0.8;
                float branchAngle = sway + angleOffset + sin(t * 0.5) * 0.1;
                vec2 branchDir = vec2(sin(branchAngle), cos(branchAngle));
                vec2 toBranch = pos - branchStart;
                float alongBranch = dot(toBranch, branchDir);
                if (alongBranch >= 0.0 && alongBranch <= branchLength) {
                    vec2 perp = vec2(-branchDir.y, branchDir.x);
                    float distFromBranch = abs(dot(toBranch, perp));
                    if (distFromBranch < branchWidth) {
                        col = mix(col, vec3(0.4, 0.3, 0.2), smoothstep(branchWidth, branchWidth * 0.5, distFromBranch));
                    }
                }
            }
        } else if (level == 1) {
            for (int b = 0; b < 2; b++) {
                float branchId = float(b);
                float angleOffset = (branchId - 1.0) * 0.8;
                float branchAngle = sway + angleOffset + sin(t * 0.5 + 0.3) * 0.1;
                vec2 branchDir = vec2(sin(branchAngle), cos(branchAngle));
                vec2 toBranch = pos - branchStart;
                float alongBranch = dot(toBranch, branchDir);
                if (alongBranch >= 0.0 && alongBranch <= branchLength) {
                    vec2 perp = vec2(-branchDir.y, branchDir.x);
                    float distFromBranch = abs(dot(toBranch, perp));
                    if (distFromBranch < branchWidth) {
                        float fade = 0.83;
                        col = mix(col, vec3(0.4, 0.3, 0.2), smoothstep(branchWidth, branchWidth * 0.5, distFromBranch) * fade);
                    }
                }
            }
        } else if (level == 2) {
            for (int b = 0; b < 4; b++) {
                float branchId = float(b);
                float angleOffset = (branchId - 2.0) * 0.8;
                float branchAngle = sway + angleOffset + sin(t * 0.5 + 0.6) * 0.1;
                vec2 branchDir = vec2(sin(branchAngle), cos(branchAngle));
                vec2 toBranch = pos - branchStart;
                float alongBranch = dot(toBranch, branchDir);
                if (alongBranch >= 0.0 && alongBranch <= branchLength) {
                    vec2 perp = vec2(-branchDir.y, branchDir.x);
                    float distFromBranch = abs(dot(toBranch, perp));
                    if (distFromBranch < branchWidth) {
                        float fade = 0.67;
                        col = mix(col, vec3(0.4, 0.3, 0.2), smoothstep(branchWidth, branchWidth * 0.5, distFromBranch) * fade);
                    }
                }
            }
        } else if (level == 3) {
            for (int b = 0; b < 8; b++) {
                float branchId = float(b);
                float angleOffset = (branchId - 4.0) * 0.8;
                float branchAngle = sway + angleOffset + sin(t * 0.5 + 0.9) * 0.1;
                vec2 branchDir = vec2(sin(branchAngle), cos(branchAngle));
                vec2 toBranch = pos - branchStart;
                float alongBranch = dot(toBranch, branchDir);
                if (alongBranch >= 0.0 && alongBranch <= branchLength) {
                    vec2 perp = vec2(-branchDir.y, branchDir.x);
                    float distFromBranch = abs(dot(toBranch, perp));
                    if (distFromBranch < branchWidth) {
                        float fade = 0.5;
                        col = mix(col, vec3(0.4, 0.3, 0.2), smoothstep(branchWidth, branchWidth * 0.5, distFromBranch) * fade);
                    }
                }
            }
        } else if (level == 4) {
            for (int b = 0; b < 16; b++) {
                float branchId = float(b);
                float angleOffset = (branchId - 8.0) * 0.8;
                float branchAngle = sway + angleOffset + sin(t * 0.5 + 1.2) * 0.1;
                vec2 branchDir = vec2(sin(branchAngle), cos(branchAngle));
                vec2 toBranch = pos - branchStart;
                float alongBranch = dot(toBranch, branchDir);
                if (alongBranch >= 0.0 && alongBranch <= branchLength) {
                    vec2 perp = vec2(-branchDir.y, branchDir.x);
                    float distFromBranch = abs(dot(toBranch, perp));
                    if (distFromBranch < branchWidth) {
                        float fade = 0.33;
                        col = mix(col, vec3(0.4, 0.3, 0.2), smoothstep(branchWidth, branchWidth * 0.5, distFromBranch) * fade);
                    }
                }
            }
        } else if (level == 5) {
            for (int b = 0; b < 32; b++) {
                float branchId = float(b);
                float angleOffset = (branchId - 16.0) * 0.8;
                float branchAngle = sway + angleOffset + sin(t * 0.5 + 1.5) * 0.1;
                vec2 branchDir = vec2(sin(branchAngle), cos(branchAngle));
                vec2 toBranch = pos - branchStart;
                float alongBranch = dot(toBranch, branchDir);
                if (alongBranch >= 0.0 && alongBranch <= branchLength) {
                    vec2 perp = vec2(-branchDir.y, branchDir.x);
                    float distFromBranch = abs(dot(toBranch, perp));
                    if (distFromBranch < branchWidth) {
                        float fade = 0.17;
                        col = mix(col, vec3(0.4, 0.3, 0.2), smoothstep(branchWidth, branchWidth * 0.5, distFromBranch) * fade);
                        
                        // Feuilles aux extrémités (plus nombreuses et variées)
                        if (alongBranch > branchLength * 0.7) {
                            for (int l = 0; l < 3; l++) {
                                float leafId = float(l);
                                float leafOffset = (leafId - 1.0) * 0.03;
                                vec2 leafPos = branchStart + branchDir * branchLength + vec2(leafOffset, 0.0);
                                float leafDist = length(pos - leafPos);
                                if (leafDist < 0.05) {
                                    float leaf = exp(-leafDist * 20.0);
                                    vec3 leafColor = vec3(0.1, 0.5 + sin(t + leafId) * 0.1, 0.15);
                                    col += leafColor * leaf * 0.8;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    vec2 pos = vec2(uv.x - 0.5, 1.0 - uv.y);
    
    // Fond ciel réaliste avec dégradé
    vec3 col = mix(vec3(0.3, 0.5, 0.8), vec3(0.6, 0.8, 1.0), uv.y);
    
    // Nuages animés
    for (int i = 0; i < 5; i++) {
        float id = float(i);
        vec2 cloudPos = vec2(fract(id * 0.3 + t * 0.05), 0.6 + sin(id) * 0.15);
        float cloudDist = length(uv - cloudPos);
        float cloudNoise = fract(sin(dot(cloudPos * 5.0 + vec2(t * 0.1), vec2(12.9898, 78.233))) * 43758.5453123);
        float cloud = exp(-cloudDist * 4.0) * (0.3 + cloudNoise * 0.2);
        col = mix(col, vec3(0.9, 0.95, 1.0), cloud);
    }
    
    // Sol avec herbe et texture
    float groundY = 0.18;
    float ground = smoothstep(groundY - 0.02, groundY + 0.02, pos.y);
    float grassNoise = fract(sin(dot(pos * vec2(30.0, 10.0) + vec2(t * 0.1), vec2(12.9898, 78.233))) * 43758.5453123);
    vec3 groundCol = mix(vec3(0.2, 0.4, 0.15), vec3(0.15, 0.35, 0.1), grassNoise);
    col = mix(col, groundCol, ground);
    
    // Tronc principal avec texture d'écorce
    vec2 trunkStart = vec2(0.0, groundY);
    float trunkHeight = 0.35;
    float trunkWidth = 0.04;
    float sway = sin(t * 0.4) * 0.03;
    
    vec2 trunkDir = normalize(vec2(sway, 1.0));
    vec2 toTrunk = pos - trunkStart;
    float alongTrunk = dot(toTrunk, trunkDir);
    
    if (alongTrunk >= 0.0 && alongTrunk <= trunkHeight) {
        vec2 perp = vec2(-trunkDir.y, trunkDir.x);
        float distFromTrunk = abs(dot(toTrunk, perp));
        
        if (distFromTrunk < trunkWidth) {
            float barkNoise = fract(sin(dot(vec2(alongTrunk * 20.0, distFromTrunk * 50.0), vec2(12.9898, 78.233))) * 43758.5453123);
            vec3 barkCol = mix(vec3(0.35, 0.25, 0.15), vec3(0.45, 0.35, 0.25), barkNoise);
            
            vec2 lightDir = normalize(vec2(0.3, 0.9));
            float trunkLight = dot(trunkDir, lightDir) * 0.5 + 0.5;
            barkCol *= trunkLight;
            
            col = mix(col, barkCol, smoothstep(trunkWidth, trunkWidth * 0.6, distFromTrunk));
        }
    }
    
    // Branches principales (3-4 branches)
    for (int i = 0; i < 4; i++) {
        float id = float(i);
        float branchY = trunkStart.y + trunkHeight * (0.4 + id * 0.15);
        float branchAngle = (id - 1.5) * 0.6 + sway * 0.5;
        branchAngle += sin(t * 0.3 + id) * 0.1;
        
        vec2 branchStart = vec2(0.0, branchY);
        vec2 branchDir = vec2(sin(branchAngle), cos(branchAngle));
        float branchLen = 0.15 - id * 0.03;
        float branchW = trunkWidth * (0.7 - id * 0.15);
        
        vec2 toBranch = pos - branchStart;
        float alongBranch = dot(toBranch, branchDir);
        
        if (alongBranch >= 0.0 && alongBranch <= branchLen) {
            vec2 perp = vec2(-branchDir.y, branchDir.x);
            float distFromBranch = abs(dot(toBranch, perp));
            
            if (distFromBranch < branchW) {
                vec3 branchCol = vec3(0.4, 0.3, 0.2);
                float branchLight = dot(branchDir, normalize(vec2(0.3, 0.9))) * 0.5 + 0.5;
                branchCol *= branchLight;
                col = mix(col, branchCol, smoothstep(branchW, branchW * 0.5, distFromBranch));
                
                // Feuilles aux extrémités
                if (alongBranch > branchLen * 0.6) {
                    vec2 leafCenter = branchStart + branchDir * branchLen;
                    float leafDist = length(pos - leafCenter);
                    
                    if (leafDist < 0.08) {
                        vec2 leafLocal = pos - leafCenter;
                        float leafAngle = atan(leafLocal.y, leafLocal.x);
                        float leafShape = length(leafLocal) / (0.08 * (0.7 + 0.3 * abs(cos(leafAngle * 2.0))));
                        
                        if (leafShape < 1.0) {
                            vec3 leafCol = vec3(0.1, 0.6 + sin(t + id * 2.0) * 0.1, 0.2);
                            float leafLight = dot(normalize(leafLocal), normalize(vec2(0.3, 0.9))) * 0.5 + 0.5;
                            leafCol *= leafLight;
                            col = mix(col, leafCol, smoothstep(1.0, 0.7, leafShape));
                        }
                    }
                }
            }
        }
    }
    
    // Feuilles supplémentaires (nuages de feuilles)
    for (int i = 0; i < 15; i++) {
        float id = float(i);
        vec2 leafPos = vec2(
            sin(id * 123.456) * 0.25,
            trunkStart.y + trunkHeight * 0.5 + abs(cos(id * 234.567)) * 0.25
        );
        float leafDist = length(pos - leafPos);
        
        if (leafDist < 0.06) {
            float leafShape = leafDist / (0.06 * (0.8 + 0.2 * fract(sin(dot(leafPos * 10.0, vec2(12.9898, 78.233))) * 43758.5453123))));
            if (leafShape < 1.0) {
                vec3 leafCol = vec3(0.1, 0.55 + sin(t * 0.5 + id) * 0.1, 0.2);
                float leafLight = dot(normalize(pos - leafPos), normalize(vec2(0.3, 0.9))) * 0.5 + 0.5;
                col = mix(col, leafCol * leafLight, smoothstep(1.0, 0.6, leafShape) * 0.7);
            }
        }
    }
    
    // Ombres portées
    vec2 shadowDir = normalize(vec2(0.3, 0.9));
    float shadow = 0.0;
    if (pos.y < groundY) {
        vec2 shadowPos = pos - shadowDir * (groundY - pos.y) * 0.3;
        float shadowDist = length(shadowPos - trunkStart);
        if (shadowDist < trunkWidth * 1.5) {
            shadow = 0.3 * smoothstep(trunkWidth * 1.5, trunkWidth * 0.5, shadowDist);
        }
    }
    col *= (1.0 - shadow);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getGalaxyShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Coordonnées polaires
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    // Bras spiralés
    float spiral = angle / 6.28318 + radius * 2.0 + t * 0.1;
    float arms = sin(spiral * 6.28318 * 2.0) * 0.5 + 0.5;
    arms = pow(arms, 3.0);
    
    // Centre brillant
    float center = exp(-radius * 5.0);
    
    // Étoiles
    float stars = step(0.99, fract(sin(uv.x * 100.0) * sin(uv.y * 100.0)));
    
    // Couleurs cosmiques
    vec3 col = vec3(0.1, 0.05, 0.2);
    col += vec3(0.5, 0.3, 0.8) * arms * (1.0 - radius);
    col += vec3(1.0, 0.8, 0.6) * center;
    col += vec3(1.0) * stars * 0.5;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getGradientShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Dégradé animé
    float gradient = uv.x + sin(t) * 0.1;
    gradient = fract(gradient);
    
    // Couleurs qui changent
    vec3 col = 0.5 + 0.5 * cos(gradient * 6.28318 + vec3(0, 2, 4) + t);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getSineShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Ondes sinusoïdales
    float wave1 = sin(uv.x * 10.0 + t * 2.0) * 0.5 + 0.5;
    float wave2 = sin(uv.x * 15.0 - t * 1.5) * 0.5 + 0.5;
    float wave3 = sin(uv.x * 20.0 + t * 3.0) * 0.5 + 0.5;
    
    // Combiner
    float waves = (wave1 + wave2 + wave3) / 3.0;
    
    // Couleur
    vec3 col = vec3(waves);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getCircuitShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Grille de circuit
    vec2 grid = floor(uv * 20.0);
    vec2 cell = fract(uv * 20.0);
    
    // Lignes de circuit
    float circuit = 0.0;
    circuit += step(0.1, cell.x) * step(cell.x, 0.9) * step(abs(cell.y - 0.5), 0.02);
    circuit += step(0.1, cell.y) * step(cell.y, 0.9) * step(abs(cell.x - 0.5), 0.02);
    
    // Nœuds
    float nodes = step(length(cell - 0.5), 0.05);
    
    // Animation
    float pulse = sin(t * 2.0 + grid.x + grid.y) * 0.5 + 0.5;
    
    // Couleur verte/cyan
    vec3 col = vec3(0.0, circuit * 0.8 * pulse, circuit * 0.5 * pulse);
    col += vec3(0.0, 1.0, 1.0) * nodes * pulse;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getNebulaShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Nébuleuse
    vec2 center = vec2(0.5);
    float dist = length(uv - center);
    
    // Noise pour la texture
    float noise = sin(dist * 10.0 + t) * 
                  sin(atan(uv.y - center.y, uv.x - center.x) * 5.0 + t * 0.5);
    noise = noise * 0.5 + 0.5;
    
    // Forme de la nébuleuse
    float nebula = exp(-dist * 2.0) * noise;
    
    // Couleurs cosmiques
    vec3 col = vec3(0.1, 0.05, 0.2);
    col += vec3(0.8, 0.3, 0.9) * nebula;
    col += vec3(0.2, 0.6, 1.0) * nebula * 0.5;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getCrystalShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Facettes de cristal
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    // Facettes hexagonales
    float facets = sin(angle * 6.0 + t * 0.2) * 0.5 + 0.5;
    facets = pow(facets, 5.0);
    
    // Réfraction
    float refraction = sin(radius * 10.0 - t) * 0.5 + 0.5;
    
    // Couleurs cristallines
    vec3 col = vec3(0.2, 0.5, 0.9) * facets;
    col += vec3(0.5, 0.8, 1.0) * refraction * 0.3;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getMazeShader() {
        return `// Labyrinthe généré avec algorithme réaliste et éclairage dramatique
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Grille de labyrinthe
    float gridSize = 16.0;
    vec2 cellCoord = floor(uv * gridSize);
    vec2 cellUV = fract(uv * gridSize);
    
    // Génération cohérente du labyrinthe
    vec2 cell = cellCoord;
    float cellHash = random(cell);
    
    // Déterminer si c'est un mur ou un couloir
    bool isWallCell = false;
    
    // Murs verticaux (entre les cellules)
    if (cellUV.x < 0.12) {
        vec2 leftCell = cell + vec2(-1.0, 0.0);
        float leftHash = random(leftCell);
        if (leftHash > 0.42 || cellHash > 0.42) {
            isWallCell = true;
        }
    } else if (cellUV.x > 0.88) {
        if (cellHash > 0.42) {
            isWallCell = true;
        }
    }
    
    // Murs horizontaux
    if (cellUV.y < 0.12) {
        vec2 bottomCell = cell + vec2(0.0, -1.0);
        float bottomHash = random(bottomCell);
        if (bottomHash > 0.38 || cellHash > 0.38) {
            isWallCell = true;
        }
    } else if (cellUV.y > 0.88) {
        if (cellHash > 0.38) {
            isWallCell = true;
        }
    }
    
    // Murs centraux pour créer des obstacles
    if (cellUV.x > 0.35 && cellUV.x < 0.65 && cellUV.y > 0.35 && cellUV.y < 0.65) {
        if (cellHash > 0.55) {
            isWallCell = true;
        }
    }
    
    // Couleurs
    vec3 wallCol = vec3(0.15, 0.15, 0.25);
    vec3 floorCol = vec3(0.35, 0.35, 0.45);
    
    vec3 col = isWallCell ? wallCol : floorCol;
    
    // Éclairage avec torche animée
    vec2 torchPos = vec2(0.5 + sin(t * 0.4) * 0.25, 0.5 + cos(t * 0.35) * 0.25);
    float torchDist = length(uv - torchPos);
    float torchLight = exp(-torchDist * 5.0) * (1.0 + sin(t * 2.5) * 0.15);
    
    // Éclairage directionnel
    vec2 lightDir = normalize(vec2(0.4, 0.9));
    float directionalLight = dot(normalize(uv - vec2(0.5)), lightDir) * 0.25 + 0.75;
    
    col *= (0.25 + torchLight * 0.75 + directionalLight * 0.15);
    
    // Lueur de la torche
    if (torchDist < 0.18) {
        vec3 torchGlow = vec3(1.0, 0.65, 0.25) * exp(-torchDist * 10.0);
        col += torchGlow * 0.6;
    }
    
    // Ombres dans les coins
    float cornerShadow = smoothstep(0.0, 0.12, min(cellUV.x, cellUV.y)) * 
                        smoothstep(0.0, 0.12, min(1.0 - cellUV.x, 1.0 - cellUV.y));
    col *= (0.65 + cornerShadow * 0.35);
    
    // Texture de sol
    if (!isWallCell) {
        float floorTexture = random(cell * 2.0) * 0.1 + 0.9;
        col *= floorTexture;
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getSnowShader() {
        return `// Neige améliorée avec flocons réalistes
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Fond bleu nuit avec dégradé
    vec3 col = mix(vec3(0.02, 0.05, 0.15), vec3(0.05, 0.1, 0.2), uv.y);
    
    // Flocons de neige animés avec mouvement réaliste
    for (int i = 0; i < 50; i++) {
        float id = float(i);
        
        // Position animée avec vitesse variable et dérive horizontale
        float speed = 0.2 + fract(id * 0.1) * 0.3;
        float drift = sin(t * 0.3 + id * 0.5) * 0.02;
        float xPos = fract(sin(id * 43758.5453) + t * 0.03 + drift);
        float yPos = fract(cos(id * 12345.6789) - t * speed);
        vec2 pos = vec2(xPos, yPos);
        
        float dist = length(uv - pos);
        
        // Taille variable des flocons
        float size = 0.006 + fract(id * 0.07) * 0.014;
        float flake = 1.0 - smoothstep(0.0, size, dist);
        
        // Forme de flocon étoilé à 6 branches
        float angle = atan(uv.y - pos.y, uv.x - pos.x);
        float flakeShape = abs(sin(angle * 3.0)) * 0.6 + 0.4;
        flakeShape *= abs(sin(angle * 6.0 + 1.57)) * 0.3 + 0.7;
        flake *= flakeShape;
        
        // Rotation du flocon
        float rotation = t * 0.5 + id;
        float rotatedAngle = angle + rotation;
        float rotatedShape = abs(sin(rotatedAngle * 3.0)) * 0.6 + 0.4;
        flake *= rotatedShape * 0.5 + 0.5;
        
        // Lueur autour des flocons
        float glow = exp(-dist * 40.0) * 0.4;
        
        // Scintillement
        float twinkle = sin(t * 2.0 + id * 5.0) * 0.2 + 0.8;
        
        col += vec3(1.0) * (flake + glow) * 0.6 * twinkle;
    }
    
    // Flocons au sol (accumulation avec texture)
    float ground = smoothstep(0.82, 0.9, uv.y);
    float groundTexture = sin(uv.x * 50.0 + t * 0.1) * 0.1 + 0.9;
    col += vec3(1.0) * ground * groundTexture * 0.4;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getCloudsShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Nuages
    float clouds = 0.0;
    
    for (int i = 0; i < 5; i++) {
        float id = float(i);
        vec2 pos = vec2(0.2 + id * 0.15, 0.3 + sin(t * 0.1 + id) * 0.1);
        pos.x += fract(t * 0.05 + id) * 1.2 - 0.1;
        
        float dist = length(uv - pos);
        float cloud = exp(-dist * 3.0);
        
        // Texture de nuage
        float noise = sin(dist * 10.0 + t) * sin(atan(uv.y - pos.y, uv.x - pos.x) * 5.0);
        cloud *= noise * 0.3 + 0.7;
        
        clouds = max(clouds, cloud);
    }
    
    // Couleurs de ciel
    vec3 col = mix(vec3(0.5, 0.7, 1.0), vec3(1.0), clouds);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getLavaFlowShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Coulée de lave
    vec2 lavaPos = vec2(uv.x, 1.0 - uv.y);
    
    // Texture de lave
    float noise = sin(lavaPos.x * 8.0 + t * 0.5) * 
                  sin(lavaPos.y * 6.0 + t * 0.7) * 
                  sin((lavaPos.x + lavaPos.y) * 4.0 + t);
    noise = noise * 0.5 + 0.5;
    
    // Forme de coulée
    float flow = 1.0 - lavaPos.y;
    flow *= sin(lavaPos.x * 3.14159) * 0.3 + 0.7;
    flow = pow(flow, 0.4);
    
    // Combiner
    float lava = noise * flow;
    
    // Couleurs chaudes
    vec3 col = mix(
        vec3(0.2, 0.0, 0.0),
        mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 1.0, 0.3), lava),
        lava
    );
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getGridShader() {
        return `// Grille animée améliorée
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Grille avec zoom animé
    float zoom = 8.0 + sin(t * 0.5) * 2.0;
    vec2 grid = fract(uv * zoom);
    
    // Lignes principales
    float lineWidth = 0.015;
    float linesX = step(lineWidth, grid.x) * step(grid.x, 1.0 - lineWidth);
    float linesY = step(lineWidth, grid.y) * step(grid.y, 1.0 - lineWidth);
    float lines = linesX * linesY;
    
    // Lignes de grille (plus fines)
    float gridLines = step(0.005, grid.x) * step(grid.x, 0.995) * 
                      step(0.005, grid.y) * step(grid.y, 0.995);
    
    // Animation de pulsation
    float pulse = sin(t * 2.0) * 0.3 + 0.7;
    
    // Effet de scan (ligne qui se déplace)
    float scanLine = abs(fract(uv.y * zoom - t * 0.5) - 0.5) < 0.02 ? 1.0 : 0.0;
    
    // Couleurs avec dégradé
    vec3 gridColor = vec3(0.1, 0.3, 0.6);
    vec3 lineColor = vec3(0.3, 0.6, 1.0);
    vec3 scanColor = vec3(0.5, 0.8, 1.0);
    
    // Fond
    vec3 col = vec3(0.05, 0.05, 0.1);
    
    // Grille
    col = mix(col, gridColor, gridLines * 0.3 * pulse);
    col = mix(col, lineColor, (1.0 - lines) * 0.6 * pulse);
    
    // Ligne de scan
    col += scanColor * scanLine * 0.5;
    
    // Points d'intersection brillants
    float intersection = (1.0 - linesX) * (1.0 - linesY);
    col += vec3(1.0, 1.0, 0.8) * intersection * 0.8;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getSpiralGalaxyShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Galaxie spirale
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    // Bras spiralés multiples
    float spiral1 = angle / 6.28318 + radius * 1.5 + t * 0.1;
    float spiral2 = angle / 6.28318 + radius * 1.5 + t * 0.1 + 3.14159;
    
    float arms1 = sin(spiral1 * 6.28318 * 2.0) * 0.5 + 0.5;
    float arms2 = sin(spiral2 * 6.28318 * 2.0) * 0.5 + 0.5;
    float arms = max(arms1, arms2);
    arms = pow(arms, 2.0);
    
    // Centre
    float center = exp(-radius * 8.0);
    
    // Couleurs
    vec3 col = vec3(0.05, 0.02, 0.1);
    col += vec3(0.6, 0.4, 0.9) * arms * (1.0 - radius * 0.5);
    col += vec3(1.0, 0.9, 0.7) * center;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getBubblesShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Bulles
    vec3 col = vec3(0.1, 0.2, 0.4);
    
    for (int i = 0; i < 15; i++) {
        float id = float(i);
        vec2 pos = vec2(
            fract(sin(id * 43758.5453) + t * 0.1),
            fract(cos(id * 12345.6789) - t * (0.15 + id * 0.02))
        );
        
        float dist = length(uv - pos);
        float bubble = 1.0 - smoothstep(0.03, 0.08, dist);
        
        // Reflet
        float reflection = step(dist, 0.05) * (1.0 - abs(uv.x - pos.x) * 10.0);
        
        col = mix(col, vec3(0.7, 0.9, 1.0), bubble * 0.5);
        col += vec3(1.0) * reflection * 0.3;
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getLightRaysShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Rayons de lumière
    vec2 center = vec2(0.5, 0.3);
    vec2 dir = uv - center;
    float angle = atan(dir.y, dir.x);
    float dist = length(dir);
    
    // Rayons
    float rays = sin(angle * 8.0 + t * 0.5) * 0.5 + 0.5;
    rays = pow(rays, 10.0);
    rays *= exp(-dist * 2.0);
    
    // Couleur dorée
    vec3 col = vec3(0.1, 0.05, 0.0);
    col += vec3(1.0, 0.9, 0.6) * rays;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getTurbulenceShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Turbulence
    vec2 p = uv;
    for (int i = 0; i < 4; i++) {
        p = vec2(
            sin(p.y * 3.0 + t * 0.5) * 0.5 + 0.5,
            cos(p.x * 3.0 - t * 0.3) * 0.5 + 0.5
        );
    }
    
    // Couleurs
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + p.x * 10.0 + p.y * 10.0 + t);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getMorphingShader() {
        return `// Morphing amélioré entre plusieurs formes
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Cycle de morphing entre 4 formes
    float cycle = fract(t * 0.3);
    float morph1 = smoothstep(0.0, 0.25, cycle) * (1.0 - smoothstep(0.25, 0.5, cycle));
    float morph2 = smoothstep(0.25, 0.5, cycle) * (1.0 - smoothstep(0.5, 0.75, cycle));
    float morph3 = smoothstep(0.5, 0.75, cycle) * (1.0 - smoothstep(0.75, 1.0, cycle));
    float morph4 = smoothstep(0.75, 1.0, cycle) + (1.0 - smoothstep(0.0, 0.25, cycle));
    
    // Forme 1: Cercle
    float circle = 1.0 - smoothstep(0.25, 0.3, length(uv));
    
    // Forme 2: Carré
    float square = smoothstep(0.25, 0.3, max(abs(uv.x), abs(uv.y)));
    square = 1.0 - square;
    
    // Forme 3: Triangle
    vec2 p = abs(uv);
    float triangle = step(p.y, 0.4 - p.x * 0.577);
    triangle = smoothstep(0.0, 0.02, triangle) - smoothstep(0.02, 0.04, triangle);
    
    // Forme 4: Étoile
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    float star = 1.0 - smoothstep(0.2, 0.25, radius);
    star *= step(0.0, cos(angle * 5.0 + 1.57));
    
    // Morphing fluide
    float shape = circle * morph1 + square * morph2 + triangle * morph3 + star * morph4;
    
    // Rotation pendant le morphing
    float rotation = t * 0.2;
    float c = cos(rotation);
    float s = sin(rotation);
    vec2 rotUv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    
    // Motif intérieur animé
    float pattern = sin(rotUv.x * 8.0 + t * 2.0) * sin(rotUv.y * 8.0 + t * 1.5) * 0.3 + 0.7;
    
    // Couleurs qui changent avec le morphing
    vec3 col1 = vec3(1.0, 0.3, 0.3); // Rouge pour cercle
    vec3 col2 = vec3(0.3, 0.3, 1.0); // Bleu pour carré
    vec3 col3 = vec3(0.3, 1.0, 0.3); // Vert pour triangle
    vec3 col4 = vec3(1.0, 1.0, 0.3); // Jaune pour étoile
    
    vec3 shapeCol = col1 * morph1 + col2 * morph2 + col3 * morph3 + col4 * morph4;
    
    // Lueur
    float glow = exp(-(1.0 - shape) * 10.0) * 0.4;
    
    vec3 col = vec3(0.05, 0.05, 0.1);
    col += shapeCol * shape * pattern;
    col += shapeCol * glow;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getGeometricShader() {
        return `// Formes géométriques améliorées avec animations multiples
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    vec3 col = vec3(0.05, 0.05, 0.1);
    
    // Triangle rotatif
    float angle1 = t * 0.5;
    float c1 = cos(angle1);
    float s1 = sin(angle1);
    vec2 rotUv1 = vec2(uv.x * c1 - uv.y * s1, uv.x * s1 + uv.y * c1);
    float tri = step(rotUv1.y, -rotUv1.x * 0.577 + 0.25) * 
                step(rotUv1.y, rotUv1.x * 0.577 + 0.25) * 
                step(-0.25, rotUv1.y);
    tri = smoothstep(0.0, 0.02, tri) - smoothstep(0.02, 0.04, tri);
    col += vec3(1.0, 0.3, 0.3) * tri;
    
    // Cercle pulsant
    float circleRadius = 0.2 + sin(t * 2.0) * 0.05;
    float circle = smoothstep(circleRadius + 0.02, circleRadius, length(uv - vec2(0.3, 0.2)));
    circle -= smoothstep(circleRadius - 0.02, circleRadius, length(uv - vec2(0.3, 0.2)));
    col += vec3(0.3, 1.0, 0.3) * circle;
    
    // Carré rotatif avec coins arrondis
    float angle2 = -t * 0.4;
    float c2 = cos(angle2);
    float s2 = sin(angle2);
    vec2 rotUv2 = vec2(uv.x * c2 - uv.y * s2, uv.x * s2 + uv.y * c2);
    vec2 squarePos = rotUv2 - vec2(-0.3, -0.2);
    float square = smoothstep(0.18, 0.2, max(abs(squarePos.x), abs(squarePos.y)));
    square -= smoothstep(0.2, 0.22, max(abs(squarePos.x), abs(squarePos.y)));
    col += vec3(0.3, 0.3, 1.0) * square;
    
    // Hexagone
    float angle3 = t * 0.3;
    float c3 = cos(angle3);
    float s3 = sin(angle3);
    vec2 rotUv3 = vec2(uv.x * c3 - uv.y * s3, uv.x * s3 + uv.y * c3);
    vec2 hexPos = rotUv3 - vec2(0.0, 0.3);
    float hexAngle = atan(hexPos.y, hexPos.x);
    float hexDist = length(hexPos);
    float hex = smoothstep(0.18, 0.2, hexDist);
    hex -= smoothstep(0.2, 0.22, hexDist);
    hex *= step(0.0, cos(hexAngle * 3.0 + 1.57));
    col += vec3(1.0, 1.0, 0.3) * hex;
    
    // Pentagone
    float angle4 = -t * 0.35;
    float c4 = cos(angle4);
    float s4 = sin(angle4);
    vec2 rotUv4 = vec2(uv.x * c4 - uv.y * s4, uv.x * s4 + uv.y * c4);
    vec2 pentPos = rotUv4 - vec2(-0.3, 0.3);
    float pentAngle = atan(pentPos.y, pentPos.x);
    float pentDist = length(pentPos);
    float pent = smoothstep(0.15, 0.17, pentDist);
    pent -= smoothstep(0.17, 0.19, pentDist);
    pent *= step(0.0, cos(pentAngle * 2.5 + 1.57));
    col += vec3(1.0, 0.3, 1.0) * pent;
    
    // Lignes de connexion animées
    float connection = 0.0;
    vec2 p1 = vec2(0.0, 0.3);
    vec2 p2 = vec2(0.3, 0.2);
    vec2 p3 = vec2(-0.3, -0.2);
    vec2 p4 = vec2(0.0, -0.25);
    
    float dist1 = abs(dot(uv - p1, normalize(p2 - p1))) + length(uv - mix(p1, p2, clamp(dot(uv - p1, p2 - p1) / dot(p2 - p1, p2 - p1), 0.0, 1.0)));
    connection += exp(-dist1 * 50.0) * (0.5 + 0.5 * sin(t * 3.0));
    
    float dist2 = abs(dot(uv - p2, normalize(p3 - p2))) + length(uv - mix(p2, p3, clamp(dot(uv - p2, p3 - p2) / dot(p3 - p2, p3 - p2), 0.0, 1.0)));
    connection += exp(-dist2 * 50.0) * (0.5 + 0.5 * sin(t * 3.0 + 1.0));
    
    col += vec3(0.5, 0.5, 0.5) * connection * 0.3;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getCosmicShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Effet cosmique
    vec2 center = vec2(0.5);
    float dist = length(uv - center);
    
    // Vagues cosmiques
    float waves = sin(dist * 10.0 - t * 2.0) * 
                  sin(atan(uv.y - center.y, uv.x - center.x) * 5.0 + t);
    waves = waves * 0.5 + 0.5;
    
    // Étoiles
    float stars = step(0.995, fract(sin(uv.x * 200.0) * sin(uv.y * 200.0)));
    
    // Couleurs cosmiques
    vec3 col = vec3(0.05, 0.02, 0.1);
    col += vec3(0.8, 0.4, 1.0) * waves * exp(-dist * 1.5);
    col += vec3(1.0, 0.9, 0.8) * stars;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getSwirlShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Tourbillon
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    // Rotation
    angle += radius * 3.0 + t * 2.0;
    
    // Pattern
    float pattern = sin(angle * 5.0) * sin(radius * 10.0 - t);
    pattern = pattern * 0.5 + 0.5;
    
    // Couleurs
    vec3 col = 0.5 + 0.5 * cos(pattern * 6.28318 + vec3(0, 2, 4) + t);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getEnergyShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Énergie
    vec2 center = vec2(0.5);
    float dist = length(uv - center);
    
    // Vagues d'énergie
    float energy = sin(dist * 15.0 - t * 3.0) * 
                   sin(atan(uv.y - center.y, uv.x - center.x) * 8.0 + t * 2.0);
    energy = energy * 0.5 + 0.5;
    energy = pow(energy, 2.0);
    
    // Pulsation
    float pulse = sin(t * 3.0) * 0.3 + 0.7;
    
    // Couleurs énergétiques
    vec3 col = vec3(0.0, 0.0, 0.1);
    col += vec3(0.0, 1.0, 1.0) * energy * pulse * exp(-dist * 2.0);
    col += vec3(1.0, 1.0, 0.5) * energy * pulse * 0.3 * exp(-dist * 3.0);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getFractalShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Fractale simple
    vec2 z = uv * 2.0;
    vec2 c = vec2(0.3 * sin(t * 0.1), 0.5 * cos(t * 0.1));
    
    float iterations = 0.0;
    for (float i = 0.0; i < 50.0; i++) {
        if (dot(z, z) > 4.0) break;
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        iterations = i;
    }
    
    // Couleur
    float col = iterations / 50.0;
    vec3 color = 0.5 + 0.5 * cos(vec3(0, 2, 4) + col * 15.0 + t);
    
    fragColor = vec4(color, 1.0);
}`;
    }

    // ========== 50 NOUVEAUX SHADERS ==========
    
    getWavesShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv * 10.0;
    float wave = sin(p.x + t) + sin(p.y + t * 0.7);
    wave = floor(wave * 3.99) / 3.99;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + wave * 3.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getLensShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    vec2 center = vec2(0.0);
    float dist = length(uv - center);
    vec2 dir = normalize(uv - center);
    
    float lens = 0.3 / (dist + 0.1);
    vec2 newUV = uv + dir * lens * sin(t);
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + newUV.x * 10.0 + newUV.y * 10.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getKaleidoscope2Shader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    angle = mod(angle + t * 0.2, 3.14159 / 3.0);
    vec2 p = vec2(cos(angle), sin(angle)) * radius;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + p.x * 5.0 + p.y * 5.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getDistortionShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv;
    p.x += sin(p.y * 10.0 + t) * 0.1;
    p.y += cos(p.x * 10.0 + t) * 0.1;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + p.x * 10.0 + p.y * 10.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getMirrorShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv;
    p.x = abs(p.x - 0.5) * 2.0;
    p.y = abs(p.y - 0.5) * 2.0;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + p.x * 10.0 + p.y * 10.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getReflectionShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv;
    if (p.y > 0.5) {
        p.y = 1.0 - p.y;
    }
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + p.x * 10.0 + p.y * 10.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getGlitchShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv;
    p.x += sin(t * 10.0) * 0.1 * step(0.9, fract(t));
    p.y += cos(t * 8.0) * 0.05 * step(0.9, fract(t * 1.3));
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + p.x * 10.0 + p.y * 10.0 + t);
    if (fract(t * 2.0) > 0.95) {
        col = vec3(1.0, 0.0, 1.0);
    }
    fragColor = vec4(col, 1.0);
}`;
    }

    getPixelateShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    float pixelSize = 10.0 + sin(t) * 5.0;
    vec2 p = floor(uv * pixelSize) / pixelSize;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + p.x * 10.0 + p.y * 10.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getChromaticShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Générer un pattern de base
    vec3 baseCol = 0.5 + 0.5 * cos(vec3(0, 2, 4) + uv.x * 10.0 + uv.y * 10.0 + t);
    
    // Effet d'aberration chromatique (décalage RGB)
    float offset = sin(t) * 0.02;
    float r = 0.5 + 0.5 * cos(0.0 + (uv.x + offset) * 10.0 + uv.y * 10.0 + t);
    float g = 0.5 + 0.5 * cos(2.0 + uv.x * 10.0 + uv.y * 10.0 + t);
    float b = 0.5 + 0.5 * cos(4.0 + (uv.x - offset) * 10.0 + uv.y * 10.0 + t);
    
    vec3 col = vec3(r, g, b);
    fragColor = vec4(col, 1.0);
}`;
    }

    getBloomShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec3 col = vec3(0.0);
    float intensity = 0.0;
    
    for (int i = -2; i <= 2; i++) {
        for (int j = -2; j <= 2; j++) {
            vec2 offset = vec2(float(i), float(j)) * 0.01;
            float dist = length(offset);
            float sample = sin((uv.x + offset.x) * 10.0 + t) * sin((uv.y + offset.y) * 10.0 + t);
            float weight = 1.0 / (1.0 + dist * 10.0);
            col += vec3(sample) * weight;
            intensity += weight;
        }
    }
    
    col = col / intensity;
    col = pow(col, vec3(0.5));
    fragColor = vec4(col, 1.0);
}`;
    }

    getVignetteShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 center = vec2(0.5);
    float dist = length(uv - center);
    float vignette = 1.0 - smoothstep(0.3, 0.8, dist);
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + uv.x * 10.0 + uv.y * 10.0 + t);
    col *= vignette;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getScanlinesShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + uv.x * 10.0 + uv.y * 10.0 + t);
    
    float scanline = sin(uv.y * 200.0 + t * 5.0) * 0.1 + 0.9;
    col *= scanline;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getNoise2Shader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Bruit animé avec plusieurs octaves
    vec2 p = uv * 8.0 + vec2(t * 0.5, t * 0.3);
    float n = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    
    for (int i = 0; i < 4; i++) {
        vec2 grid = floor(p * freq);
        vec2 f = fract(p * freq);
        float noise = fract(sin(dot(grid, vec2(12.9898, 78.233))) * 43758.5453);
        n += noise * amp;
        amp *= 0.5;
        freq *= 2.0;
    }
    
    n = n / 1.875; // Normaliser
    
    // Couleurs vibrantes animées
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + n * 6.28 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getCellsShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv * 10.0;
    vec2 id = floor(p);
    vec2 f = fract(p) - 0.5;
    
    float dist = length(f);
    float cell = sin(dist * 10.0 - t * 2.0);
    cell = floor(cell * 3.99) / 3.99;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + cell * 3.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getWarpShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv - 0.5;
    float angle = atan(p.y, p.x);
    float radius = length(p);
    
    angle += sin(radius * 10.0 - t) * 0.5;
    radius += sin(angle * 5.0 + t) * 0.1;
    
    vec2 newP = vec2(cos(angle), sin(angle)) * radius + 0.5;
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + newP.x * 10.0 + newP.y * 10.0 + t);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getRadialShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    float pattern = sin(angle * 5.0 + radius * 10.0 - t);
    pattern = floor(pattern * 3.99) / 3.99;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + pattern * 3.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getSpiral2Shader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    float spiral = angle / 3.14159 + radius * 2.0 - t;
    spiral = floor(spiral * 7.99) / 7.99;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + spiral * 3.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getRingsShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float dist = length(uv);
    float rings = sin(dist * 10.0 - t * 2.0);
    rings = floor(rings * 3.99) / 3.99;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + rings * 3.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getDotsShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = floor(uv * 20.0);
    vec2 f = fract(uv * 20.0) - 0.5;
    
    float dist = length(f);
    float dot = smoothstep(0.3, 0.2, dist);
    dot *= sin(t + p.x + p.y);
    
    vec3 col = vec3(dot);
    fragColor = vec4(col, 1.0);
}`;
    }

    getLinesShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    float lines = sin(uv.y * 20.0 + t * 2.0);
    lines = floor(lines * 3.99) / 3.99;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + lines * 3.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getCheckerboardShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = floor(uv * 10.0 + t);
    float checker = mod(p.x + p.y, 2.0);
    
    vec3 col = vec3(checker);
    fragColor = vec4(col, 1.0);
}`;
    }

    getStripesShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    float stripes = sin(uv.x * 20.0 + t * 2.0);
    stripes = floor(stripes * 3.99) / 3.99;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + stripes * 3.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getZebraShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    float pattern = sin(uv.x * 15.0 + uv.y * 10.0 + t);
    pattern = floor(pattern * 3.99) / 3.99;
    
    vec3 col = vec3(pattern);
    fragColor = vec4(col, 1.0);
}`;
    }

    getDiamondShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    vec2 p = abs(uv);
    float diamond = step(p.x + p.y, 0.5 + sin(t) * 0.2);
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + diamond * 3.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getTriangleShader() {
        return `// Triangle amélioré avec effets visuels
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Triangle rotatif avec pulsation
    float angle = t * 0.5;
    float c = cos(angle);
    float s = sin(angle);
    vec2 rotUv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    
    float size = 0.3 + sin(t * 2.0) * 0.05;
    vec2 p = abs(rotUv);
    float triangle = smoothstep(size + 0.02, size, p.y - (0.5 - p.x * 0.577) * size);
    triangle -= smoothstep(size, size - 0.02, p.y - (0.5 - p.x * 0.577) * size);
    
    // Gradient radial
    float dist = length(uv);
    float gradient = 1.0 - smoothstep(0.0, 0.4, dist);
    
    // Motif intérieur
    float pattern = sin(rotUv.x * 10.0 + t) * sin(rotUv.y * 10.0 + t * 0.7) * 0.3 + 0.7;
    
    // Couleurs animées
    vec3 col1 = vec3(1.0, 0.2, 0.3);
    vec3 col2 = vec3(0.2, 0.3, 1.0);
    vec3 col3 = vec3(0.3, 1.0, 0.2);
    vec3 triangleCol = mix(col1, col2, sin(t) * 0.5 + 0.5);
    triangleCol = mix(triangleCol, col3, sin(t * 0.7 + 1.0) * 0.5 + 0.5);
    
    // Lueur autour du triangle
    float glow = exp(-abs(p.y - (0.5 - p.x * 0.577) * size) * 30.0) * 0.5;
    
    vec3 col = vec3(0.05, 0.05, 0.1);
    col += triangleCol * triangle * pattern * gradient;
    col += triangleCol * glow;
    
    // Particules autour
    for (int i = 0; i < 15; i++) {
        float id = float(i);
        float particleAngle = id * 0.418 + t * 0.5;
        float particleRadius = 0.4 + sin(id + t) * 0.1;
        vec2 particlePos = vec2(cos(particleAngle), sin(particleAngle)) * particleRadius;
        float particleDist = length(uv - particlePos);
        float particle = exp(-particleDist * 40.0);
        vec3 particleCol = 0.5 + 0.5 * cos(vec3(0, 2, 4) + id + t);
        col += particleCol * particle * 0.3;
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getCircleShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float dist = length(uv);
    float circle = smoothstep(0.4, 0.3, dist) - smoothstep(0.3, 0.2, dist);
    circle *= sin(t * 2.0);
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + circle * 3.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getSquareShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    vec2 p = abs(uv);
    float square = step(max(p.x, p.y), 0.3 + sin(t) * 0.1);
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + square * 3.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getStarShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    float star = abs(cos(angle * 5.0)) * radius;
    star = smoothstep(0.4, 0.3, star);
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + star * 3.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getHeartShader() {
        return `// Cœur réaliste avec pulsation, lueur et particules d'amour
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Centrer et ajuster
    uv.y += 0.1;
    uv *= 1.8;
    
    float x = uv.x;
    float y = -uv.y;
    
    // Équation mathématique précise du cœur
    float x2 = x * x;
    float y2 = y * y;
    float y3 = y2 * y;
    
    // Forme de cœur : (x² + y² - 1)³ - x²y³ ≤ 0
    float heartEq = pow(x2 + y2 - 1.0, 3.0) - x2 * y3;
    
    // Pulsation animée
    float pulse = 1.0 + sin(t * 3.0) * 0.08;
    heartEq /= pulse;
    
    // Créer le cœur avec bordure douce
    float heart = smoothstep(0.08, -0.05, heartEq);
    
    // Couleur rouge/rose réaliste avec dégradé
    vec3 heartColor = mix(
        vec3(0.9, 0.1, 0.2),  // Rouge foncé au centre
        vec3(1.0, 0.3, 0.4),  // Rose clair sur les bords
        smoothstep(0.0, 0.3, length(uv) / 0.8)
    );
    
    // Lueur autour du cœur
    float glow = exp(-abs(heartEq) * 3.0) * 0.4;
    glow *= (1.0 + sin(t * 4.0) * 0.2);
    
    // Reflet/brillance
    vec2 lightDir = normalize(vec2(0.3, 0.7));
    float highlight = pow(max(dot(normalize(uv), lightDir), 0.0), 8.0);
    
    // Fond sombre avec dégradé
    vec3 col = mix(vec3(0.05, 0.02, 0.05), vec3(0.1, 0.05, 0.1), length(uv) / 1.5);
    
    // Appliquer le cœur
    col = mix(col, heartColor, heart);
    col += heartColor * glow;
    col += vec3(1.0, 0.9, 0.95) * highlight * heart * 0.6;
    
    // Particules d'amour animées
    for (int i = 0; i < 30; i++) {
        float id = float(i);
        float angle = id * 0.209 + t * 0.6;
        float radius = 0.7 + sin(id + t * 0.5) * 0.25;
        vec2 particlePos = vec2(cos(angle), sin(angle)) * radius;
        
        float dist = length(uv - particlePos);
        float particle = exp(-dist * 12.0);
        
        // Forme de cœur pour les particules
        vec2 pLocal = uv - particlePos;
        float pHeart = pow(pLocal.x * pLocal.x + pLocal.y * pLocal.y - 0.01, 3.0) - 
                      pLocal.x * pLocal.x * pLocal.y * pLocal.y * pLocal.y;
        particle *= smoothstep(0.002, -0.001, pHeart);
        
        vec3 particleColor = vec3(1.0, 0.5, 0.7) + vec3(0.3, 0.2, 0.1) * sin(id + t);
        col += particleColor * particle * 0.4;
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getFlowerShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    float petals = sin(angle * 6.0 + t);
    float flower = smoothstep(0.4, 0.3, radius - petals * 0.1);
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + flower * 3.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getSunShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    
    float rays = sin(angle * 12.0 + t) * 0.1;
    float sun = smoothstep(0.3, 0.2, dist + rays);
    
    vec3 col = vec3(1.0, 0.8, 0.2) * sun;
    fragColor = vec4(col, 1.0);
}`;
    }

    getMoonShader() {
        return `// Lune ultra-réaliste avec cratères détaillés, phases animées et éclairage professionnel
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float dist = length(uv);
    float moonMask = smoothstep(0.38, 0.35, dist);
    
    // Coordonnées sphériques pour la lune
    vec3 spherePos = vec3(uv, sqrt(max(0.0, 0.35 * 0.35 - dist * dist)));
    vec2 moonUV = vec2(atan(spherePos.x, spherePos.z), asin(spherePos.y / 0.35)) / 3.14159;
    
    // Rotation de la lune
    float rotation = t * 0.15;
    float cr = cos(rotation);
    float sr = sin(rotation);
    vec2 rotUV = vec2(moonUV.x * cr - moonUV.y * sr, moonUV.x * sr + moonUV.y * cr);
    
    // Texture de surface très détaillée
    float surfaceDetail = fbm(rotUV * 20.0) * 0.3 + fbm(rotUV * 40.0) * 0.15;
    
    // Cratères réalistes avec différentes tailles
    float craters = 0.0;
    float craterShadows = 0.0;
    float craterRims = 0.0;
    
    for (int i = 0; i < 25; i++) {
        float id = float(i);
        vec2 craterPos = vec2(
            hash(vec2(id, 0.0)) * 2.0 - 1.0,
            hash(vec2(id, 1.0)) * 2.0 - 1.0
        ) * 0.7;
        
        float craterDist = length(rotUV - craterPos);
        float craterSize = 0.02 + hash(vec2(id, 2.0)) * 0.08;
        float craterDepth = 0.4 + hash(vec2(id, 3.0)) * 0.5;
        
        // Cratère principal avec profil réaliste
        float crater = smoothstep(craterSize * 1.2, 0.0, craterDist);
        crater *= smoothstep(0.0, craterSize * 0.3, craterDist);
        craters += crater * craterDepth * 0.3;
        
        // Rebord du cratère (rim)
        float rim = smoothstep(craterSize * 1.1, craterSize * 0.95, craterDist);
        rim *= smoothstep(craterSize * 0.85, craterSize * 0.95, craterDist);
        craterRims += rim * 0.15;
        
        // Ombres dans les cratères
        vec2 toCrater = normalize(rotUV - craterPos);
        vec2 lightDir2D = normalize(vec2(0.8, 0.6));
        float shadowFactor = dot(toCrater, lightDir2D);
        if (shadowFactor < 0.0 && craterDist < craterSize) {
            float shadow = smoothstep(craterSize * 0.9, 0.0, craterDist) * abs(shadowFactor) * 0.6;
            craterShadows += shadow;
        }
    }
    
    // Éclairage avec phases de lune animées
    float phase = sin(t * 0.5) * 0.5 + 0.5;
    vec3 lightDir = normalize(vec3(0.8 + phase * 0.4, 0.6, 0.3));
    vec3 normal = normalize(spherePos);
    float lighting = max(0.0, dot(normal, lightDir));
    lighting = pow(lighting, 0.7);
    
    // Terminateur (ligne jour/nuit) avec lueur
    float terminator = smoothstep(0.03, -0.03, dot(normal, lightDir));
    float terminatorGlow = exp(-abs(dot(normal, lightDir)) * 20.0) * 0.3;
    
    // Couleur de base de la lune (gris lunaire réaliste)
    vec3 moonBase = vec3(0.65, 0.65, 0.7);
    
    // Variation de couleur selon la surface
    vec3 moonCol = moonBase;
    moonCol += vec3(0.1, 0.1, 0.15) * surfaceDetail;
    moonCol -= vec3(0.2) * craters;
    moonCol -= vec3(0.3) * craterShadows;
    moonCol += vec3(0.15) * craterRims;
    
    // Éclairage avec ombres douces
    moonCol *= (0.2 + lighting * 0.8);
    
    // Lueur sur le terminateur
    moonCol += vec3(0.4, 0.45, 0.5) * terminatorGlow;
    
    // Côté sombre avec éclairage terrestre subtil
    float earthShine = (1.0 - lighting) * 0.15;
    moonCol = mix(moonCol, vec3(0.3, 0.35, 0.4), earthShine);
    
    // Fond spatial profond avec étoiles
    vec3 col = vec3(0.01, 0.01, 0.02);
    
    // Étoiles réalistes avec scintillement
    for (int i = 0; i < 150; i++) {
        float id = float(i);
        vec2 starPos = vec2(
            hash(vec2(id, 10.0)) * 2.0 - 1.0,
            hash(vec2(id, 20.0)) * 2.0 - 1.0
        ) * 1.5;
        float starDist = length(uv - starPos);
        float starSize = 0.001 + hash(vec2(id, 30.0)) * 0.002;
        float starBrightness = hash(vec2(id, 40.0));
        
        float star = exp(-starDist / starSize) * starBrightness;
        
        // Scintillement réaliste
        float twinkle = sin(t * 3.0 + id * 7.0) * 0.2 + 0.8;
        twinkle *= sin(t * 5.0 + id * 11.0) * 0.1 + 0.9;
        
        // Couleurs d'étoiles variées
        vec3 starColor = mix(vec3(1.0), vec3(0.9, 0.9, 1.2), hash(vec2(id, 50.0)));
        col += starColor * star * twinkle * 0.5;
    }
    
    // Nébuleuse subtile en arrière-plan
    float nebula = fbm(uv * 2.0 + t * 0.1) * 0.08;
    col += vec3(0.15, 0.1, 0.2) * nebula;
    
    // Lueur autour de la lune (atmosphère/halo)
    float halo = exp(-(dist - 0.35) * 20.0) * 0.2;
    col += vec3(0.8, 0.85, 1.0) * halo * lighting;
    
    // Appliquer la lune
    col = mix(col, moonCol, moonMask);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getPlanetShader() {
        return `// Planète ultra-réaliste avec continents détaillés, océans animés, nuages et atmosphère professionnelle
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float dist = length(uv);
    float planetMask = smoothstep(0.42, 0.38, dist);
    
    // Coordonnées sphériques 3D
    vec3 spherePos = vec3(uv, sqrt(max(0.0, 0.38 * 0.38 - dist * dist)));
    vec3 normal = normalize(spherePos);
    
    // Projection sphérique pour la texture
    float lat = asin(normal.y);
    float lon = atan(normal.x, normal.z);
    vec2 texCoord = vec2(lon, lat) / 3.14159;
    
    // Rotation de la planète
    float rotation = t * 0.15;
    float cr = cos(rotation);
    float sr = sin(rotation);
    vec2 rotTex = vec2(texCoord.x * cr - texCoord.y * sr, texCoord.x * sr + texCoord.y * cr);
    
    // Continents avec plusieurs niveaux de détail
    float continentBase = fbm(rotTex * 1.2);
    float continentDetail = fbm(rotTex * 4.0) * 0.25;
    float continentFine = fbm(rotTex * 12.0) * 0.1;
    float continentMask = smoothstep(0.3, 0.55, continentBase + continentDetail + continentFine);
    
    // Relief et élévation
    float elevation = fbm(rotTex * 3.5);
    float mountains = smoothstep(0.65, 0.85, elevation) * continentMask;
    float hills = smoothstep(0.45, 0.65, elevation) * continentMask * (1.0 - mountains);
    
    // Océans avec profondeur variable
    float oceanDepth = fbm(rotTex * 2.5);
    float shallowWater = smoothstep(0.4, 0.6, oceanDepth) * (1.0 - continentMask);
    
    // Nuages animés avec plusieurs couches
    vec2 cloudUV1 = rotTex * 1.5 + vec2(t * 0.2, t * 0.15);
    vec2 cloudUV2 = rotTex * 3.0 + vec2(t * 0.35, -t * 0.25);
    vec2 cloudUV3 = rotTex * 6.0 + vec2(t * 0.5, t * 0.4);
    
    float cloudLayer1 = fbm(cloudUV1);
    float cloudLayer2 = fbm(cloudUV2) * 0.6;
    float cloudLayer3 = fbm(cloudUV3) * 0.3;
    
    float clouds = smoothstep(0.45, 0.75, cloudLayer1 + cloudLayer2 + cloudLayer3);
    clouds *= (1.0 - continentMask * 0.4); // Moins de nuages sur les continents élevés
    clouds *= (1.0 - mountains * 0.6); // Encore moins sur les montagnes
    
    // Éclairage réaliste avec source de lumière animée
    float lightAngle = t * 0.3;
    vec3 lightDir = normalize(vec3(cos(lightAngle) * 0.8, sin(lightAngle) * 0.3, 0.6));
    float lighting = max(0.0, dot(normal, lightDir));
    lighting = pow(lighting, 0.6);
    
    // Ombres sur le relief
    float shadowFactor = 1.0 - mountains * 0.4 * (1.0 - lighting);
    shadowFactor -= hills * 0.2 * (1.0 - lighting);
    
    // Palette de couleurs réalistes
    vec3 deepOcean = vec3(0.02, 0.08, 0.2);
    vec3 ocean = vec3(0.05, 0.15, 0.35);
    vec3 shallowOcean = vec3(0.1, 0.35, 0.55);
    vec3 beach = vec3(0.85, 0.75, 0.6);
    vec3 plains = vec3(0.25, 0.5, 0.25);
    vec3 forest = vec3(0.1, 0.35, 0.15);
    vec3 desert = vec3(0.7, 0.6, 0.4);
    vec3 mountainRock = vec3(0.45, 0.4, 0.35);
    vec3 snow = vec3(0.95, 0.95, 1.0);
    vec3 cloudWhite = vec3(0.98, 0.98, 1.0);
    
    // Détermination de la couleur selon le terrain
    vec3 planetCol;
    
    if (continentMask < 0.15) {
        // Océan
        if (shallowWater > 0.5) {
            planetCol = mix(ocean, shallowOcean, shallowWater);
        } else {
            planetCol = mix(deepOcean, ocean, oceanDepth);
        }
        // Réflexions sur l'eau
        float waterReflection = pow(max(0.0, dot(normal, reflect(-lightDir, normal))), 32.0);
        planetCol += vec3(0.3, 0.4, 0.5) * waterReflection * 0.4;
    } else if (continentMask < 0.25) {
        // Plages
        planetCol = mix(shallowOcean, beach, (continentMask - 0.15) / 0.1);
    } else if (elevation < 0.4) {
        // Déserts (zones chaudes)
        float desertMask = fbm(rotTex * 0.8);
        planetCol = mix(plains, desert, smoothstep(0.5, 0.7, desertMask));
    } else if (elevation < 0.6) {
        // Plaines et forêts
        float forestMask = fbm(rotTex * 5.0);
        planetCol = mix(plains, forest, smoothstep(0.4, 0.7, forestMask));
    } else if (elevation < 0.85) {
        // Montagnes
        planetCol = mountainRock;
    } else {
        // Neige sur les sommets
        planetCol = mix(mountainRock, snow, smoothstep(0.85, 1.0, elevation));
    }
    
    // Appliquer l'éclairage et les ombres
    planetCol *= (0.15 + lighting * 0.85) * shadowFactor;
    
    // Nuages avec éclairage réaliste
    vec3 cloudColor = cloudWhite * (0.3 + lighting * 0.7);
    cloudColor = mix(cloudColor, vec3(0.6, 0.65, 0.7), (1.0 - lighting) * 0.3); // Nuages sombres la nuit
    planetCol = mix(planetCol, cloudColor, clouds * 0.7);
    
    // Atmosphère avec lueur réaliste
    float atmosphereThickness = smoothstep(0.38, 0.42, dist);
    float atmosphereGlow = exp(-(dist - 0.38) * 25.0) * 0.5;
    
    // Couleur de l'atmosphère (bleu avec teinte selon l'éclairage)
    vec3 atmosphereCol = mix(
        vec3(0.2, 0.4, 0.7), // Bleu de jour
        vec3(0.4, 0.3, 0.5), // Violet au crépuscule
        (1.0 - lighting) * 0.5
    );
    planetCol += atmosphereCol * atmosphereGlow * lighting;
    
    // Lueur sur le terminateur (ligne jour/nuit)
    float terminator = smoothstep(0.02, -0.02, dot(normal, lightDir));
    float terminatorGlow = exp(-abs(dot(normal, lightDir)) * 15.0) * 0.4;
    planetCol += vec3(0.3, 0.4, 0.6) * terminatorGlow;
    
    // Fond spatial profond
    vec3 col = vec3(0.005, 0.005, 0.01);
    
    // Étoiles lointaines
    for (int i = 0; i < 100; i++) {
        float id = float(i);
        vec2 starPos = vec2(
            hash(vec2(id, 100.0)) * 2.0 - 1.0,
            hash(vec2(id, 200.0)) * 2.0 - 1.0
        ) * 1.8;
        float starDist = length(uv - starPos);
        float starSize = 0.0008 + hash(vec2(id, 300.0)) * 0.0015;
        float star = exp(-starDist / starSize) * hash(vec2(id, 400.0));
        
        float twinkle = sin(t * 2.0 + id * 5.0) * 0.15 + 0.85;
        col += vec3(1.0) * star * twinkle * 0.3;
    }
    
    // Appliquer la planète
    col = mix(col, planetCol, planetMask);
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getCometShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    vec2 cometPos = vec2(sin(t) * 0.5, cos(t) * 0.5);
    vec2 dir = normalize(cometPos - uv);
    float dist = length(uv - cometPos);
    
    float core = smoothstep(0.1, 0.0, dist);
    float tail = smoothstep(0.5, 0.0, dist) * (1.0 - dot(dir, vec2(0.7, 0.7)));
    
    vec3 col = vec3(0.5, 0.8, 1.0) * (core + tail * 0.3);
    fragColor = vec4(col, 1.0);
}`;
    }

    getAsteroidShader() {
        return `// Astéroïdes 3D réalistes avec rotation, cratères et éclairage
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Fond spatial
    vec3 col = vec3(0.02, 0.02, 0.05);
    
    // Étoiles réalistes
    for (int i = 0; i < 100; i++) {
        float id = float(i);
        vec2 starPos = vec2(
            random(vec2(id, 0.0)),
            random(vec2(id, 1.0))
        );
        float starDist = length(uv - (starPos - 0.5) * 2.5);
        float starSize = 0.001 + random(vec2(id, 2.0)) * 0.002;
        float star = exp(-starDist / starSize) * random(vec2(id, 3.0));
        float twinkle = sin(t * 2.0 + id * 10.0) * 0.3 + 0.7;
        col += vec3(1.0) * star * twinkle * 0.5;
    }
    
    // Astéroïdes multiples avec rotation 3D simulée
    for (int i = 0; i < 6; i++) {
        float id = float(i);
        
        // Position animée en orbite
        float orbitAngle = t * (0.2 + id * 0.05) + id * 2.0;
        float orbitRadius = 0.3 + id * 0.15;
        vec2 center2D = vec2(
            sin(orbitAngle) * orbitRadius,
            cos(orbitAngle) * orbitRadius * 0.7
        );
        
        // Rotation 3D simulée
        float rotAngle = t * (0.5 + id * 0.1);
        vec2 localUV = uv - center2D;
        float angle2D = atan(localUV.y, localUV.x) + rotAngle;
        float radius2D = length(localUV);
        
        // Simuler la profondeur avec la rotation
        float depth = cos(angle2D * 2.0) * 0.5 + 0.5;
        float size = (0.06 + random(vec2(id, 0.0)) * 0.04) * (0.8 + depth * 0.4);
        
        // Forme d'astéroïde irrégulière
        float asteroidShape = radius2D / size;
        float irregularity = sin(angle2D * 5.0 + id) * 0.15 + 
                            sin(angle2D * 8.0 + id * 2.0) * 0.1;
        asteroidShape /= (1.0 + irregularity);
        
        float asteroid = smoothstep(1.1, 0.9, asteroidShape);
        
        if (asteroid > 0.01) {
            // Texture de surface avec cratères
            vec2 texUV = vec2(angle2D, radius2D / size);
            float surfaceNoise = noise(texUV * 8.0 + vec2(id * 5.0));
            surfaceNoise += noise(texUV * 16.0 + vec2(id * 7.0)) * 0.5;
            
            // Cratères réalistes
            float craters = 0.0;
            for (int j = 0; j < 5; j++) {
                float craterId = float(j);
                vec2 craterPos = vec2(
                    sin(craterId * 123.456 + id) * 0.3,
                    cos(craterId * 234.567 + id) * 0.3
                );
                float craterDist = length(texUV - craterPos);
                float craterSize = 0.05 + random(vec2(id, craterId)) * 0.08;
                craters += smoothstep(craterSize, 0.0, craterDist) * 0.3;
            }
            
            // Éclairage 3D simulé
            vec2 lightDir = normalize(vec2(0.6, 0.8));
            float lighting = dot(normalize(localUV), lightDir) * 0.5 + 0.5;
            lighting = pow(lighting, 0.6);
            
            // Ombres dans les cratères
            float shadow = 1.0 - craters * 0.4 * (1.0 - lighting);
            
            // Couleur réaliste d'astéroïde
            vec3 asteroidCol = vec3(0.45, 0.35, 0.28);
            asteroidCol += vec3(0.1, 0.05, 0.05) * surfaceNoise;
            asteroidCol -= vec3(craters * 0.2);
            asteroidCol *= lighting * shadow;
            
            // Lueur subtile
            float glow = exp(-(radius2D - size) * 15.0) * 0.2;
            asteroidCol += vec3(0.6, 0.5, 0.4) * glow;
            
            col = mix(col, asteroidCol, asteroid);
        }
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getNebula2Shader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv * 3.0;
    float n1 = sin(p.x + t);
    float n2 = sin(p.y * 2.0 + t * 0.7);
    float n3 = sin((p.x + p.y) * 1.5 + t * 0.5);
    
    vec3 col = vec3(n1 * 0.5 + 0.5, n2 * 0.5 + 0.5, n3 * 0.5 + 0.5);
    col = pow(col, vec3(0.5));
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getSupernovaShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    
    float explosion = smoothstep(0.6, 0.0, dist - t * 0.1);
    float rays = sin(angle * 20.0 + t * 5.0) * 0.1;
    
    vec3 col = vec3(1.0, 0.5, 0.0) * explosion * (1.0 + rays);
    fragColor = vec4(col, 1.0);
}`;
    }

    getBlackholeShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    
    float horizon = smoothstep(0.15, 0.1, dist);
    float accretion = sin(angle * 10.0 - dist * 20.0 + t * 2.0) * 0.5 + 0.5;
    accretion *= smoothstep(0.3, 0.15, dist);
    
    vec3 col = vec3(0.0) * horizon + vec3(1.0, 0.5, 0.0) * accretion;
    fragColor = vec4(col, 1.0);
}`;
    }

    getWormholeShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    
    float tunnel = smoothstep(0.5, 0.0, dist);
    float spiral = sin(angle * 5.0 + dist * 10.0 - t * 2.0);
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + spiral * 3.0 + t);
    col *= tunnel;
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getLightning2Shader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    float x = uv.x;
    float y = uv.y;
    
    float bolt = 0.0;
    for (int i = 0; i < 5; i++) {
        float offset = float(i) * 0.2;
        float branch = sin(x * 50.0 + offset + t * 10.0) * 0.02;
        float dist = abs(y - (x * 0.5 + 0.5 + branch));
        bolt += smoothstep(0.05, 0.0, dist) * exp(-x * 2.0);
    }
    
    vec3 col = vec3(0.5, 0.8, 1.0) * bolt;
    fragColor = vec4(col, 1.0);
}`;
    }

    getRainShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = floor(uv * vec2(20.0, 50.0));
    float drop = fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    
    float y = fract(uv.y - drop * t * 0.5);
    float trail = smoothstep(0.1, 0.0, abs(uv.x - drop));
    trail *= smoothstep(0.3, 0.0, y);
    
    vec3 col = vec3(0.5, 0.7, 1.0) * trail;
    fragColor = vec4(col, 1.0);
}`;
    }

    getThunderShader() {
        return `// Tonnerre amélioré avec éclairs visibles
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    // Fond orageux sombre
    vec3 col = vec3(0.05, 0.05, 0.1);
    
    // Nuages
    for (int i = 0; i < 8; i++) {
        float id = float(i);
        vec2 cloudPos = vec2(
            fract(id * 0.2 + t * 0.03),
            0.6 + sin(id) * 0.2
        );
        float cloudDist = length(uv - cloudPos);
        float cloud = exp(-cloudDist * 2.0) * 0.4;
        col += vec3(0.15, 0.15, 0.2) * cloud;
    }
    
    // Flash de tonnerre (aléatoire mais visible)
    float flashTime = floor(t * 1.5);
    float flashChance = random(vec2(flashTime));
    float flash = step(0.7, flashChance) * step(0.95, fract(t * 1.5));
    
    // Éclair visible pendant le flash
    float lightning = 0.0;
    if (flash > 0.5) {
        // Éclair principal
        float x = 0.3 + sin(t * 10.0) * 0.2;
        float y = 0.9;
        
        // Branche principale zigzag
        for (int i = 0; i < 15; i++) {
            float segY = y - float(i) * 0.06;
            if (segY < 0.0) break;
            
            float zigzag = sin(segY * 25.0 + t * 20.0) * 0.08;
            vec2 segPos = vec2(x + zigzag, segY);
            float segDist = length(uv - segPos);
            lightning += exp(-segDist / 0.015) * (1.0 - float(i) / 15.0);
            
            // Branches
            if (mod(float(i), 2.0) < 0.5) {
                float branchAngle = sin(segY * 40.0) * 0.4;
                vec2 branchDir = vec2(sin(branchAngle), cos(branchAngle));
                vec2 branchPos = segPos + branchDir * 0.05;
                float branchDist = length(uv - branchPos);
                lightning += exp(-branchDist / 0.008) * 0.5;
            }
        }
    }
    
    // Flash global
    col = mix(col, vec3(1.0, 1.0, 0.95), flash * 0.3);
    
    // Éclair
    vec3 boltColor = vec3(0.4, 0.6, 1.0);
    col += boltColor * lightning * (0.5 + flash * 0.5);
    col += vec3(1.0) * lightning * flash * 0.3;
    
    // Pluie
    for (int i = 0; i < 60; i++) {
        float id = float(i);
        vec2 dropPos = vec2(
            fract(id * 0.08 + t * 0.4),
            fract(id * 0.05 - t * 0.6)
        );
        float dropDist = abs(uv.x - dropPos.x);
        float drop = smoothstep(0.0, 0.001, dropDist) * 
                     smoothstep(0.008, 0.0, dropDist) *
                     step(dropPos.y, uv.y) * step(uv.y, dropPos.y + 0.08);
        col += vec3(0.4, 0.5, 0.7) * drop * 0.4;
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getWindShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv;
    p.x += sin(p.y * 10.0 + t * 2.0) * 0.1;
    
    vec3 col = 0.5 + 0.5 * cos(vec3(0, 2, 4) + p.x * 10.0 + p.y * 10.0 + t);
    fragColor = vec4(col, 1.0);
}`;
    }

    getTornadoShader() {
        return `// Tornade améliorée avec particules et rotation réaliste
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    // Fond ciel orageux
    vec3 col = mix(vec3(0.1, 0.1, 0.15), vec3(0.2, 0.2, 0.25), uv.y);
    
    // Nuages sombres
    float clouds = sin(uv.x * 3.0 + t * 0.1) * sin(uv.y * 2.0 + t * 0.15) * 0.2 + 0.8;
    col *= clouds;
    
    // Coordonnées polaires
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    // Tornade principale avec spirale serrée
    float spiralSpeed = 3.0;
    float spiral = angle + radius * 8.0 - t * spiralSpeed;
    float tornadoWidth = 0.15 - radius * 0.2; // Plus large en haut
    tornadoWidth = max(tornadoWidth, 0.02);
    
    float tornado = sin(spiral * 12.0) * smoothstep(0.7, 0.0, radius);
    tornado *= smoothstep(0.0, tornadoWidth, abs(sin(spiral * 6.0)));
    
    // Base de la tornade (plus large)
    float base = smoothstep(0.15, 0.0, radius) * smoothstep(-0.3, -0.1, uv.y);
    tornado += base * 0.5;
    
    // Particules de débris animées
    for (int i = 0; i < 30; i++) {
        float id = float(i);
        float particleAngle = id * 0.209 + t * spiralSpeed + radius * 8.0;
        float particleRadius = radius + sin(id * 123.456) * 0.05;
        float particleY = uv.y + sin(id * 234.567 + t * 2.0) * 0.1;
        
        vec2 particlePos = vec2(cos(particleAngle), sin(particleAngle)) * particleRadius;
        particlePos.y = particleY;
        
        float particleDist = length(uv - particlePos);
        float particle = exp(-particleDist * 30.0);
        
        vec3 particleCol = vec3(0.6, 0.5, 0.4) + vec3(0.2, 0.1, 0.0) * random(vec2(id, 0.0));
        col += particleCol * particle * 0.4;
    }
    
    // Corps de la tornade avec gradient
    vec3 tornadoCol = mix(vec3(0.4, 0.4, 0.45), vec3(0.6, 0.6, 0.65), 1.0 - radius / 0.7);
    tornadoCol = mix(tornadoCol, vec3(0.3, 0.3, 0.35), smoothstep(-0.3, 0.3, uv.y));
    
    col += tornadoCol * tornado;
    
    // Éclairs occasionnels
    float lightning = step(0.98, random(vec2(floor(t * 0.5), 0.0)));
    lightning *= exp(-abs(uv.x) * 20.0) * smoothstep(0.3, 0.0, uv.y);
    col += vec3(1.0, 1.0, 0.9) * lightning * 0.8;
    
    // Pluie
    for (int i = 0; i < 50; i++) {
        float id = float(i);
        float rainX = fract(id * 0.1 + t * 0.3);
        float rainY = fract(id * 0.07 - t * 0.5);
        vec2 rainPos = vec2(rainX - 0.5, rainY - 0.5) * 2.0;
        float rainDist = abs(uv.x - rainPos.x);
        float rain = exp(-rainDist * 100.0) * smoothstep(0.3, -0.3, uv.y - rainPos.y);
        col += vec3(0.5, 0.6, 0.8) * rain * 0.2;
    }
    
    fragColor = vec4(col, 1.0);
}`;
    }

    getFogShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv * 3.0;
    float fog = sin(p.x + t) * sin(p.y * 1.5 + t * 0.7);
    fog = fog * 0.5 + 0.5;
    fog = pow(fog, 2.0);
    
    vec3 col = vec3(0.7, 0.7, 0.8) * fog;
    fragColor = vec4(col, 1.0);
}`;
    }

    getMistShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv * 2.0;
    float mist = sin(p.x * 2.0 + t) + sin(p.y * 3.0 + t * 0.8);
    mist = mist * 0.25 + 0.5;
    
    vec3 col = vec3(0.8, 0.8, 0.9) * mist;
    fragColor = vec4(col, 1.0);
}`;
    }

    getHazeShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv * 4.0;
    float haze = sin(p.x + p.y + t) * 0.3 + 0.7;
    
    vec3 col = vec3(0.9, 0.9, 1.0) * haze;
    fragColor = vec4(col, 1.0);
}`;
    }

    getStormShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 p = uv * 5.0;
    float storm = sin(p.x * 3.0 + t * 2.0) * sin(p.y * 4.0 + t * 1.5);
    storm = storm * 0.3 + 0.2;
    
    vec3 col = vec3(0.2, 0.2, 0.3) + storm * 0.5;
    fragColor = vec4(col, 1.0);
}`;
    }

    getCycloneShader() {
        return `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime;
    
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    float spiral = angle + radius * 8.0 - t * 3.0;
    float cyclone = sin(spiral * 15.0) * smoothstep(0.7, 0.0, radius);
    
    vec3 col = vec3(0.4, 0.4, 0.5) + cyclone * 0.6;
    fragColor = vec4(col, 1.0);
}`;
    }

    getExamplesList() {
        return `
🎨 **Shaders Prédéfinis Disponibles (97 au total)**

\`\`\`
┌─────────────────────────────┬─────────────────────────────────────────────────────────────────────────────┐
│ Catégorie                   │ Commandes disponibles                                                         │
├─────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ Effets Animés               │ !shader rainbow !shader spiral !shader plasma !shader tunnel !shader        │
│                             │ starfield !shader gradient !shader sine !shader waves !shader spiral2       │
│                             │ !shader rings                                                                 │
├─────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ Effets Naturels             │ !shader water !shader fire !shader smoke !shader snow !shader clouds        │
│                             │ !shader lava !shader lavaflow !shader aurora !shader rain !shader thunder   │
│                             │ !shader wind !shader fog !shader mist !shader haze !shader storm            │
├─────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ Fractales                   │ !shader mandelbrot !shader mandelbulb !shader julia !shader fractal         │
│                             │ !shader tree                                                                  │
├─────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ Effets 3D                   │ !shader raymarching !shader metaballs !shader crystal !shader bubbles       │
├─────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ Effets Géométriques         │ !shader voronoi !shader hexagon !shader grid !shader geometric !shader maze │
│                             │ !shader moire !shader dots !shader lines !shader checkerboard !shader        │
│                             │ stripes !shader zebra !shader diamond !shader triangle !shader circle        │
│                             │ !shader square !shader star !shader heart !shader flower                     │
├─────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ Effets Spatiaux             │ !shader galaxy !shader spiralgalaxy !shader nebula !shader cosmic           │
│                             │ !shader sun !shader moon !shader planet !shader comet !shader asteroid       │
│                             │ !shader nebula2 !shader supernova !shader blackhole !shader wormhole        │
├─────────────────────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ Effets Visuels Avancés      │ !shader noise !shader kaleidoscope !shader ripple !shader particles         │
│                             │ !shader matrix !shader electric !shader dna !shader circuit !shader          │
│                             │ lightrays !shader turbulence !shader morphing !shader swirl !shader energy   │
│                             │ !shader lens !shader kaleidoscope2 !shader distortion !shader mirror         │
│                             │ !shader reflection !shader glitch !shader pixelate !shader chromatic         │
│                             │ !shader bloom !shader vignette !shader scanlines !shader noise2 !shader      │
│                             │ cells !shader warp !shader radial !shader lightning2 !shader tornado         │
│                             │ !shader cyclone                                                               │
└─────────────────────────────┴─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

💡 **Astuce:** Tous ces shaders sont animés automatiquement! Copiez-collez simplement la commande pour compiler un shader.
        `.trim();
    }

    getShaderCodeByName(name) {
        const normalizedName = name.toLowerCase().trim();
        
        // Mapping des noms de shaders vers leurs fonctions getter
        const shaderMap = {
            'rainbow': () => this.getRainbowShader(),
            'spiral': () => this.getSpiralShader(),
            'plasma': () => this.getPlasmaShader(),
            'tunnel': () => this.getTunnelShader(),
            'starfield': () => this.getStarfieldShader(),
            'stars': () => this.getStarfieldShader(),
            'gradient': () => this.getGradientShader(),
            'sine': () => this.getSineShader(),
            'waves': () => this.getWavesShader(),
            'spiral2': () => this.getSpiral2Shader(),
            'rings': () => this.getRingsShader(),
            'water': () => this.getWaterShader(),
            'fire': () => this.getFireShader(),
            'flame': () => this.getFireShader(),
            'smoke': () => this.getSmokeShader(),
            'snow': () => this.getSnowShader(),
            'clouds': () => this.getCloudsShader(),
            'lava': () => this.getLavaShader(),
            'lavaflow': () => this.getLavaFlowShader(),
            'aurora': () => this.getAuroraShader(),
            'rain': () => this.getRainShader(),
            'thunder': () => this.getThunderShader(),
            'wind': () => this.getWindShader(),
            'fog': () => this.getFogShader(),
            'mist': () => this.getMistShader(),
            'haze': () => this.getHazeShader(),
            'storm': () => this.getStormShader(),
            'mandelbrot': () => this.getMandelbrotShader(),
            'mandelbulb': () => this.getMandelbulbShader(),
            'mandelbulb2': () => this.getMandelbulb2Shader(),
            'mandelbulb3': () => this.getMandelbulb3Shader(),
            'mandelbulb4': () => this.getMandelbulb4Shader(),
            'julia': () => this.getJuliaShader(),
            'fractal': () => this.getFractalShader(),
            'tree': () => this.getTreeShader(),
            'fractaltree': () => this.getTreeShader(),
            'raymarching': () => this.getRaymarchingShader(),
            'metaballs': () => this.getMetaballsShader(),
            'metaball': () => this.getMetaballsShader(),
            'crystal': () => this.getCrystalShader(),
            'bubbles': () => this.getBubblesShader(),
            'voronoi': () => this.getVoronoiShader(),
            'hexagon': () => this.getHexagonShader(),
            'hex': () => this.getHexagonShader(),
            'grid': () => this.getGridShader(),
            'geometric': () => this.getGeometricShader(),
            'maze': () => this.getMazeShader(),
            'moire': () => this.getMoireShader(),
            'dots': () => this.getDotsShader(),
            'lines': () => this.getLinesShader(),
            'checkerboard': () => this.getCheckerboardShader(),
            'checker': () => this.getCheckerboardShader(),
            'stripes': () => this.getStripesShader(),
            'zebra': () => this.getZebraShader(),
            'diamond': () => this.getDiamondShader(),
            'triangle': () => this.getTriangleShader(),
            'circle': () => this.getCircleShader(),
            'square': () => this.getSquareShader(),
            'star': () => this.getStarShader(),
            'heart': () => this.getHeartShader(),
            'flower': () => this.getFlowerShader(),
            'galaxy': () => this.getGalaxyShader(),
            'spiralgalaxy': () => this.getSpiralGalaxyShader(),
            'nebula': () => this.getNebulaShader(),
            'cosmic': () => this.getCosmicShader(),
            'sun': () => this.getSunShader(),
            'moon': () => this.getMoonShader(),
            'planet': () => this.getPlanetShader(),
            'comet': () => this.getCometShader(),
            'asteroid': () => this.getAsteroidShader(),
            'nebula2': () => this.getNebula2Shader(),
            'supernova': () => this.getSupernovaShader(),
            'blackhole': () => this.getBlackholeShader(),
            'black': () => this.getBlackholeShader(),
            'wormhole': () => this.getWormholeShader(),
            'noise': () => this.getNoiseShader(),
            'kaleidoscope': () => this.getKaleidoscopeShader(),
            'kaleido': () => this.getKaleidoscopeShader(),
            'ripple': () => this.getRippleShader(),
            'particles': () => this.getParticlesShader(),
            'particle': () => this.getParticlesShader(),
            'matrix': () => this.getMatrixShader(),
            'electric': () => this.getElectricShader(),
            'lightning': () => this.getElectricShader(),
            'dna': () => this.getDNAShader(),
            'helix': () => this.getDNAShader(),
            'circuit': () => this.getCircuitShader(),
            'lightrays': () => this.getLightRaysShader(),
            'turbulence': () => this.getTurbulenceShader(),
            'morphing': () => this.getMorphingShader(),
            'swirl': () => this.getSwirlShader(),
            'energy': () => this.getEnergyShader(),
            'lens': () => this.getLensShader(),
            'kaleidoscope2': () => this.getKaleidoscope2Shader(),
            'kaleido2': () => this.getKaleidoscope2Shader(),
            'distortion': () => this.getDistortionShader(),
            'mirror': () => this.getMirrorShader(),
            'reflection': () => this.getReflectionShader(),
            'glitch': () => this.getGlitchShader(),
            'pixelate': () => this.getPixelateShader(),
            'pixel': () => this.getPixelateShader(),
            'chromatic': () => this.getChromaticShader(),
            'bloom': () => this.getBloomShader(),
            'vignette': () => this.getVignetteShader(),
            'scanlines': () => this.getScanlinesShader(),
            'noise2': () => this.getNoise2Shader(),
            'cells': () => this.getCellsShader(),
            'warp': () => this.getWarpShader(),
            'radial': () => this.getRadialShader(),
            'lightning2': () => this.getLightning2Shader(),
            'tornado': () => this.getTornadoShader(),
            'cyclone': () => this.getCycloneShader()
        };
        
        const getter = shaderMap[normalizedName];
        if (getter) {
            try {
                return getter();
            } catch (error) {
                console.error(`Erreur lors de la récupération du shader ${name}:`, error);
                return null;
            }
        }
        
        return null;
    }

    getPresetShader(name) {
        // Retourner un objet avec code et name pour les presets
        const code = this.getShaderCodeByName(name);
        if (!code) {
            return null;
        }
        return {
            code: code,
            name: name
        };
    }

    checkCooldown(userId, command) {
        if (!this.cooldowns.has(command.data.name)) {
            this.cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = this.cooldowns.get(command.data.name);
        const cooldownAmount = (command.cooldown ?? config.commands.cooldown) ?? 5000;

        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId) + cooldownAmount;

            if (now < expirationTime) {
                return false;
            }
        }

        timestamps.set(userId, now);
        setTimeout(() => timestamps.delete(userId), cooldownAmount);
        return true;
    }

    async handleInteractionFromHTTP(body, req, res) {
        console.log('🔄 handleInteractionFromHTTP appelé');
        
        // Utiliser l'API REST de discord.js pour répondre aux interactions HTTP
        const interactionId = body.id;
        const interactionToken = body.token;
        const createdTimestamp = body.created_at ? new Date(body.created_at).getTime() : Date.now();
        
        // Marquer l'interaction comme traitée pour éviter la duplication avec WebSocket
        const interactionKey = `${interactionId}_${createdTimestamp}`;
        this.processedInteractions.add(interactionKey);
        // Nettoyer après 5 minutes
        setTimeout(() => {
            this.processedInteractions.delete(interactionKey);
        }, 5 * 60 * 1000);
        
        console.log('📋 Interaction détails:', {
            id: interactionId,
            hasToken: !!interactionToken,
            type: body.type,
            commandName: body.data?.name,
            markedAsProcessed: true
        });
        
        if (!interactionId || !interactionToken) {
            console.error('❌ Interaction ID ou token manquant', {
                hasId: !!interactionId,
                hasToken: !!interactionToken
            });
            return;
        }

        // Créer une interaction mock pour utiliser le gestionnaire d'événements existant
        // Mais d'abord, on doit répondre via l'API REST
        const rest = this.client.rest;
        
        try {
            // Si c'est une commande slash (type 2)
            if (body.type === 2) {
                const commandName = body.data?.name;
                console.log(`🔍 Commande HTTP reçue: ${commandName} (user: ${body.member?.user?.tag || body.user?.tag})`);
                
                // Obtenir l'ID de l'application (utiliser body.application_id si disponible, sinon client.user.id, sinon env var)
                const applicationId = body.application_id || this.client?.user?.id || process.env.DISCORD_CLIENT_ID;
                
                const command = this.commands.get(commandName);
                
                if (!command) {
                    console.error(`⚠️ Commande non trouvée: ${commandName}`);
                    await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                        body: {
                            content: '❌ Commande non trouvée.'
                        }
                    });
                    return;
                }

                // Vérifier le cooldown
                const userId = body.member?.user?.id || body.user?.id;
                
                if (!this.checkCooldown(userId, command)) {
                    await rest.patch(Routes.webhookMessage(applicationId || process.env.DISCORD_CLIENT_ID, interactionToken), {
                        body: {
                            content: '⏳ Vous devez attendre avant d\'utiliser cette commande à nouveau.'
                        }
                    });
                    return;
                }
                
                // Verrou intelligent : pour /shader, permettre plusieurs générations différentes en parallèle
                // Pour les autres commandes, empêcher l'exécution simultanée de la même commande
                let commandLockKey;
                if (commandName === 'shader') {
                    // Pour /shader, créer un hash du code shader pour permettre plusieurs générations différentes
                    const shaderCode = body.data?.options?.find(opt => opt.name === 'code')?.value || '';
                    const shaderHash = crypto.createHash('md5').update(shaderCode).digest('hex').substring(0, 8);
                    commandLockKey = `${userId}_${commandName}_${shaderHash}`;
                } else {
                    // Pour les autres commandes, utiliser juste userId + commandName
                    commandLockKey = `${userId}_${commandName}`;
                }
                
                if (this.activeCommands.has(commandLockKey)) {
                    console.log(`⏭️ Commande HTTP ${commandName} déjà en cours d'exécution pour l'utilisateur ${userId}, ignorée`);
                    await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                        body: {
                            content: '⏳ Cette commande est déjà en cours d\'exécution, veuillez patienter.'
                        }
                    });
                    return;
                }

                // Ajouter le verrou
                this.activeCommands.set(commandLockKey, Date.now());

                // Créer une interaction mock pour exécuter la commande
                const mockInteraction = {
                    commandName: commandName,
                    options: {
                        getString: (name) => {
                            const option = body.data?.options?.find(opt => opt.name === name);
                            return option?.value || null;
                        },
                        getInteger: (name) => {
                            const option = body.data?.options?.find(opt => opt.name === name);
                            return option?.value || null;
                        },
                        getFocused: () => {
                            const focused = body.data?.options?.find(opt => opt.focused);
                            return { value: focused?.value || '' };
                        }
                    },
                    user: {
                        id: userId,
                        username: body.member?.user?.username || body.user?.username || 'Unknown',
                        tag: body.member?.user?.tag || body.user?.tag || 'Unknown#0000'
                    },
                    deferred: true, // On a déjà répondu avec DEFERRED
                    replied: false,
                    ephemeral: false,
                    guildId: body.guild_id,
                    channelId: body.channel_id,
                    
                    // deferReply ne fait rien car on a déjà répondu avec DEFERRED
                    async deferReply(options) {
                        // Déjà répondu, ne rien faire
                        return Promise.resolve();
                    },
                    
                    // Méthodes pour répondre via l'API REST
                    async editReply(options) {
                        // Si des fichiers sont présents, tester TOUTES les stratégies possibles
                        if (options.files && options.files.length > 0) {
                            console.log(`📎 Envoi de ${options.files.length} fichier(s) - Test de toutes les stratégies`);
                            
                            // Préparer les embeds en JSON
                            const embedsJson = options.embeds ? options.embeds.map(embed => {
                                if (embed && typeof embed.toJSON === 'function') {
                                    return embed.toJSON();
                                }
                                return embed;
                            }).filter(embed => embed !== null && embed !== undefined) : [];
                            
                            // Extraire les chemins de fichiers des AttachmentBuilder
                            const extractFilePaths = () => {
                                const filePaths = [];
                                for (const file of options.files) {
                                if (file.attachment) {
                                        if (typeof file.attachment === 'string' && fs.existsSync(file.attachment)) {
                                            filePaths.push({
                                                path: file.attachment,
                                                name: file.name || path.basename(file.attachment),
                                                type: 'path'
                                            });
                                        } else if (Buffer.isBuffer(file.attachment)) {
                                            filePaths.push({
                                                buffer: file.attachment,
                                                name: file.name || 'file.gif',
                                                type: 'buffer'
                                            });
                                        } else if (file.attachment && typeof file.attachment.read === 'function') {
                                            filePaths.push({
                                                stream: file.attachment,
                                                name: file.name || 'file.gif',
                                                type: 'stream'
                                            });
                                        } else if (typeof file.attachment === 'object') {
                                            const attachmentObj = file.attachment;
                                            for (const key of ['path', 'file', 'data', 'buffer', 'stream']) {
                                                if (attachmentObj[key]) {
                                                    if (typeof attachmentObj[key] === 'string' && fs.existsSync(attachmentObj[key])) {
                                                        filePaths.push({
                                                            path: attachmentObj[key],
                                                            name: file.name || path.basename(attachmentObj[key]),
                                                            type: 'path'
                                                        });
                                                        break;
                                                    } else if (Buffer.isBuffer(attachmentObj[key])) {
                                                        filePaths.push({
                                                            buffer: attachmentObj[key],
                                                            name: file.name || 'file.gif',
                                                            type: 'buffer'
                                                        });
                                                        break;
                                                    } else if (attachmentObj[key] && typeof attachmentObj[key].read === 'function') {
                                                        filePaths.push({
                                                            stream: attachmentObj[key],
                                                            name: file.name || 'file.gif',
                                                            type: 'stream'
                                                        });
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                return filePaths;
                            };
                            
                            const filePaths = extractFilePaths();
                            if (filePaths.length === 0) {
                                throw new Error('Aucun fichier valide trouvé dans options.files');
                            }
                            
                            // Liste de TOUTES les stratégies à tester
                            const strategies = [
                                // STRATÉGIE 0: Envoyer le GIF sans embed (juste comme fichier attaché)
                                // Discord affiche parfois mieux les GIFs animés quand ils sont envoyés directement sans embed
                                {
                                    name: 'rest.patch_file_only_no_embed',
                                    desc: 'Envoyer le GIF comme fichier attaché sans embed (meilleure compatibilité GIF animé)',
                                    test: async () => {
                                        // Envoyer juste le fichier avec un message texte, sans embed
                                        // Discord affiche mieux les GIFs animés de cette façon
                                        const restPayload = {
                                            content: '🎨 Shader Animation'
                                        };
                                        
                                        await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                                            body: restPayload,
                                            files: options.files
                                        });
                                    }
                                },
                                // STRATÉGIE 1: Double édition (workaround du bug Discord connu)
                                // Bug Discord: Les images dans les embeds envoyés via webhooks ne s'affichent pas la moitié du temps
                                // Solution: Éditer le message deux fois avec le même contenu force Discord à afficher l'image
                                {
                                    name: 'rest.patch_double_edit_workaround',
                                    desc: 'Double édition avec AttachmentBuilder + embed minimal (workaround bug Discord)',
                                    test: async () => {
                                        const fileName = options.files[0]?.name || 'animation.gif';
                                        // Pour que Discord affiche le GIF animé, utiliser un embed avec titre
                                        // Discord affiche mieux les GIFs animés quand ils ont un titre dans l'embed
                                        const minimalEmbed = [{
                                            title: '🎨 Shader Animation',
                                            image: { url: `attachment://${fileName}` },
                                            color: embedsJson[0]?.color || 0x9B59B6,
                                            timestamp: new Date().toISOString()
                                        }];
                                        const restPayload = {
                                            embeds: minimalEmbed
                                        };
                                        
                                        // 1ère édition avec l'embed et le fichier (utiliser AttachmentBuilder originaux)
                                        console.log('🔄 Double édition - 1ère édition avec AttachmentBuilder');
                                        await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                                            body: restPayload,
                                            files: options.files
                                        });
                                        
                                        // Attendre 1000ms pour que Discord traite la première édition
                                        // Augmenté de 500ms à 1000ms pour donner plus de temps à Discord
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                        
                                        // 2ème édition avec les fichiers lus en Buffer (nouveaux objets)
                                        // Lire les fichiers en Buffer pour créer de nouveaux objets au lieu de réutiliser les mêmes
                                        console.log('🔄 Double édition - 2ème édition avec fichiers en Buffer');
                                        const fileBuffers = await Promise.all(filePaths.map(async (fp) => {
                                            let fileData;
                                            if (fp.path && fs.existsSync(fp.path)) {
                                                fileData = fs.readFileSync(fp.path);
                                            } else if (fp.buffer) {
                                                fileData = fp.buffer;
                                            } else {
                                                throw new Error(`Impossible de lire le fichier: ${fp.name}`);
                                            }
                                            return {
                                                attachment: fileData,
                                                name: fp.name || fileName
                                            };
                                        }));
                                        
                                        // 2ème édition avec les fichiers en Buffer (force Discord à traiter à nouveau)
                                        await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                                            body: restPayload,
                                            files: fileBuffers
                                        });
                                    }
                                },
                                // STRATÉGIE 2: Utiliser attachments dans payload_json (format Discord API)
                                // Spécifier explicitement les attachments dans le payload pour que Discord les garde
                                {
                                    name: 'rest.patch_with_attachments_payload',
                                    desc: 'rest.patch avec attachments dans payload_json + embed minimal',
                                    test: async () => {
                                        const fileName = filePaths[0]?.name || 'animation.gif';
                                        // Pour que Discord affiche le GIF animé, utiliser un embed avec titre
                                        const minimalEmbed = [{
                                            title: '🎨 Shader Animation',
                                            image: { url: `attachment://${fileName}` },
                                            color: embedsJson[0]?.color || 0x9B59B6,
                                            timestamp: new Date().toISOString()
                                        }];
                                        
                                        // Préparer les fichiers en Buffer
                                        const fileAttachments = await Promise.all(filePaths.map(async (fp, index) => {
                                            let fileData;
                                            if (fp.path && fs.existsSync(fp.path)) {
                                                fileData = fs.readFileSync(fp.path);
                                            } else if (fp.buffer) {
                                                fileData = fp.buffer;
                                            } else {
                                                return null;
                                            }
                                            return {
                                                attachment: fileData,
                                                name: fp.name || fileName
                                            };
                                        }));
                                        
                                        const validFiles = fileAttachments.filter(f => f !== null);
                                        if (validFiles.length === 0) {
                                            throw new Error('Aucun fichier valide à envoyer');
                                        }
                                        
                                        // Créer le payload avec attachments
                                        const restPayload = {
                                            embeds: minimalEmbed,
                                            attachments: validFiles.map((file, index) => ({
                                                id: index,
                                                description: 'Shader animation',
                                                filename: file.name
                                            }))
                                        };
                                        
                                        await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                                            body: restPayload,
                                            files: validFiles
                                        });
                                    }
                                },
                                // STRATÉGIE 3: Utiliser directement les AttachmentBuilder originaux avec embed minimal
                                // C'est le format que discord.js gère nativement et qui fonctionne le mieux
                                {
                                    name: 'rest.patch_AttachmentBuilder_minimal_embed',
                                    desc: 'rest.patch avec AttachmentBuilder originaux + embed minimal',
                                    test: async () => {
                                        // Créer un embed minimal avec seulement l'image
                                        // S'assurer que le nom du fichier correspond exactement
                                        const fileName = options.files[0]?.name || 'animation.gif';
                                        // Pour que Discord affiche le GIF animé, utiliser un embed avec titre
                                        // Discord affiche mieux les GIFs animés quand ils ont un titre dans l'embed
                                        const minimalEmbed = [{
                                            title: '🎨 Shader Animation',
                                            image: { url: `attachment://${fileName}` },
                                            color: embedsJson[0]?.color || 0x9B59B6,
                                            timestamp: new Date().toISOString()
                                        }];
                                        const restPayload = {
                                            embeds: minimalEmbed
                                        };
                                        
                                        // Utiliser directement les AttachmentBuilder originaux
                                        // discord.js sait comment les gérer correctement
                                        await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                                            body: restPayload,
                                            files: options.files
                                        });
                                    }
                                },
                                // STRATÉGIE 4: Lire les fichiers en Buffer et les passer avec embed minimal
                                {
                                    name: 'rest.patch_buffer_minimal_embed',
                                    desc: 'rest.patch avec fichiers lus en Buffer + embed minimal',
                                    test: async () => {
                                        const fileName = filePaths[0]?.name || 'animation.gif';
                                        // Pour que Discord affiche le GIF animé, utiliser un embed avec titre
                                        const minimalEmbed = [{
                                            title: '🎨 Shader Animation',
                                            image: { url: `attachment://${fileName}` },
                                            color: embedsJson[0]?.color || 0x9B59B6,
                                            timestamp: new Date().toISOString()
                                        }];
                                        const restPayload = {
                                            embeds: minimalEmbed
                                        };
                                        
                                        // Lire les fichiers en Buffer pour s'assurer qu'ils sont correctement transmis
                                        const fileAttachments = await Promise.all(filePaths.map(async (fp) => {
                                            if (fp.path && fs.existsSync(fp.path)) {
                                                const buffer = fs.readFileSync(fp.path);
                                                return {
                                                    attachment: buffer,
                                                    name: fp.name
                                                };
                                            }
                                            if (fp.buffer) {
                                                return {
                                                    attachment: fp.buffer,
                                                    name: fp.name
                                                };
                                            }
                                            return null;
                                        }));
                                        
                                        const validFiles = fileAttachments.filter(f => f !== null);
                                        if (validFiles.length === 0) {
                                            throw new Error('Aucun fichier valide à envoyer');
                                        }
                                        
                                        await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                                            body: restPayload,
                                            files: validFiles
                                        });
                                    }
                                },
                                // STRATÉGIE 5: Utiliser directement les AttachmentBuilder originaux (sans modification)
                                {
                                    name: 'rest.patch_AttachmentBuilder_full_embed',
                                    desc: 'rest.patch avec AttachmentBuilder originaux + embed complet',
                                    test: async () => {
                                        const restPayload = {
                                            embeds: embedsJson,
                                            components: options.components
                                        };
                                        
                                        // Utiliser directement les AttachmentBuilder originaux
                                        await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                                            body: restPayload,
                                            files: options.files
                                        });
                                    }
                                },
                                // STRATÉGIE 2: Envoyer seulement le GIF sans embed ni content (fallback)
                                {
                                    name: 'rest.patch_gif_only',
                                    desc: 'rest.patch avec seulement le GIF, sans embed ni content',
                                    test: async () => {
                                        const restPayload = {
                                            // Pas d'embeds, pas de content - juste le fichier
                                        };
                                        // Utiliser filePaths extraits au lieu de options.files directement
                                        const fileAttachments = filePaths.map(fp => {
                                            if (fp.path) {
                                                return {
                                                    attachment: fp.path,
                                                    name: fp.name
                                                };
                                            }
                                            if (fp.buffer) {
                                                return {
                                                    attachment: fp.buffer,
                                                    name: fp.name
                                                };
                                            }
                                            if (fp.stream) {
                                                return {
                                                    attachment: fp.stream,
                                                    name: fp.name
                                                };
                                            }
                                            return null;
                                        }).filter(f => f !== null);
                                        
                                        await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                                            body: restPayload,
                                            files: fileAttachments
                                        });
                                    }
                                },
                                {
                                    name: 'rest.patch_with_paths',
                                    desc: 'rest.patch avec chemins de fichiers (objets)',
                                    test: async () => {
                                        const restPayload = {
                                            embeds: embedsJson,
                                            components: options.components
                                            // Ne pas inclure content si on a des embeds
                                        };
                                        const fileAttachments = filePaths.map(fp => ({
                                            attachment: fp.path || fp.buffer || fp.stream,
                                            name: fp.name
                                        }));
                                        await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                                            body: restPayload,
                                            files: fileAttachments
                                        });
                                    }
                                },
                                {
                                    name: 'rest.patch_with_paths_strings',
                                    desc: 'rest.patch avec chemins de fichiers (strings)',
                                    test: async () => {
                                        const restPayload = {
                                            embeds: embedsJson,
                                            components: options.components
                                            // Ne pas inclure content si on a des embeds
                                        };
                                        const fileAttachments = filePaths.filter(fp => fp.path).map(fp => fp.path);
                                        await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                                            body: restPayload,
                                            files: fileAttachments
                                        });
                                    }
                                },
                                {
                                    name: 'rest.patch_with_buffers',
                                    desc: 'rest.patch avec Buffers',
                                    test: async () => {
                                        const restPayload = {
                                            embeds: embedsJson,
                                            components: options.components
                                            // Ne pas inclure content si on a des embeds
                                        };
                                        const fileAttachments = filePaths.map(fp => {
                                            if (fp.buffer) return fp.buffer;
                                            if (fp.path) return fs.readFileSync(fp.path);
                                            return null;
                                        }).filter(f => f !== null);
                                        await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                                            body: restPayload,
                                            files: fileAttachments
                                        });
                                    }
                                },
                                
                                // STRATÉGIES FormData avec différents contents
                                {
                                    name: 'formdata_content_text',
                                    desc: 'FormData avec content texte "Shader animation"',
                                    test: async () => {
                                        const FormDataModule = require('form-data');
                                        const formData = new FormDataModule();
                                        const payload = {
                                            embeds: embedsJson,
                                            components: options.components,
                                            content: 'Shader animation'
                                        };
                                        formData.append('payload_json', Buffer.from(JSON.stringify(payload), 'utf8'), {
                                            contentType: 'application/json; charset=utf-8',
                                            filename: 'payload.json'
                                        });
                                        for (let i = 0; i < filePaths.length; i++) {
                                            const fp = filePaths[i];
                                            let fileStream = null;
                                            if (fp.path) {
                                                fileStream = fs.createReadStream(fp.path);
                                            } else if (fp.buffer) {
                                                fileStream = fp.buffer;
                                            } else if (fp.stream) {
                                                fileStream = fp.stream;
                                            }
                                            if (fileStream) {
                                                formData.append(`files[${i}]`, fileStream, {
                                                    filename: fp.name,
                                                    contentType: fp.name.endsWith('.gif') ? 'image/gif' : 'image/png'
                                                });
                                            }
                                        }
                                        const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
                                        const response = await fetch(webhookUrl, {
                                            method: 'PATCH',
                                            headers: {
                                                ...formData.getHeaders(),
                                                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
                                            },
                                            body: formData
                                        });
                                        if (!response.ok) {
                                            const errorText = await response.text();
                                            throw new Error(`HTTP ${response.status}: ${errorText}`);
                                        }
                                    }
                                },
                                {
                                    name: 'formdata_content_nonbreaking_space',
                                    desc: 'FormData avec content non-breaking space',
                                    test: async () => {
                                        const FormDataModule = require('form-data');
                                        const formData = new FormDataModule();
                                        const payload = {
                                            embeds: embedsJson,
                                            components: options.components,
                                            content: '\u00A0' // Non-breaking space
                                        };
                                        formData.append('payload_json', Buffer.from(JSON.stringify(payload), 'utf8'), {
                                            contentType: 'application/json; charset=utf-8',
                                            filename: 'payload.json'
                                        });
                                        for (let i = 0; i < filePaths.length; i++) {
                                            const fp = filePaths[i];
                                            let fileStream = null;
                                            if (fp.path) {
                                                fileStream = fs.createReadStream(fp.path);
                                            } else if (fp.buffer) {
                                                fileStream = fp.buffer;
                                            } else if (fp.stream) {
                                                fileStream = fp.stream;
                                            }
                                            if (fileStream) {
                                                formData.append(`files[${i}]`, fileStream, {
                                                    filename: fp.name,
                                                    contentType: fp.name.endsWith('.gif') ? 'image/gif' : 'image/png'
                                                });
                                            }
                                        }
                                        const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
                                        const response = await fetch(webhookUrl, {
                                            method: 'PATCH',
                                            headers: {
                                                ...formData.getHeaders(),
                                                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
                                            },
                                            body: formData
                                        });
                                        if (!response.ok) {
                                            const errorText = await response.text();
                                            throw new Error(`HTTP ${response.status}: ${errorText}`);
                                        }
                                    }
                                },
                                {
                                    name: 'formdata_content_shader_id',
                                    desc: 'FormData avec content "Shader ID: X"',
                                    test: async () => {
                                        const FormDataModule = require('form-data');
                                        const formData = new FormDataModule();
                                        // Extraire l'ID du shader depuis l'embed si possible
                                        let shaderId = '1';
                                        if (embedsJson.length > 0 && embedsJson[0].fields) {
                                            const idField = embedsJson[0].fields.find(f => f.name && f.name.includes('ID'));
                                            if (idField) {
                                                shaderId = idField.value.replace(/[`\s]/g, '');
                                            }
                                        }
                                        const payload = {
                                            embeds: embedsJson,
                                            components: options.components,
                                            content: `Shader ID: ${shaderId}`
                                        };
                                        formData.append('payload_json', Buffer.from(JSON.stringify(payload), 'utf8'), {
                                            contentType: 'application/json; charset=utf-8',
                                            filename: 'payload.json'
                                        });
                                        for (let i = 0; i < filePaths.length; i++) {
                                            const fp = filePaths[i];
                                            let fileStream = null;
                                            if (fp.path) {
                                                fileStream = fs.createReadStream(fp.path);
                                            } else if (fp.buffer) {
                                                fileStream = fp.buffer;
                                            } else if (fp.stream) {
                                                fileStream = fp.stream;
                                            }
                                if (fileStream) {
                                                formData.append(`files[${i}]`, fileStream, {
                                                    filename: fp.name,
                                                    contentType: fp.name.endsWith('.gif') ? 'image/gif' : 'image/png'
                                                });
                                            }
                                        }
                                        const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
                                        const response = await fetch(webhookUrl, {
                                            method: 'PATCH',
                                            headers: {
                                                ...formData.getHeaders(),
                                                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
                                            },
                                            body: formData
                                        });
                                        if (!response.ok) {
                                            const errorText = await response.text();
                                            throw new Error(`HTTP ${response.status}: ${errorText}`);
                                        }
                                    }
                                },
                                {
                                    name: 'formdata_content_separate_field',
                                    desc: 'FormData avec content dans champ séparé (pas dans payload_json)',
                                    test: async () => {
                                        const FormDataModule = require('form-data');
                                        const formData = new FormDataModule();
                                        const payload = {
                                            embeds: embedsJson,
                                            components: options.components
                                            // Pas de content dans payload_json
                                        };
                                        formData.append('payload_json', Buffer.from(JSON.stringify(payload), 'utf8'), {
                                            contentType: 'application/json; charset=utf-8',
                                            filename: 'payload.json'
                                        });
                                        formData.append('content', 'Shader animation'); // Content séparé
                                        for (let i = 0; i < filePaths.length; i++) {
                                            const fp = filePaths[i];
                                            let fileStream = null;
                                            if (fp.path) {
                                                fileStream = fs.createReadStream(fp.path);
                                            } else if (fp.buffer) {
                                                fileStream = fp.buffer;
                                            } else if (fp.stream) {
                                                fileStream = fp.stream;
                                            }
                                            if (fileStream) {
                                                formData.append(`files[${i}]`, fileStream, {
                                                    filename: fp.name,
                                                    contentType: fp.name.endsWith('.gif') ? 'image/gif' : 'image/png'
                                                });
                                            }
                                        }
                                        const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
                                        const response = await fetch(webhookUrl, {
                                            method: 'PATCH',
                                            headers: {
                                                ...formData.getHeaders(),
                                                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
                                            },
                                            body: formData
                                        });
                                        if (!response.ok) {
                                            const errorText = await response.text();
                                            throw new Error(`HTTP ${response.status}: ${errorText}`);
                                        }
                                    }
                                },
                                {
                                    name: 'formdata_files_without_index',
                                    desc: 'FormData avec files sans index (files au lieu de files[0])',
                                    test: async () => {
                                        const FormDataModule = require('form-data');
                                        const formData = new FormDataModule();
                                        const payload = {
                                            embeds: embedsJson,
                                            components: options.components,
                                            content: 'Shader animation'
                                        };
                                        formData.append('payload_json', Buffer.from(JSON.stringify(payload), 'utf8'), {
                                            contentType: 'application/json; charset=utf-8',
                                            filename: 'payload.json'
                                        });
                                        for (let i = 0; i < filePaths.length; i++) {
                                            const fp = filePaths[i];
                                            let fileStream = null;
                                            if (fp.path) {
                                                fileStream = fs.createReadStream(fp.path);
                                            } else if (fp.buffer) {
                                                fileStream = fp.buffer;
                                            } else if (fp.stream) {
                                                fileStream = fp.stream;
                                            }
                                            if (fileStream) {
                                                // Utiliser 'files' au lieu de 'files[0]'
                                                formData.append('files', fileStream, {
                                                    filename: fp.name,
                                                    contentType: fp.name.endsWith('.gif') ? 'image/gif' : 'image/png'
                                                });
                                            }
                                        }
                                        const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
                                        const response = await fetch(webhookUrl, {
                                            method: 'PATCH',
                                            headers: {
                                                ...formData.getHeaders(),
                                                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
                                            },
                                            body: formData
                                        });
                                        if (!response.ok) {
                                            const errorText = await response.text();
                                            throw new Error(`HTTP ${response.status}: ${errorText}`);
                                        }
                                    }
                                },
                                {
                                    name: 'formdata_file_singular',
                                    desc: 'FormData avec file au singulier (file au lieu de files[0])',
                                    test: async () => {
                                        const FormDataModule = require('form-data');
                                        const formData = new FormDataModule();
                                        const payload = {
                                            embeds: embedsJson,
                                            components: options.components,
                                            content: 'Shader animation'
                                        };
                                        formData.append('payload_json', Buffer.from(JSON.stringify(payload), 'utf8'), {
                                            contentType: 'application/json; charset=utf-8',
                                            filename: 'payload.json'
                                        });
                                        for (let i = 0; i < filePaths.length; i++) {
                                            const fp = filePaths[i];
                                            let fileStream = null;
                                            if (fp.path) {
                                                fileStream = fs.createReadStream(fp.path);
                                            } else if (fp.buffer) {
                                                fileStream = fp.buffer;
                                            } else if (fp.stream) {
                                                fileStream = fp.stream;
                                            }
                                            if (fileStream) {
                                                // Utiliser 'file' au lieu de 'files[0]'
                                                formData.append('file', fileStream, {
                                                    filename: fp.name,
                                                    contentType: fp.name.endsWith('.gif') ? 'image/gif' : 'image/png'
                                                });
                                            }
                                        }
                                        const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
                                        const response = await fetch(webhookUrl, {
                                            method: 'PATCH',
                                            headers: {
                                                ...formData.getHeaders(),
                                                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
                                            },
                                            body: formData
                                        });
                                        if (!response.ok) {
                                            const errorText = await response.text();
                                            throw new Error(`HTTP ${response.status}: ${errorText}`);
                                        }
                                    }
                                },
                                {
                                    name: 'formdata_buffers_instead_of_streams',
                                    desc: 'FormData avec Buffers au lieu de Streams',
                                    test: async () => {
                                        const FormDataModule = require('form-data');
                                        const formData = new FormDataModule();
                                        const payload = {
                                            embeds: embedsJson,
                                            components: options.components,
                                            content: 'Shader animation'
                                        };
                                        formData.append('payload_json', Buffer.from(JSON.stringify(payload), 'utf8'), {
                                            contentType: 'application/json; charset=utf-8',
                                            filename: 'payload.json'
                                        });
                                        for (let i = 0; i < filePaths.length; i++) {
                                            const fp = filePaths[i];
                                            let fileBuffer = null;
                                            if (fp.buffer) {
                                                fileBuffer = fp.buffer;
                                            } else if (fp.path) {
                                                fileBuffer = fs.readFileSync(fp.path);
                                            } else if (fp.stream && fp.stream.path) {
                                                fileBuffer = fs.readFileSync(fp.stream.path);
                                            }
                                            if (fileBuffer) {
                                                formData.append(`files[${i}]`, fileBuffer, {
                                                    filename: fp.name,
                                                    contentType: fp.name.endsWith('.gif') ? 'image/gif' : 'image/png'
                                                });
                                            }
                                        }
                                        const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
                                        const response = await fetch(webhookUrl, {
                                            method: 'PATCH',
                                            headers: {
                                                ...formData.getHeaders(),
                                                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
                                            },
                                            body: formData
                                        });
                                        if (!response.ok) {
                                            const errorText = await response.text();
                                            throw new Error(`HTTP ${response.status}: ${errorText}`);
                                        }
                                    }
                                }
                            ];
                            
                            // Tester chaque stratégie jusqu'à ce qu'une fonctionne
                            let lastError = null;
                            let successStrategy = null;
                            
                            for (const strategy of strategies) {
                                try {
                                    console.log(`🧪 TEST STRATÉGIE "${strategy.name}": ${strategy.desc}`);
                                    await strategy.test();
                                    console.log(`✅ ✅ ✅ SUCCÈS avec stratégie "${strategy.name}"! ✅ ✅ ✅`);
                                    console.log(`✅ Cette stratégie fonctionne: ${strategy.desc}`);
                                    successStrategy = strategy.name;
                                    break; // Sortir de la boucle, on a trouvé la bonne stratégie
                                } catch (strategyError) {
                                    const errorMsg = strategyError.message || strategyError.toString();
                                    console.log(`  - ❌ Échec: ${errorMsg.substring(0, 150)}`);
                                    lastError = strategyError;
                                    continue; // Essayer la stratégie suivante
                                }
                            }
                            
                            if (!successStrategy) {
                                throw lastError || new Error('Toutes les stratégies ont échoué');
                            }
                            
                            return; // Succès, sortir de la fonction
                                } else {
                            // Pas de fichiers, envoi JSON classique
                            // Ici on peut supprimer content si embeds présents (Discord accepte embeds seuls sans fichiers)
                            const jsonPayload = { ...options };
                            
                            if (jsonPayload.embeds && jsonPayload.embeds.length > 0 && !jsonPayload.content) {
                                // Sans fichiers, Discord accepte embeds seuls sans content
                                delete jsonPayload.content;
                                console.log('✅ Envoi JSON pur - embeds seuls (content supprimé car non requis)');
                            }
                            
                            await rest.patch(Routes.webhookMessage(applicationId, interactionToken), {
                                body: jsonPayload
                            });
                        }
                    },
                    
                    async followUp(options) {
                        // Si des fichiers sont présents, utiliser FormData
                        if (options.files && options.files.length > 0) {
                            const FormData = require('form-data');
                            let formData = new FormData();
                            
                            // Préparer le payload JSON
                            const embedsJson = options.embeds ? options.embeds.map(embed => {
                                if (embed && typeof embed.toJSON === 'function') {
                                    return embed.toJSON();
                                }
                                return embed;
                            }).filter(embed => embed !== null && embed !== undefined) : [];
                            
                            const payloadJson = {};
                            
                            if (embedsJson.length > 0) {
                                payloadJson.embeds = embedsJson;
                            }
                            
                            if (options.components) {
                                payloadJson.components = options.components;
                            }
                            
                            // Avec FormData + fichiers, utiliser un emoji comme content
                            if (!options.content || options.content.trim() === '') {
                                payloadJson.content = '🎨';
                                } else {
                                payloadJson.content = options.content;
                            }
                            
                            const payloadJsonString = JSON.stringify(payloadJson, null, 0);
                            
                            // Ajouter payload_json
                            formData.append('payload_json', payloadJsonString, {
                                contentType: 'application/json'
                            });
                            
                            // Ajouter les fichiers
                            for (let i = 0; i < options.files.length; i++) {
                                const file = options.files[i];
                                let fileStream = null;
                                let fileName = 'file.gif';
                                
                                if (file.attachment) {
                                    if (typeof file.attachment === 'string' && fs.existsSync(file.attachment)) {
                                        fileStream = fs.createReadStream(file.attachment);
                                        fileName = file.name || path.basename(file.attachment);
                                    } else if (Buffer.isBuffer(file.attachment)) {
                                        fileStream = file.attachment;
                                        fileName = file.name || 'file.gif';
                                    }
                                }
                                
                                if (fileStream) {
                                    formData.append(`files[${i}]`, fileStream, {
                                        filename: fileName,
                                        contentType: fileName.endsWith('.gif') ? 'image/gif' : 'image/png'
                                    });
                                }
                            }
                            
                            const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`;
                            const discordToken = process.env.DISCORD_TOKEN;
                            
                            const response = await fetch(webhookUrl, {
                                method: 'POST',
                                headers: {
                                ...formData.getHeaders(),
                                'Authorization': `Bot ${discordToken}`
                                },
                                    body: formData
                                });
                                
                                if (!response.ok) {
                                    const errorText = await response.text();
                                    throw new Error(`Discord API error: ${response.status} - ${errorText.substring(0, 200)}`);
                                }
                                
                            return await response.json();
                        } else {
                            // Pas de fichiers, envoi JSON classique
                            await rest.post(Routes.webhook(applicationId, interactionToken), {
                                body: options
                            });
                        }
                    },
                    
                    isChatInputCommand: () => true,
                    isAutocomplete: () => false
                };

                try {
                    console.log(`▶️ Exécution commande HTTP: ${commandName}`);
                    await command.execute(mockInteraction, {
                        compiler: this.compiler,
                        database: this.database,
                        bot: this
                    });
                    console.log(`✅ Commande HTTP ${commandName} exécutée avec succès`);
                } catch (error) {
                    console.error(`❌ Erreur lors de l'exécution de la commande HTTP ${commandName}:`, error);
                    // Ne pas relancer l'erreur car elle a déjà été gérée par la commande
                    // mais on log pour le debugging
                } finally {
                    // Retirer le verrou après l'exécution (avec un délai pour éviter les doubles exécutions rapides)
                    setTimeout(() => {
                        this.activeCommands.delete(commandLockKey);
                    }, 2000); // 2 secondes de délai
                }
            }
            // Si c'est un autocomplete (type 4)
            else if (body.type === 4) {
                const commandName = body.data?.name;
                console.log(`🔍 Autocomplete HTTP reçu: ${commandName}`);
                
                const command = this.commands.get(commandName);
                
                if (command && command.autocomplete) {
                    let autocompleteResponse = null;
                    
                    const mockInteraction = {
                        commandName: commandName,
                        options: {
                            getFocused: () => {
                                const focused = body.data?.options?.find(opt => opt.focused);
                                return { value: focused?.value || '' };
                            }
                        },
                        isAutocomplete: () => true,
                        async respond(options) {
                            autocompleteResponse = {
                                type: 8, // APPLICATION_COMMAND_AUTOCOMPLETE_RESULT
                                data: { choices: options.choices || [] }
                            };
                        }
                    };
                    
                    try {
                    await command.autocomplete(mockInteraction);
                    if (autocompleteResponse) {
                        return autocompleteResponse;
                    }
                    } catch (error) {
                        console.error(`❌ Erreur lors de l'autocomplete HTTP ${commandName}:`, error);
                    }
                }
                
                // Réponse par défaut si aucune commande ou autocomplete
                return { type: 8, data: { choices: [] } };
            }
        } catch (error) {
            console.error('❌ Erreur dans handleInteractionFromHTTP:', error);
            throw error;
        }
    }

    startExpressServer() {
        const app = express();
        const port = process.env.PORT || 8080;
        
        // Intégrer Graceful Shutdown
        const { getGracefulShutdown } = require('./src/utils/gracefulShutdown');
        const gracefulShutdown = getGracefulShutdown();
        
        // Enregistrer les fonctions de nettoyage
        gracefulShutdown.registerCleanup('browserPool', async () => {
            const { getBrowserPool } = require('./src/browser-pool');
            const browserPool = getBrowserPool();
            await browserPool.closeAll();
        });
        
        gracefulShutdown.registerCleanup('database', async () => {
            await this.database.close();
        });
        
        // Démarrer les backups automatiques
        try {
            const { getBackupManager } = require('./src/utils/backupManager');
            const backupManager = getBackupManager();
            backupManager.startAutoBackups('0 3 * * *', {
                database: this.database,
                metrics: require('./src/metrics').getMetrics(),
                cacheManager: require('./src/utils/cacheManager').getCacheManager(),
                telemetry: require('./src/utils/telemetry').getTelemetry(),
                webhookManager: require('./src/utils/webhookManager').getWebhookManager(),
                dbPath: process.env.DB_PATH || './data/shaders.db'
            });
        } catch (error) {
            console.warn('⚠️ Backup automatique non disponible:', error.message);
        }
        
        // Middleware pour tracker les requêtes
        app.use(gracefulShutdown.middleware());

        // Headers CORS pour Discord et API web (avant tout autre middleware)
        app.use((req, res, next) => {
            const allowedOrigins = [
                'https://glsl-discord-bot.vercel.app',
                'https://glsl-discord-bot.onrender.com',
                'http://localhost:3000',
                'http://localhost:8080',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:8080'
            ];
            const origin = req.headers.origin;
            if (origin && allowedOrigins.includes(origin)) {
                res.setHeader('Access-Control-Allow-Origin', origin);
            }
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Signature-Ed25519, X-Signature-Timestamp');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
                    }
                    next();
        });
        
        // Route pour les interactions Discord avec validation de signature
        // DOIT être avant express.json() pour capturer le raw body
        // Utiliser express.raw() avec verify pour capturer le raw body sans le consommer
        app.post('/discord', express.raw({ 
            type: 'application/json',
            verify: (req, res, buf, encoding) => {
                // Stocker le raw body dans req.rawBody pour la validation de signature
                // buf est déjà un Buffer, pas besoin de conversion
                req.rawBody = buf;
            }
        }), async (req, res) => {
            try {
                // Récupérer les en-têtes de signature (Express normalise en minuscules)
                const signature = req.headers['x-signature-ed25519'] || req.headers['X-Signature-Ed25519'];
                const timestamp = req.headers['x-signature-timestamp'] || req.headers['X-Signature-Timestamp'];
                
                // Vérifier que les en-têtes sont présents
                if (!signature || !timestamp) {
                    console.error('❌ En-têtes de signature manquants:', {
                        hasSignature: !!signature,
                        hasTimestamp: !!timestamp,
                        headers: Object.keys(req.headers).filter(h => h.toLowerCase().includes('signature'))
                    });
                    return res.status(401).send('Unauthorized: Missing signature headers');
                }
                
                // Vérifier la signature avec le raw body
                // Utiliser req.rawBody capturé par express.raw() avec verify
                const rawBody = req.rawBody || req.body;
                if (!rawBody || !Buffer.isBuffer(rawBody)) {
                    console.error('❌ Raw body manquant ou invalide pour validation de signature:', {
                        hasBody: !!rawBody,
                        isBuffer: Buffer.isBuffer(rawBody),
                        type: typeof rawBody,
                        hasRawBody: !!req.rawBody,
                        hasReqBody: !!req.body
                    });
                    return res.status(400).send('Bad Request: Missing or invalid body');
                }
                
                const isValid = verifyDiscordSignatureWithRawBody(signature, timestamp, rawBody);
                
                if (!isValid) {
                    console.error('❌ Signature Discord invalide');
                    return res.status(401).send('Unauthorized: Invalid signature');
                }
                
                // Parser le body maintenant que la signature est validée
                let body;
                try {
                    body = JSON.parse(rawBody.toString('utf-8'));
                } catch (parseError) {
                    console.error('❌ Erreur parsing JSON:', parseError);
                    return res.status(400).send('Bad Request: Invalid JSON');
                }
                
                console.log('🌐 Requête Discord reçue (signature validée):', body.type);
                
                // Type 1: PING
                if (body.type === 1) {
                    console.log('➡️ Réponse PONG');
                    return res.send({ type: 1 });
                }
                // Type 2: APPLICATION_COMMAND
                else if (body.type === 2) {
                    const commandName = body.data?.name;
                    
                    // Répondre immédiatement à Discord pour éviter le timeout (type 5)
                    res.status(200).send({
                        type: 5 // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
                    });
                    
                    // Exécuter la commande en arrière-plan
                    // handleInteractionFromHTTP gère le verrou et la vérification de duplication
                    this.handleInteractionFromHTTP(body, req, res)
                        .then(() => console.log(`✅ Traitement en arrière-plan de ${commandName} terminé.`))
                        .catch(err => console.error(`❌ Erreur traitement en arrière-plan de ${commandName}:`, err));
                }
                // Type 4: APPLICATION_COMMAND_AUTOCOMPLETE
                else if (body.type === 4) {
                    const commandName = body.data?.name;
                    console.log(`🔍 Autocomplete HTTP reçu: ${commandName}`);
                    
                    const command = this.commands.get(commandName);
                    
                    if (command && command.autocomplete) {
                        let autocompleteResponse = null;
                        
                        const mockInteraction = {
                            commandName: commandName,
                            options: {
                                getFocused: () => {
                                    const focused = body.data?.options?.find(opt => opt.focused);
                                    return { value: focused?.value || '' };
                                }
                            },
                            isAutocomplete: () => true,
                            async respond(options) {
                                autocompleteResponse = {
                                    type: 8, // APPLICATION_COMMAND_AUTOCOMPLETE_RESULT
                                    data: { choices: options.choices || [] }
                                };
                            }
                        };
                        
                        try {
                            await command.autocomplete(mockInteraction);
                            if (autocompleteResponse) {
                                return res.status(200).json(autocompleteResponse);
                            }
                        } catch (error) {
                            console.error(`❌ Erreur lors de l'autocomplete HTTP ${commandName}:`, error);
                        }
                    }
                    
                    // Réponse par défaut si aucune commande ou autocomplete
                    return res.status(200).json({ type: 8, data: { choices: [] } });
                }
                // Autres types d'interaction
                else {
                    console.log('➡️ Interaction non gérée:', body.type);
                    return res.status(400).send('Interaction non gérée');
                }
            } catch (error) {
                console.error('❌ Erreur lors du traitement de l\'interaction Discord:', error);
                // Si la réponse n'a pas encore été envoyée, envoyer une erreur
                if (!res.headersSent) {
                    return res.status(500).send('Internal Server Error');
                }
            }
        });
        
        // Middleware pour parser le JSON (pour les autres routes)
        app.use(express.json());
        
        // API pour le tableau de bord web
        app.get('/api/stats', async (req, res) => {
            try {
                const stats = await this.database.getBotStats();
                res.json(stats);
            } catch (error) {
                console.error('❌ Erreur API /api/stats:', error);
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        });
        
        app.get('/api/shaders', async (req, res) => {
            try {
                const userId = req.query.userId;
                if (!userId) {
                    return res.status(400).json({ error: 'User ID is required' });
                }
                const shaders = await this.database.getUserShaders(userId);
                res.json(shaders);
            } catch (error) {
                console.error('❌ Erreur API /api/shaders:', error);
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        });
        
        app.get('/api/shaders/:id', async (req, res) => {
            try {
                const shaderId = req.params.id;
                const shader = await this.database.getShader(shaderId);
                if (shader) {
                    res.json(shader);
                } else {
                    res.status(404).json({ error: 'Shader non trouvé' });
                }
            } catch (error) {
                console.error('❌ Erreur API /api/shaders/:id:', error);
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        });
        
        app.delete('/api/shaders/:id', async (req, res) => {
            try {
                const shaderId = req.params.id;
                const userId = req.query.userId; // Assurez-vous que l'utilisateur est autorisé à supprimer
                if (!userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                const success = await this.database.deleteShader(shaderId, userId);
                if (success) {
                    res.status(200).json({ message: 'Shader supprimé avec succès' });
                } else {
                    res.status(404).json({ error: 'Shader non trouvé ou non autorisé' });
                }
            } catch (error) {
                console.error('❌ Erreur API DELETE /api/shaders/:id:', error);
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        });
        
        app.post('/api/shaders/compile', async (req, res) => {
            try {
                const { code, name, userId } = req.body;
                if (!code || !userId) {
                    return res.status(400).json({ error: 'Code and userId are required' });
                }
                const result = await this.compiler.compileShader(code, { userId, name });
                if (result.success) {
                    // Sauvegarder le shader dans la base de données
                    const shaderId = await this.database.saveShader({
                        code,
                        user_id: userId,
                        user_name: 'Dashboard User', // Ou récupérer le nom de l'utilisateur
                        image_path: result.frameDirectory,
                        gif_path: result.gifPath,
                        name: name || `Shader #${Date.now()}`
                    });
                    res.json({ success: true, shaderId, gifUrl: result.gifPath, imageUrl: result.frameDirectory });
                } else {
                    res.status(400).json({ success: false, error: result.error });
                }
            } catch (error) {
                console.error('❌ Erreur API /api/shaders/compile:', error);
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        });
        
        app.post('/api/shaders/generate', async (req, res) => {
            try {
                const { shape, color, animation, speed, size, userId, name } = req.body;
                if (!userId) {
                    return res.status(400).json({ error: 'User ID is required' });
                }
                const shaderCode = this.generateShaderFromParams({
                    forme: shape,
                    couleur: color,
                    animation: animation,
                    vitesse: speed,
                    taille: size
                });
                const result = await this.compiler.compileShader(shaderCode, { userId, name });
                if (result.success) {
                    const shaderId = await this.database.saveShader({
                        code: shaderCode,
                        user_id: userId,
                        user_name: 'Dashboard User',
                        image_path: result.frameDirectory,
                        gif_path: result.gifPath,
                        name: name || `Generated Shader #${Date.now()}`
                    });
                    res.json({ success: true, shaderId, gifUrl: result.gifPath, imageUrl: result.frameDirectory });
                    } else {
                    res.status(400).json({ success: false, error: result.error });
                }
            } catch (error) {
                console.error('❌ Erreur API /api/shaders/generate:', error);
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        });
        
        app.post('/api/shaders/preset', async (req, res) => {
            try {
                const { presetName, userId, name } = req.body;
                if (!presetName || !userId) {
                    return res.status(400).json({ error: 'Preset name and userId are required' });
                }
                const preset = this.getPresetShader(presetName);
                if (!preset) {
                    return res.status(404).json({ error: 'Preset non trouvé' });
                }
                const result = await this.compiler.compileShader(preset.code, { userId, name });
                if (result.success) {
                    const shaderId = await this.database.saveShader({
                        code: preset.code,
                        user_id: userId,
                        user_name: 'Dashboard User',
                        image_path: result.frameDirectory,
                        gif_path: result.gifPath,
                        name: name || preset.name
                    });
                    res.json({ success: true, shaderId, gifUrl: result.gifPath, imageUrl: result.frameDirectory });
                } else {
                    res.status(400).json({ success: false, error: result.error });
                }
            } catch (error) {
                console.error('❌ Erreur API /api/shaders/preset:', error);
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        });
        
        // Servir les fichiers GIF et images
        app.get('/shaders/assets/:filename', (req, res) => {
            const filename = req.params.filename;
            const filePath = path.join(process.cwd(), 'temp', filename);
            if (fs.existsSync(filePath)) {
                res.sendFile(filePath);
            } else {
                res.status(404).send('Fichier non trouvé');
            }
        });
        
        // Démarrer le serveur Express
        this.server = app.listen(port, () => {
                console.log(`🌐 Serveur Express démarré sur le port ${port}`);
        });
        
        // Gérer la fermeture gracieuse du serveur
        gracefulShutdown.registerCleanup('expressServer', async () => {
            console.log(' gracefulShutdown: Fermeture du serveur Express...');
            if (this.server) {
                await new Promise(resolve => this.server.close(resolve));
                console.log(' gracefulShutdown: Serveur Express fermé.');
            }
        });
    }

    async shutdown() {
        console.log('🛑 Arrêt du bot...');
        
        // Empêcher de nouvelles compilations
        this.isShuttingDown = true;
        
        // Attendre que les compilations en cours se terminent (max 5 minutes)
        if (this.activeCompilations.size > 0) {
            console.log(`⏳ Attente de la fin de ${this.activeCompilations.size} compilation(s) en cours...`);
            const startTime = Date.now();
            const maxWaitTime = 5 * 60 * 1000; // 5 minutes
            
            while (this.activeCompilations.size > 0 && (Date.now() - startTime) < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (this.activeCompilations.size > 0) {
                    console.log(`⏳ Encore ${this.activeCompilations.size} compilation(s) en cours...`);
                }
            }
            
            if (this.activeCompilations.size > 0) {
                console.warn(`⚠️ ${this.activeCompilations.size} compilation(s) n'ont pas pu se terminer à temps`);
            } else {
                console.log('✅ Toutes les compilations sont terminées');
            }
        }
        
        // Fermer le compilateur
        try {
            await this.compiler.close();
        } catch (error) {
            console.error('❌ Erreur lors de la fermeture du compilateur:', error);
        }
        
        // Fermer la base de données
        try {
            await this.database.close();
            console.log('✅ Base de données fermée');
        } catch (error) {
            // Ignorer les erreurs si la base de données est déjà fermée
            if (error.code !== 'SQLITE_MISUSE') {
                console.error('❌ Erreur lors de la fermeture de la base de données:', error);
            }
        }
        
        // Déconnecter le client Discord
        try {
            this.client.destroy();
        } catch (error) {
            console.error('❌ Erreur lors de la déconnexion du client:', error);
        }
        
        console.log('✅ Bot arrêté');
    }
}

// Gérer l'arrêt propre
process.on('SIGINT', async () => {
    if (global.bot) {
        await global.bot.shutdown();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    if (global.bot) {
        await global.bot.shutdown();
    }
    process.exit(0);
});

// Démarrer le bot
if (require.main === module) {
    const bot = new GLSLDiscordBot();
    global.bot = bot;
    bot.initialize().catch(console.error);
}

module.exports = { GLSLDiscordBot, verifyDiscordSignatureWithRawBody };
