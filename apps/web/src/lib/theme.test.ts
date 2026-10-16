import { describe, expect, it, vi } from "vitest";
import {
  readThemePreference,
  resolveTheme,
  storeThemePreference,
  THEME_STORAGE_KEY,
} from "./theme.ts";

describe("theme preference", () => {
  it("defaults to system and ignores unknown stored values", () => {
    expect(readThemePreference()).toBe("system");
    window.localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(readThemePreference()).toBe("system");
  });

  it("round-trips light and dark, and clears the key for system", () => {
    storeThemePreference("dark");
    expect(readThemePreference()).toBe("dark");
    storeThemePreference("system");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("falls back to system when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => storeThemePreference("dark")).not.toThrow();
    expect(readThemePreference()).toBe("system");
  });

  it.each([
    ["system", true, "dark"],
    ["system", false, "light"],
    ["light", true, "light"],
    ["dark", false, "dark"],
  ] as const)("resolves %s with prefersDark=%s to %s", (preference, prefersDark, expected) => {
    expect(resolveTheme(preference, prefersDark)).toBe(expected);
  });
});
