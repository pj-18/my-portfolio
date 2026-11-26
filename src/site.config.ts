/**
 * Everything personal lives in this file. Edit it and the page rebuilds around it.
 *
 * Rich text mini-markup (used by `about`):
 *   [word|green]  [word|amber]  [word|red]   → highlighted keyword
 *   *words*                                   → serif italic
 *
 * Entries marked `placeholder: true` are shown in `npm run dev` (with a dashed
 * outline so you can spot them) but are left out of production builds until
 * you replace them with the real thing.
 */

export type Accent = 'green' | 'amber' | 'red';

export interface Job {
  from: string;
  to: string;
  role: string;
  company: string;
  note?: string;
  placeholder?: boolean;
}

export interface TestCase {
  /** `{films}` and `{reviews}` are swapped for live Letterboxd numbers. */
  name: string;
  time: string;
}

// `.ts` so the build scripts, which run this file in plain Node, can load it too
import { theatres } from './theatres.ts';
export type { Theatre } from './theatres.ts';

/** A show you've booked. Shown as a ticket in "Up next" until it's over. */
export interface Booking {
  /**
   * The film on Letterboxd: its page URL ('https://letterboxd.com/film/dune-part-two/') or just
   * the slug ('dune-part-two'). Leave it out and it's guessed from `title`; set it when the guess
   * picks the wrong film (remakes, films sharing a name).
   */
  film?: string;
  /** Shown on the ticket. Optional when `film` is set: Letterboxd's title is used. */
  title?: string;
  /** Show day, `YYYY-MM-DD`. */
  date: string;
  /** Start time, 24-hour `HH:MM` (optional). */
  time?: string;
  /** A key from src/theatres.ts (e.g. 'amb'), or any text like 'Prasads, Hyderabad' (optional). */
  at?: string;
  /** Format or language, e.g. 'IMAX', 'Telugu', '4DX' (optional). */
  tag?: string;
  /** Your own poster, overriding Letterboxd's: a full URL, or a file in /public like '/up-next/film.jpg'. */
  poster?: string;
  placeholder?: boolean;
}

export const site = {
  name: 'Praveen Ponduru',
  nickname: 'PJ',
  role: 'Senior Software Engineer',
  description:
    'Praveen Ponduru (PJ) is a senior software engineer who builds web apps and the tests that keep them honest. Off the clock: a Letterboxd film diary and a darkroom of photographs.',

  email: 'praveenkumar.ponduru@gmail.com',
  links: [
    { label: 'GitHub', handle: 'pj-18', url: 'https://github.com/pj-18' },
    { label: 'LinkedIn', handle: 'praveenponduru', url: 'https://www.linkedin.com/in/praveenponduru/' },
    { label: 'Letterboxd', handle: 'pj_18', url: 'https://letterboxd.com/pj_18/' },
  ],

  /** Your Letterboxd username. `npm run films` pulls its public RSS feed. */
  letterboxd: 'pj_18',

  /** Your regular cinemas live in their own file: src/theatres.ts. */
  theatres,

  /**
   * "Up next": the shows you've booked. BookMyShow has no public API and your bookings sit behind
   * your login, so add them here when you book; each one drops off by itself once it's over.
   * Posters come from Letterboxd when the site builds (`npm run up-next` fetches them right away).
   * Never put seat numbers or booking IDs in here: this file is published with the site.
   *
   *   { film: 'dune-part-two', date: '2026-12-18', time: '19:30', at: 'amb', tag: 'IMAX' }
   */
  upNext: [
    { title: 'Dune: Part Three', date: '2026-12-16', time: '20:50', at: 'prasads' },
  ] as Booking[],

  /** Reviews whose film title is listed here never appear in the one-liner ticker. */
  hideFromQuotes: [] as string[],

  /**
   * "The soundtrack": your most-played artists and songs, from Last.fm.
   * Apple Music can't talk to Last.fm by itself, so a scrobbler app sends your plays there
   * (see the README). `npm run music` then pulls the charts; it needs a free Last.fm API key
   * in LASTFM_API_KEY (.env locally, a repository secret on GitHub).
   * Until there is data the section only appears in `npm run dev`, filled with sample data.
   */
  music: {
    /** Your Last.fm username. */
    lastfm: 'pj_18',
    /** Apple Music storefront (two-letter country code) used to find artwork, previews and links. */
    storefront: 'us',
    /** Which chart opens first: '1month', '12month' or 'overall'. */
    period: '12month',
    /** Artists or song titles to leave off the page (case doesn't matter). */
    hide: [] as string[],
  },

  about:
    "I'm Praveen Ponduru, [PJ|amber] to most. For seven years I've been building web apps and the automated tests that keep them honest. Most of my work sits where product code meets test code: [React|green] up front, [SQL|amber] underneath, and [Playwright|red] and [Cypress|green] suites that tell a team within minutes whether a change is *safe to ship*. When the laptop closes, the lights go down.",

  /** The terminal in "The Day Job" runs these as passing tests. */
  tests: [
    { name: 'ships web apps people actually use', time: '7y' },
    { name: 'writes tests that fail for one reason', time: '0.4s' },
    { name: 'speaks React, JavaScript and SQL', time: '1.1s' },
    { name: 'automates with Playwright and Cypress', time: '0.9s' },
    { name: 'keeps CI green and flaky tests rare', time: '2.3s' },
    { name: 'has opinions on {films} recent films', time: '2h 40m' },
    { name: 'knows golden hour by heart', time: '1/250s' },
  ] satisfies TestCase[],

  /** Rolls past in the work section. Trim or extend freely. */
  stack: ['React', 'JavaScript', 'TypeScript', 'Playwright', 'Cypress', 'SQL', 'Node.js', 'REST APIs', 'Git', 'CI/CD'],

  /** "Filmography": your roles, newest first. Replace these placeholders. */
  experience: [
    {
      from: '2023',
      to: 'Now',
      role: 'Senior Software Engineer',
      company: 'Company name',
      note: 'What you own, the scale of it, and the result you are proudest of.',
      placeholder: true,
    },
    {
      from: '2021',
      to: '2023',
      role: 'Software Engineer',
      company: 'Company name',
      note: 'What you built or tested, with which tools, and what changed because of it.',
      placeholder: true,
    },
    {
      from: '2019',
      to: '2021',
      role: 'Associate Software Engineer',
      company: 'Company name',
      note: 'Where you started and what you learned to do well.',
      placeholder: true,
    },
  ] satisfies Job[],
};
