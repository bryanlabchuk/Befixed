/**
 * DialogueRenderer - Handles dialogue display with typewriter effects
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from '../utils/EventEmitter.js';
import { wait, parseTextFormatting, escapeHtml } from '../utils/helpers.js';

export class DialogueRenderer {
    constructor() {
        this.events = globalEvents;
        
        // DOM elements
        this.container = null;
        this.textElement = null;
        this.speakerElement = null;
        this.indicatorElement = null;
        this.portraitElement = null;
        
        // State
        this.isTyping = false;
        this.isComplete = false;
        this.currentText = '';
        this.displayedText = '';
        this.charIndex = 0;
        this.skipRequested = false;
        
        // Settings
        this.textSpeeds = {
            slow: 60,
            normal: 35,
            fast: 15,
            instant: 0
        };
        this.currentSpeed = 'normal';
        this.punctuationPause = 150;
        
        // Audio
        this.typeSound = null;
        this.voiceLine = null;
    }

    /**
     * Initialize the dialogue renderer
     */
    init() {
        // Cache DOM elements
        this.container = document.getElementById('dialogue-container');
        this.textElement = document.getElementById('dialogue-text');
        this.speakerElement = document.querySelector('.speaker-name');
        this.indicatorElement = document.getElementById('dialogue-indicator');
        
        // Create portrait element if needed
        this.createPortraitElement();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('DialogueRenderer initialized');
    }

    /**
     * Create portrait element
     */
    createPortraitElement() {
        const dialogueBox = this.container?.querySelector('.dialogue-box');
        if (dialogueBox && !document.querySelector('.dialogue-portrait')) {
            this.portraitElement = document.createElement('div');
            this.portraitElement.className = 'dialogue-portrait';
            this.portraitElement.style.display = 'none';
            dialogueBox.insertBefore(this.portraitElement, dialogueBox.firstChild);
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Click to advance/skip
        this.container?.addEventListener('click', () => {
            if (this.isTyping) {
                this.skipRequested = true;
            } else if (this.isComplete) {
                this.events.emit(GameEvents.DIALOGUE_SKIP);
            }
        });

        // Keyboard handling (space/enter to advance)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                if (!this.container?.classList.contains('dialogue-hidden')) {
                    e.preventDefault();
                    if (this.isTyping) {
                        this.skipRequested = true;
                    } else if (this.isComplete) {
                        this.events.emit(GameEvents.DIALOGUE_SKIP);
                    }
                }
            }
        });
    }

    /**
     * Set text speed
     * @param {string} speed - Speed setting (slow/normal/fast/instant)
     */
    setTextSpeed(speed) {
        if (this.textSpeeds.hasOwnProperty(speed)) {
            this.currentSpeed = speed;
        }
    }

    /**
     * Show dialogue
     * @param {Object} dialogueData - Dialogue data
     */
    async show(dialogueData) {
        const { speaker, text, portrait, emotion, voice } = dialogueData;
        
        // Show container
        this.container?.classList.remove('dialogue-hidden');
        
        // Set speaker
        this.setSpeaker(speaker);
        
        // Set portrait if provided
        if (portrait) {
            this.setPortrait(portrait);
        } else {
            this.hidePortrait();
        }
        
        // Hide indicator
        this.indicatorElement?.classList.remove('visible');
        
        // Reset state
        this.currentText = text;
        this.displayedText = '';
        this.charIndex = 0;
        this.isComplete = false;
        this.skipRequested = false;
        
        // Start typing
        this.events.emit(GameEvents.DIALOGUE_START, dialogueData);
        await this.typeText(text);
        
        // Show indicator
        this.indicatorElement?.classList.add('visible');
        this.isComplete = true;
        
        this.events.emit(GameEvents.DIALOGUE_LINE, {
            speaker,
            text,
            complete: true
        });
    }

    /**
     * Type text with animation
     * @param {string} text - Text to type
     */
    async typeText(text) {
        this.isTyping = true;
        
        const speed = this.textSpeeds[this.currentSpeed];
        
        // If instant, show all text immediately
        if (speed === 0) {
            this.displayFullText(text);
            this.isTyping = false;
            return;
        }

        // Process text for special tags
        const processedText = this.processText(text);
        
        // Type character by character
        for (let i = 0; i < processedText.length; i++) {
            if (this.skipRequested) {
                this.displayFullText(text);
                this.skipRequested = false;
                break;
            }

            const char = processedText[i];
            
            // Handle special characters in HTML
            if (char === '<') {
                // Find closing tag
                const closeIndex = processedText.indexOf('>', i);
                if (closeIndex !== -1) {
                    const tag = processedText.substring(i, closeIndex + 1);
                    this.displayedText += tag;
                    i = closeIndex;
                    this.updateTextDisplay();
                    continue;
                }
            }

            this.displayedText += char;
            this.updateTextDisplay();
            
            // Play typing sound
            this.playTypeSound();
            
            // Calculate delay
            let delay = speed;
            
            // Add pause for punctuation
            if (['.', '!', '?'].includes(char)) {
                delay += this.punctuationPause;
            } else if ([',', ';', ':'].includes(char)) {
                delay += this.punctuationPause / 2;
            }

            await wait(delay);
        }

        this.isTyping = false;
    }

    /**
     * Display full text immediately
     * @param {string} text - Text to display
     */
    displayFullText(text) {
        const processedText = this.processText(text);
        this.displayedText = processedText;
        this.updateTextDisplay();
    }

    /**
     * Process text for formatting
     * @param {string} text - Raw text
     * @returns {string} Processed HTML
     */
    processText(text) {
        // First escape HTML entities
        let processed = text;
        
        // Parse inline formatting
        processed = processed
            .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-emphasis">$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\[magic\](.*?)\[\/magic\]/gi, '<span class="text-magic">$1</span>')
            .replace(/\[whisper\](.*?)\[\/whisper\]/gi, '<span class="text-whisper">$1</span>')
            .replace(/\[loud\](.*?)\[\/loud\]/gi, '<span class="text-loud">$1</span>')
            .replace(/\[thought\](.*?)\[\/thought\]/gi, '<span class="text-thought">$1</span>');
        
        return processed;
    }

    /**
     * Update the text display
     */
    updateTextDisplay() {
        if (this.textElement) {
            this.textElement.innerHTML = this.displayedText;
        }
    }

    /**
     * Set the speaker name
     * @param {string} speaker - Speaker name
     */
    setSpeaker(speaker) {
        if (this.speakerElement) {
            this.speakerElement.textContent = speaker || '';
            this.speakerElement.className = 'speaker-name';
            
            // Add class for special speakers
            if (speaker?.toLowerCase() === 'narrator') {
                this.speakerElement.classList.add('narrator');
            } else if (speaker?.toLowerCase() === 'you' || speaker?.toLowerCase() === 'player') {
                this.speakerElement.classList.add('player');
            }
        }
    }

    /**
     * Set portrait image
     * @param {string} portraitSrc - Portrait image source
     */
    setPortrait(portraitSrc) {
        if (this.portraitElement) {
            this.portraitElement.innerHTML = `<img src="${portraitSrc}" alt="Character portrait">`;
            this.portraitElement.style.display = 'block';
        }
    }

    /**
     * Hide portrait
     */
    hidePortrait() {
        if (this.portraitElement) {
            this.portraitElement.style.display = 'none';
            this.portraitElement.innerHTML = '';
        }
    }

    /**
     * Play typing sound
     */
    playTypeSound() {
        // Emit event for audio system
        this.events.emit(GameEvents.SFX_PLAY, {
            sound: 'type',
            volume: 0.3
        });
    }

    /**
     * Hide dialogue
     */
    hide() {
        this.container?.classList.add('dialogue-hidden');
        this.isTyping = false;
        this.isComplete = false;
        this.displayedText = '';
        
        if (this.textElement) {
            this.textElement.innerHTML = '';
        }
        if (this.speakerElement) {
            this.speakerElement.textContent = '';
        }
        this.hidePortrait();
        
        this.events.emit(GameEvents.DIALOGUE_COMPLETE);
    }

    /**
     * Skip current typing animation
     */
    skip() {
        if (this.isTyping) {
            this.skipRequested = true;
        }
    }

    /**
     * Check if dialogue is visible
     * @returns {boolean}
     */
    isVisible() {
        return !this.container?.classList.contains('dialogue-hidden');
    }

    /**
     * Check if ready for next line
     * @returns {boolean}
     */
    isReady() {
        return this.isComplete && !this.isTyping;
    }

    /**
     * Update (called each frame)
     * @param {number} deltaTime
     */
    update(deltaTime) {
        // Animation updates could go here
    }

    /**
     * Cleanup
     */
    destroy() {
        this.hide();
        this.container = null;
        this.textElement = null;
        this.speakerElement = null;
        this.indicatorElement = null;
    }
}

export default DialogueRenderer;
