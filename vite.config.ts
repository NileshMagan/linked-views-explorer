/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: { port: 3000 },

  test: {
    // Components render into a DOM, so the suite needs jsdom.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup-tests.ts"],

    // Vitest transforms with Vite, which is ESM-native — so msw and its
    // dependencies need no transform allowlist, and the fetch primitives jsdom
    // lacks are already provided. The Jest setup needed 40 lines of polyfills
    // and a transformIgnorePatterns regex for the same result.
    css: false,

    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        // Composition roots and ambient declarations: wiring with no branches.
        // Covering them would mean asserting that `createRoot` was called
        // rather than that anything works.
        "src/main.tsx",
        "src/store/store.ts",
        "src/mocks/**",
        "src/test/**",
        "src/**/*.d.ts",
      ],
      // A floor, not a target. Fails the build if a change lands without the
      // test that should have come with it.
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
