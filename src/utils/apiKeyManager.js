/**
 * API Key Manager - Gestion des clés API pour les développeurs (Studio plan)
 */

const crypto = require('crypto');

class APIKeyManager {
    constructor(database) {
        this.database = database;
    }

    /**
     * Génère une nouvelle clé API pour un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @param {string} name - Nom de la clé API (optionnel)
     * @returns {Promise<{apiKey: string, hashedKey: string, keyId: number}>}
     */
    async generateAPIKey(userId, name = null) {
        return new Promise((resolve, reject) => {
            if (!this.database || !this.database.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            // Vérifier que l'utilisateur a le plan Studio
            this.database.db.get(
                'SELECT plan FROM users WHERE id = ?',
                [userId],
                async (err, user) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (!user || user.plan !== 'studio') {
                        reject(new Error('Seuls les utilisateurs avec le plan Studio peuvent générer des clés API'));
                        return;
                    }

                    // Générer une clé API sécurisée
                    const apiKey = this.generateSecureKey();
                    const hashedKey = this.hashAPIKey(apiKey);

                    // Sauvegarder dans la base de données
                    const stmt = this.database.db.prepare(`
                        INSERT INTO api_keys (user_id, hashed_key, name, created_at, last_used_at)
                        VALUES (?, ?, ?, CURRENT_TIMESTAMP, NULL)
                    `);

                    stmt.run([userId, hashedKey, name || `API Key ${new Date().toISOString()}`], function(insertErr) {
                        if (insertErr) {
                            reject(insertErr);
                        } else {
                            resolve({
                                apiKey: apiKey, // Retourner la clé en clair UNIQUEMENT à la création
                                hashedKey: hashedKey,
                                keyId: this.lastID
                            });
                        }
                    });

                    stmt.finalize();
                }
            );
        });
    }

    /**
     * Vérifie et récupère les informations d'une clé API
     * @param {string} apiKey - Clé API à vérifier
     * @returns {Promise<{userId: string, keyId: number, name: string} | null>}
     */
    async validateAPIKey(apiKey) {
        return new Promise((resolve, reject) => {
            if (!this.database || !this.database.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const hashedKey = this.hashAPIKey(apiKey);

            this.database.db.get(
                'SELECT id, user_id, name FROM api_keys WHERE hashed_key = ? AND revoked = 0',
                [hashedKey],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else if (row) {
                        // Mettre à jour last_used_at
                        this.database.db.run(
                            'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [row.id]
                        );

                        resolve({
                            userId: row.user_id,
                            keyId: row.id,
                            name: row.name
                        });
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    }

    /**
     * Liste toutes les clés API d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<Array>}
     */
    async listAPIKeys(userId) {
        return new Promise((resolve, reject) => {
            if (!this.database || !this.database.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            this.database.db.all(
                `SELECT id, name, created_at, last_used_at, revoked 
                 FROM api_keys 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            );
        });
    }

    /**
     * Révoque une clé API
     * @param {string} userId - ID de l'utilisateur
     * @param {number} keyId - ID de la clé API
     * @returns {Promise<boolean>}
     */
    async revokeAPIKey(userId, keyId) {
        return new Promise((resolve, reject) => {
            if (!this.database || !this.database.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            this.database.db.run(
                'UPDATE api_keys SET revoked = 1 WHERE id = ? AND user_id = ?',
                [keyId, userId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes > 0);
                    }
                }
            );
        });
    }

    /**
     * Génère une clé API sécurisée
     * @returns {string}
     */
    generateSecureKey() {
        // Format: glsl_<random_bytes_base64>
        const randomBytes = crypto.randomBytes(32);
        const base64Key = randomBytes.toString('base64').replace(/[+/=]/g, '');
        return `glsl_${base64Key}`;
    }

    /**
     * Hash une clé API pour le stockage
     * @param {string} apiKey - Clé API en clair
     * @returns {string}
     */
    hashAPIKey(apiKey) {
        return crypto.createHash('sha256').update(apiKey).digest('hex');
    }

    /**
     * Crée la table api_keys si elle n'existe pas
     * @returns {Promise<void>}
     */
    async createTable() {
        return new Promise((resolve, reject) => {
            if (!this.database || !this.database.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS api_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    hashed_key TEXT NOT NULL UNIQUE,
                    name TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_used_at DATETIME,
                    revoked INTEGER DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
            `;

            this.database.db.run(createTableSQL, (err) => {
                if (err) {
                    reject(err);
                } else {
                    // Créer un index pour améliorer les performances
                    this.database.db.run(
                        'CREATE INDEX IF NOT EXISTS idx_api_keys_hashed_key ON api_keys(hashed_key)',
                        (indexErr) => {
                            if (indexErr) {
                                console.warn('⚠️ Erreur création index api_keys:', indexErr.message);
                            }
                            resolve();
                        }
                    );
                }
            });
        });
    }
}

module.exports = { APIKeyManager };

