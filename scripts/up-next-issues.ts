/**
 * Looks after the "Up next" booking issues. Run by .github/workflows/up-next.yml:
 *
 *   node scripts/up-next-issues.ts check        an issue was opened, edited, closed…: label it, read it,
 *                                               and reply with what goes on the site (or what's wrong)
 *   node scripts/up-next-issues.ts close-past   every morning: close the issues of shows that are over
 *
 * Needs GITHUB_TOKEN with issues: write. Sets `deploy=true` in GITHUB_OUTPUT when the site should rebuild.
 */
import { appendFile, readFile } from 'node:fs/promises';
import { github, LABEL, looksLikeShow, lookUp, openShowIssues, OWNER, readShow, REPO, todayUtc, type Issue } from './up-next-shared.ts';

const MARK = '<!-- up-next-check -->';
const log = (message: string) => console.log(`[up-next] ${message}`);
const output = async (line: string) => {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `${line}\n`);
};

const labelNames = (issue: Issue) => issue.labels.map((label) => (typeof label === 'string' ? label : label.name));
const whenText = (date: string, time?: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(date.slice(0, 4) === todayUtc().slice(0, 4) ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  }) + (time ? `, ${time}` : '');

/** One comment from the bot per issue, kept up to date rather than piling up. */
async function reply(issue: Issue, text: string) {
  const comments = await github<{ id: number; body?: string }[]>(`/repos/${REPO}/issues/${issue.number}/comments?per_page=100`);
  const mine = comments.find((comment) => comment.body?.startsWith(MARK));
  const body = `${MARK}\n${text}`;
  if (mine?.body === body) return;
  if (mine) await github(`/repos/${REPO}/issues/comments/${mine.id}`, { method: 'PATCH', body: { body } });
  else await github(`/repos/${REPO}/issues/${issue.number}/comments`, { method: 'POST', body: { body } });
}

async function ensureLabel(issue: Issue) {
  if (labelNames(issue).includes(LABEL)) return;
  try {
    await github(`/repos/${REPO}/labels/${encodeURIComponent(LABEL)}`);
  } catch {
    await github(`/repos/${REPO}/labels`, {
      method: 'POST',
      body: { name: LABEL, color: 'ffb627', description: 'A booked show, shown in "Up next" on the site' },
    });
  }
  await github(`/repos/${REPO}/issues/${issue.number}/labels`, { method: 'POST', body: { labels: [LABEL] } });
}

async function check() {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH ?? '', 'utf8')) as {
    action: string;
    issue: Issue;
  };
  const { action, issue } = event;
  if (issue.user.login !== OWNER) return log(`#${issue.number} isn't the owner's; ignored`);
  const isShow = labelNames(issue).includes(LABEL) || looksLikeShow(issue.body);
  if (!isShow) return log(`#${issue.number} isn't a booking; ignored`);

  // closed, deleted, unlabelled…: nothing to check, the site just needs to catch up
  if (issue.state !== 'open' || action === 'deleted' || action === 'unlabeled') {
    log(`#${issue.number} ${action}: rebuilding`);
    return output('deploy=true');
  }

  await ensureLabel(issue);
  const today = todayUtc();
  const { booking, problems, slug } = await readShow(issue.body, today);
  if (booking && booking.date < today) problems.push(`**Date** ${booking.date} has already passed.`);

  let film = null;
  if (booking && !problems.length && slug) {
    try {
      film = await lookUp(slug);
    } catch {
      // Letterboxd unreachable: the build tries again
    }
  }
  const title = film?.title ?? booking?.title ?? slug ?? 'Untitled';

  if (!booking || problems.length) {
    await reply(
      issue,
      ['⚠️ **Not on the site yet.**', '', ...problems.map((p) => `- ${p}`), '', 'Edit the issue to fix it and I’ll check again.'].join('\n'),
    );
    log(`#${issue.number}: ${problems.length} problem(s)`);
    return output('deploy=true'); // in case it was on the site before this edit
  }

  const details = [whenText(booking.date, booking.time), booking.at, booking.tag].filter(Boolean).join(' · ');
  const found =
    film === null && slug
      ? `⚠️ I couldn't find **${title}** on Letterboxd (I tried [/film/${slug}/](https://letterboxd.com/film/${slug}/)), so the ticket will have no poster. Edit the issue and paste the film's Letterboxd link to fix it.`
      : film
        ? `Letterboxd: [${film.title}${film.year ? ` (${film.year})` : ''}](${film.url})${film.runtime ? `, ${film.runtime} mins` : ''}. Wrong film? Edit the issue and paste the right Letterboxd link.`
        : '';
  await reply(
    issue,
    [
      `🎟️ **${title}** · ${details}`,
      '',
      'On the site in a couple of minutes, and off it the morning after the show.',
      found,
      '',
      'Changed plans? Edit this issue. Cancelled? Close it.',
    ]
      .filter((line, i, all) => line || all[i - 1])
      .join('\n'),
  );

  const name = `🎬 ${title} · ${whenText(booking.date, booking.time)}`;
  if (issue.title !== name) {
    await github(`/repos/${REPO}/issues/${issue.number}`, { method: 'PATCH', body: { title: name } });
  }
  log(`#${issue.number}: ${title}, ${booking.date}`);
  await output('deploy=true');
}

async function closePast() {
  const today = todayUtc();
  let closed = 0;
  for (const issue of await openShowIssues()) {
    const { booking } = await readShow(issue.body, today);
    if (!booking || booking.date >= today) continue;
    await github(`/repos/${REPO}/issues/${issue.number}/comments`, {
      method: 'POST',
      body: { body: `<!-- up-next-done -->\nShow's over, so this one's closed. Hope it was a good one 🍿` },
    });
    await github(`/repos/${REPO}/issues/${issue.number}`, {
      method: 'PATCH',
      body: { state: 'closed', state_reason: 'completed' },
    });
    closed++;
  }
  log(`closed ${closed} past ${closed === 1 ? 'show' : 'shows'}`);
}

const command = process.argv[2];
if (command === 'check') await check();
else if (command === 'close-past') await closePast();
else {
  console.error('usage: node scripts/up-next-issues.ts check | close-past');
  process.exit(1);
}
