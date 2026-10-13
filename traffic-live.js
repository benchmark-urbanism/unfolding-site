/* Rule 184 run live on the overview, for the case "The traffic jam". Drawn in the frame of live-figure.js.

   The road is a ring of cells, as in Sugiyama's circular track, so the cars go round and the density never changes.
   At the top, the road as it is now: each black cell is a car, and a car that cannot move, because the cell ahead is
   taken, is red. Under it, the run: each row the road a step later, the newest at the bottom, so that time runs down
   and a jam shows as a dark band drifting backwards while the cars drift forwards. The step count stands at the
   right. When the run has gone far enough the cars are set out again at random. */
(function () {
"use strict";
const PAPER = "#f9f4e5", INK = "#1c1a17", MUTED = "#6f6a60", LINE = "#cfc7ad", RED = "#e01b24";
const NUM = "IBM Plex Sans, 'Helvetica Neue', Arial, sans-serif";
const N = 64, DENSITY = .56, LAST = 420;   // cells round the ring, the share of them with a car, and the steps before a new start
let ROWS = 40, cell = 0, gx = 0, gy = 0, road = 0;
let row, rows, step;
const stuck = (r, i) => r[i] && r[(i + 1) % N];   // a car with a car ahead

function reset() {
  row = new Uint8Array(N);
  const order = Array.from({ length: N }, (_, i) => i).sort(() => Math.random() - .5);
  for (const i of order.slice(0, Math.round(N * DENSITY))) row[i] = 1;
  rows = [row]; step = 0;
}
// rule 184: a car moves forward when the cell ahead is empty, and a cell is entered by the car behind it
function advance() {
  const b = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const l = row[(i - 1 + N) % N], c = row[i], r = row[(i + 1) % N]; b[i] = c ? (r ? 1 : 0) : (l ? 1 : 0); }
  row = b; rows.push(b);
  if (rows.length > ROWS) rows.shift();
  if (++step >= LAST) reset();
}

reset();
window.liveFigure("traffic", {
  stepMs: 160, stillSteps: 40,
  size(g) {
    cell = Math.max(4, Math.floor(Math.min(g.W / N, (g.H - 150) / 44)));
    gx = Math.round((g.W - cell * N) / 2);
    road = 40; gy = road + Math.round(cell * 2.2) + 36;
    ROWS = Math.max(8, Math.min(48, Math.floor((g.H - gy - 16) / cell)));
    while (rows.length > ROWS) rows.shift();
  },
  step: advance,
  draw(g) {
    const ctx = g.ctx, span = cell * N, h = Math.round(cell * 1.6);
    ctx.clearRect(0, 0, g.W, g.H);
    // the road now
    g.caps(g.fit("THE ROAD, A RING OF 64 CELLS", "THE ROAD", span - 120), gx, road - 10);
    g.caps(g.fit("CARS MOVE THIS WAY →", "→", 120), gx + span, road - 10, "right");
    ctx.fillStyle = PAPER; ctx.fillRect(gx, road, span, h);
    ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.strokeRect(gx + .5, road + .5, span - 1, h - 1);
    for (let i = 0; i < N; i++) if (row[i]) { ctx.fillStyle = stuck(row, i) ? RED : INK; ctx.fillRect(gx + i * cell + 1, road + 2, cell - 2, h - 4); }
    // the run, time running down
    g.caps(g.fit("THE RUN, TIME RUNNING DOWN", "THE RUN", span - 90), gx, gy - 12);
    g.caps(`STEP ${step}`, gx + span, gy - 12, "right");
    ctx.fillStyle = PAPER; ctx.fillRect(gx, gy, span, cell * ROWS);
    ctx.fillStyle = INK;
    rows.forEach((r, j) => { for (let i = 0; i < N; i++) if (r[i]) ctx.fillRect(gx + i * cell, gy + j * cell, cell, cell); });
    const ny = gy + (rows.length - 1) * cell;
    ctx.strokeStyle = MUTED; ctx.lineWidth = 1; ctx.strokeRect(gx - .5, ny - .5, span + 1, cell + 1);
    ctx.font = `11px ${NUM}`; ctx.fillStyle = MUTED; ctx.textAlign = "left";
    ctx.fillText("jams drift backwards", gx, gy + ROWS * cell + 16);
    ctx.textAlign = "right"; ctx.fillText("cars drift forwards", gx + span, gy + ROWS * cell + 16);
  },
});
})();
