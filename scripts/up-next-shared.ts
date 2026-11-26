/**
 * Shared by the "Up next" scripts: reading booked shows out of GitHub issues
 * (opened with the form in .github/ISSUE_TEMPLATE/up-next.yml), and looking films up on Letterboxd.
 */
import { site, type Booking } from '../src/site.config.ts';
import { filmSlug, type LetterboxdFilm } from '../src/lib/up-next.ts';

/* ---------- where the booking issues live ---------- */

export const REPO = process.env.GITHUB_REPOSITORY || site.upNextIssues.repo;
/** Only issues the repository's owner opened count: anyone can open an issue on a public repo. */
export const OWNER = REPO.split('/')[0];
export const LABEL = site.upNextIssues.label;

export const todayUtc = () => new Date().toISOString().slice(0, 10);

export interface Issue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  user: { login: string };
  labels: (string | { name?: string })[];
  pull_request?: unknown;
}

/** A GitHub REST call. Uses GITHUB_TOKEN when there is one (always, in Actions); public reads work without. */
export async function github<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const response = await fetch(`https://api.github.com${path}`, {
    method: init.method ?? 'GET',
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'portfolio-build',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`GitHub said ${response.status} to ${init.method ?? 'GET'} ${path}`);
  return (response.status === 204 ? null : await response.json()) as T;
}

/** The owner's open booking issues. */
export async function openShowIssues(): Promise<Issue[]> {
  const issues = await github<Issue[]>(
    `/repos/${REPO}/issues?state=open&labels=${encodeURIComponent(LABEL)}&creator=${OWNER}&per_page=100`,
  );
  return issues.filter((issue) => !issue.pull_request);
}

/* ---------- reading the form ---------- */

/** The form's questions, as their headings appear in the issue (keep in step with the template). */
const FIELDS = {
  film: 'film',
  date: 'date',
  time: 'time',
  cinema: 'cinema',
  otherCinema: 'another cinema',
  tag: 'format or language',
} as const;

/** An issue form's body is "### Film\n\nDune\n\n### Date\n\n…"; unanswered questions say "_No response_". */
export function formAnswers(body: string | null): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const part of (body ?? '').replace(/\r\n?/g, '\n').split(/^###[ \t]+/m).slice(1)) {
    const end = part.indexOf('\n');
    const heading = (end < 0 ? part : part.slice(0, end)).trim().toLowerCase();
    const value = end < 0 ? '' : part.slice(end + 1).trim().replace(/\s+/g, ' ');
    answers[heading] = value === '_No response_' ? '' : value;
  }
  return answers;
}

export const looksLikeShow = (body: string | null) => {
  const answers = formAnswers(body);
  return FIELDS.film in answers && FIELDS.date in answers;
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Forgiving, because it's typed on a phone: '2026-12-18', '18/12/2026' (day first), '18 Dec',
 * 'Wed 18 December 2026', 'Dec 18'. Without a year it's the next 18 Dec to come.
 */
export function readDate(text: string, today = todayUtc()): string | null {
  const t = text
    .toLowerCase()
    .replace(/(\d)(st|nd|rd|th)\b/g, '$1')
    .replace(/[,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const month = (name: string) => (name.length >= 3 ? MONTHS.indexOf(name.slice(0, 3)) + 1 : 0);
  let year: number | undefined;
  let mon = 0;
  let day = 0;
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [year, mon, day] = [+m[1], +m[2], +m[3]];
  else if ((m = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}|\d{2}))?$/))) {
    [day, mon] = [+m[1], +m[2]];
    if (m[3]) year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  } else if ((m = t.match(/^(?:[a-z]+ )?(\d{1,2}) ([a-z]+)(?: (\d{4}))?$/))) {
    [day, mon] = [+m[1], month(m[2])];
    if (m[3]) year = +m[3];
  } else if ((m = t.match(/^(?:[a-z]+ )?([a-z]+) (\d{1,2})(?: (\d{4}))?$/))) {
    [mon, day] = [month(m[1]), +m[2]];
    if (m[3]) year = +m[3];
  } else return null;

  const iso = (y: number) => {
    const date = new Date(Date.UTC(y, mon - 1, day));
    return date.getUTCMonth() === mon - 1 && date.getUTCDate() === day ? date.toISOString().slice(0, 10) : null;
  };
  if (!mon || !day) return null;
  if (year) return iso(year);
  const thisYear = Number(today.slice(0, 4));
  const guess = iso(thisYear);
  return guess && guess < today ? iso(thisYear + 1) : guess;
}

/** 24-hour only, so there's never a guess about morning or evening: '20:50', '9:05', '20.50' → 'HH:MM'. */
export function readTime(text: string): string | null {
  const m = text.replace(/\s+/g, '').match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** Letterboxd links come in a few shapes; boil them down to the film's own page. */
async function letterboxdFilm(link: string): Promise<string | null> {
  let url = /^https?:\/\//i.test(link) ? link : `https://${link}`;
  // the app's Share button gives a boxd.it short link: follow it once to see where it points
  if (/^https?:\/\/boxd\.it\//i.test(url)) {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    url = response.headers.get('location') ?? '';
  }
  // letterboxd.com/film/dune/ and someone's letterboxd.com/pj_18/film/dune/ both name the film
  const slug = url.match(/letterboxd\.com\/(?:[^/?#]+\/)?film\/([^/?#]+)/i)?.[1];
  return slug ? `https://letterboxd.com/film/${slug.toLowerCase()}/` : null;
}

/** An issue's answers as a booking, or what's wrong with them. */
export async function readShow(body: string | null, today = todayUtc()) {
  const answers = formAnswers(body);
  const problems: string[] = [];
  const film = answers[FIELDS.film] ?? '';
  const dateText = answers[FIELDS.date] ?? '';
  const timeText = answers[FIELDS.time] ?? '';

  let link: string | null = null;
  const linkText = film.match(/(?:https?:\/\/)?(?:www\.)?(?:letterboxd\.com|boxd\.it)\/\S+/i)?.[0];
  if (!film) problems.push('**Film** is empty: give its title, or its Letterboxd link.');
  else if (linkText) {
    try {
      link = await letterboxdFilm(linkText);
      if (!link) problems.push(`${linkText} isn't a Letterboxd film page. Use the film's letterboxd.com/film/… link.`);
    } catch {
      problems.push(`Couldn't open ${linkText}. Try the film's letterboxd.com/film/… link instead.`);
    }
  }

  const date = readDate(dateText, today);
  if (!date) problems.push(`**Date** "${dateText}" isn't a date I can read. Try \`2026-12-18\` or \`18 Dec\`.`);
  const time = timeText ? readTime(timeText) : undefined;
  if (time === null) problems.push(`**Time** "${timeText}" isn't a 24-hour time. Write it like \`20:50\`.`);

  const picked = answers[FIELDS.cinema] ?? '';
  const cinema = answers[FIELDS.otherCinema] || (/^another cinema/i.test(picked) ? '' : picked);
  const tag = answers[FIELDS.tag] || undefined;

  if (problems.length || !date) return { booking: null, problems };
  const booking: Booking = {
    ...(link ? { film: link } : { title: film }),
    date,
    ...(time ? { time } : {}),
    ...(cinema ? { at: cinema } : {}),
    ...(tag ? { tag } : {}),
  };
  return { booking, problems, slug: filmSlug(booking) };
}

/* ---------- Letterboxd ---------- */

const UA = 'Mozilla/5.0 (compatible; portfolio-build/1.0)';

/** The film page's JSON-LD block carries the title, release date and poster; its footer, the running time. Null if there's no such page. */
export async function lookUp(slug: string): Promise<LetterboxdFilm | null> {
  const url = `https://letterboxd.com/film/${encodeURIComponent(slug)}/`;
  const response = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/html' },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const block = html.match(/<script type="application\/ld\+json">([^]*?)<\/script>/)?.[1] ?? '';
  const json = block.slice(block.indexOf('{'), block.lastIndexOf('}') + 1);
  const info = JSON.parse(json) as {
    name?: string;
    image?: string;
    url?: string;
    releasedEvent?: { startDate?: string }[];
  };
  const year = Number(
    info.releasedEvent?.[0]?.startDate?.slice(0, 4) || html.match(/\/films\/year\/(\d{4})\//)?.[1],
  );
  // the running time sits in the page footer: "150&nbsp;mins"
  const runtime = Number(html.match(/(\d{2,3})\s*(?:&nbsp;| )mins/)?.[1]);
  return {
    slug,
    title: info.name ?? slug,
    year: Number.isFinite(year) && year > 0 ? year : null,
    runtime: runtime > 0 ? runtime : null,
    // Letterboxd serves a few fixed sizes; 230×345 is plenty for the ticket (and sharp at 2x).
    poster: info.image ? info.image.replace(/-0-\d+-0-\d+-crop/, '-0-230-0-345-crop') : null,
    url: info.url ?? url,
  };
}
