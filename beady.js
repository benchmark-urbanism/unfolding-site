/* The beady ring grown live on the overview, after Bill Hillier and Julienne Hanson, The Social Logic of Space (1984).
   Drawn in the frame of live-figure.js.

   Each step adds a pair of cells at random: a house and its doorstep, joined along a side. The one rule is that the new
   doorstep must share a whole side with a doorstep already laid, and neither cell may fall on one already taken. Nothing
   else is decided. The open cells join into one continuous space that widens and narrows, the beads and the string,
   and every run grows a different settlement. A doorstep with no free side left is no longer drawn from. When the
   settlement nears the edge of its frame it fades and is begun again from a single pair. */
(function () {
"use strict";
const PAPER = "#f9f4e5", INK = "#1c1a17", MUTED = "#6f6a60", OPEN = "#cfc7ad";
const N = 64, EMPTY = 0, HOUSE = 1, STEP = 2, LIMIT = 6, FADE = 40;
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
let grid, open, pairs, fade, newest, cell = 0, gx = 0, gy = 0;

function reset() {
  grid = new Uint8Array(N * N); open = []; pairs = 0; fade = 0; newest = [];
  const c = N >> 1;
  put(c, c, STEP); put(c + 1, c, HOUSE); pairs = 1;
}
function put(x, y, kind) { grid[y * N + x] = kind; if (kind === STEP) open.push([x, y]); newest.push([x, y, kind]); }
const free = (x, y) => x >= 0 && y >= 0 && x < N && y < N && grid[y * N + x] === EMPTY;
const hemmed = ([x, y]) => !SIDES.some(([dx, dy]) => free(x + dx, y + dy));

function grow() {
  if (fade) { if (++fade > FADE) reset(); return; }
  newest = [];
  if (!open.length) { fade = 1; return; }
  // a doorstep already laid with a side still free, a free side of it for the new doorstep, and a free side of that
  // for its house
  for (let tries = 0; tries < 200; tries++) {
    const k = Math.floor(Math.random() * open.length), [ox, oy] = open[k];
    if (hemmed(open[k])) { open.splice(k, 1); continue; }
    const [dx, dy] = SIDES[Math.floor(Math.random() * 4)], sx = ox + dx, sy = oy + dy;
    if (!free(sx, sy)) continue;
    const [hx, hy] = SIDES[Math.floor(Math.random() * 4)], ux = sx + hx, uy = sy + hy;
    if (!free(ux, uy)) continue;
    put(sx, sy, STEP); put(ux, uy, HOUSE); pairs++;
    if (sx < LIMIT || sy < LIMIT || sx >= N - LIMIT || sy >= N - LIMIT) fade = 1;
    return;
  }
}

reset();
window.liveFigure("beady", {
  stepMs: 70, stillSteps: 260,
  size(g) {
    cell = Math.max(1, Math.floor(Math.min(g.W, g.H - 64) / N));
    gx = Math.round((g.W - cell * N) / 2); gy = 28;
  },
  step: grow,
  draw(g) {
    const ctx = g.ctx, span = cell * N;
    ctx.clearRect(0, 0, g.W, g.H);
    g.caps(g.fit("THE BEADY RING, GROWN BY ONE RULE", "THE BEADY RING", span - 120), gx, 16);
    g.caps(`${pairs} HOUSES`, gx + span, 16, "right");
    ctx.fillStyle = PAPER; ctx.fillRect(gx, gy, span, span);
    ctx.globalAlpha = fade ? 1 - fade / FADE : 1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = grid[y * N + x];
      if (!k) continue;
      ctx.fillStyle = k === HOUSE ? INK : OPEN;
      ctx.fillRect(gx + x * cell, gy + y * cell, cell, cell);
    }
    // the pair just laid, ringed
    ctx.strokeStyle = MUTED; ctx.lineWidth = 1;
    if (!g.paused) for (const [x, y] of newest) ctx.strokeRect(gx + x * cell - .5, gy + y * cell - .5, cell + 1, cell + 1);
    ctx.globalAlpha = 1;
    // the key under the frame
    const ky = gy + span + 26;
    ctx.fillStyle = INK; ctx.fillRect(gx, ky - 9, 10, 10); g.caps("HOUSE", gx + 18, ky);
    ctx.fillStyle = OPEN; ctx.fillRect(gx + 104, ky - 9, 10, 10); g.caps(g.fit("DOORSTEP, THE OPEN SPACE", "DOORSTEP", span - 122), gx + 122, ky);
  },
});
})();
