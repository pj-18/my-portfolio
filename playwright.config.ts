import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;

/**
 * Checks run against the production build (`npm run build` first), served by
 * `astro preview`. They use the Chrome already installed on this machine, so
 * there is no browser download. To use Playwright's bundled Chromium instead,
 * remove the two `channel` lines and run `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
});
