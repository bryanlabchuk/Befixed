/**
 * GameManager - Central controller for game state and systems
 * Befixed - Magic & Mechanical Repair Shop
 */

import { EventEmitter, globalEvents, GameEvents } from '../utils/EventEmitter.js';
import { assetLoader } from '../utils/AssetLoader.js';
import { StateManager } from './StateManager.js';
import { SaveManager } from './SaveManager.js';
import { SceneManager } from './SceneManager.js';

export class GameManager {
    constructor() {
        this.events = globalEvents;
        this.isInitialized = false;
        this.isRunning = false;
        this.isPaused = false;
        
        // Core managers
        this.state = null;
        this.saves = null;
        this.scenes = null;
        
        // External managers (set during initialization)
        this.audio = null;
        this.ui = null;
        this.narrative = null;
        this.puzzles = null;
        this.input = null;
        
        // Game configuration
        this.config = null;
        
        // Chapter data
        this.chapters = new Map();
        this.currentChapter = null;
        
        // Game loop
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.frameId = null;
    }

    /**
     * Initialize the game
     * @param {Object} options - Initialization options
     */
    async init(options = {}) {
        if (this.isInitialized) {
            console.warn('GameManager already initialized');
            return;
        }

        console.log('Initializing GameManager...');
        this.updateLoadingProgress(0, 'Initializing game systems...');

        try {
            // Initialize asset loader
            assetLoader.init();
            this.updateLoadingProgress(5, 'Loading configuration...');

            // Load game configuration
            this.config = await this.loadConfig();
            this.updateLoadingProgress(10, 'Setting up game systems...');

            // Initialize core managers
            this.state = new StateManager();
            this.saves = new SaveManager(this.state);
            this.scenes = new SceneManager(this);

            await this.state.init();
            await this.saves.init();
            await this.scenes.init();

            this.updateLoadingProgress(20, 'Loading core assets...');

            // Load core assets
            await this.loadCoreAssets();
            this.updateLoadingProgress(50, 'Loading game data...');

            // Load chapter data
            await this.loadChapterManifest();
            this.updateLoadingProgress(70, 'Setting up UI...');

            // Set external managers if provided
            if (options.audio) this.audio = options.audio;
            if (options.ui) this.ui = options.ui;
            if (options.narrative) this.narrative = options.narrative;
            if (options.puzzles) this.puzzles = options.puzzles;
            if (options.input) this.input = options.input;

            // Register event handlers
            this.registerEventHandlers();
            this.updateLoadingProgress(90, 'Finalizing...');

            this.isInitialized = true;
            this.updateLoadingProgress(100, 'Ready!');

            // Emit ready event
            this.events.emit(GameEvents.GAME_READY, { manager: this });

            console.log('GameManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize GameManager:', error);
            throw error;
        }
    }

    /**
     * Load game configuration
     * @returns {Promise<Object>}
     */
    async loadConfig() {
        try {
            const config = await assetLoader.loadJSON('game-config', 'data/game-config.json');
            return config;
        } catch (error) {
            console.warn('Could not load game config, using defaults');
            return this.getDefaultConfig();
        }
    }

    /**
     * Get default game configuration
     * @returns {Object}
     */
    getDefaultConfig() {
        return {
            title: 'Befixed',
            subtitle: 'Magic & Mechanical Repair Shop',
            version: '0.1.0',
            totalChapters: 8,
            settings: {
                textSpeed: 'normal',
                textSize: 'normal',
                masterVolume: 80,
                musicVolume: 70,
                sfxVolume: 80,
                voiceVolume: 90,
                screenEffects: true,
                dyslexiaFont: false,
                highContrast: false,
                reduceMotion: false
            },
            saveSlots: 10,
            autosave: true,
            autosaveInterval: 60000 // 1 minute
        };
    }

    /**
     * Load core assets required for the game
     */
    async loadCoreAssets() {
        const manifest = {
            json: {
                'characters': 'data/characters.json'
            },
            images: {
                // UI elements will be added as SVG or CSS
            }
        };

        try {
            await assetLoader.loadManifest(manifest);
        } catch (error) {
            console.warn('Some core assets failed to load:', error);
        }
    }

    /**
     * Load chapter manifest
     */
    async loadChapterManifest() {
        const totalChapters = this.config?.totalChapters || 8;
        
        for (let i = 1; i <= totalChapters; i++) {
            try {
                const chapterData = await assetLoader.loadJSON(
                    `chapter${i}`,
                    `data/chapters/chapter${i}.json`
                );
                this.chapters.set(i, chapterData);
            } catch (error) {
                console.warn(`Chapter ${i} data not found, will use placeholder`);
                this.chapters.set(i, this.getPlaceholderChapter(i));
            }
        }
    }

    /**
     * Get placeholder chapter data
     * @param {number} num - Chapter number
     * @returns {Object}
     */
    getPlaceholderChapter(num) {
        const titles = [
            'The Broken Automaton',
            'Whispers of Magic',
            'The Clockwork Heart',
            'Echoes of the Past',
            'The Enchanted Mechanism',
            'Shadows and Gears',
            'The Final Repair',
            'A New Beginning'
        ];

        return {
            id: `chapter${num}`,
            number: num,
            title: titles[num - 1] || `Chapter ${num}`,
            description: `The story continues in chapter ${num}...`,
            scenes: [],
            puzzles: [],
            characters: [],
            isPlaceholder: true
        };
    }

    /**
     * Register event handlers
     */
    registerEventHandlers() {
        // Scene events
        this.events.on(GameEvents.SCENE_CHANGE, this.handleSceneChange.bind(this));
        
        // Chapter events
        this.events.on(GameEvents.CHAPTER_START, this.handleChapterStart.bind(this));
        this.events.on(GameEvents.CHAPTER_END, this.handleChapterEnd.bind(this));
        
        // Puzzle events
        this.events.on(GameEvents.PUZZLE_COMPLETE, this.handlePuzzleComplete.bind(this));
        
        // Save events
        this.events.on(GameEvents.SAVE_COMPLETE, this.handleSaveComplete.bind(this));
        this.events.on(GameEvents.LOAD_COMPLETE, this.handleLoadComplete.bind(this));
    }

    /**
     * Update loading progress UI
     * @param {number} percent - Progress percentage
     * @param {string} text - Status text
     */
    updateLoadingProgress(percent, text) {
        const progressFill = document.getElementById('loading-progress-fill');
        const loadingText = document.getElementById('loading-text');
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        if (loadingText) {
            loadingText.textContent = text;
        }
    }

    /**
     * Start a new game
     */
    async newGame() {
        console.log('Starting new game...');
        
        // Reset state
        this.state.reset();
        
        // Start from chapter 1
        await this.startChapter(1);
        
        this.isRunning = true;
        this.events.emit(GameEvents.GAME_START, { isNewGame: true });
        
        // Start game loop
        this.startGameLoop();
    }

    /**
     * Continue from last save
     */
    async continueGame() {
        const lastSave = this.saves.getLatestSave();
        if (lastSave) {
            await this.loadGame(lastSave.slot);
        } else {
            console.warn('No save found to continue');
        }
    }

    /**
     * Load a saved game
     * @param {number} slot - Save slot number
     */
    async loadGame(slot) {
        console.log(`Loading game from slot ${slot}...`);
        
        const success = await this.saves.load(slot);
        if (success) {
            const saveData = this.saves.getSaveData(slot);
            await this.startChapter(saveData.chapter, saveData.scene);
            this.isRunning = true;
            this.startGameLoop();
        }
    }

    /**
     * Save the current game
     * @param {number} slot - Save slot number
     */
    async saveGame(slot) {
        if (!this.isRunning) return false;
        
        const saveData = {
            chapter: this.currentChapter,
            scene: this.scenes.currentSceneId,
            playtime: this.state.get('playtime') || 0,
            timestamp: Date.now()
        };
        
        return await this.saves.save(slot, saveData);
    }

    /**
     * Start a chapter
     * @param {number} chapterNum - Chapter number
     * @param {string} [sceneId] - Optional starting scene
     */
    async startChapter(chapterNum, sceneId = null) {
        console.log(`Starting chapter ${chapterNum}...`);
        
        const chapterData = this.chapters.get(chapterNum);
        if (!chapterData) {
            console.error(`Chapter ${chapterNum} not found`);
            return;
        }

        this.currentChapter = chapterNum;
        
        // Preload chapter assets
        await assetLoader.preloadChapterAssets(chapterNum, chapterData);
        
        // Update state
        this.state.set('currentChapter', chapterNum);
        
        // Emit chapter start event
        this.events.emit(GameEvents.CHAPTER_START, {
            chapter: chapterNum,
            data: chapterData
        });
        
        // Load the starting scene
        const startScene = sceneId || (chapterData.scenes[0]?.id || 'intro');
        await this.scenes.loadScene(startScene, chapterData);
    }

    /**
     * Pause the game
     */
    pause() {
        if (!this.isRunning || this.isPaused) return;
        
        this.isPaused = true;
        this.events.emit(GameEvents.GAME_PAUSE);
        
        if (this.audio) {
            this.audio.pause();
        }
    }

    /**
     * Resume the game
     */
    resume() {
        if (!this.isPaused) return;
        
        this.isPaused = false;
        this.events.emit(GameEvents.GAME_RESUME);
        
        if (this.audio) {
            this.audio.resume();
        }
    }

    /**
     * Start the game loop
     */
    startGameLoop() {
        if (this.frameId) return;
        
        this.lastFrameTime = performance.now();
        this.gameLoop();
    }

    /**
     * Stop the game loop
     */
    stopGameLoop() {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    /**
     * Main game loop
     */
    gameLoop = (currentTime = performance.now()) => {
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        if (!this.isPaused) {
            this.update(this.deltaTime);
        }

        this.frameId = requestAnimationFrame(this.gameLoop);
    }

    /**
     * Update game systems
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Update playtime
        const playtime = (this.state.get('playtime') || 0) + deltaTime;
        this.state.set('playtime', playtime);

        // Update managers
        if (this.scenes) this.scenes.update(deltaTime);
        if (this.narrative) this.narrative.update(deltaTime);
        if (this.puzzles) this.puzzles.update(deltaTime);
        if (this.audio) this.audio.update(deltaTime);
    }

    /**
     * Handle scene change
     * @param {Object} data - Scene change data
     */
    handleSceneChange(data) {
        console.log('Scene changed:', data.sceneId);
    }

    /**
     * Handle chapter start
     * @param {Object} data - Chapter start data
     */
    handleChapterStart(data) {
        console.log(`Chapter ${data.chapter} started`);
        
        // Update UI
        const chapterNumber = document.getElementById('chapter-number');
        const chapterTitle = document.getElementById('chapter-title');
        
        if (chapterNumber) {
            chapterNumber.textContent = `Chapter ${data.chapter}`;
        }
        if (chapterTitle) {
            chapterTitle.textContent = data.data.title;
        }
    }

    /**
     * Handle chapter end
     * @param {Object} data - Chapter end data
     */
    handleChapterEnd(data) {
        console.log(`Chapter ${data.chapter} ended`);
        
        // Mark chapter as complete
        this.state.setFlag(`chapter${data.chapter}Complete`, true);
        
        // Check for next chapter
        const nextChapter = data.chapter + 1;
        if (this.chapters.has(nextChapter)) {
            // Prompt to continue or return to menu
            this.events.emit(GameEvents.UI_NOTIFICATION, {
                type: 'success',
                message: `Chapter ${data.chapter} complete!`
            });
        } else {
            // Game complete
            this.events.emit(GameEvents.GAME_OVER, { ending: 'complete' });
        }
    }

    /**
     * Handle puzzle completion
     * @param {Object} data - Puzzle completion data
     */
    handlePuzzleComplete(data) {
        console.log('Puzzle completed:', data.puzzleId);
        
        // Mark puzzle as complete
        this.state.setFlag(`puzzle_${data.puzzleId}_complete`, true);
        
        // Award any items
        if (data.rewards) {
            for (const item of data.rewards) {
                this.state.addItem(item.id, item.quantity || 1);
            }
        }
        
        // Continue narrative
        if (this.narrative && data.nextScene) {
            this.narrative.continue(data.nextScene);
        }
    }

    /**
     * Handle save complete
     * @param {Object} data - Save data
     */
    handleSaveComplete(data) {
        this.events.emit(GameEvents.UI_NOTIFICATION, {
            type: 'success',
            message: 'Game saved!'
        });
    }

    /**
     * Handle load complete
     * @param {Object} data - Load data
     */
    handleLoadComplete(data) {
        this.events.emit(GameEvents.UI_NOTIFICATION, {
            type: 'success',
            message: 'Game loaded!'
        });
    }

    /**
     * Get current game state for saving
     * @returns {Object}
     */
    getGameState() {
        return {
            chapter: this.currentChapter,
            scene: this.scenes?.currentSceneId,
            state: this.state?.getAll(),
            timestamp: Date.now()
        };
    }

    /**
     * Return to main menu
     */
    returnToMainMenu() {
        this.stopGameLoop();
        this.isRunning = false;
        this.isPaused = false;
        
        // Hide game screen, show menu
        this.scenes?.transitionToScreen('main-menu-screen');
        
        if (this.audio) {
            this.audio.stopAll();
        }
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.stopGameLoop();
        this.events.removeAllListeners();
        
        if (this.state) this.state.destroy();
        if (this.saves) this.saves.destroy();
        if (this.scenes) this.scenes.destroy();
        
        this.isInitialized = false;
        this.isRunning = false;
    }
}

// Create singleton instance
export const gameManager = new GameManager();

export default GameManager;
