/* A split-flap board live beside its case, reciting. Each line of a short passage arrives on the bottom row, and the
   rows above move up, as departures do. Every drum whose character changes runs on through the characters in the
   drum's order, the letters, the digits, then the marks, with a hard stop on each flap, until the one wanted comes
   round, so the board clatters and a drum far from its letter runs for a while. The columns set off a little apart,
   so the change ripples across. After the passage a blank row or two, then the next. The passages are out of
   copyright: Blake's quatrain from Auguries of Innocence (1803), a fragment of Heraclitus in Burnet's translation
   (1912), and two lines of Whitman's Crossing Brooklyn Ferry (1856).

   Runs on each svg.solari-patch while its figure is in view. With motion turned down the first passage stands still. */
(function () {
"use strict";
const PASSAGES = [
  ["TO SEE A WORLD IN A GRAIN OF SAND", "AND A HEAVEN IN A WILD FLOWER", "HOLD INFINITY IN THE PALM OF YOUR HAND", "AND ETERNITY IN AN HOUR", "", "WILLIAM BLAKE, AUGURIES OF INNOCENCE"],
  ["YOU CANNOT STEP TWICE INTO THE SAME RIVERS", "FOR FRESH WATERS ARE EVER FLOWING", "IN UPON YOU", "", "HERACLITUS, FRAGMENT 41, TR. BURNET"],
  ["FLOW ON, RIVER! FLOW WITH THE FLOOD-TIDE,", "AND EBB WITH THE EBB-TIDE!", "", "WALT WHITMAN, CROSSING BROOKLYN FERRY"],
];
const COLS = 42, ROWS = 7, STEP = 6000, REST = 2;   // drums a row, rows, a line's time (the drums take up to three seconds of it, and the line then stands to be read), and blank rows between passages
const BEAT = 60;                                    // milliseconds a flap: a drum runs through all its characters in about two and a half seconds
const W = 22, H = 30, GX = 4, GY = 6;
const DARK = "#2b2825", DARKER = "#1e1b19", LINE = "rgba(0,0,0,.55)";
const NS = "http://www.w3.org/2000/svg";
const el = (name, at) => { const e = document.createElementNS(NS, name); for (const k in at) e.setAttribute(k, at[k]); return e; };
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = s => (s + " ".repeat(COLS)).slice(0, COLS);
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.!-";   // the characters on a drum, in the order the drum runs through them

for (const sv of document.querySelectorAll("svg.solari-patch")) run(sv);
function run(sv) {
  const fig = sv.closest("figure");
  sv.setAttribute("viewBox", `0 0 ${COLS * (W + GX) - GX} ${ROWS * (H + GY) - GY}`);
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const g = sv.appendChild(el("g", { transform: `translate(${c * (W + GX)} ${r * (H + GY)})` }));
    g.appendChild(el("rect", { width: W, height: H, rx: 3, fill: DARK }));
    const t = g.appendChild(el("text", { x: W / 2, y: H / 2 + 6, "text-anchor": "middle", class: "solari-glyph" }));
    const leaf = g.appendChild(el("rect", { width: W, height: H / 2, rx: 3, fill: DARKER, opacity: 0 }));
    leaf.style.transformOrigin = `${W / 2}px ${H / 2}px`;
    g.appendChild(el("line", { x1: 0, y1: H / 2, x2: W, y2: H / 2, stroke: LINE, "stroke-width": 1 }));
    cells.push({ t, leaf, ch: " ", pos: CHARS.indexOf(" "), target: CHARS.indexOf(" "), timer: null });
  }
  // one flap: the drum turns to its next character, with a hard stop and no easing, and turns again after a beat
  // unless that character is the one wanted
  function flip(cell) {
    if (cell.pos === cell.target) { cell.timer = null; return; }
    cell.pos = (cell.pos + 1) % CHARS.length;
    cell.t.textContent = CHARS[cell.pos].trim();
    cell.leaf.animate({ opacity: [1, 1, 0], transform: ["scaleY(1)", "scaleY(.15)", "scaleY(0)"] }, { duration: BEAT - 10, easing: "steps(3, end)", fill: "none" });
    cell.timer = cell.pos === cell.target ? null : setTimeout(() => flip(cell), BEAT);
  }
  // the lines, in order, with blank rows between passages, taken round and round
  const script = [];
  for (const p of PASSAGES) { for (const l of p) script.push(pad(l)); for (let i = 0; i < REST; i++) script.push(pad("")); }
  let rows = Array.from({ length: ROWS }, () => pad("")), at = 0;
  function show(animate) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cell = cells[r * COLS + c], ch = rows[r][c];
      if (cell.ch === ch) continue;
      cell.ch = ch;
      const want = CHARS.indexOf(ch);
      if (!animate || want < 0) { cell.t.textContent = ch.trim(); if (want >= 0) cell.pos = want; cell.target = cell.pos; continue; }
      // the drum is given the character wanted. A drum still running towards the last one carries on round to this
      // one; a drum at rest sets off after the ripple
      cell.target = want;
      if (!cell.timer) cell.timer = setTimeout(() => flip(cell), c * 12 + r * 8);
    }
  }
  if (still) { rows = PASSAGES[0].map(pad).concat(rows).slice(0, ROWS); show(false); return; }
  let timer = null;
  function tick() {
    if (fig && !fig.classList.contains("on")) { timer = null; return; }
    rows.shift(); rows.push(script[at]); at = (at + 1) % script.length;
    show(true);
    timer = setTimeout(tick, STEP);
  }
  const start = () => { if (!timer && (!fig || fig.classList.contains("on"))) timer = setTimeout(tick, 600); };
  new MutationObserver(start).observe(fig || sv, { attributes: true, attributeFilter: ["class"] });
  start();
}
})();
