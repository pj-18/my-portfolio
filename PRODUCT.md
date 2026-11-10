# Product

<!-- impeccable:product-schema 1 -->

> Written from the original build brief without an interview (the brief asked to proceed without approval). Lines marked *(assumed)* are inferences to confirm or correct.

## Platform

web

## Stack

delegated: Astro (static output) with TypeScript, plain CSS, and minimal client JS. The brief preferred Astro or a Next.js static export; Astro ships zero JS by default and has a built-in image pipeline.

## Users

- Hiring managers, recruiters and engineering peers evaluating Praveen (PJ) as a senior software engineer, usually on a quick first scan, on phone or desktop. *(assumed)*
- Friends and people who share his interests in film, photography and chess. *(assumed)*

## Product Purpose

A personal site that shows who PJ is as an engineer and as a person. Success: a visitor leaves knowing what he does for work, and remembers him as a specific person (films, photographs, chess), not a generic developer profile.

## Positioning

One person seen through four practices that all reward close attention: testing software, watching films critically, composing photographs, and playing chess. The film diary is live data from his own Letterboxd account, not a list of favourites.

## Operating Context

- Static site, hosted cheaply on any static host; deployed via GitHub Actions.
- Content edited by PJ directly in Markdown and JSON.
- Film diary pulled from the Letterboxd RSS feed at build time and refreshed by a daily scheduled rebuild. Never fetched from the browser.
- Chess ratings pulled from the Chess.com and Lichess public APIs at build time.

## Capabilities and Constraints

- Sections: hero, work (bio, experience, projects, skills), films, photography (gallery and lightbox), chess, contact.
- No backend, no contact form, no tracking by default.
- Lighthouse 95+ in every category; self-hosted fonts; no heavy libraries.
- Dark and light themes that follow `prefers-color-scheme`; respects `prefers-reduced-motion`.
- Undecided: the production domain, employer names and dates, project details, and real photographs are placeholders until PJ supplies them.

## Brand Commitments

- Name: Praveen, known as PJ. Handle `pj_18` across Letterboxd, GitHub, Chess.com and Lichess.
- Binding from the brief: cinematic sensibility shaped by film and photography, strong typography, considered whitespace, a deliberate colour palette. Must not look like a generic developer template. Must not be gimmicky.

## Evidence on Hand

- Real: Letterboxd diary (ratings, reviews, posters) at letterboxd.com/pj_18; Chess.com and Lichess ratings and game history; seven years of engineering experience with Cypress, Playwright, React and SQL.
- Absent, do not fabricate: employers, dates, project outcomes, metrics, testimonials, real photographs and their EXIF.

## Product Principles

1. The work and the interests are the content; the interface stays out of the way.
2. Real data over decoration: live diary entries and real ratings rather than invented showcase material.
3. Everything a visitor needs is readable in one scan; depth is one click away on the source platform.
4. Easy for PJ to maintain: edit a file, push, done.

## Accessibility & Inclusion

WCAG 2.2 AA: semantic HTML, alt text, visible focus states, AA contrast in both themes, full keyboard operation including the photo lightbox.
