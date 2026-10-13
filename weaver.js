/* Warren Weaver's three kinds of problem (Science and Complexity, 1948), drawn as three small systems on the
   overview's board, each running on its own, with one figure under each: the entropy of where its things are, over
   an eight-by-eight grid of the square, as a share of its most, so that the three can be compared. It is low for the
   two balls, near one for the random balls, and between for the structure, which is Weaver's order of the three.
   Drawn in the frame of live-figure.js.

     simplicity                two balls on a table, each rebounding from the sides. Their paths can be written down in
                               advance: a dashed line runs ahead of each ball along the path the formula gives it for
                               the next four seconds.
     disorganised complexity   hundreds of balls moving at random. No single path matters; only the averages do. Twenty
                               bars along the foot count the balls in each twentieth of the width and stay level while
                               every ball moves.
     organised complexity      particles wander until they touch what is already there, and stick: diffusion-limited
                               aggregation, the accretion model that Batty and Longley fitted to urban growth in
                               Fractal Cities (1994). A structure grows that no one drew, each piece added against the
                               ones before. When it reaches the top of its frame the structure fades, and another
                               grows by the same rule from a strip of ground laid afresh at random.

   The two balls do not collide with each other: two hard discs in a box make a chaotic system, and the panel is
   meant to show the kind of problem a formula settles. */
(function () {
"use strict";
const PAPER = "#f9f4e5", INK = "#1c1a17", MUTED = "#6f6a60", LINE = "#cfc7ad";
const FIGS = "500 12px 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const LABELS = [["SIMPLICITY"], ["DISORGANISED", "COMPLEXITY"], ["ORGANISED", "COMPLEXITY"]];   // Weaver's own names for the three
let S = 0, boxes = [];
// the entropy of where things are, over an eight-by-eight grid of the unit square, as a share of its most, which is
// reached when every cell of the grid holds an equal share
function placeEntropy(points) {
  const G = 8, c = new Float64Array(G * G);
  for (const [x, y] of points) c[Math.min(G - 1, Math.floor(y * G)) * G + Math.min(G - 1, Math.floor(x * G))]++;
  let h = 0;
  for (const n of c) if (n) { const p = n / points.length; h -= p * Math.log(p); }
  return h / Math.log(G * G);
}
const entropyLine = points => `ENTROPY OF PLACE ${placeEntropy(points).toFixed(2)}`;

// ---------------------------------------------------------------- the three systems, each in a unit square
const R = .035, AHEAD = 240;         // a ball's radius, in the unit square; the steps the path is drawn ahead, four seconds
function fly(b) {
  b.x += b.vx; b.y += b.vy; b.gone = (b.gone || 0) + Math.hypot(b.vx, b.vy);
  if (b.x < R) { b.x = 2 * R - b.x; b.vx = -b.vx; } else if (b.x > 1 - R) { b.x = 2 * (1 - R) - b.x; b.vx = -b.vx; }
  if (b.y < R) { b.y = 2 * R - b.y; b.vy = -b.vy; } else if (b.y > 1 - R) { b.y = 2 * (1 - R) - b.y; b.vy = -b.vy; }
}
function Formula() {
  // speeds that divide the box's width and height evenly, so that each path closes on itself (in 600 and 480 steps)
  const w = 1 - 2 * R;
  this.balls = [{ x: .3, y: .35, vx: w / 150, vy: w / 100 }, { x: .7, y: .6, vx: -w / 120, vy: w / 80 }];
}
Formula.prototype.step = function () { for (const b of this.balls) fly(b); };
Formula.prototype.draw = function (ctx, x0, y0, s) {
  // the path ahead: the same arithmetic run on a copy of each ball, drawn dashed, the dashes held still on the table
  // as the ball passes over them
  ctx.strokeStyle = MUTED; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  for (const b of this.balls) {
    const c = Object.assign({}, b);
    ctx.lineDashOffset = -((b.gone || 0) * s) % 8;
    ctx.beginPath(); ctx.moveTo(x0 + c.x * s, y0 + c.y * s);
    for (let i = 0; i < AHEAD; i++) { fly(c); ctx.lineTo(x0 + c.x * s, y0 + c.y * s); }
    ctx.stroke();
  }
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  ctx.fillStyle = INK;
  for (const b of this.balls) { ctx.beginPath(); ctx.arc(x0 + b.x * s, y0 + b.y * s, R * s, 0, 7); ctx.fill(); }
};
Formula.prototype.line = function () { return [entropyLine(this.balls.map(b => [b.x, b.y]))]; };

const CAP = .009, DOT = .009, BINS = 20;   // the most a random ball moves a step, its radius, and the columns counted
function Statistics() {
  this.balls = [];
  for (let i = 0; i < 320; i++) {
    const a = Math.random() * 6.283, v = .002 + Math.random() * .006;
    this.balls.push({ x: Math.random(), y: Math.random(), vx: Math.cos(a) * v, vy: Math.sin(a) * v });
  }
}
Statistics.prototype.step = function () {
  for (const b of this.balls) {
    // a little jostling, so that no ball keeps its path for long
    b.vx += (Math.random() - .5) * .0016; b.vy += (Math.random() - .5) * .0016;
    const v = Math.hypot(b.vx, b.vy);
    if (v > CAP) { b.vx *= CAP / v; b.vy *= CAP / v; }
    b.x += b.vx; b.y += b.vy;
    if (b.x < .01 || b.x > .99) { b.vx = -b.vx; b.x = Math.min(.99, Math.max(.01, b.x)); }
    if (b.y < .01 || b.y > .99) { b.vy = -b.vy; b.y = Math.min(.99, Math.max(.01, b.y)); }
  }
};
Statistics.prototype.bins = function () { const c = new Array(BINS).fill(0); for (const b of this.balls) c[Math.min(BINS - 1, Math.floor(b.x * BINS))]++; return c; };
Statistics.prototype.draw = function (ctx, x0, y0, s) {
  // the balls in each twentieth of the width, as bars from the foot, under the balls
  const w = s / BINS;
  ctx.fillStyle = LINE;
  this.bins().forEach((n, i) => { const h = n / 50 * s; ctx.fillRect(x0 + i * w + 1, y0 + s - h, w - 2, h); });
  ctx.fillStyle = INK; ctx.beginPath();
  for (const b of this.balls) { ctx.moveTo(x0 + b.x * s + DOT * s, y0 + b.y * s); ctx.arc(x0 + b.x * s, y0 + b.y * s, DOT * s, 0, 7); }
  ctx.fill();
};
Statistics.prototype.line = function () { return [entropyLine(this.balls.map(b => [b.x, b.y]))]; };

// accretion on a grid: a cell joins the structure when a wandering particle steps on to a side of it. The structure
// grows up from a strip of ground along the foot of the frame; the walk wraps from side to side, may go down to the
// ground, and is given up only far above the structure
const N = 120, FADE = 90, ABOVE = 10, SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function Accretion() { this.reset(); }
Accretion.prototype.reset = function () {
  this.grid = new Uint8Array(N * N);
  this.cells = [];
  for (let x = 0; x < N; x += 2) if (Math.random() < .12) this.add(x, N - 1);
  this.add(N >> 1, N - 1);
  this.fade = 0; this.top = N - 1;
};
Accretion.prototype.add = function (x, y) { this.grid[y * N + x] = 1; this.cells.push([x, y, 0]); if (y < this.top) this.top = y; };
Accretion.prototype.touches = function (x, y) {
  for (let k = 0; k < 4; k++) {
    const u = (x + SIDES[k][0] + N) % N, v = y + SIDES[k][1];
    if (v >= 0 && v < N && this.grid[v * N + u]) return true;
  }
  return false;
};
Accretion.prototype.step = function () {
  if (this.fade) { if (++this.fade > FADE) this.reset(); return; }
  for (let k = 0; k < 6; k++) {
    let x = Math.floor(Math.random() * N), y = Math.max(0, this.top - ABOVE);
    for (let n = 0; n < 4000; n++) {
      const r = Math.random();
      if (r < .25) x++; else if (r < .5) x--; else if (r < .75) y++; else y--;
      x = (x + N) % N;
      if (y < this.top - 3 * ABOVE || y >= N) break;
      if (y >= 0 && !this.grid[y * N + x] && this.touches(x, y)) { this.add(x, y); break; }
    }
  }
  for (const c of this.cells) c[2] = Math.min(1, c[2] + .08);
  if (this.top < 6) this.fade = 1;
};
Accretion.prototype.draw = function (ctx, x0, y0, s) {
  const c = s / N;
  ctx.globalAlpha = this.fade ? 1 - this.fade / FADE : 1;
  for (const [x, y, age] of this.cells) {
    ctx.fillStyle = age < 1 ? MUTED : INK;
    ctx.fillRect(x0 + x * c, y0 + y * c, c * 1.05, c * 1.05);
  }
  ctx.globalAlpha = 1;
};
Accretion.prototype.line = function () { return [entropyLine(this.cells.map(c => [c[0] / N, c[1] / N]))]; };

const systems = [new Formula(), new Statistics(), new Accretion()];

// ---------------------------------------------------------------- the frame: three squares in a row, or a column when narrow
window.liveFigure("weaver", {
  stepMs: 1000 / 60, maxSteps: 4, stillSteps: 320,
  size(g) {
    // three squares in a row, with their lines of figures and their labels under them; on a phone the canvas is
    // taller, so the squares stay large
    const GAP = Math.max(16, g.W * .04), LABEL = 64;
    S = Math.floor(Math.min((g.W - 2 * GAP) / 3, g.H - LABEL - 16));
    const left = (g.W - 3 * S - 2 * GAP) / 2, top = (g.H - S - LABEL) / 2;
    boxes = [0, 1, 2].map(i => [left + i * (S + GAP), top]);
  },
  step() { for (const s of systems) s.step(); },
  draw(g) {
    const ctx = g.ctx;
    ctx.clearRect(0, 0, g.W, g.H);
    if (S < 40) return;             // not laid out yet
    const small = S < 130;
    systems.forEach((sys, i) => {
      const [x0, y0] = boxes[i];
      ctx.fillStyle = PAPER; ctx.fillRect(x0, y0, S, S);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, S, S); ctx.clip();
      sys.draw(ctx, x0, y0, S);
      ctx.restore();
      ctx.fillStyle = INK; ctx.font = FIGS; ctx.textAlign = "center";
      if ("letterSpacing" in ctx) ctx.letterSpacing = small ? "1px" : "1.5px";
      if (!small) {
        // the lines of figures under the square; a line given as a list is joined, and its oldest items are dropped
        // from the front until it fits
        sys.line().forEach((line, k) => {
          const items = Array.isArray(line) ? line.slice() : [line], text = () => items.join(" · ");
          ctx.font = FIGS;
          while (items.length > 1 && ctx.measureText(text()).width > S - 8) items.shift();
          if (ctx.measureText(text()).width > S - 8) ctx.font = FIGS.replace("12px", "11px");   // a line a little too wide is set a size smaller
          if (items.length) ctx.fillText(text(), x0 + S / 2, y0 + S + 18 + k * 16);
        });
      }
      ctx.font = `500 ${small ? 11 : 12}px 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif`;
      LABELS[i].forEach((line, k) => ctx.fillText(line, x0 + S / 2, y0 + S + (small ? 26 : 40) + k * 16));
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    });
  },
});
})();
