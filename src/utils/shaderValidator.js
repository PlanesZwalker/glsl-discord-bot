/**
 * ShaderValidator - Validation robuste des shaders GLSL/WGSL
 */

class ShaderValidator {
    static MAX_CODE_LENGTH = 50000;
    static MAX_LINES = 1000;

    /**
     * Valide un shader
     */
    static validate(code, language = 'glsl') {
        const errors = [];

        if (!code || typeof code !== 'string') {
            errors.push('Le code shader est requis');
            return { valid: false, errors };
        }

        // Vérifier la longueur
        if (code.length > this.MAX_CODE_LENGTH) {
            errors.push(`Code trop long (max ${this.MAX_CODE_LENGTH} caractères, actuel: ${code.length})`);
        }

        // Vérifier le nombre de lignes
        const lines = code.split('\n').length;
        if (lines > this.MAX_LINES) {
            errors.push(`Trop de lignes (max ${this.MAX_LINES}, actuel: ${lines})`);
        }

        // Vérifier les boucles infinies potentielles
        if (this.hasInfiniteLoop(code)) {
            errors.push('Boucle infinie potentielle détectée (while(true) ou for(;;) sans break)');
        }

        // Vérifier les instructions dangereuses
        const dangerous = this.hasDangerousInstructions(code);
        if (dangerous.length > 0) {
            errors.push(`Instructions potentiellement dangereuses détectées: ${dangerous.join(', ')}`);
        }

        // Vérifier la structure de base selon le langage
        if (language === 'glsl') {
            if (!code.includes('mainImage') && !code.includes('main')) {
                errors.push('Fonction mainImage requise pour GLSL (format Shadertoy)');
            }
        } else if (language === 'wgsl') {
            if (!code.includes('@fragment') && !code.includes('fn main')) {
                errors.push('Fonction @fragment fn main requise pour WGSL');
            }
        }

        // Vérifier les caractères non-ASCII suspects
        if (this.hasSuspiciousCharacters(code)) {
            errors.push('Caractères suspects détectés dans le code');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Détecte les boucles infinies potentielles
     */
    static hasInfiniteLoop(code) {
        const patterns = [
            /while\s*\(\s*true\s*\)/gi,
            /for\s*\(\s*;\s*;\s*\)/gi,
            /for\s*\(\s*[^;]*;\s*[^;]*;\s*\)\s*\{/gi
        ];

        for (const pattern of patterns) {
            const matches = [...code.matchAll(pattern)];
            for (const match of matches) {
                // Vérifier s'il y a un break après dans la même portée
                const afterLoop = code.slice(match.index);
                const nextBrace = afterLoop.indexOf('}');
                const loopContent = afterLoop.slice(0, nextBrace);
                
                // Chercher break, return, ou condition de sortie
                const hasBreak = /\bbreak\b/.test(loopContent);
                const hasReturn = /\breturn\b/.test(loopContent);
                const hasExitCondition = /if\s*\([^)]+\)\s*\{[^}]*break/.test(loopContent);

                if (!hasBreak && !hasReturn && !hasExitCondition) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Détecte les instructions dangereuses
     */
    static hasDangerousInstructions(code) {
        const blacklist = [
            'eval',
            'Function(',
            '__proto__',
            'constructor',
            'require(',
            'import(',
            'process.',
            'child_process',
            'exec(',
            'spawn(',
            'fs.',
            'http.',
            'https.',
            'XMLHttpRequest',
            'fetch(',
            'document.',
            'window.',
            'localStorage',
            'sessionStorage'
        ];

        const found = [];
        for (const keyword of blacklist) {
            // Vérifier que ce n'est pas dans un commentaire
            const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const matches = [...code.matchAll(regex)];
            
            for (const match of matches) {
                // Vérifier si c'est dans un commentaire
                const beforeMatch = code.slice(0, match.index);
                const lastLineComment = beforeMatch.lastIndexOf('//');
                const lastBlockCommentStart = beforeMatch.lastIndexOf('/*');
                const lastBlockCommentEnd = beforeMatch.lastIndexOf('*/');
                
                const inLineComment = lastLineComment > lastBlockCommentEnd && 
                                     (beforeMatch.slice(lastLineComment).indexOf('\n') === -1 || 
                                      beforeMatch.slice(lastLineComment).indexOf('\n') > match.index - lastLineComment);
                const inBlockComment = lastBlockCommentStart > lastBlockCommentEnd;

                if (!inLineComment && !inBlockComment) {
                    found.push(keyword);
                    break;
                }
            }
        }

        return found;
    }

    /**
     * Détecte les caractères suspects
     */
    static hasSuspiciousCharacters(code) {
        // Vérifier les caractères non-ASCII sauf ceux autorisés (émojis, accents dans commentaires)
        const suspiciousPattern = /[^\x00-\x7F\u00A0-\uFFFF\s\n\r\t]/;
        return suspiciousPattern.test(code);
    }

    /**
     * Nettoie et normalise le code shader
     */
    static sanitize(code) {
        // Enlever les commentaires excessifs (garder seulement les commentaires simples)
        let sanitized = code
            .replace(/\/\*[\s\S]*?\*\//g, '') // Commentaires bloc
            .replace(/\/\/.*/g, ''); // Commentaires ligne

        // Normaliser les espaces multiples
        sanitized = sanitized.replace(/[ \t]+/g, ' ');
        
        // Normaliser les retours à la ligne multiples
        sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
        
        // Trim
        sanitized = sanitized.trim();

        return sanitized;
    }

    /**
     * Valide et nettoie le code en une seule opération
     */
    static validateAndSanitize(code, language = 'glsl') {
        const sanitized = this.sanitize(code);
        const validation = this.validate(sanitized, language);
        
        return {
            ...validation,
            sanitized: sanitized !== code ? sanitized : null
        };
    }
}

module.exports = { ShaderValidator };

