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
    }

    /** 初始化 AudioContext (需在使用者互動後呼叫) */
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /** 切換靜音狀態 */
    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('match3_mute', this.muted);
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
