/**
 * CharacterManager - Manages character data, sprites, and display
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from '../utils/EventEmitter.js';
import { assetLoader } from '../utils/AssetLoader.js';
import { wait } from '../utils/helpers.js';

export class CharacterManager {
    constructor(stateManager) {
        this.events = globalEvents;
        this.state = stateManager;
        
        // Character data
        this.characters = new Map();
        
        // Currently displayed characters
        this.displayed = new Map();
        
        // Character positions
        this.positions = ['left', 'center', 'right'];
        
        // DOM slots
        this.slots = new Map();
    }

    /**
     * Initialize the character manager
     */
    async init() {
        // Cache position slots
        this.positions.forEach(pos => {
            const slot = document.getElementById(`character-${pos}`);
            if (slot) {
                this.slots.set(pos, slot);
            }
        });

        // Load character data
        await this.loadCharacterData();
        
        console.log('CharacterManager initialized');
    }

    /**
     * Load character data from JSON
     */
    async loadCharacterData() {
        try {
            const data = assetLoader.get('characters');
            if (data?.characters) {
                for (const char of data.characters) {
                    this.characters.set(char.id, char);
                }
            }
        } catch (error) {
            console.warn('Could not load character data:', error);
        }
    }

    /**
     * Register a character
     * @param {Object} characterData - Character data
     */
    registerCharacter(characterData) {
        this.characters.set(characterData.id, {
            id: characterData.id,
            name: characterData.name,
            displayName: characterData.displayName || characterData.name,
            color: characterData.color || '#c9a227',
            sprites: characterData.sprites || {},
            portraits: characterData.portraits || {},
            description: characterData.description || '',
            role: characterData.role || '',
            voiceId: characterData.voiceId || null
        });
    }

    /**
     * Get character data
     * @param {string} characterId - Character ID
     * @returns {Object|null}
     */
    getCharacter(characterId) {
        return this.characters.get(characterId) || null;
    }

    /**
     * Show a character on screen
     * @param {Object} options - Display options
     */
    async show(options) {
        const {
            character,
            position = 'center',
            expression = 'neutral',
            animation = 'fade',
            flip = false
        } = options;

        const charData = this.getCharacter(character);
        if (!charData) {
            console.warn(`Character not found: ${character}`);
            return;
        }

        const slot = this.slots.get(position);
        if (!slot) {
            console.warn(`Position slot not found: ${position}`);
            return;
        }

        // Get sprite path
        const spritePath = charData.sprites[expression] || charData.sprites.neutral;
        if (!spritePath) {
            console.warn(`Sprite not found for ${character}:${expression}`);
            return;
        }

        // Create character element
        const charElement = document.createElement('div');
        charElement.className = 'character-sprite';
        charElement.dataset.characterId = character;
        charElement.dataset.expression = expression;

        const img = document.createElement('img');
        img.src = spritePath;
        img.alt = charData.displayName;
        
        if (flip) {
            img.style.transform = 'scaleX(-1)';
        }

        charElement.appendChild(img);

        // Clear existing character in slot
        if (this.displayed.has(position)) {
            await this.hide({ position, animation: 'none' });
        }

        // Add to slot with animation
        slot.appendChild(charElement);

        // Apply entrance animation
        switch (animation) {
            case 'fade':
                charElement.style.opacity = '0';
                await wait(50);
                charElement.style.transition = 'opacity 0.3s ease-out';
                charElement.style.opacity = '1';
                break;
            case 'slide-left':
                charElement.classList.add('character-enter-left');
                break;
            case 'slide-right':
                charElement.classList.add('character-enter-right');
                break;
            case 'none':
                break;
        }

        // Track displayed character
        this.displayed.set(position, {
            id: character,
            expression,
            element: charElement
        });

        // Mark character as discovered
        this.state.discoverCharacter(character, {
            name: charData.displayName,
            description: charData.description,
            role: charData.role
        });

        this.events.emit(GameEvents.CHARACTER_ENTER, {
            character,
            position,
            expression
        });
    }

    /**
     * Hide a character
     * @param {Object} options - Hide options
     */
    async hide(options) {
        const { position, character, animation = 'fade' } = options;

        // Find the character to hide
        let targetPosition = position;
        
        if (character && !position) {
            for (const [pos, data] of this.displayed.entries()) {
                if (data.id === character) {
                    targetPosition = pos;
                    break;
                }
            }
        }

        if (!targetPosition || !this.displayed.has(targetPosition)) {
            return;
        }

        const displayData = this.displayed.get(targetPosition);
        const element = displayData.element;

        // Apply exit animation
        switch (animation) {
            case 'fade':
                element.style.transition = 'opacity 0.3s ease-in';
                element.style.opacity = '0';
                await wait(300);
                break;
            case 'slide-left':
                element.classList.add('character-exit-left');
                await wait(500);
                break;
            case 'slide-right':
                element.classList.add('character-exit-right');
                await wait(500);
                break;
            case 'none':
                break;
        }

        // Remove element
        element.remove();
        this.displayed.delete(targetPosition);

        this.events.emit(GameEvents.CHARACTER_EXIT, {
            character: displayData.id,
            position: targetPosition
        });
    }

    /**
     * Change character expression
     * @param {Object} options - Expression options
     */
    async setExpression(options) {
        const { character, position, expression, animation = 'flash' } = options;

        // Find character
        let targetPosition = position;
        if (character && !position) {
            for (const [pos, data] of this.displayed.entries()) {
                if (data.id === character) {
                    targetPosition = pos;
                    break;
                }
            }
        }

        if (!targetPosition || !this.displayed.has(targetPosition)) {
            return;
        }

        const displayData = this.displayed.get(targetPosition);
        const charData = this.getCharacter(displayData.id);
        
        if (!charData) return;

        const newSprite = charData.sprites[expression] || charData.sprites.neutral;
        if (!newSprite) return;

        const img = displayData.element.querySelector('img');
        if (!img) return;

        // Apply animation
        if (animation === 'flash') {
            displayData.element.classList.add('character-expression-change');
            await wait(100);
        }

        img.src = newSprite;
        displayData.expression = expression;

        if (animation === 'flash') {
            await wait(100);
            displayData.element.classList.remove('character-expression-change');
        }

        this.events.emit(GameEvents.CHARACTER_EXPRESSION, {
            character: displayData.id,
            expression
        });
    }

    /**
     * Move character to different position
     * @param {Object} options - Move options
     */
    async move(options) {
        const { character, from, to, animation = 'slide' } = options;

        // Find current position
        let currentPosition = from;
        if (character && !from) {
            for (const [pos, data] of this.displayed.entries()) {
                if (data.id === character) {
                    currentPosition = pos;
                    break;
                }
            }
        }

        if (!currentPosition || !this.displayed.has(currentPosition)) {
            return;
        }

        const displayData = this.displayed.get(currentPosition);
        const toSlot = this.slots.get(to);
        
        if (!toSlot) return;

        // If target position occupied, swap or fail
        if (this.displayed.has(to)) {
            console.warn(`Position ${to} already occupied`);
            return;
        }

        // Animate movement
        const element = displayData.element;
        
        if (animation === 'slide') {
            element.style.transition = 'transform 0.5s ease-in-out';
            // Calculate relative movement
            const fromRect = this.slots.get(currentPosition).getBoundingClientRect();
            const toRect = toSlot.getBoundingClientRect();
            const dx = toRect.left - fromRect.left;
            element.style.transform = `translateX(${dx}px)`;
            await wait(500);
        }

        // Move to new slot
        element.style.transform = '';
        toSlot.appendChild(element);

        // Update tracking
        this.displayed.delete(currentPosition);
        this.displayed.set(to, displayData);
    }

    /**
     * Set character as speaking (highlight)
     * @param {string} character - Character ID
     */
    setSpeaking(character) {
        // Remove speaking state from all
        for (const [pos, data] of this.displayed.entries()) {
            const slot = this.slots.get(pos);
            slot?.classList.remove('speaking');
        }

        // Set speaking state for target
        for (const [pos, data] of this.displayed.entries()) {
            if (data.id === character) {
                const slot = this.slots.get(pos);
                slot?.classList.add('speaking');
                
                this.events.emit(GameEvents.CHARACTER_SPEAK, { character });
                break;
            }
        }
    }

    /**
     * Clear speaking state
     */
    clearSpeaking() {
        for (const [pos] of this.displayed.entries()) {
            const slot = this.slots.get(pos);
            slot?.classList.remove('speaking');
        }
    }

    /**
     * Hide all characters
     * @param {string} [animation='fade'] - Exit animation
     */
    async hideAll(animation = 'fade') {
        const hidePromises = [];
        
        for (const [position] of this.displayed.entries()) {
            hidePromises.push(this.hide({ position, animation }));
        }

        await Promise.all(hidePromises);
    }

    /**
     * Get portrait path for a character
     * @param {string} characterId - Character ID
     * @param {string} [expression='neutral'] - Expression
     * @returns {string|null}
     */
    getPortrait(characterId, expression = 'neutral') {
        const char = this.getCharacter(characterId);
        if (!char) return null;
        
        return char.portraits[expression] || char.portraits.neutral || char.sprites[expression] || null;
    }

    /**
     * Get display name for a character
     * @param {string} characterId - Character ID
     * @returns {string}
     */
    getDisplayName(characterId) {
        const char = this.getCharacter(characterId);
        return char?.displayName || char?.name || characterId;
    }

    /**
     * Get name color for a character
     * @param {string} characterId - Character ID
     * @returns {string}
     */
    getNameColor(characterId) {
        const char = this.getCharacter(characterId);
        return char?.color || '#c9a227';
    }

    /**
     * Check if character is displayed
     * @param {string} characterId - Character ID
     * @returns {boolean}
     */
    isDisplayed(characterId) {
        for (const data of this.displayed.values()) {
            if (data.id === characterId) return true;
        }
        return false;
    }

    /**
     * Get all displayed characters
     * @returns {Array}
     */
    getDisplayed() {
        return Array.from(this.displayed.entries()).map(([position, data]) => ({
            ...data,
            position
        }));
    }

    /**
     * Cleanup
     */
    destroy() {
        this.hideAll('none');
        this.characters.clear();
        this.displayed.clear();
        this.slots.clear();
    }
}

export default CharacterManager;
