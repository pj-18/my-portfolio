const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayMonthYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "9 Nov" from an ISO date or timestamp. */
export const shortDate = (iso: string) => dayMonth.format(new Date(iso));

/** "9 Nov 2026" from an ISO date or timestamp. */
export const longDate = (iso: string) => dayMonthYear.format(new Date(iso));

/*
 * Emoji matching. Built from code points so the source stays readable:
 * a base emoji, optionally followed by skin tones, the "show as emoji" selector,
 * or further emoji glued on with a zero-width joiner (families, flags, and so on).
 */
const SHOW_AS_EMOJI = String.fromCodePoint(0xfe0f);
const JOINER = String.fromCodePoint(0x200d);
const SKIN_TONES = `[${String.fromCodePoint(0x1f3fb)}-${String.fromCodePoint(0x1f3ff)}]`;
const PICTOGRAPH = '\\p{Extended_Pictographic}';
const BASE = `(?:\\p{Emoji_Presentation}|${PICTOGRAPH}${SHOW_AS_EMOJI}|\\p{Regional_Indicator})`;
const EMOJI = new RegExp(
  `${BASE}(?:${JOINER}(?:\\p{Emoji_Presentation}|${PICTOGRAPH}${SHOW_AS_EMOJI}?)|${SKIN_TONES}|${SHOW_AS_EMOJI})*[ \\t]?`,
  'gu',
);

/**
 * Removes emoji. The site's typeface has none, and a single emoji makes the
 * browser search every system font while it lays out the page (about a third of
 * all layout time when measured). Excerpts are already shortened, and the full
 * review, emoji included, is one click away on Letterboxd. Text in other
 * scripts, Telugu for example, is left alone.
 */
export const withoutEmoji = (text: string) =>
  text
    .replace(EMOJI, '')
    .replace(/[ \t]+$/gm, '')
    .trim();

/** Cut text at a word boundary, adding an ellipsis only when something was removed. */
export function excerpt(text: string, max: number): string {
  const flat = text.replace(/\s*\n+\s*/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[\s.,;:!?-]+$/, '') + String.fromCodePoint(0x2026);
}

/** Rating as words, for screen readers: "3.5 out of 5 stars". */
export const ratingLabel = (rating: number) => `${rating} out of 5 stars`;
