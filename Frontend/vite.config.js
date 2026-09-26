import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo local (npm run dev) las llamadas a /api se redirigen al backend
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": process.env.VITE_PROXY_TARGET || "http://localhost:8000",
    },
  },
});
