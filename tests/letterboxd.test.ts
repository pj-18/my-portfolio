import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDiaryFeed } from '../src/lib/letterboxd.ts';

const POSTER = 'https://a.ltrbxd.com/resized/film-poster/5/1/8/51818-seven-samurai-0-600-0-900-crop.jpg?v=abc123';

/** Mirrors the structure of a real Letterboxd feed: reviews, plain diary entries and lists. */
const feed = (items: string) => `<?xml version='1.0' encoding='utf-8'?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:letterboxd="https://letterboxd.com" xmlns:tmdb="https://themoviedb.org">
  <channel>
    <title>Letterboxd - someone</title>
    <link>https://letterboxd.com/someone/</link>
    <description>Letterboxd - someone</description>
    ${items}
  </channel>
</rss>`;

const item = (inner: string) => `<item>${inner}<dc:creator>someone</dc:creator></item>`;

const review = item(`
  <title>Seven Samurai, 1954 - ★★★★½</title>
  <link>https://letterboxd.com/someone/film/seven-samurai/</link>
  <guid isPermaLink="false">letterboxd-review-1001</guid>
  <pubDate>Mon, 9 Nov 2026 06:39:36 +1300</pubDate>
  <letterboxd:watchedDate>2026-11-08</letterboxd:watchedDate>
  <letterboxd:rewatch>Yes</letterboxd:rewatch>
  <letterboxd:filmTitle>Seven Samurai</letterboxd:filmTitle>
  <letterboxd:filmYear>1954</letterboxd:filmYear>
  <letterboxd:memberRating>4.5</letterboxd:memberRating>
  <letterboxd:memberLike>Yes</letterboxd:memberLike>
  <tmdb:movieId>346</tmdb:movieId>
  <description><![CDATA[ <p><img src="${POSTER}"/></p> <p>Rain &amp; mud.<br>Kurosawa&#039;s <i>best</i>.</p><p>Second paragraph with a <a href="https://example.com">link</a>.</p> ]]></description>`);

const loggedOnly = item(`
  <title>Queen at Sea, 2026</title>
  <link>https://letterboxd.com/someone/film/queen-at-sea/</link>
  <guid isPermaLink="false">letterboxd-watch-1002</guid>
  <letterboxd:watchedDate>2026-10-28</letterboxd:watchedDate>
  <letterboxd:rewatch>No</letterboxd:rewatch>
  <letterboxd:filmTitle>Queen at Sea</letterboxd:filmTitle>
  <letterboxd:filmYear>2026</letterboxd:filmYear>
  <letterboxd:memberLike>No</letterboxd:memberLike>
  <description><![CDATA[ <p><img src="${POSTER}"/></p> <p>Watched on Wednesday October 28, 2026.</p> ]]></description>`);

const spoiler = item(`
  <title>Psycho, 1960 - ★★★★★</title>
  <link>https://letterboxd.com/someone/film/psycho/</link>
  <guid isPermaLink="false">letterboxd-review-1003</guid>
  <letterboxd:watchedDate>2026-10-20</letterboxd:watchedDate>
  <letterboxd:filmTitle>Psycho</letterboxd:filmTitle>
  <letterboxd:filmYear>1960</letterboxd:filmYear>
  <letterboxd:memberRating>5.0</letterboxd:memberRating>
  <description><![CDATA[ <p><img src="${POSTER}"/></p> <p><em>This review may contain spoilers.</em></p> <p>The twist is that she dies early.</p> ]]></description>`);

const list = item(`
  <title>Films ranked</title>
  <link>https://letterboxd.com/someone/list/films-ranked/</link>
  <guid isPermaLink="false">letterboxd-list-1004</guid>
  <description><![CDATA[ <p>A list, not a diary entry.</p> ]]></description>`);

test('reads a review: title, year, rating, flags, date and link', () => {
  const [entry] = parseDiaryFeed(feed(review), 10);
  assert.ok(entry);
  assert.equal(entry.id, 'letterboxd-review-1001');
  assert.equal(entry.title, 'Seven Samurai');
  assert.equal(entry.year, 1954);
  assert.equal(entry.rating, 4.5);
  assert.equal(entry.liked, true);
  assert.equal(entry.rewatch, true);
  assert.equal(entry.watchedDate, '2026-11-08');
  assert.equal(entry.url, 'https://letterboxd.com/someone/film/seven-samurai/');
  assert.equal(entry.posterUrl, POSTER);
  assert.equal(entry.spoilers, false);
});

test('reduces the review to plain text, decoding entities and keeping words apart', () => {
  const [entry] = parseDiaryFeed(feed(review), 10);
  assert.equal(entry?.review, "Rain & mud. Kurosawa's best. Second paragraph with a link.");
});

test('a film logged without a review has no review text and no rating', () => {
  const [entry] = parseDiaryFeed(feed(loggedOnly), 10);
  assert.equal(entry?.title, 'Queen at Sea');
  assert.equal(entry?.review, '');
  assert.equal(entry?.rating, null);
  assert.equal(entry?.liked, false);
});

test('a spoiler review is flagged and its text withheld', () => {
  const [entry] = parseDiaryFeed(feed(spoiler), 10);
  assert.equal(entry?.spoilers, true);
  assert.equal(entry?.review, '');
  assert.equal(entry?.rating, 5);
});

test('lists and other non-film items are skipped, order is kept, and the limit applies', () => {
  const all = parseDiaryFeed(feed(list + review + list + loggedOnly + spoiler), 10);
  assert.deepEqual(all.map((entry) => entry.title), ['Seven Samurai', 'Queen at Sea', 'Psycho']);
  assert.equal(parseDiaryFeed(feed(review + loggedOnly + spoiler), 2).length, 2);
});

test('untrusted values are dropped rather than passed through', () => {
  const hostile = item(`
    <link>https://letterboxd.com/someone/film/x/</link>
    <guid isPermaLink="false">letterboxd-review-1005</guid>
    <letterboxd:watchedDate>yesterday</letterboxd:watchedDate>
    <letterboxd:filmTitle>X &lt;script&gt;alert(1)&lt;/script&gt;</letterboxd:filmTitle>
    <letterboxd:filmYear>20255</letterboxd:filmYear>
    <letterboxd:memberRating>11</letterboxd:memberRating>
    <description><![CDATA[ <p><img src="http://evil.example/poster.jpg" onerror="alert(1)"/></p> <p>Fine.<script>alert(1)</script></p> ]]></description>`);
  const offSite = item(`
    <link>javascript:alert(1)</link>
    <letterboxd:filmTitle>Off-site link</letterboxd:filmTitle>`);

  const entries = parseDiaryFeed(feed(hostile + offSite), 10);
  assert.equal(entries.length, 1, 'the entry with a non-Letterboxd link is skipped');
  const [entry] = entries;
  assert.equal(entry?.posterUrl, null, 'only https posters from the Letterboxd CDN are kept');
  assert.equal(entry?.year, null);
  assert.equal(entry?.rating, null);
  assert.equal(entry?.watchedDate, null);
  // The title is plain text. Astro escapes it when rendering, so it can never become markup.
  assert.equal(entry?.title, 'X <script>alert(1)</script>');
});

test('very long reviews are capped', () => {
  const long = review.replace('Rain &amp; mud.', 'word '.repeat(2000));
  const [entry] = parseDiaryFeed(feed(long), 10);
  assert.ok(entry && entry.review.length <= 1501 && entry.review.endsWith('…'));
});

test('an empty feed gives no entries; a page that is not a feed is an error', () => {
  assert.deepEqual(parseDiaryFeed(feed(''), 10), []);
  assert.throws(() => parseDiaryFeed('<!doctype html><html><body>Just a moment...</body></html>', 10), /not an RSS feed/);
  assert.throws(() => parseDiaryFeed('', 10), /not an RSS feed/);
});
