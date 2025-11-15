/**
 * Configuration centralisée des chemins de fichiers
 * Architecture propre pour séparer les différents types de fichiers
 */

const path = require('path');
const fs = require('fs');

class PathConfig {
    constructor() {
        // Dossier racine du projet
        this.rootDir = process.cwd();
        
        // Base de données
        this.dataDir = path.join(this.rootDir, 'data');
        this.dbPath = path.join(this.dataDir, 'shaders.db');
        
        // Storage - Tous les fichiers générés en production
        this.storageDir = path.join(this.rootDir, 'storage');
        this.framesDir = path.join(this.storageDir, 'frames');
        this.gifsDir = path.join(this.storageDir, 'gifs');
        this.mp4sDir = path.join(this.storageDir, 'mp4s');
        this.cacheDir = path.join(this.storageDir, 'cache');
        
        // Tests
        this.testsArtifactsDir = path.join(this.rootDir, 'tests', 'artifacts');
        
        // Documentation
        this.docsAssetsDir = path.join(this.rootDir, 'docs', 'assets');
        
        // Logs
        this.logsDir = path.join(this.rootDir, 'logs');
        
        // Initialiser tous les dossiers nécessaires
        this.initializeDirectories();
    }
    
    initializeDirectories() {
        const dirs = [
            this.dataDir,
            this.storageDir,
            this.framesDir,
            this.gifsDir,
            this.mp4sDir,
            this.cacheDir,
            this.testsArtifactsDir,
            this.docsAssetsDir,
            this.logsDir
        ];
        
        dirs.forEach(dir => {
            try {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            } catch (error) {
                console.warn(`⚠️ Impossible de créer le dossier ${dir}:`, error.message);
            }
        });
    }
    
    /**
     * Génère un chemin pour un shader spécifique
     * @param {string} shaderId - ID unique du shader
     * @param {string} type - Type de fichier: 'frames', 'gif', 'mp4'
     * @returns {string} Chemin complet
     */
    getShaderPath(shaderId, type = 'frames') {
        const timestamp = Date.now();
        const shaderDir = `shader_${shaderId}_${timestamp}`;
        
        switch (type) {
            case 'frames':
                return path.join(this.framesDir, shaderDir);
            case 'gif':
                return path.join(this.gifsDir, `${shaderDir}.gif`);
            case 'mp4':
                return path.join(this.mp4sDir, `${shaderDir}.mp4`);
            default:
                return path.join(this.framesDir, shaderDir);
        }
    }
    
    /**
     * Génère un chemin pour le cache
     * @param {string} hash - Hash du shader
     * @param {string} extension - Extension du fichier (.gif, .json)
     * @returns {string} Chemin complet
     */
    getCachePath(hash, extension = '.gif') {
        return path.join(this.cacheDir, `${hash}${extension}`);
    }
    
    /**
     * Nettoie les anciens fichiers d'un dossier
     * @param {string} dir - Dossier à nettoyer
     * @param {number} maxAge - Âge maximum en millisecondes
     */
    async cleanDirectory(dir, maxAge = 7 * 24 * 60 * 60 * 1000) {
        try {
            if (!fs.existsSync(dir)) {
                return;
            }
            
            const files = fs.readdirSync(dir);
            const now = Date.now();
            let cleaned = 0;
            
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtimeMs > maxAge) {
                    if (stats.isDirectory()) {
                        fs.rmSync(filePath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(filePath);
                    }
                    cleaned++;
                }
            }
            
            if (cleaned > 0) {
                console.log(`🧹 Nettoyé ${cleaned} fichier(s) dans ${dir}`);
            }
        } catch (error) {
            console.warn(`⚠️ Erreur lors du nettoyage de ${dir}:`, error.message);
        }
    }
}

// Instance singleton
const pathConfig = new PathConfig();

module.exports = pathConfig;

