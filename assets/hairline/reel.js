/**
 * Reel: an empty film reel lying on the table, for a page that is not there.
 * One flange with three windows and a hub, and not a metre of film wound on
 * it. The pointer turns the reel towards itself, on a spring, the way a hand
 * would spin it to look for something; the read-out counts what it holds: 0.
 * At rest the hub's key is the bright mark: where the film would start.
 */
const {
  Cam, circ, fit, poly, prism, proj, rings, facing, unproj, spring, stepS, clamp,
  mk, place, flatDot, pointer, put, register, disposer, solid,
} = HL;

const R = 46, TH = 3, HUB = 9, HH = 9, REST = -0.5;

/** A window in the flange: an annular sector at angle a, as world points around the centre. */
const win = (a, r0, r1, span) => {
  const pts = [], n = 10;
  for (let k = 0; k <= n; k++) { const t = a - span / 2 + (span * k) / n; pts.push([Math.cos(t) * r1, Math.sin(t) * r1]); }
  for (let k = n; k >= 0; k--) { const t = a - span / 2 + (span * k) / n; pts.push([Math.cos(t) * r0, Math.sin(t) * r0]); }
  return pts;
};

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let pull = value;
  const C = Cam(45, 0.5, 2.3);
  fit(C, [[-R - 4, -R - 4, -4], [R + 4, R + 4, -4], [R + 4, -R - 4, -4], [-R - 4, R + 4, -4], [0, 0, HH + 6]], 200, 168);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // a mat under it, so it sits on something
  const [mr, mi] = rings(-R - 4, -R - 4, R + 4, R + 4, 10, 2);
  put(solid(g), prism(P, front, mr, mi, -4, 0));
  const flange = solid(g), disc = circ(R, 40), discIn = circ(R - 1.6, 40);
  put(flange, prism(P, front, disc, discIn, 0, TH));
  const windows = mk("path", { class: "nf lo" }, g);
  const rim = mk("path", { class: "nf lo" }, g);
  rim.setAttribute("d", poly(circ(R - 7, 40).map((q) => P(q.u, q.v, TH))));
  const hub = solid(g), hr = circ(HUB, 24), hi = circ(HUB - 1.2, 24);
  put(hub, prism(P, front, hr, hi, TH, TH + HH));
  const bore = mk("path", { class: "nf lo" }, g);
  bore.setAttribute("d", poly(circ(3.2, 16).map((q) => P(q.u, q.v, TH + HH))));
  const key = flatDot(g, C, 1.5, "dot");

  const th = spring(REST, { eps: 0.002 });
  let last = NaN, over = false;
  const B = register(stage, (dt) => {
    const m = stepS(th, dt);
    if (th.x !== last) {
      last = th.x;
      const t = th.x, rot = ([x, y]) => [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)];
      windows.setAttribute("d", [0, 1, 2].map((k) => poly(win((k * 2 * Math.PI) / 3, 16, 33, 1.25).map((p) => rot(p)).map(([x, y]) => P(x, y, TH)))).join(""));
      const [kx, ky] = rot([4.6, 0]);
      place(key, P(kx, ky, TH + HH));
    }
    return m;
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: (p) => {
      const [x, y] = unproj(C, p[0], p[1], TH), d = Math.hypot(x, y);
      over = d < R + 4;
      th.t = REST + clamp(Math.atan2(y, x) * pull, -2.4, 2.4);
      key.setAttribute("class", over ? "dot m" : "dot");
      flange.sil.classList.toggle("hi", over);
      read.textContent = over ? "reel · 0 m" : "rest";
      B.wake();
    },
    leave: () => { th.t = REST; over = false; key.setAttribute("class", "dot"); flange.sil.classList.remove("hi"); read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { pull = v; }, destroy: bag.dispose };
}

hairline({
  name: "reel",
  means: "An empty film reel: the pointer turns it to look, and it holds nothing at all.",
  rules: [1, 3, 5, 8],
  range: [0.3, 0.6, 1],
  tour: [[150, 150], [250, 190], null],
  mount,
});
