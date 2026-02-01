/**
 * EventEmitter - Core event system for inter-module communication
 * Befixed - Magic & Mechanical Repair Shop
 */

export class EventEmitter {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
        if (!this.onceEvents.has(event)) {
            this.onceEvents.set(event, new Set());
        }
        this.onceEvents.get(event).add(callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.events.has(event)) {
            this.events.get(event).delete(callback);
        }
        if (this.onceEvents.has(event)) {
            this.onceEvents.get(event).delete(callback);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        // Call regular subscribers
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for "${event}":`, error);
                }
            });
        }

        // Call once subscribers and remove them
        if (this.onceEvents.has(event)) {
            this.onceEvents.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in once handler for "${event}":`, error);
                }
            });
            this.onceEvents.delete(event);
        }
    }

    /**
     * Remove all listeners for an event or all events
     * @param {string} [event] - Event name (optional)
     */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
            this.onceEvents.delete(event);
        } else {
            this.events.clear();
            this.onceEvents.clear();
        }
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        let count = 0;
        if (this.events.has(event)) {
            count += this.events.get(event).size;
        }
        if (this.onceEvents.has(event)) {
            count += this.onceEvents.get(event).size;
        }
        return count;
    }
}

// Game Events Constants
export const GameEvents = {
    // Core Events
    GAME_INIT: 'game:init',
    GAME_READY: 'game:ready',
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',

    // Scene Events
    SCENE_CHANGE: 'scene:change',
    SCENE_LOADED: 'scene:loaded',
    SCENE_TRANSITION_START: 'scene:transition:start',
    SCENE_TRANSITION_END: 'scene:transition:end',

    // Chapter Events
    CHAPTER_START: 'chapter:start',
    CHAPTER_END: 'chapter:end',
    CHAPTER_PROGRESS: 'chapter:progress',

    // Narrative Events
    DIALOGUE_START: 'dialogue:start',
    DIALOGUE_LINE: 'dialogue:line',
    DIALOGUE_COMPLETE: 'dialogue:complete',
    DIALOGUE_SKIP: 'dialogue:skip',
    CHOICE_SHOW: 'choice:show',
    CHOICE_MADE: 'choice:made',
    NARRATION_SHOW: 'narration:show',
    NARRATION_HIDE: 'narration:hide',

    // Character Events
    CHARACTER_ENTER: 'character:enter',
    CHARACTER_EXIT: 'character:exit',
    CHARACTER_SPEAK: 'character:speak',
    CHARACTER_EXPRESSION: 'character:expression',

    // Puzzle Events
    PUZZLE_START: 'puzzle:start',
    PUZZLE_UPDATE: 'puzzle:update',
    PUZZLE_HINT: 'puzzle:hint',
    PUZZLE_COMPLETE: 'puzzle:complete',
    PUZZLE_FAIL: 'puzzle:fail',
    PUZZLE_RESET: 'puzzle:reset',

    // Inventory Events
    ITEM_ADD: 'item:add',
    ITEM_REMOVE: 'item:remove',
    ITEM_USE: 'item:use',
    INVENTORY_OPEN: 'inventory:open',
    INVENTORY_CLOSE: 'inventory:close',

    // Audio Events
    MUSIC_PLAY: 'music:play',
    MUSIC_STOP: 'music:stop',
    MUSIC_FADE: 'music:fade',
    SFX_PLAY: 'sfx:play',
    VOICE_PLAY: 'voice:play',
    AUDIO_MUTE: 'audio:mute',
    AUDIO_UNMUTE: 'audio:unmute',

    // UI Events
    UI_OVERLAY_OPEN: 'ui:overlay:open',
    UI_OVERLAY_CLOSE: 'ui:overlay:close',
    UI_NOTIFICATION: 'ui:notification',
    UI_UPDATE: 'ui:update',

    // Save/Load Events
    SAVE_START: 'save:start',
    SAVE_COMPLETE: 'save:complete',
    SAVE_ERROR: 'save:error',
    LOAD_START: 'load:start',
    LOAD_COMPLETE: 'load:complete',
    LOAD_ERROR: 'load:error',

    // Input Events
    INPUT_CLICK: 'input:click',
    INPUT_KEY: 'input:key',
    INPUT_DRAG_START: 'input:drag:start',
    INPUT_DRAG_END: 'input:drag:end',

    // Settings Events
    SETTINGS_CHANGE: 'settings:change',
    SETTINGS_SAVE: 'settings:save',

    // State Events
    STATE_CHANGE: 'state:change',
    FLAG_SET: 'flag:set',
    VARIABLE_SET: 'variable:set'
};

// Create a global event bus instance
export const globalEvents = new EventEmitter();

export default EventEmitter;
