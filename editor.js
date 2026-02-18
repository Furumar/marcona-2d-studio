/* FILE: C:\Users\marco\MARCONA\MARCONA 2D\editor.js — 2026-02-18 09:50 */

export class Line {
  constructor(points, color = "#ffffff") {
    this.points = points; // [ {x,y}, {x,y} ]
    this.color = color;
  }

  draw(ctx, highlight = false) {
    if (this.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    ctx.lineTo(this.points[1].x, this.points[1].y);
    ctx.strokeStyle = highlight ? "yellow" : this.color;
    ctx.lineWidth = highlight ? 2 : 1;
    ctx.stroke();
  }

  hitTest(x, y, tol = 5) {
    const [p1, p2] = this.points;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return false;
    const t = ((x - p1.x) * dx + (y - p1.y) * dy) / len2;
    if (t < 0 || t > 1) return false;
    const px = p1.x + t * dx;
    const py = p1.y + t * dy;
    const dist = Math.hypot(x - px, y - py);
    return dist <= tol;
  }
}

export class Polyline {
  constructor(points, color = "#ffffff") {
    this.points = points; // array of {x,y}
    this.color = color;
  }

  draw(ctx, highlight = false) {
    if (this.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.strokeStyle = highlight ? "yellow" : this.color;
    ctx.lineWidth = highlight ? 2 : 1;
    ctx.stroke();
  }

  hitTest(x, y, tol = 5) {
    for (let i = 0; i < this.points.length - 1; i++) {
      const seg = new Line([this.points[i], this.points[i + 1]], this.color);
      if (seg.hitTest(x, y, tol)) return true;
    }
    return false;
  }
}

export class Circle {
  constructor(center, radius, color = "#ffffff") {
    this.center = center;
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
}

export class Editor {
  constructor(canvas, selectionInfoEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.selectionInfoEl = selectionInfoEl;

    this.shapes = [];
    this.selection = null;
    this.tool = "select";
    this.isPanning = false;
    this.panStart = null;
    this.offset = { x: 0, y: 0 };

    this.isDrawing = false;
    this.currentPolyline = null;
    this.lastPoint = null;

    this.undoStack = [];
    this.redoStack = [];

    this.hitTolerance = 10;
    this.hoverShape = null;

    this._bindEvents();
    this.resize();
    this.draw();
  }

  _bindEvents() {
    window.addEventListener("resize", () => this.resize());

    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.canvas.addEventListener("mouseup", (e) => this.onMouseUp(e));
    this.canvas.addEventListener("mouseleave", () => {
      this.hoverShape = null;
      this.draw();
    });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.draw();
  }

  setTool(tool) {
    this.tool = tool;
    this.hoverShape = null;
    this.isDrawing = false;
    this.currentPolyline = null;
    this.updateSelectionInfo();
  }

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

  pickShape(x, y, tol = 5) {
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      if (this.shapes[i].hitTest(x, y, tol)) {
        return { shape: this.shapes[i], index: i };
      }
    }
    return null;
  }

  canvasToWorld(x, y) {
    return { x: x - this.offset.x, y: y - this.offset.y };
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const world = this.canvasToWorld(x, y);

    if (this.tool === "pan") {
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY, ox: this.offset.x, oy: this.offset.y };
      return;
    }

    if (this.tool === "eraser") {
      const hit = this.pickShape(world.x, world.y, this.hitTolerance);
      if (hit) {
        this.pushUndo();
        this.shapes.splice(hit.index, 1);
        this.hoverShape = null;
        this.draw();
      }
      return;
    }

    if (this.tool === "select") {
      const hit = this.pickShape(world.x, world.y, this.hitTolerance);
      this.selection = hit ? hit.shape : null;
      this.updateSelectionInfo();
      this.draw();
      return;
    }

    if (this.tool === "line") {
      if (!this.isDrawing) {
        this.isDrawing = true;
        this.lastPoint = world;
      } else {
        this.pushUndo();
        this.shapes.push(new Line([this.lastPoint, world]));
        this.isDrawing = false;
        this.lastPoint = null;
        this.draw();
      }
      return;
    }

    if (this.tool === "polyline") {
      if (!this.currentPolyline) {
        this.currentPolyline = new Polyline([world]);
        this.isDrawing = true;
      } else {
        this.currentPolyline.points.push(world);
      }
      this.draw();
      return;
    }

    if (this.tool === "circle") {
      if (!this.isDrawing) {
        this.isDrawing = true;
        this.lastPoint = world;
      } else {
        const r = Math.hypot(world.x - this.lastPoint.x, world.y - this.lastPoint.y);
        this.pushUndo();
        this.shapes.push(new Circle(this.lastPoint, r));
        this.isDrawing = false;
        this.lastPoint = null;
        this.draw();
      }
      return;
    }
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const world = this.canvasToWorld(x, y);

    if (this.isPanning && this.tool === "pan") {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      this.offset.x = this.panStart.ox + dx;
      this.offset.y = this.panStart.oy + dy;
      this.draw();
      return;
    }

    if (this.tool === "eraser") {
      const hit = this.pickShape(world.x, world.y, this.hitTolerance);
      this.hoverShape = hit ? hit.shape : null;
      this.draw();
      return;
    }

    if (this.tool === "polyline" && this.currentPolyline && this.isDrawing) {
      const pts = [...this.currentPolyline.points, world];
      this.draw();
      this._drawTempPolyline(pts);
      return;
    }

    if (this.tool === "line" && this.isDrawing && this.lastPoint) {
      this.draw();
      this._drawTempLine(this.lastPoint, world);
      return;
    }

    if (this.tool === "circle" && this.isDrawing && this.lastPoint) {
      this.draw();
      const r = Math.hypot(world.x - this.lastPoint.x, world.y - this.lastPoint.y);
      this._drawTempCircle(this.lastPoint, r);
      return;
    }
  }

  onMouseUp() {
    if (this.isPanning) {
      this.isPanning = false;
    }
  }

  _drawTempLine(p1, p2) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.offset.x, this.offset.y);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#888";
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }

  _drawTempPolyline(points) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.offset.x, this.offset.y);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#888";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawTempCircle(center, radius) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.offset.x, this.offset.y);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#888";
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  closePolyline() {
    if (this.currentPolyline && this.currentPolyline.points.length > 2) {
      this.pushUndo();
      this.shapes.push(this.currentPolyline);
    }
    this.currentPolyline = null;
    this.isDrawing = false;
    this.draw();
  }

  handleAbsoluteCoordinate(x, y) {
    const pt = { x, y };
    if (this.tool === "line") {
      if (!this.isDrawing) {
        this.isDrawing = true;
        this.lastPoint = pt;
      } else {
        this.pushUndo();
        this.shapes.push(new Line([this.lastPoint, pt]));
        this.isDrawing = false;
        this.lastPoint = null;
        this.draw();
      }
    } else if (this.tool === "polyline") {
      if (!this.currentPolyline) {
        this.currentPolyline = new Polyline([pt]);
        this.isDrawing = true;
      } else {
        this.currentPolyline.points.push(pt);
        this.draw();
      }
    } else if (this.tool === "circle") {
      if (!this.isDrawing) {
        this.isDrawing = true;
        this.lastPoint = pt;
      } else {
        const r = Math.hypot(pt.x - this.lastPoint.x, pt.y - this.lastPoint.y);
        this.pushUndo();
        this.shapes.push(new Circle(this.lastPoint, r));
        this.isDrawing = false;
        this.lastPoint = null;
        this.draw();
      }
    }
  }

  handleRelativeCoordinate(dx, dy) {
    const base =
      this.lastPoint ||
      (this.currentPolyline && this.currentPolyline.points[this.currentPolyline.points.length - 1]);
    if (!base) return;
    const pt = { x: base.x + dx, y: base.y + dy };
    this.handleAbsoluteCoordinate(pt.x, pt.y);
  }

  updateSelectionInfo() {
    if (!this.selection) {
      this.selectionInfoEl.textContent = "Ei valintaa";
      return;
    }
    this.selectionInfoEl.textContent = this.selection.constructor.name;
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.translate(this.offset.x, this.offset.y);

    for (const s of this.shapes) {
      const highlight = this.tool === "eraser" && this.hoverShape === s;
      s.draw(ctx, highlight);
    }

    if (this.currentPolyline) {
      this.currentPolyline.draw(ctx);
    }

    ctx.restore();
  }
}
