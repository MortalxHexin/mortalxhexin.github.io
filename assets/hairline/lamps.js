/**
 * Lamps: eleven lights on plinths that climb a spiral stair, fire at the
 * front and lowest, round to the back, and on the last and highest step the
 * Earth with its cities lit, the way the film ends. Each object is a flat cut-out
 * standing upright on its plinth, facing the viewer like a museum standee.
 * The light is the bright stroke: at rest only the first fire burns; the
 * station under the pointer raises its object, the dashed drops showing
 * where it came from, its neighbours on the stair rise a little in turn, and
 * its light comes on.
 *
 * Picking tests each station's rest outline, nearest first (rule 01).
 * Stations are painted back to front by depth (rule 06).
 */
const {
  Cam, circ, clamp, fit, open, poly, proj, prism, rings, facing, seg, hull, ringAt,
  tween, tset, tval, tdone, mk, pointer, put, register, disposer, solid,
} = HL;

const NAMES = ["火", "陶土油燈", "蜂蠟蠟燭", "阿岡燈", "煤氣燈", "煤油燈", "白熾燈泡", "霓虹燈", "日光燈", "白光 LED", "智慧照明", "地球"];
const N = NAMES.length, R = 56, PW = 17, RISE = 3.6, LIFT = 10, K = 1;
const A0 = Math.PI * 0.42, SWEEP = Math.PI * 1.5; // from the front, round by the right and the back, ending at the back left, highest
const arc = (cu, cv, ru, rv, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, k) => {
  const a = a0 + ((a1 - a0) * k) / n;
  return [cu + Math.cos(a) * ru, cv + Math.sin(a) * rv];
});
const PI = Math.PI;
/** A flame standing at (u, v), h tall: a round foot and a leaning tip, as an open loop. */
const flame = (u, v, h) => {
  const r = h * 0.28, c = v + r;
  const pts = [...arc(u, c, r, r, 0, -PI, 8), [u - r * 0.75, c + h * 0.28], [u - r * 0.15, v + h * 0.84], [u + r * 0.25, v + h], [u + r * 0.65, c + h * 0.26]];
  return [...pts, pts[0]];
};
/** Each object, in its own plane: u across (centred), v up from the plinth's top. body: [points], marks: dim lines, light: the parts that glow. */
const OBJ_ROW = [
  { body: [[-11, 0], [11, 0], [9, 3], [-9, 3]], marks: [[[-10, 1.5], [10, 1.5]]], light: [flame(0, 3, 22), flame(0.5, 4, 11)] },
  { body: [...arc(-1, 6, 10, 6, PI, PI * 2, 10), [12, 7], [13, 9], [9, 8], [7, 6], [-11, 6]], marks: [[[-9, 6], [6, 6]]], light: [flame(12, 9, 10)] },
  { body: [[-4.5, 0], [4.5, 0], [4.5, 19], [1.5, 18], [0.5, 20], [-4.5, 19.5]], marks: [[[0, 20], [0, 22]], [[-2.5, 3], [-2.5, 15]]], light: [flame(0, 22, 11)] },
  { body: [[-10, 0], [10, 0], [9, 4], [6, 7.5], [4, 9], [6, 12], [8, 16], [8.5, 20], [7, 24], [4, 27], [3, 32], [-3, 32], [-4, 27], [-7, 24], [-8.5, 20], [-8, 16], [-6, 12], [-4, 9], [-6, 7.5], [-9, 4]], marks: [[[-4, 9], [4, 9]], [[-6, 12], [6, 12]]], light: [flame(0, 14, 9)] },
  { body: [[-4, 0], [4, 0], [4, 8], [6, 11], ...arc(0, 22, 10, 12, -PI * 0.3, PI * 1.3, 16), [-6, 11], [-4, 8]], marks: [[[-4, 2.5], [4, 2.5]], [[-4, 5], [4, 5]]], light: [[[-2, 9], [-3, 18], [-1.5, 22], [0, 18], [1.5, 22], [3, 18], [2, 9]]] },
  { body: [[-2, 0], [2, 0], [2, 8], [12, 8], ...arc(12, 12, 2.5, 4, -PI / 2, PI / 2, 6), [-12, 16], ...arc(-12, 12, 2.5, 4, PI / 2, PI * 1.5, 6), [-2, 8]], marks: [[[-9, 8], [-9, 16]], [[9, 8], [9, 16]]], light: [[[-8, 12], [8, 12]]] },
  { body: [[-1.5, 0], [-0.8, 0], [-0.8, 5], [0.8, 5], [0.8, 0], [1.5, 0], [1.5, 5], [6, 5], [6, 9], ...arc(0, 9, 6, 7, 0, PI, 10), [-6, 5], [-1.5, 5]], marks: [[[-6, 9], [6, 9]]], light: [arc(0, 9, 3, 3.5, 0.2, PI - 0.2, 6)] },
];


const [FIRE, CLAY, CANDLE, KERO, BULB, TUBE, LED] = OBJ_ROW;
const OBJ = [
  FIRE, CLAY, CANDLE,
  // Argand: a base, a stem, the burner, and the tall straight chimney round the flame
  { body: [[-7, 0], [7, 0], [5, 2], [1.5, 4], [1.5, 12], [5, 12], [5, 15], [2.5, 15], [2.5, 31], [-2.5, 31], [-2.5, 15], [-5, 15], [-5, 12], [-1.5, 12], [-1.5, 4], [-5, 2]], marks: [[[-5, 13.5], [5, 13.5]]], light: [flame(0, 17, 9)] },
  // gas lamp: a post and a lantern wider at the top, under a cap
  { body: [[-1.2, 0], [1.2, 0], [1.2, 17], [3, 17], [7, 28], [0, 33], [-7, 28], [-3, 17], [-1.2, 17]], marks: [[[-5.5, 28], [5.5, 28]]], light: [arc(0, 22, 2.6, 3, 0, PI * 2, 10)] },
  KERO, BULB,
  // neon: a tube bent into a wave, held on a rail with two feet
  { body: [[-11, 0], [-9, 0], [-9, 3], [9, 3], [9, 0], [11, 0], [11, 5], [-11, 5]], marks: [[[-8, 5], [-8, 9]], [[8, 5], [8, 9]]], light: [Array.from({ length: 25 }, (_, k) => [-10 + k * (20 / 24), 15 + 5 * Math.sin(k * 0.78)])] },
  TUBE, LED,
  // smart light: a round bulb with its signal arcs above
  { body: [[-3.5, 0], [3.5, 0], [3.5, 6], [5.5, 9], ...arc(0, 17, 8.5, 9, -PI * 0.28, PI * 1.28, 16), [-5.5, 9], [-3.5, 6]], marks: [[[-3.5, 2], [3.5, 2]], [[-3.5, 4], [3.5, 4]]], light: [arc(0, 27, 3, 2.4, PI * 0.25, PI * 0.75, 5), arc(0, 27, 6, 4.8, PI * 0.25, PI * 0.75, 6), arc(0, 27, 9, 7.2, PI * 0.25, PI * 0.75, 7)] },
];
/** The Earth, on the last step: a globe with two meridians, a parallel, and its cities, which are its light. */
const EARTH = { r: 12, cities: [[-5, 3], [-2, 6], [4, 4], [6, -1], [-6, -4], [1, -6], [3, 9], [-8, 7], [8, 6]] };

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let step = value, act = -1;
  const C = Cam(45, 0.5, 1.5);
  const at = (i) => { const a = A0 - (SWEEP * i) / (N - 1); return [R * Math.cos(a), R * Math.sin(a)]; };
  const hOf = (i) => 4 + i * RISE;
  const [ex, ey] = at(N - 1);
  fit(C, [[-R - 14, -R - 14, -4], [R + 14, R + 14, -4], [R + 14, -R - 14, -4], [-R - 14, R + 14, -4], [ex, ey, hOf(N - 1) + EARTH.r * 2 + LIFT + 2], [R, -R * 0.2, hOf(6) + 34 + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const [br, bi] = rings(-R - 16, -R - 16, R + 16, R + 16, 14, 2);
  put(solid(g), prism(P, front, br, bi, -4, 0));
  // the stair's path on the floor: a dashed guide under the plinths
  mk("path", { d: open(Array.from({ length: 60 }, (_, k) => { const a = A0 - (SWEEP * k) / 59; return P(R * Math.cos(a), R * Math.sin(a), 0); })), class: "nf dash" }, g);
  const layer = mk("g", {}, g);

  const items = NAMES.map((_, i) => {
    const [cx, cy] = at(i), grp = mk("g", {}, layer), [ring, inner] = rings(cx - PW / 2, cy - PW / 2, cx + PW / 2, cy + PW / 2, 4, 1.1);
    put(solid(grp), prism(P, front, ring, inner, 0, hOf(i)));
    const drop = mk("path", { class: "nf dash" }, grp), body = mk("path", { class: "sil" }, grp), marks = mk("path", { class: "nf lo" }, grp);
    const light = mk("path", { class: "nf" + (i === 0 ? " hi" : "") }, grp);
    return { o: OBJ[i], earth: i === N - 1, i, cx, cy, h: hOf(i), ring, grp, drop, body, marks, light, z: tween(0), drawn: NaN, depth: cx + cy };
  });
  items.slice().sort((a, b) => a.depth - b.depth).forEach((S) => layer.appendChild(S.grp));

  function draw(S, lift) {
    if (lift === S.drawn) return;
    S.drawn = lift;
    const [ax, ay] = P(S.cx, S.cy, S.h + lift), w = ([u, v]) => [ax + u * K, ay - v * K];
    let half;
    if (S.earth) {
      const e = ([u, v]) => w([u, v + EARTH.r]);
      half = EARTH.r;
      S.body.setAttribute("d", poly(arc(0, 0, EARTH.r, EARTH.r, 0, PI * 2, 32).map(e)));
      S.marks.setAttribute("d", [open(arc(0, 0, EARTH.r * 0.45, EARTH.r, -PI / 2, PI / 2, 12).map(e)), open(arc(0, 0, EARTH.r * 0.45, EARTH.r, PI / 2, PI * 1.5, 12).map(e)), seg(e([-EARTH.r, 0]), e([EARTH.r, 0]))].join(""));
      S.light.setAttribute("d", EARTH.cities.map(([u, v]) => poly(arc(u, v, 0.8, 0.8, 0, PI * 2, 6).map(e))).join(""));
    } else {
      const xs = S.o.body.map(([u]) => u);
      half = Math.max(-Math.min(...xs), Math.max(...xs));
      S.body.setAttribute("d", poly(S.o.body.map(w)));
      S.marks.setAttribute("d", S.o.marks.map(([a, b]) => seg(w(a), w(b))).join(""));
      S.light.setAttribute("d", S.o.light.map((ln) => open(ln.map(w))).join(""));
    }
    const ay0 = P(S.cx, S.cy, S.h)[1];
    S.drop.setAttribute("d", lift > 0.5 ? [-half, half].map((u) => seg([ax + u * K * 0.7, ay0], [ax + u * K * 0.7, ay])).join("") : "");
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    items.forEach((S) => { draw(S, tval(S.z, now)); if (!tdone(S.z, now)) m = true; });
    return m;
  });
  bag.add(B.unregister);

  // hit areas, at rest: each plinth's top and the standee above it; nearest first
  const area = items.map((S) => {
    const [ax, ay] = P(S.cx, S.cy, S.h), tall = S.earth ? EARTH.r * 2 : 33;
    return hull(ringAt(P, S.ring, S.h).concat(ringAt(P, S.ring, S.h - 4), [[ax - 10 * K, ay - tall * K], [ax + 10 * K, ay - tall * K]]));
  });
  const inside = (pt, pg) => {
    let c = false;
    for (let i = 0, j = pg.length - 1; i < pg.length; j = i++) {
      const [xi, yi] = pg[i], [xj, yj] = pg[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const order = items.map((S, k) => k).sort((a, b) => items[b].depth - items[a].depth);
  const pick = (p) => { for (const k of order) if (inside(p, area[k])) return k; return -1; };

  function setAct(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    items.forEach((S, i) => {
      const d = Math.abs(i - from);
      tset(S.z, a < 0 ? 0 : LIFT * Math.max(0, 1 - d * 0.55), now, d * step);
      S.light.classList.toggle("hi", a < 0 ? i === 0 : i === a);
      S.body.classList.toggle("hi", i === a);
    });
    read.textContent = a < 0 ? "rest" : `${String(a + 1).padStart(2, "0")} · ${NAMES[a]}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setAct(pick(p)), leave: () => setAct(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { step = clamp(v, 0, 120); }, destroy: bag.dispose };
}

hairline({
  name: "lamps",
  means: "Eleven lights climb a spiral stair to the lit Earth on top: the one under the pointer rises and its light comes on.",
  rules: [1, 2, 4, 5],
  range: [20, 40, 70],
  tour: [[110, 200], [200, 120], [290, 190], null],
  mount,
});
