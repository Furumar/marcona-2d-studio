// FILE: editor.js

import { Line, Polyline, hitTestShape } from "./geometry.js";

let nextId = 1;

export class Editor {
  constructor() {
    this.shapes = [];
    this.tool = "select";
    this.selection = null;
    this.dragStart = null;
    this.panStart = null;
    this.view = {
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    };
    this.currentPolyline = null;
    this.undoStack = [];
    this.redoStack = [];
  }

  setTool(tool) {
    this.tool = tool;
    this.currentPolyline = null;
  }

  setShapes(shapes) {
    this.shapes = shapes;
  }

  factoryFromJSON(o) {
    if (o.type === "line") {
      return new Line(o.id, o.x1, o.y1, o.x2, o.y2);
    }
    if (o.type === "polyline") {
      return new Polyline(o.id, o.points);
    }
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
    this.shapes = JSON.parse(state).map((o) => this.factoryFromJSON(o));
    this.selection = null;
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const state = this.redoStack.pop();
    this.undoStack.push(JSON.stringify(this.shapes));
    this.shapes = JSON.parse(state).map((o) => this.factoryFromJSON(o));
    this.selection = null;
  }

  worldFromScreen(sx, sy, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = (sx - rect.left - this.view.offsetX) / this.view.scale;
    const y = (sy - rect.top - this.view.offsetY) / this.view.scale;
    return { x, y };
  }

  screenFromWorld(x, y, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + this.view.offsetX + x * this.view.scale,
      y: rect.top + this.view.offsetY + y * this.view.scale,
    };
  }

  onMouseDown(e, canvas) {
    const { x, y } = this.worldFromScreen(e.clientX, e.clientY, canvas);

    if (this.tool === "pan") {
      this.panStart = { sx: e.clientX, sy: e.clientY, ox: this.view.offsetX, oy: this.view.offsetY };
      return;
    }

    if (this.tool === "select") {
      this.selection = this.pickShape(x, y, canvas);
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
      this.dragStart = { sx: e.clientX, sy: e.clientY, orig: JSON.parse(JSON.stringify(line)) };
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
  }

  onMouseMove(e, canvas) {
    if (this.tool === "pan" && this.panStart) {
      const dx = e.clientX - this.panStart.sx;
      const dy = e.clientY - this.panStart.sy;
      this.view.offsetX = this.panStart.ox + dx;
      this.view.offsetY = this.panStart.oy + dy;
      return;
    }

    if (this.tool === "select" && this.dragStart && this.selection) {
      const { x, y } = this.worldFromScreen(e.clientX, e.clientY, canvas);
      const { x: x0, y: y0 } = this.worldFromScreen(this.dragStart.sx, this.dragStart.sy, canvas);
      const dx = x - x0;
      const dy = y - y0;
      this.moveShape(this.selection.shape, this.dragStart.orig, dx, dy);
      return;
    }

    if (this.tool === "line" && this.selection && this.selection.shape.type === "line") {
      const { x, y } = this.worldFromScreen(e.clientX, e.clientY, canvas);
      this.selection.shape.x2 = x;
      this.selection.shape.y2 = y;
      return;
    }
  }

  onMouseUp() {
    this.dragStart = null;
    this.panStart = null;
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
    }
  }

  pickShape(x, y, canvas) {
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