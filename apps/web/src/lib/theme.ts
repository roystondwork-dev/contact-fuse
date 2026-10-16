// Theme preference handling. public/theme-init.js applies the same logic before first paint.

export const THEME_PREFERENCE = {
  system: "system",
  light: "light",
  dark: "dark",
} as const;

export type ThemePreference = (typeof THEME_PREFERENCE)[keyof typeof THEME_PREFERENCE];
export type ResolvedTheme = "light" | "dark";

export const THEME_LABEL: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export const THEME_STORAGE_KEY = "contact-fuse:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch (_error) {
    // Storage can be blocked (private mode, site settings). Fall back to the system theme.
  }
  return THEME_PREFERENCE.system;
}

export function storeThemePreference(preference: ThemePreference): void {
  try {
    if (preference === THEME_PREFERENCE.system) {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch (_error) {
    // Not persisted, but the choice still applies for this visit.
  }
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === THEME_PREFERENCE.system) return prefersDark ? "dark" : "light";
  return preference;
}

export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
}

/** Calls `onChange` when the system colour scheme changes. Returns an unsubscribe function. */
export function watchSystemTheme(onChange: (prefersDark: boolean) => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DARK_QUERY);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
