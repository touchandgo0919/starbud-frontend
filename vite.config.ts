import { defineConfig } from "vite";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

import { cloudflare } from "@cloudflare/vite-plugin";

function copyRubiksTutorial() {
  return {
    name: "copy-rubiks-tutorial",
    closeBundle() {
      const directory = resolve(__dirname, "dist/rubiks");
      mkdirSync(directory, { recursive: true });
      copyFileSync(
        resolve(__dirname, "../docs/second-order-rubiks-cube-formulas.html"),
        resolve(directory, "index.html")
      );
    }
  };
}

export default defineConfig({
  plugins: [vue(), UnoCSS(), AutoImport({
    imports: ["vue", "vue-router", "pinia"],
    dts: false,
    vueTemplate: true
  }), Components({
    resolvers: [ElementPlusResolver()],
    dts: false
  }), cloudflare(), copyRubiksTutorial()],
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    chunkSizeWarningLimit: 1100
  }
});
