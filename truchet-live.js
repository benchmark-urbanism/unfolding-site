/* Truchet's tile live beside its case: a board of 144 tiles, each a square cut on its diagonal with one half dark.
   Every tile turns on its own. The board holds a design for a few seconds, with the odd tile wobbling or spinning
   where it stands, then turns tile by tile into the next design, in a sweep, a ripple, or at random. The designs
   are drawn from a few rules, some ordered and symmetrical, some chaotic, and now and then the board churns at
   random for a while before a symmetrical design settles out of it. Nothing fades: every change is a tile turning.

   Runs on each svg.truchet-patch, while its figure is in view. With motion turned down one design is laid and left. */
(function () {
"use strict";
const N = 12, S = 40;                      // tiles a side, and a tile's side in drawing units
const HOLD = [2600, 4200], CHURN = [2200, 3200];   // how long a design is held, and how long a churn runs, between these
const TURN = 380;                          // one tile's turn
const NS = "http://www.w3.org/2000/svg";
const el = (name, at) => { const e = document.createElementNS(NS, name); for (const k in at) e.setAttribute(k, at[k]); return e; };
const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)], between = r => r[0] + rnd() * (r[1] - r[0]);
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const c = (N - 1) / 2;
const mod4 = k => ((k % 4) + 4) % 4;

// ---------------------------------------------------------------- the designs
// a design gives each tile its orientation, 0 to 3 quarter turns of the tile with its dark half at the top left.
// A base rule is drawn for one quadrant or sector, and a symmetry carries it round the board: a mirror across the
// middle maps orientation k to 1 - k, a mirror top to bottom maps it to 3 - k, and a quarter turn of the board adds one
const BASES = [
  () => () => 0,                                                                  // one way: stripes
  () => { const a = pick([0, 2]); return (x, y) => (x + y) % 2 ? a : a + 2; },    // checker: diamonds
  () => (x, y) => (x % 2) + 2 * (y % 2),                                         // two by two: pinwheels
  () => (x, y) => (x + y) % 4,                                                   // diagonal bands
  () => { const w = pick([1.5, 2, 2.5]); return (x, y) => Math.floor(Math.hypot(x - c, y - c) / w) % 4; },   // rings
  () => (x, y) => Math.floor(rnd() * 4),                                         // chaos
  () => { const p = Array.from({ length: N * N }, () => Math.floor(rnd() * 4)); return (x, y) => p[y * N + x]; },   // chaos, fixed
  () => (x, y) => (Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? 0 : 2,           // blocks of three
];
const SYMMETRIES = [
  g => g,                                                                        // none
  g => (x, y) => x < N / 2 ? g(x, y) : mod4(1 - g(N - 1 - x, y)),                // mirrored left to right
  g => (x, y) => { const k = x < N / 2 ? g(x, y) : mod4(1 - g(N - 1 - x, y)); return y < N / 2 ? k : mod4(3 - (x < N / 2 ? g(x, N - 1 - y) : mod4(1 - g(N - 1 - x, N - 1 - y)))); },   // mirrored both ways
  g => (x, y) => {                                                               // turned four ways about the middle
    let px = x - c, py = y - c, s = 0;
    while (!(px > 0 && py >= 0) && s < 4) { [px, py] = [-py, px]; s++; }         // turn the point into the first quarter
    return mod4(g(Math.round(px + c), Math.round(py + c)) + s);
  },
];
function design(symmetric) {
  const base = pick(BASES)(), sym = symmetric ? pick(SYMMETRIES.slice(1)) : pick(SYMMETRIES);
  const f = sym(base), ks = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) ks.push(mod4(f(x, y)));
  return ks;
}
// the orders in which the tiles are turned into a new design
const ORDERS = [
  ts => ts.slice().sort((a, b) => a.j - b.j || a.i - b.i),                        // row by row
  ts => ts.slice().sort((a, b) => a.i + a.j - b.i - b.j),                        // diagonal sweep
  ts => { const p = [rnd() * N, rnd() * N]; return ts.slice().sort((a, b) => Math.hypot(a.i - p[0], a.j - p[1]) - Math.hypot(b.i - p[0], b.j - p[1])); },   // a ripple from one spot
  ts => ts.slice().sort((a, b) => Math.hypot(b.i - c, b.j - c) - Math.hypot(a.i - c, a.j - c)),   // from the rim inwards
  ts => ts.slice().sort(() => rnd() - .5),                                       // at random
];

// ---------------------------------------------------------------- the board
for (const sv of document.querySelectorAll("svg.truchet-patch")) run(sv);
function run(sv) {
  const fig = sv.closest("figure");
  sv.setAttribute("viewBox", `0 0 ${N * S} ${N * S}`);
  const tiles = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const g = sv.appendChild(el("g", { transform: `translate(${i * S} ${j * S})` }));
    const spin = g.appendChild(el("g", { class: "truchet-spin" }));
    spin.appendChild(el("rect", { class: "truchet-cell", width: S, height: S }));
    spin.appendChild(el("polygon", { class: "truchet-dark", points: `0,0 ${S},0 0,${S}` }));
    tiles.push({ i, j, spin, k: 0, at: 0 });    // k: the orientation; at: the quarter turns the tile is drawn at, which may run on past 4
  }
  const set = (t, k) => { t.k = k; t.at = k; t.spin.style.transform = `rotate(${90 * k}deg)`; };
  // turn a tile to orientation k, after a wait: the short way round as a rule, the long way now and then
  function turn(t, k, wait) {
    let d = mod4(k - t.k);
    if (d === 0) return;
    if (d === 3) d = -1; else if (d === 2 && rnd() < .5) d = -2; else if (rnd() < .08) d -= 4;
    const from = t.at, to = t.at + d;
    t.k = k; t.at = to;
    t.spin.animate({ transform: [`rotate(${90 * from}deg)`, `rotate(${90 * to}deg)`] }, { duration: TURN, delay: wait, easing: "cubic-bezier(.3, 1.3, .5, 1)", fill: "backwards" })
      .onfinish = () => { t.spin.style.transform = `rotate(${90 * to}deg)`; };
    t.spin.style.transform = `rotate(${90 * to}deg)`;
  }
  // a tile wobbles where it stands, or spins a full turn and lands where it was
  function jiggle(t) {
    const a = 90 * t.at;
    if (rnd() < .25) t.spin.animate({ transform: [`rotate(${a}deg)`, `rotate(${a + 360}deg)`] }, { duration: 650, easing: "cubic-bezier(.4, 0, .2, 1)" });
    else { const w = (rnd() < .5 ? 1 : -1) * (10 + rnd() * 14); t.spin.animate({ transform: [`rotate(${a}deg)`, `rotate(${a + w}deg)`, `rotate(${a - w / 2}deg)`, `rotate(${a}deg)`] }, { duration: 420, easing: "ease-in-out" }); }
  }
  // the opening design
  const first = design(true);
  tiles.forEach((t, n) => set(t, first[n]));
  if (still) return;

  // ---------------------------------------------------------------- the play
  // phases: hold, with jiggles; change, the tiles turned into the next design in some order; churn, random turns
  // for a while, out of which a symmetrical design is then laid
  let phase = "hold", until = 0, nextJiggle = 0, nextChurn = 0, sinceChurn = 0;
  function change(now, symmetric) {
    const ks = design(symmetric), order = pick(ORDERS)(tiles), gap = pick([8, 12, 16, 24]);
    let n = 0;
    for (const t of order) if (ks[t.i + t.j * N] !== t.k) turn(t, ks[t.i + t.j * N], n++ * gap);
    phase = "change"; until = now + n * gap + TURN + 200;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || (fig && !fig.classList.contains("on"))) { until = Math.max(until, now); return; }
    if (phase === "hold") {
      if (now >= nextJiggle) { jiggle(pick(tiles)); nextJiggle = now + 120 + rnd() * 260; }
      if (now >= until) {
        if (++sinceChurn >= 3 && rnd() < .5) { phase = "churn"; until = now + between(CHURN); sinceChurn = 0; }
        else change(now, rnd() < .7);
      }
    } else if (phase === "churn") {
      if (now >= nextChurn) { const t = pick(tiles); turn(t, mod4(t.k + pick([1, 2, 3])), 0); nextChurn = now + 18 + rnd() * 30; }
      if (now >= until) change(now, true);
    } else if (now >= until) { phase = "hold"; until = now + between(HOLD); nextJiggle = now + 300; }
  }
  until = performance.now() + between(HOLD);
  requestAnimationFrame(frame);
}
})();
