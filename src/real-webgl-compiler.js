/**
 * Real WebGL Shader Compiler - Version Serverless pour Vercel
 * Compilation WebGL réelle avec animations - Optimisé pour Vercel
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class RealWebGLCompiler {
    constructor() {
        this.browser = null;
        this.page = null;
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.outputDir = './output';
        this.frameRate = 30;
        this.duration = 3; // 3 secondes d'animation
        this.isVercel = process.env.VERCEL === '1';
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
            
            // Sur Vercel, utiliser des options optimisées
            const launchOptions = {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--single-process',
                    '--disable-extensions'
                ]
            };

            // Sur Vercel, ajouter des options spécifiques
            if (this.isVercel) {
                launchOptions.args.push(
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                );
            }

            this.browser = await puppeteer.launch(launchOptions);
            this.page = await this.browser.newPage();
            await this.page.setViewport({
                width: this.canvasWidth,
                height: this.canvasHeight
            });

            // Charger le template WebGL
            await this.loadWebGLTemplate();
            
            console.log('✅ Compilateur WebGL réel initialisé');
            
        } catch (error) {
            console.error('❌ Erreur initialisation WebGL:', error);
            throw error;
        }
    }

    async loadWebGLTemplate() {
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
        const canvas = document.getElementById('shaderCanvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            throw new Error('WebGL non supporté');
        }

        // Variables globales
        let shaderProgram;
        let vertexBuffer;
        let timeLocation;
        let resolutionLocation;
        let mouseLocation;
        let startTime;

        // Vertex shader simple
        const vertexShaderSource = \`
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        \`;

        // Fragment shader template (sera remplacé)
        let fragmentShaderSource = \`
            precision mediump float;
            uniform float iTime;
            uniform vec2 iResolution;
            uniform vec2 iMouse;
            
            void mainImage(out vec4 fragColor, in vec2 fragCoord) {
                vec2 uv = fragCoord/iResolution.xy;
                vec2 p = (2.0*fragCoord-iResolution.xy)/min(iResolution.y,iResolution.x);
                
                float t = iTime * 0.5;
                vec3 col = 0.5 + 0.5*cos(t+uv.xyx+vec3(0,2,4));
                
                fragColor = vec4(col, 1.0);
            }
            
            void main() {
                mainImage(gl_FragColor, gl_FragCoord.xy);
            }
        \`;

        // Initialisation WebGL
        function initWebGL() {
            // Créer le programme de shader
            const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
            
            shaderProgram = createProgram(vertexShader, fragmentShader);
            
            // Obtenir les locations des uniforms
            timeLocation = gl.getUniformLocation(shaderProgram, 'iTime');
            resolutionLocation = gl.getUniformLocation(shaderProgram, 'iResolution');
            mouseLocation = gl.getUniformLocation(shaderProgram, 'iMouse');
            
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
            
            // Configuration des attributs
            const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        }

        function createShader(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Erreur compilation shader:', gl.getShaderInfoLog(shader));
                throw new Error('Erreur compilation shader');
            }
            
            return shader;
        }

        function createProgram(vertexShader, fragmentShader) {
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error('Erreur liaison programme:', gl.getProgramInfoLog(program));
                throw new Error('Erreur liaison programme');
            }
            
            return program;
        }

        function render(time) {
            const currentTime = (time - startTime) / 1000.0;
            
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            gl.useProgram(shaderProgram);
            
            // Mettre à jour les uniforms
            gl.uniform1f(timeLocation, currentTime);
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
            gl.uniform2f(mouseLocation, 0.5, 0.5); // Position souris par défaut
            
            // Dessiner le quad
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        function animate() {
            const time = performance.now();
            render(time);
            requestAnimationFrame(animate);
        }

        // Fonction pour changer le fragment shader
        window.updateShader = function(newShaderCode) {
            try {
                // Mettre à jour le fragment shader
                fragmentShaderSource = \`
                    precision mediump float;
                    uniform float iTime;
                    uniform vec2 iResolution;
                    uniform vec2 iMouse;
                    
                    \${newShaderCode}
                    
                    void main() {
                        mainImage(gl_FragColor, gl_FragCoord.xy);
                    }
                \`;
                
                // Recréer le programme
                const newFragmentShader = createShader(gl.VERTEX_SHADER, fragmentShaderSource);
                const newProgram = createProgram(gl.createShader(gl.VERTEX_SHADER, vertexShaderSource), newFragmentShader);
                
                // Nettoyer l'ancien programme
                gl.deleteProgram(shaderProgram);
                shaderProgram = newProgram;
                
                // Mettre à jour les locations
                timeLocation = gl.getUniformLocation(shaderProgram, 'iTime');
                resolutionLocation = gl.getUniformLocation(shaderProgram, 'iResolution');
                mouseLocation = gl.getUniformLocation(shaderProgram, 'iMouse');
                
                console.log('Shader mis à jour avec succès');
                return true;
            } catch (error) {
                console.error('Erreur mise à jour shader:', error);
                return false;
            }
        };

        // Démarrer
        startTime = performance.now();
        initWebGL();
        animate();
    </script>
</body>
</html>`;

        await this.page.setContent(template);
        await this.page.waitForSelector('#shaderCanvas');
    }

    async compileShader(shaderCode, options = {}) {
        try {
            console.log('🔄 Compilation WebGL réelle du shader...');
            
            // Mettre à jour le shader dans la page
            const updateSuccess = await this.page.evaluate((code) => {
                return window.updateShader(code);
            }, shaderCode);

            if (!updateSuccess) {
                throw new Error('Échec de la mise à jour du shader');
            }

            // Attendre que le shader se charge
            await this.page.waitForTimeout(1000);

            // Sur Vercel, capturer seulement quelques frames pour économiser la mémoire
            const frames = [];
            const totalFrames = this.isVercel ? 10 : this.frameRate * this.duration;
            
            for (let i = 0; i < totalFrames; i++) {
                // Attendre le bon moment pour la frame
                await this.page.waitForTimeout(1000 / this.frameRate);
                
                // Capturer la frame
                const screenshot = await this.page.screenshot({
                    type: 'png',
                    clip: {
                        x: 0,
                        y: 0,
                        width: this.canvasWidth,
                        height: this.canvasHeight
                    }
                });
                
                frames.push(screenshot);
            }

            // Sur Vercel, on ne sauvegarde pas les fichiers (pas de persistance)
            let frameDirectory = null;
            if (!this.isVercel) {
                // Sauvegarder les frames localement seulement
                frameDirectory = path.join(this.outputDir, `shader_${Date.now()}`);
                await fs.mkdir(frameDirectory, { recursive: true });
                
                for (let i = 0; i < frames.length; i++) {
                    const framePath = path.join(frameDirectory, `frame_${i.toString().padStart(4, '0')}.png`);
                    await fs.writeFile(framePath, frames[i]);
                }
            }

            // Créer un fichier de métadonnées
            const metadata = {
                frames: frames.length,
                frameRate: this.frameRate,
                duration: this.isVercel ? (totalFrames / this.frameRate) : this.duration,
                resolution: `${this.canvasWidth}x${this.canvasHeight}`,
                shaderCode: shaderCode,
                compilationTime: Date.now(),
                environment: this.isVercel ? 'vercel' : 'local'
            };

            console.log('✅ Shader WebGL compilé avec succès');
            
            return {
                success: true,
                frameDirectory: frameDirectory,
                metadata: metadata,
                error: null
            };

        } catch (error) {
            console.error('❌ Erreur compilation WebGL:', error);
            return {
                success: false,
                error: error.message,
                frameDirectory: null
            };
        }
    }

    async validateShader(shaderCode) {
        const errors = [];
        const warnings = [];

        // Validation avancée pour WebGL
        if (shaderCode.length > 10000) {
            errors.push('Shader trop long (max 10,000 caractères)');
        }

        if (!shaderCode.includes('mainImage')) {
            warnings.push('Fonction mainImage() recommandée pour la compatibilité Shadertoy');
        }

        if (!shaderCode.includes('gl_FragColor') && !shaderCode.includes('out')) {
            warnings.push('Sortie de couleur non définie');
        }

        // Vérifier la syntaxe GLSL basique
        const glslKeywords = ['vec2', 'vec3', 'vec4', 'float', 'int', 'void', 'for', 'if', 'else'];
        const hasBasicGLSL = glslKeywords.some(keyword => shaderCode.includes(keyword));
        
        if (!hasBasicGLSL) {
            warnings.push('Code GLSL très basique détecté');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

module.exports = { RealWebGLCompiler };
