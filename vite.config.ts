import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { supabaseConfig } from "./config/supabase-config";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: "pages-security-headers",
      apply: "build",
      generateBundle() {
        const template = readFileSync(new URL("./public/_headers", import.meta.url), "utf8");
        this.emitFile({
          type: "asset",
          fileName: "_headers",
          source: template.replaceAll("__SUPABASE_ORIGIN__", supabaseConfig.url),
        });
      },
    },
  ],
});
