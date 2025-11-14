const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { ErrorHandler } = require('../src/utils/errorHandler');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shader-generate')
        .setDescription('Generate a shader via parameters (shape, color, animation)')
        .addStringOption(option =>
            option.setName('shape')
                .setDescription('Shader shape')
                .setRequired(true)
                .addChoices(
                    { name: 'Circle', value: 'circle' },
                    { name: 'Square', value: 'square' },
                    { name: 'Triangle', value: 'triangle' },
                    { name: 'Star', value: 'star' },
                    { name: 'Heart', value: 'heart' },
                    { name: 'Hexagon', value: 'hexagon' },
                    { name: 'Diamond', value: 'diamond' },
                    { name: 'Line', value: 'line' },
                    { name: 'Grid', value: 'grid' },
                    { name: 'Voronoi', value: 'voronoi' }
                ))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Main color')
                .setRequired(true)
                .addChoices(
                    { name: 'Red', value: 'red' },
                    { name: 'Green', value: 'green' },
                    { name: 'Blue', value: 'blue' },
                    { name: 'Yellow', value: 'yellow' },
                    { name: 'Purple', value: 'purple' },
                    { name: 'Orange', value: 'orange' },
                    { name: 'Pink', value: 'pink' },
                    { name: 'Cyan', value: 'cyan' },
                    { name: 'White', value: 'white' },
                    { name: 'Black', value: 'black' },
                    { name: 'Rainbow gradient', value: 'rainbow' },
                    { name: 'Warm gradient', value: 'warm' },
                    { name: 'Cool gradient', value: 'cool' }
                ))
        .addStringOption(option =>
            option.setName('animation')
                .setDescription('Animation type')
                .setRequired(true)
                .addChoices(
                    { name: 'Rotation', value: 'rotation' },
                    { name: 'Pulse', value: 'pulse' },
                    { name: 'Wave', value: 'wave' },
                    { name: 'Zoom', value: 'zoom' },
                    { name: 'Translate', value: 'translate' },
                    { name: 'Color shift', value: 'color_shift' },
                    { name: 'Twinkle', value: 'twinkle' },
                    { name: 'None', value: 'none' }
                ))
        .addStringOption(option =>
            option.setName('speed')
                .setDescription('Animation speed')
                .addChoices(
                    { name: 'Slow', value: 'slow' },
                    { name: 'Normal', value: 'normal' },
                    { name: 'Fast', value: 'fast' }
                ))
        .addIntegerOption(option =>
            option.setName('size')
                .setDescription('Shape size (1-10, default: 5)')
                .setMinValue(1)
                .setMaxValue(10)),
    
    async execute(interaction, { bot }) {
        try {
            await interaction.deferReply();
            const shape = interaction.options.getString('shape');
            const color = interaction.options.getString('color');
            const animation = interaction.options.getString('animation');
            const speed = interaction.options.getString('speed') || 'normal';
            const size = interaction.options.getInteger('size') || 5;

            // Generate GLSL code
            const shaderCode = bot.generateShaderFromParams({
                forme: shape,
                couleur: color,
                animation: animation,
                vitesse: speed,
                taille: size
            });

            if (!shaderCode) {
                await interaction.editReply({
                    content: '❌ Error generating shader. Please try again with different parameters.'
                });
                return;
            }

            // Validate shader
            const validation = await bot.compiler.validateShader(shaderCode);
            if (!validation.valid) {
                await interaction.editReply({
                    content: `❌ Validation error:\n${validation.errors.join('\n')}`
                });
                return;
            }

            // Compile shader
            const result = await bot.compiler.compileShader(shaderCode);

            if (!result.success) {
                await interaction.editReply({
                    content: `❌ Compilation error: ${result.error}`
                });
                return;
            }

            // Save to database
            const shaderId = await bot.database.saveShader({
                code: shaderCode,
                userId: interaction.user.id,
                userName: interaction.user.username,
                imagePath: result.frameDirectory,
                gifPath: result.gifPath,
                name: `Generated: ${shape} ${color} ${animation}`
            });

            await bot.database.updateUserStats(interaction.user.id, interaction.user.username);

            // Prepare response with animation
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
                console.log(`⚠️ GIF not found, using fallback frame`);
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

            const paramsText = `**Shape:** ${shape}\n**Color:** ${color}\n**Animation:** ${animation}\n**Speed:** ${speed}\n**Size:** ${size}`;

            await interaction.editReply({
                content: `✅ Shader generated successfully!\n\n${paramsText}\n\n📊 Frames: ${result.metadata.frames}\n⏱️ Duration: ${result.metadata.duration}s\n📐 Resolution: ${result.metadata.resolution}\n\n💾 ID: ${shaderId}`,
                files: files.length > 0 ? files : undefined
            });

        } catch (error) {
            await ErrorHandler.handle(interaction, error, {
                command: 'shader-generate',
                shape: interaction.options.getString('shape'),
                color: interaction.options.getString('color'),
                animation: interaction.options.getString('animation')
            });
        }
    },
};

