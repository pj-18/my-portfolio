/**
 * Reads every image in src/photos at build time: EXIF for the camera readout,
 * a dominant colour for the loading tone, and responsive WebP versions.
 *
 * Captions come from src/photos/photos.json (keyed by file name), falling back to
 * the title/caption/location you set in Lightroom or similar (IPTC), then to the
 * file name. GPS data is never read, and the published images carry no metadata.
 */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import exifr from 'exifr';
import sharp from 'sharp';
import path from 'node:path';
import captions from '../photos/photos.json';

type Caption = { title?: string; place?: string; alt?: string; date?: string; hidden?: boolean };

export interface Photo {
  id: string;
  title: string;
  place: string | null;
  alt: string;
  date: string | null;
  width: number;
  height: number;
  ratio: number;
  tone: string;
  thumb: { src: string; srcset: string };
  full: { src: string; srcset: string };
  camera: string | null;
  lens: string | null;
  focal: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: string | null;
}

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '../photos/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}',
  { eager: true },
);

const BRANDS: Record<string, string> = {
  fujifilm: 'Fujifilm', sony: 'Sony', nikon: 'Nikon', canon: 'Canon', apple: 'Apple', google: 'Google',
  samsung: 'Samsung', leica: 'Leica', ricoh: 'Ricoh', olympus: 'Olympus', panasonic: 'Panasonic',
  hasselblad: 'Hasselblad', xiaomi: 'Xiaomi', oneplus: 'OnePlus', 'om digital solutions': 'OM System',
};

function cameraName(make?: string, model?: string): string | null {
  const bare = (make ?? '').replace(/\b(corporation|corp\.?|co\.,?\s*ltd\.?|imaging|company)\b/gi, '').trim();
  const brand = BRANDS[bare.toLowerCase()] ?? bare;
  if (!model) return brand || null;
  if (!brand || model.toLowerCase().startsWith(bare.toLowerCase())) return model.trim();
  return `${brand} ${model.trim()}`;
}

const round = (n: number, digits = 1) => String(Number(n.toFixed(digits)));

function shutter(seconds?: number): string | null {
  if (!seconds) return null;
  return seconds >= 1 ? `${round(seconds)}s` : `1/${Math.round(1 / seconds)}s`;
}

function titleFromFile(file: string): string {
  const words = file
    .replace(/\.[^.]+$/, '')
    .replace(/^[\d\s._-]+/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return words ? words[0].toUpperCase() + words.slice(1) : 'Untitled';
}

async function tone(file: string): Promise<string> {
  try {
    const { dominant } = await sharp(file).resize(32, 32, { fit: 'inside' }).stats();
    return `rgb(${dominant.r} ${dominant.g} ${dominant.b})`;
  } catch {
    return 'rgb(40 34 30)';
  }
}

async function load(): Promise<Photo[]> {
  const notes = captions as Record<string, Caption>;
  const order = Object.keys(notes);
  const files = Object.entries(modules)
    .map(([key, mod]) => ({ name: path.basename(key), image: mod.default }))
    .filter(({ name }) => !notes[name]?.hidden)
    .sort((a, b) => {
      const ia = order.indexOf(a.name);
      const ib = order.indexOf(b.name);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
      return a.name.localeCompare(b.name);
    });

  return Promise.all(
    files.map(async ({ name, image }) => {
      const onDisk = path.join(process.cwd(), 'src', 'photos', name);
      const exif =
        (await exifr
          .parse(onDisk, {
            tiff: true,
            exif: true,
            iptc: true,
            gps: false,
            xmp: false,
            pick: [
              'Make', 'Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal',
              'ImageDescription', 'ObjectName', 'Caption', 'City', 'Sublocation', 'Country',
            ],
          })
          .catch(() => null)) ?? {};
      const note = notes[name] ?? {};
      const title = note.title ?? exif.ObjectName ?? titleFromFile(name);
      const place = note.place ?? ([exif.Sublocation, exif.City, exif.Country].filter(Boolean).join(', ') || null);
      const taken = exif.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal : null;

      const [thumb, full, color] = await Promise.all([
        getImage({ src: image, width: 1080, widths: [480, 720, 1080, 1440], format: 'webp', quality: 76 }),
        getImage({ src: image, width: 1600, widths: [1080, 1600, 2400], format: 'webp', quality: 82 }),
        tone(onDisk),
      ]);

      return {
        id: name.replace(/\.[^.]+$/, ''),
        title,
        place,
        alt: note.alt ?? exif.Caption ?? exif.ImageDescription ?? title,
        date: note.date ?? (taken ? taken.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : null),
        width: image.width,
        height: image.height,
        ratio: image.width / image.height,
        tone: color,
        thumb: { src: thumb.src, srcset: thumb.srcSet.attribute },
        full: { src: full.src, srcset: full.srcSet.attribute },
        camera: cameraName(exif.Make, exif.Model),
        lens: exif.LensModel ?? null,
        focal: exif.FocalLength ? `${round(exif.FocalLength, exif.FocalLength < 10 ? 1 : 0)}mm` : null,
        aperture: exif.FNumber ? `ƒ/${round(exif.FNumber)}` : null,
        shutter: shutter(exif.ExposureTime),
        iso: exif.ISO ? `ISO ${exif.ISO}` : null,
      } satisfies Photo;
    }),
  );
}

let cached: Promise<Photo[]> | null = null;
export const loadPhotos = () => (cached ??= load());
