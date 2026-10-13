/* Agents and roads in three temperaments, drawn as three small squares on the overview's board beside the
   pace-layers passage: exploration, the balance, and consolidation, each a town on the same ground with the same
   food, with an account under each. Drawn in the frame of live-figure.js. After the slime mould of Tero and
   colleagues (Science, 2010).

   The home is at the centre. Food sources lie around it, the same in all three squares, and each town eats from its
   own copy of each: a source is eaten down by the loads a town takes from it, wanes on its own over half a
   minute or so, and is gone, and a new one appears at random elsewhere, for all three at once. Each town has
   the same workforce of agents, posted out from home, and every step a agent takes costs energy, dear over
   rough ground and cheap on a road. A agent with no load explores by wiggling: it turns a little at random
   each step, and otherwise keeps its heading. It senses nothing but road, and where there is road under or ahead
   of it, it turns towards the stronger road, more or less readily. It finds food only by walking into it. A
   agent that reaches food takes a load and heads straight for home, by a road where one lies within reach, and lays
   road as it goes. At home the load is added to the store. An agent that finds nothing for too long dies. While
   the workforce is below its number a new agent is posted out from home every few steps, at a cost when the
   store can pay it, and at a third of the rate for nothing when it cannot, so a town that finds little dwindles
   to a basic workforce and no further. A carrier is slow and dear over rough ground and fast
   and cheap on a road, so a road saves most of a load's cost. A road stays only while carriers keep using it: it
   fades otherwise, at a pace that differs between the squares, and costs an upkeep for as long as it stands. An agent with no load lays nothing.

   Three things set a town's temperament: how far its agents wiggle, how readily they keep to road, and how much
   road its carriers lay and how slowly it fades.

     exploration     wide wiggle, no road-keeping, no road laid: the food is found and carried home over rough
                     ground, and most of what it brings is spent on the walking.
     balance         a moderate wiggle, road kept to where it exists, road laid and let go when its source is spent.
     consolidation   hardly any wiggle, road kept to wherever it leads, road laid thick and kept long after the
                     source is spent, so the town goes on paying for roads to nothing and finds little that is new.

   The sources breathe, and shrink as they are eaten and wane, and a ring spreads where one is gone. A ring spreads
   where an agent finds food, and at home when its load arrives. Under each square, the store, and a tape of it over
   the last two minutes, on one scale across the three. With reduced motion the model is run some way and drawn
   once. */
(function () {
"use strict";
const PAPER = [249, 244, 229], INK = [28, 26, 23];
const PAPER_S = "#f9f4e5", INK_S = "#1c1a17", MUTED = "#6f6a60", LINE = "#cfc7ad", RED_S = "#c0392b";
const FIGS = "500 12px 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const LABELS = ["EXPLORATION BIAS", "BALANCED", "CONSOLIDATION BIAS"];

// ---------------------------------------------------------------- the ground and the food, the same for all three
const G = 96, R = G / 2;                    // cells on a side, and the ground's radius about the home at the centre
const SOURCES = 5, NEAR = 14, FAR = 34;     // sources alive at once, and the ring they lie in
const LASTS = 900, SPREAD = 250;            // steps a source lasts, give or take
const GONE = .05, BITE = .0025;             // when a source is spent, and what a load takes from it
let food = [], step = 0, ids = 0;
const d2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
function spot() {
  for (let n = 0; n < 200; n++) {
    const a = Math.random() * 6.283, r = NEAR + Math.random() * (FAR - NEAR), x = R + r * Math.cos(a), y = R + r * Math.sin(a);
    if (food.every(q => d2(x, y, q.x, q.y) >= 100)) return { x, y };
  }
  return null;
}
function tendFood() {
  for (const s of food) s.f -= 1 / s.span;
  food = food.filter(s => s.f >= GONE);
  while (food.length < SOURCES) { const p = spot(); if (!p) break; food.push({ x: p.x, y: p.y, f: 1, span: LASTS + (Math.random() - .5) * 2 * SPREAD, id: ids++ }); }
}
function seedFood() { food = []; tendFood(); for (const s of food) s.f = .3 + .7 * Math.random(); }
seedFood();

// ---------------------------------------------------------------- the towns
const AGENTS = 40;                          // the workforce of each town
const SO = 4, SA = Math.PI / 6, RA = Math.PI / 12, PACE = .5;   // a agent's sense offset, sense angle, turn towards road, and step
const NOISE = .03;                           // the difference in road below which a agent is not turned by it
const HIT = 3;                              // how close an agent must come to food to find it
const LIFE = 240, BIRTH = 1.5, POST = 10;   // steps an agent lasts without finding food, what a new one costs the town, and
                                            // how often one is posted out from home while the workforce is below its number
const LOAD = 7.2;                           // the energy a full load is worth at home
const SLOW = .5, FAST = 4, CHEAP = .25;     // a carrier's speed off road and on a full road, as shares of a agent's, and
let DEAR = 10;                              // what its step costs off road, as a share of an agent's
let WALK = .003;                            // what an agent's step costs
const BASE = .012, RESERVE = .036, LOW = 6, STORE0 = 30;   // the town's own upkeep a step, the home's income while the store
                                            // is low, the low mark, and the store at the start
let UPKEEP = .0012;                         // upkeep a step per unit of road; this and the two costs above were set by a sweep, 12 October
// the three temperaments: the most a agent turns at random a step, how strongly it keeps to road, how much road a
// carrier lays a step, and the share of an unused road that stays each step
const TEMPERS = [{ wiggle: .6, roads: 0, lay: 0, keep: .97 }, { wiggle: .25, roads: 2, lay: .05, keep: .994 }, { wiggle: .12, roads: 4, lay: .15, keep: .9998 }];
const at = (x, y) => { const i = Math.round(x), j = Math.round(y); return i < 0 || j < 0 || i >= G || j >= G ? -1 : j * G + i; };
const PULSE = 20;                           // steps a ring takes to spread and fade
const SECOND = 30, HALF = 30, TAPE = 120;   // steps a second, the seconds the account covers, and the seconds the tape shows

function Town(temper) {
  this.t = temper;
  this.road = new Float32Array(G * G);
  this.store = STORE0; this.eaten = {}; this.agents = [];
  // the workforce is posted out from home, one at a time, from the start
  this.now = [0, 0, 0, 0]; this.ledger = []; this.trace = [];   // the store, a sample a second, for the tape
  this.pulses = [];                         // rings that spread and fade: a find, a load home, a source gone
  this.known = {};                          // the sources this town still has food in, by id, with where they are
}
Town.prototype.left = function (s) { return s.f - (this.eaten[s.id] || 0); };
Town.prototype.sense = function (a, x, y) {
  const k = at(x, y);
  if (k < 0 || d2(x, y, R, R) > (R - 1) ** 2) return -1;
  return this.t.roads * this.road[k];
};
Town.prototype.roadAt = function (x, y) { const k = at(x, y); return k < 0 ? 0 : this.road[k]; };
Town.prototype.step = function () {
  const road = this.road, t = this.t, now = this.now, pulses = this.pulses;
  // a source this town has eaten out, or that has waned away, pops
  for (const s of food) { if (this.left(s) >= GONE) this.known[s.id] = { x: s.x, y: s.y }; }
  for (const id in this.known) { const s = food.find(f => f.id == id); if (!s || this.left(s) < GONE) { pulses.push({ x: this.known[id].x, y: this.known[id].y, kind: "pop", age: 0 }); delete this.known[id]; } }
  for (const q of pulses) q.age++;
  this.pulses = this.pulses.filter(q => q.age < PULSE);
  // an agent that has found nothing for too long dies; while the workforce is below its number a new one is posted out
  // from home every few steps, at a cost
  this.agents = this.agents.filter(a => a.load || ++a.since <= LIFE);
  if (this.agents.length < AGENTS && step % POST === 0) {
    // a town that can pay posts at the full rate; one that cannot still posts at a third of it, its basic workforce
    const paid = this.store >= BIRTH;
    if (paid || step % (3 * POST) === 0) { this.agents.push({ x: R, y: R, h: Math.random() * 6.283, load: 0, onRoad: 0, steps: 0, since: 0 }); if (paid) { this.store -= BIRTH; now[0] += BIRTH; } }
  }
  let roadSum = 0;
  for (let k = 0; k < G * G; k++) { road[k] *= t.keep; roadSum += road[k]; }
  for (const a of this.agents) {
    if (a.load) {
      // a carrier heads straight for home, by a road where one lies within reach of the way home
      const home = Math.atan2(R - a.y, R - a.x);
      let best = home, bestRoad = NOISE;
      for (const d of [-1, -.5, 0, .5, 1]) {
        const h = home + d * 2 * SA, r = this.roadAt(a.x + SO * Math.cos(h), a.y + SO * Math.sin(h));
        if (r > bestRoad) { bestRoad = r; best = h; }
      }
      a.h = best;
    } else {
      a.h += (Math.random() - .5) * 2 * t.wiggle;   // the wiggle: exploration
      if (t.roads > 0) {
        // an agent that keeps to road turns to the stronger road, if there is a real difference
        const f = this.sense(a, a.x + SO * Math.cos(a.h), a.y + SO * Math.sin(a.h));
        const l = this.sense(a, a.x + SO * Math.cos(a.h - SA), a.y + SO * Math.sin(a.h - SA));
        const r = this.sense(a, a.x + SO * Math.cos(a.h + SA), a.y + SO * Math.sin(a.h + SA));
        if (l > f + NOISE && l >= r) a.h -= RA; else if (r > f + NOISE) a.h += RA;
      }
    }
    const k0 = at(a.x, a.y), under = k0 >= 0 ? Math.min(1, road[k0]) : 0;
    let speed = PACE * (a.load ? SLOW + (FAST - SLOW) * under : 1);
    if (a.load) speed = Math.min(speed, Math.sqrt(d2(a.x, a.y, R, R)));   // a carrier does not overshoot home
    let nx = a.x + speed * Math.cos(a.h), ny = a.y + speed * Math.sin(a.h);
    if (d2(nx, ny, R, R) > (R - 1) ** 2) { a.h += Math.PI + (Math.random() - .5) * 1.6; nx = a.x; ny = a.y; }   // turned back at the edge, not straight back
    a.x = nx; a.y = ny;
    const k = at(a.x, a.y);
    if (k >= 0 && a.load) road[k] = Math.min(1, road[k] + t.lay);   // road is laid only under a load on its way home
    const cost = WALK * (a.load ? DEAR + (CHEAP - DEAR) * under : 1);
    this.store -= cost; now[a.load && under > .3 ? 2 : 0] += cost;
    if (a.load) {
      a.steps++; if (under > .3) a.onRoad++;
      if (d2(a.x, a.y, R, R) < 1) {
        this.store += LOAD * a.load; now[a.onRoad > a.steps / 2 ? 3 : 1] += LOAD * a.load;
        pulses.push({ x: R, y: R, kind: "home", age: 0 });
        a.load = 0; a.onRoad = 0; a.steps = 0; a.h = Math.random() * 6.283;
      }
    } else {
      for (const s of food) {
        const f = this.left(s);
        if (f < GONE || d2(a.x, a.y, s.x, s.y) > HIT * HIT) continue;
        a.load = Math.min(1, f); this.eaten[s.id] = (this.eaten[s.id] || 0) + BITE; a.h = Math.atan2(R - a.y, R - a.x); a.since = 0;
        pulses.push({ x: a.x, y: a.y, kind: "find", age: 0 }); break;
      }
    }
  }
  const due = UPKEEP * roadSum;
  // the roads' upkeep is paid as far as the store allows; the roads stand regardless, and a town that cannot pay for
  // them has nothing left for anything else
  if (this.store >= due) { this.store -= due; now[2] += due; } else { now[2] += Math.max(0, this.store); this.store = 0; }
  this.store += (this.store < LOW ? RESERVE : 0) - BASE;
  if (this.store < 0) this.store = 0;
  if (step % SECOND === 0) { this.ledger.push(now.slice()); if (this.ledger.length > HALF) this.ledger.shift(); now.fill(0); this.trace.push(this.store); if (this.trace.length > TAPE) this.trace.shift(); }
};
Town.prototype.account = function () { return this.ledger.reduce((a, l) => a.map((v, i) => v + l[i]), [0, 0, 0, 0]); };

let towns = TEMPERS.map(t => new Town(t));
function advance() { step++; tendFood(); for (const o of towns) o.step(); }

// ---------------------------------------------------------------- the drawing: three squares in a row, the account below
let S = 0, boxes = [];
Town.prototype.draw = function (ctx, x0, y0, s) {
  const u = s / G;
  // each town draws its ground on a canvas of its own
  if (!this.off) { this.off = document.createElement("canvas"); this.off.width = G; this.off.height = G; }
  const off = this.off, octx = off.getContext("2d"), img = octx.createImageData(G, G), d = img.data;
  for (let k = 0; k < G * G; k++) {
    const r = Math.sqrt(Math.min(1, this.road[k]));
    for (let c = 0; c < 3; c++) d[k * 4 + c] = Math.round(PAPER[c] + (INK[c] - PAPER[c]) * r);
    d[k * 4 + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.arc(x0 + s / 2, y0 + s / 2, s / 2, 0, 7); ctx.clip();
  ctx.fillStyle = PAPER_S; ctx.fillRect(x0, y0, s, s);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(off, x0, y0, s, s);
  ctx.fillStyle = RED_S; ctx.beginPath();
  for (const a of this.agents) if (!a.load) ctx.rect(x0 + a.x * u - 1.5, y0 + a.y * u - 1.5, 3, 3);
  ctx.fill();
  ctx.fillStyle = INK_S; ctx.beginPath();
  for (const a of this.agents) if (a.load) ctx.rect(x0 + a.x * u - 1.6, y0 + a.y * u - 1.6, 3.2, 3.2);
  ctx.fill();
  // the food, each source breathing, and shrinking as it is eaten and wanes
  for (const src of food) {
    const f = this.left(src);
    if (f < GONE) continue;
    const breath = 1 + .12 * Math.sin(step / 7 + src.id);
    ctx.fillStyle = PAPER_S; ctx.beginPath(); ctx.arc(x0 + src.x * u, y0 + src.y * u, (2 + 6 * f) * breath, 0, 7); ctx.fill();
    ctx.strokeStyle = INK_S; ctx.lineWidth = 1.2; ctx.stroke();
  }
  // the rings: red for a find, ink for a load home, muted for a source gone
  for (const q of this.pulses) {
    const k = q.age / PULSE;
    ctx.globalAlpha = 1 - k; ctx.lineWidth = 1.4;
    ctx.strokeStyle = q.kind === "find" ? RED_S : q.kind === "home" ? INK_S : MUTED;
    ctx.beginPath(); ctx.arc(x0 + q.x * u, y0 + q.y * u, 3 + 14 * k, 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK_S; ctx.beginPath(); ctx.arc(x0 + s / 2, y0 + s / 2, 4, 0, 7); ctx.fill();
  ctx.restore();
};
// the tape under a square: the store over the last two minutes, a sample a second, on one scale across the three
function drawTape(ctx, o, x0, y, s, h, top) {
  ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y + h + .5); ctx.lineTo(x0 + s, y + h + .5); ctx.stroke();
  const n = o.trace.length;
  if (n < 2) return;
  ctx.strokeStyle = INK_S; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = x0 + s * (TAPE - n + i) / (TAPE - 1), yy = y + h - h * Math.min(1, o.trace[i] / top);
    if (i) ctx.lineTo(x, yy); else ctx.moveTo(x, yy);
  }
  ctx.stroke();
}

if (typeof window === "undefined") {
  const reset = tempers => { step = 0; ids = 0; seedFood(); towns = tempers.map(t => new Town(t)); return towns; };
  if (typeof module !== "undefined") module.exports = { advance, get towns() { return towns; }, reset, TEMPERS, tune: (upkeep, dear, walk) => { UPKEEP = upkeep; DEAR = dear; if (walk) WALK = walk; } };
} else window.liveFigure("pace", {
  stepMs: 1000 / 30, maxSteps: 3, stillSteps: 1500,
  size(g) {
    // three discs as large as the height allows, spread evenly across the width
    const FOOT = 100, HEAD = 8, GAP0 = 16;
    S = Math.floor(Math.min((g.W - 2 * GAP0) / 3, g.H - FOOT - HEAD));
    const gap = (g.W - 3 * S) / 2, top = HEAD + (g.H - HEAD - S - FOOT) / 2;
    boxes = [0, 1, 2].map(i => [i * (S + gap), top]);
  },
  step: advance,
  draw(g) {
    const ctx = g.ctx;
    ctx.clearRect(0, 0, g.W, g.H);
    if (S < 40) return;
    const small = S < 130;
    let top = 10;
    for (const o of towns) for (const v of o.trace) if (v > top) top = v;
    towns.forEach((o, i) => {
      const [x0, y0] = boxes[i];
      o.draw(ctx, x0, y0, S);
      g.caps(LABELS[i], x0 + S / 2, y0 + S + 18, "center", INK_S);
      g.caps(`HARVEST ${Math.round(o.store).toLocaleString("en-GB")}`, x0 + S / 2, y0 + S + 36, "center", INK_S);
      if (!small) drawTape(ctx, o, x0, y0 + S + 48, S, 36, top);
    });
  },
});
})();
