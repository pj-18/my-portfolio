/**
 * Ratings drawn as SVG stars instead of text glyphs, so a half star is a real half star
 * (not "½") and the shape is identical on every platform and font.
 * No env or Node imports: safe to use from both .astro files and client scripts.
 */

const PATH =
  'M12 1.5 14.56 9.37 22.84 9.38 16.15 14.25 18.7 22.12 12 17.26 5.3 22.12 7.85 14.25 1.16 9.38 9.44 9.37Z';

const icon = (half: boolean) =>
  `<svg class="star${half ? ' star--half' : ''}" viewBox="0 0 ${half ? 12 : 24} 24" aria-hidden="true" focusable="false"><path d="${PATH}"/></svg>`;

/** 3.5 → three full stars and a left-half star, as inline SVG markup. Sized in em, coloured by currentColor. */
export function starsMarkup(rating: number | null): string {
  if (rating == null) return '';
  return icon(false).repeat(Math.floor(rating)) + (rating % 1 ? icon(true) : '');
}

/** The same row, for drawing inside another SVG: stars `size` units tall, centred on `cx`, top edge at `y`. */
export function starsInSvg(rating: number, cx: number, y: number, size: number, gap = size * 0.12): string {
  const full = Math.floor(rating);
  const half = rating % 1 ? 1 : 0;
  const count = full + half;
  const width = (full + half / 2) * size + Math.max(0, count - 1) * gap;
  let x = cx - width / 2;
  let out = '';
  for (let i = 0; i < count; i++) {
    const isHalf = i === full;
    const w = isHalf ? size / 2 : size;
    out += `<svg x="${x.toFixed(2)}" y="${y}" width="${w}" height="${size}" viewBox="0 0 ${isHalf ? 12 : 24} 24"><path d="${PATH}" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>`;
    x += w + gap;
  }
  return out;
}

/** Plain-language rating for screen readers: 3.5 → "3.5 stars". */
export const starsLabel = (rating: number) => `${rating} ${rating === 1 ? 'star' : 'stars'}`;
