/* FILE: C:\Users\marco\MARCONA\MARCONA 2D\main.js — 2026-02-18 09:50 */

import { Editor } from "./editor.js";
import { saveScene, loadScene } from "./storage.js";

const canvas = document.getElementById("viewport");
const toolbarButtons = document.querySelectorAll(".toolbar button[data-tool]");
const selectionInfo = document.getElementById("selection-info");
const btnUndo = document.getElementById("btn-undo");
const btnRedo = document.getElementById("btn-redo");
const btnSave = document.getElementById("btn-save");
const btnLoad = document.getElementById("btn-load");

const editor = new Editor();

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
}
window.addEventListener("resize", () => {
  resizeCanvas();
  draw();
});
resizeCanvas();

function setTool(tool) {
  editor.setTool(tool);
  toolbarButtons.forEach((b) => {
    b.classList.toggle("active", b.dataset.tool === tool);
  });
}
toolbarButtons.forEach((btn) => {
  btn.addEventListener("click", () => setTool(btn.dataset.tool));
});
setTool("select");

canvas.addEventListener("mousedown", (e) => {
  editor.onMouseDown(e, canvas);
  draw();
});
canvas.addEventListener("mousemove", (e) => {
  editor.onMouseMove(e, canvas);
  draw();
});
canvas.addEventListener("mouseup", () => {
  editor.onMouseUp();
  draw();
});
canvas.addEventListener("mouseleave", () => {
  editor.onMouseUp();
  draw();
});
canvas.addEventListener("dblclick", (e) => {
  editor.onDoubleClick(e, canvas);
  draw();
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    editor.zoom(e.deltaY, cx, cy);
    draw();
  },
  { passive: false }
);

btnUndo.addEventListener("click", () => {
  editor.undo();
  draw();
});
btnRedo.addEventListener("click", () => {
  editor.redo();
  draw();
});

btnSave.addEventListener("click", () => {
  saveScene(editor.shapes);
});

btnLoad.addEventListener("click", () => {
  const shapes = loadScene((o) => editor.factoryFromJSON(o));
  editor.setShapes(shapes);
  draw();
});

function draw() {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(editor.view.offsetX * dpr, editor.view.offsetY * dpr);
  ctx.scale(editor.view.scale * dpr, editor.view.scale * dpr);

  ctx.lineWidth = 1 / editor.view.scale;
  ctx.strokeStyle = "#555";
  drawGrid(ctx);

  for (const s of editor.shapes) {
    drawShape(ctx, s, false);
  }

  if (editor.selection) {
    drawShape(ctx, editor.selection.shape, true);
  }

  ctx.restore();

  updateSelectionInfo();
}

function drawGrid(ctx) {
  const step = 50;
  const size = 5000;
  ctx.beginPath();
  for (let x = -size; x <= size; x += step) {
    ctx.moveTo(x, -size);
    ctx.lineTo(x, size);
  }
  for (let y = -size; y <= size; y += step) {
    ctx.moveTo(-size, y);
    ctx.lineTo(size, y);
  }
  ctx.stroke();
}

function drawShape(ctx, s, selected) {
  ctx.beginPath();
  if (s.type === "line") {
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
  } else if (s.type === "polyline") {
    const pts = s.points;
    if (pts.length >= 2) {
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo(pts[i], pts[i + 1]);
      }
    }
  } else if (s.type === "circle") {
    ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
  }
  ctx.strokeStyle = selected ? "#ffcc00" : "#ffffff";
  ctx.stroke();
}

function updateSelectionInfo() {
  if (!editor.selection) {
    selectionInfo.textContent = "Ei valintaa";
    return;
  }

  // === MARCONA Command Architecture v1 ===

// Paneelin elementit
const cmdPanel = document.getElementById("cmd-panel");
const cmdInput = document.getElementById("cmd-input");
const cmdHeader = document.getElementById("cmd-panel-header");

// Paneelin näkyvyys
function showCmdPanel() {
  cmdPanel.classList.add("visible");
  cmdInput.focus();
}

function hideCmdPanel() {
  cmdPanel.classList.remove("visible");
}

// Aktivoi paneeli kun käyttäjä alkaa kirjoittaa
window.addEventListener("keydown", (e) => {
  // Älä avaa paneelia jos käyttäjä on tekstikentässä
  if (document.activeElement === cmdInput) return;

  // Avaa paneeli ja syötä ensimmäinen kirjain
  showCmdPanel();
  cmdInput.value = e.key.length === 1 ? e.key : "";
});

// ESC sulkee paneelin ja pyyhekumin
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideCmdPanel();
    editor.setTool("select");
  }
});

// Komennon suoritus
cmdInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const cmd = cmdInput.value.trim();
    cmdInput.value = "";
    hideCmdPanel();
    handleCommand(cmd);
  }
});

// Komentojen käsittely
function handleCommand(cmd) {
  cmd = cmd.toLowerCase();

  // Työkalukomennot
  if (cmd === "line") return editor.setTool("line");
  if (cmd === "polyline") return editor.setTool("polyline");
  if (cmd === "circle") return editor.setTool("circle");
  if (cmd === "pan") return editor.setTool("pan");
  if (cmd === "select") return editor.setTool("select");

  // Pyyhekumi
  if (cmd === "e" || cmd === "erase") {
    editor.setTool("eraser");
    return;
  }

  // Undo/Redo
  if (cmd === "u" || cmd === "undo") return editor.undo();
  if (cmd === "r" || cmd === "redo") return editor.redo();

  // Absoluuttiset koordinaatit
  if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(cmd)) {
    const [x, y] = cmd.split(",").map(Number);
    editor.handleAbsoluteCoordinate(x, y);
    return;
  }

  // Suhteelliset koordinaatit
  if (cmd.startsWith("@")) {
    const rel = cmd.substring(1);
    const [dx, dy] = rel.split(",").map(Number);
    editor.handleRelativeCoordinate(dx, dy);
    return;
  }
}

// === Drag & Drop komentopaneelille ===
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragging = false;

cmdHeader.addEventListener("mousedown", (e) => {
  dragging = true;
  dragOffsetX = e.clientX - cmdPanel.offsetLeft;
  dragOffsetY = e.clientY - cmdPanel.offsetTop;
});

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  cmdPanel.style.left = `${e.clientX - dragOffsetX}px`;
  cmdPanel.style.top = `${e.clientY - dragOffsetY}px`;
  cmdPanel.style.transform = "none"; // poistaa keskityksen
});

window.addEventListener("mouseup", () => {
  dragging = false;
});

  selectionInfo.textContent = JSON.stringify(editor.selection.shape, null, 2);
}

draw();

