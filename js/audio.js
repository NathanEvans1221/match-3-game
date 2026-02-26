// ==============================================================================
// 模組名稱: audio.js
// 功能描述: 音效管理器 — 使用 Web Audio API 產生遊戲音效 (穩定解鎖版)
// ==============================================================================

export class AudioManager {
    constructor() {
        this.audioContext = null;

        // 從 localStorage 讀取設定，預設為開啟
        const savedBgmMute = localStorage.getItem('match3_bgm_muted');
        const savedSfxMute = localStorage.getItem('match3_sfx_muted');

        this.bgmMuted = savedBgmMute === 'true';
        this.sfxMuted = savedSfxMute === 'true';

        this.masterVolume = 0.3; // 整體音量
        this.bgmNode = null;
        this.bgmGain = null;
        this.melodyTimeout = null;

        // 預先檢查瀏覽器支援
        this.supported = !!(window.AudioContext || window.webkitAudioContext);
    }

    /** 
     * 初始化或恢復 AudioContext
     * @param {boolean} force 是否嘗試進行「解鎖」動作 (需在使用者互動事件中)
     */
    init(force = false) {
        if (!this.supported) return false;

        try {
            // 只在明確手勢下建立 context
            if (!this.audioContext && force) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (!this.audioContext) return false;

            // 如果是被暫停中且有手勢觸發，嘗試恢復
            if (force && this.audioContext.state === 'suspended') {
                // 不直接在 init 回傳 resume 的 promise，避免同步阻塞
                this.audioContext.resume().catch(() => { });
                return true;
            }

            return this.audioContext.state === 'running' || this.audioContext.state === 'suspended';
        } catch (e) {
            return false;
        }
    }

    /** 開始播放背景音樂 */
    startBGM() {
        if (this.bgmMuted || !this.supported) return;

        // 檢查狀態，若未就緒則跳過（由外部手勢邏輯負責解鎖）
        if (!this.init()) return;

        if (this.bgmNode) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(110, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.15, this.audioContext.currentTime + 3);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        this.bgmNode = oscillator;
        this.bgmGain = gainNode;

        this._playMelody();
    }

    _playMelody() {
        if (this.bgmMuted || !this.audioContext || this.audioContext.state !== 'running') return;

        const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66];
        let index = 0;

        const playNext = () => {
            if (this.bgmMuted || !this.bgmNode || !this.audioContext || this.audioContext.state !== 'running') return;

            const freq = notes[index];
            const osc = this.audioContext.createOscillator();
            const g = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

            g.gain.setValueAtTime(0, this.audioContext.currentTime);
            g.gain.linearRampToValueAtTime(this.masterVolume * 0.08, this.audioContext.currentTime + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 2.0);

            osc.connect(g);
            g.connect(this.audioContext.destination);

            osc.start();
            osc.stop(this.audioContext.currentTime + 2.0);

            index = (index + 1) % notes.length;
            this.melodyTimeout = setTimeout(playNext, 1500);
        };

        playNext();
    }

    stopBGM() {
        if (this.bgmNode && this.audioContext && this.audioContext.state === 'running') {
            try {
                this.bgmGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
                const nodeToStop = this.bgmNode;
                setTimeout(() => {
                    try { nodeToStop.stop(); } catch (e) { }
                }, 1000);
            } catch (e) { }
        }
        this.bgmNode = null;
        this.bgmGain = null;
        if (this.melodyTimeout) {
            clearTimeout(this.melodyTimeout);
            this.melodyTimeout = null;
        }
    }

    toggleBGM() {
        this.bgmMuted = !this.bgmMuted;
        localStorage.setItem('match3_bgm_muted', this.bgmMuted);
        if (this.bgmMuted) {
            this.stopBGM();
        } else {
            this.startBGM();
        }
        return this.bgmMuted;
    }

    toggleSFX() {
        this.sfxMuted = !this.sfxMuted;
        localStorage.setItem('match3_sfx_muted', this.sfxMuted);
        return this.sfxMuted;
    }

    _playSound(freqs, type = 'sine', duration = 0.1, volume = 0.5) {
        if (this.sfxMuted || !this.init()) return;

        try {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freqs[0], this.audioContext.currentTime);
            if (freqs[1]) {
                osc.frequency.exponentialRampToValueAtTime(freqs[1], this.audioContext.currentTime + duration);
            }

            gainNode.gain.setValueAtTime(this.masterVolume * volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            osc.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            osc.start();
            osc.stop(this.audioContext.currentTime + duration);
        } catch (e) { }
    }

    playSwap() { this._playSound([400, 600], 'sine', 0.1, 0.5); }
    playMatch(combo = 1) {
        const baseFreq = 600 + (combo - 1) * 100;
        this._playSound([baseFreq, baseFreq * 1.5], 'triangle', 0.3, 1.0);
    }
    playFall() { this._playSound([300, 150], 'sine', 0.15, 0.3); }
    playGameOver() { this._playSound([400, 100], 'sawtooth', 0.8, 0.5); }
}

