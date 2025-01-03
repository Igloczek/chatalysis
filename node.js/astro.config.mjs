import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import node from "@astrojs/node";
import tailwind from "@astrojs/tailwind";
import path from "path";

export default defineConfig({
  integrations: [vue(), tailwind()],
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  vite: {
    resolve: {
      alias: {
        "@": path.resolve("./src"),
      },
    },
  },
});
