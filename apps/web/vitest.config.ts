import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "web",
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://127.0.0.1:4317/" } },
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
