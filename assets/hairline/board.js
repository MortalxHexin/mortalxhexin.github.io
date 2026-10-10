/**
 * Board: the field guide of "Taiwan Sparrow" as an object. Ten tiles, two
 * columns by five rows, each a cell of the film with its patch of wash, and a
 * dashed route snaking through them that climbs as it goes, the way the bag
 * blew away. The sparrow is the bright dot: at rest on the first tile; it hops
 * along the route to the tile under the pointer, which lifts, its neighbours
 * along the route a little less, staggered outwards from it.
 *
 * Picking tests each tile's rest top (rule 01): tiles stand at different heights.
 */
const {
  Cam, clamp, facing, fit, lerp, open, poly, prism, proj, rings, unproj,
  tween, tset, tval, tdone, flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const TW = 44, TD = 34, G = 7, LIFT = 16, BASE = 5;
const ROUTE = [[0, 4], [1, 4], [1, 3], [0, 3], [0, 2], [1, 2], [1, 1], [0, 1], [0, 0], [1, 0]];
const NAMES = ["早餐盤", "電鍋", "蒸籠", "珍奶", "蚊香", "塑膠凳", "藍白拖", "電扇", "彈珠台", "紅白袋"];
const X1 = 2 * TW + G, Y1 = 5 * TD + 4 * G;

const tile = (i) => {
  const [c, r] = ROUTE[i], x0 = c * (TW + G), y0 = r * (TD + G);
  return { x0, y0, cx: x0 + TW / 2, cy: y0 + TD / 2, h0: 3 + i * 3.2 };
};
/** Where the route crosses from tile i to tile j: the middle of their shared edge. */
const door = (a, b) => [(a.cx + b.cx) / 2, (a.cy + b.cy) / 2];
/** A wobbly patch of wash on a tile's top, as footprint points. */
const wash = (t, i) => Array.from({ length: 26 }, (_, k) => {
  const a = (k / 26) * Math.PI * 2, w = 1 + 0.12 * Math.sin(3 * a + i * 1.7) + 0.07 * Math.sin(5 * a - i);
  return [t.cx + Math.cos(a) * TW * 0.3 * w, t.cy + Math.sin(a) * TD * 0.3 * w];
});

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let step = value, act = -1;
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-6, -6, -BASE], [X1 + 6, Y1 + 6, -BASE], [X1 + 6, -6, -BASE], [-6, Y1 + 6, -BASE], [0, 0, 3 + 9 * 3.2 + LIFT + 2], [X1, 0, 3 + 9 * 3.2 + LIFT]], 200, 160);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const [br, bi] = rings(-6, -6, X1 + 6, Y1 + 6, 8, 2);
  put(solid(g), prism(P, front, br, bi, -BASE, 0));

  const T = ROUTE.map((_, i) => tile(i));
  const order = T.map((t, i) => i).sort((a, b) => T[a].cx + T[a].cy - (T[b].cx + T[b].cy));
  const els = [];
  order.forEach((i) => {
    const t = T[i], [ring, inner] = rings(t.x0, t.y0, t.x0 + TW, t.y0 + TD, 5, 1.4);
    const el = solid(g), patch = mk("path", { class: "nf lo" }, el.g), path = mk("path", { class: "nf dash" }, el.g);
    const pts = [i > 0 ? door(T[i - 1], t) : [t.cx, t.cy], [t.cx, t.cy], i < T.length - 1 ? door(t, T[i + 1]) : [t.cx, t.cy]];
    els[i] = { t, ring, inner, el, patch, path, pts, blob: wash(t, i), z: tween(0), drawn: NaN };
  });

  // the sparrow: a bright dot that travels the route, moved in paint order to sit on the tile it stands on
  const bird = mk("g", {}, g), dot = flatDot(bird, C, 2.4, "dot");
  const s = tween(0);
  let onTile = -1;

  const top = (i, now) => T[i].h0 + tval(els[i].z, now);
  function drawTile(E, h) {
    if (h === E.drawn) return;
    E.drawn = h;
    put(E.el, prism(P, front, E.ring, E.inner, 0, h));
    E.patch.setAttribute("d", poly(E.blob.map(([u, v]) => P(u, v, h))));
    E.path.setAttribute("d", open(E.pts.map(([u, v]) => P(u, v, h))));
  }
  /** The sparrow's point at route position x (a float tile index): along the route, at the height of the tiles it is between. */
  function birdAt(x, now) {
    const a = clamp(Math.floor(x), 0, T.length - 1), b = Math.min(a + 1, T.length - 1), f = x - a;
    const mid = door(T[a], T[b]), A = T[a], B = T[b];
    const [u, v] = f < 0.5 ? [lerp(A.cx, mid[0], f * 2), lerp(A.cy, mid[1], f * 2)] : [lerp(mid[0], B.cx, f * 2 - 1), lerp(mid[1], B.cy, f * 2 - 1)];
    return { p: P(u, v, lerp(top(a, now), top(b, now), f) + 0.4), on: f < 0.5 ? a : b };
  }

  const B = register(stage, (_dt, now) => {
    let m = !tdone(s, now);
    els.forEach((E, i) => { drawTile(E, T[i].h0 + tval(E.z, now)); if (!tdone(E.z, now)) m = true; });
    const b = birdAt(tval(s, now), now);
    if (b.on !== onTile) { onTile = b.on; els[onTile].el.g.after(bird); }
    place(dot, b.p);
    return m;
  });
  bag.add(B.unregister);

  function setAct(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    els.forEach((E, i) => {
      const d = Math.abs(i - from), lift = a < 0 ? 0 : LIFT * Math.max(0, 1 - d * 0.38);
      tset(E.z, lift, now, d * step);
      E.el.sil.classList.toggle("hi", i === a);
    });
    tset(s, a < 0 ? 0 : a, now, 0);
    read.textContent = a < 0 ? "rest" : `${String(a + 1).padStart(2, "0")} · ${NAMES[a]}`;
    B.wake();
  }
  /** The tile under the pointer, tested on each tile's rest top, nearest first. */
  function pick(p) {
    for (let k = order.length - 1; k >= 0; k--) {
      const t = T[order[k]], [x, y] = unproj(C, p[0], p[1], t.h0);
      if (x >= t.x0 - G / 2 && x <= t.x0 + TW + G / 2 && y >= t.y0 - G / 2 && y <= t.y0 + TD + G / 2) return order[k];
    }
    return -1;
  }

  bag.add(pointer(stage, { move: (p) => setAct(pick(p)), leave: () => setAct(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { step = v; }, destroy: bag.dispose };
}

hairline({
  name: "board",
  means: "Ten cells of a film on a climbing route: the sparrow hops to the cell under the pointer, which lifts with its neighbours.",
  rules: [1, 2, 3, 5],
  range: [20, 45, 80],
  tour: [[200, 220], [250, 170], [150, 110], null],
  mount,
});
