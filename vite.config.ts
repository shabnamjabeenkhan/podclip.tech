import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tailwindcss(), 
    reactRouter(), 
    tsconfigPaths(),
  ],
  server: {
    allowedHosts: ["258e103d7709.ngrok-free.app"],
  },
});
// 9d3a6c7b9f8f.ngrok-free.app"