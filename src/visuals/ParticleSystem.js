/**
 * ParticleSystem - Visual effects for magic and atmosphere
 * Befixed - Magic & Mechanical Repair Shop
 */

import { random, randomInt, lerp } from '../utils/helpers.js';

export class ParticleSystem {
    constructor() {
        // Canvas references
        this.canvas = null;
        this.ctx = null;
        
        // Particle collections
        this.particles = [];
        this.emitters = [];
        
        // Configuration
        this.maxParticles = 500;
        this.isEnabled = true;
        
        // Presets
        this.presets = this.createPresets();
    }

    /**
     * Initialize the particle system
     * @param {string} canvasId - Canvas element ID
     */
    init(canvasId = 'effects-canvas') {
        this.canvas = document.getElementById(canvasId);
        
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
        }

        console.log('ParticleSystem initialized');
    }

    /**
     * Resize canvas to match window
     */
    resize() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    /**
     * Create particle presets
     */
    createPresets() {
        return {
            // Magic sparkles
            magic: {
                count: 20,
                lifetime: { min: 500, max: 1500 },
                speed: { min: 0.5, max: 2 },
                size: { min: 2, max: 6 },
                colors: ['#7b68ee', '#9370db', '#ba55d3', '#dda0dd'],
                alpha: { start: 1, end: 0 },
                gravity: -0.05,
                spread: 60,
                glow: true
            },

            // Workshop sparks
            sparks: {
                count: 30,
                lifetime: { min: 200, max: 600 },
                speed: { min: 3, max: 8 },
                size: { min: 1, max: 3 },
                colors: ['#ffa500', '#ff6600', '#ffcc00', '#ff4400'],
                alpha: { start: 1, end: 0 },
                gravity: 0.3,
                spread: 45,
                glow: true
            },

            // Steam/smoke
            steam: {
                count: 10,
                lifetime: { min: 1000, max: 2000 },
                speed: { min: 0.3, max: 1 },
                size: { min: 10, max: 30 },
                colors: ['rgba(200, 200, 200, 0.3)', 'rgba(180, 180, 180, 0.2)'],
                alpha: { start: 0.5, end: 0 },
                gravity: -0.1,
                spread: 30,
                glow: false,
                sizeGrow: 1.5
            },

            // Dust motes (ambient)
            dust: {
                count: 1,
                lifetime: { min: 3000, max: 6000 },
                speed: { min: 0.1, max: 0.3 },
                size: { min: 1, max: 2 },
                colors: ['rgba(255, 250, 230, 0.4)', 'rgba(255, 245, 200, 0.3)'],
                alpha: { start: 0.4, end: 0 },
                gravity: 0,
                spread: 180,
                glow: false,
                drift: true
            },

            // Healing/repair effect
            repair: {
                count: 15,
                lifetime: { min: 800, max: 1200 },
                speed: { min: 1, max: 3 },
                size: { min: 3, max: 8 },
                colors: ['#00ff88', '#00cc66', '#88ffaa'],
                alpha: { start: 1, end: 0 },
                gravity: -0.2,
                spread: 360,
                glow: true
            },

            // Fire/explosion
            fire: {
                count: 50,
                lifetime: { min: 300, max: 800 },
                speed: { min: 2, max: 6 },
                size: { min: 4, max: 12 },
                colors: ['#ff4400', '#ff6600', '#ff8800', '#ffaa00'],
                alpha: { start: 1, end: 0 },
                gravity: -0.15,
                spread: 360,
                glow: true,
                sizeGrow: 0.9
            },

            // Confetti (celebration)
            confetti: {
                count: 40,
                lifetime: { min: 2000, max: 4000 },
                speed: { min: 2, max: 5 },
                size: { min: 4, max: 8 },
                colors: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'],
                alpha: { start: 1, end: 0.5 },
                gravity: 0.08,
                spread: 120,
                glow: false,
                rotation: true
            }
        };
    }

    /**
     * Emit particles at a position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string|Object} preset - Preset name or configuration
     */
    emit(x, y, preset = 'magic') {
        if (!this.isEnabled) return;

        const config = typeof preset === 'string' 
            ? this.presets[preset] 
            : { ...this.presets.magic, ...preset };

        if (!config) return;

        for (let i = 0; i < config.count; i++) {
            if (this.particles.length >= this.maxParticles) break;

            const angle = (random(-config.spread / 2, config.spread / 2) - 90) * (Math.PI / 180);
            const speed = random(config.speed.min, config.speed.max);

            const particle = {
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: random(config.size.min, config.size.max),
                color: config.colors[randomInt(0, config.colors.length - 1)],
                alpha: config.alpha.start,
                alphaStart: config.alpha.start,
                alphaEnd: config.alpha.end,
                life: 0,
                maxLife: random(config.lifetime.min, config.lifetime.max),
                gravity: config.gravity || 0,
                glow: config.glow || false,
                sizeGrow: config.sizeGrow || 1,
                drift: config.drift || false,
                rotation: config.rotation ? random(0, 360) : 0,
                rotationSpeed: config.rotation ? random(-5, 5) : 0
            };

            this.particles.push(particle);
        }
    }

    /**
     * Create a continuous emitter
     * @param {Object} options - Emitter options
     * @returns {string} Emitter ID
     */
    createEmitter(options) {
        const emitter = {
            id: `emitter_${Date.now()}`,
            x: options.x || 0,
            y: options.y || 0,
            preset: options.preset || 'dust',
            interval: options.interval || 100,
            active: true,
            lastEmit: 0
        };

        this.emitters.push(emitter);
        return emitter.id;
    }

    /**
     * Remove an emitter
     * @param {string} emitterId - Emitter ID
     */
    removeEmitter(emitterId) {
        const index = this.emitters.findIndex(e => e.id === emitterId);
        if (index > -1) {
            this.emitters.splice(index, 1);
        }
    }

    /**
     * Update particles
     * @param {number} deltaTime - Time since last frame in ms
     */
    update(deltaTime) {
        if (!this.isEnabled) return;

        const dt = deltaTime * 1000; // Convert to ms

        // Update emitters
        const now = performance.now();
        for (const emitter of this.emitters) {
            if (emitter.active && now - emitter.lastEmit >= emitter.interval) {
                this.emit(emitter.x, emitter.y, emitter.preset);
                emitter.lastEmit = now;
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update life
            p.life += dt;
            
            // Remove dead particles
            if (p.life >= p.maxLife) {
                this.particles.splice(i, 1);
                continue;
            }

            // Calculate life progress
            const progress = p.life / p.maxLife;

            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Apply gravity
            p.vy += p.gravity;

            // Apply drift (random movement)
            if (p.drift) {
                p.vx += random(-0.02, 0.02);
                p.vy += random(-0.02, 0.02);
            }

            // Update alpha
            p.alpha = lerp(p.alphaStart, p.alphaEnd, progress);

            // Update size
            if (p.sizeGrow !== 1) {
                p.size *= p.sizeGrow;
            }

            // Update rotation
            if (p.rotationSpeed) {
                p.rotation += p.rotationSpeed;
            }
        }
    }

    /**
     * Render particles
     */
    render() {
        if (!this.ctx || !this.isEnabled) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw particles
        for (const p of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;

            if (p.glow) {
                this.ctx.shadowBlur = p.size * 2;
                this.ctx.shadowColor = p.color;
            }

            this.ctx.fillStyle = p.color;

            if (p.rotation) {
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.rotation * Math.PI / 180);
                this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        }
    }

    /**
     * Create magic trail effect
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    magicTrail(x, y) {
        this.emit(x, y, {
            ...this.presets.magic,
            count: 3,
            spread: 20
        });
    }

    /**
     * Create explosion effect
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    explosion(x, y) {
        this.emit(x, y, 'fire');
        this.emit(x, y, 'sparks');
    }

    /**
     * Create repair completion effect
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    repairComplete(x, y) {
        this.emit(x, y, 'repair');
        this.emit(x, y, {
            ...this.presets.magic,
            colors: ['#00ff88', '#7b68ee', '#ffffff']
        });
    }

    /**
     * Create celebration effect
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    celebrate(x, y) {
        this.emit(x, y, 'confetti');
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }

    /**
     * Enable/disable the system
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.clear();
        }
    }

    /**
     * Get particle count
     * @returns {number}
     */
    getParticleCount() {
        return this.particles.length;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.clear();
        this.emitters = [];
        window.removeEventListener('resize', () => this.resize());
    }
}

export default ParticleSystem;
