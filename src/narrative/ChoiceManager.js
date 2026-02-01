/**
 * ChoiceManager - Handles branching dialogue and player choices
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from '../utils/EventEmitter.js';
import { wait, createElement } from '../utils/helpers.js';

export class ChoiceManager {
    constructor(stateManager) {
        this.events = globalEvents;
        this.state = stateManager;
        
        // DOM elements
        this.container = null;
        this.promptElement = null;
        this.optionsElement = null;
        
        // State
        this.currentChoices = null;
        this.isShowing = false;
        this.selectedIndex = 0;
        
        // Choice history
        this.history = [];
        
        // Callbacks
        this.onChoiceMade = null;
    }

    /**
     * Initialize the choice manager
     */
    init() {
        // Cache DOM elements
        this.container = document.getElementById('choice-container');
        this.promptElement = document.getElementById('choice-prompt');
        this.optionsElement = document.getElementById('choice-options');
        
        // Set up keyboard navigation
        this.setupKeyboardNavigation();
        
        console.log('ChoiceManager initialized');
    }

    /**
     * Set up keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!this.isShowing) return;

            switch (e.code) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateUp();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateDown();
                    break;
                case 'Enter':
                case 'Space':
                    e.preventDefault();
                    this.selectCurrent();
                    break;
                case 'Digit1':
                case 'Digit2':
                case 'Digit3':
                case 'Digit4':
                case 'Digit5':
                case 'Digit6':
                case 'Digit7':
                case 'Digit8':
                case 'Digit9':
                    const index = parseInt(e.code.slice(-1)) - 1;
                    if (index < this.currentChoices?.options.length) {
                        this.selectChoice(index);
                    }
                    break;
            }
        });
    }

    /**
     * Show choices
     * @param {Object} choiceData - Choice data
     * @returns {Promise<Object>} Selected choice
     */
    async show(choiceData) {
        return new Promise((resolve) => {
            this.currentChoices = choiceData;
            this.selectedIndex = 0;
            this.onChoiceMade = resolve;

            // Set prompt
            if (this.promptElement) {
                this.promptElement.textContent = choiceData.prompt || '';
                this.promptElement.style.display = choiceData.prompt ? 'block' : 'none';
            }

            // Clear existing options
            if (this.optionsElement) {
                this.optionsElement.innerHTML = '';

                // Create option buttons
                choiceData.options.forEach((option, index) => {
                    const button = this.createOptionButton(option, index);
                    this.optionsElement.appendChild(button);
                });
            }

            // Show container with animation
            this.container?.classList.remove('choice-hidden');
            this.isShowing = true;

            // Update selection highlight
            this.updateSelectionHighlight();

            // Emit event
            this.events.emit(GameEvents.CHOICE_SHOW, choiceData);
        });
    }

    /**
     * Create an option button
     * @param {Object} option - Option data
     * @param {number} index - Option index
     * @returns {HTMLElement}
     */
    createOptionButton(option, index) {
        const button = createElement('button', {
            className: `choice-option ${option.available === false ? 'locked' : ''}`,
            dataset: { index: String(index) },
            onClick: () => {
                if (option.available !== false) {
                    this.selectChoice(index);
                }
            }
        });

        // Add option text
        const text = document.createElement('span');
        text.className = 'choice-text';
        text.textContent = option.text;
        button.appendChild(text);

        // Add requirement text if locked
        if (option.available === false && option.requirement) {
            const req = document.createElement('div');
            req.className = 'choice-requirement';
            req.textContent = option.requirement;
            button.appendChild(req);
        }

        // Add hint if present
        if (option.hint) {
            const hint = document.createElement('div');
            hint.className = 'choice-hint';
            hint.textContent = option.hint;
            button.appendChild(hint);
        }

        // Hover handlers
        button.addEventListener('mouseenter', () => {
            if (option.available !== false) {
                this.selectedIndex = index;
                this.updateSelectionHighlight();
            }
        });

        return button;
    }

    /**
     * Navigate up in choices
     */
    navigateUp() {
        const availableChoices = this.getAvailableIndices();
        const currentPos = availableChoices.indexOf(this.selectedIndex);
        
        if (currentPos > 0) {
            this.selectedIndex = availableChoices[currentPos - 1];
            this.updateSelectionHighlight();
            this.playNavigateSound();
        }
    }

    /**
     * Navigate down in choices
     */
    navigateDown() {
        const availableChoices = this.getAvailableIndices();
        const currentPos = availableChoices.indexOf(this.selectedIndex);
        
        if (currentPos < availableChoices.length - 1) {
            this.selectedIndex = availableChoices[currentPos + 1];
            this.updateSelectionHighlight();
            this.playNavigateSound();
        }
    }

    /**
     * Get indices of available (unlocked) choices
     * @returns {number[]}
     */
    getAvailableIndices() {
        if (!this.currentChoices) return [];
        return this.currentChoices.options
            .map((opt, idx) => ({ opt, idx }))
            .filter(({ opt }) => opt.available !== false)
            .map(({ idx }) => idx);
    }

    /**
     * Update selection highlight
     */
    updateSelectionHighlight() {
        const options = this.optionsElement?.querySelectorAll('.choice-option');
        options?.forEach((opt, index) => {
            if (index === this.selectedIndex) {
                opt.classList.add('selected');
                opt.focus();
            } else {
                opt.classList.remove('selected');
            }
        });
    }

    /**
     * Select current highlighted choice
     */
    selectCurrent() {
        this.selectChoice(this.selectedIndex);
    }

    /**
     * Select a choice by index
     * @param {number} index - Choice index
     */
    async selectChoice(index) {
        if (!this.currentChoices || index >= this.currentChoices.options.length) {
            return;
        }

        const option = this.currentChoices.options[index];
        
        // Check if available
        if (option.available === false) {
            this.playLockedSound();
            return;
        }

        this.playSelectSound();

        // Add to history
        this.history.push({
            choiceId: this.currentChoices.id,
            selectedIndex: index,
            selectedOption: option,
            timestamp: Date.now()
        });

        // Apply effects
        if (option.effects) {
            this.applyEffects(option.effects);
        }

        // Set flags
        if (option.setFlag) {
            this.state.setFlag(option.setFlag, true);
        }

        // Set variables
        if (option.setVariable) {
            this.state.setVariable(option.setVariable.name, option.setVariable.value);
        }

        // Hide with animation
        await this.hide();

        // Emit event
        this.events.emit(GameEvents.CHOICE_MADE, {
            choice: this.currentChoices,
            selectedIndex: index,
            selectedOption: option
        });

        // Resolve promise
        if (this.onChoiceMade) {
            this.onChoiceMade({
                index,
                option,
                next: option.next || option.goto
            });
        }
    }

    /**
     * Apply choice effects
     * @param {Object} effects - Effects to apply
     */
    applyEffects(effects) {
        // Set flags
        if (effects.flags) {
            for (const [flag, value] of Object.entries(effects.flags)) {
                if (value) {
                    this.state.setFlag(flag, true);
                } else {
                    this.state.clearFlag(flag);
                }
            }
        }

        // Set variables
        if (effects.variables) {
            for (const [name, value] of Object.entries(effects.variables)) {
                this.state.setVariable(name, value);
            }
        }

        // Add items
        if (effects.addItems) {
            for (const [item, qty] of Object.entries(effects.addItems)) {
                this.state.addItem(item, qty);
            }
        }

        // Remove items
        if (effects.removeItems) {
            for (const [item, qty] of Object.entries(effects.removeItems)) {
                this.state.removeItem(item, qty);
            }
        }

        // Relationship changes
        if (effects.relationships) {
            for (const [char, change] of Object.entries(effects.relationships)) {
                const current = this.state.getVariable(`relationship_${char}`, 0);
                this.state.setVariable(`relationship_${char}`, current + change);
            }
        }
    }

    /**
     * Hide choices
     */
    async hide() {
        this.container?.classList.add('choice-hidden');
        await wait(300); // Wait for animation
        
        if (this.optionsElement) {
            this.optionsElement.innerHTML = '';
        }
        
        this.isShowing = false;
        this.currentChoices = null;
    }

    /**
     * Play navigation sound
     */
    playNavigateSound() {
        this.events.emit(GameEvents.SFX_PLAY, {
            sound: 'ui_navigate',
            volume: 0.3
        });
    }

    /**
     * Play select sound
     */
    playSelectSound() {
        this.events.emit(GameEvents.SFX_PLAY, {
            sound: 'ui_select',
            volume: 0.5
        });
    }

    /**
     * Play locked sound
     */
    playLockedSound() {
        this.events.emit(GameEvents.SFX_PLAY, {
            sound: 'ui_locked',
            volume: 0.4
        });
    }

    /**
     * Get choice history
     * @returns {Array}
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * Clear choice history
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * Check if a specific choice was made
     * @param {string} choiceId - Choice ID
     * @param {number} optionIndex - Option index
     * @returns {boolean}
     */
    wasMade(choiceId, optionIndex) {
        return this.history.some(
            h => h.choiceId === choiceId && h.selectedIndex === optionIndex
        );
    }

    /**
     * Check if choices are showing
     * @returns {boolean}
     */
    isActive() {
        return this.isShowing;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.hide();
        this.history = [];
        this.container = null;
        this.promptElement = null;
        this.optionsElement = null;
    }
}

export default ChoiceManager;
