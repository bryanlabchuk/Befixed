/**
 * RepairSequencePuzzle - Timed sequence matching puzzle
 * Befixed - Magic & Mechanical Repair Shop
 */

import { PuzzleController } from '../PuzzleController.js';

export class RepairSequencePuzzle extends PuzzleController {
    constructor(config) {
        super(config);
        
        this.type = 'repair-sequence';
        
        // Sequence configuration
        this.sequence = config.sequence || ['⚙️', '🔧', '⚡', '💧'];
        this.displayTime = config.displayTime || 1000; // Time to show each step
        this.inputTime = config.inputTime || 5000; // Time to input sequence
        
        // Actions/buttons
        this.actions = config.actions || [
            { id: 'gear', icon: '⚙️', label: 'Gear' },
            { id: 'wrench', icon: '🔧', label: 'Wrench' },
            { id: 'spark', icon: '⚡', label: 'Power' },
            { id: 'oil', icon: '💧', label: 'Oil' }
        ];
        
        // Current state
        this.phase = 'ready'; // ready, showing, input, checking
        this.currentStep = 0;
        this.playerInput = [];
        this.round = 1;
        this.maxRounds = config.maxRounds || 3;
        
        // Time limit for this puzzle type
        this.timeLimit = this.inputTime;
    }

    /**
     * Render the puzzle
     */
    async render() {
        if (!this.contentElement) return;

        this.contentElement.innerHTML = `
            <div class="repair-puzzle">
                <div class="timer-bar">
                    <div class="timer-fill" id="timer-fill"></div>
                </div>
                
                <div class="sequence-display" id="sequence-display"></div>
                
                <div class="round-indicator">
                    Round <span id="round-number">${this.round}</span> of ${this.maxRounds}
                </div>
                
                <div class="action-buttons" id="action-buttons"></div>
                
                <div class="instruction-text" id="instruction-text">
                    Watch the sequence carefully!
                </div>
            </div>
        `;

        this.renderSequenceDisplay();
        this.renderActionButtons();
    }

    /**
     * Render sequence display boxes
     */
    renderSequenceDisplay() {
        const container = document.getElementById('sequence-display');
        if (!container) return;

        container.innerHTML = '';

        for (let i = 0; i < this.sequence.length; i++) {
            const stepEl = document.createElement('div');
            stepEl.className = 'sequence-step';
            stepEl.dataset.index = i;
            container.appendChild(stepEl);
        }
    }

    /**
     * Render action buttons
     */
    renderActionButtons() {
        const container = document.getElementById('action-buttons');
        if (!container) return;

        container.innerHTML = '';

        for (const action of this.actions) {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.dataset.actionId = action.id;
            btn.disabled = true; // Disabled until input phase
            
            btn.innerHTML = `
                <span class="action-icon">${action.icon}</span>
                <span class="action-label">${action.label}</span>
            `;

            btn.addEventListener('click', () => this.handleInput(action.icon));
            container.appendChild(btn);
        }
    }

    /**
     * Start the puzzle sequence
     */
    async start() {
        await super.start();
        
        // Begin showing sequence after a short delay
        setTimeout(() => this.showSequence(), 1000);
    }

    /**
     * Show the sequence to memorize
     */
    async showSequence() {
        this.phase = 'showing';
        this.updateInstruction('Watch carefully...');
        this.disableButtons(true);

        const steps = document.querySelectorAll('.sequence-step');

        // Show each step
        for (let i = 0; i < this.sequence.length; i++) {
            // Highlight step
            steps[i].classList.add('active');
            steps[i].textContent = this.sequence[i];
            
            this.playSound('sequence_show');
            
            // Wait
            await this.wait(this.displayTime);
            
            // Remove highlight
            steps[i].classList.remove('active');
            steps[i].textContent = '';
            
            await this.wait(200);
        }

        // Start input phase
        this.startInputPhase();
    }

    /**
     * Start the input phase
     */
    startInputPhase() {
        this.phase = 'input';
        this.playerInput = [];
        this.currentStep = 0;
        this.timeRemaining = this.inputTime;
        
        this.updateInstruction('Enter the sequence!');
        this.disableButtons(false);
        
        // Start timer
        this.startInputTimer();
    }

    /**
     * Start the input timer
     */
    startInputTimer() {
        const timerFill = document.getElementById('timer-fill');
        const startTime = performance.now();

        const updateTimer = () => {
            if (this.phase !== 'input') return;

            const elapsed = performance.now() - startTime;
            const remaining = Math.max(0, this.inputTime - elapsed);
            const percent = (remaining / this.inputTime) * 100;

            if (timerFill) {
                timerFill.style.width = `${percent}%`;
                
                if (percent < 30) {
                    timerFill.classList.add('warning');
                }
            }

            if (remaining <= 0) {
                this.handleTimeUp();
            } else {
                requestAnimationFrame(updateTimer);
            }
        };

        requestAnimationFrame(updateTimer);
    }

    /**
     * Handle player input
     */
    handleInput(icon) {
        if (this.phase !== 'input') return;

        this.playerInput.push(icon);
        const stepIndex = this.playerInput.length - 1;

        // Show input in display
        const steps = document.querySelectorAll('.sequence-step');
        if (steps[stepIndex]) {
            steps[stepIndex].textContent = icon;
            
            // Check if correct
            const isCorrect = this.sequence[stepIndex] === icon;
            steps[stepIndex].classList.add(isCorrect ? 'completed' : 'failed');
            
            this.playSound(isCorrect ? 'input_correct' : 'input_wrong');

            if (!isCorrect) {
                // Wrong input - fail
                this.handleWrongInput();
                return;
            }
        }

        // Check if sequence complete
        if (this.playerInput.length === this.sequence.length) {
            this.handleSequenceComplete();
        }
    }

    /**
     * Handle wrong input
     */
    async handleWrongInput() {
        this.phase = 'checking';
        this.disableButtons(true);
        this.updateInstruction('Wrong! Watch again...');
        
        await this.wait(1500);
        
        // Reset and show sequence again
        this.resetSequenceDisplay();
        this.showSequence();
    }

    /**
     * Handle time running out
     */
    async handleTimeUp() {
        if (this.phase !== 'input') return;
        
        this.phase = 'checking';
        this.disableButtons(true);
        this.updateInstruction('Time\'s up! Watch again...');
        
        await this.wait(1500);
        
        this.resetSequenceDisplay();
        this.showSequence();
    }

    /**
     * Handle successful sequence completion
     */
    async handleSequenceComplete() {
        this.phase = 'checking';
        this.disableButtons(true);
        
        if (this.round < this.maxRounds) {
            // Next round
            this.round++;
            this.updateInstruction(`Round ${this.round}!`);
            
            // Make sequence harder
            this.extendSequence();
            
            await this.wait(1500);
            
            this.resetSequenceDisplay();
            this.render();
            
            await this.wait(500);
            this.showSequence();
        } else {
            // Puzzle complete!
            await this.complete();
        }
    }

    /**
     * Extend sequence for next round
     */
    extendSequence() {
        // Add a random action to the sequence
        const randomAction = this.actions[Math.floor(Math.random() * this.actions.length)];
        this.sequence.push(randomAction.icon);
    }

    /**
     * Reset sequence display
     */
    resetSequenceDisplay() {
        const steps = document.querySelectorAll('.sequence-step');
        steps.forEach(step => {
            step.textContent = '';
            step.classList.remove('active', 'completed', 'failed');
        });
        
        const timerFill = document.getElementById('timer-fill');
        if (timerFill) {
            timerFill.style.width = '100%';
            timerFill.classList.remove('warning');
        }
    }

    /**
     * Update instruction text
     */
    updateInstruction(text) {
        const el = document.getElementById('instruction-text');
        if (el) el.textContent = text;
    }

    /**
     * Enable/disable action buttons
     */
    disableButtons(disabled) {
        const buttons = document.querySelectorAll('.action-btn');
        buttons.forEach(btn => btn.disabled = disabled);
    }

    /**
     * Play sound effect
     */
    playSound(sound) {
        this.events.emit('sfx:play', { sound, volume: 0.5 });
    }

    /**
     * Wait helper
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get solution
     */
    getSolution() {
        return [...this.playerInput];
    }

    /**
     * Validate solution
     */
    validateSolution(solution) {
        if (solution.length !== this.sequence.length) return false;
        return solution.every((icon, i) => icon === this.sequence[i]);
    }

    /**
     * Reset puzzle
     */
    reset() {
        this.phase = 'ready';
        this.currentStep = 0;
        this.playerInput = [];
        this.round = 1;
        
        // Reset sequence to original length
        this.sequence = this.sequence.slice(0, 4);
        
        super.reset();
    }
}

export default RepairSequencePuzzle;
