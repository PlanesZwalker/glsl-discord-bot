/**
 * Real WebGL Shader Compiler - Version Serverless pour Vercel
 * Compilation WebGL réelle avec animations - Optimisé pour Vercel
 */

const puppeteer = require('puppeteer');
const GIFEncoder = require('gifencoder');
const { PNG } = require('pngjs');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { getBrowserPool } = require('./browser-pool');
const { getShaderCache } = require('./shader-cache');
const { getMetrics } = require('./metrics');
const { WebGLSecurity } = require('./webgl-security');
const { escapeJSStringForTemplate } = require('./utils/jsEscape');
const { Watermark } = require('./utils/watermark');
const { MP4Exporter } = require('./utils/mp4Exporter');

class RealWebGLCompiler {
    constructor() {
        this.browser = null;
        this.page = null;
        // Résolution réduite pour améliorer les performances sur Render.com
        this.canvasWidth = 320;
        this.canvasHeight = 240;
        this.outputDir = './output';
        // FrameRate à 30 fps pour une animation plus fluide
        this.frameRate = 30;
        // Durée réduite pour moins de frames totales
        this.duration = 2.0; // 2 secondes d'animation → 60 frames à 30 fps
        this.isVercel = process.env.VERCEL === '1';
        
        // Browser Pool et Cache
        const maxInstances = parseInt(process.env.MAX_BROWSER_INSTANCES || '2');
        this.browserPool = getBrowserPool(maxInstances);
        this.shaderCache = getShaderCache('./cache/shaders', 24 * 60 * 60 * 1000);
        this.metrics = getMetrics();
        this.webglSecurity = new WebGLSecurity();
        
        // Timeout strict pour les compilations
        this.compilationTimeout = parseInt(process.env.COMPILATION_TIMEOUT || '30000'); // 30 secondes
        
        this.setupOutputDirectory();
    }

    async setupOutputDirectory() {
        try {
            // Sur Vercel, on ne peut pas créer de dossiers persistants
            if (!this.isVercel) {
                await fs.mkdir(this.outputDir, { recursive: true });
            }
        } catch (error) {
            console.log('Dossier output non créé (environnement serverless)');
        }
    }

    async initialize() {
        try {
            console.log('🚀 Initialisation du compilateur WebGL réel...');
            
            // Chercher Chrome d'abord (il devrait être installé pendant le build)
            const path = require('path');
            const fs = require('fs');
            // Sur Render.com, le build installe Chrome dans .cache/puppeteer
            // Le build command utilise $(pwd) qui peut être /opt/render/project ou /opt/render/project/src
            // Au runtime, process.cwd() est généralement /opt/render/project/src
            const rootDir = path.join(process.cwd(), '..'); // /opt/render/project
            const currentDir = process.cwd(); // /opt/render/project/src
            const buildCacheDir = path.join(rootDir, '.cache', 'puppeteer'); // /opt/render/project/.cache/puppeteer
            const projectCacheDir = path.join(currentDir, '.cache', 'puppeteer'); // /opt/render/project/src/.cache/puppeteer
            const systemCacheDir = process.env.PUPPETEER_CACHE_DIR || '/opt/render/.cache/puppeteer';
            // Chercher aussi dans le home directory de l'utilisateur
            const homeCacheDir = process.env.HOME ? path.join(process.env.HOME, '.cache', 'puppeteer') : null;
            // Essayer tous les emplacements possibles
            const cacheDirs = [buildCacheDir, projectCacheDir, systemCacheDir];
            if (homeCacheDir) cacheDirs.push(homeCacheDir);
            let chromePath = null;
            
            console.log('🔍 Recherche de Chrome dans les caches...');
            console.log('📂 Cache build (root):', buildCacheDir);
            console.log('📂 Cache projet:', projectCacheDir);
            console.log('📂 Cache système:', systemCacheDir);
            
            // Chercher Chrome dans tous les caches disponibles
            for (const cacheDir of cacheDirs) {
                if (!fs.existsSync(cacheDir)) {
                    console.log(`📂 Cache ${cacheDir} n'existe pas, on passe au suivant`);
                    continue;
                }
                
                console.log(`🔍 Recherche dans: ${cacheDir}`);
                
                // Méthode 1: Utiliser find
                try {
                    const { execSync } = require('child_process');
                    const findResult = execSync(`find "${cacheDir}" -name chrome -type f 2>/dev/null | head -1`, { 
                        encoding: 'utf8',
                        timeout: 5000
                    }).trim();
                    if (findResult && fs.existsSync(findResult)) {
                        chromePath = findResult;
                        console.log('✅ Chrome trouvé via find:', chromePath);
                        break;
                    }
                } catch (findError) {
                    // Ignorer les erreurs find
                }
                
                // Méthode 2: Parcourir manuellement
                try {
                    const chromeBaseDir = path.join(cacheDir, 'chrome');
                    if (fs.existsSync(chromeBaseDir)) {
                        const versions = fs.readdirSync(chromeBaseDir);
                        for (const version of versions) {
                            const chromeDir = path.join(chromeBaseDir, version, 'chrome-linux64');
                            const potentialChrome = path.join(chromeDir, 'chrome');
                            if (fs.existsSync(potentialChrome)) {
                                chromePath = potentialChrome;
                                console.log('✅ Chrome trouvé en parcourant:', chromePath);
                                break;
                            }
                        }
                        if (chromePath) break;
                    }
                } catch (dirError) {
                    // Ignorer les erreurs de parcours
                }
            }
            
            if (!chromePath) {
                console.warn('⚠️ Chrome non trouvé dans les caches, installation nécessaire');
            }
            
            // Options optimisées pour Render.com et serveurs
            // IMPORTANT: Flags WebGL nécessaires pour le mode headless
            // Adapter les flags selon l'OS (Windows vs Linux/Render.com)
            const os = require('os');
            const isWindows = os.platform() === 'win32';
            const isLinux = os.platform() === 'linux';
            
            const webglFlags = [];
            if (isWindows) {
                // Sur Windows, utiliser ANGLE
                webglFlags.push('--use-gl=angle', '--use-angle=gl');
            } else if (isLinux) {
                // Sur Linux (Render.com), essayer plusieurs stratégies
                // Ne pas spécifier de backend GL pour laisser Chrome choisir automatiquement
                // Chrome devrait utiliser SwiftShader automatiquement en headless sans GPU
                console.log('📌 Configuration Linux: laisser Chrome choisir automatiquement le backend GL');
                // Ne pas ajouter de flags --use-gl, laisser Chrome décider
            }
            // Si ni Windows ni Linux, laisser Chrome choisir automatiquement
            
            const launchOptions = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--no-first-run',
                    '--disable-extensions',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-ipc-flooding-protection',
                    '--disable-hang-monitor',
                    '--disable-prompt-on-repost',
                    '--disable-sync',
                    '--disable-translate',
                    '--disable-default-apps',
                    '--disable-features=TranslateUI',
                    '--disable-component-extensions-with-background-pages',
                    // Flags WebGL/WebGPU pour mode headless
                    '--enable-webgl',
                    '--enable-webgl2',
                    '--enable-unsafe-swiftshader',
                    '--enable-unsafe-webgpu',
                    ...webglFlags, // Flags spécifiques à l'OS
                    '--enable-accelerated-2d-canvas',
                    '--ignore-gpu-blacklist',
                    '--ignore-gpu-blocklist',
                    '--enable-features=VaapiVideoDecoder,WebGPU'
                ],
                protocolTimeout: 60000,
                timeout: 60000
            };
            
            // Utiliser le chemin de Chrome trouvé ou celui de l'environnement
            if (chromePath) {
                launchOptions.executablePath = chromePath;
                console.log('📌 Utilisation du chemin explicite de Chrome:', chromePath);
            } else if (process.env.PUPPETEER_EXECUTABLE_PATH) {
                launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
                console.log('📌 Utilisation de PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
            } else {
                // Configurer le cache directory pour Puppeteer (utiliser le cache du build en priorité)
                process.env.PUPPETEER_CACHE_DIR = buildCacheDir;
                console.log('📌 Configuration PUPPETEER_CACHE_DIR:', buildCacheDir);
            }

            try {
            this.browser = await puppeteer.launch(launchOptions);
                console.log('✅ Puppeteer lancé avec succès');
            } catch (error) {
                // Si Chrome n'est pas trouvé, essayer de l'installer
                if (error.message && error.message.includes('Could not find Chrome')) {
                    console.warn('⚠️ Chrome non trouvé, tentative d\'installation...');
                    console.warn('⏳ Cela peut prendre 1-2 minutes, veuillez patienter...');
                    
                    // Si une installation est déjà en cours, attendre
                    if (this.isInstallingChrome && this.chromeInstallPromise) {
                        console.log('⏳ Installation de Chrome déjà en cours, attente...');
                        try {
                            await this.chromeInstallPromise;
                        } catch (installError) {
                            console.error('❌ Erreur lors de l\'installation précédente:', installError.message);
                            this.browser = null;
                            this.page = null;
                            return;
                        }
                    } else {
                        // Démarrer une nouvelle installation
                        this.isInstallingChrome = true;
                        const installCacheDir = buildCacheDir;
                        
                        this.chromeInstallPromise = (async () => {
                            try {
                                const { execSync } = require('child_process');
                                const installCacheParent = path.dirname(installCacheDir);
                                if (!fs.existsSync(installCacheParent)) {
                                    fs.mkdirSync(installCacheParent, { recursive: true });
                                    console.log('📁 Dossier cache créé:', installCacheParent);
                                }
                                console.log('📦 Installation de Chrome dans:', installCacheDir);
                                execSync('npx puppeteer browsers install chrome', { 
                                    stdio: 'inherit',
                                    timeout: 120000,
                                    env: { ...process.env, PUPPETEER_CACHE_DIR: installCacheDir }
                                });
                                console.log('✅ Chrome installé avec succès');
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                this.isInstallingChrome = false;
                            } catch (installError) {
                                console.error('❌ Erreur lors de l\'installation de Chrome:', installError.message);
                                this.isInstallingChrome = false;
                                throw installError;
                            }
                        })();
                        
                        try {
                            await this.chromeInstallPromise;
                            
                            // Après installation, trouver Chrome et réessayer
                            let chromePathAfterInstall = null;
                            try {
                                const { execSync } = require('child_process');
                                const findResult = execSync(`find "${installCacheDir}" -name chrome -type f 2>/dev/null | head -1`, { 
                                    encoding: 'utf8',
                                    timeout: 5000
                                }).trim();
                                if (findResult && fs.existsSync(findResult)) {
                                    chromePathAfterInstall = findResult;
                                    console.log('✅ Chrome trouvé via find:', chromePathAfterInstall);
                                }
                            } catch (findError) {
                                // Ignorer
                            }
                            
                            if (!chromePathAfterInstall) {
                                try {
                                    const chromeBaseDir = path.join(installCacheDir, 'chrome');
                                    if (fs.existsSync(chromeBaseDir)) {
                                        const versions = fs.readdirSync(chromeBaseDir);
                                        for (const version of versions) {
                                            const chromeDir = path.join(chromeBaseDir, version, 'chrome-linux64');
                                            const potentialChrome = path.join(chromeDir, 'chrome');
                                            if (fs.existsSync(potentialChrome)) {
                                                chromePathAfterInstall = potentialChrome;
                                                console.log('✅ Chrome trouvé en parcourant:', chromePathAfterInstall);
                                                break;
                                            }
                                        }
                                    }
                                } catch (dirError) {
                                    // Ignorer
                                }
                            }
                            
                            if (chromePathAfterInstall) {
                                launchOptions.executablePath = chromePathAfterInstall;
                                console.log('📌 Utilisation du chemin explicite:', chromePathAfterInstall);
            this.browser = await puppeteer.launch(launchOptions);
                                console.log('✅ Puppeteer lancé avec succès après installation');
                            } else {
                                console.warn('⚠️ Chrome installé mais non trouvé - réessayez dans quelques instants');
                                this.browser = null;
                                this.page = null;
                                return;
                            }
                        } catch (installError) {
                            console.error('❌ Erreur lors de l\'installation de Chrome:', installError.message);
                            this.browser = null;
                            this.page = null;
                            return;
                        }
                    }
                } else {
                    // Si c'est une autre erreur, la propager
                    throw error;
                }
            }
            
            // Vérifier que le browser est disponible avant de continuer
            if (!this.browser) {
                console.warn('⚠️ Browser non disponible - initialisation WebGL incomplète');
                return; // Sortir sans créer de page
            }
            
            this.page = await this.browser.newPage();
            
            // Définir des limites strictes
            await this.page.setDefaultTimeout(10000); // 10s par opération
            await this.page.setDefaultNavigationTimeout(10000);
            
            // Bloquer tous les chargements externes
            await this.page.setRequestInterception(true);
            this.page.on('request', request => {
                const url = request.url();
                
                // Autoriser seulement data: URIs et about:blank
                if (url.startsWith('data:') || url.startsWith('about:')) {
                    request.continue();
                } else {
                    console.warn(`🚫 Requête bloquée: ${url}`);
                    request.abort();
                }
            });
            
            // Injecter Content Security Policy strict
            await this.page.setExtraHTTPHeaders({
                'Content-Security-Policy': [
                    "default-src 'none'",
                    "script-src 'unsafe-inline' 'unsafe-eval'", // Nécessaire pour WebGL
                    "style-src 'unsafe-inline'",
                    "img-src data:",
                    "connect-src 'none'",
                    "font-src 'none'",
                    "object-src 'none'",
                    "media-src 'none'",
                    "frame-src 'none'"
                ].join('; ')
            });
            
            // Capturer les erreurs de console pour déboguer
            this.page.on('console', msg => {
                const type = msg.type();
                const text = msg.text();
                if (type === 'error') {
                    console.error('❌ Erreur console browser:', text);
                } else if (type === 'warning') {
                    console.warn('⚠️ Warning console browser:', text);
                } else {
                    console.log(`📝 Console browser [${type}]:`, text);
                }
            });
            
            // Capturer les erreurs de page
            this.page.on('pageerror', error => {
                console.error('❌ Erreur page:', error.message);
            });
            
            await this.page.setViewport({
                width: this.canvasWidth,
                height: this.canvasHeight
            });

            // Charger le template WebGL
            await this.loadWebGLTemplate();
            
            console.log('✅ Compilateur WebGL réel initialisé');
            
        } catch (error) {
            console.error('❌ Erreur initialisation WebGL:', error);
            // Si Chrome n'est pas trouvé, se ferme immédiatement, ou si WebGL n'est pas disponible, ne pas faire échouer complètement
            if (error.message && (
                error.message.includes('Could not find Chrome') ||
                error.message.includes('Target closed') ||
                error.message.includes('Protocol error') ||
                error.message.includes('updateShader n\'est pas disponible') ||
                error.message.includes('WebGL')
            )) {
                console.warn('⚠️ WebGL non disponible - les shaders ne pourront pas être compilés');
                console.warn('⚠️ Le bot va continuer à fonctionner, mais les shaders ne pourront pas être compilés');
                // Ne pas throw, permettre au bot de continuer
                this.browser = null;
                this.page = null;
                return;
            }
            throw error;
        }
    }

    async loadWebGLTemplate() {
        // Pré-échapper les chaînes JavaScript pour éviter les problèmes d'apostrophes
        const errorInitMsg = escapeJSStringForTemplate('❌ Erreur lors de l\'initialisation WebGL/WebGPU:');
        const errorImageMsg = escapeJSStringForTemplate('Impossible de charger l\'image: ');
        const errorInitWebGLMsg = escapeJSStringForTemplate('❌ WebGL non disponible, impossible d\'initialiser');
        const waitInitMsg = escapeJSStringForTemplate('⏳ Attente de l\'initialisation WebGL/WebGPU...');
        
        const template = `
<!DOCTYPE html>
<html>
<head>
    <title>GLSL Shader Animation</title>
    <style>
        body { margin: 0; padding: 0; background: #000; }
        canvas { display: block; }
    </style>
</head>
<body>
    <canvas id="shaderCanvas" width="${this.canvasWidth}" height="${this.canvasHeight}"></canvas>
    <script>
        // Capturer les erreurs de console
        window.consoleErrors = [];
        const originalError = console.error;
        console.error = function(...args) {
            window.consoleErrors.push(args.join(' '));
            originalError.apply(console, args);
        };
        
        const canvas = document.getElementById('shaderCanvas');
        
        // Variables globales pour WebGL et WebGPU
        let gl = null;
        let gpu = null;
        let device = null;
        let context = null;
        let format = null;
        let useWebGPU = false;
        
        // Essayer WebGPU en premier (meilleur support headless)
        (async function() {
            if (navigator.gpu) {
                console.log('🔍 Tentative WebGPU...');
                try {
                    const adapter = await navigator.gpu.requestAdapter();
                    if (adapter) {
                        device = await adapter.requestDevice();
                        context = canvas.getContext('webgpu');
                        if (context) {
                            const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
                            context.configure({
                                device: device,
                                format: canvasFormat
                            });
                            gpu = navigator.gpu;
                            useWebGPU = true;
                            console.log('✅ WebGPU initialisé ! Format:', canvasFormat);
                        }
                    }
                } catch (error) {
                    console.log('⚠️ WebGPU non disponible:', error.message);
                }
            }
            
            // Essayer WebGL (fallback et pour compatibilité GLSL) après avoir tenté WebGPU
            if (!useWebGPU) {
                try {
                console.log('🔍 Tentative WebGL...');
                // Attendre plus longtemps pour que le contexte soit prêt (surtout sur Render.com)
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Essayer plusieurs fois avec des délais
                for (let attempt = 0; attempt < 5; attempt++) {
                    gl = canvas.getContext('webgl2', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        depth: false,
                        stencil: false,
                        alpha: false,
                        premultipliedAlpha: false
                    }) || canvas.getContext('webgl', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        depth: false,
                        stencil: false,
                        alpha: false,
                        premultipliedAlpha: false
                    }) || canvas.getContext('experimental-webgl', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        depth: false,
                        stencil: false,
                        alpha: false,
                        premultipliedAlpha: false
                    });
                    
                    if (gl) {
                        console.log('✅ WebGL obtenu à la tentative', attempt + 1);
                        break;
                    }
                    
                    if (attempt < 4) {
                        console.log('⏳ Tentative', attempt + 1, 'echouee, nouvelle tentative dans 200ms...');
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
                
                if (!gl) {
                    // Dernière tentative avec options forcées
                    gl = canvas.getContext('webgl', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        depth: false,
                        stencil: false,
                        alpha: false,
                        premultipliedAlpha: false,
                        powerPreference: 'default',
                        failIfMajorPerformanceCaveat: false
                    }) || canvas.getContext('experimental-webgl', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        depth: false,
                        stencil: false,
                        alpha: false,
                        premultipliedAlpha: false,
                        powerPreference: 'default',
                        failIfMajorPerformanceCaveat: false
                    });
                }
                
                if (gl) {
                    console.log('✅ WebGL initialisé:', gl.getParameter(gl.VERSION));
                    console.log('✅ WebGL Vendor:', gl.getParameter(gl.VENDOR));
                    console.log('✅ WebGL Renderer:', gl.getParameter(gl.RENDERER));
                } else {
                    console.warn('⚠️ WebGL non disponible. Vérifiez les flags Chrome.');
                    console.warn('⚠️ Canvas disponible:', !!canvas);
                    console.warn('⚠️ getContext disponible:', typeof canvas.getContext === 'function');
                    // Essayer de diagnostiquer pourquoi
                    try {
                        const testContext = canvas.getContext('2d');
                        console.warn('⚠️ Contexte 2D disponible:', !!testContext);
                    } catch (e) {
                        console.warn('⚠️ Erreur test contexte 2D:', e.message);
                    }
                    // Essayer SwiftShader explicitement si EGL a échoué
                    console.log('🔄 Tentative avec SwiftShader...');
                    gl = canvas.getContext('webgl', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        depth: false,
                        stencil: false,
                        alpha: false,
                        premultipliedAlpha: false,
                        powerPreference: 'low-power',
                        failIfMajorPerformanceCaveat: false,
                        desynchronized: false
                    });
                    if (gl) {
                        console.log('✅ WebGL initialisé avec SwiftShader:', gl.getParameter(gl.VERSION));
                    } else {
                        console.error('❌ WebGL toujours non disponible après toutes les tentatives');
                    }
                }
                
                // Définir window.gl après l'initialisation
                window.gl = gl;
                window.gpu = gpu;
                window.useWebGPU = useWebGPU;
                
                // Marquer l'initialisation comme terminée
                window.webglInitialized = true;
                window.webglInitializationError = gl ? null : 'WebGL non disponible après toutes les tentatives';
                
                // Exposer les variables nécessaires pour renderFrame
                if (gl && shaderProgram) {
                    window.shaderProgram = shaderProgram;
                    window.timeLocation = timeLocation;
                    window.resolutionLocation = resolutionLocation;
                    window.mouseLocation = mouseLocation;
                    window.textureLocations = textureLocations;
                    window.textures = textures;
                    window.vertexBuffer = vertexBuffer;
                }
                } catch (error) {
                    console.error(${errorInitMsg}, error);
                    window.webglInitialized = true;
                    window.webglInitializationError = error.message;
                }
            }
        })();
        
        // Définir des valeurs par défaut pour le diagnostic (seront mises à jour par la IIFE)
        window.gl = null;
        window.gpu = null;
        window.useWebGPU = false;
        window.webglInitialized = false;
        window.webglInitializationError = null;
        
        console.log('📝 Définition de window.updateShader...');
        
        // Définir window.updateShader tôt pour qu'elle soit toujours disponible
        window.updateShader = function(newShaderCode, textureUrls) {
            console.log('🔧 updateShader appelée, gl disponible:', !!gl);
            if (!gl) {
                console.error('❌ WebGL non disponible, impossible de mettre à jour le shader');
                return false;
            }
            // Cette fonction sera redéfinie plus tard avec l'implémentation complète
            return false;
        };
        
        window.loadTextures = async function(textureUrls) {
            if (!gl) {
                console.error('❌ WebGL non disponible, impossible de charger les textures');
                return false;
            }
            return false;
        };
        
        console.log('✅ window.updateShader définie:', typeof window.updateShader);

        // Variables globales
        let shaderProgram;
        let vertexBuffer;
        let timeLocation;
        let resolutionLocation;
        let mouseLocation;
        let startTime;
        let textureLocations = []; // iChannel0, iChannel1, iChannel2, iChannel3
        let textures = [null, null, null, null]; // Textures WebGL

        // Vertex shader simple
        const vertexShaderSource = 
            'attribute vec2 a_position;' +
            'void main() {' +
            '    gl_Position = vec4(a_position, 0.0, 1.0);' +
            '}';

        // Fragment shader template (sera remplacé)
        let fragmentShaderSource = 
            'precision mediump float;' +
            'uniform float iTime;' +
            'uniform vec2 iResolution;' +
            'uniform vec2 iMouse;' +
            'uniform sampler2D iChannel0;' +
            'uniform sampler2D iChannel1;' +
            'uniform sampler2D iChannel2;' +
            'uniform sampler2D iChannel3;' +
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {' +
            '    vec2 uv = fragCoord/iResolution.xy;' +
            '    vec2 p = (2.0*fragCoord-iResolution.xy)/min(iResolution.y,iResolution.x);' +
            '    float t = iTime * 0.5;' +
            '    vec3 col = vec3(uv, 0.5);' +
            '    fragColor = vec4(col, 1.0);' +
            '}' +
            'void main() {' +
            '    mainImage(gl_FragColor, gl_FragCoord.xy);' +
            '}';
        
        // Fonction pour charger une texture depuis une URL
        function loadTexture(url, index) {
            return new Promise((resolve, reject) => {
                if (!url) {
                    resolve(null);
                    return;
                }
                
                const img = new Image();
                img.crossOrigin = 'anonymous'; // Permettre CORS
                
                img.onload = function() {
                    try {
                        const texture = gl.createTexture();
                        gl.bindTexture(gl.TEXTURE_2D, texture);
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        
                        // Nettoyer l'ancienne texture si elle existe
                        if (textures[index]) {
                            gl.deleteTexture(textures[index]);
                        }
                        
                        textures[index] = texture;
                        console.log('✅ Texture ' + index + ' chargée depuis ' + url);
                        resolve(texture);
                    } catch (error) {
                        console.error('❌ Erreur création texture ' + index + ':', error);
                        reject(error);
                    }
                };
                
                img.onerror = function() {
                    console.error('❌ Erreur chargement image ' + url);
                    reject(new Error(${errorImageMsg} + url));
                };
                
                img.src = url;
            });
        }

        // Initialisation WebGL
        function initWebGL() {
            if (!gl) {
                console.error(${errorInitWebGLMsg});
                return false;
            }
            
            try {
            // Créer le programme de shader
            const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
            
            shaderProgram = createProgram(vertexShader, fragmentShader);
            } catch (error) {
                console.error('❌ Erreur création programme shader:', error);
                return false;
            }
            
            // Obtenir les locations des uniforms
            timeLocation = gl.getUniformLocation(shaderProgram, 'iTime');
            resolutionLocation = gl.getUniformLocation(shaderProgram, 'iResolution');
            mouseLocation = gl.getUniformLocation(shaderProgram, 'iMouse');
            
            // Obtenir les locations des textures
            textureLocations = [
                gl.getUniformLocation(shaderProgram, 'iChannel0'),
                gl.getUniformLocation(shaderProgram, 'iChannel1'),
                gl.getUniformLocation(shaderProgram, 'iChannel2'),
                gl.getUniformLocation(shaderProgram, 'iChannel3')
            ];
            
            // Créer le buffer de vertex (quad plein écran)
            const positions = new Float32Array([
                -1, -1,
                 1, -1,
                -1,  1,
                 1,  1
            ]);
            
            vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            
            // Exposer vertexBuffer globalement
            window.vertexBuffer = vertexBuffer;
            
            // Configuration des attributs
            const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        }

        function createShader(type, source) {
            // Vérifier que WebGL est fonctionnel
            if (!gl) {
                throw new Error('WebGL context is not available');
            }
            
            // Vérifier que le contexte WebGL n'est pas perdu
            const isContextLost = gl.isContextLost ? gl.isContextLost() : false;
            if (isContextLost) {
                throw new Error('WebGL context has been lost');
            }
            
            const shader = gl.createShader(type);
            if (!shader) {
                throw new Error('Failed to create shader object. WebGL may not be functional.');
            }
            
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            
            // Vérifier le statut de compilation
            const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            if (!compileStatus) {
                const errorLog = gl.getShaderInfoLog(shader);
                const shaderTypeName = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
                
                // Construire un message d'erreur détaillé (utiliser concaténation pour éviter template literals imbriqués)
                let errorMessage = errorLog;
                if (!errorMessage || errorMessage.trim() === '') {
                    // Si pas de message d'erreur, essayer d'obtenir plus d'infos
                    const shaderSourcePreview = source.substring(0, 200).replace(/\\n/g, ' ').trim();
                    // Vérifier si WebGL est vraiment fonctionnel
                    const glError = gl.getError();
                    const glErrorString = glError !== gl.NO_ERROR ? ' (WebGL error code: ' + glError + ')' : '';
                    errorMessage = 'Shader ' + shaderTypeName + ' compilation failed (no error log available)' + glErrorString + '. Source preview: ' + shaderSourcePreview + '...';
                } else {
                    errorMessage = 'Shader ' + shaderTypeName + ' compilation error: ' + errorLog;
                }
                
                console.error('Erreur compilation shader:', errorMessage);
                
                // Stocker l'erreur dans window pour qu'elle soit accessible depuis Puppeteer
                window.lastShaderError = errorMessage;
                window.lastShaderErrorDetails = {
                    type: shaderTypeName,
                    errorLog: errorLog || null,
                    sourcePreview: source.substring(0, 500),
                    compileStatus: compileStatus,
                    deleteStatus: gl.getShaderParameter(shader, gl.DELETE_STATUS),
                    glError: gl.getError(),
                    shaderCreated: !!shader
                };
                
                // Nettoyer le shader avant de throw
                gl.deleteShader(shader);
                
                throw new Error(errorMessage);
            }
            
            return shader;
        }

        function createProgram(vertexShader, fragmentShader) {
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                const linkErrorLog = gl.getProgramInfoLog(program);
                const errorMessage = linkErrorLog && linkErrorLog.trim() !== '' 
                    ? 'Program linking error: ' + linkErrorLog
                    : 'Program linking failed (no error log available)';
                
                console.error('Erreur liaison programme:', errorMessage);
                
                // Stocker l'erreur de liaison aussi
                if (!window.lastShaderError) {
                    window.lastShaderError = errorMessage;
                    window.lastShaderErrorDetails = {
                        type: 'LINK',
                        errorLog: linkErrorLog,
                        linkStatus: gl.getProgramParameter(program, gl.LINK_STATUS),
                        validateStatus: gl.getProgramParameter(program, gl.VALIDATE_STATUS)
                    };
                }
                
                throw new Error(errorMessage);
            }
            
            return program;
        }

        function render(time) {
            // Ne pas rendre si aucun shader n'est chargé
            if (!shaderProgram || !gl || !vertexBuffer) {
                return;
            }
            
            const currentTime = (time - startTime) / 1000.0;
            
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            gl.useProgram(shaderProgram);
            
            // Configurer le vertex buffer et les attributs
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
            if (positionLocation >= 0) {
                gl.enableVertexAttribArray(positionLocation);
                gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            }
            
            // Mettre à jour les uniforms
            if (timeLocation) gl.uniform1f(timeLocation, currentTime);
            if (resolutionLocation) gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
            if (mouseLocation) gl.uniform2f(mouseLocation, 0.5, 0.5); // Position souris par défaut
            
            // Activer et lier les textures
            for (let i = 0; i < 4; i++) {
                if (textures[i] && textureLocations[i]) {
                    gl.activeTexture(gl.TEXTURE0 + i);
                    gl.bindTexture(gl.TEXTURE_2D, textures[i]);
                    gl.uniform1i(textureLocations[i], i);
                }
            }
            
            // Dessiner le quad
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        let animationId = null;
        function animate() {
            const time = performance.now();
            render(time);
            animationId = requestAnimationFrame(animate);
        }

        // Fonction pour arrêter l'animation
        window.stopAnimation = function() {
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        };
        
        // Fonction pour redémarrer l'animation
        window.startAnimation = function() {
            if (animationId === null) {
                animate();
            }
        };

        // Fonction pour charger des textures
        window.loadTextures = async function(textureUrls) {
            try {
                const promises = [];
                for (let i = 0; i < 4; i++) {
                    if (textureUrls && textureUrls[i]) {
                        promises.push(loadTexture(textureUrls[i], i));
                    } else {
                        promises.push(Promise.resolve(null));
                    }
                }
                await Promise.all(promises);
                console.log('✅ Toutes les textures chargées');
                return true;
            } catch (error) {
                console.error('❌ Erreur chargement textures:', error);
                return false;
            }
        };
        
        // Fonction pour changer le fragment shader
        window.updateShader = function(newShaderCode, textureUrls) {
            if (!gl) {
                console.error('❌ WebGL non disponible, impossible de mettre à jour le shader');
                window.lastShaderError = 'WebGL context is not available';
                return false;
            }
            
            // Vérifier que le contexte WebGL n'est pas perdu
            if (gl.isContextLost && gl.isContextLost()) {
                console.error('❌ WebGL context has been lost');
                window.lastShaderError = 'WebGL context has been lost';
                return false;
            }
            
            try {
                // Mettre à jour le fragment shader (utiliser concaténation pour éviter template literals imbriqués)
                fragmentShaderSource = 
                    'precision mediump float;' +
                    'uniform float iTime;' +
                    'uniform vec2 iResolution;' +
                    'uniform vec2 iMouse;' +
                    'uniform sampler2D iChannel0;' +
                    'uniform sampler2D iChannel1;' +
                    'uniform sampler2D iChannel2;' +
                    'uniform sampler2D iChannel3;' +
                    newShaderCode +
                    'void main() {' +
                    '    mainImage(gl_FragColor, gl_FragCoord.xy);' +
                    '}';
                
                // S'assurer que le vertex buffer existe
                if (!vertexBuffer) {
                    const positions = new Float32Array([
                        -1, -1,
                         1, -1,
                        -1,  1,
                         1,  1
                    ]);
                    vertexBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
                    window.vertexBuffer = vertexBuffer;
                }
                
                // Recréer le programme
                const newFragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
                const newVertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
                const newProgram = createProgram(newVertexShader, newFragmentShader);
                
                // Nettoyer l'ancien programme
                if (shaderProgram) {
                    gl.deleteProgram(shaderProgram);
                }
                shaderProgram = newProgram;
                
                // Mettre à jour les locations
                timeLocation = gl.getUniformLocation(shaderProgram, 'iTime');
                resolutionLocation = gl.getUniformLocation(shaderProgram, 'iResolution');
                mouseLocation = gl.getUniformLocation(shaderProgram, 'iMouse');
                
                // Mettre à jour les locations des textures
                textureLocations = [
                    gl.getUniformLocation(shaderProgram, 'iChannel0'),
                    gl.getUniformLocation(shaderProgram, 'iChannel1'),
                    gl.getUniformLocation(shaderProgram, 'iChannel2'),
                    gl.getUniformLocation(shaderProgram, 'iChannel3')
                ];
                
                // Configurer les attributs de vertex (nécessaire après création du programme)
                gl.useProgram(shaderProgram);
                const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
                if (positionLocation >= 0) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
                    gl.enableVertexAttribArray(positionLocation);
                    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
                }
                
                // Mettre à jour les variables globales pour renderFrame
                window.shaderProgram = shaderProgram;
                window.timeLocation = timeLocation;
                window.resolutionLocation = resolutionLocation;
                window.mouseLocation = mouseLocation;
                window.textureLocations = textureLocations;
                
                // Charger les textures si fournies
                if (textureUrls) {
                    window.loadTextures(textureUrls).catch(err => {
                        console.error('Erreur chargement textures:', err);
                    });
                }
                
                console.log('Shader mis à jour avec succès');
                return true;
            } catch (error) {
                // S'assurer que l'erreur est stockée dans window.lastShaderError si elle n'y est pas déjà
                if (!window.lastShaderError) {
                    let errorMsg = 'Erreur inconnue';
                    try {
                        if (error && error.message) {
                            errorMsg = error.message;
                        } else if (error && error.toString) {
                            errorMsg = error.toString();
                        } else if (typeof error === 'string') {
                            errorMsg = error;
                        } else {
                            errorMsg = JSON.stringify(error);
                        }
                    } catch (e) {
                        errorMsg = String(error);
                    }
                    window.lastShaderError = errorMsg;
                    window.lastShaderErrorDetails = {
                        message: errorMsg,
                        stack: error && error.stack ? error.stack : null,
                        name: error && error.name ? error.name : 'Error'
                    };
                }
                console.error('Erreur mise à jour shader:', window.lastShaderError || error);
                return false;
            }
        };
        
        // Fonction pour forcer un rendu avec un temps spécifique
        window.renderFrame = function(time) {
            const gl = window.gl;
            const shaderProgram = window.shaderProgram;
            const vertexBuffer = window.vertexBuffer;
            const timeLocation = window.timeLocation;
            const resolutionLocation = window.resolutionLocation;
            const mouseLocation = window.mouseLocation;
            const textureLocations = window.textureLocations || [];
            const textures = window.textures || [];
            const canvas = document.getElementById('shaderCanvas');
            
            if (!gl || !shaderProgram || !vertexBuffer || !canvas) {
                console.warn('⚠️ renderFrame: ressources manquantes', {
                    hasGl: !!gl,
                    hasProgram: !!shaderProgram,
                    hasBuffer: !!vertexBuffer,
                    hasCanvas: !!canvas
                });
                return false;
            }
            
            const currentTime = time;
            
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.0, 0.0, 0.0, 1.0); // Fond noir
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            gl.useProgram(shaderProgram);
            
            // Configurer le vertex buffer et les attributs
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
            if (positionLocation >= 0) {
                gl.enableVertexAttribArray(positionLocation);
                gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            } else {
                console.warn('⚠️ renderFrame: positionLocation invalide');
                return false;
            }
            
            // Mettre à jour les uniforms
            if (timeLocation) gl.uniform1f(timeLocation, currentTime);
            if (resolutionLocation) gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
            if (mouseLocation) gl.uniform2f(mouseLocation, 0.5, 0.5);
            
            // Activer et lier les textures
            for (let i = 0; i < 4; i++) {
                if (textures[i] && textureLocations[i]) {
                    gl.activeTexture(gl.TEXTURE0 + i);
                    gl.bindTexture(gl.TEXTURE_2D, textures[i]);
                    gl.uniform1i(textureLocations[i], i);
                }
            }
            
            // Dessiner le quad
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            
            // Forcer la fin du rendu
            gl.finish();
            
            return true;
        };
        
        // Fonction pour mettre à jour un shader WGSL
        window.updateShaderWGSL = async function(wgslCode, textureUrls) {
            if (!useWebGPU || !device || !context) {
                console.error('❌ WebGPU non disponible, impossible de mettre à jour le shader WGSL');
                return false;
            }
            
            try {
                // Créer le shader module
                const shaderModule = device.createShaderModule({
                    label: 'Fragment shader',
                    code: wgslCode
                });
                
                // Créer le buffer uniform pour iTime, iResolution, iMouse
                uniformBuffer = device.createBuffer({
                    size: 5 * 4, // 5 floats (iTime, iResolution.x, iResolution.y, iMouse.x, iMouse.y)
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                });
                
                // Créer le render pipeline
                renderPipeline = device.createRenderPipeline({
                    label: 'Shader pipeline',
                    layout: 'auto',
                    vertex: {
                        module: device.createShaderModule({
                            code: 
                                '@vertex' +
                                'fn vs_main(@builtin(vertex_index) in_vertex_index: u32) -> @builtin(position) vec4<f32> {' +
                                '    var p = vec2<f32>(0.0, 0.0);' +
                                '    if (in_vertex_index == 0u) { p = vec2<f32>(-1.0, -1.0); }' +
                                '    if (in_vertex_index == 1u) { p = vec2<f32>( 1.0, -1.0); }' +
                                '    if (in_vertex_index == 2u) { p = vec2<f32>(-1.0,  1.0); }' +
                                '    if (in_vertex_index == 3u) { p = vec2<f32>( 1.0,  1.0); }' +
                                '    return vec4<f32>(p, 0.0, 1.0);' +
                                '}'
                        }),
                        entryPoint: 'vs_main'
                    },
                    fragment: {
                        module: shaderModule,
                        entryPoint: 'main',
                        targets: [{ format: canvasFormat }]
                    },
                    primitive: {
                        topology: 'triangle-strip'
                    }
                });
                
                // Charger les textures si fournies
                if (textureUrls) {
                    await window.loadTexturesWGSL(textureUrls);
                }
                
                // Créer le bind group
                const bindGroupEntries = [
                    { binding: 0, resource: { buffer: uniformBuffer } }
                ];
                
                // Ajouter les textures au bind group
                for (let i = 0; i < 4; i++) {
                    if (textureViews[i]) {
                        bindGroupEntries.push({ binding: i + 1, resource: textureViews[i] });
                        bindGroupEntries.push({ binding: i + 5, resource: textureSamplers[i] || device.createSampler() });
                    }
                }
                
                bindGroup = device.createBindGroup({
                    layout: renderPipeline.getBindGroupLayout(0),
                    entries: bindGroupEntries
                });
                
                console.log('✅ Shader WGSL mis à jour avec succès');
                return true;
            } catch (error) {
                console.error('❌ Erreur mise à jour shader WGSL:', error);
                return false;
            }
        };
        
        // Fonction pour charger des textures pour WebGPU
        window.loadTexturesWGSL = async function(textureUrls) {
            if (!device) return false;
            
            try {
                for (let i = 0; i < 4; i++) {
                    if (textureUrls && textureUrls[i]) {
                        const img = await new Promise((resolve, reject) => {
                            const image = new Image();
                            image.crossOrigin = 'anonymous';
                            image.onload = () => resolve(image);
                            image.onerror = reject;
                            image.src = textureUrls[i];
                        });
                        
                        const texture = device.createTexture({
                            size: [img.width, img.height],
                            format: 'rgba8unorm',
                            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
                        });
                        
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, img.width, img.height);
                        
                        device.queue.writeTexture(
                            { texture: texture },
                            imageData.data,
                            { bytesPerRow: img.width * 4 },
                            [img.width, img.height]
                        );
                        
                        textureViews[i] = texture.createView();
                        textureSamplers[i] = device.createSampler({
                            magFilter: 'linear',
                            minFilter: 'linear'
                        });
                        
                        console.log('✅ Texture WGSL ' + i + ' chargée depuis ' + textureUrls[i]);
                    }
                }
                return true;
            } catch (error) {
                console.error('❌ Erreur chargement textures WGSL:', error);
                return false;
            }
        };
        
        // Fonction de rendu WebGPU
        function renderWebGPU(time) {
            if (!useWebGPU || !device || !context || !renderPipeline) return;
            
            const currentTime = (time - startTime) / 1000.0;
            const resolution = [canvas.width, canvas.height];
            
            // Mettre à jour le buffer uniform
            const uniformData = new Float32Array([
                currentTime,           // iTime
                resolution[0],         // iResolution.x
                resolution[1],         // iResolution.y
                0.5,                   // iMouse.x (par défaut)
                0.5                    // iMouse.y (par défaut)
            ]);
            device.queue.writeBuffer(uniformBuffer, 0, uniformData);
            
            // Créer la commande de rendu
            const encoder = device.createCommandEncoder();
            const pass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store'
                }]
            });
            
            pass.setPipeline(renderPipeline);
            pass.setBindGroup(0, bindGroup);
            pass.draw(4, 1, 0, 0);
            pass.end();
            
            device.queue.submit([encoder.finish()]);
        }
        
        // Modifier la fonction animate pour supporter WebGPU
        function animate() {
            const time = performance.now();
            if (useWebGPU) {
                renderWebGPU(time);
            } else if (gl) {
                render(time);
            }
            requestAnimationFrame(animate);
        }
        
        console.log('✅ Script WebGL/WebGPU chargé, updateShader et updateShaderWGSL définis');

        // Démarrer
        try {
        startTime = performance.now();
        window.startTime = startTime; // Exposer pour pouvoir le modifier
            if (useWebGPU) {
                console.log('✅ WebGPU initialisé et animation démarrée');
            } else if (gl) {
        initWebGL();
                console.log('✅ WebGL initialisé et animation démarrée');
            } else {
                console.warn('⚠️ Aucun contexte graphique disponible');
            }
        animate();
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            // Ne pas throw pour permettre au bot de continuer
        }
    </script>
</body>
</html>`;

        // Compiler avec timeout
        const compilationPromise = this.page.setContent(template, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Compilation timeout')), 25000)
        );
        
        await Promise.race([compilationPromise, timeoutPromise]);
        console.log('📄 Template HTML chargé');
        
        // Attendre que le canvas soit disponible
        await this.page.waitForSelector('#shaderCanvas', { timeout: 10000 });
        console.log('✅ Canvas détecté');
        
        // Attendre que WebGL/WebGPU soit initialisé (peut prendre plus de temps sur Render.com)
        console.log('⏳ Attente de l\'initialisation WebGL/WebGPU...');
        let webglReady = false;
        for (let i = 0; i < 30; i++) { // Attendre jusqu'à 6 secondes (30 * 200ms)
            const check = await this.page.evaluate(() => {
                return {
                    hasGl: window.gl !== null && window.gl !== undefined,
                    hasGpu: window.gpu !== null && window.gpu !== undefined,
                    useWebGPU: window.useWebGPU === true
                };
            });
            
            if (check.hasGl || (check.useWebGPU && check.hasGpu)) {
                webglReady = true;
                console.log('✅ WebGL/WebGPU initialisé');
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (!webglReady) {
            console.warn('⚠️ WebGL/WebGPU non initialisé après 6 secondes, continuation quand même...');
        }
        
        // Attendre un peu plus pour que tout soit prêt
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Vérifier l'état du script avant d'attendre
        const initialCheck = await this.page.evaluate(() => {
            return {
                hasWindow: typeof window !== 'undefined',
                hasUpdateShader: typeof window.updateShader === 'function',
                hasGl: typeof window.gl !== 'undefined',
                hasCanvas: typeof document !== 'undefined' && document.getElementById('shaderCanvas') !== null,
                scriptErrors: window.consoleErrors || []
            };
        });
        console.log('🔍 État initial:', initialCheck);
        
        // Attendre que la fonction updateShader soit disponible (timeout augmenté pour Render.com)
        console.log('⏳ Attente de la fonction updateShader...');
        try {
            await this.page.waitForFunction(() => {
                // Vérifier que window existe et que la fonction est définie
                return typeof window !== 'undefined' && typeof window.updateShader === 'function';
            }, { 
                timeout: 60000, // 60 secondes pour Render.com
                polling: 500 // Vérifier toutes les 500ms
            });
            console.log('✅ Fonction updateShader disponible');
        } catch (error) {
            console.error('❌ Timeout attente updateShader:', error.message);
            
            // Diagnostic complet
            const diagnostic = await this.page.evaluate(() => {
                const canvas = document.getElementById('shaderCanvas');
                return {
                    hasWindow: typeof window !== 'undefined',
                    hasUpdateShader: typeof window.updateShader === 'function',
                    hasGl: typeof window.gl !== 'undefined',
                    hasCanvas: canvas !== null,
                    canvasContext: canvas ? (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) : null,
                    scriptErrors: window.consoleErrors || [],
                    documentReady: document.readyState,
                    bodyExists: document.body !== null,
                    scriptText: document.querySelector('script') ? document.querySelector('script').textContent.substring(0, 500) : null
                };
            });
            console.error('🔍 Diagnostic complet:', JSON.stringify(diagnostic, null, 2));
            
            // Afficher les erreurs de console si disponibles
            if (diagnostic.scriptErrors && diagnostic.scriptErrors.length > 0) {
                console.error('❌ Erreurs JavaScript détectées:');
                diagnostic.scriptErrors.forEach((err, i) => {
                    console.error(`   ${i + 1}. ${err}`);
                });
            }
            
            // Vérifier si la fonction existe quand même
            const exists = await this.page.evaluate(() => typeof window.updateShader === 'function');
            if (!exists) {
                throw new Error('La fonction updateShader n\'est pas disponible après le timeout. Vérifiez les erreurs JavaScript ci-dessus.');
            }
            console.log('⚠️ Fonction updateShader trouvée malgré le timeout');
        }
    }

    // Créer une nouvelle page avec le template WebGL pour chaque compilation
    async createCompilationPage(browser = null, width = null, height = null) {
        // Utiliser les dimensions fournies ou les dimensions par défaut
        const canvasWidth = width || this.canvasWidth;
        const canvasHeight = height || this.canvasHeight;
        // Pré-échapper les chaînes JavaScript pour éviter les problèmes d'apostrophes
        const errorInitMsg = escapeJSStringForTemplate('❌ Erreur lors de l\'initialisation WebGL/WebGPU:');
        const errorImageMsg = escapeJSStringForTemplate('Impossible de charger l\'image: ');
        const errorInitWebGLMsg = escapeJSStringForTemplate('❌ WebGL non disponible, impossible d\'initialiser');
        const waitInitMsg = escapeJSStringForTemplate('⏳ Attente de l\'initialisation WebGL/WebGPU...');
        // Utiliser le browser du pool si fourni, sinon utiliser this.browser (rétrocompatibilité)
        let browserToUse = browser;
        
        if (!browserToUse) {
            if (!this.browser) {
                // Si Chrome est en cours d'installation, attendre un peu
                if (this.isInstallingChrome && this.chromeInstallPromise) {
                    console.log('⏳ Chrome est en cours d\'installation, attente...');
                    try {
                        await Promise.race([
                            this.chromeInstallPromise,
                            new Promise(resolve => setTimeout(resolve, 5000)) // Timeout de 5s
                        ]);
                    } catch (e) {
                        // Ignorer les erreurs, on va réessayer
                    }
                }
                
                console.log('🔄 Chrome non disponible, tentative de réinitialisation...');
                // Essayer de réinitialiser (cela va installer Chrome si nécessaire)
                try {
                    await this.initialize();
                    // Vérifier à nouveau après initialisation
                    if (!this.browser) {
                        throw new Error('Chrome n\'est pas encore disponible. L\'installation peut prendre 1-2 minutes. Veuillez réessayer dans quelques instants.');
                    }
                } catch (initError) {
                    console.error('❌ Erreur lors de la réinitialisation:', initError.message);
                    // Si c'est une erreur d'installation en cours, donner un message plus clair
                    if (this.isInstallingChrome) {
                        throw new Error('Chrome est en cours d\'installation (1-2 minutes). Veuillez réessayer dans quelques instants.');
                    }
                    throw new Error('Chrome n\'est pas disponible. L\'installation est en cours, veuillez réessayer dans 1-2 minutes.');
                }
            }
            browserToUse = this.browser;
        }

        // Créer une nouvelle page pour cette compilation (isolation)
        const page = await browserToUse.newPage();
        
        // Définir des limites strictes
        await page.setDefaultTimeout(10000); // 10s par opération
        await page.setDefaultNavigationTimeout(10000);
        
        // Bloquer tous les chargements externes
        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = request.url();
            
            // Autoriser seulement data: URIs et about:blank
            if (url.startsWith('data:') || url.startsWith('about:')) {
                request.continue();
            } else {
                console.warn(`🚫 Requête bloquée: ${url}`);
                request.abort();
            }
        });
        
        // Injecter Content Security Policy strict
        await page.setExtraHTTPHeaders({
            'Content-Security-Policy': [
                "default-src 'none'",
                "script-src 'unsafe-inline' 'unsafe-eval'", // Nécessaire pour WebGL
                "style-src 'unsafe-inline'",
                "img-src data:",
                "connect-src 'none'",
                "font-src 'none'",
                "object-src 'none'",
                "media-src 'none'",
                "frame-src 'none'"
            ].join('; ')
        });
        
        // Capturer les erreurs de console pour déboguer
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') {
                console.error('❌ Erreur console browser:', text);
            } else if (type === 'warning') {
                console.warn('⚠️ Warning console browser:', text);
            }
        });
        
        // Capturer les erreurs de page
        page.on('pageerror', error => {
            console.error('❌ Erreur page:', error.message);
        });
        
        await page.setViewport({
            width: canvasWidth,
            height: canvasHeight
        });

        // Charger le template WebGL dans cette nouvelle page
        const template = `
<!DOCTYPE html>
<html>
<head>
    <title>GLSL Shader Animation</title>
    <style>
        body { margin: 0; padding: 0; background: #000; }
        canvas { display: block; }
    </style>
</head>
<body>
    <canvas id="shaderCanvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>
    <script>
        // Définir updateShader IMMÉDIATEMENT pour qu'elle soit toujours disponible
        window.updateShader = function(newShaderCode, textureUrls) {
            console.log('🔧 updateShader appelée (version de base)');
            return false; // Sera redéfinie plus tard
        };
        window.loadTextures = async function(textureUrls) {
            return false; // Sera redéfinie plus tard
        };
        
        // Capturer les erreurs de console
        window.consoleErrors = [];
        const originalError = console.error;
        console.error = function(...args) {
            window.consoleErrors.push(args.join(' '));
            originalError.apply(console, args);
        };
        
        // Injecter les protections WebGL (désactivé temporairement pour éviter les erreurs de syntaxe)
        // Le code de sécurité sera appliqué après l'initialisation WebGL si nécessaire
        
        // Timeout global pour les opérations longues
        if (!window.__shaderTimeoutStartTime) {
            window.__shaderTimeoutStartTime = Date.now();
            window.__shaderMaxExecutionTime = ${this.compilationTimeout};
            window.__shaderTimeoutInterval = setInterval(() => {
                if (Date.now() - window.__shaderTimeoutStartTime > window.__shaderMaxExecutionTime) {
                    clearInterval(window.__shaderTimeoutInterval);
                    throw new Error('Shader execution timeout after ' + window.__shaderMaxExecutionTime + 'ms');
                }
            }, 1000);
        }
        
        const canvas = document.getElementById('shaderCanvas');
        
        // Variables globales pour WebGL et WebGPU
        let gl = null;
        let gpu = null;
        let device = null;
        let context = null;
        let format = null;
        let useWebGPU = false;
        
        // Essayer WebGPU en premier (meilleur support headless)
        (async function() {
            if (navigator.gpu) {
                console.log('🔍 Tentative WebGPU...');
                try {
                    const adapter = await navigator.gpu.requestAdapter();
                    if (adapter) {
                        device = await adapter.requestDevice();
                        context = canvas.getContext('webgpu');
                        if (context) {
                            const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
                            context.configure({
                                device: device,
                                format: canvasFormat
                            });
                            gpu = navigator.gpu;
                            useWebGPU = true;
                            console.log('✅ WebGPU initialisé ! Format:', canvasFormat);
                        }
                    }
                } catch (error) {
                    console.log('⚠️ WebGPU non disponible:', error.message);
                }
            }
            
            // Essayer WebGL (fallback et pour compatibilité GLSL) après avoir tenté WebGPU
            if (!useWebGPU) {
                try {
                console.log('🔍 Tentative WebGL...');
                // Attendre plus longtemps pour que le contexte soit prêt (surtout sur Render.com)
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Essayer plusieurs fois avec des délais
                for (let attempt = 0; attempt < 5; attempt++) {
                    gl = canvas.getContext('webgl2', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        depth: false,
                        stencil: false,
                        alpha: false,
                        premultipliedAlpha: false
                    }) || canvas.getContext('webgl', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        depth: false,
                        stencil: false,
                        alpha: false,
                        premultipliedAlpha: false
                    }) || canvas.getContext('experimental-webgl', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        depth: false,
                        stencil: false,
                        alpha: false,
                        premultipliedAlpha: false
                    });
                    
                    if (gl) {
                        console.log('✅ WebGL obtenu à la tentative', attempt + 1);
                        break;
                    }
                    
                    if (attempt < 4) {
                        console.log('⏳ Tentative', attempt + 1, 'echouee, nouvelle tentative dans 200ms...');
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
                
                if (!gl) {
                    // Dernière tentative avec options forcées
                    gl = canvas.getContext('webgl', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        depth: false,
                        stencil: false,
                        alpha: false,
                        premultipliedAlpha: false,
                        powerPreference: 'default',
                        failIfMajorPerformanceCaveat: false
                    }) || canvas.getContext('experimental-webgl', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        depth: false,
                        stencil: false,
                        alpha: false,
                        premultipliedAlpha: false,
                        powerPreference: 'default',
                        failIfMajorPerformanceCaveat: false
                    });
                }
                
                if (gl) {
                    console.log('✅ WebGL initialisé:', gl.getParameter(gl.VERSION));
                    console.log('✅ WebGL Vendor:', gl.getParameter(gl.VENDOR));
                    console.log('✅ WebGL Renderer:', gl.getParameter(gl.RENDERER));
                } else {
                    console.warn('⚠️ WebGL non disponible. Vérifiez les flags Chrome.');
                    console.warn('⚠️ Canvas disponible:', !!canvas);
                    console.warn('⚠️ getContext disponible:', typeof canvas.getContext === 'function');
                    // Essayer de diagnostiquer pourquoi
                    try {
                        const testContext = canvas.getContext('2d');
                        console.warn('⚠️ Contexte 2D disponible:', !!testContext);
                    } catch (e) {
                        console.warn('⚠️ Erreur test contexte 2D:', e.message);
                    }
                    // Essayer SwiftShader explicitement si EGL a échoué
                    console.log('🔄 Tentative avec SwiftShader...');
                    gl = canvas.getContext('webgl', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        depth: false,
                        stencil: false,
                        alpha: false,
                        premultipliedAlpha: false,
                        powerPreference: 'low-power',
                        failIfMajorPerformanceCaveat: false,
                        desynchronized: false
                    });
                    if (gl) {
                        console.log('✅ WebGL initialisé avec SwiftShader:', gl.getParameter(gl.VERSION));
                    } else {
                        console.error('❌ WebGL toujours non disponible après toutes les tentatives');
                    }
                }
                
                // Définir window.gl après l'initialisation
                window.gl = gl;
                window.gpu = gpu;
                window.useWebGPU = useWebGPU;
                
                // Marquer l'initialisation comme terminée
                window.webglInitialized = true;
                window.webglInitializationError = gl ? null : 'WebGL non disponible après toutes les tentatives';
                
                // Exposer les variables nécessaires pour renderFrame
                if (gl && shaderProgram) {
                    window.shaderProgram = shaderProgram;
                    window.timeLocation = timeLocation;
                    window.resolutionLocation = resolutionLocation;
                    window.mouseLocation = mouseLocation;
                    window.textureLocations = textureLocations;
                    window.textures = textures;
                    window.vertexBuffer = vertexBuffer;
                }
                } catch (error) {
                    console.error(${errorInitMsg}, error);
                    window.webglInitialized = true;
                    window.webglInitializationError = error.message;
                }
            }
        })();
        
        // Définir des valeurs par défaut pour le diagnostic (seront mises à jour par la IIFE)
        window.gl = null;
        window.gpu = null;
        window.useWebGPU = false;
        window.webglInitialized = false;
        window.webglInitializationError = null;
        
        console.log('📝 Définition de window.updateShader...');
        
        // Définir window.updateShader tôt pour qu'elle soit toujours disponible
        window.updateShader = function(newShaderCode, textureUrls) {
            console.log('🔧 updateShader appelée, gl disponible:', !!gl);
            if (!gl) {
                console.error('❌ WebGL non disponible, impossible de mettre à jour le shader');
                return false;
            }
            // Cette fonction sera redéfinie plus tard avec l'implémentation complète
            return false;
        };
        
        window.loadTextures = async function(textureUrls) {
            if (!gl) {
                console.error('❌ WebGL non disponible, impossible de charger les textures');
                return false;
            }
            return false;
        };
        
        console.log('✅ window.updateShader définie:', typeof window.updateShader);

        // Variables globales
        let shaderProgram;
        let vertexBuffer;
        let timeLocation;
        let resolutionLocation;
        let mouseLocation;
        let startTime;
        let textureLocations = []; // iChannel0, iChannel1, iChannel2, iChannel3
        let textures = [null, null, null, null]; // Textures WebGL

        // Vertex shader simple
        const vertexShaderSource = 
            'attribute vec2 a_position;' +
            'void main() {' +
            '    gl_Position = vec4(a_position, 0.0, 1.0);' +
            '}';

        // Fragment shader template (sera remplacé)
        let fragmentShaderSource = 
            'precision mediump float;' +
            'uniform float iTime;' +
            'uniform vec2 iResolution;' +
            'uniform vec2 iMouse;' +
            'uniform sampler2D iChannel0;' +
            'uniform sampler2D iChannel1;' +
            'uniform sampler2D iChannel2;' +
            'uniform sampler2D iChannel3;' +
            'void mainImage(out vec4 fragColor, in vec2 fragCoord) {' +
            '    vec2 uv = fragCoord/iResolution.xy;' +
            '    vec2 p = (2.0*fragCoord-iResolution.xy)/min(iResolution.y,iResolution.x);' +
            '    float t = iTime * 0.5;' +
            '    vec3 col = vec3(uv, 0.5);' +
            '    fragColor = vec4(col, 1.0);' +
            '}' +
            'void main() {' +
            '    mainImage(gl_FragColor, gl_FragCoord.xy);' +
            '}';
        
        // Fonction pour charger une texture depuis une URL
        function loadTexture(url, index) {
            return new Promise((resolve, reject) => {
                if (!url) {
                    resolve(null);
                    return;
                }
                
                const img = new Image();
                img.crossOrigin = 'anonymous'; // Permettre CORS
                
                img.onload = function() {
                    try {
                        const texture = gl.createTexture();
                        gl.bindTexture(gl.TEXTURE_2D, texture);
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        
                        // Nettoyer l'ancienne texture si elle existe
                        if (textures[index]) {
                            gl.deleteTexture(textures[index]);
                        }
                        
                        textures[index] = texture;
                        console.log('✅ Texture ' + index + ' chargée depuis ' + url);
                        resolve(texture);
                    } catch (error) {
                        console.error('❌ Erreur création texture ' + index + ':', error);
                        reject(error);
                    }
                };
                
                img.onerror = function() {
                    console.error('❌ Erreur chargement image ' + url);
                    reject(new Error(${errorImageMsg} + url));
                };
                
                img.src = url;
            });
        }

        // Initialisation WebGL
        function initWebGL() {
            if (!gl) {
                console.error(${errorInitWebGLMsg});
                return false;
            }
            
            try {
            // Créer le programme de shader
            const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
            
            shaderProgram = createProgram(vertexShader, fragmentShader);
            } catch (error) {
                console.error('❌ Erreur création programme shader:', error);
                return false;
            }
            
            // Obtenir les locations des uniforms
            timeLocation = gl.getUniformLocation(shaderProgram, 'iTime');
            resolutionLocation = gl.getUniformLocation(shaderProgram, 'iResolution');
            mouseLocation = gl.getUniformLocation(shaderProgram, 'iMouse');
            
            // Obtenir les locations des textures
            textureLocations = [
                gl.getUniformLocation(shaderProgram, 'iChannel0'),
                gl.getUniformLocation(shaderProgram, 'iChannel1'),
                gl.getUniformLocation(shaderProgram, 'iChannel2'),
                gl.getUniformLocation(shaderProgram, 'iChannel3')
            ];
            
            // Créer le buffer de vertex (quad plein écran)
            const positions = new Float32Array([
                -1, -1,
                 1, -1,
                -1,  1,
                 1,  1
            ]);
            
            vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            
            // Exposer vertexBuffer globalement
            window.vertexBuffer = vertexBuffer;
            
            // Configuration des attributs
            const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        }

        function createShader(type, source) {
            // Vérifier que WebGL est fonctionnel
            if (!gl) {
                throw new Error('WebGL context is not available');
            }
            
            // Vérifier que le contexte WebGL n'est pas perdu
            const isContextLost = gl.isContextLost ? gl.isContextLost() : false;
            if (isContextLost) {
                throw new Error('WebGL context has been lost');
            }
            
            const shader = gl.createShader(type);
            if (!shader) {
                throw new Error('Failed to create shader object. WebGL may not be functional.');
            }
            
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            
            // Vérifier le statut de compilation
            const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            if (!compileStatus) {
                const errorLog = gl.getShaderInfoLog(shader);
                const shaderTypeName = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
                
                // Construire un message d'erreur détaillé (utiliser concaténation pour éviter template literals imbriqués)
                let errorMessage = errorLog;
                if (!errorMessage || errorMessage.trim() === '') {
                    // Si pas de message d'erreur, essayer d'obtenir plus d'infos
                    const shaderSourcePreview = source.substring(0, 200).replace(/\\n/g, ' ').trim();
                    // Vérifier si WebGL est vraiment fonctionnel
                    const glError = gl.getError();
                    const glErrorString = glError !== gl.NO_ERROR ? ' (WebGL error code: ' + glError + ')' : '';
                    errorMessage = 'Shader ' + shaderTypeName + ' compilation failed (no error log available)' + glErrorString + '. Source preview: ' + shaderSourcePreview + '...';
                } else {
                    errorMessage = 'Shader ' + shaderTypeName + ' compilation error: ' + errorLog;
                }
                
                console.error('Erreur compilation shader:', errorMessage);
                
                // Stocker l'erreur dans window pour qu'elle soit accessible depuis Puppeteer
                window.lastShaderError = errorMessage;
                window.lastShaderErrorDetails = {
                    type: shaderTypeName,
                    errorLog: errorLog || null,
                    sourcePreview: source.substring(0, 500),
                    compileStatus: compileStatus,
                    deleteStatus: gl.getShaderParameter(shader, gl.DELETE_STATUS),
                    glError: gl.getError(),
                    shaderCreated: !!shader
                };
                
                // Nettoyer le shader avant de throw
                gl.deleteShader(shader);
                
                throw new Error(errorMessage);
            }
            
            return shader;
        }

        function createProgram(vertexShader, fragmentShader) {
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                const linkErrorLog = gl.getProgramInfoLog(program);
                const errorMessage = linkErrorLog && linkErrorLog.trim() !== '' 
                    ? 'Program linking error: ' + linkErrorLog
                    : 'Program linking failed (no error log available)';
                
                console.error('Erreur liaison programme:', errorMessage);
                
                // Stocker l'erreur de liaison aussi
                if (!window.lastShaderError) {
                    window.lastShaderError = errorMessage;
                    window.lastShaderErrorDetails = {
                        type: 'LINK',
                        errorLog: linkErrorLog,
                        linkStatus: gl.getProgramParameter(program, gl.LINK_STATUS),
                        validateStatus: gl.getProgramParameter(program, gl.VALIDATE_STATUS)
                    };
                }
                
                throw new Error(errorMessage);
            }
            
            return program;
        }

        function render(time) {
            // Ne pas rendre si aucun shader n'est chargé
            if (!shaderProgram || !gl || !vertexBuffer) {
                return;
            }
            
            const currentTime = (time - startTime) / 1000.0;
            
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            gl.useProgram(shaderProgram);
            
            // Configurer le vertex buffer et les attributs
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
            if (positionLocation >= 0) {
                gl.enableVertexAttribArray(positionLocation);
                gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            }
            
            // Mettre à jour les uniforms
            if (timeLocation) gl.uniform1f(timeLocation, currentTime);
            if (resolutionLocation) gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
            if (mouseLocation) gl.uniform2f(mouseLocation, 0.5, 0.5); // Position souris par défaut
            
            // Activer et lier les textures
            for (let i = 0; i < 4; i++) {
                if (textures[i] && textureLocations[i]) {
                    gl.activeTexture(gl.TEXTURE0 + i);
                    gl.bindTexture(gl.TEXTURE_2D, textures[i]);
                    gl.uniform1i(textureLocations[i], i);
                }
            }
            
            // Dessiner le quad
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        let animationId = null;
        function animate() {
            const time = performance.now();
            render(time);
            animationId = requestAnimationFrame(animate);
        }

        // Fonction pour arrêter l'animation
        window.stopAnimation = function() {
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        };
        
        // Fonction pour redémarrer l'animation
        window.startAnimation = function() {
            if (animationId === null) {
                animate();
            }
        };

        // Fonction pour charger des textures
        window.loadTextures = async function(textureUrls) {
            try {
                const promises = [];
                for (let i = 0; i < 4; i++) {
                    if (textureUrls && textureUrls[i]) {
                        promises.push(loadTexture(textureUrls[i], i));
                    } else {
                        promises.push(Promise.resolve(null));
                    }
                }
                await Promise.all(promises);
                console.log('✅ Toutes les textures chargées');
                return true;
            } catch (error) {
                console.error('❌ Erreur chargement textures:', error);
                return false;
            }
        };
        
        // Fonction pour changer le fragment shader
        window.updateShader = function(newShaderCode, textureUrls) {
            if (!gl) {
                console.error('❌ WebGL non disponible, impossible de mettre à jour le shader');
                window.lastShaderError = 'WebGL context is not available';
                return false;
            }
            
            // Vérifier que le contexte WebGL n'est pas perdu
            if (gl.isContextLost && gl.isContextLost()) {
                console.error('❌ WebGL context has been lost');
                window.lastShaderError = 'WebGL context has been lost';
                return false;
            }
            
            try {
                // Mettre à jour le fragment shader (utiliser concaténation pour éviter template literals imbriqués)
                fragmentShaderSource = 
                    'precision mediump float;' +
                    'uniform float iTime;' +
                    'uniform vec2 iResolution;' +
                    'uniform vec2 iMouse;' +
                    'uniform sampler2D iChannel0;' +
                    'uniform sampler2D iChannel1;' +
                    'uniform sampler2D iChannel2;' +
                    'uniform sampler2D iChannel3;' +
                    newShaderCode +
                    'void main() {' +
                    '    mainImage(gl_FragColor, gl_FragCoord.xy);' +
                    '}';
                
                // S'assurer que le vertex buffer existe
                if (!vertexBuffer) {
                    const positions = new Float32Array([
                        -1, -1,
                         1, -1,
                        -1,  1,
                         1,  1
                    ]);
                    vertexBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
                    window.vertexBuffer = vertexBuffer;
                }
                
                // Recréer le programme
                const newFragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
                const newVertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
                const newProgram = createProgram(newVertexShader, newFragmentShader);
                
                // Nettoyer l'ancien programme
                if (shaderProgram) {
                    gl.deleteProgram(shaderProgram);
                }
                shaderProgram = newProgram;
                
                // Mettre à jour les locations
                timeLocation = gl.getUniformLocation(shaderProgram, 'iTime');
                resolutionLocation = gl.getUniformLocation(shaderProgram, 'iResolution');
                mouseLocation = gl.getUniformLocation(shaderProgram, 'iMouse');
                
                // Mettre à jour les locations des textures
                textureLocations = [
                    gl.getUniformLocation(shaderProgram, 'iChannel0'),
                    gl.getUniformLocation(shaderProgram, 'iChannel1'),
                    gl.getUniformLocation(shaderProgram, 'iChannel2'),
                    gl.getUniformLocation(shaderProgram, 'iChannel3')
                ];
                
                // Configurer les attributs de vertex (nécessaire après création du programme)
                gl.useProgram(shaderProgram);
                const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
                if (positionLocation >= 0) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
                    gl.enableVertexAttribArray(positionLocation);
                    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
                }
                
                // Mettre à jour les variables globales pour renderFrame
                window.shaderProgram = shaderProgram;
                window.timeLocation = timeLocation;
                window.resolutionLocation = resolutionLocation;
                window.mouseLocation = mouseLocation;
                window.textureLocations = textureLocations;
                
                // Charger les textures si fournies
                if (textureUrls) {
                    window.loadTextures(textureUrls).catch(err => {
                        console.error('Erreur chargement textures:', err);
                    });
                }
                
                console.log('Shader mis à jour avec succès');
                return true;
            } catch (error) {
                // S'assurer que l'erreur est stockée dans window.lastShaderError si elle n'y est pas déjà
                if (!window.lastShaderError) {
                    let errorMsg = 'Erreur inconnue';
                    try {
                        if (error && error.message) {
                            errorMsg = error.message;
                        } else if (error && error.toString) {
                            errorMsg = error.toString();
                        } else if (typeof error === 'string') {
                            errorMsg = error;
                        } else {
                            errorMsg = JSON.stringify(error);
                        }
                    } catch (e) {
                        errorMsg = String(error);
                    }
                    window.lastShaderError = errorMsg;
                    window.lastShaderErrorDetails = {
                        message: errorMsg,
                        stack: error && error.stack ? error.stack : null,
                        name: error && error.name ? error.name : 'Error'
                    };
                }
                console.error('Erreur mise à jour shader:', window.lastShaderError || error);
                return false;
            }
        };
        
        // Fonction pour forcer un rendu avec un temps spécifique
        window.renderFrame = function(time) {
            const gl = window.gl;
            const shaderProgram = window.shaderProgram;
            const vertexBuffer = window.vertexBuffer;
            const timeLocation = window.timeLocation;
            const resolutionLocation = window.resolutionLocation;
            const mouseLocation = window.mouseLocation;
            const textureLocations = window.textureLocations || [];
            const textures = window.textures || [];
            const canvas = document.getElementById('shaderCanvas');
            
            if (!gl || !shaderProgram || !vertexBuffer || !canvas) {
                console.warn('⚠️ renderFrame: ressources manquantes', {
                    hasGl: !!gl,
                    hasProgram: !!shaderProgram,
                    hasBuffer: !!vertexBuffer,
                    hasCanvas: !!canvas
                });
                return false;
            }
            
            const currentTime = time;
            
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.0, 0.0, 0.0, 1.0); // Fond noir
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            gl.useProgram(shaderProgram);
            
            // Configurer le vertex buffer et les attributs
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
            if (positionLocation >= 0) {
                gl.enableVertexAttribArray(positionLocation);
                gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            } else {
                console.warn('⚠️ renderFrame: positionLocation invalide');
                return false;
            }
            
            // Mettre à jour les uniforms
            if (timeLocation) gl.uniform1f(timeLocation, currentTime);
            if (resolutionLocation) gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
            if (mouseLocation) gl.uniform2f(mouseLocation, 0.5, 0.5);
            
            // Activer et lier les textures
            for (let i = 0; i < 4; i++) {
                if (textures[i] && textureLocations[i]) {
                    gl.activeTexture(gl.TEXTURE0 + i);
                    gl.bindTexture(gl.TEXTURE_2D, textures[i]);
                    gl.uniform1i(textureLocations[i], i);
                }
            }
            
            // Dessiner le quad
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            
            // Forcer la fin du rendu
            gl.finish();
            
            return true;
        };
        
        console.log('✅ Script WebGL/WebGPU chargé, updateShader et updateShaderWGSL définis');

        // Démarrer
        try {
        startTime = performance.now();
        window.startTime = startTime; // Exposer pour pouvoir le modifier
            if (useWebGPU) {
                console.log('✅ WebGPU initialisé et animation démarrée');
            } else if (gl) {
        initWebGL();
                console.log('✅ WebGL initialisé et animation démarrée');
            } else {
                console.warn('⚠️ Aucun contexte graphique disponible');
            }
        animate();
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            // Ne pas throw pour permettre au bot de continuer
        }
    </script>
</body>
</html>`;

        // Définir des limites strictes pour cette page
        await page.setDefaultTimeout(10000); // 10s par opération
        await page.setDefaultNavigationTimeout(10000);
        
        // Bloquer tous les chargements externes
        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = request.url();
            
            // Autoriser seulement data: URIs et about:blank
            if (url.startsWith('data:') || url.startsWith('about:')) {
                request.continue();
            } else {
                console.warn(`🚫 Requête bloquée: ${url}`);
                request.abort();
            }
        });
        
        // Injecter Content Security Policy strict
        await page.setExtraHTTPHeaders({
            'Content-Security-Policy': [
                "default-src 'none'",
                "script-src 'unsafe-inline' 'unsafe-eval'", // Nécessaire pour WebGL
                "style-src 'unsafe-inline'",
                "img-src data:",
                "connect-src 'none'",
                "font-src 'none'",
                "object-src 'none'",
                "media-src 'none'",
                "frame-src 'none'"
            ].join('; ')
        });
        
        // Charger le template HTML avec timeout
        const compilationPromise = page.setContent(template, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Compilation timeout')), 25000)
        );
        
        await Promise.race([compilationPromise, timeoutPromise]);
        console.log('📄 Template HTML chargé dans nouvelle page');
        
        // Attendre que le canvas soit disponible
        await page.waitForSelector('#shaderCanvas', { timeout: 10000 });
        console.log('✅ Canvas détecté');
        
        // Injecter les protections WebGL après le chargement de la page (évite les erreurs de syntaxe)
        try {
            const securityCode = this.webglSecurity.injectSecurityLimits();
            await page.evaluate((code) => {
                try {
                    eval(code);
                } catch (e) {
                    console.warn('⚠️ Erreur lors de l\'injection des protections WebGL:', e.message);
                }
            }, securityCode);
            console.log('✅ Protections WebGL injectées');
        } catch (e) {
            console.warn('⚠️ Impossible d\'injecter les protections WebGL:', e.message);
        }
        
        // Attendre que WebGL/WebGPU soit initialisé (peut prendre plus de temps sur Render.com)
        console.log('⏳ Attente de l\'initialisation WebGL/WebGPU...');
        let webglReady = false;
        let lastError = null;
        
        // Attendre jusqu'à 15 secondes (75 * 200ms) pour Render.com
        for (let i = 0; i < 75; i++) {
            const check = await page.evaluate(() => {
                try {
                    const canvas = document.getElementById('shaderCanvas');
                    const gl = window.gl;
                    
                    // Vérifier que l'initialisation est terminée
                    const initComplete = window.webglInitialized === true;
                    const initError = window.webglInitializationError;
                    
                    // Vérifier que WebGL est vraiment fonctionnel
                    let isFunctional = false;
                    if (gl) {
                        try {
                            // Tester que WebGL répond
                            const testParam = gl.getParameter(gl.VERSION);
                            isFunctional = !!testParam;
                        } catch (e) {
                            // WebGL n'est pas fonctionnel
                        }
                    }
                    
                    return {
                        initComplete: initComplete,
                        initError: initError,
                        hasCanvas: !!canvas,
                        hasGl: gl !== null && gl !== undefined,
                        isFunctional: isFunctional,
                        hasGpu: window.gpu !== null && window.gpu !== undefined,
                        useWebGPU: window.useWebGPU === true,
                        canvasWidth: canvas ? canvas.width : 0,
                        canvasHeight: canvas ? canvas.height : 0
                    };
                } catch (error) {
                    return { error: error.message };
                }
            });
            
            if (check.error) {
                lastError = check.error;
            }
            
            // Si l'initialisation est terminée mais a échoué, essayer la réinitialisation
            if (check.initComplete && check.initError && !check.hasGl) {
                console.warn('⚠️ Initialisation terminée avec erreur:', check.initError);
                break; // Sortir de la boucle pour essayer la réinitialisation
            }
            
            // Si l'initialisation est terminée et WebGL est disponible
            if (check.initComplete && (check.hasGl && check.isFunctional)) {
                webglReady = true;
                console.log('✅ WebGL initialisé et fonctionnel');
                console.log(`📐 Canvas: ${check.canvasWidth}x${check.canvasHeight}`);
                break;
            } else if (check.initComplete && check.useWebGPU && check.hasGpu) {
                webglReady = true;
                console.log('✅ WebGPU initialisé');
                break;
            }
            
            // Log toutes les 2 secondes pour le debugging
            if (i % 10 === 0 && i > 0) {
                console.log(`⏳ WebGL toujours en attente... (${i * 0.2}s) - Init: ${check.initComplete}, Canvas: ${check.hasCanvas}, GL: ${check.hasGl}, Functional: ${check.isFunctional}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (!webglReady) {
            const finalCheck = await page.evaluate(() => {
                const canvas = document.getElementById('shaderCanvas');
                const gl = window.gl;
                return {
                    hasCanvas: !!canvas,
                    hasGl: gl !== null && gl !== undefined,
                    canvasExists: !!canvas,
                    glExists: !!gl
                };
            });
            
            console.error('❌ WebGL/WebGPU non initialisé après 15 secondes');
            console.error('📊 État final:', finalCheck);
            if (lastError) {
                console.error('❌ Dernière erreur:', lastError);
            }
            
            // Essayer de forcer l'initialisation WebGL
            console.log('🔄 Tentative de réinitialisation WebGL...');
            const reinitResult = await page.evaluate(() => {
                try {
                    const canvas = document.getElementById('shaderCanvas');
                    if (!canvas) return { error: 'Canvas non trouvé' };
                    
                    // Essayer de créer un nouveau contexte WebGL
                    const gl = canvas.getContext('webgl2', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        failIfMajorPerformanceCaveat: false
                    }) || canvas.getContext('webgl', {
                        preserveDrawingBuffer: true,
                        antialias: false,
                        failIfMajorPerformanceCaveat: false
                    });
                    
                    if (gl) {
                        window.gl = gl;
                        window.webglInitialized = true;
                        window.webglInitializationError = null;
                        
                        // Tester que WebGL fonctionne
                        try {
                            const version = gl.getParameter(gl.VERSION);
                            return { success: true, version: version };
                        } catch (e) {
                            return { error: 'WebGL créé mais non fonctionnel: ' + e.message };
                        }
                    }
                    return { error: 'Impossible de créer le contexte WebGL' };
                } catch (error) {
                    window.webglInitialized = true;
                    window.webglInitializationError = error.message;
                    return { error: error.message };
                }
            });
            
            if (reinitResult.success) {
                console.log('✅ WebGL réinitialisé avec succès:', reinitResult.version);
                webglReady = true;
            } else {
                console.error('❌ Échec de la réinitialisation WebGL:', reinitResult.error);
                throw new Error(`WebGL non disponible: ${reinitResult.error || 'timeout'}`);
            }
        }
        
        // Attendre un peu plus pour que tout soit prêt
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Attendre que la fonction updateShader soit disponible (timeout augmenté pour Render.com)
        console.log('⏳ Attente de la fonction updateShader...');
        try {
            await page.waitForFunction(() => {
                // Vérifier que window existe et que la fonction est définie
                return typeof window !== 'undefined' && typeof window.updateShader === 'function';
            }, { 
                timeout: 60000, // 60 secondes pour Render.com
                polling: 500 // Vérifier toutes les 500ms
            });
            console.log('✅ Fonction updateShader disponible');
        } catch (error) {
            console.error('❌ Timeout attente updateShader:', error.message);
            
            // Vérifier si la fonction existe quand même
            const exists = await page.evaluate(() => typeof window.updateShader === 'function');
            if (!exists) {
                await page.close();
                throw new Error('La fonction updateShader n\'est pas disponible après le timeout.');
            }
            console.log('⚠️ Fonction updateShader trouvée malgré le timeout');
        }

        return page;
    }

    async compileShader(shaderCode, options = {}) {
        const startTime = Date.now();
        let compilationPage = null;
        let browser = null;
        const shaderType = options.presetName || 'custom';
        const userId = options.userId || null;
        const jobId = options.jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Déterminer la résolution selon le plan de l'utilisateur
        let compilationWidth = this.canvasWidth;
        let compilationHeight = this.canvasHeight;
        if (options.userId && options.database) {
            try {
                const userPlan = await options.database.getUserPlan(options.userId);
                if (userPlan === 'pro') {
                    // Plan Pro: HD (1920x1080)
                    compilationWidth = 1920;
                    compilationHeight = 1080;
                    console.log('📐 Plan Pro détecté - Résolution HD: 1920x1080');
                } else if (userPlan === 'studio') {
                    // Plan Studio: 4K (3840x2160)
                    compilationWidth = 3840;
                    compilationHeight = 2160;
                    console.log('📐 Plan Studio détecté - Résolution 4K: 3840x2160');
                } else {
                    // Plan Free: résolution par défaut (320x240)
                    console.log('📐 Plan Free - Résolution standard: 320x240');
                }
            } catch (planError) {
                console.warn('⚠️ Erreur récupération plan (utilisation résolution par défaut):', planError.message);
            }
        }
        
        // Telemetry - Start span
        let telemetrySpan = null;
        try {
            const { getTelemetry } = require('../utils/telemetry');
            const telemetry = getTelemetry();
            telemetrySpan = telemetry.startSpan('shader_compilation', {
                shaderType,
                userId,
                jobId
            });
        } catch (error) {
            // Telemetry non disponible, continuer sans
        }
        
        // Circuit Breaker - Vérifier si disponible
        let circuitBreaker = null;
        try {
            const { getCircuitBreaker } = require('../utils/circuitBreaker');
            circuitBreaker = getCircuitBreaker('puppeteer');
            
            // Vérifier si le circuit est ouvert
            if (!circuitBreaker.canExecute()) {
                const error = new Error('Service temporarily unavailable (circuit breaker open)');
                if (telemetrySpan) {
                    const { getTelemetry } = require('../utils/telemetry');
                    getTelemetry().endSpan(telemetrySpan, 'failure', error);
                }
                throw error;
            }
        } catch (error) {
            // Circuit breaker non disponible ou erreur, continuer sans
        }
        
        // Progress tracking
        let progressTracker = null;
        try {
            const { getProgressTracker } = require('./progress-tracker');
            progressTracker = getProgressTracker();
            progressTracker.startTracking(jobId, { shaderType, userId });
        } catch (error) {
            // Progress tracker non disponible, continuer sans
        }
        
        this.metrics.startCompilation();
        
        const updateProgress = (progress, step) => {
            if (progressTracker) {
                progressTracker.updateProgress(jobId, progress, step);
            }
        };
        
        try {
            // Vérifier le cache d'abord (sauf si textures ou options spéciales)
            if (!options.textures && !options.skipCache) {
                const cachedGif = this.shaderCache.getCachedGif(shaderCode);
                if (cachedGif && fsSync.existsSync(cachedGif)) {
                    console.log('✅ Shader trouvé dans le cache');
                    this.metrics.recordCompilation(Date.now() - startTime, true, shaderType, userId);
                    this.metrics.endCompilation();
                    
                    return {
                        success: true,
                        gifPath: cachedGif,
                        frameDirectory: null,
                        metadata: {
                            frames: this.frameRate * this.duration,
                            duration: this.duration,
                            resolution: `${compilationWidth}x${compilationHeight}`,
                            cached: true
                        }
                    };
                }
            }
            
            updateProgress(10, 'Obtention du browser...');
            
            // Obtenir un browser du pool
            browser = await this.browserPool.getBrowser();
            
            updateProgress(20, 'Création de la page de compilation...');
            
            // Créer une nouvelle page isolée pour cette compilation avec la résolution appropriée
            compilationPage = await this.createCompilationPage(browser, compilationWidth, compilationHeight);
            console.log(`✅ Page de compilation créée (isolée) - Résolution: ${compilationWidth}x${compilationHeight}`);
            
            // Ajouter timeout strict à la page
            compilationPage.setDefaultTimeout(this.compilationTimeout);
            compilationPage.setDefaultNavigationTimeout(this.compilationTimeout);
            
            updateProgress(30, 'Détection du format du shader...');
            
            // Détecter le format du shader
            const format = this.detectShaderFormat(shaderCode);
            console.log(`🔄 Compilation ${format.toUpperCase()} du shader...`);
            
            // Extraire les URLs de textures des options
            const textureUrls = options.textures || options.textureUrls || null;
            
            // Retry logic for context loss (max 2 retries)
            let maxRetries = 2;
            let retryCount = 0;
            let updateSuccess;
            let updateError = null;
            let consoleErrors = [];
            
            while (retryCount <= maxRetries) {
                try {
                    // If retrying, create a new page
                    if (retryCount > 0) {
                        console.log(`🔄 Tentative ${retryCount + 1}/${maxRetries + 1}: Création d'une nouvelle page après perte de contexte WebGL...`);
                        
                        // Close the old page
                        if (compilationPage && !compilationPage.isClosed()) {
                            try {
                                await compilationPage.close();
                            } catch (e) {
                                // Ignore errors when closing
                            }
                        }
                        
                        // Create a new page with the appropriate resolution
                        compilationPage = await this.createCompilationPage(browser, compilationWidth, compilationHeight);
                        compilationPage.setDefaultTimeout(this.compilationTimeout);
                        compilationPage.setDefaultNavigationTimeout(this.compilationTimeout);
                        console.log('✅ Nouvelle page de compilation créée');
                        
                        // Wait a bit for the page to stabilize
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                    // Charger les textures si fournies
                    if (textureUrls && Array.isArray(textureUrls)) {
                        console.log('📷 Chargement des textures...');
                        const loadSuccess = await compilationPage.evaluate(async (urls) => {
                            return await window.loadTextures(urls);
                        }, textureUrls);
                        
                        if (!loadSuccess) {
                            console.warn('⚠️ Certaines textures n\'ont pas pu être chargées');
                        }
                        
                        // Attendre un peu pour que les textures se chargent
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                    // Mettre à jour le shader dans la page
                    console.log(`🔍 Tentative de compilation du shader ${shaderType} (format: ${format})...`);
                    console.log(`📝 Longueur du code shader: ${shaderCode.length} caractères`);
                    
                    // Reset errors
                    updateError = null;
                    consoleErrors = [];
                    
                    try {
                        // Capturer les erreurs de console avant l'appel
                        const errorsBefore = await compilationPage.evaluate(() => {
                            return window.consoleErrors ? [...window.consoleErrors] : [];
                        });
                        
                        updateSuccess = await compilationPage.evaluate((code, urls, shaderFormat) => {
                    try {
                        // Réinitialiser l'erreur précédente
                        window.lastShaderError = null;
                        window.lastShaderErrorDetails = null;
                        
                        if (shaderFormat === 'wgsl') {
                            return window.updateShaderWGSL ? window.updateShaderWGSL(code, urls) : false;
                        } else {
                            return window.updateShader(code, urls);
                        }
                    } catch (error) {
                        // Capturer le message d'erreur complet
                        let errorMsg = 'Erreur inconnue';
                        let errorDetails = null;
                        try {
                            if (error && error.message) {
                                errorMsg = error.message;
                                errorDetails = {
                                    message: error.message,
                                    stack: error.stack,
                                    name: error.name
                                };
                            } else if (error && error.toString) {
                                errorMsg = error.toString();
                            } else if (typeof error === 'string') {
                                errorMsg = error;
                            } else {
                                errorMsg = JSON.stringify(error);
                            }
                        } catch (e) {
                            errorMsg = String(error);
                        }
                        
                        // Si window.lastShaderError existe, l'utiliser (erreur de compilation WebGL)
                        if (window.lastShaderError) {
                            errorMsg = window.lastShaderError;
                            errorDetails = window.lastShaderErrorDetails || { shaderError: window.lastShaderError };
                        }
                        
                        // Stocker les détails pour récupération depuis Puppeteer
                        window.lastShaderErrorDetails = errorDetails;
                        
                        console.error('Erreur mise à jour shader:', errorMsg);
                            return { error: errorMsg, details: errorDetails };
                        }
                    }, shaderCode, textureUrls, format);
                    
                    // Récupérer l'erreur de compilation WebGL si elle existe
                    const shaderErrorInfo = await compilationPage.evaluate(() => {
                        return {
                            error: window.lastShaderError || null,
                            details: window.lastShaderErrorDetails || null
                        };
                    });
                    
                    // Si on a une erreur WebGL détaillée, l'utiliser
                    if (shaderErrorInfo.error) {
                        console.error(`❌ Erreur compilation WebGL détectée: ${shaderErrorInfo.error}`);
                        if (shaderErrorInfo.details) {
                            console.error(`❌ Détails:`, JSON.stringify(shaderErrorInfo.details, null, 2));
                        }
                        updateError = shaderErrorInfo.error;
                        updateSuccess = false;
                    } else if (updateSuccess && typeof updateSuccess === 'object' && updateSuccess.error) {
                        // Utiliser l'erreur capturée dans le catch
                        updateError = updateSuccess.error;
                        if (updateSuccess.details) {
                            console.error(`❌ Détails erreur:`, JSON.stringify(updateSuccess.details, null, 2));
                        }
                        updateSuccess = false;
                    }
                    
                    // Capturer les erreurs de console après l'appel
                    const errorsAfter = await compilationPage.evaluate(() => {
                        return window.consoleErrors ? [...window.consoleErrors] : [];
                    });
                    
                    // Extraire les nouvelles erreurs
                    consoleErrors = errorsAfter.slice(errorsBefore.length);
                    
                    if (consoleErrors.length > 0) {
                        console.log(`⚠️ ${consoleErrors.length} erreur(s) console capturée(s) pendant la compilation`);
                    }
                } catch (error) {
                    console.error('❌ Erreur lors de l\'évaluation updateShader:', error);
                    console.error('❌ Stack trace:', error.stack);
                    // Essayer d'extraire le message d'erreur réel
                    if (error && error.message) {
                        updateError = error.message;
                    } else if (error && error.toString) {
                        updateError = error.toString();
                    } else {
                        updateError = String(error);
                    }
                    updateSuccess = false;
                }

                if (!updateSuccess) {
                    // Check if this is a context loss error
                    const isContextLoss = updateError && (
                        updateError.toLowerCase().includes('context has been lost') ||
                        updateError.toLowerCase().includes('context lost') ||
                        (consoleErrors && consoleErrors.some(err => 
                            err && err.toLowerCase().includes('context has been lost')
                        ))
                    );
                    
                    if (isContextLoss && retryCount < maxRetries) {
                        console.warn(`⚠️ WebGL context lost, retrying (${retryCount + 1}/${maxRetries})...`);
                        retryCount++;
                        continue; // Retry with a new page
                    }
                    
                    // Construire un message d'erreur détaillé
                    let errorMessage = 'Échec de la mise à jour du shader';
                    
                    if (updateError) {
                        errorMessage += `: ${updateError}`;
                    }
                    
                    // Ajouter les erreurs de console si disponibles
                    if (consoleErrors && consoleErrors.length > 0) {
                        const relevantErrors = consoleErrors.filter(err => 
                            err && (
                                err.toLowerCase().includes('error') ||
                                err.toLowerCase().includes('shader') ||
                                err.toLowerCase().includes('webgl') ||
                                err.toLowerCase().includes('compilation')
                            )
                        );
                        
                        if (relevantErrors.length > 0) {
                            errorMessage += `\nErreurs console: ${relevantErrors.join('; ')}`;
                        } else if (consoleErrors.length > 0) {
                            errorMessage += `\nErreurs console: ${consoleErrors.slice(0, 3).join('; ')}`;
                        }
                    }
                    
                    console.error(`❌ ${errorMessage}`);
                    throw new Error(errorMessage);
                }
                
                // Success! Break out of retry loop
                break;
                
            } catch (error) {
                // Check if this is a context loss error
                const errorMsg = error.message || error.toString() || '';
                const isContextLoss = errorMsg.toLowerCase().includes('context has been lost') ||
                                     errorMsg.toLowerCase().includes('context lost');
                
                if (isContextLoss && retryCount < maxRetries) {
                    console.warn(`⚠️ WebGL context lost during compilation, retrying (${retryCount + 1}/${maxRetries})...`);
                    retryCount++;
                    continue; // Retry with a new page
                }
                
                // Not a context loss error or max retries exceeded, rethrow
                throw error;
            }
            }

            // Attendre que le shader se charge et se rende
            console.log('⏳ Attente du rendu initial du shader...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre plus longtemps pour le premier rendu
            
            // Vérifier que le shader se rend correctement
            const renderCheck = await compilationPage.evaluate(() => {
                const canvas = document.getElementById('shaderCanvas');
                if (!canvas) return { error: 'Canvas non trouvé' };
                
                // Vérifier que WebGL est actif
                const gl = window.gl;
                if (!gl) return { error: 'WebGL non disponible' };
                
                // Vérifier qu'un shader program est actif
                const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
                return {
                    hasCanvas: !!canvas,
                    hasGl: !!gl,
                    hasProgram: !!currentProgram,
                    canvasWidth: canvas.width,
                    canvasHeight: canvas.height
                };
            });
            
            console.log('🔍 Vérification rendu:', renderCheck);
            if (renderCheck.error || !renderCheck.hasProgram) {
                console.warn('⚠️ Le shader pourrait ne pas être rendu correctement');
            }

            // Sur Vercel, capturer seulement quelques frames pour économiser la mémoire
            const frames = [];
            const totalFrames = this.isVercel ? 10 : this.frameRate * this.duration;
            
            // Créer le répertoire de frames au début (pour sauvegarde immédiate)
            let frameDirectory = null;
            if (!this.isVercel) {
                frameDirectory = path.join(this.outputDir, `shader_${Date.now()}`);
                await fs.mkdir(frameDirectory, { recursive: true });
                console.log(`📁 Répertoire de frames créé: ${frameDirectory}`);
            }
            
            console.log(`🎬 Début de la capture de ${totalFrames} frames...`);
            
            for (let i = 0; i < totalFrames; i++) {
                if (i % 10 === 0 || i === totalFrames - 1) {
                    console.log(`📸 Capture frame ${i + 1}/${totalFrames}...`);
                }
                
                // Attendre le bon moment pour la frame (avec délai supplémentaire pour laisser le système respirer)
                const frameDelay = Math.max(1000 / this.frameRate, 50); // Au minimum 50ms entre frames
                await new Promise(resolve => setTimeout(resolve, frameDelay));
                
                // Vérifier que la page est toujours ouverte
                if (compilationPage.isClosed()) {
                    throw new Error('La page a été fermée pendant la capture des frames');
                }
                
                try {
                    // Calculer le temps pour cette frame
                    const frameTime = (i / this.frameRate); // temps en secondes pour cette frame
                    
                    // Forcer un rendu avec le bon temps (avec timeout)
                    const renderStartTime = Date.now();
                    let renderSuccess = false;
                    try {
                        renderSuccess = await Promise.race([
                            compilationPage.evaluate((time) => {
                                // Mettre à jour startTime pour que l'animation utilise le bon temps
                                if (window.startTime !== undefined) {
                                    // Calculer le startTime pour que currentTime = time
                                    const now = performance.now();
                                    window.startTime = now - (time * 1000);
                                }
                                
                                // Forcer un rendu immédiat
                                if (window.renderFrame) {
                                    return window.renderFrame(time);
                                }
                                return false;
                            }, frameTime),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Render timeout')), 8000))
                        ]);
                    } catch (renderError) {
                        if (renderError.message === 'Render timeout') {
                            console.warn(`⚠️ Timeout du rendu pour la frame ${i + 1}, continuation...`);
                        } else {
                            throw renderError;
                        }
                    }
                    
                    const renderDuration = Date.now() - renderStartTime;
                    if (renderDuration > 1000) {
                        console.warn(`⚠️ Rendu frame ${i + 1} a pris ${renderDuration}ms (lent)`);
                    }
                    
                    if (!renderSuccess) {
                        console.warn(`⚠️ Échec du rendu pour la frame ${i + 1}`);
                    }
                    
                    // Attendre que le rendu soit terminé (délai augmenté pour laisser le GPU finir)
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Capturer avec page.screenshot() (beaucoup plus rapide que readPixels)
                    const captureStartTime = Date.now();
                    let screenshot = null;
                    try {
                        screenshot = await Promise.race([
                            compilationPage.screenshot({
                                type: 'png',
                                clip: {
                                    x: 0,
                                    y: 0,
                                    width: compilationWidth,
                                    height: compilationHeight
                                }
                            }),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Screenshot timeout')), 5000))
                        ]);
                    } catch (captureError) {
                        if (captureError.message === 'Screenshot timeout') {
                            console.warn(`⚠️ Timeout de la capture pour la frame ${i + 1}, frame ignorée...`);
                        } else {
                            throw captureError;
                        }
                    }
                    
                    const captureDuration = Date.now() - captureStartTime;
                    if (captureDuration > 1000) {
                        console.warn(`⚠️ Capture frame ${i + 1} a pris ${captureDuration}ms (lent)`);
                    }
                    
                    if (screenshot) {
                        // screenshot est déjà un Buffer PNG
                        frames.push(screenshot);
                        
                        // Sauvegarder immédiatement sur disque si possible
                        if (frameDirectory) {
                            try {
                                const framePath = path.join(frameDirectory, `frame_${i.toString().padStart(4, '0')}.png`);
                                await fs.writeFile(framePath, screenshot);
                                if (i % 10 === 0 || i === totalFrames - 1) {
                                    console.log(`✅ Frame ${i + 1}/${totalFrames} capturée et sauvegardée (${(screenshot.length / 1024).toFixed(1)} KB)`);
                                }
                            } catch (saveError) {
                                console.warn(`⚠️ Erreur sauvegarde frame ${i + 1}:`, saveError.message);
                                if (i % 10 === 0 || i === totalFrames - 1) {
                                    console.log(`✅ Frame ${i + 1}/${totalFrames} capturée (${(screenshot.length / 1024).toFixed(1)} KB) - non sauvegardée`);
                                }
                            }
                        } else {
                            if (i % 10 === 0 || i === totalFrames - 1) {
                                console.log(`✅ Frame ${i + 1}/${totalFrames} capturée (${(screenshot.length / 1024).toFixed(1)} KB)`);
                            }
                        }
                    } else {
                        console.warn(`⚠️ Frame ${i + 1} non capturée (timeout), frame ignorée`);
                    }
                    
                    // Délai supplémentaire après la capture pour laisser le système se stabiliser
                    if (i < totalFrames - 1) { // Pas de délai après la dernière frame
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                } catch (error) {
                    // Si la page se ferme pendant la capture, arrêter et retourner ce qu'on a
                    if (error.message && (error.message.includes('Target closed') || error.message.includes('Session closed'))) {
                        console.warn(`⚠️ Page fermée à la frame ${i + 1}/${totalFrames}, arrêt de la capture`);
                        break;
                    }
                    throw error;
                }
            }

            // Vérifier les frames sauvegardées sur disque si le tableau est vide
            let framesToUse = [...frames]; // Copie du tableau
            if (frames.length === 0 && frameDirectory) {
                try {
                    const savedFrames = await fs.readdir(frameDirectory);
                    const pngFrames = savedFrames.filter(f => f.endsWith('.png')).sort();
                    if (pngFrames.length > 0) {
                        console.log(`📂 ${pngFrames.length} frames trouvées sur disque, chargement...`);
                        framesToUse = []; // Réinitialiser le tableau
                        for (const frameFile of pngFrames) {
                            const framePath = path.join(frameDirectory, frameFile);
                            const frameData = await fs.readFile(framePath);
                            framesToUse.push(frameData);
                        }
                        console.log(`✅ ${framesToUse.length} frames chargées depuis le disque`);
                    }
                } catch (readError) {
                    console.warn('⚠️ Erreur lecture frames depuis disque:', readError.message);
                }
            }
            
            // Accepter de créer un GIF même avec très peu de frames (minimum 1)
            if (framesToUse.length === 0) {
                throw new Error('Aucune frame capturée. La page a peut-être été fermée trop tôt.');
            }
            
            console.log(`✅ Capture terminée: ${framesToUse.length}/${totalFrames} frames capturées`);
            
            if (framesToUse.length < totalFrames) {
                console.warn(`⚠️ Seulement ${framesToUse.length}/${totalFrames} frames capturées, création du GIF avec les frames disponibles`);
            }
            
            // Si on a très peu de frames, dupliquer pour avoir un GIF plus fluide
            if (framesToUse.length < 10 && framesToUse.length > 0) {
                const originalFrames = [...framesToUse];
                while (framesToUse.length < 10) {
                    framesToUse.push(...originalFrames);
                }
                console.log(`🔄 ${framesToUse.length} frames (dupliquées pour fluidité)`);
            }

            // Sur Vercel, on ne sauvegarde pas les fichiers (pas de persistance)
            let gifPath = null;
            if (!this.isVercel && frameDirectory) {
                // Les frames sont déjà sauvegardées au fur et à mesure
                console.log(`💾 ${framesToUse.length} frames à utiliser pour le GIF`);
                
                // Ajouter watermark pour les utilisateurs gratuits
                // options.userId et options.database sont passés depuis les commandes
                if (options.userId && options.database) {
                    try {
                        const userPlan = await options.database.getUserPlan(options.userId);
                        if (userPlan === 'free') {
                            console.log('💧 Plan Free détecté - Ajout du watermark...');
                            await Watermark.addWatermarkToFrames(frameDirectory, 'GLSL Bot');
                        }
                    } catch (watermarkError) {
                        console.warn('⚠️ Erreur ajout watermark (continuation sans watermark):', watermarkError.message);
                    }
                }
                
                // Créer un GIF animé à partir des frames avec la résolution appropriée
                console.log('🎬 Génération du GIF animé...');
                gifPath = await this.createGifFromFrames(framesToUse, frameDirectory, compilationWidth, compilationHeight);
                if (gifPath) {
                    console.log(`✅ GIF généré: ${gifPath}`);
                } else {
                    console.warn('⚠️ Échec de la génération du GIF');
                }
                
                // Export MP4 pour les utilisateurs premium (Pro et Studio)
                let mp4Path = null;
                if (options.userId && options.database) {
                    try {
                        const userPlan = await options.database.getUserPlan(options.userId);
                        if (userPlan === 'pro' || userPlan === 'studio') {
                            console.log('🎥 Plan Premium détecté - Export MP4...');
                            try {
                                const mp4OutputPath = path.join(frameDirectory, 'animation.mp4');
                                mp4Path = await MP4Exporter.exportToMP4(frameDirectory, mp4OutputPath, {
                                    width: compilationWidth,
                                    height: compilationHeight,
                                    frameRate: this.frameRate
                                });
                                console.log(`✅ MP4 exporté: ${mp4Path}`);
                            } catch (mp4Error) {
                                console.warn('⚠️ Erreur export MP4 (continuation sans MP4):', mp4Error.message);
                                // Continuer sans MP4 si l'export échoue
                            }
                        }
                    } catch (planError) {
                        console.warn('⚠️ Erreur vérification plan pour MP4:', planError.message);
                    }
                }
            }

            // Créer un fichier de métadonnées
            const metadata = {
                frames: framesToUse.length,
                frameRate: this.frameRate,
                duration: this.isVercel ? (totalFrames / this.frameRate) : this.duration,
                resolution: `${compilationWidth}x${compilationHeight}`,
                shaderCode: shaderCode,
                compilationTime: Date.now(),
                environment: this.isVercel ? 'vercel' : 'local'
            };

            console.log('✅ Shader WebGL compilé avec succès');
            updateProgress(100, 'Compilation terminée');
            
            // Mettre en cache le GIF si généré avec succès
            if (gifPath && !options.skipCache) {
                try {
                    this.shaderCache.setCache(shaderCode, gifPath, {
                        preset: shaderType,
                        frames: framesToUse.length,
                        resolution: `${this.canvasWidth}x${this.canvasHeight}`
                    });
                } catch (cacheError) {
                    console.warn('⚠️ Erreur mise en cache:', cacheError.message);
                }
            }
            
            // Enregistrer les métriques de succès
            const duration = Date.now() - startTime;
            this.metrics.recordCompilation(duration, true, shaderType, userId);
            
            // Telemetry - End span avec succès
            if (telemetrySpan) {
                try {
                    const { getTelemetry } = require('../utils/telemetry');
                    getTelemetry().endSpan(telemetrySpan, 'success');
                    getTelemetry().recordMetric('compilation_duration', duration, { shaderType });
                } catch (err) {
                    // Ignorer les erreurs de telemetry
                }
            }
            
            // Circuit Breaker - Enregistrer le succès
            if (circuitBreaker) {
                try {
                    circuitBreaker.recordSuccess();
                } catch (err) {
                    // Ignorer les erreurs
                }
            }
            
            // Marquer comme terminé dans le progress tracker
            if (progressTracker) {
                progressTracker.complete(jobId, { gifPath, metadata });
            }
            
            return {
                success: true,
                frameDirectory: frameDirectory,
                gifPath: gifPath,
                metadata: metadata,
                error: null
            };

        } catch (error) {
            console.error('❌ Erreur compilation WebGL:', error);
            
            // Enregistrer les métriques d'échec
            const duration = Date.now() - startTime;
            this.metrics.recordCompilation(duration, false, shaderType, userId);
            this.metrics.recordError(error, { 
                shaderType, 
                userId,
                shaderCodeLength: shaderCode?.length || 0
            });
            
            // Telemetry - End span avec échec
            if (telemetrySpan) {
                try {
                    const { getTelemetry } = require('../utils/telemetry');
                    getTelemetry().endSpan(telemetrySpan, 'failure', error);
                } catch (err) {
                    // Ignorer les erreurs de telemetry
                }
            }
            
            // Circuit Breaker - Enregistrer l'échec
            if (circuitBreaker) {
                try {
                    circuitBreaker.recordFailure();
                } catch (err) {
                    // Ignorer les erreurs
                }
            }
            
            // Marquer comme échoué dans le progress tracker
            if (progressTracker) {
                progressTracker.fail(jobId, error);
            }
            
            return {
                success: false,
                error: error.message,
                frameDirectory: null
            };
        } finally {
            // Fermer la page de compilation pour libérer les ressources
            if (compilationPage && !compilationPage.isClosed()) {
                try {
                    await compilationPage.close();
                    console.log('✅ Page de compilation fermée');
                } catch (closeError) {
                    console.warn('⚠️ Erreur lors de la fermeture de la page:', closeError.message);
                }
            }
            
            // Libérer le browser dans le pool
            if (browser) {
                this.browserPool.releaseBrowser(browser);
            }
            
            // Terminer le suivi des métriques
            this.metrics.endCompilation();
        }
    }

    detectShaderFormat(shaderCode) {
        // Gérer les cas null/undefined
        if (!shaderCode || typeof shaderCode !== 'string') {
            return 'glsl'; // Par défaut
        }
        
        // Détecter si c'est WGSL ou GLSL
        const wgslKeywords = ['@fragment', '@vertex', '@compute', '@group', '@binding', 'fn main', 'var<', 'let ', 'struct ', 'texture_', 'sampler_', 'textureSample', 'textureLoad'];
        const glslKeywords = ['void main', 'gl_FragColor', 'gl_FragCoord', 'uniform ', 'attribute ', 'varying ', 'vec2', 'vec3', 'vec4', 'mat2', 'mat3', 'mat4', 'mainImage'];
        
        const wgslCount = wgslKeywords.filter(kw => shaderCode.includes(kw)).length;
        const glslCount = glslKeywords.filter(kw => shaderCode.includes(kw)).length;
        
        if (wgslCount > glslCount) {
            return 'wgsl';
        } else if (glslCount > 0 || shaderCode.includes('mainImage')) {
            return 'glsl';
        }
        
        // Par défaut, supposer GLSL (compatibilité)
        return 'glsl';
    }

    async validateShader(shaderCode) {
        const errors = [];
        const warnings = [];
        const format = this.detectShaderFormat(shaderCode);

        // Validation générale
        if (shaderCode.length > 10000) {
            errors.push('Shader trop long (max 10,000 caractères)');
        }

        // Validation spécifique au format
        if (format === 'glsl') {
            if (!shaderCode.includes('mainImage') && !shaderCode.includes('void main')) {
                warnings.push('Fonction mainImage() ou void main() recommandée');
        }

        if (!shaderCode.includes('gl_FragColor') && !shaderCode.includes('out')) {
            warnings.push('Sortie de couleur non définie');
            }
        } else if (format === 'wgsl') {
            if (!shaderCode.includes('@fragment') && !shaderCode.includes('fn main')) {
                warnings.push('Fonction @fragment ou fn main() recommandée pour WGSL');
            }
        }

        // Vérifier la syntaxe basique
        const glslKeywords = ['vec2', 'vec3', 'vec4', 'float', 'int', 'void', 'for', 'if', 'else'];
        const wgslKeywords = ['vec2', 'vec3', 'vec4', 'f32', 'i32', 'fn', 'for', 'if', 'else', 'var', 'let'];
        const hasBasicSyntax = format === 'wgsl' 
            ? wgslKeywords.some(keyword => shaderCode.includes(keyword))
            : glslKeywords.some(keyword => shaderCode.includes(keyword));
        
        if (!hasBasicSyntax) {
            warnings.push(`Code ${format.toUpperCase()} très basique détecté`);
        }

        return {
            valid: errors.length === 0,
            format: format,
            errors,
            warnings
        };
    }

    // Fonction pour quantifier les couleurs pour une meilleure compression GIF
    // Réduit le nombre de couleurs uniques en arrondissant les valeurs RGB
    quantizeColorsForGif(imageData, colorLevels = 8) {
        // colorLevels: nombre de niveaux par canal (8 = 8 niveaux = palette réduite)
        // 8 niveaux = 8^3 = 512 couleurs max, idéal pour GIF
        const levels = colorLevels;
        const step = 255 / (levels - 1);
        const invStep = 1 / step; // Précalculer l'inverse pour éviter les divisions
        
        // Optimisation: traiter par chunks pour permettre au système de respirer
        const chunkSize = 10000; // Traiter 10000 pixels à la fois
        const totalPixels = imageData.length / 4;
        
        for (let chunkStart = 0; chunkStart < totalPixels; chunkStart += chunkSize) {
            const chunkEnd = Math.min(chunkStart + chunkSize, totalPixels);
            
            for (let i = chunkStart * 4; i < chunkEnd * 4; i += 4) {
                // Quantifier chaque canal RGB (pas l'alpha) - version optimisée
                imageData[i] = Math.round(imageData[i] * invStep) * step;     // R
                imageData[i + 1] = Math.round(imageData[i + 1] * invStep) * step; // G
                imageData[i + 2] = Math.round(imageData[i + 2] * invStep) * step; // B
                // Alpha reste inchangé
            }
        }
        
        return imageData;
    }

    async createGifFromFrames(frames, frameDirectory, width = null, height = null) {
        // Utiliser les dimensions fournies ou les dimensions par défaut
        const gifWidth = width || this.canvasWidth;
        const gifHeight = height || this.canvasHeight;
        try {
            console.log('🎬 Création du GIF animé (optimisé pour GIF)...');
            
            const gifPath = path.join(frameDirectory, 'animation.gif');
            
            // Si frames est un tableau de buffers, les utiliser directement
            // Sinon, lire depuis le répertoire
            let framesToProcess = frames;
            if (!Array.isArray(frames) || frames.length === 0) {
                // Lire les frames depuis le disque
                try {
                    const files = await fs.readdir(frameDirectory);
                    const frameFiles = files
                        .filter(f => f.startsWith('frame_') && f.endsWith('.png'))
                        .sort();
                    framesToProcess = [];
                    for (const file of frameFiles) {
                        const framePath = path.join(frameDirectory, file);
                        const frameBuffer = await fs.readFile(framePath);
                        framesToProcess.push(frameBuffer);
                    }
                    console.log(`📂 ${framesToProcess.length} frames chargées depuis le disque`);
                } catch (readError) {
                    console.error('❌ Erreur lecture frames depuis disque:', readError);
                    return null;
                }
            }
            
            // Vérifier si l'optimisation GIF est activée via feature flag
            let useOptimizer = false;
            try {
                const { getFeatureFlags } = require('../utils/featureFlags');
                const flags = getFeatureFlags();
                useOptimizer = flags.isEnabled('gif-optimization');
            } catch (err) {
                // Feature flags non disponible, utiliser l'ancien système
            }
            
            // Utiliser l'optimiseur GIF si disponible et activé
            if (useOptimizer) {
                try {
                    const { GIFOptimizer } = require('../utils/gifOptimizer');
                    const optimizedGif = await GIFOptimizer.createOptimizedGIF(framesToProcess, {
                        width: gifWidth,
                        height: gifHeight,
                        quality: 'auto',
                        optimize: true,
                        delay: Math.round(1000 / this.frameRate)
                    });
                    
                    await fs.writeFile(gifPath, optimizedGif);
                    const stats = fsSync.statSync(gifPath);
                    const sizeKB = (stats.size / 1024).toFixed(2);
                    console.log(`✅ GIF optimisé créé: ${gifPath} (${sizeKB} KB)`);
                    return gifPath;
                } catch (optimizerError) {
                    console.warn('⚠️ Erreur avec l\'optimiseur GIF, utilisation du système standard:', optimizerError.message);
                    // Fallback sur l'ancien système
                }
            }
            
            // Système standard (fallback)
            const encoder = new GIFEncoder(gifWidth, gifHeight);
            
            // Configuration du GIF optimisée
            const fileStream = fsSync.createWriteStream(gifPath);
            encoder.createReadStream().pipe(fileStream);
            encoder.start();
            encoder.setRepeat(0); // Répéter indéfiniment
            encoder.setDelay(Math.round(1000 / this.frameRate)); // Délai entre frames (ms) - 33ms pour 30 FPS
            // Qualité optimisée pour GIF : 5-8 donne un bon compromis qualité/taille
            // Plus bas = meilleure qualité mais fichier plus gros
            encoder.setQuality(8); // Qualité optimisée pour GIF (1-30, plus bas = meilleure qualité)
            
            // Ajouter chaque frame au GIF avec quantisation des couleurs
            const totalFrames = framesToProcess.length;
            const startTime = Date.now();
            console.log(`🔄 Traitement de ${totalFrames} frames pour le GIF...`);
            
            for (let i = 0; i < framesToProcess.length; i++) {
                try {
                    const frameStartTime = Date.now();
                    
                    // Lire le PNG (synchrone mais rapide)
                    const png = PNG.sync.read(framesToProcess[i]);
                    
                    // Quantifier les couleurs pour réduire la palette (8 niveaux = ~512 couleurs max)
                    // Note: La quantisation peut être coûteuse, mais nécessaire pour la compression GIF
                    const quantizedData = this.quantizeColorsForGif(png.data, 8);
                    
                    // Ajouter la frame au GIF
                    encoder.addFrame(quantizedData);
                    
                    // Log de progression tous les 10 frames ou pour les dernières frames
                    if ((i + 1) % 10 === 0 || i === framesToProcess.length - 1) {
                        const elapsed = Date.now() - startTime;
                        const avgTime = elapsed / (i + 1);
                        const remaining = Math.round((totalFrames - i - 1) * avgTime / 1000);
                        const frameTime = Date.now() - frameStartTime;
                        console.log(`📊 GIF: ${i + 1}/${totalFrames} frames traitées (~${remaining}s restantes, ${frameTime}ms/frame)`);
                    }
                    
                    // Permettre au système de respirer tous les 20 frames
                    if ((i + 1) % 20 === 0) {
                        await new Promise(resolve => setImmediate(resolve));
                    }
                } catch (frameError) {
                    console.error(`❌ Erreur traitement frame ${i + 1}:`, frameError.message);
                    // Continuer avec les autres frames
                }
            }
            
            console.log('✅ Toutes les frames ajoutées, finalisation du GIF...');
            encoder.finish();
            
            // Attendre que le fichier soit complètement écrit
            await new Promise((resolve, reject) => {
                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
            });
            
            const stats = fsSync.statSync(gifPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`✅ GIF animé créé: ${gifPath} (${sizeKB} KB, ${framesToProcess.length} frames)`);
            
            return gifPath;
        } catch (error) {
            console.error('❌ Erreur création GIF:', error);
            return null;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

module.exports = { RealWebGLCompiler };
