//C:\Users\marco\MARCONA\MARCONA 2D\geometry.js 18.2.2026 klo 13:35
// =========================================================
// MARCONA 2D — Geometry Core v1
// =========================================================

// ---------------------------------------------------------
// Utility functions
// ---------------------------------------------------------

export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function pointOnLine(a, b, x, y) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return false;

  const t = ((x - a.x) * dx + (y - a.y) * dy) / len2;
  if (t < 0 || t > 1) return false;

  const px = a.x + t * dx;
  const py = a.y + t * dy;

  return { x: px, y: py, t };
}

// ---------------------------------------------------------
// Line
// ---------------------------------------------------------

export class Line {
  constructor(a, b, color = "#ffffff") {
    this.a = { ...a };
    this.b = { ...b };
    this.color = color;
  }

  draw(ctx, highlight = false) {
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
    ctx.strokeStyle = highlight ? "yellow" : this.color;
    ctx.lineWidth = highlight ? 2 : 1;
    ctx.stroke();
  }

  hitTest(x, y, tol = 5) {
    const p = pointOnLine(this.a, this.b, x, y);
    if (!p) return false;
    return Math.hypot(x - p.x, y - p.y) <= tol;
  }

  getSnapPoints() {
    return [
      { type: "endpoint", x: this.a.x, y: this.a.y },
      { type: "endpoint", x: this.b.x, y: this.b.y },
      { type: "midpoint", ...midpoint(this.a, this.b) }
    ];
  }
}

// ---------------------------------------------------------
// Polyline
// ---------------------------------------------------------

export class Polyline {
  constructor(points = [], closed = false, color = "#ffffff") {
    this.points = points.map(p => ({ ...p }));
    this.closed = closed;
    this.color = color;
  }

  draw(ctx, highlight = false) {
    if (this.points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }

    if (this.closed) {
      ctx.lineTo(this.points[0].x, this.points[0].y);
    }

    ctx.strokeStyle = highlight ? "yellow" : this.color;
    ctx.lineWidth = highlight ? 2 : 1;
    ctx.stroke();
  }

  hitTest(x, y, tol = 5) {
    for (let i = 0; i < this.points.length - 1; i++) {
      const seg = new Line(this.points[i], this.points[i + 1]);
      if (seg.hitTest(x, y, tol)) return true;
    }

    if (this.closed) {
      const seg = new Line(
        this.points[this.points.length - 1],
        this.points[0]
      );
      if (seg.hitTest(x, y, tol)) return true;
    }

    return false;
  }

  getSnapPoints() {
    const snaps = [];

    // Endpoints
    for (const p of this.points) {
      snaps.push({ type: "endpoint", x: p.x, y: p.y });
    }

    // Midpoints
    for (let i = 0; i < this.points.length - 1; i++) {
      snaps.push({
        type: "midpoint",
        ...midpoint(this.points[i], this.points[i + 1])
      });
    }

    if (this.closed) {
      snaps.push({
        type: "midpoint",
        ...midpoint(
          this.points[this.points.length - 1],
          this.points[0]
        )
      });
    }

    return snaps;
  }
}

// ---------------------------------------------------------
// Circle
// ---------------------------------------------------------

export class Circle {
  constructor(center, radius, color = "#ffffff") {
    this.center = { ...center };
    this.radius = radius;
    this.color = color;
  }

  draw(ctx, highlight = false) {
    ctx.beginPath();
    ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = highlight ? "yellow" : this.color;
    ctx.lineWidth = highlight ? 2 : 1;
    ctx.stroke();
  }

  hitTest(x, y, tol = 5) {
    const d = Math.hypot(x - this.center.x, y - this.center.y);
    return Math.abs(d - this.radius) <= tol;
  }

  getSnapPoints() {
    return [
      { type: "center", x: this.center.x, y: this.center.y }
    ];
  }
}
