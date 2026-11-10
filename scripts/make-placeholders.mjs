#!/usr/bin/env node
/**
 * Generates the placeholder "photographs" in /photos.
 *
 * They are drawn, not shot: simple compositions in the site's own inks, with
 * film grain and made-up EXIF so the gallery, lightbox and EXIF readout can be
 * seen working. Replace them with real photographs (see the README), then you
 * never need this script again.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'photos');

const INK = '#16130c';
const YELLOW = '#ffc410';
const PAPER = '#f4f2ea';
const g = (l) => `hsl(48 6% ${l}%)`;

/** Each frame: file stem, width, height, and a function returning SVG body markup. */
const frames = [
  ['ridge', 2000, 1333, (w, h) => `
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g(62)}"/><stop offset="1" stop-color="${PAPER}"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <circle cx="${w * 0.68}" cy="${h * 0.42}" r="${h * 0.17}" fill="${YELLOW}"/>
    <path d="M0 ${h * 0.72} L${w * 0.22} ${h * 0.52} L${w * 0.41} ${h * 0.68} L${w * 0.6} ${h * 0.5} L${w * 0.83} ${h * 0.7} L${w} ${h * 0.58} V${h} H0Z" fill="${g(34)}"/>
    <path d="M0 ${h * 0.86} L${w * 0.3} ${h * 0.7} L${w * 0.55} ${h * 0.84} L${w * 0.78} ${h * 0.74} L${w} ${h * 0.88} V${h} H0Z" fill="${INK}"/>`],
  ['stairwell', 1333, 2000, (w, h) => `
    <rect width="${w}" height="${h}" fill="${g(78)}"/>
    ${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${h * (0.1 + i * 0.11)} L${w} ${h * (i * 0.11 - 0.12)} V${h * (i * 0.11 - 0.065)} L0 ${h * (0.155 + i * 0.11)}Z" fill="${i % 2 ? g(22) : g(40)}"/>`).join('')}
    <rect x="${w * 0.58}" y="${h * 0.62}" width="${w * 0.2}" height="${h * 0.38}" fill="${YELLOW}"/>
    <rect x="0" y="${h * 0.94}" width="${w}" height="${h * 0.06}" fill="${INK}"/>`],
  ['facade', 1600, 1600, (w, h) => `
    <rect width="${w}" height="${h}" fill="${g(58)}"/>
    ${Array.from({ length: 25 }, (_, i) => {
      const col = i % 5, row = Math.floor(i / 5);
      const x = w * (0.1 + col * 0.168), y = h * (0.1 + row * 0.168);
      return `<rect x="${x}" y="${y}" width="${w * 0.128}" height="${h * 0.128}" fill="${i === 17 ? YELLOW : i % 7 === 3 ? g(30) : INK}"/>`;
    }).join('')}`],
  ['shoreline', 2000, 1125, (w, h) => `
    <rect width="${w}" height="${h}" fill="${g(84)}"/>
    <rect y="${h * 0.38}" width="${w}" height="${h * 0.62}" fill="${g(46)}"/>
    <path d="M0 ${h * 0.62} C${w * 0.25} ${h * 0.52} ${w * 0.45} ${h * 0.74} ${w * 0.7} ${h * 0.62} S${w} ${h * 0.6} ${w} ${h * 0.6} V${h} H0Z" fill="${g(26)}"/>
    <path d="M0 ${h * 0.82} C${w * 0.3} ${h * 0.72} ${w * 0.55} ${h * 0.94} ${w} ${h * 0.78} V${h} H0Z" fill="${INK}"/>
    <rect x="${w * 0.16}" y="${h * 0.355}" width="${w * 0.09}" height="${h * 0.025}" fill="${YELLOW}"/>`],
  ['tower', 1440, 1800, (w, h) => `
    <defs><linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g(20)}"/><stop offset="1" stop-color="${g(66)}"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#dusk)"/>
    <path d="M${w * 0.36} ${h} V${h * 0.24} L${w * 0.5} ${h * 0.14} L${w * 0.64} ${h * 0.24} V${h}Z" fill="${INK}"/>
    <rect x="${w * 0.47}" y="${h * 0.3}" width="${w * 0.06}" height="${h * 0.045}" fill="${YELLOW}"/>
    <rect y="${h * 0.9}" width="${w}" height="${h * 0.1}" fill="${INK}"/>`],
  ['crossing', 2000, 1333, (w, h) => `
    <rect width="${w}" height="${h}" fill="${g(24)}"/>
    ${Array.from({ length: 7 }, (_, i) => {
      const t = i / 7, x0 = w * (0.5 + (t - 0.5) * 0.5), x1 = w * (0.5 + (t - 0.5) * 2.4), bw = 0.04;
      return `<path d="M${x0} ${h * 0.34} L${x0 + w * bw} ${h * 0.34} L${x1 + w * bw * 4.6} ${h} L${x1} ${h}Z" fill="${i === 4 ? YELLOW : PAPER}"/>`;
    }).join('')}
    <rect width="${w}" height="${h * 0.34}" fill="${g(52)}"/>`],
  ['moonrise', 1333, 2000, (w, h) => `
    <rect width="${w}" height="${h}" fill="${INK}"/>
    <circle cx="${w * 0.7}" cy="${h * 0.26}" r="${w * 0.075}" fill="${YELLOW}"/>
    <path d="M0 ${h * 0.74} L${w * 0.3} ${h * 0.6} L${w * 0.52} ${h * 0.7} L${w * 0.8} ${h * 0.56} L${w} ${h * 0.66} V${h} H0Z" fill="${g(20)}"/>
    <path d="M0 ${h * 0.88} L${w * 0.45} ${h * 0.76} L${w} ${h * 0.9} V${h} H0Z" fill="${g(32)}"/>`],
  ['long-shadows', 2000, 1333, (w, h) => `
    <rect width="${w}" height="${h}" fill="${g(86)}"/>
    ${Array.from({ length: 5 }, (_, i) => {
      const x = w * (0.14 + i * 0.17);
      return `<path d="M${x} ${h * 0.4} L${x + w * 0.012} ${h * 0.4} L${x + w * 0.3} ${h} L${x + w * 0.2} ${h}Z" fill="${g(38)}"/><rect x="${x}" y="${h * 0.12}" width="${w * 0.012}" height="${h * 0.29}" fill="${i === 2 ? YELLOW : INK}"/>`;
    }).join('')}`],
  ['arches', 2000, 1600, (w, h) => `
    <rect width="${w}" height="${h}" fill="${YELLOW}"/>
    ${[0.92, 0.72, 0.52, 0.32].map((r, i) => `<circle cx="${w * 0.5}" cy="${h}" r="${h * r}" fill="${[INK, g(70), INK, PAPER][i]}"/>`).join('')}`],
];

const exif = (index) => ({
  IFD0: {
    Make: 'Placeholder',
    Model: 'Placeholder Camera',
    ImageDescription: `Placeholder frame ${index}. Replace with a real photograph.`,
    Software: 'scripts/make-placeholders.mjs',
  },
  IFD2: {
    LensModel: 'Placeholder 35mm f/1.4',
    FNumber: ['28/10', '56/10', '80/10', '20/10'][index % 4],
    ExposureTime: ['1/250', '1/500', '1/60', '1/1000'][index % 4],
    ISOSpeedRatings: ['400', '200', '800', '100'][index % 4],
    FocalLength: '35/1',
    DateTimeOriginal: '2026:01:01 12:00:00',
  },
});

await mkdir(outDir, { recursive: true });
const manifest = [];

for (const [i, [stem, w, h, draw]] of frames.entries()) {
  const n = String(i + 1).padStart(2, '0');
  const label = `PLACEHOLDER ${n}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${draw(w, h)}
    <g font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${Math.round(w * 0.016)}" letter-spacing="${w * 0.002}">
      <rect x="${w * 0.03}" y="${h - w * 0.062}" width="${w * 0.2}" height="${w * 0.034}" fill="${INK}"/>
      <text x="${w * 0.04}" y="${h - w * 0.0395}" fill="${YELLOW}">${label}</text>
    </g>
  </svg>`;

  const grain = await sharp({ create: { width: w, height: h, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 26 } } })
    .png()
    .toBuffer();

  const file = `${n}-${stem}.jpg`;
  await sharp(Buffer.from(svg))
    .composite([{ input: grain, blend: 'soft-light' }])
    .jpeg({ quality: 84, mozjpeg: true })
    .withExif(exif(i + 1))
    .toFile(path.join(outDir, file));

  manifest.push({
    file,
    title: `Placeholder ${n}`,
    alt: `Placeholder image ${n}: an abstract ${stem.replace('-', ' ')} composition in black, grey and yellow.`,
    location: '',
  });
  console.log(`photos/${file}  ${w}x${h}`);
}

await writeFile(path.join(outDir, 'photos.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('photos/photos.json');
