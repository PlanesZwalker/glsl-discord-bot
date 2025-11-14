/**
 * Logger - Système de logging structuré avec timestamps
 */

class Logger {
    static formatTimestamp() {
        return new Date().toISOString();
    }

    static info(msg, ...args) {
        console.log(`[${this.formatTimestamp()}] INFO: ${msg}`, ...args);
    }

    static error(msg, error = null, ...args) {
        if (error) {
            console.error(`[${this.formatTimestamp()}] ERROR: ${msg}`, error, ...args);
            if (error.stack) {
                console.error(`[${this.formatTimestamp()}] STACK:`, error.stack);
            }
        } else {
            console.error(`[${this.formatTimestamp()}] ERROR: ${msg}`, ...args);
        }
    }

    static warn(msg, ...args) {
        console.warn(`[${this.formatTimestamp()}] WARN: ${msg}`, ...args);
    }

    static debug(msg, ...args) {
        if (process.env.DEBUG === 'true') {
            console.log(`[${this.formatTimestamp()}] DEBUG: ${msg}`, ...args);
        }
    }

    static success(msg, ...args) {
        console.log(`[${this.formatTimestamp()}] ✅ SUCCESS: ${msg}`, ...args);
    }
}

module.exports = { Logger };

