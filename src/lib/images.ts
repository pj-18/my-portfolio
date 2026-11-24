/** Thin wrapper around Astro's image pipeline: one call gives AVIF, WebP and a JPEG fallback. */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

export interface ResponsiveImage {
  avif: string;
  webp: string;
  /** srcset for the fallback format */
  fallback: string;
  /** a single mid-sized fallback URL for the img `src` */
  src: string;
  width: number;
  height: number;
}

const QUALITY = { avif: 60, webp: 78, jpeg: 80 } as const;

/**
 * Picks the output widths for an image: every candidate that fits inside the original, plus
 * the original itself when it is noticeably larger than the last candidate.
 */
export function widthsFor(original: number, candidates: readonly number[]): number[] {
  const widths = candidates.filter((width) => width <= original);
  const largest = widths.at(-1) ?? 0;
  const ceiling = candidates.at(-1) ?? original;
  if (largest === 0 || (original < ceiling && original > largest * 1.15)) widths.push(original);
  return widths;
}

export async function responsive(source: ImageMetadata, candidates: readonly number[]): Promise<ResponsiveImage> {
  const widths = widthsFor(source.width, candidates);
  const largest = widths.at(-1)!;
  const make = (format: 'avif' | 'webp' | 'jpeg') =>
    getImage({ src: source, format, width: largest, widths, quality: QUALITY[format] });

  const [avif, webp, jpeg] = await Promise.all([make('avif'), make('webp'), make('jpeg')]);
  const middle = jpeg.srcSet.values[Math.floor((jpeg.srcSet.values.length - 1) / 2)];

  return {
    avif: avif.srcSet.attribute,
    webp: webp.srcSet.attribute,
    fallback: jpeg.srcSet.attribute,
    src: middle?.url ?? jpeg.src,
    width: source.width,
    height: source.height,
  };
}

/** The largest JPEG, for plain links to the full image. */
export async function largestJpeg(source: ImageMetadata, candidates: readonly number[]): Promise<string> {
  const widths = widthsFor(source.width, candidates);
  const image = await getImage({ src: source, format: 'jpeg', width: widths.at(-1)!, quality: QUALITY.jpeg });
  return image.src;
}
