const { SlashCommandBuilder } = require('discord.js');
const { ErrorHandler } = require('../src/utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shader-code')
        .setDescription('Show the source code of a preset shader')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Preset shader name')
                .setRequired(true)
                .setAutocomplete(true)),
    
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        
        if (focusedOption.name === 'name') {
            // Liste des shaders prédéfinis
            const shaders = [
                'rainbow', 'spiral', 'plasma', 'tunnel', 'starfield', 'gradient', 'sine', 'waves', 'spiral2', 'rings',
                'water', 'fire', 'smoke', 'snow', 'clouds', 'lava', 'lavaflow', 'aurora', 'rain', 'thunder', 'wind', 'fog', 'mist', 'haze', 'storm',
                'mandelbrot', 'mandelbulb', 'julia', 'fractal', 'tree',
                'raymarching', 'metaballs', 'crystal', 'bubbles',
                'voronoi', 'hexagon', 'grid', 'geometric', 'maze', 'moire', 'dots', 'lines', 'checkerboard', 'stripes', 'zebra', 'diamond', 'triangle', 'circle', 'square', 'star', 'heart', 'flower',
                'galaxy', 'spiralgalaxy', 'nebula', 'cosmic', 'sun', 'moon', 'planet', 'comet', 'asteroid', 'nebula2', 'supernova', 'blackhole', 'wormhole',
                'noise', 'kaleidoscope', 'ripple', 'particles', 'matrix', 'electric', 'dna', 'circuit', 'lightrays', 'turbulence', 'morphing', 'swirl', 'energy', 'lens', 'kaleidoscope2', 'distortion', 'mirror', 'reflection', 'glitch', 'pixelate', 'chromatic', 'bloom', 'vignette', 'scanlines', 'noise2', 'cells', 'warp', 'radial', 'lightning2', 'tornado', 'cyclone'
            ];
            
            const filtered = shaders
                .filter(shader => shader.toLowerCase().startsWith(focusedOption.value.toLowerCase()))
                .slice(0, 25);
            
            await interaction.respond(
                filtered.map(shader => ({ name: shader, value: shader }))
            );
        }
    },
    
    async execute(interaction, { bot }) {
        await interaction.deferReply();
        
        try {
            const shaderName = interaction.options.getString('name').toLowerCase();
            
            // Obtenir le code du shader
            const shaderCode = bot.getShaderCodeByName(shaderName);
            
            if (!shaderCode) {
                await interaction.editReply({
                    content: `❌ Shader \`${shaderName}\` not found.\n\n💡 Use \`/shader-preset\` to see available presets.`
                });
                return;
            }
            
            // Discord limits messages to 2000 characters, so we need to handle long codes
            const maxLength = 1900; // Leave margin for formatting
            
            if (shaderCode.length <= maxLength) {
                await interaction.editReply({
                    content: `📝 **Shader \`${shaderName}\` code:**\n\`\`\`glsl\n${shaderCode}\n\`\`\``
                });
            } else {
                // If code is too long, split into multiple messages
                const chunks = [];
                let currentChunk = '';
                const lines = shaderCode.split('\n');
                
                for (const line of lines) {
                    if ((currentChunk + line + '\n').length > maxLength && currentChunk.length > 0) {
                        chunks.push(currentChunk);
                        currentChunk = line + '\n';
                    } else {
                        currentChunk += line + '\n';
                    }
                }
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk);
                }
                
                // Send first message
                await interaction.editReply({
                    content: `📝 **Shader \`${shaderName}\` code (${chunks.length} part${chunks.length > 1 ? 's' : ''}):**\n\`\`\`glsl\n${chunks[0]}\`\`\``
                });
                
                // Send remaining parts
                for (let i = 1; i < chunks.length; i++) {
                    await interaction.followUp({
                        content: `\`\`\`glsl\n${chunks[i]}\`\`\``
                    });
                }
            }
            
        } catch (error) {
            await ErrorHandler.handle(interaction, error, {
                command: 'shader-code',
                shaderName: interaction.options.getString('name')
            });
        }
    },
};

