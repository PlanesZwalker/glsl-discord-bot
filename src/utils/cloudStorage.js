/**
 * Cloud Storage Manager - Gestion du stockage S3 pour Pro/Studio
 * Upload automatique des shaders compilés vers S3 pour rétention illimitée
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class CloudStorage {
    constructor() {
        // Configuration S3 depuis les variables d'environnement
        this.s3Client = null;
        this.bucketName = process.env.S3_BUCKET_NAME;
        this.region = process.env.S3_REGION || 'us-east-1';
        this.enabled = false;

        // Initialiser S3 si configuré
        if (this.bucketName && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            this.s3Client = new S3Client({
                region: this.region,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                }
            });
            this.enabled = true;
            console.log('✅ Cloud Storage S3 initialisé');
        } else {
            console.log('⚠️ Cloud Storage S3 non configuré (variables d\'environnement manquantes)');
        }
    }

    /**
     * Vérifie si le cloud storage est disponible
     */
    isAvailable() {
        return this.enabled && this.s3Client !== null;
    }

    /**
     * Upload un fichier vers S3
     * @param {string} localPath - Chemin local du fichier
     * @param {string} s3Key - Clé S3 (chemin dans le bucket)
     * @param {string} contentType - Type MIME du fichier
     * @returns {Promise<string>} URL S3 du fichier uploadé
     */
    async uploadFile(localPath, s3Key, contentType = 'application/octet-stream') {
        if (!this.isAvailable()) {
            throw new Error('Cloud Storage S3 non disponible');
        }

        try {
            // Lire le fichier local
            const fileContent = await fs.readFile(localPath);

            // Upload vers S3
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                Body: fileContent,
                ContentType: contentType,
                // Métadonnées pour faciliter la gestion
                Metadata: {
                    'uploaded-at': new Date().toISOString(),
                    'source': 'shaderbot'
                }
            });

            await this.s3Client.send(command);

            // Construire l'URL S3
            const s3Url = `s3://${this.bucketName}/${s3Key}`;
            const publicUrl = this.getPublicUrl(s3Key);

            console.log(`☁️ Fichier uploadé vers S3: ${s3Key}`);
            return publicUrl || s3Url;
        } catch (error) {
            console.error('❌ Erreur upload S3:', error);
            throw error;
        }
    }

    /**
     * Upload un shader complet (GIF + MP4 si disponible) vers S3
     * @param {Object} shaderData - Données du shader
     * @param {string} shaderData.id - ID du shader (optionnel, généré si absent)
     * @param {string} shaderData.userId - ID de l'utilisateur
     * @param {string} shaderData.gifPath - Chemin local du GIF
     * @param {string} shaderData.mp4Path - Chemin local du MP4 (optionnel)
     * @param {string} shaderData.frameDirectory - Dossier des frames (optionnel)
     * @returns {Promise<Object>} URLs cloud des fichiers uploadés
     */
    async uploadShader(shaderData) {
        if (!this.isAvailable()) {
            return { gifUrl: null, mp4Url: null, framesUrl: null };
        }

        const { id, userId, gifPath, mp4Path, frameDirectory } = shaderData;
        
        // Générer un ID temporaire si non fourni (sera remplacé après saveShader)
        const shaderId = id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const results = {
            gifUrl: null,
            mp4Url: null,
            framesUrl: null
        };

        try {
            // Upload GIF
            if (gifPath && fsSync.existsSync(gifPath)) {
                const gifKey = `shaders/${userId}/${shaderId}/animation.gif`;
                results.gifUrl = await this.uploadFile(gifPath, gifKey, 'image/gif');
            }

            // Upload MP4 (si disponible)
            if (mp4Path && fsSync.existsSync(mp4Path)) {
                const mp4Key = `shaders/${userId}/${shaderId}/animation.mp4`;
                results.mp4Url = await this.uploadFile(mp4Path, mp4Key, 'video/mp4');
            }

            // Upload frames (optionnel, pour archive - seulement pour Studio)
            // On skip les frames pour économiser l'espace S3
            // if (frameDirectory && fsSync.existsSync(frameDirectory)) {
            //     // Upload frames si nécessaire
            // }

            console.log(`✅ Shader ${shaderId} uploadé vers S3 avec succès`);
            return results;
        } catch (error) {
            console.error(`❌ Erreur upload shader ${shaderId} vers S3:`, error);
            // Retourner les URLs partiellement uploadées
            return results;
        }
    }

    /**
     * Supprime un fichier de S3
     * @param {string} s3Key - Clé S3 du fichier à supprimer
     */
    async deleteFile(s3Key) {
        if (!this.isAvailable()) {
            return;
        }

        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key
            });

            await this.s3Client.send(command);
            console.log(`🗑️ Fichier supprimé de S3: ${s3Key}`);
        } catch (error) {
            console.error(`❌ Erreur suppression S3 ${s3Key}:`, error);
        }
    }

    /**
     * Supprime un shader complet de S3
     * @param {string} userId - ID de l'utilisateur
     * @param {string} shaderId - ID du shader
     */
    async deleteShader(userId, shaderId) {
        if (!this.isAvailable()) {
            return;
        }

        try {
            // Supprimer GIF
            await this.deleteFile(`shaders/${userId}/${shaderId}/animation.gif`);
            
            // Supprimer MP4
            await this.deleteFile(`shaders/${userId}/${shaderId}/animation.mp4`);
            
            // Note: Les frames sont supprimées individuellement si nécessaire
            // Pour l'instant, on ne supprime que les fichiers principaux
            
            console.log(`✅ Shader ${shaderId} supprimé de S3`);
        } catch (error) {
            console.error(`❌ Erreur suppression shader ${shaderId} de S3:`, error);
        }
    }

    /**
     * Génère l'URL publique d'un fichier S3
     * @param {string} s3Key - Clé S3
     * @returns {string|null} URL publique ou null si pas de CDN configuré
     */
    getPublicUrl(s3Key) {
        // Si un CDN est configuré, utiliser son URL
        if (process.env.S3_CDN_URL) {
            return `${process.env.S3_CDN_URL}/${s3Key}`;
        }

        // Sinon, utiliser l'URL S3 standard (peut nécessiter des permissions)
        if (this.bucketName && this.region) {
            return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
        }

        return null;
    }

    /**
     * Vérifie si un utilisateur a droit au stockage cloud
     * @param {string} userPlan - Plan de l'utilisateur ('free', 'pro', 'studio')
     * @returns {boolean}
     */
    canUseCloudStorage(userPlan) {
        return userPlan === 'pro' || userPlan === 'studio';
    }
}

// Instance singleton
let cloudStorageInstance = null;

function getCloudStorage() {
    if (!cloudStorageInstance) {
        cloudStorageInstance = new CloudStorage();
    }
    return cloudStorageInstance;
}

module.exports = { CloudStorage, getCloudStorage };

