import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main.ts"],
  platform: "node",
  format: "esm",
  // Bundle our own workspace packages (they ship TypeScript source).
  noExternal: [/^@contact-fuse\//],
  // SQL migrations are read at startup from ./migrations next to the bundle.
  copy: [{ from: "src/db/migrations", to: "dist" }],
});
