"""由 works.json 產生每支片的作品頁 works/<id>/index.html（含各自的分享卡片標籤）
用法（在網站倉庫根目錄）：python3 tools/build_pages.py"""
import json, html
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://gandongdexingfu.github.io/'
works = json.loads((ROOT / 'works.json').read_text())
e = html.escape

def code_html(src):
    out = []
    for line in src.split('\n'):
        i = line.find('//')
        out.append(e(line) if i < 0 else e(line[:i]) + '<span class="cm">' + e(line[i:]) + '</span>')
    return '\n'.join(out)

for n, w in enumerate(works):
    prev_w, next_w = works[n - 1] if n > 0 else None, works[n + 1] if n + 1 < len(works) else None
    chapters = '\n'.join(f'<li><button type="button" data-t="{t}"><span>{int(t // 60):02d}:{t % 60:04.1f}</span><span>{e(name)}</span></button></li>' for t, name in w['chapters'])
    spec = ''.join(f'<dt>{e(a)}</dt><dd>{e(b)}</dd>' for a, b in w['spec'])
    pairs = '\n'.join(f'''<article class="pair">
  <div class="code"><div class="head"><span>{e(w['fig'])}.{i + 1}</span><span>{e(b['file'])}・節錄整理</span></div>
    <h3>{e(b['title'])}</h3><p class="note">{e(b['note'])}</p>
    <pre><code>{code_html(b['code'])}</code></pre></div>
  <figure><img src="../../media/bts/{b['img']}.webp" alt="{e(b['title'])}的畫面" loading="lazy" decoding="async">{f'<button type="button" data-t="{b["at"]}">看片中這一段</button>' if b['at'] is not None else ''}</figure>
</article>''' for i, b in enumerate(w['bts']))
    nav = (f'<a href="../{prev_w["id"]}/">上一支　{e(prev_w["title"])}</a>' if prev_w else '<span></span>') + (f'<a href="../{next_w["id"]}/">下一支　{e(next_w["title"])}</a>' if next_w else '<a href="../../">回到全部作品</a>')
    page = f'''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(w['title'])} · 感動的幸福</title>
<meta name="description" content="{e(w['blurb'])}">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#E9ECEC">
<meta property="og:type" content="video.other">
<meta property="og:site_name" content="感動的幸福">
<meta property="og:title" content="{e(w['title'])} · 每一幀都由代碼畫成">
<meta property="og:description" content="{e(w['blurb'])}">
<meta property="og:url" content="{SITE}works/{w['id']}/">
<meta property="og:image" content="{SITE}media/{w['id']}.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500&family=Noto+Sans+TC:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../assets/site.css">
</head>
<body>
<div class="wrap">
  <header class="top">
    <a class="mark" href="../../">感動的幸福<span>gandongdexingfu</span></a>
    <nav class="top"><a href="../../#works">作品</a><a href="../../#about">關於</a><a href="https://github.com/gandongdexingfu/lemo-opuscar/tree/main/mine">做法</a></nav>
  </header>
  <div class="crumb"><a href="../../">全部作品</a>　/　<a href="../../?style={e(w['style'])}">{e(w['style'])}</a></div>

  <section class="work">
    <article class="plate" id="player" data-id="{w['id']}"></article>
    <div>
      <h1>{e(w['title'])}</h1>
      <div class="en">{e(w['en'])}</div>
      <p class="lede">{e(w['blurb'])}</p>
      <ol class="chapters" aria-label="章節，點一下跳到那一段">
{chapters}
      </ol>
      <dl class="spec">{spec}</dl>
      <div class="links"><a href="{e(w['how'])}">做法與踩過的坑</a><a href="{e(w['code'])}">全部原始碼</a><a href="{e(w['release'])}">素材與原檔下載</a></div>
    </div>
  </section>

  <section class="bts" aria-labelledby="bts-h">
    <h2 id="bts-h">代碼 → 畫面</h2>
    <p>這支片裡的三個畫面，和畫出它們的那幾行代碼。</p>
{pairs}
  </section>

  <nav class="next">{nav}</nav>
  <footer id="about">
    <span>照片由 AI 生成；畫面、音效與配樂由代碼生成。</span>
    <span>© 2026 gandongdexingfu</span>
  </footer>
</div>
<script src="../../assets/site.js"></script>
<script>
SITE.load('../../').then(([WORKS, FP]) => {{
  const host = document.getElementById('player'), w = WORKS.find(x => x.id === host.dataset.id);
  host.innerHTML = SITE.plateHTML(w, '../../', {{ link: false }});
  const items = [...document.querySelectorAll('.chapters li')];
  const film = SITE.mount(host, w, FP[w.id], {{ eager: true, onChapter: i => items.forEach((li, j) => li.classList.toggle('on', i === j)) }});
  const jump = (t, play) => {{ film.seek(+t); if (play) film.play(); }};
  document.querySelectorAll('.chapters button').forEach(b => b.addEventListener('click', () => jump(b.dataset.t, !film.video.paused)));
  document.querySelectorAll('.pair figure button').forEach(b => b.addEventListener('click', () => {{ host.scrollIntoView({{ behavior: 'smooth', block: 'start' }}); jump(b.dataset.t, true); }}));
}});
</script>
</body>
</html>
'''
    out = ROOT / 'works' / w['id'] / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)
    print('→', out.relative_to(ROOT))
