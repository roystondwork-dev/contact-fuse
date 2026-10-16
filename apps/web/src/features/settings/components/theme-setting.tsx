import { useTheme } from "../../../hooks/use-theme.tsx";
import { THEME_LABEL, THEME_PREFERENCE, type ThemePreference } from "../../../lib/theme.ts";
import { cn } from "../../../lib/utils.ts";

const OPTIONS: ThemePreference[] = [
  THEME_PREFERENCE.system,
  THEME_PREFERENCE.light,
  THEME_PREFERENCE.dark,
];

/** Theme choice. Applies immediately: it is a display preference stored only in this browser. */
export function ThemeSetting() {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">Theme</legend>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <label
            key={option}
            className={cn(
              "flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-input-border px-3 text-sm",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring",
              preference === option && "border-primary bg-primary-subtle",
            )}
          >
            <input
              type="radio"
              name="theme"
              value={option}
              checked={preference === option}
              onChange={() => setPreference(option)}
              className="accent-primary"
            />
            {THEME_LABEL[option]}
          </label>
        ))}
      </div>
      <p className="text-sm text-text-muted">System follows your computer&rsquo;s setting.</p>
    </fieldset>
  );
}
