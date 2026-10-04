import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

// Vite is a dev convenience only (HTTPS on the LAN for phone camera access).
// The app must also run from a plain static server.
export default defineConfig({
  base: "./",
  plugins: [basicSsl()],
  server: {
    host: true,
    ws: false,
    fs: {
      // First four entries are Vite's defaults (setting the option replaces them); the last two keep readings and planning notes off the LAN.
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/validation/**", "**/.planning/**"],
    },
  },
});
