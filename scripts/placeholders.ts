/**
 * Lists the sample content that still needs replacing before the site goes live.
 *
 *   npm run placeholders             print the list
 *   npm run placeholders -- --strict  also exit with an error if anything is left (handy in CI)
 *
 * A file counts as a placeholder while its front matter (or, for JSON, its top level) says
 * `placeholder: true`. Delete that line once the content is yours.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { isExample, site } from '../src/lib/site.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

export interface Placeholder {
  where: string;
  what: string;
}

async function read(relative: string): Promise<string | null> {
  try {
    return await readFile(path.join(ROOT, relative), 'utf8');
  } catch {
    return null;
  }
}

async function list(relative: string, extension: string): Promise<string[]> {
  try {
    const names = await readdir(path.join(ROOT, relative));
    return names.filter((name) => name.endsWith(extension)).sort().map((name) => `${relative}/${name}`);
  } catch {
    return [];
  }
}

/** True when a Markdown file's front matter contains `placeholder: true`. */
function flaggedInFrontMatter(source: string): boolean {
  const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1] ?? '';
  return /^placeholder:\s*true\s*$/m.test(frontMatter);
}

export async function findPlaceholders(): Promise<Placeholder[]> {
  const found: Placeholder[] = [];
  const add = (where: string, what: string) => found.push({ where, what });

  // content/site.json
  if (isExample(site.url)) add('content/site.json  url', `still "${site.url}". Set your real domain.`);
  if (isExample(site.email)) add('content/site.json  email', `still "${site.email}".`);
  for (const link of site.links) {
    if (isExample(link.url)) add(`content/site.json  links (${link.label})`, `still "${link.url}".`);
  }
  if (!site.letterboxd.username) add('content/site.json  letterboxd.username', 'empty, so the Films section shows sample entries.');
  if (!site.chess.username) add('content/site.json  chess.username', 'empty, so ratings come from content/chess.md.');

  // Markdown with `placeholder: true`
  const markdown = ['content/bio.md', 'content/chess.md', ...(await list('content/experience', '.md')), ...(await list('content/projects', '.md'))];
  for (const file of markdown) {
    const source = await read(file);
    if (source && flaggedInFrontMatter(source)) add(file, 'sample text.');
  }

  // JSON with "placeholder": true
  const skills = await read('content/skills.json');
  if (skills && /"placeholder"\s*:\s*true/.test(skills)) add('content/skills.json', 'sample skills.');

  const captions = await read('photos/captions.json');
  if (captions) {
    try {
      const entries = Object.entries(JSON.parse(captions) as Record<string, { placeholder?: boolean }>);
      const samples = entries.filter(([, caption]) => caption?.placeholder === true).map(([name]) => name);
      if (samples.length > 0) add('photos/', `${samples.length} placeholder images (${samples[0]} … ${samples.at(-1)}).`);
    } catch {
      add('photos/captions.json', 'is not valid JSON.');
    }
  }

  return found;
}

if (import.meta.main) {
  const found = await findPlaceholders();
  if (found.length === 0) {
    console.log('No placeholders left.');
  } else {
    const width = Math.max(...found.map((p) => p.where.length));
    console.log(`${found.length} placeholders still to replace:\n`);
    for (const { where, what } of found) console.log(`  ${where.padEnd(width)}  ${what}`);
    console.log('\nSee README.md, "Placeholders to replace".');
    if (process.argv.includes('--strict')) process.exitCode = 1;
  }
}
