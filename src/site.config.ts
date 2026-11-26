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

export interface TestCase {
  /** `{films}` and `{reviews}` are swapped for live Letterboxd numbers. */
  name: string;
  time: string;
}

/** A show you've booked (read from its GitHub issue). Shown as a ticket in "Up next" until it's over. */
export interface Booking {
  /**
   * The film's Letterboxd page ('https://letterboxd.com/film/dune-part-two/'), when the issue gave
   * a link. Otherwise the page is guessed from `title`.
   */
  film?: string;
  /** Shown on the ticket. Optional when `film` is set: Letterboxd's title is used. */
  title?: string;
  /** Show day, `YYYY-MM-DD`. */
  date: string;
  /** Start time, 24-hour `HH:MM` (optional). */
  time?: string;
  /** The cinema, as picked or typed on the issue form, e.g. 'Prasads Multiplex: Hyderabad' (optional). */
  at?: string;
  /** Format or language, e.g. 'IMAX', 'Telugu', '4DX' (optional). */
  tag?: string;
}

export const site = {
  name: 'Praveen Kumar',
  nickname: 'PJ',
  role: 'Senior Software Engineer',
  description:
    'Praveen Kumar (PJ) is a senior software engineer who builds web apps and the tests that keep them honest. Off the clock: a Letterboxd film diary and a darkroom of photographs.',

  /**
   * Your email, in two halves on purpose: the whole address never appears in this repo or in the
   * page's HTML, so bots that harvest addresses from source don't find it. The page joins the
   * halves in the browser; with JavaScript off it reads "name [at] domain".
   */
  email: { user: 'praveenkumar.ponduru', domain: 'gmail.com' },
  links: [
    { label: 'GitHub', handle: 'pj-18', url: 'https://github.com/pj-18' },
    { label: 'LinkedIn', handle: 'praveenponduru', url: 'https://www.linkedin.com/in/praveenponduru/' },
    { label: 'Letterboxd', handle: 'pj_18', url: 'https://letterboxd.com/pj_18/' },
    { label: 'Instagram', handle: 'frames.by.pj', url: 'https://www.instagram.com/frames.by.pj/' },
  ],

  /** Your Letterboxd username. `npm run films` pulls its public RSS feed. */
  letterboxd: 'pj_18',


  /**
   * "Up next": the shows you've booked. BookMyShow has no public API and your bookings sit behind
   * your login, so when you book, open an issue on this repository with the "Up next" form
   * (edit it to change the show, close it to cancel). Each one drops off by itself once it's over;
   * posters come from Letterboxd. Issues are public: never put seat numbers or booking IDs in them.
   * Only issues the repository's owner opens are read.
   */
  upNextIssues: {
    repo: 'pj-18/my-portfolio',
    label: 'up-next',
    /** Show times are the cinema's local time: its UTC offset ('+05:30' is India). */
    utcOffset: '+05:30',
  },

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
    "I'm Praveen Kumar, [PJ|amber] to most. For seven years I've been building web apps and the automated tests that keep them honest. Most of my work sits where product code meets test code: [React|green] up front, [SQL|amber] underneath, and [Playwright|red] and [Cypress|green] suites that tell a team within minutes whether a change is *safe to ship*. When the laptop closes, the lights go down.",

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
  stack: ['React', 'JavaScript', 'Playwright', 'Cypress', 'SQL', 'Node.js', 'TypeScript', 'REST APIs', 'Git', 'CI/CD'],
};
