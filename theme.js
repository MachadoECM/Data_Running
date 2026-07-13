// theme.js — shared dark/light toggle logic, used by both index.html and ml.html
// so the theme choice is consistent (and persisted) across pages.
(function initTheme(){
  let saved = "light";
  try { saved = localStorage.getItem("theme") || "light"; } catch(e) {}
  document.documentElement.setAttribute("data-theme", saved);
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("themeToggle");
    if(!btn) return;
    btn.textContent = saved === "dark" ? "light mode" : "dark mode";
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      btn.textContent = next === "dark" ? "light mode" : "dark mode";
      try { localStorage.setItem("theme", next); } catch(e) {}
    });
  });
})();
