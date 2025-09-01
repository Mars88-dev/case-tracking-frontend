// src/theme/theme.js
// Centralized, initiative-safe theme controller (no UI assumptions).
const STORAGE_KEY = "theme.v1";
export const THEMES = { LIGHT: "light", DARK: "dark" };

export function getTheme() {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
}

export function applyTheme(mode = getTheme()) {
  const root = document.documentElement;
  root.setAttribute("data-theme", mode);
}

export function setTheme(mode) {
  const next = mode === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  window.dispatchEvent(new CustomEvent("themechange", { detail: { mode: next } }));
}

export function toggleTheme() {
  setTheme(getTheme() === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK);
}

export function onThemeChange(handler) {
  window.addEventListener("themechange", handler);
}

export function offThemeChange(handler) {
  window.removeEventListener("themechange", handler);
}

// Call once on app boot or on first import.
export function initTheme() {
  applyTheme(getTheme());
}
