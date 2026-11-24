/**
 * Content collections. Each Markdown file in content/experience and content/projects becomes
 * one entry; the schemas below describe the front matter each file may carry.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const httpUrl = z.url({ protocol: /^https?$/ });

/** Accepts "2022-03", 2022 or a full YAML date, and normalises to "2022-03" / "2022". */
const yearMonth = z
  .union([z.string(), z.number(), z.date()])
  .transform((value) => (value instanceof Date ? value.toISOString().slice(0, 7) : String(value).trim()))
  .pipe(z.string().regex(/^\d{4}(-\d{2})?$/, 'use a year or a year and month, e.g. "2022-03"'));

const experience = defineCollection({
  loader: glob({ base: './content/experience', pattern: '*.md' }),
  schema: z.object({
    role: z.string().min(1),
    company: z.string().min(1),
    companyUrl: httpUrl.optional(),
    location: z.string().optional(),
    start: yearMonth,
    /** Leave out for a current role. */
    end: yearMonth.optional(),
    stack: z.array(z.string()).default([]),
    /** Sample content. Delete this line once the entry is yours. */
    placeholder: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ base: './content/projects', pattern: '*.md' }),
  schema: z.object({
    title: z.string().min(1),
    year: z.union([z.string(), z.number()]).transform(String).optional(),
    role: z.string().optional(),
    stack: z.array(z.string()).default([]),
    links: z.array(z.object({ label: z.string().min(1), url: httpUrl })).default([]),
    /** Lower numbers come first. */
    order: z.number().default(100),
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { experience, projects };
