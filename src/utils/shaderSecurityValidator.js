/**
 * Shader Security Validator
 * Valide et sécurise les shaders avant compilation
 */

const crypto = require('crypto');

class ShaderSecurityValidator {
    static DANGEROUS_PATTERNS = [
        // Tentatives d'accès système
        /require\s*\(/gi,
        /import\s*\(/gi,
        /eval\s*\(/gi,
        /Function\s*\(/gi,
        /constructor\s*\(/gi,
        /__proto__/gi,
        /prototype/gi,
        
        // Tentatives d'accès réseau
        /fetch\s*\(/gi,
        /XMLHttpRequest/gi,
        /WebSocket/gi,
        /navigator\./gi,
        /location\./gi,
        /document\./gi,
        /window\./gi,
        
        // Tentatives de lecture filesystem
        /process\./gi,
        /child_process/gi,
        /fs\./gi,
        
        // Code malveillant potentiel
        /<script/gi,
        /<iframe/gi,
        /javascript:/gi,
        /data:text\/html/gi,
        
        // Tentatives de DoS
        /while\s*\(\s*true\s*\)/gi,
        /for\s*\(\s*;\s*;\s*\)/gi,
    ];

    static MAX_CODE_LENGTH = 100000; // 100KB max
    static MAX_NESTED_LOOPS = 3;
    static MAX_FUNCTION_CALLS = 50;

    static validate(code, type = 'glsl') {
        const errors = [];
        const warnings = [];

        // 1. Vérifier la longueur
        if (code.length > this.MAX_CODE_LENGTH) {
            errors.push(`Code trop long: ${code.length} caractères (max ${this.MAX_CODE_LENGTH})`);
            return { valid: false, errors, warnings };
        }

        // 2. Vérifier les patterns dangereux
        for (const pattern of this.DANGEROUS_PATTERNS) {
            if (pattern.test(code)) {
                errors.push(`Pattern interdit détecté: ${pattern.source}`);
            }
        }

        // 3. Vérifier les boucles imbriquées
        const nestedLoops = this.countNestedLoops(code);
        if (nestedLoops > this.MAX_NESTED_LOOPS) {
            errors.push(`Trop de boucles imbriquées: ${nestedLoops} (max ${this.MAX_NESTED_LOOPS})`);
        }

        // 4. Vérifier le nombre d'appels de fonction
        const functionCalls = this.countFunctionCalls(code);
        if (functionCalls > this.MAX_FUNCTION_CALLS) {
            warnings.push(`Beaucoup d'appels de fonction: ${functionCalls}. Risque de performance.`);
        }

        // 5. Vérifier la structure selon le type
        if (type === 'glsl') {
            if (!code.includes('mainImage') && !code.includes('main')) {
                errors.push('Fonction mainImage ou main requise pour GLSL');
            }
        }

        // 6. Vérifier les allocations mémoire excessives
        const arrayAllocations = (code.match(/\[\s*\d+\s*\]/g) || []);
        for (const alloc of arrayAllocations) {
            const sizeMatch = alloc.match(/\d+/);
            if (sizeMatch) {
                const size = parseInt(sizeMatch[0]);
                if (size > 1000) {
                    errors.push(`Allocation tableau trop grande: ${size} éléments (max 1000)`);
                }
            }
        }

        // 7. Détecter les potentielles bombes algorithmiques
        if (this.detectAlgorithmicComplexity(code)) {
            warnings.push('Complexité algorithmique élevée détectée. Le shader pourrait être lent.');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            stats: {
                length: code.length,
                nestedLoops,
                functionCalls
            }
        };
    }

    static countNestedLoops(code) {
        let maxDepth = 0;
        let currentDepth = 0;

        // Retirer les commentaires
        code = code.replace(/\/\*[\s\S]*?\*\//g, '');
        code = code.replace(/\/\/.*/g, '');

        const loopKeywords = ['for', 'while', 'do'];
        const lines = code.split('\n');

        for (const line of lines) {
            for (const keyword of loopKeywords) {
                if (line.includes(keyword + '(') || line.includes(keyword + ' (')) {
                    currentDepth++;
                    maxDepth = Math.max(maxDepth, currentDepth);
                }
            }

            // Compter les fermetures
            const braces = line.match(/}/g);
            if (braces) currentDepth = Math.max(0, currentDepth - braces.length);
        }

        return maxDepth;
    }

    static countFunctionCalls(code) {
        // Compter approximativement les appels de fonction
        const matches = code.match(/\w+\s*\(/g);
        return matches ? matches.length : 0;
    }

    static detectAlgorithmicComplexity(code) {
        // Détecter O(n²) ou pire
        const hasNestedLoops = this.countNestedLoops(code) >= 2;
        const hasRecursion = /function\s+\w+.*\{[\s\S]*\1\s*\(/gi.test(code);
        const hasExponential = /pow\s*\(.*,\s*\d{2,}\)/gi.test(code);

        return hasNestedLoops || hasRecursion || hasExponential;
    }

    static sanitize(code) {
        // Nettoyer et normaliser le code

        // 1. Retirer les caractères non-printables
        code = code.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        // 2. Normaliser les espaces
        code = code.replace(/\r\n/g, '\n');
        code = code.replace(/\t/g, '  ');

        // 3. Limiter les lignes vides consécutives
        code = code.replace(/\n{3,}/g, '\n\n');

        // 4. Trim
        code = code.trim();

        return code;
    }

    static hashCode(code) {
        // Créer un hash pour détecter les duplicatas et le cache
        return crypto.createHash('sha256').update(code).digest('hex');
    }

    static validateAndSanitize(code, type = 'glsl') {
        // Sanitizer d'abord
        const sanitized = this.sanitize(code);

        // Valider
        const validation = this.validate(sanitized, type);

        return {
            ...validation,
            sanitized: validation.valid ? sanitized : code, // Retourner le code original si invalide
            codeHash: this.hashCode(sanitized)
        };
    }
}

module.exports = { ShaderSecurityValidator };

