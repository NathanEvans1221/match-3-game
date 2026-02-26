// ==============================================================================
// 模組名稱: main.js
// 功能描述: 主程式入口 — 初始化遊戲、綁定 UI 事件、啟動遊戲主循環
// ==============================================================================

import { Game, GameState } from './game.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { ScoreManager } from './score.js';
import { AudioManager } from './audio.js';

/** 遊戲初始化 */
function init() {
    // DOM 元素
    const canvas = document.getElementById('game-canvas');
    const scoreEl = document.getElementById('current-score');
    const highScoreEl = document.getElementById('high-score');
    const comboEl = document.getElementById('combo-count');
    const timerContainer = document.getElementById('timer-container');
    const timerEl = document.getElementById('timer');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const finalScoreEl = document.getElementById('final-score');
    const btnClassic = document.getElementById('btn-classic');
    const btnTimed = document.getElementById('btn-timed');
    const btnHint = document.getElementById('btn-hint');
    const btnRestart = document.getElementById('btn-restart');
    const btnRestartOverlay = document.getElementById('btn-restart-overlay');
    const btnBgm = document.getElementById('btn-bgm');
    const btnSfx = document.getElementById('btn-sfx');
    const cheerVideo = document.getElementById('cheer-video');
    // 初始化渲染器
    const renderer = new Renderer(canvas);

    // 初始化計分管理器
    const scoreManager = new ScoreManager(scoreEl, highScoreEl, comboEl);

    // 初始化音效管理器
    const audioManager = new AudioManager();

    const updateBgmBtn = () => {
        if (btnBgm) {
            btnBgm.innerHTML = audioManager.bgmMuted ? '🔇 音樂: 關' : '🎵 音樂: 開';
            if (audioManager.bgmMuted) {
                btnBgm.classList.remove('active');
            } else {
                btnBgm.classList.add('active');
            }
        }
    };
    const updateSfxBtn = () => {
        if (btnSfx) {
            btnSfx.innerHTML = audioManager.sfxMuted ? '🔇 音效: 關' : '🔊 音效: 開';
            if (audioManager.sfxMuted) {
                btnSfx.classList.remove('active');
            } else {
                btnSfx.classList.add('active');
            }
        }
    };
    updateBgmBtn();
    updateSfxBtn();

    // 電腦代玩按鈕 UI 更新
    const btnAuto = document.getElementById('btn-auto');
    const updateAutoBtn = () => {
        if (btnAuto) {
            btnAuto.innerHTML = game.isAutoPlaying ? '🤖 停止代玩' : '🤖 電腦代玩';
            if (game.isAutoPlaying) {
                btnAuto.classList.add('active');
            } else {
                btnAuto.classList.remove('active');
            }
        }
    };

    // 當前遊戲模式
    let currentMode = 'classic';

    // 影片播放邏輯： 1~3秒 'normal' 循環，3~8秒 'cheer' 播放
    let cheerState = 'normal';
    if (cheerVideo) {
        cheerVideo.addEventListener('timeupdate', () => {
            if (cheerState === 'normal') {
                if (cheerVideo.currentTime >= 2.7) {
                    cheerVideo.currentTime = 1;
                }
            } else if (cheerState === 'cheer') {
                if (cheerVideo.currentTime >= 8 || cheerVideo.currentTime < 2.7) {
                    // 如果播到 8s，或是因為某些原因時間跳掉
                    cheerState = 'normal';
                    cheerVideo.currentTime = 1;
                    cheerVideo.classList.remove('cheer-active');
                }
            }
        });
    }

    const triggerCheerAnimation = () => {
        if (!cheerVideo) return;

        if (cheerState === 'normal') {
            cheerState = 'cheer';
            cheerVideo.currentTime = 3;
            cheerVideo.classList.add('cheer-active');
        }
    };

    // 初始化遊戲控制器
    const game = new Game({
        onScoreUpdate: (points, reset) => {
            scoreManager.updateScore(points, reset);
        },
        onComboUpdate: (combo) => {
            scoreManager.updateCombo(combo);
            if (combo > 0) {
                audioManager.playMatch(combo);
                triggerCheerAnimation(); // 每次產生連鎖/消除時跳起
            }
        },
        onTimerUpdate: (seconds) => {
            if (timerEl) timerEl.textContent = seconds;
        },
        onGameOver: () => {
            audioManager.playGameOver();
            if (finalScoreEl) finalScoreEl.textContent = scoreManager.getScore();
            if (gameOverOverlay) gameOverOverlay.style.display = 'flex';
            updateAutoBtn?.();
        },
        onStateChange: (state) => {
            if (state === GameState.SWAPPING) {
                audioManager.playSwap();
            } else if (state === GameState.FALLING && game.fallAnim && game.fallAnim.moves.length > 0) {
                audioManager.playFall();
            }
        },
    });

    updateAutoBtn();

    // 初始化輸入處理
    const inputHandler = new InputHandler(canvas, renderer, ({ row, col }) => {
        game.handleClick(row, col);
    });

    // 遊戲主循環
    function gameLoop() {
        renderer.render(game);
        requestAnimationFrame(gameLoop);
    }

    // 啟動遊戲
    function startGame(mode) {
        currentMode = mode;
        scoreManager.reset();
        game.startGame(mode);
        if (gameOverOverlay) gameOverOverlay.style.display = 'none';

        // 計時模式顯示計時器
        if (timerContainer) {
            timerContainer.style.display = mode === 'timed' ? 'flex' : 'none';
        }

        updateAutoBtn?.();
    }

    // --- 綁定 UI 按鈕事件 ---

    // 模式選擇
    btnClassic?.addEventListener('click', () => {
        btnClassic.classList.add('active');
        btnTimed?.classList.remove('active');
        startGame('classic');
    });

    btnTimed?.addEventListener('click', () => {
        btnTimed.classList.add('active');
        btnClassic?.classList.remove('active');
        startGame('timed');
    });

    // 提示按鈕
    btnHint?.addEventListener('click', () => {
        game.showHint();
    });

    // 電腦代玩按鈕
    btnAuto?.addEventListener('click', () => {
        game.toggleAutoPlay();
        updateAutoBtn();
        audioManager.init(true);
    });

    // 重新開始按鈕
    btnRestart?.addEventListener('click', () => {
        startGame(currentMode);
    });

    btnRestartOverlay?.addEventListener('click', () => {
        startGame(currentMode);
    });

    // 音樂開關按鈕
    btnBgm?.addEventListener('click', () => {
        audioManager.toggleBGM();
        updateBgmBtn();
        audioManager.init(true);
    });

    // 音效開關按鈕
    btnSfx?.addEventListener('click', () => {
        audioManager.toggleSFX();
        updateSfxBtn();
        audioManager.init(true);
    });

    // 視窗大小變更（桌面縮放）
    window.addEventListener('resize', () => {
        renderer.resize();
    });

    const unlockAudio = (e) => {
        // 取得手勢信任後立即執行解鎖
        console.log(`User gesture [${e?.type}] detected: Unlocking audio/video`);

        // 1. 處理影片 (強制靜音播放)
        if (cheerVideo) {
            cheerVideo.muted = true; // 強制保持靜音
            cheerVideo.play().then(() => {
                console.log("Video playing muted.");
                cheerVideo.currentTime = 1;
            }).catch(err => {
                console.warn("Video play failed:", err);
            });
        }

        // 2. 解鎖 AudioContext (建立與 resume)
        const success = audioManager.init(true);

        // 3. 嘗試啟動 BGM (不再延遲，確保在同一個事件週中)
        if (success && !audioManager.bgmNode && !audioManager.bgmMuted) {
            audioManager.startBGM();
        }

        // 移除監聽器
        ['click', 'touchend', 'pointerup'].forEach(evt => {
            window.removeEventListener(evt, unlockAudio, { capture: true });
            btnClassic?.removeEventListener(evt, unlockAudio, { capture: true });
            btnTimed?.removeEventListener(evt, unlockAudio, { capture: true });
        });
    };

    // 使用 capture: true 確保在所有地方都能攔截到手勢
    // 注意：touchstart 常常不被當作有效的使用者手勢，改用 touchend / pointerup / click
    ['click', 'touchend', 'pointerup'].forEach(evt => {
        window.addEventListener(evt, unlockAudio, { capture: true, once: true });
        // 針對模式按鈕加強監聽 (防止點擊按鈕時 event 被 stopPropagation)
        btnClassic?.addEventListener(evt, unlockAudio, { capture: true, once: true });
        btnTimed?.addEventListener(evt, unlockAudio, { capture: true, once: true });
    });

    // 手機旋轉（延遲確保 innerWidth/innerHeight 已更新）
    window.addEventListener('orientationchange', () => {
        setTimeout(() => renderer.resize(), 100);
    });

    // 開始遊戲
    startGame('classic');
    requestAnimationFrame(gameLoop);
}

// 等待 DOM 載入完成後初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
