# my-portfolio

Personal site for Praveen Ponduru (PJ): work, a live Letterboxd film diary, photographs, and chess.

It is a static site built with **Astro 7** and TypeScript. Astro was chosen because it renders everything to plain HTML at build time and ships no JavaScript unless a component asks for it, and its image pipeline produces the AVIF/WebP variants the gallery needs. The whole page is about 19 KB over the wire (Brotli) and loads no external script files.

- [Quick start](#quick-start)
- [Placeholders you still need to replace](#placeholders-you-still-need-to-replace)
- [Editing content](#editing-content)
- [Photos](#photos)
- [Films and chess data](#films-and-chess-data)
- [Design](#design)
- [Checks and measured results](#checks-and-measured-results)
- [Deploying to Cloudflare Pages](#deploying-to-cloudflare-pages)
- [Connecting your domain](#connecting-your-domain)
- [Optional analytics](#optional-analytics)
- [Credits](#credits)

## Quick start

Needs Node 22.23.4 or newer (`.nvmrc` pins 22).

```sh
npm install
npm run dev        # http://localhost:4321
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server. Fetches the film diary and ratings once if there is no local cache. |
| `npm run build` | Fetches fresh data, then builds the site into `dist/`. |
| `npm run preview` | Serves `dist/` locally. |
| `npm run fetch` | Refreshes the film diary, posters and chess ratings without building. |
| `npm run check` | Type-checks the Astro and TypeScript files. |
| `npm test` | Playwright checks against the built site (run `npm run build` first). |
| `npm run verify` | Type-check, build and test in one go. |
| `npm run og` | Redraws the social sharing image and home-screen icon from `site.json`. |
| `npm run placeholders` | Regenerates the placeholder photos. Overwrites `photos/photos.json`. |

## Placeholders you still need to replace

Everything below is either a placeholder or a draft I wrote from your brief. Nothing else on the site is invented: the film diary, ratings and chess game are your real data.

| # | What | Where |
| --- | --- | --- |
| 1 | **Domain.** Currently `https://YOURDOMAIN.COM`. Feeds the canonical URL, Open Graph tags, `sitemap.xml` and `robots.txt`. | `src/content/site.json` → `url` |
| 2 | **Your name.** I used "Praveen Ponduru", taken from your email and LinkedIn addresses. Your Letterboxd profile says "Praveen Kumar". Set whichever you go by. | `src/content/site.json` → `name`, `givenName`, `familyName` |
| 3 | **Positioning line and meta description.** Drafts. | `src/content/site.json` → `tagline`, `description` |
| 4 | **Bio.** A draft built from "seven years, Cypress, Playwright, React, SQL". | `src/content/work/bio.md` |
| 5 | **Experience.** Three placeholder roles with "Company name" and "20XX" dates. | `src/content/work/experience.json` |
| 6 | **Projects.** Three placeholders. | `src/content/work/projects.json` |
| 7 | **Skills.** Only the four tools you named. Add the rest. | `src/content/work/skills.json` |
| 8 | **Photographs.** Nine drawn placeholders, each labelled "PLACEHOLDER", with made-up EXIF. | `photos/*.jpg` and `photos/photos.json` |
| 9 | **Chess blurb and game caption.** Drafts. The game is real (your peak-rating rapid win on Chess.com, 14 Sept 2026), but I picked it, so swap in a favourite if you have one. | `src/content/chess/chess.json`, `src/content/chess/favourite-game.pgn` |
| 10 | **Section introductions** for Photography and Contact. One sentence each, written by me. | `src/components/Photos.astro`, `src/components/Contact.astro` |
| 11 | **Social image.** Shows the current name and positioning line. Redraw it after changing either. | `npm run og` → `public/og.png` |
| 12 | **Cloudflare credentials.** Two secrets and one variable in GitHub. Until they exist the workflow builds but skips the deploy. | See [Deploying](#deploying-to-cloudflare-pages) |
| 13 | **Analytics.** Off. The optional snippets contain `YOUR_TOKEN` and `YOURDOMAIN.COM`. | `src/layouts/Base.astro` |

To find the obvious ones in one go: `grep -rn "YOURDOMAIN\|20XX\|Company name\|Placeholder" src photos/photos.json`.

## Editing content

All copy lives in `src/content/`. Edit, save, and the dev server reloads.

| File | Controls |
| --- | --- |
| `site.json` | Name, nickname, role, positioning line, meta description, email, the links in the Contact section, and your Letterboxd, Chess.com and Lichess handles. |
| `work/bio.md` | The Work introduction, in Markdown. The first paragraph is set large; later paragraphs are body text. |
| `work/experience.json` | The timeline, newest first: `role`, `company`, `start`, `end`, `summary`. |
| `work/projects.json` | Selected projects: `title`, `summary`, `stack` (a list), `url` (leave `""` for no link). |
| `work/skills.json` | Skill groups: `group` and `items`. |
| `chess/chess.json` | The Chess blurb, plus the title, caption and board orientation (`"white"` or `"black"`) for the featured game. |
| `chess/favourite-game.pgn` | The featured game. Paste any PGN (Chess.com and Lichess both export one). The board, move list and step-through controls are generated from it. |

**Updating links.** Change `links` in `site.json`. Each entry has a `label`, the `handle` shown next to it, and the `url`. They appear in the Contact section and in the page's structured data. The `handles` object is separate: it tells the build which Letterboxd, Chess.com and Lichess accounts to read.

**Adding a section.** Add an entry to `src/lib/sections.ts` (it drives the hero's links and the footer), create the component, and include it in `src/pages/index.astro`. The hero's step wedge is designed for five links; a sixth needs its own tone in `Hero.astro`.

**After changing your name or positioning line**, run `npm run og` to redraw the social image.

## Photos

1. Put image files in `photos/` (JPEG, PNG, WebP or AVIF). Export at roughly 2400px on the long edge; the build makes the smaller sizes.
2. Describe each one in `photos/photos.json`:

   ```json
   { "file": "harbour.jpg", "title": "Harbour, first light", "alt": "Fishing boats moored in still water at dawn", "location": "Wellington" }
   ```

   The gallery follows the order of this file. Files that are not listed still appear, after the listed ones, in alphabetical order.
3. Delete the placeholder files and their entries.

Things worth knowing:

- **`alt` matters.** It is what a screen reader says. The build prints a warning for any photo without one.
- **Camera settings are read from the file's EXIF** at build time (camera, lens, focal length, aperture, shutter speed, ISO) and shown in the lightbox. If a file has no EXIF, that line is simply absent.
- **Location data.** Published images are re-encoded and carry no EXIF, so GPS coordinates never reach the site. The originals in `photos/` are committed as they are, though, and this repository is on GitHub. Strip GPS from the originals before committing if that matters to you. The build warns when it finds coordinates.
- Each photo is published as AVIF and WebP at 320, 480, 720 and 1080px for the grid and up to 2048px for the lightbox, with width and height set so nothing shifts while loading.

## Films and chess data

`scripts/fetch-data.mjs` runs before every build. It reads:

- your Letterboxd RSS feed (`https://letterboxd.com/<handle>/rss/`) for the 13 most recent diary entries, and downloads their posters
- the Chess.com and Lichess public APIs for your ratings

Nothing is fetched in the browser. The results go to `src/data/cache/` (not committed).

**If a source is down, the build still succeeds.** The order of preference is:

1. what was just fetched
2. the last successful fetch still in `src/data/cache/` (the GitHub workflow keeps this between runs)
3. the committed snapshot in `src/data/fallback/`
4. for films only, if there is nothing at all: a short message with a link to your Letterboxd profile

Each source fails independently, and a poster that cannot be downloaded is replaced by a typeset tile with the film's title. To refresh the committed snapshot, run `npm run fetch -- --snapshot` and commit `src/data/fallback/`.

Details:

- The most recent entry that has a review (without a spoiler flag) is featured; the next twelve entries are listed.
- Reviews flagged as containing spoilers show a notice instead of the text.
- **Emoji are removed from the excerpts shown on the site.** The typeface has no emoji, and a single one made the browser search every system font during layout (about a third of all layout time when I measured it). The full review is one click away. To keep them, remove the two `withoutEmoji(...)` calls in `src/components/Films.astro`.
- Lichess ratings from fewer than ten games are hidden, and provisional ones carry a question mark, as on Lichess itself.

## Design

`DESIGN.md` records the system: three inks (yellow, black, paper) with neutral steps between, one typeface (Archivo) in four fixed weight and width combinations, square corners, ruled rows instead of cards. `PRODUCT.md` records who the site is for. Both were written by me from your brief and the finished build; edit or delete them as you see fit.

- **Colours and type** are tokens at the top of `src/styles/global.css`. To change the accent, edit `--yellow` there, then update the two `theme-color` values in `src/layouts/Base.astro`, the colours in `public/favicon.svg`, and run `npm run og`.
- **Themes** follow the operating system, and the switch in the top corner overrides and remembers the choice. Films, the lightbox and the footer are dark in both themes; Contact is yellow in both.
- **Motion** is one entrance (the hero's step wedge) and the lightbox opening. Both are off under `prefers-reduced-motion`.
- The first comment inside `<body>` in `Base.astro` is the design brief the build was held to. It is safe to delete.

## Checks and measured results

Run against the production build on 11 Nov 2026.

| Check | Result |
| --- | --- |
| `npm run check` | 0 errors, 0 warnings (27 files) |
| `npm run build` | 2 pages, 281 optimised image files. About 34 s from cold, about 2 s with the image cache |
| `npm test` | 18 of 18 passed (9 checks, each on desktop Chrome and an emulated Pixel 7) |
| axe-core (inside `npm test`) | 0 violations for WCAG 2.0, 2.1 and 2.2 at A and AA plus best practices, in the light theme, the dark theme, and with the lightbox open |
| Page weight | `index.html` 121 KB, 18.7 KB with Brotli. No external JavaScript files. One 90 KB font file |

**Lighthouse 13.6**, Chrome headless, against `npm run preview` on localhost:

| | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Mobile (five runs) | 98, 98, 98, 100, 98 | 100 | 100 | 100 |
| Desktop | 100 | 100 | 100 | 100 |

Mobile: first contentful paint 0.8 s, largest contentful paint 0.8 s, layout shift 0, total blocking time 30 to 180 ms. Desktop: 0.3 s, 0.3 s, 0, 10 ms.

Two honest caveats:

- These are local numbers. The preview server does not compress responses and there is no real network, so expect small differences on the deployed site. Re-run against the live URL (or use PageSpeed Insights) after the first deploy.
- The mobile performance score moves with the speed of the machine running Lighthouse. During this work the same build scored between 92 and 100 depending on how busy the laptop was, which is what led to the font and emoji changes described above. The five runs in the table were taken on the machine in its slower state.

The Playwright checks cover: accessibility in both themes, no sideways overflow, the hero links landing exactly on their sections, the lightbox (open from the keyboard, arrow keys, Home, Escape, focus returning to the photo), stepping through the chess game, the theme switch remembering its setting, and the SEO metadata, `robots.txt`, `sitemap.xml` and social image.

They use the Chrome already installed on your machine. To use Playwright's own Chromium instead, remove the two `channel: 'chrome'` lines in `playwright.config.ts` and run `npx playwright install chromium`.

To run Lighthouse yourself:

```sh
npm run build && npm run preview
npx lighthouse http://localhost:4321 --view                    # mobile
npx lighthouse http://localhost:4321 --preset=desktop --view   # desktop
```

## Deploying to Cloudflare Pages

Recommended host: **Cloudflare Pages**. It is free for a site like this with no bandwidth cap, serves from a global CDN with Brotli, supports a bare (apex) domain properly, and takes a prebuilt folder straight from GitHub Actions. Netlify and Vercel would both work too; the build output in `dist/` is plain static files.

Nothing has been deployed or pushed. The workflow at `.github/workflows/deploy.yml` builds on every push to `main`, once a day, and on demand, and deploys only once step 4 below is done.

### 1. Create the Pages project

In a terminal:

```sh
npx wrangler login
npx wrangler pages project create my-portfolio --production-branch main
```

`my-portfolio` becomes the project name and your temporary address, `my-portfolio.pages.dev`. Pick another name if that one is taken. (You can also create it in the dashboard: **Workers & Pages** → **Create** → **Pages** → the direct upload option.)

### 2. Create an API token

In the Cloudflare dashboard: **Manage Account** → **Account API Tokens** → **Create Token** → **Custom Token** → **Get started**. Name it, and under **Permissions** choose **Account** / **Cloudflare Pages** / **Edit**. Then **Continue to summary** → **Create Token**. Copy the token; it is shown once.

### 3. Find your account ID

It is on the **Workers & Pages** overview page, and in the **API** section of any domain's **Overview** page.

### 4. Add them to GitHub

In the repository on GitHub: **Settings** → **Secrets and variables** → **Actions**.

| Tab | Name | Value |
| --- | --- | --- |
| Secrets | `CLOUDFLARE_API_TOKEN` | the token from step 2 |
| Secrets | `CLOUDFLARE_ACCOUNT_ID` | the ID from step 3 |
| Variables | `CLOUDFLARE_PAGES_PROJECT` | the project name from step 1 |

### 5. Deploy

Merge this branch into `main` and push. The workflow runs, and the site appears at `https://<project>.pages.dev`. You can also start a run by hand from the **Actions** tab (**Build and deploy** → **Run workflow**).

### The daily rebuild

The workflow also runs every day at 18:17 UTC, which is what keeps the film diary and ratings current. Good to know:

- Scheduled workflows only run from the default branch (`main`).
- GitHub may start a scheduled run several minutes late, and it **switches scheduled workflows off after 60 days without repository activity**. If the diary stops updating, re-enable the workflow in the **Actions** tab.
- If Letterboxd or a chess API is unreachable on a given day, the log shows a line starting `[data] WARNING` and the site is published with the previous day's data.
- To change the time, edit the `cron` line in `.github/workflows/deploy.yml`.

## Connecting your domain

Replace `YOURDOMAIN.COM` throughout with your real domain.

### 1. Move the domain's DNS to Cloudflare

Cloudflare Pages needs this for a bare domain. In the dashboard: **Add a domain** (or **Connect a domain**), enter `YOURDOMAIN.COM`, choose the Free plan, and let it import your existing records. Cloudflare then shows two nameservers. At your registrar, replace the current nameservers with those two. Wait until the domain shows **Active** in Cloudflare (usually under an hour, occasionally up to a day).

If you already have email on this domain, check that the imported MX and TXT records are all present before switching nameservers.

### 2. Attach the bare domain to the project

**Workers & Pages** → your project → **Custom domains** → **Set up a domain** → enter `YOURDOMAIN.COM` → **Continue** → confirm. Cloudflare creates this record for you:

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| `CNAME` | `YOURDOMAIN.COM` (shown as `@`) | `<project>.pages.dev` | Proxied |

Do it through this screen rather than adding the record by hand: a hand-made record without the project association returns a 522 error.

### 3. HTTPS

There is nothing to install. Cloudflare issues the certificate as soon as the custom domain shows **Active**, normally within a few minutes. Then, for the domain, go to **SSL/TLS** → **Edge Certificates** and turn on **Always Use HTTPS** so plain `http://` requests are redirected.

### 4. Redirect `www` to the bare domain

This is Cloudflare's own recipe for Pages.

1. Go to **Bulk Redirects** (account level, under **Rules**) and create a **Bulk Redirect List** with one entry:

   | Source URL | Target URL | Status | Parameters to tick |
   | --- | --- | --- | --- |
   | `www.YOURDOMAIN.COM` | `https://YOURDOMAIN.COM` | `301` | Preserve query string, Subpath matching, Preserve path suffix, Include subdomains |

2. Create a **Bulk Redirect Rule** that uses that list, and enable it.
3. In the domain's **DNS** → **Records**, add:

   | Type | Name | IPv4 address | Proxy |
   | --- | --- | --- | --- |
   | `A` | `www` | `192.0.2.1` | Proxied |

   `192.0.2.1` is a reserved dummy address. Nothing is ever sent to it; the record only exists so that requests for `www` reach Cloudflare, where the redirect answers them.

4. Check it:

   ```sh
   curl --head https://www.YOURDOMAIN.COM/
   ```

   You should see `301` and `location: https://YOURDOMAIN.COM/`.

### 5. Tell the site its address

Set `url` in `src/content/site.json` to `https://YOURDOMAIN.COM`, commit, and push. The canonical link, social tags, `sitemap.xml` and `robots.txt` all pick it up on the next build.

Optional: so the `pages.dev` address does not compete with your domain in search results, add a second entry to the same redirect list, from `<project>.pages.dev` to `https://YOURDOMAIN.COM`.

## Optional analytics

Nothing is tracked. There are no cookies and no third-party requests of any kind.

If you later want visitor counts, `src/layouts/Base.astro` has two commented-out options in the `<head>`, both cookieless: Cloudflare Web Analytics (free) and Plausible. Move the one you want out of the comment and fill in its token or domain.

## Credits

- Typeface: [Archivo](https://github.com/Omnibus-Type/Archivo) by Omnibus-Type, SIL Open Font License 1.1, self-hosted from the `@fontsource-variable/archivo` package.
- Chess pieces: the "cburnett" set by Colin M.L. Burnett, BSD licence. See `src/assets/chess/LICENSE.md`.
- Film data and posters come from Letterboxd; posters belong to their respective owners.
