import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';

// The site URL lives with the rest of the editable content.
const site = JSON.parse(readFileSync(new URL('./src/content/site.json', import.meta.url), 'utf8'));

export default defineConfig({
  site: site.url,
  output: 'static',
  // One page, small stylesheet: inlining it removes the only render-blocking request.
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
});
