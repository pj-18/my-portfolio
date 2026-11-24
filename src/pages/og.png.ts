/**
 * /og.png, the 1200 x 630 card shown when the site is shared. Drawn at build time from
 * content/site.json, so it always carries the current name and line. Text is converted to
 * outlines with the site's own fonts, which keeps the result identical on every machine.
 */
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { sectionIds, site } from '../lib/site.ts';
import { measure, outline, wrap } from '../lib/typefit.ts';

const W = 1200;
const H = 630;
const MARGIN = 72;
const INK = '#0e0d0b';
const BONE = '#ede7da';
const MUTED = '#a49c8e';
const VERMILION = '#ff5a36';

const path = (d: string, fill: string) => `<path d="${d}" fill="${fill}"/>`;

/** Frame-line corners, as on the site. */
function corners(inset: number, length: number): string {
  const [l, t, r, b] = [inset, inset, W - inset, H - inset];
  const d = [
    `M${l} ${t + length}V${t}H${l + length}`,
    `M${r - length} ${t}H${r}V${t + length}`,
    `M${r} ${b - length}V${b}H${r - length}`,
    `M${l + length} ${b}H${l}V${b - length}`,
  ].join('');
  return `<path d="${d}" fill="none" stroke="${MUTED}" stroke-width="2"/>`;
}

export const GET: APIRoute = async () => {
  const name = site.name.toUpperCase();
  const column = W - MARGIN * 2;

  // The name fills the column, up to a sensible ceiling for very short names.
  const nameSize = Math.min(250, column / measure('display', name, 1));
  const nameBaseline = 318;

  const role = site.role.toUpperCase();
  const host = new URL(site.url).host.toUpperCase();
  const index = sectionIds
    .slice(0, 4)
    .map((id) => site.sections[id].title.toUpperCase())
    .join('  ·  ');

  const taglineSize = 38;
  const taglineLines = wrap('serif', site.tagline, taglineSize, 880).slice(0, 2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${INK}"/>
    ${corners(36, 30)}
    <circle cx="${MARGIN + 7}" cy="109" r="7" fill="${VERMILION}"/>
    ${path(outline('mono', role, 22, MARGIN + 28, 117, 0.08).d, BONE)}
    ${path(outline('display', name, nameSize, MARGIN, nameBaseline).d, BONE)}
    ${taglineLines.map((line, i) => path(outline('serif', line, taglineSize, MARGIN, 402 + i * 50).d, BONE)).join('')}
    ${path(outline('mono', host, 22, MARGIN, H - 68, 0.08).d, MUTED)}
    ${path(outline('mono', index, 22, W - MARGIN - measure('mono', index, 22, 0.08), H - 68, 0.08).d, MUTED)}
  </svg>`;

  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
  });
};
