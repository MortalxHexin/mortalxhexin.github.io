/**
 * Carousel: the round tray of a slide projector, six slides standing in a
 * ring (six, so none stands edge-on to the viewer), one film to a slide; blank slides, drawn faint, wait for films still
 * being made. The slide at the reading place, on the right where a slide
 * faces the viewer flat, stands raised. Hovering a slide lights it and lifts
 * it a little, and the tray stays still; pressing it turns the tray to bring
 * it to the reading place. Dragging across turns the tray by hand; let go and
 * it settles into the nearest slot. At rest the newest film is at the reading
 * place and its top carries the bright mark.
 *
 * Picking is tested against where the tray is going (the spring's target),
 * never where it is on screen (rule 01). Slides are re-ordered back to front
 * as the tray turns (rule 06): their groups move, nothing else.
 */
const {
  Cam, circ, fit, poly, proj, prism, rings, facing, seg,
  spring, stepS, mk, place, flatDot, pointer, put, register, disposer, solid,
} = HL;

const ITEMS = (typeof BIN !== "undefined" && BIN) || [["小麻雀追袋記", 33], ["光的演變", 92]]; // newest first
const N = 6, RO = 68, RI = 26, TH = 10, R0 = 30, R1 = 62, SH = 32, RISE = 20, PEEK = 7;
const READ = -Math.PI / 4, STEP = (2 * Math.PI) / N, NEWEST = 0;
const slot = (i) => ITEMS[i] || ["製作中", null];
const wrap = (i) => ((i % N) + N) % N;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let pull = value; // slots the tray turns for a drag across the whole stage
  const C = Cam(45, 0.5, 1.72);
  fit(C, [[-RO - 6, -RO - 6, -4], [RO + 6, RO + 6, -4], [RO + 6, -RO - 6, -4], [-RO - 6, RO + 6, -4], [RO * 0.7, -RO * 0.7, TH + SH + RISE + 4]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const [br, bi] = rings(-RO - 8, -RO - 8, RO + 8, RO + 8, 12, 2);
  put(solid(g), prism(P, front, br, bi, -4, 0));
  put(solid(g), prism(P, front, circ(RO, 64), circ(RO - 1.6, 64), 0, TH));
  mk("path", { d: poly(circ(RO - 5, 64).map((q) => P(q.u, q.v, TH))), class: "nf lo" }, g);
  // the reading place: a short notch on the rim where the raised slide stands
  mk("path", { d: seg(P(Math.cos(READ) * (RO - 5), Math.sin(READ) * (RO - 5), TH), P(Math.cos(READ) * (RO + 3), Math.sin(READ) * (RO + 3), TH)), class: "nf" }, g);
  const layer = mk("g", {}, g);
  const hub = solid(layer);
  put(hub, prism(P, front, circ(RI - 6, 32), circ(RI - 7.2, 32), TH, TH + 8));
  mk("path", { d: poly(circ(5, 16).map((q) => P(q.u, q.v, TH + 8))), class: "nf lo" }, hub.g);

  const slides = Array.from({ length: N }, (_, i) => {
    const [name, s] = slot(i), film = s != null, grp = mk("g", {}, layer);
    return { name, film, grp, back: mk("path", { class: "lo" }, grp), face: mk("path", { class: film ? "sil" : "lo" }, grp), base: film ? "sil" : "lo", win: mk("path", { class: "nf lo" }, grp), lift: spring(0, { eps: 0.05 }) };
  });
  const mark = flatDot(g, C, 1.5, "dot");

  // the tray's turn, in slots: slide i stands at angle READ + (i - turn) * STEP
  const turn = spring(NEWEST, { eps: 0.0005 });
  let sel = NEWEST, hov = -1, drag = null, over = false, last = NaN;
  const angle = (i, t) => READ + (i - t) * STEP;
  const quad = (i, t, lift, off) => {
    const a = angle(i, t), cx = Math.cos(a), cy = Math.sin(a), z0 = TH - 3 + lift;
    const w = (r, z) => P(cx * r - cy * off, cy * r + cx * off, z);
    return { w, z0, pts: [w(R0, z0), w(R1, z0), w(R1, z0 + SH), w(R0, z0 + SH)], depth: cx + cy };
  };

  function draw() {
    const order = slides.map((S, i) => {
      const q = quad(i, turn.x, S.lift.x, 0.8), b = quad(i, turn.x, S.lift.x, -0.8), z0 = q.z0;
      S.face.setAttribute("d", poly(q.pts));
      S.back.setAttribute("d", poly(b.pts));
      S.win.setAttribute("d", S.film ? poly([q.w(R0 + 5, z0 + 5), q.w(R1 - 5, z0 + 5), q.w(R1 - 5, z0 + SH - 5), q.w(R0 + 5, z0 + SH - 5)]) : "");
      return [q.depth, S.grp];
    });
    order.push([0, hub.g]);
    order.sort((p, q) => p[0] - q[0]).forEach(([, el]) => layer.appendChild(el));
    const a = angle(sel, turn.x), r = (R0 + R1) / 2;
    place(mark, P(Math.cos(a) * r, Math.sin(a) * r, TH - 3 + slides[sel].lift.x + SH + 3));
  }

  const B = register(stage, (dt) => {
    let m = stepS(turn, dt);
    slides.forEach((S) => { if (stepS(S.lift, dt)) m = true; });
    const key = turn.x + slides.reduce((t, S) => t + S.lift.x, 0);
    if (key !== last) { last = key; draw(); }
    return m;
  });
  bag.add(B.unregister);

  const inside = (pt, pg) => {
    let c = false;
    for (let i = 0, j = pg.length - 1; i < pg.length; j = i++) {
      const [xi, yi] = pg[i], [xj, yj] = pg[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  /** The slide under the pointer, nearest first, where the tray is going and at each slide's target lift. */
  function pick(p) {
    const qs = slides.map((S, i) => [quad(i, turn.t, S.lift.t, 0).depth, i]).sort((a, b) => b[0] - a[0]);
    for (const [, i] of qs) if (inside(p, quad(i, turn.t, slides[i].lift.t, 0).pts)) return i;
    return -1;
  }
  function settle() {
    slides.forEach((S, i) => {
      S.lift.t = i === sel ? RISE : i === hov ? PEEK : 0;
      S.face.setAttribute("class", i === hov || (hov < 0 && over && i === sel) ? "sil hi" : S.base); // a blank slide lights like any other
    });
    mark.setAttribute("class", hov >= 0 && hov !== sel ? "dot off" : "dot");
    const i = hov >= 0 ? hov : over ? sel : -1;
    read.textContent = i < 0 ? "rest" : `${String(i + 1).padStart(2, "0")} · ${slides[i].name}`;
    B.wake();
  }
  /** Turn the tray the short way round so slide i comes to the reading place. */
  const choose = (i) => { sel = i; const d = ((((i - turn.t) % N) + N + N / 2) % N) - N / 2; turn.t = Math.round(turn.t + d); };
  const letGo = () => { if (drag && drag.moved) { turn.t = Math.round(turn.t); sel = wrap(turn.t); } drag = null; };

  bag.add(pointer(stage, {
    move: (p, e) => {
      over = true;
      if (drag && e && e.buttons) {
        if (Math.abs(p[0] - drag.x0) > 4) drag.moved = true;
        if (drag.moved) { turn.t = drag.t0 - ((p[0] - drag.x0) / 400) * pull; hov = -1; sel = wrap(Math.round(turn.t)); settle(); return; }
      } else letGo();
      hov = pick(p); settle();
    },
    down: (p) => {
      over = true;
      const i = pick(p);
      drag = { x0: p[0], t0: turn.t, moved: false };
      if (i >= 0) { choose(i); hov = i; }
      settle();
    },
    leave: () => { over = false; hov = -1; if (drag) { turn.t = Math.round(turn.t); sel = wrap(turn.t); drag = null; } settle(); },
  }));
  settle();
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { pull = v; }, destroy: bag.dispose };
}

hairline({
  name: "carousel",
  means: "A slide projector's tray, one film to a slide: hover lights a slide, press brings it to the reading place, drag spins the tray.",
  rules: [1, 5, 6, 8],
  range: [3, 4, 6],
  tour: [[130, 150], [230, 120], [300, 150], null],
  mount,
});
