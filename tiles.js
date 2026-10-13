const E = 42;                                   // the edge, in page units
const MAX_TILES = 400;                          // the most the plate will hold; every way of adding tiles stops here
const atCap = () => placed.length >= MAX_TILES;
const PHI = (1 + Math.sqrt(5)) / 2;
const rad = d => d * Math.PI / 180;

// ---------------------------------------------------------------- the two tiling systems
// a system: its tiles as interior angles in order, their names, the smallest corner any
// tile has (room below it at a corner can never be filled), how a tile is decorated, and
// for Penrose the marks on the edges that have to agree across a join
const GIRIH = {
  name: "girih", title: "Girih tiles", minCorner: 72, seed: "decagon", linesLabel: "Lines",
  tiles: {
    decagon: [144, 144, 144, 144, 144, 144, 144, 144, 144, 144],
    pentagon: [108, 108, 108, 108, 108],
    hexagon: [72, 144, 144, 72, 144, 144],
    bowtie: [72, 72, 216, 72, 72, 216],
    rhombus: [72, 108, 72, 108],
  },
  names: { decagon: "tabl", pentagon: "pange", hexagon: "shesh band", bowtie: "sormeh dan", rhombus: "torange" },
  labels: { decagon: "decagon", pentagon: "pentagon", hexagon: "hexagon", bowtie: "bow tie", rhombus: "rhombus" },
  offer: ["pentagon", "rhombus", "bowtie", "hexagon", "decagon"],
  marks: null, mirrors: false,
  decorate: (poly, kind) => strapwork(poly),
};
const PENROSE = {
  name: "penrose", title: "Penrose tiles", minCorner: 36, seed: "thick", linesLabel: "Marks",
  // vertices 0 and 2 are the apexes of the two half-rhomb triangles each tile is made of
  tiles: { thick: [72, 108, 72, 108], thin: [144, 36, 144, 36] },
  names: { thick: "72° and 108°", thin: "36° and 144°" },
  labels: { thick: "thick", thin: "thin" },
  offer: ["thin", "thick"],
  // each edge, from vertex i to i + 1: its mark (b one arrow, c two) and which way the
  // arrow runs along the edge, read off a tiling built by subdivision. The two half-rhomb
  // triangles (apex, B, C) share their base B C, so round the rhomb the edges run apex
  // to B, B to apex, apex to C, C to apex
  marks: {
    thick: [{ role: "b", fwd: true }, { role: "b", fwd: false }, { role: "c", fwd: true }, { role: "c", fwd: false }],
    thin: [{ role: "b", fwd: false }, { role: "b", fwd: true }, { role: "c", fwd: true }, { role: "c", fwd: false }],
  },
  mirrors: true,
  decorate: (poly, kind) => arrowMarks(poly, PENROSE.marks[kind]),
};
const SYSTEMS = { girih: GIRIH, penrose: PENROSE };
let SYSTEM = SYSTEMS[document.body.dataset.system] || GIRIH, TILES = SYSTEM.tiles;   // each page is one system
const angleAt = (kindName, i) => { const a = TILES[kindName]; return a[(i + a.length - 1) % a.length]; };

// ---------------------------------------------------------------- geometry
function polygon(angles) {
  const pts = []; let x = 0, y = 0, h = 0;
  for (const a of angles) { pts.push([x, y]); x += Math.cos(rad(h)) * E; y += Math.sin(rad(h)) * E; h += 180 - a; }
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(p => [p[0] - cx, p[1] - cy]);
}
function inside(poly, p) {
  let ins = false; const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[j];
    if ((y1 > p[1]) !== (y2 > p[1])) { const xi = x1 + (p[1] - y1) * (x2 - x1) / (y2 - y1); if (xi > p[0]) ins = !ins; }
  }
  return ins;
}
function rays(poly) {
  const out = []; const n = poly.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % n];
    const m = [(x1 + x2) / 2, (y1 + y2) / 2]; const ex = x2 - x1, ey = y2 - y1;
    for (const sign of [1, -1]) {
      const a = rad(54) * sign;
      let dx = ex * Math.cos(a) - ey * Math.sin(a), dy = ex * Math.sin(a) + ey * Math.cos(a);
      if (sign < 0) { dx = -dx; dy = -dy; }
      const L = Math.hypot(dx, dy); dx /= L; dy /= L;
      if (!inside(poly, [m[0] + dx * .01, m[1] + dy * .01])) { dx = -dx; dy = -dy; }
      out.push({ o: m, d: [dx, dy], i });
    }
  }
  return out;
}
function cross(o1, d1, o2, d2) {
  const den = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((o2[0] - o1[0]) * d2[1] - (o2[1] - o1[1]) * d2[0]) / den;
  const u = ((o2[0] - o1[0]) * d1[1] - (o2[1] - o1[1]) * d1[0]) / den;
  return [t, u];
}
// the girih lines: two rays from every edge midpoint at 54 degrees, each stopped at its
// first crossing with another ray that has not stopped; rays that run into each other
// along one line across a 72 degree corner join there
function strapwork(poly) {
  const R = rays(poly), stop = new Array(R.length).fill(null), ev = [];
  for (let a = 0; a < R.length; a++) for (let b = a + 1; b < R.length; b++) {
    const c = cross(R[a].o, R[a].d, R[b].o, R[b].d);
    if (c === null) {
      const vx = R[b].o[0] - R[a].o[0], vy = R[b].o[1] - R[a].o[1], dist = Math.hypot(vx, vy);
      if (dist > 1e-6 && Math.abs(vx * R[a].d[1] - vy * R[a].d[0]) < 1e-4 && vx * R[a].d[0] + vy * R[a].d[1] > 0 && vx * R[b].d[0] + vy * R[b].d[1] < 0)
        ev.push([dist, a, dist, b, dist]);
      continue;
    }
    const [t, u] = c;
    if (t > 1e-6 && u > 1e-6 && inside(poly, [R[a].o[0] + R[a].d[0] * t, R[a].o[1] + R[a].d[1] * t])) ev.push([Math.max(t, u), a, t, b, u]);
  }
  ev.sort((p, q) => p[0] - q[0]);
  for (const [, a, t, b, u] of ev) if ((stop[a] === null || t <= stop[a] + 1e-6) && (stop[b] === null || u <= stop[b] + 1e-6)) { stop[a] = t; stop[b] = u; }
  return R.map((r, k) => { const t = stop[k] === null ? E * .5 : stop[k]; return { seg: [r.o, [r.o[0] + r.d[0] * t, r.o[1] + r.d[1] * t]], mark: false }; });
}
// the Penrose marks: one or two chevrons at the midpoint of each edge, pointing the way
// the arrow runs
function arrowMarks(poly, marks) {
  const out = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], m = marks[i];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy); dx /= L; dy /= L;
    if (!m.fwd) { dx = -dx; dy = -dy; }
    const nx = -dy, ny = dx, w = 3.4, h = 3.8;
    const offs = m.role === "b" ? [0] : [-2.8, 2.8];
    for (const o of offs) {
      const tip = [(a[0] + b[0]) / 2 + dx * (o + h / 2), (a[1] + b[1]) / 2 + dy * (o + h / 2)];
      const back = [tip[0] - dx * h, tip[1] - dy * h];
      out.push({ seg: [tip, [back[0] + nx * w, back[1] + ny * w]], mark: true });
      out.push({ seg: [tip, [back[0] - nx * w, back[1] - ny * w]], mark: true });
    }
  }
  return out;
}
let SHAPES = {};
function buildShapes() {
  SHAPES = {};
  for (const k in TILES) {
    const poly = polygon(TILES[k]);
    const variants = [{ poly, straps: SYSTEM.decorate(poly, k), mirror: false }];
    if (SYSTEM.mirrors) { const mp = poly.map(p => [-p[0], p[1]]); variants.push({ poly: mp, straps: SYSTEM.decorate(mp, k), mirror: true }); }
    SHAPES[k] = { poly, straps: variants[0].straps, variants };
  }
}

// ---------------------------------------------------------------- the assembly
const placed = [];              // {kind, pts, straps, edges: [{a, b, mid}], j, g, mirror, marks}
let kind = SYSTEM.seed, lastAttach = null, hover = null, sym = 1;
function moveTile(t, dx, dy) { const f = p => [p[0] + dx, p[1] + dy]; return makeTile(t.kind, t.pts.map(f), t.straps.map(st => ({ seg: st.seg.map(f), mark: st.mark })), t.j, t.mirror); }
const sv = document.getElementById("sv");
const NS = "http://www.w3.org/2000/svg";
let rng = Math.random;
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const centre = t => [t.pts.reduce((a, q) => a + q[0], 0) / t.pts.length, t.pts.reduce((a, q) => a + q[1], 0) / t.pts.length];
function edgesOf(pts) { return pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return { a: p, b: q, mid: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] }; }); }
function makeTile(kindName, pts, straps, j, mirror) { return { kind: kindName, pts, straps, edges: edgesOf(pts), j, mirror: !!mirror, marks: SYSTEM.marks ? SYSTEM.marks[kindName] : null }; }
function transform(shape, rot, tx, ty) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const f = p => [p[0] * c - p[1] * s + tx, p[0] * s + p[1] * c + ty];
  return { pts: shape.poly.map(f), straps: shape.straps.map(st => ({ seg: st.seg.map(f), mark: st.mark })) };
}
// where symmetry turns: for girih the first tile's centre (a decagon or pentagon has the
// fivefold centre in its middle); for Penrose a fivefold centre is a corner, so the
// first rhomb's 72 or 36 degree corner, or the middle of a sun built by subdivision
let symOrigin = null;
function symCentre() {
  if (symOrigin) return symOrigin;
  if (!placed.length) return [0, 0];
  if (SYSTEM.name === "penrose") { const t = placed[0]; return t.kind === "thick" ? t.pts[1] : t.pts[0]; }
  return centre(placed[0]);
}
function rotated(tile, ang) {
  const [ox, oy] = symCentre();
  const c = Math.cos(ang), s = Math.sin(ang), f = p => [ox + (p[0] - ox) * c - (p[1] - oy) * s, oy + (p[0] - ox) * s + (p[1] - oy) * c];
  return makeTile(tile.kind, tile.pts.map(f), tile.straps.map(st => ({ seg: st.seg.map(f), mark: st.mark })), tile.j, tile.mirror);
}
function freeTile(kindName, p) {
  const sh = SHAPES[kindName], f = q => [q[0] + p.x, q[1] + p.y];
  return makeTile(kindName, sh.poly.map(f), sh.straps.map(st => ({ seg: st.seg.map(f), mark: st.mark })), 0, false);
}
function segsCross(p1, p2, p3, p4) {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  const eps = 1e-6;
  return ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps));
}
function overlaps(pts, other) {
  for (let i = 0; i < pts.length; i++) for (let j = 0; j < other.length; j++)
    if (segsCross(pts[i], pts[(i + 1) % pts.length], other[j], other[(j + 1) % other.length])) return true;
  const shrink = (poly, p) => { const cx = poly.reduce((s, q) => s + q[0], 0) / poly.length, cy = poly.reduce((s, q) => s + q[1], 0) / poly.length; return [p[0] + (cx - p[0]) * .02, p[1] + (cy - p[1]) * .02]; };
  for (const p of pts) if (inside(other, shrink(pts, p))) return true;
  for (const p of other) if (inside(pts, shrink(other, p))) return true;
  return false;
}
function bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[0] > x1) x1 = p[0]; if (p[1] > y1) y1 = p[1]; } return [x0, y0, x1, y1]; }
const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < .5;
function onSegmentInterior(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1], L2 = abx * abx + aby * aby;
  const t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / L2;
  if (t < .02 || t > .98) return false;
  const px = a[0] + abx * t, py = a[1] + aby * t;
  return Math.hypot(px - p[0], py - p[1]) < .5;
}
function marksAgree(t1, i, t2, j) {
  // the two edges lie on one segment: the same number of arrows, the same direction
  const m1 = t1.marks[i], m2 = t2.marks[j];
  if (m1.role !== m2.role) return false;
  const e1 = t1.edges[i], e2 = t2.edges[j];
  const d1 = m1.fwd ? [e1.b[0] - e1.a[0], e1.b[1] - e1.a[1]] : [e1.a[0] - e1.b[0], e1.a[1] - e1.b[1]];
  const d2 = m2.fwd ? [e2.b[0] - e2.a[0], e2.b[1] - e2.a[1]] : [e2.a[0] - e2.b[0], e2.a[1] - e2.b[1]];
  return d1[0] * d2[0] + d1[1] * d2[1] > 0;
}
function clear_(tile) {
  // no overlap, no corner in the middle of another tile's edge, and marks that agree
  // wherever an edge is shared
  const pts = tile.pts, b = bbox(pts);
  for (const t of placed) {
    const o = t.box || (t.box = bbox(t.pts));
    if (!(b[0] < o[2] + 1 && o[0] < b[2] + 1 && b[1] < o[3] + 1 && o[1] < b[3] + 1)) continue;
    if (overlaps(pts, t.pts)) return false;
    for (const p of pts) for (const e of t.edges) if (onSegmentInterior(p, e.a, e.b)) return false;
    for (const p of t.pts) for (const e of tile.edges) if (onSegmentInterior(p, e.a, e.b)) return false;
    if (tile.marks) for (let i = 0; i < tile.edges.length; i++) for (let j = 0; j < t.edges.length; j++)
      if (near(tile.edges[i].mid, t.edges[j].mid) && !marksAgree(tile, i, t, j)) return false;
  }
  return true;
}
function openEdges() {
  const all = []; placed.forEach((t, ti) => t.edges.forEach((e, ei) => all.push({ t: ti, e: ei, mid: e.mid })));
  const open = [];
  for (const x of all) {
    let shared = false;
    for (const y of all) if (y.t !== x.t && near(x.mid, y.mid)) { shared = true; break; }
    if (!shared) open.push(x);
  }
  return open;
}

// the corner rule: at every corner the tiles' angles add to 360; room below the smallest
// tile angle is a hole nothing can fill
const vkey = p => Math.round(p[0] / 1.5) + "," + Math.round(p[1] / 1.5);
let pv = 0, sumsMemo = { v: -1, value: null };
function cornerSums() {
  if (sumsMemo.v === pv) return sumsMemo.value;
  const sums = new Map(), at = new Map();
  for (const t of placed) for (let i = 0; i < t.pts.length; i++) { const key = vkey(t.pts[i]); sums.set(key, (sums.get(key) || 0) + angleAt(t.kind, i)); at.set(key, t.pts[i]); }
  sumsMemo = { v: pv, value: { sums, at } };
  return sumsMemo.value;
}
function holes() {
  const { sums, at } = cornerSums(); const out = [], lim = SYSTEM.minCorner - 1;
  for (const [key, sum] of sums) { const room = 360 - sum; if (room > 1 && room < lim) out.push(at.get(key)); }
  return out;
}
function cornersAfter(tile) {
  const { sums } = cornerSums(); let made = 0, closed = 0; const where = [], lim = SYSTEM.minCorner - 1;
  for (let i = 0; i < tile.pts.length; i++) {
    const key = vkey(tile.pts[i]), before = 360 - (sums.get(key) || 0), room = before - angleAt(tile.kind, i);
    if (room > 1 && room < lim && !(before > 1 && before < lim)) { made++; where.push(tile.pts[i]); }
    if (Math.abs(room) <= 1 && before > 1) closed++;
  }
  return { made, closed, where };
}

// seating a tile: its edge j laid on an open edge, reversed, so the tile sits on the far
// side; every variant (the mirror image too, where the system has marks) and every j
function seat(kindName, edge, j, variant = 0) {
  const shape = SHAPES[kindName].variants[variant], n = shape.poly.length;
  const a = shape.poly[j], b = shape.poly[(j + 1) % n];
  const angShape = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const angEdge = Math.atan2(edge.a[1] - edge.b[1], edge.a[0] - edge.b[0]);
  const rot = angEdge - angShape, c = Math.cos(rot), s = Math.sin(rot);
  const ax = a[0] * c - a[1] * s, ay = a[0] * s + a[1] * c;
  const tr = transform(shape, rot, edge.b[0] - ax, edge.b[1] - ay);
  return makeTile(kindName, tr.pts, tr.straps, j, shape.mirror);
}
function* seatings(kindName, edge) {
  const sh = SHAPES[kindName];
  for (let v = 0; v < sh.variants.length; v++) for (let j = 0; j < sh.poly.length; j++) yield seat(kindName, edge, j, v);
}
function anyFits(edge) {
  for (const k in TILES) for (const t of seatings(k, edge)) if (clear_(t) && cornersAfter(t).made === 0) return true;
  return false;
}
function fits(kindName, edge) {
  let any = null;
  for (const t of seatings(kindName, edge)) { if (!clear_(t)) continue; if (cornersAfter(t).made === 0) return t; if (!any) any = t; }
  return any;
}
function nearestSeating(kindName, edge, p) {
  // of the clear seatings, the one whose centroid lies nearest the pointer
  let best = null, bd = Infinity;
  for (const t of seatings(kindName, edge)) {
    if (!clear_(t)) continue;
    const c = centre(t), d = p ? Math.hypot(c[0] - p.x, c[1] - p.y) : t.j;
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}

// stranded edges: an open edge on which no tile can sit. Later tiles only add obstacles,
// so it stays stranded until a tile comes out
const ekey = e => Math.round(e.mid[0] * 2) + "," + Math.round(e.mid[1] * 2);
let strandCache = new Map();
function strandedEdges(nearPt) {
  const out = [];
  for (const o of openEdges()) {
    const e = placed[o.t].edges[o.e], key = ekey(e);
    if (!strandCache.has(key) || (nearPt && Math.hypot(e.mid[0] - nearPt[0], e.mid[1] - nearPt[1]) < E * 4.5)) strandCache.set(key, !anyFits(e));
    if (strandCache.get(key)) out.push(e);
  }
  return out;
}
// the open edges a tile would strand: those near it that admit a tile now and none once
// it is laid, and its own edges if nothing can sit on them. An edge stranded already is
// not laid at its door. What each edge admits is remembered until the plate changes,
// since grow asks about many tiles on one plate
let admitMemo = { v: -1, map: new Map() };
function admits(e) {
  if (admitMemo.v !== pv) admitMemo = { v: pv, map: new Map() };
  const key = ekey(e);
  if (!admitMemo.map.has(key)) admitMemo.map.set(key, anyFits(e));
  return admitMemo.map.get(key);
}
function strands(tile) {
  const c = centre(tile), reach = e => Math.hypot(e.mid[0] - c[0], e.mid[1] - c[1]) <= E * 4;
  const live = new Set();
  for (const o of openEdges()) { const e = placed[o.t].edges[o.e]; if (reach(e) && admits(e)) live.add(ekey(e)); }
  const v = pv, own = placed.length;
  placed.push(tile); tile.box = null; pv++;
  let n = 0;
  try {
    for (const o of openEdges()) {
      const e = placed[o.t].edges[o.e];
      if (!reach(e) || (o.t !== own && !live.has(ekey(e)))) continue;
      if (!anyFits(e)) n++;
    }
  } finally { placed.pop(); pv = v; sumsMemo.v = -1; }
  return n;
}

function symmetryOrder() { if (!sym || !placed.length) return 1; const k = placed[0].kind; return k === "decagon" || k === "pentagon" || SYSTEM.name === "penrose" ? 5 : 2; }
function copiesOf(tile) {
  const n = symmetryOrder(), out = [];
  for (let k = 1; k < n; k++) out.push(rotated(tile, 2 * Math.PI * k / n));
  return out;
}
let groupSeq = 0;
function placeAll(tile) {
  const g = ++groupSeq;
  tile.g = g; tile.box = null; placed.push(tile); pv++;
  for (const c of copiesOf(tile)) if (!atCap() && clear_(c)) { c.g = g; placed.push(c); pv++; }
}
// the tiles that go with this one: with symmetry on, its copies about the centre too
function withCopies(idx) {
  const t = placed[idx], n = symmetryOrder(), c = centre(t), gone = new Set([idx]), [ox, oy] = symCentre();
  if (n > 1) for (let k = 1; k < n; k++) {
    const a = 2 * Math.PI * k / n, rx = ox + (c[0] - ox) * Math.cos(a) - (c[1] - oy) * Math.sin(a), ry = oy + (c[0] - ox) * Math.sin(a) + (c[1] - oy) * Math.cos(a);
    placed.forEach((u, i) => { if (u.kind === t.kind) { const uc = centre(u); if (Math.hypot(uc[0] - rx, uc[1] - ry) < 1) gone.add(i); } });
  }
  return gone;
}
function removeTile(idx) {
  for (const i of [...withCopies(idx)].sort((a, b) => b - a)) placed.splice(i, 1);
  pv++;
}

// ---------------------------------------------------------------- drawing
let ghostEl = null, view = null, lastChange = null, doomed = -1;
function line(cls, a, b, parent) { const l = document.createElementNS(NS, "line"); l.setAttribute("class", cls); l.setAttribute("x1", a[0]); l.setAttribute("y1", a[1]); l.setAttribute("x2", b[0]); l.setAttribute("y2", b[1]); parent.appendChild(l); return l; }
function poly_(cls, pts, parent) { const pg = document.createElementNS(NS, "polygon"); pg.setAttribute("class", cls); pg.setAttribute("points", pts.map(q => q.join(",")).join(" ")); parent.appendChild(pg); return pg; }
function dot(cls, p, r, parent) { const c = document.createElementNS(NS, "circle"); c.setAttribute("class", cls); c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", r); parent.appendChild(c); return c; }
function label_(cls, p, s, parent) { const t = document.createElementNS(NS, "text"); t.setAttribute("class", cls); t.setAttribute("x", p[0]); t.setAttribute("y", p[1]); t.setAttribute("text-anchor", "middle"); t.textContent = s; parent.appendChild(t); return t; }
function render() {
  sv.innerHTML = "";
  const host = document.createElementNS(NS, "g"); host.setAttribute("id", "tiles");
  sv.appendChild(host);
  for (const t of placed) poly_("t " + t.kind + (t.cls ? " " + t.cls : ""), t.pts, host);
  for (const t of placed) for (const st of t.straps) line("s" + (st.mark ? " mark" : ""), st.seg[0], st.seg[1], host);
  const open = picture_ ? [] : openEdges();
  for (const o of open) { const e = placed[o.t].edges[o.e]; line("openmark", e.a, e.b, host); }
  if (overlay_) { const g = document.createElementNS(NS, "g"); g.setAttribute("class", "overlay"); sv.appendChild(g); overlay_(g); }
  if (!placed.length && !picture_) label_("empty", [0, 0], "click to place the first tile", sv);
  const hs = picture_ ? [] : holes();
  for (const p of hs) dot("hole", p, 3.2, host);
  const dead = picture_ ? [] : strandedEdges(lastChange);
  for (const e of dead) line("stranded", e.a, e.b, host);
  status(open.length, hs.length, dead.length);
  ghostEl = null; doomed = -1;
  if (hover && hover.edge) showGhost(hover.edge, hover.p);
  fit(); sizeWords();
}
function currentView() { const v = sv.getAttribute("viewBox").split(" ").map(Number); return { x: v[0], y: v[1], w: v[2], h: v[3] }; }
function applyView() { sv.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`); sizeWords(); }
// the words a passage draws on the plate stay one size on the screen, however far the plate is zoomed
function sizeWords() {
  const vb = currentView(), k = Math.max(vb.w / (sv.clientWidth || 800), vb.h / (sv.clientHeight || 600));
  for (const t of sv.querySelectorAll(".fk")) t.style.fontSize = (10.5 * k).toFixed(2) + "px";
}
function zoomAt(factor, px, py) { const vb = currentView(); view = { x: px - (px - vb.x) * factor, y: py - (py - vb.y) * factor, w: vb.w * factor, h: vb.h * factor }; applyView(); }
function fit(force = false) {
  if (view) { applyView(); return; }
  const pts = placed.flatMap(t => t.pts);
  if (!pts.length) { sv.setAttribute("viewBox", "-400 -300 800 600"); sizeWords(); return; }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const cur = currentView();
  if (!force) {
    const inside_ = x0 - E > cur.x && y0 - E > cur.y && x1 + E < cur.x + cur.w && y1 + E < cur.y + cur.h;
    const small = (x1 - x0) < cur.w * .35 && (y1 - y0) < cur.h * .35 && cur.w > 800 * .6 + 1;
    if (inside_ && !small) return;
  }
  const pad = E * 2.6, w = Math.max(x1 - x0 + 2 * pad, 800 * .6), h = Math.max(y1 - y0 + 2 * pad, 600 * .6);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const ratio = 800 / 600; let W = w, H = h; if (W / H < ratio) W = H * ratio; else H = W / ratio;
  sv.setAttribute("viewBox", `${cx - W / 2} ${cy - H / 2} ${W} ${H}`);
  sizeWords();
}

// ---------------------------------------------------------------- hovering and placing
function svgPoint(ev) { const pt = sv.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(sv.getScreenCTM().inverse()); }
function nearestOpen(p) {
  let best = null, bd = E * 1.6;
  for (const o of openEdges()) { const e = placed[o.t].edges[o.e]; const d = Math.hypot(e.mid[0] - p.x, e.mid[1] - p.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function drawGhostTile(tile, cls, parent) {
  poly_("ghost" + cls, tile.pts, parent);
  for (const st of tile.straps) line("ghost-s" + cls + (st.mark ? " mark" : ""), st.seg[0], st.seg[1], parent);
}
function showGhost(edge, p) {
  unghost();
  let tile = nearestSeating(kind, edge, p), offered = null;
  if (!tile) for (const k of SYSTEM.offer) if (k !== kind) { const t = fits(k, edge) && nearestSeating(k, edge, p); if (t) { tile = t; offered = k; break; } }
  const corners = tile ? cornersAfter(tile) : null;
  const stranded = tile && corners.made === 0 ? strands(tile) : 0;
  const full = atCap();
  const bad = corners !== null && (corners.made > 0 || stranded > 0 || full);
  hover = { edge, tile, bad, offered, p };
  ghostEl = document.createElementNS(NS, "g");
  line("target" + (bad ? " bad" : ""), edge.a, edge.b, ghostEl);
  if (tile) {
    const cls = bad ? " bad" : offered ? " offer" : "";
    drawGhostTile(tile, cls, ghostEl);
    for (const q of corners.where) dot("hole soon", q, 5, ghostEl);
    for (const cp of copiesOf(tile)) if (clear_(cp)) drawGhostTile(cp, " copy", ghostEl);
    const c = centre(tile), bb = bbox(tile.pts);
    const text = full ? `the plate holds ${MAX_TILES} tiles` : corners.made > 0 ? "would leave a hole" : stranded > 0 ? "would strand an edge" : offered ? SYSTEM.labels[offered] + " fits here" : "";
    if (text) label_("ghost-label", [c[0], bb[3] + 13], text, ghostEl);
  } else label_("ghost-label", [edge.mid[0], edge.mid[1] - 8], "nothing fits here", ghostEl);
  sv.appendChild(ghostEl);
}
function unghost() { if (ghostEl) { ghostEl.remove(); ghostEl = null; } }
function clearHover() { hover = null; unghost(); }
function markDoomed(idx) {
  // the tile under the pointer and, with symmetry on, every copy that would go with it
  const polys = sv.querySelectorAll("polygon.t");
  polys.forEach(pg => pg.classList.remove("doomed"));
  doomed = idx;
  if (doomed >= 0) for (const i of withCopies(doomed)) if (polys[i]) polys[i].classList.add("doomed");
}
// the pointer: one finger or the mouse drags the plate; two fingers pinch to zoom. On a touch screen there is no
// hover, so a tap shows what a tap would do, the ghost or the tile to remove, and a tap on it does it
let down = null, panned = false, lastType = "mouse", pinch = null, pinched = false;
const fingers = new Map();
const spread = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
const middle = () => { const [a, b] = [...fingers.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
sv.addEventListener("pointerdown", ev => {
  lastType = ev.pointerType;
  if (ev.pointerType !== "mouse") {
    fingers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (fingers.size === 1) pinched = false;
    if (fingers.size === 2) { pinch = { d: spread(), m: middle() }; pinched = true; down = null; sv.classList.remove("panning"); clearHover(); return; }
  }
  if (ev.button !== 0 || fingers.size > 1) return;
  down = { x: ev.clientX, y: ev.clientY, view: currentView() }; panned = false;
});
const lift = ev => { fingers.delete(ev.pointerId); if (fingers.size < 2) pinch = null; down = null; sv.classList.remove("panning"); };
window.addEventListener("pointerup", lift);
window.addEventListener("pointercancel", lift);
function pinching(ev) {
  if (!fingers.has(ev.pointerId)) return false;
  fingers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (!pinch || fingers.size < 2) return false;
  const d = spread(), m = middle(), at = svgPoint({ clientX: m.x, clientY: m.y });
  zoomAt(pinch.d / Math.max(1, d), at.x, at.y);
  const vb = currentView(), k = Math.max(vb.w / sv.clientWidth, vb.h / sv.clientHeight);
  view = { x: vb.x - (m.x - pinch.m.x) * k, y: vb.y - (m.y - pinch.m.y) * k, w: vb.w, h: vb.h }; applyView();
  pinch.d = d; pinch.m = m;
  return true;
}
function panning(ev) {
  if (!down) return false;
  if (!panned && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) <= 4) return false;
  panned = true; sv.classList.add("panning");
  const k = Math.max(down.view.w / sv.clientWidth, down.view.h / sv.clientHeight);
  view = { x: down.view.x - (ev.clientX - down.x) * k, y: down.view.y - (ev.clientY - down.y) * k, w: down.view.w, h: down.view.h };
  applyView(); clearHover(); markDoomed(-1);
  return true;
}
sv.addEventListener("pointermove", ev => {
  if (pinching(ev)) return;
  if (panning(ev)) return;
  if (picture_) return;
  hoverAt(svgPoint(ev));
});
// what the pointer shows at a point of the plate: the tile to remove, or the ghost of the tile to lay
function hoverAt(p) {
  if (kind === "remove") { if (hover) clearHover(); markDoomed(placed.findIndex(t => inside(t.pts, [p.x, p.y]))); return; }
  if (!placed.length) {
    unghost();
    const tile = freeTile(kind, p);
    hover = { edge: null, tile, bad: false, offered: null, free: true, p };
    ghostEl = document.createElementNS(NS, "g"); drawGhostTile(tile, "", ghostEl); sv.appendChild(ghostEl);
    return;
  }
  const edge = nearestOpen(p);
  if (!edge) { if (hover) clearHover(); return; }
  if (hover && hover.edge === edge) {
    const t = nearestSeating(kind, edge, p);
    if (t && hover.tile && t.j === hover.tile.j && t.kind === hover.tile.kind && t.mirror === hover.tile.mirror) { hover.p = p; return; }
  }
  showGhost(edge, p);
}
sv.addEventListener("pointerleave", ev => { if (ev.pointerType === "mouse") markDoomed(-1); });
sv.addEventListener("click", ev => {
  if (panned) { panned = false; return; }
  if (pinched) { pinched = false; return; }
  if (picture_) return;
  // a touch: the first tap shows, a tap on what it shows does it
  if (lastType !== "mouse") {
    const p = svgPoint(ev);
    if (kind === "remove") { const idx = placed.findIndex(t => inside(t.pts, [p.x, p.y])); if (idx < 0 || idx !== doomed) { markDoomed(idx); return; } }
    else if (!(hover && hover.tile && inside(hover.tile.pts, [p.x, p.y]))) { hoverAt(p); return; }
  }
  if (kind === "remove") {
    if (doomed < 0) return;
    touched(); strandCache.clear(); removeTile(doomed); doomed = -1; lastAttach = null; lastChange = null;
    render();
    const p = svgPoint(ev); markDoomed(placed.findIndex(t => inside(t.pts, [p.x, p.y])));
    return;
  }
  if (!hover || !hover.tile || hover.bad) return;
  const edge = hover.edge, tile = hover.tile;
  if (atCap()) return;
  touched();
  if (hover.free) { symOrigin = null; placeAll(tile); hover = null; lastChange = null; strandCache.clear(); render(); return; }
  lastAttach = { edge, j: tile.j };
  placeAll(tile); hover = null; lastChange = centre(tile); render();
  if (lastType === "mouse") { const p = svgPoint(ev), next = nearestOpen(p); if (next) showGhost(next, p); }
});
sv.addEventListener("wheel", ev => { if (!ev.ctrlKey && !ev.metaKey) return; ev.preventDefault(); const p = svgPoint(ev); zoomAt(ev.deltaY > 0 ? 1.15 : 1 / 1.15, p.x, p.y); if (hover && hover.edge) showGhost(hover.edge, hover.p); }, { passive: false });

// ---------------------------------------------------------------- growing, deflating
function grow(n) {
  const kinds = Object.keys(TILES), dead = new Set();
  const key = e => Math.round(e.mid[0]) + "," + Math.round(e.mid[1]);
  for (let tries = 0, done = 0; tries < n * 6 && done < n && !atCap(); tries++) {
    const open = openEdges().filter(o => !dead.has(key(placed[o.t].edges[o.e])));
    if (!open.length) break;
    let cx = 0, cy = 0, np = 0; for (const t of placed) for (const q of t.pts) { cx += q[0]; cy += q[1]; np++; } cx /= np; cy /= np;
    open.sort((a, b) => Math.hypot(a.mid[0] - cx, a.mid[1] - cy) - Math.hypot(b.mid[0] - cx, b.mid[1] - cy));
    const o = open[Math.floor(rng() * Math.max(1, Math.ceil(open.length * .3)))];
    const e = placed[o.t].edges[o.e];
    const cands = [];
    for (const k of kinds) for (const tile of seatings(k, e)) {
      if (!clear_(tile)) continue;
      const c = cornersAfter(tile);
      if (c.made > 0) continue;
      cands.push({ tile, score: c.closed * 10 + rng() });
    }
    cands.sort((a, b) => b.score - a.score);
    let best = null;
    for (const cd of cands) if (strands(cd.tile) === 0) { best = cd.tile; break; }
    if (best) { placeAll(best); done++; lastChange = null; } else dead.add(key(e));
  }
  strandCache.clear();
  render();
}
// Penrose by subdivision: each rhomb is two half-rhomb triangles (kind, apex, B, C);
// each triangle divides by a fixed rule into smaller ones, which pair up again into
// rhombs. Half-rhombs left over at the boundary are dropped
function subdivide(tris) {
  const out = [], lerp = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
  for (const [kd, A, B, C] of tris) {
    if (kd === 0) { const P = lerp(A, B, 1 / PHI); out.push([0, C, P, B], [1, P, C, A]); }
    else { const Q = lerp(B, A, 1 / PHI), R = lerp(B, C, 1 / PHI); out.push([1, R, C, A], [1, Q, R, B], [0, R, Q, A]); }
  }
  return out;
}
function trisOf(tile) {
  // the rhomb's vertices run apex 1, B, apex 2, C; both triangles have B second and C third
  const kd = tile.kind === "thin" ? 0 : 1, [v0, v1, v2, v3] = tile.pts;
  return [[kd, v0, v1, v3], [kd, v2, v1, v3]];
}
function rhombsOf(tris, scale, origin) {
  const byBase = new Map();
  const k = p => Math.round(p[0] * 20) + "," + Math.round(p[1] * 20);
  for (const t of tris) { const key = [k(t[2]), k(t[3])].sort().join("|"); if (!byBase.has(key)) byBase.set(key, []); byBase.get(key).push(t); }
  const out = [];
  for (const pair of byBase.values()) {
    if (pair.length !== 2) continue;
    const [[kd, A1, B1, C1], [, A2]] = pair;
    const f = p => [origin[0] + (p[0] - origin[0]) * scale, origin[1] + (p[1] - origin[1]) * scale];
    const pts = [A1, B1, A2, C1].map(f), kindName = kd === 0 ? "thin" : "thick";
    out.push(makeTile(kindName, pts, arrowMarks(pts, PENROSE.marks[kindName]), 0, false));
  }
  return out;
}
const canDeflate = () => SYSTEM.name === "penrose" && placed.length > 0 && placed.length * PHI * PHI <= MAX_TILES;
// inflation undoes a deflation: the tiles from before each one are kept, and can be
// brought back as long as nothing has changed on the plate since
const inflations = [];
const canInflate = () => inflations.length > 0 && inflations[inflations.length - 1].pv === pv;
function deflate() {
  // the tiles keep their size and the assembly grows by phi
  if (!canDeflate()) return;
  const before = { tiles: placed.slice(), origin: symOrigin };
  let tris = [];
  for (const t of placed) tris.push(...trisOf(t));
  tris = subdivide(tris);
  const o = symCentre(), tiles = rhombsOf(tris, PHI, o);
  placed.length = 0; pv++; symOrigin = o;
  for (const t of tiles) { placed.push(t); pv++; }
  strandCache.clear(); lastChange = null; lastAttach = null; clearHover();
  before.pv = pv; inflations.push(before);
  render(); fit(true); crossfade(before.tiles);
}
// the old tiles are left on the plate for a moment and fade while the new ones arrive
function crossfade(oldTiles) {
  const g = document.createElementNS(NS, "g"); g.setAttribute("class", "fading");
  for (const t of oldTiles) poly_("t " + t.kind, t.pts, g);
  for (const t of oldTiles) for (const st of t.straps) line("s" + (st.mark ? " mark" : ""), st.seg[0], st.seg[1], g);
  sv.appendChild(g); sv.classList.add("arriving");
  setTimeout(() => { g.remove(); sv.classList.remove("arriving"); }, 1000);
}
// hovering Deflate or Inflate previews it: the tiles it would make, drawn as warm dashed
// outlines over the plate, so the division and its undoing can be seen before the click
function deflatedTiles() { let tris = []; for (const t of placed) tris.push(...trisOf(t)); return rhombsOf(subdivide(tris), PHI, symCentre()); }
function previewTiles(tiles) { clearPreview(); const g = document.createElementNS(NS, "g"); g.setAttribute("id", "preview"); for (const t of tiles) poly_("preview", t.pts, g); sv.appendChild(g); }
function clearPreview() { const g = sv.querySelector("#preview"); if (g) g.remove(); }
function inflate() {
  if (!canInflate()) return;
  const before = inflations.pop(), smallTiles = placed.slice();
  placed.length = 0; pv++; symOrigin = before.origin;
  for (const t of before.tiles) { placed.push(t); pv++; }
  strandCache.clear(); lastChange = null; lastAttach = null; clearHover();
  if (inflations.length) inflations[inflations.length - 1].pv = pv;   // the level below is still reachable
  const small = smallTiles; render(); fit(true); crossfade(small);
}
function sunTris() {
  // ten thin half-rhombs round a point
  const tris = [];
  for (let i = 0; i < 10; i++) {
    let B = [Math.cos((2 * i - 1) * Math.PI / 10), Math.sin((2 * i - 1) * Math.PI / 10)], C = [Math.cos((2 * i + 1) * Math.PI / 10), Math.sin((2 * i + 1) * Math.PI / 10)];
    if (i % 2 === 0) [B, C] = [C, B];
    tris.push([0, [0, 0], B, C]);
  }
  return tris;
}
function sunTiles(levels) {
  let tris = sunTris();
  for (let n = 0; n < levels; n++) tris = subdivide(tris);
  return rhombsOf(tris, E * Math.pow(PHI, levels), [0, 0]);
}

// ---------------------------------------------------------------- clearing the plate
function clearPlate() { placed.length = 0; pv++; lastAttach = null; clearHover(); view = null; strandCache.clear(); lastChange = null; symOrigin = null; inflations.length = 0; }

// ---------------------------------------------------------------- the examples the passages build on
function preset(name) {
  placed.length = 0; pv++; lastAttach = null; clearHover(); markDoomed(-1); view = null; strandCache.clear(); lastChange = null; symOrigin = null;
  const wasSym = sym; sym = 0;
  const saved = rng;
  if (SYSTEM.name === "girih") {
    placed.push(freeTile("decagon", { x: 0, y: 0 })); pv++;
    if (name === "star" || name === "rosette") for (const e of placed[0].edges.slice()) { const t = seat("pentagon", e, 0); if (clear_(t)) { placed.push(t); pv++; } }
    if (name === "rosette") { sym = 1; rng = seeded(1); grow(40); }
    if (name === "irregular") { rng = seeded(2); grow(110); }
  } else {
    if (name === "sun") { for (const t of sunTiles(2)) { placed.push(t); pv++; } symOrigin = [0, 0]; }
    if (name === "sun3") { for (const t of sunTiles(4)) { if (atCap()) break; placed.push(t); pv++; } symOrigin = [0, 0]; }
    if (name === "irregular") { placed.push(freeTile("thick", { x: 0, y: 0 })); pv++; rng = seeded(3); grow(60); }
  }
  rng = saved; sym = wasSym;
  document.getElementById("sym").classList.toggle("on", !!sym);
  render(); fit(true);
}
// ---------------------------------------------------------------- the scrolled page: each passage sets the plate, and the reader plays on it
const $ = id => document.getElementById(id);
const on = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };
let picture_ = false;           // a passage that shows a drawing to look at, not a plate to lay tiles on
let overlay_ = null;            // what a passage draws over its plate, gone once the reader changes the plate
let dirty = false, scene = null;
const saved = {};               // a Penrose passage the reader has played with keeps its plate; a girih passage starts afresh each time it is reached
function touched() { dirty = true; overlay_ = null; }

// the counts at the top right, and which verbs can act
function status(nOpen, nHoles, nDead) {
  const pl = (n, one, many) => `<b>${n}</b> ${n === 1 ? one : many}`;
  const shared = (placed.reduce((s, t) => s + t.edges.length, 0) - nOpen) / 2;
  $("readout").innerHTML = picture_ ? "" :
    `${pl(placed.length, "tile", "tiles")}${atCap() ? " (the limit)" : ""} · ${pl(nOpen, "open edge", "open edges")} · ${pl(shared, "shared edge", "shared edges")}<br>` +
    `<span class="${nHoles ? "bad" : ""}">${pl(nHoles, "hole", "holes")}</span> · <span class="${nDead ? "bad" : ""}">${pl(nDead, "stranded edge", "stranded edges")}</span>`;
  const dis = (id, v, title) => { const e = $(id); if (e) { e.disabled = v; if (title) e.title = title; } };
  dis("grow", atCap());
  dis("deflate", !canDeflate(), canDeflate() ? "divide every tile into smaller tiles by the same rule" : placed.length ? `deflating would pass ${MAX_TILES} tiles` : "nothing to deflate");
  dis("inflate", !canInflate(), canInflate() ? "bring back the larger tiles this plate was divided from" : "nothing to inflate: only a plate just deflated, and unchanged since, inflates");
}

// the kit: one ring a tile, and remove
function buildKit() {
  const kit = $("kit"); kit.innerHTML = "";
  for (const k in SHAPES) {
    const b = document.createElement("button"); b.className = "ring"; b.dataset.kind = k; b.textContent = SYSTEM.labels[k][0].toUpperCase() + SYSTEM.labels[k].slice(1); b.title = SYSTEM.names[k];
    b.addEventListener("click", () => pickKind(k)); kit.appendChild(b);
  }
  const r = document.createElement("button"); r.className = "ring"; r.dataset.kind = "remove"; r.textContent = "Remove"; r.title = "click a tile to remove it; with symmetry on, its copies go too";
  r.addEventListener("click", () => { pickKind("remove"); clearHover(); }); kit.appendChild(r);
  marks();
}
function pickKind(k) {
  kind = k; marks(); markDoomed(-1);
  if (hover && hover.edge) showGhost(hover.edge, hover.p); else if (hover && hover.free) clearHover();
}
function marks() {
  for (const b of $("kit").children) b.classList.toggle("on", b.dataset.kind === kind);
  if ($("sym")) $("sym").classList.toggle("on", !!sym);
  $("b-outlines").classList.toggle("on", !sv.classList.contains("hide-outlines"));
  $("b-straps").classList.toggle("on", !sv.classList.contains("hide-straps"));
}
function layers(tiles, lines) { sv.classList.toggle("hide-outlines", !tiles); sv.classList.toggle("hide-straps", !lines); marks(); }

// -- what the passages lay on the plate ------------------------------------------------------------
const at = (k, x, y) => freeTile(k, { x, y });
const boxOf = tiles => bbox(tiles.flatMap(t => t.pts));
function centred(tiles) { const b = boxOf(tiles), dx = -(b[0] + b[2]) / 2, dy = -(b[1] + b[3]) / 2; return tiles.map(t => moveTile(t, dx, dy)); }
// a fresh plate holding these tiles
function lay(tiles, opts = {}) {
  clearPlate();
  for (const t of tiles) { if (atCap() && !opts.all) break; placed.push(t); pv++; }
  symOrigin = opts.origin || null; overlay_ = opts.overlay || null;
  render(); fit(true);
}
function inRow(kinds, gap) {
  let x = 0; const out = [];
  for (const k of kinds) { const t = at(k, 0, 0), b = bbox(t.pts); out.push(moveTile(t, x - b[0], -(b[1] + b[3]) / 2)); x += b[2] - b[0] + gap; }
  return centred(out);
}
// a decagon, each edge taking the tile asked of it where it fits
function patch(kinds) { const D = at("decagon", 0, 0), out = [D]; kinds.forEach((k, i) => { const s = seat(k, D.edges[i], 0); if (!out.some(o => overlaps(s.pts, o.pts))) out.push(s); }); return out; }
// a rhombus laid on an edge at corner V, beside tiles A and B, with its 72 degree corner at V
function rhombusAt(A, B, V) {
  for (const e of [...A.edges, ...B.edges].filter(e => near(e.a, V) || near(e.b, V))) for (const t of seatings("rhombus", e)) {
    if (overlaps(t.pts, A.pts) || overlaps(t.pts, B.pts)) continue;
    const i = t.pts.findIndex(q => near(q, V)); if (i >= 0 && angleAt("rhombus", i) === 72) return t;
  }
  return null;
}
// two corners: two decagons and a rhombus close; a decagon, a pentagon and a rhombus leave 36 degrees, a hole
function corners() {
  const D1 = at("decagon", 0, 0), D2 = seat("decagon", D1.edges[2], 0), V1 = D1.edges[2].b, R1 = rhombusAt(D1, D2, V1);
  const D3 = at("decagon", 0, 0), P = seat("pentagon", D3.edges[2], 0), V2 = D3.edges[2].b, R2 = rhombusAt(D3, P, V2);
  const left = [D1, D2, R1], right = [D3, P, R2], dx = boxOf(left)[2] - boxOf(right)[0] + E * 2;
  const all = [...left, ...right.map(t => moveTile(t, dx, 0))], b = boxOf(all), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  const v1 = [V1[0] - cx, V1[1] - cy], v2 = [V2[0] + dx - cx, V2[1] - cy], y = b[3] - cy + 24;
  return { tiles: all.map(t => moveTile(t, -cx, -cy)), overlay: g => { dot("target", v1, 3.4, g); label_("fk", [v1[0], y], "144 + 144 + 72 = 360", g); label_("fk", [v2[0], y], "144 + 108 + 72: 36° left", g); } };
}
// a thick rhomb with a thin one whose marks agree; beside it the same pair with marks that do not, refused
function matchPair() {
  const T = at("thick", 0, 0); let good = null, bad = null;
  for (const c of seatings("thin", T.edges[0])) { if (marksAgree(T, 0, c, c.j)) { if (!good) good = c; } else if (!bad) bad = c; if (good && bad) break; }
  const dx = E * 4.2, left = [T, good].filter(Boolean), b0 = boxOf(left);
  const T2 = moveTile(T, dx, 0), B2 = bad ? moveTile(bad, dx, 0) : null;
  const all = [...left, T2], b = boxOf(B2 ? [...all, B2] : all), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  const sh = t => moveTile(t, -cx, -cy), y = b[3] - cy + 20;
  const Bs = B2 ? sh(B2) : null, T2s = sh(T2);
  return { tiles: all.map(sh), overlay: g => {
    if (Bs) { poly_("ghost bad", Bs.pts, g); for (const st of Bs.straps) line("ghost-s bad" + (st.mark ? " mark" : ""), st.seg[0], st.seg[1], g); }
    line("stranded", T2s.edges[0].a, T2s.edges[0].b, g);
    label_("fk", [(b0[0] + b0[2]) / 2 - cx, y], "the marks agree", g); label_("fk", [(boxOf([T2])[0] + boxOf([T2])[2]) / 2 - cx, y], "they do not: refused", g);
  } };
}
// tenfold symmetry drawn over the sun
const tenfold = g => {
  const b = boxOf(placed), r = (b[2] - b[0]) / 2 + 8;
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5; line("sym", [0, 0], [r * Math.cos(a), r * Math.sin(a)], g); }
};

const GIRIH_SCENES = {
  tiles:   { tools: [], set() { sym = 0; lay(inRow(Object.keys(TILES), E * 1.6)); layers(true, false); } },
  lines:   { tools: ["g-view"], set() { sym = 0; preset("star"); layers(true, true); } },
  rule:    { tools: [], set() { sym = 0; const c = corners(); lay(c.tiles, { overlay: c.overlay }); layers(true, false); } },
  lay:     { tools: ["kit", "g-acts"], set() { sym = 0; lay([at("decagon", 0, 0)]); layers(true, true); pickKind("pentagon"); } },
  wall:    { tools: ["g-grow", "g-view", "g-acts"], set() { sym = 1; preset("rosette"); layers(true, true); } },
  effort:  { tools: ["g-grow", "g-view"], set() { sym = 0; preset("irregular"); layers(true, true); } },
  plan:    { tools: ["kit", "g-acts"], set() { sym = 0; lay(patch(["hexagon", "bowtie", "pentagon", "rhombus", "hexagon", "pentagon", "bowtie", "rhombus", "pentagon", "hexagon"])); layers(true, true); } },
  maragha: { tools: ["g-view"], set() { sym = 0; lay(patch(["bowtie", "hexagon", "bowtie", "hexagon", "bowtie", "hexagon", "bowtie", "hexagon", "bowtie", "hexagon"])); layers(false, true); } },
  free:    { tools: [] },
};
const PENROSE_SCENES = {
  rhombs:  { tools: [], set() { sym = 0; lay(inRow(["thick", "thin"], E * .8)); layers(true, true); } },
  rule:    { tools: ["kit", "g-grow", "g-acts"], set() { sym = 0; const m = matchPair(); lay(m.tiles, { overlay: m.overlay }); layers(true, true); pickKind("thin"); } },
  // thirteen hundred tiles, past the plate's limit, so a picture to look at and not a plate to lay on
  plane:   { tools: [], picture: true, set() { sym = 0; lay(sunTiles(6).map(t => makeTile(t.kind, t.pts, [], 0, false)), { origin: [0, 0], all: true }); layers(true, false); } },
  deflate: { tools: ["g-defl"], set() { sym = 0; lay(sunTiles(1), { origin: [0, 0] }); layers(true, true); } },
  metal:   { tools: [], set() { sym = 0; lay(sunTiles(2), { origin: [0, 0], overlay: tenfold }); layers(true, false); } },
  free:    { tools: [] },
};
const SCENES = SYSTEM.name === "penrose" ? PENROSE_SCENES : GIRIH_SCENES;

// the controls each passage needs, and no others
const GROUPS = ["kit", "g-grow", "g-defl", "g-view", "g-acts"];
function applyTools(list) {
  const want = new Set(list || []);
  for (const id of GROUPS) { const e = $(id); if (e) e.hidden = !want.has(id); }
  $("tools").hidden = want.size === 0;
}
function snapshot() {
  return { placed: placed.slice(), sym, symOrigin, kind, inflations: inflations.slice(), canInf: canInflate(),
           picture: picture_, overlay: overlay_, tiles: !sv.classList.contains("hide-outlines"), lines: !sv.classList.contains("hide-straps"), view };
}
function restore(s) {
  clearPlate();
  for (const t of s.placed) { placed.push(t); pv++; }
  sym = s.sym; symOrigin = s.symOrigin; kind = s.kind;
  inflations.push(...s.inflations); if (s.canInf && inflations.length) inflations[inflations.length - 1].pv = pv;
  picture_ = s.picture; overlay_ = s.overlay; dirty = true; view = s.view;
  layers(s.tiles, s.lines); render(); if (!view) fit(true);
}
function enter(name) {
  if (name === scene || !SCENES[name]) return;
  if (scene && dirty && SYSTEM.name !== "girih") saved[scene] = snapshot();
  scene = name;
  const S = SCENES[name];
  applyTools(S.tools);
  for (const sec of document.querySelectorAll(".story section")) sec.classList.toggle("on", sec.dataset.scene === name);
  clearHover(); markDoomed(-1); clearPreview();
  if (saved[name]) { restore(saved[name]); marks(); return; }
  if (!S.set) return;                    // a passage that keeps the plate as it is
  picture_ = !!S.picture; overlay_ = null; dirty = false; view = null;
  S.set();
  marks();
}

// -- the controls ------------------------------------------------------------------------------------
on("b-outlines", "click", () => { dirty = true; layers(sv.classList.contains("hide-outlines"), !sv.classList.contains("hide-straps")); });
on("b-straps", "click", () => { dirty = true; layers(!sv.classList.contains("hide-outlines"), sv.classList.contains("hide-straps")); });
on("clear", "click", () => { touched(); clearPlate(); render(); fit(true); marks(); });
on("z-fit", "click", () => { view = null; fit(true); });
on("grow", "click", () => { touched(); if (!placed.length) { placed.push(freeTile(kind === "remove" ? SYSTEM.seed : kind, { x: 0, y: 0 })); pv++; } grow(12); });
on("sym", "click", () => { sym = sym ? 0 : 1; dirty = true; marks(); if (hover && hover.edge) showGhost(hover.edge, hover.p); });
on("deflate", "click", () => { touched(); deflate(); });
on("inflate", "click", () => { touched(); inflate(); });
on("deflate", "pointerenter", () => { if (canDeflate()) previewTiles(deflatedTiles()); });
on("deflate", "pointerleave", clearPreview);
on("inflate", "pointerenter", () => { if (canInflate()) previewTiles(inflations[inflations.length - 1].tiles); });
on("inflate", "pointerleave", clearPreview);
document.addEventListener("keydown", ev => {
  if (ev.target.tagName === "INPUT") return;
  const kinds = Object.keys(TILES), k = ev.key;
  if (/^[1-9]$/.test(k) && +k <= kinds.length) pickKind(kinds[+k - 1]);
  else if (k === "x" || k === "X") { pickKind("remove"); clearHover(); }
  else if ((k === "g" || k === "G") && $("grow")) $("grow").click();
  else if ((k === "s" || k === "S") && $("sym")) $("sym").click();
  else if ((k === "d" || k === "D") && SYSTEM.name === "penrose") { touched(); deflate(); }
  else if ((k === "i" || k === "I") && SYSTEM.name === "penrose") { touched(); inflate(); }
  else if (k === "o" || k === "O") $("b-outlines").click();
  else if (k === "l" || k === "L") $("b-straps").click();
  else if (k === "+" || k === "=") { const v = currentView(); zoomAt(1 / 1.3, v.x + v.w / 2, v.y + v.h / 2); }
  else if (k === "-" || k === "_") { const v = currentView(); zoomAt(1.3, v.x + v.w / 2, v.y + v.h / 2); }
  else if (k === "0") $("z-fit").click();
});

// -- the story drives the plate ------------------------------------------------------------------------
buildShapes(); buildKit(); render();
const io = new IntersectionObserver(entries => { for (const e of entries) if (e.isIntersecting) enter(e.target.dataset.scene); }, { rootMargin: "-45% 0px -45% 0px" });
for (const sec of document.querySelectorAll(".story section")) io.observe(sec);
window.addEventListener("resize", () => { if (!view) fit(true); });
// a hash may open the page at a passage, #scene=rule, with &still to hold it there; the older state words still work:
// #grow=60&sym=1&outlines=0&straps=1&pick=thin&deflate=1&hover=x,y&grain=0
(function fromHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const first = document.querySelector(".story section").dataset.scene;
  const start = SCENES[q.get("scene")] ? q.get("scene") : first;
  if (q.has("still")) io.disconnect();
  else if (start !== first) { const sec = document.querySelector(`.story section[data-scene="${start}"]`); if (sec) sec.scrollIntoView({ behavior: "instant", block: "center" }); }
  enter(start);
  if (q.has("pick") && SHAPES[q.get("pick")]) pickKind(q.get("pick"));
  if (q.has("sym")) { sym = q.get("sym") === "1" ? 1 : 0; marks(); }
  if (q.has("grow")) { if (!placed.length) { placed.push(freeTile(kind === "remove" ? SYSTEM.seed : kind, { x: 0, y: 0 })); pv++; } grow(Math.min(400, +q.get("grow") | 0)); }
  if (q.has("deflate")) for (let i = 0; i < Math.min(5, +q.get("deflate") | 0); i++) deflate();
  if (q.has("outlines") || q.has("straps")) layers(q.get("outlines") !== "0", q.get("straps") !== "0");
  if (q.has("hover")) { const [x, y] = q.get("hover").split(",").map(Number); const e = nearestOpen({ x, y }); if (e) showGhost(e, { x, y }); }
  if (q.get("grain") === "0") document.body.classList.remove("grain");
})();

// the page links back to the deck, and to the slide it was opened from when the hash says
(function backToTalk() { const f = new URLSearchParams(location.hash.slice(1)).get("from"), a = document.getElementById("to-talk"); if (f && a) a.href = "talk.html#" + f; })();
