/* global window, document */
// Sets data-theme on <html> before first paint so there is no flash of the wrong theme.
// It is an external file (not inline) because the CSP forbids inline scripts.
// Keep in sync with src/lib/theme.ts.
(function () {
  var preference = "system";
  try {
    var stored = window.localStorage.getItem("contact-fuse:theme");
    if (stored === "light" || stored === "dark") preference = stored;
  } catch (_error) {
    // Storage can be blocked; fall back to the system preference.
  }
  var isDark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
})();
