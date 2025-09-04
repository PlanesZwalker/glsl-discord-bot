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
                    likes INTEGER DEFAULT 0,
                    views INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    total_shaders INTEGER DEFAULT 0,
                    total_likes INTEGER DEFAULT 0,
                    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            this.db.exec(createShadersTable + createUsersTable, (err) => {
                if (err) {
                    console.error('❌ Erreur création tables:', err);
                    reject(err);
                } else {
                    console.log('✅ Tables créées avec succès');
                    resolve();
                }
            });
        });
    }

    async saveShader(shaderData) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const { code, userId, userName, imagePath } = shaderData;
            const stmt = this.db.prepare(`
                INSERT INTO shaders (code, user_id, user_name, image_path)
                VALUES (?, ?, ?, ?)
            `);

            stmt.run([code, userId, userName, imagePath], function(err) {
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
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('❌ Erreur fermeture base de données:', err);
                    } else {
                        console.log('✅ Base de données fermée');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = { SimpleDatabase };
