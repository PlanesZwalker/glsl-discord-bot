'use client'

import { useState } from 'react'
import { useLocale } from '@/hooks/useLocale'

export function ShaderGuide() {
  const { locale } = useLocale()
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const isFr = locale === 'fr'

  const sections = [
    {
      id: 'introduction',
      title: isFr ? 'Introduction GLSL/WGSL' : 'GLSL/WGSL Introduction',
      icon: '📚',
    },
    {
      id: 'basics',
      title: isFr ? 'Fondamentaux' : 'Fundamentals',
      icon: '🎯',
    },
    {
      id: '2d',
      title: isFr ? 'Techniques 2D' : '2D Techniques',
      icon: '🖼️',
    },
    {
      id: '3d',
      title: isFr ? 'Techniques 3D' : '3D Techniques',
      icon: '🎲',
    },
    {
      id: 'textures',
      title: isFr ? 'Textures & Sampling' : 'Textures & Sampling',
      icon: '🖼️',
    },
    {
      id: 'animations',
      title: isFr ? 'Animations Avancées' : 'Advanced Animations',
      icon: '✨',
    },
    {
      id: 'gradients',
      title: isFr ? 'Gradients & Couleurs' : 'Gradients & Colors',
      icon: '🌈',
    },
    {
      id: 'functions',
      title: isFr ? 'Fonctions Complètes' : 'Complete Functions',
      icon: '⚙️',
    },
    {
      id: 'wgsl',
      title: isFr ? 'WGSL Spécifique' : 'WGSL Specific',
      icon: '🔷',
    },
    {
      id: 'converter',
      title: isFr ? 'Convertisseur GLSL→WGSL' : 'GLSL→WGSL Converter',
      icon: '🔄',
    },
    {
      id: 'tips',
      title: isFr ? 'Tips Professionnels' : 'Professional Tips',
      icon: '💡',
    },
    {
      id: 'advanced',
      title: isFr ? 'Techniques Avancées' : 'Advanced Techniques',
      icon: '🚀',
    },
  ]

  return (
    <section className="py-20 bg-white dark:bg-black transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
            {isFr ? 'Guide Professionnel Complet pour Coder des Shaders' : 'Complete Professional Guide to Coding Shaders'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-3xl mx-auto transition-colors">
            {isFr
              ? 'Guide exhaustif pour maîtriser GLSL et WGSL : 2D, 3D, textures, animations, gradients et techniques avancées'
              : 'Comprehensive guide to master GLSL and WGSL: 2D, 3D, textures, animations, gradients, and advanced techniques'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                activeSection === section.id
                  ? 'border-discord-blurple bg-gray-100 dark:bg-gray-800'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{section.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">{section.title}</h3>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 border border-gray-200 dark:border-gray-700 transition-colors shadow-sm dark:shadow-none">
          {activeSection === 'introduction' && <IntroductionSection isFr={isFr} />}
          {activeSection === 'basics' && <BasicsSection isFr={isFr} />}
          {activeSection === '2d' && <TwoDSection isFr={isFr} />}
          {activeSection === '3d' && <ThreeDSection isFr={isFr} />}
          {activeSection === 'textures' && <TexturesSection isFr={isFr} />}
          {activeSection === 'animations' && <AnimationsSection isFr={isFr} />}
          {activeSection === 'gradients' && <GradientsSection isFr={isFr} />}
          {activeSection === 'functions' && <FunctionsSection isFr={isFr} />}
          {activeSection === 'wgsl' && <WGSLSection isFr={isFr} />}
          {activeSection === 'converter' && <ConverterSection isFr={isFr} />}
          {activeSection === 'tips' && <TipsSection isFr={isFr} />}
          {activeSection === 'advanced' && <AdvancedSection isFr={isFr} />}
          {!activeSection && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg transition-colors">
                {isFr
                  ? 'Sélectionnez une section ci-dessus pour commencer à apprendre'
                  : 'Select a section above to start learning'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// Introduction Section
function IntroductionSection({ isFr }: { isFr: boolean }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {isFr ? 'Introduction à GLSL et WGSL' : 'Introduction to GLSL and WGSL'}
      </h3>
      
      <div className="space-y-4 text-gray-700 dark:text-gray-300 transition-colors">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-3 transition-colors">
            {isFr ? 'GLSL (OpenGL Shading Language)' : 'GLSL (OpenGL Shading Language)'}
          </h4>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>{isFr ? 'Langage de shader pour OpenGL/WebGL' : 'Shader language for OpenGL/WebGL'}</li>
            <li>{isFr ? 'Syntaxe C-like familière' : 'C-like familiar syntax'}</li>
            <li>{isFr ? 'Support natif des types vectoriels (vec2, vec3, vec4)' : 'Native support for vector types (vec2, vec3, vec4)'}</li>
            <li>{isFr ? 'Fonctions mathématiques intégrées nombreuses' : 'Many built-in mathematical functions'}</li>
            <li>{isFr ? 'Utilisé par Shadertoy et la plupart des moteurs graphiques' : 'Used by Shadertoy and most graphics engines'}</li>
          </ul>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-3 transition-colors">
            {isFr ? 'WGSL (WebGPU Shading Language)' : 'WGSL (WebGPU Shading Language)'}
          </h4>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>{isFr ? 'Langage de shader pour WebGPU (successeur de WebGL)' : 'Shader language for WebGPU (WebGL successor)'}</li>
            <li>{isFr ? 'Syntaxe Rust-like plus moderne' : 'More modern Rust-like syntax'}</li>
            <li>{isFr ? 'Meilleure performance et parallélisme' : 'Better performance and parallelism'}</li>
            <li>{isFr ? 'Sécurité mémoire améliorée' : 'Improved memory safety'}</li>
            <li>{isFr ? 'Standard pour les applications WebGPU modernes' : 'Standard for modern WebGPU applications'}</li>
          </ul>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-2 transition-colors">
            {isFr ? 'Types de Shaders' : 'Shader Types'}
          </h4>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>
              <strong className="text-discord-blurple">Vertex Shader:</strong>{' '}
              {isFr ? 'Transforme les positions des sommets (vertices) dans l\'espace 3D' : 'Transforms vertex positions in 3D space'}
            </li>
            <li>
              <strong className="text-discord-blurple">Fragment Shader:</strong>{' '}
              {isFr ? 'Calcule la couleur de chaque pixel (ce que nous utilisons principalement)' : 'Calculates the color of each pixel (what we mainly use)'}
            </li>
            <li>
              <strong className="text-discord-blurple">Compute Shader:</strong>{' '}
              {isFr ? 'Calculs généraux sur GPU (disponible en WGSL)' : 'General GPU computations (available in WGSL)'}
            </li>
          </ul>
        </div>

        <p className="text-sm">
          {isFr
            ? 'Ce bot supporte les Fragment Shaders GLSL et WGSL. Les Fragment Shaders calculent la couleur de chaque pixel de l\'écran, permettant de créer des effets visuels complexes et performants.'
            : 'This bot supports GLSL and WGSL Fragment Shaders. Fragment Shaders calculate the color of each pixel on the screen, allowing you to create complex and performant visual effects.'}
        </p>
      </div>
    </div>
  )
}

// Basics Section - Expanded
function BasicsSection({ isFr }: { isFr: boolean }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {isFr ? 'Fondamentaux des Shaders' : 'Shader Fundamentals'}
      </h3>
      
      <div className="space-y-4">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-2 transition-colors">
            {isFr ? 'Structure GLSL (Shadertoy Style)' : 'GLSL Structure (Shadertoy Style)'}
          </h4>
          <pre className="text-sm text-gray-800 dark:text-gray-300 overflow-x-auto transition-colors">
            <code>{`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normaliser les coordonnées UV (0.0 à 1.0)
    vec2 uv = fragCoord / iResolution.xy;
    
    // Calculer la couleur du pixel
    vec3 color = vec3(uv.x, uv.y, 0.5);
    
    // Sortie finale
    fragColor = vec4(color, 1.0);
}`}</code>
          </pre>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-2 transition-colors">
            {isFr ? 'Types de Données' : 'Data Types'}
          </h4>
          <div className="space-y-2 text-sm">
            <div><code className="text-discord-blurple">float</code> - {isFr ? 'Nombre décimal (32-bit)' : 'Decimal number (32-bit)'}</div>
            <div><code className="text-discord-blurple">int</code> - {isFr ? 'Nombre entier' : 'Integer'}</div>
            <div><code className="text-discord-blurple">bool</code> - {isFr ? 'Booléen' : 'Boolean'}</div>
            <div><code className="text-discord-blurple">vec2</code> - {isFr ? 'Vecteur 2D (x, y)' : '2D vector (x, y)'}</div>
            <div><code className="text-discord-blurple">vec3</code> - {isFr ? 'Vecteur 3D (x, y, z) ou RGB' : '3D vector (x, y, z) or RGB'}</div>
            <div><code className="text-discord-blurple">vec4</code> - {isFr ? 'Vecteur 4D (x, y, z, w) ou RGBA' : '4D vector (x, y, z, w) or RGBA'}</div>
            <div><code className="text-discord-blurple">mat2, mat3, mat4</code> - {isFr ? 'Matrices 2x2, 3x3, 4x4' : '2x2, 3x3, 4x4 matrices'}</div>
            <div><code className="text-discord-blurple">sampler2D</code> - {isFr ? 'Texture 2D' : '2D texture'}</div>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-2 transition-colors">
            {isFr ? 'Variables Globales Disponibles' : 'Available Global Variables'}
          </h4>
          <div className="space-y-2 text-sm">
            <div><code className="text-discord-blurple">iTime</code> - {isFr ? 'Temps écoulé en secondes (float)' : 'Elapsed time in seconds (float)'}</div>
            <div><code className="text-discord-blurple">iResolution</code> - {isFr ? 'Résolution écran (vec3: x, y, aspect ratio)' : 'Screen resolution (vec3: x, y, aspect ratio)'}</div>
            <div><code className="text-discord-blurple">iMouse</code> - {isFr ? 'Position souris (vec4: x, y, click, drag)' : 'Mouse position (vec4: x, y, click, drag)'}</div>
            <div><code className="text-discord-blurple">iChannel0-3</code> - {isFr ? 'Textures optionnelles (sampler2D)' : 'Optional textures (sampler2D)'}</div>
            <div><code className="text-discord-blurple">fragCoord</code> - {isFr ? 'Coordonnées pixel actuel (vec2)' : 'Current pixel coordinates (vec2)'}</div>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-2 transition-colors">
            {isFr ? 'Manipulation de Vecteurs' : 'Vector Manipulation'}
          </h4>
          <pre className="text-sm text-gray-800 dark:text-gray-300 overflow-x-auto transition-colors">
            <code>{`vec2 uv = vec2(0.5, 0.5);
vec3 color = vec3(1.0, 0.0, 0.0); // Rouge

// Accès aux composants
float x = uv.x;        // ou uv.r, uv.s
float y = uv.y;        // ou uv.g, uv.t
vec2 xy = uv.xy;       // Swizzling
vec2 yx = uv.yx;       // Inversion

// Opérations vectorielles
vec3 a = vec3(1.0, 2.0, 3.0);
vec3 b = vec3(4.0, 5.0, 6.0);
vec3 sum = a + b;      // Addition
vec3 prod = a * b;     // Multiplication composante par composante
float dot = dot(a, b); // Produit scalaire
vec3 cross = cross(a, b); // Produit vectoriel (3D)`}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

// 2D Techniques Section
function TwoDSection({ isFr }: { isFr: boolean }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {isFr ? 'Techniques 2D Avancées' : 'Advanced 2D Techniques'}
      </h3>
      
      <div className="space-y-6">
        <ExampleCard
          title={isFr ? 'Formes Géométriques' : 'Geometric Shapes'}
          code={`// Cercle
float circle(vec2 uv, vec2 center, float radius) {
    return length(uv - center) - radius;
}

// Rectangle
float box(vec2 uv, vec2 center, vec2 size) {
    vec2 d = abs(uv - center) - size;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Polygone régulier
float polygon(vec2 uv, vec2 center, float radius, int sides) {
    vec2 p = uv - center;
    float angle = atan(p.y, p.x);
    float slice = 6.28318 / float(sides);
    return length(p) - radius * cos(floor(0.5 + angle / slice) * slice - angle);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    uv -= 0.5;
    
    float d = circle(uv, vec2(0.0), 0.3);
    float shape = smoothstep(0.0, 0.01, -d);
    
    fragColor = vec4(vec3(shape), 1.0);
}`}
          description={isFr ? 'Création de formes géométriques avec SDF (Signed Distance Fields)' : 'Creating geometric shapes with SDF (Signed Distance Fields)'}
        />

        <ExampleCard
          title={isFr ? 'Motifs Répétitifs' : 'Repeating Patterns'}
          code={`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    // Répétition avec fract()
    vec2 id = floor(uv * 10.0);
    vec2 gv = fract(uv * 10.0) - 0.5;
    
    // Distance au centre de chaque cellule
    float dist = length(gv);
    
    // Cercle dans chaque cellule
    float circle = smoothstep(0.3, 0.29, dist);
    
    // Alternance de couleurs
    vec3 color = mix(
        vec3(0.2, 0.4, 0.8),
        vec3(0.8, 0.4, 0.2),
        mod(id.x + id.y, 2.0)
    );
    
    fragColor = vec4(color * circle, 1.0);
}`}
          description={isFr ? 'Création de motifs répétitifs avec fract() et floor()' : 'Creating repeating patterns with fract() and floor()'}
        />

        <ExampleCard
          title={isFr ? 'Distorsions et Warping' : 'Distortions and Warping'}
          code={`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float time = iTime;
    
    // Distorsion sinusoïdale
    vec2 distorted = uv;
    distorted.x += sin(uv.y * 10.0 + time) * 0.05;
    distorted.y += cos(uv.x * 10.0 + time) * 0.05;
    
    // Spirale
    vec2 center = vec2(0.5);
    vec2 p = distorted - center;
    float angle = atan(p.y, p.x);
    float radius = length(p);
    
    // Rotation basée sur le rayon
    angle += radius * 5.0 + time;
    p = vec2(cos(angle), sin(angle)) * radius;
    
    // Pattern
    float pattern = sin(p.x * 10.0) * sin(p.y * 10.0);
    
    fragColor = vec4(vec3(pattern * 0.5 + 0.5), 1.0);
}`}
          description={isFr ? 'Techniques de distorsion et warping pour effets visuels' : 'Distortion and warping techniques for visual effects'}
        />

        <ExampleCard
          title={isFr ? 'Voronoi et Cellular Noise' : 'Voronoi and Cellular Noise'}
          code={`// Hash function
vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

// Voronoi
float voronoi(vec2 uv) {
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    
    float minDist = 1.0;
    
    // Vérifier les 9 cellules voisines
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash(i + neighbor);
            point = 0.5 + 0.5 * sin(iTime + 6.2831 * point);
            
            vec2 diff = neighbor + point - f;
            float dist = length(diff);
            minDist = min(minDist, dist);
        }
    }
    
    return minDist;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float v = voronoi(uv * 10.0);
    fragColor = vec4(vec3(v), 1.0);
}`}
          description={isFr ? 'Génération de patterns Voronoi pour textures organiques' : 'Generating Voronoi patterns for organic textures'}
        />
      </div>
    </div>
  )
}

// 3D Techniques Section
function ThreeDSection({ isFr }: { isFr: boolean }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {isFr ? 'Techniques 3D Avancées' : 'Advanced 3D Techniques'}
      </h3>
      
      <div className="space-y-6">
        <ExampleCard
          title={isFr ? 'Raymarching de Base' : 'Basic Raymarching'}
          code={`// SDF pour une sphère
float sdSphere(vec3 p, float radius) {
    return length(p) - radius;
}

// SDF pour un cube
float sdBox(vec3 p, vec3 size) {
    vec3 d = abs(p) - size;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

// Raymarching
float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = sdSphere(p, 1.0);
        if(d < 0.001) break;
        t += d;
        if(t > 100.0) break;
    }
    return t;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    vec3 ro = vec3(0.0, 0.0, -3.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    
    float t = raymarch(ro, rd);
    
    vec3 col = vec3(1.0) / (1.0 + t * 0.1);
    fragColor = vec4(col, 1.0);
}`}
          description={isFr ? 'Raymarching pour créer des scènes 3D avec SDF' : 'Raymarching to create 3D scenes with SDF'}
        />

        <ExampleCard
          title={isFr ? 'Éclairage 3D' : '3D Lighting'}
          code={`float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

vec3 calcNormal(vec3 p) {
    float eps = 0.001;
    return normalize(vec3(
        sdSphere(p + vec3(eps, 0, 0)) - sdSphere(p - vec3(eps, 0, 0)),
        sdSphere(p + vec3(0, eps, 0)) - sdSphere(p - vec3(0, eps, 0)),
        sdSphere(p + vec3(0, 0, eps)) - sdSphere(p - vec3(0, 0, eps))
    ));
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
}`}
          description={isFr ? 'Calcul de normales et éclairage Phong pour rendu 3D réaliste' : 'Normal calculation and Phong lighting for realistic 3D rendering'}
        />

        <ExampleCard
          title={isFr ? 'Opérations CSG (Constructive Solid Geometry)' : 'CSG Operations'}
          code={`float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 s) {
    vec3 d = abs(p) - s;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

// Union (combine)
float opUnion(float d1, float d2) {
    return min(d1, d2);
}

// Intersection
float opIntersection(float d1, float d2) {
    return max(d1, d2);
}

// Soustraction
float opSubtraction(float d1, float d2) {
    return max(-d1, d2);
}

// Smooth union
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec3 ro = vec3(0.0, 0.0, -3.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    
    float t = 0.0;
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        
        float d1 = sdSphere(p, 1.0);
        float d2 = sdBox(p - vec3(0.5, 0.0, 0.0), vec3(0.5));
        float d = opSmoothUnion(d1, d2, 0.3);
        
        if(d < 0.001) break;
        t += d;
        if(t > 100.0) break;
    }
    
    vec3 col = vec3(1.0) / (1.0 + t * 0.1);
    fragColor = vec4(col, 1.0);
}`}
          description={isFr ? 'Opérations CSG pour combiner des formes 3D' : 'CSG operations to combine 3D shapes'}
        />

        <ExampleCard
          title={isFr ? 'Rotations et Transformations 3D' : '3D Rotations and Transformations'}
          code={`// Rotation autour de l'axe X
mat3 rotX(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        1.0, 0.0, 0.0,
        0.0, c, -s,
        0.0, s, c
    );
}

// Rotation autour de l'axe Y
mat3 rotY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        c, 0.0, s,
        0.0, 1.0, 0.0,
        -s, 0.0, c
    );
}

// Rotation autour de l'axe Z
mat3 rotZ(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(
        c, -s, 0.0,
        s, c, 0.0,
        0.0, 0.0, 1.0
    );
}

float sdBox(vec3 p, vec3 s) {
    vec3 d = abs(p) - s;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec3 ro = vec3(0.0, 0.0, -3.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    
    float t = 0.0;
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        
        // Rotation animée
        p = rotY(iTime) * rotX(iTime * 0.5) * p;
        
        float d = sdBox(p, vec3(0.5));
        if(d < 0.001) break;
        t += d;
        if(t > 100.0) break;
    }
    
    vec3 col = vec3(1.0) / (1.0 + t * 0.1);
    fragColor = vec4(col, 1.0);
}`}
          description={isFr ? 'Matrices de rotation et transformations 3D' : 'Rotation matrices and 3D transformations'}
        />
      </div>
    </div>
  )
}

// Textures Section
function TexturesSection({ isFr }: { isFr: boolean }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {isFr ? 'Textures et Sampling' : 'Textures and Sampling'}
      </h3>
      
      <div className="space-y-6">
        <ExampleCard
          title={isFr ? 'Sampling de Textures de Base' : 'Basic Texture Sampling'}
          code={`uniform sampler2D iChannel0;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    // Sampling simple
    vec4 texColor = texture(iChannel0, uv);
    
    // Sampling avec coordonnées inversées
    vec4 texColorFlipped = texture(iChannel0, vec2(uv.x, 1.0 - uv.y));
    
    // Sampling avec répétition
    vec4 texColorTiled = texture(iChannel0, fract(uv * 2.0));
    
    fragColor = texColor;
}`}
          description={isFr ? 'Utilisation de textures avec sampler2D' : 'Using textures with sampler2D'}
        />

        <ExampleCard
          title={isFr ? 'Mélange de Textures' : 'Texture Blending'}
          code={`uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    vec4 tex0 = texture(iChannel0, uv);
    vec4 tex1 = texture(iChannel1, uv);
    
    // Mix simple
    vec4 mixed = mix(tex0, tex1, 0.5);
    
    // Mix avec masque
    float mask = sin(uv.x * 10.0) * 0.5 + 0.5;
    vec4 masked = mix(tex0, tex1, mask);
    
    // Blend modes
    vec4 multiply = tex0 * tex1;
    vec4 screen = 1.0 - (1.0 - tex0) * (1.0 - tex1);
    vec4 overlay = mix(
        tex0 * tex1 * 2.0,
        1.0 - 2.0 * (1.0 - tex0) * (1.0 - tex1),
        step(0.5, tex0)
    );
    
    fragColor = overlay;
}`}
          description={isFr ? 'Techniques de mélange de textures (blend modes)' : 'Texture blending techniques (blend modes)'}
        />

        <ExampleCard
          title={isFr ? 'Distorsion de Textures' : 'Texture Distortion'}
          code={`uniform sampler2D iChannel0;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float time = iTime;
    
    // Distorsion sinusoïdale
    vec2 distorted = uv;
    distorted.x += sin(uv.y * 10.0 + time) * 0.05;
    distorted.y += cos(uv.x * 10.0 + time) * 0.05;
    
    vec4 tex = texture(iChannel0, distorted);
    
    // Distorsion radiale
    vec2 center = vec2(0.5);
    vec2 p = uv - center;
    float angle = atan(p.y, p.x);
    float radius = length(p);
    
    vec2 radialUV = center + vec2(cos(angle + radius * 5.0), sin(angle + radius * 5.0)) * radius;
    vec4 radialTex = texture(iChannel0, radialUV);
    
    fragColor = radialTex;
}`}
          description={isFr ? 'Distorsion de coordonnées UV pour effets visuels' : 'UV coordinate distortion for visual effects'}
        />

        <ExampleCard
          title={isFr ? 'Génération Procédurale de Textures' : 'Procedural Texture Generation'}
          code={`// Noise function
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// FBM (Fractal Brownian Motion)
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    // Texture procédurale
    float n = fbm(uv * 10.0);
    
    // Wood texture
    float wood = sin(n * 20.0 + uv.y * 10.0) * 0.5 + 0.5;
    
    // Marble texture
    float marble = sin(n * 10.0 + uv.x * 5.0) * 0.5 + 0.5;
    
    fragColor = vec4(vec3(marble), 1.0);
}`}
          description={isFr ? 'Génération de textures procédurales avec noise et FBM' : 'Procedural texture generation with noise and FBM'}
        />
      </div>
    </div>
  )
}

// Animations Section
function AnimationsSection({ isFr }: { isFr: boolean }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {isFr ? 'Animations Avancées' : 'Advanced Animations'}
      </h3>
      
      <div className="space-y-6">
        <ExampleCard
          title={isFr ? 'Easing et Interpolation' : 'Easing and Interpolation'}
          code={`// Easing functions
float easeInOut(float t) {
    return t * t * (3.0 - 2.0 * t);
}

float easeIn(float t) {
    return t * t;
}

float easeOut(float t) {
    return 1.0 - (1.0 - t) * (1.0 - t);
}

float bounce(float t) {
    if(t < 0.5) {
        return 4.0 * t * t;
    } else {
        return 1.0 - pow(-2.0 * t + 2.0, 2.0) / 2.0;
    }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float time = iTime;
    
    // Animation avec easing
    float t = mod(time, 2.0) / 2.0;
    float eased = easeInOut(t);
    
    float circle = length(uv - vec2(0.5 + eased * 0.3, 0.5)) - 0.1;
    float shape = smoothstep(0.0, 0.01, -circle);
    
    fragColor = vec4(vec3(shape), 1.0);
}`}
          description={isFr ? 'Fonctions d\'easing pour animations fluides' : 'Easing functions for smooth animations'}
        />

        <ExampleCard
          title={isFr ? 'Animations Multiples' : 'Multiple Animations'}
          code={`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float time = iTime;
    
    // Rotation
    vec2 center = vec2(0.5);
    vec2 p = uv - center;
    float angle = atan(p.y, p.x) + time;
    float radius = length(p);
    p = vec2(cos(angle), sin(angle)) * radius;
    
    // Scale pulsation
    float scale = 1.0 + sin(time * 2.0) * 0.2;
    p *= scale;
    
    // Translation
    p += vec2(sin(time), cos(time)) * 0.1;
    
    // Pattern animé
    float pattern = sin(p.x * 10.0 + time) * sin(p.y * 10.0 + time);
    
    // Couleur animée
    vec3 color = vec3(
        sin(time),
        sin(time + 2.094),
        sin(time + 4.189)
    ) * 0.5 + 0.5;
    
    fragColor = vec4(color * (pattern * 0.5 + 0.5), 1.0);
}`}
          description={isFr ? 'Combinaison de plusieurs animations simultanées' : 'Combining multiple simultaneous animations'}
        />

        <ExampleCard
          title={isFr ? 'Particules et Systèmes' : 'Particles and Systems'}
          code={`// Hash pour générer des positions de particules
vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float time = iTime;
    
    vec2 grid = floor(uv * 10.0);
    vec2 cellUV = fract(uv * 10.0);
    
    // Position de particule dans la cellule
    vec2 particlePos = hash(grid);
    
    // Animation de la particule
    particlePos += vec2(
        sin(time + particlePos.x * 6.283),
        cos(time + particlePos.y * 6.283)
    ) * 0.3;
    
    // Distance à la particule
    float dist = length(cellUV - particlePos);
    
    // Rendu de la particule
    float particle = smoothstep(0.05, 0.0, dist);
    
    // Traînée
    vec2 trail = cellUV - particlePos;
    float trailDist = length(trail);
    float trail = exp(-trailDist * 10.0) * smoothstep(0.3, 0.0, trailDist);
    
    vec3 color = vec3(0.2, 0.6, 1.0) * (particle + trail * 0.5);
    
    fragColor = vec4(color, 1.0);
}`}
          description={isFr ? 'Systèmes de particules avec hash et animations' : 'Particle systems with hash and animations'}
        />
      </div>
    </div>
  )
}

// Gradients Section
function GradientsSection({ isFr }: { isFr: boolean }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {isFr ? 'Gradients et Couleurs' : 'Gradients and Colors'}
      </h3>
      
      <div className="space-y-6">
        <ExampleCard
          title={isFr ? 'Gradients Linéaires' : 'Linear Gradients'}
          code={`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    // Gradient horizontal
    float gradH = uv.x;
    
    // Gradient vertical
    float gradV = uv.y;
    
    // Gradient diagonal
    float gradD = (uv.x + uv.y) * 0.5;
    
    // Gradient radial
    vec2 center = vec2(0.5);
    float gradR = length(uv - center);
    
    // Gradient angulaire
    vec2 p = uv - center;
    float gradA = atan(p.y, p.x) / 6.28318 + 0.5;
    
    fragColor = vec4(vec3(gradA), 1.0);
}`}
          description={isFr ? 'Différents types de gradients linéaires' : 'Different types of linear gradients'}
        />

        <ExampleCard
          title={isFr ? 'Espaces de Couleurs' : 'Color Spaces'}
          code={`// Conversion RGB vers HSV
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// Conversion HSV vers RGB
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float time = iTime;
    
    // Gradient HSV animé
    vec3 hsv = vec3(uv.x + time * 0.1, 1.0, 1.0);
    vec3 rgb = hsv2rgb(hsv);
    
    fragColor = vec4(rgb, 1.0);
}`}
          description={isFr ? 'Conversion entre espaces de couleurs RGB et HSV' : 'Conversion between RGB and HSV color spaces'}
        />

        <ExampleCard
          title={isFr ? 'Palettes de Couleurs' : 'Color Palettes'}
          code={`// Palette de couleurs prédéfinie
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    
    return a + b * cos(6.28318 * (c * t + d));
}

// Palette chaud/froid
vec3 warmCool(float t) {
    return mix(
        vec3(1.0, 0.5, 0.0), // Orange chaud
        vec3(0.0, 0.5, 1.0), // Bleu froid
        t
    );
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float time = iTime;
    
    float value = sin(uv.x * 10.0 + time) * 0.5 + 0.5;
    vec3 color = palette(value);
    
    fragColor = vec4(color, 1.0);
}`}
          description={isFr ? 'Création et utilisation de palettes de couleurs' : 'Creating and using color palettes'}
        />
      </div>
    </div>
  )
}

// Complete Functions Section
function FunctionsSection({ isFr }: { isFr: boolean }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {isFr ? 'Fonctions Complètes GLSL/WGSL' : 'Complete GLSL/WGSL Functions'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FunctionCard
          name="mix(x, y, a)"
          description={isFr ? 'Interpolation linéaire entre x et y' : 'Linear interpolation between x and y'}
          example={`vec3 color = mix(vec3(1,0,0), vec3(0,0,1), 0.5);`}
        />
        <FunctionCard
          name="smoothstep(edge0, edge1, x)"
          description={isFr ? 'Transition douce entre edge0 et edge1' : 'Smooth transition between edge0 and edge1'}
          example={`float edge = smoothstep(0.3, 0.7, uv.x);`}
        />
        <FunctionCard
          name="step(edge, x)"
          description={isFr ? 'Retourne 0.0 si x < edge, sinon 1.0' : 'Returns 0.0 if x < edge, else 1.0'}
          example={`float mask = step(0.5, uv.x);`}
        />
        <FunctionCard
          name="fract(x)"
          description={isFr ? 'Partie fractionnaire (x - floor(x))' : 'Fractional part (x - floor(x))'}
          example={`float pattern = fract(uv.x * 5.0);`}
        />
        <FunctionCard
          name="floor(x)"
          description={isFr ? 'Arrondi vers le bas' : 'Round down'}
          example={`int cell = int(floor(uv.x * 10.0));`}
        />
        <FunctionCard
          name="ceil(x)"
          description={isFr ? 'Arrondi vers le haut' : 'Round up'}
          example={`int cell = int(ceil(uv.x * 10.0));`}
        />
        <FunctionCard
          name="mod(x, y)"
          description={isFr ? 'Modulo (reste de la division)' : 'Modulo (remainder)'}
          example={`float tiled = mod(uv.x, 0.1);`}
        />
        <FunctionCard
          name="clamp(x, min, max)"
          description={isFr ? 'Limite x entre min et max' : 'Clamp x between min and max'}
          example={`float safe = clamp(uv.x, 0.0, 1.0);`}
        />
        <FunctionCard
          name="length(v)"
          description={isFr ? 'Longueur du vecteur (distance)' : 'Vector length (distance)'}
          example={`float dist = length(uv - vec2(0.5));`}
        />
        <FunctionCard
          name="distance(p0, p1)"
          description={isFr ? 'Distance entre deux points' : 'Distance between two points'}
          example={`float d = distance(uv, vec2(0.5));`}
        />
        <FunctionCard
          name="dot(a, b)"
          description={isFr ? 'Produit scalaire' : 'Dot product'}
          example={`float dp = dot(vec2(1,0), vec2(0,1)); // 0.0`}
        />
        <FunctionCard
          name="cross(a, b)"
          description={isFr ? 'Produit vectoriel (3D uniquement)' : 'Cross product (3D only)'}
          example={`vec3 normal = cross(vec3(1,0,0), vec3(0,1,0));`}
        />
        <FunctionCard
          name="normalize(v)"
          description={isFr ? 'Normalise le vecteur (longueur = 1)' : 'Normalize vector (length = 1)'}
          example={`vec2 dir = normalize(vec2(1,1));`}
        />
        <FunctionCard
          name="reflect(I, N)"
          description={isFr ? 'Réflexion du vecteur I sur la normale N' : 'Reflect vector I on normal N'}
          example={`vec3 reflected = reflect(lightDir, normal);`}
        />
        <FunctionCard
          name="refract(I, N, eta)"
          description={isFr ? 'Réfraction avec indice eta' : 'Refraction with index eta'}
          example={`vec3 refracted = refract(rayDir, normal, 0.9);`}
        />
        <FunctionCard
          name="texture(sampler, uv)"
          description={isFr ? 'Échantillonne une texture' : 'Sample a texture'}
          example={`vec4 color = texture(iChannel0, uv);`}
        />
        <FunctionCard
          name="textureLod(sampler, uv, lod)"
          description={isFr ? 'Échantillonne avec niveau de détail' : 'Sample with level of detail'}
          example={`vec4 color = textureLod(iChannel0, uv, 0.0);`}
        />
        <FunctionCard
          name="sin(x), cos(x), tan(x)"
          description={isFr ? 'Fonctions trigonométriques' : 'Trigonometric functions'}
          example={`float wave = sin(uv.x * 10.0);`}
        />
        <FunctionCard
          name="asin(x), acos(x), atan(x)"
          description={isFr ? 'Fonctions trigonométriques inverses' : 'Inverse trigonometric functions'}
          example={`float angle = atan(uv.y, uv.x);`}
        />
        <FunctionCard
          name="pow(x, y)"
          description={isFr ? 'x élevé à la puissance y' : 'x raised to power y'}
          example={`float curve = pow(uv.x, 2.0);`}
        />
        <FunctionCard
          name="exp(x)"
          description={isFr ? 'Exponentielle (e^x)' : 'Exponential (e^x)'}
          example={`float decay = exp(-dist * 10.0);`}
        />
        <FunctionCard
          name="log(x)"
          description={isFr ? 'Logarithme naturel' : 'Natural logarithm'}
          example={`float value = log(uv.x + 1.0);`}
        />
        <FunctionCard
          name="sqrt(x)"
          description={isFr ? 'Racine carrée' : 'Square root'}
          example={`float dist = sqrt(dx*dx + dy*dy);`}
        />
        <FunctionCard
          name="abs(x)"
          description={isFr ? 'Valeur absolue' : 'Absolute value'}
          example={`float dist = abs(uv.x - 0.5);`}
        />
        <FunctionCard
          name="sign(x)"
          description={isFr ? 'Signe (-1, 0, ou 1)' : 'Sign (-1, 0, or 1)'}
          example={`float dir = sign(uv.x - 0.5);`}
        />
        <FunctionCard
          name="min(a, b), max(a, b)"
          description={isFr ? 'Minimum et maximum' : 'Minimum and maximum'}
          example={`float d = min(d1, d2);`}
        />
      </div>
    </div>
  )
}

// WGSL Specific Section
function WGSLSection({ isFr }: { isFr: boolean }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {isFr ? 'Spécificités WGSL' : 'WGSL Specifics'}
      </h3>
      
      <div className="space-y-4">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-3 transition-colors">
            {isFr ? 'Différences Clés avec GLSL' : 'Key Differences from GLSL'}
          </h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>{isFr ? 'Syntaxe Rust-like au lieu de C-like' : 'Rust-like syntax instead of C-like'}</li>
            <li>{isFr ? 'Types explicites requis (f32, i32, u32)' : 'Explicit types required (f32, i32, u32)'}</li>
            <li>{isFr ? 'Pas de surcharge de fonctions' : 'No function overloading'}</li>
            <li>{isFr ? 'Sécurité mémoire améliorée' : 'Improved memory safety'}</li>
            <li>{isFr ? 'Structures et modules supportés' : 'Structures and modules supported'}</li>
          </ul>
        </div>

        <ExampleCard
          title={isFr ? 'Structure WGSL de Base' : 'Basic WGSL Structure'}
          code={`@fragment
fn main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
    let uv = fragCoord / iResolution.xy;
    let color = vec3<f32>(uv.x, uv.y, 0.5);
    return vec4<f32>(color, 1.0);
}`}
          description={isFr ? 'Structure de base d\'un fragment shader WGSL' : 'Basic structure of a WGSL fragment shader'}
        />

        <ExampleCard
          title={isFr ? 'Types WGSL' : 'WGSL Types'}
          code={`// Types scalaires
let f: f32 = 1.0;
let i: i32 = 42;
let u: u32 = 100u;

// Types vectoriels
let v2: vec2<f32> = vec2<f32>(1.0, 2.0);
let v3: vec3<f32> = vec3<f32>(1.0, 2.0, 3.0);
let v4: vec4<f32> = vec4<f32>(1.0, 2.0, 3.0, 4.0);

// Types matriciels
let m2: mat2x2<f32> = mat2x2<f32>(1.0);
let m3: mat3x3<f32> = mat3x3<f32>(1.0);
let m4: mat4x4<f32> = mat4x4<f32>(1.0);

// Texture
var texture: texture_2d<f32>;
var sampler: sampler;`}
          description={isFr ? 'Types de données disponibles en WGSL' : 'Data types available in WGSL'}
        />

        <ExampleCard
          title={isFr ? 'Uniforms et Bindings WGSL' : 'WGSL Uniforms and Bindings'}
          code={`struct Uniforms {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var texture: texture_2d<f32>;
@group(0) @binding(2) var texSampler: sampler;

@fragment
fn main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
    let uv = fragCoord / uniforms.resolution;
    let time = uniforms.time;
    
    let texColor = textureSample(texture, texSampler, uv);
    return texColor;
}`}
          description={isFr ? 'Déclaration d\'uniforms et bindings en WGSL' : 'Declaring uniforms and bindings in WGSL'}
        />
      </div>
    </div>
  )
}

// Converter Section
function ConverterSection({ isFr }: { isFr: boolean }) {
  const [glslCode, setGlslCode] = useState(`void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float time = iTime;
    
    vec3 color = vec3(uv.x, uv.y, sin(time));
    fragColor = vec4(color, 1.0);
}`)
  const [wgslCode, setWgslCode] = useState('')

  const convertGLSLToWGSL = () => {
    let converted = glslCode
    
    // Replace mainImage function signature
    converted = converted.replace(
      /void\s+mainImage\s*\(\s*out\s+vec4\s+fragColor\s*,\s*in\s+vec2\s+fragCoord\s*\)/g,
      '@fragment\nfn main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32>'
    )
    
    // Replace fragColor assignments
    converted = converted.replace(/fragColor\s*=/g, 'return')
    
    // Replace vec2, vec3, vec4 with WGSL syntax
    converted = converted.replace(/\bvec2\b/g, 'vec2<f32>')
    converted = converted.replace(/\bvec3\b/g, 'vec3<f32>')
    converted = converted.replace(/\bvec4\b/g, 'vec4<f32>')
    converted = converted.replace(/\bfloat\b/g, 'f32')
    converted = converted.replace(/\bint\b/g, 'i32')
    
    // Replace iTime, iResolution, iMouse with uniform access
    converted = converted.replace(/\biTime\b/g, 'uniforms.time')
    converted = converted.replace(/\biResolution\b/g, 'uniforms.resolution')
    converted = converted.replace(/\biMouse\b/g, 'uniforms.mouse')
    
    // Add uniform struct if needed
    if (converted.includes('uniforms.')) {
      const uniformStruct = `struct Uniforms {
    time: f32,
    resolution: vec2<f32>,
    mouse: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

`
      converted = uniformStruct + converted
    }
    
    // Replace texture() calls
    converted = converted.replace(/texture\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'textureSample($1, sampler, $2)')
    
    // Replace sampler2D
    converted = converted.replace(/\bsampler2D\b/g, 'texture_2d<f32>')
    
    setWgslCode(converted)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {isFr ? 'Convertisseur GLSL vers WGSL' : 'GLSL to WGSL Converter'}
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isFr ? 'Code GLSL:' : 'GLSL Code:'}
          </label>
          <textarea
            value={glslCode}
            onChange={(e) => setGlslCode(e.target.value)}
            className="w-full h-64 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded font-mono text-sm text-gray-900 dark:text-gray-100 transition-colors"
            placeholder={isFr ? 'Collez votre code GLSL ici...' : 'Paste your GLSL code here...'}
          />
        </div>
        
        <button
          onClick={convertGLSLToWGSL}
          className="w-full bg-discord-blurple hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          {isFr ? 'Convertir en WGSL' : 'Convert to WGSL'}
        </button>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isFr ? 'Code WGSL:' : 'WGSL Code:'}
          </label>
          <textarea
            value={wgslCode}
            readOnly
            className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded font-mono text-sm text-gray-900 dark:text-gray-100 transition-colors"
            placeholder={isFr ? 'Le code WGSL converti apparaîtra ici...' : 'Converted WGSL code will appear here...'}
          />
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            {isFr
              ? '⚠️ Note: Cette conversion est automatique et peut nécessiter des ajustements manuels. Vérifiez toujours le code converti.'
              : '⚠️ Note: This conversion is automatic and may require manual adjustments. Always verify the converted code.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// Tips Section
function TipsSection({ isFr }: { isFr: boolean }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {isFr ? 'Tips Professionnels' : 'Professional Tips'}
      </h3>
      
      <div className="space-y-4">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-2 transition-colors">
            {isFr ? 'Performance' : 'Performance'}
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>{isFr ? 'Utilisez smoothstep() au lieu de step() pour des transitions plus fluides' : 'Use smoothstep() instead of step() for smoother transitions'}</li>
            <li>{isFr ? 'Évitez les boucles avec beaucoup d\'itérations' : 'Avoid loops with many iterations'}</li>
            <li>{isFr ? 'Pré-calculez les valeurs constantes en dehors des boucles' : 'Pre-calculate constant values outside loops'}</li>
            <li>{isFr ? 'Utilisez des textures pour le bruit au lieu de le calculer' : 'Use textures for noise instead of calculating it'}</li>
            <li>{isFr ? 'Limitez les appels de fonctions coûteuses (sqrt, sin, cos)' : 'Limit expensive function calls (sqrt, sin, cos)'}</li>
          </ul>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-2 transition-colors">
            {isFr ? 'Qualité Visuelle' : 'Visual Quality'}
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>{isFr ? 'Utilisez smoothstep() pour des bords anti-aliased' : 'Use smoothstep() for anti-aliased edges'}</li>
            <li>{isFr ? 'Ajoutez du bruit pour casser les patterns répétitifs' : 'Add noise to break repetitive patterns'}</li>
            <li>{isFr ? 'Utilisez des gradients pour donner de la profondeur' : 'Use gradients to add depth'}</li>
            <li>{isFr ? 'Expérimentez avec différents espaces de couleurs (HSV, LAB)' : 'Experiment with different color spaces (HSV, LAB)'}</li>
            <li>{isFr ? 'Ajoutez des effets post-processing (blur, bloom, vignette)' : 'Add post-processing effects (blur, bloom, vignette)'}</li>
          </ul>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-2 transition-colors">
            {isFr ? 'Debugging' : 'Debugging'}
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>{isFr ? 'Visualisez les valeurs avec des couleurs (map to RGB)' : 'Visualize values with colors (map to RGB)'}</li>
            <li>{isFr ? 'Utilisez des couleurs vives pour identifier les problèmes' : 'Use bright colors to identify issues'}</li>
            <li>{isFr ? 'Testez avec des valeurs extrêmes (0.0, 1.0, très grandes)' : 'Test with extreme values (0.0, 1.0, very large)'}</li>
            <li>{isFr ? 'Vérifiez les divisions par zéro' : 'Check for division by zero'}</li>
            <li>{isFr ? 'Utilisez clamp() pour éviter les valeurs invalides' : 'Use clamp() to avoid invalid values'}</li>
          </ul>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-2 transition-colors">
            {isFr ? 'Bonnes Pratiques' : 'Best Practices'}
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>{isFr ? 'Normalisez toujours les coordonnées UV (0.0 à 1.0)' : 'Always normalize UV coordinates (0.0 to 1.0)'}</li>
            <li>{isFr ? 'Utilisez des noms de variables descriptifs' : 'Use descriptive variable names'}</li>
            <li>{isFr ? 'Commentez les algorithmes complexes' : 'Comment complex algorithms'}</li>
            <li>{isFr ? 'Réutilisez les fonctions communes' : 'Reuse common functions'}</li>
            <li>{isFr ? 'Testez sur différentes résolutions' : 'Test on different resolutions'}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Advanced Section - Expanded
function AdvancedSection({ isFr }: { isFr: boolean }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        {isFr ? 'Techniques Avancées' : 'Advanced Techniques'}
      </h3>
      
      <div className="space-y-6">
        <ExampleCard
          title={isFr ? 'Fractales Complexes' : 'Complex Fractals'}
          code={`// Mandelbrot Set
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
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
    
    // Coloration améliorée
    color = sqrt(color);
    vec3 col = vec3(
        sin(color * 3.14159),
        sin(color * 3.14159 + 2.094),
        sin(color * 3.14159 + 4.189)
    ) * 0.5 + 0.5;
    
    fragColor = vec4(col, 1.0);
}`}
          description={isFr ? 'Ensemble de Mandelbrot avec coloration améliorée' : 'Mandelbrot set with enhanced coloring'}
        />

        <ExampleCard
          title={isFr ? 'Raymarching Avancé avec Ombres' : 'Advanced Raymarching with Shadows'}
          code={`float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float scene(vec3 p) {
    return sdSphere(p, 1.0);
}

float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for(int i = 0; i < 100; i++) {
        float d = scene(ro + rd * t);
        if(d < 0.001) return t;
        t += d;
        if(t > 100.0) return -1.0;
    }
    return -1.0;
}

float softShadow(vec3 ro, vec3 rd, float k) {
    float res = 1.0;
    float t = 0.01;
    for(int i = 0; i < 50; i++) {
        float h = scene(ro + rd * t);
        res = min(res, k * h / t);
        t += clamp(h, 0.01, 0.5);
        if(res < 0.001) break;
    }
    return clamp(res, 0.0, 1.0);
}

vec3 calcNormal(vec3 p) {
    float eps = 0.001;
    return normalize(vec3(
        scene(p + vec3(eps, 0, 0)) - scene(p - vec3(eps, 0, 0)),
        scene(p + vec3(0, eps, 0)) - scene(p - vec3(0, eps, 0)),
        scene(p + vec3(0, 0, eps)) - scene(p - vec3(0, 0, eps))
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
    float shadow = softShadow(p + n * 0.01, light, 16.0);
    
    vec3 col = vec3(0.2, 0.4, 0.8) * (0.2 + 0.8 * diff * shadow);
    fragColor = vec4(col, 1.0);
}`}
          description={isFr ? 'Raymarching avec ombres douces et éclairage' : 'Raymarching with soft shadows and lighting'}
        />

        <ExampleCard
          title={isFr ? 'Post-Processing Effects' : 'Post-Processing Effects'}
          code={`uniform sampler2D iChannel0;

// Bloom effect
vec3 bloom(sampler2D tex, vec2 uv, float intensity) {
    vec3 color = texture(tex, uv).rgb;
    vec3 bloomColor = vec3(0.0);
    
    for(int i = -2; i <= 2; i++) {
        for(int j = -2; j <= 2; j++) {
            vec2 offset = vec2(float(i), float(j)) / iResolution.xy * 5.0;
            bloomColor += texture(tex, uv + offset).rgb;
        }
    }
    
    bloomColor /= 25.0;
    float brightness = dot(bloomColor, vec3(0.299, 0.587, 0.114));
    bloomColor *= smoothstep(0.7, 1.0, brightness) * intensity;
    
    return color + bloomColor;
}

// Vignette
vec3 vignette(vec3 color, vec2 uv, float intensity) {
    vec2 center = vec2(0.5);
    float dist = length(uv - center);
    float vignette = 1.0 - smoothstep(0.3, 1.0, dist) * intensity;
    return color * vignette;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    vec3 color = texture(iChannel0, uv).rgb;
    color = bloom(iChannel0, uv, 0.3);
    color = vignette(color, uv, 0.5);
    
    fragColor = vec4(color, 1.0);
}`}
          description={isFr ? 'Effets de post-processing (bloom, vignette)' : 'Post-processing effects (bloom, vignette)'}
        />
      </div>
    </div>
  )
}

// Helper Components
function ExampleCard({
  title,
  code,
  description,
}: {
  title: string
  code: string
  description: string
}) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
      <h4 className="text-gray-900 dark:text-white font-semibold mb-2 transition-colors">{title}</h4>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 transition-colors">{description}</p>
      <pre className="text-xs text-gray-800 dark:text-gray-300 overflow-x-auto bg-white dark:bg-gray-900 p-3 rounded transition-colors border border-gray-200 dark:border-gray-700">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function FunctionCard({
  name,
  description,
  example,
}: {
  name: string
  description: string
  example: string
}) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded border border-gray-300 dark:border-gray-700 transition-colors">
      <div className="flex items-start gap-4">
        <code className="text-discord-blurple font-mono text-lg">{name}</code>
        <div className="flex-1">
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-2 transition-colors">{description}</p>
          <pre className="text-xs text-gray-800 dark:text-gray-400 bg-white dark:bg-gray-900 p-2 rounded overflow-x-auto transition-colors border border-gray-200 dark:border-gray-700">
            <code>{example}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
