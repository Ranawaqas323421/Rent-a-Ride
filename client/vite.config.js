import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api": {
          // Docker Compose supplies http://backend:3000. Local development
          // falls back to the backend running on the host.
          target:
            process.env.VITE_PRODUCTION_BACKEND_URL ||
            env.VITE_PRODUCTION_BACKEND_URL ||
            "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  };
});
