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

  /** Reviews whose film title is listed here never appear in the one-liner ticker. */
  hideFromQuotes: [] as string[],

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
