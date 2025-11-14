/**
 * Shader Cache - Cache les GIFs des shaders prédéfinis pour éviter la recompilation
 * Améliore drastiquement les performances pour les shaders populaires
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class ShaderCache {
    constructor(cacheDir = './cache/shaders', maxAge = 24 * 60 * 60 * 1000) {
        this.cacheDir = cacheDir;
        this.maxAge = maxAge; // 24 heures par défaut
        this.memoryCache = new Map(); // Cache mémoire pour les métadonnées
        this.setupCacheDirectory();
    }

    setupCacheDirectory() {
        try {
            if (!fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir, { recursive: true });
                console.log(`📁 Cache directory créé: ${this.cacheDir}`);
            }
        } catch (error) {
            console.warn('⚠️ Impossible de créer le cache directory:', error.message);
        }
    }

    /**
     * Génère un hash du code shader pour l'utiliser comme clé de cache
     */
    getShaderHash(shaderCode) {
        return crypto.createHash('sha256').update(shaderCode).digest('hex');
    }

    /**
     * Vérifie si un shader est en cache et valide
     */
    getCachedGif(shaderCode) {
        const hash = this.getShaderHash(shaderCode);
        const cacheFile = path.join(this.cacheDir, `${hash}.gif`);
        const metadataFile = path.join(this.cacheDir, `${hash}.json`);

        // Vérifier le cache mémoire d'abord
        if (this.memoryCache.has(hash)) {
            const cached = this.memoryCache.get(hash);
            if (Date.now() - cached.timestamp < this.maxAge) {
                if (fs.existsSync(cached.gifPath)) {
                    return cached.gifPath;
                }
            } else {
                // Cache expiré
                this.memoryCache.delete(hash);
            }
        }

        // Vérifier le cache disque
        if (fs.existsSync(cacheFile) && fs.existsSync(metadataFile)) {
            try {
                const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
                const fileStats = fs.statSync(cacheFile);
                
                // Vérifier l'âge du fichier
                const age = Date.now() - fileStats.mtimeMs;
                if (age < this.maxAge) {
                    // Mettre à jour le cache mémoire
                    this.memoryCache.set(hash, {
                        gifPath: cacheFile,
                        timestamp: fileStats.mtimeMs,
                        metadata: metadata
                    });
                    
                    console.log(`✅ Cache hit pour shader hash: ${hash.substring(0, 8)}...`);
                    return cacheFile;
                } else {
                    // Cache expiré, supprimer
                    this.deleteCache(hash);
                }
            } catch (error) {
                console.warn('⚠️ Erreur lecture cache:', error.message);
                this.deleteCache(hash);
            }
        }

        return null;
    }

    /**
     * Met en cache un GIF de shader
     */
    setCache(shaderCode, gifPath, metadata = {}) {
        const hash = this.getShaderHash(shaderCode);
        const cacheFile = path.join(this.cacheDir, `${hash}.gif`);
        const metadataFile = path.join(this.cacheDir, `${hash}.json`);

        try {
            // Copier le GIF vers le cache
            if (fs.existsSync(gifPath)) {
                fs.copyFileSync(gifPath, cacheFile);
                
                // Sauvegarder les métadonnées
                const cacheMetadata = {
                    ...metadata,
                    cachedAt: Date.now(),
                    hash: hash
                };
                fs.writeFileSync(metadataFile, JSON.stringify(cacheMetadata, null, 2));
                
                // Mettre à jour le cache mémoire
                this.memoryCache.set(hash, {
                    gifPath: cacheFile,
                    timestamp: Date.now(),
                    metadata: cacheMetadata
                });
                
                console.log(`💾 Shader mis en cache: ${hash.substring(0, 8)}...`);
                return cacheFile;
            }
        } catch (error) {
            console.error('❌ Erreur mise en cache:', error.message);
        }

        return null;
    }

    /**
     * Supprime un élément du cache
     */
    deleteCache(hash) {
        const cacheFile = path.join(this.cacheDir, `${hash}.gif`);
        const metadataFile = path.join(this.cacheDir, `${hash}.json`);

        try {
            if (fs.existsSync(cacheFile)) fs.unlinkSync(cacheFile);
            if (fs.existsSync(metadataFile)) fs.unlinkSync(metadataFile);
            this.memoryCache.delete(hash);
        } catch (error) {
            console.warn('⚠️ Erreur suppression cache:', error.message);
        }
    }

    /**
     * Nettoie le cache expiré
     */
    cleanExpired() {
        let cleaned = 0;
        
        try {
            const files = fs.readdirSync(this.cacheDir);
            
            for (const file of files) {
                if (file.endsWith('.gif')) {
                    const filePath = path.join(this.cacheDir, file);
                    const stats = fs.statSync(filePath);
                    const age = Date.now() - stats.mtimeMs;
                    
                    if (age >= this.maxAge) {
                        const hash = file.replace('.gif', '');
                        this.deleteCache(hash);
                        cleaned++;
                    }
                }
            }
            
            if (cleaned > 0) {
                console.log(`🧹 ${cleaned} fichiers de cache expirés supprimés`);
            }
        } catch (error) {
            console.warn('⚠️ Erreur nettoyage cache:', error.message);
        }
        
        return cleaned;
    }

    /**
     * Obtient les statistiques du cache
     */
    getStats() {
        let totalSize = 0;
        let fileCount = 0;
        
        try {
            if (fs.existsSync(this.cacheDir)) {
                const files = fs.readdirSync(this.cacheDir);
                for (const file of files) {
                    if (file.endsWith('.gif')) {
                        const filePath = path.join(this.cacheDir, file);
                        const stats = fs.statSync(filePath);
                        totalSize += stats.size;
                        fileCount++;
                    }
                }
            }
        } catch (error) {
            // Ignorer les erreurs
        }

        return {
            fileCount,
            totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            memoryCacheSize: this.memoryCache.size,
            cacheDir: this.cacheDir
        };
    }
}

// Singleton instance
let shaderCacheInstance = null;

function getShaderCache(cacheDir, maxAge) {
    if (!shaderCacheInstance) {
        shaderCacheInstance = new ShaderCache(cacheDir, maxAge);
    }
    return shaderCacheInstance;
}

module.exports = { ShaderCache, getShaderCache };

