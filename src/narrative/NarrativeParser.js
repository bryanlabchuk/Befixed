/**
 * NarrativeParser - Parses chapter content from JSON files
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from '../utils/EventEmitter.js';

export class NarrativeParser {
    constructor(stateManager) {
        this.events = globalEvents;
        this.state = stateManager;
        
        // Cached chapter data
        this.currentChapter = null;
        this.currentScene = null;
        
        // Command handlers
        this.commandHandlers = new Map();
        this.registerDefaultHandlers();
    }

    /**
     * Register default command handlers
     */
    registerDefaultHandlers() {
        // Dialogue command
        this.registerCommand('dialogue', (data, context) => ({
            type: 'dialogue',
            speaker: this.parseVariable(data.speaker, context),
            text: this.parseVariable(data.text, context),
            portrait: data.portrait,
            emotion: data.emotion,
            voice: data.voice
        }));

        // Narration command
        this.registerCommand('narration', (data, context) => ({
            type: 'narration',
            text: this.parseVariable(data.text, context)
        }));

        // Choice command
        this.registerCommand('choice', (data, context) => ({
            type: 'choice',
            prompt: this.parseVariable(data.prompt, context),
            options: data.options.map(opt => ({
                ...opt,
                text: this.parseVariable(opt.text, context),
                available: opt.condition ? this.state.evaluateCondition(opt.condition) : true
            }))
        }));

        // Character command
        this.registerCommand('character', (data) => ({
            type: 'character',
            action: data.action, // enter, exit, move, expression
            character: data.character,
            position: data.position,
            expression: data.expression,
            animation: data.animation
        }));

        // Background command
        this.registerCommand('background', (data) => ({
            type: 'background',
            image: data.image,
            transition: data.transition || 'fade'
        }));

        // Music command
        this.registerCommand('music', (data) => ({
            type: 'music',
            action: data.action, // play, stop, fade
            track: data.track,
            volume: data.volume,
            fadeTime: data.fadeTime
        }));

        // Sound effect command
        this.registerCommand('sfx', (data) => ({
            type: 'sfx',
            sound: data.sound,
            volume: data.volume
        }));

        // Puzzle command
        this.registerCommand('puzzle', (data) => ({
            type: 'puzzle',
            puzzleId: data.puzzleId,
            config: data.config
        }));

        // Flag command
        this.registerCommand('flag', (data) => {
            if (data.set) {
                this.state.setFlag(data.set, true);
            }
            if (data.clear) {
                this.state.clearFlag(data.clear);
            }
            return { type: 'flag', ...data };
        });

        // Variable command
        this.registerCommand('variable', (data) => {
            if (data.set) {
                this.state.setVariable(data.name, data.value);
            }
            if (data.increment) {
                this.state.incrementVariable(data.name, data.amount || 1);
            }
            return { type: 'variable', ...data };
        });

        // Item command
        this.registerCommand('item', (data) => {
            if (data.add) {
                this.state.addItem(data.add, data.quantity || 1);
            }
            if (data.remove) {
                this.state.removeItem(data.remove, data.quantity || 1);
            }
            return { type: 'item', ...data };
        });

        // Jump command (go to different scene/label)
        this.registerCommand('jump', (data) => ({
            type: 'jump',
            target: data.target,
            chapter: data.chapter
        }));

        // Conditional command
        this.registerCommand('if', (data, context) => {
            const conditionMet = this.state.evaluateCondition(data.condition);
            return {
                type: 'conditional',
                result: conditionMet,
                then: conditionMet ? data.then : data.else
            };
        });

        // Wait command
        this.registerCommand('wait', (data) => ({
            type: 'wait',
            duration: data.duration || 1000
        }));

        // Screen effect command
        this.registerCommand('effect', (data) => ({
            type: 'effect',
            effect: data.effect, // shake, flash, fade
            params: data.params
        }));
    }

    /**
     * Register a command handler
     * @param {string} command - Command name
     * @param {Function} handler - Handler function
     */
    registerCommand(command, handler) {
        this.commandHandlers.set(command, handler);
    }

    /**
     * Parse a chapter
     * @param {Object} chapterData - Raw chapter data
     * @returns {Object} Parsed chapter
     */
    parseChapter(chapterData) {
        this.currentChapter = {
            id: chapterData.id,
            number: chapterData.number,
            title: chapterData.title,
            description: chapterData.description,
            scenes: new Map(),
            characters: chapterData.characters || [],
            backgrounds: chapterData.backgrounds || {},
            music: chapterData.music || {},
            variables: chapterData.variables || {}
        };

        // Parse scenes
        if (chapterData.scenes) {
            for (const scene of chapterData.scenes) {
                const parsedScene = this.parseScene(scene);
                this.currentChapter.scenes.set(scene.id, parsedScene);
            }
        }

        return this.currentChapter;
    }

    /**
     * Parse a scene
     * @param {Object} sceneData - Raw scene data
     * @returns {Object} Parsed scene
     */
    parseScene(sceneData) {
        const scene = {
            id: sceneData.id,
            name: sceneData.name || sceneData.id,
            background: sceneData.background,
            music: sceneData.music,
            ambience: sceneData.ambience,
            characters: sceneData.characters || [],
            content: [],
            labels: new Map()
        };

        // Parse content
        if (sceneData.content) {
            for (const item of sceneData.content) {
                // Check for labels
                if (item.label) {
                    scene.labels.set(item.label, scene.content.length);
                }
                
                const parsed = this.parseContent(item);
                if (parsed) {
                    scene.content.push(parsed);
                }
            }
        }

        return scene;
    }

    /**
     * Parse content item
     * @param {Object} content - Content item
     * @returns {Object|null} Parsed content
     */
    parseContent(content) {
        // Get the command type
        const commandType = Object.keys(content).find(key => 
            this.commandHandlers.has(key) || 
            ['label', 'condition'].includes(key) === false
        );

        if (!commandType) {
            // Simple dialogue shorthand
            if (content.speaker && content.text) {
                return this.commandHandlers.get('dialogue')(content, {});
            }
            return null;
        }

        const handler = this.commandHandlers.get(commandType);
        if (handler) {
            const data = typeof content[commandType] === 'object' 
                ? content[commandType] 
                : content;
            
            const parsed = handler(data, { chapter: this.currentChapter });
            
            // Add condition if present
            if (content.condition) {
                parsed.condition = content.condition;
            }
            
            return parsed;
        }

        // Return as-is if no handler found
        return { type: commandType, ...content };
    }

    /**
     * Parse variable references in text
     * @param {string} text - Text with variable references
     * @param {Object} context - Parsing context
     * @returns {string} Parsed text
     */
    parseVariable(text, context = {}) {
        if (typeof text !== 'string') return text;

        return text.replace(/\{(\w+)\}/g, (match, varName) => {
            // Check state variables
            if (this.state.variables.has(varName)) {
                return this.state.getVariable(varName);
            }
            // Check context
            if (context[varName] !== undefined) {
                return context[varName];
            }
            // Check chapter variables
            if (this.currentChapter?.variables?.[varName] !== undefined) {
                return this.currentChapter.variables[varName];
            }
            // Return original if not found
            return match;
        });
    }

    /**
     * Get scene by ID
     * @param {string} sceneId - Scene ID
     * @returns {Object|null}
     */
    getScene(sceneId) {
        return this.currentChapter?.scenes.get(sceneId) || null;
    }

    /**
     * Get content at index
     * @param {string} sceneId - Scene ID
     * @param {number} index - Content index
     * @returns {Object|null}
     */
    getContentAt(sceneId, index) {
        const scene = this.getScene(sceneId);
        if (!scene || index >= scene.content.length) {
            return null;
        }
        return scene.content[index];
    }

    /**
     * Get label index in scene
     * @param {string} sceneId - Scene ID
     * @param {string} label - Label name
     * @returns {number} Index or -1 if not found
     */
    getLabelIndex(sceneId, label) {
        const scene = this.getScene(sceneId);
        return scene?.labels.get(label) ?? -1;
    }

    /**
     * Filter content by condition
     * @param {Array} content - Content array
     * @returns {Array} Filtered content
     */
    filterByCondition(content) {
        return content.filter(item => {
            if (!item.condition) return true;
            return this.state.evaluateCondition(item.condition);
        });
    }

    /**
     * Create a simple dialogue sequence from text
     * @param {Array} lines - Array of dialogue lines
     * @returns {Array} Content array
     */
    createDialogueSequence(lines) {
        return lines.map(line => {
            if (typeof line === 'string') {
                return { type: 'narration', text: line };
            }
            return {
                type: 'dialogue',
                speaker: line.speaker,
                text: line.text,
                portrait: line.portrait
            };
        });
    }

    /**
     * Validate chapter data
     * @param {Object} chapterData - Chapter data to validate
     * @returns {Object} Validation result
     */
    validateChapter(chapterData) {
        const errors = [];
        const warnings = [];

        if (!chapterData.id) {
            errors.push('Missing chapter ID');
        }
        if (!chapterData.scenes || chapterData.scenes.length === 0) {
            errors.push('Chapter has no scenes');
        }

        // Validate scenes
        const sceneIds = new Set();
        for (const scene of (chapterData.scenes || [])) {
            if (!scene.id) {
                errors.push('Scene missing ID');
            } else if (sceneIds.has(scene.id)) {
                errors.push(`Duplicate scene ID: ${scene.id}`);
            } else {
                sceneIds.add(scene.id);
            }

            if (!scene.content || scene.content.length === 0) {
                warnings.push(`Scene "${scene.id}" has no content`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
}

export default NarrativeParser;
