/**
 * GIF Optimizer - Compression adaptative des GIFs selon la complexité
 * Optimise la taille des fichiers tout en préservant la qualité visuelle
 */

const { Logger } = require('./logger');

class GIFOptimizer {
    /**
     * Détecte la qualité optimale selon la complexité des frames
     */
    static async detectOptimalQuality(frames) {
        if (!frames || frames.length === 0) return 10; // Default medium

        try {
            // Analyser la première frame pour estimer la complexité
            const sample = frames[0];
            const colors = await this.countUniqueColors(sample);

            // Adapter la qualité selon le nombre de couleurs
            if (colors < 64) return 1;      // Très simple - qualité basse
            if (colors < 128) return 5;     // Simple - qualité moyenne-basse
            if (colors < 256) return 10;   // Moyen - qualité moyenne
            return 20;                      // Complexe - qualité haute
        } catch (error) {
            Logger.warn('Failed to detect optimal quality, using default', error);
            return 10;
        }
    }

    /**
     * Compte les couleurs uniques dans une frame (échantillonnage)
     */
    static async countUniqueColors(frame) {
        try {
            // Échantillonner pour éviter de traiter toute l'image
            const sampleSize = Math.min(frame.length, 10000);
            const sample = frame.slice(0, sampleSize);
            const colors = new Set();

            // Traiter par blocs de 4 (RGBA)
            for (let i = 0; i < sample.length - 3; i += 4) {
                const r = sample[i];
                const g = sample[i + 1];
                const b = sample[i + 2];
                // Ignorer l'alpha pour la détection de couleur
                const color = (r << 16) | (g << 8) | b;
                colors.add(color);
            }

            return colors.size;
        } catch (error) {
            Logger.warn('Failed to count colors', error);
            return 128; // Default medium complexity
        }
    }

    /**
     * Optimise une frame avec redimensionnement si nécessaire
     */
    static async optimizeFrame(frame, width, height, targetWidth = null, targetHeight = null) {
        try {
            // Si sharp est disponible, utiliser pour le redimensionnement
            let sharp;
            try {
                sharp = require('sharp');
            } catch (err) {
                // Sharp non disponible, retourner la frame telle quelle
                return frame;
            }

            // Redimensionner seulement si nécessaire
            if (targetWidth && targetHeight && (width !== targetWidth || height !== targetHeight)) {
                const optimized = await sharp(frame, {
                    raw: {
                        width,
                        height,
                        channels: 4
                    }
                })
                .resize(targetWidth, targetHeight, {
                    fit: 'contain',
                    kernel: 'lanczos3'
                })
                .raw()
                .toBuffer();

                return optimized;
            }

            return frame;
        } catch (error) {
            Logger.warn('Frame optimization failed, using original', error);
            return frame;
        }
    }

    /**
     * Obtient la valeur de qualité selon le nom
     */
    static getQualityValue(quality) {
        const qualities = {
            low: 1,
            medium: 10,
            high: 20,
            auto: null // Sera déterminé dynamiquement
        };
        return qualities[quality] !== undefined ? qualities[quality] : 10;
    }

    /**
     * Crée un GIF optimisé avec compression adaptative
     */
    static async createOptimizedGIF(frames, options = {}) {
        const {
            width = 800,
            height = 600,
            quality = 'auto',
            optimize = true,
            delay = 33, // 30 FPS
            targetWidth = null,
            targetHeight = null
        } = options;

        try {
            const GIFEncoder = require('gif-encoder-2');

            // Déterminer la qualité
            let actualQuality;
            if (quality === 'auto') {
                actualQuality = await this.detectOptimalQuality(frames);
            } else {
                actualQuality = this.getQualityValue(quality);
            }

            Logger.info(`Creating optimized GIF: quality=${actualQuality}, size=${width}x${height}`);

            const encoder = new GIFEncoder(width, height, 'neuquant', optimize);
            encoder.setQuality(actualQuality);
            encoder.setDelay(delay);
            encoder.setRepeat(0);
            encoder.start();

            // Optimiser et ajouter chaque frame
            for (let i = 0; i < frames.length; i++) {
                const frame = frames[i];
                const optimized = await this.optimizeFrame(
                    frame,
                    width,
                    height,
                    targetWidth || width,
                    targetHeight || height
                );
                encoder.addFrame(optimized);
            }

            encoder.finish();
            const gifData = encoder.out.getData();

            Logger.info(`✅ Optimized GIF created: ${(gifData.length / 1024).toFixed(2)} KB`);

            return gifData;
        } catch (error) {
            Logger.error('GIF optimization failed', error);
            throw error;
        }
    }

    /**
     * Estime la taille optimale selon la complexité
     */
    static async estimateOptimalSize(frames, maxSize = 800) {
        try {
            const colors = await this.countUniqueColors(frames[0]);

            // Plus de couleurs = besoin de plus de résolution
            if (colors < 64) return { width: Math.floor(maxSize * 0.5), height: Math.floor(maxSize * 0.375) };
            if (colors < 128) return { width: Math.floor(maxSize * 0.75), height: Math.floor(maxSize * 0.5625) };
            return { width: maxSize, height: Math.floor(maxSize * 0.75) };
        } catch (error) {
            return { width: maxSize, height: Math.floor(maxSize * 0.75) };
        }
    }
}

module.exports = { GIFOptimizer };

