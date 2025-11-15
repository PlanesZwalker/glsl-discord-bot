/**
 * Watermark Utility - Ajoute un watermark aux images pour les utilisateurs gratuits
 */

const sharp = require('sharp');
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

class Watermark {
    /**
     * Crée un buffer PNG pour le watermark
     */
    static createWatermarkImage(width, height, text = 'GLSL Bot') {
        // Créer une image transparente avec le texte
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:rgba(255,255,255,0.3);stop-opacity:1" />
                        <stop offset="100%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="${width}" height="${height}" fill="url(#grad)"/>
                <text 
                    x="50%" 
                    y="50%" 
                    font-family="Arial, sans-serif" 
                    font-size="${Math.min(width, height) * 0.15}" 
                    font-weight="bold"
                    fill="rgba(255,255,255,0.6)" 
                    text-anchor="middle" 
                    dominant-baseline="middle"
                    transform="rotate(-45 ${width/2} ${height/2})"
                >
                    ${text}
                </text>
            </svg>
        `;
        
        return Buffer.from(svg);
    }

    /**
     * Ajoute un watermark à une image PNG (buffer)
     */
    static async addWatermarkToPNGBuffer(pngBuffer, watermarkText = 'GLSL Bot') {
        try {
            // Obtenir les dimensions de l'image
            const metadata = await sharp(pngBuffer).metadata();
            const width = metadata.width;
            const height = metadata.height;

            // Créer le watermark SVG
            const watermarkSvg = this.createWatermarkImage(width, height, watermarkText);
            
            // Superposer le watermark sur l'image
            const watermarked = await sharp(pngBuffer)
                .composite([
                    {
                        input: watermarkSvg,
                        blend: 'over'
                    }
                ])
                .png()
                .toBuffer();

            return watermarked;
        } catch (error) {
            console.error('❌ Erreur ajout watermark:', error);
            // En cas d'erreur, retourner l'image originale
            return pngBuffer;
        }
    }

    /**
     * Ajoute un watermark à un fichier PNG
     */
    static async addWatermarkToPNGFile(filePath, outputPath = null, watermarkText = 'GLSL Bot') {
        try {
            const pngBuffer = fs.readFileSync(filePath);
            const watermarked = await this.addWatermarkToPNGBuffer(pngBuffer, watermarkText);
            
            const output = outputPath || filePath;
            fs.writeFileSync(output, watermarked);
            
            return output;
        } catch (error) {
            console.error('❌ Erreur ajout watermark au fichier:', error);
            throw error;
        }
    }

    /**
     * Ajoute un watermark à toutes les frames d'un répertoire
     */
    static async addWatermarkToFrames(frameDirectory, watermarkText = 'GLSL Bot') {
        try {
            const files = fs.readdirSync(frameDirectory)
                .filter(f => f.endsWith('.png'))
                .sort();

            console.log(`💧 Ajout du watermark à ${files.length} frames...`);

            for (const file of files) {
                const filePath = path.join(frameDirectory, file);
                await this.addWatermarkToPNGFile(filePath, null, watermarkText);
            }

            console.log(`✅ Watermark ajouté à ${files.length} frames`);
            return true;
        } catch (error) {
            console.error('❌ Erreur ajout watermark aux frames:', error);
            throw error;
        }
    }

    /**
     * Ajoute un watermark à un tableau de buffers PNG
     */
    static async addWatermarkToFrameBuffers(frameBuffers, watermarkText = 'GLSL Bot') {
        try {
            console.log(`💧 Ajout du watermark à ${frameBuffers.length} frames (buffers)...`);

            const watermarkedFrames = await Promise.all(
                frameBuffers.map(buffer => this.addWatermarkToPNGBuffer(buffer, watermarkText))
            );

            console.log(`✅ Watermark ajouté à ${watermarkedFrames.length} frames`);
            return watermarkedFrames;
        } catch (error) {
            console.error('❌ Erreur ajout watermark aux buffers:', error);
            // En cas d'erreur, retourner les frames originales
            return frameBuffers;
        }
    }
}

module.exports = { Watermark };

