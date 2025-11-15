/**
 * MP4 Exporter - Exporte les animations en MP4 pour les utilisateurs premium
 * Utilise fluent-ffmpeg pour créer des vidéos MP4 à partir des frames PNG
 */

const fs = require('fs');
const path = require('path');

class MP4Exporter {
    /**
     * Exporte les frames en MP4
     * @param {string} frameDirectory - Répertoire contenant les frames PNG
     * @param {string} outputPath - Chemin de sortie pour le fichier MP4
     * @param {Object} options - Options d'export
     * @param {number} options.width - Largeur de la vidéo
     * @param {number} options.height - Hauteur de la vidéo
     * @param {number} options.frameRate - Frame rate (FPS)
     * @returns {Promise<string>} - Chemin du fichier MP4 créé
     */
    static async exportToMP4(frameDirectory, outputPath, options = {}) {
        const {
            width = 320,
            height = 240,
            frameRate = 30
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

            console.log(`🎬 Export MP4: ${frameFiles.length} frames, ${width}x${height}, ${frameRate} FPS`);

            // Créer le pattern de fichiers pour ffmpeg
            // ffmpeg attend un pattern comme frame_%04d.png
            // On doit vérifier le format des noms de fichiers
            const framePattern = this.detectFramePattern(frameFiles, frameDirectory);

            return new Promise((resolve, reject) => {
                // Créer le répertoire de sortie si nécessaire
                const outputDir = path.dirname(outputPath);
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }

                // Créer la commande ffmpeg
                const command = ffmpeg();
                
                // Si le pattern contient %0Xd, utiliser input() avec le pattern
                // Sinon, utiliser input() avec le premier fichier et start_number
                if (framePattern.includes('%0')) {
                    command.input(framePattern);
                } else {
                    // Pattern générique: utiliser le premier fichier et spécifier start_number
                    const firstFramePath = framePattern;
                    const numericPattern = /(\d+)/;
                    const firstMatch = frameFiles[0].match(numericPattern);
                    if (firstMatch) {
                        command.input(firstFramePath);
                        command.inputOptions([`-start_number ${firstMatch[1]}`]);
                    } else {
                        command.input(firstFramePath);
                    }
                }
                
                command
                    .inputFPS(frameRate)
                    .outputOptions([
                        '-c:v libx264',           // Codec vidéo H.264
                        '-pix_fmt yuv420p',       // Format pixel compatible
                        '-crf 23',                // Qualité (18-28, plus bas = meilleure qualité)
                        '-preset medium',          // Preset d'encodage (ultrafast, fast, medium, slow, veryslow)
                        '-movflags +faststart',    // Optimisation pour streaming web
                        '-vf', `scale=${width}:${height}:flags=lanczos` // Redimensionnement avec Lanczos
                    ])
                    .output(outputPath)
                    .on('start', (commandLine) => {
                        console.log('🎬 Démarrage export MP4:', commandLine);
                    })
                    .on('progress', (progress) => {
                        if (progress.percent) {
                            console.log(`📊 Export MP4: ${Math.round(progress.percent)}%`);
                        }
                    })
                    .on('end', () => {
                        const stats = fs.statSync(outputPath);
                        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                        console.log(`✅ MP4 exporté: ${outputPath} (${sizeMB} MB)`);
                        resolve(outputPath);
                    })
                    .on('error', (err) => {
                        console.error('❌ Erreur export MP4:', err.message);
                        reject(err);
                    });

                command.run();
            });
        } catch (error) {
            console.error('❌ Erreur export MP4:', error);
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

        const firstFrame = frameFiles[0];
        const lastFrame = frameFiles[frameFiles.length - 1];

        // Vérifier si les frames suivent un pattern numérique
        // Exemples: frame_0000.png, frame_0001.png, etc.
        const numericPattern = /(\d+)/;
        const firstMatch = firstFrame.match(numericPattern);
        const lastMatch = lastFrame.match(numericPattern);

        if (firstMatch && lastMatch) {
            // Extraire le préfixe et le suffixe
            const prefix = firstFrame.substring(0, firstMatch.index);
            const suffix = firstFrame.substring(firstMatch.index + firstMatch[1].length);
            
            // Déterminer le padding (nombre de chiffres)
            const padding = firstMatch[1].length;
            
            // Créer le pattern ffmpeg
            const pattern = path.join(frameDirectory, `${prefix}%0${padding}d${suffix}`);
            console.log(`📐 Pattern détecté: ${pattern}`);
            return pattern;
        }

        // Fallback: utiliser le premier fichier et espérer que ffmpeg peut le gérer
        console.warn('⚠️ Pattern de frames non détecté, utilisation du premier fichier');
        return path.join(frameDirectory, firstFrame);
    }

    /**
     * Vérifie si ffmpeg est disponible sur le système
     * @returns {Promise<boolean>}
     */
    static async isFFmpegAvailable() {
        try {
            const ffmpeg = require('fluent-ffmpeg');
            return new Promise((resolve) => {
                ffmpeg.getAvailableEncoders((err, encoders) => {
                    if (err) {
                        console.warn('⚠️ FFmpeg non disponible:', err.message);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });
        } catch (error) {
            return false;
        }
    }
}

module.exports = { MP4Exporter };

