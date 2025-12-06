// js/app.js
// Global helpers + theme handling for mystats.pro (non-module version)

(function (window, document) {
  const MYSTATS = window.MYSTATS || {};

  /********************************************************************
   * Small utility helpers
   ********************************************************************/

  // Safe number parse
  function toNumber(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    const v = String(value).trim();
    if (!v) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  // Basic CSV parser (no quoted commas in your sheets, so we can keep it simple)
  function parseCsv(text) {
    if (!text) return [];
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return [];
    const headers = lines[0].split(",").map((h) => h.trim());

    return lines.slice(1).map((line) => {
      const cols = line.split(",");
      const row = {};
      headers.forEach((h, i) => {
        row[h] = (cols[i] || "").trim();
      });
      return row;
    });
  }

  function groupBy(items, keyFn) {
    const map = {};
    for (const item of items) {
      const key = keyFn(item);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }

  function sumBy(items, valueFn) {
    let total = 0;
    for (const item of items) {
      total += toNumber(valueFn(item));
    }
    return total;
  }

  function avgBy(items, valueFn) {
    if (!items.length) return 0;
    return sumBy(items, valueFn) / items.length;
  }

  function slugify(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /********************************************************************
   * Theme handling
   ********************************************************************/

  const THEME_KEY = "mystats-theme";

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }

  function getInitialTheme() {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;

    // Fallback to system preference
    const prefersDark = window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }

  function initThemeToggle() {
    const toggle = document.querySelector("[data-theme-toggle]");
    const initial = getInitialTheme();
    applyTheme(initial);

    if (!toggle) return;

    toggle.checked = initial === "dark";
    toggle.addEventListener("change", () => {
      const theme = toggle.checked ? "dark" : "light";
      window.localStorage.setItem(THEME_KEY, theme);
      applyTheme(theme);
    });
  }

  /********************************************************************
   * Attach to global namespace
   ********************************************************************/

  MYSTATS.toNumber = toNumber;
  MYSTATS.parseCsv = parseCsv;
  MYSTATS.groupBy = groupBy;
  MYSTATS.sumBy = sumBy;
  MYSTATS.avgBy = avgBy;
  MYSTATS.slugify = slugify;

  MYSTATS.applyTheme = applyTheme;
  MYSTATS.initThemeToggle = initThemeToggle;

  window.MYSTATS = MYSTATS;

  // Auto-init theme once DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
  });
})(window, document);
