/**
 * Environment Variables Validator
 * Valide et sécurise les variables d'environnement
 */

class EnvValidator {
    static requiredVars = [
        'DISCORD_TOKEN',
        'DISCORD_CLIENT_ID',
        'DISCORD_PUBLIC_KEY'
    ];
    
    static sensitiveVars = [
        'DISCORD_TOKEN',
        'DISCORD_CLIENT_SECRET',
        'NEXTAUTH_SECRET',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'API_SECRET_KEY'
    ];
    
    static validate() {
        const missing = [];
        const weak = [];
        
        // Vérifier les variables requises
        for (const varName of this.requiredVars) {
            if (!process.env[varName]) {
                missing.push(varName);
            }
        }
        
        if (missing.length > 0) {
            throw new Error(
                `Variables d'environnement manquantes: ${missing.join(', ')}`
            );
        }
        
        // Vérifier la force des secrets
        for (const varName of this.sensitiveVars) {
            const value = process.env[varName];
            if (value && !this.isStrongSecret(value)) {
                weak.push(varName);
            }
        }
        
        if (weak.length > 0) {
            console.warn(
                `⚠️ Secrets faibles détectés: ${weak.join(', ')}. ` +
                `Utilisez des secrets d'au moins 32 caractères aléatoires.`
            );
        }
        
        // Vérifier qu'on n'utilise pas de valeurs par défaut
        this.checkDefaultValues();
        
        console.log('✅ Variables d\'environnement validées');
    }
    
    static isStrongSecret(secret) {
        // Au moins 32 caractères
        if (secret.length < 32) return false;
        
        // Contient des caractères variés
        const hasLower = /[a-z]/.test(secret);
        const hasUpper = /[A-Z]/.test(secret);
        const hasNumber = /[0-9]/.test(secret);
        const hasSpecial = /[^a-zA-Z0-9]/.test(secret);
        
        return hasLower && hasUpper && hasNumber && hasSpecial;
    }
    
    static checkDefaultValues() {
        const defaults = {
            'NEXTAUTH_SECRET': 'changeme',
            'DATABASE_URL': 'sqlite://./dev.db',
            'STRIPE_SECRET_KEY': 'sk_test_'
        };
        
        for (const [key, defaultValue] of Object.entries(defaults)) {
            if (process.env[key]?.includes(defaultValue)) {
                throw new Error(
                    `❌ Valeur par défaut détectée pour ${key}. ` +
                    `Changez-la avant de déployer en production!`
                );
            }
        }
    }
    
    static maskSensitive(obj) {
        // Masquer les valeurs sensibles dans les logs
        const masked = { ...obj };
        
        for (const key of Object.keys(masked)) {
            const keyLower = key.toLowerCase();
            
            if (
                keyLower.includes('secret') ||
                keyLower.includes('key') ||
                keyLower.includes('token') ||
                keyLower.includes('password')
            ) {
                const value = String(masked[key]);
                if (value.length > 8) {
                    masked[key] = value.substring(0, 4) + '***' + value.substring(value.length - 4);
                } else {
                    masked[key] = '***';
                }
            }
        }
        
        return masked;
    }
    
    static generateStrongSecret() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('base64');
    }
}

module.exports = { EnvValidator };

