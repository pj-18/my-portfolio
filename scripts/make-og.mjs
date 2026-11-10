#!/usr/bin/env node
/**
 * Draws the social sharing image (public/og.png, 1200x630) and the home-screen
 * icon (public/apple-touch-icon.png) from the name and tagline in site.json.
 * Run it again with `npm run og` whenever either of those changes.
 *
 * Uses the Chrome installed on this machine, through Playwright.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(await readFile(path.join(root, 'src/content/site.json'), 'utf8'));
const font = await readFile(path.join(root, 'node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2'));

const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const steps = ['#16130c', '#47433b', '#959189', '#cdcac5', '#f9f8f4'];

const html = `<!doctype html>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: Archivo;
    src: url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');
    font-weight: 100 900;
    font-stretch: 62% 125%;
  }
  * { box-sizing: border-box; margin: 0; }
  body {
    display: grid;
    grid-template-rows: 1fr 64px;
    width: 1200px;
    height: 630px;
    background: #ffc410;
    color: #16130c;
    font-family: Archivo, sans-serif;
  }
  main { display: flex; flex-direction: column; justify-content: flex-end; gap: 26px; padding: 0 60px 44px; }
  h1 { font-size: 100px; font-stretch: 62%; font-weight: 900; line-height: 0.8; text-transform: uppercase; white-space: nowrap; width: max-content; }
  p { max-width: 21em; font-size: 38px; font-weight: 560; line-height: 1.16; letter-spacing: -0.012em; }
  .wedge { display: grid; grid-template-columns: repeat(5, 1fr); }
</style>
<main>
  <h1>${escape(site.name)}</h1>
  <p>${escape(site.tagline)}</p>
</main>
<div class="wedge">${steps.map((color) => `<span style="background:${color}"></span>`).join('')}</div>
<script>
  // Scale the name to span the full width, as it does on the site.
  document.fonts.ready.then(() => {
    const name = document.querySelector('h1');
    name.style.fontSize = (100 * 1080) / name.getBoundingClientRect().width + 'px';
    document.body.dataset.ready = 'true';
  });
</script>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.waitForSelector('body[data-ready]');
await page.screenshot({ path: path.join(root, 'public/og.png') });
await browser.close();
console.log('public/og.png');

await sharp(path.join(root, 'public/favicon.svg'), { density: 600 })
  .resize(180, 180)
  .png()
  .toFile(path.join(root, 'public/apple-touch-icon.png'));
console.log('public/apple-touch-icon.png');
