import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["ollama", "better-sqlite3"],
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          fabric: ["fabric"],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ["ollama", "better-sqlite3"],
  },
});
