const { SlashCommandBuilder } = require('discord.js');
const { ErrorHandler } = require('../src/utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show bot help'),
    
    async execute(interaction) {
        try {
            console.log('📋 Command /help executed');
            await interaction.deferReply({ ephemeral: true });
            
            const helpMessage = `
🎨 **ShaderBot - Complete Help**

**📋 Slash Commands:**

**\`/shader <code>\`** - Compile a custom GLSL or WGSL shader
• Generates a 3-second animated GIF at 30 FPS
• Supports textures: \`texture0\`, \`texture1\`, \`texture2\`, \`texture3\` (like Shadertoy)
• Optional \`name\` parameter for easy search later
• Example: \`/shader code:"void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(1.0, 0.0, 0.0, 1.0); }"\`

**\`/shader-preset <preset>\`** - Compile one of 97 preset shaders
• Type the preset name to see autocomplete suggestions
• All presets generate animated GIFs
• Categories: Animated, Natural, Fractals, 3D, Geometric, Space, Visual Effects
• Examples: \`rainbow\`, \`spiral\`, \`plasma\`, \`fire\`, \`mandelbrot\`, \`galaxy\`, \`matrix\`

**\`/shader-generate\`** - Generate shaders without coding
• **Shape:** circle, square, triangle, star, heart, hexagon, diamond, line, grid, voronoi
• **Color:** red, green, blue, yellow, purple, orange, pink, cyan, white, black, rainbow, warm, cool
• **Animation:** rotation, pulse, wave, zoom, translate, color_shift, twinkle, none
• **Speed:** slow, normal, fast (optional)
• **Size:** 1-10 (optional, default: 5)
• Example: \`/shader-generate shape:circle color:blue animation:rotation speed:fast size:7\`

**\`/shader-code <name>\`** - View preset shader source code
• Learn from professional shader code
• Perfect for understanding GLSL programming
• Example: \`/shader-code rainbow\`

**\`/help\`** - Show this help message

**🎨 Preset Shader Categories:**

**Animated Effects:** rainbow, spiral, plasma, tunnel, starfield, gradient, sine, waves, rings
**Natural Phenomena:** water, fire, smoke, snow, clouds, lava, aurora, rain, thunder, storm
**Fractals:** mandelbrot, mandelbulb, julia, fractal, tree
**3D Effects:** raymarching, metaballs, crystal, bubbles
**Geometric Patterns:** voronoi, hexagon, grid, maze, dots, lines, checkerboard, circle, square, star, heart
**Space Effects:** galaxy, nebula, cosmic, sun, moon, planet, comet, blackhole, wormhole
**Visual Effects:** noise, kaleidoscope, particles, matrix, electric, dna, glitch, bloom, scanlines

**💡 Tips:**
• All commands generate 3-second animated GIFs at 30 FPS
• Use autocomplete (Tab) to see available options
• Shaders are saved to your dashboard for easy access
• Visit the web dashboard to view all your compiled shaders

**🌐 Web Dashboard:** https://glsl-discord-bot.vercel.app
**📖 Full Documentation:** Check the project README
            `.trim();

            await interaction.editReply({
                content: helpMessage
            });
        } catch (error) {
            await ErrorHandler.handle(interaction, error, {
                command: 'help'
            });
        }
    },
};

