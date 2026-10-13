/* A Jacquard loom live beside its case, drawn as on the Jacquard page: a chain of cards at the left, their punch
   columns numbered, the thread mapping above the cloth, and the cloth itself, each row woven by one card in turn,
   warp threads lifted where the card has a hole. The cloth stands complete. Every second or so one card's holes are
   punched or filled, and the cloth is woven again from the top, a row at a time, so a new pattern unfolds in answer.
   The holes are not chosen at random: the chain is always on its way from one weave to another (twills, herringbone,
   diamond, zigzag, check, plain, basket, satin, rib, and now and then chance), a card at a time, so that each step is
   a coherent change and each cloth a pattern of its own. Most of the weaves it moves to need the cards changed; a few
   need only the mapping of threads to punch columns, straight, pointed, or in blocks, which changes first and blips
   red as it does. Cards are added or taken off the chain as the next weave needs.

   Runs on each svg.loom-patch while its figure is in view. With motion turned down the cloth stands still. */
(function () {
"use strict";
const WARPS = 36, PICKS = 24, HOOKS = 4;
const ROWMS = 40;
const WARP = "#1c1a17", WEFT = "#efe5c8", PAPER = "#f6efdc", CARD = "#eadcb8", CARDLINE = "#c9b98f", HOLE = "#b9a877", LINE = "#cfc7ad", MUTED = "#6f6a60", GREY = "#9b968e", RED = "#e01b24", WARM = "#d98c3a";
const NS = "http://www.w3.org/2000/svg";
const el = (name, at, parent) => { const e = document.createElementNS(NS, name); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
const rnd = Math.random, between = r => r[0] + rnd() * (r[1] - r[0]), pick = a => a[Math.floor(rnd() * a.length)];
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
// the weaves the loom moves between. Each is a chain of cards and, where the weave needs it, the thread mapping that
// makes it: a point twill on a pointed mapping is a diamond, a twill on a mapping in blocks is a check. One is chance
const WEAVES = [
  { name: "twill", cards: ["1100", "0110", "0011", "1001"], map: "straight" },
  { name: "twill the other way", cards: ["1001", "0011", "0110", "1100"], map: "straight" },
  { name: "herringbone", cards: ["1100", "0110", "0011", "1001"], map: "pointed" },
  { name: "diamond", cards: ["1100", "0110", "0011", "1001", "0011", "0110"], map: "pointed" },
  { name: "zigzag", cards: ["1100", "0110", "0011", "1001", "0011", "0110"], map: "straight" },
  { name: "check", cards: ["1100", "0110", "0011", "1001"], map: "blocks" },
  { name: "plain", cards: ["1010", "0101"] },
  { name: "basket", cards: ["1100", "1100", "0011", "0011"] },
  { name: "satin", cards: ["1000", "0100", "0010", "0001"] },
  { name: "broken satin", cards: ["1000", "0010", "0100", "0001"] },
  { name: "heavy twill", cards: ["1110", "0111", "1011", "1101"], map: "straight" },
  { name: "rib", cards: ["1100", "0011"] },
  { name: "chance", cards: null },
];
const chance = () => { const n = 4 + Math.floor(Math.random() * 3), out = []; while (out.length < n) { const c = Array.from({ length: HOOKS }, () => Math.random() < .5 ? 1 : 0); const k = c.reduce((a, b) => a + b, 0); if (k > 0 && k < HOOKS) out.push(c.join("")); } return out; };
// the thread mapping, as on the Jacquard page: which punch column each warp thread is mapped to
const THREADINGS = {
  straight: j => j % HOOKS,
  pointed: j => { const p = 2 * HOOKS - 2, k = j % p; return k < HOOKS ? k : p - k; },
  blocks: j => 2 * (Math.floor(j / 4) % (HOOKS / 2)) + (j % 2),
};

for (const sv of document.querySelectorAll("svg.loom-patch")) run(sv);
function run(sv) {
  const fig = sv.closest("figure");
  const CX = 10, TOP = 1.2, MAP = TOP + 1.6, CLY = MAP + 1.6;
  const CARDX = 0.6, CARDW = 7.2, CARDH = 1.2, CARDGAP = .5, PITCH = 1.1;
  sv.setAttribute("viewBox", `0 0 ${CX + WARPS + .6} ${CLY + PICKS + .6}`);
  sv.setAttribute("font-family", "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif");
  let threading = "straight", thr = Array.from({ length: WARPS }, (_, j) => THREADINGS[threading](j));
  let cards = WEAVES[0].cards.map(c => [...c].map(Number));
  const gC = el("g", {}, sv), gT = el("g", {}, sv), gW = el("g", {}, sv);
  const hookX = h => CARDX + 1.6 + h * PITCH;
  function drawCards() {
    while (gC.firstChild) gC.firstChild.remove();
    for (let h = 0; h < HOOKS; h++) { const t = el("text", { x: hookX(h), y: TOP + .55, "font-size": .55, fill: MUTED, "text-anchor": "middle" }, gC); t.textContent = h + 1; }
    cards.forEach((c, k) => {
      const y = TOP + .9 + k * (CARDH + CARDGAP);
      el("rect", { x: CARDX, y, width: CARDW, height: CARDH, rx: .18, fill: CARD, stroke: CARDLINE, "stroke-width": .04 }, gC);
      el("circle", { cx: CARDX + .3, cy: y + CARDH / 2, r: .1, fill: HOLE }, gC);
      el("circle", { cx: CARDX + CARDW - .3, cy: y + CARDH / 2, r: .1, fill: HOLE }, gC);
      const no = el("text", { x: CARDX - .25, y: y + CARDH / 2 + .2, "font-size": .55, fill: MUTED, "text-anchor": "end" }, gC); no.textContent = k + 1;
      for (let h = 0; h < HOOKS; h++) el("circle", { cx: hookX(h), cy: y + CARDH / 2, r: .38, fill: c[h] ? WARP : PAPER, stroke: c[h] ? WARP : HOLE, "stroke-width": .05, "data-k": k, "data-h": h }, gC);
    });
  }
  function drawMapping(cur) {
    while (gT.firstChild) gT.firstChild.remove();
    const lifts = cards[cur];
    for (let j = 0; j < WARPS; j++) {
      const up = !!lifts[thr[j]], x = CX + j;
      el("line", { x1: x + .5, x2: x + .5, y1: MAP + 1.2, y2: CLY - .05, stroke: up ? WARP : GREY, "stroke-width": up ? .09 : .035, opacity: up ? 1 : .7 }, gT);
      el("line", { x1: x + .5, x2: x + .5, y1: CLY, y2: CLY + PICKS, stroke: GREY, "stroke-width": .035, opacity: .7 }, gT);
      el("rect", { x: x + .06, y: MAP + .1, width: .88, height: 1.05, rx: .16, fill: up ? WARP : PAPER, class: "mapcell" }, gT);
      const t = el("text", { x: x + .5, y: MAP + .85, "font-size": .55, fill: up ? PAPER : MUTED, "text-anchor": "middle" }, gT); t.textContent = thr[j] + 1;
    }
  }
  let weaving = null;
  function drawCloth(animate) {
    while (gW.firstChild) gW.firstChild.remove();
    const K = cards.length, order = [];
    for (let i = 0; i < PICKS; i++) {
      el("line", { x1: CX - .1, x2: CX + WARPS, y1: CLY + i + 1, y2: CLY + i + 1, stroke: LINE, "stroke-width": .03 }, gW);
      const t = el("text", { x: CX - .3, y: CLY + i + .72, "font-size": .5, fill: MUTED, "text-anchor": "end" }, gW); t.textContent = (i % K) + 1;
      const card = cards[i % K], y = CLY + i, row = [];
      for (let j = 0; j < WARPS; j++) {
        const up = card[thr[j]], x = CX + j, at = animate ? { opacity: 0 } : {};
        row.push(up ? el("rect", Object.assign({ x: x + .2, y: y + .02, width: .6, height: .96, rx: .28, fill: WARP }, at), gW)
                    : el("rect", Object.assign({ x: x + .02, y: y + .2, width: .96, height: .6, rx: .28, fill: WEFT }, at), gW));
      }
      order.push(...(i % 2 ? row.reverse() : row));
    }
    el("rect", { x: CX - .12, y: CLY - .06, width: WARPS + .24, height: K + .12, rx: .2, fill: "none", stroke: WARM, "stroke-width": .06, "stroke-dasharray": ".3 .2" }, gW);
    if (weaving) cancelAnimationFrame(weaving.id);
    weaving = null;
    if (!animate) return;
    const t0 = performance.now(), per = ROWMS / WARPS;
    let done = 0;
    const go = now => {
      const n = Math.min(order.length, Math.floor((now - t0) / per));
      for (; done < n; done++) order[done].removeAttribute("opacity");
      weaving = done < order.length ? { id: requestAnimationFrame(go) } : null;
    };
    weaving = { id: requestAnimationFrame(go) };
  }
  function draw(animate) { drawCards(); drawMapping(0); drawCloth(animate); }
  draw(false);
  if (still) return;

  // the play: the chain is always on its way from one weave to another. Each move punches or fills the holes of one
  // card, the first card that differs from the next weave, so that every state between the two is a step of a
  // coherent change and the cloth answers with a pattern of its own. When the chain has arrived it is held a moment,
  // then a new weave is chosen, three times in four one that needs the cards changed and not only the mapping
  let timer = null, busy = 0, target = null, tmap = null;
  const same = (a, b) => a.length === b.length && a.every((c, k) => c.join("") === b[k].join(""));
  const asCards = w => w.cards.map(c => [...c].map(Number));
  function chooseTarget() {
    const differs = WEAVES.filter(w => w.cards === null || !same(asCards(w), cards) || (w.map && w.map !== threading));
    const punched = differs.filter(w => w.cards === null || !same(asCards(w), cards));
    const w = pick(punched.length && rnd() < .75 ? punched : differs);
    target = (w.cards || chance()).map(c => [...c].map(Number));
    tmap = w.map || null;
  }
  // the mapping blips red as it changes, every cell and every number
  function remap(name) {
    threading = name; thr = Array.from({ length: WARPS }, (_, j) => THREADINGS[threading](j));
    drawMapping(0);
    for (const c of gT.querySelectorAll(".mapcell")) c.animate({ fill: [RED, RED, c.getAttribute("fill")], stroke: [RED, RED, "transparent"], strokeWidth: [.14, .14, 0] }, { duration: 1100, easing: "ease-out" });
    for (const t of gT.querySelectorAll("text")) t.animate({ fill: [PAPER, PAPER, t.getAttribute("fill")] }, { duration: 1100, easing: "ease-out" });
    setTimeout(() => drawCloth(true), 300);
  }
  function move() {
    if (!target) chooseTarget();
    // first the mapping, if the weave asks for one
    if (tmap && tmap !== threading) { remap(tmap); busy = performance.now() + 1700; return; }
    // then the length of the chain: a blank card added, or the last card taken off
    if (cards.length < target.length) { cards.push(Array(HOOKS).fill(0)); drawCards(); busy = performance.now() + 450; return; }
    if (cards.length > target.length) { cards.pop(); drawCards(); drawMapping(0); setTimeout(() => drawCloth(true), 200); busy = performance.now() + 1100; return; }
    // then the holes, a card at a time: every hole that differs on the first card that differs
    const hits = [];
    for (let k = 0; k < cards.length && !hits.length; k++)
      for (let h = 0; h < HOOKS; h++) if (cards[k][h] !== target[k][h]) hits.push([k, h]);
    if (!hits.length) { target = null; busy = performance.now() + 1900; return; }
    for (const [k, h] of hits) cards[k][h] = target[k][h];
    drawCards();
    for (const [k, h] of hits) {
      const o = gC.querySelector(`circle[data-k="${k}"][data-h="${h}"]`);
      if (o) o.animate({ r: [.38, .78, .38], stroke: [RED, RED, cards[k][h] ? WARP : HOLE], strokeWidth: [.05, .14, .05] }, { duration: 750, easing: "ease-out" });
    }
    drawMapping(0);
    setTimeout(() => drawCloth(true), 200);
    const arrived = same(cards, target);
    busy = performance.now() + (arrived ? 2100 : 1100);
    if (arrived) target = null;
  }
  function tick() {
    if (fig && !fig.classList.contains("on")) { timer = null; return; }
    const now = performance.now();
    if (now >= busy) move();
    timer = setTimeout(tick, 100);
  }
  const start = () => { if (!timer && (!fig || fig.classList.contains("on"))) { if (!busy) busy = performance.now() + 900; timer = setTimeout(tick, 100); } };
  new MutationObserver(start).observe(fig || sv, { attributes: true, attributeFilter: ["class"] });
  start();
}
})();
