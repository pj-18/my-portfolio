/**
 * Loads and validates content/site.json. Imported by the Astro config, the pages and the
 * Node scripts in scripts/, so it must stay free of Astro-only (virtual module) imports.
 */
import { z } from 'astro/zod';
import raw from '../../content/site.json' with { type: 'json' };

const httpUrl = z.url({ protocol: /^https?$/ });
const usernameHint = 'use just the username, not the profile URL';

const section = z.object({
  /** Shown in the navigation and as the chapter title. */
  title: z.string().min(1),
  /** A few words for the contents list in the hero. */
  summary: z.string().default(''),
  /** One line under the chapter title. */
  intro: z.string().default(''),
});

const schema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  location: z.string().default(''),
  tagline: z.string().min(1),
  /** Used for the meta description and social cards. */
  description: z.string().min(1),
  /** The canonical address of the site, e.g. https://yourdomain.com */
  url: httpUrl,
  lang: z.string().default('en'),
  /** Controls how dates are written, e.g. en-GB gives "8 Nov 2026". */
  locale: z.string().default('en-GB'),
  email: z.email(),
  links: z.array(z.object({ label: z.string().min(1), url: httpUrl })).default([]),
  letterboxd: z
    .object({
      username: z.string().regex(/^[A-Za-z0-9_]{0,40}$/, usernameHint).default(''),
      /** How many diary entries to show (the first is featured). */
      entries: z.number().int().min(1).max(24).default(7),
    })
    .default({ username: '', entries: 7 }),
  chess: z
    .object({
      platform: z.enum(['lichess', 'chesscom']).default('lichess'),
      username: z.string().regex(/^[A-Za-z0-9_-]{0,40}$/, usernameHint).default(''),
    })
    .default({ platform: 'lichess', username: '' }),
  sections: z.object({
    work: section,
    films: section,
    photography: section,
    chess: section,
    contact: section,
  }),
});

const parsed = schema.safeParse(raw);
if (!parsed.success) {
  throw new Error(`content/site.json is not valid:\n${z.prettifyError(parsed.error)}`);
}

export const site = parsed.data;
export type Site = typeof site;
export type SectionId = keyof Site['sections'];

/** Page order. The numbering in the navigation follows this list. */
export const sectionIds = ['work', 'films', 'photography', 'chess', 'contact'] as const satisfies readonly SectionId[];

/** Site origin without a trailing slash. */
export const origin = site.url.replace(/\/+$/, '');

export const letterboxdUrl = site.letterboxd.username ? `https://letterboxd.com/${site.letterboxd.username}/` : null;

export const chessPlatform = site.chess.platform === 'lichess' ? 'Lichess' : 'Chess.com';

export const chessUrl = !site.chess.username
  ? null
  : site.chess.platform === 'lichess'
    ? `https://lichess.org/@/${site.chess.username}`
    : `https://www.chess.com/member/${site.chess.username}`;

/** True for the sample values this project ships with (example.com addresses, "your-handle"). */
export const isExample = (value: string): boolean =>
  /(^|[./@])example\.(com|org|net)\b/i.test(value) || /your-(handle|username|name)/i.test(value);

/** Every outbound profile link: the ones listed in site.json plus the film and chess profiles. */
export const profileLinks: { label: string; url: string }[] = [
  ...site.links,
  ...(letterboxdUrl ? [{ label: 'Letterboxd', url: letterboxdUrl }] : []),
  ...(chessUrl ? [{ label: chessPlatform, url: chessUrl }] : []),
];
