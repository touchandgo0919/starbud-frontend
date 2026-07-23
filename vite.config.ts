import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    AutoImport({
      imports: ["vue", "vue-router", "pinia"],
      dts: false,
      vueTemplate: true
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: false
    })
  ],
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    chunkSizeWarningLimit: 1100
  }
});
