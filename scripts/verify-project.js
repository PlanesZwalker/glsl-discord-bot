#!/usr/bin/env node

/**
 * Script de vérification complète du projet
 * Vérifie tous les aspects critiques du projet
 */

const fs = require('fs');
const path = require('path');

const checks = {
    passed: [],
    warnings: [],
    errors: []
};

function log(message, type = 'info') {
    const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌'
    };
    console.log(`${icons[type]} ${message}`);
}

function checkFileExists(filePath, description) {
    if (fs.existsSync(filePath)) {
        checks.passed.push(`${description}: ${filePath}`);
        return true;
    } else {
        checks.errors.push(`${description} manquant: ${filePath}`);
        return false;
    }
}

function checkDirectoryExists(dirPath, description) {
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        checks.passed.push(`${description}: ${dirPath}`);
        return true;
    } else {
        checks.warnings.push(`${description} manquant: ${dirPath}`);
        return false;
    }
}

function checkPackageJson() {
    log('Vérification de package.json...', 'info');
    const packagePath = path.join(__dirname, '..', 'package.json');
    
    if (!checkFileExists(packagePath, 'package.json')) return;
    
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Vérifier les scripts essentiels
    const requiredScripts = ['start', 'test'];
    requiredScripts.forEach(script => {
        if (pkg.scripts && pkg.scripts[script]) {
            checks.passed.push(`Script ${script} présent`);
        } else {
            checks.errors.push(`Script ${script} manquant`);
        }
    });
    
    // Vérifier les dépendances critiques
    const criticalDeps = ['discord.js', 'puppeteer', 'express'];
    criticalDeps.forEach(dep => {
        if (pkg.dependencies && pkg.dependencies[dep]) {
            checks.passed.push(`Dépendance ${dep} présente`);
        } else {
            checks.errors.push(`Dépendance critique ${dep} manquante`);
        }
    });
    
    return pkg;
}

function checkCommands() {
    log('Vérification des commandes Discord...', 'info');
    const commandsDir = path.join(__dirname, '..', 'commands');
    
    if (!checkDirectoryExists(commandsDir, 'Dossier commands')) return;
    
    const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
    const expectedCommands = ['help.js', 'shader.js', 'shader-preset.js', 'shader-generate.js', 'shader-code.js', 'admin.js'];
    
    expectedCommands.forEach(cmd => {
        if (commandFiles.includes(cmd)) {
            checks.passed.push(`Commande ${cmd} présente`);
            
            // Vérifier que la commande a une fonction execute
            try {
                const cmdModule = require(path.join(commandsDir, cmd));
                if (cmdModule.execute && typeof cmdModule.execute === 'function') {
                    checks.passed.push(`  → ${cmd} a une fonction execute`);
                } else {
                    checks.errors.push(`  → ${cmd} n'a pas de fonction execute`);
                }
                
                if (cmdModule.data) {
                    checks.passed.push(`  → ${cmd} a une définition data`);
                } else {
                    checks.errors.push(`  → ${cmd} n'a pas de définition data`);
                }
            } catch (error) {
                checks.warnings.push(`  → Erreur lors de la vérification de ${cmd}: ${error.message}`);
            }
        } else {
            checks.errors.push(`Commande ${cmd} manquante`);
        }
    });
}

function checkSourceFiles() {
    log('Vérification des fichiers source...', 'info');
    const srcDir = path.join(__dirname, '..', 'src');
    
    if (!checkDirectoryExists(srcDir, 'Dossier src')) return;
    
    const criticalFiles = [
        'real-webgl-compiler.js',
        'browser-pool.js',
        'shader-cache.js',
        'simple-database.js',
        'webgl-security.js'
    ];
    
    criticalFiles.forEach(file => {
        const filePath = path.join(srcDir, file);
        if (fs.existsSync(filePath)) {
            checks.passed.push(`Fichier source ${file} présent`);
            
            // Vérifier la taille du fichier (détecter les fichiers vides ou corrompus)
            const stats = fs.statSync(filePath);
            if (stats.size > 100) {
                checks.passed.push(`  → ${file} a une taille raisonnable (${stats.size} bytes)`);
            } else {
                checks.warnings.push(`  → ${file} semble très petit (${stats.size} bytes)`);
            }
        } else {
            checks.errors.push(`Fichier source critique ${file} manquant`);
        }
    });
}

function checkUtils() {
    log('Vérification des utilitaires...', 'info');
    const utilsDir = path.join(__dirname, '..', 'src', 'utils');
    
    if (!checkDirectoryExists(utilsDir, 'Dossier src/utils')) return;
    
    const expectedUtils = [
        'logger.js',
        'errorHandler.js',
        'shaderValidator.js',
        'rateLimiter.js',
        'embedBuilder.js',
        'jsEscape.js' // Nouvelle bibliothèque d'encodage
    ];
    
    expectedUtils.forEach(util => {
        const utilPath = path.join(utilsDir, util);
        if (fs.existsSync(utilPath)) {
            checks.passed.push(`Utilitaire ${util} présent`);
        } else {
            checks.warnings.push(`Utilitaire ${util} manquant`);
        }
    });
}

function checkDocumentation() {
    log('Vérification de la documentation...', 'info');
    
    const docs = [
        { path: 'README.md', critical: true },
        { path: 'docs/API.md', critical: false },
        { path: 'docs/SHADER_GUIDE.md', critical: false },
        { path: 'docs/AUTH_TROUBLESHOOTING.md', critical: false }
    ];
    
    docs.forEach(doc => {
        const docPath = path.join(__dirname, '..', doc.path);
        if (fs.existsSync(docPath)) {
            checks.passed.push(`Documentation ${doc.path} présente`);
            
            // Vérifier que le README n'est pas vide
            if (doc.path === 'README.md') {
                const content = fs.readFileSync(docPath, 'utf8');
                if (content.length > 1000) {
                    checks.passed.push(`  → README.md contient suffisamment de contenu (${content.length} caractères)`);
                } else {
                    checks.warnings.push(`  → README.md semble trop court (${content.length} caractères)`);
                }
            }
        } else {
            if (doc.critical) {
                checks.errors.push(`Documentation critique ${doc.path} manquante`);
            } else {
                checks.warnings.push(`Documentation ${doc.path} manquante`);
            }
        }
    });
}

function checkConfiguration() {
    log('Vérification de la configuration...', 'info');
    
    const configFiles = [
        { path: 'config/env.bot.example', description: 'Fichier exemple env.bot' },
        { path: 'production.config.js', description: 'Configuration de production' },
        { path: 'render.yaml', description: 'Configuration Render.com' },
        { path: '.gitignore', description: 'Fichier .gitignore' }
    ];
    
    configFiles.forEach(config => {
        const configPath = path.join(__dirname, '..', config.path);
        if (fs.existsSync(configPath)) {
            checks.passed.push(`${config.description} présent`);
        } else {
            checks.warnings.push(`${config.description} manquant`);
        }
    });
}

function checkTests() {
    log('Vérification des tests...', 'info');
    
    const testsDir = path.join(__dirname, '..', 'tests');
    if (!fs.existsSync(testsDir)) {
        checks.warnings.push('Dossier tests manquant (mais peut être ignoré par .gitignore)');
        return;
    }
    
    const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js') || f.endsWith('.test.ts'));
    
    if (testFiles.length > 0) {
        checks.passed.push(`${testFiles.length} fichiers de tests trouvés`);
        testFiles.forEach(test => {
            checks.passed.push(`  → ${test}`);
        });
    } else {
        checks.warnings.push('Aucun fichier de test trouvé');
    }
    
    // Vérifier jest.config.js
    const jestConfigPath = path.join(__dirname, '..', 'jest.config.js');
    if (fs.existsSync(jestConfigPath)) {
        checks.passed.push('Configuration Jest présente');
    } else {
        checks.warnings.push('Configuration Jest manquante');
    }
}

function checkEnvironmentVariables() {
    log('Vérification des variables d\'environnement...', 'info');
    
    const envExamplePath = path.join(__dirname, '..', 'config', 'env.bot.example');
    if (fs.existsSync(envExamplePath)) {
        const content = fs.readFileSync(envExamplePath, 'utf8');
        const requiredVars = [
            'DISCORD_TOKEN',
            'DISCORD_CLIENT_ID',
            'DISCORD_PUBLIC_KEY'
        ];
        
        requiredVars.forEach(varName => {
            if (content.includes(varName)) {
                checks.passed.push(`Variable d'environnement ${varName} documentée`);
            } else {
                checks.warnings.push(`Variable d'environnement ${varName} non documentée`);
            }
        });
    }
}

function checkSecurity() {
    log('Vérification de la sécurité...', 'info');
    
    // Vérifier que .env n'est pas commité
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        checks.warnings.push('.env présent localement (normal pour le développement)');
    }
    
    // Vérifier .gitignore
    const gitignorePath = path.join(__dirname, '..', '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        if (gitignoreContent.includes('.env')) {
            checks.passed.push('.env est dans .gitignore');
        } else {
            checks.errors.push('.env n\'est pas dans .gitignore');
        }
        
        if (gitignoreContent.includes('node_modules')) {
            checks.passed.push('node_modules est dans .gitignore');
        } else {
            checks.errors.push('node_modules n\'est pas dans .gitignore');
        }
    }
}

function checkCodeQuality() {
    log('Vérification de la qualité du code...', 'info');
    
    // Vérifier qu'il n'y a pas de console.log excessifs en production
    const botPath = path.join(__dirname, '..', 'bot.js');
    if (fs.existsSync(botPath)) {
        const content = fs.readFileSync(botPath, 'utf8');
        const consoleLogCount = (content.match(/console\.log/g) || []).length;
        if (consoleLogCount > 0) {
            checks.passed.push(`console.log utilisé ${consoleLogCount} fois dans bot.js (normal pour le logging)`);
        }
    }
}

function printSummary() {
    console.log('\n' + '='.repeat(60));
    log('RÉSUMÉ DE LA VÉRIFICATION', 'info');
    console.log('='.repeat(60));
    
    console.log(`\n✅ Vérifications réussies: ${checks.passed.length}`);
    if (checks.passed.length > 0 && checks.passed.length <= 10) {
        checks.passed.forEach(check => console.log(`   ${check}`));
    } else if (checks.passed.length > 10) {
        checks.passed.slice(0, 10).forEach(check => console.log(`   ${check}`));
        console.log(`   ... et ${checks.passed.length - 10} autres vérifications réussies`);
    }
    
    console.log(`\n⚠️  Avertissements: ${checks.warnings.length}`);
    if (checks.warnings.length > 0) {
        checks.warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    console.log(`\n❌ Erreurs: ${checks.errors.length}`);
    if (checks.errors.length > 0) {
        checks.errors.forEach(error => console.log(`   ${error}`));
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (checks.errors.length === 0 && checks.warnings.length === 0) {
        log('✅ Toutes les vérifications sont passées !', 'success');
        process.exit(0);
    } else if (checks.errors.length === 0) {
        log('⚠️  Vérifications passées avec avertissements', 'warning');
        process.exit(0);
    } else {
        log('❌ Des erreurs critiques ont été détectées', 'error');
        process.exit(1);
    }
}

// Exécuter toutes les vérifications
async function main() {
    console.log('🔍 Vérification complète du projet ShaderBot\n');
    
    checkPackageJson();
    checkCommands();
    checkSourceFiles();
    checkUtils();
    checkDocumentation();
    checkConfiguration();
    checkTests();
    checkEnvironmentVariables();
    checkSecurity();
    checkCodeQuality();
    
    printSummary();
}

main().catch(error => {
    console.error('❌ Erreur lors de la vérification:', error);
    process.exit(1);
});

