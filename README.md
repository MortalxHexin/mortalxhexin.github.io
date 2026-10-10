# gandongdexingfu.github.io

作品網站：每一幀都由代碼畫成的短片。網址 https://gandongdexingfu.github.io

## 結構
- `works.json`：所有作品的資料（唯一的資料來源）。首頁和作品頁都從這裡讀。
- `index.html`：首頁（作品牆、風格篩選）。
- `works/<id>/index.html`：每支片的作品頁，由 `tools/build_pages.py` 產生，不要手改。
- `assets/site.css`、`assets/site.js`：共用的樣式與「影片指紋＋滑過拖動」元件。
- `404.html`：找不到頁面時顯示（空片盤）。
- `assets/hairline/`：線稿圖。`kernel.js` 是 [hairline](https://github.com/lucasmarkes/hairline) 的引擎（MIT，原封不動，授權見同資料夾 `LICENSE`）；`frame.js`（首頁：一幀的五層）、`board.js`（小麻雀：圖鑑的十格）、`lamps.js`（光的演變：七盞光）、`reel.js`（404：空片盤）是本站自己畫的。`assets/figures.js` 把它們掛到頁面上，換成網站色票，讀數翻成中文。
- `media/`：網頁版影片、封面、指紋資料、分享卡片；`media/bts/`：「代碼 → 畫面」的配圖。

## 新增一支作品
1. 壓網頁版影片：`ffmpeg -i 成片.mp4 -vf scale=540:960 -c:v libx264 -crf 26 -preset slow -movflags +faststart -c:a aac -b:a 96k media/<id>.mp4`
2. 截封面：`ffmpeg -ss <秒> -i media/<id>.mp4 -frames:v 1 -q:v 3 media/<id>.jpg`，再轉一份 `media/<id>.webp`。
3. 算指紋：`python3 tools/fingerprint.py <id>`。
4. 在 `works.json` 加一筆：`id`、`fig`、`style`（風格標籤，篩選按鈕會自動長出來）、`date`、`title`、`en`、`blurb`、`spec`、`chapters`、`how`、`code`、`release`，以及三組 `bts`（title、note、file、code、img、at）。配圖放 `media/bts/<img>.webp`（720×900）。
5. 線稿圖（可選）：用 hairline 的 `hairline-create` 技能畫一張，放 `assets/hairline/<名>.js`；讀數寫成 `01 · <章節名>`，名字和 `chapters` 一致，點圖就能跳到那一段，播放時圖也會跟著走。在 `works.json` 加 `figure`（name、title、label、rest、cap）。
6. 產生作品頁：`python3 tools/build_pages.py`。

## 授權
網站代碼 MIT。線稿引擎 `assets/hairline/kernel.js` © Lucas Marques，MIT。影片中的照片由 AI 生成；畫面、音效與配樂由代碼生成，配樂取樣來自 CC0 樂器庫。
