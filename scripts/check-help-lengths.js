const fields = [
    {
        name: '📋 Slash Commands',
        value: '**`/shader <code>`** - Compile a custom GLSL or WGSL shader\n' +
               '**`/shader-preset <preset>`** - Compile one of 97 preset shaders\n' +
               '**`/shader-generate`** - Generate shaders without coding\n' +
               '**`/shader-code <name>`** - View preset shader source code\n' +
               '**`/help`** - Show this help message'
    },
    {
        name: '🎨 `/shader <code>`',
        value: '• Generates a 3-second animated GIF at 30 FPS\n' +
               '• Supports textures: `texture0`, `texture1`, `texture2`, `texture3` (like Shadertoy)\n' +
               '• Optional `name` parameter for easy search later\n' +
               '• Example: `/shader code:"void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(1.0, 0.0, 0.0, 1.0); }"`'
    },
    {
        name: '🎨 `/shader-preset <preset>`',
        value: '• Type the preset name to see autocomplete suggestions\n' +
               '• All presets generate animated GIFs\n' +
               '• Categories: Animated, Natural, Fractals, 3D, Geometric, Space, Visual Effects\n' +
               '• Examples: `rainbow`, `spiral`, `plasma`, `fire`, `mandelbrot`, `galaxy`, `matrix`'
    },
    {
        name: '✨ `/shader-generate`',
        value: '• **Shape:** circle, square, triangle, star, heart, hexagon, diamond, line, grid, voronoi\n' +
               '• **Color:** red, green, blue, yellow, purple, orange, pink, cyan, white, black, rainbow, warm, cool\n' +
               '• **Animation:** rotation, pulse, wave, zoom, translate, color_shift, twinkle, none\n' +
               '• **Speed:** slow, normal, fast (optional)\n' +
               '• **Size:** 1-10 (optional, default: 5)\n' +
               '• Example: `/shader-generate shape:circle color:blue animation:rotation speed:fast size:7`'
    },
    {
        name: '📝 `/shader-code <name>`',
        value: '• Learn from professional shader code\n' +
               '• Perfect for understanding GLSL programming\n' +
               '• Example: `/shader-code rainbow`'
    },
    {
        name: '🎨 Preset Shader Categories',
        value: '**Animated:** rainbow, spiral, plasma, tunnel, starfield, gradient, sine, waves, rings\n' +
               '**Natural:** water, fire, smoke, snow, clouds, lava, aurora, rain, thunder, storm\n' +
               '**Fractals:** mandelbrot, mandelbulb, julia, fractal, tree\n' +
               '**3D:** raymarching, metaballs, crystal, bubbles\n' +
               '**Geometric:** voronoi, hexagon, grid, maze, dots, lines, checkerboard, circle, square, star, heart\n' +
               '**Space:** galaxy, nebula, cosmic, sun, moon, planet, comet, blackhole, wormhole\n' +
               '**Visual:** noise, kaleidoscope, particles, matrix, electric, dna, glitch, bloom, scanlines'
    },
    {
        name: '💡 Tips',
        value: '• All commands generate 3-second animated GIFs at 30 FPS\n' +
               '• Use autocomplete (Tab) to see available options\n' +
               '• Shaders are saved to your dashboard for easy access\n' +
               '• Visit the web dashboard to view all your compiled shaders'
    }
];

const title = '🎨 ShaderBot - Complete Help';
const description = 'Professional GLSL/WGSL shader compiler for Discord';
const footer = '🌐 Web Dashboard: https://glsl-discord-bot.vercel.app';

console.log('=== Discord Embed Limits Check ===\n');
console.log(`Title: ${title.length} chars (max 256) ${title.length > 256 ? '❌ TOO LONG!' : '✅'}`);
console.log(`Description: ${description.length} chars (max 4096) ${description.length > 4096 ? '❌ TOO LONG!' : '✅'}`);
console.log(`Footer: ${footer.length} chars (max 2048) ${footer.length > 2048 ? '❌ TOO LONG!' : '✅'}\n`);

fields.forEach((f, i) => {
    const nameLength = f.name.length;
    const valueLength = f.value.length;
    const nameOk = nameLength <= 256;
    const valueOk = valueLength <= 1024;
    console.log(`Field ${i + 1}: ${f.name}`);
    console.log(`  Name: ${nameLength} chars (max 256) ${nameOk ? '✅' : '❌ TOO LONG!'}`);
    console.log(`  Value: ${valueLength} chars (max 1024) ${valueOk ? '✅' : '❌ TOO LONG!'}`);
    if (!nameOk || !valueOk) {
        console.log(`  ⚠️  PROBLEM DETECTED!`);
    }
    console.log('');
});

const totalFieldValues = fields.reduce((sum, f) => sum + f.value.length, 0);
const totalEmbed = title.length + description.length + footer.length + totalFieldValues + fields.reduce((sum, f) => sum + f.name.length, 0);

console.log(`Total field values: ${totalFieldValues} chars`);
console.log(`Total embed size: ${totalEmbed} chars (max 6000) ${totalEmbed > 6000 ? '❌ TOO LONG!' : '✅'}`);

