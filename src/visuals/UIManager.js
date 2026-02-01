/**
 * UIManager - Handles UI elements, overlays, and notifications
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from '../utils/EventEmitter.js';
import { $, $$, createElement, formatTime } from '../utils/helpers.js';

export class UIManager {
    constructor(gameManager) {
        this.game = gameManager;
        this.events = globalEvents;
        
        // Overlay state
        this.activeOverlay = null;
        
        // Settings reference
        this.settings = null;
        
        // Notification queue
        this.notifications = [];
        this.isShowingNotification = false;
    }

    /**
     * Initialize UI manager
     */
    async init() {
        // Load settings
        this.settings = this.game?.saves?.loadSettings() || {};
        
        // Apply settings to UI
        this.applySettings(this.settings);
        
        // Set up all event listeners
        this.setupMenuListeners();
        this.setupGameListeners();
        this.setupOverlayListeners();
        this.setupSettingsListeners();
        
        // Set up global event handlers
        this.setupEventHandlers();
        
        console.log('UIManager initialized');
    }

    /**
     * Set up event handlers
     */
    setupEventHandlers() {
        this.events.on(GameEvents.UI_NOTIFICATION, (data) => {
            this.showNotification(data.message, data.type);
        });

        this.events.on(GameEvents.UI_OVERLAY_OPEN, (data) => {
            this.openOverlay(data.overlayId);
        });

        this.events.on(GameEvents.UI_OVERLAY_CLOSE, () => {
            this.closeActiveOverlay();
        });
    }

    /**
     * Set up main menu listeners
     */
    setupMenuListeners() {
        // New Game button
        $('#btn-new-game')?.addEventListener('click', async () => {
            this.playButtonSound();
            await this.game.newGame();
        });

        // Continue button
        $('#btn-continue')?.addEventListener('click', async () => {
            this.playButtonSound();
            await this.game.continueGame();
        });

        // Load Game button
        $('#btn-load-game')?.addEventListener('click', () => {
            this.playButtonSound();
            this.openSaveLoadOverlay('load');
        });

        // Settings button
        $('#btn-settings')?.addEventListener('click', () => {
            this.playButtonSound();
            this.openOverlay('settings-overlay');
        });

        // Credits button
        $('#btn-credits')?.addEventListener('click', () => {
            this.playButtonSound();
            this.openOverlay('credits-overlay');
        });

        // Update continue button state
        this.updateContinueButton();
    }

    /**
     * Set up in-game UI listeners
     */
    setupGameListeners() {
        // Inventory button
        $('#btn-inventory')?.addEventListener('click', () => {
            this.playButtonSound();
            this.openOverlay('inventory-overlay');
            this.populateInventory();
        });

        // Journal button
        $('#btn-journal')?.addEventListener('click', () => {
            this.playButtonSound();
            this.openOverlay('journal-overlay');
            this.populateJournal();
        });

        // Menu button (pause)
        $('#btn-menu')?.addEventListener('click', () => {
            this.playButtonSound();
            this.game.pause();
            this.openOverlay('pause-overlay');
        });
    }

    /**
     * Set up overlay listeners
     */
    setupOverlayListeners() {
        // Close buttons
        $$('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.playButtonSound();
                this.closeActiveOverlay();
            });
        });

        // Backdrop clicks
        $$('.overlay-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', () => {
                this.closeActiveOverlay();
            });
        });

        // Pause menu buttons
        $('#btn-resume')?.addEventListener('click', () => {
            this.playButtonSound();
            this.closeActiveOverlay();
            this.game.resume();
        });

        $('#btn-save')?.addEventListener('click', () => {
            this.playButtonSound();
            this.openSaveLoadOverlay('save');
        });

        $('#btn-load')?.addEventListener('click', () => {
            this.playButtonSound();
            this.openSaveLoadOverlay('load');
        });

        $('#btn-pause-settings')?.addEventListener('click', () => {
            this.playButtonSound();
            this.openOverlay('settings-overlay');
        });

        $('#btn-main-menu')?.addEventListener('click', () => {
            this.playButtonSound();
            this.closeActiveOverlay();
            this.game.returnToMainMenu();
        });

        // Journal tabs
        $$('.tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchJournalTab(tab.dataset.tab);
            });
        });
    }

    /**
     * Set up settings listeners
     */
    setupSettingsListeners() {
        // Volume sliders
        const volumeInputs = ['master-volume', 'music-volume', 'sfx-volume', 'voice-volume'];
        volumeInputs.forEach(id => {
            const input = $(`#${id}`);
            const valueDisplay = input?.nextElementSibling;
            
            input?.addEventListener('input', () => {
                if (valueDisplay) {
                    valueDisplay.textContent = `${input.value}%`;
                }
            });
        });

        // Save settings
        $('#btn-save-settings')?.addEventListener('click', () => {
            this.saveSettings();
            this.closeActiveOverlay();
            this.showNotification('Settings saved', 'success');
        });

        // Reset settings
        $('#btn-reset-settings')?.addEventListener('click', () => {
            const defaults = this.game?.saves?.getDefaultSettings() || {};
            this.applySettings(defaults);
            this.populateSettingsForm(defaults);
        });
    }

    /**
     * Update continue button availability
     */
    updateContinueButton() {
        const continueBtn = $('#btn-continue');
        if (continueBtn) {
            const hasSaves = this.game?.saves?.hasSaves() || false;
            continueBtn.disabled = !hasSaves;
        }
    }

    /**
     * Open an overlay
     * @param {string} overlayId - Overlay element ID
     */
    openOverlay(overlayId) {
        // Close any active overlay first
        if (this.activeOverlay) {
            this.closeActiveOverlay();
        }

        const overlay = $(`#${overlayId}`);
        if (overlay) {
            overlay.classList.remove('hidden');
            this.activeOverlay = overlayId;
            
            this.events.emit(GameEvents.UI_OVERLAY_OPEN, { overlayId });
        }
    }

    /**
     * Close active overlay
     */
    closeActiveOverlay() {
        if (this.activeOverlay) {
            const overlay = $(`#${this.activeOverlay}`);
            overlay?.classList.add('hidden');
            
            this.events.emit(GameEvents.UI_OVERLAY_CLOSE, { overlayId: this.activeOverlay });
            this.activeOverlay = null;
        }
    }

    /**
     * Open save/load overlay
     * @param {string} mode - 'save' or 'load'
     */
    openSaveLoadOverlay(mode) {
        const title = $(`#save-load-title`);
        if (title) {
            title.textContent = mode === 'save' ? 'Save Game' : 'Load Game';
        }

        this.populateSaveSlots(mode);
        this.openOverlay('save-load-overlay');
    }

    /**
     * Populate save slots
     * @param {string} mode - 'save' or 'load'
     */
    populateSaveSlots(mode) {
        const container = $('#save-slots');
        if (!container) return;

        container.innerHTML = '';

        const saves = this.game?.saves?.getAllSaves() || [];

        saves.forEach(({ slot, data, isEmpty }) => {
            const slotEl = createElement('div', {
                className: `save-slot ${isEmpty ? 'empty' : ''}`,
                dataset: { slot: String(slot) }
            });

            if (isEmpty) {
                slotEl.innerHTML = `
                    <div class="slot-number">${slot}</div>
                    <div class="slot-info">
                        <div class="slot-chapter">Empty Slot</div>
                    </div>
                `;
            } else {
                slotEl.innerHTML = `
                    <div class="slot-number">${slot}</div>
                    <div class="slot-info">
                        <div class="slot-chapter">${data.preview?.chapterText || 'Chapter ?'} - ${data.preview?.chapterTitle || ''}</div>
                        <div class="slot-date">${data.preview?.dateText || ''}</div>
                        <div class="slot-playtime">Playtime: ${data.preview?.playtimeText || '00:00'}</div>
                    </div>
                    <div class="slot-actions">
                        ${mode === 'load' ? '' : `<button class="slot-btn delete" data-action="delete">Delete</button>`}
                    </div>
                `;
            }

            // Click handler
            slotEl.addEventListener('click', async (e) => {
                if (e.target.classList.contains('delete')) {
                    this.deleteSave(slot);
                    return;
                }

                if (mode === 'save') {
                    await this.game?.saveGame(slot);
                    this.closeActiveOverlay();
                } else if (!isEmpty) {
                    await this.game?.loadGame(slot);
                    this.closeActiveOverlay();
                }
            });

            container.appendChild(slotEl);
        });
    }

    /**
     * Delete a save
     * @param {number} slot - Save slot
     */
    deleteSave(slot) {
        if (confirm('Are you sure you want to delete this save?')) {
            this.game?.saves?.delete(slot);
            this.populateSaveSlots('save');
            this.showNotification('Save deleted', 'info');
        }
    }

    /**
     * Populate inventory display
     */
    populateInventory() {
        const grid = $('#inventory-grid');
        const details = $('#item-details');
        
        if (!grid) return;

        grid.innerHTML = '';

        const inventory = this.game?.state?.getInventory() || [];

        if (inventory.length === 0) {
            grid.innerHTML = '<p class="empty-message">Your inventory is empty</p>';
            return;
        }

        inventory.forEach(({ id, quantity }) => {
            const slot = createElement('div', {
                className: 'inventory-slot',
                dataset: { itemId: id }
            });

            // Get item data (would come from item definitions)
            slot.innerHTML = `
                <span class="item-icon">📦</span>
                ${quantity > 1 ? `<span class="item-quantity">${quantity}</span>` : ''}
            `;

            slot.addEventListener('click', () => {
                this.showItemDetails(id);
                $$('.inventory-slot').forEach(s => s.classList.remove('selected'));
                slot.classList.add('selected');
            });

            grid.appendChild(slot);
        });
    }

    /**
     * Show item details
     * @param {string} itemId - Item ID
     */
    showItemDetails(itemId) {
        const details = $('#item-details');
        if (!details) return;

        // Get item data (would come from item definitions)
        details.innerHTML = `
            <div class="item-details-content">
                <h3>${itemId}</h3>
                <p class="item-type">Item</p>
                <p class="item-description">Item description would go here.</p>
            </div>
        `;
    }

    /**
     * Populate journal
     */
    populateJournal() {
        this.switchJournalTab('story');
    }

    /**
     * Switch journal tab
     * @param {string} tab - Tab name
     */
    switchJournalTab(tab) {
        // Update tab buttons
        $$('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        const content = $('#journal-content-area');
        if (!content) return;

        switch (tab) {
            case 'story':
                this.renderStoryEntries(content);
                break;
            case 'characters':
                this.renderCharacterEntries(content);
                break;
            case 'items':
                this.renderItemEntries(content);
                break;
        }
    }

    /**
     * Render story entries
     * @param {Element} container
     */
    renderStoryEntries(container) {
        const entries = this.game?.state?.getJournalEntries() || [];
        
        if (entries.length === 0) {
            container.innerHTML = '<p class="empty-message">No story entries yet.</p>';
            return;
        }

        container.innerHTML = entries.map(entry => `
            <div class="story-entry">
                <div class="entry-chapter">${entry.chapter || 'Prologue'}</div>
                <div class="entry-title">${entry.title || 'Entry'}</div>
                <div class="entry-summary">${entry.summary || ''}</div>
            </div>
        `).join('');
    }

    /**
     * Render character entries
     * @param {Element} container
     */
    renderCharacterEntries(container) {
        const characters = this.game?.state?.getDiscoveredCharacters() || [];
        
        if (characters.length === 0) {
            container.innerHTML = '<p class="empty-message">No characters discovered yet.</p>';
            return;
        }

        container.innerHTML = characters.map(char => `
            <div class="character-entry">
                <div class="character-portrait" style="background: #333;"></div>
                <div class="character-info">
                    <div class="character-name">${char.name || char.id}</div>
                    <div class="character-role">${char.role || ''}</div>
                    <div class="character-description">${char.description || ''}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render item entries
     * @param {Element} container
     */
    renderItemEntries(container) {
        const inventory = this.game?.state?.getInventory() || [];
        
        if (inventory.length === 0) {
            container.innerHTML = '<p class="empty-message">No items collected yet.</p>';
            return;
        }

        container.innerHTML = inventory.map(item => `
            <div class="item-entry">
                <span class="item-icon">📦</span>
                <span class="item-name">${item.id}</span>
                <span class="item-count">x${item.quantity}</span>
            </div>
        `).join('');
    }

    /**
     * Apply settings to game
     * @param {Object} settings
     */
    applySettings(settings) {
        // Apply text size
        document.body.classList.remove('text-small', 'text-large');
        if (settings.textSize === 'small') {
            document.body.classList.add('text-small');
        } else if (settings.textSize === 'large') {
            document.body.classList.add('text-large');
        }

        // Apply accessibility settings
        document.body.classList.toggle('dyslexia-font', settings.dyslexiaFont);
        document.body.classList.toggle('high-contrast', settings.highContrast);
        document.body.classList.toggle('reduce-motion', settings.reduceMotion);

        // Apply audio settings
        this.events.emit(GameEvents.SETTINGS_CHANGE, settings);
    }

    /**
     * Populate settings form with values
     * @param {Object} settings
     */
    populateSettingsForm(settings) {
        const setInput = (id, value) => {
            const input = $(`#${id}`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = value;
                } else if (input.type === 'range') {
                    input.value = value;
                    const display = input.nextElementSibling;
                    if (display) display.textContent = `${value}%`;
                } else {
                    input.value = value;
                }
            }
        };

        setInput('master-volume', settings.masterVolume ?? 80);
        setInput('music-volume', settings.musicVolume ?? 70);
        setInput('sfx-volume', settings.sfxVolume ?? 80);
        setInput('voice-volume', settings.voiceVolume ?? 90);
        setInput('text-speed', settings.textSpeed ?? 'normal');
        setInput('text-size', settings.textSize ?? 'normal');
        setInput('screen-shake', settings.screenEffects ?? true);
        setInput('dyslexia-font', settings.dyslexiaFont ?? false);
        setInput('high-contrast', settings.highContrast ?? false);
        setInput('reduce-motion', settings.reduceMotion ?? false);
    }

    /**
     * Save settings from form
     */
    saveSettings() {
        const getValue = (id) => {
            const input = $(`#${id}`);
            if (!input) return null;
            if (input.type === 'checkbox') return input.checked;
            if (input.type === 'range') return parseInt(input.value);
            return input.value;
        };

        const settings = {
            masterVolume: getValue('master-volume'),
            musicVolume: getValue('music-volume'),
            sfxVolume: getValue('sfx-volume'),
            voiceVolume: getValue('voice-volume'),
            textSpeed: getValue('text-speed'),
            textSize: getValue('text-size'),
            screenEffects: getValue('screen-shake'),
            dyslexiaFont: getValue('dyslexia-font'),
            highContrast: getValue('high-contrast'),
            reduceMotion: getValue('reduce-motion')
        };

        this.settings = settings;
        this.applySettings(settings);
        this.game?.saves?.saveSettings(settings);
    }

    /**
     * Show notification toast
     * @param {string} message
     * @param {string} type - 'info', 'success', 'warning', 'error'
     */
    showNotification(message, type = 'info') {
        const container = $('#notification-container');
        if (!container) return;

        const notification = createElement('div', {
            className: `notification ${type}`
        });
        notification.textContent = message;

        container.appendChild(notification);

        // Auto-remove after delay
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Play button click sound
     */
    playButtonSound() {
        this.events.emit(GameEvents.SFX_PLAY, {
            sound: 'ui_click',
            volume: 0.3
        });
    }

    /**
     * Update UI elements
     * @param {number} deltaTime
     */
    update(deltaTime) {
        // UI updates if needed
    }

    /**
     * Cleanup
     */
    destroy() {
        this.closeActiveOverlay();
    }
}

export default UIManager;
