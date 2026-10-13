/* The tree and the semilattice live beside Alexander's case, drawn after his diagrams in A City Is Not a Tree (1965),
   both to one design: six parts along the foot as solid dots, every subset of two or more parts a hollow dot set over
   the middle of its parts and higher the larger it is, with a line to each subset just inside it. Where two subsets of one size would
   land on the same spot they are set a little apart. Both diagrams move. Every few seconds a subset forms or
   dissolves in each. The left is kept a tree: it forms only runs of neighbouring parts, and only where the run sits
   wholly inside the subsets it meets or wholly apart from them, so on six parts it fills at five and can only change
   by letting one go. The right is free to be a semilattice: it forms any of the fifty-seven subsets, 135 as readily as
   345, so its lines cross; subsets overlap, and where two overlap the parts they share are made a subset too, as his
   axiom asks. It forms one every so often, more often than it lets one go, until all fifty-seven are there, holds,
   and empties back to its first nine to fill again; a level with more than eleven is spread evenly. Only the parts
   are numbered: a subset's lines say which parts it holds. Under each, a large number, the subsets it holds at the
   moment, one for each ring above the parts, of the most its kind can hold on six parts, 4 of 5, 9 of 57, rolling
   to each new value. The ceilings are Alexander's count: a tree can hold n - 1 and a semilattice 2^n - n - 1, every
   set of two or more parts. The tree is seen to reach its ceiling and stall; the web reaches its own. On twenty parts
   the ceilings are 19 and 1,048,555, his figures in the caption.

   Runs on each svg.lattice-patch while its figure is in view. With motion turned down both stand still. */
(function () {
"use strict";
const INK = "#1c1a17", MUTED = "#6f6a60", WARM = "#d98c3a", PAPER = "#f6f0dc";
const FONT = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const N = 6, LEVEL = [0, 470, 394, 318, 242, 166, 90];      // a subset's height, by the number of parts it holds
const EVERY = 2600, WEB_EVERY = 700, FULL = 6000, ROLL = 600;   // a move of the tree; a move of the web; the hold when the web is full; a number's roll to its new value
const APART = 40, DENSE = 11;                                   // the least two dots on one level stand apart, and the most a level holds at that spacing
const NS = "http://www.w3.org/2000/svg";
const el = (name, at, parent) => { const e = document.createElementNS(NS, name); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const pick = a => a[Math.floor(Math.random() * a.length)];
// a subset is the string of the parts it holds, "234"; the parts themselves are "1" to "6"
const PARTS = Array.from({ length: N }, (_, i) => String(i + 1));
const within = (a, b) => a.length < b.length && [...a].every(c => b.includes(c));   // a inside b, and smaller
const meet = (a, b) => [...a].filter(c => b.includes(c)).join("");                   // the parts two subsets share
const mean = g => [...g].reduce((s, c) => s + +c, 0) / g.length;                     // where a subset's parts lie
const WHOLE = PARTS.join("");
const TREE = ["12", "345", "3456", WHOLE];
const WEB = ["123", "23", "34", "45", "234", "345", "12345", "3456", WHOLE];
// every run of two to five parts side by side, the subsets the tree may form, and every subset of two or more parts,
// the fifty-seven the web may form
const RUNS = [];
for (let s = 2; s < N; s++) for (let i = 0; i + s <= N; i++) RUNS.push(PARTS.slice(i, i + s).join(""));
const SUBSETS = [];
for (let m = 1; m < 1 << N; m++) { const g = PARTS.filter((_, i) => (m >> i) & 1).join(""); if (g.length >= 2) SUBSETS.push(g); }
// Alexander's count: the most subsets a tree and a semilattice can contain on n elements, n - 1 and 2^n - n - 1,
// which on twenty elements are his 19 and 1,048,555
const MOST = { tree: N - 1, web: SUBSETS.length };
// the tree axiom: any two subsets are nested or apart. A subset may join a tree only if it is so with every one there
const fits = (g, groups) => groups.every(h => within(g, h) || within(h, g) || meet(g, h) === "");
// the semilattice axiom: where two subsets overlap, the parts they share are a subset. Subsets are added until it holds
function close(groups) {
  const out = groups.slice();
  for (let grew = true; grew;) {
    grew = false;
    for (const a of out) for (const b of out) {
      const m = a === b ? "" : meet(a, b);
      if (m.length >= 2 && m !== a && m !== b && !out.includes(m)) { out.push(m); grew = true; }
    }
  }
  return out;
}
// a subset that two other subsets share cannot go while they stay
const needed = (g, groups) => groups.some(a => a !== g && groups.some(b => b !== g && b !== a && meet(a, b) === g));
// where each subset stands: over the middle of its parts, except that a cluster of subsets on one level that would
// stand too close is spread APART about its common middle, kept within the diagram
function places(groups, x0) {
  const pos = new Map(), byLevel = {};
  for (const g of groups) (byLevel[g.length] = byLevel[g.length] || []).push(g);
  for (const k in byLevel) {
    const lv = byLevel[k].sort((a, b) => mean(a) - mean(b) || a.localeCompare(b)), want = lv.map(g => x0 + 80 * (mean(g) - 1));
    // a level too full to keep its subsets APART is spread evenly across the diagram
    if (lv.length > DENSE) { lv.forEach((g, i) => pos.set(g, x0 + 400 * i / (lv.length - 1))); continue; }
    for (let i = 0; i < lv.length;) {
      let j = i;
      while (j + 1 < lv.length && want[j + 1] - want[j] < APART) j++;
      const n = j - i + 1, centre = want.slice(i, j + 1).reduce((s, x) => s + x, 0) / n;
      const left = Math.max(x0, Math.min(x0 + 400 - (n - 1) * APART, centre - (n - 1) * APART / 2));
      for (let m = i; m <= j; m++) pos.set(lv[m], left + (m - i) * APART);
      i = j + 1;
    }
  }
  return pos;
}

for (const sv of document.querySelectorAll("svg.lattice-patch")) run(sv);
function run(sv) {
  const fig = sv.closest("figure");
  sv.setAttribute("viewBox", "0 0 1200 656");
  sv.setAttribute("font-family", FONT);
  const caps = (x, y) => el("text", { x, y, "font-size": 20, "font-weight": 500, "letter-spacing": 2.5, fill: INK, "text-anchor": "middle" }, sv);

  // a diagram: its parts along the foot from x0, its subsets as dots with lines to the subsets just inside them
  function diagram(x0) {
    const gL = el("g", { fill: "none", stroke: MUTED, "stroke-width": 2, "stroke-linecap": "round" }, sv);
    const gD = el("g", {}, sv);
    const px = i => x0 + 80 * i;
    PARTS.forEach((p, i) => {
      el("circle", { cx: px(i), cy: LEVEL[1], r: 8, fill: INK }, gD);
      const t = el("text", { x: px(i), y: LEVEL[1] + 36, "font-size": 20, fill: INK, "text-anchor": "middle" }, gD); t.textContent = p;
    });
    const drawn = new Map();
    return function draw(groups, changed) {
      const pos = places(groups, x0);
      const at = g => [g.length === 1 ? px(+g - 1) : pos.get(g), LEVEL[g.length]];
      // the lines are laid again each time: from each subset to every subset just inside it
      while (gL.firstChild) gL.firstChild.remove();
      const present = groups.concat(PARTS);
      for (const g of groups) {
        const [x, y] = at(g);
        for (const h of present) {
          if (!within(h, g) || present.some(k => within(h, k) && within(k, g))) continue;
          const [u, v] = at(h);
          const line = el("line", { x1: x, y1: y, x2: u, y2: v }, gL);
          if (changed && (g === changed || h === changed)) line.animate({ opacity: [0, 1] }, { duration: 500, easing: "ease-out", fill: "none" });
        }
      }
      // a subset that has formed comes in warm and settles to ink; one that dissolves turns warm and fades. A subset
      // moved aside by a new neighbour is set at its new place. Subsets carry no labels: their lines say which parts
      // they hold
      for (const g of groups) {
        const [x, y] = at(g);
        let dot = drawn.get(g);
        if (!dot) {
          dot = el("circle", { cx: x, cy: y, r: 8, fill: PAPER, stroke: INK, "stroke-width": 2 }, gD);
          drawn.set(g, dot);
          if (changed) dot.animate({ opacity: [0, 1, 1], stroke: [WARM, WARM, INK] }, { duration: 1200, easing: "ease-out", fill: "none" });
        }
        dot.setAttribute("cx", x);
      }
      for (const [g, dot] of drawn) {
        if (groups.includes(g)) continue;
        drawn.delete(g);
        if (!changed) { dot.remove(); continue; }
        dot.animate({ opacity: [1, 1, 0], stroke: [WARM, WARM, WARM] }, { duration: 900, easing: "ease-in", fill: "none" }).onfinish = () => dot.remove();
      }
    };
  }
  const drawTree = diagram(100), drawWeb = diagram(700);

  // the large numbers, the subsets each holds of the most its kind can hold, rolling to each new value
  caps(300, 636).textContent = "SUBSETS A TREE CAN HOLD";
  caps(900, 636).textContent = "SUBSETS A SEMILATTICE CAN HOLD";
  const counter = (x, most) => ({ el: el("text", { x, y: 600, "font-size": 48, "font-weight": 500, fill: INK, "text-anchor": "middle" }, sv), most, shown: null, from: 0, to: 0, t0: 0 });
  const treeBig = counter(300, MOST.tree), webBig = counter(900, MOST.web);
  // "4 of 5", the "of" set small between the two figures
  const print = c => {
    c.el.textContent = String(c.shown);
    const of = el("tspan", { "font-size": 20, "letter-spacing": 2.5 }, c.el); of.textContent = " OF ";
    c.el.appendChild(document.createTextNode(String(c.most)));
  };
  function roll(c, to) {
    if (c.shown == null) { c.shown = c.to = to; print(c); return; }
    c.from = c.shown; c.to = to; c.t0 = performance.now();
    requestAnimationFrame(paint);
  }
  function paint() {
    const now = performance.now();
    let rolling = false;
    for (const c of [treeBig, webBig]) {
      if (c.shown === c.to) continue;
      const k = Math.min(1, (now - c.t0) / ROLL);
      c.shown = k < 1 ? Math.round(c.from + (c.to - c.from) * (1 - (1 - k) ** 3)) : c.to;
      print(c);
      if (c.shown !== c.to) rolling = true;
    }
    if (rolling) requestAnimationFrame(paint);
  }
  let tree = TREE.slice(), web = WEB.slice();
  const showTree = changed => { drawTree(tree, changed); roll(treeBig, tree.length); };
  const showWeb = changed => { drawWeb(web, changed); roll(webBig, web.length); };
  showTree(); showWeb();
  if (still) return;

  // the play. In the tree a run forms where one fits, and when none fits, or now and then before that, one goes. In
  // the web any absent subset forms, with those the axiom then requires, or now and then one that is not required
  // dissolves, until it is full. The tree moves on a slow beat, the web on a quick one
  function moveTree() {
    const open = RUNS.filter(r => !tree.includes(r) && fits(r, tree));
    if (open.length && (tree.length <= 3 || Math.random() < .7)) {
      const g = pick(open);
      tree = tree.concat(g);
      showTree(g);
    } else {
      const g = pick(tree.filter(h => h !== WHOLE));
      tree = tree.filter(h => h !== g);
      showTree(g);
    }
  }
  let fullSince = 0;
  function moveWeb(now) {
    const open = SUBSETS.filter(g => !web.includes(g));
    if (!open.length) {
      // full: held a while, then emptied back to its first nine to fill again
      if (!fullSince) { fullSince = now; return; }
      if (now - fullSince < FULL) return;
      web = WEB.slice(); fullSince = 0; showWeb("emptied");
      return;
    }
    const inner = web.length - 1;
    if (inner <= 5 || Math.random() < .85) {
      const g = pick(open);
      web = close(web.concat(g));
      showWeb(g);
    } else {
      const free = web.filter(g => g !== WHOLE && !needed(g, web));
      if (!free.length) return;
      const g = pick(free);
      web = web.filter(h => h !== g);
      showWeb(g);
    }
  }
  let timer = null, nextTree = 0, nextWeb = 0;
  function tick() {
    if (fig && !fig.classList.contains("on")) { timer = null; return; }
    const now = performance.now();
    if (now >= nextTree) { moveTree(); nextTree = now + EVERY; }
    if (now >= nextWeb) { moveWeb(now); nextWeb = now + WEB_EVERY; }
    timer = setTimeout(tick, 100);
  }
  const start = () => {
    if (timer || (fig && !fig.classList.contains("on"))) return;
    if (!nextTree) { nextTree = performance.now() + 1800; nextWeb = performance.now() + 1200; }
    timer = setTimeout(tick, 100);
  };
  new MutationObserver(start).observe(fig || sv, { attributes: true, attributeFilter: ["class"] });
  start();
}
})();
