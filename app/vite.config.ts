import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static read-only site. `public/studios.json` is committed by the composer and
// served as-is; no backend, no write API. Relative base so it works at any path
// (Cloudflare Pages root, local preview alike).
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "dist" },
});
