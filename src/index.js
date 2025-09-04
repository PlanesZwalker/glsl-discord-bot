#!/usr/bin/env node

/**
 * GLSL Discord Bot - Version Serverless pour Vercel
 * Avec vraie compilation WebGL et animations de shaders
 */

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { RealWebGLCompiler } = require('./real-webgl-compiler');
const { SimpleDatabase } = require('./simple-database');
const fs = require('fs').promises;
const path = require('path');

class RealWebGLBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        this.webglCompiler = new RealWebGLCompiler();
        this.database = new SimpleDatabase();
        this.setupEventHandlers();
    }

    async initialize() {
        try {
            console.log('🚀 Initialisation du GLSL Discord Bot WebGL Réel...');

            // Initialiser la base de données
            await this.database.initialize();
            console.log('✅ Base de données initialisée');

            // Initialiser le compilateur WebGL réel
            await this.webglCompiler.initialize();
            console.log('✅ Compilateur WebGL réel initialisé');

            // Se connecter à Discord
            await this.client.login(process.env.DISCORD_TOKEN);
            console.log('✅ Connecté à Discord');

            // Maintenir le processus en vie
            this.keepAlive();

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            process.exit(1);
        }
    }

    keepAlive() {
        setInterval(() => {
            if (this.client && this.client.isReady()) {
                console.log('💓 Bot WebGL en vie - Connecté à Discord');
            }
        }, 300000); // Toutes les 5 minutes

        process.stdin.resume();
    }

    setupEventHandlers() {
        // Événement de connexion
        this.client.once('ready', () => {
            console.log(`🤖 Bot WebGL connecté en tant que ${this.client.user.tag}`);
            console.log(`📊 Servant ${this.client.guilds.cache.size} serveurs`);
            this.client.user.setActivity('!shader help', { type: 'PLAYING' });
            console.log('🎯 Bot WebGL réel prêt à compiler des shaders animés !');
        });

        // Événement de message
        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            if (!message.content.startsWith('!shader')) return;

            try {
                await this.handleCommand(message);
            } catch (error) {
                console.error('Erreur lors du traitement du message:', error);
                await message.reply('❌ Une erreur est survenue lors du traitement de votre commande.');
            }
        });

        // Gestion de l'arrêt
        process.on('SIGINT', async () => {
            console.log('🛑 Arrêt du bot WebGL...');
            await this.cleanup();
            process.exit(0);
        });
    }

    async handleCommand(message) {
        const args = message.content.split(' ');
        const command = args[1] || 'help';

        console.log(`📨 Commande WebGL reçue: ${command} de ${message.author.tag}`);

        switch (command) {
            case 'help':
                await this.showHelp(message);
                break;
            case 'smartia':
                await this.showSmartiaShader(message);
                break;
            case 'compile':
                await this.compileShader(message, args.slice(2).join(' '));
                break;
            case 'animate':
                await this.animateShader(message, args.slice(2).join(' '));
                break;
            case 'gallery':
                await this.showGallery(message);
                break;
            case 'search':
                await this.searchShaders(message, args.slice(2).join(' '));
                break;
            case 'stats':
                await this.showStats(message);
                break;
            default:
                // Si c'est du code GLSL direct
                if (args.length > 1) {
                    await this.compileShader(message, args.slice(1).join(' '));
                } else {
                    await this.showHelp(message);
                }
        }
    }

    async showHelp(message) {
        const embed = new EmbedBuilder()
            .setColor('#4ECDC4')
            .setTitle('🎨 GLSL WebGL Bot - Aide')
            .setDescription('Bot Discord pour compiler et animer des shaders GLSL en temps réel avec WebGL')
            .addFields(
                { name: '📝 Compilation WebGL', value: '`!shader <code>` - Compiler un shader GLSL\n`!shader compile <code>` - Même chose', inline: false },
                { name: '🎬 Animation WebGL', value: '`!shader animate <code>` - Créer une animation de 3 secondes', inline: false },
                { name: '🌟 Shaders Prédéfinis', value: '`!shader smartia` - Afficher le shader SMARTIA animé', inline: false },
                { name: '🖼️ Galerie', value: '`!shader gallery` - Voir les shaders populaires', inline: false },
                { name: '🔍 Recherche', value: '`!shader search <query>` - Rechercher des shaders', inline: false },
                { name: '📊 Statistiques', value: '`!shader stats` - Statistiques du bot', inline: false },
                { name: '❓ Aide', value: '`!shader help` - Afficher cette aide', inline: false }
            )
            .setFooter({ text: 'Bot WebGL développé avec ❤️ pour des shaders vraiment jouables !' });

        await message.reply({ embeds: [embed] });
    }

    async showSmartiaShader(message) {
        const smartiaCode = `
// Shader SMARTIA - Texte 3D animé et jouable
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord/iResolution.xy;
    vec2 p = (2.0*fragCoord-iResolution.xy)/min(iResolution.y,iResolution.x);
    
    float t = iTime * 0.5;
    
    // Fond animé
    vec3 col = 0.5 + 0.5*cos(t+uv.xyx+vec3(0,2,4));
    
    // Texte SMARTIA avec animation
    float d = 1.0;
    float scale = 0.8 + 0.2*sin(t);
    
    // Lettres animées
    d = min(d, length(p - vec2(-0.6*scale, 0.0 + 0.1*sin(t*2))) - 0.1);
    d = min(d, length(p - vec2(-0.4*scale, 0.0 + 0.1*sin(t*2 + 1))) - 0.1);
    d = min(d, length(p - vec2(-0.2*scale, 0.0 + 0.1*sin(t*2 + 2))) - 0.1);
    d = min(d, length(p - vec2( 0.0*scale, 0.0 + 0.1*sin(t*2 + 3))) - 0.1);
    d = min(d, length(p - vec2( 0.2*scale, 0.0 + 0.1*sin(t*2 + 4))) - 0.1);
    d = min(d, length(p - vec2( 0.4*scale, 0.0 + 0.1*sin(t*2 + 5))) - 0.1);
    d = min(d, length(p - vec2( 0.6*scale, 0.0 + 0.1*sin(t*2 + 6))) - 0.1);
    
    // Couleur dorée animée
    vec3 gold = vec3(1.0, 0.8, 0.2) + 0.3*sin(t*3);
    col = mix(col, gold, smoothstep(0.01, 0.0, d));
    
    // Effet de brillance
    col += 0.1*sin(t*5)*exp(-d*10.0);
    
    fragColor = vec4(col, 1.0);
}`;

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🌟 Shader SMARTIA - Version WebGL Animée')
            .setDescription('Shader 3D prédéfini avec animation réelle et jouable !')
            .addFields(
                { name: '📝 Code GLSL Animé', value: '```glsl\n' + smartiaCode.trim() + '\n```', inline: false },
                { name: '🎬 Animation', value: 'Utilisez `!shader animate <code>` pour créer une animation de 3 secondes !', inline: false },
                { name: '🎯 WebGL Réel', value: 'Ce shader utilise de vrais uniforms WebGL : iTime, iResolution, iMouse', inline: false }
            )
            .setFooter({ text: 'Shader créé spécialement pour ce bot WebGL' });

        await message.reply({ embeds: [embed] });
    }

    async compileShader(message, shaderCode) {
        if (!shaderCode || shaderCode.trim().length === 0) {
            await message.reply('❌ Veuillez fournir du code GLSL à compiler.');
            return;
        }

        if (shaderCode.length > 10000) {
            await message.reply('❌ Le code est trop long (max 10,000 caractères).');
            return;
        }

        try {
            // Valider le shader
            const validation = await this.webglCompiler.validateShader(shaderCode);
            if (!validation.valid) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('❌ Erreur de Validation WebGL')
                    .setDescription('Le shader contient des erreurs :')
                    .addFields(
                        { name: '🚫 Erreurs', value: validation.errors.join('\n') || 'Aucune', inline: false },
                        { name: '⚠️ Avertissements', value: validation.warnings.join('\n') || 'Aucun', inline: false }
                    );
                await message.reply({ embeds: [errorEmbed] });
                return;
            }

            // Compiler le shader avec WebGL réel
            const result = await this.webglCompiler.compileShader(shaderCode);
            
            if (result.success) {
                // Sauvegarder en base de données
                const shaderId = await this.database.saveShader({
                    code: shaderCode,
                    userId: message.author.id,
                    userName: message.author.username,
                    imagePath: result.frameDirectory
                });

                // Créer l'embed de succès
                const successEmbed = new EmbedBuilder()
                    .setColor('#4ECDC4')
                    .setTitle('✅ Shader WebGL Compilé avec Succès !')
                    .setDescription(`Shader compilé et sauvegardé avec l'ID: **${shaderId}**`)
                    .addFields(
                        { name: '👤 Auteur', value: message.author.username, inline: true },
                        { name: '📏 Taille', value: `${shaderCode.length} caractères`, inline: true },
                        { name: '🎬 Animation', value: `${result.metadata.frames} frames`, inline: true },
                        { name: '⏱️ Durée', value: `${result.metadata.duration}s`, inline: true },
                        { name: '🎯 Frame Rate', value: `${result.metadata.frameRate} FPS`, inline: true },
                        { name: '🖼️ Résolution', value: result.metadata.resolution, inline: true },
                        { name: '📝 Code', value: '```glsl\n' + shaderCode.substring(0, 500) + (shaderCode.length > 500 ? '...' : '') + '\n```', inline: false }
                    )
                    .setFooter({ text: 'Utilisez !shader gallery pour voir tous vos shaders WebGL' });

                await message.reply({ embeds: [successEmbed] });

            } else {
                await message.reply('❌ Erreur lors de la compilation WebGL du shader.');
            }

        } catch (error) {
            console.error('Erreur compilation WebGL shader:', error);
            await message.reply('❌ Une erreur est survenue lors de la compilation WebGL.');
        }
    }

    async animateShader(message, shaderCode) {
        if (!shaderCode || shaderCode.trim().length === 0) {
            await message.reply('❌ Veuillez fournir du code GLSL à animer.');
            return;
        }

        await message.reply('🎬 **Animation en cours...** Création d\'une animation WebGL de 3 secondes...');
        
        // Utiliser la même logique que compileShader mais avec focus sur l'animation
        await this.compileShader(message, shaderCode);
    }

    async showGallery(message) {
        try {
            const popularShaders = await this.database.getPopularShaders(5);
            
            if (popularShaders.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🖼️ Galerie des Shaders WebGL')
                    .setDescription('Aucun shader n\'a encore été créé !\nSoyez le premier avec `!shader <code>` !');
                
                await message.reply({ embeds: [embed] });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#4ECDC4')
                .setTitle('🖼️ Galerie des Shaders WebGL Populaires')
                .setDescription(`Affichage des ${popularShaders.length} shaders les plus populaires`);

            for (let i = 0; i < popularShaders.length; i++) {
                const shader = popularShaders[i];
                const preview = shader.code.substring(0, 100) + (shader.code.length > 100 ? '...' : '');
                
                embed.addFields({
                    name: `#${i + 1} - ${shader.user_name}`,
                    value: `**ID:** ${shader.id} | **Likes:** ${shader.likes} | **Vues:** ${shader.views}\n\`\`\`glsl\n${preview}\n\`\`\``,
                    inline: false
                });
            }

            embed.setFooter({ text: 'Utilisez !shader search <query> pour rechercher des shaders spécifiques' });
            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur affichage galerie:', error);
            await message.reply('❌ Erreur lors de l\'affichage de la galerie.');
        }
    }

    async searchShaders(message, query) {
        if (!query || query.trim().length === 0) {
            await message.reply('❌ Veuillez fournir un terme de recherche.');
            return;
        }

        try {
            const results = await this.database.searchShaders(query, 5);
            
            if (results.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🔍 Résultats de Recherche WebGL')
                    .setDescription(`Aucun shader trouvé pour "${query}"`);
                
                await message.reply({ embeds: [embed] });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#4ECDC4')
                .setTitle(`🔍 Résultats pour "${query}"`)
                .setDescription(`${results.length} shader(s) trouvé(s)`);

            for (let i = 0; i < results.length; i++) {
                const shader = results[i];
                const preview = shader.code.substring(0, 150) + (shader.code.length > 150 ? '...' : '');
                
                embed.addFields({
                    name: `${shader.user_name} (ID: ${shader.id})`,
                    value: `**Likes:** ${shader.likes} | **Vues:** ${shader.views}\n\`\`\`glsl\n${preview}\n\`\`\``,
                    inline: false
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur recherche shaders:', error);
            await message.reply('❌ Erreur lors de la recherche.');
        }
    }

    async showStats(message) {
        try {
            const stats = await this.database.getStats();
            
            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('📊 Statistiques du Bot WebGL')
                .addFields(
                    { name: '🎨 Total Shaders', value: stats.totalShaders.toString(), inline: true },
                    { name: '👥 Total Utilisateurs', value: stats.totalUsers.toString(), inline: true },
                    { name: '❤️ Total Likes', value: stats.totalLikes.toString(), inline: true },
                    { name: '🎬 Frame Rate', value: '30 FPS', inline: true },
                    { name: '⏱️ Durée Animation', value: '3 secondes', inline: true },
                    { name: '🖼️ Résolution Canvas', value: '800x600', inline: true },
                { name: '📁 Dossier Sortie', value: './output', inline: true },
                { name: '🗄️ Base de Données', value: 'SQLite', inline: true },
                { name: '🚀 Compilateur', value: 'WebGL Réel + Puppeteer', inline: true }
            )
                .setFooter({ text: 'Statistiques mises à jour en temps réel - Bot WebGL avancé' });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur affichage stats:', error);
            await message.reply('❌ Erreur lors de l\'affichage des statistiques.');
        }
    }

    async cleanup() {
        try {
            if (this.webglCompiler) {
                await this.webglCompiler.close();
            }
            if (this.database) {
                await this.database.close();
            }
            if (this.client) {
                this.client.destroy();
            }
            console.log('✅ Nettoyage WebGL terminé');
        } catch (error) {
            console.error('Erreur lors du nettoyage:', error);
        }
    }
}

// EXPORTER SEULEMENT LA CLASSE - PAS D'INSTANCIATION
module.exports = { RealWebGLBot };
