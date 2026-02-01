/**
 * ResonancePuzzle - Audio-based magical resonance puzzle
 * Befixed - Magic & Mechanical Repair Shop
 */

import { PuzzleController } from '../PuzzleController.js';

export class ResonancePuzzle extends PuzzleController {
    constructor(config) {
        super(config);
        
        this.type = 'resonance';
        
        // Target frequencies/pattern
        this.targetPattern = config.targetPattern || [440, 523, 659, 784]; // A4, C5, E5, G5
        this.tolerance = config.tolerance || 20; // Hz tolerance
        
        // Dial configuration
        this.dials = config.dials || [
            { id: 'frequency', label: 'Frequency', min: 200, max: 1000, step: 10 },
            { id: 'amplitude', label: 'Amplitude', min: 0, max: 100, step: 5 },
            { id: 'phase', label: 'Phase', min: 0, max: 360, step: 15 }
        ];
        
        // Current values
        this.dialValues = {};
        this.dials.forEach(dial => {
            this.dialValues[dial.id] = (dial.min + dial.max) / 2;
        });
        
        // Audio state
        this.audioContext = null;
        this.oscillator = null;
        this.gainNode = null;
        this.isPlaying = false;
        
        // Pattern state
        this.currentNote = 0;
        this.matchedNotes = [];
    }

    /**
     * Render the puzzle
     */
    async render() {
        if (!this.contentElement) return;

        this.contentElement.innerHTML = `
            <div class="resonance-puzzle">
                <div class="resonance-visualizer" id="resonance-visualizer">
                    <div class="resonance-ring"></div>
                    <div class="resonance-ring"></div>
                    <div class="resonance-ring"></div>
                    <div class="resonance-core" id="resonance-core"></div>
                </div>
                
                <div class="target-pattern" id="target-pattern"></div>
                
                <div class="tuning-controls" id="tuning-controls"></div>
                
                <div class="resonance-actions">
                    <button class="puzzle-btn" id="btn-play-tone">
                        🔊 Play Current Tone
                    </button>
                    <button class="puzzle-btn" id="btn-play-target">
                        🎵 Play Target Note
                    </button>
                    <button class="puzzle-btn primary" id="btn-lock-note">
                        🔒 Lock Note
                    </button>
                </div>
                
                <div class="frequency-display">
                    Current: <span id="current-frequency">440</span> Hz
                </div>
            </div>
        `;

        this.renderTargetPattern();
        this.renderDials();
        this.setupAudio();
        this.setupEventListeners();
    }

    /**
     * Render target pattern display
     */
    renderTargetPattern() {
        const container = document.getElementById('target-pattern');
        if (!container) return;

        container.innerHTML = '';

        for (let i = 0; i < this.targetPattern.length; i++) {
            const noteEl = document.createElement('div');
            noteEl.className = 'pattern-note';
            noteEl.dataset.index = i;
            
            if (this.matchedNotes.includes(i)) {
                noteEl.classList.add('active');
            }
            
            container.appendChild(noteEl);
        }
    }

    /**
     * Render tuning dials
     */
    renderDials() {
        const container = document.getElementById('tuning-controls');
        if (!container) return;

        container.innerHTML = '';

        for (const dial of this.dials) {
            const dialEl = document.createElement('div');
            dialEl.className = 'tuning-dial';
            
            const rotation = this.valueToRotation(
                this.dialValues[dial.id],
                dial.min,
                dial.max
            );

            dialEl.innerHTML = `
                <span class="dial-label">${dial.label}</span>
                <div class="dial-control" data-dial-id="${dial.id}">
                    <div class="dial-indicator" style="transform: translateX(-50%) rotate(${rotation}deg)"></div>
                </div>
                <span class="dial-value">${this.dialValues[dial.id]}</span>
            `;

            container.appendChild(dialEl);
        }

        // Set up dial interactions
        this.setupDialInteractions();
    }

    /**
     * Convert value to dial rotation
     */
    valueToRotation(value, min, max) {
        const percent = (value - min) / (max - min);
        return -135 + (percent * 270); // -135 to 135 degrees
    }

    /**
     * Set up dial drag interactions
     */
    setupDialInteractions() {
        const dials = document.querySelectorAll('.dial-control');
        
        dials.forEach(dialEl => {
            let isDragging = false;
            let startY = 0;
            let startValue = 0;

            const dialId = dialEl.dataset.dialId;
            const dialConfig = this.dials.find(d => d.id === dialId);

            const handleStart = (e) => {
                isDragging = true;
                startY = e.clientY || e.touches?.[0]?.clientY || 0;
                startValue = this.dialValues[dialId];
                e.preventDefault();
            };

            const handleMove = (e) => {
                if (!isDragging) return;
                
                const currentY = e.clientY || e.touches?.[0]?.clientY || 0;
                const delta = startY - currentY;
                const range = dialConfig.max - dialConfig.min;
                const valueChange = (delta / 100) * range;
                
                let newValue = startValue + valueChange;
                newValue = Math.round(newValue / dialConfig.step) * dialConfig.step;
                newValue = Math.max(dialConfig.min, Math.min(dialConfig.max, newValue));
                
                this.dialValues[dialId] = newValue;
                this.updateDialDisplay(dialId, newValue, dialConfig);
                this.updateFrequencyDisplay();
            };

            const handleEnd = () => {
                isDragging = false;
            };

            dialEl.addEventListener('mousedown', handleStart);
            dialEl.addEventListener('touchstart', handleStart);
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('touchmove', handleMove);
            document.addEventListener('mouseup', handleEnd);
            document.addEventListener('touchend', handleEnd);
        });
    }

    /**
     * Update dial display
     */
    updateDialDisplay(dialId, value, config) {
        const dialContainer = document.querySelector(`[data-dial-id="${dialId}"]`);
        if (!dialContainer) return;

        const indicator = dialContainer.querySelector('.dial-indicator');
        const valueDisplay = dialContainer.parentElement.querySelector('.dial-value');

        const rotation = this.valueToRotation(value, config.min, config.max);
        indicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        valueDisplay.textContent = value;
    }

    /**
     * Update frequency display
     */
    updateFrequencyDisplay() {
        const display = document.getElementById('current-frequency');
        if (display) {
            display.textContent = this.dialValues.frequency || 440;
        }
    }

    /**
     * Set up audio context
     */
    setupAudio() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.gainNode.gain.value = 0;
        } catch (error) {
            console.warn('Web Audio not supported:', error);
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        document.getElementById('btn-play-tone')?.addEventListener('click', () => {
            this.playCurrentTone();
        });

        document.getElementById('btn-play-target')?.addEventListener('click', () => {
            this.playTargetNote();
        });

        document.getElementById('btn-lock-note')?.addEventListener('click', () => {
            this.lockNote();
        });
    }

    /**
     * Play the current frequency
     */
    playCurrentTone() {
        if (!this.audioContext) return;

        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Stop existing oscillator
        if (this.oscillator) {
            this.oscillator.stop();
        }

        // Create new oscillator
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.frequency.value = this.dialValues.frequency || 440;
        this.oscillator.connect(this.gainNode);

        // Fade in
        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(
            (this.dialValues.amplitude || 50) / 100 * 0.3,
            this.audioContext.currentTime + 0.1
        );

        this.oscillator.start();
        this.isPlaying = true;

        // Animate core
        const core = document.getElementById('resonance-core');
        if (core) core.classList.add('active');

        // Stop after 2 seconds
        setTimeout(() => {
            this.stopTone();
        }, 2000);
    }

    /**
     * Play the target note
     */
    playTargetNote() {
        if (!this.audioContext || this.currentNote >= this.targetPattern.length) return;

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        if (this.oscillator) {
            this.oscillator.stop();
        }

        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.frequency.value = this.targetPattern[this.currentNote];
        this.oscillator.connect(this.gainNode);

        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);

        this.oscillator.start();

        setTimeout(() => {
            this.stopTone();
        }, 1500);
    }

    /**
     * Stop playing tone
     */
    stopTone() {
        if (this.oscillator) {
            this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
            setTimeout(() => {
                if (this.oscillator) {
                    this.oscillator.stop();
                    this.oscillator = null;
                }
            }, 100);
        }

        this.isPlaying = false;

        const core = document.getElementById('resonance-core');
        if (core) core.classList.remove('active');
    }

    /**
     * Lock in the current note
     */
    lockNote() {
        if (this.currentNote >= this.targetPattern.length) return;

        const targetFreq = this.targetPattern[this.currentNote];
        const currentFreq = this.dialValues.frequency || 440;
        const diff = Math.abs(targetFreq - currentFreq);

        if (diff <= this.tolerance) {
            // Correct!
            this.matchedNotes.push(this.currentNote);
            this.currentNote++;
            
            this.renderTargetPattern();
            this.playSound('note_locked');
            
            this.reportProgress(this.currentNote / this.targetPattern.length);

            // Check if all notes matched
            if (this.currentNote >= this.targetPattern.length) {
                setTimeout(() => this.complete(), 500);
            }
        } else {
            // Wrong frequency
            this.showFeedback(false, `Off by ${diff.toFixed(0)} Hz`);
            this.playSound('note_wrong');
        }
    }

    /**
     * Play sound effect
     */
    playSound(sound) {
        this.events.emit('sfx:play', { sound, volume: 0.5 });
    }

    /**
     * Get solution
     */
    getSolution() {
        return this.matchedNotes;
    }

    /**
     * Validate solution
     */
    validateSolution(solution) {
        return solution.length === this.targetPattern.length;
    }

    /**
     * Reset puzzle
     */
    reset() {
        this.currentNote = 0;
        this.matchedNotes = [];
        
        // Reset dial values
        this.dials.forEach(dial => {
            this.dialValues[dial.id] = (dial.min + dial.max) / 2;
        });
        
        this.stopTone();
        
        super.reset();
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopTone();
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        super.destroy();
    }
}

export default ResonancePuzzle;
