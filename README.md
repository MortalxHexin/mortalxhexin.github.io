# gandongdexingfu.github.io

作品網站：每一幀都由代碼畫成的短片。網址 https://gandongdexingfu.github.io

## 新增一支作品
1. 壓一版網頁用影片：`ffmpeg -i 成片.mp4 -vf scale=540:960 -c:v libx264 -crf 26 -preset slow -movflags +faststart -c:a aac -b:a 96k media/<id>.mp4`
2. 截封面：`ffmpeg -ss <秒> -i media/<id>.mp4 -frames:v 1 -q:v 3 media/<id>.jpg`
3. 重算指紋（音量波形與安靜段）寫進 `media/fingerprints.json`（腳本在 lemo-opuscar 的 `mine/tools/`）。
4. 在 `index.html` 的 `WORKS` 加一筆：`id`、`fig`、`style`（風格標籤，篩選按鈕會自動長出來）、`date`、`title`、`en`、`blurb`、`spec`、`chapters`（讀數用的章節）、`how`（做法連結）。

## 授權
網站代碼 MIT。影片中的照片由 AI 生成；畫面、音效與配樂由代碼生成，配樂取樣來自 CC0 樂器庫。
