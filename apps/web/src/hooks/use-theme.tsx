import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  storeThemePreference,
  systemPrefersDark,
  watchSystemTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "../lib/theme.ts";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = { children: ReactNode };

/** Owns the theme preference: System (default), Light or Dark. Sets data-theme on <html>. */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);
  const [prefersDark, setPrefersDark] = useState<boolean>(systemPrefersDark);

  useEffect(() => watchSystemTheme(setPrefersDark), []);

  const resolvedTheme = resolveTheme(preference, prefersDark);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference: (next) => {
        storeThemePreference(next);
        setPreferenceState(next);
      },
    }),
    [preference, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
