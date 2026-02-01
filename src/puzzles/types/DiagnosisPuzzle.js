/**
 * DiagnosisPuzzle - Deduction puzzle for examining items
 * Befixed - Magic & Mechanical Repair Shop
 */

import { PuzzleController } from '../PuzzleController.js';

export class DiagnosisPuzzle extends PuzzleController {
    constructor(config) {
        super(config);
        
        this.type = 'diagnosis';
        
        // Item to diagnose
        this.itemImage = config.itemImage || '';
        this.itemName = config.itemName || 'Unknown Item';
        
        // Examination tools
        this.tools = config.tools || [
            { id: 'visual', name: 'Visual Inspection', icon: '👁️' },
            { id: 'magical', name: 'Magic Detection', icon: '✨' },
            { id: 'mechanical', name: 'Gear Check', icon: '⚙️' }
        ];
        
        // Hotspots on the item
        this.hotspots = config.hotspots || [];
        
        // Possible diagnoses
        this.diagnoses = config.diagnoses || [];
        this.correctDiagnosis = config.correctDiagnosis || '';
        
        // Current state
        this.activeTool = null;
        this.examinedHotspots = new Set();
        this.findings = [];
        this.selectedDiagnosis = null;
    }

    /**
     * Render the puzzle
     */
    async render() {
        if (!this.contentElement) return;

        this.contentElement.innerHTML = `
            <div class="diagnosis-puzzle">
                <div class="examination-area" id="examination-area">
                    <div class="item-display">
                        <img src="${this.itemImage}" alt="${this.itemName}" id="diagnosis-item">
                    </div>
                </div>
                
                <div class="diagnosis-sidebar">
                    <div class="diagnostic-tools" id="diagnostic-tools"></div>
                    
                    <div class="findings-panel">
                        <h4 class="findings-title">Findings</h4>
                        <div class="findings-list" id="findings-list">
                            <p class="no-findings">Examine the item to find clues...</p>
                        </div>
                    </div>
                    
                    <div class="diagnosis-options" id="diagnosis-options">
                        <h4>Select Diagnosis:</h4>
                    </div>
                </div>
            </div>
        `;

        this.renderTools();
        this.renderHotspots();
        this.renderDiagnoses();
    }

    /**
     * Render diagnostic tools
     */
    renderTools() {
        const container = document.getElementById('diagnostic-tools');
        if (!container) return;

        container.innerHTML = '';

        for (const tool of this.tools) {
            const toolEl = document.createElement('div');
            toolEl.className = 'tool-item';
            toolEl.dataset.toolId = tool.id;
            
            if (this.activeTool === tool.id) {
                toolEl.classList.add('active');
            }

            toolEl.innerHTML = `
                <span class="tool-icon">${tool.icon}</span>
                <span class="tool-name">${tool.name}</span>
            `;

            toolEl.addEventListener('click', () => this.selectTool(tool.id));
            container.appendChild(toolEl);
        }
    }

    /**
     * Render examination hotspots
     */
    renderHotspots() {
        const area = document.getElementById('examination-area');
        if (!area) return;

        for (const hotspot of this.hotspots) {
            const hotspotEl = document.createElement('div');
            hotspotEl.className = 'exam-hotspot';
            hotspotEl.dataset.hotspotId = hotspot.id;
            
            if (this.examinedHotspots.has(hotspot.id)) {
                hotspotEl.classList.add('examined');
            }

            // Position hotspot
            hotspotEl.style.left = `${hotspot.x}%`;
            hotspotEl.style.top = `${hotspot.y}%`;

            hotspotEl.addEventListener('click', () => this.examineHotspot(hotspot));
            area.appendChild(hotspotEl);
        }
    }

    /**
     * Render diagnosis options
     */
    renderDiagnoses() {
        const container = document.getElementById('diagnosis-options');
        if (!container) return;

        // Keep the title
        container.innerHTML = '<h4>Select Diagnosis:</h4>';

        for (const diagnosis of this.diagnoses) {
            const optionEl = document.createElement('button');
            optionEl.className = 'diagnosis-option';
            optionEl.dataset.diagnosisId = diagnosis.id;
            
            if (this.selectedDiagnosis === diagnosis.id) {
                optionEl.classList.add('selected');
            }

            optionEl.textContent = diagnosis.name;
            optionEl.addEventListener('click', () => this.selectDiagnosis(diagnosis.id));
            container.appendChild(optionEl);
        }
    }

    /**
     * Select a diagnostic tool
     */
    selectTool(toolId) {
        this.activeTool = this.activeTool === toolId ? null : toolId;
        this.renderTools();
        
        // Update cursor style
        const area = document.getElementById('examination-area');
        if (area) {
            area.style.cursor = this.activeTool ? 'crosshair' : 'default';
        }

        this.playSound('tool_select');
    }

    /**
     * Examine a hotspot
     */
    examineHotspot(hotspot) {
        if (!this.activeTool) {
            this.showNotification('Select a tool first');
            return;
        }

        // Check if this tool can examine this hotspot
        const toolFindings = hotspot.findings?.[this.activeTool];
        
        if (!toolFindings) {
            this.showNotification('Nothing unusual found with this tool');
            return;
        }

        // Mark as examined
        this.examinedHotspots.add(hotspot.id);

        // Add finding
        this.findings.push({
            hotspotId: hotspot.id,
            toolId: this.activeTool,
            finding: toolFindings
        });

        // Update UI
        this.updateHotspotVisual(hotspot.id);
        this.updateFindings();

        // Calculate progress
        const totalExaminable = this.hotspots.filter(h => 
            Object.values(h.findings || {}).some(f => f)
        ).length;
        this.reportProgress(this.examinedHotspots.size / Math.max(totalExaminable, 1));

        this.playSound('examine');
    }

    /**
     * Update hotspot visual after examination
     */
    updateHotspotVisual(hotspotId) {
        const hotspotEl = document.querySelector(`[data-hotspot-id="${hotspotId}"]`);
        if (hotspotEl) {
            hotspotEl.classList.add('examined');
        }
    }

    /**
     * Update findings display
     */
    updateFindings() {
        const container = document.getElementById('findings-list');
        if (!container) return;

        if (this.findings.length === 0) {
            container.innerHTML = '<p class="no-findings">Examine the item to find clues...</p>';
            return;
        }

        container.innerHTML = '';

        for (const finding of this.findings) {
            const tool = this.tools.find(t => t.id === finding.toolId);
            const findingEl = document.createElement('div');
            findingEl.className = 'finding-item';
            findingEl.innerHTML = `
                <span class="finding-tool">${tool?.icon || '🔍'}</span>
                <span class="finding-text">${finding.finding}</span>
            `;
            container.appendChild(findingEl);
        }
    }

    /**
     * Select a diagnosis
     */
    selectDiagnosis(diagnosisId) {
        this.selectedDiagnosis = diagnosisId;
        this.renderDiagnoses();
        this.playSound('select');
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
        return {
            diagnosis: this.selectedDiagnosis,
            findings: [...this.findings]
        };
    }

    /**
     * Validate the solution
     */
    validateSolution(solution) {
        return solution.diagnosis === this.correctDiagnosis;
    }

    /**
     * Reset the puzzle
     */
    reset() {
        this.activeTool = null;
        this.examinedHotspots.clear();
        this.findings = [];
        this.selectedDiagnosis = null;
        
        // Re-render
        this.render();
        
        super.reset();
    }
}

export default DiagnosisPuzzle;
