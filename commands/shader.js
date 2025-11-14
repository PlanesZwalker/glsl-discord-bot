const { SlashCommandBuilder } = require('discord.js');
const { ErrorHandler } = require('../src/utils/errorHandler');
const { getRateLimiter } = require('../src/utils/rateLimiter');
const { CustomEmbedBuilder } = require('../src/utils/embedBuilder');
const { ShaderValidator } = require('../src/utils/shaderValidator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shader')
        .setDescription('Compile a GLSL or WGSL shader (generates an animated GIF)')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('GLSL or WGSL code to compile')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('texture0')
                .setDescription('URL of texture iChannel0 (optional)'))
        .addStringOption(option =>
            option.setName('texture1')
                .setDescription('URL of texture iChannel1 (optional)'))
        .addStringOption(option =>
            option.setName('texture2')
                .setDescription('URL of texture iChannel2 (optional)'))
        .addStringOption(option =>
            option.setName('texture3')
                .setDescription('URL of texture iChannel3 (optional)'))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name for this shader (optional, for search)')),
    
    async execute(interaction, { compiler, database }) {
        await interaction.deferReply();

        try {
            // Rate limiting
            const rateLimiter = getRateLimiter();
            const limitCheck = rateLimiter.checkLimit(interaction.user.id, 'shader');
            if (!limitCheck.allowed) {
                return await interaction.editReply({
                    content: `⏱️ ${limitCheck.reason}\nRéessayez dans ${limitCheck.retryAfter}s.`
                });
            }

            const shaderCode = interaction.options.getString('code');
            
            // Validate that shader code is provided and not empty
            if (!shaderCode || shaderCode.trim().length === 0) {
                const embed = CustomEmbedBuilder.error(
                    'Code vide',
                    'Le code shader ne peut pas être vide. Veuillez fournir un code GLSL ou WGSL valide.'
                );
                return await interaction.editReply({ embeds: [embed] });
            }
            
            // Récupérer les URLs de textures optionnelles
            const textureUrls = [
                interaction.options.getString('texture0'),
                interaction.options.getString('texture1'),
                interaction.options.getString('texture2'),
                interaction.options.getString('texture3')
            ].filter(url => url !== null); // Filtrer les valeurs null

            // Validate shader avec le validateur amélioré
            const validation = ShaderValidator.validateAndSanitize(shaderCode);
            if (!validation.valid) {
                const embed = CustomEmbedBuilder.error(
                    'Erreur de validation',
                    validation.errors.join('\n')
                );
                return await interaction.editReply({ embeds: [embed] });
            }

            // Utiliser le code nettoyé si disponible
            const codeToCompile = validation.sanitized || shaderCode;

            // Compile shader with textures and user ID for metrics
            const result = await compiler.compileShader(codeToCompile, {
                textures: textureUrls.length > 0 ? textureUrls : null,
                userId: interaction.user.id
            });

            if (!result.success) {
                await interaction.editReply({
                    content: `❌ Compilation error: ${result.error}`
                });
                return;
            }

            // Get optional name
            const shaderName = interaction.options.getString('name');

            // Save to database
            const shaderId = await database.saveShader({
                code: shaderCode,
                userId: interaction.user.id,
                userName: interaction.user.username,
                imagePath: result.frameDirectory,
                gifPath: result.gifPath,
                name: shaderName || null
            });

            await database.updateUserStats(interaction.user.id, interaction.user.username);

            // Prepare response with animation
            const { AttachmentBuilder } = require('discord.js');
            const fs = require('fs');
            const path = require('path');
            let files = [];
            
            // Priority: send animated GIF if available, otherwise first frame
            if (result.gifPath) {
                // Résoudre le chemin absolu pour s'assurer qu'il est correct
                const gifPathResolved = path.isAbsolute(result.gifPath) 
                    ? result.gifPath 
                    : path.resolve(process.cwd(), result.gifPath);
                
                console.log(`🔍 Vérification GIF: ${gifPathResolved} (existe: ${fs.existsSync(gifPathResolved)})`);
                
                if (fs.existsSync(gifPathResolved)) {
                    console.log(`✅ Attachement du GIF: ${gifPathResolved}`);
                    files.push(new AttachmentBuilder(gifPathResolved, { name: 'animation.gif' }));
                } else {
                    console.warn(`⚠️ GIF non trouvé à ${gifPathResolved}, tentative avec chemin original: ${result.gifPath}`);
                    // Essayer avec le chemin original
                    if (fs.existsSync(result.gifPath)) {
                        files.push(new AttachmentBuilder(result.gifPath, { name: 'animation.gif' }));
                    }
                }
            }
            
            // Fallback: utiliser la première frame si pas de GIF
            if (files.length === 0 && result.frameDirectory && fs.existsSync(result.frameDirectory)) {
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

            // Respond with success and animation
            const embed = CustomEmbedBuilder.shaderCompiled({
                id: shaderId,
                username: interaction.user.username,
                duration: result.metadata?.duration,
                frames: result.metadata?.frames,
                resolution: result.metadata?.resolution,
                presetName: shaderName || null,
                cached: result.metadata?.cached,
                gifUrl: result.gifPath ? `attachment://animation.gif` : null
            });

            if (shaderName) {
                embed.setFooter({ text: `Utilisez /reuse ${shaderName} ou /reuse ${shaderId} pour réutiliser ce shader` });
            } else {
                embed.setFooter({ text: `Utilisez /reuse ${shaderId} pour réutiliser ce shader` });
            }
            
            await interaction.editReply({
                embeds: [embed],
                files: files
            });

        } catch (error) {
            await ErrorHandler.handle(interaction, error, {
                command: 'shader',
                shaderCode: interaction.options.getString('code')?.substring(0, 100) || 'unknown'
            });
        }
    },
};

