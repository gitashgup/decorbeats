import { defineConfig } from "vite";

export default defineConfig({
  worker: { format: "es" },
  server: {
    host: true,
    port: 4173
  }
});
