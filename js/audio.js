// ==============================================================================
// 模組名稱: audio.js
// 功能描述: 音效管理器 — 使用 Web Audio API 產生遊戲音效
// ==============================================================================

export class AudioManager {
    constructor() {
        this.audioContext = null;

        // 從 localStorage 讀取音效設定，預設為開啟
        const savedMute = localStorage.getItem('match3_mute');
        this.muted = savedMute === 'true';

        this.masterVolume = 0.3; // 整體音量
        this.bgmNode = null;
        this.bgmGain = null;
        this.melodyTimeout = null;
    }

    /** 
     * 初始化 AudioContext
     * @param {boolean} force 是否強制建立/恢復 (通常在使用者互動後傳入 true)
     */
    init(force = false) {
        try {
            // 如果還沒有 AudioContext 且不需要強制建立，直接返回目前狀態
            if (!this.audioContext) {
                if (!force) return false;
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // 如果目前是暫停狀態且強制恢復，則進行 resume
            if (this.audioContext.state === 'suspended' && force) {
                this.audioContext.resume().catch(() => { });
            }

            return this.audioContext.state === 'running';
        } catch (e) {
            return false;
        }
    }

    /** 開始播放背景音樂 (簡易合成旋律) */
    startBGM() {
        if (this.muted) return;

        // 嘗試初始化（不強制，由外部 unlock 手勢負責強制解鎖）
        if (!this.init()) return;

        if (this.bgmNode) return;

        // 使用溫和的鋪底音樂 (Pad)
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(110, this.audioContext.currentTime); // A2 低音

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
        if (this.muted || !this.audioContext || !this.bgmNode || this.audioContext.state !== 'running') return;

        const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66]; // Pentatonic cycle
        let index = 0;

        const playNext = () => {
            if (this.muted || !this.bgmNode || !this.audioContext || this.audioContext.state !== 'running') return;

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

    /** 停止播放背景音樂 */
    stopBGM() {
        if (this.bgmNode && this.audioContext && this.audioContext.state === 'running') {
            this.bgmGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
            const nodeToStop = this.bgmNode;
            setTimeout(() => {
                try { nodeToStop.stop(); } catch (e) { }
            }, 1000);
        }
        this.bgmNode = null;
        this.bgmGain = null;
        if (this.melodyTimeout) {
            clearTimeout(this.melodyTimeout);
            this.melodyTimeout = null;
        }
    }

    /** 切換靜音狀態 */
    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('match3_mute', this.muted);
        if (this.muted) {
            this.stopBGM();
        } else {
            this.startBGM();
        }
        return this.muted;
    }

    /** 播放音效輔助工具 */
    _playSound(freqs, type = 'sine', duration = 0.1, volume = 0.5) {
        // init(false) 不會觸發警告，如果沒就緒就直接跳過
        if (this.muted || !this.init(false)) return;

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
    }

    playSwap() {
        this._playSound([400, 600], 'sine', 0.1, 0.5);
    }

    playMatch(combo = 1) {
        const baseFreq = 600 + (combo - 1) * 100;
        this._playSound([baseFreq, baseFreq * 1.5], 'triangle', 0.3, 1.0);
    }

    playFall() {
        this._playSound([300, 150], 'sine', 0.15, 0.3);
    }

    playGameOver() {
        this._playSound([400, 100], 'sawtooth', 0.8, 0.5);
    }
}
