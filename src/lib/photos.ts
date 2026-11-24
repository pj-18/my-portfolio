/**
 * The gallery's data: every image in /photos, joined with its entry in photos/captions.json
 * and whatever EXIF the file carries. Location data is never read.
 */
import { statSync } from 'node:fs';
import path from 'node:path';
import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';
import exifr from 'exifr';
import sharp from 'sharp';
import { largestJpeg, responsive, type ResponsiveImage } from './images.ts';

export interface Photo {
  file: string;
  title: string;
  alt: string;
  /** width / height */
  ratio: number;
  /** e.g. "Lisbon · Feb 2026" */
  meta: string;
  /** e.g. "FUJIFILM X-T5 · XF33mmF1.4 R LM WR · 33mm · f/2.8 · 1/250s · ISO 400" */
  exif: string;
  /** average colour, shown while the image loads */
  colour: string;
  thumb: ResponsiveImage;
  full: ResponsiveImage;
  /** largest JPEG: the link target when JavaScript is unavailable */
  href: string;
}

const THUMB_WIDTHS = [320, 480, 720, 1080, 1600] as const;
const FULL_WIDTHS = [1280, 1920, 2560] as const;

const files = import.meta.glob<ImageMetadata>('/photos/*.{jpg,jpeg,png,webp,avif,tiff,JPG,JPEG,PNG,WEBP,AVIF,TIFF}', {
  eager: true,
  import: 'default',
});
// A glob so the gallery still builds if captions.json is deleted.
const captionFiles = import.meta.glob<unknown>('/photos/captions.json', { eager: true, import: 'default' });

const captionsSchema = z.record(
  z.string(),
  z.object({
    title: z.string().optional(),
    alt: z.string().optional(),
    location: z.string().optional(),
    /** Overrides the capture date from EXIF, e.g. "Feb 2026". */
    date: z.string().optional(),
    placeholder: z.boolean().optional(),
  }),
);

function readCaptions(): z.infer<typeof captionsSchema> {
  const raw = Object.values(captionFiles)[0];
  if (raw === undefined) return {};
  const parsed = captionsSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`photos/captions.json is not valid:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

/** "03-night_market.jpg" -> "Night market" */
function titleFromFile(file: string): string {
  const words = file.replace(/\.[^.]+$/, '').replace(/^[\d\s._-]+/, '').replace(/[._-]+/g, ' ').trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : file;
}

interface FileFacts {
  exif: string;
  taken: string;
  colour: string;
}

// EXIF and colour are read from disk once per file version, not on every dev-server request.
const factsCache = new Map<string, Promise<FileFacts>>();

function facts(absolute: string): Promise<FileFacts> {
  const { mtimeMs, size } = statSync(absolute);
  const key = `${absolute}:${mtimeMs}:${size}`;
  let pending = factsCache.get(key);
  if (!pending) {
    pending = readFacts(absolute);
    factsCache.set(key, pending);
  }
  return pending;
}

const number = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);
const text = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

async function readFacts(absolute: string): Promise<FileFacts> {
  // `pick` keeps the parser to these tags only, so GPS blocks are never touched.
  const tags: Record<string, unknown> =
    (await exifr
      .parse(absolute, {
        pick: ['Make', 'Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal'],
        reviveValues: false,
      })
      .catch(() => null)) ?? {};

  const make = text(tags.Make);
  const model = text(tags.Model);
  const makeWord = make.split(' ')[0]?.toLowerCase() ?? '';
  const camera = model && makeWord && !model.toLowerCase().includes(makeWord) ? `${make} ${model}` : model || make;

  const focal = number(tags.FocalLength);
  const aperture = number(tags.FNumber);
  const exposure = number(tags.ExposureTime);
  const iso = number(tags.ISO);

  const parts = [
    camera,
    text(tags.LensModel),
    focal && `${Math.round(focal)}mm`,
    aperture && `f/${Number(aperture.toFixed(1))}`,
    exposure && (exposure >= 1 ? `${Number(exposure.toFixed(1))}s` : `1/${Math.round(1 / exposure)}s`),
    iso && `ISO ${Math.round(iso)}`,
  ].filter(Boolean);

  // EXIF dates are "YYYY:MM:DD HH:MM:SS" in camera-local time; only the month and year are shown.
  const [, year, month] = /^(\d{4}):(\d{2})/.exec(text(tags.DateTimeOriginal)) ?? [];
  const taken =
    year && month
      ? new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
          new Date(Date.UTC(Number(year), Number(month) - 1, 1)),
        )
      : '';

  let colour = '#2a2622';
  try {
    const { data } = await sharp(absolute).resize(1, 1, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    colour = `#${[data[0], data[1], data[2]].map((channel) => (channel ?? 0).toString(16).padStart(2, '0')).join('')}`;
  } catch {
    // keep the neutral default
  }

  return { exif: parts.join(' · '), taken, colour };
}

export async function getPhotos(): Promise<Photo[]> {
  const captions = readCaptions();
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }));

  return Promise.all(
    entries.map(async ([key, image]) => {
      const file = path.posix.basename(key);
      const caption = captions[file] ?? {};
      const { exif, taken, colour } = await facts(path.resolve(`.${key}`));
      const title = caption.title?.trim() || titleFromFile(file);

      return {
        file,
        title,
        alt: caption.alt?.trim() || title,
        ratio: Math.round((image.width / image.height) * 1000) / 1000,
        meta: [caption.location?.trim(), caption.date?.trim() || taken].filter(Boolean).join(' · '),
        exif,
        colour,
        thumb: await responsive(image, THUMB_WIDTHS),
        full: await responsive(image, FULL_WIDTHS),
        href: await largestJpeg(image, FULL_WIDTHS),
      };
    }),
  );
}

/** Files with no alt text in captions.json, so the build can point them out. */
export function photosMissingAlt(): string[] {
  const captions = readCaptions();
  return Object.keys(files)
    .map((key) => path.posix.basename(key))
    .filter((file) => !captions[file]?.alt?.trim());
}
