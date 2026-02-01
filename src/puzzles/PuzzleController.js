/**
 * PuzzleController - Base class for all puzzle types
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from '../utils/EventEmitter.js';

export class PuzzleController {
    constructor(config) {
        this.events = globalEvents;
        
        // Puzzle configuration
        this.id = config.id || `puzzle_${Date.now()}`;
        this.type = config.type || 'generic';
        this.title = config.title || 'Puzzle';
        this.description = config.description || '';
        this.difficulty = config.difficulty || 'normal';
        
        // Puzzle state
        this.isActive = false;
        this.isComplete = false;
        this.isFailed = false;
        this.attempts = 0;
        this.maxAttempts = config.maxAttempts || Infinity;
        this.timeLimit = config.timeLimit || 0; // 0 = no time limit
        this.timeRemaining = this.timeLimit;
        this.score = 0;
        
        // Hints
        this.hints = config.hints || [];
        this.hintsUsed = 0;
        this.maxHints = config.maxHints || this.hints.length;
        
        // Rewards
        this.rewards = config.rewards || [];
        
        // DOM elements
        this.container = null;
        this.contentElement = null;
        
        // Callbacks
        this.onComplete = config.onComplete || null;
        this.onFail = config.onFail || null;
        this.onProgress = config.onProgress || null;
        
        // Timer
        this.timerInterval = null;
    }

    /**
     * Initialize the puzzle
     */
    async init() {
        // Cache DOM elements
        this.container = document.getElementById('puzzle-layer');
        this.contentElement = document.getElementById('puzzle-content');
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log(`Puzzle initialized: ${this.id}`);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Hint button
        const hintBtn = document.getElementById('btn-hint');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.useHint());
        }

        // Reset button
        const resetBtn = document.getElementById('btn-puzzle-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }

        // Submit button
        const submitBtn = document.getElementById('btn-puzzle-submit');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submit());
        }
    }

    /**
     * Start the puzzle
     */
    async start() {
        this.isActive = true;
        this.isComplete = false;
        this.isFailed = false;
        this.attempts = 0;
        this.hintsUsed = 0;
        this.timeRemaining = this.timeLimit;

        // Update UI
        this.updateHeader();
        
        // Show puzzle layer
        this.container?.classList.remove('puzzle-hidden');

        // Start timer if applicable
        if (this.timeLimit > 0) {
            this.startTimer();
        }

        // Render puzzle content
        await this.render();

        // Emit start event
        this.events.emit(GameEvents.PUZZLE_START, {
            puzzleId: this.id,
            type: this.type,
            title: this.title
        });
    }

    /**
     * Update puzzle header UI
     */
    updateHeader() {
        const titleElement = document.getElementById('puzzle-title');
        const descElement = document.getElementById('puzzle-description');

        if (titleElement) {
            titleElement.textContent = this.title;
        }
        if (descElement) {
            descElement.textContent = this.description;
        }
    }

    /**
     * Render puzzle content (override in subclasses)
     */
    async render() {
        // Override in subclasses
        if (this.contentElement) {
            this.contentElement.innerHTML = '<p>Puzzle content goes here</p>';
        }
    }

    /**
     * Update puzzle state (called each frame when active)
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Override in subclasses for real-time puzzles
    }

    /**
     * Start the timer
     */
    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            this.timeRemaining -= 1000;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    /**
     * Stop the timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Update timer display
     */
    updateTimerDisplay() {
        // Override in subclasses with timer UI
    }

    /**
     * Handle time running out
     */
    timeUp() {
        this.stopTimer();
        this.fail('Time\'s up!');
    }

    /**
     * Submit the puzzle solution
     * @returns {boolean} Whether solution is correct
     */
    async submit() {
        this.attempts++;

        const solution = this.getSolution();
        const isCorrect = this.validateSolution(solution);

        if (isCorrect) {
            await this.complete();
            return true;
        } else {
            if (this.attempts >= this.maxAttempts) {
                await this.fail('Maximum attempts reached');
            } else {
                this.showFeedback(false, 'Incorrect solution. Try again!');
            }
            return false;
        }
    }

    /**
     * Get the current solution (override in subclasses)
     * @returns {*} Solution data
     */
    getSolution() {
        return null;
    }

    /**
     * Validate the solution (override in subclasses)
     * @param {*} solution - Solution to validate
     * @returns {boolean}
     */
    validateSolution(solution) {
        return false;
    }

    /**
     * Complete the puzzle successfully
     */
    async complete() {
        this.isActive = false;
        this.isComplete = true;
        this.stopTimer();

        // Calculate score
        this.calculateScore();

        // Show success feedback
        this.showFeedback(true, 'Puzzle Complete!');

        // Wait for feedback animation
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Hide puzzle
        this.hide();

        // Emit complete event
        this.events.emit(GameEvents.PUZZLE_COMPLETE, {
            puzzleId: this.id,
            score: this.score,
            attempts: this.attempts,
            hintsUsed: this.hintsUsed,
            timeRemaining: this.timeRemaining,
            rewards: this.rewards
        });

        // Call callback
        if (this.onComplete) {
            this.onComplete({
                score: this.score,
                rewards: this.rewards
            });
        }
    }

    /**
     * Fail the puzzle
     * @param {string} reason - Failure reason
     */
    async fail(reason = 'Puzzle failed') {
        this.isActive = false;
        this.isFailed = true;
        this.stopTimer();

        // Show failure feedback
        this.showFeedback(false, reason);

        // Wait for feedback animation
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Emit fail event
        this.events.emit(GameEvents.PUZZLE_FAIL, {
            puzzleId: this.id,
            reason,
            attempts: this.attempts
        });

        // Call callback
        if (this.onFail) {
            this.onFail({ reason });
        }
    }

    /**
     * Reset the puzzle
     */
    reset() {
        this.attempts = 0;
        this.timeRemaining = this.timeLimit;
        this.isComplete = false;
        this.isFailed = false;

        // Restart timer if applicable
        if (this.timeLimit > 0) {
            this.startTimer();
        }

        // Re-render
        this.render();

        this.events.emit(GameEvents.PUZZLE_RESET, {
            puzzleId: this.id
        });
    }

    /**
     * Use a hint
     * @returns {string|null} Hint text or null if no hints available
     */
    useHint() {
        if (this.hintsUsed >= this.maxHints || this.hintsUsed >= this.hints.length) {
            this.showNotification('No more hints available');
            return null;
        }

        const hint = this.hints[this.hintsUsed];
        this.hintsUsed++;

        // Apply hint penalty to score
        this.score = Math.max(0, this.score - 10);

        // Show hint
        this.showHintPanel(hint);

        this.events.emit(GameEvents.PUZZLE_HINT, {
            puzzleId: this.id,
            hintIndex: this.hintsUsed - 1,
            hint
        });

        return hint;
    }

    /**
     * Show hint panel
     * @param {string} hint - Hint text
     */
    showHintPanel(hint) {
        const hintPanel = document.createElement('div');
        hintPanel.className = 'hint-panel visible';
        hintPanel.innerHTML = `
            <p class="hint-text">${hint}</p>
            <p class="hint-cost">Hints remaining: ${this.maxHints - this.hintsUsed}</p>
        `;

        this.contentElement?.appendChild(hintPanel);

        // Auto-hide after delay
        setTimeout(() => {
            hintPanel.classList.remove('visible');
            setTimeout(() => hintPanel.remove(), 300);
        }, 5000);
    }

    /**
     * Show feedback overlay
     * @param {boolean} success - Whether success or failure
     * @param {string} message - Feedback message
     */
    showFeedback(success, message) {
        const feedback = document.createElement('div');
        feedback.className = `puzzle-feedback ${success ? 'success' : 'failure'}`;
        feedback.textContent = message;

        const container = document.getElementById('puzzle-container');
        container?.appendChild(feedback);

        // Remove after animation
        setTimeout(() => feedback.remove(), 1500);
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     */
    showNotification(message) {
        this.events.emit(GameEvents.UI_NOTIFICATION, {
            message,
            type: 'info'
        });
    }

    /**
     * Calculate score based on performance
     */
    calculateScore() {
        let baseScore = 100;

        // Deduct for attempts
        baseScore -= (this.attempts - 1) * 10;

        // Deduct for hints
        baseScore -= this.hintsUsed * 15;

        // Bonus for remaining time
        if (this.timeLimit > 0 && this.timeRemaining > 0) {
            baseScore += Math.floor((this.timeRemaining / this.timeLimit) * 20);
        }

        // Difficulty modifier
        const difficultyModifiers = {
            easy: 0.8,
            normal: 1,
            hard: 1.2,
            expert: 1.5
        };
        baseScore *= difficultyModifiers[this.difficulty] || 1;

        this.score = Math.max(0, Math.floor(baseScore));
    }

    /**
     * Hide the puzzle
     */
    hide() {
        this.container?.classList.add('puzzle-hidden');
        
        if (this.contentElement) {
            this.contentElement.innerHTML = '';
        }
    }

    /**
     * Report progress
     * @param {number} progress - Progress value (0-1)
     */
    reportProgress(progress) {
        this.events.emit(GameEvents.PUZZLE_UPDATE, {
            puzzleId: this.id,
            progress,
            attempts: this.attempts
        });

        if (this.onProgress) {
            this.onProgress({ progress });
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopTimer();
        this.hide();
        this.isActive = false;
    }
}

export default PuzzleController;
