import { defineConfig } from "vite-plus";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [svelte(), svelteTesting(), tailwindcss()],

  server: {
    port: 5173,
    host: true,
  },

  build: {
    outDir: "dist",
    sourcemap: true,
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,svelte}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
