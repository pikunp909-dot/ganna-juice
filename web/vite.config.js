import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy keeps the browser talking to one origin (5173);
// /api and /uploads are forwarded to the Express API (4000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      "/uploads": { target: "http://localhost:4000", changeOrigin: true }
    }
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 900
  }
});
