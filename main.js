// FILE: main.js

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
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
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
canvas.addEventListener("mouseup", (e) => {
  editor.onMouseUp(e, canvas);
  draw();
});
canvas.addEventListener("mouseleave", (e) => {
  editor.onMouseUp(e, canvas);
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
  saveScene(editor.sh
