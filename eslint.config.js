import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/coverage/**", "**/node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["apps/server/**/*.ts", "packages/**/*.ts", "*.js", "*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    // Core is pure logic: no I/O of any kind (docs/architecture/project-structure.md#dependency-rules).
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["node:*"], message: "packages/core must not do I/O." },
            {
              group: [
                "fs",
                "fs/*",
                "http",
                "https",
                "net",
                "child_process",
                "googleapis",
                "@googleapis/*",
                "better-sqlite3",
                "drizzle-orm",
                "drizzle-orm/*",
                "@contact-fuse/*",
              ],
              message: "packages/core must not do I/O or depend on other workspace packages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  prettier,
);
