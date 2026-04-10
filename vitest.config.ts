import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    environmentMatchGlobs: [
      ["src/**/*.test.{ts,tsx}", "jsdom"],
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
})
