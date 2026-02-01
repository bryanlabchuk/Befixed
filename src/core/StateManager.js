/**
 * StateManager - Manages game state, inventory, and progress flags
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from '../utils/EventEmitter.js';
import { deepClone, deepMerge } from '../utils/helpers.js';

export class StateManager {
    constructor() {
        this.events = globalEvents;
        
        // Core state containers
        this.state = new Map();
        this.flags = new Map();
        this.variables = new Map();
        this.inventory = new Map();
        this.journal = {
            entries: [],
            characters: new Map(),
            items: new Map()
        };
        
        // State history for undo (optional)
        this.history = [];
        this.maxHistory = 50;
        
        // Subscribers for state changes
        this.subscribers = new Map();
    }

    /**
     * Initialize the state manager
     */
    async init() {
        this.reset();
        console.log('StateManager initialized');
    }

    /**
     * Reset all state to initial values
     */
    reset() {
        this.state.clear();
        this.flags.clear();
        this.variables.clear();
        this.inventory.clear();
        this.journal = {
            entries: [],
            characters: new Map(),
            items: new Map()
        };
        this.history = [];

        // Set default state values
        this.state.set('currentChapter', 0);
        this.state.set('currentScene', null);
        this.state.set('playtime', 0);
        this.state.set('gameStarted', false);
        
        this.events.emit(GameEvents.STATE_CHANGE, { type: 'reset' });
    }

    // ==================== GENERAL STATE ====================

    /**
     * Get a state value
     * @param {string} key - State key
     * @param {*} defaultValue - Default value if not found
     * @returns {*}
     */
    get(key, defaultValue = null) {
        return this.state.has(key) ? this.state.get(key) : defaultValue;
    }

    /**
     * Set a state value
     * @param {string} key - State key
     * @param {*} value - State value
     */
    set(key, value) {
        const oldValue = this.state.get(key);
        this.state.set(key, value);
        
        this.events.emit(GameEvents.STATE_CHANGE, {
            type: 'state',
            key,
            value,
            oldValue
        });

        this.notifySubscribers(key, value, oldValue);
    }

    /**
     * Get all state as an object
     * @returns {Object}
     */
    getAll() {
        return {
            state: Object.fromEntries(this.state),
            flags: Object.fromEntries(this.flags),
            variables: Object.fromEntries(this.variables),
            inventory: Object.fromEntries(this.inventory),
            journal: {
                entries: [...this.journal.entries],
                characters: Object.fromEntries(this.journal.characters),
                items: Object.fromEntries(this.journal.items)
            }
        };
    }

    /**
     * Load state from an object
     * @param {Object} data - State data
     */
    loadAll(data) {
        if (data.state) {
            this.state = new Map(Object.entries(data.state));
        }
        if (data.flags) {
            this.flags = new Map(Object.entries(data.flags));
        }
        if (data.variables) {
            this.variables = new Map(Object.entries(data.variables));
        }
        if (data.inventory) {
            this.inventory = new Map(Object.entries(data.inventory));
        }
        if (data.journal) {
            this.journal = {
                entries: data.journal.entries || [],
                characters: new Map(Object.entries(data.journal.characters || {})),
                items: new Map(Object.entries(data.journal.items || {}))
            };
        }

        this.events.emit(GameEvents.STATE_CHANGE, { type: 'load' });
    }

    // ==================== FLAGS ====================

    /**
     * Set a flag
     * @param {string} flag - Flag name
     * @param {boolean} value - Flag value
     */
    setFlag(flag, value = true) {
        const oldValue = this.flags.get(flag);
        this.flags.set(flag, Boolean(value));
        
        this.events.emit(GameEvents.FLAG_SET, {
            flag,
            value: Boolean(value),
            oldValue
        });
    }

    /**
     * Get a flag value
     * @param {string} flag - Flag name
     * @returns {boolean}
     */
    getFlag(flag) {
        return this.flags.get(flag) || false;
    }

    /**
     * Check if a flag is set
     * @param {string} flag - Flag name
     * @returns {boolean}
     */
    hasFlag(flag) {
        return this.flags.has(flag) && this.flags.get(flag) === true;
    }

    /**
     * Clear a flag
     * @param {string} flag - Flag name
     */
    clearFlag(flag) {
        this.flags.delete(flag);
        this.events.emit(GameEvents.FLAG_SET, { flag, value: false });
    }

    /**
     * Check multiple flags (AND)
     * @param {...string} flags - Flag names
     * @returns {boolean}
     */
    hasAllFlags(...flags) {
        return flags.every(flag => this.hasFlag(flag));
    }

    /**
     * Check multiple flags (OR)
     * @param {...string} flags - Flag names
     * @returns {boolean}
     */
    hasAnyFlag(...flags) {
        return flags.some(flag => this.hasFlag(flag));
    }

    // ==================== VARIABLES ====================

    /**
     * Set a variable
     * @param {string} name - Variable name
     * @param {*} value - Variable value
     */
    setVariable(name, value) {
        const oldValue = this.variables.get(name);
        this.variables.set(name, value);
        
        this.events.emit(GameEvents.VARIABLE_SET, {
            name,
            value,
            oldValue
        });
    }

    /**
     * Get a variable
     * @param {string} name - Variable name
     * @param {*} defaultValue - Default value
     * @returns {*}
     */
    getVariable(name, defaultValue = null) {
        return this.variables.has(name) ? this.variables.get(name) : defaultValue;
    }

    /**
     * Increment a numeric variable
     * @param {string} name - Variable name
     * @param {number} amount - Amount to increment
     */
    incrementVariable(name, amount = 1) {
        const current = this.getVariable(name, 0);
        this.setVariable(name, current + amount);
    }

    /**
     * Decrement a numeric variable
     * @param {string} name - Variable name
     * @param {number} amount - Amount to decrement
     */
    decrementVariable(name, amount = 1) {
        const current = this.getVariable(name, 0);
        this.setVariable(name, current - amount);
    }

    // ==================== INVENTORY ====================

    /**
     * Add an item to inventory
     * @param {string} itemId - Item ID
     * @param {number} quantity - Quantity to add
     */
    addItem(itemId, quantity = 1) {
        const current = this.inventory.get(itemId) || 0;
        this.inventory.set(itemId, current + quantity);
        
        this.events.emit(GameEvents.ITEM_ADD, {
            itemId,
            quantity,
            total: current + quantity
        });
    }

    /**
     * Remove an item from inventory
     * @param {string} itemId - Item ID
     * @param {number} quantity - Quantity to remove
     * @returns {boolean} - Whether removal was successful
     */
    removeItem(itemId, quantity = 1) {
        const current = this.inventory.get(itemId) || 0;
        
        if (current < quantity) {
            return false;
        }

        const newQuantity = current - quantity;
        if (newQuantity <= 0) {
            this.inventory.delete(itemId);
        } else {
            this.inventory.set(itemId, newQuantity);
        }

        this.events.emit(GameEvents.ITEM_REMOVE, {
            itemId,
            quantity,
            remaining: Math.max(0, newQuantity)
        });

        return true;
    }

    /**
     * Check if player has an item
     * @param {string} itemId - Item ID
     * @param {number} quantity - Required quantity
     * @returns {boolean}
     */
    hasItem(itemId, quantity = 1) {
        return (this.inventory.get(itemId) || 0) >= quantity;
    }

    /**
     * Get item quantity
     * @param {string} itemId - Item ID
     * @returns {number}
     */
    getItemQuantity(itemId) {
        return this.inventory.get(itemId) || 0;
    }

    /**
     * Get all inventory items
     * @returns {Array<{id: string, quantity: number}>}
     */
    getInventory() {
        return Array.from(this.inventory.entries()).map(([id, quantity]) => ({
            id,
            quantity
        }));
    }

    // ==================== JOURNAL ====================

    /**
     * Add a journal entry
     * @param {Object} entry - Journal entry
     */
    addJournalEntry(entry) {
        this.journal.entries.push({
            ...entry,
            timestamp: Date.now(),
            id: `entry_${this.journal.entries.length}`
        });
    }

    /**
     * Get journal entries
     * @param {string} [chapter] - Filter by chapter
     * @returns {Array}
     */
    getJournalEntries(chapter = null) {
        if (chapter) {
            return this.journal.entries.filter(e => e.chapter === chapter);
        }
        return [...this.journal.entries];
    }

    /**
     * Discover a character
     * @param {string} characterId - Character ID
     * @param {Object} data - Character data
     */
    discoverCharacter(characterId, data = {}) {
        if (!this.journal.characters.has(characterId)) {
            this.journal.characters.set(characterId, {
                discovered: true,
                firstMet: this.get('currentChapter'),
                ...data
            });
        } else {
            const existing = this.journal.characters.get(characterId);
            this.journal.characters.set(characterId, { ...existing, ...data });
        }
    }

    /**
     * Discover an item for the journal
     * @param {string} itemId - Item ID
     * @param {Object} data - Item data
     */
    discoverItem(itemId, data = {}) {
        if (!this.journal.items.has(itemId)) {
            this.journal.items.set(itemId, {
                discovered: true,
                chapter: this.get('currentChapter'),
                ...data
            });
        }
    }

    /**
     * Get discovered characters
     * @returns {Array}
     */
    getDiscoveredCharacters() {
        return Array.from(this.journal.characters.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
    }

    // ==================== CONDITIONS ====================

    /**
     * Evaluate a condition
     * @param {Object|string} condition - Condition to evaluate
     * @returns {boolean}
     */
    evaluateCondition(condition) {
        if (typeof condition === 'string') {
            // Simple flag check
            return this.hasFlag(condition);
        }

        if (!condition || typeof condition !== 'object') {
            return true;
        }

        const { type, key, operator, value } = condition;

        switch (type) {
            case 'flag':
                return this.hasFlag(key);
            
            case 'notFlag':
                return !this.hasFlag(key);
            
            case 'variable': {
                const varValue = this.getVariable(key, 0);
                return this.compareValues(varValue, operator, value);
            }
            
            case 'item':
                return this.hasItem(key, value || 1);
            
            case 'chapter':
                return this.compareValues(this.get('currentChapter'), operator, value);
            
            case 'and':
                return condition.conditions.every(c => this.evaluateCondition(c));
            
            case 'or':
                return condition.conditions.some(c => this.evaluateCondition(c));
            
            case 'not':
                return !this.evaluateCondition(condition.condition);
            
            default:
                console.warn(`Unknown condition type: ${type}`);
                return true;
        }
    }

    /**
     * Compare two values with an operator
     * @param {*} a - First value
     * @param {string} operator - Comparison operator
     * @param {*} b - Second value
     * @returns {boolean}
     */
    compareValues(a, operator, b) {
        switch (operator) {
            case '==':
            case '===':
                return a === b;
            case '!=':
            case '!==':
                return a !== b;
            case '>':
                return a > b;
            case '>=':
                return a >= b;
            case '<':
                return a < b;
            case '<=':
                return a <= b;
            default:
                return a === b;
        }
    }

    // ==================== SUBSCRIPTIONS ====================

    /**
     * Subscribe to state changes for a specific key
     * @param {string} key - State key to watch
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);

        return () => {
            const subs = this.subscribers.get(key);
            if (subs) {
                subs.delete(callback);
            }
        };
    }

    /**
     * Notify subscribers of a state change
     * @param {string} key - State key
     * @param {*} value - New value
     * @param {*} oldValue - Old value
     */
    notifySubscribers(key, value, oldValue) {
        const subs = this.subscribers.get(key);
        if (subs) {
            subs.forEach(callback => {
                try {
                    callback(value, oldValue);
                } catch (error) {
                    console.error(`Error in state subscriber for "${key}":`, error);
                }
            });
        }
    }

    // ==================== HISTORY ====================

    /**
     * Save current state to history
     */
    saveToHistory() {
        const snapshot = this.getAll();
        this.history.push(deepClone(snapshot));
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    /**
     * Restore previous state from history
     * @returns {boolean} - Whether restore was successful
     */
    restoreFromHistory() {
        if (this.history.length === 0) {
            return false;
        }

        const previousState = this.history.pop();
        this.loadAll(previousState);
        return true;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.state.clear();
        this.flags.clear();
        this.variables.clear();
        this.inventory.clear();
        this.history = [];
        this.subscribers.clear();
    }
}

export default StateManager;
