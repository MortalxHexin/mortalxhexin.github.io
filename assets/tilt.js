// tilt.js — 讓 [data-tilt] 的板子跟著游標微微傾斜、浮起來，表面掃過一道光
// data-tilt 的值是最大傾角（度）。手機和「減少動態效果」時不作用。
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ease = 'transform .7s cubic-bezier(.32,.72,0,1), box-shadow .5s cubic-bezier(.32,.72,0,1)';
  document.addEventListener('pointerover', e => {
    const el = e.target.closest && e.target.closest('[data-tilt]');
    if (!el || el._tilt) return;
    el._tilt = true;
    const max = +el.dataset.tilt || 6, lift = +(el.dataset.lift || 18);
    let box = null, raf = 0, last = null;
    const frame = () => {
      raf = 0; if (!last) return;
      const x = (last.clientX - box.left) / box.width, y = (last.clientY - box.top) / box.height;
      el.style.setProperty('--ry', ((x - .5) * 2 * max).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((.5 - y) * 2 * max).toFixed(2) + 'deg');
      el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    };
    el.addEventListener('pointerenter', ev => {
      if (ev.pointerType !== 'mouse') return;
      el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      box = el.getBoundingClientRect(); // 進場時量一次，傾斜後不再量，免得越傾越歪
      el.style.transition = 'transform .25s cubic-bezier(.32,.72,0,1), box-shadow .5s cubic-bezier(.32,.72,0,1)';
      el.style.setProperty('--lift', lift + 'px'); el.classList.add('tilting');
    });
    el.addEventListener('pointermove', ev => { if (ev.pointerType !== 'mouse' || !box) return; last = ev; if (!raf) raf = requestAnimationFrame(frame); });
    el.addEventListener('pointerleave', () => {
      last = null; box = null; el.style.transition = ease; el.classList.remove('tilting');
      el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); el.style.setProperty('--lift', '0px');
    });
    el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: e.pointerType, clientX: e.clientX, clientY: e.clientY }));
  });
})();
