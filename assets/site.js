// site.js — 首頁與作品頁共用：讀資料、畫影片指紋、滑過拖動、播放
const SITE = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = t => { const m = Math.floor(t / 60), s = (t % 60).toFixed(1).padStart(4, '0'); return `${String(m).padStart(2, '0')}:${s}`; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = base => Promise.all([fetch(base + 'works.json').then(r => r.json()), fetch(base + 'media/fingerprints.json').then(r => r.json())]);
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  // 影片接近畫面時才開始載入
  const lazy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const v = e.target; v.src = v.dataset.src; v.preload = 'metadata'; lazy.unobserve(v); } }), { rootMargin: '600px 0px' });

  // 把一塊展示板裡的 .stage / .print / .readout / .play 串起來
  function mount(el, w, fp, opts = {}) {
    const D = fp.dur, svg = el.querySelector('.print svg'), X = t => t / D * 1000;
    fp.silences.forEach(([a, b]) => svg.appendChild(svgEl('rect', { class: 'sil', x: X(a), width: Math.max(2, X(b) - X(a)), y: 6, height: 38 })));
    const n = fp.level.length; let d = '';
    fp.level.forEach((v, i) => { const x = (i + .5) / n * 1000, h = 2 + v * 34; d += `M${x.toFixed(1)} ${25 - h / 2}V${25 + h / 2}`; });
    svg.appendChild(svgEl('path', { class: 'lv', d }));
    svg.appendChild(svgEl('line', { class: 'base', x1: 0, x2: 1000, y1: 50, y2: 50 }));
    w.chapters.forEach(([t]) => svg.appendChild(svgEl('line', { class: 'tick', x1: X(t), x2: X(t), y1: 46, y2: 54 })));
    const head = svgEl('line', { class: 'head', x1: 0, x2: 0, y1: 0, y2: 54 }); svg.appendChild(head);
    el.querySelector('.dur').textContent = `${D.toFixed(1)} s`;

    const video = el.querySelector('video'), stage = el.querySelector('.stage'), tOut = el.querySelector('.t'), cOut = el.querySelector('.c'), btn = el.querySelector('.play');
    if (opts.eager) { video.src = video.dataset.src; video.preload = 'auto'; } else lazy.observe(video);
    const chapterAt = t => { let c = w.chapters[0][1], i = 0; w.chapters.forEach(([a, name], j) => { if (t >= a) { c = name; i = j; } }); return [c, i]; };
    const show = t => { head.setAttribute('x1', X(t)); head.setAttribute('x2', X(t)); tOut.textContent = fmt(t); const [c, i] = chapterAt(t); cOut.textContent = c; if (opts.onChapter) opts.onChapter(i); };
    const seek = t => { t = Math.max(0, Math.min(D - .05, t)); show(t); if (!video.src) { video.src = video.dataset.src; } if (video.readyState >= 1) video.currentTime = t; else video.addEventListener('loadedmetadata', () => { video.currentTime = t; }, { once: true }); };
    const fromX = (e, box) => { const r = box.getBoundingClientRect(); return (e.clientX - r.left) / r.width * D; };
    [stage, el.querySelector('.print')].forEach(box => {
      box.addEventListener('pointermove', e => { if (!video.paused) return; stage.classList.add('scrubbing'); seek(fromX(e, box)); });
      box.addEventListener('pointerdown', e => { if (!video.paused) seek(fromX(e, box)); });
      box.addEventListener('pointerleave', () => stage.classList.remove('scrubbing'));
    });
    stage.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); seek(video.currentTime + (e.key === 'ArrowRight' ? 1 : -1)); } });
    const ICON = { play: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.8v8.4L10.2 6z"/></svg>', pause: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.6 1.8h2.4v8.4H2.6zM7 1.8h2.4v8.4H7z"/></svg>' };
    const label = () => { const on = !video.paused; btn.innerHTML = on ? `${ICON.pause}<span>暫停</span>` : `${ICON.play}<span>播放<small>有聲</small></span>`; btn.classList.toggle('on', on); btn.setAttribute('aria-label', on ? '暫停' : '播放（有聲）'); };
    label();
    btn.addEventListener('click', () => {
      document.querySelectorAll('video').forEach(v => { if (v !== video && !v.paused) { v.pause(); v.muted = true; } });
      if (!video.src) video.src = video.dataset.src;
      if (video.paused) { video.muted = false; video.play(); } else { video.pause(); video.muted = true; }
    });
    video.addEventListener('play', label); video.addEventListener('pause', label);
    video.addEventListener('timeupdate', () => { if (!video.paused) show(video.currentTime); });
    video.addEventListener('ended', () => { video.muted = true; label(); });
    const q = new URLSearchParams(location.search).get('at'); if (q) show(D * +q);
    return { seek, play: () => { if (video.paused) btn.click(); }, video };
  }
  const plateHTML = (w, base, { link = true } = {}) => `
      <div class="plate-head"><span>${w.fig}</span><span><span class="style-tag">${esc(w.style)}</span>　${w.date}</span></div>
      <div class="stage" tabindex="0" aria-label="${esc(w.title)}：左右移動以瀏覽畫面">
        <img src="${base}media/${w.id}.webp" alt="${esc(w.title)}的畫面" loading="lazy" decoding="async">
        <video data-src="${base}media/${w.id}.mp4" muted playsinline preload="none" poster="${base}media/${w.id}.webp"></video>
        <span class="hint">左右移動瀏覽</span>
      </div>
      ${link ? `<div class="title"><h2><a href="${base}works/${w.id}/">${esc(w.title)}</a></h2><div class="en">${esc(w.en)}</div><p>${esc(w.blurb)}</p></div>` : ''}
      <div class="print" aria-hidden="true"><svg viewBox="0 0 1000 54" preserveAspectRatio="none"></svg></div>
      <div class="readout"><span><b class="t">00:00.0</b> <span class="c">${esc(w.chapters[0][1])}</span></span><span class="dur"></span></div>
      <div class="actions"><button class="play">播放（有聲）</button>${link ? `<a href="${base}works/${w.id}/">看片頁與幕後</a>` : ''}</div>`;
  return { fmt, esc, load, mount, plateHTML };
})();
