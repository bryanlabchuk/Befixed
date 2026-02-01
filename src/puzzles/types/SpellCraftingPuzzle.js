/**
 * SpellCraftingPuzzle - Pattern matching and ingredient combining puzzle
 * Befixed - Magic & Mechanical Repair Shop
 */

import { PuzzleController } from '../PuzzleController.js';

export class SpellCraftingPuzzle extends PuzzleController {
    constructor(config) {
        super(config);
        
        this.type = 'spell-crafting';
        
        // Ingredients
        this.ingredients = config.ingredients || [];
        this.maxIngredients = config.maxIngredients || 5;
        
        // Recipe/solution
        this.recipe = config.recipe || []; // Array of ingredient IDs in order
        this.recipeName = config.recipeName || 'Unknown Spell';
        this.recipeHint = config.recipeHint || 'Mix the correct ingredients...';
        
        // Current state
        this.selectedIngredients = [];
        this.cauldronActive = false;
        
        // Visual effects
        this.bubbles = [];
        this.glowColor = config.glowColor || '#7b68ee';
    }

    /**
     * Render the puzzle
     */
    async render() {
        if (!this.contentElement) return;

        this.contentElement.innerHTML = `
            <div class="spell-puzzle">
                <div class="ingredient-shelf" id="ingredient-shelf"></div>
                
                <div class="cauldron-area">
                    <div class="cauldron" id="cauldron">
                        <div class="cauldron-contents" id="cauldron-contents"></div>
                        <div class="cauldron-bubbles" id="cauldron-bubbles"></div>
                    </div>
                    
                    <div class="selected-ingredients" id="selected-ingredients">
                        <p class="selected-label">Added ingredients:</p>
                        <div class="selected-list" id="selected-list"></div>
                    </div>
                </div>
                
                <div class="recipe-book">
                    <h4 class="recipe-title">${this.recipeName}</h4>
                    <p class="recipe-hint">${this.recipeHint}</p>
                </div>
            </div>
        `;

        this.renderIngredients();
        this.updateSelectedDisplay();
    }

    /**
     * Render ingredient shelf
     */
    renderIngredients() {
        const shelf = document.getElementById('ingredient-shelf');
        if (!shelf) return;

        shelf.innerHTML = '';

        for (const ingredient of this.ingredients) {
            const ingEl = document.createElement('div');
            ingEl.className = 'ingredient';
            ingEl.dataset.ingredientId = ingredient.id;
            
            // Check if already selected
            if (this.selectedIngredients.includes(ingredient.id)) {
                ingEl.classList.add('selected');
            }

            ingEl.innerHTML = `
                ${ingredient.image 
                    ? `<img src="${ingredient.image}" alt="${ingredient.name}">`
                    : `<span class="ingredient-icon">${ingredient.icon || '🧪'}</span>`
                }
                <span class="ingredient-name">${ingredient.name}</span>
            `;

            ingEl.addEventListener('click', () => this.toggleIngredient(ingredient.id));
            
            shelf.appendChild(ingEl);
        }
    }

    /**
     * Toggle ingredient selection
     */
    toggleIngredient(ingredientId) {
        const index = this.selectedIngredients.indexOf(ingredientId);
        
        if (index > -1) {
            // Remove ingredient
            this.selectedIngredients.splice(index, 1);
            this.playSound('ingredient_remove');
        } else {
            // Add ingredient (if under limit)
            if (this.selectedIngredients.length >= this.maxIngredients) {
                this.showNotification(`Maximum ${this.maxIngredients} ingredients allowed`);
                return;
            }
            this.selectedIngredients.push(ingredientId);
            this.playSound('ingredient_add');
        }

        this.updateIngredientVisuals();
        this.updateSelectedDisplay();
        this.updateCauldron();
        this.reportProgress(this.selectedIngredients.length / this.recipe.length);
    }

    /**
     * Update ingredient visual states
     */
    updateIngredientVisuals() {
        const shelf = document.getElementById('ingredient-shelf');
        if (!shelf) return;

        const ingredients = shelf.querySelectorAll('.ingredient');
        ingredients.forEach(el => {
            const id = el.dataset.ingredientId;
            if (this.selectedIngredients.includes(id)) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
    }

    /**
     * Update selected ingredients display
     */
    updateSelectedDisplay() {
        const list = document.getElementById('selected-list');
        if (!list) return;

        list.innerHTML = '';

        for (const ingredientId of this.selectedIngredients) {
            const ingredient = this.ingredients.find(i => i.id === ingredientId);
            if (!ingredient) continue;

            const item = document.createElement('span');
            item.className = 'selected-item';
            item.innerHTML = ingredient.icon || '🧪';
            item.title = ingredient.name;
            
            list.appendChild(item);
        }

        if (this.selectedIngredients.length === 0) {
            list.innerHTML = '<span class="empty-message">None selected</span>';
        }
    }

    /**
     * Update cauldron visual state
     */
    updateCauldron() {
        const contents = document.getElementById('cauldron-contents');
        const bubbles = document.getElementById('cauldron-bubbles');
        
        if (this.selectedIngredients.length > 0) {
            this.cauldronActive = true;
            contents?.classList.add('active');
            
            // Change color based on ingredients
            const color = this.calculateMixtureColor();
            if (contents) {
                contents.style.background = color;
            }

            // Add bubbles
            this.addBubbles();
        } else {
            this.cauldronActive = false;
            contents?.classList.remove('active');
            if (bubbles) bubbles.innerHTML = '';
        }
    }

    /**
     * Calculate mixture color based on selected ingredients
     */
    calculateMixtureColor() {
        if (this.selectedIngredients.length === 0) {
            return 'transparent';
        }

        // Get colors from selected ingredients
        const colors = this.selectedIngredients
            .map(id => this.ingredients.find(i => i.id === id)?.color)
            .filter(c => c);

        if (colors.length === 0) {
            return this.glowColor;
        }

        // Mix colors (simple averaging for demonstration)
        // In a real implementation, you might use proper color mixing
        return colors[colors.length - 1] || this.glowColor;
    }

    /**
     * Add bubble animation elements
     */
    addBubbles() {
        const container = document.getElementById('cauldron-bubbles');
        if (!container) return;

        // Add new bubbles periodically
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.style.left = `${20 + Math.random() * 60}%`;
        bubble.style.animationDelay = `${Math.random() * 2}s`;
        
        container.appendChild(bubble);

        // Remove old bubbles
        setTimeout(() => bubble.remove(), 2000);
    }

    /**
     * Play sound effect
     */
    playSound(sound) {
        this.events.emit('sfx:play', { sound, volume: 0.5 });
    }

    /**
     * Get the current solution
     */
    getSolution() {
        return [...this.selectedIngredients];
    }

    /**
     * Validate the solution
     */
    validateSolution(solution) {
        // Check if arrays match exactly (order matters)
        if (solution.length !== this.recipe.length) {
            return false;
        }

        // Check each ingredient
        for (let i = 0; i < this.recipe.length; i++) {
            if (solution[i] !== this.recipe[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Override complete to add magic effects
     */
    async complete() {
        // Add magical completion effect
        const cauldron = document.getElementById('cauldron');
        if (cauldron) {
            cauldron.style.animation = 'magic-burst 1s ease-out';
        }

        // Play success sound
        this.playSound('spell_success');

        await super.complete();
    }

    /**
     * Reset the puzzle
     */
    reset() {
        this.selectedIngredients = [];
        this.cauldronActive = false;
        
        this.updateIngredientVisuals();
        this.updateSelectedDisplay();
        this.updateCauldron();
        
        super.reset();
    }
}

export default SpellCraftingPuzzle;
