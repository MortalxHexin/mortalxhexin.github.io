/**
 * Frame: one vertical film frame taken apart into the five panes it is made
 * of, standing one behind the other: code at the back, then ink, wash, photo,
 * and the frame itself, sprocket holes down both sides, nearest. The pointer's
 * x fans them apart through a spring; the pane under it gets the bright edge
 * and its name goes to the read-out. At rest the panes stand slightly apart
 * and the code's cursor is the bright mark: everything starts there.
 *
 * Picking is tested against the target gap, not the gap on screen (rule 01).
 * Panes are painted back to front; each one's dashed drops go in before it.
 */
const {
  Cam, clamp, fillet, lerp, reducedMotion, fit, open, poly, proj, rrect, seg, spring, stepS,
  disposer, mk, place, pointer, register,
} = HL;

/** Rest gaps between neighbours, as shares of the full gap: the frame stands off the stack, asking to be pulled. */
const RW = [1, 0.75, 0.75, 2.2];
const W = 72, H = 128, F = 0.76, TK = 1.6, REST = 0.36, N = 5; // marks are drawn in 72 × 128 units, scaled by F

/** A closed wobbly ring around (cu, cv): a patch of wash. */
const blob = (cu, cv, ru, rv, ph) => Array.from({ length: 30 }, (_, k) => {
  const a = (k / 30) * Math.PI * 2, w = 1 + 0.13 * Math.sin(3 * a + ph) + 0.07 * Math.sin(5 * a - ph);
  return [cu + Math.cos(a) * ru * w, cv + Math.sin(a) * rv * w];
});
const box = (u0, v0, u1, v1, r) => rrect(u0, v0, u1, v1, r, 3).map((q) => [q.u, q.v]);

/** A looping hand line rising across the pane: a prolate cycloid, slightly uneven. */
const INK = Array.from({ length: 150 }, (_, k) => {
  const s = k / 149, t = s * Math.PI * 9;
  return [12 + s * 46 - 5.5 * Math.sin(t) + 1.4 * Math.sin(t * 0.31), 18 + s * 90 + 6.5 * Math.cos(t)];
});

/** Code: indented rows of uneven length, top down. [indent, length]. */
const ROWS = [[0, 30], [1, 38], [2, 22], [2, 34], [1, 16], [0, 8], [0, 26], [1, 48], [2, 28], [3, 18], [2, 24], [1, 12]];
const CUR = 7, rowV = (i) => H - 12 - i * 9.5, rowEnd = (i) => 8 + ROWS[i][0] * 6 + ROWS[i][1];

/** The photo's ridge; the ground under it is opaque, so the sun rises from behind it. */
const RIDGE = [[8, 46], [22, 64], [32, 54], [46, 76], [64, 50]];
const HOLES = [];
for (let k = 0; k < 11; k++) for (const u of [3.4, 64.6]) HOLES.push(box(u, 8 + k * 10.8, u + 4, 8 + k * 10.8 + 5.2, 1.2));

/** Each pane: name, and what is drawn on its face as [kind, points, class]. */
const PANES = [
  { name: "code", marks: ROWS.map(([ind, len], i) => ["seg", [[8 + ind * 6, rowV(i)], [8 + ind * 6 + len, rowV(i)]], "nf lo"]) },
  // as the frame opens (o, 0 → 1) the pictures are made: the line is drawn on, the wash blooms, the sun rises
  { name: "ink", marks: [["open", (o) => INK.slice(0, Math.round(lerp(0.3, 1, o) * INK.length)), "nf"]] },
  { name: "wash", marks: [[24, 92, 15, 18, 0.4], [48, 60, 17, 22, 2.1], [28, 28, 13, 14, 4.0]].map(([u, v, a, b, ph], j) => ["poly", (o) => blob(u, v, a * lerp(0.45 + j * 0.1, 1, o), b * lerp(0.45 + j * 0.1, 1, o), ph), "nf lo"]) },
  { name: "photo", marks: [["poly", box(8, 10, 64, 118, 3), "nf lo"], ["poly", (o) => blob(46, lerp(66, 96, o), 6.5, 6.5, 0), "nf"], ["poly", [...RIDGE, [64, 10], [8, 10]], "fo"], ["open", RIDGE, "nf"]] },
  { name: "frame", marks: [["poly", box(12.5, 6, 59.5, 122, 2.5), "nf"], ...HOLES.map((h) => ["poly", h, "nf lo"])] },
];
const SHAPE = fillet([[0, 0], [W, 0], [W, H], [0, H]], [5, 5, 5, 5], 5).map(([u, v]) => [u * F, v * F]);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let GAP = value, act = -1, lastP = null, inStage = false;
  const e = spring(REST, { eps: 0.002 });
  const C = Cam(45, 0.5, 1.82);
  const far = 2 * 44;
  const w0 = W * F, h0 = H * F;
  fit(C, [[0, -far, 0], [w0, -far, 0], [w0, -far, h0], [0, -far, h0], [0, far, 0], [w0, far, 0], [0, far, h0], [w0, far, h0]], 200, 162);
  const P = proj(C);
  const g = mk("g", {}, svg);
  const els = PANES.map((pn, i) => {
    const guide = i > 0 ? mk("path", { class: "nf dash" }, g) : null;
    const back = mk("path", { class: "lo" }, g), face = mk("path", { class: "sil" }, g);
    const marks = pn.marks.map(([, , cls]) => mk("path", { class: cls }, g));
    return { guide, back, face, marks };
  });
  const cursor = mk("circle", { r: 1.8, class: "dot" }, g);
  // paint order: the cursor belongs to the code pane, so it goes right after its marks
  els[0].marks[els[0].marks.length - 1].after(cursor);

  const open01 = (k) => clamp((k - REST) / (1 - REST), 0, 1);
  /** Where pane i stands at spread k: the rest gaps ease into equal ones as the frame opens, centred on the middle pane. */
  const yAt = (i, k) => {
    const o = open01(k), at = (n) => { let y = 0; for (let j = 0; j < n; j++) y += GAP * k * lerp(RW[j], 1, o); return y; };
    return at(i) - at(2);
  };
  const facePts = (i, k) => SHAPE.map(([u, v]) => P(u, yAt(i, k), v));
  function inside(pt, pg) {
    let c = false;
    for (let i = 0, j = pg.length - 1; i < pg.length; j = i++) {
      const [xi, yi] = pg[i], [xj, yj] = pg[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  /** The nearest pane under the pointer, where the panes are going (the target gap). */
  function pick(p) {
    if (!p) return -1;
    for (let i = N - 1; i >= 0; i--) if (inside(p, facePts(i, e.t))) return i;
    return -1;
  }
  function setAct(a) {
    if (a === act) return;
    act = a;
    els.forEach((E, i) => E.face.classList.toggle("hi", i === a));
    read.textContent = a >= 0 ? `0${a + 1} · ${PANES[a].name}` : inStage ? `gap ${(GAP * e.x).toFixed(0)}` : "rest";
    B.wake();
  }

  let last = -1;
  let blink = "dot";
  const B = register(stage, (dt, now) => {
    const m = stepS(e, dt), k = e.x, o = open01(k);
    if (GAP * k !== last) {
      last = GAP * k;
      PANES.forEach((pn, i) => {
        const E = els[i], y = yAt(i, k), w = ([u, v]) => P(u * F, y, v * F);
        E.back.setAttribute("d", poly(SHAPE.map(([u, v]) => P(u, y - TK, v))));
        E.face.setAttribute("d", poly(SHAPE.map(([u, v]) => P(u, y, v))));
        pn.marks.forEach(([kind, raw], j) => { const pts = typeof raw === "function" ? raw(o) : raw; E.marks[j].setAttribute("d", kind === "seg" ? seg(w(pts[0]), w(pts[1])) : kind === "open" ? open(pts.map(w)) : poly(pts.map(w))); });
        if (E.guide) {
          const yp = yAt(i - 1, k);
          E.guide.setAttribute("d", [[0, 0], [W * F, 0], [W * F, H * F], [0, H * F]].map(([u, v]) => seg(P(u, yp, v), P(u, y - TK, v))).join(""));
        }
      });
      place(cursor, P((rowEnd(CUR) + 3.5) * F, yAt(0, k), rowV(CUR) * F));
    }
    read.textContent = act >= 0 ? `0${act + 1} · ${PANES[act].name}` : inStage ? `gap ${(GAP * k).toFixed(0)}` : "rest";
    // at rest the cursor blinks: the code is still being written. Only then is the figure ambient.
    const idle = act < 0 && !inStage && !reducedMotion();
    const want = act >= 0 ? "dot m" : idle && now % 1100 > 620 ? "dot off" : "dot";
    if (want !== blink) { blink = want; cursor.setAttribute("class", want); }
    return m || idle;
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: (p) => { lastP = p; inStage = true; e.t = REST + (1 - REST) * clamp((p[0] - 60) / 260, 0, 1); setAct(pick(p)); B.wake(); },
    leave: () => { lastP = null; inStage = false; e.t = REST; setAct(-1); B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { GAP = v; last = -1; if (lastP) setAct(pick(lastP)); B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "frame",
  means: "One film frame taken apart: code, ink, wash, photo and the frame. Move across to fan it open; the pane under the pointer lights.",
  rules: [1, 4, 5, 6],
  range: [32, 38, 44],
  tour: [[300, 90], [230, 150], [150, 230], null],
  mount,
});
