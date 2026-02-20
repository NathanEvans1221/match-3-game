// ==============================================================================
// 模組名稱: renderer.js
// 功能描述: Canvas 渲染引擎 — 繪製棋盤、寶石、動畫與粒子特效 (優化效能版)
// ==============================================================================

import { BOARD_SIZE, GEM_TYPES } from './game.js';

/** 寶石顏色漸層配置 */
const GEM_COLORS = [
    null, // index 0 = 空
    { main: '#ff4d6a', light: '#ff8fa3', dark: '#c21e3a', glow: 'rgba(255, 77, 106, 0.5)' },  // 1: 紅寶石
    { main: '#00c9ff', light: '#66e0ff', dark: '#0088b3', glow: 'rgba(0, 201, 255, 0.5)' },    // 2: 藍寶石
    { main: '#50e85a', light: '#8aff91', dark: '#2aad33', glow: 'rgba(80, 232, 90, 0.5)' },    // 3: 翡翠
    { main: '#ffcc00', light: '#ffe066', dark: '#cc9e00', glow: 'rgba(255, 204, 0, 0.5)' },    // 4: 金石
    { main: '#cc66ff', light: '#e0a3ff', dark: '#9933cc', glow: 'rgba(204, 102, 255, 0.5)' },  // 5: 紫晶
    { main: '#ff8c1a', light: '#ffb366', dark: '#cc6600', glow: 'rgba(255, 140, 26, 0.5)' },   // 6: 琥珀
];

/** 粒子類別 - 優化：使用簡單圓形與批次渲染 */
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.decay = Math.random() * 0.04 + 0.03;
        this.size = Math.random() * 5 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.size *= 0.95;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Renderer — Canvas 渲染器
 */
export class Renderer {
    constructor(canvas, boardSize = BOARD_SIZE) {
        this.canvas = canvas;
        // alpha: false 提升渲染效能
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.boardSize = boardSize;
        this.particles = [];
        this.hintPhase = 0;

        this.gemImages = [];
        for (let i = 1; i <= 6; i++) {
            const img = new Image();
            img.src = `assets/images/gem${i}.png`;
            this.gemImages[i] = img;
        }

        this._calcDimensions();
    }

    _calcDimensions() {
        const internalSize = 840;
        this.cellSize = Math.floor(internalSize / this.boardSize);
        this.gemSize = this.cellSize;

        this.canvas.width = internalSize;
        this.canvas.height = internalSize;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
    }

    screenToBoard(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return { row, col };
    }

    boardToPixel(row, col) {
        return {
            x: col * this.cellSize + this.cellSize / 2,
            y: row * this.cellSize + this.cellSize / 2,
        };
    }

    resize() {
        this._calcDimensions();
    }

    render(game) {
        const ctx = this.ctx;
        const board = game.board;

        // 背景清理 (用 fillRect 取代 clearRect 以配合 alpha: false)
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this._drawBoardBackground(ctx);

        // 寶石層
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                const type = board.getGem(r, c);
                if (type === 0) continue;

                let drawR = r;
                let drawC = c;
                let scale = 1;
                let alpha = 1;

                if (game.swapAnim) {
                    const sa = game.swapAnim;
                    const t = this._easeInOutCubic(sa.progress);
                    if (r === sa.r1 && c === sa.c1) {
                        drawR = sa.r1 + (sa.r2 - sa.r1) * t;
                        drawC = sa.c1 + (sa.c2 - sa.c1) * t;
                    } else if (r === sa.r2 && c === sa.c2) {
                        drawR = sa.r2 + (sa.r1 - sa.r2) * t;
                        drawC = sa.c2 + (sa.c1 - sa.c2) * t;
                    }
                }

                if (game.removeAnim) {
                    const key = `${r},${c}`;
                    if (game.removeAnim.cells.has(key)) {
                        const t = game.removeAnim.progress;
                        scale = 1 - t;
                        alpha = 1 - t;

                        if (t < 0.1 && this.particles.length < 150) {
                            const pos = this.boardToPixel(r, c);
                            const color = GEM_COLORS[type]?.main || '#fff';
                            for (let i = 0; i < 3; i++) {
                                this.particles.push(new Particle(pos.x, pos.y, color));
                            }
                        }
                        if (scale <= 0) continue;
                    }
                }

                if (game.fallAnim) {
                    const fa = game.fallAnim;
                    const t = this._easeOutBounce(fa.progress);
                    for (const move of fa.moves) {
                        if (move.toR === r && move.toC === c) {
                            drawR = move.fromR + (move.toR - move.fromR) * t;
                            break;
                        }
                    }
                    for (const gem of fa.newGems) {
                        if (gem.row === r && gem.col === c) {
                            const startR = -1 - (gem.row);
                            drawR = startR + (gem.row - startR) * t;
                            break;
                        }
                    }
                }

                const pos = this.boardToPixel(drawR, drawC);
                if (alpha < 1) ctx.globalAlpha = alpha;
                this._drawGem(ctx, type, pos.x, pos.y, (this.gemSize / 2) * scale);
                if (alpha < 1) ctx.globalAlpha = 1;
            }
        }

        if (game.selectedGem) {
            this._drawSelection(ctx, game.selectedGem.row, game.selectedGem.col);
        }

        if (game.hintTarget) {
            this.hintPhase += 0.05;
            const hintAlpha = 0.3 + Math.sin(this.hintPhase) * 0.3;
            this._drawHint(ctx, game.hintTarget.r1, game.hintTarget.c1, hintAlpha);
            this._drawHint(ctx, game.hintTarget.r2, game.hintTarget.c2, hintAlpha);
        }

        // 粒子層 - 優化：批次渲染並減少狀態切換
        if (this.particles.length > 0) {
            const len = this.particles.length;
            for (let i = len - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.update();
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                } else {
                    p.draw(ctx);
                }
            }
            ctx.globalAlpha = 1.0;
        }
    }

    _drawBoardBackground(ctx) {
        ctx.beginPath();
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if ((r + c) % 2 === 0) {
                    ctx.fillStyle = 'rgba(255,255,255,0.03)';
                    ctx.fillRect(c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }

    _drawGem(ctx, type, x, y, radius) {
        const img = this.gemImages[type];
        if (!img || !img.complete) return;

        const size = radius * 2;
        const px = x - size / 2;
        const py = y - size / 2;

        ctx.save();
        this._roundRectPath(ctx, px, py, size, size, 12);
        ctx.clip();

        const zoom = 1.05;
        const drawSize = size * zoom;
        const offset = (drawSize - size) / 2;
        ctx.drawImage(img, px - offset, py - offset, drawSize, drawSize);
        ctx.restore();
    }

    _roundRectPath(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    _drawSelection(ctx, row, col) {
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const pulse = 0.6 + Math.sin(performance.now() / 500) * 0.4;
        ctx.save();
        ctx.strokeStyle = `rgba(0, 229, 255, ${pulse})`;
        ctx.lineWidth = 4;
        this._roundRectPath(ctx, x + 4, y + 4, this.cellSize - 8, this.cellSize - 8, 10);
        ctx.stroke();
        ctx.restore();
    }

    _drawHint(ctx, row, col, alpha) {
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.lineWidth = 3;
        this._roundRectPath(ctx, x + 4, y + 4, this.cellSize - 8, this.cellSize - 8, 10);
        ctx.stroke();
        ctx.restore();
    }

    _easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    _easeOutBounce(t) {
        const n1 = 7.5625, d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        else return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
}
