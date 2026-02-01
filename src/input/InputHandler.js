/**
 * InputHandler - Manages keyboard, mouse, and touch input
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from '../utils/EventEmitter.js';

export class InputHandler {
    constructor() {
        this.events = globalEvents;
        
        // Key states
        this.keys = new Map();
        this.keysPressed = new Set();
        this.keysReleased = new Set();
        
        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            buttons: new Set(),
            wheel: 0
        };
        
        // Touch state
        this.touches = new Map();
        
        // Pointer state (unified mouse/touch)
        this.pointer = {
            x: 0,
            y: 0,
            isDown: false,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0
        };
        
        // Configuration
        this.dragThreshold = 5;
        this.enabled = true;
        
        // Key bindings
        this.bindings = new Map();
        this.setupDefaultBindings();
    }

    /**
     * Initialize input handling
     */
    init() {
        this.setupKeyboardListeners();
        this.setupMouseListeners();
        this.setupTouchListeners();
        
        console.log('InputHandler initialized');
    }

    /**
     * Set up default key bindings
     */
    setupDefaultBindings() {
        this.bindings.set('confirm', ['Enter', 'Space']);
        this.bindings.set('cancel', ['Escape', 'Backspace']);
        this.bindings.set('up', ['ArrowUp', 'KeyW']);
        this.bindings.set('down', ['ArrowDown', 'KeyS']);
        this.bindings.set('left', ['ArrowLeft', 'KeyA']);
        this.bindings.set('right', ['ArrowRight', 'KeyD']);
        this.bindings.set('menu', ['Escape', 'Tab']);
        this.bindings.set('inventory', ['KeyI', 'Tab']);
        this.bindings.set('journal', ['KeyJ']);
        this.bindings.set('quickSave', ['F5']);
        this.bindings.set('quickLoad', ['F9']);
    }

    /**
     * Set up keyboard listeners
     */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;
            
            const code = e.code;
            
            if (!this.keys.get(code)) {
                this.keysPressed.add(code);
            }
            
            this.keys.set(code, true);
            
            this.events.emit(GameEvents.INPUT_KEY, {
                type: 'down',
                code,
                key: e.key,
                shift: e.shiftKey,
                ctrl: e.ctrlKey,
                alt: e.altKey
            });
            
            // Check for bound actions
            this.checkBindings(code, 'down');
        });

        document.addEventListener('keyup', (e) => {
            if (!this.enabled) return;
            
            const code = e.code;
            
            this.keys.set(code, false);
            this.keysReleased.add(code);
            
            this.events.emit(GameEvents.INPUT_KEY, {
                type: 'up',
                code,
                key: e.key
            });
            
            this.checkBindings(code, 'up');
        });
    }

    /**
     * Set up mouse listeners
     */
    setupMouseListeners() {
        document.addEventListener('mousemove', (e) => {
            if (!this.enabled) return;
            
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.pointer.x = e.clientX;
            this.pointer.y = e.clientY;
            
            if (this.pointer.isDown) {
                const dx = Math.abs(e.clientX - this.pointer.dragStartX);
                const dy = Math.abs(e.clientY - this.pointer.dragStartY);
                
                if (dx > this.dragThreshold || dy > this.dragThreshold) {
                    if (!this.pointer.isDragging) {
                        this.pointer.isDragging = true;
                        this.events.emit(GameEvents.INPUT_DRAG_START, {
                            x: this.pointer.dragStartX,
                            y: this.pointer.dragStartY
                        });
                    }
                }
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (!this.enabled) return;
            
            this.mouse.buttons.add(e.button);
            this.pointer.isDown = true;
            this.pointer.dragStartX = e.clientX;
            this.pointer.dragStartY = e.clientY;
        });

        document.addEventListener('mouseup', (e) => {
            if (!this.enabled) return;
            
            this.mouse.buttons.delete(e.button);
            
            if (this.pointer.isDragging) {
                this.events.emit(GameEvents.INPUT_DRAG_END, {
                    startX: this.pointer.dragStartX,
                    startY: this.pointer.dragStartY,
                    endX: e.clientX,
                    endY: e.clientY
                });
            } else if (this.pointer.isDown) {
                this.events.emit(GameEvents.INPUT_CLICK, {
                    x: e.clientX,
                    y: e.clientY,
                    button: e.button
                });
            }
            
            this.pointer.isDown = false;
            this.pointer.isDragging = false;
        });

        document.addEventListener('wheel', (e) => {
            if (!this.enabled) return;
            
            this.mouse.wheel = e.deltaY;
        });

        document.addEventListener('contextmenu', (e) => {
            // Prevent context menu in game
            if (document.getElementById('game-screen')?.classList.contains('active')) {
                e.preventDefault();
            }
        });
    }

    /**
     * Set up touch listeners
     */
    setupTouchListeners() {
        document.addEventListener('touchstart', (e) => {
            if (!this.enabled) return;
            
            for (const touch of e.changedTouches) {
                this.touches.set(touch.identifier, {
                    x: touch.clientX,
                    y: touch.clientY,
                    startX: touch.clientX,
                    startY: touch.clientY
                });
            }
            
            if (e.touches.length === 1) {
                this.pointer.isDown = true;
                this.pointer.x = e.touches[0].clientX;
                this.pointer.y = e.touches[0].clientY;
                this.pointer.dragStartX = this.pointer.x;
                this.pointer.dragStartY = this.pointer.y;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!this.enabled) return;
            
            for (const touch of e.changedTouches) {
                const data = this.touches.get(touch.identifier);
                if (data) {
                    data.x = touch.clientX;
                    data.y = touch.clientY;
                }
            }
            
            if (e.touches.length === 1) {
                this.pointer.x = e.touches[0].clientX;
                this.pointer.y = e.touches[0].clientY;
                
                if (this.pointer.isDown) {
                    const dx = Math.abs(this.pointer.x - this.pointer.dragStartX);
                    const dy = Math.abs(this.pointer.y - this.pointer.dragStartY);
                    
                    if (dx > this.dragThreshold || dy > this.dragThreshold) {
                        if (!this.pointer.isDragging) {
                            this.pointer.isDragging = true;
                            this.events.emit(GameEvents.INPUT_DRAG_START, {
                                x: this.pointer.dragStartX,
                                y: this.pointer.dragStartY
                            });
                        }
                    }
                }
            }
        });

        document.addEventListener('touchend', (e) => {
            if (!this.enabled) return;
            
            for (const touch of e.changedTouches) {
                const data = this.touches.get(touch.identifier);
                
                if (data) {
                    if (this.pointer.isDragging) {
                        this.events.emit(GameEvents.INPUT_DRAG_END, {
                            startX: data.startX,
                            startY: data.startY,
                            endX: touch.clientX,
                            endY: touch.clientY
                        });
                    } else {
                        this.events.emit(GameEvents.INPUT_CLICK, {
                            x: touch.clientX,
                            y: touch.clientY,
                            button: 0
                        });
                    }
                    
                    this.touches.delete(touch.identifier);
                }
            }
            
            if (e.touches.length === 0) {
                this.pointer.isDown = false;
                this.pointer.isDragging = false;
            }
        });

        document.addEventListener('touchcancel', (e) => {
            for (const touch of e.changedTouches) {
                this.touches.delete(touch.identifier);
            }
            
            this.pointer.isDown = false;
            this.pointer.isDragging = false;
        });
    }

    /**
     * Check key bindings
     * @param {string} code - Key code
     * @param {string} type - 'down' or 'up'
     */
    checkBindings(code, type) {
        for (const [action, keys] of this.bindings) {
            if (keys.includes(code)) {
                this.events.emit(`input:action:${action}`, { type, code });
            }
        }
    }

    /**
     * Check if a key is currently held
     * @param {string} key - Key code
     * @returns {boolean}
     */
    isKeyDown(key) {
        return this.keys.get(key) || false;
    }

    /**
     * Check if a key was just pressed this frame
     * @param {string} key - Key code
     * @returns {boolean}
     */
    isKeyPressed(key) {
        return this.keysPressed.has(key);
    }

    /**
     * Check if a key was just released this frame
     * @param {string} key - Key code
     * @returns {boolean}
     */
    isKeyReleased(key) {
        return this.keysReleased.has(key);
    }

    /**
     * Check if an action is active (any bound key held)
     * @param {string} action - Action name
     * @returns {boolean}
     */
    isActionDown(action) {
        const keys = this.bindings.get(action);
        if (!keys) return false;
        return keys.some(key => this.isKeyDown(key));
    }

    /**
     * Check if an action was just triggered
     * @param {string} action - Action name
     * @returns {boolean}
     */
    isActionPressed(action) {
        const keys = this.bindings.get(action);
        if (!keys) return false;
        return keys.some(key => this.isKeyPressed(key));
    }

    /**
     * Check if mouse button is down
     * @param {number} button - Button number (0=left, 1=middle, 2=right)
     * @returns {boolean}
     */
    isMouseDown(button = 0) {
        return this.mouse.buttons.has(button);
    }

    /**
     * Get mouse position
     * @returns {{x: number, y: number}}
     */
    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }

    /**
     * Get pointer position (mouse or primary touch)
     * @returns {{x: number, y: number}}
     */
    getPointerPosition() {
        return { x: this.pointer.x, y: this.pointer.y };
    }

    /**
     * Bind a key to an action
     * @param {string} action - Action name
     * @param {string|string[]} keys - Key code(s)
     */
    bind(action, keys) {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        const existing = this.bindings.get(action) || [];
        this.bindings.set(action, [...new Set([...existing, ...keyArray])]);
    }

    /**
     * Unbind a key from an action
     * @param {string} action - Action name
     * @param {string} key - Key code
     */
    unbind(action, key) {
        const keys = this.bindings.get(action);
        if (keys) {
            this.bindings.set(action, keys.filter(k => k !== key));
        }
    }

    /**
     * Clear frame-specific states (call at end of each frame)
     */
    clearFrameStates() {
        this.keysPressed.clear();
        this.keysReleased.clear();
        this.mouse.wheel = 0;
    }

    /**
     * Enable/disable input handling
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Update (call at end of each frame)
     */
    update() {
        this.clearFrameStates();
    }

    /**
     * Cleanup
     */
    destroy() {
        this.keys.clear();
        this.keysPressed.clear();
        this.keysReleased.clear();
        this.touches.clear();
        this.bindings.clear();
    }
}

export default InputHandler;
