/**
 * Script pour créer un shader directement dans la base de données
 * Usage: node scripts/create-shader-direct.js [userId] [shader-name]
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Shader de test simple (plasma effect)
const DEFAULT_SHADER_CODE = `
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord / iResolution.xy;
    float time = iTime;
    
    // Effet plasma simple
    float c = sin(uv.x * 10.0 + time) * sin(uv.y * 10.0 + time) * 0.5 + 0.5;
    fragColor = vec4(c, c * 0.5, c * 0.8, 1.0);
}
`.trim();

async function createShaderDirect(userId, shaderName) {
    console.log('🎨 Création d\'un shader directement dans la base de données...');
    
    const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'shaders.db');
    
    if (!fs.existsSync(dbPath)) {
        console.error(`❌ Base de données non trouvée: ${dbPath}`);
        console.log('💡 Assurez-vous que le bot a démarré au moins une fois pour créer la base de données.');
        return false;
    }
    
    console.log(`📁 Base de données: ${dbPath}`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`📝 Nom du shader: ${shaderName || 'Test Shader'}`);
    
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error(`❌ Erreur ouverture base de données: ${err.message}`);
                reject(false);
                return;
            }
            
            // Vérifier que la table existe
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='shaders'", (err, row) => {
                if (err) {
                    console.error('❌ Erreur vérification table:', err.message);
                    db.close();
                    reject(false);
                    return;
                }
                
                if (!row) {
                    console.error('❌ Table shaders non trouvée dans la base de données');
                    db.close();
                    reject(false);
                    return;
                }
                
                // Créer un répertoire pour les frames (simulé)
                const framesDir = path.join(__dirname, '..', 'data', 'frames', `test-${Date.now()}`);
                if (!fs.existsSync(framesDir)) {
                    fs.mkdirSync(framesDir, { recursive: true });
                }
                
                // Vérifier la structure de la table
                db.all("PRAGMA table_info(shaders)", (err, columns) => {
                    if (err) {
                        console.error('❌ Erreur récupération structure table:', err.message);
                        db.close();
                        reject(false);
                        return;
                    }
                    
                    console.log('📋 Colonnes disponibles:', columns.map(c => c.name).join(', '));
                    
                    // Construire la requête INSERT avec uniquement les colonnes disponibles
                    // Colonnes disponibles: id, code, user_id, user_name, image_path, likes, views, created_at
                    const insertQuery = `INSERT INTO shaders (code, user_id, user_name, image_path, likes, views, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                    const values = [
                        DEFAULT_SHADER_CODE,
                        userId,
                        'test-user',
                        framesDir,
                        0, // likes
                        0, // views
                        new Date().toISOString()
                    ];
                    
                    const insert = db.prepare(insertQuery);
                    insert.run(...values, function(err) {
                        if (err) {
                            console.error('❌ Erreur insertion shader:', err.message);
                            insert.finalize();
                            db.close();
                            reject(false);
                            return;
                        }
                        
                        console.log(`✅ Shader créé avec succès!`);
                        console.log(`🆔 Shader ID: ${this.lastID}`);
                        console.log(`\n💡 Le shader devrait apparaître dans votre dashboard!`);
                        console.log(`💡 Rafraîchissez votre dashboard pour voir le nouveau shader.`);
                        
                        insert.finalize();
                        db.close();
                        resolve(true);
                    });
                });
            });
        });
    });
}

// Main
const userId = process.argv[2] || process.env.DISCORD_USER_ID || '123456789012345678';
const shaderName = process.argv[3] || `Test Shader ${new Date().toISOString()}`;

createShaderDirect(userId, shaderName)
    .then(success => {
        if (!success) {
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });

