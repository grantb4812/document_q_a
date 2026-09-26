import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Intercepts any request starting with /api
      "/api": {
        target: "http://127.0.0.1:3000", // Your backend server URL
        changeOrigin: true, // Changes the origin of the host header to the target URL
      },
      "/lab": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});
