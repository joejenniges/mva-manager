import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "child_process";

// WHY: Docker build uses VITE_COMMIT_HASH build arg (git not available in container).
// Local dev falls back to running git directly.
let commitHash = process.env.VITE_COMMIT_HASH || "";
if (!commitHash) {
  try { commitHash = execSync("git rev-parse --short HEAD").toString().trim(); } catch { commitHash = "dev"; }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3100",
    },
  },
  build: {
    outDir: "dist",
  },
});
