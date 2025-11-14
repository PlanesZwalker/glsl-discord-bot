/**
 * Utilitaire pour échapper les chaînes JavaScript dans les templates HTML
 * Évite les problèmes d'apostrophes, guillemets et caractères spéciaux
 */

/**
 * Échappe une chaîne pour l'utiliser dans du code JavaScript
 * Utilise JSON.stringify qui échappe automatiquement tous les caractères spéciaux
 * 
 * @param {string} str - La chaîne à échapper
 * @returns {string} - La chaîne échappée (sans les guillemets externes de JSON.stringify)
 */
function escapeJSString(str) {
    if (typeof str !== 'string') {
        str = String(str);
    }
    // JSON.stringify ajoute des guillemets, on les retire
    return JSON.stringify(str).slice(1, -1);
}

/**
 * Échappe une chaîne pour l'utiliser dans un template literal JavaScript
 * Retourne la chaîne avec les guillemets pour utilisation directe
 * 
 * @param {string} str - La chaîne à échapper
 * @returns {string} - La chaîne échappée avec guillemets simples
 */
function escapeJSStringForTemplate(str) {
    if (typeof str !== 'string') {
        str = String(str);
    }
    // Utiliser JSON.stringify qui échappe tout correctement
    return JSON.stringify(str);
}

/**
 * Remplace les caractères accentués par leurs équivalents non accentués
 * Utile pour éviter les problèmes d'encodage dans les templates
 * 
 * @param {string} str - La chaîne à normaliser
 * @returns {string} - La chaîne normalisée
 */
function normalizeAccents(str) {
    if (typeof str !== 'string') {
        str = String(str);
    }
    
    const accents = {
        'à': 'a', 'â': 'a', 'ä': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'î': 'i', 'ï': 'i', 'ô': 'o', 'ö': 'o', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'ç': 'c', 'ñ': 'n'
    };
    
    return str.replace(/[àâäéèêëîïôöùûüçñ]/g, char => accents[char] || char);
}

/**
 * Échappe une chaîne pour l'utiliser dans un console.log JavaScript
 * Combine l'échappement JSON et la normalisation des accents si nécessaire
 * 
 * @param {string} str - La chaîne à échapper
 * @param {boolean} normalize - Si true, normalise aussi les accents
 * @returns {string} - La chaîne échappée prête pour console.log
 */
function escapeForConsoleLog(str, normalize = false) {
    if (normalize) {
        str = normalizeAccents(str);
    }
    // Pour console.log, on peut utiliser JSON.stringify directement
    // car il gère déjà tous les caractères spéciaux
    return JSON.stringify(str);
}

module.exports = {
    escapeJSString,
    escapeJSStringForTemplate,
    normalizeAccents,
    escapeForConsoleLog
};

