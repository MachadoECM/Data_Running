// theme.js — shared dark/light toggle button logic, used by both index.html
// and ml.html. The INITIAL theme is now set by a tiny inline script in each
// page's <head> (before any CSS loads, avoiding a flash of the wrong
// theme) — this file only wires up the toggle button, reading whatever
// data-theme that inline script already applied to <html>.
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("themeToggle");
  if(!btn) return;
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  btn.textContent = current === "dark" ? "light mode" : "dark mode";
  btn.addEventListener("click", () => {
    const now = document.documentElement.getAttribute("data-theme");
    const next = now === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    btn.textContent = next === "dark" ? "light mode" : "dark mode";
    try { localStorage.setItem("theme", next); } catch(e) {}
  });
});
