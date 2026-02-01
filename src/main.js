/**
 * Main Entry Point
 * Befixed - Magic & Mechanical Repair Shop
 * A narrative puzzle game set in a high fantasy world
 */

// Core Systems
import { gameManager } from './core/GameManager.js';
import { globalEvents, GameEvents } from './utils/EventEmitter.js';
import { assetLoader } from './utils/AssetLoader.js';

// Managers
import { AudioManager } from './audio/AudioManager.js';
import { UIManager } from './visuals/UIManager.js';
import { ParticleSystem } from './visuals/ParticleSystem.js';
import { InputHandler } from './input/InputHandler.js';
import { DialogueRenderer } from './narrative/DialogueRenderer.js';
import { NarrativeParser } from './narrative/NarrativeParser.js';
import { ChoiceManager } from './narrative/ChoiceManager.js';
import { CharacterManager } from './narrative/CharacterManager.js';
import { PuzzleFactory } from './puzzles/PuzzleFactory.js';

/**
 * Main Game Application
 */
class BefixedGame {
    constructor() {
        this.isReady = false;
        
        // Sub-systems
        this.audio = null;
        this.ui = null;
        this.particles = null;
        this.input = null;
        this.dialogue = null;
        this.narrative = null;
        this.choices = null;
        this.characters = null;
        this.puzzles = null;
    }

    /**
     * Initialize the game
     */
    async init() {
        console.log('🔧 Befixed - Magic & Mechanical Repair Shop');
        console.log('Initializing game...');

        try {
            // Initialize core game manager first
            await gameManager.init();

            // Initialize sub-systems
            await this.initSubSystems();

            // Connect sub-systems to game manager
            this.connectSystems();

            // Set up global event listeners
            this.setupGlobalListeners();

            // Initialize UI (after everything else is ready)
            await this.ui.init();

            // Show main menu
            await this.showMainMenu();

            this.isReady = true;
            console.log('✨ Game ready!');

        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError(error);
        }
    }

    /**
     * Initialize all sub-systems
     */
    async initSubSystems() {
        // Audio system
        this.audio = new AudioManager();
        await this.audio.init();

        // Input system
        this.input = new InputHandler();
        this.input.init();

        // Particle system
        this.particles = new ParticleSystem();
        this.particles.init('effects-canvas');
        this.particles.init('menu-particles');

        // Narrative systems
        this.dialogue = new DialogueRenderer();
        this.dialogue.init();

        this.narrative = new NarrativeParser(gameManager.state);
        
        this.choices = new ChoiceManager(gameManager.state);
        this.choices.init();

        this.characters = new CharacterManager(gameManager.state);
        await this.characters.init();

        // Puzzle system
        this.puzzles = new PuzzleFactory(gameManager.state);
        await this.puzzles.init();

        // UI Manager (initialized last, needs game manager)
        this.ui = new UIManager(gameManager);
    }

    /**
     * Connect sub-systems to the game manager
     */
    connectSystems() {
        gameManager.audio = this.audio;
        gameManager.ui = this.ui;
        gameManager.input = this.input;
        gameManager.narrative = {
            dialogue: this.dialogue,
            parser: this.narrative,
            choices: this.choices,
            characters: this.characters,
            
            // Convenience method for starting dialogue
            startDialogue: async (dialogueData) => {
                if (Array.isArray(dialogueData)) {
                    await this.runDialogueSequence(dialogueData);
                } else {
                    await this.dialogue.show(dialogueData);
                }
            },
            
            // Continue narrative
            continue: (nextScene) => {
                if (nextScene) {
                    gameManager.scenes.goToScene(nextScene);
                } else {
                    gameManager.scenes.nextScene();
                }
            }
        };
        gameManager.puzzles = this.puzzles;
    }

    /**
     * Run a dialogue sequence
     * @param {Array} sequence - Array of dialogue items
     */
    async runDialogueSequence(sequence) {
        for (const item of sequence) {
            // Check conditions
            if (item.condition && !gameManager.state.evaluateCondition(item.condition)) {
                continue;
            }

            switch (item.type) {
                case 'dialogue':
                    await this.dialogue.show(item);
                    await this.waitForAdvance();
                    break;

                case 'narration':
                    await this.showNarration(item.text);
                    await this.waitForAdvance();
                    break;

                case 'choice':
                    const result = await this.choices.show(item);
                    if (result.next) {
                        return result.next; // Return jump target
                    }
                    break;

                case 'character':
                    await this.handleCharacterAction(item);
                    break;

                case 'wait':
                    await new Promise(r => setTimeout(r, item.duration || 1000));
                    break;

                case 'puzzle':
                    await this.puzzles.startPuzzle(item.puzzleId);
                    break;
            }
        }
        
        return null;
    }

    /**
     * Wait for player to advance dialogue
     */
    waitForAdvance() {
        return new Promise(resolve => {
            const unsubscribe = globalEvents.once(GameEvents.DIALOGUE_SKIP, resolve);
        });
    }

    /**
     * Show narration text
     * @param {string} text - Narration text
     */
    async showNarration(text) {
        const container = document.getElementById('narration-container');
        const textEl = document.getElementById('narration-text');
        
        if (container && textEl) {
            textEl.textContent = text;
            container.classList.remove('narration-hidden');
        }
    }

    /**
     * Hide narration
     */
    hideNarration() {
        const container = document.getElementById('narration-container');
        container?.classList.add('narration-hidden');
    }

    /**
     * Handle character actions
     * @param {Object} action - Character action data
     */
    async handleCharacterAction(action) {
        switch (action.action) {
            case 'enter':
                await this.characters.show({
                    character: action.character,
                    position: action.position,
                    expression: action.expression || 'neutral',
                    animation: action.animation || 'fade'
                });
                break;

            case 'exit':
                await this.characters.hide({
                    character: action.character,
                    animation: action.animation || 'fade'
                });
                break;

            case 'expression':
                await this.characters.setExpression({
                    character: action.character,
                    expression: action.expression
                });
                break;

            case 'move':
                await this.characters.move({
                    character: action.character,
                    from: action.from,
                    to: action.to
                });
                break;
        }
    }

    /**
     * Set up global event listeners
     */
    setupGlobalListeners() {
        // Handle dialogue completion
        globalEvents.on(GameEvents.DIALOGUE_SKIP, () => {
            this.hideNarration();
        });

        // Handle puzzle completion
        globalEvents.on(GameEvents.PUZZLE_COMPLETE, (data) => {
            // Celebration effect
            this.particles.celebrate(
                window.innerWidth / 2,
                window.innerHeight / 2
            );
        });

        // Handle chapter start
        globalEvents.on(GameEvents.CHAPTER_START, async (data) => {
            // Show chapter card
            await gameManager.scenes.showChapterCard(
                data.chapter,
                data.data.title,
                data.data.description
            );
        });

        // Update particles in animation loop
        this.startRenderLoop();
    }

    /**
     * Start the render loop for visual effects
     */
    startRenderLoop() {
        let lastTime = performance.now();

        const loop = (currentTime) => {
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            // Update particles
            this.particles.update(deltaTime);
            this.particles.render();

            // Update input
            this.input.update();

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    /**
     * Show the main menu
     */
    async showMainMenu() {
        // Transition from loading to menu
        await gameManager.scenes.transitionToScreen('main-menu-screen');

        // Start menu ambient effects
        this.startMenuEffects();
    }

    /**
     * Start menu ambient effects
     */
    startMenuEffects() {
        // Create dust particle emitter for menu
        const canvas = document.getElementById('menu-particles');
        if (canvas) {
            // Add floating dust motes
            setInterval(() => {
                if (document.getElementById('main-menu-screen')?.classList.contains('active')) {
                    this.particles.emit(
                        Math.random() * window.innerWidth,
                        Math.random() * window.innerHeight,
                        'dust'
                    );
                }
            }, 500);
        }
    }

    /**
     * Show error message
     * @param {Error} error
     */
    showError(error) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = `Error: ${error.message}`;
            loadingText.style.color = '#ff4444';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new BefixedGame();
    game.init();
    
    // Expose to window for debugging
    window.befixed = {
        game,
        gameManager,
        events: globalEvents,
        assets: assetLoader
    };
});
