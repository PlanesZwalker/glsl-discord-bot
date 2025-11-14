const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ErrorHandler } = require('../src/utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show bot help'),
    
    async execute(interaction) {
        try {
            console.log('📋 Command /help executed');
            await interaction.deferReply({ ephemeral: true });
            
            // Utiliser des embeds pour éviter la limite de 2000 caractères du content
            // Les embeds permettent jusqu'à 6000 caractères au total
            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle('🎨 ShaderBot - Complete Help')
                .setDescription('Professional GLSL/WGSL shader compiler for Discord')
                .addFields(
                    {
                        name: '📋 Slash Commands',
                        value: '**`/shader <code>`** - Compile a custom GLSL or WGSL shader\n' +
                               '**`/shader-preset <preset>`** - Compile one of 97 preset shaders\n' +
                               '**`/shader-generate`** - Generate shaders without coding\n' +
                               '**`/shader-code <name>`** - View preset shader source code\n' +
                               '**`/help`** - Show this help message',
                        inline: false
                    },
                    {
                        name: '🎨 `/shader <code>`',
                        value: '• Generates a 3-second animated GIF at 30 FPS\n' +
                               '• Supports textures: `texture0`, `texture1`, `texture2`, `texture3` (like Shadertoy)\n' +
                               '• Optional `name` parameter for easy search later\n' +
                               '• Example: `/shader code:"void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(1.0, 0.0, 0.0, 1.0); }"`',
                        inline: false
                    },
                    {
                        name: '🎨 `/shader-preset <preset>`',
                        value: '• Type the preset name to see autocomplete suggestions\n' +
                               '• All presets generate animated GIFs\n' +
                               '• Categories: Animated, Natural, Fractals, 3D, Geometric, Space, Visual Effects\n' +
                               '• Examples: `rainbow`, `spiral`, `plasma`, `fire`, `mandelbrot`, `galaxy`, `matrix`',
                        inline: false
                    },
                    {
                        name: '✨ `/shader-generate`',
                        value: '• **Shape:** circle, square, triangle, star, heart, hexagon, diamond, line, grid, voronoi\n' +
                               '• **Color:** red, green, blue, yellow, purple, orange, pink, cyan, white, black, rainbow, warm, cool\n' +
                               '• **Animation:** rotation, pulse, wave, zoom, translate, color_shift, twinkle, none\n' +
                               '• **Speed:** slow, normal, fast (optional)\n' +
                               '• **Size:** 1-10 (optional, default: 5)\n' +
                               '• Example: `/shader-generate shape:circle color:blue animation:rotation speed:fast size:7`',
                        inline: false
                    },
                    {
                        name: '📝 `/shader-code <name>`',
                        value: '• Learn from professional shader code\n' +
                               '• Perfect for understanding GLSL programming\n' +
                               '• Example: `/shader-code rainbow`',
                        inline: false
                    },
                    {
                        name: '🎨 Preset Shader Categories',
                        value: '**Animated:** rainbow, spiral, plasma, tunnel, starfield, gradient, sine, waves, rings\n' +
                               '**Natural:** water, fire, smoke, snow, clouds, lava, aurora, rain, thunder, storm\n' +
                               '**Fractals:** mandelbrot, mandelbulb, julia, fractal, tree\n' +
                               '**3D:** raymarching, metaballs, crystal, bubbles\n' +
                               '**Geometric:** voronoi, hexagon, grid, maze, dots, lines, checkerboard, circle, square, star, heart\n' +
                               '**Space:** galaxy, nebula, cosmic, sun, moon, planet, comet, blackhole, wormhole\n' +
                               '**Visual:** noise, kaleidoscope, particles, matrix, electric, dna, glitch, bloom, scanlines',
                        inline: false
                    },
                    {
                        name: '💡 Tips',
                        value: '• All commands generate 3-second animated GIFs at 30 FPS\n' +
                               '• Use autocomplete (Tab) to see available options\n' +
                               '• Shaders are saved to your dashboard for easy access\n' +
                               '• Visit the web dashboard to view all your compiled shaders',
                        inline: false
                    }
                )
                .setFooter({ text: '🌐 Web Dashboard: https://glsl-discord-bot.vercel.app' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            await ErrorHandler.handle(interaction, error, {
                command: 'help'
            });
        }
    },
};

