/**
 * MechanicalPuzzle - Drag-and-drop assembly puzzle
 * Befixed - Magic & Mechanical Repair Shop
 */

import { PuzzleController } from '../PuzzleController.js';

export class MechanicalPuzzle extends PuzzleController {
    constructor(config) {
        super(config);
        
        this.type = 'mechanical';
        
        // Parts configuration
        this.parts = config.parts || [];
        this.slots = config.slots || [];
        this.solution = config.solution || {}; // { slotId: partId }
        
        // Current state
        this.placedParts = new Map(); // slotId -> partId
        this.partElements = new Map();
        this.slotElements = new Map();
        
        // Drag state
        this.draggedPart = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // Instructions
        this.instructions = config.instructions || [];
        this.currentStep = 0;
    }

    /**
     * Render the puzzle
     */
    async render() {
        if (!this.contentElement) return;

        this.contentElement.innerHTML = `
            <div class="mechanical-puzzle">
                <div class="parts-tray">
                    <h4 class="parts-tray-title">Parts</h4>
                    <div class="parts-grid" id="parts-grid"></div>
                </div>
                
                <div class="assembly-area" id="assembly-area">
                    <div class="assembly-blueprint" id="assembly-blueprint"></div>
                </div>
                
                <div class="instructions-panel">
                    <h4 class="instructions-title">Instructions</h4>
                    <div class="instructions-list" id="instructions-list"></div>
                </div>
            </div>
        `;

        // Render parts
        this.renderParts();
        
        // Render assembly slots
        this.renderSlots();
        
        // Render instructions
        this.renderInstructions();
        
        // Set up drag and drop
        this.setupDragDrop();
    }

    /**
     * Render available parts
     */
    renderParts() {
        const grid = document.getElementById('parts-grid');
        if (!grid) return;

        grid.innerHTML = '';
        
        for (const part of this.parts) {
            const partEl = document.createElement('div');
            partEl.className = 'part-item';
            partEl.dataset.partId = part.id;
            partEl.draggable = true;
            
            if (part.image) {
                partEl.innerHTML = `<img src="${part.image}" alt="${part.name}" draggable="false">`;
            } else {
                partEl.innerHTML = `<span class="part-icon">${part.icon || '⚙️'}</span>`;
            }
            
            partEl.title = part.name;
            
            this.partElements.set(part.id, partEl);
            grid.appendChild(partEl);
        }
    }

    /**
     * Render assembly slots
     */
    renderSlots() {
        const area = document.getElementById('assembly-area');
        if (!area) return;

        for (const slot of this.slots) {
            const slotEl = document.createElement('div');
            slotEl.className = 'assembly-slot';
            slotEl.dataset.slotId = slot.id;
            
            // Position slot
            slotEl.style.left = `${slot.x}%`;
            slotEl.style.top = `${slot.y}%`;
            slotEl.style.width = `${slot.width || 15}%`;
            slotEl.style.height = `${slot.height || 15}%`;
            
            // Add label if present
            if (slot.label) {
                slotEl.title = slot.label;
            }
            
            this.slotElements.set(slot.id, slotEl);
            area.appendChild(slotEl);
        }
    }

    /**
     * Render instructions
     */
    renderInstructions() {
        const list = document.getElementById('instructions-list');
        if (!list) return;

        list.innerHTML = '';
        
        this.instructions.forEach((instruction, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'instruction-step';
            if (index === this.currentStep) {
                stepEl.classList.add('current');
            }
            if (index < this.currentStep) {
                stepEl.classList.add('completed');
            }
            
            stepEl.innerHTML = `
                <span class="step-number">${index + 1}</span>
                <span class="step-text">${instruction}</span>
            `;
            
            list.appendChild(stepEl);
        });
    }

    /**
     * Set up drag and drop functionality
     */
    setupDragDrop() {
        const area = document.getElementById('assembly-area');
        
        // Part drag events
        for (const [partId, partEl] of this.partElements) {
            partEl.addEventListener('dragstart', (e) => this.handleDragStart(e, partId));
            partEl.addEventListener('dragend', (e) => this.handleDragEnd(e));
        }
        
        // Assembly area drop events
        if (area) {
            area.addEventListener('dragover', (e) => this.handleDragOver(e));
            area.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            area.addEventListener('drop', (e) => this.handleDrop(e));
        }
        
        // Slot hover effects
        for (const [slotId, slotEl] of this.slotElements) {
            slotEl.addEventListener('dragenter', (e) => this.handleSlotEnter(e, slotId));
            slotEl.addEventListener('dragleave', (e) => this.handleSlotLeave(e, slotId));
        }
    }

    /**
     * Handle drag start
     */
    handleDragStart(e, partId) {
        // Check if part is already placed
        if (this.isPartPlaced(partId)) {
            e.preventDefault();
            return;
        }
        
        this.draggedPart = partId;
        e.target.classList.add('dragging');
        
        // Set drag image
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', partId);
    }

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedPart = null;
        
        // Remove all slot highlights
        for (const slotEl of this.slotElements.values()) {
            slotEl.classList.remove('highlight');
        }
    }

    /**
     * Handle drag over assembly area
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
    }

    /**
     * Handle drag leave assembly area
     */
    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    /**
     * Handle slot enter
     */
    handleSlotEnter(e, slotId) {
        const slotEl = this.slotElements.get(slotId);
        if (slotEl && !this.placedParts.has(slotId)) {
            slotEl.classList.add('highlight');
        }
    }

    /**
     * Handle slot leave
     */
    handleSlotLeave(e, slotId) {
        const slotEl = this.slotElements.get(slotId);
        if (slotEl) {
            slotEl.classList.remove('highlight');
        }
    }

    /**
     * Handle drop
     */
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        if (!this.draggedPart) return;
        
        // Find the closest slot
        const slotId = this.findClosestSlot(e);
        
        if (slotId && !this.placedParts.has(slotId)) {
            this.placePart(this.draggedPart, slotId);
        }
    }

    /**
     * Find the closest slot to drop position
     */
    findClosestSlot(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        let closest = null;
        let minDist = Infinity;
        
        for (const slot of this.slots) {
            if (this.placedParts.has(slot.id)) continue;
            
            const centerX = slot.x + (slot.width || 15) / 2;
            const centerY = slot.y + (slot.height || 15) / 2;
            const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            
            if (dist < minDist && dist < 20) { // Within 20% radius
                minDist = dist;
                closest = slot.id;
            }
        }
        
        return closest;
    }

    /**
     * Place a part in a slot
     */
    placePart(partId, slotId) {
        // Mark part as placed
        this.placedParts.set(slotId, partId);
        
        // Update part visual
        const partEl = this.partElements.get(partId);
        if (partEl) {
            partEl.classList.add('placed');
            partEl.draggable = false;
        }
        
        // Update slot visual
        const slotEl = this.slotElements.get(slotId);
        if (slotEl) {
            slotEl.classList.remove('highlight');
            
            // Check if correct
            const isCorrect = this.solution[slotId] === partId;
            slotEl.classList.add(isCorrect ? 'filled' : 'incorrect');
            
            // Copy part visual to slot
            const part = this.parts.find(p => p.id === partId);
            if (part) {
                if (part.image) {
                    slotEl.innerHTML = `<img src="${part.image}" alt="${part.name}" style="width: 100%; height: 100%; object-fit: contain;">`;
                } else {
                    slotEl.innerHTML = `<span style="font-size: 2em;">${part.icon || '⚙️'}</span>`;
                }
            }
        }
        
        // Advance instruction step
        this.advanceStep();
        
        // Report progress
        this.reportProgress(this.placedParts.size / this.slots.length);
        
        // Play sound
        this.events.emit('sfx:play', { sound: 'place_part' });
        
        // Check if all slots filled
        if (this.placedParts.size === this.slots.length) {
            // Auto-submit if all parts placed
            setTimeout(() => this.submit(), 500);
        }
    }

    /**
     * Check if a part is already placed
     */
    isPartPlaced(partId) {
        for (const placed of this.placedParts.values()) {
            if (placed === partId) return true;
        }
        return false;
    }

    /**
     * Advance to next instruction step
     */
    advanceStep() {
        if (this.currentStep < this.instructions.length - 1) {
            this.currentStep++;
            this.renderInstructions();
        }
    }

    /**
     * Get the current solution state
     */
    getSolution() {
        return Object.fromEntries(this.placedParts);
    }

    /**
     * Validate the solution
     */
    validateSolution(solution) {
        // Check if all slots have correct parts
        for (const [slotId, correctPartId] of Object.entries(this.solution)) {
            if (solution[slotId] !== correctPartId) {
                return false;
            }
        }
        return true;
    }

    /**
     * Reset the puzzle
     */
    reset() {
        this.placedParts.clear();
        this.currentStep = 0;
        
        // Reset part visuals
        for (const partEl of this.partElements.values()) {
            partEl.classList.remove('placed');
            partEl.draggable = true;
        }
        
        // Reset slot visuals
        for (const slotEl of this.slotElements.values()) {
            slotEl.classList.remove('filled', 'incorrect', 'highlight');
            slotEl.innerHTML = '';
        }
        
        this.renderInstructions();
        
        super.reset();
    }
}

export default MechanicalPuzzle;
