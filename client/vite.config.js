import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: env.VITE_PRODUCTION_BACKEND_URL || "http://18.204.4.86:3000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
