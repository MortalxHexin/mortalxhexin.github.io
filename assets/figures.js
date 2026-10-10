// figures.js — 把 hairline 線稿圖掛到網站上
// 引擎 assets/hairline/kernel.js 來自 github.com/lucasmarkes/hairline（MIT，見 assets/hairline/LICENSE），原封不動；
// 圖（frame / board / lamps / reel）是這個網站自己畫的，每張都照它的十條規則。
// 圖檔最後一行呼叫 hairline({...})：這裡先接住，等頁面需要時再掛上去。
window.FIGS = window.FIGS || {};
window.hairline = fig => { window.FIGS[fig.name] = fig; };

const FIG = (() => {
  const LAYER = { code: '代碼', ink: '墨線', wash: '淡彩', photo: '照片', frame: '成片' };
  // 讀數翻成網站的口吻：英文層名配中文；rest 換成每張圖自己的提示
  const say = (t, rest) => t === "rest" ? rest
    : t.startsWith("reel · ") ? `片長 ${t.slice(7)}`
    : t.startsWith('gap ') ? `展開 ${t.slice(4)}`
    : t.replace(/\b(code|ink|wash|photo|frame)\b/, m => `${LAYER[m]} ${m}`);

  /** 在 host（.fig）裡掛一張圖。opts: rest 靜止時的讀數、intro 進場時自己演一圈、onRead 每次讀數變了 */
  function mount(host, name, opts = {}) {
    const fig = window.FIGS[name]; if (!fig) return null;
    HL.inject(document);
    const stage = host.querySelector('.fig-stage'), out = host.querySelector('.fig-read');
    stage.setAttribute('data-hairline', name); stage.setAttribute('role', 'img'); stage.setAttribute('aria-label', host.dataset.label || fig.means);
    const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage);
    let text = '';
    const read = {
      get textContent() { return text; },
      set textContent(v) { text = v == null ? '' : String(v); out.textContent = say(text, opts.rest || '靜止'); if (opts.onRead) opts.onRead(text); },
    };
    const handle = fig.mount({ stage, svg, read }, fig.range[1]);
    if (!text) read.textContent = 'rest';
    // 第一次出現時，看不見的手自己走一圈給你看，你的手一進來它就讓開
    if (opts.intro && fig.tour && !HL.reducedMotion()) {
      const lap = HL.tour(stage, fig.tour, i => { if (fig.tour[i] === null) lap.stop(); });
    }
    // 假裝游標停在 viewBox 的某一點（讓圖跟著影片走時用）
    const ghost = (type, p) => {
      const r = stage.getBoundingClientRect();
      stage.dispatchEvent(new PointerEvent(type, { pointerType: 'mouse', pointerId: 7, bubbles: true,
        clientX: r.left + (p ? p[0] : -9) / 400 * r.width, clientY: r.top + (p ? p[1] : -9) / 320 * r.height }));
    };
    // 掃一遍畫面，記下每個名字落在哪裡（取中心），之後就能「指」到它
    let where = null;
    const anchors = () => {
      if (where) return where;
      const acc = {};
      for (let y = 10; y < 320; y += 8) for (let x = 10; x < 400; x += 8) {
        ghost('pointermove', [x, y]);
        const m = /^\d+ · (.+)$/.exec(text); if (!m) continue;
        const a = acc[m[1]] || (acc[m[1]] = [0, 0, 0]); a[0] += x; a[1] += y; a[2]++;
      }
      ghost('pointerleave');
      where = {}; for (const k in acc) where[k] = [acc[k][0] / acc[k][2], acc[k][1] / acc[k][2]];
      return where;
    };
    let hand = false;
    stage.addEventListener('pointerenter', e => { if (e.isTrusted) hand = true; });
    stage.addEventListener('pointerleave', e => { if (e.isTrusted) hand = false; });
    /** 讓圖指著某個名字（null 回到靜止）；有人的手在圖上時不打擾 */
    const point = label => {
      if (hand) return;
      if (label == null) return ghost('pointerleave');
      const p = anchors()[label];
      if (p) ghost('pointermove', p); // 圖上沒有的段落（例如「安靜」）就停在上一格
    };
    return { stage, handle, point, get text() { return text; } };
  }
  return { mount };
})();
