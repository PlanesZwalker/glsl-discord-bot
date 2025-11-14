# 🎨 Guide Professionnel Complet : Codage de Shaders GLSL

## Table des Matières

1. [Introduction](#introduction)
2. [Structure de Base](#structure-de-base)
3. [Variables Uniformes](#variables-uniformes)
4. [Concepts Fondamentaux](#concepts-fondamentaux)
5. [Techniques de Base](#techniques-de-base)
6. [Techniques Avancées](#techniques-avancées)
7. [Optimisations et Performance](#optimisations-et-performance)
8. [Exemples Pratiques](#exemples-pratiques)
9. [Intégration avec ShaderBot](#intégration-avec-shaderbot)
10. [Ressources et Références](#ressources-et-références)

---

## Introduction

### Qu'est-ce qu'un Shader ?

Un **shader** est un programme qui s'exécute sur le GPU (Graphics Processing Unit) pour calculer la couleur de chaque pixel à l'écran. Contrairement aux programmes CPU traditionnels qui s'exécutent séquentiellement, les shaders s'exécutent en parallèle sur des milliers de pixels simultanément.

### Types de Shaders

1. **Vertex Shader** : Transforme les positions des sommets (vertices) dans l'espace 3D
2. **Fragment Shader** (Pixel Shader) : Calcule la couleur finale de chaque pixel
3. **Compute Shader** : Shaders génériques pour calculs parallèles

Dans ce guide, nous nous concentrons sur les **Fragment Shaders GLSL** utilisés par ShaderBot.

### Pourquoi les Shaders ?

- ⚡ **Performance** : Calculs parallèles massifs sur GPU
- 🎨 **Créativité** : Création d'effets visuels complexes
- 🔄 **Temps Réel** : Animations fluides à 60+ FPS
- 🌐 **Portabilité** : Fonctionne sur WebGL, OpenGL, Vulkan, etc.

---

## Structure de Base

### Template Minimal

```glsl
precision mediump float;

// Variables uniformes (passées depuis JavaScript)
uniform float iTime;           // Temps écoulé en secondes
uniform vec2 iResolution;      // Résolution du canvas (width, height)
uniform vec2 iMouse;           // Position de la souris (0.0 à 1.0)

// Textures optionnelles (comme Shadertoy)
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;

// Fonction principale (comme Shadertoy)
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normaliser les coordonnées (0.0 à 1.0)
    vec2 uv = fragCoord / iResolution.xy;
    
    // Calculer la couleur du pixel
    vec3 color = vec3(uv.x, uv.y, 0.5);
    
    // Sortie finale
    fragColor = vec4(color, 1.0);
}

// Point d'entrée (requis par ShaderBot)
void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

### Composants Essentiels

1. **Precision** : `precision mediump float;` (requis pour WebGL)
2. **Uniforms** : Variables constantes pour tous les pixels
3. **mainImage()** : Fonction principale (convention Shadertoy)
4. **main()** : Point d'entrée WebGL standard

---

## Variables Uniformes

### Variables Disponibles dans ShaderBot

| Variable | Type | Description | Exemple |
|----------|------|-------------|---------|
| `iTime` | `float` | Temps écoulé en secondes (pour animations) | `sin(iTime)` |
| `iResolution` | `vec2` | Résolution (width, height) | `iResolution.x / iResolution.y` |
| `iMouse` | `vec2` | Position souris normalisée (0.0-1.0) | `distance(uv, iMouse)` |
| `iChannel0-3` | `sampler2D` | Textures (optionnelles) | `texture2D(iChannel0, uv)` |

### Utilisation Pratique

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    // Utiliser le temps pour animer
    float t = iTime;
    
    // Utiliser la résolution pour maintenir les proportions
    float aspect = iResolution.x / iResolution.y;
    vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
    
    // Utiliser la souris pour l'interactivité
    float dist = length(centered - iMouse);
    
    vec3 color = vec3(sin(t + dist * 5.0));
    fragColor = vec4(color, 1.0);
}
```

---

## Concepts Fondamentaux

### 1. Système de Coordonnées

```glsl
vec2 uv = fragCoord / iResolution.xy;
// uv.x : 0.0 (gauche) → 1.0 (droite)
// uv.y : 0.0 (bas) → 1.0 (haut)
```

**Coordonnées Centrées** :
```glsl
vec2 uv = (fragCoord / iResolution.xy) * 2.0 - 1.0;
// uv.x : -1.0 (gauche) → 1.0 (droite)
// uv.y : -1.0 (bas) → 1.0 (haut)
```

**Aspect Ratio Correct** :
```glsl
float aspect = iResolution.x / iResolution.y;
vec2 uv = (fragCoord / iResolution.xy - 0.5) * vec2(aspect, 1.0) * 2.0;
```

### 2. Types de Données

| Type | Description | Exemple |
|------|-------------|---------|
| `float` | Nombre décimal | `float x = 3.14;` |
| `vec2` | Vecteur 2D | `vec2 pos = vec2(1.0, 2.0);` |
| `vec3` | Vecteur 3D (RGB) | `vec3 color = vec3(1.0, 0.0, 0.0);` |
| `vec4` | Vecteur 4D (RGBA) | `vec4 color = vec4(1.0, 0.0, 0.0, 1.0);` |
| `mat2` | Matrice 2x2 | `mat2 rotation = mat2(cos(a), -sin(a), sin(a), cos(a));` |
| `sampler2D` | Texture 2D | `uniform sampler2D tex;` |

### 3. Opérations Vectorielles

```glsl
vec2 a = vec2(1.0, 2.0);
vec2 b = vec2(3.0, 4.0);

vec2 sum = a + b;        // (4.0, 6.0)
vec2 diff = a - b;       // (-2.0, -2.0)
vec2 mult = a * 2.0;    // (2.0, 4.0)
float dot = dot(a, b);  // 11.0 (produit scalaire)
float len = length(a);  // 2.236 (longueur)
vec2 norm = normalize(a); // Normalisé
```

### 4. Fonctions Mathématiques Essentielles

```glsl
// Trigonométrie
sin(x), cos(x), tan(x)
asin(x), acos(x), atan(x), atan2(y, x)

// Exponentielles
exp(x), log(x), pow(x, y), sqrt(x)

// Arrondis
floor(x), ceil(x), round(x), fract(x)

// Interpolation
mix(a, b, t)  // Interpolation linéaire
smoothstep(edge0, edge1, x)  // Interpolation smooth

// Distances
length(v)     // Longueur d'un vecteur
distance(a, b) // Distance entre deux points

// Autres
abs(x), sign(x), min(a, b), max(a, b), clamp(x, min, max)
```

---

## Techniques de Base

### 1. Dégradés Simples

**Dégradé Horizontal** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float gradient = uv.x;
    fragColor = vec4(vec3(gradient), 1.0);
}
```

**Dégradé Radial** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.0;
    float dist = length(uv);
    fragColor = vec4(vec3(dist), 1.0);
}
```

**Dégradé Diagonal** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float gradient = (uv.x + uv.y) * 0.5;
    fragColor = vec4(vec3(gradient), 1.0);
}
```

### 2. Formes Géométriques

**Cercle** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.0;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    
    float dist = length(uv);
    float circle = smoothstep(0.5, 0.4, dist);
    
    fragColor = vec4(vec3(circle), 1.0);
}
```

**Rectangle** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.0;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    
    vec2 size = vec2(0.5, 0.3);
    vec2 d = abs(uv) - size;
    float rect = smoothstep(0.0, 0.02, -max(d.x, d.y));
    
    fragColor = vec4(vec3(rect), 1.0);
}
```

**Ligne** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.0;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    
    // Ligne verticale
    float line = smoothstep(0.01, 0.0, abs(uv.x));
    
    fragColor = vec4(vec3(line), 1.0);
}
```

### 3. Animations Temporelles

**Pulsation** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.0;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    
    float dist = length(uv);
    float pulse = sin(iTime * 2.0) * 0.5 + 0.5;
    float circle = smoothstep(pulse + 0.1, pulse, dist);
    
    fragColor = vec4(vec3(circle), 1.0);
}
```

**Rotation** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.0;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    
    float angle = iTime;
    float c = cos(angle);
    float s = sin(angle);
    mat2 rot = mat2(c, -s, s, c);
    uv = rot * uv;
    
    float pattern = mod(uv.x + uv.y, 0.2);
    fragColor = vec4(vec3(pattern * 5.0), 1.0);
}
```

**Ondes** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    float wave = sin(uv.x * 10.0 + iTime * 2.0) * 0.5 + 0.5;
    float dist = abs(uv.y - wave);
    float line = smoothstep(0.02, 0.0, dist);
    
    fragColor = vec4(vec3(line), 1.0);
}
```

### 4. Effets de Couleur

**Arc-en-ciel** :
```glsl
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float hue = uv.x + iTime * 0.1;
    vec3 color = hsv2rgb(vec3(hue, 1.0, 1.0));
    fragColor = vec4(color, 1.0);
}
```

**Palette de Couleurs** :
```glsl
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    
    return a + b * cos(6.28318 * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.0;
    float dist = length(uv);
    vec3 color = palette(dist + iTime * 0.5);
    fragColor = vec4(color, 1.0);
}
```

---

## Techniques Avancées

### 1. Noise et Perlin Noise

**Noise Simple** :
```glsl
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
    float n = noise(uv * 10.0 + iTime);
    fragColor = vec4(vec3(n), 1.0);
}
```

**FBM (Fractal Brownian Motion)** :
```glsl
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;
    
    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float n = fbm(uv * 5.0 + iTime * 0.1);
    fragColor = vec4(vec3(n), 1.0);
}
```

### 2. Raymarching et SDF (Signed Distance Fields)

**SDF de Base** :
```glsl
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float map(vec3 p) {
    float sphere = sdSphere(p, 0.5);
    float box = sdBox(p - vec3(1.0, 0.0, 0.0), vec3(0.3));
    return min(sphere, box);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.0;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    
    vec3 ro = vec3(0.0, 0.0, -3.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    
    float t = 0.0;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if (d < 0.001) break;
        t += d;
    }
    
    vec3 color = vec3(1.0) / (1.0 + t * 0.1);
    fragColor = vec4(color, 1.0);
}
```

### 3. Voronoi

```glsl
vec2 random2(vec2 st) {
    st = vec2(dot(st, vec2(127.1, 311.7)),
              dot(st, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(st) * 43758.5453123);
}

float voronoi(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float min_dist = 1.0;
    
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = random2(i + neighbor);
            point = 0.5 + 0.5 * sin(iTime + 6.2831 * point);
            vec2 diff = neighbor + point - f;
            float dist = length(diff);
            min_dist = min(min_dist, dist);
        }
    }
    
    return min_dist;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float v = voronoi(uv * 5.0);
    fragColor = vec4(vec3(v), 1.0);
}
```

### 4. Fractales

**Mandelbrot** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.0;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    
    vec2 c = uv * 2.0;
    vec2 z = vec2(0.0);
    
    float iterations = 0.0;
    float max_iter = 100.0;
    
    for (float i = 0.0; i < max_iter; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > 4.0) break;
        iterations = i;
    }
    
    float color = iterations / max_iter;
    fragColor = vec4(vec3(color), 1.0);
}
```

**Julia Set** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.0;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    
    vec2 c = vec2(0.285, 0.01) + vec2(sin(iTime), cos(iTime)) * 0.3;
    vec2 z = uv * 2.0;
    
    float iterations = 0.0;
    float max_iter = 100.0;
    
    for (float i = 0.0; i < max_iter; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > 4.0) break;
        iterations = i;
    }
    
    float color = iterations / max_iter;
    fragColor = vec4(vec3(color), 1.0);
}
```

### 5. Post-Processing

**Bloom** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    // Rendu de base
    vec3 color = vec3(0.0);
    // ... votre shader ici ...
    
    // Bloom (simplifié)
    float brightness = dot(color, vec3(0.299, 0.587, 0.114));
    if (brightness > 0.8) {
        color += vec3(0.5) * (brightness - 0.8) * 5.0;
    }
    
    fragColor = vec4(color, 1.0);
}
```

**Chromatic Aberration** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 center = vec2(0.5);
    vec2 offset = (uv - center) * 0.1;
    
    float r = texture2D(iChannel0, uv + offset).r;
    float g = texture2D(iChannel0, uv).g;
    float b = texture2D(iChannel0, uv - offset).b;
    
    fragColor = vec4(r, g, b, 1.0);
}
```

**Vignette** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    // Votre shader
    vec3 color = vec3(1.0);
    
    // Vignette
    vec2 dist = uv - vec2(0.5);
    float vignette = 1.0 - dot(dist, dist) * 2.0;
    vignette = smoothstep(0.0, 1.0, vignette);
    
    fragColor = vec4(color * vignette, 1.0);
}
```

---

## Optimisations et Performance

### 1. Réduction des Calculs

**❌ Mauvais** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;
    
    // Calcul répété à chaque pixel
    for (int i = 0; i < 100; i++) {
        uv = vec2(sin(uv.x * aspect), cos(uv.y));
    }
}
```

**✅ Bon** :
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;
    vec2 scaled = uv * vec2(aspect, 1.0);
    
    // Calcul optimisé
    for (int i = 0; i < 20; i++) {
        scaled = vec2(sin(scaled.x), cos(scaled.y));
    }
}
```

### 2. Utilisation de `smoothstep` au lieu de `step`

**❌ Mauvais** :
```glsl
float edge = step(0.5, uv.x);
```

**✅ Bon** :
```glsl
float edge = smoothstep(0.48, 0.52, uv.x);
```

### 3. Limiter les Itérations

```glsl
// Limiter les boucles pour éviter les timeouts
#define MAX_ITERATIONS 64

for (int i = 0; i < MAX_ITERATIONS; i++) {
    // ...
    if (condition) break; // Sortir tôt si possible
}
```

### 4. Pré-calculer les Constantes

```glsl
// En haut du shader
const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const vec3 LIGHT_DIR = normalize(vec3(1.0, 1.0, 1.0));
```

### 5. Éviter les Divisions

**❌ Mauvais** :
```glsl
vec2 uv = fragCoord / iResolution.xy;
```

**✅ Bon** :
```glsl
vec2 uv = fragCoord * (1.0 / iResolution.xy);
```

### 6. Utiliser `mix` au lieu de `if/else`

**❌ Mauvais** :
```glsl
if (dist < 0.5) {
    color = vec3(1.0);
} else {
    color = vec3(0.0);
}
```

**✅ Bon** :
```glsl
float t = smoothstep(0.5, 0.6, dist);
color = mix(vec3(1.0), vec3(0.0), t);
```

---

## Exemples Pratiques

### Exemple 1 : Plasma Effect

```glsl
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    float x = uv.x * 10.0;
    float y = uv.y * 10.0;
    float v = 0.0;
    
    v += sin((x + iTime));
    v += sin((y + iTime) / 2.0);
    v += sin((x + y + iTime) / 2.0);
    v += sin(length(vec2(x, y)) + iTime);
    v = v / 2.0;
    
    vec3 color = vec3(
        sin(v * PI),
        sin(v * PI + 2.0),
        sin(v * PI + 4.0)
    ) * 0.5 + 0.5;
    
    fragColor = vec4(color, 1.0);
}
```

### Exemple 2 : Spiral

```glsl
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord / iResolution.xy - 0.5) * 2.0;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    
    float angle = atan(uv.y, uv.x);
    float dist = length(uv);
    
    float spiral = sin(angle * 3.0 + dist * 10.0 - iTime * 2.0);
    spiral = smoothstep(0.0, 0.1, spiral);
    
    vec3 color = vec3(spiral) * vec3(1.0, 0.5, 0.2);
    fragColor = vec4(color, 1.0);
}
```

### Exemple 3 : Water Ripple

```glsl
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    vec2 center = vec2(0.5);
    float dist = distance(uv, center);
    
    float ripple = sin(dist * 20.0 - iTime * 5.0) * 0.5 + 0.5;
    ripple = smoothstep(0.4, 0.6, ripple);
    
    vec3 waterColor = vec3(0.1, 0.3, 0.6);
    vec3 rippleColor = vec3(0.2, 0.5, 0.9);
    
    vec3 color = mix(waterColor, rippleColor, ripple);
    fragColor = vec4(color, 1.0);
}
```

### Exemple 4 : Starfield

```glsl
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    vec3 color = vec3(0.0);
    
    for (int i = 0; i < 100; i++) {
        vec2 starPos = vec2(
            random(vec2(float(i))),
            random(vec2(float(i * 2)))
        );
        
        float starSpeed = random(vec2(float(i * 3))) * 0.5 + 0.5;
        starPos.y = mod(starPos.y + iTime * starSpeed, 1.0);
        
        float dist = distance(uv, starPos);
        float brightness = 1.0 / (dist * 50.0);
        
        color += vec3(brightness);
    }
    
    fragColor = vec4(color, 1.0);
}
```

### Exemple 5 : Fire Effect

```glsl
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    vec2 p = uv;
    p.y += iTime * 0.5;
    
    float n = noise(p * vec2(1.0, 2.0) + iTime);
    n += noise(p * vec2(2.0, 1.0) - iTime) * 0.5;
    n += noise(p * vec2(4.0, 4.0) + iTime * 0.25) * 0.25;
    
    float gradient = 1.0 - uv.y;
    float fire = n * gradient;
    
    vec3 color = vec3(
        fire,
        fire * 0.5,
        fire * 0.1
    );
    
    fragColor = vec4(color, 1.0);
}
```

---

## Intégration avec ShaderBot

### Utilisation via Discord

**Commande de base** :
```
/shader <code_glsl>
```

**Avec textures** :
```
/shader <code_glsl> texture_url_1 texture_url_2 texture_url_3 texture_url_4
```

**Shader prédéfini** :
```
/shader-preset rainbow
```

### Format Requis

Votre shader doit suivre ce format :

```glsl
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Votre code ici
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

### Variables Disponibles

- `iTime` : Temps en secondes (pour animations)
- `iResolution` : Résolution (width, height)
- `iMouse` : Position souris normalisée (0.0-1.0)
- `iChannel0-3` : Textures (optionnelles)

### Limitations

- **Taille** : Maximum 10,000 caractères
- **Timeout** : 30 secondes par compilation
- **Résolution** : 320x240 pixels (optimisé pour performance)
- **Durée** : 2 secondes d'animation à 30 FPS

### Conseils pour ShaderBot

1. **Testez localement** : Utilisez Shadertoy ou un éditeur GLSL avant de compiler
2. **Optimisez** : Réduisez les itérations pour éviter les timeouts
3. **Utilisez les presets** : Inspirez-vous des 97 shaders prédéfinis
4. **Partagez** : Utilisez `/shader-code <preset>` pour voir le code source

---

## Ressources et Références

### Documentation Officielle

- **GLSL Specification** : [OpenGL Shading Language](https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language)
- **WebGL Reference** : [MDN WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
- **Shadertoy** : [shadertoy.com](https://www.shadertoy.com) - Source d'inspiration

### Outils et Éditeurs

- **Shadertoy** : Éditeur en ligne avec prévisualisation temps réel
- **GLSL Sandbox** : Éditeur GLSL interactif
- **The Book of Shaders** : [thebookofshaders.com](https://thebookofshaders.com) - Tutoriel interactif

### Livres Recommandés

- "The Book of Shaders" par Patricio Gonzalez Vivo
- "Real-Time Rendering" par Tomas Akenine-Möller
- "GPU Gems" série par NVIDIA

### Communautés

- **Shadertoy Community** : Partagez vos créations
- **r/shaders** : Subreddit dédié aux shaders
- **Discord ShaderBot** : Rejoignez notre serveur Discord

### Formations

- **Inigo Quilez** : [iquilezles.org](https://iquilezles.org) - Articles techniques avancés
- **Shader School** : [shaderschool.com](https://github.com/stackgl/shader-school) - Tutoriel interactif

### Fonctions Utiles

**Bibliothèque de fonctions communes** :
```glsl
// Rotation 2D
mat2 rotate2D(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

// Rotation 3D autour de l'axe Y
mat3 rotateY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        c, 0.0, s,
        0.0, 1.0, 0.0,
        -s, 0.0, c
    );
}

// Conversion HSV vers RGB
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Conversion RGB vers HSV
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// Distance à un cercle
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

// Distance à un rectangle
float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Distance à une ligne
float sdLine(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}
```

---

## Conclusion

Ce guide couvre les bases essentielles pour créer des shaders GLSL professionnels. Pour aller plus loin :

1. **Pratiquez régulièrement** : Créez un shader par jour
2. **Analysez les exemples** : Étudiez les shaders sur Shadertoy
3. **Expérimentez** : N'ayez pas peur d'essayer de nouvelles techniques
4. **Partagez** : Montrez vos créations à la communauté

**Bon codage ! 🎨✨**

---

*Guide créé pour ShaderBot - Bot Discord professionnel pour shaders GLSL*
*Dernière mise à jour : 2025*

