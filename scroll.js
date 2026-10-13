/* The down button on the scrolled pages: it says there is more below, and takes the reader to the
   next passage. Scrolling by hand works as well; the button goes at the last passage. */
(function () {
  "use strict";
  const secs = [...document.querySelectorAll(".story section, .scroll-end")];   // .scroll-end: what follows the story, such as a whole page
  if (!secs.length) return;
  const b = document.createElement("button");
  b.className = "down nudge";
  b.setAttribute("aria-label", "next passage");
  b.title = "next";
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(b);
  // the passage in the middle of the window is the current one
  const current = () => {
    const mid = window.innerHeight / 2;
    let k = 0;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= mid) k = i; });
    return k;
  };
  // gone at the last passage, and on a phone after the first, where it would sit over the text
  const update = () => { const k = current(); b.classList.toggle("gone", k >= secs.length - 1 || (innerWidth < 600 && k > 0)); };
  b.addEventListener("click", () => {
    const k = current();
    if (k < secs.length - 1) (secs[k + 1].firstElementChild || secs[k + 1]).scrollIntoView({ behavior: "smooth", block: "start" });
    b.classList.remove("nudge");
  });
  let ticking = false;
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
