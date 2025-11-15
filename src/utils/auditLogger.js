/**
 * Audit Logger
 * Système de logging et audit trail pour la sécurité
 */

const fs = require('fs').promises;
const path = require('path');

class AuditLogger {
    constructor() {
        this.logDir = './logs';
        this.init();
    }
    
    async init() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }
    
    async log(event, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            ...data,
            ip: data.ip || 'unknown',
            userAgent: data.userAgent || 'unknown'
        };
        
        // Log en console
        console.log(`[AUDIT] ${event}:`, JSON.stringify(data));
        
        // Log dans un fichier (rotation quotidienne)
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `audit-${date}.log`);
        
        try {
            await fs.appendFile(
                logFile,
                JSON.stringify(logEntry) + '\n'
            );
        } catch (error) {
            console.error('Failed to write audit log:', error);
        }
        
        // Envoyer les événements critiques à un webhook
        if (this.isCriticalEvent(event)) {
            await this.sendToWebhook(logEntry);
        }
        
        // Stocker dans la base de données pour analyse
        await this.storeInDatabase(logEntry);
    }
    
    isCriticalEvent(event) {
        const criticalEvents = [
            'USER_BANNED',
            'SECURITY_VIOLATION',
            'SHADER_INJECTION_ATTEMPT',
            'RATE_LIMIT_ABUSE',
            'UNAUTHORIZED_ACCESS',
            'PAYMENT_FRAUD_SUSPECTED',
            'API_KEY_LEAKED'
        ];
        
        return criticalEvents.includes(event);
    }
    
    async sendToWebhook(logEntry) {
        try {
            const { getWebhookManager } = require('./webhookManager');
            const webhookManager = getWebhookManager();
            
            if (!webhookManager || !webhookManager.webhooks || !webhookManager.webhooks.security) {
                return;
            }
            
            const embed = {
                title: `🚨 ${logEntry.event}`,
                description: JSON.stringify(logEntry, null, 2).substring(0, 2000),
                color: 0xFF0000,
                timestamp: logEntry.timestamp,
                fields: [
                    { name: 'User ID', value: logEntry.userId || 'N/A', inline: true },
                    { name: 'IP', value: logEntry.ip, inline: true }
                ]
            };
            
            await webhookManager.send(webhookManager.webhooks.security, {
                embeds: [embed]
            });
        } catch (error) {
            console.error('Failed to send webhook:', error);
        }
    }
    
    async storeInDatabase(logEntry) {
        try {
            // Cette méthode sera appelée avec la base de données
            // On stockera dans une table audit_logs
            // La base de données sera injectée via setDatabase()
            if (this.database) {
                await this.database.logAudit(logEntry.event, logEntry);
            }
        } catch (error) {
            console.error('Failed to store audit log in database:', error);
        }
    }
    
    setDatabase(database) {
        this.database = database;
    }
    
    // Méthodes spécifiques pour différents types d'événements
    
    async logShaderCompilation(userId, code, success) {
        const { ShaderSecurityValidator } = require('./shaderSecurityValidator');
        await this.log('SHADER_COMPILATION', {
            userId,
            codeHash: ShaderSecurityValidator.hashCode(code),
            codeLength: code.length,
            success
        });
    }
    
    async logSecurityViolation(userId, violationType, details) {
        await this.log('SECURITY_VIOLATION', {
            userId,
            violationType,
            details,
            severity: 'HIGH'
        });
    }
    
    async logPayment(userId, amount, plan) {
        await this.log('PAYMENT', {
            userId,
            amount,
            plan,
            currency: 'EUR'
        });
    }
    
    async logAPIAccess(apiKey, endpoint, success) {
        await this.log('API_ACCESS', {
            apiKeyHash: this.hashAPIKey(apiKey),
            endpoint,
            success
        });
    }
    
    hashAPIKey(apiKey) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 8);
    }
}

// Singleton
let auditLoggerInstance = null;

function getAuditLogger() {
    if (!auditLoggerInstance) {
        auditLoggerInstance = new AuditLogger();
    }
    return auditLoggerInstance;
}

module.exports = { AuditLogger, getAuditLogger };

