/**
 * Paints ten stand-in "photographs" into src/photos so the darkroom has something
 * to develop before your real frames arrive. Each one carries real EXIF, so the
 * camera readouts work exactly as they will for your own files.
 *
 *   npm run photos:placeholders
 *
 * Existing files are never overwritten. Delete the 0X-*.jpg placeholders (and
 * their entries in src/photos/photos.json) once your own photos are in.
 */
import sharp from 'sharp';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';

const DIR = new URL('../src/photos/', import.meta.url);

type Exif = { make: string; model: string; lens: string; focal: string; f: string; t: string; iso: string; date: string };
type Shot = { file: string; w: number; h: number; title: string; place: string; alt: string; exif: Exif; paint: (w: number, h: number) => string };

/* ---------- tiny helpers ---------- */

function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const f1 = (n: number) => n.toFixed(1);

/** A smooth-ish ridge line from left to right, closed down to the bottom edge. */
function ridge(w: number, h: number, base: number, amp: number, seed: number, steps = 90) {
  const r = random(seed);
  const p = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28];
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y =
      base -
      amp *
        (0.5 * Math.sin(t * 2.7 + p[0]) +
          0.28 * Math.sin(t * 6.1 + p[1]) +
          0.14 * Math.sin(t * 13.7 + p[2]) +
          0.06 * Math.sin(t * 31 + p[3]));
    pts.push(`${f1(t * w)},${f1(y)}`);
  }
  return `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
}

function pine(x: number, base: number, H: number, W: number) {
  const pts = [
    [0, -H], [0.18, -0.72], [0.1, -0.72], [0.32, -0.45], [0.18, -0.45], [0.5, -0.12], [0.06, -0.12], [0.06, 0],
  ];
  const right = pts.map(([dx, dy], i) => (i === 0 ? [x, base - H] : [x + dx * W, base + dy * H]));
  const left = [...pts].reverse().slice(0, -1).map(([dx, dy]) => [x - dx * W, base + dy * H]);
  return 'M' + [...right, ...left].map(([a, b]) => `${f1(a)},${f1(b)}`).join(' L') + ' Z';
}

const vignette = (strength = 0.55) => `
  <defs><radialGradient id="vig" cx="50%" cy="50%" r="72%">
    <stop offset="55%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000" stop-opacity="${strength}"/>
  </radialGradient></defs>
  <rect width="100%" height="100%" fill="url(#vig)"/>`;

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

/* ---------- scenes ---------- */

const lastLight = (w: number, h: number) =>
  svg(
    w,
    h,
    `<defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1b2140"/><stop offset=".42" stop-color="#6a3b5f"/>
        <stop offset=".66" stop-color="#e2804e"/><stop offset=".8" stop-color="#ffc977"/>
      </linearGradient>
      <radialGradient id="glow" cx=".68" cy=".6" r=".5">
        <stop offset="0" stop-color="#ffe7b0" stop-opacity=".95"/><stop offset=".22" stop-color="#ffb070" stop-opacity=".5"/>
        <stop offset="1" stop-color="#ff8a50" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffd9a8" stop-opacity="0"/><stop offset=".5" stop-color="#ffd9a8" stop-opacity=".22"/>
        <stop offset="1" stop-color="#ffd9a8" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#sky)"/>
    <rect width="100%" height="100%" fill="url(#glow)"/>
    <circle cx="${w * 0.68}" cy="${h * 0.61}" r="${w * 0.03}" fill="#fff3d2"/>
    <path d="${ridge(w, h, h * 0.68, h * 0.09, 11)}" fill="#a35a6b" opacity=".7"/>
    <rect y="${h * 0.55}" width="100%" height="${h * 0.25}" fill="url(#haze)"/>
    <path d="${ridge(w, h, h * 0.75, h * 0.1, 23)}" fill="#6d3557"/>
    <path d="${ridge(w, h, h * 0.83, h * 0.1, 37)}" fill="#40213f"/>
    <path d="${ridge(w, h, h * 0.93, h * 0.08, 41)}" fill="#1b1021"/>
    ${vignette(0.5)}`,
  );

const blueHour = (w: number, h: number) => {
  const r = random(7);
  let city = '';
  let windows = '';
  let x = -20;
  while (x < w) {
    const bw = 70 + r() * 150;
    const bh = h * (0.18 + r() * 0.42);
    const top = h - bh;
    city += `<rect x="${f1(x)}" y="${f1(top)}" width="${f1(bw)}" height="${f1(bh)}" fill="#070b19"/>`;
    if (r() > 0.7) city += `<rect x="${f1(x + bw / 2 - 2)}" y="${f1(top - 60)}" width="4" height="60" fill="#070b19"/>`;
    for (let wy = top + 22; wy < h - 20; wy += 34) {
      for (let wx = x + 14; wx < x + bw - 16; wx += 24) {
        if (r() < 0.2) {
          const warm = r() > 0.35 ? '#ffcf7a' : '#ffeec2';
          windows += `<rect x="${f1(wx)}" y="${f1(wy)}" width="10" height="15" fill="${warm}" opacity="${f1(0.45 + r() * 0.5)}"/>`;
        }
      }
    }
    x += bw + 4 + r() * 10;
  }
  return svg(
    w,
    h,
    `<defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#07112a"/><stop offset=".38" stop-color="#132a59"/>
        <stop offset=".62" stop-color="#3c5e98"/><stop offset=".8" stop-color="#b98c86"/><stop offset=".92" stop-color="#e7b089"/>
      </linearGradient>
      <radialGradient id="moonglow" cx=".72" cy=".18" r=".16">
        <stop offset="0" stop-color="#f6eedb" stop-opacity=".35"/><stop offset="1" stop-color="#f6eedb" stop-opacity="0"/>
      </radialGradient>
      <mask id="crescent"><rect width="100%" height="100%" fill="#fff"/><circle cx="${w * 0.735}" cy="${h * 0.172}" r="${w * 0.034}" fill="#000"/></mask>
    </defs>
    <rect width="100%" height="100%" fill="url(#sky)"/>
    <rect width="100%" height="100%" fill="url(#moonglow)"/>
    <circle cx="${w * 0.72}" cy="${h * 0.18}" r="${w * 0.036}" fill="#f6eedb" mask="url(#crescent)"/>
    ${city}${windows}
    ${vignette(0.45)}`,
  );
};

const shoreline = (w: number, h: number) => {
  const r = random(5);
  const horizon = h * 0.6;
  const sunX = w * 0.7;
  let glitter = '';
  for (let y = horizon + 4; y < h; y += 5 + r() * 4) {
    const depth = (y - horizon) / (h - horizon);
    const spread = 40 + depth * 380;
    const cx = sunX + (r() - 0.5) * spread;
    const len = (14 + r() * 90) * (0.6 + depth * 2);
    glitter += `<rect x="${f1(cx - len / 2)}" y="${f1(y)}" width="${f1(len)}" height="${f1(1.5 + depth * 3)}" fill="#fff4e0" opacity="${f1(0.15 + r() * 0.55 * (1 - depth * 0.6))}"/>`;
  }
  let waves = '';
  for (let y = horizon + 10; y < h; y += 14 + r() * 18) {
    waves += `<rect x="0" y="${f1(y)}" width="${w}" height="1.2" fill="#fff" opacity="${f1(0.03 + r() * 0.05)}"/>`;
  }
  return svg(
    w,
    h,
    `<defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#aebfcc"/><stop offset=".6" stop-color="#ebe1d5"/><stop offset=".95" stop-color="#f6cfae"/>
      </linearGradient>
      <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a7b6c0"/><stop offset=".35" stop-color="#6f8597"/><stop offset="1" stop-color="#2f4253"/>
      </linearGradient>
      <radialGradient id="sun" cx="${sunX / w}" cy="${(horizon - 34) / h}" r=".28">
        <stop offset="0" stop-color="#fff3dc" stop-opacity=".95"/><stop offset=".3" stop-color="#ffd8b0" stop-opacity=".35"/>
        <stop offset="1" stop-color="#ffd8b0" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#sky)"/>
    <rect width="100%" height="100%" fill="url(#sun)"/>
    <circle cx="${sunX}" cy="${horizon - 34}" r="${h * 0.032}" fill="#fff6e8"/>
    <path d="${ridge(w * 0.55, horizon + 2, horizon - 10, h * 0.03, 9)}" fill="#8a9aa8" opacity=".85"/>
    <rect y="${horizon}" width="${w}" height="${h - horizon}" fill="url(#sea)"/>
    ${waves}${glitter}
    ${vignette(0.4)}`,
  );
};

const pinesInFog = (w: number, h: number) => {
  const r = random(19);
  const layers = [
    { base: h * 0.52, color: '#a9b6b2', scale: 0.55 },
    { base: h * 0.64, color: '#84948f', scale: 0.75 },
    { base: h * 0.77, color: '#56655f', scale: 1 },
    { base: h * 0.92, color: '#26322e', scale: 1.35 },
  ];
  let body = '';
  layers.forEach((layer, i) => {
    let trees = '';
    for (let x = -40; x < w + 60; x += (34 + r() * 60) * layer.scale) {
      const H = (170 + r() * 260) * layer.scale;
      trees += `<path d="${pine(x, layer.base + r() * 20, H, H * 0.42)}"/>`;
    }
    // The ground starts above the trunks so the forest floor reads as one mass.
    const ground = layer.base - 80 * layer.scale;
    body += `<g fill="${layer.color}">${trees}<rect y="${ground}" width="${w}" height="${h - ground}"/></g>`;
    if (i < layers.length - 1) body += `<rect y="${layer.base - h * 0.2}" width="${w}" height="${h * 0.32}" fill="url(#fog)"/>`;
  });
  return svg(
    w,
    h,
    `<defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4e8e5"/><stop offset="1" stop-color="#b4c0bc"/></linearGradient>
      <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#eef1ef" stop-opacity="0"/><stop offset=".6" stop-color="#eef1ef" stop-opacity=".55"/>
        <stop offset="1" stop-color="#eef1ef" stop-opacity=".1"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>${body}
    ${vignette(0.35)}`,
  );
};

const nightMarket = (w: number, h: number) => {
  const r = random(3);
  const palette = ['#ffb347', '#ffd27a', '#ff6b6b', '#f9844a', '#4cc9f0', '#c77dff', '#fff1c1'];
  const pick = () => palette[Math.floor(r() * palette.length)];
  const layer = (n: number, rMin: number, rMax: number, oMin: number, oMax: number) => {
    let out = '';
    for (let i = 0; i < n; i++) {
      out += `<circle cx="${f1(r() * w)}" cy="${f1(h * 0.15 + r() * h * 0.7)}" r="${f1(rMin + r() * (rMax - rMin))}" fill="${pick()}" opacity="${f1(oMin + r() * (oMax - oMin))}"/>`;
    }
    return out;
  };
  const strand = (y0: number, sag: number, seed: number) => {
    const rr = random(seed);
    let dots = '';
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = t * w;
      const y = y0 + sag * 4 * t * (1 - t);
      dots += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(3 + rr() * 2.5)}" fill="#fff0c4" opacity="${f1(0.7 + rr() * 0.3)}"/>`;
    }
    return dots;
  };
  return svg(
    w,
    h,
    `<defs>
      <radialGradient id="bg" cx=".5" cy=".62" r=".8"><stop offset="0" stop-color="#2a1630"/><stop offset="1" stop-color="#09070d"/></radialGradient>
      <filter id="b1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
      <filter id="b2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
      <filter id="b3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <g filter="url(#b1)">${layer(26, 60, 150, 0.1, 0.28)}</g>
    <g filter="url(#b2)">${layer(34, 26, 80, 0.2, 0.5)}</g>
    <g filter="url(#b3)">${strand(h * 0.14, h * 0.16, 2)}${strand(h * 0.28, h * 0.1, 4)}${layer(14, 10, 24, 0.5, 0.9)}</g>
    ${vignette(0.6)}`,
  );
};

const windowLight = (w: number, h: number) => {
  const O = [w * 0.38, h * 0.22];
  const u = [w * 0.5, h * 0.06];
  const v = [w * 0.04, h * 0.44];
  const pane = (i: number, j: number) => {
    const g = 0.035;
    const a0 = i / 2 + g / 2;
    const a1 = (i + 1) / 2 - g / 2;
    const b0 = j / 3 + g / 2;
    const b1 = (j + 1) / 3 - g / 2;
    const at = (a: number, b: number) => `${f1(O[0] + u[0] * a + v[0] * b)},${f1(O[1] + u[1] * a + v[1] * b)}`;
    return `<polygon points="${at(a0, b0)} ${at(a1, b0)} ${at(a1, b1)} ${at(a0, b1)}"/>`;
  };
  let panes = '';
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) panes += pane(i, j);
  const r = random(13);
  let leaves = '';
  for (let i = 0; i < 9; i++) {
    const cx = w * (0.36 + r() * 0.22);
    const cy = h * (0.5 + r() * 0.2);
    leaves += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(w * 0.09)}" ry="${f1(w * 0.022)}" transform="rotate(${f1(-70 + r() * 110)} ${f1(cx)} ${f1(cy)})"/>`;
  }
  return svg(
    w,
    h,
    `<defs>
      <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#433026"/><stop offset="1" stop-color="#1f150f"/></linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1c13"/><stop offset="1" stop-color="#120b07"/></linearGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
      <filter id="softer" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#wall)"/>
    <g fill="#ffcf8f" opacity=".9" filter="url(#soft)">${panes}</g>
    <g fill="#ffb86b" opacity=".25" filter="url(#softer)">${panes}</g>
    <g fill="#1a100a" opacity=".55" filter="url(#soft)">${leaves}</g>
    <rect y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="url(#floor)"/>
    <rect y="${h * 0.8}" width="${w}" height="3" fill="#000" opacity=".4"/>
    ${vignette(0.6)}`,
  );
};

const dunes = (w: number, h: number) => {
  const s = (x: number, y: number) => `${f1(x * w)},${f1(y * h)}`;
  let ripples = '';
  const r = random(29);
  for (let i = 0; i < 14; i++) {
    const y = 0.84 + i * 0.012 + r() * 0.006;
    ripples += `<path d="M${s(0, y)} C${s(0.3, y - 0.02)} ${s(0.6, y + 0.02)} ${s(1, y - 0.01)}" stroke="#7d3f1d" stroke-width="2" fill="none" opacity="${f1(0.08 + r() * 0.12)}"/>`;
  }
  return svg(
    w,
    h,
    `<defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f9fc2"/><stop offset=".45" stop-color="#d6cbb8"/><stop offset=".55" stop-color="#f2d3a8"/></linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#sky)"/>
    <path d="M${s(0, 0.47)} C${s(0.17, 0.39)} ${s(0.33, 0.43)} ${s(0.5, 0.42)} C${s(0.67, 0.4)} ${s(0.83, 0.45)} ${s(1, 0.43)} L${s(1, 1)} L${s(0, 1)} Z" fill="#d9a46f"/>
    <path d="M${s(0, 0.6)} C${s(0.19, 0.5)} ${s(0.36, 0.53)} ${s(0.54, 0.58)} C${s(0.7, 0.62)} ${s(0.83, 0.53)} ${s(1, 0.57)} L${s(1, 1)} L${s(0, 1)} Z" fill="#e3a465"/>
    <path d="M${s(0.54, 0.58)} C${s(0.64, 0.66)} ${s(0.72, 0.8)} ${s(0.78, 1)} L${s(1, 1)} L${s(1, 0.57)} C${s(0.83, 0.53)} ${s(0.7, 0.62)} ${s(0.54, 0.58)} Z" fill="#a9592b" opacity=".8"/>
    <path d="M${s(0, 0.8)} C${s(0.23, 0.68)} ${s(0.42, 0.7)} ${s(0.61, 0.77)} C${s(0.78, 0.83)} ${s(0.89, 0.78)} ${s(1, 0.8)} L${s(1, 1)} L${s(0, 1)} Z" fill="#efb36f"/>
    <path d="M${s(0.61, 0.77)} C${s(0.53, 0.84)} ${s(0.46, 0.92)} ${s(0.42, 1)} L${s(0, 1)} L${s(0, 0.8)} C${s(0.23, 0.68)} ${s(0.42, 0.7)} ${s(0.61, 0.77)} Z" fill="#b4622f" opacity=".72"/>
    ${ripples}
    ${vignette(0.45)}`,
  );
};

const monsoonStreet = (w: number, h: number) => {
  const signs = [
    { x: 0.1, y: 0.2, sw: 0.36, sh: 0.08, c: '#ff4d6d' },
    { x: 0.58, y: 0.14, sw: 0.3, sh: 0.11, c: '#4cc9f0' },
    { x: 0.52, y: 0.36, sw: 0.22, sh: 0.06, c: '#ffd166' },
    { x: 0.14, y: 0.42, sw: 0.18, sh: 0.05, c: '#80ffdb' },
  ];
  const street = h * 0.66;
  let neon = '';
  let reflections = '';
  for (const sg of signs) {
    const x = sg.x * w;
    const y = sg.y * h;
    const sw = sg.sw * w;
    const sh = sg.sh * h;
    const rect = `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(sw)}" height="${f1(sh)}" rx="${f1(sh / 3)}" fill="none" stroke="${sg.c}" stroke-width="9"/>`;
    const bars = [0.2, 0.42, 0.62].map((t) => `<rect x="${f1(x + sw * t)}" y="${f1(y + sh * 0.32)}" width="${f1(sw * 0.12)}" height="${f1(sh * 0.36)}" rx="6" fill="${sg.c}"/>`).join('');
    neon += `<g filter="url(#glow)">${rect}${bars}</g><g>${rect}${bars}</g>`;
    // Wet-asphalt reflection: a narrow streak per sign, mirrored below the kerb and fading out.
    const rx = x + sw * 0.5;
    const top = street + (street - (y + sh)) * 0.18;
    reflections += `<rect x="${f1(rx - sw * 0.22)}" y="${f1(top)}" width="${f1(sw * 0.44)}" height="${f1(h * 0.26)}" fill="${sg.c}" mask="url(#fade)" opacity=".55"/>`;
  }
  const r = random(31);
  let rain = '';
  for (let i = 0; i < 260; i++) {
    const x = r() * w;
    const y = r() * h;
    const len = 40 + r() * 70;
    rain += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x - len * 0.22)}" y2="${f1(y + len)}" stroke="#dfefff" stroke-width="1.6" opacity="${f1(0.06 + r() * 0.16)}"/>`;
  }
  return svg(
    w,
    h,
    `<defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1115"/><stop offset=".66" stop-color="#162229"/><stop offset="1" stop-color="#0b1013"/></linearGradient>
      <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="16"/></filter>
      <filter id="smear" x="-60%" y="-20%" width="220%" height="140%"><feGaussianBlur stdDeviation="26 60"/></filter>
      <linearGradient id="fadeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
      <mask id="fade" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#fadeGrad)"/></mask>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect x="0" y="0" width="${w}" height="${h * 0.07}" fill="#05080a"/>
    ${neon}
    <rect y="${street}" width="${w}" height="${h - street}" fill="#0e171b" opacity=".75"/>
    <g filter="url(#smear)">${reflections}</g>
    ${rain}
    ${vignette(0.6)}`,
  );
};

const waxingMoon = (w: number, h: number) => {
  const r = random(17);
  let stars = '';
  for (let i = 0; i < 170; i++) {
    stars += `<circle cx="${f1(r() * w)}" cy="${f1(r() * h)}" r="${f1(0.6 + r() * 1.4)}" fill="#fff" opacity="${f1(0.2 + r() * 0.7)}"/>`;
  }
  const cx = w / 2;
  const cy = h / 2;
  const R = w * 0.29;
  let maria = '';
  for (let i = 0; i < 10; i++) {
    const a = r() * 6.28;
    const d = r() * R * 0.7;
    maria += `<ellipse cx="${f1(cx + Math.cos(a) * d)}" cy="${f1(cy + Math.sin(a) * d)}" rx="${f1(R * (0.12 + r() * 0.2))}" ry="${f1(R * (0.08 + r() * 0.15))}" fill="#8e897e" opacity="${f1(0.3 + r() * 0.3)}"/>`;
  }
  let craters = '';
  for (let i = 0; i < 30; i++) {
    const a = r() * 6.28;
    const d = r() * R * 0.95;
    const cr = R * (0.015 + r() * 0.05);
    craters += `<circle cx="${f1(cx + Math.cos(a) * d)}" cy="${f1(cy + Math.sin(a) * d)}" r="${f1(cr)}" fill="none" stroke="#fffdf4" stroke-opacity=".25" stroke-width="2"/>`;
  }
  return svg(
    w,
    h,
    `<defs>
      <radialGradient id="face" cx=".42" cy=".42" r=".65"><stop offset="0" stop-color="#f4f1e7"/><stop offset="1" stop-color="#b9b4a6"/></radialGradient>
      <radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#cfd8e8" stop-opacity=".12"/><stop offset="1" stop-color="#cfd8e8" stop-opacity="0"/></radialGradient>
      <clipPath id="disc"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
      <filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
      <filter id="term" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="#050507"/>${stars}
    <circle cx="${cx}" cy="${cy}" r="${R * 1.6}" fill="url(#halo)"/>
    <g clip-path="url(#disc)">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#face)"/>
      <g filter="url(#b)">${maria}</g>${craters}
      <circle cx="${cx - R * 0.62}" cy="${cy}" r="${R * 1.02}" fill="#050507" opacity=".93" filter="url(#term)"/>
    </g>`,
  );
};

const redDoor = (w: number, h: number) => {
  const dx = w * 0.29;
  const dw = w * 0.42;
  const dy = h * 0.25;
  const dh = h * 0.58;
  let panels = '';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const px = dx + dw * (0.1 + col * 0.43);
      const py = dy + dh * (0.06 + row * 0.31);
      panels += `<rect x="${f1(px)}" y="${f1(py)}" width="${f1(dw * 0.37)}" height="${f1(dh * 0.26)}" fill="#992a22" stroke="#7d1f19" stroke-width="5"/>`;
      panels += `<rect x="${f1(px + 6)}" y="${f1(py + 6)}" width="${f1(dw * 0.37 - 12)}" height="3" fill="#d4594c" opacity=".55"/>`;
    }
  }
  return svg(
    w,
    h,
    `<defs>
      <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ead8c2"/><stop offset="1" stop-color="#d6bea2"/></linearGradient>
      <linearGradient id="door" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bf3a2e"/><stop offset="1" stop-color="#a22f25"/></linearGradient>
      <filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#wall)"/>
    <rect x="${dx - w * 0.035}" y="${dy - h * 0.1}" width="${dw + w * 0.07}" height="${dh + h * 0.1}" fill="#f1e6d6" stroke="#cbb497" stroke-width="4"/>
    <rect x="${dx}" y="${dy - h * 0.085}" width="${dw}" height="${h * 0.07}" fill="#2f343d"/>
    ${[0.25, 0.5, 0.75].map((t) => `<rect x="${f1(dx + dw * t - 4)}" y="${f1(dy - h * 0.085)}" width="8" height="${f1(h * 0.07)}" fill="#f1e6d6"/>`).join('')}
    <rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" fill="url(#door)"/>${panels}
    <circle cx="${dx + dw * 0.86}" cy="${dy + dh * 0.53}" r="${w * 0.014}" fill="#d9a74a"/>
    <rect x="${w * 0.22}" y="${dy + dh}" width="${w * 0.56}" height="${h * 0.045}" fill="#c4ab8e"/>
    <rect x="0" y="${dy + dh + h * 0.045}" width="${w}" height="${h}" fill="#a68e77"/>
    <polygon points="0,0 ${w},0 ${w},${h * 0.12} 0,${h * 0.36}" fill="#3b2412" opacity=".18" filter="url(#b)"/>
    <path d="M${w * 0.8},${h * 0.9} L${w * 0.93},${h * 0.9} L${w * 0.91},${h * 0.83} L${w * 0.82},${h * 0.83} Z" fill="#6e3f2a"/>
    ${[...Array(7)].map((_, i) => `<ellipse cx="${f1(w * (0.84 + (i % 3) * 0.03))}" cy="${f1(h * (0.79 - i * 0.012))}" rx="${f1(w * 0.05)}" ry="${f1(w * 0.014)}" transform="rotate(${-60 + i * 20} ${f1(w * (0.84 + (i % 3) * 0.03))} ${f1(h * (0.79 - i * 0.012))})" fill="${i % 2 ? '#3f5f3b' : '#55804f'}"/>`).join('')}
    ${vignette(0.35)}`,
  );
};

/* ---------- the roll ---------- */

const SHOTS: Shot[] = [
  {
    file: '01-last-light.jpg', w: 1800, h: 1200, paint: lastLight,
    title: 'Last light', place: 'The ridge road',
    alt: 'Layered hills in silhouette under an orange and violet sunset',
    exif: { make: 'FUJIFILM', model: 'X-T30', lens: 'XF35mmF2 R WR', focal: '35/1', f: '56/10', t: '1/500', iso: '160', date: '2026:10:12 17:58:21' },
  },
  {
    file: '02-blue-hour.jpg', w: 1200, h: 1800, paint: blueHour,
    title: 'Blue hour', place: 'Old city rooftops',
    alt: 'A city skyline at dusk with lit windows and a thin crescent moon',
    exif: { make: 'Apple', model: 'iPhone 15 Pro', lens: 'iPhone 15 Pro back camera 6.765mm f/1.78', focal: '6765/1000', f: '178/100', t: '1/60', iso: '640', date: '2026:09:03 18:47:02' },
  },
  {
    file: '03-shoreline.jpg', w: 1920, h: 1080, paint: shoreline,
    title: 'Shoreline', place: 'Somewhere on the east coast',
    alt: 'A calm sea at sunrise with light glittering on the water',
    exif: { make: 'FUJIFILM', model: 'X-T30', lens: 'XF18-55mmF2.8-4 R LM OIS', focal: '55/1', f: '80/10', t: '1/1000', iso: '200', date: '2026:08:16 06:12:44' },
  },
  {
    file: '04-pines-in-fog.jpg', w: 1440, h: 1800, paint: pinesInFog,
    title: 'Pines in fog', place: 'Hill station, early',
    alt: 'Rows of pine trees fading into morning fog',
    exif: { make: 'SONY', model: 'ILCE-7M3', lens: 'FE 85mm F1.8', focal: '85/1', f: '40/10', t: '1/320', iso: '100', date: '2026:07:21 07:05:13' },
  },
  {
    file: '05-night-market.jpg', w: 1800, h: 1200, paint: nightMarket,
    title: 'Night market', place: 'Under the string lights',
    alt: 'Out-of-focus market lights glowing in warm and neon colours',
    exif: { make: 'SONY', model: 'ILCE-7M3', lens: 'FE 50mm F1.8', focal: '50/1', f: '18/10', t: '1/125', iso: '3200', date: '2026:06:29 21:34:50' },
  },
  {
    file: '06-window-light.jpg', w: 1200, h: 1800, paint: windowLight,
    title: 'Window light', place: 'Home, 4 pm',
    alt: 'Warm afternoon light falling through a window onto a dark wall',
    exif: { make: 'FUJIFILM', model: 'X-T30', lens: 'XF35mmF2 R WR', focal: '35/1', f: '28/10', t: '1/250', iso: '400', date: '2026:05:30 16:02:37' },
  },
  {
    file: '07-dunes.jpg', w: 1800, h: 1200, paint: dunes,
    title: 'Dunes', place: 'Desert camp',
    alt: 'Sand dunes catching golden-hour light under a pale sky',
    exif: { make: 'FUJIFILM', model: 'X-T30', lens: 'XF18-55mmF2.8-4 R LM OIS', focal: '24/1', f: '90/10', t: '1/640', iso: '160', date: '2026:01:18 16:51:08' },
  },
  {
    file: '08-monsoon-street.jpg', w: 1440, h: 1800, paint: monsoonStreet,
    title: 'Monsoon street', place: 'After the rain',
    alt: 'Neon signs reflected on a wet street at night with falling rain',
    exif: { make: 'Apple', model: 'iPhone 15 Pro', lens: 'iPhone 15 Pro back camera 6.765mm f/1.78', focal: '6765/1000', f: '178/100', t: '1/30', iso: '1250', date: '2025:08:09 22:18:33' },
  },
  {
    file: '09-waxing-moon.jpg', w: 1500, h: 1500, paint: waxingMoon,
    title: 'Waxing gibbous', place: 'From the terrace',
    alt: 'A waxing gibbous moon against a starry black sky',
    exif: { make: 'SONY', model: 'ILCE-7M3', lens: 'FE 70-300mm F4.5-5.6 G OSS', focal: '300/1', f: '80/10', t: '1/250', iso: '200', date: '2025:11:27 20:40:15' },
  },
  {
    file: '10-red-door.jpg', w: 1200, h: 1800, paint: redDoor,
    title: 'The red door', place: 'A lane worth walking',
    alt: 'A red panelled door in a cream wall with a potted plant beside it',
    exif: { make: 'FUJIFILM', model: 'X-T30', lens: 'XF35mmF2 R WR', focal: '35/1', f: '40/10', t: '1/400', iso: '200', date: '2025:10:05 11:26:49' },
  },
];

async function exists(url: URL) {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
}

async function render(shot: Shot) {
  const grain = await sharp({
    create: {
      width: shot.w,
      height: shot.h,
      channels: 3,
      background: '#808080',
      noise: { type: 'gaussian', mean: 128, sigma: 22 },
    },
  })
    .png()
    .toBuffer();
  return sharp(Buffer.from(shot.paint(shot.w, shot.h)))
    .blur(0.7)
    .composite([{ input: grain, blend: 'soft-light' }])
    .withExif({
      IFD0: { Make: shot.exif.make, Model: shot.exif.model, DateTime: shot.exif.date, Artist: 'PJ (placeholder)' },
      IFD2: {
        LensModel: shot.exif.lens,
        FocalLength: shot.exif.focal,
        FNumber: shot.exif.f,
        ExposureTime: shot.exif.t,
        ISOSpeedRatings: shot.exif.iso,
        DateTimeOriginal: shot.exif.date,
      },
    })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

await mkdir(DIR, { recursive: true });
const sidecarUrl = new URL('photos.json', DIR);
const sidecar: Record<string, unknown> = (await exists(sidecarUrl))
  ? JSON.parse(await readFile(sidecarUrl, 'utf8'))
  : {};

for (const shot of SHOTS) {
  const target = new URL(shot.file, DIR);
  if (await exists(target)) {
    console.log(`[photos] ${shot.file} already exists, leaving it alone`);
  } else {
    await writeFile(target, await render(shot));
    console.log(`[photos] painted ${shot.file}`);
  }
  sidecar[shot.file] ??= { title: shot.title, place: shot.place, alt: shot.alt };
}

await writeFile(sidecarUrl, JSON.stringify(sidecar, null, 2) + '\n', 'utf8');
console.log('[photos] captions are in src/photos/photos.json');
