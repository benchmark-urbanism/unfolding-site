/* Rule 110 run live on the overview, for the passage "No substitute for process". Drawn in the frame of live-figure.js.

   At the top, the rule itself: the eight cases a cell can meet (itself and its two neighbours, black or white) and the
   colour each gives in the next row, in Wolfram's order from 111 to 000. In the middle, the run: one black cell at
   the right of the first row, and each row below worked out from the one above, a row at a time, down the frame.
   Under the run, the newest row written as ones and zeros, each figure under its own column. The step count stands at
   the right. When the run has filled the frame it is held a moment, then begun again from the one cell, and it begins
   again from the one cell each time the figure comes into view, so what is seen is always the pattern growing from
   its seed.

   The row is computed wider than it is shown, so that what is shown is the true unbounded run and not one bent by a
   wall at the left: the pattern grows leftwards one cell a step, and the hidden part takes that growth. */
(function () {
"use strict";
const PAPER = "#f9f4e5", INK = "#1c1a17", MUTED = "#6f6a60", LINE = "#cfc7ad";
const NUM = "IBM Plex Sans, 'Helvetica Neue', Arial, sans-serif";
const RULE = 110, COLS = 56, HOLD = 18;   // the hold with the frame full, in steps
let ROWS = 36;                       // rows shown; fewer on a short canvas
const SPAN = COLS + ROWS + 4;        // the computed width: the shown columns plus one for every step the pattern can grow left
const next = (l, c, r) => (RULE >> (l * 4 + c * 2 + r)) & 1;
const shown = row => row.subarray(SPAN - COLS);
let rows, step, held, cell = 0, gx = 0, gy = 0;

function reset() { const first = new Uint8Array(SPAN); first[SPAN - 1] = 1; rows = [first]; step = 0; held = 0; }
function advance() {
  if (rows.length >= ROWS) { if (++held > HOLD) reset(); return; }
  const a = rows[rows.length - 1], b = new Uint8Array(SPAN);
  for (let i = 0; i < SPAN; i++) b[i] = next(i > 0 ? a[i - 1] : 0, a[i], i < SPAN - 1 ? a[i + 1] : 0);
  rows.push(b);
  step++;
}

// the eight cases in a row; on a narrow screen only the colour each gives is written under it
function drawRule(g) {
  const ctx = g.ctx, span = cell * COLS;
  g.caps(g.fit("THE RULE: EIGHT CASES", "THE RULE", span), gx, 18);
  const c = Math.max(7, Math.min(12, Math.floor(cell * 1.4))), w = 3 * c, gap = (span - 8 * w) / 7, narrow = cell < 8;
  for (let k = 0; k < 8; k++) {
    const n = 7 - k, l = (n >> 2) & 1, m = (n >> 1) & 1, r = n & 1, x = gx + k * (w + gap), y = 34;
    [l, m, r].forEach((v, j) => {
      ctx.fillStyle = v ? INK : PAPER; ctx.fillRect(x + j * c, y, c, c);
      ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.strokeRect(x + j * c + .5, y + .5, c - 1, c - 1);
    });
    const o = next(l, m, r);
    ctx.fillStyle = o ? INK : PAPER; ctx.fillRect(x + c, y + c + 4, c, c);
    ctx.strokeStyle = LINE; ctx.strokeRect(x + c + .5, y + c + 4.5, c - 1, c - 1);
    ctx.font = `12px ${NUM}`; ctx.fillStyle = MUTED; ctx.textAlign = "center";
    ctx.fillText(narrow ? String(o) : `${l}${m}${r} → ${o}`, x + w / 2, y + 2 * c + 22);
  }
}

reset();
window.liveFigure("ca", {
  stepMs: 140, stillSteps: 35,       // the still is the frame filled from the one cell
  size(g) {
    // the run takes what is left once the rule above and the row of digits below have their room
    cell = Math.max(4, Math.floor(Math.min(g.W / COLS, (g.H - 190) / 36)));
    gx = Math.round((g.W - cell * COLS) / 2);
    gy = cell < 8 ? 104 : 128;
    ROWS = Math.max(8, Math.min(36, Math.floor((g.H - gy - 50) / cell)));
    if (rows.length > ROWS) reset();
  },
  step: advance,
  wake: reset,
  draw(g) {
    const ctx = g.ctx, span = cell * COLS;
    ctx.clearRect(0, 0, g.W, g.H);
    drawRule(g);
    const count = `STEP ${step}`;
    g.caps(g.fit("RULE 110, RUN FROM ONE CELL", "RULE 110", span - 90), gx, gy - 12);
    g.caps(count, gx + span, gy - 12, "right");
    ctx.fillStyle = PAPER; ctx.fillRect(gx, gy, span, cell * ROWS);
    ctx.fillStyle = INK;
    rows.forEach((row, j) => {
      const s = shown(row);
      for (let i = 0; i < COLS; i++) if (s[i]) ctx.fillRect(gx + i * cell, gy + j * cell, cell, cell);
    });
    // a hairline round the newest row, and its digits under the run
    const ny = gy + (rows.length - 1) * cell;
    ctx.strokeStyle = MUTED; ctx.lineWidth = 1; ctx.strokeRect(gx - .5, ny - .5, span + 1, cell + 1);
    const dy = gy + ROWS * cell + 26;
    g.caps(g.fit("THE NEWEST ROW, AS A COMPUTER HOLDS IT", "THE NEWEST ROW", span), gx, dy);
    const last = shown(rows[rows.length - 1]), every = cell < 8 ? 2 : 1;    // on a narrow screen every other digit, so they do not touch
    ctx.font = `${Math.max(9, Math.min(13, cell))}px ${NUM}`; ctx.textAlign = "center";
    for (let i = 0; i < COLS; i += every) { ctx.fillStyle = last[i] ? INK : MUTED; ctx.fillText(String(last[i]), gx + i * cell + cell / 2, dy + 20); }
  },
});
})();
