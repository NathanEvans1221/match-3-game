# 🐾 波弟消消樂 (Match-3 Game)

一款以可愛貓咪（波弟）為主題的網頁版三消益智遊戲。採用 HTML5 Canvas 渲染技術，支援桌機與各種移動裝置。

## 🎮 遊戲特點
- **貓咪主題**：所有方塊均為精美的貓咪關聯圖示（貓臉、肉球 🐾、毛線球等）。
- **雙模式選擇**：
  - **經典模式**：無時間限制，輕鬆享受連鎖消除的快感。
  - **計時模式**：在 60 秒內挑戰最高分，測試反應速度。
- **手機優化**：
  - 支援觸控滑動 (Swipe) 手勢直接交換方塊。
  - 響應式佈局，自動填滿螢幕空間。
- **動感音效**：內建 Web Audio API 合成音效，隨連鎖次數提高音調，增強遊戲回饋感。

## 🛠 技術棧
- **核心**: Vanilla JavaScript (ES Modules)
- **渲染**: HTML5 Canvas API
- **樣式**: CSS3 (具備動態漸層與響應式 Design)
- **部署**: Cloudflare Pages (支援 Wrangler CLI)

## 📌 歷史挑戰與解決方案

### 1. 棋盤填滿與紅色空白區域問題
**問題描述**：在某些螢幕比例（如橫向模式）下，棋盤兩側會出現大面積空白（紅色區域），且方塊圖示看起來偏小。
**解決方案**：
- **寬度優先原則**：修改 `renderer.js` 的 `_calcDimensions` 邏輯，不再同時被高度和寬度限制，改為以螢幕寬度為主要基準，確保棋盤水平撐滿。
- **放大補償**：因圖片素材自帶透明邊界，在 `_drawGem` 時額外實施 `1.4x` 或 `1.05x` 的繪製放大，並移除 Canvas 裁切限制，使視覺效果達到最飽滿的狀態。
- **CSS 移除硬性限制**：放寬 `.game-container` 的 `max-width` 限制，並將容器設為 `fit-content` 以避免外框溢出。

## 🚀 快速開始
1. 確保電腦已安裝 [Node.js](https://nodejs.org/)。
2. 使用 VS Code 的 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) 或以下指令開啟本機服務：
   ```bash
   python -m http.server
   ```
3. 部署至 Cloudflare：
   ```bash
   npm install -g wrangler
   wrangler login
   wrangler pages deploy .
   ```

---
*Created by [chiisen](https://github.com/chiisen) — v0.2.0*
