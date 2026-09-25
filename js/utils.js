// utils.js — shared math/helpers used across the game
'use strict';

const Utils = {
  rand(min, max) { return Math.random() * (max - min) + min; },
  randInt(min, max) { return Math.floor(Utils.rand(min, max + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
  lerp(a, b, t) { return a + (b - a) * t; },
  dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); },
  dist2(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; },
  angle(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); },
  angleLerp(a, b, t) {
    let diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return a + diff * t;
  },
  circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
    const nx = Utils.clamp(cx, rx, rx + rw);
    const ny = Utils.clamp(cy, ry, ry + rh);
    const dx = cx - nx, dy = cy - ny;
    return (dx * dx + dy * dy) < (cr * cr);
  },
  // Resolve a moving circle against an axis-aligned rect; returns corrected {x,y}
  resolveCircleRect(cx, cy, cr, rx, ry, rw, rh) {
    const nx = Utils.clamp(cx, rx, rx + rw);
    const ny = Utils.clamp(cy, ry, ry + rh);
    let dx = cx - nx, dy = cy - ny;
    let d = Math.hypot(dx, dy);
    if (d === 0) {
      // center is inside rect; push out along shortest side
      const left = cx - rx, right = (rx + rw) - cx;
      const top = cy - ry, bottom = (ry + rh) - cy;
      const min = Math.min(left, right, top, bottom);
      if (min === left) return { x: rx - cr, y: cy };
      if (min === right) return { x: rx + rw + cr, y: cy };
      if (min === top) return { x: cx, y: ry - cr };
      return { x: cx, y: ry + rh + cr };
    }
    if (d < cr) {
      const push = (cr - d) / d;
      return { x: cx + dx * push, y: cy + dy * push };
    }
    return { x: cx, y: cy };
  },
  formatTime(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  },
  formatMoney(v) { return '$' + Math.floor(v).toLocaleString('en-US'); }
};
