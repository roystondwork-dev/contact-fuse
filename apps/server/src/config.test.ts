import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.ts";

describe("loadConfig", () => {
  it("uses safe defaults", () => {
    const config = loadConfig({ CONTACT_FUSE_DATA_DIR: "/tmp/cf" });
    expect(config).toEqual({ host: "127.0.0.1", port: 4317, dataDir: "/tmp/cf", logLevel: "info" });
  });

  it("falls back to the OS app-data directory", () => {
    expect(loadConfig({}).dataDir).toMatch(/contact-fuse$/);
  });

  it("reads every CONTACT_FUSE_* variable", () => {
    const config = loadConfig({
      CONTACT_FUSE_PORT: "5000",
      CONTACT_FUSE_DATA_DIR: "/tmp/cf",
      CONTACT_FUSE_LOG_LEVEL: "debug",
      CONTACT_FUSE_DEFAULT_REGION: "IN",
      CONTACT_FUSE_DEV_UI_ORIGIN: "http://127.0.0.1:5173",
    });
    expect(config).toMatchObject({
      port: 5000,
      logLevel: "debug",
      defaultRegion: "IN",
      devUiOrigin: "http://127.0.0.1:5173",
    });
  });

  it("never lets the host be changed away from loopback", () => {
    expect(loadConfig({ HOST: "0.0.0.0" }).host).toBe("127.0.0.1");
  });

  it.each([
    ["CONTACT_FUSE_PORT", "99999"],
    ["CONTACT_FUSE_LOG_LEVEL", "loud"],
    ["CONTACT_FUSE_DEFAULT_REGION", "india"],
    ["CONTACT_FUSE_DEV_UI_ORIGIN", "not a url"],
  ])("rejects invalid %s and names only the field", (name, value) => {
    expect(() => loadConfig({ [name]: value })).toThrow(
      expect.objectContaining({ code: "VALIDATION_FAILED", details: { fields: name } }),
    );
  });
});
