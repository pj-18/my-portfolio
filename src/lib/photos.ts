import type { ImageMetadata } from 'astro';
import path from 'node:path';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import manifest from '../../photos/photos.json';

export interface Photo {
  file: string;
  image: ImageMetadata;
  title: string;
  alt: string;
  location: string;
  /** Camera, lens and exposure, already formatted for display. Empty when the file has no EXIF. */
  exif: string[];
}

interface ManifestEntry {
  file: string;
  title?: string;
  alt?: string;
  location?: string;
}

const entries = manifest as ManifestEntry[];

const images = import.meta.glob<ImageMetadata>(
  '/photos/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}',
  { eager: true, import: 'default' },
);

async function readExif(file: string): Promise<string[]> {
  try {
    const { exif: raw } = await sharp(path.join(process.cwd(), 'photos', file)).metadata();
    if (!raw) return [];
    const exif = exifReader(raw);
    const image = exif.Image ?? {};
    const photo = exif.Photo ?? {};

    if (exif.GPSInfo?.GPSLatitude) {
      console.warn(`[photos] ${file} contains GPS coordinates. The published images are stripped, but the original in /photos is not.`);
    }

    const make = String(image.Make ?? '').trim();
    const model = String(image.Model ?? '').trim();
    const camera = model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`.trim();
    const iso = photo.ISOSpeedRatings ?? photo.PhotographicSensitivity;
    const exposure = Number(photo.ExposureTime);

    return [
      camera,
      String(photo.LensModel ?? '').trim(),
      photo.FocalLength ? `${Math.round(Number(photo.FocalLength))}mm` : '',
      photo.FNumber ? `f/${Number(photo.FNumber)}` : '',
      exposure ? (exposure < 1 ? `1/${Math.round(1 / exposure)}s` : `${exposure}s`) : '',
      iso ? `ISO ${Array.isArray(iso) ? iso[0] : iso}` : '',
    ].filter(Boolean);
  } catch {
    return [];
  }
}

const byName = new Map(Object.entries(images).map(([key, image]) => [key.split('/').pop()!, image]));
const listed = entries.map((entry) => entry.file);

// Order: as listed in photos.json, then any unlisted files alphabetically.
const order = [
  ...listed.filter((file) => byName.has(file)),
  ...[...byName.keys()].filter((file) => !listed.includes(file)).sort(),
];

export const photos: Photo[] = await Promise.all(
  order.map(async (file, index) => {
    const meta = entries.find((entry) => entry.file === file);
    if (!meta?.alt) {
      console.warn(`[photos] ${file} has no alt text in photos/photos.json. Add one so the photo is described to screen-reader users.`);
    }
    return {
      file,
      image: byName.get(file)!,
      title: meta?.title || `Photograph ${index + 1}`,
      alt: meta?.alt || `Photograph ${index + 1}`,
      location: meta?.location ?? '',
      exif: await readExif(file),
    };
  }),
);
