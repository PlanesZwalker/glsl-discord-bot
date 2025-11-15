/**
 * URL Security Validator
 * Valide les URLs de textures pour protéger contre SSRF
 */

const { URL } = require('url');
const dns = require('dns').promises;

class URLSecurityValidator {
    static ALLOWED_PROTOCOLS = ['http:', 'https:'];
    
    static ALLOWED_DOMAINS = [
        'cdn.discordapp.com',
        'media.discordapp.net',
        'i.imgur.com',
        'images.unsplash.com',
        'raw.githubusercontent.com'
    ];
    
    static BLOCKED_IPS = [
        '127.0.0.1',
        'localhost',
        '0.0.0.0',
        '::1'
    ];
    
    static PRIVATE_IP_RANGES = [
        /^10\./,
        /^192\.168\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^169\.254\./
    ];
    
    static MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max

    static async validate(urlString) {
        try {
            const url = new URL(urlString);
            
            // 1. Vérifier le protocole
            if (!this.ALLOWED_PROTOCOLS.includes(url.protocol)) {
                return {
                    valid: false,
                    error: `Protocole non autorisé: ${url.protocol}. Utilisez HTTP ou HTTPS.`
                };
            }
            
            // 2. Vérifier le domaine (whitelist)
            const isAllowed = this.ALLOWED_DOMAINS.some(domain => 
                url.hostname.endsWith(domain)
            );
            
            if (!isAllowed) {
                return {
                    valid: false,
                    error: `Domaine non autorisé: ${url.hostname}. Domaines acceptés: ${this.ALLOWED_DOMAINS.join(', ')}`
                };
            }
            
            // 3. Résoudre l'IP et vérifier qu'elle n'est pas privée
            const ip = await this.resolveIP(url.hostname);
            
            if (this.BLOCKED_IPS.includes(ip)) {
                return {
                    valid: false,
                    error: 'IP bloquée (localhost/loopback)'
                };
            }
            
            for (const range of this.PRIVATE_IP_RANGES) {
                if (range.test(ip)) {
                    return {
                        valid: false,
                        error: 'IP privée non autorisée (SSRF protection)'
                    };
                }
            }
            
            // 4. Vérifier que l'URL pointe vers une image
            const contentType = await this.checkContentType(urlString);
            
            if (!contentType || !contentType.startsWith('image/')) {
                return {
                    valid: false,
                    error: `L'URL doit pointer vers une image (type: ${contentType || 'unknown'})`
                };
            }
            
            // 5. Vérifier la taille
            const size = await this.checkFileSize(urlString);
            
            if (size > this.MAX_FILE_SIZE) {
                return {
                    valid: false,
                    error: `Fichier trop volumineux: ${(size / 1024 / 1024).toFixed(2)}MB (max ${(this.MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB)`
                };
            }
            
            return {
                valid: true,
                contentType,
                size
            };
            
        } catch (error) {
            return {
                valid: false,
                error: `URL invalide: ${error.message}`
            };
        }
    }
    
    static async resolveIP(hostname) {
        try {
            const addresses = await dns.resolve4(hostname);
            return addresses[0];
        } catch (error) {
            throw new Error(`Impossible de résoudre ${hostname}`);
        }
    }
    
    static async checkContentType(url) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000),
                headers: {
                    'User-Agent': 'ShaderBot/1.0'
                }
            });
            
            return response.headers.get('content-type');
        } catch (error) {
            throw new Error('Impossible de vérifier le type de contenu');
        }
    }
    
    static async checkFileSize(url) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000)
            });
            
            const size = parseInt(response.headers.get('content-length') || '0');
            return size;
        } catch (error) {
            throw new Error('Impossible de vérifier la taille du fichier');
        }
    }
}

module.exports = { URLSecurityValidator };

