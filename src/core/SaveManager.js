/**
 * SaveManager - Handles saving and loading game progress
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from '../utils/EventEmitter.js';
import { storage, formatDate, formatTime } from '../utils/helpers.js';

export class SaveManager {
    constructor(stateManager) {
        this.events = globalEvents;
        this.state = stateManager;
        
        this.saveKey = 'befixed_saves';
        this.settingsKey = 'befixed_settings';
        this.maxSlots = 10;
        
        this.saves = new Map();
        this.autosaveEnabled = true;
        this.autosaveInterval = 60000; // 1 minute
        this.autosaveTimer = null;
    }

    /**
     * Initialize the save manager
     */
    async init() {
        this.loadSavesFromStorage();
        console.log('SaveManager initialized');
    }

    /**
     * Load saves from localStorage
     */
    loadSavesFromStorage() {
        const savedData = storage.get(this.saveKey, {});
        
        for (const [slot, data] of Object.entries(savedData)) {
            this.saves.set(parseInt(slot), data);
        }
    }

    /**
     * Persist saves to localStorage
     */
    persistSaves() {
        const saveData = {};
        for (const [slot, data] of this.saves.entries()) {
            saveData[slot] = data;
        }
        storage.set(this.saveKey, saveData);
    }

    /**
     * Save game to a slot
     * @param {number} slot - Save slot (1-10)
     * @param {Object} additionalData - Additional data to save
     * @returns {boolean} Success
     */
    async save(slot, additionalData = {}) {
        if (slot < 1 || slot > this.maxSlots) {
            console.error(`Invalid save slot: ${slot}`);
            return false;
        }

        this.events.emit(GameEvents.SAVE_START, { slot });

        try {
            const gameState = this.state.getAll();
            
            const saveData = {
                slot,
                version: '1.0.0',
                timestamp: Date.now(),
                chapter: this.state.get('currentChapter'),
                scene: this.state.get('currentScene'),
                playtime: this.state.get('playtime') || 0,
                state: gameState,
                ...additionalData
            };

            // Generate save preview info
            saveData.preview = this.generatePreview(saveData);

            this.saves.set(slot, saveData);
            this.persistSaves();

            this.events.emit(GameEvents.SAVE_COMPLETE, {
                slot,
                data: saveData
            });

            console.log(`Game saved to slot ${slot}`);
            return true;
        } catch (error) {
            console.error('Save failed:', error);
            this.events.emit(GameEvents.SAVE_ERROR, {
                slot,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Load game from a slot
     * @param {number} slot - Save slot
     * @returns {boolean} Success
     */
    async load(slot) {
        const saveData = this.saves.get(slot);
        
        if (!saveData) {
            console.error(`No save found in slot ${slot}`);
            return false;
        }

        this.events.emit(GameEvents.LOAD_START, { slot });

        try {
            // Restore state
            if (saveData.state) {
                this.state.loadAll(saveData.state);
            }

            // Set core values
            this.state.set('currentChapter', saveData.chapter);
            this.state.set('currentScene', saveData.scene);
            this.state.set('playtime', saveData.playtime);

            this.events.emit(GameEvents.LOAD_COMPLETE, {
                slot,
                data: saveData
            });

            console.log(`Game loaded from slot ${slot}`);
            return true;
        } catch (error) {
            console.error('Load failed:', error);
            this.events.emit(GameEvents.LOAD_ERROR, {
                slot,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Delete a save
     * @param {number} slot - Save slot
     * @returns {boolean}
     */
    delete(slot) {
        if (!this.saves.has(slot)) {
            return false;
        }

        this.saves.delete(slot);
        this.persistSaves();
        
        console.log(`Save deleted from slot ${slot}`);
        return true;
    }

    /**
     * Generate preview data for a save
     * @param {Object} saveData - Save data
     * @returns {Object}
     */
    generatePreview(saveData) {
        return {
            chapterText: `Chapter ${saveData.chapter}`,
            chapterTitle: this.getChapterTitle(saveData.chapter),
            dateText: formatDate(saveData.timestamp),
            playtimeText: formatTime(saveData.playtime)
        };
    }

    /**
     * Get chapter title
     * @param {number} chapter - Chapter number
     * @returns {string}
     */
    getChapterTitle(chapter) {
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
        return titles[chapter - 1] || 'Unknown Chapter';
    }

    /**
     * Get save data for a slot
     * @param {number} slot - Save slot
     * @returns {Object|null}
     */
    getSaveData(slot) {
        return this.saves.get(slot) || null;
    }

    /**
     * Get all saves
     * @returns {Array<Object>}
     */
    getAllSaves() {
        const saves = [];
        for (let i = 1; i <= this.maxSlots; i++) {
            const save = this.saves.get(i);
            saves.push({
                slot: i,
                data: save || null,
                isEmpty: !save
            });
        }
        return saves;
    }

    /**
     * Get the latest save
     * @returns {Object|null}
     */
    getLatestSave() {
        let latest = null;
        let latestTime = 0;

        for (const [slot, data] of this.saves.entries()) {
            if (data.timestamp > latestTime) {
                latestTime = data.timestamp;
                latest = { slot, data };
            }
        }

        return latest;
    }

    /**
     * Check if any save exists
     * @returns {boolean}
     */
    hasSaves() {
        return this.saves.size > 0;
    }

    /**
     * Start autosave timer
     * @param {Function} saveCallback - Function to call for saving
     */
    startAutosave(saveCallback) {
        if (!this.autosaveEnabled) return;

        this.stopAutosave();
        this.autosaveTimer = setInterval(() => {
            console.log('Autosaving...');
            saveCallback(0); // Slot 0 = autosave
        }, this.autosaveInterval);
    }

    /**
     * Stop autosave timer
     */
    stopAutosave() {
        if (this.autosaveTimer) {
            clearInterval(this.autosaveTimer);
            this.autosaveTimer = null;
        }
    }

    /**
     * Set autosave enabled/disabled
     * @param {boolean} enabled
     */
    setAutosaveEnabled(enabled) {
        this.autosaveEnabled = enabled;
        if (!enabled) {
            this.stopAutosave();
        }
    }

    // ==================== SETTINGS ====================

    /**
     * Save game settings
     * @param {Object} settings - Settings object
     */
    saveSettings(settings) {
        storage.set(this.settingsKey, settings);
        this.events.emit(GameEvents.SETTINGS_SAVE, settings);
    }

    /**
     * Load game settings
     * @returns {Object}
     */
    loadSettings() {
        return storage.get(this.settingsKey, this.getDefaultSettings());
    }

    /**
     * Get default settings
     * @returns {Object}
     */
    getDefaultSettings() {
        return {
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
        };
    }

    /**
     * Export save data as JSON string
     * @param {number} slot - Save slot
     * @returns {string|null}
     */
    exportSave(slot) {
        const saveData = this.saves.get(slot);
        if (!saveData) return null;

        return JSON.stringify(saveData, null, 2);
    }

    /**
     * Import save data from JSON string
     * @param {number} slot - Save slot
     * @param {string} jsonString - JSON save data
     * @returns {boolean}
     */
    importSave(slot, jsonString) {
        try {
            const saveData = JSON.parse(jsonString);
            
            // Validate save data
            if (!saveData.version || !saveData.state) {
                throw new Error('Invalid save data format');
            }

            saveData.slot = slot;
            saveData.timestamp = Date.now(); // Update timestamp

            this.saves.set(slot, saveData);
            this.persistSaves();

            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    /**
     * Clear all saves (with confirmation)
     */
    clearAllSaves() {
        this.saves.clear();
        this.persistSaves();
        console.log('All saves cleared');
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopAutosave();
        this.saves.clear();
    }
}

export default SaveManager;
