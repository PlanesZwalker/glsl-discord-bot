const { SlashCommandBuilder } = require('discord.js');
const { ErrorHandler } = require('../src/utils/errorHandler');
const { getRateLimiter } = require('../src/utils/rateLimiter');
const { CustomEmbedBuilder } = require('../src/utils/embedBuilder');
const { ShaderValidator } = require('../src/utils/shaderValidator');

// Liste de tous les shaders prédéfinis (noms uniques, sans doublons)
const PRESET_SHADERS = [
    'rainbow', 'spiral', 'plasma', 'tunnel', 'starfield', 'gradient', 'sine', 'waves', 'spiral2', 'rings',
    'water', 'fire', 'smoke', 'snow', 'clouds', 'lava', 'lavaflow', 'aurora', 'rain', 'thunder', 'wind', 'fog', 'mist', 'haze', 'storm', 'cyclone', 'tornado',
    'mandelbrot', 'mandelbulb', 'mandelbulb2', 'mandelbulb3', 'mandelbulb4', 'julia', 'fractal', 'tree',
    'raymarching', 'metaballs', 'crystal', 'bubbles',
    'voronoi', 'hexagon', 'grid', 'geometric', 'maze', 'moire', 'dots', 'lines', 'checkerboard', 'stripes', 'zebra', 'diamond', 'triangle', 'circle', 'square', 'star', 'heart', 'flower',
    'galaxy', 'spiralgalaxy', 'nebula', 'cosmic', 'sun', 'moon', 'planet', 'comet', 'asteroid', 'nebula2', 'supernova', 'blackhole', 'wormhole',
    'noise', 'kaleidoscope', 'ripple', 'particles', 'matrix', 'electric', 'dna', 'circuit', 'lightrays', 'turbulence', 'morphing', 'swirl', 'energy', 'lens', 'kaleidoscope2', 'distortion', 'mirror', 'reflection', 'glitch', 'pixelate', 'chromatic', 'bloom', 'vignette', 'scanlines', 'noise2', 'cells', 'warp', 'radial', 'lightning2'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shader-preset')
        .setDescription('Compile a preset GLSL shader (generates an animated GIF)')
        .addStringOption(option =>
            option.setName('preset')
                .setDescription('Preset shader name')
                .setRequired(true)
                .setAutocomplete(true)),
    
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        
        if (focusedOption.name === 'preset') {
            const filtered = PRESET_SHADERS
                .filter(shader => shader.toLowerCase().startsWith(focusedOption.value.toLowerCase()))
                .slice(0, 25);
            
            await interaction.respond(
                filtered.map(shader => ({ name: shader, value: shader }))
            );
        }
    },
    
    async execute(interaction, { compiler, database, bot }) {
        try {
            await interaction.deferReply();
            // Rate limiting
            const rateLimiter = getRateLimiter();
            const limitCheck = rateLimiter.checkLimit(interaction.user.id, 'shader-preset');
            if (!limitCheck.allowed) {
                return await interaction.editReply({
                    content: `⏱️ ${limitCheck.reason}\nRéessayez dans ${limitCheck.retryAfter}s.`
                });
            }

            const presetName = interaction.options.getString('preset');
            
            // Get shader code from bot instance
            const shaderCode = bot.getShaderCodeByName(presetName);
            
            if (!shaderCode) {
                const embed = CustomEmbedBuilder.error(
                    'Shader non trouvé',
                    `Le shader preset \`${presetName}\` n'existe pas.\n\n💡 Utilisez \`/shader-code\` pour voir les presets disponibles.`
                );
                return await interaction.editReply({ embeds: [embed] });
            }

            // Validate the shader avec le validateur amélioré
            const validation = ShaderValidator.validate(shaderCode, 'glsl');
            if (!validation.valid) {
                const embed = CustomEmbedBuilder.error(
                    'Erreur de validation',
                    validation.errors.join('\n')
                );
                return await interaction.editReply({ embeds: [embed] });
            }

            // Compile the shader with preset name and user ID for metrics
            const result = await compiler.compileShader(shaderCode, {
                presetName: presetName,
                userId: interaction.user.id
            });

            if (!result.success) {
                await interaction.editReply({
                    content: `❌ Compilation error: ${result.error}`
                });
                return;
            }

            // Save to database
            const shaderId = await database.saveShader({
                code: shaderCode,
                userId: interaction.user.id,
                userName: interaction.user.username,
                imagePath: result.frameDirectory,
                gifPath: result.gifPath
            });

            await database.updateUserStats(interaction.user.id, interaction.user.username);

            // Prepare response with animation
            const { AttachmentBuilder } = require('discord.js');
            const fs = require('fs');
            const path = require('path');
            let files = [];
            
            console.log(`🔍 Résultat compilation:`, {
                success: result.success,
                gifPath: result.gifPath,
                frameDirectory: result.frameDirectory,
                cached: result.metadata?.cached
            });
            
            // Priority: send animated GIF if available, otherwise first frame
            if (result.gifPath) {
                // Résoudre le chemin absolu pour s'assurer qu'il est correct
                const gifPathResolved = path.isAbsolute(result.gifPath) 
                    ? result.gifPath 
                    : path.resolve(process.cwd(), result.gifPath);
                
                console.log(`🔍 Vérification GIF: ${gifPathResolved} (existe: ${fs.existsSync(gifPathResolved)})`);
                console.log(`🔍 Chemin original: ${result.gifPath}`);
                console.log(`🔍 CWD: ${process.cwd()}`);
                
                if (fs.existsSync(gifPathResolved)) {
                    console.log(`✅ Attachement du GIF: ${gifPathResolved}`);
                    files.push(new AttachmentBuilder(gifPathResolved, { name: 'animation.gif' }));
                } else {
                    console.warn(`⚠️ GIF non trouvé à ${gifPathResolved}, tentative avec chemin original: ${result.gifPath}`);
                    // Essayer avec le chemin original
                    if (fs.existsSync(result.gifPath)) {
                        console.log(`✅ Attachement du GIF avec chemin original: ${result.gifPath}`);
                        files.push(new AttachmentBuilder(result.gifPath, { name: 'animation.gif' }));
                    } else {
                        console.error(`❌ GIF introuvable aux deux chemins: ${gifPathResolved} et ${result.gifPath}`);
                    }
                }
            } else {
                console.warn(`⚠️ result.gifPath est null/undefined`);
            }
            
            // Fallback: utiliser la première frame si pas de GIF
            if (files.length === 0 && result.frameDirectory && fs.existsSync(result.frameDirectory)) {
                console.log(`📸 Tentative fallback avec frameDirectory: ${result.frameDirectory}`);
                const frameFiles = fs.readdirSync(result.frameDirectory)
                    .filter(f => f.endsWith('.png'))
                    .sort();
                
                if (frameFiles.length > 0) {
                    const firstFramePath = path.join(result.frameDirectory, frameFiles[0]);
                    if (fs.existsSync(firstFramePath)) {
                        console.log(`📸 Utilisation de la première frame comme fallback: ${firstFramePath}`);
                        files.push(new AttachmentBuilder(firstFramePath, { name: 'shader.png' }));
                    }
                }
            }
            
            console.log(`📎 Fichiers à attacher: ${files.length} fichier(s)`);

            // Respond with success and animation
            const embed = CustomEmbedBuilder.shaderCompiled({
                id: shaderId,
                username: interaction.user.username,
                duration: result.metadata?.duration,
                frames: result.metadata?.frames,
                resolution: result.metadata?.resolution,
                presetName: presetName,
                cached: result.metadata?.cached,
                gifUrl: result.gifPath ? `attachment://animation.gif` : null
            });
            
            await interaction.editReply({
                embeds: [embed],
                files: files
            });

        } catch (error) {
            await ErrorHandler.handle(interaction, error, {
                command: 'shader-preset',
                preset: interaction.options.getString('preset')
            });
        }
    },
};

