/**
 * WebP Exporter - Exporte les animations en WebP animé pour les utilisateurs Studio
 * Utilise fluent-ffmpeg pour créer des WebP animés à partir des frames PNG
 * WebP animé offre une meilleure compression que GIF avec une qualité similaire
 */

const fs = require('fs');
const path = require('path');

class WebPExporter {
    /**
     * Exporte les frames en WebP animé
     * @param {string} frameDirectory - Répertoire contenant les frames PNG
     * @param {string} outputPath - Chemin de sortie pour le fichier WebP
     * @param {Object} options - Options d'export
     * @param {number} options.width - Largeur de l'animation
     * @param {number} options.height - Hauteur de l'animation
     * @param {number} options.frameRate - Frame rate (FPS)
     * @param {number} options.quality - Qualité (0-100, défaut: 80)
     * @returns {Promise<string>} - Chemin du fichier WebP créé
     */
    static async exportToWebP(frameDirectory, outputPath, options = {}) {
        const {
            width = 320,
            height = 240,
            frameRate = 30,
            quality = 80
        } = options;

        try {
            // Vérifier si fluent-ffmpeg est disponible
            let ffmpeg;
            try {
                ffmpeg = require('fluent-ffmpeg');
            } catch (error) {
                throw new Error('fluent-ffmpeg n\'est pas installé. Installez-le avec: npm install fluent-ffmpeg');
            }

            // Vérifier que le répertoire existe
            if (!fs.existsSync(frameDirectory)) {
                throw new Error(`Répertoire de frames introuvable: ${frameDirectory}`);
            }

            // Lister les frames PNG triées
            const frameFiles = fs.readdirSync(frameDirectory)
                .filter(f => f.endsWith('.png'))
                .sort();

            if (frameFiles.length === 0) {
                throw new Error('Aucune frame PNG trouvée dans le répertoire');
            }

            console.log(`🎬 Export WebP animé: ${frameFiles.length} frames, ${width}x${height}, ${frameRate} FPS, qualité ${quality}`);

            // Créer le pattern pour ffmpeg
            const framePattern = this.detectFramePattern(frameFiles, frameDirectory);

            return new Promise((resolve, reject) => {
                // Créer le répertoire de sortie si nécessaire
                const outputDir = path.dirname(outputPath);
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }

                const command = ffmpeg(framePattern);

                // Configuration pour WebP animé
                command
                    .inputFPS(frameRate)
                    .outputOptions([
                        '-c:v libwebp',                    // Codec WebP
                        `-quality ${quality}`,              // Qualité (0-100)
                        '-loop 0',                          // Boucle infinie
                        '-preset default',                 // Preset d'encodage
                        '-an',                              // Pas d'audio
                        '-vsync 0',                         // Pas de synchronisation vidéo
                        `-vf scale=${width}:${height}:flags=lanczos` // Redimensionnement avec Lanczos
                    ])
                    .output(outputPath)
                    .on('start', (commandLine) => {
                        console.log('🎬 Démarrage export WebP:', commandLine);
                    })
                    .on('progress', (progress) => {
                        if (progress.percent) {
                            console.log(`📊 Export WebP: ${Math.round(progress.percent)}%`);
                        }
                    })
                    .on('end', () => {
                        const stats = fs.statSync(outputPath);
                        const sizeKB = (stats.size / 1024).toFixed(2);
                        console.log(`✅ WebP animé exporté: ${outputPath} (${sizeKB} KB)`);
                        resolve(outputPath);
                    })
                    .on('error', (err) => {
                        console.error('❌ Erreur export WebP:', err.message);
                        reject(err);
                    });

                command.run();
            });
        } catch (error) {
            console.error('❌ Erreur export WebP:', error);
            throw error;
        }
    }

    /**
     * Détecte le pattern de nommage des frames pour ffmpeg
     * @param {string[]} frameFiles - Liste des fichiers frames
     * @param {string} frameDirectory - Répertoire des frames
     * @returns {string} - Pattern pour ffmpeg (ex: frame_%04d.png)
     */
    static detectFramePattern(frameFiles, frameDirectory) {
        if (frameFiles.length === 0) {
            throw new Error('Aucune frame trouvée');
        }

        // Analyser le premier fichier pour détecter le pattern
        const firstFile = frameFiles[0];
        const match = firstFile.match(/^(.+?)(\d+)(\.png)$/i);

        if (match) {
            const prefix = match[1];
            const number = match[2];
            const extension = match[3];
            const padding = number.length;

            // Créer le pattern pour ffmpeg
            const pattern = path.join(frameDirectory, `${prefix}%0${padding}d${extension}`);
            return pattern;
        }

        // Fallback: utiliser le premier fichier directement
        return path.join(frameDirectory, firstFile);
    }

    /**
     * Vérifie si ffmpeg supporte WebP
     * @returns {Promise<boolean>}
     */
    static async checkWebPSupport() {
        try {
            const { execSync } = require('child_process');
            const output = execSync('ffmpeg -codecs 2>/dev/null | grep webp || echo ""', { encoding: 'utf8' });
            return output.includes('webp');
        } catch (error) {
            return false;
        }
    }
}

module.exports = { WebPExporter };

