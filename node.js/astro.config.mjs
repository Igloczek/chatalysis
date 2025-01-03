import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import node from "@astrojs/node";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [vue(), tailwind()],
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
});
