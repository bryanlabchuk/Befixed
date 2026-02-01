/**
 * AssetLoader - Handles loading and caching of game assets
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from './EventEmitter.js';

export class AssetLoader {
    constructor() {
        this.cache = new Map();
        this.loadingQueue = [];
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.audioContext = null;
    }

    /**
     * Initialize the asset loader
     */
    init() {
        // Create audio context on user interaction (required by browsers)
        this.initAudioContext();
    }

    /**
     * Initialize Web Audio API context
     */
    initAudioContext() {
        if (!this.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioContext = new AudioContext();
            }
        }
        return this.audioContext;
    }

    /**
     * Resume audio context (needed after user interaction)
     */
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Load a single image
     * @param {string} key - Asset key
     * @param {string} src - Image source URL
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(key, src) {
        return new Promise((resolve, reject) => {
            if (this.cache.has(key)) {
                resolve(this.cache.get(key));
                return;
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                this.cache.set(key, img);
                this.loadedAssets++;
                this.emitProgress();
                resolve(img);
            };

            img.onerror = () => {
                console.warn(`Failed to load image: ${src}`);
                reject(new Error(`Failed to load image: ${src}`));
            };

            img.src = src;
        });
    }

    /**
     * Load a single audio file
     * @param {string} key - Asset key
     * @param {string} src - Audio source URL
     * @returns {Promise<AudioBuffer>}
     */
    async loadAudio(key, src) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        try {
            const response = await fetch(src);
            const arrayBuffer = await response.arrayBuffer();
            
            if (!this.audioContext) {
                this.initAudioContext();
            }

            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.cache.set(key, audioBuffer);
            this.loadedAssets++;
            this.emitProgress();
            return audioBuffer;
        } catch (error) {
            console.warn(`Failed to load audio: ${src}`, error);
            throw error;
        }
    }

    /**
     * Load a JSON file
     * @param {string} key - Asset key
     * @param {string} src - JSON source URL
     * @returns {Promise<Object>}
     */
    async loadJSON(key, src) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        try {
            const response = await fetch(src);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.cache.set(key, data);
            this.loadedAssets++;
            this.emitProgress();
            return data;
        } catch (error) {
            console.warn(`Failed to load JSON: ${src}`, error);
            throw error;
        }
    }

    /**
     * Load a font
     * @param {string} key - Font family name
     * @param {string} src - Font source URL
     * @returns {Promise<FontFace>}
     */
    async loadFont(key, src) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        try {
            const font = new FontFace(key, `url(${src})`);
            await font.load();
            document.fonts.add(font);
            this.cache.set(key, font);
            this.loadedAssets++;
            this.emitProgress();
            return font;
        } catch (error) {
            console.warn(`Failed to load font: ${src}`, error);
            throw error;
        }
    }

    /**
     * Load multiple assets
     * @param {Object} manifest - Asset manifest
     * @returns {Promise<void>}
     */
    async loadManifest(manifest) {
        const promises = [];

        // Count total assets
        this.totalAssets = 0;
        if (manifest.images) this.totalAssets += Object.keys(manifest.images).length;
        if (manifest.audio) this.totalAssets += Object.keys(manifest.audio).length;
        if (manifest.json) this.totalAssets += Object.keys(manifest.json).length;
        if (manifest.fonts) this.totalAssets += Object.keys(manifest.fonts).length;

        this.loadedAssets = 0;

        // Load images
        if (manifest.images) {
            for (const [key, src] of Object.entries(manifest.images)) {
                promises.push(this.loadImage(key, src).catch(e => {
                    console.warn(`Failed to load image ${key}:`, e);
                    return null;
                }));
            }
        }

        // Load audio
        if (manifest.audio) {
            for (const [key, src] of Object.entries(manifest.audio)) {
                promises.push(this.loadAudio(key, src).catch(e => {
                    console.warn(`Failed to load audio ${key}:`, e);
                    return null;
                }));
            }
        }

        // Load JSON
        if (manifest.json) {
            for (const [key, src] of Object.entries(manifest.json)) {
                promises.push(this.loadJSON(key, src).catch(e => {
                    console.warn(`Failed to load JSON ${key}:`, e);
                    return null;
                }));
            }
        }

        // Load fonts
        if (manifest.fonts) {
            for (const [key, src] of Object.entries(manifest.fonts)) {
                promises.push(this.loadFont(key, src).catch(e => {
                    console.warn(`Failed to load font ${key}:`, e);
                    return null;
                }));
            }
        }

        await Promise.all(promises);
    }

    /**
     * Emit loading progress event
     */
    emitProgress() {
        const progress = this.totalAssets > 0 
            ? (this.loadedAssets / this.totalAssets) * 100 
            : 100;

        globalEvents.emit('asset:progress', {
            loaded: this.loadedAssets,
            total: this.totalAssets,
            progress: Math.round(progress)
        });
    }

    /**
     * Get a cached asset
     * @param {string} key - Asset key
     * @returns {*} The cached asset or null
     */
    get(key) {
        return this.cache.get(key) || null;
    }

    /**
     * Check if an asset is cached
     * @param {string} key - Asset key
     * @returns {boolean}
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Remove an asset from cache
     * @param {string} key - Asset key
     */
    remove(key) {
        this.cache.delete(key);
    }

    /**
     * Clear all cached assets
     */
    clearCache() {
        this.cache.clear();
        this.loadedAssets = 0;
        this.totalAssets = 0;
    }

    /**
     * Preload chapter-specific assets
     * @param {number} chapterNumber - Chapter number
     * @param {Object} chapterData - Chapter data containing asset references
     */
    async preloadChapterAssets(chapterNumber, chapterData) {
        const manifest = {
            images: {},
            audio: {}
        };

        // Collect background images
        if (chapterData.backgrounds) {
            for (const [key, path] of Object.entries(chapterData.backgrounds)) {
                manifest.images[`ch${chapterNumber}_bg_${key}`] = path;
            }
        }

        // Collect character images
        if (chapterData.characters) {
            for (const char of chapterData.characters) {
                if (char.sprites) {
                    for (const [expression, path] of Object.entries(char.sprites)) {
                        manifest.images[`char_${char.id}_${expression}`] = path;
                    }
                }
            }
        }

        // Collect audio
        if (chapterData.music) {
            manifest.audio[`ch${chapterNumber}_music`] = chapterData.music;
        }

        if (chapterData.ambience) {
            manifest.audio[`ch${chapterNumber}_ambience`] = chapterData.ambience;
        }

        await this.loadManifest(manifest);
    }

    /**
     * Get the audio context
     * @returns {AudioContext}
     */
    getAudioContext() {
        return this.audioContext || this.initAudioContext();
    }
}

// Create singleton instance
export const assetLoader = new AssetLoader();

export default AssetLoader;
