/** Small, dependency-free text and date helpers shared by the pages and the scripts. */

const SENTENCE_END = /[.!?]["'”’)\]]?\s/g;

/**
 * Shortens text to at most `max` characters. Prefers to stop at the end of a sentence;
 * otherwise cuts at a word boundary and adds an ellipsis.
 */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;

  const head = clean.slice(0, max);

  let sentenceEnd = -1;
  for (const match of head.matchAll(SENTENCE_END)) {
    sentenceEnd = match.index + match[0].length - 1;
  }
  if (sentenceEnd >= max * 0.55) return head.slice(0, sentenceEnd);

  const lastSpace = head.lastIndexOf(' ');
  // No usable space (one enormous "word"): cut by grapheme so emoji and accents are never split.
  const cut =
    lastSpace >= max * 0.5
      ? head.slice(0, lastSpace)
      : Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(clean), (s) => s.segment)
          .slice(0, max)
          .join('');
  return cut.replace(/[\s.,;:!?'"“‘(\[–—-]+$/u, '') + '…';
}

/** "2026-11-08" -> "8 Nov 2026" (in the given locale). Dates are treated as calendar days, not instants. */
export function formatDay(isoDate: string, locale: string): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** An ISO timestamp -> "8 Nov 2026". Always the UTC date, so every build machine prints the same thing. */
export function formatInstant(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** "https://www.github.com/someone/" -> "github.com/someone" */
export function displayUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    return (hostname.replace(/^www\./, '') + pathname).replace(/\/+$/, '');
  } catch {
    return url;
  }
}

/** 3 -> "03" */
export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * JSON that is safe inside a <script type="application/json"> or JSON-LD element:
 * with every "<" escaped, the text can never close the element or open a comment.
 */
export function jsonForScript(value: unknown): string {
  const escapedLessThan = '\\' + 'u003c';
  return JSON.stringify(value).replaceAll('<', escapedLessThan);
}
