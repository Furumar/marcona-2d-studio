/* FILE: C:\Users\marco\MARCONA\MARCONA 2D\editor.js — 2026-02-18 09:50 */

import { Line, Polyline, Circle, hitTestShape } from "./geometry.js";

let nextId = 1;

export class Editor {
  constructor() {
    this.shapes = [];
    this.tool = "select";
    this.selection = null;
    this.dragStart = null;
    this.panStart = null;
    this.currentPolyline = null;
    this.currentCircle = null;
    this.currentEraser = null;

    this.view = {
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    };

    this.undoStack = [];
    this.redoStack = [];
  }

  setTool(tool) {
    this.tool = tool;
    this.currentPolyline = null;
    this.currentCircle = null;
  }

  setShapes(shapes) {
    this.shapes = shapes;
  }

  factoryFromJSON(o) {
    if (!o || !o.type) return null;
    if (o.type === "line") return new Line(o.id, o.x1, o.y1, o.x2, o.y2);
    if (o.type === "polyline") return new Polyline(o.id, o.points);
    if (o.type === "circle") return new Circle(o.id, o.cx, o.cy, o.r);
    return null;
  }

  pushUndo() {
    this.undoStack.push(JSON.stringify(this.shapes));
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const state = this.undoStack.pop();
    this.redoStack.push(JSON.stringify(this.shapes));
    this.shapes = JSON.parse(state).map((o) => this.factoryFromJSON(o)).filter(Boolean);
    this.selection = null;
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const state = this.redoStack.pop();
    this.undoStack.push(JSON.stringify(this.shapes));
    this.shapes = JSON.parse(state).map((o) => this.factoryFromJSON(o)).filter(Boolean);
    this.selection = null;
  }

  worldFromScreen(sx, sy, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = (sx - rect.left - this.view.offsetX) / this.view.scale;
    const y = (sy - rect.top - this.view.offsetY) / this.view.scale;
    return { x, y };
  }

  onMouseDown(e, canvas) {
    const { x, y } = this.worldFromScreen(e.clientX, e.clientY, canvas);

    if (this.tool === "pan") {
      this.panStart = {
        sx: e.clientX,
        sy: e.clientY,
        ox: this.view.offsetX,
        oy: this.view.offsetY,
      };
      return;
    }

    if (this.tool === "select") {
      this.selection = this.pickShape(x, y);
      if (this.selection) {
        this.dragStart = {
          sx: e.clientX,
          sy: e.clientY,
          orig: JSON.parse(JSON.stringify(this.selection.shape)),
        };
      }
      return;
    }

    if (this.tool === "line") {
      this.pushUndo();
      const line = new Line(nextId++, x, y, x, y);
      this.shapes.push(line);
      this.selection = { shape: line };
      this.dragStart = {
        sx: e.clientX,
        sy: e.clientY,
        orig: JSON.parse(JSON.stringify(line)),
      };
      return;
    }

    if (this.tool === "polyline") {
      if (!this.currentPolyline) {
        this.pushUndo();
        this.currentPolyline = new Polyline(nextId++, [x, y]);
        this.shapes.push(this.currentPolyline);
      } else {
        this.currentPolyline.points.push(x, y);
      }
      this.selection = { shape: this.currentPolyline };
      return;
    }

    if (this.tool === "circle") {
      this.pushUndo();
      this.currentCircle = new Circle(nextId++, x, y, 0);
      this.shapes.push(this.currentCircle);
      this.selection = { shape: this.currentCircle };
      return;
    }
  }

  onMouseMove(e, canvas) {
    const { x, y } = this.worldFromScreen(e.clientX, e.clientY, canvas);

    if (this.tool === "pan" && this.panStart) {
      const dx = e.clientX - this.panStart.sx;
      const dy = e.clientY - this.panStart.sy;
      this.view.offsetX = this.panStart.ox + dx;
      this.view.offsetY = this.panStart.oy + dy;
      return;
    }

    if (this.tool === "select" && this.dragStart && this.selection) {
      const { x: x0, y: y0 } = this.worldFromScreen(
        this.dragStart.sx,
        this.dragStart.sy,
        canvas
      );
      const dx = x - x0;
      const dy = y - y0;
      this.moveShape(this.selection.shape, this.dragStart.orig, dx, dy);
      return;
    }

    if (this.tool === "line" && this.selection?.shape.type === "line") {
      this.selection.shape.x2 = x;
      this.selection.shape.y2 = y;
      return;
    }

    if (this.tool === "circle" && this.currentCircle) {
      const dx = x - this.currentCircle.cx;
      const dy = y - this.currentCircle.cy;
      this.currentCircle.r = Math.hypot(dx, dy);
      return;
    }
  }

  onMouseUp() {
    this.dragStart = null;
    this.panStart = null;
    this.currentCircle = null;
  }

  onDoubleClick(e, canvas) {
    if (this.tool === "polyline" && this.currentPolyline) {
      const { x, y } = this.worldFromScreen(e.clientX, e.clientY, canvas);
      this.currentPolyline.points.push(x, y);
      this.currentPolyline = null;
    }
  }

  moveShape(shape, orig, dx, dy) {
    if (shape.type === "line") {
      shape.x1 = orig.x1 + dx;
      shape.y1 = orig.y1 + dy;
      shape.x2 = orig.x2 + dx;
      shape.y2 = orig.y2 + dy;
    } else if (shape.type === "polyline") {
      for (let i = 0; i < shape.points.length; i += 2) {
        shape.points[i] = orig.points[i] + dx;
        shape.points[i + 1] = orig.points[i + 1] + dy;
      }
    } else if (shape.type === "circle") {
      shape.cx = orig.cx + dx;
      shape.cy = orig.cy + dy;
    }
  }

  pickShape(x, y) {
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const s = this.shapes[i];
      if (hitTestShape(s, x, y, 5 / this.view.scale)) {
        return { shape: s };
      }
    }
    return null;
  }

  zoom(delta, cx, cy) {
    const factor = delta > 0 ? 0.9 : 1.1;
    const oldScale = this.view.scale;
    const newScale = oldScale * factor;
    this.view.offsetX = cx - (cx - this.view.offsetX) * (newScale / oldScale);
    this.view.offsetY = cy - (cy - this.view.offsetY) * (newScale / oldScale);
    this.view.scale = newScale;
  }
}

