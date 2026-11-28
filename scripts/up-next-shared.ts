/**
 * Shared by the "Up next" scripts: reading a booked show (typed into the "Add a show" workflow),
 * keeping the list of shows in a repository variable, and looking films up on Letterboxd.
 */
import { site, type Booking } from '../src/site.config.ts';
import { filmSlug, type LetterboxdFilm } from '../src/lib/up-next.ts';

/* ---------- where the shows live ---------- */

export const REPO = process.env.GITHUB_REPOSITORY || site.upNext.repo;
/** The repository variable holding the booked shows, as JSON. Deploys read it; the show workflows write it. */
export const VARIABLE = 'UP_NEXT_SHOWS';

export const todayUtc = () => new Date().toISOString().slice(0, 10);

/** A GitHub REST call. `token` defaults to GITHUB_TOKEN; reading and writing the variable needs UP_NEXT_TOKEN (see the README). */
export async function github<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const token = init.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
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

/* ---------- the saved list ---------- */

/** The variable's text as shows; anything that isn't a show is dropped. */
export function parseShows(text: string | undefined): Booking[] {
  if (!text?.trim()) return [];
  const list: unknown = JSON.parse(text);
  if (!Array.isArray(list)) throw new Error(`${VARIABLE} isn't a list`);
  return list.filter((show): show is Booking => !!show && typeof show.date === 'string' && !!(show.film || show.title));
}

export const sortShows = (shows: Booking[]) =>
  [...shows].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));

/** The shows in the repository variable (none if it isn't set yet). */
export async function savedShows(): Promise<Booking[]> {
  try {
    const { value } = await github<{ value: string }>(`/repos/${REPO}/actions/variables/${VARIABLE}`, {
      token: process.env.UP_NEXT_TOKEN,
    });
    return parseShows(value);
  } catch (error) {
    if ((error as Error).message.includes(' 404 ')) return [];
    throw error;
  }
}

export async function saveShows(shows: Booking[]) {
  const value = JSON.stringify(sortShows(shows));
  const token = process.env.UP_NEXT_TOKEN;
  try {
    await github(`/repos/${REPO}/actions/variables/${VARIABLE}`, { method: 'PATCH', token, body: { name: VARIABLE, value } });
  } catch (error) {
    if (!(error as Error).message.includes(' 404 ')) throw error;
    await github(`/repos/${REPO}/actions/variables`, { method: 'POST', token, body: { name: VARIABLE, value } });
  }
}

/* ---------- reading what was typed ---------- */

/** What the "Add a show" form asks for. Empty strings are unanswered. */
export interface ShowInput {
  film: string;
  date: string;
  time: string;
  /** The dropdown's pick; "Another cinema…" defers to `otherCinema`. */
  cinema: string;
  otherCinema: string;
  tag: string;
}

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

/** The form's answers as a booking, or what's wrong with them. */
export async function readShow(input: ShowInput, today = todayUtc()) {
  const problems: string[] = [];
  const film = input.film.trim().replace(/\s+/g, ' ');
  const dateText = input.date.trim();
  const timeText = input.time.trim();

  let link: string | null = null;
  const linkText = film.match(/(?:https?:\/\/)?(?:www\.)?(?:letterboxd\.com|boxd\.it)\/\S+/i)?.[0];
  if (!film) problems.push('Film is empty: give its title, or its Letterboxd link.');
  else if (linkText) {
    try {
      link = await letterboxdFilm(linkText);
      if (!link) problems.push(`${linkText} isn't a Letterboxd film page. Use the film's letterboxd.com/film/… link.`);
    } catch {
      problems.push(`Couldn't open ${linkText}. Try the film's letterboxd.com/film/… link instead.`);
    }
  }

  const date = readDate(dateText, today);
  if (!date) problems.push(`Date "${dateText}" isn't a date I can read. Try 2026-12-18 or 18 Dec.`);
  const time = timeText ? readTime(timeText) : undefined;
  if (time === null) problems.push(`Time "${timeText}" isn't a 24-hour time. Write it like 20:50.`);

  const picked = input.cinema.trim();
  const cinema = input.otherCinema.trim() || (/^another cinema/i.test(picked) ? '' : picked);
  const tag = input.tag.trim() || undefined;

  if (problems.length || !date) return { booking: null, problems, slug: undefined };
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
  const runtime = Number(html.match(/(\d{2,3})\s*(?:&nbsp;| )mins/)?.[1]);
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
