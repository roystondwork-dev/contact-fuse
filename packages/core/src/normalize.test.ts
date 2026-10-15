import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./normalize.ts";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Rahul.Sharma@Gmail.COM ")).toBe("rahul.sharma@gmail.com");
  });

  it.each(["", "no-at-sign", "@missing-local", "missing-domain@", "two@@ats.com"])(
    "rejects %j",
    (input) => {
      expect(normalizeEmail(input)).toBeUndefined();
    },
  );
});
