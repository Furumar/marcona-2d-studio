/* FILE: C:\Users\marco\MARCONA\MARCONA 2D\main.js — 2026-02-18 09:50 */

import { Editor } from "./editor.js";

const canvas = document.getElementById("viewport");
const selectionInfo = document.getElementById("selection-info");
const editor = new Editor(canvas, selectionInfo);

// Toolbar
const toolButtons = document.querySelectorAll(".toolbar button[data-tool]");
toolButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    toolButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    editor.setTool(btn.dataset.tool);
  });
});

// Undo/Redo
document.getElementById("btn-undo").addEventListener("click", () => editor.undo());
document.getElementById("btn-redo").addEventListener("click", () => editor.redo());

// === MARCONA Command Architecture v1 ===

const cmdPanel = document.getElementById("cmd-panel");
const cmdInput = document.getElementById("cmd-input");
const cmdHeader = document.getElementById("cmd-panel-header");

function showCmdPanel() {
  cmdPanel.classList.add("visible");
  cmdInput.focus();
}

function hideCmdPanel() {
  cmdPanel.classList.remove("visible");
}

// Aktivoi paneeli kun käyttäjä alkaa kirjoittaa
window.addEventListener("keydown", (e) => {
  if (document.activeElement === cmdInput) return;
  if (e.key.length === 1 || e.key === "@" || e.key === "Enter") {
    showCmdPanel();
    cmdInput.value = e.key.length === 1 ? e.key : "";
  }
});

// ESC sulkee paneelin ja pyyhekumin
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideCmdPanel();
    editor.setTool("select");
    toolButtons.forEach((b) => b.classList.remove("active"));
    document.querySelector('button[data-tool="select"]').classList.add("active");
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

function handleCommand(cmd) {
  const raw = cmd;
  cmd = cmd.toLowerCase();

  // Työkalut
  if (cmd === "line") return activateTool("line");
  if (cmd === "polyline") return activateTool("polyline");
  if (cmd === "circle") return activateTool("circle");
  if (cmd === "pan") return activateTool("pan");
  if (cmd === "select") return activateTool("select");

  // Pyyhekumi
  if (cmd === "e" || cmd === "erase") return activateTool("eraser");

  // Undo/Redo
  if (cmd === "u" || cmd === "undo") return editor.undo();
  if (cmd === "r" || cmd === "redo") return editor.redo();

  // Polyline close
  if (cmd === "c" || cmd === "close") return editor.closePolyline();

  // Absoluuttiset koordinaatit
  if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(raw)) {
    const [x, y] = raw.split(",").map((v) => Number(v.trim()));
    editor.handleAbsoluteCoordinate(x, y);
    return;
  }

  // Suhteelliset koordinaatit
  if (raw.startsWith("@")) {
    const rel = raw.substring(1);
    const [dx, dy] = rel.split(",").map((v) => Number(v.trim()));
    editor.handleRelativeCoordinate(dx, dy);
    return;
  }
}

function activateTool(tool) {
  editor.setTool(tool);
  toolButtons.forEach((b) => b.classList.remove("active"));
  const btn = document.querySelector(`button[data-tool="${tool}"]`);
  if (btn) btn.classList.add("active");
}

// Drag & Drop komentopaneelille
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
  cmdPanel.style.transform = "none";
});

window.addEventListener("mouseup", () => {
  dragging = false;
});
