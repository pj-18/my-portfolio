/** Prefix a public path with the configured base, with or without a trailing slash on BASE_URL. */
export function withBase(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const clean = path.replace(/^\/+/, '');
  return clean ? `${base}/${clean}` : `${base}/`;
}

export const pad = (n: number, size = 2) => String(n).padStart(size, '0');

export function ratingLabel(rating: number | null): string {
  if (rating == null) return 'Not rated';
  return `Rated ${rating} out of 5`;
}

/* Diary dates are plain YYYY-MM-DD strings: format them in UTC so they never shift a day. */
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
export const shortDate = (iso: string) =>
  day(iso).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });
export const longDate = (iso: string) =>
  day(iso).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const dayMonthYear = (iso: string) =>
  day(iso).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });

export type Segment = { kind: 'text' | 'em' | 'hl'; text: string; accent?: string };

/** Mini-markup from site.config.ts: [word|green] → highlighted keyword, *words* → serif italic. */
export function rich(source: string): Segment[] {
  const out: Segment[] = [];
  const pattern = /\[([^\]|]+)\|(green|amber|red)\]|\*([^*]+)\*/g;
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > last) out.push({ kind: 'text', text: source.slice(last, match.index) });
    if (match[1]) out.push({ kind: 'hl', text: match[1], accent: match[2] });
    else out.push({ kind: 'em', text: match[3] });
    last = match.index + match[0].length;
  }
  if (last < source.length) out.push({ kind: 'text', text: source.slice(last) });
  return out;
}

/** JSON that is safe to drop inside a <script type="application/json"> tag. */
export const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
