/**
 * Lamps: seven lights in a row of museum plinths that climb with time, from
 * fire to LED, each object a flat cut-out standing upright on its plinth, facing the viewer
 * like a museum standee. The light
 * is the bright stroke: at rest only the first fire burns; the plinth under
 * the pointer raises its object for a look, the dashed drops showing where it
 * came from, its neighbours rise a little in turn, and its light comes on.
 *
 * Picking tests each plinth's rest top (rule 01): they stand at seven heights.
 */
const {
  Cam, clamp, fit, open, poly, proj, prism, rings, facing, unproj, seg,
  tween, tset, tval, tdone, mk, pointer, put, register, disposer, solid,
} = HL;

const N = 7, PW = 26, G = 7, LIFT = 14, STEP = 5.5;
const NAMES = ["火", "陶土油燈", "蜂蠟蠟燭", "煤油燈", "白熾燈泡", "日光燈", "白光 LED"];

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
const OBJ = [
  { body: [[-11, 0], [11, 0], [9, 3], [-9, 3]], marks: [[[-10, 1.5], [10, 1.5]]], light: [flame(0, 3, 22), flame(0.5, 4, 11)] },
  { body: [...arc(-1, 6, 10, 6, PI, PI * 2, 10), [12, 7], [13, 9], [9, 8], [7, 6], [-11, 6]], marks: [[[-9, 6], [6, 6]]], light: [flame(12, 9, 10)] },
  { body: [[-4.5, 0], [4.5, 0], [4.5, 19], [1.5, 18], [0.5, 20], [-4.5, 19.5]], marks: [[[0, 20], [0, 22]], [[-2.5, 3], [-2.5, 15]]], light: [flame(0, 22, 11)] },
  { body: [[-10, 0], [10, 0], [9, 4], [6, 7.5], [4, 9], [6, 12], [8, 16], [8.5, 20], [7, 24], [4, 27], [3, 32], [-3, 32], [-4, 27], [-7, 24], [-8.5, 20], [-8, 16], [-6, 12], [-4, 9], [-6, 7.5], [-9, 4]], marks: [[[-4, 9], [4, 9]], [[-6, 12], [6, 12]]], light: [flame(0, 14, 9)] },
  { body: [[-4, 0], [4, 0], [4, 8], [6, 11], ...arc(0, 22, 10, 12, -PI * 0.3, PI * 1.3, 16), [-6, 11], [-4, 8]], marks: [[[-4, 2.5], [4, 2.5]], [[-4, 5], [4, 5]]], light: [[[-2, 9], [-3, 18], [-1.5, 22], [0, 18], [1.5, 22], [3, 18], [2, 9]]] },
  { body: [[-2, 0], [2, 0], [2, 8], [12, 8], ...arc(12, 12, 2.5, 4, -PI / 2, PI / 2, 6), [-12, 16], ...arc(-12, 12, 2.5, 4, PI / 2, PI * 1.5, 6), [-2, 8]], marks: [[[-9, 8], [-9, 16]], [[9, 8], [9, 16]]], light: [[[-8, 12], [8, 12]]] },
  { body: [[-1.5, 0], [-0.8, 0], [-0.8, 5], [0.8, 5], [0.8, 0], [1.5, 0], [1.5, 5], [6, 5], [6, 9], ...arc(0, 9, 6, 7, 0, PI, 10), [-6, 5], [-1.5, 5]], marks: [[[-6, 9], [6, 9]]], light: [arc(0, 9, 3, 3.5, 0.2, PI - 0.2, 6)] },
];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let step = value, act = -1;
  const C = Cam(45, 0.5, 1.78);
  const top0 = (i) => 6 + i * STEP, X1 = N * (PW + G) - G;
  fit(C, [[-4, -4, 0], [X1 + 4, PW + 4, 0], [X1 + 4, -4, 0], [-4, PW + 4, 0], [0, PW / 2, top0(0) + 34 + LIFT], [X1, PW / 2, top0(N - 1) + 30 + LIFT]], 200, 160);
  const P = proj(C), front = facing(C), K = 1.78 * 0.92; // the standees' scale on screen
  const g = mk("g", {}, svg);
  const [br, bi] = rings(-4, -4, X1 + 4, PW + 4, 7, 1.8);
  put(solid(g), prism(P, front, br, bi, -4, 0));

  const els = OBJ.map((o, i) => {
    const x0 = i * (PW + G), [ring, inner] = rings(x0, 0, x0 + PW, PW, 4, 1.2);
    const plinth = solid(g);
    put(plinth, prism(P, front, ring, inner, 0, top0(i)));
    const drop = mk("path", { class: "nf dash" }, g);
    const body = mk("path", { class: "sil" }, g), marks = mk("path", { class: "nf lo" }, g);
    const light = mk("path", { class: "nf" + (i === 0 ? " hi" : "") }, g);
    return { o, cx: x0 + PW / 2, cy: PW / 2, x0, z: tween(0), body, marks, light, drop, drawn: NaN };
  });

  function draw(E, i, lift) {
    if (lift === E.drawn) return;
    E.drawn = lift;
    const [ax, ay] = P(E.cx, E.cy, top0(i) + lift), w = ([u, v]) => [ax + u * K, ay - v * K];
    E.body.setAttribute("d", poly(E.o.body.map(w)));
    E.marks.setAttribute("d", E.o.marks.map(([a, b]) => seg(w(a), w(b))).join(""));
    E.light.setAttribute("d", E.o.light.map((ln) => open(ln.map(w))).join(""));
    const xs = E.o.body.map(([u]) => u), l = Math.min(...xs), r = Math.max(...xs);
    const ay0 = P(E.cx, E.cy, top0(i))[1];
    E.drop.setAttribute("d", lift > 0.5 ? [l, r].map((u) => seg([ax + u * K, ay0], [ax + u * K, ay])).join("") : "");
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    els.forEach((E, i) => { draw(E, i, tval(E.z, now)); if (!tdone(E.z, now)) m = true; });
    return m;
  });
  bag.add(B.unregister);

  function setAct(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    els.forEach((E, i) => {
      const d = Math.abs(i - from);
      tset(E.z, a < 0 ? 0 : LIFT * Math.max(0, 1 - d * 0.55), now, d * step);
      E.light.classList.toggle("hi", a < 0 ? i === 0 : i === a);
      E.body.classList.toggle("hi", i === a);
    });
    read.textContent = a < 0 ? "rest" : `${String(a + 1).padStart(2, "0")} · ${NAMES[a]}`;
    B.wake();
  }
  /** The plinth under the pointer: each tested on its own rest top, nearest first; above a plinth counts as on it. */
  function pick(p) {
    for (let i = N - 1; i >= 0; i--) {
      const E = els[i], [ax, ay] = P(E.cx, E.cy, top0(i)), xs = E.o.body.map(([u]) => u);
      if (p[0] >= ax + Math.min(...xs) * K - 2 && p[0] <= ax + Math.max(...xs) * K + 2 && p[1] <= ay && p[1] >= ay - 36 * K) return i;
    }
    for (let i = N - 1; i >= 0; i--) {
      for (let z = top0(i); z <= top0(i) + 34; z += 5) {
        const [x, y] = unproj(C, p[0], p[1], z), E = els[i];
        if (x >= E.x0 - G / 2 && x <= E.x0 + PW + G / 2 && y >= -4 && y <= PW + 4) return i;
      }
    }
    return -1;
  }

  bag.add(pointer(stage, { move: (p) => setAct(pick(p)), leave: () => setAct(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { step = clamp(v, 0, 120); }, destroy: bag.dispose };
}

hairline({
  name: "lamps",
  means: "Seven lights on plinths that climb with time, fire to LED: the one under the pointer is raised and lit.",
  rules: [1, 2, 4, 5],
  range: [20, 45, 80],
  tour: [[110, 150], [220, 170], [300, 190], null],
  mount,
});
