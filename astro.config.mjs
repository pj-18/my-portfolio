// @ts-check
import { defineConfig } from 'astro/config';

// The deploy workflow passes SITE_URL and BASE_PATH (GitHub Pages serves project
// sites from /<repo>/). Locally both fall back to the root, so `npm run dev` just works.
export default defineConfig({
  site: process.env.SITE_URL || 'https://pj-18.github.io',
  base: process.env.BASE_PATH || '/',
  // Astro 7 defaults to JSX-style whitespace, which glues inline elements together.
  // Classic HTML whitespace collapsing is what this markup is written for.
  compressHTML: true,
  devToolbar: { enabled: false },
});
