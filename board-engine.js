// The board's engine: a district of four blocks by four that joins at its edges, every street woven by one card of the deck.
// Households live along the streets, walk to the shops within reach by pull over distance, and the shops let or close on the
// footfall past their doors. Through traffic is displaced, never removed: the streets with car lanes share it, and it heats
// and lengthens them. Every street has a temperature. A first draft, 12 October 2026: every rule is simple and every number
// is a guess, to be tuned once it plays. Runs in the page and in Node. No dependencies.
"use strict";
(function (root) {
const GRID = 4, PLACE = 20 / 3, PLOT = 20, CROSSING = 16, CARD = 18, GARDEN_M2 = PLACE * 10;
const K = {
  TRIPS: .35, REACH: 400, NOTRIP: 1.5,           // trips a household a tick; how far a walk goes; the pull of staying in
  SHOP: 1, GRAIN: 1.25,                           // the pull of a let shop; a cluster of k pulls k^GRAIN
  EXTRA: { stall: .7, art: .5, bench: .2 },       // the pull of what stands on the pavement
  SHADE: .15, TRAFFIC: .0004,                      // a street of trees feels shorter; a street of traffic feels longer
  DECAY: .35,                                      // the pull falls by this each 20 m of the way
  CONV: .3, RENT0: 1, RENT_RATE: .02, RENT_LAG: .3, VACANT_CUT: .85, STRIKES: 2, REVIEW: 5,
  THROUGH: 2400,                                   // vehicles an hour that must cross the district, shared by the streets with car lanes
  TEMP0: 26, T_TRAFFIC: 3.5, T_BAYS: 1, T_BUS: .6, T_TREES: 3.5, T_TALL: 1.5, T_CROWD: 1.5, HOT: 28, AVOID: .06,
  HEATWAVE: 6, DOWNTURN: .7,                       // a heatwave's degrees; a downturn's cut to what shops take
};
const node = (i, j) => ((j + GRID) % GRID) * GRID + ((i + GRID) % GRID);

// what a card gives a street: counted over the places and parts the street uses, the card repeating along a street longer
// than itself and cut short on one shorter, and over both frontages, which are alike
// what lies behind the plots, by the card: a park gives gardens and trees, a car park gives bays, a mall gives shops that
// face no street; each counted once for every length of the card along the street
const BACK = { gardens: {}, park: { gardens: 6, trees: 6 }, carpark: { bays: 12 }, mall: { shops: 4 }, civic: {} };
function attrs(card, places) {
  const len = places * PLACE, copies = Math.ceil(places / CARD), back = BACK[card.back] || {};
  const n = kind => { let c = 0; for (let r = 0; r < copies; r++) for (const k in card.parts) if (card.parts[k].kind === kind && (+k.split(":")[1] + .5) * PLACE + r * CARD * PLACE < len) c++; return c; };
  let homes = 0, doors = 0, gardens = 0, storeys = 0;
  for (let d = 0; d < places; d++) { const e = d % CARD; homes += Math.max(0, card.floors[e] - (card.doors[e] ? 1 : 0)); if (card.doors[e] && card.floors[e] > 0) doors++; if (card.floors[e] === 0) gardens++; storeys += card.floors[e]; }
  return { homes: 2 * homes, doors: 2 * doors, gardens: 2 * gardens + copies * (back.gardens || 0), storeys: storeys / places, trees: 2 * (n("tree") + gardens) + copies * (back.trees || 0), stalls: 2 * n("stall"), art: 2 * n("art"), benches: 2 * n("bench"), stops: 2 * n("stop"),
    bays: 2 * n("bay") + copies * (back.bays || 0), walk: card.bands.filter(u => u === "walk").length, carLanes: card.bands.filter(u => u === "car").length, busLanes: card.bands.filter(u => u === "bus").length };
}
// the shopfronts of a street, one to each punched place on each side, the near side first
function fronts(card, places) {
  const out = [];
  for (let side = 0; side < 2; side++) for (let d = 0; d < places; d++) if (card.doors[d % CARD] && card.floors[d % CARD] > 0) out.push({ let: true, rent: K.RENT0, strikes: 0, take: 0, side, place: d });
  // the shops of a mall behind the plots, facing no street: side 2, with no place on the frontage
  const back = BACK[card.back] || {}, n = Math.ceil(places / CARD) * (back.shops || 0);
  for (let i = 0; i < n; i++) out.push({ let: true, rent: K.RENT0, strikes: 0, take: 0, side: 2, place: -1 - i });
  return out;
}


// -- the world: the streets of a ground, given as a list, each between two crossings (a and b, numbered by the page), of a
// length and so many places of frontage, woven by a card, and closed at either end where it meets no street. Without a list
// the ground is a grid of four blocks by four. Each street takes its card's attributes and its shopfronts
function create(cards, list, thread) {
  if (!list) {
    list = [];
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
      list.push({ key: `ew:${j}:${i}`, kind: "ew", a: node(i, j), b: node(i + 1, j), len: 6 * PLOT + CROSSING, places: 18, closedAt: null, card: thread.ew[j][i] });
      list.push({ key: `ns:${j}:${i}`, kind: "ns", a: node(i, j), b: node(i, j - 1), len: 3 * PLOT + CROSSING, places: 9, closedAt: null, card: thread.ns[j][i] });
    }
  }
  const segs = list.map(s => ({ key: s.key, kind: s.kind, a: s.a, b: s.b, len: s.len, places: s.places, closedAt: s.closedAt || null, card: s.card }));
  for (const s of segs) { s.at = attrs(cards[s.card], s.places); s.shops = fronts(cards[s.card], s.places); s.foot = 0; s.sum = 0; s.takings = 0; s.lets = s.shops.length; s.temp = K.TEMP0; s.traffic = 0; }
  const nodes = 1 + segs.reduce((m, s) => Math.max(m, s.a, s.b), 0);
  const w = { t: 0, segs, nodes, takings: 0, footfall: 0, trips: 0, reach: 0, green: 0, greenPer: 0, tempMax: K.TEMP0, tempMean: K.TEMP0, lets: 0, doors: 0, homes: 0, blocked: false, shock: null, seed: 7 };
  totals(w); routes(w);
  return w;
}
// the deck or the threading changed: every street takes its card afresh, by key, keeping its shops where its card is the same
function update(w, cards, cardOf) {
  for (const s of w.segs) {
    const k = cardOf(s.key), c = cards[k], same = k === s.card;
    s.card = k; s.at = attrs(c, s.places);
    const fresh = fronts(c, s.places);
    if (same) { const old = s.shops; s.shops = fresh.map(f => { const o = old.find(x => x.side === f.side && x.place === f.place); return o || f; }); } else s.shops = fresh;
    s.lets = s.shops.filter(x => x.let).length;
  }
  totals(w); routes(w);
  return w;
}
function totals(w) { w.doors = w.segs.reduce((a, s) => a + s.shops.length, 0); w.homes = w.segs.reduce((a, s) => a + s.at.homes, 0); w.lets = w.segs.reduce((a, s) => a + s.lets, 0); }
// the ways through the district: every crossing to every other, shortest by felt length, and the streets each way passes.
// A street closed at its far end joins the district at its near end only, and nothing passes along it. Through traffic is
// shared by the open streets with car lanes, since it is what makes a street feel long
function routes(w) {
  const lanes = w.segs.reduce((a, s) => a + (s.closedAt ? 0 : s.at.carLanes), 0);
  w.blocked = lanes === 0;
  for (const s of w.segs) s.traffic = lanes && !s.closedAt ? K.THROUGH * s.at.carLanes / lanes : 0;
  const N = w.nodes, INF = 1e9, d = Array.from({ length: N }, () => new Array(N).fill(INF)), via = Array.from({ length: N }, () => new Array(N).fill(-1));
  const edge = Array.from({ length: N }, () => new Array(N).fill(-1));
  for (let n = 0; n < N; n++) d[n][n] = 0;
  w.segs.forEach((s, k) => {
    s.felt = s.len * (1 - K.SHADE * Math.min(1, s.at.trees / 12)) * (1 + K.TRAFFIC * s.traffic);
    if (!s.closedAt && s.felt < d[s.a][s.b]) { d[s.a][s.b] = d[s.b][s.a] = s.felt; edge[s.a][s.b] = edge[s.b][s.a] = k; via[s.a][s.b] = s.b; via[s.b][s.a] = s.a; }
  });
  for (let m = 0; m < N; m++) for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) if (d[a][m] + d[m][b] < d[a][b]) { d[a][b] = d[a][m] + d[m][b]; via[a][b] = via[a][m]; }
  const S = w.segs.length, ends = s => s.closedAt === "ab" ? [] : s.closedAt === "b" ? [s.a] : s.closedAt === "a" ? [s.b] : [s.a, s.b];
  w.way = Array.from({ length: S }, () => new Array(S));
  for (let o = 0; o < S; o++) for (let t = 0; t < S; t++) {
    if (o === t) { w.way[o][t] = { d: 0, on: [o] }; continue; }
    const so = w.segs[o], st = w.segs[t];
    let best = null;
    for (const a of ends(so)) for (const b of ends(st)) { const dd = so.felt / 2 + d[a][b] + st.felt / 2; if (dd < INF && (!best || dd < best.d)) best = { d: dd, a, b }; }
    if (!best) { w.way[o][t] = { d: INF, on: [o] }; continue; }
    const on = [o];
    for (let n = best.a; n !== best.b;) { const nx = via[n][best.b]; on.push(edge[n][nx]); n = nx; }
    on.push(t);
    w.way[o][t] = { d: best.d, on };
  }
}
const shock = (w, kind) => w.shock && w.shock.kind === kind && w.t >= w.shock.from && w.t < w.shock.to;
// -- one tick: every street's temperature; then the households of every street walk to the shops that pull them, keeping
// off the hot streets, and every street counts who passed
function step(w) {
  w.t++;
  const S = w.segs.length, base = K.TEMP0 + (shock(w, "heatwave") ? K.HEATWAVE : 0);
  for (const s of w.segs) s.temp = base + K.T_TRAFFIC * Math.min(1.5, s.traffic / 300) + K.T_BAYS * Math.min(1, s.at.bays / 12) + K.T_BUS * s.at.busLanes - K.T_TREES * Math.min(1, s.at.trees / 12) - K.T_TALL * Math.min(1, s.at.storeys / 5) + K.T_CROWD * Math.min(1.5, s.foot / 150);
  const pull = w.segs.map(s => ((s.lets ? K.SHOP * Math.pow(s.lets, K.GRAIN) : 0) + K.EXTRA.stall * s.at.stalls + K.EXTRA.art * s.at.art + K.EXTRA.bench * s.at.benches) * Math.max(.2, 1 - K.AVOID * Math.max(0, s.temp - K.HOT)));
  const foot = new Array(S).fill(0);
  let trips = 0, reachSum = 0, greenSum = 0, hN = 0, tSum = 0, tMax = -1e9;
  for (let o = 0; o < S; o++) {
    const h = w.segs[o].at.homes;
    if (!h) continue;
    const opts = [];
    let near = Infinity, nearG = Infinity;
    for (let t = 0; t < S; t++) {
      const way = w.way[o][t];
      if (w.segs[t].at.gardens && way.d < nearG) nearG = way.d;
      if (way.d > K.REACH) continue;
      if (w.segs[t].lets && way.d < near) near = way.d;
      if (pull[t] > 0) opts.push({ t, u: pull[t] * Math.exp(-K.DECAY * way.d / 20), on: way.on });
    }
    const tot = opts.reduce((a, x) => a + x.u, 0) + K.NOTRIP;
    for (const x of opts) { const f = h * K.TRIPS * x.u / tot; trips += f; for (const k of x.on) foot[k] += f; }
    foot[o] += h * K.TRIPS * .6;   // about the door
    reachSum += h * Math.min(K.REACH, near); greenSum += h * Math.min(K.REACH, nearG); hN += h;
    tSum += h * w.segs[o].temp; tMax = Math.max(tMax, w.segs[o].temp);
  }
  w.segs.forEach((s, k) => { s.foot = foot[k] * (.85 + .3 * rnd(w)); s.sum += s.foot; });
  w.trips = trips; w.footfall = foot.reduce((a, b) => a + b, 0);
  w.reach = hN ? reachSum / hN : 0; w.green = hN ? greenSum / hN : 0; w.tempMean = hN ? tSum / hN : base; w.tempMax = tMax > -1e8 ? tMax : base;
  w.greenPer = hN ? w.segs.reduce((a, s) => a + s.at.gardens * GARDEN_M2, 0) / hN : 0;
  if (w.t % K.REVIEW === 0) shops(w);
  w.lets = w.segs.reduce((a, s) => a + s.lets, 0);
  return w;
}
// -- the shops, reviewed every fifth tick: a let shop pays rent from its takings and closes after two reviews at a loss; a
// vacant shopfront's rent falls until someone takes it
function shops(w) {
  let takings = 0;
  const conv = K.CONV * (shock(w, "downturn") ? K.DOWNTURN : 1);
  for (const s of w.segs) {
    const avg = s.sum / K.REVIEW, k = s.shops.filter(x => x.let).length, fair = K.RENT0 + K.RENT_RATE * avg;
    for (const sh of s.shops) {
      const take = avg * conv / Math.max(1, sh.let ? k : k + 1) * Math.pow(Math.max(1, k), K.GRAIN - 1);
      if (sh.let) {
        sh.rent = (1 - K.RENT_LAG) * sh.rent + K.RENT_LAG * fair; sh.take = take; takings += take;
        if (take < sh.rent) { if (++sh.strikes >= K.STRIKES) { sh.let = false; sh.strikes = 0; sh.take = 0; } } else sh.strikes = 0;
      } else {
        sh.rent *= K.VACANT_CUT;
        if (take > sh.rent * 1.1 && rnd(w) < .6) { sh.let = true; sh.rent = Math.max(sh.rent, K.RENT0 * .6); }
      }
    }
    s.lets = s.shops.filter(x => x.let).length; s.takings = s.shops.reduce((a, x) => a + x.take, 0); s.sum = 0;
  }
  w.takings = takings;
}
function rnd(w) { w.seed = w.seed + 0x6D2B79F5 | 0; let t = Math.imul(w.seed ^ w.seed >>> 15, 1 | w.seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const api = { create, update, step, attrs, K, GRID };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BoardEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
