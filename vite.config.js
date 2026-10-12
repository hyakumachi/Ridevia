import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // File change events are unreliable in the shared local workspace.
  server: { watch: { usePolling: true } },
});
