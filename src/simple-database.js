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
                    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    plan TEXT DEFAULT 'free',
                    stripe_customer_id TEXT,
                    email TEXT
                );
            `;
            
            const createSubscriptionsTable = `
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    plan TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'active',
                    stripe_subscription_id TEXT,
                    stripe_price_id TEXT,
                    current_period_start DATETIME,
                    current_period_end DATETIME,
                    cancel_at_period_end INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
            `;
            
            const createUsageStatsTable = `
                CREATE TABLE IF NOT EXISTS usage_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    compilations_count INTEGER DEFAULT 0,
                    presets_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, date),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
            `;
            
            const createUserBansTable = `
                CREATE TABLE IF NOT EXISTS user_bans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    banned_at INTEGER NOT NULL,
                    banned_until INTEGER,
                    banned_by TEXT,
                    ip_address TEXT,
                    UNIQUE(user_id)
                );
            `;
            
            const createAuditLogsTable = `
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp INTEGER NOT NULL,
                    event TEXT NOT NULL,
                    user_id TEXT,
                    ip TEXT,
                    user_agent TEXT,
                    data TEXT,
                    severity TEXT DEFAULT 'INFO'
                );
            `;
            
            const createSecurityViolationsTable = `
                CREATE TABLE IF NOT EXISTS security_violations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    ip TEXT NOT NULL,
                    violation_type TEXT NOT NULL,
                    details TEXT,
                    severity TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    action_taken TEXT
                );
            `;

            // Exécuter toutes les créations de tables en séquence
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
                        return;
                    }
                    
                    this.db.run(createSubscriptionsTable, (err) => {
                        if (err) {
                            console.error('❌ Erreur création table subscriptions:', err);
                            reject(err);
                            return;
                        }
                        
                        this.db.run(createUsageStatsTable, (err) => {
                            if (err) {
                                console.error('❌ Erreur création table usage_stats:', err);
                                reject(err);
                                return;
                            }
                            
                            this.db.run(createUserBansTable, (err) => {
                                if (err) {
                                    console.error('❌ Erreur création table user_bans:', err);
                                    reject(err);
                                    return;
                                }
                                
                                this.db.run(createAuditLogsTable, (err) => {
                                    if (err) {
                                        console.error('❌ Erreur création table audit_logs:', err);
                                        reject(err);
                                        return;
                                    }
                                    
                                    this.db.run(createSecurityViolationsTable, (err) => {
                                        if (err) {
                                            console.error('❌ Erreur création table security_violations:', err);
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
                        });
                    });
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

    async getUserById(userId) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const query = `SELECT * FROM users WHERE id = ?`;
            this.db.get(query, [userId], (err, row) => {
                if (err) {
                    console.error('❌ Erreur récupération utilisateur:', err);
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
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
                'CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC)',
                'CREATE INDEX IF NOT EXISTS idx_bans_user ON user_bans(user_id)',
                'CREATE INDEX IF NOT EXISTS idx_bans_ip ON user_bans(ip_address)',
                'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC)',
                'CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)',
                'CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event)',
                'CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity)',
                'CREATE INDEX IF NOT EXISTS idx_violations_user ON security_violations(user_id)',
                'CREATE INDEX IF NOT EXISTS idx_violations_ip ON security_violations(ip)',
                'CREATE INDEX IF NOT EXISTS idx_violations_type ON security_violations(violation_type)',
                'CREATE INDEX IF NOT EXISTS idx_violations_severity ON security_violations(severity)'
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

    // ==================== MÉTHODES DE MONÉTISATION ====================

    /**
     * Récupère le plan d'un utilisateur
     */
    async getUserPlan(userId) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const query = `SELECT plan FROM users WHERE id = ?`;
            this.db.get(query, [userId], (err, row) => {
                if (err) {
                    console.error('❌ Erreur récupération plan utilisateur:', err);
                    reject(err);
                } else {
                    resolve(row ? row.plan || 'free' : 'free');
                }
            });
        });
    }

    /**
     * Met à jour le plan d'un utilisateur
     */
    async updateUserPlan(userId, plan, stripeCustomerId = null, email = null) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const updateFields = ['plan = ?'];
            const values = [plan];

            if (stripeCustomerId) {
                updateFields.push('stripe_customer_id = ?');
                values.push(stripeCustomerId);
            }

            if (email) {
                updateFields.push('email = ?');
                values.push(email);
            }

            values.push(userId);

            const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
            this.db.run(query, values, function(err) {
                if (err) {
                    console.error('❌ Erreur mise à jour plan utilisateur:', err);
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    /**
     * Crée ou met à jour un abonnement
     */
    async upsertSubscription(subscriptionData) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const {
                user_id,
                plan,
                status = 'active',
                stripe_subscription_id,
                stripe_price_id,
                current_period_start,
                current_period_end,
                cancel_at_period_end = 0
            } = subscriptionData;

            // Vérifier si l'abonnement existe déjà
            const checkQuery = `SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active'`;
            this.db.get(checkQuery, [user_id], (err, existing) => {
                if (err) {
                    console.error('❌ Erreur vérification abonnement:', err);
                    reject(err);
                    return;
                }

                if (existing) {
                    // Mettre à jour l'abonnement existant
                    const updateQuery = `
                        UPDATE subscriptions 
                        SET plan = ?, status = ?, stripe_subscription_id = ?, stripe_price_id = ?,
                            current_period_start = ?, current_period_end = ?, cancel_at_period_end = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `;
                    this.db.run(updateQuery, [
                        plan, status, stripe_subscription_id, stripe_price_id,
                        current_period_start, current_period_end, cancel_at_period_end,
                        existing.id
                    ], function(updateErr) {
                        if (updateErr) {
                            console.error('❌ Erreur mise à jour abonnement:', updateErr);
                            reject(updateErr);
                        } else {
                            resolve(existing.id);
                        }
                    });
                } else {
                    // Créer un nouvel abonnement
                    const insertQuery = `
                        INSERT INTO subscriptions 
                        (user_id, plan, status, stripe_subscription_id, stripe_price_id,
                         current_period_start, current_period_end, cancel_at_period_end)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    this.db.run(insertQuery, [
                        user_id, plan, status, stripe_subscription_id, stripe_price_id,
                        current_period_start, current_period_end, cancel_at_period_end
                    ], function(insertErr) {
                        if (insertErr) {
                            console.error('❌ Erreur création abonnement:', insertErr);
                            reject(insertErr);
                        } else {
                            resolve(this.lastID);
                        }
                    });
                }
            });
        });
    }

    /**
     * Récupère l'abonnement actif d'un utilisateur
     */
    async getActiveSubscription(userId) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const query = `
                SELECT * FROM subscriptions 
                WHERE user_id = ? AND status = 'active' 
                ORDER BY created_at DESC LIMIT 1
            `;
            this.db.get(query, [userId], (err, row) => {
                if (err) {
                    console.error('❌ Erreur récupération abonnement:', err);
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    /**
     * Incrémente le compteur de compilations pour un utilisateur aujourd'hui
     */
    async incrementCompilationCount(userId) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

            // Utiliser INSERT OR REPLACE pour gérer le cas où la ligne existe déjà
            const query = `
                INSERT INTO usage_stats (user_id, date, compilations_count)
                VALUES (?, ?, 1)
                ON CONFLICT(user_id, date) DO UPDATE SET compilations_count = compilations_count + 1
            `;
            
            this.db.run(query, [userId, today], function(err) {
                if (err) {
                    console.error('❌ Erreur incrémentation compilations:', err);
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    /**
     * Incrémente le compteur de presets utilisés pour un utilisateur aujourd'hui
     */
    async incrementPresetCount(userId) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const today = new Date().toISOString().split('T')[0];

            const query = `
                INSERT INTO usage_stats (user_id, date, presets_count)
                VALUES (?, ?, 1)
                ON CONFLICT(user_id, date) DO UPDATE SET presets_count = presets_count + 1
            `;
            
            this.db.run(query, [userId, today], function(err) {
                if (err) {
                    console.error('❌ Erreur incrémentation presets:', err);
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    /**
     * Récupère les statistiques d'utilisation d'un utilisateur pour aujourd'hui
     */
    async getTodayUsageStats(userId) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            const query = `SELECT * FROM usage_stats WHERE user_id = ? AND date = ?`;
            
            this.db.get(query, [userId, today], (err, row) => {
                if (err) {
                    console.error('❌ Erreur récupération stats:', err);
                    reject(err);
                } else {
                    resolve(row || { compilations_count: 0, presets_count: 0 });
                }
            });
        });
    }

    /**
     * Vérifie si un utilisateur peut compiler (selon son plan)
     */
    async canUserCompile(userId) {
        return new Promise(async (resolve, reject) => {
            try {
                const plan = await this.getUserPlan(userId);
                
                // Plans Pro et Studio: compilations illimitées
                if (plan === 'pro' || plan === 'studio') {
                    resolve({ allowed: true, reason: null });
                    return;
                }

                // Plan Free: limite de 5 compilations par jour
                const stats = await this.getTodayUsageStats(userId);
                const compilationsToday = stats.compilations_count || 0;
                
                if (compilationsToday >= 5) {
                    resolve({
                        allowed: false,
                        reason: `Limite atteinte: 5 compilations/jour (plan Free). Passez à Pro pour des compilations illimitées!`
                    });
                } else {
                    resolve({
                        allowed: true,
                        reason: null,
                        remaining: 5 - compilationsToday
                    });
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Vérifie si un utilisateur peut utiliser des presets (selon son plan)
     */
    async canUserUsePreset(userId) {
        return new Promise(async (resolve, reject) => {
            try {
                const plan = await this.getUserPlan(userId);
                
                // Plans Pro et Studio: presets illimités
                if (plan === 'pro' || plan === 'studio') {
                    resolve({ allowed: true, reason: null });
                    return;
                }

                // Plan Free: limite de 10 presets par jour
                const stats = await this.getTodayUsageStats(userId);
                const presetsToday = stats.presets_count || 0;
                
                if (presetsToday >= 10) {
                    resolve({
                        allowed: false,
                        reason: `Limite atteinte: 10 presets/jour (plan Free). Passez à Pro pour des presets illimités!`
                    });
                } else {
                    resolve({
                        allowed: true,
                        reason: null,
                        remaining: 10 - presetsToday
                    });
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    // ==================== MÉTHODES DE SÉCURITÉ ====================

    /**
     * Vérifie si un utilisateur est banni
     */
    async isUserBanned(userId) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const query = `
                SELECT * FROM user_bans 
                WHERE user_id = ? 
                AND (banned_until IS NULL OR banned_until > ?)
            `;
            
            this.db.get(query, [userId, Date.now()], (err, row) => {
                if (err) {
                    console.error('❌ Erreur vérification ban:', err);
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    /**
     * Bannit un utilisateur
     */
    async banUser(userId, reason, bannedBy = null, ipAddress = null, durationHours = 24) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const bannedAt = Date.now();
            const bannedUntil = durationHours > 0 ? bannedAt + (durationHours * 60 * 60 * 1000) : null;

            const query = `
                INSERT OR REPLACE INTO user_bans 
                (user_id, reason, banned_at, banned_until, banned_by, ip_address)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(query, [userId, reason, bannedAt, bannedUntil, bannedBy, ipAddress], function(err) {
                if (err) {
                    console.error('❌ Erreur bannissement utilisateur:', err);
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Débannit un utilisateur
     */
    async unbanUser(userId) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Base de données non initialisée'));
                return;
            }

            const query = `DELETE FROM user_bans WHERE user_id = ?`;
            
            this.db.run(query, [userId], function(err) {
                if (err) {
                    console.error('❌ Erreur débannissement utilisateur:', err);
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    /**
     * Enregistre un log d'audit
     */
    async logAudit(event, data) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                // Ne pas rejeter, juste logger en console si la DB n'est pas prête
                console.log(`[AUDIT] ${event}:`, data);
                resolve();
                return;
            }

            const query = `
                INSERT INTO audit_logs 
                (timestamp, event, user_id, ip, user_agent, data, severity)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(query, [
                Date.now(),
                event,
                data.userId || null,
                data.ip || null,
                data.userAgent || null,
                JSON.stringify(data),
                data.severity || 'INFO'
            ], function(err) {
                if (err) {
                    console.error('❌ Erreur enregistrement audit log:', err);
                    // Ne pas rejeter, juste logger
                    resolve();
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Enregistre une violation de sécurité
     */
    async logSecurityViolation(userId, ip, violationType, details, severity = 'MEDIUM', actionTaken = 'LOGGED') {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                console.warn(`[SECURITY] ${violationType}:`, details);
                resolve();
                return;
            }

            const query = `
                INSERT INTO security_violations 
                (user_id, ip, violation_type, details, severity, timestamp, action_taken)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(query, [
                userId || null,
                ip,
                violationType,
                JSON.stringify(details),
                severity,
                Date.now(),
                actionTaken
            ], function(err) {
                if (err) {
                    console.error('❌ Erreur enregistrement violation:', err);
                    resolve();
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }
}

module.exports = { SimpleDatabase };
