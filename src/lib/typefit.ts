/**
 * Build-time type measuring. The display face is measured here so headings can be sized to fit
 * their column exactly in CSS, and text can be drawn as outlines for the social card.
 */
import path from 'node:path';
import * as fontkit from 'fontkit';

const FILES = {
  display: '@fontsource/league-gothic/files/league-gothic-latin-400-normal.woff2',
  serif: '@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2',
  mono: '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
} as const;

export type Face = keyof typeof FILES;

const loaded = new Map<Face, fontkit.Font>();

function face(name: Face): fontkit.Font {
  let font = loaded.get(name);
  if (!font) {
    font = fontkit.openSync(path.resolve('node_modules', FILES[name])) as fontkit.Font;
    loaded.set(name, font);
  }
  return font;
}

/** Width of `text` in the display face, set in capitals, measured in ems. */
export function displayEm(text: string): number {
  const font = face('display');
  return Math.round((font.layout(text.toUpperCase()).advanceWidth / font.unitsPerEm) * 1000) / 1000;
}

export interface Outline {
  /** An SVG path `d` attribute with the text drawn at the requested position. */
  d: string;
  width: number;
}

/**
 * Draws one line of text as an SVG path. `x`/`y` is the left end of the baseline; `tracking`
 * is extra letter spacing in ems.
 */
export function outline(name: Face, text: string, size: number, x: number, y: number, tracking = 0): Outline {
  const font = face(name);
  const scale = size / font.unitsPerEm;
  const run = font.layout(text);
  let pen = x;
  let d = '';
  run.glyphs.forEach((glyph, i) => {
    const position = run.positions[i]!;
    d += glyph.path
      .scale(scale, -scale)
      .translate(pen + position.xOffset * scale, y - position.yOffset * scale)
      .toSVG();
    pen += position.xAdvance * scale + tracking * size;
  });
  return { d, width: pen - x - (run.glyphs.length > 0 ? tracking * size : 0) };
}

/** Width of one line of text, in the same units as `size`. */
export function measure(name: Face, text: string, size: number, tracking = 0): number {
  const font = face(name);
  const run = font.layout(text);
  return (run.advanceWidth / font.unitsPerEm) * size + Math.max(0, run.glyphs.length - 1) * tracking * size;
}

/** Greedy word wrap to a maximum line width. */
export function wrap(name: Face, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(name, candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}
