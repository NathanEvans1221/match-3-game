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
    }

    /** 初始化 AudioContext (需在使用者互動後呼叫) */
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /** 開始播放背景音樂 (簡易合成旋律) */
    startBGM() {
        if (this.muted) return;
        this.init();
        if (this.bgmNode) return; // 避免重複播放

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

        // 啟動循環旋律
        this._playMelody();
    }

    _playMelody() {
        if (this.muted || !this.audioContext || !this.bgmNode) return;

        const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66]; // Pentatonic cycle
        let index = 0;

        const playNext = () => {
            if (this.muted || !this.bgmNode || !this.audioContext) return;

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
        if (this.bgmNode) {
            this.bgmGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
            setTimeout(() => {
                if (this.bgmNode) {
                    this.bgmNode.stop();
                    this.bgmNode = null;
                }
            }, 1000);
        }
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

    /** 播放交換音效 (簡單的短啵聲) */
    playSwap() {
        if (this.muted) return;
        this.init();

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(this.masterVolume * 0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.1);
    }

    /** 播放消除音效 (清脆的叮咚聲) */
    playMatch(combo = 1) {
        if (this.muted) return;
        this.init();

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        // 連鎖越高，音調越高
        const baseFreq = 600 + (combo - 1) * 100;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.audioContext.currentTime + 0.2);

        gainNode.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
    }

    /** 播放掉落音效 (低沉短促聲) */
    playFall() {
        if (this.muted) return;
        this.init();

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.15);
    }

    /** 播放遊戲結束音效 */
    playGameOver() {
        if (this.muted) return;
        this.init();

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.8);

        gainNode.gain.setValueAtTime(this.masterVolume * 0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);

        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.8);
    }
}
