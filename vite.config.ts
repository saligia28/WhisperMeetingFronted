import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,  // Enable polling for file changes (fixes HMR issues on some systems)
      interval: 100,     // Check for changes every 100ms
    },
  },
  preview: {
    port: 4173,
  },
});
