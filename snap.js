//C:\Users\marco\MARCONA\MARCONA 2D\snap.js 18.2.2026 klo 13:35
// =========================================================
// MARCONA 2D — Snap Core v1
// =========================================================

import { distance } from "./geometry.js";

// ---------------------------------------------------------
// SnapManager
// ---------------------------------------------------------

export class SnapManager {
  constructor(editor) {
    this.editor = editor;

    // Snap settings (loaded from localStorage by main.js)
    this.settings = {
      snapEndpoint: true,
      snapMidpoint: true,
      snapCenter: true,
      snapGrid: false,
      gridSize: 1000,
      snapTolerance: 10
    };

    this.currentSnap = null;
    this.overlay = document.getElementById("snap-overlay");
    this.ctx = this.overlay.getContext("2d");

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  // -------------------------------------------------------
  // Resize overlay canvas
  // -------------------------------------------------------
  resize() {
    const rect = this.overlay.getBoundingClientRect();
    this.overlay.width = rect.width;
    this.overlay.height = rect.height;
  }

  // -------------------------------------------------------
  // Collect snap points from all shapes
  // -------------------------------------------------------
  collectSnapPoints() {
    const snaps = [];

    for (const shape of this.editor.shapes) {
      const pts = shape.getSnapPoints();
      for (const p of pts) {
        if (p.type === "endpoint" && this.settings.snapEndpoint) snaps.push(p);
        if (p.type === "midpoint" && this.settings.snapMidpoint) snaps.push(p);
        if (p.type === "center" && this.settings.snapCenter) snaps.push(p);
      }
    }

    return snaps;
  }

  // -------------------------------------------------------
  // Grid snap
  // -------------------------------------------------------
  getGridSnap(world) {
    if (!this.settings.snapGrid) return null;

    const size = this.settings.gridSize;
    const gx = Math.round(world.x / size) * size;
    const gy = Math.round(world.y / size) * size;

    return {
      type: "grid",
      x: gx,
      y: gy
    };
  }

  // -------------------------------------------------------
  // Find nearest snap point
  // -------------------------------------------------------
  findSnap(world) {
    const snaps = this.collectSnapPoints();
    let best = null;
    let bestDist = Infinity;

    // Object snaps
    for (const s of snaps) {
      const d = distance(world, s);
      if (d < this.settings.snapTolerance && d < bestDist) {
        best = s;
        bestDist = d;
      }
    }

    // Grid snap (lower priority)
    const grid = this.getGridSnap(world);
    if (grid) {
      const d = distance(world, grid);
      if (d < this.settings.snapTolerance && d < bestDist) {
        best = grid;
        bestDist = d;
      }
    }

    this.currentSnap = best;
    return best;
  }

  // -------------------------------------------------------
  // Draw snap indicator
  // -------------------------------------------------------
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);

    if (!this.currentSnap) return;

    const p = this.editor.worldToCanvas(this.currentSnap);

    ctx.save();
    ctx.strokeStyle = "yellow";
    ctx.fillStyle = "yellow";
    ctx.lineWidth = 2;

    switch (this.currentSnap.type) {
      case "endpoint":
        ctx.beginPath();
        ctx.rect(p.x - 4, p.y - 4, 8, 8);
        ctx.stroke();
        break;

      case "midpoint":
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 5);
        ctx.lineTo(p.x + 5, p.y + 5);
        ctx.lineTo(p.x - 5, p.y + 5);
        ctx.closePath();
        ctx.stroke();
        break;

      case "center":
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case "grid":
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }
}
