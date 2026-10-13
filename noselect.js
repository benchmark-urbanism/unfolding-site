/* Clicking should neither select anything nor leave the focus on a button. The boards, plates and controls take no
   selection; a press on a button, a board or a canvas keeps the focus where it was and starts no selection; a double
   click selects nothing anywhere. Text fields and links work as usual, and the text of a story or notes can still be
   selected by dragging across it. Shared by every page. */
(function () {
  "use strict";
  const css =
    "button, svg, canvas, nav, header, .board, .tools, .hold, .stage, .plate, .side, .kit, .verbs, .picks, .down, .caption, .dash, .transport {" +
    " -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }" +
    " button:focus:not(:focus-visible) { outline: none; }" +
    " button, .tools, .picks, .case, .down { touch-action: manipulation; }";   // two quick taps on a control do not zoom the page
  const s = document.createElement("style");
  s.textContent = css;
  document.head.appendChild(s);
  const typing = t => t.closest && t.closest("input, textarea, select, [contenteditable], a");
  const control = t => t.closest && t.closest("button, svg, canvas, .board, .tools, .stage, .plate, .side, .dash");
  document.addEventListener("mousedown", e => {
    const t = e.target;
    if (!t || typing(t)) return;
    if (e.detail > 1 || control(t)) e.preventDefault();
  });
})();
