import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build satu file HTML untuk pratinjau atau hosting statis: npm run build:single
export default defineConfig({ plugins: [react(), viteSingleFile()], build: { outDir: "dist-single" } });
