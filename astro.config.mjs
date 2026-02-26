// @ts-check
import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import partytown from "@astrojs/partytown";

import sitemap from "@astrojs/sitemap";

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
    site: "https://genr234.com/",
    integrations: [preact(), partytown(), sitemap(), mdx()],
    vite: {
        optimizeDeps: {
            include: ["@preact/signals"],
        },
    },
});