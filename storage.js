// FILE: storage.js

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
    return arr.map((o) => factory(o));
  } catch {
    return [];
  }
}
