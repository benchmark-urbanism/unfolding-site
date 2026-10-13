/* A Penrose tiling live beside its case. A patch is laid by the rule from one seed, a tile at a time outward, each
   tile's outline red as it arrives and darkening to ink. The patch is held, then every tile divides into smaller
   tiles by the same rule (deflation), and the patch is held again. Then it is cleared and laid again from a seed
   turned to a new angle, in a new order. Nothing in it is random except the order of laying and the angle of the seed.

   The tiling is made by the standard subdivision of Robinson triangles (the half-rhombs), which gives a lawful
   Penrose tiling at every level; a tile is drawn as the pair of triangles that share their inner edge.

   Runs on each svg.penrose-patch while its figure is in view. With motion turned down one patch is laid and left. */
(function () {
"use strict";
const PHI = (1 + Math.sqrt(5)) / 2;
const LEVELS = 3, R = 100;                 // subdivisions of the seed, and the drawn radius of the seed
const FRESH = "#e01b24", AGED = "#1c1a17", GHOST = "#cfc7ad";
const GAP = [18, 28, 40], HOLD = [2600, 3800], AGEING = 3000;
const NS = "http://www.w3.org/2000/svg";
const el = (name, at) => { const e = document.createElementNS(NS, name); for (const k in at) e.setAttribute(k, at[k]); return e; };
const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)], between = r => r[0] + rnd() * (r[1] - r[0]);
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- the tiling
// a triangle is [kind, A, B, C] with points as [x, y]; kind 0 is the acute half (of a thin rhomb), 1 the obtuse (of a thick one)
const add = (p, q) => [p[0] + q[0], p[1] + q[1]], sub = (p, q) => [p[0] - q[0], p[1] - q[1]], mul = (p, k) => [p[0] * k, p[1] * k];
function seed(angle) {
  const ts = [];
  for (let i = 0; i < 10; i++) {
    let b = [R * Math.cos(angle + (2 * i - 1) * Math.PI / 10), R * Math.sin(angle + (2 * i - 1) * Math.PI / 10)];
    let c = [R * Math.cos(angle + (2 * i + 1) * Math.PI / 10), R * Math.sin(angle + (2 * i + 1) * Math.PI / 10)];
    if (i % 2 === 0) [b, c] = [c, b];
    ts.push([0, [0, 0], b, c]);
  }
  return ts;
}
function subdivide(ts) {
  const out = [];
  for (const [k, A, B, C] of ts) {
    if (k === 0) { const P = add(A, mul(sub(B, A), 1 / PHI)); out.push([0, C, P, B], [1, P, C, A]); }
    else { const Q = add(B, mul(sub(A, B), 1 / PHI)), Rr = add(B, mul(sub(C, B), 1 / PHI)); out.push([1, Rr, C, A], [1, Q, Rr, B], [0, Rr, Q, A]); }
  }
  return out;
}
// the rhombs: pairs of triangles that share the edge B to C. A triangle with no partner lies at the rim and is left out
function rhombs(ts) {
  const key = (p, q) => [p, q].map(v => v[0].toFixed(2) + "," + v[1].toFixed(2)).sort().join("|");
  const by = new Map();
  for (const t of ts) { const k = key(t[2], t[3]); (by.get(k) || by.set(k, []).get(k)).push(t); }
  const out = [];
  for (const pair of by.values()) if (pair.length === 2) {
    const [a, b] = pair, pts = [a[1], a[2], b[1], a[3]];
    out.push({ kind: a[0], pts, c: [(a[1][0] + b[1][0]) / 2, (a[1][1] + b[1][1]) / 2] });
  }
  return out;
}

// ---------------------------------------------------------------- the drawing
for (const sv of document.querySelectorAll("svg.penrose-patch")) run(sv);
function run(sv) {
  const fig = sv.closest("figure");
  const S = R * 1.15;
  sv.setAttribute("viewBox", `${-S} ${-S} ${2 * S} ${2 * S}`);
  const layer = sv.appendChild(el("g", {}));
  let shown = [];
  function lay(t, wait, aged) {
    const e = el("polygon", { class: "pt" + (t.kind ? " thick" : " thin"), points: t.pts.map(p => p[0].toFixed(2) + "," + p[1].toFixed(2)).join(" ") });
    e.style.transformOrigin = `${t.c[0]}px ${t.c[1]}px`;
    layer.appendChild(e);
    shown.push(e);
    if (still) return e;
    e.animate({ opacity: [0, 1], transform: ["scale(.4)", "scale(1)"] }, { duration: 320, delay: wait, easing: "cubic-bezier(.2, .8, .3, 1)", fill: "backwards" });
    if (!aged) e.animate({ stroke: [FRESH, AGED] }, { duration: AGEING, delay: wait, easing: "ease-in", fill: "both" });
    return e;
  }
  const orders = [
    ts => ts.slice().sort((a, b) => Math.hypot(a.c[0], a.c[1]) - Math.hypot(b.c[0], b.c[1])),                 // outward from the seed
    ts => { const p = [between([-60, 60]), between([-60, 60])]; return ts.slice().sort((a, b) => Math.hypot(a.c[0] - p[0], a.c[1] - p[1]) - Math.hypot(b.c[0] - p[0], b.c[1] - p[1])); },   // outward from a point
    ts => { const a0 = rnd() * 2 * Math.PI; const ang = t => ((Math.atan2(t.c[1], t.c[0]) - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); return ts.slice().sort((a, b) => ang(a) - ang(b) || Math.hypot(a.c[0], a.c[1]) - Math.hypot(b.c[0], b.c[1])); },   // round the clock
  ];
  // one cycle: lay a patch, hold, divide it, hold, clear
  let tris = seed(rnd() * 2 * Math.PI), level = 0;
  for (let i = 0; i < LEVELS; i++) tris = subdivide(tris);
  if (still) { for (const t of rhombs(tris)) lay(t, 0, true); return; }
  function clear(wait) {
    for (const e of shown) e.animate({ opacity: [1, 0], stroke: [AGED, GHOST] }, { duration: 500, delay: wait + rnd() * 300, fill: "forwards" }).onfinish = () => e.remove();
    shown = [];
  }
  function cycle() {
    tris = seed(rnd() * 2 * Math.PI);
    for (let i = 0; i < LEVELS; i++) tris = subdivide(tris);
    const order = pick(orders)(rhombs(tris)), gap = pick(GAP);
    order.forEach((t, n) => lay(t, n * gap));
    const grown = order.length * gap + 320;
    setTimeout(() => {
      // deflate: the old outlines pale and go as the smaller tiles arrive over them, outward from the seed
      const old = shown; shown = [];
      for (const e of old) e.animate({ stroke: [AGED, GHOST], opacity: [1, 0] }, { duration: 900, delay: 300, fill: "forwards" }).onfinish = () => e.remove();
      tris = subdivide(tris);
      const small = orders[0](rhombs(tris)), g2 = 6;
      small.forEach((t, n) => lay(t, n * g2));
      const divided = small.length * g2 + 320;
      setTimeout(() => { clear(0); setTimeout(cycle, 1200); }, divided + between(HOLD));
    }, grown + between(HOLD));
  }
  // the clock: the cycle runs while the figure is in view
  let started = false;
  const tick = () => { if (!started && (!fig || fig.classList.contains("on"))) { started = true; cycle(); } };
  new MutationObserver(tick).observe(fig || sv, { attributes: true, attributeFilter: ["class"] });
  tick();
}
})();
