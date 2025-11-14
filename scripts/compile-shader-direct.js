/**
 * Script pour compiler un shader directement et mettre à jour la base de données
 * Usage: node scripts/compile-shader-direct.js [shader-id] [shader-code]
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

async function compileShader(shaderId, shaderCode) {
    console.log('🎨 Compilation d\'un shader...');
    console.log(`🆔 Shader ID: ${shaderId}`);
    
    const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'shaders.db');
    
    if (!fs.existsSync(dbPath)) {
        console.error(`❌ Base de données non trouvée: ${dbPath}`);
        return false;
    }
    
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error(`❌ Erreur ouverture base de données: ${err.message}`);
                reject(false);
                return;
            }
            
            // Récupérer le shader
            db.get('SELECT * FROM shaders WHERE id = ?', [shaderId], (err, shader) => {
                if (err) {
                    console.error('❌ Erreur récupération shader:', err.message);
                    db.close();
                    reject(false);
                    return;
                }
                
                if (!shader) {
                    console.error(`❌ Shader ID ${shaderId} non trouvé`);
                    db.close();
                    reject(false);
                    return;
                }
                
                console.log(`📝 Code shader trouvé (${shader.code.length} caractères)`);
                
                // Utiliser le compilateur directement
                const { RealWebGLCompiler } = require('../src/real-webgl-compiler');
                const compiler = new RealWebGLCompiler();
                
                // Initialiser le compilateur
                compiler.initialize().then(() => {
                    console.log('✅ Compilateur initialisé');
                    
                    // Compiler le shader
                    const codeToCompile = shaderCode || shader.code;
                    console.log('🔄 Compilation en cours...');
                    
                    compiler.compileShader(codeToCompile, {
                        userId: shader.user_id
                    }).then((result) => {
                        if (!result.success) {
                            console.error('❌ Erreur compilation:', result.error);
                            db.close();
                            reject(false);
                            return;
                        }
                        
                        console.log('✅ Compilation réussie!');
                        console.log(`📁 Frames: ${result.frameDirectory}`);
                        console.log(`🎬 GIF: ${result.gifPath || 'non généré'}`);
                        
                        // Vérifier les colonnes disponibles avant de mettre à jour
                        db.all("PRAGMA table_info(shaders)", (err, columns) => {
                            if (err) {
                                console.error('❌ Erreur récupération structure table:', err.message);
                                // Nettoyer le compilateur si la méthode existe
                                if (compiler.cleanup && typeof compiler.cleanup === 'function') {
                                    compiler.cleanup().catch(() => {});
                                }
                                db.close();
                                reject(false);
                                return;
                            }
                            
                            const columnNames = columns.map(c => c.name);
                            const hasGifPath = columnNames.includes('gif_path');
                            
                            let updateQuery, updateValues;
                            if (hasGifPath) {
                                updateQuery = `UPDATE shaders SET image_path = ?, gif_path = ?, code = ? WHERE id = ?`;
                                updateValues = [result.frameDirectory, result.gifPath || null, codeToCompile, shaderId];
                            } else {
                                // Version sans gif_path
                                updateQuery = `UPDATE shaders SET image_path = ?, code = ? WHERE id = ?`;
                                updateValues = [result.frameDirectory, codeToCompile, shaderId];
                            }
                            
                            const update = db.prepare(updateQuery);
                            update.run(...updateValues, function(updateErr) {
                            if (updateErr) {
                                console.error('❌ Erreur mise à jour base de données:', updateErr.message);
                                db.close();
                                reject(false);
                                return;
                            }
                            
                            console.log('✅ Base de données mise à jour!');
                            console.log(`\n💡 Le shader devrait maintenant avoir une image dans votre dashboard!`);
                            console.log(`💡 Rafraîchissez votre dashboard pour voir le résultat.`);
                            
                                update.finalize();
                                // Nettoyer le compilateur si la méthode existe
                                if (compiler.cleanup && typeof compiler.cleanup === 'function') {
                                    compiler.cleanup().catch(() => {});
                                }
                                db.close();
                                resolve(true);
                            });
                        });
                    }).catch((compileError) => {
                        console.error('❌ Erreur compilation:', compileError.message);
                        // Nettoyer le compilateur si la méthode existe
                        if (compiler.cleanup && typeof compiler.cleanup === 'function') {
                            compiler.cleanup().catch(() => {});
                        }
                        db.close();
                        reject(false);
                    });
                }).catch((initError) => {
                    console.error('❌ Erreur initialisation compilateur:', initError.message);
                    db.close();
                    reject(false);
                });
            });
        });
    });
}

// Main
const shaderId = process.argv[2] || '1';
const shaderCode = process.argv[3] || null;

compileShader(shaderId, shaderCode)
    .then(success => {
        if (!success) {
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });

