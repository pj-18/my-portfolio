/**
 * Adds and removes booked shows. Run by .github/workflows/add-show.yml and remove-show.yml:
 *
 *   node scripts/up-next-shows.ts add      reads the form's answers from the environment, checks them,
 *                                          and saves the show in the UP_NEXT_SHOWS repository variable
 *   node scripts/up-next-shows.ts remove   drops the shows matching FILM (and DATE, if given)
 *
 * Needs UP_NEXT_TOKEN (a token that can read and write Actions variables). Sets `deploy=true` in
 * GITHUB_OUTPUT when the site should rebuild, and writes a summary on the run's page.
 */
import { appendFile } from 'node:fs/promises';
import { filmSlug } from '../src/lib/up-next.ts';
import type { Booking } from '../src/site.config.ts';
import { lookUp, readDate, readShow, savedShows, saveShows, sortShows, todayUtc } from './up-next-shared.ts';

const today = todayUtc();
const env = (name: string) => process.env[name] ?? '';
const log = (message: string) => console.log(`[up-next] ${message}`);
const append = async (file: string | undefined, text: string) => {
  if (file) await appendFile(file, text);
};
const summary = (text: string) => append(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);

function fail(problems: string[]): never {
  for (const problem of problems) console.log(`::error::${problem}`);
  process.exit(1);
}

const whenText = (show: Booking) =>
  new Date(`${show.date}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: show.date.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric',
    timeZone: 'UTC',
  }) + (show.time ? `, ${show.time}` : '');

const label = (show: Booking) => show.title ?? filmSlug(show) ?? 'Untitled';
const sameShow = (a: Booking, b: Booking) => filmSlug(a) === filmSlug(b) && a.date === b.date && (a.time ?? '') === (b.time ?? '');

async function list(shows: Booking[]) {
  await summary(
    shows.length
      ? ['### Booked shows', '', ...shows.map((show) => `- **${label(show)}** · ${[whenText(show), show.at, show.tag].filter(Boolean).join(' · ')}`)].join('\n')
      : '### No shows booked',
  );
}

async function add() {
  const { booking, problems, slug } = await readShow(
    {
      film: env('FILM'),
      date: env('DATE'),
      time: env('TIME'),
      cinema: env('CINEMA'),
      otherCinema: env('OTHER_CINEMA'),
      tag: env('TAG'),
    },
    today,
  );
  if (booking && booking.date < today) problems.push(`Date ${booking.date} has already passed.`);
  if (!booking || problems.length) fail(problems);

  // Which film did that name find? Only to tell you: a miss still books the show (without a poster).
  let film = null;
  if (slug) {
    try {
      film = await lookUp(slug);
    } catch {
      // Letterboxd unreachable: the build tries again
    }
  }
  const warning =
    !film && slug
      ? `I couldn't find **${booking.title ?? slug}** on Letterboxd (I tried letterboxd.com/film/${slug}/), so the ticket will have no poster. Remove the show and add it again with the film's Letterboxd link.`
      : '';
  if (warning) console.log(`::warning::${warning.replace(/\*\*/g, '')}`);

  const shows = (await savedShows()).filter((show) => show.date >= today && !sameShow(show, booking));
  shows.push(booking);
  await saveShows(shows);

  const title = film?.title ?? label(booking);
  log(`${title}, ${booking.date}: ${shows.length} booked`);
  await summary(
    [
      `### 🎟️ ${title}`,
      [whenText(booking), booking.at, booking.tag].filter(Boolean).join(' · '),
      film ? `Letterboxd: [${film.title}${film.year ? ` (${film.year})` : ''}](${film.url})${film.runtime ? `, ${film.runtime} mins` : ''}. Wrong film? Remove the show and add it again with the Letterboxd link.` : warning,
      'On the site in a couple of minutes, and off it the morning after the show.',
      '',
    ].join('\n\n'),
  );
  await list(sortShows(shows));
  await append(process.env.GITHUB_OUTPUT, 'deploy=true\n');
}

async function remove() {
  const text = env('FILM').trim().toLowerCase();
  const date = env('DATE').trim() ? readDate(env('DATE'), today) : null;
  if (env('DATE').trim() && !date) fail([`Date "${env('DATE')}" isn't a date I can read. Try 2026-12-18 or 18 Dec.`]);

  const shows = await savedShows();
  // "dune", "Dune: Part Three" and "dune-part-three" all find the same show
  const plain = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const matches = (show: Booking) =>
    (!text || plain(`${label(show)} ${filmSlug(show) ?? ''}`).includes(plain(text))) && (!date || show.date === date);
  if (!text && !date) fail(["Say which show: part of the film's title, a date, or both."]);

  const gone = shows.filter(matches);
  if (!gone.length) {
    await list(sortShows(shows));
    fail([`No booked show matches "${[env('FILM'), env('DATE')].filter(Boolean).join(' ')}". The booked shows are listed on this run's summary.`]);
  }
  const kept = shows.filter((show) => !matches(show) && show.date >= today);
  await saveShows(kept);
  log(`removed ${gone.length}, ${kept.length} left`);
  await summary(`### Removed\n\n${gone.map((show) => `- ${label(show)} · ${whenText(show)}`).join('\n')}\n`);
  await list(sortShows(kept));
  await append(process.env.GITHUB_OUTPUT, 'deploy=true\n');
}

const command = process.argv[2];
if (command === 'add') await add();
else if (command === 'remove') await remove();
else {
  console.error('usage: node scripts/up-next-shows.ts add | remove');
  process.exit(1);
}
