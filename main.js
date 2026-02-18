// C:\Users\marco\MARCONA\MARCONA 2D\main.js 18.2.2026 klo 13:35
// =========================================================
// MARCONA 2D — Main Controller v1
// =========================================================

import { Editor } from "./editor.js";

// ---------------------------------------------------------
// DOM references
// ---------------------------------------------------------
const canvas = document.getElementById("viewport");
const snapOverlay = document.getElementById("snap-overlay");
const selectionInfo = document.getElementById("selection-info");

const cmdPanel = document.getElementById("cmd-panel");
const cmdInput = document.getElementById("cmd-input");
const cmdHeader = document.getElementById("cmd-panel-header");

const toolButtons = document.querySelectorAll(".toolbar button[data-tool]");
const undoBtn = document.getElementById("btn-undo");
const redoBtn = document.getElementById("btn-redo");

// ---------------------------------------------------------
// Editor instance
// ---------------------------------------------------------
const editor = new Editor(canvas, snapOverlay, selectionInfo);

// ---------------------------------------------------------
// Load settings from localStorage
// ---------------------------------------------------------
function loadSettings() {
  const snapSettings = JSON.parse(localStorage.getItem("marcona_snap_settings") || "{}");
  const rmbSettings = JSON.parse(localStorage.getItem("marcona_rmb_settings") || "{}");

  Object.assign(editor.snap.settings, snapSettings);

  if (rmbSettings.behavior) {
    editor.rmbBehavior = rmbSettings.behavior;
  }
}

function saveSettings() {
  localStorage.setItem("marcona_snap_settings", JSON.stringify(editor.snap.settings));
  localStorage.setItem("marcona_rmb_settings", JSON.stringify({ behavior: editor.rmbBehavior }));
}

loadSettings();

// ---------------------------------------------------------
// Toolbar logic
// ---------------------------------------------------------
toolButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    toolButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    editor.setTool(btn.dataset.tool);
  });
});

undoBtn.addEventListener("click", () => editor.undo());
redoBtn.addEventListener("click", () => editor.redo());

// ---------------------------------------------------------
// Command panel logic
// ---------------------------------------------------------
function showCmdPanel(initial = "") {
  cmdPanel.classList.add("visible");
  cmdInput.value = initial;
  cmdInput.focus();
}

function hideCmdPanel() {
  cmdPanel.classList.remove("visible");
}

// Activate panel when typing
window.addEventListener("keydown", (e) => {
  if (document.activeElement === cmdInput) return;

  if (e.key.length === 1 || e.key === "@" || e.key === "Enter") {
    showCmdPanel(e.key.length === 1 ? e.key : "");
  }
});

// ESC closes panel and finalizes polyline
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideCmdPanel();

    if (editor.tool === "polyline" && editor.currentPolyline) {
      editor.finishPolyline();
      return;
    }

    editor.setTool("select");
    toolButtons.forEach((b) => b.classList.remove("active"));
    document.querySelector('button[data-tool="select"]').classList.add("active");
  }
});

// Execute command
cmdInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const cmd = cmdInput.value.trim();
    cmdInput.value = "";
    hideCmdPanel();
    handleCommand(cmd);
  }
});

// ---------------------------------------------------------
// Command parser
// ---------------------------------------------------------
function handleCommand(raw) {
  const cmd = raw.toLowerCase();

  // Tools
  if (cmd === "line") return activateTool("line");
  if (cmd === "polyline") return activateTool("polyline");
  if (cmd === "circle") return activateTool("circle");
  if (cmd === "pan") return activateTool("pan");
  if (cmd === "select") return activateTool("select");

  // Eraser
  if (cmd === "e" || cmd === "erase") return activateTool("eraser");

  // Undo/Redo
  if (cmd === "u" || cmd === "undo") return editor.undo();
  if (cmd === "r" || cmd === "redo") return editor.redo();

  // Polyline close
  if (cmd === "c" || cmd === "close") {
    if (editor.currentPolyline) {
      editor.currentPolyline.closed = true;
      editor.finishPolyline();
    }
    return;
  }

  // Circle radius/diameter
  if (cmd.startsWith("r=")) {
    const r = Number(cmd.substring(2));
    if (editor.tool === "circle" && editor.circleStart) {
      editor.pushUndo();
      editor.shapes.push(new Circle(editor.circleStart, r));
      editor.circleStart = null;
      editor.isDrawing = false;
      editor.draw();
    }
    return;
  }

  if (cmd.startsWith("d=")) {
    const d = Number(cmd.substring(2));
    const r = d / 2;
    if (editor.tool === "circle" && editor.circleStart) {
      editor.pushUndo();
      editor.shapes.push(new Circle(editor.circleStart, r));
      editor.circleStart = null;
      editor.isDrawing = false;
      editor.draw();
    }
    return;
  }

  // Absolute coordinates
  if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(raw)) {
    const [x, y] = raw.split(",").map((v) => Number(v.trim()));
    handleAbsoluteCoordinate(x, y);
    return;
  }

  // Relative coordinates
  if (raw.startsWith("@")) {
    const rel = raw.substring(1);
    const [dx, dy] = rel.split(",").map((v) => Number(v.trim()));
    handleRelativeCoordinate(dx, dy);
    return;
  }
}

// ---------------------------------------------------------
// Coordinate commands
// ---------------------------------------------------------
function handleAbsoluteCoordinate(x, y) {
  const pt = { x, y };

  if (editor.tool === "line") {
    if (!editor.isDrawing) {
      editor.isDrawing = true;
      editor.currentLineStart = pt;
    } else {
      editor.pushUndo();
      editor.shapes.push(new Line(editor.currentLineStart, pt));
      editor.isDrawing = false;
      editor.currentLineStart = null;
      editor.draw();
    }
    return;
  }

  if (editor.tool === "polyline") {
    if (!editor.currentPolyline) {
      editor.currentPolyline = new Polyline([pt], false);
      editor.isDrawing = true;
    } else {
      editor.currentPolyline.points.push(pt);
      editor.draw();
    }
    return;
  }

  if (editor.tool === "circle") {
    if (!editor.isDrawing) {
      editor.isDrawing = true;
      editor.circleStart = pt;
    } else {
      const r = distance(editor.circleStart, pt);
      editor.pushUndo();
      editor.shapes.push(new Circle(editor.circleStart, r));
      editor.isDrawing = false;
      editor.circleStart = null;
      editor.draw();
    }
  }
}

function handleRelativeCoordinate(dx, dy) {
  const base =
    editor.currentLineStart ||
    (editor.currentPolyline &&
      editor.currentPolyline.points[editor.currentPolyline.points.length - 1]) ||
    editor.circleStart;

  if (!base) return;

  const pt = { x: base.x + dx, y: base.y + dy };
  handleAbsoluteCoordinate(pt.x, pt.y);
}

// ---------------------------------------------------------
// Tool activation helper
// ---------------------------------------------------------
function activateTool(tool) {
  editor.setTool(tool);
  toolButtons.forEach((b) => b.classList.remove("active"));
  const btn = document.querySelector(`button[data-tool="${tool}"]`);
  if (btn) btn.classList.add("active");
}

// ---------------------------------------------------------
// Command panel dragging
// ---------------------------------------------------------
let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

cmdHeader.addEventListener("mousedown", (e) => {
  dragging = true;
  dragOffsetX = e.clientX - cmdPanel.offsetLeft;
  dragOffsetY = e.clientY - cmdPanel.offsetTop;
});

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  cmdPanel.style.left = `${e.clientX - dragOffsetX}px`;
  cmdPanel.style.top = `${e.clientY - dragOffsetY}px`;
  cmdPanel.style.transform = "none";
});

window.addEventListener("mouseup", () => {
  dragging = false;
});
