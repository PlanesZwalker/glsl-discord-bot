/**
 * Browser Pool - Réutilise les instances Puppeteer pour améliorer les performances
 * Évite de créer/fermer un browser à chaque compilation
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class BrowserPool {
    constructor(maxInstances = 2) {
        this.pool = [];
        this.maxInstances = maxInstances;
        this.activeInstances = 0;
        this.waitingQueue = [];
        this.chromePath = null;
        this.launchOptions = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🔧 Initialisation du Browser Pool...');
        
        // Trouver le chemin Chrome (même logique que RealWebGLCompiler)
        this.chromePath = await this.findChromePath();
        this.launchOptions = this.getLaunchOptions();
        
        this.initialized = true;
        console.log(`✅ Browser Pool initialisé (max: ${this.maxInstances} instances)`);
    }

    async findChromePath() {
        const rootDir = path.join(process.cwd(), '..');
        const currentDir = process.cwd();
        const buildCacheDir = path.join(rootDir, '.cache', 'puppeteer');
        const projectCacheDir = path.join(currentDir, '.cache', 'puppeteer');
        const systemCacheDir = process.env.PUPPETEER_CACHE_DIR || '/opt/render/.cache/puppeteer';
        const homeCacheDir = process.env.HOME ? path.join(process.env.HOME, '.cache', 'puppeteer') : null;
        
        const cacheDirs = [buildCacheDir, projectCacheDir, systemCacheDir];
        if (homeCacheDir) cacheDirs.push(homeCacheDir);
        
        for (const cacheDir of cacheDirs) {
            if (!fs.existsSync(cacheDir)) continue;
            
            try {
                const { execSync } = require('child_process');
                const findResult = execSync(`find "${cacheDir}" -name chrome -type f 2>/dev/null | head -1`, { 
                    encoding: 'utf8',
                    timeout: 5000
                }).trim();
                
                if (findResult && fs.existsSync(findResult)) {
                    console.log(`✅ Chrome trouvé: ${findResult}`);
                    return findResult;
                }
            } catch (error) {
                // Continue searching
            }
            
            // Méthode manuelle
            try {
                const chromeBaseDir = path.join(cacheDir, 'chrome');
                if (fs.existsSync(chromeBaseDir)) {
                    const versions = fs.readdirSync(chromeBaseDir);
                    for (const version of versions) {
                        const chromeDir = path.join(chromeBaseDir, version, 'chrome-linux64');
                        const potentialChrome = path.join(chromeDir, 'chrome');
                        if (fs.existsSync(potentialChrome)) {
                            console.log(`✅ Chrome trouvé: ${potentialChrome}`);
                            return potentialChrome;
                        }
                    }
                }
            } catch (error) {
                // Continue searching
            }
        }
        
        return null;
    }

    getLaunchOptions() {
        const options = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-site-isolation-trials',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-client-side-phishing-detection',
                '--disable-component-update',
                '--disable-default-apps',
                '--disable-domain-reliability',
                '--disable-extensions',
                '--disable-features=AudioServiceOutOfProcess',
                '--disable-hang-monitor',
                '--disable-ipc-flooding-protection',
                '--disable-notifications',
                '--disable-offer-store-unmasked-wallet-cards',
                '--disable-popup-blocking',
                '--disable-print-preview',
                '--disable-prompt-on-repost',
                '--disable-renderer-backgrounding',
                '--disable-speech-api',
                '--disable-sync',
                '--hide-scrollbars',
                '--ignore-gpu-blacklist',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-first-run',
                '--no-pings',
                '--no-zygote',
                // WebGL flags - utiliser SwiftShader pour WebGL sans GPU matériel
                '--use-gl=swiftshader',
                '--enable-unsafe-swiftshader',
                '--enable-unsafe-webgpu',
                '--enable-webgl',
                '--enable-webgl2',
                '--enable-accelerated-2d-canvas',
                '--window-size=800,600'
            ],
            timeout: 30000
        };

        if (this.chromePath) {
            options.executablePath = this.chromePath;
        }

        return options;
    }

    async getBrowser() {
        await this.initialize();

        // Si un browser est disponible dans le pool, le réutiliser
        if (this.pool.length > 0) {
            const browser = this.pool.pop();
            this.activeInstances++;
            
            // Vérifier que le browser est toujours connecté
            try {
                if (browser.isConnected()) {
                    return browser;
                }
            } catch (error) {
                // Browser fermé, créer un nouveau
                console.log('⚠️ Browser du pool fermé, création d\'un nouveau');
            }
        }

        // Si on a atteint le maximum, attendre qu'un browser soit libéré
        if (this.activeInstances >= this.maxInstances) {
            return new Promise((resolve) => {
                this.waitingQueue.push(resolve);
            }).then(() => this.getBrowser());
        }

        // Créer un nouveau browser
        try {
            this.activeInstances++;
            const browser = await puppeteer.launch(this.launchOptions);
            console.log(`✅ Nouveau browser créé (${this.activeInstances}/${this.maxInstances} actifs)`);
            return browser;
        } catch (error) {
            this.activeInstances--;
            // Libérer un waiting si erreur
            if (this.waitingQueue.length > 0) {
                const resolve = this.waitingQueue.shift();
                resolve();
            }
            throw error;
        }
    }

    releaseBrowser(browser) {
        if (!browser) return;

        this.activeInstances--;

        // Vérifier que le browser est toujours connecté
        try {
            if (browser.isConnected() && this.pool.length < this.maxInstances) {
                // Réutiliser le browser
                this.pool.push(browser);
                console.log(`♻️ Browser réutilisé (${this.pool.length} dans le pool)`);
            } else {
                // Fermer le browser
                browser.close().catch(err => {
                    console.error('⚠️ Erreur fermeture browser:', err.message);
                });
            }
        } catch (error) {
            // Browser déjà fermé
            console.log('⚠️ Browser déjà fermé');
        }

        // Libérer un waiting si disponible
        if (this.waitingQueue.length > 0) {
            const resolve = this.waitingQueue.shift();
            resolve();
        }
    }

    async closeAll() {
        console.log('🛑 Fermeture de tous les browsers du pool...');
        
        // Fermer tous les browsers du pool
        for (const browser of this.pool) {
            try {
                if (browser.isConnected()) {
                    await browser.close();
                }
            } catch (error) {
                console.error('⚠️ Erreur fermeture browser:', error.message);
            }
        }
        
        this.pool = [];
        this.activeInstances = 0;
        console.log('✅ Tous les browsers fermés');
    }

    getStats() {
        return {
            poolSize: this.pool.length,
            activeInstances: this.activeInstances,
            maxInstances: this.maxInstances,
            waitingQueue: this.waitingQueue.length
        };
    }
}

// Singleton instance
let browserPoolInstance = null;

function getBrowserPool(maxInstances = 2) {
    if (!browserPoolInstance) {
        browserPoolInstance = new BrowserPool(maxInstances);
    }
    return browserPoolInstance;
}

module.exports = { BrowserPool, getBrowserPool };

