import { createHash } from 'node:crypto';
import { defineConfig, fontProviders } from 'astro/config';
import { site } from './src/lib/site.ts';
import { themeScript } from './src/lib/theme-script.ts';

// Fonts are self-hosted from the @fontsource packages in node_modules (no runtime CDN).
const font = (pkg: string, file: string) => `${pkg}/files/${file}.woff2`;

const sha256 = (text: string) => `sha256-${createHash('sha256').update(text).digest('base64')}` as const;

export default defineConfig({
  site: site.url,
  // Collapse whitespace the HTML way (Astro 7's default strips it using JSX rules).
  compressHTML: true,
  build: {
    // One page, one request: all CSS is inlined into the document.
    inlineStylesheets: 'always',
  },
  security: {
    // A Content Security Policy, written into each page as a <meta> tag at build time.
    // Astro adds a hash for every script and style it bundles, so nothing else can run:
    // no inline script without a matching hash, and nothing from another origin.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ],
      scriptDirective: {
        // The theme script is printed inline by hand (is:inline), so its hash is added by hand.
        hashes: [sha256(themeScript)],
      },
      styleDirective: {
        // Layout values are passed to CSS as style attributes (style="--ratio:1.5"), which hashes
        // cannot cover. Attributes cannot load or run anything, so allowing them is low risk.
        resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }],
      },
    },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'League Gothic',
      cssVariable: '--font-display',
      // The name is set at poster scale; a flash of fallback type there is worse than a short wait.
      display: 'block',
      fallbacks: ['Impact', 'Arial Narrow', 'sans-serif'],
      options: {
        variants: [
          {
            src: [font('@fontsource/league-gothic', 'league-gothic-latin-400-normal')],
            weight: 400,
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Newsreader',
      cssVariable: '--font-serif',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          {
            src: [font('@fontsource-variable/newsreader', 'newsreader-latin-wght-normal')],
            weight: '200 800',
            style: 'normal',
          },
          {
            src: [font('@fontsource-variable/newsreader', 'newsreader-latin-wght-italic')],
            weight: '200 800',
            style: 'italic',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-mono',
      fallbacks: ['ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      options: {
        variants: [
          {
            src: [font('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-400-normal')],
            weight: 400,
            style: 'normal',
          },
          {
            src: [font('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-500-normal')],
            weight: 500,
            style: 'normal',
          },
        ],
      },
    },
  ],
});
