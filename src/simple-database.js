/**
 * Simple Database Manager - Version Serverless pour Vercel
 * Gestion SQLite simplifiée avec gestion des erreurs de dossiers
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class SimpleDatabase {
    constructor() {
        this.db = null;
        this.dbPath = './data/shaders.db';
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('🚀 Initialisation de la base de données...');
            
            // Vérifier si on est sur Vercel (environnement serverless)
            const isVercel = process.env.VERCEL === '1';
            
            if (isVercel) {
                console.log('🌐 Environnement Vercel détecté - Utilisation de la mémoire');
                // Sur Vercel, utiliser une base de données en mémoire
                this.dbPath = ':memory:';
            } else {
                // En local, créer le dossier data s'il n'existe pas
                try {
                    const dataDir = path.dirname(this.dbPath);
                    if (!fs.existsSync(dataDir)) {
                        fs.mkdirSync(dataDir, { recursive: true });
                        console.log('📁 Dossier data créé');
                    }
                } catch (error) {
                    console.log('⚠️ Impossible de créer le dossier data, utilisation de la mémoire');
                    this.dbPath = ':memory:';
                }
            }

            // Créer la connexion à la base de données
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Erreur connexion base de données:', err);
                    throw err;
                }
                console.log('✅ Connecté à la base de données SQLite');
            });

            // Créer les tables
            await this.createTables();
            
            // Activer WAL (Write-Ahead Logging) pour de meilleures performances
            await this.enableWAL();
            
            this.isInitialized = true;
            console.log('✅ Base de données initialisée avec succès');
            
        } catch (error) {
            console.error('❌ Erreur initialisation base de données:', error);
            // En cas d'erreur, utiliser une base en mémoire
            try {
                this.dbPath = ':memory:';
                this.db = new sqlite3.Database(this.dbPath);
                await this.createTables();
                this.isInitialized = true;
                console.log('✅ Base de données en mémoire initialisée');
            } catch (fallbackError) {
                console.error('❌ Erreur fatale base de données:', fallbackError);
                throw fallbackError;
            }
        }
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            const createShadersTable = `
                CREATE TABLE IF NOT EXISTS shaders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    code TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    image_path TEXT,
                    gif_path TEXT,
                    name TEXT,
                    preset_name TEXT,
                    likes INTEGER DEFAULT 0,
                    views INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `;

            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    total_shaders INTEGER DEFAULT 0,
                    total_likes INTEGER DEFAULT 0,
                    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `;

            // Exécuter les deux instructions séparément
            this.db.run(createShadersTable, (err) => {
                if (err) {
                    console.error('❌ Erreur création table shaders:', err);
                    reject(err);
                    return;
                }
                
                this.db.run(createUsersTable, (err) => {
                    if (err) {
                        console.error('❌ Erreur création table users:', err);
                        reject(err);
                    } else {
                        console.log('✅ Tables créées avec succès');
                        
                        // Créer les index pour améliorer les performances
                        this.createIndexes().then(() => {
                            resolve();
                        }).catch((indexError) => {
                            console.warn('⚠️ Erreur création index:', indexError.message);
                            resolve(); // Continuer même si les index échouent
                        });
                    }
                });
            });
        });
    }

    async saveShader(shaderData) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const { code, userId, userName, imagePath, gifPath, name } = shaderData;
            const stmt = this.db.prepare(`
                INSERT INTO shaders (code, user_id, user_name, image_path, gif_path, name)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            stmt.run([code, userId, userName, imagePath || null, gifPath || null, name || null], function(err) {
                if (err) {
                    console.error('❌ Erreur sauvegarde shader:', err);
                    reject(err);
                } else {
                    console.log('✅ Shader sauvegardé avec ID:', this.lastID);
                    resolve(this.lastID);
                }
            });

            stmt.finalize();
        });
    }

    async getShaderById(id) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const query = `SELECT * FROM shaders WHERE id = ?`;
            this.db.get(query, [id], (err, row) => {
                if (err) {
                    console.error('❌ Erreur récupération shader:', err);
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    async getShaderByName(name) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            // Recherche insensible à la casse et partielle
            const query = `SELECT * FROM shaders WHERE LOWER(name) LIKE LOWER(?) ORDER BY views DESC, likes DESC LIMIT 1`;
            this.db.get(query, [`%${name}%`], (err, row) => {
                if (err) {
                    console.error('❌ Erreur récupération shader par nom:', err);
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    async searchShadersByName(name, limit = 10) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            // Recherche insensible à la casse et partielle
            const query = `SELECT * FROM shaders WHERE name IS NOT NULL AND LOWER(name) LIKE LOWER(?) ORDER BY views DESC, likes DESC LIMIT ?`;
            this.db.all(query, [`%${name}%`, limit], (err, rows) => {
                if (err) {
                    console.error('❌ Erreur recherche shaders par nom:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    async incrementViews(id) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const stmt = this.db.prepare(`UPDATE shaders SET views = views + 1 WHERE id = ?`);
            stmt.run([id], (err) => {
                if (err) {
                    console.error('❌ Erreur incrémentation vues:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
            stmt.finalize();
        });
    }

    async updateUserStats(userId, userName) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO users (id, username, last_seen)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `);

            stmt.run([userId, userName], (err) => {
                if (err) {
                    console.error('❌ Erreur mise à jour utilisateur:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });

            stmt.finalize();
        });
    }

    async getPopularShaders(limit = 5) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const query = `
                SELECT * FROM shaders 
                ORDER BY likes DESC, views DESC 
                LIMIT ?
            `;

            this.db.all(query, [limit], (err, rows) => {
                if (err) {
                    console.error('❌ Erreur récupération shaders populaires:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    async searchShaders(query, limit = 5) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const searchQuery = `
                SELECT * FROM shaders 
                WHERE code LIKE ? OR user_name LIKE ?
                ORDER BY created_at DESC 
                LIMIT ?
            `;

            const searchTerm = `%${query}%`;
            this.db.all(searchQuery, [searchTerm, searchTerm, limit], (err, rows) => {
                if (err) {
                    console.error('❌ Erreur recherche shaders:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    async getShadersByUserId(userId) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const query = `SELECT * FROM shaders WHERE user_id = ? ORDER BY created_at DESC`;
            this.db.all(query, [userId], (err, rows) => {
                if (err) {
                    console.error('❌ Erreur récupération shaders par utilisateur:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    async getStats() {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const queries = {
                totalShaders: 'SELECT COUNT(*) as count FROM shaders',
                totalUsers: 'SELECT COUNT(*) as count FROM users',
                totalLikes: 'SELECT SUM(likes) as total FROM shaders'
            };

            const stats = {};
            let completed = 0;
            const totalQueries = Object.keys(queries).length;

            Object.entries(queries).forEach(([key, query]) => {
                this.db.get(query, (err, row) => {
                    if (err) {
                        console.error(`❌ Erreur statistique ${key}:`, err);
                        stats[key] = 0;
                    } else {
                        stats[key] = row.count || row.total || 0;
                    }
                    
                    completed++;
                    if (completed === totalQueries) {
                        resolve(stats);
                    }
                });
            });
        });
    }

    async close() {
        return new Promise((resolve) => {
            if (!this.db) {
                console.log('✅ Base de données déjà fermée ou non initialisée');
                resolve();
                return;
            }
            
            // Vérifier si la base de données est déjà fermée
            try {
                // Tenter une opération simple pour vérifier si la DB est ouverte
                this.db.get('SELECT 1', (err) => {
                    if (err && err.message.includes('closed')) {
                        console.log('✅ Base de données déjà fermée');
                        this.db = null;
                        resolve();
                        return;
                    }
                    
                    // La DB est ouverte, la fermer
                    this.db.close((closeErr) => {
                        if (closeErr) {
                            // Ignorer l'erreur si la DB est déjà fermée
                            if (!closeErr.message.includes('closed')) {
                                console.error('❌ Erreur fermeture base de données:', closeErr);
                            } else {
                                console.log('✅ Base de données déjà fermée');
                            }
                        } else {
                            console.log('✅ Base de données fermée');
                        }
                        this.db = null;
                        resolve();
                    });
                });
            } catch (error) {
                // Si une exception est levée, la DB est probablement déjà fermée
                if (error.message && error.message.includes('closed')) {
                    console.log('✅ Base de données déjà fermée');
                } else {
                    console.error('❌ Erreur lors de la vérification de la base de données:', error);
                }
                this.db = null;
                resolve();
            }
        });
    }

    /**
     * Crée les index pour améliorer les performances des requêtes
     */
    async createIndexes() {
        return new Promise((resolve, reject) => {
            const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_shaders_user_id ON shaders(user_id)',
                'CREATE INDEX IF NOT EXISTS idx_shaders_created_at ON shaders(created_at DESC)',
                'CREATE INDEX IF NOT EXISTS idx_shaders_preset_name ON shaders(preset_name)',
                'CREATE INDEX IF NOT EXISTS idx_shaders_name ON shaders(name)',
                'CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC)'
            ];

            let completed = 0;
            const total = indexes.length;

            indexes.forEach((indexSQL) => {
                this.db.run(indexSQL, (err) => {
                    if (err) {
                        console.warn(`⚠️ Erreur création index: ${indexSQL}`, err.message);
                    } else {
                        console.log(`✅ Index créé: ${indexSQL.split(' ')[5]}`);
                    }
                    
                    completed++;
                    if (completed === total) {
                        resolve();
                    }
                });
            });
        });
    }

    /**
     * Obtient les shaders avec pagination
     */
    async getUserShadersPaginated(userId, page = 1, limit = 20) {
        return new Promise((resolve, reject) => {
            const offset = (page - 1) * limit;
            this.db.all(
                `SELECT * FROM shaders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                [userId, limit, offset],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    /**
     * Compte le nombre total de shaders pour un utilisateur
     */
    async getUserShaderCount(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(*) as count FROM shaders WHERE user_id = ?`,
                [userId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row ? row.count : 0);
                    }
                }
            );
        });
    }

    /**
     * Active WAL (Write-Ahead Logging) pour de meilleures performances
     */
    async enableWAL() {
        return new Promise((resolve, reject) => {
            // Activer WAL mode
            this.db.run('PRAGMA journal_mode = WAL', (err) => {
                if (err) {
                    console.warn('⚠️ Impossible d\'activer WAL:', err.message);
                } else {
                    console.log('✅ WAL activé pour meilleures performances');
                }
                
                // Optimiser la synchronisation
                this.db.run('PRAGMA synchronous = NORMAL', (err) => {
                    if (err) {
                        console.warn('⚠️ Impossible de configurer synchronous:', err.message);
                    }
                    resolve();
                });
            });
        });
    }

    /**
     * Nettoie les vieux shaders (plus de 30 jours) et optimise la DB
     */
    async cleanup(maxAgeDays = 30) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // Convertir en millisecondes
            const cutoffDate = Date.now() - maxAge;

            // Supprimer les vieux shaders
            this.db.run(
                `DELETE FROM shaders WHERE created_at < ?`,
                [cutoffDate],
                function(err) {
                    if (err) {
                        console.error('❌ Erreur cleanup shaders:', err);
                        reject(err);
                    } else {
                        const deleted = this.changes;
                        console.log(`🧹 ${deleted} vieux shaders supprimés (plus de ${maxAgeDays} jours)`);
                        
                        // Optimiser la base de données
                        this.db.run('VACUUM', (vacuumErr) => {
                            if (vacuumErr) {
                                console.warn('⚠️ Erreur VACUUM:', vacuumErr.message);
                            } else {
                                console.log('✅ Base de données optimisée (VACUUM)');
                            }
                            resolve(deleted);
                        });
                    }
                }.bind(this)
            );
        });
    }

    /**
     * Démarre le cleanup automatique (tous les jours)
     */
    startAutoCleanup(intervalHours = 24) {
        const intervalMs = intervalHours * 60 * 60 * 1000;
        
        setInterval(async () => {
            try {
                await this.cleanup();
            } catch (error) {
                console.error('❌ Erreur cleanup automatique:', error);
            }
        }, intervalMs);

        console.log(`🔄 Cleanup automatique activé (toutes les ${intervalHours}h)`);
    }
}

module.exports = { SimpleDatabase };
