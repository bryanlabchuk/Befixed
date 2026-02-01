/**
 * PuzzleFactory - Creates puzzle instances based on type
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from '../utils/EventEmitter.js';
import { PuzzleController } from './PuzzleController.js';
import { MechanicalPuzzle } from './types/MechanicalPuzzle.js';
import { SpellCraftingPuzzle } from './types/SpellCraftingPuzzle.js';
import { DiagnosisPuzzle } from './types/DiagnosisPuzzle.js';
import { RepairSequencePuzzle } from './types/RepairSequencePuzzle.js';
import { ResonancePuzzle } from './types/ResonancePuzzle.js';

export class PuzzleFactory {
    constructor(stateManager) {
        this.events = globalEvents;
        this.state = stateManager;
        
        // Registered puzzle types
        this.puzzleTypes = new Map();
        
        // Active puzzle
        this.currentPuzzle = null;
        
        // Puzzle configurations
        this.puzzleConfigs = new Map();
        
        // Register default puzzle types
        this.registerDefaultTypes();
    }

    /**
     * Initialize the factory
     */
    async init() {
        // Load puzzle configurations
        await this.loadPuzzleConfigs();
        
        console.log('PuzzleFactory initialized');
    }

    /**
     * Register default puzzle types
     */
    registerDefaultTypes() {
        this.registerType('mechanical', MechanicalPuzzle);
        this.registerType('spell-crafting', SpellCraftingPuzzle);
        this.registerType('diagnosis', DiagnosisPuzzle);
        this.registerType('repair-sequence', RepairSequencePuzzle);
        this.registerType('resonance', ResonancePuzzle);
        this.registerType('generic', PuzzleController);
    }

    /**
     * Register a puzzle type
     * @param {string} type - Type identifier
     * @param {class} PuzzleClass - Puzzle class
     */
    registerType(type, PuzzleClass) {
        this.puzzleTypes.set(type, PuzzleClass);
    }

    /**
     * Load puzzle configurations
     */
    async loadPuzzleConfigs() {
        try {
            const response = await fetch('data/puzzles/puzzle-configs.json');
            if (response.ok) {
                const data = await response.json();
                if (data.puzzles) {
                    for (const puzzle of data.puzzles) {
                        this.puzzleConfigs.set(puzzle.id, puzzle);
                    }
                }
            }
        } catch (error) {
            console.warn('Could not load puzzle configs:', error);
        }
    }

    /**
     * Create a puzzle instance
     * @param {string} type - Puzzle type
     * @param {Object} config - Puzzle configuration
     * @returns {PuzzleController}
     */
    create(type, config) {
        const PuzzleClass = this.puzzleTypes.get(type);
        
        if (!PuzzleClass) {
            console.warn(`Unknown puzzle type: ${type}, using generic`);
            return new PuzzleController(config);
        }

        return new PuzzleClass(config);
    }

    /**
     * Create a puzzle from ID
     * @param {string} puzzleId - Puzzle ID
     * @returns {PuzzleController|null}
     */
    createById(puzzleId) {
        const config = this.puzzleConfigs.get(puzzleId);
        
        if (!config) {
            console.error(`Puzzle not found: ${puzzleId}`);
            return null;
        }

        return this.create(config.type, config);
    }

    /**
     * Start a puzzle
     * @param {string|Object} puzzle - Puzzle ID or configuration
     * @returns {Promise<PuzzleController>}
     */
    async startPuzzle(puzzle) {
        // Stop current puzzle if active
        if (this.currentPuzzle?.isActive) {
            this.currentPuzzle.destroy();
        }

        // Create puzzle instance
        if (typeof puzzle === 'string') {
            this.currentPuzzle = this.createById(puzzle);
        } else if (puzzle.type) {
            this.currentPuzzle = this.create(puzzle.type, puzzle);
        } else {
            console.error('Invalid puzzle configuration');
            return null;
        }

        if (!this.currentPuzzle) {
            return null;
        }

        // Set up completion handler
        this.currentPuzzle.onComplete = (result) => {
            this.handlePuzzleComplete(result);
        };

        this.currentPuzzle.onFail = (result) => {
            this.handlePuzzleFail(result);
        };

        // Initialize and start
        await this.currentPuzzle.init();
        await this.currentPuzzle.start();

        return this.currentPuzzle;
    }

    /**
     * Handle puzzle completion
     * @param {Object} result - Completion result
     */
    handlePuzzleComplete(result) {
        // Mark puzzle as complete in state
        if (this.currentPuzzle) {
            this.state.setFlag(`puzzle_${this.currentPuzzle.id}_complete`, true);
            this.state.setVariable(`puzzle_${this.currentPuzzle.id}_score`, result.score);
        }

        // Award rewards
        if (result.rewards) {
            for (const reward of result.rewards) {
                if (reward.type === 'item') {
                    this.state.addItem(reward.id, reward.quantity || 1);
                } else if (reward.type === 'flag') {
                    this.state.setFlag(reward.id, true);
                } else if (reward.type === 'variable') {
                    this.state.setVariable(reward.name, reward.value);
                }
            }
        }
    }

    /**
     * Handle puzzle failure
     * @param {Object} result - Failure result
     */
    handlePuzzleFail(result) {
        // Track failure in state
        if (this.currentPuzzle) {
            const failures = this.state.getVariable(`puzzle_${this.currentPuzzle.id}_failures`, 0);
            this.state.setVariable(`puzzle_${this.currentPuzzle.id}_failures`, failures + 1);
        }
    }

    /**
     * Get current puzzle
     * @returns {PuzzleController|null}
     */
    getCurrentPuzzle() {
        return this.currentPuzzle;
    }

    /**
     * Check if a puzzle is active
     * @returns {boolean}
     */
    isActive() {
        return this.currentPuzzle?.isActive || false;
    }

    /**
     * Update (called each frame)
     * @param {number} deltaTime
     */
    update(deltaTime) {
        if (this.currentPuzzle?.isActive) {
            this.currentPuzzle.update(deltaTime);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.currentPuzzle) {
            this.currentPuzzle.destroy();
            this.currentPuzzle = null;
        }
        this.puzzleConfigs.clear();
    }
}

export default PuzzleFactory;
