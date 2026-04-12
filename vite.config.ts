import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, "front"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "front/src"),
    },
  },
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3001" },
  },
});
