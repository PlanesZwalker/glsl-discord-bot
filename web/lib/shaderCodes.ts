// Fallback shader codes when BOT_API_URL is not configured
// These are the most popular shaders from the bot
export const shaderCodes: Record<string, string> = {
  tornado: `// Tornade améliorée avec particules et rotation réaliste
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
    
    // Couleur de la tornade
    vec3 tornadoCol = mix(vec3(0.4, 0.4, 0.45), vec3(0.6, 0.6, 0.65), tornado);
    col = mix(col, tornadoCol, tornado * 0.8);
    
    // Éclairs occasionnels
    float lightning = step(0.98, random(vec2(floor(t * 0.5), 0.0)));
    col += vec3(1.0, 1.0, 0.9) * lightning * smoothstep(0.3, 0.0, abs(uv.x)) * 0.3;
    
    fragColor = vec4(col, 1.0);
}`,
  
  rainbow: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    vec2 center = vec2(0.5);
    vec2 p = uv - center;
    float angle = atan(p.y, p.x) + t;
    float radius = length(p);
    
    float hue = angle / 6.28318 + radius * 2.0;
    vec3 color = vec3(
        sin(hue * 6.28318),
        sin(hue * 6.28318 + 2.094),
        sin(hue * 6.28318 + 4.189)
    ) * 0.5 + 0.5;
    
    fragColor = vec4(color, 1.0);
}`,

  plasma: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    float c = sin(uv.x * 10.0 + t) + 
              sin(uv.y * 10.0 + t) + 
              sin((uv.x + uv.y) * 10.0 + t);
    c = c / 3.0;
    
    vec3 color = vec3(
        sin(c * 3.14159),
        sin(c * 3.14159 + 2.094),
        sin(c * 3.14159 + 4.189)
    ) * 0.5 + 0.5;
    
    fragColor = vec4(color, 1.0);
}`,

  mandelbrot: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    uv *= 2.0;
    uv -= vec2(0.5, 0.0);
    
    vec2 c = uv;
    vec2 z = vec2(0.0);
    float iterations = 0.0;
    float maxIter = 100.0;
    
    for(float i = 0.0; i < maxIter; i++) {
        if(length(z) > 2.0) break;
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
        iterations++;
    }
    
    float color = iterations / maxIter;
    color = sqrt(color);
    
    vec3 col = vec3(
        sin(color * 3.14159),
        sin(color * 3.14159 + 2.094),
        sin(color * 3.14159 + 4.189)
    ) * 0.5 + 0.5;
    
    fragColor = vec4(col, 1.0);
}`,

  fire: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime;
    
    uv.y = 1.0 - uv.y; // Flip for fire at bottom
    
    vec3 col = vec3(0.0);
    
    // Multiple noise layers for fire effect
    float noise1 = sin(uv.x * 10.0 + t * 2.0) * sin(uv.y * 20.0 - t * 3.0);
    float noise2 = sin(uv.x * 5.0 + t) * sin(uv.y * 10.0 - t * 2.0);
    float noise3 = sin((uv.x + uv.y) * 15.0 + t * 1.5);
    
    float fire = (noise1 + noise2 + noise3) / 3.0;
    fire = smoothstep(0.3, 1.0, fire + uv.y * 0.5);
    
    // Fire colors
    col.r = fire;
    col.g = fire * 0.6;
    col.b = fire * 0.1;
    
    // Add sparks
    float sparks = step(0.95, fract(sin(uv.x * 100.0 + t) * 43758.5453));
    col += vec3(1.0, 0.8, 0.3) * sparks * 0.3;
    
    fragColor = vec4(col, 1.0);
}`,

  galaxy: `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float t = iTime;
    
    vec2 center = vec2(0.0, 0.0);
    float angle = atan(uv.y - center.y, uv.x - center.x);
    float radius = length(uv - center);
    
    // Spiral arms
    float spiral = angle + log(radius + 0.1) * 2.0 - t * 0.1;
    float arms = sin(spiral * 3.0) * 0.5 + 0.5;
    arms *= smoothstep(0.8, 0.0, radius);
    arms *= smoothstep(0.0, 0.3, radius);
    
    // Stars
    float stars = step(0.98, fract(sin(uv.x * 100.0 + uv.y * 100.0) * 43758.5453));
    
    // Center glow
    float centerGlow = smoothstep(0.3, 0.0, radius);
    
    vec3 col = vec3(0.1, 0.1, 0.2);
    col += vec3(0.5, 0.4, 0.6) * arms;
    col += vec3(1.0) * stars;
    col += vec3(0.8, 0.7, 1.0) * centerGlow * 0.5;
    
    fragColor = vec4(col, 1.0);
}`,

  raymarching: `float sdSphere(vec3 p, float radius) {
    return length(p) - radius;
}

float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = sdSphere(p, 1.0);
        if(d < 0.001) return t;
        t += d;
        if(t > 100.0) return -1.0;
    }
    return -1.0;
}

vec3 calcNormal(vec3 p) {
    float eps = 0.001;
    return normalize(vec3(
        sdSphere(p + vec3(eps, 0, 0)) - sdSphere(p - vec3(eps, 0, 0)),
        sdSphere(p + vec3(0, eps, 0)) - sdSphere(p - vec3(0, eps, 0)),
        sdSphere(p + vec3(0, 0, eps)) - sdSphere(p - vec3(0, 0, eps))
    ));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec3 ro = vec3(0.0, 0.0, -3.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    
    float t = raymarch(ro, rd);
    if(t < 0.0) {
        fragColor = vec4(0.0);
        return;
    }
    
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    vec3 light = normalize(vec3(2.0, 3.0, -2.0));
    
    float diff = max(dot(n, light), 0.0);
    vec3 col = vec3(0.2, 0.4, 0.8) * (0.2 + 0.8 * diff);
    
    fragColor = vec4(col, 1.0);
}`,
}

