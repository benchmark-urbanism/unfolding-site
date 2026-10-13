/* The three automata of the automata page run live beside their case, each from its seed row: rule 30 from one cell,
   rule 110 from one cell, and rule 184 from a row filled at random, as traffic. Drawn in the frame of live-figure.js.

   Each run goes down the frame a row at a time. When it reaches the foot it is held a moment, then the next begins
   from its seed. The rule and its seed are named above the run, with the step count at the right. The runs begin again
   from rule 30 each time the figure comes into view.

   From one cell the row is computed wider than it is shown, so that no wall at the edge bends the run. The traffic
   runs on a ring, as on the automata page. */
(function () {
"use strict";
const PAPER = "#f9f4e5", INK = "#1c1a17";
const RUNS = [
  { rule: 30, seed: "centre", label: "RULE 30, FROM ONE CELL", short: "RULE 30" },
  { rule: 110, seed: "right", label: "RULE 110, FROM ONE CELL", short: "RULE 110" },
  { rule: 184, seed: "random", label: "RULE 184, FROM A RANDOM ROW, AS TRAFFIC", short: "RULE 184" },
];
const COLS = 128, HOLD = 40;         // columns shown; the hold at the foot, in steps
let ROWS = 120, cell = 0, gx = 0, gy = 0;
let which = 0, rows, step, held, span, wrap, left;
const next = (rule, l, c, r) => (rule >> (l * 4 + c * 2 + r)) & 1;
function reset(k) {
  if (k != null) which = k;
  const r = RUNS[which];
  wrap = r.seed === "random";
  span = wrap ? COLS : COLS + 2 * ROWS + 2;
  left = (span - COLS) >> 1;         // where the shown columns begin in the computed row
  const first = new Uint8Array(span);
  if (wrap) for (let i = 0; i < span; i++) first[i] = Math.random() < .5 ? 1 : 0;
  else first[r.seed === "right" ? left + COLS - 1 : left + (COLS >> 1)] = 1;
  rows = [first]; step = 0; held = 0;
}
function advance() {
  if (rows.length >= ROWS) { if (++held > HOLD) reset((which + 1) % RUNS.length); return; }
  const rule = RUNS[which].rule, a = rows[rows.length - 1], b = new Uint8Array(span);
  for (let i = 0; i < span; i++) {
    const l = i > 0 ? a[i - 1] : wrap ? a[span - 1] : 0, r = i < span - 1 ? a[i + 1] : wrap ? a[0] : 0;
    b[i] = next(rule, l, a[i], r);
  }
  rows.push(b); step++;
}

window.liveFigure("automata-run", {
  stepMs: 40, maxSteps: 4, stillSteps: 130,    // the still is rule 30 filling the frame from its cell
  size(g) {
    cell = Math.max(3, Math.floor(Math.min(g.W / COLS, (g.H - 40) / 120)));
    gx = Math.round((g.W - cell * COLS) / 2);
    gy = 28;
    ROWS = Math.max(20, Math.floor((g.H - gy - 8) / cell));
    reset();
  },
  step: advance,
  wake() { reset(0); },
  draw(g) {
    const ctx = g.ctx, span = cell * COLS, r = RUNS[which];
    ctx.clearRect(0, 0, g.W, g.H);
    g.caps(g.fit(r.label, r.short, span - 90), gx, gy - 10);
    g.caps(`STEP ${step}`, gx + span, gy - 10, "right");
    ctx.fillStyle = PAPER; ctx.fillRect(gx, gy, span, cell * ROWS);
    ctx.fillStyle = INK;
    rows.forEach((row, j) => {
      const y = gy + j * cell;
      for (let i = 0; i < COLS; i++) if (row[left + i]) ctx.fillRect(gx + i * cell, y, cell, cell);
    });
  },
});
})();
