export const THEME_KEY = "portfolio-theme";

/**
 * Inlined in <head> so the chosen theme applies before first paint. Dark is
 * the default; a saved choice wins, otherwise the system preference.
 */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||(!t&&matchMedia("(prefers-color-scheme: light)").matches))document.documentElement.classList.add("light")}catch(e){}`;
