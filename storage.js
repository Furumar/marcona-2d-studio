/* FILE: C:\Users\marco\MARCONA\MARCONA 2D\storage.js — 2026-02-18 09:50 */

const KEY = "marcona_2d_scene";

export function saveScene(shapes) {
  const data = shapes.map((s) => s.toJSON());
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function loadScene(factory) {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return arr.map((o) => factory(o)).filter(Boolean);
  } catch {
    return [];
  }
}
