import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "packages/*/src/**/*.spec.ts", "packages/*/__tests__/**/*.test.ts", "packages/*/__tests__/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/fixtures/**"],
    },
  },
});
