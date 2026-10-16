import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/use-theme.tsx";
import { THEME_LABEL, THEME_PREFERENCE, type ThemePreference } from "../lib/theme.ts";
import { Button } from "./ui/button.tsx";

const NEXT: Record<ThemePreference, ThemePreference> = {
  system: THEME_PREFERENCE.light,
  light: THEME_PREFERENCE.dark,
  dark: THEME_PREFERENCE.system,
};

const ICON = { system: Monitor, light: Sun, dark: Moon } as const;

/** Header button that cycles System → Light → Dark. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const Icon = ICON[preference];
  const next = NEXT[preference];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setPreference(next)}
      aria-label={`Theme: ${THEME_LABEL[preference]}. Switch to ${THEME_LABEL[next]}`}
      title={`Switch to ${THEME_LABEL[next]} theme`}
    >
      <Icon aria-hidden="true" />
      <span className="hidden sm:inline">{THEME_LABEL[preference]}</span>
    </Button>
  );
}
