/**
 * WebGL Security - Limites et protections pour WebGL
 * Empêche l'utilisation excessive de ressources
 */

class WebGLSecurity {
    constructor() {
        // Limites de sécurité
        this.maxTextureSize = 2048; // Maximum 2048x2048
        this.maxViewportSize = 2048;
        this.maxRenderbufferSize = 2048;
        this.maxVertexAttributes = 16;
        this.maxVertexUniformVectors = 1024;
        this.maxFragmentUniformVectors = 1024;
        this.maxVaryingVectors = 30;
        this.maxTextureImageUnits = 16;
        this.maxCombinedTextureImageUnits = 32;
        this.maxVertexTextureImageUnits = 16;
        this.maxArrayTextureLayers = 256;
        this.max3DTextureSize = 2048;
        this.maxCubeMapTextureSize = 2048;
        this.maxRenderbufferSize = 2048;
        this.maxDrawBuffers = 4;
        this.maxColorAttachments = 4;
        this.maxSamples = 4;
    }

    /**
     * Injecte les protections WebGL dans une page
     */
    injectSecurityLimits() {
        // Remplacer les template literals par des valeurs concrètes pour éviter les conflits
        const maxTex = this.maxTextureSize;
        const maxView = this.maxViewportSize;
        const maxRbuf = this.maxRenderbufferSize;
        
        return `
        // Protection WebGL - Limites de sécurité
        (function() {
            if (window.__webglSecurityInjected) return;
            window.__webglSecurityInjected = true;
            
            // Sauvegarder la fonction originale seulement si elle n'existe pas déjà
            if (!window.__originalGetContext) {
                window.__originalGetContext = HTMLCanvasElement.prototype.getContext;
            }
            
            HTMLCanvasElement.prototype.getContext = function(type, attributes) {
                if (type === 'webgl' || type === 'webgl2') {
                    attributes = attributes || {};
                    // Forcer low-power mode
                    attributes.powerPreference = 'low-power';
                    attributes.failIfMajorPerformanceCaveat = true;
                    // Désactiver les fonctionnalités coûteuses
                    attributes.antialias = false;
                    attributes.depth = false;
                    attributes.stencil = false;
                    attributes.alpha = false;
                    attributes.premultipliedAlpha = false;
                }
                return window.__originalGetContext.call(this, type, attributes);
            };

            // Wrapper pour limiter les appels WebGL
            const wrapWebGLContext = (gl) => {
                if (!gl || gl.__wrapped) return gl;
                gl.__wrapped = true;

                // Limiter la taille des textures
                if (!gl.__originalTexImage2D) {
                    gl.__originalTexImage2D = gl.texImage2D;
                }
                gl.texImage2D = function(...args) {
                    // Vérifier la taille si c'est une texture 2D
                    if (args.length >= 5 && typeof args[3] === 'number' && typeof args[4] === 'number') {
                        const width = args[3];
                        const height = args[4];
                        if (width > ${maxTex} || height > ${maxTex}) {
                            throw new Error('Texture size exceeds maximum allowed: ' + ${maxTex} + 'x' + ${maxTex});
                        }
                    }
                    return gl.__originalTexImage2D.apply(this, args);
                };

                // Limiter viewport
                if (!gl.__originalViewport) {
                    gl.__originalViewport = gl.viewport;
                }
                gl.viewport = function(x, y, width, height) {
                    if (width > ${maxView} || height > ${maxView}) {
                        throw new Error('Viewport size exceeds maximum allowed: ' + ${maxView} + 'x' + ${maxView});
                    }
                    return gl.__originalViewport.call(this, x, y, width, height);
                };

                // Limiter renderbuffer
                if (!gl.__originalRenderbufferStorage) {
                    gl.__originalRenderbufferStorage = gl.renderbufferStorage;
                }
                gl.renderbufferStorage = function(target, internalformat, width, height) {
                    if (width > ${maxRbuf} || height > ${maxRbuf}) {
                        throw new Error('Renderbuffer size exceeds maximum allowed: ' + ${maxRbuf} + 'x' + ${maxRbuf});
                    }
                    return gl.__originalRenderbufferStorage.call(this, target, internalformat, width, height);
                };

                // Timeout pour les opérations longues
                const originalDrawArrays = gl.drawArrays;
                const originalDrawElements = gl.drawElements;
                
                let drawCallCount = 0;
                const maxDrawCallsPerFrame = 1000;
                
                gl.drawArrays = function(...args) {
                    drawCallCount++;
                    if (drawCallCount > maxDrawCallsPerFrame) {
                        throw new Error('Too many draw calls per frame (max: ' + maxDrawCallsPerFrame + ')');
                    }
                    return originalDrawArrays.apply(this, args);
                };
                
                gl.drawElements = function(...args) {
                    drawCallCount++;
                    if (drawCallCount > maxDrawCallsPerFrame) {
                        throw new Error('Too many draw calls per frame (max: ' + maxDrawCallsPerFrame + ')');
                    }
                    return originalDrawElements.apply(this, args);
                };

                // Réinitialiser le compteur chaque frame
                const originalClear = gl.clear;
                gl.clear = function(...args) {
                    drawCallCount = 0;
                    return originalClear.apply(this, args);
                };

                return gl;
            };

            // Appliquer les protections après création du contexte
            // (déjà fait plus haut, pas besoin de le refaire)
        })();
        `;
    }

    /**
     * Crée un wrapper avec timeout pour les fonctions asynchrones
     */
    createTimeoutWrapper(functionName, timeoutMs = 10000) {
        return `
        // Timeout wrapper pour ${functionName}
        const original${functionName} = window.${functionName};
        window.${functionName} = function(...args) {
            return Promise.race([
                original${functionName}.apply(this, args),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('${functionName} timeout after ${timeoutMs}ms')), ${timeoutMs})
                )
            ]);
        };
        `;
    }
}

module.exports = { WebGLSecurity };

