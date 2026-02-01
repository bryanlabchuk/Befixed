/**
 * SceneManager - Handles scene transitions and screen management
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from '../utils/EventEmitter.js';
import { wait } from '../utils/helpers.js';

export class SceneManager {
    constructor(gameManager) {
        this.game = gameManager;
        this.events = globalEvents;
        
        // Current state
        this.currentScreenId = 'loading-screen';
        this.currentSceneId = null;
        this.currentChapterData = null;
        
        // Scene data
        this.scenes = new Map();
        this.sceneIndex = 0;
        
        // Transition state
        this.isTransitioning = false;
        this.transitionDuration = 500;
        
        // Screen elements cache
        this.screens = new Map();
    }

    /**
     * Initialize the scene manager
     */
    async init() {
        // Cache screen elements
        const screenElements = document.querySelectorAll('.screen');
        screenElements.forEach(screen => {
            this.screens.set(screen.id, screen);
        });

        console.log('SceneManager initialized');
    }

    /**
     * Load a scene
     * @param {string} sceneId - Scene ID
     * @param {Object} chapterData - Chapter data
     */
    async loadScene(sceneId, chapterData = null) {
        if (this.isTransitioning) {
            console.warn('Scene transition in progress');
            return;
        }

        console.log(`Loading scene: ${sceneId}`);
        
        this.isTransitioning = true;
        this.events.emit(GameEvents.SCENE_TRANSITION_START, { 
            from: this.currentSceneId, 
            to: sceneId 
        });

        // Store chapter data if provided
        if (chapterData) {
            this.currentChapterData = chapterData;
            this.loadChapterScenes(chapterData);
        }

        // Get scene data
        const sceneData = this.scenes.get(sceneId);
        
        // Transition to game screen if not already there
        if (this.currentScreenId !== 'game-screen') {
            await this.transitionToScreen('game-screen');
        }

        // Apply scene changes
        if (sceneData) {
            await this.applyScene(sceneData);
        }

        this.currentSceneId = sceneId;
        this.game.state.set('currentScene', sceneId);
        
        this.isTransitioning = false;
        this.events.emit(GameEvents.SCENE_LOADED, { sceneId, sceneData });
        this.events.emit(GameEvents.SCENE_CHANGE, { sceneId });
    }

    /**
     * Load scenes from chapter data
     * @param {Object} chapterData - Chapter data
     */
    loadChapterScenes(chapterData) {
        this.scenes.clear();
        this.sceneIndex = 0;

        if (chapterData.scenes) {
            chapterData.scenes.forEach((scene, index) => {
                this.scenes.set(scene.id, {
                    ...scene,
                    index
                });
            });
        }
    }

    /**
     * Apply scene data to the game
     * @param {Object} sceneData - Scene data
     */
    async applyScene(sceneData) {
        // Set background
        if (sceneData.background) {
            this.setBackground(sceneData.background);
        }

        // Play music
        if (sceneData.music && this.game.audio) {
            this.game.audio.playMusic(sceneData.music);
        }

        // Play ambience
        if (sceneData.ambience && this.game.audio) {
            this.game.audio.playAmbience(sceneData.ambience);
        }

        // Set characters
        if (sceneData.characters) {
            await this.setCharacters(sceneData.characters);
        }

        // Start dialogue if present
        if (sceneData.dialogue && this.game.narrative) {
            await this.game.narrative.startDialogue(sceneData.dialogue);
        }

        // Start puzzle if present
        if (sceneData.puzzle && this.game.puzzles) {
            await this.game.puzzles.startPuzzle(sceneData.puzzle);
        }
    }

    /**
     * Set the background
     * @param {string|Object} background - Background data
     */
    setBackground(background) {
        const bgElement = document.getElementById('background-image');
        if (!bgElement) return;

        if (typeof background === 'string') {
            bgElement.style.backgroundImage = `url(${background})`;
        } else if (background.image) {
            bgElement.style.backgroundImage = `url(${background.image})`;
            if (background.position) {
                bgElement.style.backgroundPosition = background.position;
            }
        }
    }

    /**
     * Set characters in the scene
     * @param {Array} characters - Character configurations
     */
    async setCharacters(characters) {
        const positions = ['left', 'center', 'right'];
        
        // Clear existing characters
        positions.forEach(pos => {
            const slot = document.getElementById(`character-${pos}`);
            if (slot) slot.innerHTML = '';
        });

        // Add new characters
        for (const char of characters) {
            this.events.emit(GameEvents.CHARACTER_ENTER, char);
            
            const slot = document.getElementById(`character-${char.position || 'center'}`);
            if (slot && char.sprite) {
                const img = document.createElement('img');
                img.src = char.sprite;
                img.alt = char.name || 'Character';
                img.className = `character-enter-${char.position || 'center'}`;
                slot.appendChild(img);
            }
        }
    }

    /**
     * Transition to a screen
     * @param {string} screenId - Screen ID
     * @param {string} [transition='fade'] - Transition type
     */
    async transitionToScreen(screenId, transition = 'fade') {
        const currentScreen = this.screens.get(this.currentScreenId);
        const targetScreen = this.screens.get(screenId);

        if (!targetScreen) {
            console.error(`Screen not found: ${screenId}`);
            return;
        }

        // Perform transition
        switch (transition) {
            case 'fade':
                await this.fadeTransition(currentScreen, targetScreen);
                break;
            case 'crossfade':
                await this.crossfadeTransition(currentScreen, targetScreen);
                break;
            case 'instant':
                if (currentScreen) currentScreen.classList.remove('active');
                targetScreen.classList.add('active');
                break;
            default:
                await this.fadeTransition(currentScreen, targetScreen);
        }

        this.currentScreenId = screenId;
    }

    /**
     * Fade transition between screens
     * @param {Element} from - Source screen
     * @param {Element} to - Target screen
     */
    async fadeTransition(from, to) {
        // Fade out current
        if (from) {
            from.style.opacity = '0';
            await wait(this.transitionDuration / 2);
            from.classList.remove('active');
            from.style.opacity = '';
        }

        // Fade in target
        to.style.opacity = '0';
        to.classList.add('active');
        await wait(50);
        to.style.opacity = '1';
        await wait(this.transitionDuration / 2);
    }

    /**
     * Crossfade transition between screens
     * @param {Element} from - Source screen
     * @param {Element} to - Target screen
     */
    async crossfadeTransition(from, to) {
        to.style.opacity = '0';
        to.classList.add('active');

        // Crossfade
        const steps = 20;
        const stepDuration = this.transitionDuration / steps;

        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            if (from) from.style.opacity = String(1 - progress);
            to.style.opacity = String(progress);
            await wait(stepDuration);
        }

        if (from) {
            from.classList.remove('active');
            from.style.opacity = '';
        }
        to.style.opacity = '';
    }

    /**
     * Show chapter title card
     * @param {number} chapterNum - Chapter number
     * @param {string} title - Chapter title
     * @param {string} [subtitle] - Optional subtitle
     */
    async showChapterCard(chapterNum, title, subtitle = '') {
        // Create chapter card element
        const card = document.createElement('div');
        card.className = 'chapter-card';
        card.innerHTML = `
            <div class="card-number">Chapter ${chapterNum}</div>
            <div class="card-title">${title}</div>
            ${subtitle ? `<div class="card-subtitle">${subtitle}</div>` : ''}
        `;

        document.body.appendChild(card);

        // Animate in
        await wait(100);
        card.classList.add('visible');
        await wait(100);
        card.classList.add('animate');

        // Wait for display time
        await wait(3000);

        // Fade out
        card.classList.remove('animate');
        card.style.opacity = '0';
        await wait(500);
        card.remove();
    }

    /**
     * Go to next scene
     */
    async nextScene() {
        if (!this.currentChapterData || !this.currentChapterData.scenes) {
            return false;
        }

        const currentIndex = this.sceneIndex;
        const nextIndex = currentIndex + 1;

        if (nextIndex >= this.currentChapterData.scenes.length) {
            // Chapter complete
            this.events.emit(GameEvents.CHAPTER_END, {
                chapter: this.game.currentChapter
            });
            return false;
        }

        const nextScene = this.currentChapterData.scenes[nextIndex];
        this.sceneIndex = nextIndex;
        await this.loadScene(nextScene.id);
        return true;
    }

    /**
     * Go to a specific scene
     * @param {string} sceneId - Scene ID
     */
    async goToScene(sceneId) {
        const scene = this.scenes.get(sceneId);
        if (!scene) {
            console.warn(`Scene not found: ${sceneId}`);
            return false;
        }

        this.sceneIndex = scene.index;
        await this.loadScene(sceneId);
        return true;
    }

    /**
     * Apply screen shake effect
     * @param {number} [intensity=1] - Shake intensity
     * @param {number} [duration=300] - Duration in ms
     */
    async screenShake(intensity = 1, duration = 300) {
        const settings = this.game.saves?.loadSettings();
        if (settings?.reduceMotion || settings?.screenEffects === false) {
            return;
        }

        const gameScreen = document.getElementById('game-screen');
        if (!gameScreen) return;

        gameScreen.classList.add('screen-shake');
        gameScreen.style.setProperty('--shake-intensity', intensity);
        
        await wait(duration);
        
        gameScreen.classList.remove('screen-shake');
    }

    /**
     * Flash the screen
     * @param {string} [color='white'] - Flash color
     * @param {number} [duration=200] - Duration in ms
     */
    async screenFlash(color = 'white', duration = 200) {
        const settings = this.game.saves?.loadSettings();
        if (settings?.reduceMotion || settings?.screenEffects === false) {
            return;
        }

        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: ${color};
            z-index: 1000;
            pointer-events: none;
            opacity: 0.8;
        `;

        document.body.appendChild(flash);
        await wait(duration / 2);
        flash.style.opacity = '0';
        flash.style.transition = `opacity ${duration / 2}ms ease-out`;
        await wait(duration / 2);
        flash.remove();
    }

    /**
     * Update (called each frame)
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Scene-specific updates can be added here
    }

    /**
     * Cleanup
     */
    destroy() {
        this.scenes.clear();
        this.screens.clear();
    }
}

export default SceneManager;
