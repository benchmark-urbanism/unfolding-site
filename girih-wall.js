/* The overview's opening picture: a wall of girih tiles, and four moves played on it one at a time.

   On the page's first passage the wall is still: a fivefold wall round one decagon, the same every time. When the
   reader scrolls to the next passage the moves begin and the count of tiles comes into view. Back on the first
   passage, the opening wall is laid again and the count is put away.

     grow      tiles join at the rim, one after another
     shrink    the rim peels back
     flip      a small patch is taken out and its outline is filled with a different arrangement
     unravel   the whole wall fades from the outside in, and a different wall grows from the middle over it

   The wall keeps the rule of the girih page (tiles.js): no tile overlaps another, no corner is left with less room
   than the smallest tile corner, and no edge inside the wall is left that no tile can meet. A tile taken out leaves
   its lines for some seconds as a pale ghost, under the lines of what replaces it. A tile's lines are red when it is
   laid and darken to ink. At the right of the wall the five tiles are drawn, each with the number of it in the wall,
   which steps up and down as tiles arrive and go.

   Every move is worked out before it is shown. Laying tiles is a search that goes back when it reaches an edge
   nothing fits, which is what lets all five tiles be mixed; the tiles it settles on are then shown arriving in order.

   Every corner of a girih tiling is a whole-number sum of four unit steps 36 degrees apart. A corner is kept as those
   four integers, so two tiles agree exactly on a corner or an edge they share.

   The same play runs small beside the girih case, on an svg.girih-patch: a few tiles round one decagon, always in motion
   while the figure is in view, with no count. `girih(sv, o)` runs the wall on an svg; o gives the sizes in edges.

   The earlier form of this picture, with bites from the rim and holes punched at random, is girih-wall-piecemeal.js. */
(function () {
"use strict";
function girih(sv, o) {
const E = 42;                        // the edge, in drawing units, as on the girih page
const HALF = (o.half || 13.6) * E;   // half the side of the drawing
// the nearest and the farthest the rim is taken from the middle. A decagon laid at the rim reaches 3 edges past it, so
// the farthest is set that much short of the drawing's side
const REACH = (o.reach || [6.5, 10.5]).map(x => x * E);
const START = (o.start || [8, 9.5]).map(x => x * E);      // where the rim of a new wall is set, between these
const PACE = (o.pace || [1.5, 2.5]).map(x => x * E);      // how far a grow or a shrink moves the rim, between these
const PATCH = (o.patch || [1.4, 2.8]).map(x => x * E);    // how far from its middle a patch to flip reaches, between these
const MOVES = o.moves || [5, 8];     // how many moves are played on a wall before it is unravelled, between these
const GAP = { ravel: 22, unravel: 10, grow: 70, shrink: 40, flip: 110 };   // milliseconds from one tile to the next in each move
const PAUSE = 1200, HOLD = 2500;     // the rest between two moves, and the longer one once a wall has been ravelled
// how far each kind is favoured where there is a choice. The hexagon, the bow tie and the rhombus are needed often to
// close what the others leave, so they are favoured least, and still make up most of a wall
const SHARE = { decagon: .5, pentagon: .3, hexagon: .1, bowtie: .07, rhombus: .03 };
const NEAR = 4.5 * E;                // how far round an edge the mix already laid is counted
const CLOSE = .001;                  // how much a corner closed counts for, against a kind's place in the order
const FRESH = "#e01b24", AGED = "#1c1a17";   // a tile's lines when it is laid and once it has aged: the pages' red and their ink
const AGEING = o.ageing || 9000;     // how long the lines take to go from the one to the other
const GHOST = "#cfc7ad";             // the lines of a tile taken out, left as a ghost: the pages' line colour
const FALLING = "#9b968e";           // a kind's drawing and number in the count as one of it is taken out: the pages' grey
const FADE = 600, GHOST_FOR = 8000;  // how long a tile takes to fade to its ghost, and how long the ghost then stays
const BOLD = 5, WIDTH = 1.8, SWELL = o.swell || 2800;   // a fresh tile's lines arrive bold and thin to the wall's width over this long
const PLOP = !!o.plop;               // tiles pop in and out, with no ghost left behind, as on the small patch
const DECAY = 1500;                  // a tile taken out: its lines swell bold and thin and pale to the ghost over this long
const OPENING = (o.opening || 9.5) * E;   // where the rim of the opening wall is set
const MANDALA = o.mandala || 10;     // the seed of chance the opening wall is laid from: another number gives another wall
let rnd = Math.random;
const between = r => r[0] + rnd() * (r[1] - r[0]);
// chance that runs the same way every time from one seed
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mod10 = n => ((n % 10) + 10) % 10, mod2pi = a => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

// ---------------------------------------------------------------- the lattice
const COS = [0, 1, 2, 3].map(k => Math.cos(k * Math.PI / 5)), SIN = [0, 1, 2, 3].map(k => Math.sin(k * Math.PI / 5));
// the ten unit steps: the fifth is a sum of the first four, and the other five are their opposites
const UNIT = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [-1, 1, -1, 1]];
for (let k = 0; k < 5; k++) UNIT.push(UNIT[k].map(n => -n));
const step = (v, h) => { const s = UNIT[h]; return [v[0] + s[0], v[1] + s[1], v[2] + s[2], v[3] + s[3]]; };
const pos = v => [E * (v[0] + v[1] * COS[1] + v[2] * COS[2] + v[3] * COS[3]), E * (v[1] * SIN[1] + v[2] * SIN[2] + v[3] * SIN[3])];
const vkey = v => ((v[0] + 2048) * 4096 + v[1] + 2048) * 16777216 + (v[2] + 2048) * 4096 + v[3] + 2048;
// an edge is named from the end it leaves in one of the first five directions
const ekey = (v, h) => h < 5 ? vkey(v) * 5 + h : vkey(step(v, h)) * 5 + h - 5;

// ---------------------------------------------------------------- the tiles
// the five tiles: their corners in order, in units of 36 degrees; `seats` is how many of a tile's edges give
// different seatings, the rest repeating them by the tile's symmetry; `turn` is the heading of each edge from the
// first. The pentagon and the rhombus have corners of 108 degrees, which the other three do not
const KINDS = {
  decagon:  { ang: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], seats: 1 },
  pentagon: { ang: [3, 3, 3, 3, 3], seats: 1 },
  hexagon:  { ang: [2, 4, 4, 2, 4, 4], seats: 3 },
  bowtie:   { ang: [2, 2, 6, 2, 2, 6], seats: 3 },
  rhombus:  { ang: [2, 3, 2, 3], seats: 2 },
};
const SEATS = [];
for (const kind in KINDS) {
  const K = KINDS[kind]; K.turn = [0]; K.odd = K.ang.includes(3);
  for (let i = 1; i < K.ang.length; i++) K.turn.push(K.turn[i - 1] + 5 - K.ang[i]);
  for (let j = 0; j < K.seats; j++) SEATS.push([kind, j]);
}
// a corner takes up some of the ten 36 degree wedges round its point: WEDGES[h][m] is m of them, from heading h on
const WEDGES = [];
for (let h = 0; h < 10; h++) { WEDGES.push([0]); for (let m = 1; m <= 6; m++) WEDGES[h].push(WEDGES[h][m - 1] | 1 << (h + m - 1) % 10); }
// a wedge left free with a tile on either side of it is 36 degrees that no tile corner fills
function gap(mask) {
  const free = ~mask & 1023;
  return (free & ~(((free << 1) | (free >> 9)) & 1023) & ~((free >> 1) | ((free & 1) << 9))) !== 0;
}
// a tile: its first corner and the heading of its first edge. Edge i leaves corner i, with the tile on its left
function make(kind, v0, h0) {
  const K = KINDS[kind], n = K.ang.length, t = { kind, h0, vs: [], hs: [], vk: [], ek: [], wm: [], pts: [], born: 0, shapeEl: null, linesEl: null };
  let v = v0, cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    const h = mod10(h0 + K.turn[i]), p = pos(v);
    t.vs.push(v); t.hs.push(h); t.vk.push(vkey(v)); t.ek.push(ekey(v, h)); t.wm.push(WEDGES[h][K.ang[i]]); t.pts.push(p);
    cx += p[0]; cy += p[1]; v = step(v, h);
  }
  t.c = [cx / n, cy / n];
  t.r = Math.max(...t.pts.map(p => dist(p, t.c)));
  t.inner = t.pts.map(p => [p[0] + (t.c[0] - p[0]) * .02, p[1] + (t.c[1] - p[1]) * .02]);
  return t;
}
const same = t => t.kind + t.vk.slice().sort().join();     // a name two tiles share when they are the same tile in the same place

// ---------------------------------------------------------------- geometry
function inside(poly, p) {
  let ins = false; const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[j];
    if ((y1 > p[1]) !== (y2 > p[1]) && x1 + (p[1] - y1) * (x2 - x1) / (y2 - y1) > p[0]) ins = !ins;
  }
  return ins;
}
function crosses(p1, p2, p3, p4) {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4), eps = 1e-6;
  return ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps));
}
function within(p, a, b) {                // p lies on the edge from a to b, away from its ends
  const abx = b[0] - a[0], aby = b[1] - a[1], t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (abx * abx + aby * aby);
  return t > .02 && t < .98 && Math.hypot(a[0] + abx * t - p[0], a[1] + aby * t - p[1]) < .5;
}
// two tiles clash if they overlap, or if a corner of one lies part way along an edge of the other
function clash(a, b) {
  if (dist(a.c, b.c) > a.r + b.r + 1) return false;
  const A = a.pts, B = b.pts, na = A.length, nb = B.length;
  for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) if (crosses(A[i], A[(i + 1) % na], B[j], B[(j + 1) % nb])) return true;
  for (const p of a.inner) if (inside(B, p)) return true;
  for (const p of b.inner) if (inside(A, p)) return true;
  for (const p of A) for (let j = 0; j < nb; j++) if (within(p, B[j], B[(j + 1) % nb])) return true;
  for (const p of B) for (let i = 0; i < na; i++) if (within(p, A[i], A[(i + 1) % na])) return true;
  return false;
}

// ---------------------------------------------------------------- the wall
const MID = make("decagon", [0, 0, 0, 0], 0).c, MID_CORNER = [0, 1, 0, 1];   // the middle of the drawing, which is also a corner of the lattice
const tiles = new Set();
const edges = new Map();        // an edge's name to the one or two tiles on it
const open = new Map();         // the edges with one tile: { key, t, i, mid, d }, d being how far the edge is from the middle
const corners = new Map();      // a corner's name to the wedges taken round it
const grid = new Map();         // tiles by where their middles fall, for finding a tile's neighbours
const CELL = 3.3 * E;           // wider than two tiles' middles can be apart and touch
const FAR = 3.2 * E;            // farther than any tile seated on an edge reaches from the middle of that edge
const cellOf = (x, y) => (Math.floor(x / CELL) + 512) * 1024 + Math.floor(y / CELL) + 512;
const out = t => dist(t.c, MID);                 // how far a tile is from the middle
const outward = (a, b) => out(a) - out(b);       // an order for tiles, from the middle to the rim
function edgeOut(t, i) { const a = t.pts[i], b = t.pts[(i + 1) % t.pts.length]; return dist([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], MID); }
function openEdge(t, i) {
  const a = t.pts[i], b = t.pts[(i + 1) % t.pts.length], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return { key: t.ek[i], t, i, mid, d: dist(mid, MID) };
}
function place(t) {
  tiles.add(t);
  for (let i = 0; i < t.ek.length; i++) {
    const k = t.ek[i], on = edges.get(k);
    if (on) { on.push(t); open.delete(k); } else { edges.set(k, [t]); open.set(k, openEdge(t, i)); }
    corners.set(t.vk[i], (corners.get(t.vk[i]) || 0) | t.wm[i]);
  }
  const g = cellOf(t.c[0], t.c[1]);
  if (!grid.has(g)) grid.set(g, new Set());
  grid.get(g).add(t);
}
function unplace(t) {
  tiles.delete(t);
  for (let i = 0; i < t.ek.length; i++) {
    const k = t.ek[i], on = edges.get(k);
    if (on.length === 1) { edges.delete(k); open.delete(k); }
    else { const o = on[0] === t ? on[1] : on[0]; edges.set(k, [o]); open.set(k, openEdge(o, o.ek.indexOf(k))); }
    const m = corners.get(t.vk[i]) & ~t.wm[i];
    if (m) corners.set(t.vk[i], m); else corners.delete(t.vk[i]);
  }
  grid.get(cellOf(t.c[0], t.c[1])).delete(t);
}
function clear() { tiles.clear(); edges.clear(); open.clear(); corners.clear(); grid.clear(); }
// whether a tile can be laid: its corners take free wedges and leave no gap, and it clashes with no neighbour
function fits(t) {
  for (let i = 0; i < t.vk.length; i++) { const m = corners.get(t.vk[i]) || 0; if (m & t.wm[i] || gap(m | t.wm[i])) return false; }
  const x = Math.floor(t.c[0] / CELL), y = Math.floor(t.c[1] / CELL);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const g = grid.get((x + dx + 512) * 1024 + y + dy + 512);
    if (g) for (const o of g) if (clash(t, o)) return false;
  }
  return true;
}
// a tile of this kind seated on an open edge: its edge j laid back along it, so the tile lies on the far side
function seat(kind, j, o) {
  const K = KINDS[kind], h = o.t.hs[o.i], h0 = mod10(h + 5 - K.turn[j]);
  let v = step(o.t.vs[o.i], h);
  for (let i = j - 1; i >= 0; i--) v = step(v, mod10(h0 + K.turn[i] + 5));
  return make(kind, v, h0);
}
let plain = false;              // while set, only the three kinds with no corner of 108 degrees are laid
function options(o) {
  const ts = [];
  for (const [kind, j] of SEATS) { if (plain && KINDS[kind].odd) continue; const t = seat(kind, j, o); if (fits(t)) ts.push(t); }
  return ts;
}
// how many corners a tile would close, each a point left with no free wedge
function closes(t) {
  let n = 0;
  for (let i = 0; i < t.vk.length; i++) if (((corners.get(t.vk[i]) || 0) | t.wm[i]) === 1023) n++;
  return n;
}
// the tiles that fit on an edge, in the order to try them. Each kind draws a place in the order, and a kind that is
// scarce among the tiles already near the edge, against its share of a varied wall, tends to come sooner. Within a
// kind, the seating that closes the most corners comes first
function ranked(o, ts) {
  const near = {}, turn = {};
  let n = 0;
  for (const t of tiles) if (dist(t.c, o.mid) < NEAR) { near[t.kind] = (near[t.kind] || 0) + 1; n++; }
  for (const kind in KINDS) turn[kind] = Math.pow(rnd(), ((near[kind] || 0) / Math.max(n, 1) + .05) / SHARE[kind]);
  return ts.map(t => ({ t, score: turn[t.kind] + closes(t) * CLOSE })).sort((a, b) => b.score - a.score).map(s => s.t);
}
// the tiles no longer joined to the middle of the wall through shared edges
function adrift() {
  let root = null;
  for (const t of tiles) if (!root || out(t) < out(root)) root = t;
  if (!root) return [];
  const reached = new Set([root]), queue = [root];
  while (queue.length) for (const k of queue.pop().ek) for (const o of edges.get(k)) if (!reached.has(o)) { reached.add(o); queue.push(o); }
  return [...tiles].filter(t => !reached.has(t));
}

// ---------------------------------------------------------------- laying tiles
// the edge of `rim` to lay on next, as the tiles that fit on it in the order to try them: an edge on which only one
// tile fits, if there is one, else the edge nearest the middle. Null if nothing fits on some edge, and an empty list if
// the rim is empty. `known` keeps what fits on each edge from one call to the next
function choose(rim, known) {
  let forced = null, nearest = null;
  for (const k of rim) {
    const o = open.get(k);
    let ts = known.get(k);
    if (!ts) known.set(k, ts = options(o));
    if (!ts.length) return null;
    if (ts.length === 1) { if (!forced || o.d < forced.d) forced = o; } else if (!nearest || o.d < nearest.d) nearest = o;
  }
  const at = forced || nearest;
  return at ? ranked(at, known.get(at.key)) : [];
}
// a tile and its turns about the middle: with `fold` at five, the tile and its four copies a fifth of a turn apart.
// The opening wall is always laid fivefold; the small patch keeps that symmetry through every move
const FOLD = o.fold || 1;
const FOLDS = o.folds || [FOLD];   // the symmetry of each move is drawn from these: on the small patch, mostly none, sometimes two or five turns
const pick = a => a[Math.floor(rnd() * a.length)];
let fold = FOLD;
function turns(t) {
  const ts = [t];
  for (let n = 1; n < fold; n++) {
    let v = t.vs[0].map((c, i) => c - MID_CORNER[i]);
    for (let k = 0; k < n * 10 / fold; k++) v = [-v[3], v[0] + v[3], v[1] - v[3], v[2] + v[3]];      // a turn of 36 degrees
    ts.push(make(t.kind, v.map((c, i) => c + MID_CORNER[i]), mod10(t.h0 + n * 10 / fold)));
  }
  return ts;
}
// lay tiles until every edge in `rim` is shared. When an edge is left that nothing fits, the last tile laid is taken
// up and the next tried in its place. An open edge of a tile laid joins the rim if `keep` says so. `tries` is the most
// tiles tried, and `accept` may turn a finished laying down. Gives the tiles laid, or null with the wall as it was.
// It hands back after every tile, so a long search can be spread over many frames. While `fold` is more than one,
// a tile is laid together with its turns about the middle, or not at all, so the wall keeps that symmetry
function* search(rim, keep, tries, accept) {
  const path = [];                // the steps so far, each the tiles laid in it and the tiles still to try in their place
  const known = new Map();        // what fits on each edge of the rim, forgotten for the edges near a tile laid or taken up
  const forget = t => { for (const k of rim) if (dist(open.get(k).mid, t.c) < FAR + t.r) known.delete(k); };
  const undo = s => {
    for (const k of s.added) { rim.delete(k); known.delete(k); }
    for (const t of s.ts.slice().reverse()) unplace(t);
    for (const k of s.closed) if (open.has(k)) rim.add(k);
    for (const t of s.ts) forget(t);
  };
  let todo = choose(rim, known);
  for (;;) {
    if (!rim.size) { const laid = path.flatMap(s => s.ts); if (accept(laid)) return laid; todo = null; }
    if (todo && todo.length && tries > 0) {
      const s = { ts: [], rest: todo, added: [], closed: [] };
      let whole = true;
      tries--;
      for (const t of turns(todo.shift())) {
        if (s.ts.length && !fits(t)) { whole = false; break; }
        place(t); s.ts.push(t);
        for (const k of t.ek) { if (rim.delete(k)) { s.closed.push(k); known.delete(k); } else { const o = open.get(k); if (o && keep(o)) { rim.add(k); s.added.push(k); } } }
      }
      if (!whole) { undo(s); continue; }
      for (const t of s.ts) forget(t);
      path.push(s);
      todo = choose(rim, known);
      yield;
    } else {
      if (tries <= 0) { while (path.length) undo(path.pop()); return null; }
      const s = path.pop();
      if (!s) return null;
      undo(s); todo = s.rest;
    }
  }
}
const finish = job => { for (;;) { const r = job.next(); if (r.done) return r.value; } };   // run a search to its end at once
// lay tiles on every open edge nearer the middle than `limit`, and on the open edges within it of the tiles laid
function* extend(limit, tries) {
  const rim = new Set();
  for (const o of open.values()) if (o.d < limit) rim.add(o.key);
  return yield* search(rim, o => o.d < limit, tries, () => true);
}
// a new wall out to `limit`, from one tile at the middle. A search that goes back too often is given up and begun
// again from another tile. If seven walls in a row are given up, an eighth is laid with the three plain kinds alone,
// which do not jam. Gives its tiles
function* compose(limit) {
  for (let go = 0; go < 8; go++) {
    clear(); plain = go === 7;
    const kinds = Object.keys(KINDS).filter(k => !plain || !KINDS[k].odd);
    if (fold > 1) place(make("decagon", [0, 0, 0, 0], 0));   // a wall with turns is laid round a decagon at the middle, which is its own turn
    else place(make(kinds[Math.floor(rnd() * kinds.length)], MID_CORNER, Math.floor(rnd() * 10)));
    const laid = yield* extend(limit, 700);
    plain = false;
    if (laid) break;
  }
  return [...tiles];
}
// the wall the page opens on: a decagon at the middle, and round it a wall laid with fivefold symmetry out to `limit`.
// It is laid from a fixed seed of chance, so it is the same wall every time. Gives its tiles
function mandala(limit) {
  const chance = rnd;
  let laid = null;
  rnd = seeded(MANDALA);
  for (let go = 0; go < 12 && !laid; go++) {
    clear(); fold = 5;
    place(make("decagon", [0, 0, 0, 0], 0));
    laid = finish(extend(limit, 400));
  }
  fold = FOLD; rnd = chance;
  return [...tiles];
}
// set the rim farther out, from `from` to `to`, and lay tiles on the ground gained. If that cannot be done from the
// rim as it stands, the outermost tiles are taken up and the ground is laid again from farther in. Gives the tiles
// taken up and the tiles laid, or null with the wall as it was
function* widen(from, to) {
  for (let go = 0; go < 3; go++) { const laid = yield* extend(to, 300); if (laid) return { gone: [], laid }; }
  const gone = peel(from - 1.5 * E);
  for (let go = 0; go < 3; go++) { const laid = yield* extend(to, 500); if (laid) return { gone, laid }; }
  for (const t of gone) place(t);
  return null;
}
// flip a patch: take out the tiles whose middles lie within r of p, none of them on the rim, and fill the outline
// they leave with tiles that are not all the ones taken out. Gives the tiles taken out and the tiles laid, or null,
// with the wall as it was, if the patch touches the rim or no other filling was found
function flipAt(p, r, tries) {
  // with turns, the patch is taken out at p and at its turns about the middle, and the tile at the middle is left
  const gone = [], ps = [p], dx = p[0] - MID[0], dy = p[1] - MID[1];
  for (let n = 1; n < fold; n++) { const a = n * 2 * Math.PI / fold; ps.push([MID[0] + dx * Math.cos(a) - dy * Math.sin(a), MID[1] + dx * Math.sin(a) + dy * Math.cos(a)]); }
  for (const t of tiles) if (ps.some(q => dist(t.c, q) < r)) {
    if (fold > 1 && dist(t.c, MID) < E) continue;
    if (t.ek.some(k => open.has(k))) return null;
    gone.push(t);
  }
  if (!gone.length) return null;
  for (const t of gone) unplace(t);
  const old = new Set(gone.map(same)), rim = new Set();
  for (const t of gone) for (const k of t.ek) if (open.has(k)) rim.add(k);
  const laid = finish(search(rim, () => true, tries, got => got.some(t => !old.has(same(t)))));
  if (!laid) { for (const t of gone) place(t); return null; }
  return { gone, laid };
}
// draw the rim in to `limit`: take up the tiles with no edge nearer the middle than that, and any tiles this cuts
// loose from the wall. Gives the tiles taken up
function peel(limit) {
  const gone = [];
  for (const t of tiles) if (t.pts.every((p, i) => edgeOut(t, i) >= limit)) gone.push(t);
  for (const t of gone) unplace(t);
  const loose = adrift();
  for (const t of loose) unplace(t);
  return gone.concat(loose);
}

// ---------------------------------------------------------------- the drawing
const NS = "http://www.w3.org/2000/svg";
const el = (name, at) => { const e = document.createElementNS(NS, name); for (const k in at) e.setAttribute(k, at[k]); return e; };
const fig = sv.closest("figure"), still = matchMedia("(prefers-reduced-motion: reduce)").matches;
// the lines of a tile, as on the girih page: two rays from the middle of every edge at 54 degrees to it, each stopped
// where it first meets another ray that has not stopped
function lines(poly) {
  const R = [], n = poly.length, ev = [];
  for (let i = 0; i < n; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % n], m = [(x1 + x2) / 2, (y1 + y2) / 2], ex = x2 - x1, ey = y2 - y1;
    for (const sign of [1, -1]) {
      const a = 54 * Math.PI / 180 * sign, L = Math.hypot(ex, ey);
      let dx = (ex * Math.cos(a) - ey * Math.sin(a)) / L, dy = (ex * Math.sin(a) + ey * Math.cos(a)) / L;
      if (!inside(poly, [m[0] + dx * .01, m[1] + dy * .01])) { dx = -dx; dy = -dy; }
      R.push({ o: m, d: [dx, dy], stop: null });
    }
  }
  for (let a = 0; a < R.length; a++) for (let b = a + 1; b < R.length; b++) {
    const p = R[a], q = R[b], den = p.d[0] * q.d[1] - p.d[1] * q.d[0], vx = q.o[0] - p.o[0], vy = q.o[1] - p.o[1];
    if (Math.abs(den) < 1e-9) {
      // two rays that run into each other along one line join where they meet
      const gapLen = Math.hypot(vx, vy);
      if (gapLen > 1e-6 && Math.abs(vx * p.d[1] - vy * p.d[0]) < 1e-4 && vx * p.d[0] + vy * p.d[1] > 0 && vx * q.d[0] + vy * q.d[1] < 0) ev.push([gapLen, a, gapLen, b, gapLen]);
      continue;
    }
    const t = (vx * q.d[1] - vy * q.d[0]) / den, u = (vx * p.d[1] - vy * p.d[0]) / den;
    if (t > 1e-6 && u > 1e-6 && inside(poly, [p.o[0] + p.d[0] * t, p.o[1] + p.d[1] * t])) ev.push([Math.max(t, u), a, t, b, u]);
  }
  ev.sort((p, q) => p[0] - q[0]);
  for (const [, a, t, b, u] of ev) if ((R[a].stop === null || t <= R[a].stop + 1e-6) && (R[b].stop === null || u <= R[b].stop + 1e-6)) { R[a].stop = t; R[b].stop = u; }
  return R.map(r => { const t = r.stop === null ? E * .5 : r.stop; return `M${r.o[0].toFixed(2)} ${r.o[1].toFixed(2)}L${(r.o[0] + r.d[0] * t).toFixed(2)} ${(r.o[1] + r.d[1] * t).toFixed(2)}`; }).join("");
}
// each kind of tile is drawn once, its shape and its lines, and used wherever a tile of that kind is laid. The drawing
// is in three layers: the shapes of the tiles, the ghosts of lines taken out, and over them the lines of the tiles in the wall
sv.setAttribute("viewBox", `${MID[0] - HALF} ${MID[1] - HALF} ${2 * HALF} ${2 * HALF}`);
const defs = sv.appendChild(el("defs")), shapeLayer = sv.appendChild(el("g", { class: "wall-shapes" })),
  ghostLayer = sv.appendChild(el("g", { class: "wall-ghosts" })), lineLayer = sv.appendChild(el("g", { class: "wall-lines" }));
for (const kind in KINDS) {
  const poly = make(kind, [0, 0, 0, 0], 0).pts;
  defs.appendChild(el("polygon", { id: "wall-tile-" + kind, class: "wall-tile", points: poly.map(p => p[0].toFixed(2) + "," + p[1].toFixed(2)).join(" ") }));
  defs.appendChild(el("path", { id: "wall-line-" + kind, class: "wall-line", d: lines(poly) }));
}
// a tile arrives by fading in, after a wait, its lines red and bold, thinning quickly and darkening slowly to ink. A tile
// of the opening wall arrives `aged`, its lines in ink, and is not counted in as it comes
function show(t, now, wait, aged) {
  const p = t.pts[0], transform = `translate(${p[0].toFixed(2)} ${p[1].toFixed(2)}) rotate(${36 * t.h0})`;
  t.born = now + wait;
  // each use sits in its own group, which carries the tile's place, so that the use itself can be scaled about its middle
  t.shapeEl = shapeLayer.appendChild(el("g", { transform })).appendChild(el("use", { href: "#wall-tile-" + t.kind }));
  t.linesEl = lineLayer.appendChild(el("g", { transform })).appendChild(el("use", { href: "#wall-line-" + t.kind }));
  if (!aged) tick(t.kind, 1, wait);
  if (still) return;
  for (const e of [t.shapeEl, t.linesEl]) {
    e.animate({ opacity: [0, 1] }, { duration: aged ? 500 : 250, delay: wait, easing: "ease-out", fill: "backwards" });
    if (PLOP && !aged) e.animate({ transform: ["scale(.3)", "scale(1.1)", "scale(1)"], offset: [0, .6, 1] }, { duration: 420, delay: wait, easing: "ease-out", fill: "backwards" });
  }
  if (aged) return;
  t.linesEl.animate({ color: [FRESH, AGED] }, { duration: AGEING, delay: wait, easing: PLOP ? "ease-in" : "steps(36)", fill: "both" });
  t.linesEl.animate({ strokeWidth: [`${BOLD}px`, `${WIDTH}px`] }, { duration: SWELL, delay: wait, easing: "cubic-bezier(.1, .7, .3, 1)", fill: "both" });
}
// tiles arriving one after another, a gap apart. Gives how long from now the last takes to arrive
function showAll(ts, now, wait, gap) { ts.forEach((t, n) => show(t, now, wait + n * gap)); return wait + ts.length * gap + 500; }
// a tile taken out fades from the wall, after a wait. Its lines swell bold for a moment, then thin and pale to a ghost
// that stays where it was, under the lines of whatever is laid there next. Gives the ghost, for `lift` to fade in its turn
// the colour a tile's lines have now is read for every tile before any is moved, so that a long unravel does not
// force the style to be worked out again tile by tile
function ghost(t, wait, from = getComputedStyle(t.linesEl).color) {
  const shape = t.shapeEl, lines = t.linesEl;
  tick(t.kind, -1, wait);
  if (PLOP) {   // no ghost: the tile swells for a beat and pops out, shape and lines together
    for (const e of [shape, lines]) e.animate({ transform: ["scale(1)", "scale(1.08)", "scale(0)"], offset: [0, .3, 1] }, { duration: 380, delay: wait, easing: "ease-in", fill: "forwards" }).onfinish = () => e.parentNode && e.parentNode.remove();
    lines.animate({ strokeWidth: [`${WIDTH}px`, `${BOLD}px`], color: [from, AGED] }, { duration: 380, delay: wait, fill: "forwards" });
    return lines;
  }
  shape.animate({ opacity: [1, 0] }, { duration: FADE, delay: wait, easing: "ease-in", fill: "forwards" }).onfinish = () => shape.parentNode.remove();
  ghostLayer.appendChild(lines.parentNode);
  t.linesEl.animate({ color: [from, AGED, GHOST], offset: [0, .15, 1] }, { duration: DECAY, delay: wait, easing: "ease-out", fill: "forwards" });
  t.linesEl.animate({ strokeWidth: [`${WIDTH}px`, `${BOLD}px`, `${WIDTH}px`], offset: [0, .1, 1] }, { duration: DECAY, delay: wait, easing: "ease-out", fill: "forwards" });
  return t.linesEl;
}
function lift(g, wait) { g.animate({ opacity: [1, 0] }, { duration: 2000, delay: wait, easing: "ease-in", fill: "forwards" }).onfinish = () => g.parentNode && g.parentNode.remove(); }

// ---------------------------------------------------------------- the count
// at the right of the wall, the five tiles, each drawn with its lines at one scale, and beside each the number of it in
// the wall. When a tile arrives or goes, its kind's number steps up or down, and the tile's drawing and the number
// take for a moment the colour of lines just laid or of a ghost
const count = o.count || null, tally = {};
const LEVEL = { decagon: 0, pentagon: 180, hexagon: -36, bowtie: 90, rhombus: -36 };   // the turn, in degrees, that sets each tile level in the count
if (count) for (const kind in KINDS) {
  const a = LEVEL[kind] * Math.PI / 180, pts = make(kind, [0, 0, 0, 0], 0).pts.map(p => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)]);
  const row = count.appendChild(document.createElement("div")), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x = Math.min(...xs) - 3, y = Math.min(...ys) - 3, w = Math.max(...xs) - x + 3, h = Math.max(...ys) - y + 3;
  const g = row.appendChild(el("svg", { viewBox: `${x} ${y} ${w} ${h}`, width: (w * .42).toFixed(1), height: (h * .42).toFixed(1) }));
  g.appendChild(el("polygon", { points: pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ") }));
  g.appendChild(el("path", { d: lines(pts) }));
  tally[kind] = { n: 0, row, number: row.appendChild(document.createElement("span")) };
  tally[kind].number.textContent = "0";
}
// one tile of a kind arrives (by = 1) or goes (by = -1), after a wait. `epoch` moves on when the opening wall is laid
// again, and a tile counted before that is let go
let epoch = 0;
function tick(kind, by, wait) {
  const from = epoch;
  if (count) setTimeout(() => {
    if (from !== epoch) return;
    const r = tally[kind];
    r.number.textContent = r.n += by;
    if (still) return;
    r.row.animate({ color: [by > 0 ? FRESH : FALLING, AGED] }, { duration: 700, easing: "ease-in" });
    r.number.animate({ transform: [`translateY(${2 * by}px)`, "none"] }, { duration: 180, easing: "ease-out" });
  }, wait);
}

// ---------------------------------------------------------------- the play
// one move at a time. A move that has to be searched for is `job`, run a few milliseconds a frame, and `then` shows
// what it found; `free` is when the move being shown is over and the next may start
let reach = 0, left = 0, job = null, then = null, free = 0;
// unravel and ravel: the wall fades from the rim inwards to its ghost, and a new wall, searched for meanwhile, grows
// from the middle over it. The first wall of all is ravelled the same way, from nothing
function unravel(now) {
  const gone = [...tiles].sort((a, b) => outward(b, a)), froms = gone.map(t => getComputedStyle(t.linesEl).color);
  const ghosts = gone.map((t, n) => ghost(t, n * GAP.unravel, froms[n]));
  const over = now + gone.length * GAP.unravel + FADE;
  reach = between(START);
  job = compose(reach);
  then = (laid, now) => {
    const wait = Math.max(0, over - now) + 300, end = showAll(laid.sort(outward), now, wait, GAP.ravel);
    for (const g of ghosts) lift(g, end + 800);
    left = Math.round(between(MOVES));
    free = now + end + HOLD;
  };
}
// grow: the rim is set farther out, and the tiles that fill the ground gained arrive in a sweep round the wall. Where
// the old rim had to be taken up to do it, those tiles go first
function grow(now) {
  const to = Math.min(REACH[1], reach + between(PACE)), from = rnd() * 2 * Math.PI;
  const round = t => Math.floor(mod2pi(Math.atan2(t.c[1] - MID[1], t.c[0] - MID[0]) - from) / (Math.PI / 12));
  const sweep = (a, b) => round(a) - round(b) || outward(a, b);
  job = widen(reach, to);
  then = (got, now) => {
    if (!got) return;           // the ground could not be laid: the wall is as it was, and another move is taken
    reach = to;
    const gone = got.gone.sort(sweep), froms = gone.map(t => getComputedStyle(t.linesEl).color);
    gone.forEach((t, n) => lift(ghost(t, n * GAP.shrink, froms[n]), n * GAP.shrink + GHOST_FOR));
    const wait = got.gone.length ? got.gone.length * GAP.shrink + FADE : 0;
    free = now + showAll(got.laid.sort(sweep), now, wait, GAP.grow) + PAUSE;
  };
}
// shrink: the rim is set farther in, and the tiles beyond it go, the outermost first
function shrink(now) {
  reach = Math.max(REACH[0], reach - between(PACE));
  const gone = peel(reach).sort((a, b) => outward(b, a)), froms = gone.map(t => getComputedStyle(t.linesEl).color);
  gone.forEach((t, n) => lift(ghost(t, n * GAP.shrink, froms[n]), n * GAP.shrink + GHOST_FOR));
  free = now + gone.length * GAP.shrink + FADE + PAUSE;
}
// flip: a patch inside the wall, more often where the tiles have lain longest, is taken out and filled another way
function flip(now) {
  const inner = [...tiles].filter(t => out(t) < reach - 1.5 * E).sort((a, b) => a.born - b.born);
  for (let tries = 0; tries < 8 && inner.length; tries++) {
    const at = inner[Math.floor(rnd() * rnd() * inner.length)];
    const got = flipAt([at.c[0] + (rnd() - .5) * E, at.c[1] + (rnd() - .5) * E], between(PATCH), 600);
    if (!got) continue;
    const froms = got.gone.map(t => getComputedStyle(t.linesEl).color);
    got.gone.forEach((t, n) => lift(ghost(t, 0, froms[n]), GHOST_FOR));
    free = now + showAll(got.laid, now, FADE + 150, GAP.flip) + PAUSE;
    return;
  }
}
// nest: the tile at the middle is kept and everything round it taken up, and the wall is laid again round it in two
// or three layers with the same symmetry, each layer a grow. With no tile at the middle the wall is ravelled instead
let nesting = 0, nestFold = 1;
function nest(now) {
  nestFold = pick([2, 5, 5, 10]); nesting = 2 + Math.floor(rnd() * 2); fold = nestFold;
  if (![...tiles].some(t => t.kind === "decagon" && dist(t.c, MID) < .1 * E)) return unravel(now);
  const gone = [...tiles].filter(t => dist(t.c, MID) > E).sort((a, b) => outward(b, a)), froms = gone.map(t => getComputedStyle(t.linesEl).color);
  for (const t of gone) unplace(t);
  gone.forEach((t, n) => lift(ghost(t, n * GAP.shrink, froms[n]), n * GAP.shrink + GHOST_FOR));
  reach = REACH[0];
  free = now + gone.length * GAP.shrink + FADE + PAUSE / 2;
}
function next(now) {
  changed = true;
  fold = pick(FOLDS);
  if (nesting > 0) { nesting--; fold = nestFold; return grow(now); }
  if (gentle-- > 0) return flip(now);        // the play opens on the still wall with two flips, before any larger move
  if (left-- <= 0) return unravel(now);
  const moves = [flip, flip, flip, flip];
  if (reach + PACE[0] <= REACH[1]) moves.push(grow, grow);
  if (reach - PACE[0] >= REACH[0]) moves.push(shrink, shrink);
  if (FOLDS.length > 1) moves.push(nest);
  moves[Math.floor(rnd() * moves.length)](now);
}
// the wall the page opens on: a fivefold wall, still, with the count put away. It is laid at the start, and laid again,
// over whatever the moves have made, when the reader comes back to the page's first passage
let opening = null, changed = false, gentle = 0;
function rest(now) {
  epoch++; job = null; changed = false;
  for (const layer of [shapeLayer, ghostLayer, lineLayer]) for (const e of [...layer.children]) {
    if (still) e.remove(); else e.animate({ opacity: 0 }, { duration: 400, fill: "forwards" }).onfinish = () => e.remove();
  }
  if (!opening) opening = mandala(OPENING).map(t => [t.kind, t.vs[0], t.h0]);
  clear(); reach = OPENING;
  for (const [kind, v0, h0] of opening) { const t = make(kind, v0, h0); place(t); show(t, now - 1e6, 0, true); }
  for (const kind in tally) { const r = tally[kind]; r.number.textContent = r.n = opening.filter(o => o[0] === kind).length; }
}
rest(0);
// with motion turned down, the opening wall is left as it is
if (still) return;

// ---------------------------------------------------------------- the clock
// the play begins when the reader leaves the page's first passage, and the count comes into view with it. Back on the
// first passage, the opening wall is laid again and the count is put away
const landing = o.landing ? document.querySelector(".story section") : null;
const captions = fig ? fig.querySelectorAll(".wall-caption span") : [];   // the still wall's caption, then the played wall's
let playing = false;
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden || (fig && !fig.classList.contains("on"))) return;
  const play = !landing || !landing.classList.contains("on");
  if (play !== playing) {
    playing = play;
    if (count) count.classList.toggle("on", playing);
    captions.forEach((c, i) => c.classList.toggle("on", (i === 1) === playing));
    if (playing) { left = Math.round(between(MOVES)); gentle = 2; free = now + PAUSE; } else if (changed) rest(now);
  }
  if (!playing) return;
  if (job) {
    for (const t0 = performance.now(); job && performance.now() - t0 < 5;) { const r = job.next(); if (r.done) { job = null; then(r.value, now); } }
    return;
  }
  if (now >= free) next(now);
}
requestAnimationFrame(frame);
}

const wall = document.getElementById("wall");
if (wall) girih(wall, { count: document.getElementById("wall-count"), landing: true });
for (const sv of document.querySelectorAll("svg.girih-patch"))
  girih(sv, { half: 5.6, reach: [1.6, 3.4], start: [2, 2.8], pace: [.7, 1.2], patch: [1, 1.6], moves: [4, 7], opening: 2.4, mandala: 3, fold: 5, folds: [1, 1, 2, 5], plop: true, ageing: 1400, swell: 900 });   // a decagon on the rim reaches 1.6 edges past it, inside the box
})();
