/**
 * Cleanup Manager - Système de nettoyage automatique des fichiers après 7 jours (Free plan)
 * Supprime les shaders des utilisateurs gratuits créés il y a plus de 7 jours
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class CleanupManager {
    constructor(database) {
        this.database = database;
        this.cleanupInterval = null;
        this.isRunning = false;
    }

    /**
     * Démarre le nettoyage automatique (cron job quotidien)
     * @param {number} intervalHours - Intervalle en heures (défaut: 24h)
     */
    startAutoCleanup(intervalHours = 24) {
        if (this.cleanupInterval) {
            console.log('⚠️ Nettoyage automatique déjà démarré');
            return;
        }

        console.log(`🧹 Démarrage du nettoyage automatique (toutes les ${intervalHours}h)`);
        
        // Exécuter immédiatement au démarrage
        this.runCleanup().catch(err => {
            console.error('❌ Erreur lors du premier nettoyage:', err);
        });

        // Puis exécuter périodiquement
        const intervalMs = intervalHours * 60 * 60 * 1000;
        this.cleanupInterval = setInterval(() => {
            this.runCleanup().catch(err => {
                console.error('❌ Erreur lors du nettoyage automatique:', err);
            });
        }, intervalMs);

        console.log(`✅ Nettoyage automatique configuré (prochaine exécution dans ${intervalHours}h)`);
    }

    /**
     * Arrête le nettoyage automatique
     */
    stopAutoCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('🛑 Nettoyage automatique arrêté');
        }
    }

    /**
     * Exécute le nettoyage des shaders des utilisateurs gratuits > 7 jours
     * @returns {Promise<{deleted: number, errors: number}>}
     */
    async runCleanup() {
        if (this.isRunning) {
            console.log('⚠️ Nettoyage déjà en cours, ignoré');
            return { deleted: 0, errors: 0 };
        }

        this.isRunning = true;
        const startTime = Date.now();
        console.log('🧹 Démarrage du nettoyage des shaders > 7 jours (plan Free)...');

        try {
            // Récupérer tous les shaders des utilisateurs gratuits créés il y a plus de 7 jours
            const oldShaders = await this.getOldFreeShaders(7); // 7 jours
            
            if (oldShaders.length === 0) {
                console.log('✅ Aucun shader à nettoyer');
                this.isRunning = false;
                return { deleted: 0, errors: 0 };
            }

            console.log(`📋 ${oldShaders.length} shader(s) à nettoyer`);

            let deletedCount = 0;
            let errorCount = 0;

            for (const shader of oldShaders) {
                try {
                    await this.deleteShader(shader);
                    deletedCount++;
                    
                    if (deletedCount % 10 === 0) {
                        console.log(`🧹 ${deletedCount}/${oldShaders.length} shader(s) nettoyé(s)...`);
                    }
                } catch (error) {
                    console.error(`❌ Erreur suppression shader ID ${shader.id}:`, error.message);
                    errorCount++;
                }
            }

            const duration = Date.now() - startTime;
            console.log(`✅ Nettoyage terminé: ${deletedCount} shader(s) supprimé(s), ${errorCount} erreur(s) (${duration}ms)`);
            
            this.isRunning = false;
            return { deleted: deletedCount, errors: errorCount };
        } catch (error) {
            console.error('❌ Erreur lors du nettoyage:', error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Récupère les shaders des utilisateurs gratuits créés il y a plus de X jours
     * @param {number} days - Nombre de jours
     * @returns {Promise<Array>}
     */
    async getOldFreeShaders(days = 7) {
        return new Promise((resolve, reject) => {
            if (!this.database || !this.database.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            // Calculer la date limite (il y a X jours)
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - days);
            const limitDateStr = limitDate.toISOString().replace('T', ' ').substring(0, 19);

            // Requête SQL pour récupérer les shaders des utilisateurs gratuits > 7 jours
            const query = `
                SELECT s.*, u.plan 
                FROM shaders s
                INNER JOIN users u ON s.user_id = u.id
                WHERE u.plan = 'free' 
                AND s.created_at < ?
                ORDER BY s.created_at ASC
            `;

            this.database.db.all(query, [limitDateStr], (err, rows) => {
                if (err) {
                    console.error('❌ Erreur récupération shaders à nettoyer:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * Supprime un shader (fichiers + base de données)
     * @param {Object} shader - Objet shader avec id, gif_path, image_path
     */
    async deleteShader(shader) {
        // 1. Supprimer les fichiers associés
        const filesToDelete = [];
        
        if (shader.gif_path && shader.gif_path !== 'null') {
            filesToDelete.push(shader.gif_path);
        }
        
        if (shader.image_path && shader.image_path !== 'null') {
            // image_path peut être un répertoire contenant plusieurs fichiers
            filesToDelete.push(shader.image_path);
        }

        for (const filePath of filesToDelete) {
            try {
                if (fsSync.existsSync(filePath)) {
                    const stats = fsSync.statSync(filePath);
                    
                    if (stats.isDirectory()) {
                        // Supprimer récursivement le répertoire
                        await fs.rm(filePath, { recursive: true, force: true });
                        console.log(`🗑️ Répertoire supprimé: ${filePath}`);
                    } else if (stats.isFile()) {
                        // Supprimer le fichier
                        await fs.unlink(filePath);
                        console.log(`🗑️ Fichier supprimé: ${filePath}`);
                    }
                }
            } catch (fileError) {
                // Continuer même si la suppression de fichier échoue
                console.warn(`⚠️ Impossible de supprimer ${filePath}:`, fileError.message);
            }
        }

        // 2. Supprimer l'entrée de la base de données
        return new Promise((resolve, reject) => {
            this.database.db.run(
                'DELETE FROM shaders WHERE id = ?',
                [shader.id],
                function(err) {
                    if (err) {
                        console.error(`❌ Erreur suppression shader ID ${shader.id} de la DB:`, err);
                        reject(err);
                    } else {
                        console.log(`✅ Shader ID ${shader.id} supprimé de la base de données`);
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Nettoie manuellement les shaders d'un utilisateur spécifique
     * @param {string} userId - ID de l'utilisateur
     * @param {number} days - Nombre de jours (défaut: 7)
     * @returns {Promise<{deleted: number, errors: number}>}
     */
    async cleanupUserShaders(userId, days = 7) {
        return new Promise((resolve, reject) => {
            if (!this.database || !this.database.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            // Vérifier que l'utilisateur est sur le plan gratuit
            this.database.db.get(
                'SELECT plan FROM users WHERE id = ?',
                [userId],
                async (err, user) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (!user || user.plan !== 'free') {
                        resolve({ deleted: 0, errors: 0, message: 'Utilisateur non gratuit ou introuvable' });
                        return;
                    }

                    // Récupérer les shaders de cet utilisateur > X jours
                    const limitDate = new Date();
                    limitDate.setDate(limitDate.getDate() - days);
                    const limitDateStr = limitDate.toISOString().replace('T', ' ').substring(0, 19);

                    this.database.db.all(
                        'SELECT * FROM shaders WHERE user_id = ? AND created_at < ?',
                        [userId, limitDateStr],
                        async (err, shaders) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            let deletedCount = 0;
                            let errorCount = 0;

                            for (const shader of shaders || []) {
                                try {
                                    await this.deleteShader(shader);
                                    deletedCount++;
                                } catch (error) {
                                    console.error(`❌ Erreur suppression shader ID ${shader.id}:`, error.message);
                                    errorCount++;
                                }
                            }

                            resolve({ deleted: deletedCount, errors: errorCount });
                        }
                    );
                }
            );
        });
    }
}

module.exports = { CleanupManager };

