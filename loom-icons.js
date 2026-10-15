// Line pictograms for the split-flap tiles.
// One grid: 16 x 18 units centred on (x, y); ground line at +8; stroke 1 unit.
function icon(kind, x, y, s, col) {
  const P = (u, v) => (x + u * s).toFixed(2) + "," + (y + v * s).toFixed(2);
  const n = (v) => (v * s).toFixed(2);
  const g = '<g fill="none" stroke="' + col + '" stroke-width="' + n(1) +
    '" stroke-linecap="round" stroke-linejoin="round">';
  const line = (a, b, c, d) => '<path d="M' + P(a, b) + "L" + P(c, d) + '"/>';
  const poly = (pts, close) => '<path d="M' + pts.map(p => P(p[0], p[1])).join("L") + (close ? "Z" : "") + '"/>';
  const circ = (u, v, r, fill) => '<circle cx="' + (x + u * s).toFixed(2) + '" cy="' + (y + v * s).toFixed(2) +
    '" r="' + n(r) + '"' + (fill ? ' fill="' + col + '"' : "") + "/>";
  const ground = (w) => line(-w, 8, w, 8);
  let b = "";
  switch (kind) {
    case "tree":
      b = circ(0, -3, 5) + line(0, 2, 0, 8) + ground(4);
      break;
    case "bench":
      b = line(-6, -3, 6, -3) + line(-6, -0.5, 6, -0.5) +
        poly([[-7, 3], [7, 3], [7, 4.5], [-7, 4.5]], true) +
        line(-5, -3, -5, 3) + line(5, -3, 5, 3) +
        line(-5, 4.5, -5.5, 8) + line(5, 4.5, 5.5, 8);
      break;
    case "stall": {
      let d = "M" + P(-7, -3) + "L" + P(-6, -7) + "L" + P(6, -7) + "L" + P(7, -3);
      for (let i = 0; i < 4; i++) {
        const u = 7 - 3.5 * (i + 1);
        d += "A" + n(1.75) + "," + n(1.75) + " 0 0 1 " + P(u, -3);
      }
      b = '<path d="' + d + '"/>' + line(-6, -1.25, -6, 8) + line(6, -1.25, 6, 8) +
        poly([[-6, 3], [6, 3]]) + ground(7);
      break;
    }
    case "lamp":
      b = poly([[-3.5, -6], [0, -8.5], [3.5, -6]], true) +
        poly([[-3.5, -6], [3.5, -6], [2.5, -1], [-2.5, -1]], true) +
        circ(0, -3.5, 1.2, true) + line(0, -1, 0, 8) + ground(2.5);
      break;
    case "art":
      b = poly([[0, -5], [3.5, -3], [3.5, 1], [0, 3], [-3.5, 1], [-3.5, -3]], true) +
        poly([[-3.5, -3], [0, -1], [3.5, -3]], false) + line(0, -1, 0, 3) +
        poly([[-3.5, 3], [3.5, 3], [3.5, 8], [-3.5, 8]], true) + ground(6);
      break;
    case "bay": {
      const r = 2.2, a = n(r), yb = 5;
      const body = "M" + P(-7, yb) + "L" + P(-7, 1.5) + "L" + P(-4, 1.5) + "L" + P(-2, -1.5) +
        "L" + P(3, -1.5) + "L" + P(5, 1.5) + "L" + P(7, 2) + "L" + P(7, yb) +
        "L" + P(4 + r, yb) + "A" + a + "," + a + " 0 0 0 " + P(4 - r, yb) +
        "L" + P(-4 + r, yb) + "A" + a + "," + a + " 0 0 0 " + P(-4 - r, yb) + "Z";
      b = '<path d="' + body + '"/>' +
        circ(-4, yb, 1.2, true) + circ(4, yb, 1.2, true) +
        line(-8, 8, 8, 8) + line(-8, 8, -8, 7) + line(8, 8, 8, 7);
      break;
    }
    // the measures of the record, on the same grid: a house, a walker, a coin, a clock, the sun, a car
    case "home":
      b = poly([[-6, 8], [-6, -1], [0, -7], [6, -1], [6, 8]], false) + poly([[-2, 8], [-2, 3], [2, 3], [2, 8]], false) + ground(7);
      break;
    case "walker":
      b = circ(0.5, -6, 1.6) + line(0, -3.5, -1, 2) + line(-1, 2, -4, 8) + line(-1, 2, 2, 5) + line(2, 5, 2.5, 8) +
        line(0, -2.5, -3.5, 0.5) + line(0, -2.5, 3.5, -0.5);
      break;
    case "crowd":
      b = circ(-3.5, -4.5, 1.5) + line(-3.5, -2.5, -3.5, 3) + line(-3.5, 3, -5, 8) + line(-3.5, 3, -2, 8) +
        circ(3.5, -4.5, 1.5) + line(3.5, -2.5, 3.5, 3) + line(3.5, 3, 2, 8) + line(3.5, 3, 5, 8) + line(-6, -1, 6, -1);
      break;
    case "coin":
      b = circ(0, 0, 6.5) + circ(0, 0, 4.2) + line(0, -2.2, 0, 2.2);
      break;
    case "clock":
      b = circ(0, 0, 6.5) + line(0, 0, 0, -4) + line(0, 0, 3, 1.5);
      break;
    case "sun": {
      b = circ(0, 0, 3.2);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; b += line(Math.cos(a) * 5, Math.sin(a) * 5, Math.cos(a) * 7.2, Math.sin(a) * 7.2); }
      break;
    }
    case "car": {
      const r = 2.2, a = n(r), yb = 3;
      const body = "M" + P(-7, yb) + "L" + P(-7, -.5) + "L" + P(-4, -.5) + "L" + P(-2, -3.5) +
        "L" + P(3, -3.5) + "L" + P(5, -.5) + "L" + P(7, 0) + "L" + P(7, yb) +
        "L" + P(4 + r, yb) + "A" + a + "," + a + " 0 0 0 " + P(4 - r, yb) +
        "L" + P(-4 + r, yb) + "A" + a + "," + a + " 0 0 0 " + P(-4 - r, yb) + "Z";
      b = '<path d="' + body + '"/>' + circ(-4, yb, 1.2, true) + circ(4, yb, 1.2, true);
      break;
    }
    default:
      return "";
  }
  return g + b + "</g>";
}
if (typeof module !== "undefined") module.exports = { icon };
