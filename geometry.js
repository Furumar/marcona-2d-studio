/* FILE: C:\Users\marco\MARCONA\MARCONA 2D\geometry.js — 2026-02-18 09:50 */

export class Line {
  constructor(id, x1, y1, x2, y2) {
    this.type = "line";
    this.id = id;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  get bbox() {
    const minX = Math.min(this.x1, this.x2);
    const maxX = Math.max(this.x1, this.x2);
    const minY = Math.min(this.y1, this.y2);
    const maxY = Math.max(this.y1, this.y2);
    return { minX, minY, maxX, maxY };
  }

  toJSON() {
    return { ...this };
  }
}

export class Polyline {
  constructor(id, points = []) {
    this.type = "polyline";
    this.id = id;
    this.points = points;
  }

  get bbox() {
    if (this.points.length < 2) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    let minX = this.points[0];
    let minY = this.points[1];
    let maxX = this.points[0];
    let maxY = this.points[1];
    for (let i = 0; i < this.points.length; i += 2) {
      const x = this.points[i];
      const y = this.points[i + 1];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    return { minX, minY, maxX, maxY };
  }

  toJSON() {
    return { ...this };
  }
}

export class Circle {
  constructor(id, cx, cy, r) {
    this.type = "circle";
    this.id = id;
    this.cx = cx;
    this.cy = cy;
    this.r = r;
  }

  get bbox() {
    return {
      minX: this.cx - this.r,
      minY: this.cy - this.r,
      maxX: this.cx + this.r,
      maxY: this.cy + this.r,
    };
  }

  toJSON() {
    return { ...this };
  }
}

export function hitTestShape(shape, x, y, tol = 5) {
  if (shape.type === "line") return hitTestLine(shape, x, y, tol);
  if (shape.type === "polyline") return hitTestPolyline(shape, x, y, tol);
  if (shape.type === "circle") return hitTestCircle(shape, x, y, tol);
  return false;
}

function hitTestLine(line, x, y, tol) {
  const { x1, y1, x2, y2 } = line;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return false;
  const t = ((x - x1) * dx + (y - y1) * dy) / len2;
  if (t < 0 || t > 1) return false;
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  const dist = Math.hypot(x - px, y - py);
  return dist <= tol;
}

function hitTestPolyline(poly, x, y, tol) {
  const pts = poly.points;
  for (let i = 0; i < pts.length - 2; i += 2) {
    const seg = new Line(-1, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
    if (hitTestLine(seg, x, y, tol)) return true;
  }
  return false;
}

function hitTestCircle(circle, x, y, tol) {
  const dx = x - circle.cx;
  const dy = y - circle.cy;
  const dist = Math.hypot(dx, dy);
  return Math.abs(dist - circle.r) <= tol;
}
