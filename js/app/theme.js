// js/app/theme.js

const LS_THEME = "tm_theme";

/**
 * Obtiene get theme desde el estado local, la API o los datos cacheados.
 */
export function getTheme() {
  return (localStorage.getItem(LS_THEME) || "light").toLowerCase();
}

/**
 * Actualiza set theme y sincroniza la interfaz con el estado actual.
 */
export function setTheme(theme) {
  localStorage.setItem(LS_THEME, theme);
}

/**
 * Actualiza apply theme ui y sincroniza la interfaz con el estado actual.
 */
export function applyThemeUI() {

  const theme = getTheme();

  document.documentElement.setAttribute("data-theme", theme);

  const themeIcon = document.getElementById("themeIcon");

  if (themeIcon) {
    themeIcon.className =
      theme === "dark"
        ? "bi bi-sun-fill"
        : "bi bi-moon-stars-fill";
  }
}

/**
 * Gestiona toggle theme dentro del flujo principal del modulo.
 */
export function toggleTheme() {

  const theme = getTheme();

  const newTheme = theme === "dark" ? "light" : "dark";

  setTheme(newTheme);

  applyThemeUI();
}