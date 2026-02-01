/**
 * AudioManager - Main audio controller using Web Audio API
 * Befixed - Magic & Mechanical Repair Shop
 */

import { globalEvents, GameEvents } from '../utils/EventEmitter.js';
import { assetLoader } from '../utils/AssetLoader.js';
import { clamp } from '../utils/helpers.js';

export class AudioManager {
    constructor() {
        this.events = globalEvents;
        
        // Audio context
        this.context = null;
        this.masterGain = null;
        
        // Channel gains
        this.musicGain = null;
        this.sfxGain = null;
        this.voiceGain = null;
        this.ambienceGain = null;
        
        // Volume levels (0-1)
        this.volumes = {
            master: 0.8,
            music: 0.7,
            sfx: 0.8,
            voice: 0.9,
            ambience: 0.6
        };
        
        // Active sources
        this.musicSource = null;
        this.ambienceSource = null;
        this.voiceSource = null;
        this.activeSFX = new Set();
        
        // Current tracks
        this.currentMusic = null;
        this.currentAmbience = null;
        
        // State
        this.isInitialized = false;
        this.isMuted = false;
        this.isPaused = false;
        
        // Fade state
        this.musicFadeInterval = null;
    }

    /**
     * Initialize the audio manager
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Get or create audio context
            this.context = assetLoader.getAudioContext();
            
            if (!this.context) {
                console.warn('Web Audio API not supported');
                return;
            }

            // Create gain nodes
            this.masterGain = this.context.createGain();
            this.musicGain = this.context.createGain();
            this.sfxGain = this.context.createGain();
            this.voiceGain = this.context.createGain();
            this.ambienceGain = this.context.createGain();

            // Connect gain hierarchy
            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            this.voiceGain.connect(this.masterGain);
            this.ambienceGain.connect(this.masterGain);
            this.masterGain.connect(this.context.destination);

            // Set initial volumes
            this.applyVolumes();

            // Set up event listeners
            this.setupEventListeners();

            // Handle context state
            this.setupContextResume();

            this.isInitialized = true;
            console.log('AudioManager initialized');
        } catch (error) {
            console.error('Failed to initialize AudioManager:', error);
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        this.events.on(GameEvents.MUSIC_PLAY, (data) => this.playMusic(data.track, data));
        this.events.on(GameEvents.MUSIC_STOP, () => this.stopMusic());
        this.events.on(GameEvents.SFX_PLAY, (data) => this.playSFX(data.sound, data));
        this.events.on(GameEvents.VOICE_PLAY, (data) => this.playVoice(data.line, data));
        this.events.on(GameEvents.AUDIO_MUTE, () => this.mute());
        this.events.on(GameEvents.AUDIO_UNMUTE, () => this.unmute());
        this.events.on(GameEvents.SETTINGS_CHANGE, (data) => this.handleSettingsChange(data));
    }

    /**
     * Set up audio context resume on user interaction
     */
    setupContextResume() {
        const resumeContext = async () => {
            if (this.context?.state === 'suspended') {
                await this.context.resume();
            }
        };

        document.addEventListener('click', resumeContext, { once: true });
        document.addEventListener('keydown', resumeContext, { once: true });
        document.addEventListener('touchstart', resumeContext, { once: true });
    }

    /**
     * Apply volume settings to gain nodes
     */
    applyVolumes() {
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.volumes.master;
        }
        if (this.musicGain) {
            this.musicGain.gain.value = this.volumes.music;
        }
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.volumes.sfx;
        }
        if (this.voiceGain) {
            this.voiceGain.gain.value = this.volumes.voice;
        }
        if (this.ambienceGain) {
            this.ambienceGain.gain.value = this.volumes.ambience;
        }
    }

    /**
     * Set volume for a channel
     * @param {string} channel - Channel name
     * @param {number} volume - Volume (0-100)
     */
    setVolume(channel, volume) {
        const normalizedVolume = clamp(volume / 100, 0, 1);
        
        if (this.volumes.hasOwnProperty(channel)) {
            this.volumes[channel] = normalizedVolume;
            this.applyVolumes();
        }
    }

    /**
     * Get volume for a channel
     * @param {string} channel - Channel name
     * @returns {number} Volume (0-100)
     */
    getVolume(channel) {
        return (this.volumes[channel] || 0) * 100;
    }

    /**
     * Play music track
     * @param {string} track - Track identifier or path
     * @param {Object} options - Playback options
     */
    async playMusic(track, options = {}) {
        if (!this.isInitialized || !track) return;

        const {
            loop = true,
            fadeIn = true,
            fadeDuration = 1000,
            volume = 1
        } = options;

        // If same track already playing, don't restart
        if (this.currentMusic === track && this.musicSource) {
            return;
        }

        // Fade out current music if playing
        if (this.musicSource) {
            await this.fadeOutMusic(fadeDuration / 2);
        }

        try {
            // Get audio buffer
            let buffer = assetLoader.get(track);
            if (!buffer) {
                buffer = await assetLoader.loadAudio(track, track);
            }

            if (!buffer) {
                console.warn(`Music track not found: ${track}`);
                return;
            }

            // Create source
            this.musicSource = this.context.createBufferSource();
            this.musicSource.buffer = buffer;
            this.musicSource.loop = loop;

            // Create individual gain for this track
            const trackGain = this.context.createGain();
            trackGain.gain.value = fadeIn ? 0 : volume;

            this.musicSource.connect(trackGain);
            trackGain.connect(this.musicGain);

            // Start playback
            this.musicSource.start(0);
            this.currentMusic = track;

            // Fade in
            if (fadeIn) {
                this.fadeGain(trackGain, 0, volume, fadeDuration);
            }

            // Handle track end
            this.musicSource.onended = () => {
                if (this.currentMusic === track) {
                    this.musicSource = null;
                    this.currentMusic = null;
                }
            };

            this.events.emit('audio:music:started', { track });
        } catch (error) {
            console.error('Error playing music:', error);
        }
    }

    /**
     * Stop music
     * @param {boolean} fade - Whether to fade out
     * @param {number} fadeDuration - Fade duration in ms
     */
    async stopMusic(fade = true, fadeDuration = 500) {
        if (!this.musicSource) return;

        if (fade) {
            await this.fadeOutMusic(fadeDuration);
        } else {
            this.musicSource.stop();
            this.musicSource = null;
            this.currentMusic = null;
        }

        this.events.emit(GameEvents.MUSIC_STOP);
    }

    /**
     * Fade out current music
     * @param {number} duration - Fade duration in ms
     */
    async fadeOutMusic(duration) {
        return new Promise(resolve => {
            if (!this.musicSource) {
                resolve();
                return;
            }

            const startVolume = this.musicGain.gain.value;
            const startTime = performance.now();

            const fade = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.musicGain.gain.value = startVolume * (1 - progress);

                if (progress < 1) {
                    requestAnimationFrame(fade);
                } else {
                    if (this.musicSource) {
                        this.musicSource.stop();
                        this.musicSource = null;
                    }
                    this.currentMusic = null;
                    this.musicGain.gain.value = this.volumes.music;
                    resolve();
                }
            };

            fade();
        });
    }

    /**
     * Play ambience track
     * @param {string} track - Track identifier
     * @param {Object} options - Playback options
     */
    async playAmbience(track, options = {}) {
        if (!this.isInitialized || !track) return;

        const { fadeIn = true, fadeDuration = 2000 } = options;

        // Stop current ambience
        if (this.ambienceSource) {
            await this.stopAmbience(true, fadeDuration / 2);
        }

        try {
            let buffer = assetLoader.get(track);
            if (!buffer) {
                buffer = await assetLoader.loadAudio(track, track);
            }

            if (!buffer) return;

            this.ambienceSource = this.context.createBufferSource();
            this.ambienceSource.buffer = buffer;
            this.ambienceSource.loop = true;

            const trackGain = this.context.createGain();
            trackGain.gain.value = fadeIn ? 0 : 1;

            this.ambienceSource.connect(trackGain);
            trackGain.connect(this.ambienceGain);

            this.ambienceSource.start(0);
            this.currentAmbience = track;

            if (fadeIn) {
                this.fadeGain(trackGain, 0, 1, fadeDuration);
            }
        } catch (error) {
            console.error('Error playing ambience:', error);
        }
    }

    /**
     * Stop ambience
     * @param {boolean} fade - Whether to fade
     * @param {number} fadeDuration - Fade duration
     */
    async stopAmbience(fade = true, fadeDuration = 1000) {
        if (!this.ambienceSource) return;

        if (fade) {
            await this.fadeGain(this.ambienceGain, this.volumes.ambience, 0, fadeDuration);
        }

        this.ambienceSource.stop();
        this.ambienceSource = null;
        this.currentAmbience = null;
        this.ambienceGain.gain.value = this.volumes.ambience;
    }

    /**
     * Play sound effect
     * @param {string} sound - Sound identifier
     * @param {Object} options - Playback options
     */
    async playSFX(sound, options = {}) {
        if (!this.isInitialized || !sound) return;

        const {
            volume = 1,
            pitch = 1,
            pan = 0
        } = options;

        try {
            let buffer = assetLoader.get(sound);
            if (!buffer) {
                // Try to load it
                try {
                    buffer = await assetLoader.loadAudio(sound, `assets/audio/sfx/${sound}.mp3`);
                } catch {
                    // Sound not found, fail silently
                    return;
                }
            }

            if (!buffer) return;

            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = pitch;

            // Create gain for this sound
            const gainNode = this.context.createGain();
            gainNode.gain.value = volume;

            // Create panner if needed
            if (pan !== 0) {
                const panner = this.context.createStereoPanner();
                panner.pan.value = clamp(pan, -1, 1);
                source.connect(gainNode);
                gainNode.connect(panner);
                panner.connect(this.sfxGain);
            } else {
                source.connect(gainNode);
                gainNode.connect(this.sfxGain);
            }

            // Track active SFX
            this.activeSFX.add(source);
            source.onended = () => {
                this.activeSFX.delete(source);
            };

            source.start(0);
            return source;
        } catch (error) {
            // Fail silently for missing sound effects
        }
    }

    /**
     * Play voice line
     * @param {string} line - Voice line identifier
     * @param {Object} options - Playback options
     */
    async playVoice(line, options = {}) {
        if (!this.isInitialized || !line) return;

        // Stop current voice
        if (this.voiceSource) {
            this.voiceSource.stop();
        }

        try {
            let buffer = assetLoader.get(line);
            if (!buffer) {
                buffer = await assetLoader.loadAudio(line, `assets/audio/voice/${line}.mp3`);
            }

            if (!buffer) return;

            this.voiceSource = this.context.createBufferSource();
            this.voiceSource.buffer = buffer;

            this.voiceSource.connect(this.voiceGain);
            this.voiceSource.start(0);

            this.voiceSource.onended = () => {
                this.voiceSource = null;
                this.events.emit('audio:voice:ended', { line });
            };

            this.events.emit('audio:voice:started', { line });
        } catch (error) {
            console.error('Error playing voice:', error);
        }
    }

    /**
     * Stop all voice playback
     */
    stopVoice() {
        if (this.voiceSource) {
            this.voiceSource.stop();
            this.voiceSource = null;
        }
    }

    /**
     * Fade a gain node
     * @param {GainNode} gainNode - Gain node to fade
     * @param {number} from - Start value
     * @param {number} to - End value
     * @param {number} duration - Duration in ms
     */
    fadeGain(gainNode, from, to, duration) {
        return new Promise(resolve => {
            const startTime = this.context.currentTime;
            const endTime = startTime + duration / 1000;

            gainNode.gain.setValueAtTime(from, startTime);
            gainNode.gain.linearRampToValueAtTime(to, endTime);

            setTimeout(resolve, duration);
        });
    }

    /**
     * Mute all audio
     */
    mute() {
        this.isMuted = true;
        if (this.masterGain) {
            this.masterGain.gain.value = 0;
        }
    }

    /**
     * Unmute audio
     */
    unmute() {
        this.isMuted = false;
        if (this.masterGain) {
            this.masterGain.gain.value = this.volumes.master;
        }
    }

    /**
     * Toggle mute
     * @returns {boolean} New mute state
     */
    toggleMute() {
        if (this.isMuted) {
            this.unmute();
        } else {
            this.mute();
        }
        return this.isMuted;
    }

    /**
     * Pause all audio
     */
    pause() {
        if (this.context && this.context.state === 'running') {
            this.context.suspend();
            this.isPaused = true;
        }
    }

    /**
     * Resume audio
     */
    async resume() {
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
            this.isPaused = false;
        }
    }

    /**
     * Stop all audio
     */
    stopAll() {
        this.stopMusic(false);
        this.stopAmbience(false);
        this.stopVoice();
        
        for (const source of this.activeSFX) {
            try {
                source.stop();
            } catch {}
        }
        this.activeSFX.clear();
    }

    /**
     * Handle settings change
     * @param {Object} settings - New settings
     */
    handleSettingsChange(settings) {
        if (settings.masterVolume !== undefined) {
            this.setVolume('master', settings.masterVolume);
        }
        if (settings.musicVolume !== undefined) {
            this.setVolume('music', settings.musicVolume);
        }
        if (settings.sfxVolume !== undefined) {
            this.setVolume('sfx', settings.sfxVolume);
        }
        if (settings.voiceVolume !== undefined) {
            this.setVolume('voice', settings.voiceVolume);
        }
    }

    /**
     * Update (called each frame)
     * @param {number} deltaTime
     */
    update(deltaTime) {
        // Audio updates if needed
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopAll();
        
        if (this.context && this.context.state !== 'closed') {
            this.context.close();
        }
        
        this.isInitialized = false;
    }
}

export default AudioManager;
