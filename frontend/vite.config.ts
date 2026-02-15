import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // Alias '@' to the 'src' directory
    },
  },
  server: {
    watch: {
      usePolling: true,
      interval: 100, // optional: how often to poll
    },
    host: true, // allow external access (optional)
    proxy: {
      '/n8n': {
        target: 'http://n8n:5678',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/n8n/, ''),
        secure: false,
        ws: true,
      },
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
