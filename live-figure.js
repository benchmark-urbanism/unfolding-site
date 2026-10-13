/* The frame shared by the overview's live models (weaver.js, ca-live.js, beady.js, street-feedback.js): the canvas
   sized to its box and the display's density, small-capital labels that are shortened when they would not fit, and a
   loop that runs the model at a set number of steps a second whatever the display's rate, only while the figure is in
   view. With reduced motion the model is run some way and drawn once. There is no control: api.paused is kept for a
   model that wants to hold its loop, and nothing on the page sets it.

     liveFigure(id, model) -> api
       model.stepMs      milliseconds a step
       model.maxSteps    the most steps caught up in one frame (default 6)
       model.stillSteps  steps run for the still shown with reduced motion
       model.size(api)   called when the canvas has its size, with api.W and api.H set
       model.step()      one step of the model
       model.draw(api)   draws everything
       model.wake()      if given, called each time the figure comes into view
     api.ctx, api.canvas, api.fig, api.W, api.H, api.paused
     api.caps(text, x, y, align, colour)   a small-capitals label
     api.fit(text, short, width)           text if it fits in width, else short, else ""
     api.redraw()                          draw now */
(function () {
"use strict";
const CAPS = "500 12px 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif", INK = "#1c1a17";
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
window.liveFigure = function (id, model) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const fig = canvas.closest("figure"), ctx = canvas.getContext("2d");
  const api = { ctx, canvas, fig, W: 0, H: 0, paused: false };
  const on = () => fig.classList.contains("on");
  api.caps = (text, x, y, align, colour) => {
    ctx.font = CAPS; ctx.fillStyle = colour || INK; ctx.textAlign = align || "left";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "1.5px";
    ctx.fillText(text, x, y);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  };
  api.fit = (text, short, width) => {
    ctx.font = CAPS;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "1.5px";
    const w = s => ctx.measureText(s).width;
    const out = w(text) <= width ? text : w(short) <= width ? short : "";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    return out;
  };
  api.redraw = () => model.draw(api);
  function size() {
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    api.W = r.width; api.H = r.height;
    canvas.width = Math.round(api.W * dpr); canvas.height = Math.round(api.H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    model.size(api);
  }
  // the loop: steps are owed at a fixed rate, caught up a few at a time, and the backlog is dropped while paused or
  // out of view
  let running = false, prev = 0, acc = 0;
  const maxSteps = model.maxSteps || 6;
  function frame(t) {
    if (!on() || api.paused) { running = false; return; }
    if (prev) acc += Math.min(250, t - prev);
    prev = t;
    let n = 0;
    while (acc >= model.stepMs && n < maxSteps) { model.step(); acc -= model.stepMs; n++; }
    if (acc > model.stepMs) acc = model.stepMs;
    if (n) model.draw(api);
    requestAnimationFrame(frame);
  }
  function start() { if (!running && on() && !api.paused && !still) { running = true; prev = 0; acc = 0; requestAnimationFrame(frame); } }
  // the figure coming into view wakes the model, if it asks to be woken, and starts the loop
  let wasOn = on();
  new MutationObserver(() => {
    const now = on();
    if (now && !wasOn && model.wake) { model.wake(); model.draw(api); }
    wasOn = now;
    start();
  }).observe(fig, { attributes: true, attributeFilter: ["class"] });
  addEventListener("resize", () => {
    const r = canvas.getBoundingClientRect();
    if (Math.round(r.width) === Math.round(api.W) && Math.round(r.height) === Math.round(api.H)) return;   // a phone's address bar coming and going
    size(); model.draw(api);
  });
  size();
  if (still) for (let i = 0; i < (model.stillSteps || 0); i++) model.step();
  model.draw(api);
  document.fonts.load(CAPS).then(() => model.draw(api)).catch(() => {});
  start();
  return api;
};
})();
