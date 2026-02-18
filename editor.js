// C:\Users\marco\MARCONA\MARCONA 2D\editor.js 18.2.2026 klo 13:35

// =========================================================
// MARCONA 2D — Editor Core v1
// =========================================================

import { Line, Polyline, Circle, distance } from "./geometry.js";
import { SnapManager } from "./snap.js";

export class Editor {
  constructor(canvas, snapOverlay, selectionInfoEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.snapOverlay = snapOverlay;
    this.selectionInfoEl = selectionInfoEl;

    // World transform
    this.offset = { x: 0, y: 0 };

    // Shapes
    this.shapes = [];
    this.selection = null;

    // Tools
    this.tool = "select";
    this.isPanning = false;
    this.panStart = null;

    // Line/polyline state
    this.isDrawing = false;
    this.currentLineStart = null;
    this.currentPolyline = null;
    this.polylineClosed = false;

    // Circle state
    this.circleStart = null;

    // Undo/redo
    this.undoStack = [];
    this.redoStack = [];

    // Snap
    this.snap = new SnapManager(this);

    // RMB = Enter (default OFF, main.js loads settings)
    this.rmbBehavior = "enter";

    this._bindEvents();
    this.resize();
    this.draw();
  }

  // -------------------------------------------------------
  // Coordinate transforms
  // -------------------------------------------------------
  canvasToWorld(x, y) {
    return {
      x: x - this.offset.x,
      y: y - this.offset.y
    };
  }

  worldToCanvas(p) {
    return {
      x: p.x + this.offset.x,
      y: p.y + this.offset.y
    };
  }

  // -------------------------------------------------------
  // Resize
  // -------------------------------------------------------
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    const orect = this.snapOverlay.getBoundingClientRect();
    this.snapOverlay.width = orect.width;
    this.snapOverlay.height = orect.height;

    this.draw();
  }

  // -------------------------------------------------------
  // Undo/Redo
  // -------------------------------------------------------
  pushUndo() {
    this.undoStack.push(JSON.stringify(this.shapes));
    this.redoStack = [];
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(JSON.stringify(this.shapes));
    this.shapes = JSON.parse(this.undoStack.pop());
    this.draw();
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(JSON.stringify(this.shapes));
    this.shapes = JSON.parse(this.redoStack.pop());
    this.draw();
  }

  // -------------------------------------------------------
  // Tool switching
  // -------------------------------------------------------
  setTool(tool) {
    // If switching away from polyline, finalize it
    if (this.tool === "polyline" && this.currentPolyline) {
      this.finishPolyline();
    }

    this.tool = tool;
    this.isDrawing = false;
    this.currentLineStart = null;
    this.circleStart = null;

    this.draw();
  }

  // -------------------------------------------------------
  // Mouse events
  // -------------------------------------------------------
  _bindEvents() {
    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.canvas.addEventListener("mouseup", (e) => this.onMouseUp(e));
    this.canvas.addEventListener("dblclick", () => this.onDoubleClick());
    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.onRightClick();
    });

    window.addEventListener("resize", () => this.resize());
  }

  onMouseDown(e) {
    const { x, y } = this._mouseWorld(e);

    // Pan
    if (this.tool === "pan") {
      this.isPanning = true;
      this.panStart = { cx: e.clientX, cy: e.clientY, ox: this.offset.x, oy: this.offset.y };
      return;
    }

    // Eraser
    if (this.tool === "eraser") {
      const hit = this.pickShape(x, y);
      if (hit) {
        this.pushUndo();
        this.shapes.splice(hit.index, 1);
        this.draw();
      }
      return;
    }

    // Select
    if (this.tool === "select") {
      const hit = this.pickShape(x, y);
      this.selection = hit ? hit.shape : null;
      this.updateSelectionInfo();
      this.draw();
      return;
    }

    // Line (drag start)
    if (this.tool === "line") {
      this.isDrawing = true;
      this.currentLineStart = this._applySnap({ x, y });
      return;
    }

    // Polyline (drag or click start)
    if (this.tool === "polyline") {
      const p = this._applySnap({ x, y });

      if (!this.currentPolyline) {
        this.currentPolyline = new Polyline([p], false);
        this.isDrawing = true;
      } else {
        this.currentPolyline.points.push(p);
      }

      this.draw();
      return;
    }

    // Circle
    if (this.tool === "circle") {
      this.isDrawing = true;
      this.circleStart = this._applySnap({ x, y });
      return;
    }
  }

  onMouseMove(e) {
    const { x, y } = this._mouseWorld(e);

    // Pan
    if (this.isPanning) {
      const dx = e.clientX - this.panStart.cx;
      const dy = e.clientY - this.panStart.cy;
      this.offset.x = this.panStart.ox + dx;
      this.offset.y = this.panStart.oy + dy;
      this.draw();
      return;
    }

    // Snap update
    const snapPoint = this.snap.findSnap({ x, y });
    this.snap.draw();

    // Line preview
    if (this.tool === "line" && this.isDrawing && this.currentLineStart) {
      this.draw();
      this._drawPreviewLine(this.currentLineStart, this._applySnap({ x, y }));
      return;
    }

    // Polyline preview
    if (this.tool === "polyline" && this.currentPolyline) {
      this.draw();
      const last = this.currentPolyline.points[this.currentPolyline.points.length - 1];
      this._drawPreviewLine(last, this._applySnap({ x, y }));
      return;
    }

    // Circle preview
    if (this.tool === "circle" && this.isDrawing && this.circleStart) {
      this.draw();
      const r = distance(this.circleStart, this._applySnap({ x, y }));
      this._drawPreviewCircle(this.circleStart, r);
      return;
    }
  }

  onMouseUp(e) {
    const { x, y } = this._mouseWorld(e);

    // Line finish
    if (this.tool === "line" && this.isDrawing) {
      const end = this._applySnap({ x, y });
      this.pushUndo();
      this.shapes.push(new Line(this.currentLineStart, end));
      this.isDrawing = false;
      this.currentLineStart = null;
      this.draw();
      return;
    }

    // Circle finish
    if (this.tool === "circle" && this.isDrawing) {
      const end = this._applySnap({ x, y });
      const r = distance(this.circleStart, end);
      this.pushUndo();
      this.shapes.push(new Circle(this.circleStart, r));
      this.isDrawing = false;
      this.circleStart = null;
      this.draw();
      return;
    }
  }

  onDoubleClick() {
    if (this.tool === "polyline" && this.currentPolyline) {
      this.finishPolyline();
    }
  }

  onRightClick() {
    if (this.tool === "polyline" && this.currentPolyline) {
      if (this.rmbBehavior === "enter") {
        this.finishPolyline();
      }
    }
  }

  // -------------------------------------------------------
  // Polyline finalize
  // -------------------------------------------------------
  finishPolyline() {
    if (!this.currentPolyline) return;

    if (this.currentPolyline.points.length >= 2) {
      this.pushUndo();
      this.shapes.push(this.currentPolyline);
    }

    this.currentPolyline = null;
    this.isDrawing = false;
    this.draw();
  }

  // -------------------------------------------------------
  // Snap application
  // -------------------------------------------------------
  _applySnap(p) {
    return this.snap.currentSnap ? { x: this.snap.currentSnap.x, y: this.snap.currentSnap.y } : p;
  }

  // -------------------------------------------------------
  // Picking
  // -------------------------------------------------------
  pickShape(x, y) {
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      if (this.shapes[i].hitTest(x, y, 8)) {
        return { shape: this.shapes[i], index: i };
      }
    }
    return null;
  }

  // -------------------------------------------------------
  // Drawing
  // -------------------------------------------------------
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.offset.x, this.offset.y);

    for (const s of this.shapes) {
      s.draw(ctx, this.selection === s);
    }

    if (this.currentPolyline) {
      this.currentPolyline.draw(ctx);
    }

    ctx.restore();
  }

  _drawPreviewLine(a, b) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.offset.x, this.offset.y);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#888";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  _drawPreviewCircle(center, radius) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.offset.x, this.offset.y);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#888";
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------
  _mouseWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    return this.canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
  }

  updateSelectionInfo() {
    if (!this.selection) {
      this.selectionInfoEl.textContent = "Ei valintaa";
      return;
    }
    this.selectionInfoEl.textContent = this.selection.constructor.name;
  }
}
